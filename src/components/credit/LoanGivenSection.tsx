/* eslint-disable */
import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  IndianRupee,
  Calendar,
  AlertCircle,
  Clock,
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Share2,
  MessageSquare,
  Sparkles,
  LayoutGrid,
  List,
  AlertTriangle,
  User,
  Shield,
  RotateCcw,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, fmtINRExact, loanGivenOutstanding, today } from "../../utils/finance";
import { useMasterData } from "../../utils/masterData";
import { StatCard } from "../ui/StatCard";
import { Card } from "../ui/Card";
import { Money } from "../ui/Money";
import { ConfirmDialog } from "../ui/Feedback";
import { LoanPaymentModal } from "./LoanPaymentModal";
import { LoanReminderModal } from "./LoanReminderModal";
import { LoanGivenModal } from "./LoanGivenModal";

const getAvatarGradient = (name: string) => {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    ["#3b82f6", "#60a5fa"], // Blue
    ["#7c3aed", "#a78bfa"], // Violet
    ["#059669", "#34d399"], // Emerald
    ["#d97706", "#fbbf24"], // Amber
    ["#2563eb", "#60a5fa"], // Indigo
    ["#0d9488", "#5eead4"], // Teal
    ["#dc2626", "#f87171"], // Red
  ];
  const idx = Math.abs(hash) % colors.length;
  return `linear-gradient(135deg, ${colors[idx][0]} 0%, ${colors[idx][1]} 100%)`;
};

interface LoanGivenSectionProps {
  items: any[];
  bankAccounts?: any[];
  onRemove: (id: string) => Promise<void> | void;
  onEdit: (id: string) => void;
  onAdd: () => void;
  onUpdate: (id: string, patch: any) => Promise<void> | void;
  onAddTransaction?: (txn: any) => Promise<void> | void;
}

export function LoanGivenSection({
  items = [],
  bankAccounts = [],
  onRemove,
  onEdit,
  onAdd,
  onUpdate,
  onAddTransaction,
}: LoanGivenSectionProps) {
  const { familyProfiles } = useMasterData();
  const now = new Date();

  // Search, filter, view mode
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "overdue" | "settled">("active");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "overdue_first" | "due_soon" | "outstanding_desc" | "rate_desc" | "name_asc"
  >("overdue_first");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [paymentLoan, setPaymentLoan] = useState<any | null>(null);
  const [reminderLoan, setReminderLoan] = useState<any | null>(null);
  const [historyLoan, setHistoryLoan] = useState<any | null>(null);
  const [confirmDeleteLoan, setConfirmDeleteLoan] = useState<any | null>(null);
  const [confirmUndoPayment, setConfirmUndoPayment] = useState<any | null>(null);
  const [confirmForgiveLoan, setConfirmForgiveLoan] = useState<any | null>(null);

  // Aggregates & Analytics
  const totalLent = useMemo(
    () => items.reduce((s: number, l: any) => s + (Number(l.principal) || 0), 0),
    [items]
  );
  const totalOutstanding = useMemo(
    () => items.reduce((s: number, l: any) => s + loanGivenOutstanding(l), 0),
    [items]
  );
  const totalRecovered = Math.max(0, totalLent - totalOutstanding);
  const recoveryRate = totalLent > 0 ? (totalRecovered / totalLent) * 100 : 0;

  // Overdue analysis
  const overdueItems = useMemo(() => {
    return items.filter((l: any) => {
      const out = loanGivenOutstanding(l);
      if (out <= 0) return false;
      if (!l.dueDate) return false;
      return new Date(l.dueDate + "T00:00:00") < now;
    });
  }, [items]);

  const overdueCapital = useMemo(() => {
    return overdueItems.reduce((s: number, l: any) => s + loanGivenOutstanding(l), 0);
  }, [overdueItems]);

  // Accrued interest to date across all loans given
  const totalAccruedInterest = useMemo(() => {
    return items.reduce((acc: number, l: any) => {
      const principal = Number(l.principal) || 0;
      const rate = Number(l.rate) || 0;
      if (principal <= 0 || rate <= 0 || !l.date) return acc;
      const startDate = new Date(l.date + "T00:00:00");
      const daysElapsed = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      return acc + (principal * (rate / 100) * daysElapsed) / 365.25;
    }, 0);
  }, [items]);

  const activeCount = items.filter((l: any) => loanGivenOutstanding(l) > 0).length;
  const settledCount = items.length - activeCount;

  // Filtered & Sorted items
  const displayItems = useMemo(() => {
    let list = items;

    // Status filter
    if (statusFilter === "active") {
      list = list.filter((l: any) => loanGivenOutstanding(l) > 0);
    } else if (statusFilter === "overdue") {
      list = list.filter((l: any) => {
        const out = loanGivenOutstanding(l);
        return out > 0 && l.dueDate && new Date(l.dueDate + "T00:00:00") < now;
      });
    } else if (statusFilter === "settled") {
      list = list.filter((l: any) => loanGivenOutstanding(l) <= 0);
    }

    // Owner filter
    if (ownerFilter !== "all") {
      list = list.filter((l: any) => (l.owner || "self") === ownerFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (l: any) =>
          (l.borrower || "").toLowerCase().includes(q) ||
          (l.phone || "").toLowerCase().includes(q) ||
          (l.note || "").toLowerCase().includes(q) ||
          (l.security || "").toLowerCase().includes(q)
      );
    }

    // Sorting
    return [...list].sort((a: any, b: any) => {
      const outA = loanGivenOutstanding(a);
      const outB = loanGivenOutstanding(b);
      const isOverdueA = outA > 0 && a.dueDate && new Date(a.dueDate + "T00:00:00") < now;
      const isOverdueB = outB > 0 && b.dueDate && new Date(b.dueDate + "T00:00:00") < now;

      if (sortBy === "overdue_first") {
        if (isOverdueA && !isOverdueB) return -1;
        if (!isOverdueA && isOverdueB) return 1;
        return outB - outA;
      }
      if (sortBy === "due_soon") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortBy === "outstanding_desc") return outB - outA;
      if (sortBy === "rate_desc") return (Number(b.rate) || 0) - (Number(a.rate) || 0);
      if (sortBy === "name_asc") return (a.borrower || "").localeCompare(b.borrower || "");
      return 0;
    });
  }, [items, statusFilter, ownerFilter, searchQuery, sortBy]);

  const fmtLoanDate = (d: string) =>
    d
      ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Total Capital Lent"
          value={fmtINRFull(totalLent)}
          numericValue={totalLent}
          formatValue={fmtINRFull}
          sub={`${activeCount} active · ${settledCount} settled`}
          color={THEME.accent}
          icon={<TrendingUp />}
        />
        <StatCard
          label="Pending Recovery"
          value={fmtINRFull(totalOutstanding)}
          numericValue={totalOutstanding}
          formatValue={fmtINRFull}
          sub={totalOutstanding > 0 ? `${recoveryRate.toFixed(1)}% capital recovered` : "100% recovered"}
          color={totalOutstanding > 0 ? THEME.gold : THEME.sage}
          icon={<IndianRupee />}
        />
        <StatCard
          label="Overdue Capital"
          value={fmtINRFull(overdueCapital)}
          numericValue={overdueCapital}
          formatValue={fmtINRFull}
          sub={
            overdueItems.length > 0
              ? `${overdueItems.length} borrower${overdueItems.length !== 1 ? "s" : ""} require follow-up`
              : "All repayments on schedule"
          }
          color={overdueItems.length > 0 ? THEME.rust : THEME.sage}
          icon={<AlertCircle />}
        />
        <StatCard
          label="Total Accrued Interest"
          value={fmtINRFull(totalAccruedInterest)}
          numericValue={totalAccruedInterest}
          formatValue={fmtINRFull}
          sub="Interest earned across active loans"
          color={THEME.sage}
          icon={<Sparkles />}
        />
      </div>

      {/* Delinquency Alert Banner if Overdue loans exist */}
      {overdueItems.length > 0 && statusFilter !== "overdue" && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            background: "color-mix(in srgb, var(--t-rust) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--t-rust) 25%, transparent)",
            borderLeft: "4px solid var(--t-rust)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={18} color="var(--t-rust)" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: "var(--t-rust)", fontSize: 13 }}>
                {overdueItems.length} Overdue Loan{overdueItems.length !== 1 ? "s" : ""} ({fmtINR(overdueCapital)} pending recovery)
              </strong>
              <div style={{ fontSize: 12, color: "var(--t-muted)", marginTop: 2 }}>
                These repayments have passed their agreed due dates. Use the WhatsApp reminder tool to follow up.
              </div>
            </div>
          </div>

          <button
            onClick={() => setStatusFilter("overdue")}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              background: "var(--t-rust)",
              color: "#FFFFFF",
              fontSize: 11,
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
            }}
          >
            Filter Overdue Loans →
          </button>
        </div>
      )}

      {/* Control Bar */}
      <Card
        style={{
          padding: "14px 18px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* Left: Search & Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: "1 1 500px" }}>
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: 200, flex: "1 1 200px" }}>
            <Search
              size={14}
              color="var(--t-muted)"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Search borrower, phone, note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px 7px 30px",
                borderRadius: 8,
                border: "1px solid var(--t-line)",
                background: "var(--surface-0)",
                color: "var(--t-ink)",
                fontSize: 12,
                outline: "none",
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: "flex", background: "var(--surface-1)", padding: 2, borderRadius: 8 }}>
            {[
              { key: "active", label: `Active (${activeCount})` },
              { key: "overdue", label: `Overdue (${overdueItems.length})` },
              { key: "settled", label: `Settled (${settledCount})` },
              { key: "all", label: `All (${items.length})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key as any)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  background: statusFilter === key ? "var(--surface-0)" : "transparent",
                  color:
                    statusFilter === key
                      ? key === "overdue" && overdueItems.length > 0
                        ? "var(--t-rust)"
                        : "var(--t-ink)"
                      : "var(--t-muted)",
                  boxShadow: statusFilter === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Owner Filter */}
          {familyProfiles.length > 1 && (
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid var(--t-line)",
                background: "var(--surface-0)",
                color: "var(--t-ink)",
                fontSize: 11,
                fontWeight: 700,
                outline: "none",
              }}
            >
              <option value="all">All Profiles</option>
              {familyProfiles.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--t-line)",
              background: "var(--surface-0)",
              color: "var(--t-ink)",
              fontSize: 11,
              fontWeight: 700,
              outline: "none",
            }}
          >
            <option value="overdue_first">Overdue First</option>
            <option value="due_soon">Due Date Soonest</option>
            <option value="outstanding_desc">Highest Outstanding</option>
            <option value="rate_desc">Highest Interest Rate</option>
            <option value="name_asc">Borrower Name (A-Z)</option>
          </select>
        </div>

        {/* Right: View switcher & Add button */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", background: "var(--surface-1)", padding: 2, borderRadius: 8 }}>
            <button
              onClick={() => setViewMode("grid")}
              title="Card View"
              style={{
                padding: "5px 8px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: viewMode === "grid" ? "var(--surface-0)" : "transparent",
                color: viewMode === "grid" ? "var(--t-accent)" : "var(--t-muted)",
              }}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              title="Table View"
              style={{
                padding: "5px 8px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: viewMode === "table" ? "var(--surface-0)" : "transparent",
                color: viewMode === "table" ? "var(--t-accent)" : "var(--t-muted)",
              }}
            >
              <List size={15} />
            </button>
          </div>

          <button
            onClick={onAdd}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              background: "var(--t-accent)",
              color: "#FFFFFF",
              fontWeight: 800,
              fontSize: 12,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 8px color-mix(in srgb, var(--t-accent) 25%, transparent)",
            }}
          >
            <Plus size={14} /> Record Loan Given
          </button>
        </div>
      </Card>

      {/* Main Content Area */}
      {displayItems.length === 0 ? (
        <Card style={{ padding: "48px 32px", textAlign: "center" }}>
          <div style={{ color: "var(--t-accent)", marginBottom: 12, display: "flex", justifyContent: "center" }}>
            <TrendingUp size={36} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--t-ink)", marginBottom: 6 }}>
            {items.length === 0 ? "No Loans Given Recorded Yet" : "No Loans Match Your Filter"}
          </div>
          <div style={{ fontSize: 13, color: "var(--t-muted)", maxWidth: 400, margin: "0 auto 20px" }}>
            {items.length === 0
              ? "Track money lent to friends, relatives, colleagues, or businesses. Monitor due dates, simple interest, repayment logs, and send WhatsApp reminders."
              : "Try adjusting your search query or reset status filters."}
          </div>
          {items.length === 0 ? (
            <button
              onClick={onAdd}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                background: "var(--t-accent)",
                color: "#FFFFFF",
                fontWeight: 800,
                fontSize: 13,
                border: "none",
                cursor: "pointer",
              }}
            >
              <Plus size={14} /> Record Your First Loan Given
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setOwnerFilter("all");
              }}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid var(--t-line)",
                background: "var(--surface-0)",
                color: "var(--t-ink)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Reset Filters
            </button>
          )}
        </Card>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 16,
          }}
        >
          {displayItems.map((l: any) => {
            const principal = Number(l.principal) || 0;
            const outstanding = loanGivenOutstanding(l);
            const rate = Number(l.rate) || 0;
            const isPaidOff = outstanding <= 0;

            const dueDateObj = l.dueDate ? new Date(l.dueDate + "T00:00:00") : null;
            const isOverdue = !isPaidOff && !!dueDateObj && dueDateObj < now;
            const daysOverdue = isOverdue
              ? Math.floor((now.getTime() - dueDateObj!.getTime()) / (1000 * 60 * 60 * 24))
              : 0;

            const dueSoon =
              !isPaidOff &&
              !isOverdue &&
              !!dueDateObj &&
              Math.ceil((dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= 7;
            const daysUntilDue = dueSoon
              ? Math.ceil((dueDateObj!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              : 0;

            const startDate = l.date ? new Date(l.date + "T00:00:00") : null;
            const daysElapsed = startDate
              ? Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
              : 0;

            const accruedInterest = (principal * (rate / 100) * daysElapsed) / 365.25;
            const recovered = Math.max(0, principal - outstanding);
            const recoveredPct = principal > 0 ? Math.min(100, (recovered / principal) * 100) : 0;

            const barColor = isPaidOff
              ? "var(--t-sage)"
              : isOverdue
              ? "var(--t-rust)"
              : "var(--t-accent)";

            const avatarGradient = getAvatarGradient(l.borrower || "B");
            const firstLetter = l.borrower ? l.borrower.charAt(0).toUpperCase() : "?";

            const ownerProfile = familyProfiles.find((p: any) => p.id === l.owner);
            const ownerLabel = ownerProfile ? ownerProfile.name : "Self";

            const paymentsCount = (l.payments || []).length;

            return (
              <Card
                key={l.id}
                style={{
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderTop: `4px solid ${
                    isOverdue ? "var(--t-rust)" : isPaidOff ? "var(--t-sage)" : "var(--t-accent)"
                  }`,
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: avatarGradient,
                          color: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          fontWeight: 900,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                        }}
                      >
                        {firstLetter}
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: "var(--t-ink)", lineHeight: 1.2 }}>
                          {l.borrower}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase", marginTop: 2 }}>
                          Profile: {ownerLabel} {l.phone ? `· Ph: ${l.phone}` : ""}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isOverdue ? (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: "#FFFFFF",
                            background: "var(--t-rust)",
                            padding: "3px 8px",
                            borderRadius: 6,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {daysOverdue}D OVERDUE
                        </span>
                      ) : dueSoon ? (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: "var(--t-gold)",
                            background: "color-mix(in srgb, var(--t-gold) 15%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--t-gold) 30%, transparent)",
                            padding: "3px 8px",
                            borderRadius: 6,
                          }}
                        >
                          DUE IN {daysUntilDue}D
                        </span>
                      ) : isPaidOff ? (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: "var(--t-sage)",
                            background: "color-mix(in srgb, var(--t-sage) 12%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--t-sage) 25%, transparent)",
                            borderRadius: 6,
                            padding: "3px 8px",
                          }}
                        >
                          SETTLED
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: "var(--t-accent)",
                            background: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--t-accent) 25%, transparent)",
                            borderRadius: 6,
                            padding: "3px 8px",
                          }}
                        >
                          ACTIVE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Outstanding Balance */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--t-muted)", letterSpacing: "0.05em" }}>
                      Pending Recovery Balance
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 26,
                        fontWeight: 700,
                        color: isPaidOff ? "var(--t-sage)" : isOverdue ? "var(--t-rust)" : "var(--t-ink)",
                        letterSpacing: "-0.03em",
                        marginTop: 2,
                      }}
                    >
                      <Money value={outstanding} variant="full" />
                    </div>
                  </div>

                  {/* Recovery Progress */}
                  {principal > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--t-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>
                        <span>Recovered: {fmtINR(recovered)}</span>
                        <span style={{ color: barColor, fontWeight: 800 }}>
                          {recoveredPct.toFixed(1)}% Recovered
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: "var(--surface-1)", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(recoveredPct, 100)}%`,
                            background: `linear-gradient(90deg, ${barColor}, color-mix(in srgb, ${barColor} 65%, white))`,
                            borderRadius: 99,
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Financial Metrics Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
                    <div style={{ padding: "8px 10px", borderRadius: 8, background: "color-mix(in srgb, var(--surface-1) 50%, transparent)", border: "1px solid var(--t-line)" }}>
                      <div style={{ fontSize: 9, color: "var(--t-muted)", fontWeight: 700, textTransform: "uppercase" }}>Principal Lent</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--t-ink)", marginTop: 1 }}>
                        <Money value={principal} variant="exact" />
                      </div>
                    </div>
                    <div style={{ padding: "8px 10px", borderRadius: 8, background: "color-mix(in srgb, var(--surface-1) 50%, transparent)", border: "1px solid var(--t-line)" }}>
                      <div style={{ fontSize: 9, color: "var(--t-muted)", fontWeight: 700, textTransform: "uppercase" }}>Interest Terms</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: rate > 0 ? "var(--t-accent)" : "var(--t-muted)", marginTop: 1 }}>
                        {rate > 0 ? `${rate}% p.a.` : "0% Friendly"}
                      </div>
                    </div>
                    <div style={{ padding: "8px 10px", borderRadius: 8, background: "color-mix(in srgb, var(--surface-1) 50%, transparent)", border: "1px solid var(--t-line)" }}>
                      <div style={{ fontSize: 9, color: "var(--t-muted)", fontWeight: 700, textTransform: "uppercase" }}>Accrued Interest</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: rate > 0 ? "var(--t-sage)" : "var(--t-muted)", marginTop: 1 }}>
                        {rate > 0 ? <Money value={accruedInterest} variant="exact" /> : "—"}
                      </div>
                    </div>
                    <div style={{ padding: "8px 10px", borderRadius: 8, background: "color-mix(in srgb, var(--surface-1) 50%, transparent)", border: "1px solid var(--t-line)" }}>
                      <div style={{ fontSize: 9, color: "var(--t-muted)", fontWeight: 700, textTransform: "uppercase" }}>Agreed Due Date</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: isOverdue ? "var(--t-rust)" : "var(--t-ink)", marginTop: 1 }}>
                        {fmtLoanDate(l.dueDate)}
                      </div>
                    </div>
                  </div>

                  {l.security && (
                    <div style={{ fontSize: 10, color: "var(--t-muted)", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                      <Shield size={11} color="var(--t-accent)" /> Collateral: {l.security}
                    </div>
                  )}

                  {l.note && (
                    <div style={{ fontSize: 11, color: "var(--t-muted)", fontStyle: "italic", marginTop: 8, lineHeight: 1.4 }}>
                      "{l.note}"
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div style={{ marginTop: 16, borderTop: "1px solid var(--t-line)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Action Tools Row */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {!isPaidOff && (
                      <button
                        onClick={() => setPaymentLoan(l)}
                        style={{
                          flex: "1 1 auto",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          padding: "6px 10px",
                          borderRadius: 6,
                          background: "color-mix(in srgb, var(--t-sage) 12%, transparent)",
                          color: "var(--t-sage)",
                          border: "1px solid color-mix(in srgb, var(--t-sage) 25%, transparent)",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        <IndianRupee size={12} /> Record Receipt
                      </button>
                    )}

                    {!isPaidOff && (
                      <button
                        onClick={() => setReminderLoan(l)}
                        style={{
                          flex: "1 1 auto",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          padding: "6px 10px",
                          borderRadius: 6,
                          background: "#25D36615",
                          color: "#128C7E",
                          border: "1px solid #25D36630",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        <Share2 size={12} /> Send Reminder
                      </button>
                    )}
                  </div>

                  {/* Secondary Actions (History, Forgive, Edit, Delete) */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
                    {paymentsCount > 0 ? (
                      <button
                        onClick={() => setHistoryLoan(l)}
                        style={{
                          fontSize: 11,
                          color: "var(--t-accent)",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Clock size={12} /> Receipts ({paymentsCount})
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--t-muted)" }}>No receipts logged</span>
                    )}

                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      {!isPaidOff && (
                        <button
                          onClick={() => setConfirmForgiveLoan(l)}
                          title="Settle / Forgive remaining debt"
                          style={{
                            padding: "3px 6px",
                            borderRadius: 5,
                            border: "1px solid var(--t-line)",
                            background: "transparent",
                            color: "var(--t-muted)",
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Forgive
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(l.id)}
                        title="Edit loan"
                        style={{
                          padding: 5,
                          borderRadius: 6,
                          border: "none",
                          background: "transparent",
                          color: "var(--t-muted)",
                          cursor: "pointer",
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteLoan(l)}
                        title="Delete loan"
                        style={{
                          padding: 5,
                          borderRadius: 6,
                          border: "none",
                          background: "transparent",
                          color: "var(--t-rust)",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--surface-1)", borderBottom: "1px solid var(--t-line)" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: "var(--t-muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Borrower
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: "var(--t-muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Profile
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "right", color: "var(--t-muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Principal Lent
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "right", color: "var(--t-muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Pending Balance
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "var(--t-muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Interest Rate
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "var(--t-muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Given Date
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "var(--t-muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Due Date
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "var(--t-muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Status
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "right", color: "var(--t-muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((l: any) => {
                  const out = loanGivenOutstanding(l);
                  const isPaidOff = out <= 0;
                  const isOverdue = !isPaidOff && l.dueDate && new Date(l.dueDate + "T00:00:00") < now;
                  const ownerProfile = familyProfiles.find((p: any) => p.id === l.owner);
                  return (
                    <tr key={l.id} style={{ borderBottom: "1px solid var(--t-line)" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: "50%",
                              background: getAvatarGradient(l.borrower),
                              color: "#FFFFFF",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 900,
                            }}
                          >
                            {(l.borrower || "B").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: "var(--t-ink)" }}>{l.borrower}</div>
                            {l.phone && <div style={{ fontSize: 10, color: "var(--t-muted)" }}>{l.phone}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--t-muted)", fontWeight: 600 }}>
                        {ownerProfile ? ownerProfile.name : "Self"}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: "var(--t-ink)" }}>
                        <Money value={l.principal} variant="exact" />
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: isPaidOff ? "var(--t-sage)" : isOverdue ? "var(--t-rust)" : "var(--t-ink)" }}>
                        <Money value={out} variant="exact" />
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "var(--t-ink)" }}>
                        {Number(l.rate) > 0 ? `${l.rate}%` : "0% Friendly"}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--t-muted)", fontWeight: 600 }}>
                        {fmtLoanDate(l.date)}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", color: isOverdue ? "var(--t-rust)" : "var(--t-muted)", fontWeight: isOverdue ? 800 : 600 }}>
                        {fmtLoanDate(l.dueDate)}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: isPaidOff ? "var(--t-sage)" : isOverdue ? "var(--t-rust)" : "var(--t-accent)",
                            background: `color-mix(in srgb, ${isPaidOff ? "var(--t-sage)" : isOverdue ? "var(--t-rust)" : "var(--t-accent)"} 12%, transparent)`,
                            borderRadius: 6,
                            padding: "2px 6px",
                          }}
                        >
                          {isPaidOff ? "SETTLED" : isOverdue ? "OVERDUE" : "ACTIVE"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          {!isPaidOff && (
                            <button
                              onClick={() => setPaymentLoan(l)}
                              title="Record Receipt"
                              style={{
                                padding: "4px 8px",
                                borderRadius: 6,
                                border: "1px solid var(--t-line)",
                                background: "var(--surface-0)",
                                color: "var(--t-sage)",
                                cursor: "pointer",
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              Receipt
                            </button>
                          )}
                          {!isPaidOff && (
                            <button
                              onClick={() => setReminderLoan(l)}
                              title="Send Reminder"
                              style={{
                                padding: "4px 6px",
                                borderRadius: 6,
                                border: "1px solid #25D36640",
                                background: "#25D36615",
                                color: "#128C7E",
                                cursor: "pointer",
                              }}
                            >
                              <Share2 size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => onEdit(l.id)}
                            title="Edit"
                            style={{
                              padding: "4px 6px",
                              borderRadius: 6,
                              border: "none",
                              background: "transparent",
                              color: "var(--t-muted)",
                              cursor: "pointer",
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteLoan(l)}
                            title="Delete"
                            style={{
                              padding: "4px 6px",
                              borderRadius: 6,
                              border: "none",
                              background: "transparent",
                              color: "var(--t-rust)",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Payment Recording Modal */}
      {paymentLoan && (
        <LoanPaymentModal
          loan={paymentLoan}
          type="given"
          bankAccounts={bankAccounts}
          onClose={() => setPaymentLoan(null)}
          onSavePayment={async (_record: any, patch: any, bankTxn?: any) => {
            await onUpdate(paymentLoan.id, patch);
            if (bankTxn && onAddTransaction) {
              await onAddTransaction(bankTxn);
            }
            setPaymentLoan(null);
          }}
        />
      )}

      {/* Reminder Modal */}
      {reminderLoan && (
        <LoanReminderModal loan={reminderLoan} onClose={() => setReminderLoan(null)} />
      )}

      {/* Payment History Modal */}
      {historyLoan && (
        <LoanHistoryModal
          loan={historyLoan}
          onClose={() => setHistoryLoan(null)}
          onUndoPayment={(undoTarget: any) => {
            setConfirmUndoPayment(undoTarget);
          }}
        />
      )}

      {/* Confirm Forgive / Write-Off Dialog */}
      {confirmForgiveLoan && (
        <ConfirmDialog
          message={`Settle and forgive the remaining balance of ${fmtINR(loanGivenOutstanding(confirmForgiveLoan))} for "${confirmForgiveLoan.borrower}"? This will mark the loan as settled.`}
          confirmLabel="Yes, Settle & Forgive"
          onConfirm={async () => {
            await onUpdate(confirmForgiveLoan.id, {
              outstanding: 0,
              status: "settled",
              forgivenDate: today(),
            });
            setConfirmForgiveLoan(null);
          }}
          onCancel={() => setConfirmForgiveLoan(null)}
        />
      )}

      {/* Confirm Delete Dialog */}
      {confirmDeleteLoan && (
        <ConfirmDialog
          message={`Delete the loan given to "${confirmDeleteLoan.borrower || "this person"}"? This cannot be undone.`}
          onConfirm={() => {
            onRemove(confirmDeleteLoan.id);
            setConfirmDeleteLoan(null);
          }}
          onCancel={() => setConfirmDeleteLoan(null)}
        />
      )}

      {/* Confirm Undo Payment Dialog */}
      {confirmUndoPayment && (
        <ConfirmDialog
          message="Undo this payment receipt? The amount will be added back to the borrower's pending balance."
          confirmLabel="Yes, undo receipt"
          onConfirm={async () => {
            await onUpdate(confirmUndoPayment.loanId, {
              payments: confirmUndoPayment.updatedPayments,
              outstanding: confirmUndoPayment.restoredBalance,
              status: confirmUndoPayment.restoredBalance > 0 ? "active" : undefined,
            });
            setConfirmUndoPayment(null);
            setHistoryLoan(null);
          }}
          onCancel={() => setConfirmUndoPayment(null)}
        />
      )}
    </div>
  );
}

// History modal sub-component for Loan Given
function LoanHistoryModal({ loan, onClose, onUndoPayment }: any) {
  const payments: any[] = loan.payments || [];
  const outstanding = loanGivenOutstanding(loan);

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: "var(--t-ink)" }}>
          Payment Receipts — {loan.borrower || "Borrower"}
        </div>
        <button
          onClick={onClose}
          style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--t-line)", background: "transparent", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
        >
          Close
        </button>
      </div>

      {payments.length === 0 ? (
        <div style={{ padding: "20px 0", textAlign: "center", color: "var(--t-muted)", fontSize: 12 }}>
          No repayment receipts recorded yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
          {payments
            .slice()
            .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
            .map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--surface-1)",
                  border: "1px solid var(--t-line)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--t-sage)" }}>
                    <Money value={p.amount} variant="exact" />
                    <span style={{ fontSize: 10, color: "var(--t-muted)", marginLeft: 6, fontWeight: 700, textTransform: "uppercase" }}>
                      {p.mode || "Receipt"}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t-muted)", marginTop: 2 }}>
                    {p.date} {p.reference ? `· Ref: ${p.reference}` : ""} {p.note ? `· ${p.note}` : ""}
                  </div>
                </div>

                <button
                  onClick={() =>
                    onUndoPayment({
                      loanId: loan.id,
                      updatedPayments: payments.filter((x) => x.id !== p.id),
                      restoredBalance: outstanding + Number(p.amount || 0),
                    })
                  }
                  title="Undo this receipt"
                  style={{
                    padding: 5,
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    color: "var(--t-rust)",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
        </div>
      )}
    </Card>
  );
}
