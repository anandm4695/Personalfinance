import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Coins,
  Landmark,
  Repeat,
  Shield,
  FileText,
  Heart,
  CreditCard,
  Bell,
  Building2,
  Star,
  Wallet,
  Car,
  Wrench,
  Users,
  Download,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  Milestone,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  BarChart3,
  ListFilter,
  Check,
  X,
  Info,
  Layers,
  Sparkles,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { THEME } from "../../utils/constants";
import {
  fmtINR,
  fmtINRFull,
  fmtINRExact,
  today,
  formatDateStandard,
} from "../../utils/finance";
import { useMilestoneEvents } from "../../hooks/useFinancialEvents";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { Money } from "../ui/Money";
import { Modal } from "../ui/Modal";

// Maps each event type to the tab a user would go to in order to actually act on it
const EVENT_TYPE_TO_TAB: Record<string, string> = {
  fd_maturity: "investments",
  rd_maturity: "investments",
  bond_maturity: "investments",
  ppf_maturity: "investments",
  dividend: "dividendcal",
  insurance_premium: "insurance",
  loan_closure: "credit",
  loan_given_repayment: "credit",
  cc_fee: "credit",
  prepaid_card_expiry: "credit",
  subscription: "subs",
  govt_scheme_maturity: "govtschemes",
  govt_scheme_premium: "govtschemes",
  realestate_demand: "realestate",
  vehicle_insurance: "vehicles",
  vehicle_puc: "vehicles",
  vehicle_service: "vehicles",
  health_insurance: "healthinsurance",
  life_event: "lifeevents",
  rent_receivable: "rental",
};

// Types representing Cash Inflows vs Cash Outflows
const INFLOW_TYPES = [
  "fd_maturity",
  "rd_maturity",
  "bond_maturity",
  "dividend",
  "ppf_maturity",
  "govt_scheme_maturity",
  "loan_given_repayment",
  "rent_receivable",
];

const OUTFLOW_TYPES = [
  "insurance_premium",
  "health_insurance",
  "cc_fee",
  "subscription",
  "govt_scheme_premium",
  "realestate_demand",
];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const FULL_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DISMISS_STORAGE_KEY = "finCalDismissedEvents_v1";
const loadDismissed = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};
const saveDismissed = (ids: Set<string>) => {
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* localStorage fallback */
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

const getUrgencyColor = (days: number) => {
  if (days < 0) return THEME.rust;
  if (days === 0) return THEME.gold;
  if (days <= 7) return THEME.rust;
  if (days <= 30) return THEME.gold;
  if (days <= 90) return THEME.accent;
  return THEME.sage;
};

const getUrgencyLabel = (days: number) => {
  if (days < 0) return `Overdue (${Math.abs(days)}d)`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `${days} days`;
  if (days <= 30) return `${days} days`;
  if (days <= 90) return `${Math.ceil(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
};

// Recharts custom tooltip
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const inflow = payload.find((p: any) => p.dataKey === "inflow")?.value || 0;
  const outflow = payload.find((p: any) => p.dataKey === "outflow")?.value || 0;
  const net = inflow - outflow;
  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--surface-0) 92%, var(--t-card-bg))",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1.5px solid ${THEME.line}`,
        borderRadius: 12,
        padding: "12px 16px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
        fontSize: 12,
        minWidth: 180,
      }}
    >
      <div style={{ fontWeight: 800, color: THEME.ink, marginBottom: 8, fontSize: 13 }}>
        {label}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: THEME.sage, marginBottom: 4 }}>
        <span>Inflows:</span>
        <span style={{ fontWeight: 700 }}>{fmtINR(inflow)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: THEME.rust, marginBottom: 6 }}>
        <span>Outflows:</span>
        <span style={{ fontWeight: 700 }}>{fmtINR(outflow)}</span>
      </div>
      <div
        style={{
          borderTop: `1px solid ${THEME.line}`,
          paddingTop: 6,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          fontWeight: 800,
          color: net >= 0 ? THEME.sage : THEME.rust,
        }}
      >
        <span>Net Cash Flow:</span>
        <span>{net >= 0 ? `+${fmtINR(net)}` : `-${fmtINR(Math.abs(net))}`}</span>
      </div>
    </div>
  );
};

export const FinancialCalendarTab = ({
  state,
  metrics,
  onNavigateToTab = undefined,
  embedded = false,
}: {
  state: any;
  metrics?: any;
  onNavigateToTab?: (tab: string) => void;
  embedded?: boolean;
}) => {
  // View mode
  const [viewMode, setViewMode] = useState<"agenda" | "grid" | "analytics">("agenda");

  // Filter & Search Controls
  const [horizon, setHorizon] = useState(6);
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState<"all" | "inflow" | "outflow" | "compliance">("all");
  const [activeCategory, setActiveCategory] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState<"all" | "overdue" | "7d" | "30d" | "later">("all");
  
  // Dismissed state
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const [showDismissed, setShowDismissed] = useState(false);

  // Inspection Modals
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: string; events: any[] } | null>(null);

  // Month grid navigation state (first day of current viewed month in calendar)
  const [currentGridMonth, setCurrentGridMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const toggleDismissed = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveDismissed(next);
      return next;
    });
  };

  const cutoffDate = useMemo(() => {
    const d = new Date(today());
    const day = d.getDate();
    const total = d.getMonth() + horizon;
    const y = d.getFullYear() + Math.floor(total / 12);
    const m = ((total % 12) + 12) % 12;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(day, daysInMonth)).toISOString().slice(0, 10);
  }, [horizon]);

  const rawEvents = useMilestoneEvents(state, cutoffDate);

  // Direction classification helper
  const getEventDirection = (type: string): "inflow" | "outflow" | "compliance" => {
    if (INFLOW_TYPES.includes(type)) return "inflow";
    if (OUTFLOW_TYPES.includes(type)) return "outflow";
    return "compliance";
  };

  // Comprehensive Filtering
  const filteredEvents = useMemo(() => {
    return rawEvents.filter((e) => {
      // 1. Dismissed check
      if (!showDismissed && dismissed.has(e.id)) return false;

      // 2. Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (e.name || "").toLowerCase().includes(q);
        const matchesCat = (e.category || "").toLowerCase().includes(q);
        const matchesDate = (e.date || "").includes(q);
        if (!matchesName && !matchesCat && !matchesDate) return false;
      }

      // 3. Direction filter
      const dir = getEventDirection(e.type);
      if (directionFilter !== "all" && dir !== directionFilter) return false;

      // 4. Category filter
      if (activeCategory !== "all" && !e.type.startsWith(activeCategory)) return false;

      // 5. Urgency filter
      if (urgencyFilter === "overdue" && e.days >= 0) return false;
      if (urgencyFilter === "7d" && (e.days < 0 || e.days > 7)) return false;
      if (urgencyFilter === "30d" && (e.days < 0 || e.days > 30)) return false;
      if (urgencyFilter === "later" && e.days <= 30) return false;

      return true;
    });
  }, [rawEvents, showDismissed, dismissed, searchQuery, directionFilter, activeCategory, urgencyFilter]);

  const dismissedCount = useMemo(
    () => rawEvents.filter((e) => dismissed.has(e.id)).length,
    [rawEvents, dismissed]
  );

  // Executive KPI Stats calculation
  const stats = useMemo(() => {
    const liveEvents = rawEvents.filter((e) => !dismissed.has(e.id));
    const overdue = liveEvents.filter((e) => e.days < 0).length;
    const upcoming7 = liveEvents.filter((e) => e.days >= 0 && e.days <= 7).length;
    const upcoming30 = liveEvents.filter((e) => e.days >= 0 && e.days <= 30).length;
    
    const totalInflows = liveEvents
      .filter((e) => INFLOW_TYPES.includes(e.type) && e.days >= 0)
      .reduce((s, e) => s + (e.maturityAmount || e.amount || 0), 0);
      
    const totalOutflows = liveEvents
      .filter((e) => OUTFLOW_TYPES.includes(e.type) && e.days >= 0)
      .reduce((s, e) => s + (e.amount || 0), 0);

    const netCashflow = totalInflows - totalOutflows;

    // Monthly breakdown map
    const monthlyMap: Record<
      string,
      { inflow: number; outflow: number; events: number; list: any[] }
    > = {};

    liveEvents
      .filter((e) => e.days >= 0)
      .forEach((e) => {
        const m = e.date?.slice(0, 7);
        if (!m) return;
        if (!monthlyMap[m]) {
          monthlyMap[m] = { inflow: 0, outflow: 0, events: 0, list: [] };
        }
        monthlyMap[m].events++;
        monthlyMap[m].list.push(e);
        if (INFLOW_TYPES.includes(e.type)) {
          monthlyMap[m].inflow += e.maturityAmount || e.amount || 0;
        } else if (OUTFLOW_TYPES.includes(e.type)) {
          monthlyMap[m].outflow += e.amount || 0;
        }
      });

    // Category breakdown
    const categoryBreakdown: Record<string, { count: number; totalAmt: number; direction: string }> = {};
    liveEvents.forEach((e) => {
      const cat = e.category || "Other";
      const amt = e.maturityAmount || e.amount || 0;
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { count: 0, totalAmt: 0, direction: getEventDirection(e.type) };
      }
      categoryBreakdown[cat].count++;
      categoryBreakdown[cat].totalAmt += amt;
    });

    return {
      upcoming7,
      upcoming30,
      overdue,
      totalInflows,
      totalOutflows,
      netCashflow,
      monthlyMap,
      categoryBreakdown,
    };
  }, [rawEvents, dismissed]);

  // Filter options with live counters
  const categoryOptions = [
    { key: "all", label: "All Categories" },
    { key: "fd", label: "FD / RD" },
    { key: "bond", label: "Bonds" },
    { key: "dividend", label: "Dividends" },
    { key: "insurance", label: "Insurance" },
    { key: "health_insurance", label: "Health Ins." },
    { key: "loan", label: "Loans" },
    { key: "cc", label: "Credit Cards" },
    { key: "subscription", label: "Subscriptions" },
    { key: "realestate", label: "Real Estate" },
    { key: "govt_scheme", label: "Govt Schemes" },
    { key: "prepaid_card", label: "Prepaid Cards" },
    { key: "vehicle", label: "Vehicles" },
    { key: "life_event", label: "Life Events" },
    { key: "rent_receivable", label: "Rent Receivable" },
  ];

  // Export to .ics
  const exportToICS = () => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    const escapeText = (s: string) => String(s || "").replace(/([,;])/g, "\\$1");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ArthaDrishti//Financial Calendar//EN",
      "CALSCALE:GREGORIAN",
    ];
    filteredEvents.forEach((e) => {
      const dt = e.date.replace(/-/g, "");
      const amt = e.maturityAmount || e.amount;
      const description = amt
        ? `${e.category} • ${fmtINRExact(amt)} • Due ${formatDate(e.date)}`
        : `${e.category} • Due ${formatDate(e.date)}`;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${e.id}@financial-calendar`,
        `DTSTAMP:${stamp(new Date())}`,
        `DTSTART;VALUE=DATE:${dt}`,
        `SUMMARY:${escapeText(e.name)}`,
        `DESCRIPTION:${escapeText(description)}`,
        "END:VEVENT"
      );
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-calendar-${today()}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Date", "Category", "Event Name", "Direction", "Amount (₹)", "Urgency", "Status"];
    const rows = filteredEvents.map((e) => {
      const dir = getEventDirection(e.type);
      const amt = e.maturityAmount || e.amount || 0;
      const isDone = dismissed.has(e.id);
      return [
        `"${e.date}"`,
        `"${e.category}"`,
        `"${(e.name || "").replace(/"/g, '""')}"`,
        `"${dir.toUpperCase()}"`,
        amt,
        `"${getUrgencyLabel(e.days)}"`,
        `"${isDone ? "Completed" : "Pending"}"`,
      ].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-events-${today()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Single event iCalendar export
  const exportSingleEventICS = (e: any) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    const escapeText = (s: string) => String(s || "").replace(/([,;])/g, "\\$1");
    const dt = e.date.replace(/-/g, "");
    const amt = e.maturityAmount || e.amount;
    const description = amt
      ? `${e.category} • ${fmtINRExact(amt)} • Due ${formatDate(e.date)}`
      : `${e.category} • Due ${formatDate(e.date)}`;

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ArthaDrishti//Single Financial Event//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${e.id}@financial-calendar`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART;VALUE=DATE:${dt}`,
      `SUMMARY:${escapeText(e.name)}`,
      `DESCRIPTION:${escapeText(description)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${e.name.replace(/[^a-zA-Z0-9_-]/g, "_")}-${e.date}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Group events by month for timeline view
  const groupedByMonth: Record<string, any[]> = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredEvents.forEach((e) => {
      const m = e.date?.slice(0, 7) || "unknown";
      if (!map[m]) map[m] = [];
      map[m].push(e);
    });
    return map;
  }, [filteredEvents]);

  // Calendar Grid Day Generation
  const calendarGridData = useMemo(() => {
    const year = currentGridMonth.getFullYear();
    const month = currentGridMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: any[];
      inflowTotal: number;
      outflowTotal: number;
    }> = [];

    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = today();

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = month === 0 ? 12 : month;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${pad(prevM)}-${pad(d)}`;
      const evs = rawEvents.filter((e) => e.date === dateStr && (showDismissed || !dismissed.has(e.id)));
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: evs,
        inflowTotal: evs.filter((e) => INFLOW_TYPES.includes(e.type)).reduce((s, e) => s + (e.maturityAmount || e.amount || 0), 0),
        outflowTotal: evs.filter((e) => OUTFLOW_TYPES.includes(e.type)).reduce((s, e) => s + (e.amount || 0), 0),
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
      const evs = rawEvents.filter((e) => e.date === dateStr && (showDismissed || !dismissed.has(e.id)));
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        events: evs,
        inflowTotal: evs.filter((e) => INFLOW_TYPES.includes(e.type)).reduce((s, e) => s + (e.maturityAmount || e.amount || 0), 0),
        outflowTotal: evs.filter((e) => OUTFLOW_TYPES.includes(e.type)).reduce((s, e) => s + (e.amount || 0), 0),
      });
    }

    // Next month filler days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 11 ? 1 : month + 2;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${pad(nextM)}-${pad(d)}`;
      const evs = rawEvents.filter((e) => e.date === dateStr && (showDismissed || !dismissed.has(e.id)));
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: evs,
        inflowTotal: evs.filter((e) => INFLOW_TYPES.includes(e.type)).reduce((s, e) => s + (e.maturityAmount || e.amount || 0), 0),
        outflowTotal: evs.filter((e) => OUTFLOW_TYPES.includes(e.type)).reduce((s, e) => s + (e.amount || 0), 0),
      });
    }

    return days;
  }, [currentGridMonth, rawEvents, showDismissed, dismissed]);

  const changeGridMonth = (delta: number) => {
    setCurrentGridMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );
  };

  const jumpGridToToday = () => {
    const d = new Date();
    setCurrentGridMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  // Chart data for Analytics View
  const chartData = useMemo(() => {
    return Object.entries(stats.monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, horizon)
      .map(([monthKey, data]) => {
        const [y, m] = monthKey.split("-");
        return {
          month: `${MONTH_NAMES[parseInt(m) - 1]} '${y.slice(2)}`,
          inflow: data.inflow,
          outflow: data.outflow,
          net: data.inflow - data.outflow,
          events: data.events,
        };
      });
  }, [stats.monthlyMap, horizon]);

  const todayYM = today().slice(0, 7);

  if (rawEvents.length === 0) {
    return (
      <div className="tab-content-enter">
        {!embedded && (
          <SectionTitle sub="Track upcoming maturities, dividends, premiums & renewals">
            Financial Calendar
          </SectionTitle>
        )}
        <EmptyState
          icon={CalendarIcon}
          gradient={`linear-gradient(135deg, ${THEME.cyan} 0%, color-mix(in srgb, ${THEME.cyan} 55%, white) 100%)`}
          dotColor={THEME.cyan}
          title="No Upcoming Financial Events"
          description="This calendar automatically synchronizes with your Fixed Deposits, RDs, insurance policies, loans, vehicles, credit cards, PPF, govt schemes and subscriptions."
          pills={[
            "FD / RD Maturities",
            "Insurance Premiums",
            "Loan Closures",
            "Vehicle PUC & Services",
            "Dividends & Returns",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="tab-content-enter fincal-container" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {!embedded && (
        <SectionTitle sub="Executive forecast of maturities, returns, premiums & compliance deadlines">
          Financial Calendar
        </SectionTitle>
      )}

      {/* ── 1. Top Executive KPI Stat Ribbon ─────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Overdue & Urgent"
          value={String(stats.overdue + stats.upcoming7)}
          numericValue={stats.overdue + stats.upcoming7}
          formatValue={(n) => String(Math.round(n))}
          sub={
            stats.overdue > 0
              ? `${stats.overdue} overdue • ${stats.upcoming7} due this week`
              : `${stats.upcoming7} due in next 7 days`
          }
          subColor={stats.overdue > 0 ? THEME.rust : THEME.gold}
          icon={<AlertTriangle />}
          color={stats.overdue > 0 ? THEME.rust : THEME.gold}
        />
        <StatCard
          label="Expected Inflows"
          value={fmtINRFull(stats.totalInflows)}
          numericValue={stats.totalInflows}
          formatValue={fmtINRFull}
          sub={`${horizon}M forecast (Maturities & Returns)`}
          subColor={THEME.sage}
          icon={<ArrowDownRight />}
          color={THEME.sage}
        />
        <StatCard
          label="Expected Outflows"
          value={fmtINRFull(stats.totalOutflows)}
          numericValue={stats.totalOutflows}
          formatValue={fmtINRFull}
          sub={`${horizon}M forecast (Premiums & Fees)`}
          subColor={THEME.rust}
          icon={<ArrowUpRight />}
          color={THEME.rust}
        />
        <StatCard
          label="Net Cash Trajectory"
          value={fmtINRFull(Math.abs(stats.netCashflow))}
          numericValue={Math.abs(stats.netCashflow)}
          formatValue={(v) => (stats.netCashflow >= 0 ? `+${fmtINRFull(v)}` : `-${fmtINRFull(v)}`)}
          sub={stats.netCashflow >= 0 ? "Net Positive Surplus" : "Net Outflow Demand"}
          subColor={stats.netCashflow >= 0 ? THEME.sage : THEME.rust}
          icon={<TrendingUp />}
          color={stats.netCashflow >= 0 ? THEME.sage : THEME.rust}
        />
      </div>

      {/* ── 2. Unified Command Bar & Filter Hub ────────────────────────────── */}
      <Card>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Row A: View Mode + Horizon + Export Hub */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {/* View Mode Switcher */}
            <div
              style={{
                display: "inline-flex",
                background: "color-mix(in srgb, var(--surface-0) 80%, transparent)",
                padding: 4,
                borderRadius: 12,
                border: `1.5px solid ${THEME.line}`,
              }}
            >
              <button
                onClick={() => setViewMode("agenda")}
                className={`fincal-view-btn ${viewMode === "agenda" ? "active" : ""}`}
                title="Agenda / Timeline View"
              >
                <Layers size={14} /> Agenda Timeline
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`fincal-view-btn ${viewMode === "grid" ? "active" : ""}`}
                title="Interactive Calendar Grid"
              >
                <CalendarDays size={14} /> Calendar Grid
              </button>
              <button
                onClick={() => setViewMode("analytics")}
                className={`fincal-view-btn ${viewMode === "analytics" ? "active" : ""}`}
                title="Cashflow Analytics & Breakdown"
              >
                <BarChart3 size={14} /> Cashflow Radar
              </button>
            </div>

            {/* Horizon & Action Hub */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {/* Forecast Horizon Selector */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "color-mix(in srgb, var(--surface-0) 70%, transparent)",
                  borderRadius: 10,
                  border: `1px solid ${THEME.line}`,
                  padding: "3px 4px",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, padding: "0 8px" }}>
                  Horizon:
                </span>
                {[3, 6, 12, 24].map((m) => (
                  <button
                    key={m}
                    onClick={() => setHorizon(m)}
                    className={`fincal-horizon-pill ${horizon === m ? "active" : ""}`}
                  >
                    {m}M
                  </button>
                ))}
              </div>

              {/* Show Done toggle */}
              {dismissedCount > 0 && (
                <button
                  onClick={() => setShowDismissed((v) => !v)}
                  className={`chip ${showDismissed ? "active" : ""}`}
                  style={{ height: 34, fontSize: 12 }}
                  title={showDismissed ? "Hide completed events" : "Show events you marked done"}
                >
                  <RotateCcw size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
                  {showDismissed ? "Hide Done" : `Show Done (${dismissedCount})`}
                </button>
              )}

              {/* Export Buttons */}
              <Button
                variant="secondary"
                size="sm"
                onClick={exportToICS}
                title="Download .ics for Apple Calendar, Google Calendar & Outlook"
              >
                <Download size={13} style={{ marginRight: 6 }} />
                Export .ics
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={exportToCSV}
                title="Download CSV spreadsheet of all events"
              >
                <FileSpreadsheet size={13} style={{ marginRight: 6 }} />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Row B: Search & Direction Pill Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {/* Search Input */}
            <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 380 }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: THEME.muted,
                }}
              />
              <input
                type="text"
                placeholder="Search event name, bank, insurer, vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 34px",
                  borderRadius: 10,
                  border: `1.5px solid ${THEME.line}`,
                  background: "var(--surface-0)",
                  color: THEME.ink,
                  fontSize: 13,
                  outline: "none",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: THEME.muted,
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Direction Filter Pills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={() => setDirectionFilter("all")}
                className={`fincal-filter-pill ${directionFilter === "all" ? "active" : ""}`}
              >
                All Dues
              </button>
              <button
                onClick={() => setDirectionFilter("inflow")}
                className={`fincal-filter-pill ${directionFilter === "inflow" ? "active inflow" : ""}`}
              >
                <ArrowDownRight size={13} style={{ color: THEME.sage }} /> Money In
              </button>
              <button
                onClick={() => setDirectionFilter("outflow")}
                className={`fincal-filter-pill ${directionFilter === "outflow" ? "active outflow" : ""}`}
              >
                <ArrowUpRight size={13} style={{ color: THEME.rust }} /> Money Out
              </button>
              <button
                onClick={() => setDirectionFilter("compliance")}
                className={`fincal-filter-pill ${directionFilter === "compliance" ? "active compliance" : ""}`}
              >
                <Shield size={13} style={{ color: THEME.accent }} /> Deadlines / Reminders
              </button>
            </div>
          </div>

          {/* Row C: Dynamic Category Pills */}
          <div
            className="chip-row"
            style={{
              margin: 0,
              gap: 8,
              overflowX: "auto",
              paddingBottom: 2,
            }}
          >
            {categoryOptions.map((f) => {
              const count =
                f.key === "all"
                  ? rawEvents.length
                  : rawEvents.filter((e) => e.type.startsWith(f.key)).length;
              if (count === 0 && f.key !== "all") return null;
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveCategory(f.key)}
                  aria-pressed={activeCategory === f.key}
                  className={`chip ${activeCategory === f.key ? "active" : ""}`}
                  style={{ fontSize: 12, padding: "5px 12px" }}
                >
                  {f.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── 3. VIEW MODE 1: TIMELINE & AGENDA VIEW ─────────────────────────── */}
      {viewMode === "agenda" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Urgency Legend & Quick Counter Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              fontSize: 12,
              color: THEME.muted,
              padding: "0 4px",
            }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              {[
                { label: "Overdue", color: THEME.rust },
                { label: "Due ≤ 7 Days", color: THEME.rust },
                { label: "Due ≤ 30 Days", color: THEME.gold },
                { label: "Due ≤ 90 Days", color: THEME.accent },
                { label: "Later", color: THEME.sage },
              ].map((l) => (
                <span key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: l.color,
                      display: "inline-block",
                    }}
                  />
                  {l.label}
                </span>
              ))}
            </div>
            <div style={{ fontWeight: 600 }}>
              Showing {filteredEvents.length} of {rawEvents.length} events
            </div>
          </div>

          {/* Grouped Month Cards */}
          {Object.keys(groupedByMonth).length === 0 ? (
            <Card>
              <div style={{ padding: 40, textAlign: "center", color: THEME.muted }}>
                <Search size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                <div style={{ fontWeight: 700, fontSize: 16, color: THEME.ink }}>No matching events found</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  Try changing your search query or loosening the category filters above.
                </div>
              </div>
            </Card>
          ) : (
            Object.entries(groupedByMonth)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([month, monthEvents]) => {
                const [y, m] = month.split("-");
                const monthName = FULL_MONTH_NAMES[parseInt(m) - 1] || month;
                const isCurrentMonth = month === todayYM;
                const monthInflow = monthEvents
                  .filter((e) => INFLOW_TYPES.includes(e.type))
                  .reduce((s, e) => s + (e.maturityAmount || e.amount || 0), 0);
                const monthOutflow = monthEvents
                  .filter((e) => OUTFLOW_TYPES.includes(e.type))
                  .reduce((s, e) => s + (e.amount || 0), 0);
                const monthNet = monthInflow - monthOutflow;

                return (
                  <Card
                    key={month}
                    style={
                      isCurrentMonth
                        ? {
                            borderColor: "color-mix(in srgb, var(--t-accent) 45%, var(--t-line))",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                          }
                        : undefined
                    }
                  >
                    <div style={{ padding: "18px 20px" }}>
                      {/* Month Header with Net Cashflow Badge */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 16,
                          flexWrap: "wrap",
                          gap: 10,
                          borderBottom: `1px solid ${THEME.line}`,
                          paddingBottom: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <CalendarIcon size={18} style={{ color: THEME.accent }} />
                          <span style={{ fontWeight: 800, fontSize: 16, color: THEME.ink }}>
                            {monthName} {y}
                          </span>
                          {isCurrentMonth && <Badge variant="accent">Current Month</Badge>}
                          <Badge variant="muted">
                            {monthEvents.length} event{monthEvents.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>

                        {/* Month Net Summary Bar */}
                        {(monthInflow > 0 || monthOutflow > 0) && (
                          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12 }}>
                            {monthInflow > 0 && (
                              <span style={{ color: THEME.sage, fontWeight: 700 }}>
                                +{fmtINR(monthInflow)}
                              </span>
                            )}
                            {monthOutflow > 0 && (
                              <span style={{ color: THEME.rust, fontWeight: 700 }}>
                                -{fmtINR(monthOutflow)}
                              </span>
                            )}
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: 6,
                                background:
                                  monthNet >= 0
                                    ? "color-mix(in srgb, var(--t-sage) 12%, transparent)"
                                    : "color-mix(in srgb, var(--t-rust) 12%, transparent)",
                                color: monthNet >= 0 ? THEME.sage : THEME.rust,
                                fontWeight: 800,
                              }}
                            >
                              Net: {monthNet >= 0 ? `+${fmtINR(monthNet)}` : `-${fmtINR(Math.abs(monthNet))}`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Event Rows */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {monthEvents.map((event) => {
                          const Icon = event.icon || Milestone;
                          const urgencyColor = getUrgencyColor(event.days);
                          const isDismissed = dismissed.has(event.id);
                          const hasAmount = !!(event.maturityAmount || event.amount);
                          const targetTab = EVENT_TYPE_TO_TAB[event.type];
                          const dir = getEventDirection(event.type);

                          return (
                            <div
                              key={event.id}
                              className="fincal-event-card"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                padding: "12px 16px",
                                borderRadius: 12,
                                background: isDismissed
                                  ? "color-mix(in srgb, var(--surface-0) 40%, transparent)"
                                  : "var(--surface-0)",
                                border: `1.5px solid ${isDismissed ? THEME.line : event.days < 0 ? "color-mix(in srgb, var(--t-rust) 30%, transparent)" : THEME.line}`,
                                borderLeft: `5px solid ${urgencyColor}`,
                                opacity: isDismissed ? 0.55 : 1,
                                transition: "all 0.2s ease",
                              }}
                            >
                              {/* Category Icon */}
                              <div
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: 10,
                                  background: `color-mix(in srgb, ${event.color || THEME.accent} 12%, transparent)`,
                                  color: event.color || THEME.accent,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <Icon size={18} />
                              </div>

                              {/* Title & Metadata */}
                              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      fontSize: 14,
                                      color: THEME.ink,
                                      textDecoration: isDismissed ? "line-through" : "none",
                                    }}
                                  >
                                    {event.name}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 10,
                                      padding: "2px 6px",
                                      borderRadius: 4,
                                      fontWeight: 700,
                                      background: `color-mix(in srgb, ${event.color || THEME.accent} 15%, transparent)`,
                                      color: event.color || THEME.accent,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {event.category}
                                  </span>
                                  {event.projected && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        color: THEME.muted,
                                        fontWeight: 600,
                                        background: "color-mix(in srgb, var(--t-muted) 12%, transparent)",
                                        padding: "1px 5px",
                                        borderRadius: 4,
                                      }}
                                    >
                                      projected
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 3 }}>
                                  {event.detail}
                                </div>
                              </div>

                              {/* Amount Column */}
                              <div style={{ textAlign: "right", flexShrink: 0, minWidth: 100 }}>
                                <div
                                  style={{
                                    fontWeight: 800,
                                    fontSize: 14,
                                    color: dir === "inflow" ? THEME.sage : dir === "outflow" ? THEME.rust : THEME.ink,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    gap: 2,
                                  }}
                                >
                                  {hasAmount ? (
                                    <>
                                      {dir === "inflow" ? "+" : dir === "outflow" ? "-" : ""}
                                      <Money value={event.maturityAmount || event.amount} variant="exact" />
                                    </>
                                  ) : (
                                    <span style={{ color: THEME.muted, fontSize: 12, fontWeight: 600 }}>Reminder</span>
                                  )}
                                </div>
                                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                                  {formatDate(event.date)}
                                </div>
                              </div>

                              {/* Urgency Badge */}
                              <div
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 8,
                                  background: `color-mix(in srgb, ${urgencyColor} 16%, transparent)`,
                                  color: urgencyColor,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  flexShrink: 0,
                                  minWidth: 70,
                                  textAlign: "center",
                                }}
                              >
                                {getUrgencyLabel(event.days)}
                              </div>

                              {/* Action Buttons: Inspect, Go to Tab, Complete */}
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedEvent(event)}
                                  className="fincal-icon-btn"
                                  title="Inspect event details"
                                >
                                  <Eye size={15} />
                                </button>
                                {onNavigateToTab && targetTab && (
                                  <button
                                    type="button"
                                    onClick={() => onNavigateToTab(targetTab)}
                                    className="fincal-icon-btn"
                                    title={`Go to ${event.category} tab`}
                                  >
                                    <ExternalLink size={15} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggleDismissed(event.id)}
                                  className={`fincal-dismiss-btn ${isDismissed ? "done" : ""}`}
                                  title={isDismissed ? "Mark as pending" : "Mark as completed"}
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                );
              })
          )}
        </div>
      )}

      {/* ── 4. VIEW MODE 2: INTERACTIVE CALENDAR GRID ──────────────────────── */}
      {viewMode === "grid" && (
        <Card>
          <div style={{ padding: 20 }}>
            {/* Calendar Navigator Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CalendarIcon size={20} style={{ color: THEME.accent }} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: THEME.ink }}>
                  {FULL_MONTH_NAMES[currentGridMonth.getMonth()]} {currentGridMonth.getFullYear()}
                </h3>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={() => changeGridMonth(-1)}>
                  <ChevronLeft size={16} /> Prev
                </Button>
                <Button variant="secondary" size="sm" onClick={jumpGridToToday}>
                  Today
                </Button>
                <Button variant="secondary" size="sm" onClick={() => changeGridMonth(1)}>
                  Next <ChevronRight size={16} />
                </Button>
              </div>
            </div>

            {/* Day Names Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 6,
                textAlign: "center",
                fontWeight: 700,
                fontSize: 12,
                color: THEME.muted,
                marginBottom: 8,
              }}
            >
              {DAY_NAMES.map((dn) => (
                <div key={dn} style={{ padding: "6px 0" }}>
                  {dn}
                </div>
              ))}
            </div>

            {/* Calendar Grid 7x5 or 7x6 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 6,
              }}
            >
              {calendarGridData.map((cell) => {
                const hasEvents = cell.events.length > 0;
                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => hasEvents && setSelectedDayEvents({ date: cell.dateStr, events: cell.events })}
                    className={`fincal-grid-cell ${cell.isCurrentMonth ? "in-month" : "out-month"} ${cell.isToday ? "today" : ""} ${hasEvents ? "has-events" : ""}`}
                    style={{
                      minHeight: 85,
                      padding: 8,
                      borderRadius: 10,
                      background: cell.isToday
                        ? "color-mix(in srgb, var(--t-accent) 10%, var(--surface-0))"
                        : cell.isCurrentMonth
                          ? "var(--surface-0)"
                          : "color-mix(in srgb, var(--surface-0) 40%, transparent)",
                      border: `1.5px solid ${cell.isToday ? "var(--t-accent)" : THEME.line}`,
                      cursor: hasEvents ? "pointer" : "default",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                  >
                    {/* Date Number + Event Count Pill */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          fontWeight: cell.isToday ? 800 : 600,
                          fontSize: 13,
                          color: cell.isToday
                            ? "var(--t-accent)"
                            : cell.isCurrentMonth
                              ? THEME.ink
                              : THEME.muted,
                        }}
                      >
                        {cell.dayNum}
                      </span>
                      {hasEvents && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "1px 6px",
                            borderRadius: 10,
                            background: "var(--t-accent)",
                            color: "#fff",
                          }}
                        >
                          {cell.events.length}
                        </span>
                      )}
                    </div>

                    {/* Event Preview Dots & Amounts */}
                    {hasEvents ? (
                      <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                        {cell.inflowTotal > 0 && (
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: THEME.sage,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            +{fmtINR(cell.inflowTotal)}
                          </div>
                        )}
                        {cell.outflowTotal > 0 && (
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: THEME.rust,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            -{fmtINR(cell.outflowTotal)}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 2 }}>
                          {cell.events.slice(0, 4).map((ev) => (
                            <span
                              key={ev.id}
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: ev.color || THEME.accent,
                                display: "inline-block",
                              }}
                              title={`${ev.name} (${ev.category})`}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* ── 5. VIEW MODE 3: CASHFLOW ANALYTICS & BREAKDOWN ─────────────────── */}
      {viewMode === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Monthly Trajectory Bar Chart */}
          <Card>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: THEME.ink, marginBottom: 4 }}>
                Monthly Inflows vs Outflows Forecast
              </div>
              <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20 }}>
                Visual trajectory of projected cash inflows against insurance, subscription and fee dues over {horizon} months.
              </div>

              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: THEME.muted, fontSize: 12 }}
                      axisLine={{ stroke: THEME.line }}
                    />
                    <YAxis
                      tickFormatter={(v) => fmtINR(v)}
                      tick={{ fill: THEME.muted, fontSize: 11 }}
                      axisLine={{ stroke: THEME.line }}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
                    />
                    <Bar dataKey="inflow" name="Expected Inflows" fill={THEME.sage} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="outflow" name="Expected Outflows" fill={THEME.rust} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Grid with Category Distribution & Top Milestones */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {/* Category Distribution Card */}
            <Card>
              <div style={{ padding: "20px 24px" }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: THEME.ink, marginBottom: 16 }}>
                  Events by Category Breakdown
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {Object.entries(stats.categoryBreakdown)
                    .sort(([, a], [, b]) => b.totalAmt - a.totalAmt)
                    .map(([cat, info]) => (
                      <div
                        key={cat}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 14px",
                          borderRadius: 10,
                          background: "var(--surface-0)",
                          border: `1px solid ${THEME.line}`,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: THEME.ink }}>{cat}</div>
                          <div style={{ fontSize: 11, color: THEME.muted }}>
                            {info.count} scheduled event{info.count > 1 ? "s" : ""}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: 13,
                              color:
                                info.direction === "inflow"
                                  ? THEME.sage
                                  : info.direction === "outflow"
                                    ? THEME.rust
                                    : THEME.ink,
                            }}
                          >
                            {info.totalAmt > 0 ? (
                              <Money value={info.totalAmt} variant="exact" />
                            ) : (
                              <span style={{ color: THEME.muted, fontWeight: 500 }}>Deadlines</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </Card>

            {/* Top Milestones Ranking */}
            <Card>
              <div style={{ padding: "20px 24px" }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: THEME.ink, marginBottom: 16 }}>
                  Top High-Value Upcoming Milestones
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {rawEvents
                    .filter((e) => (e.maturityAmount || e.amount || 0) > 0)
                    .sort((a, b) => (b.maturityAmount || b.amount || 0) - (a.maturityAmount || a.amount || 0))
                    .slice(0, 6)
                    .map((e) => {
                      const dir = getEventDirection(e.type);
                      return (
                        <div
                          key={e.id}
                          onClick={() => setSelectedEvent(e)}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 12px",
                            borderRadius: 10,
                            background: "var(--surface-0)",
                            border: `1px solid ${THEME.line}`,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1, paddingRight: 10 }}>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: 13,
                                color: THEME.ink,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {e.name}
                            </div>
                            <div style={{ fontSize: 11, color: THEME.muted }}>
                              {e.category} • Due {formatDate(e.date)}
                            </div>
                          </div>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: 13,
                              color: dir === "inflow" ? THEME.sage : THEME.rust,
                              flexShrink: 0,
                            }}
                          >
                            <Money value={e.maturityAmount || e.amount} variant="exact" />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── 6. EVENT INSPECTOR MODAL ─────────────────────────────────────── */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title="Financial Event Inspector"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Header Badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 18px",
                borderRadius: 12,
                background: `color-mix(in srgb, ${selectedEvent.color || THEME.accent} 12%, transparent)`,
                border: `1.5px solid ${selectedEvent.color || THEME.accent}`,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: selectedEvent.color || THEME.accent,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {React.createElement(selectedEvent.icon || Milestone, { size: 22 })}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: THEME.ink }}>
                  {selectedEvent.name}
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  {selectedEvent.category} • {formatDate(selectedEvent.date)}
                </div>
              </div>
            </div>

            {/* Financial Details Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Amount / Value</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginTop: 4 }}>
                  {selectedEvent.maturityAmount || selectedEvent.amount ? (
                    <Money value={selectedEvent.maturityAmount || selectedEvent.amount} variant="exact" />
                  ) : (
                    "Non-Monetary Deadline"
                  )}
                </div>
              </div>
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Urgency Status</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: getUrgencyColor(selectedEvent.days),
                    marginTop: 4,
                  }}
                >
                  {getUrgencyLabel(selectedEvent.days)}
                </div>
              </div>
            </div>

            {/* Contextual Description */}
            <div
              style={{
                padding: 14,
                borderRadius: 10,
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
                fontSize: 13,
                color: THEME.ink,
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4, color: THEME.muted, fontSize: 11 }}>
                RECORD DETAILS
              </div>
              {selectedEvent.detail}
            </div>

            {/* Action Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                marginTop: 8,
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportSingleEventICS(selectedEvent)}
              >
                <Download size={14} style={{ marginRight: 6 }} />
                Add to Calendar (.ics)
              </Button>

              <div style={{ display: "flex", gap: 8 }}>
                {onNavigateToTab && EVENT_TYPE_TO_TAB[selectedEvent.type] && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const tab = EVENT_TYPE_TO_TAB[selectedEvent.type];
                      setSelectedEvent(null);
                      onNavigateToTab(tab);
                    }}
                  >
                    <ExternalLink size={14} style={{ marginRight: 6 }} />
                    Go to {selectedEvent.category} Tab
                  </Button>
                )}
                <Button
                  variant={dismissed.has(selectedEvent.id) ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => {
                    toggleDismissed(selectedEvent.id);
                    setSelectedEvent(null);
                  }}
                >
                  <CheckCircle2 size={14} style={{ marginRight: 6 }} />
                  {dismissed.has(selectedEvent.id) ? "Mark as Pending" : "Mark as Completed"}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── 7. DAY INSPECTOR MODAL (FOR CALENDAR GRID) ────────────────────── */}
      {selectedDayEvents && (
        <Modal
          isOpen={!!selectedDayEvents}
          onClose={() => setSelectedDayEvents(null)}
          title={`Events on ${formatDate(selectedDayEvents.date)}`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {selectedDayEvents.events.map((ev) => {
              const Icon = ev.icon || Milestone;
              const isDone = dismissed.has(ev.id);
              return (
                <div
                  key={ev.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 12,
                    borderRadius: 10,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: `color-mix(in srgb, ${ev.color || THEME.accent} 15%, transparent)`,
                        color: ev.color || THEME.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: THEME.ink,
                          textDecoration: isDone ? "line-through" : "none",
                        }}
                      >
                        {ev.name}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted }}>{ev.category}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>
                      {ev.maturityAmount || ev.amount ? (
                        <Money value={ev.maturityAmount || ev.amount} variant="exact" />
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDayEvents(null);
                      setSelectedEvent(ev);
                    }}
                    className="fincal-icon-btn"
                    title="Inspect details"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* ── 8. Embedded CSS Styles ─────────────────────────────────────────── */}
      <style>{`
        .fincal-view-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border: none;
          background: transparent;
          color: var(--t-muted);
          font-size: 12px;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .fincal-view-btn.active {
          background: var(--t-accent);
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        .fincal-horizon-pill {
          border: none;
          background: transparent;
          color: var(--t-muted);
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .fincal-horizon-pill.active {
          background: var(--t-accent);
          color: #ffffff;
        }
        .fincal-filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          border: 1.5px solid var(--t-line);
          background: var(--surface-0);
          color: var(--t-muted);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .fincal-filter-pill.active {
          border-color: var(--t-accent);
          background: color-mix(in srgb, var(--t-accent) 10%, var(--surface-0));
          color: var(--t-accent);
        }
        .fincal-filter-pill.active.inflow {
          border-color: var(--t-sage);
          background: color-mix(in srgb, var(--t-sage) 12%, var(--surface-0));
          color: var(--t-sage);
        }
        .fincal-filter-pill.active.outflow {
          border-color: var(--t-rust);
          background: color-mix(in srgb, var(--t-rust) 12%, var(--surface-0));
          color: var(--t-rust);
        }
        .fincal-filter-pill.active.compliance {
          border-color: var(--t-accent);
          background: color-mix(in srgb, var(--t-accent) 12%, var(--surface-0));
          color: var(--t-accent);
        }
        .fincal-icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1.5px solid var(--t-line);
          background: var(--surface-0);
          color: var(--t-muted);
          display: flex;
          align-items: center;
          justifyContent: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .fincal-icon-btn:hover {
          border-color: var(--t-accent);
          color: var(--t-accent);
          background: color-mix(in srgb, var(--t-accent) 8%, var(--surface-0));
        }
        .fincal-dismiss-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1.5px solid var(--t-line);
          background: var(--surface-0);
          color: var(--t-muted);
          display: flex;
          align-items: center;
          justifyContent: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .fincal-dismiss-btn:hover {
          border-color: var(--t-sage);
          color: var(--t-sage);
        }
        .fincal-dismiss-btn.done {
          border-color: var(--t-sage);
          background: color-mix(in srgb, var(--t-sage) 15%, transparent);
          color: var(--t-sage);
        }
        .fincal-event-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
        }
        .fincal-grid-cell.has-events:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border-color: var(--t-accent);
        }
        @media (max-width: 640px) {
          .fincal-event-card {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
};
