import { THEME } from "../../utils/constants";
import { today } from "../../utils/finance";

export type InsuranceSubTab =
  | "all"
  | "term"
  | "lic"
  | "invest"
  | "calendar"
  | "analyzer";

export interface PremiumTransaction {
  id: string;
  date: string;
  amount: number;
  mode?: string;
  receiptNumber?: string;
  notes?: string;
}

export interface LICPolicy {
  id: string;
  owner?: string;
  planName: string;
  policyNumber?: string;
  sumAssured: number | string;
  annualPremium: number | string;
  premiumPaid?: number | string;
  commencementDate?: string;
  maturityDate?: string;
  policyTerm?: number | string;
  premiumPayingTerm?: number | string;
  transactions?: PremiumTransaction[];
  nominee?: string;
  nomineeRelation?: string;
  nomineeShare?: number | string;
}

export interface TermPlan {
  id: string;
  owner?: string;
  insurer: string;
  planName: string;
  coverAmount: number | string;
  annualPremium: number | string;
  premiumPaid?: number | string;
  startDate?: string;
  expiryDate?: string;
  term?: number | string;
  premiumPayingTerm?: number | string;
  policyNumber?: string;
  transactions?: PremiumTransaction[];
  nominee?: string;
  nomineeRelation?: string;
  nomineeShare?: number | string;
  riderDetails?: string;
}

export interface InvestmentPlan {
  id: string;
  owner?: string;
  insurer: string;
  planName: string;
  policyNumber?: string;
  sumAssured?: number | string;
  annualPremium: number | string;
  premiumPaid?: number | string;
  policyTerm?: number | string;
  premiumPayingTerm?: number | string;
  commencementDate?: string;
  maturityDate?: string;
  expectedMaturityAmount: number | string;
  transactions?: PremiumTransaction[];
  nominee?: string;
  nomineeRelation?: string;
  nomineeShare?: number | string;
}

export type UnifiedPolicyType = "lic" | "term" | "invest";

export interface UnifiedInsurancePolicy {
  id: string;
  type: UnifiedPolicyType;
  typeLabel: string;
  typeColor: string;
  owner: string;
  insurer: string;
  planName: string;
  policyNumber: string;
  coverAmount: number; // sumAssured or coverAmount or expectedMaturityAmount
  annualPremium: number;
  totalPaid: number;
  expectedTotal: number;
  balanceToPay: number;
  progressPct: number;
  startDate: string;
  endDate: string; // maturity or expiry
  policyTerm: number;
  payingTerm: number;
  isFullyPaid: boolean;
  isMatured: boolean;
  nextDueDate: string | null;
  daysUntilDue: number | null;
  raw: any;
}

/**
 * Add years clamped for leap years (Feb 29 safety)
 */
export const addYearsClamped = (date: Date, years: number): Date => {
  const targetYear = date.getFullYear() + years;
  const month = date.getMonth();
  const lastDayOfMonth = new Date(targetYear, month + 1, 0).getDate();
  const result = new Date(date);
  result.setFullYear(targetYear, month, Math.min(date.getDate(), lastDayOfMonth));
  return result;
};

/**
 * Calculate next annual premium due date given commencement & maturity date
 */
export const getNextPremiumDueDate = (
  commenceDateStr?: string,
  endDateStr?: string
): { dateStr: string; days: number } | null => {
  if (!commenceDateStr) return null;
  const start = new Date(commenceDateStr);
  if (isNaN(start.getTime())) return null;

  const now = new Date();
  const currentYear = now.getFullYear();

  // Try anniversary this year
  let target = new Date(currentYear, start.getMonth(), start.getDate());
  
  // If target already passed more than 30 days ago, look at next year's anniversary
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / 86400000);
  if (diffDays < -30) {
    target = new Date(currentYear + 1, start.getMonth(), start.getDate());
  }

  // If endDate exists and target is strictly beyond endDate
  if (endDateStr) {
    const end = new Date(endDateStr);
    if (!isNaN(end.getTime()) && target > end) {
      return null;
    }
  }

  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, "0");
  const d = String(target.getDate()).padStart(2, "0");
  const finalDays = Math.ceil((target.getTime() - now.getTime()) / 86400000);

  return {
    dateStr: `${y}-${m}-${d}`,
    days: finalDays,
  };
};

/**
 * Format ISO date string into human readable '15 Aug 2026'
 */
export const fmtDate = (d?: string | null): string => {
  if (!d) return "—";
  try {
    const parts = d.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${months[monthIdx]} ${year}`;
      }
    }
    const date = new Date(d);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
  } catch {}
  return String(d);
};

