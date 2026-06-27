// @ts-nocheck
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Clock,
  Filter,
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
} from "lucide-react";
import { supabase } from "../../supabaseClient";
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

export const AuditLogTab = ({ session }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [dateRange, setDateRange] = useState("30"); // days
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const fetchLogs = useCallback(async () => {
    if (!session?.user?.id || session.user.id === "offline-user") {
      setLoading(false);
      return;
    }
    setLoading(true);
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
      if (!error && data) setLogs(data);
    } catch (e) {
      console.error("Failed to fetch logs", e);
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
      list = list.filter((l) =>
        (l.description || "").toLowerCase().includes(term) ||
        (l.action_type || "").toLowerCase().includes(term) ||
        (l.metadata && JSON.stringify(l.metadata).toLowerCase().includes(term))
      );
    }
    return list;
  }, [logs, filterAction, searchTerm]);

  const actionStats = useMemo(() => {
    const stats = {};
    logs.forEach((l) => {
      const action = (l.action_type || "UNKNOWN").split("_")[0];
      stats[action] = (stats[action] || 0) + 1;
    });
    return stats;
  }, [logs]);

  const dayStats = useMemo(() => {
    const byDay = {};
    logs.forEach((l) => {
      const day = l.created_at?.slice(0, 10) || "unknown";
      byDay[day] = (byDay[day] || 0) + 1;
    });
    return Object.entries(byDay).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7);
  }, [logs]);

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };

  const getActionColor = (action) => {
    const type = (action || "").split("_")[0];
    return ACTION_COLORS[type] || THEME.textSecondary;
  };

  const getActionIcon = (action) => {
    const type = (action || "").split("_")[0];
    return ACTION_ICONS[type] || Activity;
  };

  const [expandedId, setExpandedId] = useState(null);

  const SKIP_KEYS = new Set(["id", "user_id", "userId", "created_at", "updated_at", "createdAt", "updatedAt"]);

  const LABEL_MAP = {
    symbol: "Symbol", exchange: "Exchange", qty: "Quantity", buy_price: "Buy Price",
    buyPrice: "Buy Price", buy_date: "Buy Date", buyDate: "Buy Date", name: "Name",
    bank: "Bank", amount: "Amount", balance: "Balance", type: "Type",
    accountType: "Account Type", account_type: "Account Type", description: "Description",
    category: "Category", date: "Date", scheme: "Scheme", nav: "NAV", units: "Units",
    invested: "Invested", current_value: "Current Value", currentValue: "Current Value",
    maturity_date: "Maturity Date", maturityDate: "Maturity Date", interest_rate: "Interest Rate",
    interestRate: "Interest Rate", principal: "Principal", tenure: "Tenure",
    cardName: "Card Name", card_name: "Card Name", credit_limit: "Credit Limit",
    creditLimit: "Credit Limit", outstanding: "Outstanding", due_date: "Due Date",
    dueDate: "Due Date", lender: "Lender", borrower: "Borrower", emi: "EMI",
    remaining: "Remaining", institution: "Institution", employer: "Employer",
    insurer: "Insurer", premium: "Premium", sum_assured: "Sum Assured",
    sumAssured: "Sum Assured", cover: "Cover", title: "Title", target: "Target",
    current: "Current", frequency: "Frequency", owner: "Owner", broker: "Broker",
    fundName: "Fund Name", fund_name: "Fund Name", folio: "Folio", folio_number: "Folio Number",
    folioNumber: "Folio Number", pran: "PRAN", account_number: "Account Number",
    accountNumber: "Account Number", brand: "Brand", model: "Model",
    registrationNumber: "Reg Number", registration_number: "Reg Number",
    weight: "Weight", purity: "Purity", address: "Address", person: "Person",
    source: "Source", fundManager: "Fund Manager", fund_manager: "Fund Manager",
    lenderBorrower: "Lender/Borrower", lender_borrower: "Lender/Borrower",
    patch: "Changed Fields", fileName: "File Name",
  };

  const formatDetailValue = (val) => {
    if (val === null || val === undefined || val === "") return "—";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (typeof val === "number") return val.toLocaleString("en-IN");
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      try { return new Date(val).toLocaleDateString("en-IN", { dateStyle: "medium" }); } catch { return val; }
    }
    if (Array.isArray(val)) return val.length ? val.join(", ") : "—";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  const renderMetadataDetails = (metadata, actionType) => {
    if (!metadata || typeof metadata !== "object") return null;

    const isUpdate = (actionType || "").startsWith("UPDATE");
    const entries = [];

    if (isUpdate && metadata.patch && typeof metadata.patch === "object") {
      Object.entries(metadata.patch).forEach(([k, v]) => {
        if (!SKIP_KEYS.has(k)) entries.push([k, v]);
      });
    } else {
      Object.entries(metadata).forEach(([k, v]) => {
        if (!SKIP_KEYS.has(k) && typeof v !== "object") entries.push([k, v]);
      });
      Object.entries(metadata).forEach(([k, v]) => {
        if (!SKIP_KEYS.has(k) && typeof v === "object" && v !== null && k !== "patch") entries.push([k, v]);
      });
    }

    if (!entries.length) return null;

    return (
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "4px 12px", padding: "10px 14px",
        background: THEME.bg, borderRadius: 8, marginTop: 8, fontSize: 12 }}>
        {isUpdate && (
          <div style={{ gridColumn: "1 / -1", fontSize: 11, fontWeight: 600, color: THEME.accent, marginBottom: 4,
            textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Fields Changed
          </div>
        )}
        {entries.map(([k, v]) => (
          <React.Fragment key={k}>
            <span style={{ color: THEME.textSecondary, fontWeight: 500 }}>{LABEL_MAP[k] || k}</span>
            <span style={{ color: THEME.text, wordBreak: "break-word" }}>{formatDetailValue(v)}</span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  const getMetadataSummary = (metadata, actionType) => {
    if (!metadata || typeof metadata !== "object") return null;

    const isUpdate = (actionType || "").startsWith("UPDATE");
    const source = isUpdate && metadata.patch ? metadata.patch : metadata;
    const pairs = [];

    Object.entries(source).forEach(([k, v]) => {
      if (SKIP_KEYS.has(k) || typeof v === "object") return;
      const label = LABEL_MAP[k] || k;
      pairs.push(`${label}: ${formatDetailValue(v)}`);
    });

    return pairs.length ? pairs.slice(0, 3).join(" · ") : null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle sub="Track all changes and actions in your financial data">Audit Log</SectionTitle>
        <Button variant="ghost" size="sm" onClick={fetchLogs}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <StatCard label="Total Actions" value={logs.length} icon={<Activity />} color="var(--accent)" />
        <StatCard label="Adds" value={actionStats.ADD || 0} icon={<Plus />} color={THEME.sage} />
        <StatCard label="Updates" value={actionStats.UPDATE || 0} icon={<Edit2 />} color={THEME.accent} />
        <StatCard label="Deletes" value={(actionStats.DELETE || 0) + (actionStats.REMOVE || 0)} icon={<Trash2 />} color={THEME.rust} />
      </div>

      {/* Activity heatmap (last 7 days) */}
      {dayStats.length > 0 && (
        <Card style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: THEME.text }}>Recent Activity</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {dayStats.map(([day, count]) => (
              <div key={day} style={{ padding: "8px 14px", borderRadius: 8, background: THEME.bg, border: `1px solid ${THEME.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: THEME.textSecondary }}>{day}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{count}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 200, padding: "6px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.bg }}>
            <Search size={14} color={THEME.textSecondary} />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search logs..."
              style={{ border: "none", outline: "none", background: "transparent", color: THEME.text, fontSize: 13, flex: 1 }} />
          </div>
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 13 }}>
            <option value="all">All Actions</option>
            <option value="ADD">Adds</option>
            <option value="UPDATE">Updates</option>
            <option value="REMOVE">Deletes</option>
            <option value="EXPORT">Exports</option>
            <option value="IMPORT">Imports</option>
            <option value="RESET">Resets</option>
          </select>
          <select value={dateRange} onChange={(e) => { setDateRange(e.target.value); setPage(0); }}
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 13 }}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </Card>

      {/* Log entries */}
      {loading ? (
        <Card style={{ padding: 40, textAlign: "center", color: THEME.textSecondary }}>Loading audit logs...</Card>
      ) : filteredLogs.length > 0 ? (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ maxHeight: 600, overflowY: "auto" }}>
            {filteredLogs.map((log, i) => {
              const Icon = getActionIcon(log.action_type);
              const color = getActionColor(log.action_type);
              const logKey = log.id || i;
              const isExpanded = expandedId === logKey;
              const hasMetadata = log.metadata && typeof log.metadata === "object" && Object.keys(log.metadata).length > 0;
              const summary = getMetadataSummary(log.metadata, log.action_type);

              return (
                <div key={logKey}
                  style={{ borderBottom: `1px solid ${THEME.border}`, cursor: hasMetadata ? "pointer" : "default" }}
                  onClick={() => hasMetadata && setExpandedId(isExpanded ? null : logKey)}>
                  <div style={{ display: "flex", gap: 12, padding: "12px 20px", alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      <Icon size={14} color={color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>{log.description || log.action_type}</span>
                        <span style={{ fontSize: 11, color: THEME.textSecondary, flexShrink: 0, marginLeft: 8 }}>{formatDate(log.created_at)}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: `${color}15`, color }}>
                          {log.action_type}
                        </span>
                        {summary && !isExpanded && (
                          <span style={{ fontSize: 11, color: THEME.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {summary}
                          </span>
                        )}
                        {hasMetadata && (
                          <span style={{ marginLeft: "auto", color: THEME.textSecondary, display: "flex", alignItems: "center", gap: 2, fontSize: 10, flexShrink: 0 }}>
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            <span>{isExpanded ? "Less" : "Details"}</span>
                          </span>
                        )}
                      </div>
                      {isExpanded && renderMetadataDetails(log.metadata, log.action_type)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: 12, borderTop: `1px solid ${THEME.border}` }}>
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, cursor: page > 0 ? "pointer" : "default", opacity: page > 0 ? 1 : 0.5, fontSize: 13 }}>
              Previous
            </button>
            <span style={{ padding: "6px 14px", fontSize: 13, color: THEME.textSecondary }}>Page {page + 1}</span>
            <button onClick={() => setPage(page + 1)} disabled={filteredLogs.length < PAGE_SIZE}
              style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, cursor: filteredLogs.length >= PAGE_SIZE ? "pointer" : "default", opacity: filteredLogs.length >= PAGE_SIZE ? 1 : 0.5, fontSize: 13 }}>
              Next
            </button>
          </div>
        </Card>
      ) : (
        <EmptyState icon={Clock} title="No Activity Logs"
          description={session?.user?.id === "offline-user" ? "Audit logs are only available when logged in to Supabase." : "No actions recorded yet. As you add, edit, or delete data, it will be tracked here."} />
      )}
    </div>
  );
};
