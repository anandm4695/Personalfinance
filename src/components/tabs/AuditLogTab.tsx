import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Clock,
  Search,
  Activity,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronRight,
  Calendar,
  AlertTriangle,
  X,
  ShieldCheck,
  Code,
  Copy,
  Check,
  TrendingUp,
  SlidersHorizontal,
  FileSpreadsheet,
  FileJson,
  Layers,
  ArrowUpRight,
  Database,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { getLocalDateString, maskCurrencyInText } from "../../utils/finance";
import { THEME } from "../../utils/constants";
import { usePrivacy } from "../../context/PrivacyContext";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonTableRows } from "../ui/Skeleton";

// Action Colors using theme tokens with graceful fallbacks
const ACTION_COLORS: Record<string, string> = {
  ADD: THEME.sage || "#10b981",
  UPDATE: THEME.accent || "#6366f1",
  DELETE: THEME.rust || "#ef4444",
  REMOVE: THEME.rust || "#ef4444",
  UPDATE_SETTINGS: THEME.violet || "#8b5cf6",
  UPDATE_PROFILE: THEME.gold || "#f59e0b",
  IMPORT: THEME.pink || "#ec4899",
  EXPORT: THEME.cyan || "#06b6d4",
  RESET: THEME.rust || "#ef4444",
};

const ACTION_ICONS: Record<string, any> = {
  ADD: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
  REMOVE: Trash2,
  UPDATE_SETTINGS: SlidersHorizontal,
  UPDATE_PROFILE: FileText,
  IMPORT: ArrowUpRight,
  EXPORT: ArrowUpRight,
  RESET: RefreshCw,
};

const ACTION_LABELS: Record<string, string> = {
  ADD: "Add",
  UPDATE: "Update",
  UPDATE_NPS: "Update NPS",
  UPDATE_EPF: "Update EPF",
  UPDATE_PPF: "Update PPF",
  UPDATE_MF: "Update MF",
  UPDATE_STOCKS: "Update Stocks",
  UPDATE_SETTINGS: "Settings Modified",
  UPDATE_PROFILE: "Profile Updated",
  DELETE: "Deleted",
  REMOVE: "Removed",
  IMPORT: "Imported",
  EXPORT: "Exported",
  RESET: "System Reset",
  BULK_DELETE_TRANSACTIONS: "Bulk Delete",
  BATCH_ADD_TRANSACTIONS: "Batch Import",
};

const MODULE_DEFINITIONS: Record<
  string,
  { label: string; icon: any; color: string; keywords: string[] }
> = {
  all: { label: "All Modules", icon: Layers, color: THEME.accent, keywords: [] },
  investments: {
    label: "Investments",
    icon: TrendingUp,
    color: THEME.sage,
    keywords: ["STOCK", "MF", "MUTUAL", "NPS", "EPF", "PPF", "FD", "RD", "GOLD", "SILVER", "VALUABLE", "SOVEREIGN", "DEPOSIT"],
  },
  banking: {
    label: "Banking & Txns",
    icon: Activity,
    color: THEME.cyan,
    keywords: ["BANK", "TRANSACTION", "SALARY", "BUDGET", "BATCH_ADD_TRANSACTIONS", "BULK_DELETE_TRANSACTIONS"],
  },
  assets: {
    label: "Assets & Realty",
    icon: Database,
    color: THEME.gold,
    keywords: ["REALESTATE", "REAL_ESTATE", "PROPERTY", "RENTAL", "VEHICLE"],
  },
  liabilities: {
    label: "Loans & Cards",
    icon: Clock,
    color: THEME.violet,
    keywords: ["LOAN", "CREDIT", "CARD", "DEBT", "EMI", "BORROW"],
  },
  insurance: {
    label: "Insurance",
    icon: ShieldCheck,
    color: THEME.pink,
    keywords: ["INSURANCE", "POLICY", "COVER", "PREMIUM", "NOMINEE"],
  },
  system: {
    label: "System & Settings",
    icon: SlidersHorizontal,
    color: THEME.accent,
    keywords: ["SETTING", "PROFILE", "IMPORT", "EXPORT", "RESET", "BACKUP"],
  },
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

// Fields carrying monetary values or account-identifying numbers — masked in the UI
// when Privacy Mode is on, same as everywhere else in the app.
const SENSITIVE_KEYS = new Set([
  "amount",
  "balance",
  "invested",
  "current_value",
  "currentValue",
  "principal",
  "outstanding",
  "credit_limit",
  "creditLimit",
  "sum_assured",
  "sumAssured",
  "premium",
  "emi",
  "remaining",
  "target",
  "current",
  "cover",
  "account_number",
  "accountNumber",
  "pran",
  "folio",
  "folio_number",
  "folioNumber",
  "nav",
  "buy_price",
  "buyPrice",
  "weight",
]);

const getActionBucket = (actionType: string): string => {
  const a = (actionType || "").toUpperCase();
  if (a.includes("REMOVE") || a.includes("DELETE")) return "REMOVE";
  if (a.includes("ADD")) return "ADD";
  if (a.includes("UPDATE")) return "UPDATE";
  if (a.includes("IMPORT")) return "IMPORT";
  if (a.includes("EXPORT")) return "EXPORT";
  if (a.includes("RESET")) return "RESET";
  return "UNKNOWN";
};

const getModuleForAction = (actionType: string): string => {
  const a = (actionType || "").toUpperCase();
  for (const [modKey, def] of Object.entries(MODULE_DEFINITIONS)) {
    if (modKey === "all") continue;
    if (def.keywords.some((kw) => a.includes(kw))) {
      return modKey;
    }
  }
  return "system";
};

const isHighImpactAction = (actionType: string): boolean => {
  const a = (actionType || "").toUpperCase();
  return (
    a.includes("RESET") ||
    a.includes("BULK_DELETE") ||
    a.includes("REMOVE") ||
    a.includes("DELETE")
  );
};

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

const formatDetailValue = (val: any, masked?: boolean): string => {
  if (masked) return "••••••";
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return val.toLocaleString("en-IN");
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    try {
      const hasTime = /\d{4}-\d{2}-\d{2}T/.test(val);
      return new Date(hasTime ? val : `${val}T00:00:00`).toLocaleDateString("en-IN", {
        dateStyle: "medium",
      });
    } catch {
      return val;
    }
  }
  if (Array.isArray(val)) {
    if (!val.length) return "—";
    if (typeof val[0] !== "object") return val.join(", ");
    return `${val.length} record${val.length !== 1 ? "s" : ""}`;
  }
  if (typeof val === "object") {
    const entries = Object.entries(val).filter(([, v]) => typeof v !== "object");
    if (entries.length <= 4)
      return entries.map(([k, v]) => `${LABEL_MAP[k] || k}: ${v}`).join(" · ") || "—";
    return `${entries.length} fields`;
  }
  return String(val);
};

const formatRelativeTime = (isoString: string): string => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHour / 24);

    if (diffSec < 45) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
};

const getMetadataSummary = (
  metadata: any,
  actionType: string,
  privacyMode: boolean
): string | null => {
  if (!metadata || typeof metadata !== "object") return null;
  const isUpdate = (actionType || "").startsWith("UPDATE");
  const source = isUpdate && metadata.patch ? metadata.patch : metadata;
  const pairs: string[] = [];
  Object.entries(source).forEach(([k, v]) => {
    if (SKIP_KEYS.has(k) || k === "patch") return;
    const label = LABEL_MAP[k] || k.replace(/_/g, " ");
    const masked = privacyMode && SENSITIVE_KEYS.has(k);
    if (masked) {
      pairs.push(`${label}: ••••••`);
      return;
    }
    if (Array.isArray(v)) {
      if (typeof v[0] === "object")
        pairs.push(`${label}: ${v.length} record${v.length !== 1 ? "s" : ""}`);
      else pairs.push(`${label}: ${v.join(", ")}`);
      return;
    }
    if (typeof v === "object") return;
    pairs.push(`${label}: ${formatDetailValue(v)}`);
  });
  return pairs.length ? pairs.slice(0, 3).join("  •  ") : null;
};

export const AuditLogTab = ({ session }: { session?: any }) => {
  const { privacyMode } = usePrivacy();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterModule, setFilterModule] = useState("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<Record<string, "structured" | "raw">>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

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
      if (dateRange !== "all") {
        cutoff.setDate(cutoff.getDate() - Number(dateRange));
      } else {
        cutoff.setFullYear(2000);
      }

      let query = supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", session.user.id);

      if (dateRange !== "all") {
        query = query.gte("created_at", cutoff.toISOString());
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (!error && data) {
        setLogs(data);
      } else if (error) {
        console.error("Failed to fetch logs:", error.message);
        setFetchError(`Failed to load audit log: ${error.message}`);
      }
    } catch (e: any) {
      console.error("Audit log fetch error:", e);
      setFetchError(`Failed to load audit log: ${e?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, [session, dateRange, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // created_at is a UTC timestamptz from Supabase — bucket by the LOCAL calendar day
  const localDay = (iso: string) => (iso ? getLocalDateString(new Date(iso)) : "unknown");

  // Filtering logic
  const filteredLogs = useMemo(() => {
    let list = logs;

    if (filterAction !== "all") {
      list = list.filter((l) => getActionBucket(l.action_type) === filterAction);
    }

    if (filterModule !== "all") {
      list = list.filter((l) => getModuleForAction(l.action_type) === filterModule);
    }

    if (selectedDay) {
      list = list.filter((l) => localDay(l.created_at) === selectedDay);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((l) => {
        const descMatch = (l.description || "").toLowerCase().includes(term);
        const actionMatch = (l.action_type || "").toLowerCase().includes(term);
        const metaMatch = l.metadata && JSON.stringify(l.metadata).toLowerCase().includes(term);
        return descMatch || actionMatch || metaMatch;
      });
    }

    return list;
  }, [logs, filterAction, filterModule, selectedDay, searchTerm]);

  // Aggregate Stats
  const actionStats = useMemo(() => {
    const stats: Record<string, number> = {
      ADD: 0,
      UPDATE: 0,
      REMOVE: 0,
      HIGH_IMPACT: 0,
      MODULES: 0,
    };
    const activeMods = new Set<string>();

    logs.forEach((l) => {
      const bucket = getActionBucket(l.action_type);
      stats[bucket] = (stats[bucket] || 0) + 1;
      if (isHighImpactAction(l.action_type)) {
        stats.HIGH_IMPACT += 1;
      }
      activeMods.add(getModuleForAction(l.action_type));
    });
    stats.MODULES = activeMods.size;
    return stats;
  }, [logs]);

  // Daily activity distribution (last 10 days)
  const dayDistribution = useMemo(() => {
    const byDay: Record<string, number> = {};
    logs.forEach((l) => {
      const day = localDay(l.created_at);
      byDay[day] = (byDay[day] || 0) + 1;
    });

    return Object.entries(byDay)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 10);
  }, [logs]);

  const maxDayCount = useMemo(() => {
    return Math.max(...dayDistribution.map(([, c]) => c), 1);
  }, [dayDistribution]);

  // Group filtered logs by calendar date for timeline headers
  const groupedLogs = useMemo(() => {
    const groups: { date: string; label: string; fullDate: string; items: typeof filteredLogs }[] = [];
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
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                });
        const fullDate = d.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        groups.push({ date: day, label, fullDate, items: [] });
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

  const formatFullTimestamp = (iso: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const getActionColor = (action: string) => {
    return ACTION_COLORS[action] || ACTION_COLORS[getActionBucket(action)] || THEME.textSecondary;
  };

  const getActionIcon = (action: string) => {
    return ACTION_ICONS[action] || ACTION_ICONS[getActionBucket(action)] || Activity;
  };

  const getActionLabel = (action: string) => {
    return ACTION_LABELS[action] || action?.replace(/_/g, " ") || "Action";
  };

  // Export handlers
  const exportCSV = () => {
    if (!filteredLogs.length) return;
    const headers = ["Timestamp (Local)", "Date", "Time", "Module", "Action", "Description", "Details", "Action Type"];
    const rows = filteredLogs.map((l) => [
      formatFullTimestamp(l.created_at),
      localDay(l.created_at),
      formatTime(l.created_at),
      MODULE_DEFINITIONS[getModuleForAction(l.action_type)]?.label || "General",
      getActionLabel(l.action_type),
      l.description || l.action_type || "",
      getMetadataSummary(l.metadata, l.action_type, false) || "",
      l.action_type,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${getLocalDateString(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotice("CSV Audit Trail Exported Successfully");
  };

  const exportJSON = () => {
    if (!filteredLogs.length) return;
    const payload = {
      auditExportVersion: "2.0",
      generatedAt: new Date().toISOString(),
      recordCount: filteredLogs.length,
      user_id: session?.user?.id ? "PROTECTED_USER" : "ANONYMOUS",
      entries: filteredLogs,
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-trail-${getLocalDateString(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotice("JSON Audit Log Bundle Exported Successfully");
  };

  const copyToClipboard = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const showNotice = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const renderMetadataDetails = (log: any) => {
    const { metadata, action_type, id } = log;
    const isRaw = viewMode[id] === "raw";

    if (!metadata || typeof metadata !== "object") {
      return (
        <div
          style={{
            marginTop: 10,
            padding: "10px 14px",
            borderRadius: 8,
            background: "var(--surface-2, rgba(0,0,0,0.03))",
            fontSize: 12,
            color: THEME.textSecondary,
            fontStyle: "italic",
          }}
        >
          No additional metadata recorded with this event.
        </div>
      );
    }

    const isUpdate = (action_type || "").startsWith("UPDATE");
    const source = isUpdate && metadata.patch && typeof metadata.patch === "object" ? metadata.patch : metadata;

    const primitiveEntries: [string, any][] = [];
    const arrayEntries: [string, any][] = [];
    const objectEntries: [string, any][] = [];

    Object.entries(source).forEach(([k, v]) => {
      if (SKIP_KEYS.has(k) || k === "patch") return;
      if (Array.isArray(v)) arrayEntries.push([k, v]);
      else if (typeof v === "object" && v !== null) objectEntries.push([k, v]);
      else primitiveEntries.push([k, v]);
    });

    const allEntries = [...primitiveEntries, ...arrayEntries, ...objectEntries];

    return (
      <div
        style={{
          marginTop: 12,
          borderRadius: 12,
          border: `1px solid ${THEME.border}`,
          background: "var(--surface-1, rgba(255,255,255,0.03))",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}
      >
        {/* Sub-header with view toggles & copy payload */}
        <div
          style={{
            padding: "8px 14px",
            background: `color-mix(in srgb, ${THEME.card} 80%, ${THEME.bg})`,
            borderBottom: `1px solid ${THEME.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: isUpdate ? THEME.accent : THEME.textSecondary,
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {isUpdate ? <Pencil size={11} /> : <Database size={11} />}
              {isUpdate ? "Changed Attributes & Diff" : "Event Properties"}
            </span>
            <span
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 4,
                background: "var(--surface-2, rgba(0,0,0,0.05))",
                color: THEME.textSecondary,
                fontFamily: "monospace",
              }}
            >
              {allEntries.length} field{allEntries.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewMode((prev) => ({
                  ...prev,
                  [id]: prev[id] === "raw" ? "structured" : "raw",
                }));
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                border: `1px solid ${THEME.border}`,
                background: isRaw ? THEME.accent : THEME.card,
                color: isRaw ? "#fff" : THEME.text,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Code size={11} />
              {isRaw ? "Structured View" : "Raw JSON"}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(JSON.stringify(metadata, null, 2), id);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                border: `1px solid ${THEME.border}`,
                background: THEME.card,
                color: copiedId === id ? THEME.sage : THEME.textSecondary,
                cursor: "pointer",
              }}
              title="Copy event payload"
            >
              {copiedId === id ? <Check size={11} color={THEME.sage} /> : <Copy size={11} />}
              {copiedId === id ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Payload content */}
        {isRaw ? (
          <div
            style={{
              padding: "12px 14px",
              background: "var(--code-bg, #0f172a)",
              color: "#e2e8f0",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 11.5,
              lineHeight: 1.5,
              overflowX: "auto",
              maxHeight: 280,
            }}
          >
            <pre style={{ margin: 0 }}>
              {JSON.stringify(
                privacyMode
                  ? Object.fromEntries(
                      Object.entries(metadata).map(([k, v]) => [
                        k,
                        SENSITIVE_KEYS.has(k) ? "••••••" : v,
                      ])
                    )
                  : metadata,
                null,
                2
              )}
            </pre>
          </div>
        ) : (
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 8,
              }}
            >
              {allEntries.map(([k, v]) => {
                const masked = privacyMode && SENSITIVE_KEYS.has(k);
                const isSensitive = SENSITIVE_KEYS.has(k);

                return (
                  <div
                    key={k}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: `1px solid ${THEME.border}`,
                      background: isUpdate
                        ? `color-mix(in srgb, ${THEME.accent} 3%, ${THEME.card})`
                        : THEME.card,
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: THEME.textSecondary,
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        {LABEL_MAP[k] || k.replace(/_/g, " ")}
                      </span>
                      {isSensitive && (
                        <span
                          title="Sensitive financial field"
                          style={{
                            fontSize: 9,
                            padding: "1px 4px",
                            borderRadius: 3,
                            background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                            color: THEME.accent,
                            fontWeight: 600,
                          }}
                        >
                          {privacyMode ? "Masked" : "Sensitive"}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: THEME.text,
                        wordBreak: "break-word",
                        letterSpacing: masked ? "0.15em" : "normal",
                      }}
                    >
                      {formatDetailValue(v, masked)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Audit Context Footer */}
            <div
              style={{
                marginTop: 6,
                paddingTop: 8,
                borderTop: `1px dashed ${THEME.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 10.5,
                color: THEME.textSecondary,
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <span>
                Event ID: <code style={{ fontFamily: "monospace" }}>{log.id?.slice(0, 12) || "system-gen"}</code>
              </span>
              <span>
                Timestamp (UTC): <code style={{ fontFamily: "monospace" }}>{log.created_at || "—"}</code>
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const isGuestOrOffline = !session?.user?.id || session.user.id === "offline-user";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Styles for responsive focus & animation */}
      <style>{`
        .audit-search-wrap:focus-within {
          border-color: var(--t-accent) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--t-accent) 14%, transparent);
        }
        .audit-log-row {
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .audit-log-row:hover {
          background: color-mix(in srgb, var(--t-accent) 4%, transparent);
        }
        .audit-bar-item {
          transition: transform 0.15s ease, background 0.15s ease;
          cursor: pointer;
        }
        .audit-bar-item:hover {
          transform: translateY(-2px);
        }
      `}</style>

      {/* Header with Title, Badges and Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <SectionTitle sub="Comprehensive tamper-evident financial lineage and audit trail">
              Audit & Activity Log
            </SectionTitle>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Badge variant="sage" size="xs">
                <ShieldCheck size={10} style={{ marginRight: 3, display: "inline" }} />
                Immutable Trail
              </Badge>
              {privacyMode ? (
                <Badge variant="violet" size="xs">
                  <EyeOff size={10} style={{ marginRight: 3, display: "inline" }} />
                  Privacy Active
                </Badge>
              ) : (
                <Badge variant="accent" size="xs">
                  <Eye size={10} style={{ marginRight: 3, display: "inline" }} />
                  Live View
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={exportCSV}
            disabled={!filteredLogs.length || loading}
            title="Download CSV report of filtered logs"
          >
            <FileSpreadsheet size={14} /> Export CSV
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={exportJSON}
            disabled={!filteredLogs.length || loading}
            title="Export JSON audit package for compliance/auditors"
          >
            <FileJson size={14} /> Export JSON
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            title="Fetch latest audit updates from Supabase"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Syncing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Toast Notice */}
      {exportNotice && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
            border: `1px solid ${THEME.sage}`,
            color: THEME.sage,
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Check size={15} />
          {exportNotice}
        </div>
      )}

      {/* Fetch Error Warning */}
      {fetchError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            borderRadius: 10,
            background: `color-mix(in srgb, ${THEME.rust} 10%, transparent)`,
            border: `1px solid ${THEME.rust}`,
            color: THEME.rust,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={16} />
          {fetchError}
        </div>
      )}

      {/* Guest Mode Callout */}
      {isGuestOrOffline && (
        <Card
          style={{
            padding: "16px 20px",
            background: `color-mix(in srgb, ${THEME.accent} 6%, transparent)`,
            border: `1.5px solid ${THEME.accent}`,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Lock size={22} color={THEME.accent} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text }}>
              Cloud Audit Synchronization Inactive
            </div>
            <div style={{ fontSize: 12.5, color: THEME.textSecondary, marginTop: 2 }}>
              Audit logs are cryptographically linked and synchronized to your secure Supabase account. Sign in to capture persistent audit trails.
            </div>
          </div>
        </Card>
      )}

      {/* Executive KPI Stats Ribbon */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Total Audit Events"
          value={logs.length.toLocaleString("en-IN")}
          numericValue={logs.length}
          formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
          sub={`${dateRange === "all" ? "All Time" : `Last ${dateRange} Days`}`}
          icon={<Activity />}
          color={THEME.accent}
        />
        <StatCard
          label="Additions & Creates"
          value={(actionStats.ADD || 0).toLocaleString("en-IN")}
          numericValue={actionStats.ADD || 0}
          formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
          sub={logs.length ? `${Math.round(((actionStats.ADD || 0) / logs.length) * 100)}% of activity` : "0%"}
          icon={<Plus />}
          color={THEME.sage}
        />
        <StatCard
          label="Modifications"
          value={(actionStats.UPDATE || 0).toLocaleString("en-IN")}
          numericValue={actionStats.UPDATE || 0}
          formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
          sub={logs.length ? `${Math.round(((actionStats.UPDATE || 0) / logs.length) * 100)}% of activity` : "0%"}
          icon={<Pencil />}
          color={THEME.accent}
        />
        <StatCard
          label="High-Impact Deletions"
          value={((actionStats.REMOVE || 0) + (actionStats.HIGH_IMPACT || 0)).toLocaleString("en-IN")}
          numericValue={(actionStats.REMOVE || 0) + (actionStats.HIGH_IMPACT || 0)}
          formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
          sub="Deletions & Resets"
          icon={<Trash2 />}
          color={THEME.rust}
        />
        <StatCard
          label="Active Modules"
          value={(actionStats.MODULES || 0).toString()}
          numericValue={actionStats.MODULES || 0}
          formatValue={(n) => Math.round(n).toString()}
          sub="Categorized Areas"
          icon={<Layers />}
          color={THEME.gold}
        />
      </div>

      {/* Interactive Activity Heat-Strip / Day Distribution Bar */}
      {dayDistribution.length > 0 && (
        <Card style={{ padding: "16px 20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={15} color={THEME.accent} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: THEME.text }}>
                Daily Activity Distribution
              </span>
              <span style={{ fontSize: 11, color: THEME.textSecondary }}>
                (Click any day to filter timeline)
              </span>
            </div>
            {selectedDay && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                  color: THEME.accent,
                  border: `1px solid ${THEME.accent}`,
                  cursor: "pointer",
                }}
              >
                Filtered: {selectedDay} <X size={11} />
              </button>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(dayDistribution.length, 10)}, 1fr)`,
              gap: 8,
              alignItems: "flex-end",
              minHeight: 70,
            }}
          >
            {dayDistribution.map(([day, count]) => {
              const today = getLocalDateString(new Date());
              const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
              const isToday = day === today;
              const isSelected = selectedDay === day;
              const label = isToday ? "Today" : day === yesterday ? "Yest." : day.slice(5);
              const heightPct = Math.max(20, Math.round((count / maxDayCount) * 100));

              return (
                <div
                  key={day}
                  className="audit-bar-item"
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 4px",
                    borderRadius: 8,
                    background: isSelected
                      ? `color-mix(in srgb, ${THEME.accent} 15%, transparent)`
                      : "transparent",
                    border: isSelected
                      ? `1.5px solid ${THEME.accent}`
                      : "1px solid transparent",
                  }}
                  title={`${day}: ${count} actions recorded`}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isSelected || isToday ? THEME.accent : THEME.text,
                    }}
                  >
                    {count}
                  </span>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 32,
                      height: 36,
                      borderRadius: 6,
                      background: "var(--surface-2, rgba(0,0,0,0.05))",
                      display: "flex",
                      alignItems: "flex-end",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: `${heightPct}%`,
                        borderRadius: 4,
                        background: isSelected
                          ? THEME.accent
                          : isToday
                            ? `linear-gradient(to top, ${THEME.accent}, ${THEME.cyan})`
                            : THEME.sage,
                        transition: "height 0.3s ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? THEME.accent : THEME.textSecondary,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Main Audit Feed Card */}
      <Card style={{ padding: 0, overflow: "hidden", border: `1px solid ${THEME.border}` }}>
        {/* Module Filter Chips */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${THEME.border}`,
            background: THEME.bg,
            display: "flex",
            gap: 6,
            overflowX: "auto",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: THEME.textSecondary, marginRight: 4, textTransform: "uppercase" }}>
            Module:
          </span>
          {Object.entries(MODULE_DEFINITIONS).map(([modKey, def]) => {
            const isActive = filterModule === modKey;
            const Icon = def.icon;
            return (
              <button
                key={modKey}
                type="button"
                onClick={() => {
                  setFilterModule(modKey);
                  setPage(0);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 11px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  border: `1px solid ${isActive ? def.color : THEME.border}`,
                  background: isActive
                    ? `color-mix(in srgb, ${def.color} 14%, transparent)`
                    : THEME.card,
                  color: isActive ? def.color : THEME.text,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={12} />
                {def.label}
              </button>
            );
          })}
        </div>

        {/* Filter Controls Bar */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: `1px solid ${THEME.border}`,
            background: THEME.bg,
          }}
        >
          {/* Search box */}
          <div
            className="audit-search-wrap"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: 1,
              minWidth: 220,
              padding: "7px 12px",
              borderRadius: 8,
              border: `1.5px solid ${THEME.border}`,
              background: THEME.card,
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            <Search size={14} color={THEME.textSecondary} />
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              placeholder="Search description, action, entity, or amount…"
              aria-label="Search audit log"
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                color: THEME.text,
                fontSize: 13,
                flex: 1,
              }}
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchTerm("");
                  setPage(0);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: "none",
                  background: "var(--surface-2, rgba(0,0,0,0.1))",
                  color: THEME.textSecondary,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Action Type Filter */}
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setPage(0);
            }}
            aria-label="Filter by action type"
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: `1px solid ${THEME.border}`,
              background: THEME.card,
              color: THEME.text,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <option value="all">All Action Types</option>
            <option value="ADD">Additions Only</option>
            <option value="UPDATE">Modifications Only</option>
            <option value="REMOVE">Deletions Only</option>
            <option value="IMPORT">Imports</option>
            <option value="EXPORT">Exports</option>
            <option value="RESET">Resets</option>
          </select>

          {/* Date Range Selector */}
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
              fontWeight: 500,
            }}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 1 year</option>
            <option value="all">All Time</option>
          </select>

          {/* Active Results Summary */}
          {filteredLogs.length > 0 && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: THEME.textSecondary,
                padding: "4px 8px",
                borderRadius: 6,
                background: "var(--surface-2, rgba(0,0,0,0.04))",
                flexShrink: 0,
              }}
            >
              {filteredLogs.length} event{filteredLogs.length === 1 ? "" : "s"}
            </span>
          )}

          {/* Clear Filters Reset Button */}
          {(searchTerm || filterAction !== "all" || filterModule !== "all" || selectedDay) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setFilterAction("all");
                setFilterModule("all");
                setSelectedDay(null);
                setPage(0);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: THEME.rust,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Audit Timeline Event List */}
        {loading ? (
          <div style={{ padding: "24px 20px" }}>
            <SkeletonTableRows rows={7} columns={4} rowHeight={20} />
          </div>
        ) : groupedLogs.length > 0 ? (
          <div style={{ maxHeight: 680, overflowY: "auto" }}>
            {groupedLogs.map(({ date, label, fullDate, items }) => (
              <div key={date}>
                {/* Date Grouping Sticky Header */}
                <div
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    padding: "9px 20px",
                    background: THEME.bg,
                    borderBottom: `1px solid ${THEME.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Calendar size={13} color={THEME.accent} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: THEME.text,
                        letterSpacing: "0.4px",
                      }}
                    >
                      {label}
                    </span>
                    <span style={{ fontSize: 11, color: THEME.textSecondary }}>
                      {fullDate}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                      color: THEME.accent,
                    }}
                  >
                    {items.length} event{items.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Event Rows */}
                {items.map((log, i) => {
                  const Icon = getActionIcon(log.action_type);
                  const color = getActionColor(log.action_type);
                  const logKey = log.id || `${date}-${i}`;
                  const isExpanded = expandedId === logKey;
                  const isHovered = hoveredId === logKey;
                  const isHighImpact = isHighImpactAction(log.action_type);
                  const moduleKey = getModuleForAction(log.action_type);
                  const modDef = MODULE_DEFINITIONS[moduleKey] || MODULE_DEFINITIONS.system;

                  const hasMetadata =
                    log.metadata &&
                    typeof log.metadata === "object" &&
                    Object.keys(log.metadata).length > 0;
                  const summary = getMetadataSummary(log.metadata, log.action_type, privacyMode);
                  const relativeTime = formatRelativeTime(log.created_at);

                  return (
                    <div
                      key={logKey}
                      className="audit-log-row"
                      style={{
                        borderBottom: `1px solid ${THEME.border}`,
                        cursor: hasMetadata ? "pointer" : "default",
                        background: isExpanded
                          ? `color-mix(in srgb, ${color} 4%, var(--surface-1))`
                          : "transparent",
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
                          gap: 14,
                          padding: "13px 20px",
                          alignItems: "flex-start",
                        }}
                      >
                        {/* Action Icon Badge with Timeline Node */}
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: `color-mix(in srgb, ${color} 12%, transparent)`,
                            border: `1.5px solid color-mix(in srgb, ${color} 24%, transparent)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          <Icon size={16} color={color} />
                        </div>

                        {/* Event Content Body */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Top Row: Description + Relative Timestamp */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "baseline",
                              gap: 10,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span
                                style={{
                                  fontSize: 13.5,
                                  fontWeight: 600,
                                  color: THEME.text,
                                  lineHeight: 1.4,
                                }}
                              >
                                {maskCurrencyInText(log.description, privacyMode) || log.action_type}
                              </span>
                              {isHighImpact && (
                                <span
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: 800,
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                    background: `color-mix(in srgb, ${THEME.rust} 14%, transparent)`,
                                    color: THEME.rust,
                                    border: `1px solid color-mix(in srgb, ${THEME.rust} 30%, transparent)`,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                  }}
                                >
                                  High Impact
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                flexShrink: 0,
                              }}
                            >
                              {relativeTime && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: THEME.textSecondary,
                                  }}
                                >
                                  {relativeTime}
                                </span>
                              )}
                              <span
                                style={{
                                  fontSize: 11,
                                  color: THEME.textSecondary,
                                  fontVariantNumeric: "tabular-nums",
                                }}
                                title={formatFullTimestamp(log.created_at)}
                              >
                                {formatTime(log.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Secondary Row: Module Chip, Action Badge & Metadata Summary */}
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              alignItems: "center",
                              marginTop: 5,
                              flexWrap: "wrap",
                            }}
                          >
                            {/* Module Tag */}
                            <span
                              style={{
                                padding: "2px 7px",
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 600,
                                background: "var(--surface-2, rgba(0,0,0,0.05))",
                                color: THEME.textSecondary,
                                border: `1px solid ${THEME.border}`,
                              }}
                            >
                              {modDef.label}
                            </span>

                            {/* Action Type Badge */}
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                background: `color-mix(in srgb, ${color} 9%, transparent)`,
                                color,
                                letterSpacing: "0.3px",
                                border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
                              }}
                            >
                              {getActionLabel(log.action_type)}
                            </span>

                            {/* Quick Metadata Snippet */}
                            {summary && !isExpanded && (
                              <span
                                style={{
                                  fontSize: 11,
                                  color: THEME.textSecondary,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: 460,
                                }}
                              >
                                {summary}
                              </span>
                            )}

                            {/* Expand / Collapse Indicator */}
                            {hasMetadata && (
                              <span
                                style={{
                                  marginLeft: "auto",
                                  color: THEME.textSecondary,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 3,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  flexShrink: 0,
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronDown size={13} color={THEME.accent} />
                                ) : (
                                  <ChevronRight size={13} />
                                )}
                                {isExpanded ? "Collapse" : "Inspect"}
                              </span>
                            )}
                          </div>

                          {/* Deep Event Inspector Drawer */}
                          {isExpanded && renderMetadataDetails(log)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Pagination Controls */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 20px",
                borderTop: `1px solid ${THEME.border}`,
                background: THEME.bg,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 12, color: THEME.textSecondary }}>
                Showing page {page + 1} ({filteredLogs.length} events loaded)
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span style={{ padding: "4px 8px", fontSize: 12.5, fontWeight: 600, color: THEME.text }}>
                  Page {page + 1}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={logs.length < PAGE_SIZE}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Clock}
            title="No Activity Logs"
            description={
              isGuestOrOffline
                ? "Audit logs are securely tracked in the cloud when signed in to your Supabase personal account."
                : searchTerm || filterAction !== "all" || filterModule !== "all" || selectedDay
                  ? "No activity logs match your current filters. Try changing or clearing your search criteria."
                  : "No events recorded in this time window yet. As you manage investments, banking, and settings, your full lineage will be logged here."
            }
          />
        )}
      </Card>
    </div>
  );
};
