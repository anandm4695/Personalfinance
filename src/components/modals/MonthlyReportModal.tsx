// @ts-nocheck
import React, { useState, useRef } from "react";
import {
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Mail,
  CheckCircle2,
  AlertCircle,
  Bell,
  BarChart2,
} from "lucide-react";
import { THEME, PIE_COLORS } from "../../utils/constants";
import { fmtINRFull, fmtINRExact, getCCDueDate } from "../../utils/finance";
import { computeNetWorthAsOf, getEarliestNetWorthMonth } from "../../utils/netWorthAsOf";
import { Prv } from "../../context/PrivacyContext";
import { Modal } from "../ui/Modal";
import { supabase } from "../../supabaseClient";

const btnGhost = {
  background: "transparent",
  border: `1.5px solid ${THEME.line}`,
  color: THEME.ink,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 10,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const btnSolid = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 16px",
  background: THEME.accent,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

// Safe local-date ym string — avoids UTC timezone shift for IST (UTC+5:30)
function toYM(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function DeltaBadge({
  current,
  prev,
  higherIsBetter = true,
}: {
  current: number;
  prev: number;
  higherIsBetter?: boolean;
}) {
  if (prev === 0 && current === 0) return null;
  if (prev === 0) {
    // Previous month was exactly zero — a percentage change is undefined (division
    // by zero), but that's not the same as "no change": show a "new" badge instead
    // of silently hiding a real swing from nothing to something.
    const increased = current > 0;
    const good = higherIsBetter ? increased : !increased;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
          fontSize: 10,
          fontWeight: 700,
          color: good ? THEME.sage : THEME.rust,
        }}
      >
        {increased ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
        new vs prev
      </span>
    );
  }
  // Use abs(prev) as the base so a swing across zero (e.g. overspend narrowing
  // from -1000 to -500) reads as the real-world improvement it is, instead of
  // flipping sign the way (current-prev)/prev would when prev is negative.
  const diff = current - prev;
  const pct = Math.round((diff / Math.abs(prev)) * 100);
  if (pct === 0)
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
          fontSize: 10,
          fontWeight: 700,
          color: THEME.muted,
        }}
      >
        <Minus size={9} /> same
      </span>
    );
  const increased = pct > 0;
  const good = higherIsBetter ? increased : !increased;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        fontSize: 10,
        fontWeight: 700,
        color: good ? THEME.sage : THEME.rust,
      }}
    >
      {increased ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
      {increased ? "+" : ""}
      {pct}% vs prev
    </span>
  );
}

// Determine if a subscription renewed in the given YYYY-MM
function subRenewedInMonth(sub: any, ym: string): boolean {
  if (sub.paused) return false;
  const [y, m] = ym.split("-").map(Number);
  // Never count a renewal before the subscription existed
  const createdAt = sub.createdAt || sub.created_at;
  if (createdAt) {
    const created = new Date(createdAt);
    const createdYm = created.getFullYear() * 12 + created.getMonth();
    const targetYm = y * 12 + (m - 1);
    if (targetYm < createdYm) return false;
  }
  if (sub.cycle === "monthly") return true;
  if (!sub.renewalDate) return false;
  const rd = new Date(sub.renewalDate);
  if (sub.cycle === "quarterly") {
    const monthsDiff = (y - rd.getFullYear()) * 12 + (m - (rd.getMonth() + 1));
    return monthsDiff % 3 === 0;
  }
  if (sub.cycle === "yearly") {
    return rd.getMonth() + 1 === m;
  }
  return false;
}

export function MonthlyReportModal({
  metrics,
  state,
  marketData,
  selectedDate,
  onClose,
  activeProfile = "all",
}: any) {
  const [reportDate, setReportDate] = useState(() => selectedDate || new Date());
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"" | "ok" | "err" | "no-email">("");
  const reportRef = useRef<HTMLDivElement>(null);
  // Net Worth Snapshot is a fixed dark "hero" card by design (white text) in both themes —
  // var(--surface-2) resolves to a light color in light mode, so it can't be used directly here.
  const isDark = state.settings?.darkMode ?? false;

  const monthLabel = reportDate.toLocaleString("en-IN", { month: "long", year: "numeric" });
  const ym = toYM(reportDate);
  const prevDate = new Date(reportDate.getFullYear(), reportDate.getMonth() - 1, 1);
  const ymPrev = toYM(prevDate);

  const now = new Date();
  const currentYm = toYM(now);
  const isCurrentMonth = ym === currentYm;
  const isPastMonth = ym < currentYm;

  // Current month transactions
  // Same exclusion rules as useMetrics.ts / api/send-summary.js so this report's
  // Income/Expense/Saved figures match the Dashboard, Analytics and emailed report
  // for the same month, instead of diverging by counting internal transfers as
  // income/expense and missing rent paid outside the transactions ledger.
  const isTransferCat = (cat: string) =>
    ["Transfer", "Self Transfer", "Self-Transfer"].includes(cat || "");

  // Rent received via the Rental Properties ledger (landlord side, not logged as a
  // transaction) — same ledger-only gap as getRentInfo below has for rent PAID, just
  // never had the mirror-image fix on the income side. Without this, a manually-logged
  // receipt (no linked bank transaction) was invisible to this report's Income tile.
  const getRentReceivedInfo = (targetYm: string, monthTxns: any[]) => {
    const rentReceivedThisMonth = (state.rentalProperties || []).reduce(
      (sum: number, p: any) => {
        const receiptsThisMonth = (p.receipts || [])
          .filter((r: any) => r.date && r.date.startsWith(targetYm))
          .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        return sum + receiptsThisMonth;
      },
      0
    );
    const hasRentReceivedTxn = monthTxns.some(
      (t: any) => t.type === "credit" && (t.category || "").toLowerCase() === "rent"
    );
    return { rentReceivedThisMonth, hasRentReceivedTxn };
  };

  const computeMonthIncome = (targetYm: string, monthTxns: any[]) => {
    const explicitIncomeMonth = (state.income || [])
      .filter((i: any) => i.date && i.date.startsWith(targetYm))
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    const txnIncomeMonth = monthTxns
      .filter((t: any) => t.type === "credit" && !isTransferCat(t.category))
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const { rentReceivedThisMonth, hasRentReceivedTxn } = getRentReceivedInfo(
      targetYm,
      monthTxns
    );
    const rentTopUp = rentReceivedThisMonth > 0 && !hasRentReceivedTxn ? rentReceivedThisMonth : 0;
    return (explicitIncomeMonth > 0 ? explicitIncomeMonth : txnIncomeMonth) + rentTopUp;
  };

  // Rent paid via the Rented Properties ledger (not logged as a transaction) — shared by
  // computeMonthExpense (total) and catMap below (per-category), so both agree on whether
  // ledger-only rent counts for a given month instead of the total silently including it
  // while the category breakdown / Budget vs Actual keeps showing ₹0 for Rent.
  const getRentInfo = (targetYm: string, monthTxns: any[]) => {
    const rentPaidThisMonth = (state.rentedProperties || []).reduce((sum: number, p: any) => {
      const paymentsThisMonth = (p.payments || [])
        .filter((pay: any) => pay.date && pay.date.startsWith(targetYm))
        .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
      return sum + paymentsThisMonth;
    }, 0);
    const hasRentTxn = monthTxns.some(
      (t: any) => t.type === "debit" && (t.category || "").toLowerCase() === "rent"
    );
    return { rentPaidThisMonth, hasRentTxn };
  };

  const computeMonthExpense = (targetYm: string, monthTxns: any[]) => {
    const { rentPaidThisMonth, hasRentTxn } = getRentInfo(targetYm, monthTxns);
    const txnDebitTotal = monthTxns
      .filter(
        (t: any) => t.type === "debit" && !isTransferCat(t.category) && t.category !== "Investment"
      )
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    return txnDebitTotal + (rentPaidThisMonth > 0 && !hasRentTxn ? rentPaidThisMonth : 0);
  };

  const txns = (state.transactions || []).filter((t: any) => t.date?.startsWith(ym));
  const income = computeMonthIncome(ym, txns);
  const expense = computeMonthExpense(ym, txns);
  const saving = income - expense;
  const savingRate = income > 0 ? ((saving / income) * 100).toFixed(1) : "0";

  // Previous month transactions for MoM comparison
  const txnsPrev = (state.transactions || []).filter((t: any) => t.date?.startsWith(ymPrev));
  const incomePrev = computeMonthIncome(ymPrev, txnsPrev);
  const expensePrev = computeMonthExpense(ymPrev, txnsPrev);
  const savingPrev = incomePrev - expensePrev;

  // Income breakdown by source. Must follow the same explicit-ledger-vs-transactions
  // preference as computeMonthIncome above — otherwise, for a user who logs income via
  // the state.income ledger, the "Income" tile would show the ledger total while this
  // breakdown (built only from credit transactions) shows a smaller, unrelated number,
  // so the per-source rows never add up to the tile above them. Same pattern already
  // used by AnnualReportTab's income summary.
  const incomeLedgerMonth = (state.income || []).filter(
    (i: any) => i.date && i.date.startsWith(ym)
  );
  const explicitIncomeMonth = incomeLedgerMonth.reduce(
    (s: number, i: any) => s + Number(i.amount || 0),
    0
  );
  const incomeSourceEntries =
    explicitIncomeMonth > 0
      ? incomeLedgerMonth
      : txns.filter((t: any) => t.type === "credit" && !isTransferCat(t.category));
  const incomeCatMap: Record<string, number> = {};
  const { rentReceivedThisMonth, hasRentReceivedTxn } = getRentReceivedInfo(ym, txns);
  if (rentReceivedThisMonth > 0 && !hasRentReceivedTxn) {
    incomeCatMap["Rent"] = (incomeCatMap["Rent"] || 0) + rentReceivedThisMonth;
  }
  incomeSourceEntries.forEach((e: any) => {
    const c = e.source || e.category || "Other Income";
    incomeCatMap[c] = (incomeCatMap[c] || 0) + Number(e.amount || 0);
  });
  const incomeBySource = Object.entries(incomeCatMap).sort(([, a], [, b]) => b - a);

  // Top expense categories (excluding internal transfers and investment moves)
  const catMap: Record<string, number> = {};
  txns
    .filter(
      (t: any) => t.type === "debit" && !isTransferCat(t.category) && t.category !== "Investment"
    )
    .forEach((t: any) => {
      const c = t.category || "Other";
      catMap[c] = (catMap[c] || 0) + Number(t.amount || 0);
    });
  const { rentPaidThisMonth, hasRentTxn } = getRentInfo(ym, txns);
  if (rentPaidThisMonth > 0 && !hasRentTxn) {
    catMap["Rent"] = (catMap["Rent"] || 0) + rentPaidThisMonth;
  }
  const topCats = Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  // Investment activity: debit transactions categorised as Investment/SIP/Mutual Fund/Stocks
  const investCats = new Set(["Investment", "SIP", "Mutual Fund", "Stocks"]);
  const investTxns = txns.filter(
    (t: any) => t.type === "debit" && investCats.has(t.category || "")
  );
  const totalInvested = investTxns.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

  // Budget vs Actual "spent" must mirror BudgetTab.tsx's own monthSpending exactly — that's
  // the only place budgets are created/edited, and its category picker isn't limited to
  // "expense" categories: Investment and Transfer are both valid budget categories there
  // (e.g. tracking an "Investment: ₹20,000/mo" SIP target). catMap above deliberately
  // excludes Transfer/Investment debits so they don't double-count as spend in the Expense
  // tile and Top Expenses breakdown — reusing it here meant any budget set on those two
  // categories always showed ₹0 spent no matter how much was actually spent, contradicting
  // what Budget Tab shows for that same category/month. Same "Uncategorized" fallback label
  // as BudgetTab.tsx too, so a budget literally named "Uncategorized" matches correctly.
  const budgetSpendMap: Record<string, number> = {};
  txns
    .filter((t: any) => t.type === "debit")
    .forEach((t: any) => {
      const c = t.category || "Uncategorized";
      budgetSpendMap[c] = (budgetSpendMap[c] || 0) + Number(t.amount || 0);
    });
  if (rentPaidThisMonth > 0 && !budgetSpendMap["Rent"]) {
    budgetSpendMap["Rent"] = rentPaidThisMonth;
  }

  // Budget vs Actual — match the budget set for this specific month first, falling back
  // to the baseline (no budgetMonth) budget, then the closest prior month's budget. This
  // mirrors api/send-summary.js so a past month's report shows the budget that was actually
  // in force that month rather than whatever budget happens to be active today.
  const budgetsByCategory: Record<string, any[]> = {};
  (state.budgets || []).forEach((b: any) => {
    if (!(b.monthly > 0)) return;
    (budgetsByCategory[b.category] = budgetsByCategory[b.category] || []).push(b);
  });
  const budgets = Object.keys(budgetsByCategory)
    .map((cat) => {
      const list = budgetsByCategory[cat];
      const specific = list.find((b: any) => b.budgetMonth === ym);
      if (specific) return specific;
      const baseline = list.find((b: any) => !b.budgetMonth);
      if (baseline) return baseline;
      const prior = list
        .filter((b: any) => b.budgetMonth && b.budgetMonth < ym)
        .sort((a: any, b: any) => (b.budgetMonth || "").localeCompare(a.budgetMonth || ""));
      return prior[0] || list[0];
    })
    .filter(Boolean);
  const budgetRows = budgets
    .map((b: any) => {
      const spent = budgetSpendMap[b.category] || 0;
      const over = spent > b.monthly;
      return { category: b.category, budget: Number(b.monthly), spent, over };
    })
    .sort((a, b) => b.spent - a.spent);

  // Goal progress
  const goalRows = (state.goals || [])
    .filter((g: any) => Number(g.targetAmount || 0) > 0)
    .map((g: any) => {
      const target = Number(g.targetAmount || 0);
      const current = Number(g.currentAmount || 0);
      const pct = Math.min(100, target > 0 ? Math.round((current / target) * 100) : 0);
      const done = current >= target;
      return { name: g.name || "Goal", target, current, pct, done };
    })
    .sort((a, b) => b.pct - a.pct);

  // Subscriptions that renewed this month
  const subsThisMonth = (state.subscriptions || [])
    .filter((s: any) => subRenewedInMonth(s, ym))
    .map((s: any) => ({
      name: s.name || s.serviceName || "Subscription",
      amount:
        s.cycle === "yearly"
          ? Number(s.amount || 0)
          : s.cycle === "quarterly"
            ? Number(s.amount || 0)
            : Number(s.amount || 0),
      cycle: s.cycle || "monthly",
    }))
    .sort((a, b) => b.amount - a.amount);
  const totalSubsThisMonth = subsThisMonth.reduce((s, sub) => s + sub.amount, 0);

  // Upcoming / scheduled dues — only for current or future months
  const showDues = !isPastMonth;
  const upcoming: { label: string; amount: number; date: string }[] = [];
  if (showDues) {
    (state.creditCards || [])
      .filter(
        (c: any) => (c.status || "").toLowerCase() !== "closed" && Number(c.outstanding || 0) > 0
      )
      .forEach((c: any) => {
        // Always compute against the real "now", not reportDate — reportDate's day gets
        // reset to 1 by the Prev/Next navigation buttons above, so after navigating away
        // and back to the current month (without using Reset), a due date that already
        // passed today could be computed as still upcoming (e.g. dueDay 15 vs real today
        // the 29th: reportDate day=1 would put "day 1 <= day 15" and miss the rollover
        // to next month that comparing against today's actual day would catch).
        const due = getCCDueDate(c, now);
        if (due)
          upcoming.push({ label: `${c.issuer} CC`, amount: Number(c.outstanding || 0), date: due });
      });
    (state.loansTaken || []).forEach((l: any) => {
      upcoming.push({
        label: `${l.lender} ${l.type} Loan`,
        amount: Number(l.emi || 0),
        date: "Monthly EMI",
      });
    });
  }

  // Net worth: for the current month always use live metrics to avoid stale snapshots;
  // for past months reconstruct from each asset's own dated records via computeNetWorthAsOf —
  // same approach AnalyticsTab's Trends chart and NetWorthTimelineTab already use. This report
  // used to read the frozen state.netWorthHistory snapshot for the month, but snapshots are
  // only written for whatever month the app happened to be opened in, AND a one-time cleanup
  // migration (masterData._nwCleanV1) permanently deleted any past-month snapshot under 10% of
  // current net worth — so that lookup can no longer be trusted to reflect real history and was
  // showing "no data" for months that are in fact reconstructable. getEarliestNetWorthMonth
  // still bounds how far back reconstruction is meaningful, so genuinely pre-history months
  // (before any dated record exists) correctly fall back to "no data" instead of showing
  // today's account balances as if they applied a decade ago.
  const earliestNWMonth = getEarliestNetWorthMonth(state);
  const hasNWData = isCurrentMonth || ym >= earliestNWMonth;
  const pastNW =
    !isCurrentMonth && hasNWData ? computeNetWorthAsOf(state, ym, marketData, activeProfile) : null;
  const displayNetWorth = isCurrentMonth ? metrics.netWorth : pastNW ? pastNW.netWorth : null;
  const displayAssets = isCurrentMonth ? metrics.totalAssets : pastNW ? pastNW.totalAssets : null;
  const displayLiabilities = isCurrentMonth
    ? metrics.totalLiabilities
    : pastNW
      ? pastNW.totalLiabilities
      : null;

  // Net worth change vs previous month (use null to distinguish "no prior data" from zero/negative NW)
  const prevNW =
    ymPrev >= earliestNWMonth
      ? computeNetWorthAsOf(state, ymPrev, marketData, activeProfile).netWorth
      : null;
  const nwDelta = hasNWData && prevNW !== null ? displayNetWorth - prevNW : 0;

  // Email report handler
  async function handleEmailReport() {
    const emailTo = state.settings?.emailAddress || "";
    if (!emailTo) {
      setEmailStatus("no-email");
      setTimeout(() => setEmailStatus(""), 6000);
      return;
    }
    setEmailSending(true);
    setEmailStatus("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/send-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          emailTo,
          frequency: "monthly",
          recipientName: state.profile?.name || "there",
          fromEmail: state.settings?.fromEmail || undefined,
        }),
      });
      const json = await res.json();
      setEmailStatus(res.ok && json.sent ? "ok" : "err");
    } catch {
      setEmailStatus("err");
    } finally {
      setEmailSending(false);
      setTimeout(() => setEmailStatus(""), 8000);
    }
  }

  // Download PDF handler — adds print class to modal root, triggers browser print dialog
  function handleDownloadPDF() {
    // Walk up from our ref to find the portal's modal-backdrop root
    const el = reportRef.current;
    if (!el) {
      window.print();
      return;
    }
    const modalRoot = el.closest(".modal-backdrop") || el.parentElement;
    if (modalRoot) {
      modalRoot.classList.add("monthly-report-print-root");
    }
    // Small delay to let DOM update before triggering print
    requestAnimationFrame(() => {
      window.print();
      // Clean up the class after print dialog closes
      if (modalRoot) {
        modalRoot.classList.remove("monthly-report-print-root");
      }
    });
  }

  const SectionLabel = ({ children }: any) => (
    <div
      style={{
        fontSize: 10,
        color: THEME.muted,
        textTransform: "uppercase" as const,
        letterSpacing: "0.15em",
        marginBottom: 8,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );

  return (
    <Modal title={`Monthly Report — ${monthLabel}`} onClose={onClose} maxWidth={760}>
      <div ref={reportRef}>
        <style>{`
        @media print {
          /* Hide everything on the page except our report */
          body > *:not(.monthly-report-print-root) { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          /* The modal overlay / backdrop */
          .monthly-report-print-root { position: fixed !important; inset: 0 !important; z-index: 99999 !important; background: white !important; overflow: visible !important; padding: 0 !important; }
          .monthly-report-print-root * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          /* Hide interactive elements */
          .no-print { display: none !important; }
          /* Remove scroll constraints */
          .print-scroll { max-height: none !important; overflow: visible !important; padding: 20px 24px !important; }
          /* Show the print-only header */
          .print-header { display: block !important; }
          /* Page breaks between major sections */
          .print-page-break { page-break-before: always; }
          /* Clean table formatting */
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; }
          /* Avoid orphan rows */
          tr { page-break-inside: avoid; }
          /* Page settings */
          @page { margin: 15mm 12mm; size: A4; }
        }
      `}</style>
        {/* Print-only header — hidden on screen, shown in print */}
        <div
          className="print-header"
          style={{
            display: "none",
            textAlign: "center",
            padding: "16px 24px 12px",
            borderBottom: "2px solid #1e293b",
            marginBottom: 16,
          }}
        >
          <div
            style={{ fontSize: 18, fontWeight: 900, color: "#1e293b", letterSpacing: "-0.02em" }}
          >
            Personal Finance by Anand Mohta
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: 600 }}>
            Monthly Report —{" "}
            {reportDate.toLocaleString("en-IN", { month: "long", year: "numeric" })}
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
            Generated on{" "}
            {new Date().toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>
        <div style={{ maxHeight: "72vh", overflowY: "auto" }} className="print-scroll">
          {/* Month Selector Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              background: "color-mix(in srgb, var(--t-muted) 6%, transparent)",
              borderRadius: 10,
              marginBottom: 16,
              border: `1px solid ${THEME.line}`,
            }}
            className="no-print"
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
              Select Report Month
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() =>
                  setReportDate(new Date(reportDate.getFullYear(), reportDate.getMonth() - 1, 1))
                }
                style={{
                  ...btnGhost,
                  padding: "5px 8px",
                  minWidth: 32,
                  minHeight: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Previous Month"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  minWidth: 100,
                  textAlign: "center",
                  color: THEME.accent,
                }}
              >
                {reportDate.toLocaleString("en-IN", { month: "short", year: "numeric" })}
              </span>
              <button
                onClick={() =>
                  setReportDate(new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 1))
                }
                disabled={isCurrentMonth}
                style={{
                  ...btnGhost,
                  padding: "5px 8px",
                  minWidth: 32,
                  minHeight: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isCurrentMonth ? 0.35 : 1,
                  cursor: isCurrentMonth ? "not-allowed" : "pointer",
                }}
                title={isCurrentMonth ? "Already viewing the current month" : "Next Month"}
                aria-label={isCurrentMonth ? "Already viewing the current month" : "Next month"}
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setReportDate(selectedDate || new Date())}
                style={{
                  ...btnGhost,
                  padding: "5px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.muted,
                  border: `1px solid ${THEME.line}`,
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Net Worth Snapshot */}
          <div
            style={{
              background: isDark ? "var(--surface-2)" : "#0f172a",
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.45)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Net Worth Snapshot
            </div>
            {hasNWData ? (
              <>
                <div
                  className="tabular-nums"
                  style={{ fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}
                >
                  {fmtINRFull(displayNetWorth)}
                </div>
                {nwDelta !== 0 && (
                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color:
                        nwDelta > 0
                          ? "color-mix(in srgb, var(--t-sage) 75%, white)"
                          : "color-mix(in srgb, var(--t-rust) 75%, white)",
                      marginTop: 4,
                    }}
                  >
                    {nwDelta > 0 ? "▲" : "▼"} {fmtINRFull(Math.abs(nwDelta))} vs{" "}
                    {prevDate.toLocaleString("en-IN", { month: "short" })}
                  </div>
                )}
                {displayAssets !== null && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                    Assets {fmtINRFull(displayAssets)} · Liabilities{" "}
                    {fmtINRFull(displayLiabilities)}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                No net worth snapshot recorded for {monthLabel}
              </div>
            )}
          </div>

          {/* Income / Expense / Saving tiles with MoM delta */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {[
              {
                label: "Income",
                value: income,
                prev: incomePrev,
                color: THEME.sage,
                higherIsBetter: true,
              },
              {
                label: "Expense",
                value: expense,
                prev: expensePrev,
                color: THEME.rust,
                higherIsBetter: false,
              },
              {
                label: `Saved (${savingRate}%)`,
                value: saving,
                prev: savingPrev,
                color: saving >= 0 ? THEME.sage : THEME.rust,
                higherIsBetter: true,
              },
            ].map(({ label, value, prev, color, higherIsBetter }) => (
              <div
                key={label}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "color-mix(in srgb, var(--t-muted) 6%, transparent)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>{label}</div>
                <div className="tabular-nums" style={{ fontSize: 16, fontWeight: 800, color }}>
                  {fmtINRFull(value)}
                </div>
                <div style={{ marginTop: 5 }}>
                  <DeltaBadge current={value} prev={prev} higherIsBetter={higherIsBetter} />
                </div>
              </div>
            ))}
          </div>

          {/* Income Breakdown by Source */}
          {incomeBySource.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              <SectionLabel>Income by Source</SectionLabel>
              {incomeBySource.map(([cat, amt], i) => (
                <div
                  key={cat}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 0",
                    borderBottom: `1px dashed ${THEME.line}`,
                    fontSize: 13,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: PIE_COLORS[(i + 4) % PIE_COLORS.length],
                        display: "inline-block",
                      }}
                    />
                    {cat}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="progress-track" style={{ width: 50, height: 4 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${income > 0 ? Math.min(100, (amt / income) * 100) : 0}%`,
                          background: PIE_COLORS[(i + 4) % PIE_COLORS.length],
                        }}
                      />
                    </div>
                    <span
                      className="tabular-nums"
                      style={{
                        fontWeight: 700,
                        minWidth: 80,
                        textAlign: "right",
                        color: THEME.sage,
                      }}
                    >
                      {fmtINRExact(amt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top Expenses */}
          {topCats.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SectionLabel>Top Expenses</SectionLabel>
              {topCats.map(([cat, amt], i) => (
                <div
                  key={cat}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 0",
                    borderBottom: `1px dashed ${THEME.line}`,
                    fontSize: 13,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: PIE_COLORS[i % PIE_COLORS.length],
                        display: "inline-block",
                      }}
                    />
                    {cat}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="progress-track" style={{ width: 50, height: 4 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${expense > 0 ? Math.min(100, (amt / expense) * 100) : 0}%`,
                          background: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                    </div>
                    <span
                      className="tabular-nums"
                      style={{ fontWeight: 700, minWidth: 80, textAlign: "right" }}
                    >
                      {fmtINRExact(amt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Budget vs Actual */}
          {budgetRows.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SectionLabel>Budget vs Actual</SectionLabel>
              {budgetRows.map((row) => {
                const pct = Math.min(100, row.budget > 0 ? (row.spent / row.budget) * 100 : 0);
                return (
                  <div key={row.category} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: THEME.ink }}>{row.category}</span>
                      <span style={{ fontWeight: 700, color: row.over ? THEME.rust : THEME.sage }}>
                        {fmtINRExact(row.spent)} / {fmtINRExact(row.budget)}
                      </span>
                    </div>
                    <div className="progress-track" style={{ height: 5 }}>
                      <div
                        className={`progress-fill ${row.over ? "progress-fill-rust" : "progress-fill-sage"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {row.over && (
                      <div
                        style={{ fontSize: 10, color: THEME.rust, marginTop: 2, fontWeight: 600 }}
                      >
                        Over by {fmtINRExact(row.spent - row.budget)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Investment Activity */}
          {investTxns.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SectionLabel>
                Investment Activity · {fmtINRFull(totalInvested)} invested
              </SectionLabel>
              {investTxns.slice(0, 6).map((t: any, i: number) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 0",
                    borderBottom: `1px dashed ${THEME.line}`,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: THEME.ink }}>{t.note || t.category}</span>
                  <span style={{ fontWeight: 700, color: THEME.accent }}>
                    {fmtINRFull(Number(t.amount || 0))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Goal Progress */}
          {goalRows.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SectionLabel>Goal Progress</SectionLabel>
              {goalRows.map((g) => (
                <div key={g.name} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: THEME.ink }}>{g.name}</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: g.done ? THEME.sage : g.pct >= 50 ? THEME.accent : THEME.muted,
                      }}
                    >
                      {g.done ? "✓ Complete" : `${g.pct}%`}
                    </span>
                  </div>
                  <div className="progress-track" style={{ height: 5 }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${g.pct}%`,
                        background: g.done ? THEME.sage : g.pct >= 50 ? THEME.accent : THEME.gold,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: THEME.muted, marginTop: 3 }}>
                    {fmtINRFull(g.current)} saved of {fmtINRFull(g.target)}
                    {!g.done && ` · ${fmtINRFull(g.target - g.current)} remaining`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Subscriptions this month */}
          {subsThisMonth.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SectionLabel>
                Subscriptions This Month · {fmtINRFull(totalSubsThisMonth)}
              </SectionLabel>
              {subsThisMonth.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 0",
                    borderBottom: `1px dashed ${THEME.line}`,
                    fontSize: 13,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: THEME.muted,
                        background: "color-mix(in srgb, var(--t-muted) 8%, transparent)",
                        padding: "1px 6px",
                        borderRadius: 4,
                      }}
                    >
                      {s.cycle === "monthly" ? "/mo" : s.cycle === "quarterly" ? "/qtr" : "/yr"}
                    </span>
                    {s.name}
                  </span>
                  <span style={{ fontWeight: 700, color: THEME.rust }}>{fmtINRFull(s.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Portfolio Snapshot */}
          <div style={{ marginBottom: 16 }}>
            <SectionLabel>
              Portfolio Snapshot{" "}
              <span
                style={{ fontWeight: 500, textTransform: "none", fontSize: 10, letterSpacing: 0 }}
              >
                {isCurrentMonth
                  ? "(current allocation)"
                  : `(current holdings as of today, not a ${monthLabel} snapshot)`}
              </span>
            </SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {(
                [
                  ["Bank Cash", metrics.cashInBanks],
                  ["Fixed Deposits", metrics.fdValue],
                  ["Mutual Funds", metrics.mfValue],
                  ["Stocks", metrics.stockValue],
                  ["PPF", metrics.ppfValue],
                  ["NPS", metrics.npsValue],
                ] as [string, number][]
              )
                .filter(([, v]) => v > 0)
                .map(([label, val]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      background: "color-mix(in srgb, var(--t-muted) 5%, transparent)",
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: THEME.muted }}>{label}</span>
                    <span style={{ fontWeight: 700 }}>{fmtINRFull(val)}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Top Movers — biggest stock/MF % gains & losses */}
          {(() => {
            const movers: { name: string; pct: number; type: string }[] = [];
            (state.stocks || []).forEach((s: any) => {
              const qty = Number(s.qty || 0);
              const avg = Number(s.avgPrice || 0);
              // Same live-price lookup as useMetrics.ts/AnalyticsTab — s.currentPrice is a
              // static field (set once at import time, equal to avgPrice), so without this
              // a stock's gain/loss here would silently show 0% forever regardless of its
              // real live price shown elsewhere in this same report.
              const yfSym = `${(s.symbol || "").replace(/\.(NS|BO)$/i, "")}.${(s.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
              const md = marketData?.[yfSym];
              const cmp = md?.price ?? Number(s.currentPrice || avg);
              if (qty > 0 && avg > 0) {
                const pct = ((cmp - avg) / avg) * 100;
                const base = (s.symbol || "").replace(/\.(NS|BO)$/i, "");
                movers.push({ name: base, pct, type: "Stock" });
              }
            });
            (state.mutualFunds || []).forEach((m: any) => {
              const units = Number(m.units || 0);
              const buyNav = Number(m.buyNav || 0);
              const curNav = Number(m.currentNav || buyNav);
              if (units > 0 && buyNav > 0) {
                const pct = ((curNav - buyNav) / buyNav) * 100;
                movers.push({ name: m.name || m.scheme || "MF", pct, type: "MF" });
              }
            });
            if (movers.length === 0) return null;
            // Rank by the % figure actually displayed below, not absolute rupee gain —
            // otherwise a large position with a small % move could bump a smaller
            // position with a much bigger % move out of the list.
            const topGainers = movers
              .filter((m) => m.pct > 0)
              .sort((a, b) => b.pct - a.pct)
              .slice(0, 3);
            const topLosers = movers
              .filter((m) => m.pct < 0)
              .sort((a, b) => a.pct - b.pct)
              .slice(0, 3);
            const display = [...topGainers, ...topLosers];
            if (display.length === 0) return null;
            return (
              <div style={{ marginBottom: 16 }}>
                <SectionLabel>
                  Top Movers{" "}
                  {!isCurrentMonth && (
                    <span
                      style={{
                        fontWeight: 500,
                        textTransform: "none",
                        fontSize: 10,
                        letterSpacing: 0,
                      }}
                    >
                      (current prices as of today, not a {monthLabel} snapshot)
                    </span>
                  )}
                </SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {topGainers.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          color: THEME.sage,
                          fontWeight: 700,
                          marginBottom: 6,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Gainers
                      </div>
                      {topGainers.map((m, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "6px 0",
                            borderBottom: `1px dashed ${THEME.line}`,
                            fontSize: 12,
                          }}
                        >
                          <span style={{ color: THEME.ink, fontWeight: 600 }}>
                            {m.name}
                            <span style={{ fontSize: 10, color: THEME.muted, marginLeft: 4 }}>
                              {m.type}
                            </span>
                          </span>
                          <span style={{ color: THEME.sage, fontWeight: 700 }}>
                            +{m.pct.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {topLosers.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          color: THEME.rust,
                          fontWeight: 700,
                          marginBottom: 6,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Losers
                      </div>
                      {topLosers.map((m, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "6px 0",
                            borderBottom: `1px dashed ${THEME.line}`,
                            fontSize: 12,
                          }}
                        >
                          <span style={{ color: THEME.ink, fontWeight: 600 }}>
                            {m.name}
                            <span style={{ fontSize: 10, color: THEME.muted, marginLeft: 4 }}>
                              {m.type}
                            </span>
                          </span>
                          <span style={{ color: THEME.rust, fontWeight: 700 }}>
                            {m.pct.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Upcoming Renewals — subscriptions & insurance premiums due in next 30 days.
              Only meaningful for the current month: "next 30 days from today" has no
              relationship to a past month's report, so it's gated by showDues same as
              Upcoming Dues below. */}
          {showDues &&
            (() => {
              const now = new Date();
              const in30 = new Date(now.getTime() + 30 * 86400000);
              const renewals: { name: string; amount: number; date: string; type: string }[] = [];

              // Subscriptions with upcoming renewals
              (state.subscriptions || []).forEach((s: any) => {
                if (s.paused) return;
                const rd = s.renewalDate ? new Date(s.renewalDate) : null;
                if (rd && rd >= now && rd <= in30) {
                  renewals.push({
                    name: s.name || s.serviceName || "Subscription",
                    amount: Number(s.amount || 0),
                    date: rd.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
                    type: "Subscription",
                  });
                }
              });

              // LIC/term plan premiums have no stored due-date field — they're annual,
              // due on the anniversary of the policy's commencement/start date. Same
              // anniversary-rollover logic as RemindersTab.tsx's LIC/Term Plan reminders.
              const nextAnniversary = (fromDate: string) => {
                const start = new Date(fromDate);
                if (isNaN(start.getTime())) return null;
                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);
                let anniversary = new Date(
                  todayDate.getFullYear(),
                  start.getMonth(),
                  start.getDate()
                );
                if (anniversary < todayDate) {
                  anniversary = new Date(todayDate.getFullYear() + 1, start.getMonth(), start.getDate());
                }
                return anniversary;
              };

              (state.lic || []).forEach((l: any) => {
                if (!l.commencementDate) return;
                const dd = nextAnniversary(l.commencementDate);
                if (dd && dd >= now && dd <= in30) {
                  renewals.push({
                    name: l.planName || "LIC Policy",
                    amount: Number(l.annualPremium || 0),
                    date: dd.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
                    type: "Insurance",
                  });
                }
              });
              (state.termPlans || []).forEach((t: any) => {
                if (!t.startDate) return;
                const dd = nextAnniversary(t.startDate);
                if (dd && dd >= now && dd <= in30) {
                  renewals.push({
                    name: t.planName || t.insurer || "Term Plan",
                    amount: Number(t.annualPremium || 0),
                    date: dd.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
                    type: "Insurance",
                  });
                }
              });

              if (renewals.length === 0) return null;
              renewals.sort((a, b) => a.amount - b.amount);
              const totalRenewals = renewals.reduce((s, r) => s + r.amount, 0);

              return (
                <div style={{ marginBottom: 16 }}>
                  <SectionLabel>
                    Upcoming Renewals (30 days) · {fmtINRFull(totalRenewals)}
                  </SectionLabel>
                  {renewals.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "7px 0",
                        borderBottom: `1px dashed ${THEME.line}`,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Bell size={12} color={THEME.gold} />
                        <span>
                          {r.name}
                          <span style={{ fontSize: 10, color: THEME.muted, marginLeft: 6 }}>
                            {r.type}
                          </span>
                        </span>
                      </span>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: THEME.gold }}>
                          {fmtINRFull(r.amount)}
                        </div>
                        <div style={{ fontSize: 11, color: THEME.muted }}>Due {r.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

          {/* Upcoming Dues — only for current/future months */}
          {showDues && upcoming.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionLabel>Upcoming Dues</SectionLabel>
              {upcoming.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "7px 0",
                    borderBottom: `1px dashed ${THEME.line}`,
                    fontSize: 13,
                  }}
                >
                  <span>{d.label}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: THEME.rust }}>{fmtINRFull(d.amount)}</div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>{d.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}
          className="no-print"
        >
          {/* Email status messages */}
          {emailStatus === "ok" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                border: `1px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
                borderRadius: 8,
                fontSize: 12,
                color: THEME.sage,
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={14} /> Report emailed to {state.settings?.emailAddress}
            </div>
          )}
          {emailStatus === "err" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: `color-mix(in srgb, ${THEME.rust} 7%, transparent)`,
                border: `1px solid color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
                borderRadius: 8,
                fontSize: 12,
                color: THEME.rust,
                fontWeight: 600,
              }}
            >
              <AlertCircle size={14} /> Failed to send — check email config in Settings
            </div>
          )}
          {emailStatus === "no-email" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: `color-mix(in srgb, ${THEME.gold} 7%, transparent)`,
                border: `1px solid color-mix(in srgb, ${THEME.gold} 25%, transparent)`,
                borderRadius: 8,
                fontSize: 12,
                color: THEME.gold,
                fontWeight: 600,
              }}
            >
              <AlertCircle size={14} /> No email address configured — go to Settings → Email Reports
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={btnGhost} onClick={onClose}>
              Close
            </button>
            <button
              style={{
                ...btnGhost,
                color: emailSending ? THEME.muted : THEME.accent,
                borderColor: `color-mix(in srgb, ${THEME.accent} 33%, transparent)`,
                opacity: emailSending ? 0.7 : 1,
              }}
              onClick={handleEmailReport}
              disabled={emailSending}
            >
              <Mail size={13} />
              {emailSending ? "Sending…" : "Email to me"}
            </button>
            <button
              style={{
                ...btnGhost,
                color: THEME.accent,
                borderColor: `color-mix(in srgb, ${THEME.accent} 33%, transparent)`,
              }}
              onClick={handleDownloadPDF}
              title="Download as PDF via browser print dialog"
            >
              <Download size={13} /> Download PDF
            </button>
            <button style={btnSolid} onClick={() => window.print()}>
              <Printer size={14} /> Print
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
