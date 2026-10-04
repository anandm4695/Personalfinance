/* eslint-disable */
import React, { useState, useMemo } from "react";
import {
  TrendingDown,
  Wallet,
  Calendar,
  Calculator,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Layers,
  LayoutGrid,
  List,
  Building,
  RotateCcw,
  IndianRupee,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, fmtINRExact, loanOutstanding } from "../../utils/finance";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { StatCard } from "../ui/StatCard";
import { Card } from "../ui/Card";
import { Money } from "../ui/Money";
import { BankLogo } from "../ui/BrandLogos";
import { ConfirmDialog } from "../ui/Feedback";
import { DataTable } from "../design-system/DataTable";
import { LoanAmortizationModal } from "./LoanAmortizationModal";
import { LoanPrepaymentDrawer } from "./LoanPrepaymentDrawer";
import { LoanPaymentModal } from "./LoanPaymentModal";
import { LoanTakenModal } from "./LoanTakenModal";

function loanOrdinalSuffix(d: number) {
  if (d >= 11 && d <= 13) return "th";
  const r = d % 10;
  if (r === 1) return "st";
  if (r === 2) return "nd";
  if (r === 3) return "rd";
  return "th";
}

interface LoanTakenSectionProps {
  items: any[];
  bankAccounts?: any[];
  onRemove: (id: string) => Promise<void> | void;
  onEdit: (id: string) => void;
  onAdd: () => void;
  onUpdate: (id: string, patch: any) => Promise<void> | void;
  onAddTransaction?: (txn: any) => Promise<void> | void;
}

export function LoanTakenSection({
  items = [],
  bankAccounts = [],
  onRemove,
  onEdit,
  onAdd,
  onUpdate,
  onAddTransaction,
}: LoanTakenSectionProps) {
  const { familyProfiles, loanTypes } = useMasterData();

  // Search, filter, and view mode state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("active");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "outstanding_desc" | "rate_desc" | "emi_desc" | "tenure_asc" | "lender_asc"
  >("outstanding_desc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [amortizationLoan, setAmortizationLoan] = useState<any | null>(null);
  const [prepayLoan, setPrepayLoan] = useState<any | null>(null);
  const [paymentLoan, setPaymentLoan] = useState<any | null>(null);
  const [historyLoan, setHistoryLoan] = useState<any | null>(null);
  const [confirmDeleteLoan, setConfirmDeleteLoan] = useState<any | null>(null);
  const [confirmUndoPayment, setConfirmUndoPayment] = useState<any | null>(null);

  // Aggregates & Analytics
  const activeLoans = useMemo(
    () => items.filter((l: any) => (l.status || "active").toLowerCase() !== "closed" && loanOutstanding(l) > 0),
    [items]
  );
  const closedLoans = useMemo(
    () => items.filter((l: any) => (l.status || "active").toLowerCase() === "closed" || loanOutstanding(l) <= 0),
    [items]
  );

  const totalPrincipal = useMemo(
    () => items.reduce((s: number, l: any) => s + (Number(l.principal) || 0), 0),
    [items]
  );
  const totalOutstanding = useMemo(
    () => activeLoans.reduce((s: number, l: any) => s + loanOutstanding(l), 0),
    [activeLoans]
  );
  const totalEMI = useMemo(
    () => activeLoans.reduce((s: number, l: any) => s + (Number(l.emi) || 0), 0),
    [activeLoans]
  );

  // Total Interest Remaining calculation
  const totalInterestRemaining = useMemo(() => {
    return activeLoans.reduce((acc: number, l: any) => {
      const out = loanOutstanding(l);
      const emi = Number(l.emi) || 0;
      const months = Number(l.monthsRemaining) || 0;
      if (out <= 0 || emi <= 0 || months <= 0) return acc;
      return acc + Math.max(0, emi * months - out);
    }, 0);
  }, [activeLoans]);

  // Weighted Average Interest Rate
  const weightedAvgRate = useMemo(() => {
    if (totalOutstanding <= 0) return 0;
    const weightedSum = activeLoans.reduce((s: number, l: any) => {
      const out = loanOutstanding(l);
      const rate = Number(l.rate) || 0;
      return s + out * rate;
    }, 0);
    return weightedSum / totalOutstanding;
  }, [activeLoans, totalOutstanding]);

  // Filtered & Sorted items
  const displayItems = useMemo(() => {
    let list = items;

    // Status filter
    if (statusFilter === "active") {
      list = list.filter((l: any) => (l.status || "active").toLowerCase() !== "closed" && loanOutstanding(l) > 0);
    } else if (statusFilter === "closed") {
      list = list.filter((l: any) => (l.status || "active").toLowerCase() === "closed" || loanOutstanding(l) <= 0);
    }

    // Type filter
    if (typeFilter !== "all") {
      list = list.filter((l: any) => (l.type || "").toLowerCase() === typeFilter.toLowerCase());
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
          (l.lender || "").toLowerCase().includes(q) ||
          (l.type || "").toLowerCase().includes(q) ||
          (l.accountNumber || "").toLowerCase().includes(q) ||
          (l.note || "").toLowerCase().includes(q)
      );
    }

    // Sorting
    return [...list].sort((a: any, b: any) => {
      if (sortBy === "outstanding_desc") return loanOutstanding(b) - loanOutstanding(a);
      if (sortBy === "rate_desc") return (Number(b.rate) || 0) - (Number(a.rate) || 0);
      if (sortBy === "emi_desc") return (Number(b.emi) || 0) - (Number(a.emi) || 0);
      if (sortBy === "tenure_asc") return (Number(a.monthsRemaining) || 0) - (Number(b.monthsRemaining) || 0);
      if (sortBy === "lender_asc") return (a.lender || "").localeCompare(b.lender || "");
      return 0;
    });
  }, [items, statusFilter, typeFilter, ownerFilter, searchQuery, sortBy]);

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
          label="Total Borrowed"
          value={fmtINRFull(totalPrincipal)}
          numericValue={totalPrincipal}
          formatValue={fmtINRFull}
          sub={`${items.length} total loan${items.length !== 1 ? "s" : ""}`}
          color={THEME.muted}
          icon={<TrendingDown />}
        />
        <StatCard
          label="Outstanding Debt"
          value={fmtINRFull(totalOutstanding)}
          numericValue={totalOutstanding}
          formatValue={fmtINRFull}
          sub={
            totalOutstanding > 0
              ? `${activeLoans.length} active loan${activeLoans.length !== 1 ? "s" : ""}`
              : "All debt paid off"
          }
          color={THEME.rust}
          icon={<Wallet />}
        />
        <StatCard
          label="Monthly EMI Outflow"
          value={fmtINRFull(totalEMI)}
          numericValue={totalEMI}
          formatValue={fmtINRFull}
          sub={
            activeLoans.length > 0
              ? `Avg rate: ${weightedAvgRate.toFixed(2)}% p.a.`
              : "No active monthly outflows"
          }
          color={THEME.accent}
          icon={<Calendar />}
        />
        <StatCard
          label="Est. Remaining Interest"
          value={fmtINRFull(totalInterestRemaining)}
          numericValue={totalInterestRemaining}
          formatValue={fmtINRFull}
          sub="Prepaying early reduces this"
          color={THEME.gold}
          icon={<Sparkles />}
        />
      </div>

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
              placeholder="Search lender, type, account..."
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
              { key: "active", label: `Active (${activeLoans.length})` },
              { key: "closed", label: `Paid Off (${closedLoans.length})` },
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
                  color: statusFilter === key ? "var(--t-ink)" : "var(--t-muted)",
                  boxShadow: statusFilter === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
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
            <option value="all">All Types</option>
            {loanTypes.map((t: string) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

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
            <option value="outstanding_desc">Highest Outstanding</option>
            <option value="rate_desc">Highest Interest Rate</option>
            <option value="emi_desc">Highest EMI</option>
            <option value="tenure_asc">Shortest Tenure</option>
            <option value="lender_asc">Lender Name (A-Z)</option>
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
            <Plus size={14} /> Add Loan Taken
          </button>
        </div>
      </Card>

      {/* Main Content Area */}
      {displayItems.length === 0 ? (
        <Card style={{ padding: "48px 32px", textAlign: "center" }}>
          <div style={{ color: "var(--t-rust)", marginBottom: 12, display: "flex", justifyContent: "center" }}>
            <TrendingDown size={36} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--t-ink)", marginBottom: 6 }}>
            {items.length === 0 ? "No Loans Recorded Yet" : "No Loans Match Your Filter"}
          </div>
          <div style={{ fontSize: 13, color: "var(--t-muted)", maxWidth: 400, margin: "0 auto 20px" }}>
            {items.length === 0
              ? "Track your home loans, vehicle loans, personal loans, or education loans with live EMI tracking, amortization schedules, and prepayment simulators."
              : "Try adjusting your search keywords or switching filters to view your loans."}
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
              <Plus size={14} /> Add Your First Loan
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setTypeFilter("all");
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
            const outstanding = loanOutstanding(l);
            const emi = Number(l.emi) || 0;
            const rate = Number(l.rate) || 0;
            const isPaidOff = outstanding <= 0;
            const months = isPaidOff ? 0 : Number(l.monthsRemaining) || 0;
            const paid = Math.max(0, principal - outstanding);
            const paidPct = principal > 0 ? Math.min(100, (paid / principal) * 100) : 0;
            const interestRemaining = isPaidOff ? 0 : Math.max(0, emi * months - outstanding);

            const payoffDate =
              months > 0
                ? (() => {
                    const d = new Date();
                    d.setMonth(d.getMonth() + months);
                    return d.toLocaleString("en-IN", { month: "short", year: "numeric" });
                  })()
                : null;

            const barColor = isPaidOff
              ? "var(--t-sage)"
              : paidPct > 60
              ? "var(--t-sage)"
              : paidPct > 30
              ? "var(--t-gold)"
              : "var(--t-rust)";

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
                  borderTop: `4px solid ${isPaidOff ? "var(--t-sage)" : "var(--t-rust)"}`,
                  position: "relative",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <BankLogo bankName={l.lender} size={36} />
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: isPaidOff ? "var(--t-sage)" : "var(--t-rust)", letterSpacing: "0.06em" }}>
                          {l.type || "Personal Loan"} {l.interestType ? `· ${l.interestType}` : ""}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--t-ink)", marginTop: 1, lineHeight: 1.2 }}>
                          {l.lender}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase", marginTop: 2 }}>
                          Profile: {ownerLabel} {l.accountNumber ? `· #${l.accountNumber}` : ""}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      {isPaidOff ? (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: "var(--t-sage)",
                            background: "color-mix(in srgb, var(--t-sage) 12%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--t-sage) 25%, transparent)",
                            borderRadius: 6,
                            padding: "2px 8px",
                            letterSpacing: "0.05em",
                          }}
                        >
                          PAID OFF
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: "var(--t-rust)",
                            background: "color-mix(in srgb, var(--t-rust) 12%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--t-rust) 25%, transparent)",
                            borderRadius: 6,
                            padding: "2px 8px",
                            letterSpacing: "0.05em",
                          }}
                        >
                          ACTIVE
                        </span>
                      )}

                      {l.dueDay && !isPaidOff && (
                        <span style={{ fontSize: 9, color: "var(--t-muted)", fontWeight: 700 }}>
                          Due: {l.dueDay}{loanOrdinalSuffix(Number(l.dueDay))} / mo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Outstanding Balance */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--t-muted)", letterSpacing: "0.05em" }}>
                      Outstanding Debt Balance
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 26,
                        fontWeight: 700,
                        color: isPaidOff ? "var(--t-sage)" : "var(--t-rust)",
                        letterSpacing: "-0.03em",
                        marginTop: 2,
                      }}
                    >
                      <Money value={outstanding} variant="full" />
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {principal > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--t-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>
                        <span>Paid: {fmtINR(paid)}</span>
                        <span style={{ color: barColor, fontWeight: 800 }}>
                          {paidPct.toFixed(1)}% {months > 0 ? `· ${months}m left` : ""}
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: "var(--surface-1)", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(paidPct, 100)}%`,
                            background: `linear-gradient(90deg, ${barColor}, color-mix(in srgb, ${barColor} 65%, white))`,
                            borderRadius: 99,
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Financial Metrics Badges */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
                    <div style={{ padding: "8px 10px", borderRadius: 8, background: "color-mix(in srgb, var(--surface-1) 50%, transparent)", border: "1px solid var(--t-line)" }}>
                      <div style={{ fontSize: 9, color: "var(--t-muted)", fontWeight: 700, textTransform: "uppercase" }}>Monthly EMI</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--t-accent)", marginTop: 1 }}>
                        <Money value={emi} variant="exact" />/mo
                      </div>
                    </div>
                    <div style={{ padding: "8px 10px", borderRadius: 8, background: "color-mix(in srgb, var(--surface-1) 50%, transparent)", border: "1px solid var(--t-line)" }}>
                      <div style={{ fontSize: 9, color: "var(--t-muted)", fontWeight: 700, textTransform: "uppercase" }}>Interest Rate</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--t-ink)", marginTop: 1 }}>
                        {rate ? `${rate}% p.a.` : "—"}
                      </div>
                    </div>
                    <div style={{ padding: "8px 10px", borderRadius: 8, background: "color-mix(in srgb, var(--surface-1) 50%, transparent)", border: "1px solid var(--t-line)" }}>
                      <div style={{ fontSize: 9, color: "var(--t-muted)", fontWeight: 700, textTransform: "uppercase" }}>Principal Lent</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--t-ink)", marginTop: 1 }}>
                        <Money value={principal} variant="exact" />
                      </div>
                    </div>
                    <div style={{ padding: "8px 10px", borderRadius: 8, background: "color-mix(in srgb, var(--surface-1) 50%, transparent)", border: "1px solid var(--t-line)" }}>
                      <div style={{ fontSize: 9, color: "var(--t-muted)", fontWeight: 700, textTransform: "uppercase" }}>Est. Payoff Date</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: payoffDate ? "var(--t-sage)" : "var(--t-ink)", marginTop: 1 }}>
                        {payoffDate || "Debt Free"}
                      </div>
                    </div>
                  </div>

                  {l.note && (
                    <div style={{ fontSize: 11, color: "var(--t-muted)", fontStyle: "italic", marginTop: 10, lineHeight: 1.4 }}>
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
                        <IndianRupee size={12} /> Pay EMI
                      </button>
                    )}

                    {!isPaidOff && (
                      <button
                        onClick={() => setPrepayLoan(l)}
                        style={{
                          flex: "1 1 auto",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          padding: "6px 10px",
                          borderRadius: 6,
                          background: "color-mix(in srgb, var(--t-accent) 10%, transparent)",
                          color: "var(--t-accent)",
                          border: "1px solid color-mix(in srgb, var(--t-accent) 20%, transparent)",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        <Zap size={12} /> Simulate
                      </button>
                    )}

                    <button
                      onClick={() => setAmortizationLoan(l)}
                      style={{
                        flex: "1 1 auto",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: "var(--surface-1)",
                        color: "var(--t-ink)",
                        border: "1px solid var(--t-line)",
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      <Calculator size={12} /> Schedule
                    </button>
                  </div>

                  {/* Secondary Actions (History, Edit, Delete) */}
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
                        <Clock size={12} /> Payment History ({paymentsCount})
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--t-muted)" }}>No payments logged yet</span>
                    )}

                    <div style={{ display: "flex", gap: 4 }}>
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
                    Lender & Type
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: "var(--t-muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Profile
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "right", color: "var(--t-muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Original Principal
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "right", color: "var(--t-muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Outstanding
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "right", color: "var(--t-muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Monthly EMI
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "var(--t-muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Rate (%)
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "var(--t-muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Tenure Left
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "var(--t-muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Due Day
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
                  const out = loanOutstanding(l);
                  const isPaidOff = out <= 0;
                  const ownerProfile = familyProfiles.find((p: any) => p.id === l.owner);
                  return (
                    <tr key={l.id} style={{ borderBottom: "1px solid var(--t-line)" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <BankLogo bankName={l.lender} size={24} />
                          <div>
                            <div style={{ fontWeight: 800, color: "var(--t-ink)" }}>{l.lender}</div>
                            <div style={{ fontSize: 10, color: "var(--t-muted)" }}>{l.type || "Loan"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--t-muted)", fontWeight: 600 }}>
                        {ownerProfile ? ownerProfile.name : "Self"}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: "var(--t-ink)" }}>
                        <Money value={l.principal} variant="exact" />
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: isPaidOff ? "var(--t-sage)" : "var(--t-rust)" }}>
                        <Money value={out} variant="exact" />
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: "var(--t-accent)" }}>
                        <Money value={l.emi} variant="exact" />
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "var(--t-ink)" }}>
                        {l.rate ? `${l.rate}%` : "—"}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--t-ink)", fontWeight: 700 }}>
                        {isPaidOff ? "0m" : `${l.monthsRemaining || "—"}m`}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--t-muted)", fontWeight: 600 }}>
                        {l.dueDay ? `${l.dueDay}${loanOrdinalSuffix(Number(l.dueDay))}` : "—"}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: isPaidOff ? "var(--t-sage)" : "var(--t-rust)",
                            background: `color-mix(in srgb, ${isPaidOff ? "var(--t-sage)" : "var(--t-rust)"} 12%, transparent)`,
                            borderRadius: 6,
                            padding: "2px 6px",
                          }}
                        >
                          {isPaidOff ? "PAID OFF" : "ACTIVE"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          {!isPaidOff && (
                            <button
                              onClick={() => setPaymentLoan(l)}
                              title="Pay EMI"
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
                              Pay
                            </button>
                          )}
                          <button
                            onClick={() => setAmortizationLoan(l)}
                            title="View Amortization"
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              border: "1px solid var(--t-line)",
                              background: "var(--surface-0)",
                              color: "var(--t-ink)",
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          >
                            Schedule
                          </button>
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

      {/* Amortization Schedule Modal */}
      {amortizationLoan && (
        <LoanAmortizationModal loan={amortizationLoan} onClose={() => setAmortizationLoan(null)} />
      )}

      {/* Prepayment Simulation Drawer */}
      {prepayLoan && (
        <LoanPrepaymentDrawer
          loan={prepayLoan}
          onClose={() => setPrepayLoan(null)}
          onApplyPrepayment={async (amt: number) => {
            const nextOutstanding = Math.max(0, loanOutstanding(prepayLoan) - amt);
            await onUpdate(prepayLoan.id, {
              outstanding: nextOutstanding,
              status: nextOutstanding === 0 ? "closed" : prepayLoan.status,
            });
          }}
        />
      )}

      {/* Payment Recording Modal */}
      {paymentLoan && (
        <LoanPaymentModal
          loan={paymentLoan}
          type="taken"
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

      {/* Confirm Delete Dialog */}
      {confirmDeleteLoan && (
        <ConfirmDialog
          message={`Delete loan "${confirmDeleteLoan.lender || "this loan"}" (${confirmDeleteLoan.type || "Loan"})? This cannot be undone.`}
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
          message="Undo this payment? The amount will be added back to the loan's outstanding debt."
          confirmLabel="Yes, undo payment"
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

// Payment History Modal sub-component
function LoanHistoryModal({ loan, onClose, onUndoPayment }: any) {
  const payments: any[] = loan.payments || [];
  const outstanding = loanOutstanding(loan);

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: "var(--t-ink)" }}>
          Payment History — {loan.lender || "Loan"}
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
          No payments recorded yet for this loan.
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
                      {p.type === "prepayment" ? "Part Prepayment" : p.mode || "EMI Payment"}
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
                  title="Undo this payment"
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
