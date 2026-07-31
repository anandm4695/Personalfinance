import {
  annualizeContribution,
  APY_PENSION_TIERS,
  getMaturityStatus,
  getSchemeWarnings,
  PMKISAN_ANNUAL_BENEFIT,
  projectSchemeValue,
  SCHEME_RULES,
} from "../utils/govtSchemes";
import { nextAnnualOccurrence, today } from "../utils/finance";

describe("annualizeContribution", () => {
  it("multiplies monthly/quarterly amounts up to an annual figure", () => {
    expect(annualizeContribution(1000, "monthly")).toBe(12000);
    expect(annualizeContribution(1000, "quarterly")).toBe(4000);
    expect(annualizeContribution(1000, "annual")).toBe(1000);
    expect(annualizeContribution(1000, "one_time")).toBe(0);
  });

  it("treats unknown/blank frequency as annual", () => {
    expect(annualizeContribution(1000, "")).toBe(1000);
    expect(annualizeContribution(1000, undefined as any)).toBe(1000);
  });
});

describe("projectSchemeValue", () => {
  it("returns null when balance or rate is missing", () => {
    expect(projectSchemeValue({ schemeType: "NSC", currentBalance: 0, interestRate: 7.7 })).toBe(
      null
    );
    expect(
      projectSchemeValue({ schemeType: "NSC", currentBalance: 100000, interestRate: 0 })
    ).toBe(null);
  });

  it("compounds NSC/KVP/SSY/NPS Lite balance to the maturity date", () => {
    const oneYearOut = new Date();
    oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
    const maturityDate = oneYearOut.toISOString().slice(0, 10);
    const result = projectSchemeValue({
      schemeType: "NSC",
      currentBalance: 100000,
      interestRate: 7.7,
      maturityDate,
    });
    expect(result?.mode).toBe("compounding");
    // ~1 year of compounding at 7.7% should land close to 107,700
    expect(result!.value).toBeGreaterThan(107000);
    expect(result!.value).toBeLessThan(108500);
  });

  it("returns null for compounding schemes without a maturity date", () => {
    expect(
      projectSchemeValue({ schemeType: "KVP", currentBalance: 50000, interestRate: 7.5 })
    ).toBe(null);
  });

  it("computes the quarterly payout for SCSS from balance and rate", () => {
    const result = projectSchemeValue({
      schemeType: "SCSS",
      currentBalance: 1000000,
      interestRate: 8.2,
    });
    expect(result?.mode).toBe("payout");
    expect(result?.label).toBe("Quarterly Payout");
    expect(result!.value).toBeCloseTo(20500, 0); // 10L × 8.2% / 4
  });

  it("computes the monthly payout for Post Office MIS", () => {
    const result = projectSchemeValue({
      schemeType: "POST_MIS",
      currentBalance: 900000,
      interestRate: 7.4,
    });
    expect(result?.label).toBe("Monthly Payout");
    expect(result!.value).toBeCloseTo(5550, 0); // 9L × 7.4% / 12
  });

  it("computes the half-yearly payout for the RBI Floating Rate Bond", () => {
    const result = projectSchemeValue({
      schemeType: "RBI_BOND",
      currentBalance: 500000,
      interestRate: 8.05,
    });
    expect(result?.label).toBe("Half-Yearly Payout");
    expect(result!.value).toBeCloseTo(20125, 0); // 5L × 8.05% / 2
  });

  it("returns null for insurance schemes (no corpus growth)", () => {
    expect(
      projectSchemeValue({ schemeType: "PMJJBY", currentBalance: 0, interestRate: 0 })
    ).toBe(null);
  });
});

describe("getSchemeWarnings", () => {
  it("flags a POST_MIS balance above the joint-account deposit cap", () => {
    const warnings = getSchemeWarnings({ schemeType: "POST_MIS", currentBalance: 1600000 });
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/15,00,000/);
  });

  it("does not flag a POST_MIS balance within the joint-account cap", () => {
    expect(getSchemeWarnings({ schemeType: "POST_MIS", currentBalance: 1400000 })).toEqual([]);
  });

  it("flags SSY annual contribution above the ₹1.5L/year cap", () => {
    const warnings = getSchemeWarnings({
      schemeType: "SSY",
      contributionAmount: 20000,
      frequency: "monthly",
    });
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/1,50,000/);
  });

  it("returns no warnings for a scheme with no configured rules", () => {
    expect(getSchemeWarnings({ schemeType: "PMKISAN", currentBalance: 6000 })).toEqual([]);
  });
});

describe("getMaturityStatus", () => {
  it("returns null when there is no maturity date", () => {
    expect(getMaturityStatus(undefined)).toBe(null);
  });

  it("flags a past maturity date as overdue", () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    const status = getMaturityStatus(past.toISOString().slice(0, 10));
    expect(status?.urgency).toBe("overdue");
    expect(status?.label).toMatch(/Matured/);
  });

  it("flags a maturity within 30 days as soon", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 10);
    const status = getMaturityStatus(soon.toISOString().slice(0, 10));
    expect(status?.urgency).toBe("soon");
  });

  it("flags a distant maturity correctly", () => {
    const distant = new Date();
    distant.setDate(distant.getDate() + 200);
    const status = getMaturityStatus(distant.toISOString().slice(0, 10));
    expect(status?.urgency).toBe("distant");
  });
});

describe("scheme constants", () => {
  it("APY only allows the five official pension tiers", () => {
    expect(APY_PENSION_TIERS).toEqual([1000, 2000, 3000, 4000, 5000]);
  });

  it("PM-KISAN benefit is the fixed ₹6,000/year DBT amount", () => {
    expect(PMKISAN_ANNUAL_BENEFIT).toBe(6000);
  });

  it("classifies payout vs compounding schemes correctly", () => {
    expect(SCHEME_RULES.SCSS.growth).toBe("payout");
    expect(SCHEME_RULES.POST_MIS.growth).toBe("payout");
    expect(SCHEME_RULES.RBI_BOND.growth).toBe("payout");
    expect(SCHEME_RULES.NSC.growth).toBe("compounding");
    expect(SCHEME_RULES.KVP.growth).toBe("compounding");
    expect(SCHEME_RULES.SSY.growth).toBe("compounding");
    expect(SCHEME_RULES.NPS_LITE.growth).toBe("compounding");
    expect(SCHEME_RULES.PMJJBY.growth).toBe("none");
    expect(SCHEME_RULES.PMSBY.growth).toBe("none");
  });
});

describe("nextAnnualOccurrence", () => {
  it("returns this year's anniversary when it hasn't passed yet", () => {
    expect(nextAnnualOccurrence("2020-12-25", "2026-01-01")).toBe("2026-12-25");
  });

  it("rolls over to next year once the anniversary has passed", () => {
    expect(nextAnnualOccurrence("2020-01-15", "2026-06-01")).toBe("2027-01-15");
  });

  it("returns the same day when the anniversary is today", () => {
    const t = today();
    const [y, m, d] = t.split("-");
    expect(nextAnnualOccurrence(`2019-${m}-${d}`, t)).toBe(t);
  });

  it("clamps a Feb 29 anniversary to Feb 28 on a non-leap year", () => {
    expect(nextAnnualOccurrence("2020-02-29", "2025-01-01")).toBe("2025-02-28");
  });
});
