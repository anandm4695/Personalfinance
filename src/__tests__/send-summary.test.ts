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
      expect(alert.msg).toContain("₹50.0K");
      expect(alert.msg).toContain("₹15.0K");
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
      expect(html).toContain("Emergency Liquidity Audit");
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

    it("formats INR numbers correctly", () => {
      expect(fmtINR(50000000)).toBe("₹5.00Cr");
      expect(fmtINR(250000)).toBe("₹2.50L");
      expect(fmtINR(15000)).toBe("₹15.0K");
      expect(fmtINR(500)).toBe("₹500");
      expect(fmtINRFull(1234567)).toBe("₹12,34,567");
    });

    it("builds clear, informative email subject lines for all frequencies", () => {
      const refDate = new Date("2026-10-08T00:00:00Z");
      const dailySubj = buildSubject("daily", 15000000, refDate);
      const weeklySubj = buildSubject("weekly", 15000000, refDate);
      const monthlySubj = buildSubject("monthly", 15000000, refDate);

      expect(dailySubj).toContain("Daily Digest");
      expect(dailySubj).toContain("Net Worth ₹1.50Cr");

      expect(weeklySubj).toContain("Weekly Briefing");
      expect(weeklySubj).toContain("Net Worth ₹1.50Cr");

      expect(monthlySubj).toContain("Monthly Executive Statement");
      expect(monthlySubj).toContain("Net Worth ₹1.50Cr");
    });
  });
});
