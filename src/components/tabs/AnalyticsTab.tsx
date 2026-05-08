// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  CreditCard,
  Target,
  Calendar,
  PieChart as PieIcon,
  Printer,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  Building2,
  Landmark,
  Receipt,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { THEME, PIE_COLORS } from "../../utils/constants";
import { fmtINR, fmtINRFull, monthsBetween, today, getCCDueDate } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { MonthlyReportModal } from "../modals/MonthlyReportModal";

interface AnalyticsTabProps {
  metrics: any;
  state: any;
  assetBreakdown: any[];
  trendData: any[];
  chartStyle: any;
  setState: any;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  metrics,
  state,
  assetBreakdown,
  trendData,
  chartStyle,
  setState,
}) => {
  const [sub, setSub] = useState("dashboard");
  const [drillCat, setDrillCat] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);

  const subs = [
    { id: "dashboard", label: "Dashboard", icon: PieIcon },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "spending", label: "Spending", icon: CreditCard },
    { id: "allocation", label: "Allocation", icon: Target },
    { id: "calendar", label: "Calendar", icon: Calendar },
  ];

  const netWorthTrend = useMemo(() => {
    const histMap: Record<string, number> = {};
    (state.netWorthHistory || []).forEach((h: any) => { histMap[h.month] = h.netWorth; });
    const now = new Date();
    return trendData.map((t, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (trendData.length - 1 - i), 1);
      const ym = d.toISOString().slice(0, 7);
      const value = histMap[ym] !== undefined
        ? histMap[ym]
        : metrics.netWorth - (trendData.length - 1 - i) * (metrics.monthIncome - metrics.monthExpense) * 0.9;
      return { month: t.month, value, real: histMap[ym] !== undefined };
    });
  }, [trendData, metrics, state.netWorthHistory]);

  const dashboardData = useMemo(() => {
    let savingsScore = 0, debtScore = 0, emergencyScore = 0, divScore = 0;
    if (metrics.savingsRate >= 30) savingsScore = 25;
    else if (metrics.savingsRate >= 20) savingsScore = 18;
    else if (metrics.savingsRate >= 10) savingsScore = 10;
    else savingsScore = 4;
    
    if (metrics.debtToAssetRatio < 10) debtScore = 25;
    else if (metrics.debtToAssetRatio < 25) debtScore = 18;
    else if (metrics.debtToAssetRatio < 50) debtScore = 10;
    else debtScore = 4;
    
    const emergencyMonths = metrics.monthExpense > 0 ? metrics.cashInBanks / metrics.monthExpense : 0;
    if (emergencyMonths > 6) emergencyScore = 25;
    else if (emergencyMonths >= 3) emergencyScore = 18;
    else if (emergencyMonths >= 1) emergencyScore = 10;
    else emergencyScore = 4;
    
    if (state.mutualFunds.length > 0) divScore += 6;
    if (state.stocks.length > 0) divScore += 6;
    if (state.fixedDeposits.length > 0) divScore += 6;
    if (state.ppf.length > 0 || state.nps.length > 0) divScore += 7;
    
    const totalScore = savingsScore + debtScore + emergencyScore + divScore;
    const scoreColor = totalScore >= 75 ? THEME.sage : totalScore >= 50 ? THEME.gold : THEME.rust;
    
    const subScores = [
      { label: "Savings Rate", score: savingsScore, max: 25, pct: (savingsScore / 25) * 100, color: savingsScore >= 25 ? THEME.sage : savingsScore >= 18 ? THEME.gold : savingsScore >= 10 ? "#F97316" : THEME.rust },
      { label: "Debt Ratio", score: debtScore, max: 25, pct: (debtScore / 25) * 100, color: debtScore >= 25 ? THEME.sage : debtScore >= 18 ? THEME.gold : debtScore >= 10 ? "#F97316" : THEME.rust },
      { label: "Emergency Fund", score: emergencyScore, max: 25, pct: (emergencyScore / 25) * 100, color: emergencyScore >= 25 ? THEME.sage : emergencyScore >= 18 ? THEME.gold : emergencyScore >= 10 ? "#F97316" : THEME.rust },
      { label: "Diversification", score: divScore, max: 25, pct: (divScore / 25) * 100, color: divScore >= 25 ? THEME.sage : divScore >= 18 ? THEME.gold : divScore >= 10 ? "#F97316" : THEME.rust },
    ];
    
    const todayMs = new Date().getTime();
    const plus30Ms = todayMs + 30 * 86400000;
    const dues: any[] = [];
    state.creditCards.forEach((c: any) => {
      const dueDate = getCCDueDate(c);
      if (dueDate) {
        const ms = new Date(dueDate).getTime();
        const daysLeft = Math.ceil((ms - todayMs) / 86400000);
        if (daysLeft >= 0 && ms <= plus30Ms) dues.push({ name: (c.issuer || "Card") + " Bill", amount: Number(c.outstanding || 0), daysLeft, date: dueDate });
      }
    });
    state.subscriptions.forEach((s: any) => {
      if (s.renewalDate) {
        const ms = new Date(s.renewalDate).getTime();
        const daysLeft = Math.ceil((ms - todayMs) / 86400000);
        if (daysLeft >= 0 && ms <= plus30Ms) dues.push({ name: s.name + " Renewal", amount: Number(s.amount || 0), daysLeft, date: s.renewalDate });
      }
    });
    dues.sort((a, b) => a.daysLeft - b.daysLeft);
    
    const saved = metrics.monthIncome - metrics.monthExpense;
    const expensePct = metrics.monthIncome > 0 ? (metrics.monthExpense / metrics.monthIncome) * 100 : 0;
    const savedPct = metrics.monthIncome > 0 ? Math.max(0, (saved / metrics.monthIncome) * 100) : 0;
    
    let streak = 0;
    const now = new Date();
    for (let i = 1; i <= 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym2 = d.toISOString().slice(0, 7);
      const txns = state.transactions.filter((t: any) => t.date && t.date.startsWith(ym2));
      const inc = txns.filter((t: any) => t.type === "credit").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const exp = txns.filter((t: any) => t.type === "debit").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      if (inc > exp && inc > 0) streak++; else break;
    }
    const streakEmoji = streak >= 12 ? "🏆" : streak >= 6 ? "🔥" : streak >= 3 ? "⚡" : streak >= 1 ? "✅" : "💤";
    const streakMsg = streak >= 12 ? "Incredible!" : streak >= 6 ? "On fire!" : streak >= 3 ? "Great run!" : streak >= 1 ? "Keep going!" : "Start saving";
    
    return { totalScore, scoreColor, subScores, dues, saved, expensePct, savedPct, streak, streakEmoji, streakMsg };
  }, [metrics, state.mutualFunds.length, state.stocks.length, state.fixedDeposits.length, state.ppf.length, state.nps.length, state.creditCards, state.subscriptions, state.transactions]);

  const isPositive = metrics.netWorth >= 0;

  return (
    <div className="tab-content-enter">
      {/* Quick Stats Bar (Moved from App.tsx) */}
      {(() => {
        const items = [
          { label: "Net Worth",      value: fmtINRFull(metrics.netWorth),              color: metrics.netWorth >= 0 ? THEME.sage : THEME.rust },
          { label: "Savings Rate",   value: metrics.savingsRate.toFixed(1) + "%",       color: metrics.savingsRate >= 20 ? THEME.sage : THEME.gold },
          { label: "Monthly Income", value: fmtINRFull(metrics.monthIncome),            color: THEME.sage },
          { label: "Monthly Spend",  value: fmtINRFull(metrics.monthExpense),           color: THEME.ink },
          { label: "Est. Tax",       value: fmtINRFull(metrics.taxDue),                 color: metrics.taxDue > 0 ? THEME.rust : THEME.sage },
        ];
        return (
          <div style={{ background: "transparent", overflowX: "auto", marginBottom: 24 }} className="no-scrollbar">
            <div style={{ display: "flex", alignItems: "center", minWidth: "max-content", background: "var(--surface-0)", borderRadius: 12, padding: "12px 10px", border: `1px solid ${THEME.line}`, boxShadow: "var(--shadow-sm)" }}>
              {items.map(({ label, value, color }, idx) => (
                <React.Fragment key={label}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 24px" }}>
                    <span style={{ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", color: THEME.muted, fontWeight: 700 }}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>{value}</span>
                  </div>
                  {idx < items.length - 1 && (
                    <div style={{ width: 1, height: 28, background: THEME.line, flexShrink: 0 }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        );
      })()}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, background: THEME.line, padding: 4, borderRadius: 12 }}>
          {subs.map((s) => {
            const Icon = s.icon;
            const active = sub === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSub(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: active ? THEME.darkInk : "transparent",
                  color: active ? THEME.accent : THEME.muted,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: active ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <Icon size={16} />
                <span style={{ fontSize: 13 }}>{s.label}</span>
              </button>
            );
          })}
        </div>
        <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={() => setShowReport(true)}>
          Monthly Report
        </Button>
      </div>

      {sub === "dashboard" && (
        <div className="animate-fade-in-up bento-grid">
          <Card variant="hero" className="bento-col-12" style={{ padding: "32px 40px", background: "var(--t-darkInk)", color: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 20, position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: isPositive ? "#34D399" : "#FB7185", boxShadow: `0 0 10px ${isPositive ? "rgba(52,211,153,0.5)" : "rgba(251,113,133,0.5)"}` }} />
                <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", fontWeight: 700 }}>Wealth Overview</span>
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            
            <div style={{ position: "relative", zIndex: 1, marginBottom: 32 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>Total Net Worth</div>
              <div style={{ fontSize: "clamp(42px, 5.5vw, 72px)", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.045em", color: "#fff" }}>
                {fmtINRFull(metrics.netWorth)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#34D399", fontSize: 13, fontWeight: 700 }}>
                  <TrendingUp size={14} />
                  {((metrics.mfValue + metrics.stockValue) / (metrics.totalAssets || 1) * 100).toFixed(1)}% equity ratio
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                  · Total assets {fmtINRFull(metrics.totalAssets)}
                </div>
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "24px 32px", position: "relative", zIndex: 1, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <HeroStat label="Bank Cash" value={metrics.cashInBanks} />
              <HeroStat label="Fixed Deposits" value={metrics.fdValue} />
              <HeroStat label="Mutual Funds" value={metrics.mfValue} />
              <HeroStat label="Stocks" value={metrics.stockValue} />
              <HeroStat label="PPF + NPS" value={metrics.ppfValue + metrics.npsValue} />
              <HeroStat label="Card Dues" value={metrics.ccOutstanding} negative />
              <HeroStat label="Loans Taken" value={metrics.totalLiabilities - metrics.ccOutstanding} negative />
              <HeroStat label="Subs / Mo" value={metrics.subTotal} />
            </div>
          </Card>

          <div className="bento-col-12" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {/* 1. SAVINGS RATE */}
            <Card style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
               <div style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Savings Rate</div>
               <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                 <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
                   <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%" }}>
                     <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={THEME.line} strokeWidth="3" />
                     <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={metrics.savingsRate >= 20 ? THEME.sage : THEME.gold} strokeWidth="4" strokeDasharray={`${Math.max(0, Math.min(100, metrics.savingsRate))}, 100`} strokeLinecap="round" />
                   </svg>
                   <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{metrics.savingsRate.toFixed(0)}%</div>
                 </div>
                 <div>
                   <div style={{ fontSize: 32, fontWeight: 800, color: metrics.savingsRate >= 20 ? THEME.sage : THEME.gold, lineHeight: 1, marginBottom: 6, letterSpacing: "-0.02em" }}>{metrics.savingsRate.toFixed(1)}%</div>
                   <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 8, fontWeight: 500 }}>of monthly income</div>
                   <div style={{ fontSize: 12, fontWeight: 700, color: metrics.savingsRate >= 20 ? THEME.sage : THEME.gold }}>{metrics.savingsRate >= 20 ? "On track" : "Needs attention"}</div>
                 </div>
               </div>
            </Card>

            {/* 2. DEBT-TO-ASSET */}
            <Card style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
               <div style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Debt-to-Asset Ratio</div>
               <div>
                 <div style={{ fontSize: 38, fontWeight: 900, color: metrics.debtToAssetRatio < 25 ? THEME.sage : THEME.rust, lineHeight: 1, marginBottom: 16, letterSpacing: "-0.02em" }}>{metrics.debtToAssetRatio.toFixed(1)}<span style={{ fontSize: 24 }}>%</span></div>
                 <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.5, fontWeight: 500 }}>Healthy if under 40% · Your liabilities {fmtINRFull(metrics.totalLiabilities)}</div>
               </div>
            </Card>

            {/* 3. LIQUIDITY SCORE */}
            <Card style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
               <div style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Liquidity Score</div>
               <div>
                 {(() => {
                   const liquid = metrics.cashInBanks;
                   const locked = metrics.totalAssets - liquid;
                   const ratio = metrics.totalAssets > 0 ? (liquid / metrics.totalAssets) * 100 : 0;
                   return (
                     <>
                       <div style={{ fontSize: 38, fontWeight: 900, color: THEME.accent, lineHeight: 1, marginBottom: 16, letterSpacing: "-0.02em" }}>{ratio.toFixed(1)}<span style={{ fontSize: 24 }}>%</span></div>
                       <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.5, fontWeight: 500 }}>Liquid {fmtINRFull(liquid)} · Locked {fmtINRFull(locked)}</div>
                     </>
                   );
                 })()}
               </div>
            </Card>

            {/* 4. INVESTMENT P&L */}
            <Card style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
               <div style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Investment P&L</div>
               <div>
                 {(() => {
                   const invested = metrics.mfInvested + metrics.stockInvested;
                   const current = metrics.mfValue + metrics.stockValue;
                   const pnl = current - invested;
                   const returnPct = invested > 0 ? (pnl / invested) * 100 : 0;
                   const isPos = pnl >= 0;
                   const c = isPos ? THEME.sage : THEME.rust;
                   return (
                     <>
                       <div style={{ fontSize: 34, fontWeight: 900, color: c, lineHeight: 1, marginBottom: 10, letterSpacing: "-0.02em" }}>{isPos ? "+" : ""}{fmtINRFull(pnl)}</div>
                       <div style={{ fontSize: 14, fontWeight: 700, color: c, marginBottom: 8, display: "flex", alignItems: "center", gap: 2 }}>
                         {isPos ? <ChevronUp size={18} strokeWidth={3} /> : <ChevronDown size={18} strokeWidth={3} />}
                         {Math.abs(returnPct).toFixed(1)}% overall return
                       </div>
                       <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 500 }}>Unrealised · Invested {fmtINRFull(invested)}</div>
                     </>
                   );
                 })()}
               </div>
            </Card>
          </div>
             <Card className="bento-col-4 bento-row-2" style={{ padding: 24, display: "flex", flexDirection: "column", height: "100%" }}>
                <div className="section-label">Financial Health</div>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20, flex: 1 }}>
                  <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color: dashboardData.scoreColor }}>{dashboardData.totalScore}</div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: dashboardData.scoreColor }}>{dashboardData.totalScore >= 75 ? "Excellent" : dashboardData.totalScore >= 50 ? "Good" : "Needs Work"}</div>
                    <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>Overall Score</div>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 14 }}>
                  {dashboardData.subScores.map((s) => (
                    <div key={s.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                        <span style={{ color: THEME.muted, fontWeight: 600 }}>{s.label}</span>
                        <span style={{ fontWeight: 800 }}>{s.score}/{s.max}</span>
                      </div>
                      <div className="progress-track"><div className="progress-fill" style={{ width: s.pct + "%", background: s.color }} /></div>
                    </div>
                  ))}
                </div>
             </Card>

             <Card className="bento-col-5 bento-row-2" style={{ padding: 24, display: "flex", flexDirection: "column", height: "100%" }}>
                <div className="section-label">Upcoming Dues</div>
                {dashboardData.dues.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: THEME.muted, fontSize: 13, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>No major dues coming up</div>
                ) : (
                  <div style={{ display: "grid", gap: 12, flex: 1, alignContent: "flex-start" }}>
                    {dashboardData.dues.slice(0, 4).map((d, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: "rgba(128,128,128,0.04)" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{d.name}</div>
                          <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>{d.date}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 15, fontWeight: 800 }}>{fmtINR(d.amount)}</div>
                          <Badge variant={d.daysLeft <= 5 ? "rust" : "gold"} style={{ fontSize: 10, marginTop: 4 }}>{d.daysLeft}d left</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </Card>

             <Card className="bento-col-3 bento-row-2" style={{ padding: 24, display: "flex", flexDirection: "column", height: "100%", justifyContent: "center" }}>
                <div className="section-label" style={{ textAlign: "center" }}>Savings Streak</div>
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <div style={{ fontSize: 56, marginBottom: 12 }}>{dashboardData.streakEmoji}</div>
                  <div style={{ fontSize: 56, fontWeight: 900, color: THEME.sage, lineHeight: 1 }}>{dashboardData.streak}</div>
                  <div style={{ fontSize: 13, color: THEME.muted, marginTop: 8, fontWeight: 600 }}>Months Saved</div>
                  <Badge variant="sage" style={{ marginTop: 16, padding: "6px 12px", fontSize: 12 }}>{dashboardData.streakMsg}</Badge>
                </div>
             </Card>

             <Card className="bento-col-7" style={{ padding: 24 }}>
              <div className="section-label">Monthly P&L (Last 6 Months)</div>
              {trendData.filter(t => t.income > 0 || t.expense > 0).length === 0 ? (
                <div style={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.muted, fontSize: 13, background: "rgba(128,128,128,0.03)", borderRadius: 12 }}>
                  Add transactions to see your P&L trend
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={trendData.slice(-6)}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.sage} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={THEME.sage} stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.rust} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={THEME.rust} stopOpacity={0.4} />
                    </linearGradient>
                    <filter id="glow-sage" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={THEME.sage} floodOpacity="0.4" />
                    </filter>
                    <filter id="glow-rust" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={THEME.rust} floodOpacity="0.4" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtINR} tick={{ fill: THEME.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: any) => fmtINRFull(v)} cursor={{ fill: THEME.line, opacity: 0.4 }} contentStyle={{ background: "var(--surface-0)", border: "1px solid var(--t-line)", borderRadius: 12, boxShadow: "var(--shadow-xl)" }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="income" name="Income" fill="url(#gIncome)" radius={[4, 4, 0, 0]} style={{ filter: "url(#glow-sage)" }} />
                  <Bar dataKey="expense" name="Expense" fill="url(#gExpense)" radius={[4, 4, 0, 0]} style={{ filter: "url(#glow-rust)" }} />
                </BarChart>
              </ResponsiveContainer>
              )}
             </Card>

             <Card className="bento-col-5" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
               <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span>Savings Goal & Pacing</span>
                 {editingTarget ? (
                   <input
                     type="number"
                     autoFocus
                     defaultValue={state.profile.savingsTarget || 20}
                     onBlur={(e) => {
                       const val = e.target.value;
                       const num = parseInt(val);
                       if (!isNaN(num) && num >= 0 && num <= 100) {
                         setState((prev: any) => ({
                           ...prev,
                           profile: { ...prev.profile, savingsTarget: num }
                         }));
                       }
                       setEditingTarget(false);
                     }}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') e.currentTarget.blur();
                       if (e.key === 'Escape') setEditingTarget(false);
                     }}
                     style={{
                       width: 60,
                       background: 'rgba(52, 211, 153, 0.1)',
                       border: `1px solid ${THEME.sage}`,
                       borderRadius: 6,
                       color: THEME.sage,
                       fontSize: 12,
                       fontWeight: 800,
                       padding: '2px 6px',
                       outline: 'none',
                       textAlign: 'center'
                     }}
                   />
                 ) : (
                   <Badge 
                     variant="sage" 
                     style={{ cursor: 'pointer' }}
                     onClick={(e) => {
                       e.stopPropagation();
                       setEditingTarget(true);
                     }}
                   >
                     Target: {state.profile.savingsTarget || 20}%
                   </Badge>
                 )}
               </div>
               
               <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
                 {(() => {
                   const income = metrics.monthIncome || 0;
                   const spent = metrics.monthExpense || 0;
                   const targetPct = state.profile.savingsTarget || 20;
                   const savingsTarget = income * (targetPct / 100);
                   const safeSpendLimit = income * ((100 - targetPct) / 100);
                   const remainingSafe = safeSpendLimit - spent;
                   const spendingPct = income > 0 ? (spent / income) * 100 : 0;
                   const isOverBudget = spent > safeSpendLimit;
                   
                   // Calculate remaining days in month for daily actionable
                   const now = new Date();
                   const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                   const daysLeft = Math.max(1, lastDay - now.getDate());
                   const dailyBudget = remainingSafe > 0 ? (remainingSafe / daysLeft) : 0;

                   return (
                     <>
                       <div style={{ textAlign: 'center', marginBottom: 10 }}>
                         <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
                           {remainingSafe > 0 ? "Safe to Spend" : "Savings Alert"}
                         </div>
                         <div style={{ fontSize: 32, fontWeight: 900, color: remainingSafe > 0 ? THEME.sage : THEME.rust, letterSpacing: '-0.03em' }}>
                           {fmtINRFull(Math.abs(remainingSafe))}
                         </div>
                         <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
                           {remainingSafe > 0 
                             ? `Keep daily spend below ${fmtINR(dailyBudget)} to hit your ${targetPct}% goal`
                             : `You've exceeded your safety limit by ${fmtINR(Math.abs(remainingSafe))}`}
                         </div>
                       </div>

                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 10, padding: '12px 0', borderTop: `1px solid ${THEME.line}`, borderBottom: `1px solid ${THEME.line}` }}>
                         <div style={{ textAlign: 'center' }}>
                           <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>Income</div>
                           <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>{fmtINRFull(income)}</div>
                         </div>
                         <div style={{ textAlign: 'center' }}>
                           <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>Spent</div>
                           <div style={{ fontSize: 13, fontWeight: 800, color: THEME.rust }}>{fmtINRFull(spent)}</div>
                         </div>
                         <div style={{ textAlign: 'center' }}>
                           <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>To Save</div>
                           <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>{fmtINRFull(savingsTarget)}</div>
                         </div>
                       </div>

                       <div style={{ position: 'relative', height: 12, background: THEME.line, borderRadius: 6, overflow: 'hidden' }}>
                         {/* Safe Zone Marker */}
                         <div style={{ 
                           position: 'absolute', 
                           left: `${100 - targetPct}%`, 
                           top: 0, 
                           bottom: 0, 
                           width: 2, 
                           background: THEME.accent, 
                           zIndex: 2,
                           opacity: 0.5 
                         }} />
                         
                         {/* Actual Spending Fill */}
                         <div style={{ 
                           width: `${Math.min(100, spendingPct)}%`, 
                           height: '100%', 
                           background: isOverBudget ? THEME.rust : spendingPct > 95 ? "#F97316" : spendingPct > (100 - targetPct) * 0.8 ? THEME.gold : spendingPct > 50 ? "#A3E635" : THEME.sage,
                           transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                         }} />
                       </div>

                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: THEME.muted }}>
                         <span>SPENT: {spendingPct.toFixed(0)}%</span>
                         <span>GOAL: {targetPct}% SAVED</span>
                       </div>

                       <div style={{ 
                         padding: '12px', 
                         borderRadius: 12, 
                         background: isOverBudget ? 'rgba(248, 113, 113, 0.05)' : 'rgba(52, 211, 153, 0.05)',
                         border: `1px solid ${isOverBudget ? 'rgba(248, 113, 113, 0.1)' : 'rgba(52, 211, 153, 0.1)'}`,
                         fontSize: 12,
                         lineHeight: 1.5,
                         color: isOverBudget ? THEME.rust : THEME.sage,
                         fontWeight: 500
                       }}>
                         {isOverBudget 
                           ? "⚠️ Your spending has eaten into your savings target. Consider deferring non-essential purchases."
                           : "✨ You're pacing well! Staying disciplined now will help you reach your financial milestones faster."}
                       </div>
                     </>
                   );
                 })()}
               </div>
             </Card>

             <Card className="bento-col-12" style={{ padding: 24, marginTop: 4 }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                 <div className="section-label" style={{ marginBottom: 0 }}>Recent Transactions</div>
                 <Badge variant="muted">{state.transactions.length} total</Badge>
               </div>
               {state.transactions.length === 0 ? (
                 <div style={{ textAlign: "center", padding: "32px 0", color: THEME.muted, fontSize: 13 }}>No transactions yet</div>
               ) : (
                 <div style={{ display: "grid", gap: 12 }}>
                   {state.transactions
                     .slice()
                     .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                     .slice(0, 5)
                     .map((t: any) => (
                       <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                         <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                           <div style={{ width: 40, height: 40, borderRadius: 10, background: t.type === "credit" ? "color-mix(in srgb, var(--t-sage) 12%, transparent)" : "color-mix(in srgb, var(--t-rust) 12%, transparent)", color: t.type === "credit" ? THEME.sage : THEME.rust, display: "flex", alignItems: "center", justifyContent: "center" }}>
                             {t.type === "credit" ? <TrendingUp size={18} /> : <Receipt size={18} />}
                           </div>
                           <div>
                             <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>{t.note || t.category}</div>
                             <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>{t.date} · {t.category}</div>
                           </div>
                         </div>
                         <div style={{ textAlign: "right" }}>
                           <div style={{ fontSize: 15, fontWeight: 800, color: t.type === "credit" ? THEME.sage : THEME.ink }}>
                             {t.type === "credit" ? "+" : "-"}{fmtINR(t.amount)}
                           </div>
                           <div style={{ fontSize: 11, fontWeight: 600, color: t.type === "credit" ? THEME.sage : THEME.rust, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                             {t.type === "credit" ? "Credit" : "Debit"}
                           </div>
                         </div>
                       </div>
                   ))}
                 </div>
               )}
             </Card>
        </div>
      )}

      {sub === "trends" && (
        <div className="animate-fade-in-up">
           <Card style={{ marginBottom: 28, padding: 24 }}>
            <div className="section-label">Net Worth Growth</div>
            {netWorthTrend.length === 0 || netWorthTrend.every(t => t.value === 0) ? (
              <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.muted, fontSize: 13, background: "rgba(128,128,128,0.03)", borderRadius: 12 }}>
                Not enough history to show net worth trend
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={netWorthTrend}>
                  <defs>
                    <linearGradient id="gNw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={THEME.accent} stopOpacity={0.4} /><stop offset="100%" stopColor={THEME.accent} stopOpacity={0} /></linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={THEME.accent} floodOpacity="0.5" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                  <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 11 }} />
                  <YAxis tick={{ fill: THEME.muted, fontSize: 11 }} tickFormatter={fmtINR} />
                  <Tooltip formatter={(v: any) => fmtINRFull(v)} contentStyle={{ background: "var(--surface-0)", border: "1px solid var(--t-line)", borderRadius: 12, boxShadow: "var(--shadow-xl)" }} />
                  <Area type="monotone" dataKey="value" stroke={THEME.accent} strokeWidth={3} fill="url(#gNw)" style={{ filter: "url(#glow)" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <Card style={{ padding: 24 }}>
              <div className="section-label">Monthly Income vs Expense</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trendData.slice(-6)}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.sage} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={THEME.sage} stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.rust} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={THEME.rust} stopOpacity={0.4} />
                    </linearGradient>
                    <filter id="glow-sage" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={THEME.sage} floodOpacity="0.4" />
                    </filter>
                    <filter id="glow-rust" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={THEME.rust} floodOpacity="0.4" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtINR} tick={{ fill: THEME.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: any) => fmtINRFull(v)} cursor={{ fill: THEME.line, opacity: 0.4 }} contentStyle={{ background: "var(--surface-0)", border: "1px solid var(--t-line)", borderRadius: 12, boxShadow: "var(--shadow-xl)" }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="income" name="Income" fill="url(#gIncome)" radius={[4, 4, 0, 0]} style={{ filter: "url(#glow-sage)" }} />
                  <Bar dataKey="expense" name="Expense" fill="url(#gExpense)" radius={[4, 4, 0, 0]} style={{ filter: "url(#glow-rust)" }} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card style={{ padding: 24 }}>
               <div className="section-label">Portfolio Return</div>
               <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { name: "Mutual Funds", current: metrics.mfValue, invested: metrics.mfInvested },
                    { name: "Stocks", current: metrics.stockValue, invested: metrics.stockInvested }
                  ]}>
                    <defs>
                      <linearGradient id="gCurrent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={THEME.sage} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={THEME.sage} stopOpacity={0.4} />
                      </linearGradient>
                      <linearGradient id="gInvested" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={THEME.muted} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={THEME.muted} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: THEME.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtINR} tick={{ fill: THEME.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: any) => fmtINRFull(v)} cursor={{ fill: THEME.line, opacity: 0.4 }} contentStyle={{ background: "var(--surface-0)", border: "1px solid var(--t-line)", borderRadius: 12, boxShadow: "var(--shadow-xl)" }} />
                    <Legend iconType="circle" />
                    <Bar dataKey="current" name="Current Value" fill="url(#gCurrent)" radius={[4, 4, 0, 0]} style={{ filter: "url(#glow-sage)" }} />
                    <Bar dataKey="invested" name="Invested" fill="url(#gInvested)" radius={[4, 4, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
            </Card>
          </div>
        </div>
      )}

      {sub === "spending" && (
        <div className="animate-fade-in-up">
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
            <Card style={{ padding: 24 }}>
              <div className="section-label">Expense Breakup (This Month)</div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={metrics.expenseBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={70} paddingAngle={4}>
                      {metrics.expenseBreakdown.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtINRFull(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "grid", gap: 10, minWidth: 200 }}>
                  {metrics.expenseBreakdown.slice(0, 6).map((cat: any, i: number) => (
                    <div key={cat.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span style={{ fontWeight: 600 }}>{cat.name}</span>
                      </div>
                      <span style={{ color: THEME.muted }}>{fmtINR(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card style={{ padding: 24 }}>
              <div className="section-label">Top Expenses</div>
              <div style={{ display: "grid", gap: 16 }}>
                {metrics.expenseBreakdown.slice(0, 5).map((cat: any, i: number) => {
                  const maxVal = metrics.expenseBreakdown[0].value;
                  const pct = maxVal > 0 ? (cat.value / maxVal) * 100 : 0;
                  return (
                    <div key={cat.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{cat.name}</span>
                        <span style={{ fontSize: 14, fontWeight: 800 }}>{fmtINRFull(cat.value)}</span>
                      </div>
                      <div className="progress-track"><div className="progress-fill" style={{ width: pct + "%", background: PIE_COLORS[i % PIE_COLORS.length] }} /></div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {sub === "allocation" && (
        <div className="animate-fade-in-up">
           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <Card style={{ padding: 24 }}>
                <div className="section-label">Asset Allocation</div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={assetBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={0} paddingAngle={0}>
                      {assetBreakdown.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtINRFull(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card style={{ padding: 24 }}>
                <div className="section-label">Asset vs Liability</div>
                <div style={{ height: 300, display: "flex", flexDirection: "column", justifyContent: "center", gap: 32 }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontWeight: 700 }}>Total Assets</span>
                      <span style={{ fontWeight: 800, color: THEME.sage }}>{fmtINRFull(metrics.totalAssets)}</span>
                    </div>
                    <div className="progress-track"><div className="progress-fill progress-fill-sage" style={{ width: "100%" }} /></div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontWeight: 700 }}>Total Liabilities</span>
                      <span style={{ fontWeight: 800, color: THEME.rust }}>{fmtINRFull(metrics.totalLiabilities)}</span>
                    </div>
                    <div className="progress-track"><div className="progress-fill progress-fill-rust" style={{ width: (metrics.totalAssets > 0 ? (metrics.totalLiabilities / metrics.totalAssets) * 100 : 0) + "%" }} /></div>
                  </div>
                  <div style={{ textAlign: "center", paddingTop: 20, borderTop: `1px solid ${THEME.line}` }}>
                    <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4 }}>Net Worth Equity</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: isPositive ? THEME.accent : THEME.rust }}>{fmtINRFull(metrics.netWorth)}</div>
                  </div>
                </div>
              </Card>
           </div>
        </div>
      )}
      {sub === "calendar" && (
        <div className="animate-fade-in-up">
          <Card style={{ padding: 24, marginBottom: 32 }}>
            <div className="section-label">Bill Calendar · {new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}</div>
            {(() => {
              const now = new Date();
              const year = now.getFullYear(), month = now.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const today2 = now.getDate();
              const dueDays: Record<number, any[]> = {};
              
              (state.creditCards || []).forEach((c: any) => {
                const dueDate = getCCDueDate(c);
                if (dueDate) {
                  const d = new Date(dueDate);
                  if (d.getFullYear() === year && d.getMonth() === month) {
                    dueDays[d.getDate()] = (dueDays[d.getDate()] || []).concat({ label: c.issuer || "Card", color: THEME.rust });
                  }
                }
              });
              
              (state.subscriptions || []).filter((s: any) => !s.paused).forEach((s: any) => {
                if (s.renewalDate) {
                  const d = new Date(s.renewalDate);
                  if (d.getFullYear() === year && d.getMonth() === month) {
                    dueDays[d.getDate()] = (dueDays[d.getDate()] || []).concat({ label: s.name, color: THEME.gold });
                  }
                }
              });
              
              [15].forEach((day) => { if (month === 5) dueDays[day] = (dueDays[day] || []).concat({ label: "Adv. Tax", color: THEME.accent }); });
              if (month === 8 || month === 11 || month === 2) dueDays[15] = (dueDays[15] || []).concat({ label: "Adv. Tax", color: THEME.accent });
              
              const cells: (number | null)[] = [];
              for (let i = 0; i < firstDay; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(d);
              
              return (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
                    {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                      <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: THEME.muted, padding: "4px 0" }}>{d}</div>
                    ))}
                    {cells.map((d, i) => (
                      <div key={i} style={{ minHeight: 60, padding: 4, borderRadius: 6, fontSize: 11, background: d === today2 ? `color-mix(in srgb, ${THEME.accent} 15%, transparent)` : dueDays[d!] ? "color-mix(in srgb, var(--t-gold) 10%, transparent)" : "transparent", border: d === today2 ? `1.5px solid ${THEME.accent}` : "1px solid transparent" }}>
                        {d && <>
                          <div style={{ fontWeight: d === today2 ? 800 : 500, color: d === today2 ? THEME.accent : THEME.ink, marginBottom: 2 }}>{d}</div>
                          {(dueDays[d] || []).slice(0, 3).map((due: any, j: number) => (
                            <div key={j} style={{ fontSize: 9, color: due.color, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{due.label}</div>
                          ))}
                        </>}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 11, color: THEME.muted, marginTop: 12 }}>
                    <span><span style={{ color: THEME.rust, fontWeight: 700 }}>●</span> Credit card dues</span>
                    <span><span style={{ color: THEME.gold, fontWeight: 700 }}>●</span> Subscriptions</span>
                    <span><span style={{ color: THEME.accent, fontWeight: 700 }}>●</span> Advance tax</span>
                  </div>
                </>
              );
            })()}
          </Card>
        </div>
      )}

      {showReport && (
        <MonthlyReportModal metrics={metrics} state={state} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
};

const HeroStat = ({ label, value, negative, sage }: any) => {
  const color = negative ? "#F87171" : sage ? "#34D399" : "rgba(255,255,255,0.9)";
  return (
    <div style={{ borderLeft: `2px solid ${color}22`, paddingLeft: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 5, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1 }}>
        {fmtINRFull(value)}
      </div>
    </div>
  );
};
