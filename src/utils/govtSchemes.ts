// Real-world Post Office / PFRDA scheme parameters used to project maturity value,
// compute periodic payouts, and flag deposit-limit breaches for the Govt Schemes tab.
// These are published scheme rules, not user data — kept separate from the component
// so the math can be unit-tested independently.
import { today } from "./finance";

export type SchemeGrowthMode = "compounding" | "payout" | "none";

interface SchemeRule {
  growth: SchemeGrowthMode;
  payoutFreqPerYear?: number; // 4 = quarterly, 12 = monthly, 2 = half-yearly
  depositCapSingle?: number;
  depositCapJoint?: number;
  annualContributionCap?: number;
  defaultPremium?: number;
}

export const SCHEME_RULES: Record<string, SchemeRule> = {
  SSY: { growth: "compounding", annualContributionCap: 150000 },
  NSC: { growth: "compounding" },
  KVP: { growth: "compounding" },
  NPS_LITE: { growth: "compounding" },
  SCSS: { growth: "payout", payoutFreqPerYear: 4, depositCapSingle: 3000000 },
  POST_MIS: {
    growth: "payout",
    payoutFreqPerYear: 12,
    depositCapSingle: 900000,
    depositCapJoint: 1500000,
  },
  RBI_BOND: { growth: "payout", payoutFreqPerYear: 2 },
  PMJJBY: { growth: "none", defaultPremium: 436 },
  PMSBY: { growth: "none", defaultPremium: 20 },
};

// APY only pays pension in these five fixed monthly tiers — anything else is invalid data.
export const APY_PENSION_TIERS = [1000, 2000, 3000, 4000, 5000];

// PM-KISAN is a fixed DBT benefit (₹2,000 × 3 instalments), not something the user contributes.
export const PMKISAN_ANNUAL_BENEFIT = 6000;

const FREQ_MULTIPLIER: Record<string, number> = {
  monthly: 12,
  quarterly: 4,
  annual: 1,
  one_time: 0,
};

export const annualizeContribution = (amount: number, frequency: string) =>
  Number(amount || 0) * (FREQ_MULTIPLIER[frequency] ?? 1);

const yearsBetween = (from: string, to: string) => {
  const a = new Date(from + "T00:00:00").getTime();
  const b = new Date(to + "T00:00:00").getTime();
  return (b - a) / (365.25 * 24 * 3600 * 1000);
};

export interface SchemeProjection {
  mode: SchemeGrowthMode;
  label: string;
  value: number;
}

// Projects the maturity value (compounding schemes) or the recurring payout amount
// (payout schemes) from the scheme's current balance and stated rate. Compounding
// schemes (NSC/KVP/SSY/NPS Lite) reinvest interest to maturity; payout schemes
// (SCSS/POMIS/RBI Bond) disburse interest on a fixed cycle and return principal at
// maturity, so their "growth" is the periodic payout, not a bigger corpus.
export function projectSchemeValue(scheme: any): SchemeProjection | null {
  const rule = SCHEME_RULES[scheme.schemeType];
  if (!rule) return null;
  const balance = Number(scheme.currentBalance || 0);
  const rate = Number(scheme.interestRate || 0);
  if (balance <= 0 || rate <= 0) return null;

  if (rule.growth === "compounding") {
    if (!scheme.maturityDate) return null;
    const years = yearsBetween(today(), scheme.maturityDate);
    if (years <= 0) return null;
    return {
      mode: "compounding",
      label: "Projected Maturity Value",
      value: balance * Math.pow(1 + rate / 100, years),
    };
  }

  if (rule.growth === "payout" && rule.payoutFreqPerYear) {
    const value = (balance * rate) / 100 / rule.payoutFreqPerYear;
    const label =
      rule.payoutFreqPerYear === 4
        ? "Quarterly Payout"
        : rule.payoutFreqPerYear === 12
          ? "Monthly Payout"
          : "Half-Yearly Payout";
    return { mode: "payout", label, value };
  }

  return null;
}

// Soft, non-blocking data-entry guardrails against published scheme limits — flags
// obviously-wrong entries (e.g. a POMIS balance above even the joint-account cap)
// without hard-blocking the save, since limits change over time and this app can't
// verify single/joint account status.
export function getSchemeWarnings(scheme: any): string[] {
  const rule = SCHEME_RULES[scheme.schemeType];
  if (!rule) return [];
  const warnings: string[] = [];
  const balance = Number(scheme.currentBalance || 0);

  const cap = rule.depositCapJoint || rule.depositCapSingle;
  if (cap && balance > cap) {
    warnings.push(
      `Balance exceeds the official deposit limit of ₹${cap.toLocaleString("en-IN")} for this scheme.`
    );
  }

  if (rule.annualContributionCap) {
    const annual = annualizeContribution(
      Number(scheme.contributionAmount || 0),
      scheme.frequency || "annual"
    );
    if (annual > rule.annualContributionCap) {
      warnings.push(
        `Annual deposit of ₹${annual.toLocaleString("en-IN")} exceeds the ₹${rule.annualContributionCap.toLocaleString("en-IN")}/year cap for this scheme.`
      );
    }
  }

  return warnings;
}

export function getMaturityStatus(
  maturityDate: string | undefined
): { days: number; label: string; urgency: "overdue" | "soon" | "upcoming" | "distant" } | null {
  if (!maturityDate) return null;
  const days = Math.ceil(
    (new Date(maturityDate + "T00:00:00").getTime() -
      new Date(today() + "T00:00:00").getTime()) /
      86400000
  );
  if (days < 0) return { days, label: `Matured ${Math.abs(days)}d ago`, urgency: "overdue" };
  if (days === 0) return { days, label: "Matures today", urgency: "soon" };
  if (days <= 30) return { days, label: `Matures in ${days}d`, urgency: "soon" };
  if (days <= 90) return { days, label: `Matures in ${Math.ceil(days / 7)}w`, urgency: "upcoming" };
  return { days, label: `Matures in ${Math.round(days / 30)}mo`, urgency: "distant" };
}
