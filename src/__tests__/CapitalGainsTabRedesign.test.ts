import { describe, it, expect } from "vitest";
import {
  getHoldingMonths,
  isLongTerm,
  isEquityMF,
  computeScheduleCGQuarters,
  ClassifiedSell,
} from "../components/tabs/CapitalGainsTab";

describe("CapitalGainsTab Redesign & Statutory Engines", () => {
  describe("isEquityMF identification", () => {
    it("identifies equity funds by various standard category substrings", () => {
      expect(isEquityMF({ category: "Flexi Cap Fund" })).toBe(true);
      expect(isEquityMF({ category: "Large & Mid Cap" })).toBe(true);
      expect(isEquityMF({ scheme: "Parag Parikh ELSS Tax Saver" })).toBe(true);
      expect(isEquityMF({ name: "Nifty 50 Index Fund" })).toBe(true);
    });

    it("correctly flags debt funds as non-equity", () => {
      expect(isEquityMF({ category: "Liquid Fund" })).toBe(false);
      expect(isEquityMF({ category: "Corporate Bond Fund" })).toBe(false);
      expect(isEquityMF({ name: "HDFC Short Term Debt Fund" })).toBe(false);
    });
  });

  describe("computeScheduleCGQuarters — ITR Schedule CG Section F Accrual", () => {
    it("correctly buckets transactions into the 5 statutory ITR date intervals", () => {
      const mockSales: ClassifiedSell[] = [
        {
          name: "TCS",
          buyDate: "2023-01-10",
          buyPrice: 100000,
          sellDate: "2024-05-10", // Q1 (up to 15-Jun-2024)
          sellPrice: 150000,
          qty: 50,
          holdingMonths: 16,
          profit: 50000,
          profitPct: 50,
          taxRate: 0.1,
          estimatedTax: 5000,
          gainType: "EQUITY_LTCG",
          assetType: "Stock",
        },
        {
          name: "INFY",
          buyDate: "2024-05-01",
          buyPrice: 50000,
          sellDate: "2024-08-10", // Q2 (16-Jun to 15-Sep)
          sellPrice: 60000,
          qty: 30,
          holdingMonths: 3,
          profit: 10000,
          profitPct: 20,
          taxRate: 0.2,
          estimatedTax: 2000,
          gainType: "EQUITY_STCG",
          assetType: "Stock",
        },
        {
          name: "HDFC Bank",
          buyDate: "2024-01-10",
          buyPrice: 80000,
          sellDate: "2024-11-20", // Q3 (16-Sep to 15-Dec)
          sellPrice: 75000,
          qty: 50,
          holdingMonths: 10,
          profit: -5000,
          profitPct: -6.25,
          taxRate: 0.2,
          estimatedTax: 0,
          gainType: "EQUITY_STCG",
          assetType: "Stock",
        },
        {
          name: "Reliance",
          buyDate: "2024-02-01",
          buyPrice: 120000,
          sellDate: "2025-02-15", // Q4A (16-Dec to 15-Mar)
          sellPrice: 140000,
          qty: 40,
          holdingMonths: 12,
          profit: 20000,
          profitPct: 16.67,
          taxRate: 0.2,
          estimatedTax: 4000,
          gainType: "EQUITY_STCG",
          assetType: "Stock",
        },
        {
          name: "ICICI Prudential Debt",
          buyDate: "2023-05-01",
          buyPrice: 100000,
          sellDate: "2025-03-25", // Q4B (16-Mar to 31-Mar)
          sellPrice: 112000,
          qty: 1000,
          holdingMonths: 22,
          profit: 12000,
          profitPct: 12,
          taxRate: 0.3,
          estimatedTax: 3600,
          gainType: "DEBT_STCG",
          assetType: "Mutual Fund",
        },
      ];

      const quarters = computeScheduleCGQuarters(mockSales, 2024);
      expect(quarters).toHaveLength(5);

      // Q1 Check
      expect(quarters[0].key).toBe("Q1");
      expect(quarters[0].equityLTCG).toBe(50000);
      expect(quarters[0].txnCount).toBe(1);

      // Q2 Check
      expect(quarters[1].key).toBe("Q2");
      expect(quarters[1].equitySTCG).toBe(10000);
      expect(quarters[1].txnCount).toBe(1);

      // Q3 Check
      expect(quarters[2].key).toBe("Q3");
      expect(quarters[2].equitySTCG).toBe(-5000);
      expect(quarters[2].txnCount).toBe(1);

      // Q4A Check
      expect(quarters[3].key).toBe("Q4A");
      expect(quarters[3].equitySTCG).toBe(20000);
      expect(quarters[3].txnCount).toBe(1);

      // Q4B Check
      expect(quarters[4].key).toBe("Q4B");
      expect(quarters[4].debtSTCG).toBe(12000);
      expect(quarters[4].txnCount).toBe(1);
    });
  });
});
