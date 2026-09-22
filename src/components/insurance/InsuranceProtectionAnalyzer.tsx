import React, { useState } from "react";
import {
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Sparkles,
  TrendingUp,
  Receipt,
  Calculator,
  PieChart as PieIcon,
  CheckCircle2,
  Zap,
  Lightbulb,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, fmtINRExact } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Money } from "../ui/Money";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { UnifiedInsurancePolicy } from "./InsuranceTypes";

interface InsuranceProtectionAnalyzerProps {
  policies: UnifiedInsurancePolicy[];
  annualIncome: number;
  totalLifeCover: number;
  totalLICAssured: number;
  totalTermCover: number;
  totalInvestMaturity: number;
  totalAnnualPremium: number;
  licAnnualPremium: number;
  termAnnualPremium: number;
  investAnnualPremium: number;
  totalLiabilities?: number;
}

export const InsuranceProtectionAnalyzer: React.FC<InsuranceProtectionAnalyzerProps> = ({
  policies,
  annualIncome,
  totalLifeCover,
  totalLICAssured,
  totalTermCover,
  totalInvestMaturity,
  totalAnnualPremium,
  licAnnualPremium,
  termAnnualPremium,
  investAnnualPremium,
  totalLiabilities = 0,
}) => {
  // Custom user parameters for interactive HLV simulation
  const [multiplier, setMultiplier] = useState<number>(15);
  const [liabilitiesInput, setLiabilitiesInput] = useState<number>(totalLiabilities);
  const [dependentsNeed, setDependentsNeed] = useState<number>(2500000);

  // Recommended cover = (Annual Income * Multiplier) + Outstanding Liabilities + Future Goals
  const incomeProtection = annualIncome * multiplier;
  const totalRecommendedCover = incomeProtection + (liabilitiesInput || 0) + (dependentsNeed || 0);
  const protectionGap = Math.max(0, totalRecommendedCover - totalLifeCover);
  const protectionSurplus = Math.max(0, totalLifeCover - totalRecommendedCover);
  const coverageHealthPct = totalRecommendedCover > 0 ? (totalLifeCover / totalRecommendedCover) * 100 : 0;

  // Sec 80C Deduction Calculation (LIC + Investment plans capped at ₹1.5L)
  const eligible80CPremium = licAnnualPremium + investAnnualPremium;
  const claimed80C = Math.min(150000, eligible80CPremium);
  const remaining80CCap = Math.max(0, 150000 - claimed80C);

  // Chart data
  const premiumData = [
    { name: "Term Cover Premiums", value: termAnnualPremium, color: THEME.accent },
    { name: "LIC Premiums", value: licAnnualPremium, color: THEME.rust },
    { name: "Investment Premiums", value: investAnnualPremium, color: THEME.sage },
  ].filter((d) => d.value > 0);

  const coverageData = [
    { name: "Term Protection Cover", value: totalTermCover, color: THEME.accent },
    { name: "LIC Assured Cover", value: totalLICAssured, color: THEME.rust },
    { name: "Investment Maturity", value: totalInvestMaturity, color: THEME.sage },
  ].filter((d) => d.value > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Banner: Protection Adequacy Summary */}
      <Card
        style={{
          padding: "24px 28px",
          background: "linear-gradient(135deg, var(--surface-0), color-mix(in srgb, var(--t-accent) 4%, transparent))",
          border: `1px solid ${THEME.line}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <ShieldCheck size={20} style={{ color: "var(--t-accent)" }} />
              <div style={{ fontSize: 18, fontWeight: 900, color: "var(--t-ink)" }}>
                Human Life Value (HLV) & Protection Gap Analyzer
              </div>
            </div>
            <div style={{ fontSize: 13, color: "var(--t-muted)", maxWidth: 640 }}>
              Calculates your family's exact financial shield requirement based on income replacement, debt liabilities, and future milestones.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--surface-0)",
              padding: "10px 16px",
              borderRadius: 10,
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase" }}>
                Current Protection Health
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: coverageHealthPct >= 80 ? "var(--t-sage)" : "var(--t-gold)" }}>
                {coverageHealthPct.toFixed(0)}% Covered
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Parameter Controls */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginTop: 20,
            paddingTop: 18,
            borderTop: `1px solid ${THEME.line}`,
          }}
        >
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t-muted)", display: "block", marginBottom: 6 }}>
              Income Multiplier: <strong style={{ color: "var(--t-ink)" }}>{multiplier}×</strong>
            </label>
            <input
              type="range"
              min={10}
              max={25}
              step={1}
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--t-accent)" }}
            />
            <div style={{ fontSize: 10, color: "var(--t-muted)", marginTop: 2 }}>
              Industry benchmark is 15×–20× annual income
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t-muted)", display: "block", marginBottom: 6 }}>
              Outstanding Liabilities (₹)
            </label>
            <input
              type="number"
              className="form-input"
              value={liabilitiesInput}
              onChange={(e) => setLiabilitiesInput(Number(e.target.value))}
              placeholder="e.g. 3500000"
              style={{ fontSize: 12, padding: "6px 10px" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t-muted)", display: "block", marginBottom: 6 }}>
              Future Milestone Goals (₹)
            </label>
            <input
              type="number"
              className="form-input"
              value={dependentsNeed}
              onChange={(e) => setDependentsNeed(Number(e.target.value))}
              placeholder="e.g. 2500000"
              style={{ fontSize: 12, padding: "6px 10px" }}
            />
          </div>
        </div>

        {/* Comparison Result Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            marginTop: 18,
          }}
        >
          <div style={{ background: "var(--surface-0)", padding: 14, borderRadius: 10, border: `1px solid ${THEME.line}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t-muted)", marginBottom: 4 }}>
              Ideal Recommended Cover
            </div>
            <div style={{ fontSize: 17, fontWeight: 900, color: "var(--t-ink)" }}>
              <Money value={totalRecommendedCover} variant="full" />
            </div>
            <div style={{ fontSize: 10.5, color: "var(--t-muted)", marginTop: 4 }}>
              {multiplier}× Income + Debt + Goals
            </div>
          </div>

          <div style={{ background: "var(--surface-0)", padding: 14, borderRadius: 10, border: `1px solid ${THEME.line}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t-muted)", marginBottom: 4 }}>
              Current Total Life Cover
            </div>
            <div style={{ fontSize: 17, fontWeight: 900, color: "var(--t-accent)" }}>
              <Money value={totalLifeCover} variant="full" />
            </div>
            <div style={{ fontSize: 10.5, color: "var(--t-muted)", marginTop: 4 }}>
              Term (<Money value={totalTermCover} variant="compact" />) + LIC (<Money value={totalLICAssured} variant="compact" />)
            </div>
          </div>

          <div
            style={{
              background: protectionGap > 0
                ? "color-mix(in srgb, var(--t-rust) 8%, var(--surface-0))"
                : "color-mix(in srgb, var(--t-sage) 8%, var(--surface-0))",
              padding: 14,
              borderRadius: 10,
              border: `1px solid ${protectionGap > 0 ? "color-mix(in srgb, var(--t-rust) 30%, transparent)" : "color-mix(in srgb, var(--t-sage) 30%, transparent)"}`,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: protectionGap > 0 ? "var(--t-rust)" : "var(--t-sage)", marginBottom: 4 }}>
              {protectionGap > 0 ? "Protection Deficit (Gap)" : "Protection Status"}
            </div>
            <div style={{ fontSize: 17, fontWeight: 900, color: protectionGap > 0 ? "var(--t-rust)" : "var(--t-sage)" }}>
              {protectionGap > 0 ? (
                <Money value={protectionGap} variant="full" />
              ) : (
                `Surplus (+${fmtINRFull(protectionSurplus)})`
              )}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--t-muted)", marginTop: 4 }}>
              {protectionGap > 0
                ? "Additional term life policy recommended"
                : "Your family's liabilities are fully protected"}
            </div>
          </div>
        </div>
      </Card>

      {/* Two Column Layout: Section 80C Tax Deduction + Portfolio Visual Analytics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Left: Section 80C Tax Utilization */}
        <Card style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Receipt size={18} style={{ color: "var(--t-gold)" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--t-ink)" }}>
                Section 80C Tax Benefit (Life & Endowment)
              </div>
              <div style={{ fontSize: 11, color: "var(--t-muted)" }}>
                Old Tax Regime deduction limit ₹1,50,000 / year
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                <span style={{ color: "var(--t-muted)" }}>80C Deduction Claimed</span>
                <span style={{ color: "var(--t-ink)" }}>
                  <Money value={claimed80C} variant="exact" /> / ₹1,50,000
                </span>
              </div>
              <div className="progress-track" style={{ height: 8, borderRadius: 4 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, (claimed80C / 150000) * 100)}%`,
                    background: claimed80C >= 150000 ? "var(--t-sage)" : "var(--t-gold)",
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                background: "var(--surface-0)",
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${THEME.line}`,
              }}
            >
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase" }}>
                  LIC Premiums
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: THEME.rust }}>
                  <Money value={licAnnualPremium} variant="exact" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase" }}>
                  Investment / ULIP
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>
                  <Money value={investAnnualPremium} variant="exact" />
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11.5, color: "var(--t-muted)", lineHeight: 1.4 }}>
              {remaining80CCap > 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Lightbulb size={13} color="var(--t-gold)" style={{ flexShrink: 0 }} />
                  <span>
                    You have <strong style={{ color: "var(--t-ink)" }}><Money value={remaining80CCap} variant="exact" /></strong> unused 80C headroom. Can be fulfilled via PPF, ELSS, or EPF.
                  </span>
                </div>
              ) : (
                <span style={{ color: "var(--t-sage)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <CheckCircle2 size={13} color="var(--t-sage)" style={{ flexShrink: 0 }} />
                  <span>Your insurance premiums fully exhaust the ₹1.5L Section 80C tax deduction limit!</span>
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Right: Portfolio Asset Breakdown */}
        <Card style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <PieIcon size={18} style={{ color: "var(--t-accent)" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--t-ink)" }}>
                Premium Outflow Allocation
              </div>
              <div style={{ fontSize: 11, color: "var(--t-muted)" }}>
                Annual premium distribution across policy types
              </div>
            </div>
          </div>

          {premiumData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--t-muted)", fontSize: 12 }}>
              No insurance policies recorded yet.
            </div>
          ) : (
            <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={premiumData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {premiumData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [fmtINRExact(Number(val)), "Annual Premium"]}
                    contentStyle={{
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
            {premiumData.map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--t-muted)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                <span>{d.name.replace(" Premiums", "")}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
