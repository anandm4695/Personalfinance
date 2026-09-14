import { describe, it, expect } from "vitest";
import {
  classifyMFHolding,
  calcSection234CPenalty,
  getOldStdDed,
  getNewStdDed,
  oldMarginalRate,
  computeEquityCGTax,
} from "../components/tabs/TaxVaultTab";

describe("TaxVaultTab classifyMFHolding — debt vs equity MF LTCG threshold", () => {
  it("uses the 12-month (~365 day) LTCG threshold for equity funds", () => {
    const equityFund = { category: "Large Cap", buyDate: "2022-01-01" };
    expect(classifyMFHolding(equityFund, 300).isLtcg).toBe(false); // < 365d
    expect(classifyMFHolding(equityFund, 400).isLtcg).toBe(true); // > 365d
    expect(classifyMFHolding(equityFund, 400).isSlabTaxed).toBe(false);
  });

  it("uses the 36-month (~1095 day) LTCG threshold — not 12-month — for debt funds bought before 1 Apr 2023", () => {
    const debtFundPre2023 = { category: "Corporate Bond Fund", buyDate: "2022-01-01" };
    const result600d = classifyMFHolding(debtFundPre2023, 600);
    expect(result600d.isEquity).toBe(false);
    expect(result600d.isSlabTaxed).toBe(false); // pre-Apr-2023, so not force-slab-taxed
    expect(result600d.isLtcg).toBe(false); // 600 days < 1095-day debt threshold -> STCG

    expect(classifyMFHolding(debtFundPre2023, 1100).isLtcg).toBe(true); // > 1095d -> LTCG
  });

  it("always classifies debt funds bought on/after 1 Apr 2023 as slab-taxed STCG, regardless of holding period (Finance Act 2023)", () => {
    const debtFundPost2023 = { category: "Liquid Fund", buyDate: "2023-06-01" };
    const resultLongHeld = classifyMFHolding(debtFundPost2023, 2000); // ~5.5 years held
    expect(resultLongHeld.isSlabTaxed).toBe(true);
    expect(resultLongHeld.isLtcg).toBe(false);
  });

  it("does not misclassify debt categories that don't literally contain the word 'debt' (Liquid, Gilt, Money Market, Corporate Bond)", () => {
    for (const category of ["Liquid Fund", "Gilt Fund", "Money Market Fund", "Corporate Bond Fund"]) {
      const fund = { category, buyDate: "2022-01-01" };
      const result = classifyMFHolding(fund, 600); // 600 days: >12mo but <36mo
      expect(result.isEquity).toBe(false);
      expect(result.isLtcg).toBe(false); // must be STCG at 600 days for a debt fund
    }
  });
});

describe("TaxVaultTab calcSection234CPenalty — fixed interest period per quarter", () => {
  const fyStartYear = 2025; // FY 2025-26: Q1=15 Jun 25, Q2=15 Sep 25, Q3=15 Dec 25, Q4=15 Mar 26

  it("charges the full fixed 3-month interest for a Q1 shortfall even when checked just days after the due date", () => {
    const netLiability = 100000;
    const totalAdvancePaid = 0;
    const now = new Date(2025, 5, 20); // 5 days after the 15 Jun Q1 due date
    // Q1 required = 15% of 100,000 = 15,000; shortfall = 15,000.
    // Fixed 3-month interest: round(15,000 * 0.01 * 3) = 450.
    expect(calcSection234CPenalty(fyStartYear, netLiability, totalAdvancePaid, now)).toBe(450);
  });

  it("caps a Q4 shortfall at exactly 1 month interest, not 3, even long after the due date", () => {
    const netLiability = 100000;
    const totalAdvancePaid = 90000; // enough to clear Q1/Q2/Q3 cumulative requirements
    const now = new Date(2026, 5, 1); // months after the 15 Mar Q4 due date
    // Q4 required = 100% of 100,000 = 100,000; shortfall = 10,000.
    // Fixed 1-month interest: round(10,000 * 0.01 * 1) = 100 (not 300).
    expect(calcSection234CPenalty(fyStartYear, netLiability, totalAdvancePaid, now)).toBe(100);
  });

  it("charges no interest before any quarter's due date has passed", () => {
    const now = new Date(2025, 4, 1); // 1 May, before Q1's 15 Jun due date
    expect(calcSection234CPenalty(fyStartYear, 100000, 0, now)).toBe(0);
  });

  it("charges no interest when advance tax paid already covers the cumulative requirement", () => {
    const now = new Date(2026, 5, 1); // after all due dates
    expect(calcSection234CPenalty(fyStartYear, 100000, 100000, now)).toBe(0);
  });
});

describe("TaxVaultTab Standard Deduction & Marginal Rate helpers", () => {
  it("returns correct old regime standard deduction by FY", () => {
    expect(getOldStdDed(2024)).toBe(50000);
    expect(getOldStdDed(2020)).toBe(50000);
    expect(getOldStdDed(2019)).toBe(40000);
  });

  it("returns correct new regime standard deduction by FY", () => {
    expect(getNewStdDed(2024)).toBe(75000); // Finance Act 2024
    expect(getNewStdDed(2023)).toBe(50000);
    expect(getNewStdDed(2022)).toBe(0);
  });

  it("computes marginal slab rate for old regime", () => {
    expect(oldMarginalRate(200000)).toBe(0);
    expect(oldMarginalRate(400000)).toBe(0.05);
    expect(oldMarginalRate(800000)).toBe(0.2);
    expect(oldMarginalRate(1500000)).toBe(0.3);
  });
});

describe("TaxVaultTab computeEquityCGTax — post Budget 2024 rate split", () => {
  it("computes STCG at 20% for sales on/after 23-Jul-2024", () => {
    const sells = [{ isLtcg: false, profit: 50000, sellDate: "2024-08-01" }];
    const res = computeEquityCGTax(sells, 125000);
    expect(res.netSTCG).toBe(50000);
    expect(res.taxSTCG).toBe(10000); // 20% of 50,000 = 10,000
  });

  it("computes STCG at 15% for sales before 23-Jul-2024", () => {
    const sells = [{ isLtcg: false, profit: 50000, sellDate: "2024-06-01" }];
    const res = computeEquityCGTax(sells, 125000);
    expect(res.netSTCG).toBe(50000);
    expect(res.taxSTCG).toBe(7500); // 15% of 50,000 = 7,500
  });

  it("applies ₹1.25L LTCG exemption and 12.5% rate post-Budget 2024", () => {
    const sells = [{ isLtcg: true, profit: 225000, sellDate: "2024-09-01" }];
    const res = computeEquityCGTax(sells, 125000);
    expect(res.netLTCG).toBe(225000);
    // Taxable LTCG = 225,000 - 125,000 = 100,000 @ 12.5% = 12,500
    expect(res.taxLTCG).toBe(12500);
  });
});
