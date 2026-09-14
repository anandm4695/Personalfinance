import React from "react";
import {
  Shield,
  Heart,
  Zap,
  Wallet,
  TrendingUp,
  AlertCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";
import { StatCard } from "../ui/StatCard";

interface InsuranceStatCardsProps {
  totalLifeCover: number;
  totalTermCover: number;
  totalLICAssured: number;
  totalInvestMaturity: number;
  totalAnnualPremium: number;
  annualIncome: number;
  premiumBurdenPct: number;
  coverRatio: number;
  adequacyLevel: "excellent" | "adequate" | "low" | "critical" | "none";
  adequacyLabel: string;
  adequacyColor: string;
  activePoliciesCount: number;
  upcomingDueCount: number;
}

export const InsuranceStatCards: React.FC<InsuranceStatCardsProps> = ({
  totalLifeCover,
  totalTermCover,
  totalLICAssured,
  totalInvestMaturity,
  totalAnnualPremium,
  annualIncome,
  premiumBurdenPct,
  coverRatio,
  adequacyLabel,
  adequacyColor,
  activePoliciesCount,
  upcomingDueCount,
}) => {
  return (
    <div className="ins-stats-grid">
      <StatCard
        label="Total Life Cover"
        value={fmtINRFull(totalLifeCover)}
        numericValue={totalLifeCover}
        formatValue={fmtINRFull}
        sub="Pure Term + LIC Assured combined"
        icon={<ShieldCheck />}
        color={THEME.accent}
      />
      <StatCard
        label="Pure Term Cover"
        value={fmtINRFull(totalTermCover)}
        numericValue={totalTermCover}
        formatValue={fmtINRFull}
        sub={annualIncome > 0 ? `${coverRatio.toFixed(1)}× annual income` : "Risk protection coverage"}
        icon={<Zap />}
        color={THEME.accent}
      />
      <StatCard
        label="LIC Sum Assured"
        value={fmtINRFull(totalLICAssured)}
        numericValue={totalLICAssured}
        formatValue={fmtINRFull}
        sub="Traditional life policies"
        icon={<Shield />}
        color={THEME.rust}
      />
      <StatCard
        label="Annual Premium"
        value={fmtINRFull(totalAnnualPremium)}
        numericValue={totalAnnualPremium}
        formatValue={fmtINRFull}
        sub={
          annualIncome > 0
            ? `${premiumBurdenPct.toFixed(1)}% of annual income`
            : "Total yearly outflow"
        }
        icon={<Wallet />}
        color={THEME.gold}
      />
      <StatCard
        label="Investment Maturity"
        value={fmtINRFull(totalInvestMaturity)}
        numericValue={totalInvestMaturity}
        formatValue={fmtINRFull}
        sub="Endowment & ULIP returns"
        icon={<TrendingUp />}
        color={THEME.sage}
      />
      <StatCard
        label="Cover Adequacy"
        value={annualIncome > 0 ? `${coverRatio.toFixed(1)}×` : "—"}
        numericValue={annualIncome > 0 ? coverRatio : undefined}
        formatValue={(n: number) => `${n.toFixed(1)}×`}
        sub={adequacyLabel}
        icon={<AlertCircle />}
        color={adequacyColor}
      />
    </div>
  );
};
