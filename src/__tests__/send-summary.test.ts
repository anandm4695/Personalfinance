import { describe, it, expect } from "vitest";

// api/send-summary.js is a CommonJS module
const sendSummary = require("../../api/send-summary.js");
const {
  computeSummary,
  generateHTML,
  renderDailyHTML,
  renderWeeklyHTML,
  renderMonthlyHTML,
  annualizePremium,
  nextAnnualOccurrence,
  getNextInsuranceDue,
  getNextSubscriptionRenewal,
  getCreditCardDueDate,
  loanOutstanding,
  loanGivenOutstanding,
  clampDayToMonth,
  calculateEpfBalance,
  largestRemainderRound,
  fmtINR,
  fmtINRFull,
  getMatchingFrequencies,
  shouldSendNow,
  buildSubject,
  getEffectiveRent,
} = sendSummary;

describe("Daily, Weekly & Monthly Email Summary Engine", () => {
  describe("1. Multi-Cadence Frequency & Scheduling Schedule Matching", () => {
    it("handles comma-separated multi-select frequencies (e.g. daily, weekly, monthly)", () => {
      const matched = getMatchingFrequencies({
        emailFrequency: "daily,weekly",
        emailDay: 1,
      });
      expect(matched).toContain("daily");
    });

    it("evaluates shouldSendNow correctly for single and multi-frequency settings", () => {
      expect(shouldSendNow({ emailFrequency: "daily" })).toBe(true);
      expect(shouldSendNow({ emailFrequency: "daily,weekly,monthly" })).toBe(true);
      expect(shouldSendNow({ email_frequency: "daily,weekly" })).toBe(true);
    });

    it("parses and trims frequency strings cleanly", () => {
      const matched = getMatchingFrequencies({
        emailFrequency: "  daily ,  weekly  , monthly ",
      });
      expect(matched).toContain("daily");
    });

    it("matches weekly emails on the designated weekday (0=Sun, 1=Mon, ..., 6=Sat)", () => {
      // Monday reference: 2026-10-05 (Monday)
      const mondayRef = new Date("2026-10-05T06:00:00Z");
      const matchedMon = getMatchingFrequencies({ emailFrequency: "weekly", emailDay: 1 }, undefined, mondayRef);
      expect(matchedMon).toContain("weekly");

      const notMatchedMon = getMatchingFrequencies({ emailFrequency: "weekly", emailDay: 2 }, undefined, mondayRef);
      expect(notMatchedMon).not.toContain("weekly");
    });

    it("matches monthly emails with month-end clamping (e.g. day 31 on 30-day month or Feb)", () => {
      // 2026-02-28 (Last day of Feb 2026)
      const feb28 = new Date("2026-02-28T06:00:00Z");
      const matchedFeb = getMatchingFrequencies({ emailFrequency: "monthly", emailDay: 31 }, undefined, feb28);
      expect(matchedFeb).toContain("monthly");

      // 2026-09-30 (Last day of Sept 30-day month)
      const sept30 = new Date("2026-09-30T06:00:00Z");
      const matchedSept = getMatchingFrequencies({ emailFrequency: "monthly", emailDay: 31 }, undefined, sept30);
      expect(matchedSept).toContain("monthly");
    });
  });

  describe("2. Accounting & Metric Accuracy across Assets and Liabilities", () => {
    it("accurately computes informalLent and informalBorrowed with tranches, payments, and settled states", () => {
      const stateWithInformal = {
        bankAccounts: [{ balance: 100000 }],
        informalLent: [
          { name: "Rahul", amount: 50000 }, // no tranches/payments -> 50000
          { name: "Suresh", tranches: [{ amount: 30000 }], payments: [{ amount: 10000 }] }, // 20000 net
          { name: "Settled Friend", amount: 25000, status: "settled" }, // settled -> 0
        ],
        informalBorrowed: [
          { name: "Uncle", amount: 40000 }, // no tranches/payments -> 40000
          { name: "Friend", tranches: [{ amount: 25000 }], payments: [{ amount: 5000 }] }, // 20000 net
          { name: "Paid Off", amount: 15000, settled: true }, // settled -> 0
        ],
      };

      const summary = computeSummary(stateWithInformal);

      // Informal Lent: Rahul (50000) + Suresh (20000) = 70000
      expect(summary.informalLentTotal).toBe(70000);

      // Informal Borrowed: Uncle (40000) + Friend (20000) = 60000
      expect(summary.informalBorrowedTotal).toBe(60000);

      // Total Assets = Bank (100000) + Informal Lent (70000) = 170000
      expect(summary.totalAssets).toBe(170000);

      // Total Liabilities = Informal Borrowed (60000)
      expect(summary.totalLiabilities).toBe(60000);

      // Net Worth = 170000 - 60000 = 110000
      expect(summary.netWorth).toBe(110000);
    });

    it("correctly handles active vs closed loans and fallback to principal when outstanding is null", () => {
      const state = {
        bankAccounts: [{ balance: 50000 }],
        loansTaken: [
          { lender: "HDFC Home Loan", outstanding: 2500000, emi: 30000 },
          { lender: "Old Car Loan", outstanding: 100000, status: "closed" }, // closed -> 0
          { lender: "Personal Loan", principal: 150000, outstanding: null, emi: 5000 }, // fallback to principal -> 150000
        ],
        loansGiven: [
          { borrower: "Cousin", outstanding: 80000 },
          { borrower: "Past Loan", outstanding: 20000, status: "closed" }, // closed -> 0
        ],
      };

      const summary = computeSummary(state);

      expect(summary.loanOutstanding).toBe(2650000);
      expect(summary.loansGivenTotal).toBe(80000);
      expect(summary.totalLiabilities).toBe(2650000);
    });

    it("scales real estate builder demands and market value by tracked ownership share", () => {
      const stateWithRealty = {
        bankAccounts: [{ balance: 500000 }],
        realEstateProperties: [
          {
            id: "prop-1",
            name: "Apartment A",
            status: "under-construction",
            marketValue: 10000000,
            owners: [
              { id: "self", sharePct: 50 },
              { id: "external", sharePct: 50 }, // 50% external co-owner
            ],
          },
          {
            id: "prop-2",
            name: "Villa B",
            status: "ready",
            marketValue: 20000000,
          },
        ],
        realEstateDemands: [
          { id: "d-1", propertyId: "prop-1", totalAmount: 1000000, dueDate: "2099-01-01" },
        ],
        realEstatePayments: [{ demandId: "d-1", propertyId: "prop-1", amount: 200000 }],
      };

      const summary = computeSummary(stateWithRealty);

      // Outstanding demand on Prop 1 = 10L - 2L = 8L.
      // Household tracked share is 50%, so liability should be 4L (400000), not full 8L.
      expect(summary.realEstateOutstanding).toBe(400000);

      // Real estate asset = 50% of 100L + 100% of 200L = 50L + 200L = 250L (25000000)
      expect(summary.realEstateAsset).toBe(25000000);
    });

    it("includes bonds with units * faceValuePerUnit formula", () => {
      const state = {
        bankAccounts: [{ balance: 10000 }],
        bonds: [
          { issuer: "NHAI Tax Free", numberOfUnits: 50, faceValuePerUnit: 1000 }, // 50000
          { issuer: "SGB Bond", totalInvestmentAmount: 75000 }, // 75000
        ],
      };
      const summary = computeSummary(state);
      expect(summary.bondsTotal).toBe(125000);
    });

    it("accurately calculates emergency fund liquid runway including near-term FDs, liquid MFs, and prepaid cards", () => {
      const refDate = new Date("2026-10-08T00:00:00Z");
      const state = {
        bankAccounts: [{ balance: 200000 }], // 2L bank
        prepaidCards: [
          { status: "active", transactions: [{ type: "load", amount: 20000 }, { type: "spend", amount: 5000 }] }, // 15K prepaid
        ],
        fixedDeposits: [
          // Maturing in 30 days (counted in liquid assets)
          { principal: 100000, maturityDate: "2026-11-07" },
          // Maturing in 180 days (not counted in emergency liquidity)
          { principal: 500000, maturityDate: "2027-04-08" },
        ],
        mutualFunds: [
          // Liquid fund
          { category: "Liquid Fund", units: 100, currentNav: 1000 }, // 100K liquid MF
          // Equity fund (not counted in emergency liquidity)
          { category: "Equity Large Cap", units: 100, currentNav: 5000 },
        ],
        budgets: [
          { category: "Groceries", monthly: 30000 },
          { category: "Utilities", monthly: 10000 },
          { category: "Transfer", monthly: 20000 }, // excluded from expense baseline
        ],
      };

      const summary = computeSummary(state, refDate);

      // Liquid assets = Bank (200000) + Near FD (100000) + Liquid MF (100000) + Prepaid (15000) = 415000
      expect(summary.efLiquidAssets).toBe(415000);

      // Monthly expense baseline = 30000 + 10000 = 40000
      expect(summary.efMonthlyExpense).toBe(40000);

      // Runway = 415000 / 40000 = 10.375 -> 10.4 months
      expect(summary.efMonthsCovered).toBeCloseTo(10.4, 1);
      expect(summary.efStatus.label).toBe("Healthy");
    });
  });

  describe("3. Date Boundary & Timestamp Slicing Alignment", () => {
    it("handles ISO timestamps with time portions in yesterday and past 7-day filters", () => {
      const refDate = new Date("2026-10-08T12:00:00Z"); // Today is Oct 8
      const state = {
        bankAccounts: [{ balance: 100000 }],
        transactions: [
          // Yesterday (Oct 7) with full ISO timestamp
          { date: "2026-10-07T14:30:00Z", type: "debit", category: "Dining", amount: 1200 },
          // Today (Oct 8) with time portion
          { date: "2026-10-08T09:15:00.000Z", type: "debit", category: "Coffee", amount: 250 },
          // 4 days ago (Oct 4)
          { date: "2026-10-04", type: "debit", category: "Groceries", amount: 3500 },
          // 10 days ago (Sept 28) -> in prior 7 days window (Oct 8 - 13 to Oct 8 - 7 = Sept 25 to Oct 1)
          { date: "2026-09-28", type: "debit", category: "Shopping", amount: 4000 },
        ],
        budgets: [{ category: "Dining", monthly: 15000 }],
      };

      const summary = computeSummary(state, refDate);

      // Yesterday spend: Dining (1200)
      expect(summary.yesterdaySpend).toBe(1200);
      expect(summary.yesterdayCount).toBe(1);

      // Past 7-day spend: Dining (1200) + Coffee (250) + Groceries (3500) = 4950
      expect(summary.past7DaysExpense).toBe(4950);
      expect(summary.past7DaysCount).toBe(3);

      // Prior 7-day spend: Shopping (4000)
      expect(summary.prior7DaysExpense).toBe(4000);
      // Week over week trend: (4950 - 4000) / 4000 = +24%
      expect(summary.weeklySpendTrendPct).toBe(24);
    });

    it("correctly identifies active rental agreement date boundaries", () => {
      const activeProperty = {
        propertyName: "Flat 101",
        monthlyRent: 25000,
        agreementStart: "2026-01-01",
        agreementEnd: "2026-12-31",
        isActive: true,
      };
      const expiredProperty = {
        propertyName: "Old Shop",
        monthlyRent: 30000,
        agreementStart: "2024-01-01",
        agreementEnd: "2025-12-31",
        isActive: true,
      };
      const inactiveProperty = {
        propertyName: "Vacant House",
        monthlyRent: 20000,
        isActive: false,
      };

      expect(getEffectiveRent(activeProperty, "2026-10")).toBe(25000);
      expect(getEffectiveRent(expiredProperty, "2026-10")).toBe(0);
      expect(getEffectiveRent(inactiveProperty, "2026-10")).toBe(0);
    });
  });

  describe("4. Upcoming Dues, Recurring Cycles & 7-Day Liquidity Buffer", () => {
    it("advances past subscription renewal dates to the next upcoming occurrence", () => {
      // Today is 2026-10-08. Subscription started 2025-08-10 on monthly cycle.
      const nextMonthly = getNextSubscriptionRenewal("2025-08-10", "monthly", "2026-10-08");
      expect(nextMonthly.toISOString().slice(0, 10)).toBe("2026-10-10");

      // Subscription started 2026-02-15 on quarterly cycle.
      // Next after Oct 8 is Nov 15 (Feb 15 -> May 15 -> Aug 15 -> Nov 15)
      const nextQuarterly = getNextSubscriptionRenewal("2026-02-15", "quarterly", "2026-10-08");
      expect(nextQuarterly.toISOString().slice(0, 10)).toBe("2026-11-15");
    });

    it("computes periodic installment dues for monthly/quarterly insurance policies without overstating", () => {
      const monthlyPolicy = {
        planName: "Term Life Monthly",
        premium: 1500,
        premiumFrequency: "monthly",
        startDate: "2026-01-12",
      };
      const dueInfo = getNextInsuranceDue(monthlyPolicy, "2026-10-08");
      expect(dueInfo).toBeDefined();
      expect(dueInfo.amount).toBe(1500); // 1500 installment, NOT 18000
      expect(dueInfo.date.toISOString().slice(0, 10)).toBe("2026-10-12");
    });

    it("clamps credit card statement due dates to valid month-end dates and rolls over past due days", () => {
      const refDate = new Date("2026-10-25T00:00:00Z"); // Oct 25
      const cardDueDay10 = { issuer: "HDFC", dueDay: 10, outstanding: 15000 };
      const cardDueDay28 = { issuer: "ICICI", dueDay: 28, outstanding: 20000 };

      // Due day 10 has passed in Oct -> rolls to Nov 10
      const d10 = getCreditCardDueDate(cardDueDay10, refDate);
      expect(d10.toISOString().slice(0, 10)).toBe("2026-11-10");

      // Due day 28 is upcoming in Oct -> stays Oct 28
      const d28 = getCreditCardDueDate(cardDueDay28, refDate);
      expect(d28.toISOString().slice(0, 10)).toBe("2026-10-28");
    });

    it("includes unpaid bill payments and cross-references billPaymentHistory", () => {
      const refDate = new Date("2026-10-08T00:00:00Z");
      const state = {
        bankAccounts: [{ balance: 100000 }],
        billPayments: [
          { id: "b1", provider: "Tata Power", amount: 2400, dueDay: 12 },
          { id: "b2", provider: "Airtel Fiber", amount: 1199, dueDay: 15 },
        ],
        billPaymentHistory: [
          // Tata Power already paid this month
          { billId: "b1", paidDate: "2026-10-02" },
        ],
      };

      const summary = computeSummary(state, refDate);
      const dues = summary.dues30Days;

      // Only Airtel Fiber should appear in unpaid dues
      const tataPowerDue = dues.find((d: any) => d.label.includes("Tata Power"));
      const airtelDue = dues.find((d: any) => d.label.includes("Airtel Fiber"));

      expect(tataPowerDue).toBeUndefined();
      expect(airtelDue).toBeDefined();
      expect(airtelDue.amount).toBe(1199);
    });

    it("calculates 7-day liquidity buffer and triggers critical alert if dues exceed cash", () => {
      const refDate = new Date("2026-10-08T00:00:00Z");
      const state = {
        bankAccounts: [{ balance: 15000 }], // Only 15K cash
        creditCards: [
          { issuer: "HDFC", outstanding: 50000, dueDay: 12 }, // 50K due on Oct 12 (in 4 days)
        ],
      };

      const summary = computeSummary(state, refDate);

      expect(summary.totalDues7Days).toBe(50000);
      expect(summary.liquidityBuffer7Days).toBe(-35000);

      const alert = summary.alerts.find((a: any) => a.type === "alert" && a.msg.includes("exceed your bank cash"));
      expect(alert).toBeDefined();
      expect(alert.msg).toContain("₹50K");
      expect(alert.msg).toContain("₹15K");
    });
  });

  describe("5. HTML Template Generation, Accessibility & Empty States", () => {
    it("renders Daily Digest HTML with complete morning briefing and clean zero-expense state", () => {
      const state = {
        bankAccounts: [{ balance: 250000 }],
        transactions: [], // Zero expenses yesterday
        budgets: [{ category: "Dining", monthly: 10000 }],
      };

      const summary = computeSummary(state);
      const html = generateHTML(summary, "daily", "Anand");

      expect(html).toContain("ArthaDrishti");
      expect(html).toContain("Morning Briefing");
      expect(html).toContain("Daily Digest");
      expect(html).toContain("Available Bank Balance &amp; Cash");
      expect(html).toContain("Yesterday&#39;s Spending Pulse");
      expect(html).toContain("Zero expenses yesterday! 🎉");
      expect(html).toContain("Immediate Dues (Today &amp; Next 3 Days)");
      expect(html).toContain("Anand");
      expect(html).toContain('bgcolor="#0a0f1d"');
      expect(html).not.toContain("<script>");
    });

    it("renders Weekly Briefing HTML with 4-card KPI grid, category progress bars and goals", () => {
      const state = {
        bankAccounts: [{ balance: 350000 }],
        mutualFunds: [{ scheme: "Flexi Cap Fund", units: 200, currentNav: 500 }],
        transactions: [
          { date: "2026-10-07", type: "debit", category: "Groceries", amount: 4500 },
          { date: "2026-10-07", type: "credit", category: "Salary", amount: 150000 },
        ],
        budgets: [{ category: "Groceries", monthly: 20000 }],
        goals: [{ name: "Emergency Fund", targetAmount: 500000, currentAmount: 350000 }],
      };

      const summary = computeSummary(state);
      const html = generateHTML(summary, "weekly", "Anand");

      expect(html).toContain("ArthaDrishti");
      expect(html).toContain("Weekly Briefing");
      expect(html).toContain("Total Household Net Worth");
      expect(html).toContain("Past 7-Day Spend");
      expect(html).toContain("Past 7-Day Income");
      expect(html).toContain("Next 7-Day Dues");
      expect(html).toContain("7-Day Cash Buffer");
      expect(html).toContain("Past 7 Days Spending by Category");
      expect(html).toContain("Financial Goals Progress");
      expect(html).toContain("Anand");
      expect(html).not.toContain("<script>");
    });

    it("renders Monthly Executive Statement HTML with full portfolio, budgets, balance sheet, and forward outlook", () => {
      const state = {
        bankAccounts: [{ balance: 500000 }],
        mutualFunds: [{ scheme: "Large & Mid Cap", units: 1000, currentNav: 150 }],
        fixedDeposits: [{ bank: "HDFC", principal: 200000, maturityDate: "2026-10-25" }],
        transactions: [
          { date: "2026-10-05", type: "debit", category: "Rent", amount: 35000 },
          { date: "2026-10-01", type: "credit", category: "Consulting", amount: 200000 },
        ],
        budgets: [{ category: "Rent", monthly: 35000 }],
        goals: [{ name: "House Downpayment", targetAmount: 2000000, currentAmount: 850000 }],
      };

      const summary = computeSummary(state);
      const html = generateHTML(summary, "monthly", "Anand");

      expect(html).toContain("ArthaDrishti");
      expect(html).toContain("Monthly Executive");
      expect(html).toContain("Total Household Net Worth");
      expect(html).toContain("Monthly Income MTD");
      expect(html).toContain("Monthly Expenses MTD");
      expect(html).toContain("Net Saved &amp; Savings Rate");
      expect(html).toContain("Emergency Runway");
      expect(html).toContain("Top Expense Categories MTD");
      expect(html).toContain("Category Budget Adherence");
      expect(html).toContain("Investment Portfolio Allocation");
      expect(html).toContain("Emergency Liquidity &amp; Safety Cushion");
      expect(html).toContain("Next 30 Days Forward Outlook");
      expect(html).toContain("FD Maturity at HDFC");
      expect(html).toContain("Anand");
      expect(html).not.toContain("<script>");
    });
  });

  describe("6. Helper Utilities & Formatting", () => {
    it("annualizes premiums across frequencies correctly", () => {
      expect(annualizePremium(1000, "monthly")).toBe(12000);
      expect(annualizePremium(3000, "quarterly")).toBe(12000);
      expect(annualizePremium(6000, "semi-annual")).toBe(12000);
      expect(annualizePremium(12000, "annual")).toBe(12000);
      expect(annualizePremium(1000, "monthly", 15000)).toBe(15000);
    });

    it("largestRemainderRound sums to exactly 100% across fractional amounts", () => {
      const amounts = [33.3, 33.3, 33.4];
      const pcts = largestRemainderRound(amounts, 100);
      expect(pcts.reduce((a: number, b: number) => a + b, 0)).toBe(100);
    });

    it("formats INR numbers correctly including negative values", () => {
      expect(fmtINR(50000000)).toBe("₹5Cr");
      expect(fmtINR(250000)).toBe("₹2.5L");
      expect(fmtINR(15000)).toBe("₹15K");
      expect(fmtINR(500)).toBe("₹500");
      expect(fmtINR(-50000000)).toBe("-₹5Cr");
      expect(fmtINR(-250000)).toBe("-₹2.5L");
      expect(fmtINR(-15000)).toBe("-₹15K");
      expect(fmtINR(-500)).toBe("-₹500");
      expect(fmtINRFull(1234567)).toBe("₹12,34,567");
      expect(fmtINRFull(-1234567)).toBe("-₹12,34,567");
    });

    it("informalPersonOutstanding correctly calculates remaining balance for legacy principal with payments", () => {
      const { informalPersonOutstanding } = sendSummary;
      // Case 1: Legacy amount with no tranches, but with payments
      const legacyPersonWithPayments = {
        name: "Aakash",
        amount: 50000,
        tranches: [],
        payments: [{ amount: 10000 }, { amount: 5000 }],
      };
      // 50000 - 15000 = 35000
      expect(informalPersonOutstanding(legacyPersonWithPayments)).toBe(35000);

      // Case 2: Tranches model
      const tranchesPerson = {
        name: "Bhavin",
        amount: 0,
        tranches: [{ amount: 30000 }, { amount: 20000 }],
        payments: [{ amount: 10000 }],
      };
      // 50000 - 10000 = 40000
      expect(informalPersonOutstanding(tranchesPerson)).toBe(40000);

      // Case 3: Settled status
      const settledPerson = {
        name: "Chetan",
        amount: 50000,
        status: "settled",
      };
      expect(informalPersonOutstanding(settledPerson)).toBe(0);
    });

    it("correctly includes salary_slips and rental income in monthly income computations", () => {
      const refDate = new Date("2026-10-15T00:00:00Z");
      const state = {
        bankAccounts: [{ balance: 100000 }],
        salarySlips: [
          { month: "2026-10", netPay: 180000 },
          { month: "2026-09", netPay: 180000 },
        ],
        rentalIncome: [
          { month: "2026-10", amount: 25000 },
        ],
        transactions: [
          { date: "2026-10-05", type: "debit", category: "Groceries", amount: 5000 },
        ],
      };

      const summary = computeSummary(state, refDate);
      // monthIncome = salary_slips (180000) + rentalIncome (25000) = 205000
      expect(summary.monthIncome).toBe(205000);
      expect(summary.monthExpense).toBe(5000);
      expect(summary.netSavings).toBe(200000);
    });

    it("includes overdue dues in dues3Days and dues7Days with overdue flag", () => {
      const refDate = new Date("2026-10-10T00:00:00Z");
      const state = {
        bankAccounts: [{ balance: 50000 }],
        billPayments: [
          // Bill due on Oct 5 (5 days ago, unpaid)
          { id: "b-overdue", provider: "Electricity Board", amount: 3500, dueDay: 5 },
          // Bill due on Oct 12 (in 2 days)
          { id: "b-upcoming", provider: "Internet", amount: 1200, dueDay: 12 },
        ],
        billPaymentHistory: [],
      };

      const summary = computeSummary(state, refDate);
      expect(summary.dues3Days.length).toBe(2);
      const overdueDue = summary.dues3Days.find((d: any) => d.label.includes("Electricity Board"));
      expect(overdueDue).toBeDefined();
      expect(overdueDue.isOverdue).toBe(true);
      expect(overdueDue.daysDiff).toBeLessThan(0);
    });

    it("builds clear, informative email subject lines for all frequencies", () => {
      const refDate = new Date("2026-10-08T00:00:00Z");
      const dailySubj = buildSubject("daily", 15000000, refDate);
      const weeklySubj = buildSubject("weekly", 15000000, refDate);
      const monthlySubj = buildSubject("monthly", 15000000, refDate);

      expect(dailySubj).toContain("Daily Digest");
      expect(dailySubj).toContain("Net Worth ₹1.5Cr");

      expect(weeklySubj).toContain("Weekly Briefing");
      expect(weeklySubj).toContain("Net Worth ₹1.5Cr");

      expect(monthlySubj).toContain("Monthly Executive Statement");
      expect(monthlySubj).toContain("Net Worth ₹1.5Cr");
    });
  });

  describe("7. Dedicated Credit Card Portfolio & Utilization Mathematics", () => {
    it("accurately calculates total limit, outstanding, and utilization with standalone cards and closed cards", () => {
      const state = {
        creditCards: [
          { issuer: "HDFC Infinia", limit: 500000, outstanding: 125000, status: "active" },
          { issuer: "ICICI Emeralde", limit: 300000, outstanding: 75000, status: "active" },
          { issuer: "Axis Magnus", limit: 400000, outstanding: 50000, status: "closed" }, // closed -> excluded
        ],
      };

      const summary = computeSummary(state);

      // Limit = 500K + 300K = 800000
      expect(summary.creditLimit).toBe(800000);
      // Outstanding = 125K + 75K = 200000
      expect(summary.creditOutstanding).toBe(200000);
      // Available = 800K - 200K = 600000
      expect(summary.creditAvailable).toBe(600000);
      // Utilization = 200K / 800K = 25%
      expect(summary.creditUtil).toBe(25);
    });

    it("correctly handles shared-limit credit pools and fallbacks", () => {
      const state = {
        creditCards: [
          // 2 HDFC cards sharing a 400K pool limit
          { issuer: "HDFC Regalia", sharedGroup: "HDFC Pool", sharedGroupLimit: 400000, outstanding: 80000 },
          { issuer: "HDFC Tata Neu", sharedGroup: "HDFC Pool", sharedGroupLimit: 400000, outstanding: 40000 },
          // 2 ICICI cards sharing a group without explicit sharedGroupLimit, falling back to card limit
          { issuer: "ICICI Sapphiro", sharedGroup: "ICICI Group", limit: 300000, outstanding: 60000 },
          { issuer: "ICICI Amazon Pay", sharedGroup: "ICICI Group", cardLimit: 300000, outstanding: 30000 },
          // 1 standalone card
          { issuer: "Amex Gold", limit: 200000, outstanding: 50000 },
        ],
      };

      const summary = computeSummary(state);

      // Total Limit = HDFC Pool (400K) + ICICI Group (300K) + Amex (200K) = 900000
      expect(summary.creditLimit).toBe(900000);
      // Outstanding = 80K + 40K + 60K + 30K + 50K = 260000
      expect(summary.creditOutstanding).toBe(260000);
      // Available = 900K - 260K = 640000
      expect(summary.creditAvailable).toBe(640000);
      // Utilization = 260000 / 900000 = 28.88% -> 29%
      expect(summary.creditUtil).toBe(29);
      expect(summary.enrichedCards.length).toBe(5);
    });
  });

  describe("8. Dedicated Emergency Runway & Commitment Hierarchy Mathematics", () => {
    it("falls back to bottom-up commitments when no category budgets are defined", () => {
      const state = {
        bankAccounts: [{ balance: 300000 }],
        loansTaken: [
          { lender: "SBI Car Loan", emi: 15000, outstanding: 500000 },
        ],
        sips: [
          { scheme: "Parag Parikh Flexi Cap", amount: 10000, status: "active" },
          { scheme: "Stopped SIP", amount: 5000, status: "stopped" },
        ],
        subscriptions: [
          { name: "Netflix", amount: 650, cycle: "monthly" },
          { name: "Amazon Prime", amount: 1499, cycle: "yearly" }, // ~124.9/mo
        ],
        rentedProperties: [
          { propertyName: "Rented Flat", monthlyRent: 25000, isActive: true },
        ],
        lic: [
          { planName: "Jeevan Labh", premium: 24000, premiumFrequency: "annual" }, // 2000/mo
        ],
      };

      const summary = computeSummary(state);

      // Commitments = EMI (15000) + SIP (10000) + Subs (650 + 124.91) + Rent (25000) + Insurance (2000) = 52774.91 -> ~52775
      expect(summary.efMonthlyExpense).toBeCloseTo(52775, -1);
      // Runway = 300000 / 52775 = 5.68 -> 5.7 months
      expect(summary.efMonthsCovered).toBeCloseTo(5.7, 1);
      expect(summary.efTargetAmount).toBeCloseTo(52775 * 6, -1);
      expect(summary.efGap).toBeGreaterThan(0);
    });

    it("falls back to 90-day debits history average when no budgets or commitments exist", () => {
      const refDate = new Date("2026-10-10T00:00:00Z");
      const state = {
        bankAccounts: [{ balance: 180000 }],
        transactions: [
          // Debits in last 90 days = 120,000 total -> avg 40,000/mo
          { date: "2026-09-15", type: "debit", category: "Shopping", amount: 40000 },
          { date: "2026-08-15", type: "debit", category: "Travel", amount: 40000 },
          { date: "2026-07-20", type: "debit", category: "General", amount: 40000 },
        ],
      };

      const summary = computeSummary(state, refDate);

      expect(summary.efMonthlyExpense).toBe(40000);
      // Runway = 180000 / 40000 = 4.5 months
      expect(summary.efMonthsCovered).toBe(4.5);
      expect(summary.efTargetAmount).toBe(240000); // 6 * 40000
      expect(summary.efGap).toBe(60000); // 240000 - 180000
      expect(summary.efStatus.label).toBe("Needs Improvement");
    });
  });

  describe("9. Multi-Cadence HTML Content Parity for Credit Cards & Emergency Runway", () => {
    it("verifies Weekly Briefing and Monthly Statement both include Credit Cards & Emergency Runway details", () => {
      const state = {
        bankAccounts: [{ balance: 400000 }],
        creditCards: [
          { issuer: "HDFC Bank", limit: 200000, outstanding: 50000 },
        ],
        budgets: [{ category: "Groceries", monthly: 40000 }],
      };

      const summary = computeSummary(state);
      const weeklyHtml = generateHTML(summary, "weekly", "Anand");
      const monthlyHtml = generateHTML(summary, "monthly", "Anand");

      // Weekly Briefing checks
      expect(weeklyHtml).toContain("Credit Cards &amp; Revolving Limit");
      expect(weeklyHtml).toContain("HDFC Bank");
      expect(weeklyHtml).toContain("25% used");

      // Monthly Statement checks
      expect(monthlyHtml).toContain("Credit Cards &amp; Revolving Lines");
      expect(monthlyHtml).toContain("Total Credit Line");
      expect(monthlyHtml).toContain("Available Limit");
      expect(monthlyHtml).toContain("Emergency Liquidity &amp; Safety Cushion");
      expect(monthlyHtml).toContain("6-Month Target Cushion");
      expect(monthlyHtml).toContain("Fully Funded");
    });
  });
});

