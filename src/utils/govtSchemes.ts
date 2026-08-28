// Real-world Post Office / PFRDA scheme parameters used to project maturity value,
// compute periodic payouts, and flag deposit-limit breaches for the Govt Schemes tab.
// These are published scheme rules, not user data — kept separate from the component
// so the math can be unit-tested independently.
import { today } from "./finance";

export type SchemeGrowthMode = "compounding" | "payout" | "none";
export type SchemeCategory = "pension" | "child" | "fixed_income" | "insurance" | "dbt";

export interface SchemeRule {
  growth: SchemeGrowthMode;
  category?: SchemeCategory;
  payoutFreqPerYear?: number; // 4 = quarterly, 12 = monthly, 2 = half-yearly
  depositCapSingle?: number;
  depositCapJoint?: number;
  annualContributionCap?: number;
  defaultPremium?: number;
  officialRate?: number;
  tenureYears?: number;
  taxBenefit?: string;
  minDeposit?: number;
  eligibility?: string;
}

export const SCHEME_RULES: Record<string, SchemeRule> = {
  SSY: {
    growth: "compounding",
    category: "child",
    annualContributionCap: 150000,
    officialRate: 8.2,
    tenureYears: 21,
    taxBenefit: "Section 80C · EEE (Tax-Free Interest & Maturity)",
    minDeposit: 250,
    depositCapSingle: 150000,
    eligibility: "Girl child below 10 years (max 2 daughters per family)",
  },
  NSC: {
    growth: "compounding",
    category: "fixed_income",
    officialRate: 7.7,
    tenureYears: 5,
    taxBenefit: "Section 80C (Reinvested interest eligible)",
    minDeposit: 1000,
    eligibility: "All Resident Indian Individuals",
  },
  KVP: {
    growth: "compounding",
    category: "fixed_income",
    officialRate: 7.5,
    tenureYears: 9.6, // ~115 months to double
    taxBenefit: "Taxable as per Income Slab",
    minDeposit: 1000,
    eligibility: "All Resident Indian Individuals",
  },
  NPS_LITE: {
    growth: "compounding",
    category: "pension",
    officialRate: 9.5,
    taxBenefit: "Section 80CCD(1B) / 80C",
    minDeposit: 1000,
    eligibility: "Unorganised sector workers aged 18–60",
  },
  SCSS: {
    growth: "payout",
    category: "fixed_income",
    payoutFreqPerYear: 4,
    depositCapSingle: 3000000,
    officialRate: 8.2,
    tenureYears: 5,
    taxBenefit: "Section 80C · Quarterly interest is taxable",
    minDeposit: 1000,
    eligibility: "Individuals aged 60+ (or 55+ for VRS/Defence retirees)",
  },
  POST_MIS: {
    growth: "payout",
    category: "fixed_income",
    payoutFreqPerYear: 12,
    depositCapSingle: 900000,
    depositCapJoint: 1500000,
    officialRate: 7.4,
    tenureYears: 5,
    taxBenefit: "Monthly interest is taxable as per income slab",
    minDeposit: 1000,
    eligibility: "All Resident Indian Individuals (Single/Joint up to 3)",
  },
  RBI_BOND: {
    growth: "payout",
    category: "fixed_income",
    payoutFreqPerYear: 2,
    officialRate: 8.05,
    tenureYears: 7,
    taxBenefit: "Half-yearly interest taxable; TDS applies",
    minDeposit: 1000,
    eligibility: "Citizens of India & HUFs (Floating rate linked to NSC + 0.35%)",
  },
  PMJJBY: {
    growth: "none",
    category: "insurance",
    defaultPremium: 436,
    officialRate: 0,
    taxBenefit: "Section 80C (Premium) & 10(10D) (Death Benefit)",
    eligibility: "Bank account holders aged 18–50 (₹2 Lakh Life Cover)",
  },
  PMSBY: {
    growth: "none",
    category: "insurance",
    defaultPremium: 20,
    officialRate: 0,
    taxBenefit: "Section 80C / 10(10D) (Accidental Death / Disability Cover)",
    eligibility: "Bank account holders aged 18–70 (₹2 Lakh Accident Cover)",
  },
  APY: {
    growth: "payout",
    category: "pension",
    officialRate: 8.0,
    taxBenefit: "Section 80CCD(1B) up to ₹50,000 extra",
    eligibility: "Citizens aged 18–40 (Pension starts at age 60)",
  },
  PMKISAN: {
    growth: "none",
    category: "dbt",
    officialRate: 0,
    taxBenefit: "Direct Benefit Transfer (DBT) · ₹6,000 / year",
    eligibility: "Landholding farmer families with cultivable land",
  },
};

// APY only pays pension in these five fixed monthly tiers — anything else is invalid data.
export const APY_PENSION_TIERS = [1000, 2000, 3000, 4000, 5000];

// APY representative monthly contribution table by entry age
export const APY_CONTRIBUTION_TABLE: Record<number, Record<number, number>> = {
  18: { 1000: 42, 2000: 84, 3000: 126, 4000: 168, 5000: 210 },
  25: { 1000: 76, 2000: 151, 3000: 226, 4000: 301, 5000: 376 },
  30: { 1000: 116, 2000: 231, 3000: 347, 4000: 462, 5000: 577 },
  35: { 1000: 181, 2000: 362, 3000: 543, 4000: 724, 5000: 902 },
  40: { 1000: 291, 2000: 582, 3000: 873, 4000: 1164, 5000: 1454 },
};

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

// SSY Maturity Calculator Helper (15 years deposit, matures at 21 years)
export function calculateSSYProjection(yearlyDeposit: number, rate = 8.2) {
  const depositYears = 15;
  const maturityYears = 21;
  let balance = 0;
  let totalInvested = 0;
  const r = rate / 100;

  for (let year = 1; year <= maturityYears; year++) {
    if (year <= depositYears) {
      balance += yearlyDeposit;
      totalInvested += yearlyDeposit;
    }
    balance += balance * r;
  }

  return {
    totalInvested,
    totalInterest: balance - totalInvested,
    maturityAmount: balance,
  };
}

// SCSS Quarterly Payout Helper
export function calculateSCSSProjection(depositAmount: number, rate = 8.2) {
  const quarterlyPayout = Math.round(((depositAmount * (rate / 100)) / 4) * 100) / 100;
  const annualIncome = Math.round(quarterlyPayout * 4 * 100) / 100;
  const total5YearInterest = Math.round(annualIncome * 5 * 100) / 100;
  return {
    quarterlyPayout,
    annualIncome,
    total5YearInterest,
    maturityAmount: depositAmount,
  };
}

// POMIS Monthly Payout Helper
export function calculatePOMISProjection(depositAmount: number, rate = 7.4) {
  const monthlyPayout = Math.round(((depositAmount * (rate / 100)) / 12) * 100) / 100;
  const annualIncome = Math.round(monthlyPayout * 12 * 100) / 100;
  const total5YearInterest = Math.round(annualIncome * 5 * 100) / 100;
  return {
    monthlyPayout,
    annualIncome,
    total5YearInterest,
    maturityAmount: depositAmount,
  };
}

// NSC / KVP Compounding Calculator Helper
export function calculateCompoundingScheme(depositAmount: number, rate: number, years: number) {
  const maturityAmount = depositAmount * Math.pow(1 + rate / 100, years);
  const totalInterest = maturityAmount - depositAmount;
  return {
    depositAmount,
    totalInterest,
    maturityAmount,
  };
}
