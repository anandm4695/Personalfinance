import { describe, it, expect } from "vitest";
import { classifyMFHolding, calcSection234CPenalty } from "../components/tabs/TaxVaultTab";

describe("TaxVaultTab classifyMFHolding — debt vs equity MF LTCG threshold", () => {
  it("uses the 12-month (~365 day) LTCG threshold for equity funds", () => {
    const equityFund = { category: "Large Cap", buyDate: "2022-01-01" };
    expect(classifyMFHolding(equityFund, 300).isLtcg).toBe(false); // < 365d
    expect(classifyMFHolding(equityFund, 400).isLtcg).toBe(true); // > 365d
    expect(classifyMFHolding(equityFund, 400).isSlabTaxed).toBe(false);
  });

  it("uses the 36-month (~1095 day) LTCG threshold — not 12-month — for debt funds bought before 1 Apr 2023", () => {
    // Bug: this used to apply the equity 365-day threshold to every fund,
    // so a debt fund held 20 months (~600 days) was misclassified as LTCG
    // (exemption-eligible, lower rate) instead of STCG (slab rate).
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
    // Bug: a prior version of this check only matched category strings
    // containing "debt", so funds like "Liquid Fund" or "Gilt Fund" fell
    // through to equity's 12-month threshold.
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
    // Bug: the old code derived "months late" from (now - dueDate), so
    // checking the tool only 5 days after the Q1 due date undercharged
    // interest (≈1 month) instead of the statutorily fixed 3 months.
    const netLiability = 100000;
    const totalAdvancePaid = 0;
    const now = new Date(2025, 5, 20); // 5 days after the 15 Jun Q1 due date
    // Q1 required = 15% of 100,000 = 15,000; shortfall = 15,000.
    // Fixed 3-month interest: round(15,000 * 0.01 * 3) = 450.
    expect(calcSection234CPenalty(fyStartYear, netLiability, totalAdvancePaid, now)).toBe(450);
  });

  it("caps a Q4 shortfall at exactly 1 month interest, not 3, even long after the due date", () => {
    // Bug: the old code capped every quarter's interest period at 3 months,
    // overcharging Q4 (whose fixed period is 1 month) by up to 3x.
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
