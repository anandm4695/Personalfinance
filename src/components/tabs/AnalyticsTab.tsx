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
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  metrics,
  state,
  assetBreakdown,
  trendData,
  chartStyle,
}) => {
  const [sub, setSub] = useState("dashboard");
  const [drillCat, setDrillCat] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

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
      { label: "Savings Rate", score: savingsScore, max: 25, pct: (savingsScore / 25) * 100 },
      { label: "Debt Ratio", score: debtScore, max: 25, pct: (debtScore / 25) * 100 },
      { label: "Emergency Fund", score: emergencyScore, max: 25, pct: (emergencyScore / 25) * 100 },
      { label: "Diversification", score: divScore, max: 25, pct: (divScore / 25) * 100 },
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
        <div className="animate-fade-in-up">
          <Card variant="hero" style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 20, position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: isPositive ? "#34D399" : "#FB7185", boxShadow: `0 0 10px ${isPositive ? "rgba(52,211,153,0.5)" : "rgba(251,113,133,0.5)"}` }} />
                <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", fontWeight: 700 }}>Wealth Overview</span>
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            
            <div style={{ position: "relative", zIndex: 1, marginBottom: 32 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>Total Net Worth</div>
              <div style={{ fontSize: "clamp(42px, 5.5vw, 64px)", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.045em", color: "#fff" }}>
                {fmtINRFull(metrics.netWorth)}
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px 24px", position: "relative", zIndex: 1, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <HeroStat label="Bank Cash" value={metrics.cashInBanks} />
              <HeroStat label="Investments" value={metrics.mfValue + metrics.stockValue} />
              <HeroStat label="Liabilities" value={metrics.totalLiabilities} negative />
              <HeroStat label="Monthly P&L" value={metrics.monthIncome - metrics.monthExpense} sage={metrics.monthIncome > metrics.monthExpense} />
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 32 }}>
             <Card style={{ padding: 24 }}>
                <div className="section-label">Financial Health</div>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
                  <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, color: dashboardData.scoreColor }}>{dashboardData.totalScore}</div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: dashboardData.scoreColor }}>{dashboardData.totalScore >= 75 ? "Excellent" : dashboardData.totalScore >= 50 ? "Good" : "Needs Work"}</div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>Health Score</div>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {dashboardData.subScores.map((s) => (
                    <div key={s.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: THEME.muted }}>{s.label}</span>
                        <span style={{ fontWeight: 600 }}>{s.score}/{s.max}</span>
                      </div>
                      <div className="progress-track"><div className="progress-fill" style={{ width: s.pct + "%", background: dashboardData.scoreColor }} /></div>
                    </div>
                  ))}
                </div>
             </Card>

             <Card style={{ padding: 24 }}>
                <div className="section-label">Upcoming Dues</div>
                {dashboardData.dues.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: THEME.muted, fontSize: 13 }}>No major dues coming up</div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {dashboardData.dues.slice(0, 4).map((d, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", borderRadius: 10, background: "rgba(128,128,128,0.04)" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: THEME.muted }}>{d.date}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 14, fontWeight: 800 }}>{fmtINR(d.amount)}</div>
                          <Badge variant={d.daysLeft <= 5 ? "rust" : "gold"} style={{ fontSize: 9 }}>{d.daysLeft}d left</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </Card>

             <Card style={{ padding: 24 }}>
                <div className="section-label">Savings Streak</div>
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>{dashboardData.streakEmoji}</div>
                  <div style={{ fontSize: 42, fontWeight: 900, color: THEME.sage, lineHeight: 1 }}>{dashboardData.streak}</div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>Months Saved</div>
                  <Badge variant="sage" style={{ marginTop: 12 }}>{dashboardData.streakMsg}</Badge>
                </div>
             </Card>
          </div>
        </div>
      )}

      {sub === "trends" && (
        <div className="animate-fade-in-up">
           <Card style={{ marginBottom: 28, padding: 24 }}>
            <div className="section-label">Net Worth Growth</div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={netWorthTrend}>
                <defs>
                  <linearGradient id="gNw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={THEME.accent} stopOpacity={0.4} /><stop offset="100%" stopColor={THEME.accent} stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 11 }} />
                <YAxis tick={{ fill: THEME.muted, fontSize: 11 }} tickFormatter={fmtINR} />
                <Tooltip formatter={(v: any) => fmtINRFull(v)} />
                <Area type="monotone" dataKey="value" stroke={THEME.accent} strokeWidth={3} fill="url(#gNw)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <Card style={{ padding: 24 }}>
              <div className="section-label">Monthly Income vs Expense</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trendData.slice(-6)}>
                  <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={fmtINR} />
                  <Tooltip formatter={(v: any) => fmtINRFull(v)} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill={THEME.sage} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill={THEME.rust} radius={[4, 4, 0, 0]} />
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
                    <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={fmtINR} />
                    <Tooltip formatter={(v: any) => fmtINRFull(v)} />
                    <Bar dataKey="current" fill={THEME.sage} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="invested" fill={THEME.muted} radius={[4, 4, 0, 0]} />
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
