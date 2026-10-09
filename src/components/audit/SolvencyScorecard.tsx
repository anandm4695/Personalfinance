import React, { useMemo } from "react";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Percent,
  Download,
  Printer,
  FileCheck,
  Scale,
  Zap,
  Building2,
  Coins,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, exportArrayToCSV } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Money } from "../ui/Money";

interface SolvencyScorecardProps {
  state: any;
  metrics: any;
  showToast?: (msg: string, type?: string) => void;
}

export const SolvencyScorecard: React.FC<SolvencyScorecardProps> = ({ state, metrics, showToast }) => {
  const calculations = useMemo(() => {
    // 1. Assets
    const liquidAssets = (state.bankAccounts || []).reduce((sum: number, b: any) => sum + Math.max(0, Number(b.balance || 0)), 0) +
      (state.fixedDeposits || []).reduce((sum: number, f: any) => sum + Number(f.principal || 0), 0) +
      (state.recurringDeposits || []).reduce((sum: number, r: any) => sum + (Number(r.monthly || 0) * Number(r.tenureMonths || 12)), 0);

    const investmentAssets = (state.stocks || []).reduce((sum: number, s: any) => sum + (Number(s.currentPrice || s.avgPrice || 0) * Number(s.qty || 0)), 0) +
      (state.mutualFunds || []).reduce((sum: number, m: any) => sum + Number(m.current || (Number(m.units || 0) * Number(m.nav || 0)) || 0), 0) +
      (state.goldHoldings || []).reduce((sum: number, g: any) => sum + Number(g.currentValue || (Number(g.weightGrams || 0) * 7200) || 0), 0);

    const retirementAssets = (state.ppf || []).reduce((sum: number, p: any) => sum + Number(p.balance || 0), 0) +
      (state.epf || []).reduce((sum: number, e: any) => sum + Number(e.currentBalance || 0), 0) +
      (state.nps || []).reduce((sum: number, n: any) => sum + Number(n.balance || 0), 0);

    const realAssets = (state.realEstateProperties || []).reduce((sum: number, r: any) => sum + Number(r.propertyValue || r.purchasePrice || 0), 0) +
      (state.vehicles || []).reduce((sum: number, v: any) => sum + Number(v.currentValue || v.purchasePrice || 0), 0);

    const totalGrossAssets = liquidAssets + investmentAssets + retirementAssets + realAssets;

    const shortTermLiabilities = (state.creditCards || [])
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .reduce((sum: number, c: any) => sum + Math.max(0, Number(c.outstanding || 0)), 0) +
      (state.informalBorrowed || []).reduce((sum: number, i: any) => sum + Number(i.outstanding || i.amount || 0), 0);

    const totalLongTermDebt = (state.loansTaken || []).reduce((sum: number, l: any) => sum + Number(l.outstanding || l.principal || 0), 0);
    const totalLiabilities = shortTermLiabilities + totalLongTermDebt;

    const netWorth = totalGrossAssets - totalLiabilities;

    // 3. Cash Flow Metrics
    const monthlyIncome = Number(metrics.monthIncome || (metrics.annualIncome ? metrics.annualIncome / 12 : 0)) || 1;
    const monthlyExpense = Number(metrics.monthExpense || 0) || 1;
    const monthlyTotalEmi = (state.loansTaken || []).reduce((sum: number, l: any) => sum + Number(l.emi || 0), 0);

    // 4. Ratios
    // Solvency Ratio: Net Worth / Total Assets (Safe > 70%)
    const solvencyRatio = totalGrossAssets > 0 ? (netWorth / totalGrossAssets) * 100 : 100;

    // Liquid Ratio: Liquid Assets / (Short Term Liab + 12 Mo EMIs)
    const shortTermObligations = shortTermLiabilities + (monthlyTotalEmi * 12);
    const liquidRatio = shortTermObligations > 0 ? liquidAssets / shortTermObligations : liquidAssets > 0 ? 5.0 : 1.0;

    // Debt Service Ratio (DSR): Total EMIs / Monthly Income
    const dsrPct = monthlyIncome > 0 ? (monthlyTotalEmi / monthlyIncome) * 100 : 0;

    // Emergency Runway in Months
    const emergencyRunwayMonths = monthlyExpense > 0 ? liquidAssets / monthlyExpense : 12;

    // Investment Asset Ratio: Invested / Total Net Worth
    const investmentRatio = netWorth > 0 ? ((investmentAssets + retirementAssets) / netWorth) * 100 : 0;

    // Overall Solvency Score (0 - 100)
    let score = 0;
    if (solvencyRatio >= 80) score += 25;
    else if (solvencyRatio >= 60) score += 18;
    else score += 10;

    if (emergencyRunwayMonths >= 6) score += 25;
    else if (emergencyRunwayMonths >= 3) score += 15;
    else score += 5;

    if (dsrPct <= 30) score += 25;
    else if (dsrPct <= 45) score += 15;
    else score += 5;

    if (liquidRatio >= 1.5) score += 25;
    else if (liquidRatio >= 1.0) score += 15;
    else score += 8;

    return {
      totalGrossAssets,
      totalLiabilities,
      netWorth,
      liquidAssets,
      investmentAssets,
      retirementAssets,
      realAssets,
      monthlyIncome,
      monthlyExpense,
      monthlyTotalEmi,
      solvencyRatio,
      liquidRatio,
      dsrPct,
      emergencyRunwayMonths,
      investmentRatio,
      score,
    };
  }, [state, metrics]);

  const handleExportCSV = () => {
    const rows = [
      { Metric: "Total Gross Assets", Value: calculations.totalGrossAssets, Benchmark: "N/A" },
      { Metric: "Total Liabilities", Value: calculations.totalLiabilities, Benchmark: "N/A" },
      { Metric: "Net Worth (Owner Capital)", Value: calculations.netWorth, Benchmark: "Positive Growth" },
      { Metric: "Solvency Ratio (%)", Value: `${calculations.solvencyRatio.toFixed(1)}%`, Benchmark: "> 70%" },
      { Metric: "Liquid Coverage Ratio", Value: `${calculations.liquidRatio.toFixed(2)}x`, Benchmark: "> 1.50x" },
      { Metric: "Debt Service Ratio (EMI/Income)", Value: `${calculations.dsrPct.toFixed(1)}%`, Benchmark: "< 30%" },
      { Metric: "Emergency Runway (Months)", Value: `${calculations.emergencyRunwayMonths.toFixed(1)} mos`, Benchmark: ">= 6.0 mos" },
      { Metric: "Auditor Health Score", Value: `${calculations.score} / 100`, Benchmark: ">= 80 (Prime)" },
    ];
    exportArrayToCSV(rows, `Financial-Solvency-Diagnostic-${new Date().toISOString().split("T")[0]}`);
    showToast?.("Solvency Scorecard exported to CSV", "success");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Executive Auditor Opinion Banner ── */}
      <Card
        style={{
          padding: 20,
          background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.accent} 10%, transparent), color-mix(in srgb, ${THEME.sage} 6%, transparent))`,
          border: `1px solid color-mix(in srgb, ${THEME.accent} 25%, transparent)`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: THEME.accent,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileCheck size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, margin: 0 }}>
                Senior Auditor Solvency & Balance Sheet Health Diagnostic
              </h2>
              <p style={{ fontSize: 12, color: THEME.muted, margin: "2px 0 0" }}>
                Comprehensive liquidity, leverage ratios, capital structure integrity, and treasury stress tests
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExportCSV}>
              Export Diagnostic
            </Button>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: "var(--t-paper)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>AUDITOR HEALTH SCORE</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: calculations.score >= 80 ? "var(--t-sage)" : THEME.accent, marginTop: 2 }}>
              {calculations.score} <span style={{ fontSize: 13, color: THEME.muted }}>/ 100</span>
            </div>
            <Badge variant={calculations.score >= 80 ? "success" : calculations.score >= 60 ? "warning" : "danger"} style={{ marginTop: 6 }}>
              {calculations.score >= 80 ? "PRIME SOLVENCY" : calculations.score >= 60 ? "ADEQUATE" : "HIGH LEVERAGE"}
            </Badge>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: "var(--t-paper)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>SOLVENCY RATIO</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: THEME.ink, marginTop: 2 }}>
              {calculations.solvencyRatio.toFixed(1)}%
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
              Net Worth is {calculations.solvencyRatio.toFixed(1)}% of Gross Assets (Target: &gt; 70%)
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: "var(--t-paper)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>LIQUIDITY COVERAGE</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: THEME.ink, marginTop: 2 }}>
              {calculations.liquidRatio.toFixed(2)}x
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
              Liquid funds cover short-term dues {calculations.liquidRatio.toFixed(2)} times
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: "var(--t-paper)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>DEBT SERVICE (DSR)</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: calculations.dsrPct > 40 ? "var(--t-rust)" : THEME.ink, marginTop: 2 }}>
              {calculations.dsrPct.toFixed(1)}%
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
              EMIs consume {calculations.dsrPct.toFixed(1)}% of monthly income (Safe &lt; 30%)
            </div>
          </div>
        </div>
      </Card>

      {/* ── Detailed Auditor Findings & Actionable Recommendations ── */}
      <Card style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: THEME.ink, margin: "0 0 14px" }}>
          Senior Auditor Assessment & Treasury Recommendations
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {calculations.emergencyRunwayMonths < 6 && (
            <div
              style={{
                padding: 14,
                borderRadius: 10,
                background: "color-mix(in srgb, var(--t-gold) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--t-gold) 30%, transparent)",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <AlertTriangle size={20} color="var(--t-gold)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                  Emergency Cash Runway Below Recommended 6-Month Benchmark
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  Your current liquid reserves (₹{Math.round(calculations.liquidAssets).toLocaleString("en-IN")}) provide approximately {calculations.emergencyRunwayMonths.toFixed(1)} months of expense coverage. We recommend parking an additional ₹{Math.max(0, Math.round((6 - calculations.emergencyRunwayMonths) * calculations.monthlyExpense)).toLocaleString("en-IN")} in high-yield sweep-in FDs or liquid debt mutual funds.
                </div>
              </div>
            </div>
          )}

          {calculations.dsrPct > 35 && (
            <div
              style={{
                padding: 14,
                borderRadius: 10,
                background: "color-mix(in srgb, var(--t-rust) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--t-rust) 30%, transparent)",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <AlertTriangle size={20} color="var(--t-rust)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                  Elevated Debt Service Burden ({calculations.dsrPct.toFixed(1)}% of Monthly Inflow)
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  Your recurring loan EMIs of ₹{Math.round(calculations.monthlyTotalEmi).toLocaleString("en-IN")}/mo exceed the conservative 30% ceiling. Prioritize prepaying high-interest personal loans or accelerating principal reduction.
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: "color-mix(in srgb, var(--t-sage) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--t-sage) 30%, transparent)",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <CheckCircle2 size={20} color="var(--t-sage)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                Capital Structure & Solvency Integrity is Solid ({calculations.solvencyRatio.toFixed(1)}%)
              </div>
              <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                The family balance sheet is backed by ₹{Math.round(calculations.netWorth).toLocaleString("en-IN")} in accumulated net worth, representing {calculations.solvencyRatio.toFixed(1)}% ownership of total gross assets (₹{Math.round(calculations.totalGrossAssets).toLocaleString("en-IN")}).
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
