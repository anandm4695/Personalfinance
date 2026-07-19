// @ts-nocheck
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Clock,
  Search,
  Activity,
  Plus,
  Edit2,
  Trash2,
  Download,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronRight,
  Calendar,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { getLocalDateString } from "../../utils/finance";
import { THEME } from "../../utils/constants";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

const ACTION_COLORS = {
  ADD: THEME.sage,
  UPDATE: THEME.accent,
  DELETE: THEME.rust,
  REMOVE: THEME.rust,
  UPDATE_SETTINGS: "#A78BFA",
  UPDATE_PROFILE: THEME.gold,
  IMPORT: "#F472B6",
  EXPORT: "#2DD4BF",
  RESET: "#EF4444",
};

const ACTION_ICONS = {
  ADD: Plus,
  UPDATE: Edit2,
  DELETE: Trash2,
  REMOVE: Trash2,
  UPDATE_SETTINGS: Activity,
  UPDATE_PROFILE: FileText,
  IMPORT: Download,
  EXPORT: Download,
  RESET: RefreshCw,
};

const ACTION_LABELS = {
  ADD: "Add",
  UPDATE: "Update",
  UPDATE_NPS: "Update NPS",
  UPDATE_EPF: "Update EPF",
  UPDATE_PPF: "Update PPF",
  UPDATE_MF: "Update MF",
  UPDATE_STOCKS: "Update Stocks",
  UPDATE_SETTINGS: "Settings",
  UPDATE_PROFILE: "Profile",
  DELETE: "Delete",
  REMOVE: "Remove",
  IMPORT: "Import",
  EXPORT: "Export",
  RESET: "Reset",
};

const SKIP_KEYS = new Set([
  "id",
  "user_id",
  "userId",
  "created_at",
  "updated_at",
  "createdAt",
  "updatedAt",
]);

const LABEL_MAP: Record<string, string> = {
  symbol: "Symbol",
  exchange: "Exchange",
  qty: "Quantity",
  buy_price: "Buy Price",
  buyPrice: "Buy Price",
  buy_date: "Buy Date",
  buyDate: "Buy Date",
  name: "Name",
  bank: "Bank",
  amount: "Amount",
  balance: "Balance",
  type: "Type",
  accountType: "Account Type",
  account_type: "Account Type",
  description: "Description",
  category: "Category",
  date: "Date",
  scheme: "Scheme",
  nav: "NAV",
  units: "Units",
  invested: "Invested",
  current_value: "Current Value",
  currentValue: "Current Value",
  maturity_date: "Maturity Date",
  maturityDate: "Maturity Date",
  interest_rate: "Interest Rate",
  interestRate: "Interest Rate",
  principal: "Principal",
  tenure: "Tenure",
  cardName: "Card Name",
  card_name: "Card Name",
  credit_limit: "Credit Limit",
  creditLimit: "Credit Limit",
  outstanding: "Outstanding",
  due_date: "Due Date",
  dueDate: "Due Date",
  lender: "Lender",
  borrower: "Borrower",
  emi: "EMI",
  remaining: "Remaining",
  institution: "Institution",
  employer: "Employer",
  insurer: "Insurer",
  premium: "Premium",
  sum_assured: "Sum Assured",
  sumAssured: "Sum Assured",
  cover: "Cover",
  title: "Title",
  target: "Target",
  current: "Current",
  frequency: "Frequency",
  owner: "Owner",
  broker: "Broker",
  fundName: "Fund Name",
  fund_name: "Fund Name",
  folio: "Folio",
  folio_number: "Folio Number",
  folioNumber: "Folio Number",
  pran: "PRAN",
  account_number: "Account Number",
  accountNumber: "Account Number",
  brand: "Brand",
  model: "Model",
  registrationNumber: "Reg Number",
  registration_number: "Reg Number",
  weight: "Weight",
  purity: "Purity",
  address: "Address",
  person: "Person",
  source: "Source",
  fundManager: "Fund Manager",
  fund_manager: "Fund Manager",
  lenderBorrower: "Lender/Borrower",
  lender_borrower: "Lender/Borrower",
  patch: "Changed Fields",
  fileName: "File Name",
  transactions: "Transactions",
  entries: "Entries",
};

const formatDetailValue = (val: any): string => {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return val.toLocaleString("en-IN");
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    try {
      return new Date(val).toLocaleDateString("en-IN", { dateStyle: "medium" });
    } catch {
      return val;
    }
  }
  if (Array.isArray(val)) {
    if (!val.length) return "—";
    // primitive arrays: show joined
    if (typeof val[0] !== "object") return val.join(", ");
    // object arrays (e.g. transactions): show count
    return `${val.length} record${val.length !== 1 ? "s" : ""}`;
  }
  if (typeof val === "object") {
    // small flat objects: show as key=value pairs
    const entries = Object.entries(val).filter(([, v]) => typeof v !== "object");
    if (entries.length <= 4)
      return entries.map(([k, v]) => `${LABEL_MAP[k] || k}: ${v}`).join(" · ") || "—";
    return `${entries.length} fields`;
  }
  return String(val);
};

const renderMetadataDetails = (metadata: any, actionType: string) => {
  if (!metadata || typeof metadata !== "object") return null;

  const isUpdate = (actionType || "").startsWith("UPDATE");
  const source =
    isUpdate && metadata.patch && typeof metadata.patch === "object" ? metadata.patch : metadata;

  const primitiveEntries: [string, any][] = [];
  const arrayEntries: [string, any][] = [];
  const objectEntries: [string, any][] = [];

  Object.entries(source).forEach(([k, v]) => {
    if (SKIP_KEYS.has(k)) return;
    if (k === "patch") return;
    if (Array.isArray(v)) arrayEntries.push([k, v]);
    else if (typeof v === "object" && v !== null) objectEntries.push([k, v]);
    else primitiveEntries.push([k, v]);
  });

  const allEntries = [...primitiveEntries, ...arrayEntries, ...objectEntries];
  if (!allEntries.length) return null;

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 10,
        overflow: "hidden",
        border: `1px solid ${THEME.border}`,
        background: THEME.bg,
      }}
    >
      {isUpdate && (
        <div
          style={{
            padding: "6px 14px",
            background: `color-mix(in srgb, ${THEME.accent} 6%, transparent)`,
            borderBottom: `1px solid ${THEME.border}`,
            fontSize: 11,
            fontWeight: 700,
            color: THEME.accent,
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Edit2 size={10} />
          Fields Changed
        </div>
      )}
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        {allEntries.map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span
              style={{
                width: 140,
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 600,
                color: THEME.textSecondary,
                textTransform: "capitalize",
                paddingTop: 1,
              }}
            >
              {LABEL_MAP[k] || k.replace(/_/g, " ")}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 12,
                wordBreak: "break-word",
                fontStyle: Array.isArray(v) && typeof v[0] === "object" ? "italic" : "normal",
                color:
                  Array.isArray(v) && typeof v[0] === "object" ? THEME.textSecondary : THEME.text,
              }}
            >
              {formatDetailValue(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const getMetadataSummary = (metadata: any, actionType: string): string | null => {
  if (!metadata || typeof metadata !== "object") return null;
  const isUpdate = (actionType || "").startsWith("UPDATE");
  const source = isUpdate && metadata.patch ? metadata.patch : metadata;
  const pairs: string[] = [];
  Object.entries(source).forEach(([k, v]) => {
    if (SKIP_KEYS.has(k) || k === "patch") return;
    if (Array.isArray(v)) {
      if (typeof v[0] === "object")
        pairs.push(`${LABEL_MAP[k] || k}: ${v.length} record${v.length !== 1 ? "s" : ""}`);
      else pairs.push(`${LABEL_MAP[k] || k}: ${v.join(", ")}`);
      return;
    }
    if (typeof v === "object") return;
    const label = LABEL_MAP[k] || k;
    pairs.push(`${label}: ${formatDetailValue(v)}`);
  });
  return pairs.length ? pairs.slice(0, 3).join(" · ") : null;
};

export const AuditLogTab = ({ session }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const PAGE_SIZE = 50;

  const fetchLogs = useCallback(async () => {
    if (!session?.user?.id || session.user.id === "offline-user") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError("");
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - Number(dateRange));
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", session.user.id)
        .gte("created_at", cutoff.toISOString())
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (!error && data) {
        setLogs(data);
      } else if (error) {
        console.error("Failed to fetch logs:", error.message);
        setFetchError(`Failed to load audit log: ${error.message}`);
      }
    } catch (e) {
      console.error("Failed to fetch logs", e);
      setFetchError(`Failed to load audit log: ${e?.message || "Unknown error"}`);
    }
    setLoading(false);
  }, [session, dateRange, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    let list = logs;
    if (filterAction !== "all") {
      list = list.filter((l) => (l.action_type || "").toUpperCase().startsWith(filterAction));
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (l) =>
          (l.description || "").toLowerCase().includes(term) ||
          (l.action_type || "").toLowerCase().includes(term) ||
          (l.metadata && JSON.stringify(l.metadata).toLowerCase().includes(term))
      );
    }
    return list;
  }, [logs, filterAction, searchTerm]);

  const actionStats = useMemo(() => {
    const stats: Record<string, number> = {};
    logs.forEach((l) => {
      const action = (l.action_type || "UNKNOWN").split("_")[0];
      stats[action] = (stats[action] || 0) + 1;
    });
    return stats;
  }, [logs]);

  // created_at is a UTC timestamptz from Supabase — bucket by the LOCAL calendar day, not the
  // UTC day, so an action taken late at night in IST doesn't get filed under "yesterday" (UTC
  // is 5.5h behind IST, so anything before ~5:30am IST is still "yesterday" in raw UTC terms).
  const localDay = (iso: string) => (iso ? getLocalDateString(new Date(iso)) : "unknown");

  const dayStats = useMemo(() => {
    const byDay: Record<string, number> = {};
    logs.forEach((l) => {
      const day = localDay(l.created_at);
      byDay[day] = (byDay[day] || 0) + 1;
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7);
  }, [logs]);

  // Group filtered logs by calendar date for date separators
  const groupedLogs = useMemo(() => {
    const groups: { date: string; label: string; items: typeof filteredLogs }[] = [];
    const seen: Record<string, number> = {};
    filteredLogs.forEach((log) => {
      const day = localDay(log.created_at);
      if (seen[day] === undefined) {
        seen[day] = groups.length;
        const d = new Date(day + "T00:00:00");
        const today = getLocalDateString(new Date());
        const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
        const label =
          day === today
            ? "Today"
            : day === yesterday
              ? "Yesterday"
              : d.toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
        groups.push({ date: day, label, items: [] });
      }
      groups[seen[day]].items.push(log);
    });
    return groups;
  }, [filteredLogs]);

  const formatTime = (iso: string) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getActionColor = (action: string) => {
    const type = (action || "").split("_")[0];
    return ACTION_COLORS[type] || THEME.textSecondary;
  };

  const getActionIcon = (action: string) => {
    const type = (action || "").split("_")[0];
    return ACTION_ICONS[type] || Activity;
  };

  const getActionLabel = (action: string) => {
    return ACTION_LABELS[action] || action?.replace(/_/g, " ") || "Action";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle sub="Track all changes and actions in your financial data">
          Audit Log
        </SectionTitle>
        <Button variant="ghost" size="sm" onClick={fetchLogs}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {fetchError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 10,
            background: "color-mix(in srgb, var(--danger, #ef4444) 10%, transparent)",
            border: `1px solid ${THEME.rust}`,
            color: THEME.rust,
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={14} />
          {fetchError}
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Total Actions"
          value={logs.length}
          icon={<Activity />}
          color="var(--accent)"
        />
        <StatCard label="Adds" value={actionStats.ADD || 0} icon={<Plus />} color={THEME.sage} />
        <StatCard
          label="Updates"
          value={actionStats.UPDATE || 0}
          icon={<Edit2 />}
          color={THEME.accent}
        />
        <StatCard
          label="Deletes"
          value={(actionStats.DELETE || 0) + (actionStats.REMOVE || 0)}
          icon={<Trash2 />}
          color={THEME.rust}
        />
      </div>

      {/* Recent Activity by day */}
      {dayStats.length > 0 && (
        <Card style={{ padding: 20 }}>
          <h3
            style={{
              margin: "0 0 12px",
              fontSize: 14,
              fontWeight: 600,
              color: THEME.text,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Calendar size={14} color={THEME.textSecondary} /> Recent Activity
          </h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {dayStats.map(([day, count]) => {
              const today = getLocalDateString(new Date());
              const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
              const label = day === today ? "Today" : day === yesterday ? "Yesterday" : day;
              return (
                <div
                  key={day}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    textAlign: "center",
                    background:
                      day === today
                        ? `color-mix(in srgb, ${THEME.accent} 8%, transparent)`
                        : THEME.bg,
                    border: `1px solid ${day === today ? THEME.accent : THEME.border}`,
                  }}
                >
                  <div style={{ fontSize: 10, color: THEME.textSecondary, marginBottom: 2 }}>
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: day === today ? THEME.accent : THEME.text,
                    }}
                  >
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Log entries card with inline filters */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {/* Filter bar */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            padding: "14px 16px",
            borderBottom: `1px solid ${THEME.border}`,
            background: THEME.bg,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flex: 1,
              minWidth: 200,
              padding: "7px 12px",
              borderRadius: 8,
              border: `1px solid ${THEME.border}`,
              background: THEME.card,
            }}
          >
            <Search size={13} color={THEME.textSecondary} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by description, type, or value…"
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                color: THEME.text,
                fontSize: 13,
                flex: 1,
              }}
            />
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            aria-label="Filter by action type"
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: `1px solid ${THEME.border}`,
              background: THEME.card,
              color: THEME.text,
              fontSize: 13,
            }}
          >
            <option value="all">All Actions</option>
            <option value="ADD">Adds</option>
            <option value="UPDATE">Updates</option>
            <option value="REMOVE">Deletes</option>
            <option value="EXPORT">Exports</option>
            <option value="IMPORT">Imports</option>
            <option value="RESET">Resets</option>
          </select>
          <select
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value);
              setPage(0);
            }}
            aria-label="Filter by date range"
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: `1px solid ${THEME.border}`,
              background: THEME.card,
              color: THEME.text,
              fontSize: 13,
            }}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          {filteredLogs.length > 0 && (
            <span style={{ fontSize: 12, color: THEME.textSecondary, flexShrink: 0 }}>
              {filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"}
            </span>
          )}
        </div>

        {/* Log list */}
        {loading ? (
          <div
            style={{ padding: 40, textAlign: "center", color: THEME.textSecondary, fontSize: 14 }}
          >
            Loading audit logs…
          </div>
        ) : groupedLogs.length > 0 ? (
          <div style={{ maxHeight: 640, overflowY: "auto" }}>
            {groupedLogs.map(({ date, label, items }) => (
              <div key={date}>
                {/* Date separator */}
                <div
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    padding: "8px 20px",
                    background: THEME.bg,
                    borderBottom: `1px solid ${THEME.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.textSecondary,
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "1px 7px",
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                      color: THEME.accent,
                    }}
                  >
                    {items.length}
                  </span>
                </div>

                {/* Entries for this day */}
                {items.map((log, i) => {
                  const Icon = getActionIcon(log.action_type);
                  const color = getActionColor(log.action_type);
                  const logKey = log.id || `${date}-${i}`;
                  const isExpanded = expandedId === logKey;
                  const isHovered = hoveredId === logKey;
                  const hasMetadata =
                    log.metadata &&
                    typeof log.metadata === "object" &&
                    Object.keys(log.metadata).length > 0;
                  const summary = getMetadataSummary(log.metadata, log.action_type);

                  return (
                    <div
                      key={logKey}
                      style={{
                        borderBottom: `1px solid ${THEME.border}`,
                        cursor: hasMetadata ? "pointer" : "default",
                        background:
                          isHovered || isExpanded
                            ? `color-mix(in srgb, ${color} 2%, transparent)`
                            : "transparent",
                        transition: "background 0.15s",
                      }}
                      onClick={() => hasMetadata && setExpandedId(isExpanded ? null : logKey)}
                      onMouseEnter={() => setHoveredId(logKey)}
                      onMouseLeave={() => setHoveredId(null)}
                      role={hasMetadata ? "button" : undefined}
                      tabIndex={hasMetadata ? 0 : undefined}
                      aria-expanded={hasMetadata ? isExpanded : undefined}
                      onKeyDown={(e) => {
                        if (hasMetadata && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          setExpandedId(isExpanded ? null : logKey);
                        }
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          padding: "12px 20px",
                          alignItems: "flex-start",
                        }}
                      >
                        {/* Icon */}
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 9,
                            background: `color-mix(in srgb, ${color} 9%, transparent)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: 1,
                            border: `1px solid color-mix(in srgb, ${color} 15%, transparent)`,
                          }}
                        >
                          <Icon size={14} color={color} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Title row */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "baseline",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: THEME.text,
                                lineHeight: 1.4,
                              }}
                            >
                              {log.description || log.action_type}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: THEME.textSecondary,
                                flexShrink: 0,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {formatTime(log.created_at)}
                            </span>
                          </div>

                          {/* Badge + summary row */}
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              alignItems: "center",
                              marginTop: 4,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 5,
                                fontSize: 10,
                                fontWeight: 700,
                                background: `color-mix(in srgb, ${color} 9%, transparent)`,
                                color,
                                letterSpacing: "0.3px",
                                border: `1px solid color-mix(in srgb, ${color} 19%, transparent)`,
                              }}
                            >
                              {getActionLabel(log.action_type)}
                            </span>

                            {summary && !isExpanded && (
                              <span
                                style={{
                                  fontSize: 11,
                                  color: THEME.textSecondary,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: 400,
                                }}
                              >
                                {summary}
                              </span>
                            )}

                            {hasMetadata && (
                              <span
                                style={{
                                  marginLeft: "auto",
                                  color: THEME.textSecondary,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 3,
                                  fontSize: 11,
                                  flexShrink: 0,
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronDown size={12} />
                                ) : (
                                  <ChevronRight size={12} />
                                )}
                                {isExpanded ? "Less" : "Details"}
                              </span>
                            )}
                          </div>

                          {/* Expanded details */}
                          {isExpanded && renderMetadataDetails(log.metadata, log.action_type)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Pagination */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                padding: 14,
                borderTop: `1px solid ${THEME.border}`,
                background: THEME.bg,
              }}
            >
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                style={{
                  padding: "6px 16px",
                  borderRadius: 7,
                  border: `1px solid ${THEME.border}`,
                  background: THEME.card,
                  color: THEME.text,
                  cursor: page > 0 ? "pointer" : "default",
                  opacity: page > 0 ? 1 : 0.4,
                  fontSize: 13,
                }}
              >
                Previous
              </button>
              <span style={{ padding: "6px 12px", fontSize: 13, color: THEME.textSecondary }}>
                Page {page + 1}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={filteredLogs.length < PAGE_SIZE}
                style={{
                  padding: "6px 16px",
                  borderRadius: 7,
                  border: `1px solid ${THEME.border}`,
                  background: THEME.card,
                  color: THEME.text,
                  cursor: filteredLogs.length >= PAGE_SIZE ? "pointer" : "default",
                  opacity: filteredLogs.length >= PAGE_SIZE ? 1 : 0.4,
                  fontSize: 13,
                }}
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Clock}
            title="No Activity Logs"
            description={
              session?.user?.id === "offline-user"
                ? "Audit logs are only available when logged in to Supabase."
                : searchTerm || filterAction !== "all"
                  ? "No logs match your current filters."
                  : "No actions recorded yet. As you add, edit, or delete data, it will be tracked here."
            }
          />
        )}
      </Card>
    </div>
  );
};
