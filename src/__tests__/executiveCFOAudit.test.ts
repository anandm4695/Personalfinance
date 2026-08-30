import { describe, it, expect } from "vitest";
import { calculateProfileNWAndCover } from "../hooks/useMetrics";
import { flattenAssets } from "../utils/nomineeTracker";
import {
  calcTaxNewByFY,
  calcTaxOldByFY,
  getGoldPricePerGram,
  computeFireTarget,
  getEmergencyFundLiquidAssets,
  getEmergencyFundMonthlyExpense,
} from "../utils/finance";

describe("Executive CFO, CEO & Senior Accountant Calculation Audit", () => {
  describe("1. Family Profile Net Worth & Sub-Object Calculations", () => {
    it("correctly calculates informalLent with tranches and payments instead of returning 0", () => {
      const pState = {
        bankAccounts: [{ balance: 100000 }],
        informalLent: [
          {
            id: "person-1",
            name: "Rajesh Sharma",
            tranches: [
              { amount: 50000, date: "2025-01-10" },
              { amount: 25000, date: "2025-02-10" },
            ],
            payments: [{ amount: 20000, date: "2025-03-01" }],
          },
        ],
      };

      const result = calculateProfileNWAndCover(pState, {}, "p1");
      // 1,00,000 bank + 55,000 net informal lent (75,000 - 20,000)
      expect(result.netWorth).toBe(155000);
    });

    it("correctly calculates informalBorrowed with tranches and payments as liabilities", () => {
      const pState = {
        bankAccounts: [{ balance: 200000 }],
        informalBorrowed: [
          {
            id: "person-2",
            name: "Uncle Ramesh",
            tranches: [{ amount: 100000, date: "2025-01-01" }],
            payments: [{ amount: 40000, date: "2025-02-01" }],
          },
        ],
      };

      const result = calculateProfileNWAndCover(pState, {}, "p1");
      // 2,00,000 bank - 60,000 net informal debt (100000 - 40000) = 140000
      expect(result.netWorth).toBe(140000);
    });

    it("correctly uses loansGiven outstanding balance for assets", () => {
      const pState = {
        bankAccounts: [{ balance: 50000 }],
        loansGiven: [
          {
            id: "loan-1",
            borrower: "Suresh",
            principal: 100000,
            outstanding: 60000,
          },
        ],
      };

      const result = calculateProfileNWAndCover(pState, {}, "p1");
      // 50,000 bank + 60,000 outstanding = 110,000
      expect(result.netWorth).toBe(110000);
    });
  });

  describe("2. Nominee Tracker Asset Valuation", () => {
    it("accurately values goldHoldings using grams and purity factor", () => {
      const state = {
        settings: { goldPricePerGram: 7500 },
        goldHoldings: [
          {
            id: "gold-1",
            type: "physical",
            purity: "22K", // 22/24 multiplier
            grams: 24,
            nominee: "Ananya Mohta",
            nomineeRelation: "Spouse",
          },
        ],
      };

      const flat = flattenAssets(state);
      const goldAsset = flat.find((a) => a.key === "goldHoldings");
      expect(goldAsset).toBeDefined();
      // 24g * 7500 * (22/24) = 1,65,000
      expect(goldAsset?.value).toBe(165000);
      expect(goldAsset?.covered).toBe(true);
    });
  });

  describe("3. Indian Income Tax Engine & Statutory Relief", () => {
    it("correctly calculates Section 87A full rebate for FY 2025-26 under new regime", () => {
      // For taxable income <= 12L (gross income <= 12.75L with 75k std ded)
      const res = calcTaxNewByFY(1275000, "2025-26");
      expect(res.taxable).toBe(1200000);
      expect(res.rebateApplied).toBe(true);
      expect(res.total).toBe(0);
    });

    it("correctly computes marginal relief for income just above 12.75L in FY 2025-26", () => {
      // Gross 13,00,000 => Taxable 12,25,000 (25,000 above 12L threshold)
      const res = calcTaxNewByFY(1300000, "2025-26");
      expect(res.taxable).toBe(1225000);
      expect(res.rebateApplied).toBe(true);
      // Tax capped at excess over 12L (25,000) + 4% cess (1,000) = 26,000
      expect(res.tax).toBe(25000);
      expect(res.cess).toBe(1000);
      expect(res.total).toBe(26000);
    });

    it("correctly calculates old regime tax with standard deduction and 87A rebate", () => {
      // Gross 5.5L - 50k std ded = 5L taxable => 87A full rebate => ₹0 tax
      const res = calcTaxOldByFY(550000, 50000, "2025-26");
      expect(res.taxable).toBe(500000);
      expect(res.rebateApplied).toBe(true);
      expect(res.total).toBe(0);
    });
  });

  describe("4. Executive Financial Planning & Emergency Runway Math", () => {
    it("computes FIRE target corpus with inflation projection and safe withdrawal rate", () => {
      // Annual expense: 12,00,000, 10 years out, 4% SWR, 6% inflation
      const target = computeFireTarget(1200000, 10, 4, 6);
      const inflFactor = Math.pow(1.06, 10);
      const expected = (1200000 * inflFactor) / 0.04;
      expect(Math.round(target)).toBe(Math.round(expected));
    });

    it("correctly calculates liquid assets for emergency fund", () => {
      const state = {
        fixedDeposits: [
          { principal: 100000, maturityDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) },
        ],
        mutualFunds: [
          { category: "Liquid Fund", units: 100, currentNav: 1000 },
          { category: "Flexi Cap", units: 500, currentNav: 50 },
        ],
      };
      const efAssets = getEmergencyFundLiquidAssets(state, 50000, 10000);
      // 50,000 cash + 10,000 prepaid + 1,00,000 near-term FD + 1,00,000 liquid MF = 2,60,000
      expect(efAssets.liquidAssets).toBe(260000);
    });
  });
});
