import { describe, it, expect } from "vitest";

// api/send-summary.js is a CommonJS module
const sendSummary = require("../../api/send-summary.js");
const {
  computeSummary,
  generateHTML,
  annualizePremium,
  nextAnnualOccurrence,
  largestRemainderRound,
  fmtINR,
  fmtINRFull,
} = sendSummary;

describe("Daily Email Summary — Senior Accounting, Development & UI Engine", () => {
  describe("Accounting Bug Fixes", () => {
    it("includes person.amount in informalLent and informalBorrowed when no tranches are logged", () => {
      const stateWithInformal = {
        bankAccounts: [{ balance: 100000 }],
        informalLent: [
          { name: "Rahul", amount: 50000 }, // no tranches/payments
          { name: "Suresh", tranches: [{ amount: 30000 }], payments: [{ amount: 10000 }] }, // 20000 net
        ],
        informalBorrowed: [
          { name: "Uncle", amount: 40000 }, // no tranches/payments
          { name: "Friend", tranches: [{ amount: 25000 }], payments: [{ amount: 5000 }] }, // 20000 net
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

    it("scales real estate builder demands by ownership share per property", () => {
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
            status: "ready", // ready property — no builder demands
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

    it("accurately calculates emergency fund liquid runway including near-term FDs, liquid MFs, and prepaid cards", () => {
      const state = {
        bankAccounts: [{ balance: 200000 }], // 2L bank
        prepaidCards: [
          { status: "active", transactions: [{ type: "load", amount: 20000 }, { type: "spend", amount: 5000 }] }, // 15K prepaid
        ],
        fixedDeposits: [
          // Maturing in 30 days (counted in liquid assets)
          { principal: 100000, maturityDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) },
          // Maturing in 180 days (not counted in emergency liquidity)
          { principal: 500000, maturityDate: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10) },
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

      const summary = computeSummary(state);

      // Liquid assets = Bank (200000) + Near FD (100000) + Liquid MF (100000) + Prepaid (15000) = 415000
      expect(summary.efLiquidAssets).toBe(415000);

      // Monthly expense baseline = 30000 + 10000 = 40000
      expect(summary.efMonthlyExpense).toBe(40000);

      // Runway = 415000 / 40000 = 10.375 -> 10.4 months
      expect(summary.efMonthsCovered).toBeCloseTo(10.4, 1);
      expect(summary.efStatus.label).toBe("Healthy");
    });
  });

  describe("Enriched Upcoming Dues & 7-Day Liquidity Buffer", () => {
    it("captures upcoming SIPs, insurance renewals, credit card bills, and computes the 7-day liquidity buffer", () => {
      const now = new Date();
      // Date 2 days from now in UTC
      const in2Days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2));
      const in2DaysDay = in2Days.getUTCDate();
      const in2DaysIso = in2Days.toISOString().slice(0, 10);

      const state = {
        bankAccounts: [{ balance: 80000 }],
        creditCards: [
          { issuer: "HDFC", status: "active", outstanding: 25000, dueDay: in2DaysDay },
        ],
        sips: [
          { scheme: "Parag Parikh Flexi Cap", status: "active", amount: 15000, dayOfMonth: in2DaysDay },
        ],
        termPlans: [
          { planName: "HDFC Click 2 Protect", premium: 12000, premiumFrequency: "annual", startDate: in2DaysIso },
        ],
        rentalProperties: [
          { propertyName: "Commercial Shop", dueDay: in2DaysDay, monthlyRent: 20000 },
        ],
      };

      const summary = computeSummary(state);

      // Check upcoming dues
      const ccDue = summary.dues.find((d: any) => d.type === "cc");
      const sipDue = summary.dues.find((d: any) => d.type === "sip");
      const insDue = summary.dues.find((d: any) => d.type === "insurance");

      expect(ccDue).toBeDefined();
      expect(ccDue.amount).toBe(25000);

      expect(sipDue).toBeDefined();
      expect(sipDue.amount).toBe(15000);

      expect(insDue).toBeDefined();
      expect(insDue.amount).toBe(12000);

      // Total dues in 7 days = 25000 + 15000 + 12000 = 52000
      expect(summary.totalDues7Days).toBe(52000);

      // Expected inflow: Rent from Commercial Shop = 20000
      expect(summary.totalInflows7Days).toBe(20000);

      // Liquidity Buffer = Bank (80000) - Total Dues (52000) = +28000
      expect(summary.liquidityBuffer).toBe(28000);
    });

    it("triggers critical alert when upcoming 7-day dues exceed bank cash balance", () => {
      const now = new Date();
      const in3Days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 3));
      const in3DaysDay = in3Days.getUTCDate();

      const state = {
        bankAccounts: [{ balance: 15000 }], // only 15K in bank
        creditCards: [
          { issuer: "ICICI", status: "active", outstanding: 50000, dueDay: in3DaysDay }, // 50K due
        ],
      };

      const summary = computeSummary(state);

      expect(summary.liquidityBuffer).toBe(-35000);
      const deficitAlert = summary.alerts.find((a: any) => a.type === "alert" && a.msg.includes("exceed your bank cash"));
      expect(deficitAlert).toBeDefined();
    });
  });

  describe("HTML Template Rendering & UX", () => {
    it("generates polished, responsive HTML with correct sections, escaping, and executive briefing layout", () => {
      const state = {
        bankAccounts: [{ balance: 250000 }],
        mutualFunds: [{ scheme: "Nifty 50 Index", units: 100, currentNav: 250 }],
        transactions: [
          { date: new Date().toISOString().slice(0, 10), type: "debit", category: "Dining", amount: 1500 },
        ],
        budgets: [{ category: "Dining", monthly: 10000 }],
      };

      const summary = computeSummary(state);
      const html = generateHTML(summary, "daily", "Anand");

      expect(html).toContain("ArthaDrishti");
      expect(html).toContain("Morning Briefing");
      expect(html).toContain("Total Household Net Worth");
      expect(html).toContain("Bank Cash");
      expect(html).toContain("Emergency Runway");
      expect(html).toContain("7-Day Cash Buffer");
      expect(html).toContain("Month-to-Date Cash Flow");
      expect(html).toContain("Anand");
      expect(html).not.toContain("<script>");
    });
  });

  describe("Utility & Calculation Helpers", () => {
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
      expect(pcts.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it("formats INR numbers correctly", () => {
      expect(fmtINR(50000000)).toBe("₹5.00Cr");
      expect(fmtINR(250000)).toBe("₹2.50L");
      expect(fmtINR(15000)).toBe("₹15.0K");
      expect(fmtINR(500)).toBe("₹500");
    });
  });
});
