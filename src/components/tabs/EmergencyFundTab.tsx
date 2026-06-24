// @ts-nocheck
import React, { useMemo } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Landmark,
  Wallet,
  Info,
  IndianRupee,
  Target,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";

const getHealthColor = (months) => {
  if (months >= 12) return THEME.sage;
  if (months >= 6) return THEME.accent;
  if (months >= 3) return THEME.gold;
  return THEME.rust;
};

const getHealthLabel = (months) => {
  if (months >= 12) return "Excellent";
  if (months >= 6) return "Healthy";
  if (months >= 3) return "Needs Improvement";
  return "Critical";
};

export const EmergencyFundTab = ({ state, metrics }) => {
  const data = useMemo(() => {
    // Liquid assets = bank balances + FD (if breakable) + liquid MF
    const bankBalance = (state.bankAccounts || []).reduce((s, a) => s + Number(a.balance || 0), 0);

    const liquidMF = (state.mutualFunds || []).reduce((s, m) => {
      const cat = (m.category || m.type || "").toLowerCase();
      if (cat.includes("liquid") || cat.includes("money market") || cat.includes("overnight") || cat.includes("ultra short")) {
        return s + (Number(m.units) || 0) * (Number(m.currentNav) || Number(m.buyNav) || 0);
      }
      return s;
    }, 0);

    const prepaidBalance = (state.prepaidCards || []).reduce((s, c) => {
      const txns = c.transactions || [];
      const balance = txns.reduce((ts, t) => {
        return t.type === "credit" ? ts + Number(t.amount || 0) : ts - Number(t.amount || 0);
      }, 0);
      return s + Math.max(0, balance);
    }, 0);

    const totalLiquid = bankBalance + liquidMF + prepaidBalance;

    // Monthly expenses
    const monthlyExpense = (() => {
      // Use budget total if available
      const budgetTotal = (state.budgets || []).reduce((s, b) => s + Number(b.monthly || b.monthlyLimit || 0), 0);
      if (budgetTotal > 0) return budgetTotal;

      // Fallback: sum of EMIs + SIPs + subscriptions + recurring expenses + rent
      const emis = (state.loansTaken || []).reduce((s, l) => s + Number(l.emi || 0), 0);
      const sips = (state.sips || []).filter((s) => s.status !== "stopped").reduce((s, si) => s + Number(si.amount || 0), 0);
      const subs = (state.subscriptions || []).filter((s) => !s.paused).reduce((s, sub) => {
        const amt = Number(sub.amount || 0);
        if (sub.cycle === "yearly") return s + amt / 12;
        if (sub.cycle === "quarterly") return s + amt / 3;
        return s + amt;
      }, 0);
      const recurring = (state.recurringExpenses || []).reduce((s, r) => s + Number(r.amount || 0), 0);
      const rent = (state.rentedProperties || []).reduce((s, p) => s + Number(p.monthlyRent || 0), 0);
      const insurance = [...(state.lic || []), ...(state.termPlans || []), ...(state.investmentPlans || [])].reduce(
        (s, p) => s + Number(p.annualPremium || p.premium || 0) / 12, 0
      );
      return emis + sips + subs + recurring + rent + insurance;
    })();

    // If expense calc fails, use metrics
    const finalExpense = monthlyExpense > 0 ? monthlyExpense : (metrics.monthExpense || 0);

    const monthsCovered = finalExpense > 0 ? totalLiquid / finalExpense : 0;
    const targetMonths = 6;
    const targetAmount = finalExpense * targetMonths;
    const gap = Math.max(0, targetAmount - totalLiquid);
    const coveragePct = Math.min(100, (monthsCovered / targetMonths) * 100);

    // Expense breakdown for table
    const expenseBreakdown = [];
    const emis = (state.loansTaken || []).reduce((s, l) => s + Number(l.emi || 0), 0);
    if (emis > 0) expenseBreakdown.push({ label: "EMIs", amount: emis, icon: "💳" });

    const rent = (state.rentedProperties || []).reduce((s, p) => s + Number(p.monthlyRent || 0), 0);
    if (rent > 0) expenseBreakdown.push({ label: "Rent", amount: rent, icon: "🏠" });

    const sipTotal = (state.sips || []).filter((s) => s.status !== "stopped").reduce((s, si) => s + Number(si.amount || 0), 0);
    if (sipTotal > 0) expenseBreakdown.push({ label: "SIPs", amount: sipTotal, icon: "📈" });

    const subTotal = (state.subscriptions || []).filter((s) => !s.paused).reduce((s, sub) => {
      const amt = Number(sub.amount || 0);
      if (sub.cycle === "yearly") return s + amt / 12;
      if (sub.cycle === "quarterly") return s + amt / 3;
      return s + amt;
    }, 0);
    if (subTotal > 0) expenseBreakdown.push({ label: "Subscriptions", amount: subTotal, icon: "🔄" });

    const recTotal = (state.recurringExpenses || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    if (recTotal > 0) expenseBreakdown.push({ label: "Recurring Expenses", amount: recTotal, icon: "📋" });

    const insTotal = [...(state.lic || []), ...(state.termPlans || []), ...(state.investmentPlans || [])].reduce(
      (s, p) => s + Number(p.annualPremium || p.premium || 0) / 12, 0
    );
    if (insTotal > 0) expenseBreakdown.push({ label: "Insurance Premiums", amount: insTotal, icon: "❤️" });

    return {
      bankBalance, liquidMF, prepaidBalance, totalLiquid,
      monthlyExpense: finalExpense, monthsCovered, targetMonths, targetAmount, gap, coveragePct,
      expenseBreakdown,
    };
  }, [state, metrics]);

  const healthColor = getHealthColor(data.monthsCovered);
  const healthLabel = getHealthLabel(data.monthsCovered);

  return (
    <div>
      <SectionTitle sub="How many months can you survive on liquid assets alone?">Emergency Fund Health</SectionTitle>

      {/* Main Health Indicator */}
      <Card>
        <div style={{ padding: 24, display: "flex", alignItems: "center", gap: 24 }}>
          {/* Circular gauge */}
          <div style={{
            width: 120, height: 120, borderRadius: "50%", flexShrink: 0,
            background: `conic-gradient(${healthColor} ${Math.min(data.coveragePct, 100) * 3.6}deg, ${THEME.line} 0deg)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 96, height: 96, borderRadius: "50%", background: THEME.paper,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: healthColor, lineHeight: 1 }}>
                {data.monthsCovered.toFixed(1)}
              </div>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, marginTop: 2 }}>months</div>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Badge variant={data.monthsCovered >= 6 ? "success" : data.monthsCovered >= 3 ? "warning" : "error"}>
                {healthLabel}
              </Badge>
            </div>
            <div style={{ fontSize: 14, color: THEME.ink, marginBottom: 12 }}>
              Your liquid assets can cover <strong>{data.monthsCovered.toFixed(1)} months</strong> of expenses.
              {data.monthsCovered < 6 && (
                <span style={{ color: THEME.rust }}> Target is at least 6 months.</span>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ height: 10, borderRadius: 5, background: `color-mix(in srgb, ${THEME.muted} 25%, transparent)`, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 5,
                width: `${Math.min(100, data.coveragePct)}%`,
                background: `linear-gradient(90deg, ${healthColor}, ${healthColor}aa)`,
                transition: "width 0.5s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 11, color: THEME.muted }}>0 months</span>
              <span style={{ fontSize: 11, color: THEME.muted }}>6 months (target)</span>
              <span style={{ fontSize: 11, color: THEME.muted }}>12 months</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 16 }}>
        <StatCard label="Liquid Assets" value={fmtINRFull(data.totalLiquid)} icon={<IndianRupee />} color={THEME.sage} />
        <StatCard label="Monthly Expenses" value={fmtINRFull(data.monthlyExpense)} icon={<Wallet />} color={THEME.gold} />
        <StatCard label="6-Month Target" value={fmtINRFull(data.targetAmount)} icon={<Target />} color="#3B82F6" />
        <StatCard label="Gap to Fill" value={data.gap > 0 ? fmtINRFull(data.gap) : "None!"} icon={data.gap > 0 ? <AlertTriangle /> : <CheckCircle2 />} color={data.gap > 0 ? THEME.rust : THEME.sage} />
      </div>

      {/* Liquid Assets Breakdown */}
      <Card>
        <div style={{ padding: 20, marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: THEME.ink, display: "flex", alignItems: "center", gap: 8 }}>
            <Wallet size={16} style={{ color: THEME.accent }} /> What Counts as Liquid
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Bank Balances (Savings + Current)", value: data.bankBalance, icon: Landmark, color: "#3B82F6" },
              { label: "Liquid / Money Market MFs", value: data.liquidMF, icon: TrendingUp, color: THEME.sage },
              { label: "Prepaid Card Balances", value: data.prepaidBalance, icon: Wallet, color: "#8B5CF6" },
            ].filter((r) => r.value > 0).map((r, i) => {
              const Icon = r.icon;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", borderRadius: 8, background: `${r.color}08`,
                }}>
                  <Icon size={16} style={{ color: r.color }} />
                  <span style={{ flex: 1, fontSize: 13, color: THEME.ink }}>{r.label}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}><Prv>{fmtINRFull(r.value)}</Prv></span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Monthly Expense Breakdown */}
      {data.expenseBreakdown.length > 0 && (
        <Card>
          <div style={{ padding: 20, marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: THEME.ink }}>Monthly Expense Breakdown</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.expenseBreakdown.sort((a, b) => b.amount - a.amount).map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", borderRadius: 8 }}>
                  <span style={{ fontSize: 16 }}>{e.icon}</span>
                  <span style={{ flex: 1, fontSize: 13, color: THEME.ink }}>{e.label}</span>
                  <span style={{ fontWeight: 600, fontSize: 13, color: THEME.ink }}><Prv>{fmtINRFull(e.amount)}</Prv></span>
                  <span style={{ fontSize: 11, color: THEME.muted, minWidth: 50, textAlign: "right" }}>
                    {data.monthlyExpense ? ((e.amount / data.monthlyExpense) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, borderTop: `2px solid ${THEME.line}`, marginTop: 4 }}>
                <span style={{ fontSize: 16 }}>📊</span>
                <span style={{ flex: 1, fontSize: 13, color: THEME.ink, fontWeight: 700 }}>Total Monthly</span>
                <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}><Prv>{fmtINRFull(data.monthlyExpense)}</Prv></span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <div style={{ padding: 20, marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: THEME.ink, display: "flex", alignItems: "center", gap: 8 }}>
            <Info size={16} style={{ color: THEME.accent }} /> Recommendations
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.monthsCovered < 1 && (
              <div style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <AlertTriangle size={16} style={{ color: THEME.rust, flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: THEME.ink }}>
                  <strong>Critical:</strong> You have less than 1 month of expenses covered. Prioritize building your emergency fund before any other investments.
                </div>
              </div>
            )}
            {data.monthsCovered >= 1 && data.monthsCovered < 3 && (
              <div style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}>
                <AlertTriangle size={16} style={{ color: "#F97316", flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: THEME.ink }}>
                  <strong>Needs attention:</strong> Aim for at least 3 months as a first milestone. Consider parking funds in a liquid mutual fund for better returns than savings account.
                </div>
              </div>
            )}
            {data.monthsCovered >= 3 && data.monthsCovered < 6 && (
              <div style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
                <Shield size={16} style={{ color: "#3B82F6", flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: THEME.ink }}>
                  <strong>Good progress:</strong> You're building a buffer. Target 6 months for a solid safety net. Split between savings account (1-2 months) and liquid MF (rest).
                </div>
              </div>
            )}
            {data.monthsCovered >= 6 && (
              <div style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <CheckCircle2 size={16} style={{ color: THEME.sage, flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: THEME.ink }}>
                  <strong>Well prepared!</strong> Your emergency fund exceeds the recommended 6-month threshold. Any excess can be invested for growth.
                </div>
              </div>
            )}
            {data.gap > 0 && (
              <div style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(99,102,241,0.04)" }}>
                <TrendingUp size={16} style={{ color: THEME.accent, flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: THEME.ink }}>
                  To reach the 6-month target, save <strong><Prv>{fmtINRFull(data.gap / 6)}</Prv>/month</strong> for the next 6 months, or <strong><Prv>{fmtINRFull(data.gap / 12)}</Prv>/month</strong> over 12 months.
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
