// @ts-nocheck
import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  Home,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Landmark,
  Receipt,
  Shield,
  Target,
  Activity,
  BarChart2,
  DollarSign,
  PiggyBank,
} from "lucide-react";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINRFull, fmtINRExact, getEffectiveRent } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { SectionTitle } from "../ui/SectionTitle";
import { Prv } from "../../context/PrivacyContext";

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Returns an array of { year, month, label } for the next N months starting from today. */
function getFutureMonths(count: number): { year: number; month: number; label: string; key: string }[] {
  const d = new Date();
  const months: { year: number; month: number; label: string; key: string }[] = [];
  for (let i = 1; i <= count; i++) {
    const future = new Date(d.getFullYear(), d.getMonth() + i, 1);
    months.push({
      year: future.getFullYear(),
      month: future.getMonth(),
      label: `${MONTH_NAMES[future.getMonth()]} '${String(future.getFullYear()).slice(-2)}`,
      key: `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  return months;
}

/** Parse a YYYY-MM-DD string into a Date (local timezone). */
function parseDate(s: string): Date | null {
  if (!s) return null;
  try {
    return new Date(s + "T00:00:00");
  } catch {
    return null;
  }
}

/** Check if a date string falls within a range of future months. */
function isDateInRange(dateStr: string, months: { key: string }[]): boolean {
  if (!dateStr) return false;
  const ym = dateStr.slice(0, 7);
  return months.some((m) => m.key === ym);
}

/** Find which month index a date falls into. Returns -1 if not in range. */
function getMonthIndex(dateStr: string, months: { key: string }[]): number {
  if (!dateStr) return -1;
  const ym = dateStr.slice(0, 7);
  return months.findIndex((m) => m.key === ym);
}

/** Convert frequency to monthly multiplier. */
function freqToMonthly(freq: string, amount: number): number {
  const f = (freq || "monthly").toLowerCase();
  if (f === "yearly" || f === "annual" || f === "annually") return amount / 12;
  if (f === "quarterly") return amount / 3;
  if (f === "half-yearly" || f === "semi-annual" || f === "semi-annually") return amount / 6;
  if (f === "weekly") return amount * 4.33;
  if (f === "daily") return amount * 30;
  return amount; // monthly
}

const fmtDate = (dateStr: string) => {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

// ── Component ────────────────────────────────────────────────────────────────

// ── Custom Tooltip for Chart ──────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--surface-0) 90%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1.5px solid var(--t-line)`,
        borderRadius: "12px",
        padding: "14px 16px",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minWidth: "220px",
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--t-muted)", borderBottom: `1px solid var(--t-line)`, paddingBottom: "6px" }}>
        {label} Projection
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {payload.map((entry: any, index: number) => {
          const color = entry.dataKey === "Inflow" ? "var(--t-sage)" : entry.dataKey === "Outflow" ? "var(--t-rust)" : "var(--t-accent)";
          return (
            <div key={index} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--t-ink)" }}>{entry.name}</span>
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: entry.dataKey === "Cumulative" ? "var(--t-accent)" : "var(--t-ink)" }}>
                <Prv>{fmtINRFull(entry.value)}</Prv>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const CashFlowTab = ({ state, metrics }: { state: any; metrics: any }) => {
  const [forecastMonths, setForecastMonths] = useState<3 | 6>(6);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    inflows: true,
    outflows: true,
    events: true,
  });
  const [hoveredInflow, setHoveredInflow] = useState<number | null>(null);
  const [hoveredOutflow, setHoveredOutflow] = useState<number | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const months = useMemo(() => getFutureMonths(forecastMonths), [forecastMonths]);

  // ── INCOME SOURCES ─────────────────────────────────────────────────────────

  const inflows = useMemo(() => {
    const sources: { name: string; monthly: number; icon: any; category: string }[] = [];

    // 1. Salary
    const salaryEntries = (state.income || []).filter(
      (i: any) => (i.category || "").toLowerCase().includes("salary")
    );
    if (salaryEntries.length > 0) {
      // Use latest salary entry
      const sorted = [...salaryEntries].sort(
        (a: any, b: any) => (b.date || "").localeCompare(a.date || "")
      );
      const latest = Number(sorted[0]?.amount || 0);
      if (latest > 0) sources.push({ name: "Salary", monthly: latest, icon: Wallet, category: "Salary" });
    }

    // 2. Rental Income
    const rentalTotal = (state.rentalProperties || []).reduce(
      (sum: number, p: any) => sum + getEffectiveRent(p),
      0
    );
    if (rentalTotal > 0)
      sources.push({ name: "Rental Income", monthly: rentalTotal, icon: Home, category: "Rental" });

    // 3. Dividend Income
    const dividends = state.dividends || [];
    if (dividends.length > 0) {
      // Sum all dividend amounts and annualize based on date range
      const amounts = dividends.map((d: any) => Number(d.amount || d.totalAmount || 0));
      const totalDiv = amounts.reduce((s: number, a: number) => s + a, 0);
      const dates = dividends
        .map((d: any) => d.date || d.exDate || "")
        .filter(Boolean)
        .sort();
      let monthlyDiv = 0;
      if (dates.length >= 2) {
        const first = new Date(dates[0] + "T00:00:00");
        const last = new Date(dates[dates.length - 1] + "T00:00:00");
        const spanMonths = Math.max(
          1,
          (last.getFullYear() - first.getFullYear()) * 12 + (last.getMonth() - first.getMonth())
        );
        monthlyDiv = totalDiv / spanMonths;
      } else {
        // Single dividend — assume annual
        monthlyDiv = totalDiv / 12;
      }
      if (monthlyDiv > 0)
        sources.push({ name: "Dividends", monthly: monthlyDiv, icon: TrendingUp, category: "Dividends" });
    }

    // 4. Interest Income — FDs
    const fdInterest = (state.fixedDeposits || []).reduce((sum: number, fd: any) => {
      const principal = Number(fd.principal || fd.amount || 0);
      const rate = Number(fd.rate || fd.interestRate || 0);
      return sum + (principal * rate) / 100 / 12;
    }, 0);
    if (fdInterest > 0)
      sources.push({ name: "FD Interest", monthly: fdInterest, icon: Landmark, category: "Interest" });

    // Interest Income — RDs
    const rdInterest = (state.recurringDeposits || []).reduce((sum: number, rd: any) => {
      const monthly = Number(rd.monthlyDeposit || rd.amount || 0);
      const rate = Number(rd.rate || rd.interestRate || 0);
      // Rough estimate: average balance * rate / 12
      const tenure = Number(rd.tenureMonths || rd.tenure || 12);
      const avgBalance = (monthly * tenure) / 2;
      return sum + (avgBalance * rate) / 100 / 12;
    }, 0);
    if (rdInterest > 0)
      sources.push({ name: "RD Interest", monthly: rdInterest, icon: Landmark, category: "Interest" });

    // Interest Income — PPF
    const ppfInterest = (state.ppf || []).reduce((sum: number, p: any) => {
      const balance = Number(p.currentBalance || p.balance || 0);
      const rate = Number(p.interestRate || 7.1);
      return sum + (balance * rate) / 100 / 12;
    }, 0);
    if (ppfInterest > 0)
      sources.push({ name: "PPF Interest", monthly: ppfInterest, icon: PiggyBank, category: "Interest" });

    // 5. Other Income
    const otherIncome = (state.income || []).filter(
      (i: any) => !(i.category || "").toLowerCase().includes("salary")
    );
    if (otherIncome.length > 0) {
      const sorted = [...otherIncome].sort(
        (a: any, b: any) => (b.date || "").localeCompare(a.date || "")
      );
      // Take the latest 3 months of "other" income to average
      const recent = sorted.slice(0, 3);
      const avg = recent.reduce((s: number, i: any) => s + Number(i.amount || 0), 0) / Math.max(recent.length, 1);
      if (avg > 0)
        sources.push({ name: "Other Income", monthly: avg, icon: DollarSign, category: "Other" });
    }

    return sources;
  }, [state.income, state.rentalProperties, state.dividends, state.fixedDeposits, state.recurringDeposits, state.ppf]);

  // ── EXPENSE SOURCES ────────────────────────────────────────────────────────

  const outflows = useMemo(() => {
    const sources: { name: string; monthly: number; icon: any; category: string }[] = [];

    // 1. EMIs
    const emiTotal = (state.loansTaken || []).reduce(
      (sum: number, l: any) => sum + Number(l.emi || 0),
      0
    );
    if (emiTotal > 0)
      sources.push({ name: "Loan EMIs", monthly: emiTotal, icon: CreditCard, category: "EMI" });

    // 2. SIPs (active only)
    const sipTotal = (state.sips || []).reduce((sum: number, s: any) => {
      if ((s.status || "").toLowerCase() === "stopped") return sum;
      return sum + Number(s.amount || 0);
    }, 0);
    if (sipTotal > 0)
      sources.push({ name: "SIP Investments", monthly: sipTotal, icon: TrendingUp, category: "SIP" });

    // 3. Subscriptions
    const subTotal = (state.subscriptions || []).reduce((sum: number, s: any) => {
      if (s.paused || (s.status || "").toLowerCase() === "cancelled" || (s.status || "").toLowerCase() === "inactive")
        return sum;
      const amt = Number(s.amount || s.price || 0);
      return sum + freqToMonthly(s.frequency || s.billing || "monthly", amt);
    }, 0);
    if (subTotal > 0)
      sources.push({ name: "Subscriptions", monthly: subTotal, icon: Receipt, category: "Subscriptions" });

    // 4. Recurring Expenses
    const recurringTotal = (state.recurringExpenses || []).reduce(
      (sum: number, e: any) => sum + Number(e.amount || 0),
      0
    );
    if (recurringTotal > 0)
      sources.push({ name: "Recurring Expenses", monthly: recurringTotal, icon: Activity, category: "Recurring" });

    // 5. Credit Card Minimum Dues (only include minimum_due which is the actual monthly obligation)
    const ccMinDue = (state.creditCards || [])
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .reduce((sum: number, c: any) => sum + Number(c.minimumDue || c.lastBill || 0), 0);
    if (ccMinDue > 0)
      sources.push({ name: "Credit Card Dues", monthly: ccMinDue, icon: CreditCard, category: "Credit Cards" });

    // 6. Rent Paid
    const rentPaid = (state.rentedProperties || []).reduce(
      (sum: number, p: any) => sum + getEffectiveRent(p),
      0
    );
    if (rentPaid > 0)
      sources.push({ name: "Rent Paid", monthly: rentPaid, icon: Home, category: "Rent" });

    // 7. Insurance Premiums
    const licPremium = (state.lic || []).reduce((sum: number, l: any) => {
      const annual = Number(l.annualPremium || l.premium || 0);
      return sum + annual / 12;
    }, 0);
    const termPremium = (state.termPlans || []).reduce((sum: number, t: any) => {
      const annual = Number(t.annualPremium || t.premium || 0);
      return sum + annual / 12;
    }, 0);
    const ulipPremium = (state.investmentPlans || []).reduce((sum: number, ip: any) => {
      const annual = Number(ip.annualPremium || ip.premium || 0);
      return sum + annual / 12;
    }, 0);
    const totalInsurance = licPremium + termPremium + ulipPremium;
    if (totalInsurance > 0)
      sources.push({ name: "Insurance Premiums", monthly: totalInsurance, icon: Shield, category: "Insurance" });

    // 8. Budget Spend
    const budgetTotal = (state.budgets || []).reduce(
      (sum: number, b: any) => sum + Number(b.monthly || b.monthlyLimit || b.limit || 0),
      0
    );
    if (budgetTotal > 0)
      sources.push({ name: "Budget Spend", monthly: budgetTotal, icon: Target, category: "Budget" });

    return sources;
  }, [
    state.loansTaken, state.sips, state.subscriptions, state.recurringExpenses,
    state.creditCards, state.rentedProperties, state.lic, state.termPlans,
    state.investmentPlans, state.budgets,
  ]);

  // ── ONE-TIME EVENTS ────────────────────────────────────────────────────────

  const events = useMemo(() => {
    const items: { date: string; name: string; amount: number; category: string; type: "inflow" | "outflow" }[] = [];

    // FD Maturities
    (state.fixedDeposits || []).forEach((fd: any) => {
      const matDate = fd.maturityDate || "";
      if (isDateInRange(matDate, months)) {
        const maturityAmount = Number(fd.maturityAmount || fd.principal || fd.amount || 0);
        items.push({
          date: matDate,
          name: `FD Maturity${fd.bankName ? ` — ${fd.bankName}` : ""}`,
          amount: maturityAmount,
          category: "FD Maturity",
          type: "inflow",
        });
      }
    });

    // RD Maturities
    (state.recurringDeposits || []).forEach((rd: any) => {
      const matDate = rd.maturityDate || "";
      if (isDateInRange(matDate, months)) {
        const maturityAmount = Number(rd.maturityAmount || 0);
        items.push({
          date: matDate,
          name: `RD Maturity${rd.bankName ? ` — ${rd.bankName}` : ""}`,
          amount: maturityAmount,
          category: "RD Maturity",
          type: "inflow",
        });
      }
    });

    // Insurance Premium Due
    const todayDate = new Date();
    [...(state.lic || []), ...(state.termPlans || []), ...(state.investmentPlans || [])].forEach(
      (policy: any) => {
        const premium = Number(policy.annualPremium || policy.premium || 0);
        if (premium <= 0) return;
        // Try to figure out next due date from policy start or last premium date
        const dueDate = policy.nextPremiumDate || policy.premiumDueDate || "";
        if (dueDate && isDateInRange(dueDate, months)) {
          items.push({
            date: dueDate,
            name: `Premium — ${policy.planName || policy.name || policy.provider || "Insurance"}`,
            amount: premium,
            category: "Insurance Premium",
            type: "outflow",
          });
        }
      }
    );

    // Loan Closures
    (state.loansTaken || []).forEach((loan: any) => {
      const endDate = loan.endDate || loan.closureDate || "";
      if (isDateInRange(endDate, months)) {
        items.push({
          date: endDate,
          name: `Loan Closure — ${loan.name || loan.lender || loan.type || "Loan"}`,
          amount: Number(loan.outstanding || loan.balance || 0),
          category: "Loan Closure",
          type: "outflow",
        });
      }
    });

    // Subscription Renewals (yearly subs)
    (state.subscriptions || []).forEach((sub: any) => {
      const freq = (sub.frequency || sub.billing || "monthly").toLowerCase();
      if (freq !== "yearly" && freq !== "annual" && freq !== "annually") return;
      if ((sub.status || "").toLowerCase() === "cancelled") return;
      const renewDate = sub.renewalDate || sub.nextBillingDate || "";
      if (renewDate && isDateInRange(renewDate, months)) {
        items.push({
          date: renewDate,
          name: `Renewal — ${sub.name || sub.service || "Subscription"}`,
          amount: Number(sub.amount || sub.price || 0),
          category: "Subscription Renewal",
          type: "outflow",
        });
      }
    });

    return items.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [state.fixedDeposits, state.recurringDeposits, state.lic, state.termPlans, state.investmentPlans, state.loansTaken, state.subscriptions, months]);

  // ── CHART DATA ─────────────────────────────────────────────────────────────

  const totalMonthlyInflow = inflows.reduce((s, i) => s + i.monthly, 0);
  const totalMonthlyOutflow = outflows.reduce((s, o) => s + o.monthly, 0);
  const netMonthly = totalMonthlyInflow - totalMonthlyOutflow;
  const totalInflow = totalMonthlyInflow * forecastMonths;
  const totalOutflow = totalMonthlyOutflow * forecastMonths;
  // Add one-time event amounts
  const eventInflow = events.filter((e) => e.type === "inflow").reduce((s, e) => s + e.amount, 0);
  const eventOutflow = events.filter((e) => e.type === "outflow").reduce((s, e) => s + e.amount, 0);
  const grandInflow = totalInflow + eventInflow;
  const grandOutflow = totalOutflow + eventOutflow;
  const netCashFlow = grandInflow - grandOutflow;

  const chartData = useMemo(() => {
    let cumulative = 0;
    return months.map((m) => {
      // Add one-time events for this month
      const monthEventInflow = events
        .filter((e) => e.type === "inflow" && e.date.startsWith(m.key))
        .reduce((s, e) => s + e.amount, 0);
      const monthEventOutflow = events
        .filter((e) => e.type === "outflow" && e.date.startsWith(m.key))
        .reduce((s, e) => s + e.amount, 0);

      const inflow = totalMonthlyInflow + monthEventInflow;
      const outflow = totalMonthlyOutflow + monthEventOutflow;
      cumulative += inflow - outflow;

      return {
        month: m.label,
        Inflow: Math.round(inflow),
        Outflow: Math.round(outflow),
        Cumulative: Math.round(cumulative),
      };
    });
  }, [months, totalMonthlyInflow, totalMonthlyOutflow, events]);

  // ── EMPTY STATE ────────────────────────────────────────────────────────────

  const hasData = inflows.length > 0 || outflows.length > 0;

  if (!hasData) {
    return (
      <div>
        <SectionTitle sub="Forward-looking projection of your income, expenses, and one-time events">
          Cash Flow Forecast
        </SectionTitle>
        <Card style={{ padding: "48px 32px", textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.sage})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <Activity size={30} color="#fff" />
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: THEME.ink,
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }}
          >
            No Cash Flow Data Yet
          </div>
          <div
            style={{
              fontSize: 13,
              color: THEME.muted,
              maxWidth: 420,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Add income entries, loans, SIPs, subscriptions, or budgets to see your projected cash flow
            over the next {forecastMonths} months.
          </div>
        </Card>
      </div>
    );
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <SectionTitle
        sub="Forward-looking projection of your income, expenses, and one-time events"
        rightElement={
          <div
            style={{
              display: "flex",
              background: "var(--surface-1)",
              padding: "4px",
              borderRadius: "var(--radius-md)",
              border: `1.5px solid ${THEME.line}`,
              position: "relative",
              gap: "2px",
            }}
          >
            <button
              onClick={() => setForecastMonths(3)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: forecastMonths === 3 ? "var(--surface-0)" : "transparent",
                color: forecastMonths === 3 ? "var(--t-ink)" : "var(--t-muted)",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
                boxShadow: forecastMonths === 3 ? "var(--shadow-sm)" : "none",
                transition: "all 0.2s var(--ease-premium)",
              }}
            >
              3 Months
            </button>
            <button
              onClick={() => setForecastMonths(6)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: forecastMonths === 6 ? "var(--surface-0)" : "transparent",
                color: forecastMonths === 6 ? "var(--t-ink)" : "var(--t-muted)",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
                boxShadow: forecastMonths === 6 ? "var(--shadow-sm)" : "none",
                transition: "all 0.2s var(--ease-premium)",
              }}
            >
              6 Months
            </button>
          </div>
        }
      >
        Cash Flow Forecast
      </SectionTitle>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Card 1: Total Projected Inflow */}
        <Card
          hover
          style={{
            padding: "20px",
            borderTop: `4px solid ${THEME.sage}`,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: THEME.sage,
                }}
              >
                <ArrowUpRight size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Total Projected Inflow
                </div>
                <div style={{ fontSize: 10, color: THEME.muted, opacity: 0.8, marginTop: 1 }}>
                  Next {forecastMonths} Months
                </div>
              </div>
            </div>
            <Badge variant="sage">{Math.round(grandInflow > 0 ? (totalInflow / grandInflow) * 100 : 100)}% Regular</Badge>
          </div>
          
          <div style={{ fontSize: 28, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>
            <Prv>{fmtINRFull(grandInflow)}</Prv>
          </div>

          {/* Composition bar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            <div style={{ height: 6, borderRadius: 3, background: `color-mix(in srgb, ${THEME.sage} 15%, var(--t-line))`, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${(totalInflow / Math.max(1, grandInflow)) * 100}%`, background: THEME.sage, height: "100%" }} />
              <div style={{ width: `${(eventInflow / Math.max(1, grandInflow)) * 100}%`, background: "var(--t-accent)", height: "100%" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
              <span>Regular: <Prv>{fmtINRFull(totalInflow)}</Prv></span>
              <span>Events: <Prv>{fmtINRFull(eventInflow)}</Prv></span>
            </div>
          </div>
        </Card>

        {/* Card 2: Total Projected Outflow */}
        <Card
          hover
          style={{
            padding: "20px",
            borderTop: `4px solid ${THEME.rust}`,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: THEME.rust,
                }}
              >
                <ArrowDownRight size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Total Projected Outflow
                </div>
                <div style={{ fontSize: 10, color: THEME.muted, opacity: 0.8, marginTop: 1 }}>
                  Next {forecastMonths} Months
                </div>
              </div>
            </div>
            <Badge variant="rust">{Math.round(grandOutflow > 0 ? (totalOutflow / grandOutflow) * 100 : 100)}% Regular</Badge>
          </div>

          <div style={{ fontSize: 28, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>
            <Prv>{fmtINRFull(grandOutflow)}</Prv>
          </div>

          {/* Composition bar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            <div style={{ height: 6, borderRadius: 3, background: `color-mix(in srgb, ${THEME.rust} 15%, var(--t-line))`, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${(totalOutflow / Math.max(1, grandOutflow)) * 100}%`, background: THEME.rust, height: "100%" }} />
              <div style={{ width: `${(eventOutflow / Math.max(1, grandOutflow)) * 100}%`, background: "var(--t-gold)", height: "100%" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
              <span>Regular: <Prv>{fmtINRFull(totalOutflow)}</Prv></span>
              <span>Events: <Prv>{fmtINRFull(eventOutflow)}</Prv></span>
            </div>
          </div>
        </Card>

        {/* Card 3: Net Cash Flow */}
        <Card
          hover
          style={{
            padding: "20px",
            borderTop: `4px solid ${netCashFlow >= 0 ? THEME.sage : THEME.rust}`,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: netCashFlow >= 0 ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)` : `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                  border: `1px solid ${netCashFlow >= 0 ? `color-mix(in srgb, ${THEME.sage} 20%, transparent)` : `color-mix(in srgb, ${THEME.rust} 20%, transparent)`}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: netCashFlow >= 0 ? THEME.sage : THEME.rust,
                }}
              >
                {netCashFlow >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Net Cash Flow
                </div>
                <div style={{ fontSize: 10, color: THEME.muted, opacity: 0.8, marginTop: 1 }}>
                  Maturities & Closures Included
                </div>
              </div>
            </div>
            <Badge variant={netCashFlow >= 0 ? "sage" : "rust"}>{netCashFlow >= 0 ? "Surplus" : "Deficit"}</Badge>
          </div>

          <div style={{ fontSize: 28, fontWeight: 900, color: netCashFlow >= 0 ? THEME.sage : THEME.rust, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>
            <Prv>{(netCashFlow < 0 ? "-" : "") + fmtINRFull(Math.abs(netCashFlow))}</Prv>
          </div>

          {/* Cash Flow Ratio indicator */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            <div style={{ height: 6, borderRadius: 3, background: "var(--t-line)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, (grandInflow / Math.max(1, grandInflow + grandOutflow)) * 100))}%`,
                  background: netCashFlow >= 0 ? THEME.sage : THEME.rust,
                  height: "100%",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
              <span>Coverage Ratio: {(grandInflow / Math.max(1, grandOutflow)).toFixed(2)}x</span>
              <span>{netCashFlow >= 0 ? "Positive Savings" : "Capital Deficit"}</span>
            </div>
          </div>
        </Card>

        {/* Card 4: Monthly Surplus/Deficit */}
        <Card
          hover
          style={{
            padding: "20px",
            borderTop: `4px solid ${netMonthly >= 0 ? THEME.sage : THEME.rust}`,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: netMonthly >= 0 ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)` : `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                  border: `1px solid ${netMonthly >= 0 ? `color-mix(in srgb, ${THEME.sage} 20%, transparent)` : `color-mix(in srgb, ${THEME.rust} 20%, transparent)`}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: netMonthly >= 0 ? THEME.sage : THEME.rust,
                }}
              >
                {netMonthly >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Monthly Surplus
                </div>
                <div style={{ fontSize: 10, color: THEME.muted, opacity: 0.8, marginTop: 1 }}>
                  Regular Income & Expenses
                </div>
              </div>
            </div>
            <Badge variant={netMonthly >= 0 ? "sage" : "rust"}>{netMonthly >= 0 ? "Stable" : "Tight"}</Badge>
          </div>

          <div style={{ fontSize: 28, fontWeight: 900, color: netMonthly >= 0 ? THEME.sage : THEME.rust, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>
            <Prv>{(netMonthly < 0 ? "-" : "") + fmtINRFull(Math.abs(netMonthly))}</Prv>
          </div>

          {/* Monthly progress indicator */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            <div style={{ height: 6, borderRadius: 3, background: "var(--t-line)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, (totalMonthlyInflow / Math.max(1, totalMonthlyInflow + totalMonthlyOutflow)) * 100))}%`,
                  background: netMonthly >= 0 ? THEME.sage : THEME.rust,
                  height: "100%",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
              <span>In: <Prv>{fmtINRFull(totalMonthlyInflow)}</Prv></span>
              <span>Out: <Prv>{fmtINRFull(totalMonthlyOutflow)}</Prv></span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────────── */}
      <Card style={{ padding: 24, marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <BarChart2 size={18} style={{ color: THEME.accent }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: THEME.ink }}>
            Monthly Cash Flow Projection
          </span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={4} barCategoryGap="20%">
            <defs>
              <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={THEME.sage} stopOpacity={0.85}/>
                <stop offset="100%" stopColor={THEME.sage} stopOpacity={0.15}/>
              </linearGradient>
              <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={THEME.rust} stopOpacity={0.85}/>
                <stop offset="100%" stopColor={THEME.rust} stopOpacity={0.15}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} opacity={0.3} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fontWeight: 600, fill: THEME.muted }}
              axisLine={{ stroke: THEME.line }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: THEME.muted }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => fmtINRFull(v)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingBottom: 10 }}
            />
            <Bar dataKey="Inflow" name="Projected Inflow" fill="url(#inflowGrad)" stroke={THEME.sage} strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="Outflow" name="Projected Outflow" fill="url(#outflowGrad)" stroke={THEME.rust} strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Line
              type="monotone"
              dataKey="Cumulative"
              stroke={THEME.accent}
              strokeWidth={3}
              dot={{ fill: THEME.accent, stroke: "var(--surface-0)", strokeWidth: 2, r: 5 }}
              activeDot={{ fill: THEME.accent, stroke: "var(--surface-0)", strokeWidth: 2, r: 7 }}
              name="Cumulative Surplus"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Inflows & Outflows Tables ──────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 20,
          marginBottom: 28,
        }}
      >
        {/* Regular Inflows */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div
            onClick={() => toggleSection("inflows")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              cursor: "pointer",
              borderBottom: expandedSections.inflows ? `1px solid ${THEME.line}` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ArrowUpRight size={16} style={{ color: THEME.sage }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>Regular Inflows</span>
              <Badge variant="sage">{inflows.length}</Badge>
            </div>
            {expandedSections.inflows ? (
              <ChevronDown size={16} style={{ color: THEME.muted }} />
            ) : (
              <ChevronRight size={16} style={{ color: THEME.muted }} />
            )}
          </div>
          {expandedSections.inflows && (
            <div style={{ padding: "8px 0" }}>
              {inflows.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                  No regular inflows detected
                </div>
              ) : (
                <div>
                  {/* Table Header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1fr 1fr",
                      alignItems: "center",
                      padding: "10px 20px",
                      borderBottom: `1px solid ${THEME.line}`,
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <div>Source</div>
                    <div style={{ textAlign: "right", paddingRight: 8 }}>Monthly</div>
                    <div style={{ textAlign: "right" }}>{forecastMonths}-Mo Total</div>
                  </div>
                  {inflows.map((item, idx) => {
                    const Icon = item.icon;
                    const pctOfTotal = totalMonthlyInflow > 0 ? (item.monthly / totalMonthlyInflow) * 100 : 0;
                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredInflow(idx)}
                        onMouseLeave={() => setHoveredInflow(null)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.5fr 1fr 1fr",
                          alignItems: "center",
                          padding: "12px 20px",
                          borderBottom: idx < inflows.length - 1 ? `1px solid ${THEME.line}` : "none",
                          background: hoveredInflow === idx ? "var(--surface-1)" : "transparent",
                          transform: hoveredInflow === idx ? "translateX(4px)" : "none",
                          transition: "all 0.2s var(--ease-premium)",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: THEME.sage,
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={14} />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                              {item.name}
                            </span>
                            <span style={{ fontSize: 10, color: THEME.muted }}>
                              {item.category} • {pctOfTotal.toFixed(0)}% of total
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: "right", paddingRight: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.sage, fontVariantNumeric: "tabular-nums" }}>
                            <Prv>{fmtINRExact(item.monthly)}</Prv>
                          </span>
                          <span style={{ display: "block", fontSize: 10, color: THEME.muted }}>/mo</span>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>
                            <Prv>{fmtINRExact(item.monthly * forecastMonths)}</Prv>
                          </span>
                          <span style={{ display: "block", fontSize: 10, color: THEME.muted }}>
                            {forecastMonths}-mo Total
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {/* Total Row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1fr 1fr",
                      alignItems: "center",
                      padding: "14px 20px",
                      borderTop: `2px solid ${THEME.line}`,
                      background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>Total Inflow</span>
                    </div>
                    <div style={{ textAlign: "right", paddingRight: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: THEME.sage, fontVariantNumeric: "tabular-nums" }}>
                        <Prv>{fmtINRExact(totalMonthlyInflow)}</Prv>
                      </span>
                      <span style={{ display: "block", fontSize: 10, color: THEME.sage, fontWeight: 600 }}>/mo</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: THEME.sage, fontVariantNumeric: "tabular-nums" }}>
                        <Prv>{fmtINRExact(totalInflow)}</Prv>
                      </span>
                      <span style={{ display: "block", fontSize: 10, color: THEME.sage, fontWeight: 600 }}>
                        {forecastMonths}-mo Total
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Regular Outflows */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div
            onClick={() => toggleSection("outflows")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              cursor: "pointer",
              borderBottom: expandedSections.outflows ? `1px solid ${THEME.line}` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ArrowDownRight size={16} style={{ color: THEME.rust }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>Regular Outflows</span>
              <Badge variant="rust">{outflows.length}</Badge>
            </div>
            {expandedSections.outflows ? (
              <ChevronDown size={16} style={{ color: THEME.muted }} />
            ) : (
              <ChevronRight size={16} style={{ color: THEME.muted }} />
            )}
          </div>
          {expandedSections.outflows && (
            <div style={{ padding: "8px 0" }}>
              {outflows.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                  No regular outflows detected
                </div>
              ) : (
                <div>
                  {/* Table Header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1fr 1fr",
                      alignItems: "center",
                      padding: "10px 20px",
                      borderBottom: `1px solid ${THEME.line}`,
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <div>Source</div>
                    <div style={{ textAlign: "right", paddingRight: 8 }}>Monthly</div>
                    <div style={{ textAlign: "right" }}>{forecastMonths}-Mo Total</div>
                  </div>
                  {outflows.map((item, idx) => {
                    const Icon = item.icon;
                    const pctOfTotal = totalMonthlyOutflow > 0 ? (item.monthly / totalMonthlyOutflow) * 100 : 0;
                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredOutflow(idx)}
                        onMouseLeave={() => setHoveredOutflow(null)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.5fr 1fr 1fr",
                          alignItems: "center",
                          padding: "12px 20px",
                          borderBottom: idx < outflows.length - 1 ? `1px solid ${THEME.line}` : "none",
                          background: hoveredOutflow === idx ? "var(--surface-1)" : "transparent",
                          transform: hoveredOutflow === idx ? "translateX(4px)" : "none",
                          transition: "all 0.2s var(--ease-premium)",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: THEME.rust,
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={14} />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                              {item.name}
                            </span>
                            <span style={{ fontSize: 10, color: THEME.muted }}>
                              {item.category} • {pctOfTotal.toFixed(0)}% of total
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: "right", paddingRight: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                            <Prv>{fmtINRExact(item.monthly)}</Prv>
                          </span>
                          <span style={{ display: "block", fontSize: 10, color: THEME.muted }}>/mo</span>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>
                            <Prv>{fmtINRExact(item.monthly * forecastMonths)}</Prv>
                          </span>
                          <span style={{ display: "block", fontSize: 10, color: THEME.muted }}>
                            {forecastMonths}-mo Total
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {/* Total Row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1fr 1fr",
                      alignItems: "center",
                      padding: "14px 20px",
                      borderTop: `2px solid ${THEME.line}`,
                      background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>Total Outflow</span>
                    </div>
                    <div style={{ textAlign: "right", paddingRight: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                        <Prv>{fmtINRExact(totalMonthlyOutflow)}</Prv>
                      </span>
                      <span style={{ display: "block", fontSize: 10, color: THEME.rust, fontWeight: 600 }}>/mo</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                        <Prv>{fmtINRExact(totalOutflow)}</Prv>
                      </span>
                      <span style={{ display: "block", fontSize: 10, color: THEME.rust, fontWeight: 600 }}>
                        {forecastMonths}-mo Total
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── Upcoming Events Timeline ───────────────────────────────────────── */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div
          onClick={() => toggleSection("events")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            cursor: "pointer",
            borderBottom: expandedSections.events ? `1px solid ${THEME.line}` : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarClock size={16} style={{ color: THEME.accent }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>Upcoming Events</span>
            <Badge variant="accent">{events.length}</Badge>
          </div>
          {expandedSections.events ? (
            <ChevronDown size={16} style={{ color: THEME.muted }} />
          ) : (
            <ChevronRight size={16} style={{ color: THEME.muted }} />
          )}
        </div>
        {expandedSections.events && (
          <div style={{ padding: "0" }}>
            {events.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                No one-time events in the next {forecastMonths} months
              </div>
            ) : (
              <div style={{ padding: "16px 20px", position: "relative" }}>
                {/* Vertical Timeline Thread */}
                <div
                  style={{
                    position: "absolute",
                    top: "32px",
                    bottom: "32px",
                    left: "35px",
                    width: "2px",
                    background: `linear-gradient(to bottom, var(--t-line) 0%, var(--t-line) 80%, transparent 100%)`,
                    zIndex: 0,
                  }}
                />

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {events.map((event, idx) => {
                    const isInflow = event.type === "inflow";
                    const isHovered = hoveredEvent === idx;

                    // Calculate countdown
                    let relativeLabel = "";
                    if (event.date) {
                      try {
                        const todayTime = new Date().setHours(0, 0, 0, 0);
                        const eventTime = new Date(event.date + "T00:00:00").getTime();
                        const diffTime = eventTime - todayTime;
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays === 0) {
                          relativeLabel = "Today";
                        } else if (diffDays === 1) {
                          relativeLabel = "Tomorrow";
                        } else if (diffDays === -1) {
                          relativeLabel = "Yesterday";
                        } else if (diffDays > 1) {
                          if (diffDays > 30) {
                            const diffMonths = Math.round(diffDays / 30.4);
                            relativeLabel = `In ${diffMonths} month${diffMonths > 1 ? "s" : ""}`;
                          } else {
                            relativeLabel = `In ${diffDays} days`;
                          }
                        } else {
                          const absDays = Math.abs(diffDays);
                          if (absDays > 30) {
                            const diffMonths = Math.round(absDays / 30.4);
                            relativeLabel = `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
                          } else {
                            relativeLabel = `${absDays} day${absDays > 1 ? "s" : ""} ago`;
                          }
                        }
                      } catch (e) {
                        // ignore
                      }
                    }

                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredEvent(idx)}
                        onMouseLeave={() => setHoveredEvent(null)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          padding: "10px 0",
                          position: "relative",
                          zIndex: 1,
                          cursor: "pointer",
                        }}
                      >
                        {/* Timeline Dot container */}
                        <div
                          style={{
                            width: 32,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              background: isInflow ? THEME.sage : THEME.rust,
                              border: `2.5px solid var(--surface-0)`,
                              boxShadow: `0 0 0 4px color-mix(in srgb, ${isInflow ? THEME.sage : THEME.rust} 20%, transparent)`,
                              zIndex: 3,
                              transform: isHovered ? "scale(1.25)" : "none",
                              transition: "all 0.2s var(--ease-premium)",
                            }}
                          />
                        </div>

                        {/* Content block */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            flex: 1,
                            transform: isHovered ? "translateX(6px)" : "none",
                            transition: "all 0.2s var(--ease-premium)",
                          }}
                        >
                          {/* Date & Countdown */}
                          <div style={{ minWidth: 110, display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                              {fmtDate(event.date)}
                            </span>
                            {relativeLabel && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: relativeLabel === "Today" || relativeLabel === "Tomorrow" 
                                    ? (isInflow ? THEME.sage : THEME.rust) 
                                    : THEME.muted,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                {relativeLabel}
                              </span>
                            )}
                          </div>

                          {/* Name & Badge */}
                          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                              {event.name}
                            </span>
                            <Badge variant={isInflow ? "sage" : "rust"} style={{ fontSize: "10px", padding: "2px 6px" }}>
                              {event.category}
                            </Badge>
                          </div>

                          {/* Amount */}
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color: isInflow ? THEME.sage : THEME.rust,
                              minWidth: 110,
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            <Prv>
                              {isInflow ? "+" : "-"}
                              {fmtINRExact(event.amount)}
                            </Prv>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
