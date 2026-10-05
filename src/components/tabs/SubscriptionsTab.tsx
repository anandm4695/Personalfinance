import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  Play,
  Pause,
  Pencil,
  Trash2,
  Repeat,
  Wallet,
  Download,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  TrendingUp,
  PieChart as PieIcon,
  Search,
  LayoutGrid,
  CalendarDays,
  Table as TableIcon,
  Sparkles,
  Film,
  Cloud,
  Newspaper,
  Dumbbell,
  Zap,
  Folder,
  CheckCircle2,
  CreditCard,
  Smartphone,
  Landmark,
  Apple,
  PlayCircle,
  RefreshCw,
  Percent,
  BarChart3,
  ArrowUpDown,
  User,
  RotateCw,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  fmtINRFull,
  today,
  getSubscriptionMonthlyEquivalent,
  getSubscriptionCycleStep,
  getNextSubscriptionRenewal,
  addMonthsToDateStr,
} from "../../utils/finance";
import { SubModal, SubscriptionItem } from "../modals/SubModal";
import { SectionTitle } from "../ui/SectionTitle";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { ConfirmDialog } from "../ui/Feedback";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { ServiceLogo } from "../ui/BrandLogos";

export { ServiceLogo };

const CATEGORY_COLORS: Record<string, string> = {
  Entertainment: THEME.chart1,
  Productivity: THEME.chart2,
  "Storage/Cloud": THEME.chart3,
  "News/Media": THEME.chart4,
  Fitness: THEME.chart5,
  Utilities: THEME.chart6,
  Other: THEME.muted,
};

const getCategoryIcon = (category: string, size = 14, color = THEME.accent) => {
  const cat = (category || "").toLowerCase();
  if (cat.includes("entertain") || cat.includes("stream") || cat.includes("ott") || cat.includes("movie")) {
    return <Film size={size} color={color} />;
  }
  if (cat.includes("prod") || cat.includes("tool") || cat.includes("work") || cat.includes("ai")) {
    return <Sparkles size={size} color={color} />;
  }
  if (cat.includes("storage") || cat.includes("cloud") || cat.includes("drive") || cat.includes("backup")) {
    return <Cloud size={size} color={color} />;
  }
  if (cat.includes("news") || cat.includes("media") || cat.includes("read") || cat.includes("journal")) {
    return <Newspaper size={size} color={color} />;
  }
  if (cat.includes("fit") || cat.includes("gym") || cat.includes("health") || cat.includes("sport")) {
    return <Dumbbell size={size} color={color} />;
  }
  if (cat.includes("util") || cat.includes("bill") || cat.includes("service")) {
    return <Zap size={size} color={color} />;
  }
  return <Folder size={size} color={color} />;
};

const CATEGORY_ORDER = [
  "Entertainment",
  "Productivity",
  "Storage/Cloud",
  "News/Media",
  "Fitness",
  "Utilities",
  "Other",
];

const getPaymentMethodIcon = (method?: string, size = 12) => {
  const m = (method || "").toLowerCase();
  if (m.includes("credit") || m.includes("card")) return <CreditCard size={size} />;
  if (m.includes("upi") || m.includes("gpay") || m.includes("phonepe") || m.includes("paytm")) return <Smartphone size={size} />;
  if (m.includes("bank") || m.includes("debit") || m.includes("ach") || m.includes("net_banking")) return <Landmark size={size} />;
  if (m.includes("apple")) return <Apple size={size} />;
  if (m.includes("google")) return <PlayCircle size={size} />;
  return <RefreshCw size={size} />;
};

const getPaymentMethodLabel = (method?: string) => {
  const m = (method || "").toLowerCase();
  if (m === "credit_card" || m.includes("credit")) return "Credit Card";
  if (m === "upi_autopay" || m.includes("upi")) return "UPI AutoPay";
  if (m === "net_banking" || m.includes("bank")) return "Bank Debit";
  if (m === "apple_store" || m.includes("apple")) return "Apple";
  if (m === "google_play" || m.includes("google")) return "Google Play";
  if (m === "manual") return "Manual";
  return method || "Auto-Debit";
};

function getRenewalInfo(renewalDate: string | undefined, cycle?: string) {
  if (!renewalDate) return { days: null, nextDate: "", nextDays: null, isPast: false, overdueDays: 0, label: "No date set", color: THEME.muted, urgent: false };
  const todayStr = today();
  const todayDate = new Date(todayStr + "T00:00:00");
  const rd = new Date(renewalDate + "T00:00:00");
  const days = Math.ceil((rd.getTime() - todayDate.getTime()) / 86400000);
  const nextDate = getNextSubscriptionRenewal(renewalDate, cycle, todayStr);
  const nextDateObj = nextDate ? new Date(nextDate + "T00:00:00") : null;
  const nextDays = nextDateObj ? Math.ceil((nextDateObj.getTime() - todayDate.getTime()) / 86400000) : null;

  if (days < 0) {
    // The stored date is in the past. For recurring subscriptions, show the upcoming cycle date.
    return {
      days,
      nextDate,
      nextDays,
      isPast: true,
      overdueDays: Math.abs(days),
      label: nextDays === 0 ? "Due today" : `Next: ${fmtDate(nextDate)}${nextDays !== null && nextDays <= 7 ? ` (${nextDays}d)` : ""}`,
      color: nextDays === 0 ? THEME.rust : nextDays !== null && nextDays <= 7 ? THEME.gold : THEME.sage,
      urgent: nextDays !== null && nextDays <= 7,
    };
  }
  if (days === 0) return { days: 0, nextDate, nextDays: 0, isPast: false, overdueDays: 0, label: "Due today", color: THEME.rust, urgent: true };
  if (days <= 7) return { days, nextDate, nextDays: days, isPast: false, overdueDays: 0, label: `Due in ${days}d`, color: THEME.gold, urgent: true };
  if (days <= 30) return { days, nextDate, nextDays: days, isPast: false, overdueDays: 0, label: `Due in ${days}d`, color: THEME.accent, urgent: false };
  return { days, nextDate, nextDays: days, isPast: false, overdueDays: 0, label: `${days}d away`, color: THEME.muted, urgent: false };
}

const fmtDate = (dateStr: string) => {
  if (!dateStr) return "—";
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

export function SubscriptionsTab({ state, addItem, removeItem, updateItem, metrics, showToast }: any) {
  const { privacyMode } = usePrivacy();
  const { familyProfiles = [] } = useMasterData();
  const getProfileName = (id?: string) => familyProfiles?.find((p) => p.id === id)?.name || id || "Self";
  const [show, setShow] = useState(false);
  const [editSub, setEditSub] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"cards" | "timeline" | "table" | "analytics">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [filterCycle, setFilterCycle] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "paused" | "dueSoon">("all");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const subscriptions: SubscriptionItem[] = state.subscriptions || [];

  const updateSub = async (id: string, patch: any) => {
    setTogglingId(id);
    try {
      await updateItem("subscriptions", id, patch);
    } catch (e: any) {
      showToast?.(`Failed to update subscription: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setTogglingId(null);
    }
  };

  const advanceSubCycle = async (id: string, s: any) => {
    setTogglingId(id);
    try {
      const step = getSubscriptionCycleStep(s.cycle);
      const currentRenewal = s.renewalDate || today();
      let newRenewalDate: string;
      if (currentRenewal < today()) {
        newRenewalDate = getNextSubscriptionRenewal(currentRenewal, s.cycle, today());
        if (newRenewalDate <= today()) {
          newRenewalDate = addMonthsToDateStr(newRenewalDate, step);
        }
      } else {
        newRenewalDate = addMonthsToDateStr(currentRenewal, step);
      }
      await updateItem("subscriptions", id, {
        renewalDate: newRenewalDate,
        lastPaidAmount: s.amount,
      });
      showToast?.(`Renewed "${s.name}" to ${fmtDate(newRenewalDate)}`, "success");
    } catch (e: any) {
      showToast?.(`Failed to advance renewal: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setTogglingId(null);
    }
  };

  const doDeleteSub = async (id: string) => {
    setDeletingId(id);
    try {
      await removeItem("subscriptions", id);
    } catch (e: any) {
      showToast?.(`Failed to delete subscription: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const deleteSub = (id: string, name: string) => {
    setConfirmDelete({ id, name });
  };

  const { run: saveNewSub, loading: savingNewSub } = useAsyncAction(
    async (v: any) => { await addItem("subscriptions", v); },
    { onSuccess: () => setShow(false), onError: (e: any) => showToast?.(`Failed to add subscription: ${e?.message || "Unknown error"}`, "error") }
  );
  const { run: saveSubEdit, loading: savingSubEdit } = useAsyncAction(
    async (v: any) => { await updateItem("subscriptions", editSub.id, v); },
    { onSuccess: () => setEditSub(null), onError: (e: any) => showToast?.(`Failed to save subscription: ${e?.message || "Unknown error"}`, "error") }
  );

  const activeSubs = useMemo(() => subscriptions.filter((s: any) => !s.paused), [subscriptions]);
  const pausedSubs = useMemo(() => subscriptions.filter((s: any) => s.paused), [subscriptions]);

  const pastActiveSubs = useMemo(() => {
    const todayStr = today();
    return activeSubs.filter((s: any) => s.renewalDate && s.renewalDate < todayStr);
  }, [activeSubs]);

  const syncAllPastRenewals = async () => {
    if (pastActiveSubs.length === 0) return;
    setSyncingAll(true);
    try {
      const todayStr = today();
      await Promise.all(
        pastActiveSubs.map((s: any) => {
          const nextDate = getNextSubscriptionRenewal(s.renewalDate, s.cycle, todayStr);
          return updateItem("subscriptions", s.id, {
            renewalDate: nextDate,
            lastPaidAmount: s.amount,
          });
        })
      );
      showToast?.(`Synchronized ${pastActiveSubs.length} subscription billing cycle${pastActiveSubs.length > 1 ? "s" : ""}`, "success");
    } catch (e: any) {
      showToast?.(`Failed to sync renewal dates: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSyncingAll(false);
    }
  };

  const totalMonthly = useMemo(
    () =>
      activeSubs.reduce((acc: number, s: any) => acc + getSubscriptionMonthlyEquivalent(s.amount, s.cycle), 0),
    [activeSubs]
  );

  const totalAnnual = totalMonthly * 12;

  const pausedMonthlySavings = useMemo(
    () =>
      pausedSubs.reduce((acc: number, s: any) => acc + getSubscriptionMonthlyEquivalent(s.amount, s.cycle), 0),
    [pausedSubs]
  );

  const upcomingSubs = useMemo(() => {
    const todayStr = today();
    const todayDate = new Date(todayStr + "T00:00:00");
    const limit = new Date(todayDate);
    limit.setDate(limit.getDate() + 30);
    return subscriptions
      .filter((s: any) => !s.paused && s.renewalDate)
      .map((s: any) => {
        const nextDate = getNextSubscriptionRenewal(s.renewalDate, s.cycle, todayStr);
        const nextDateObj = new Date(nextDate + "T00:00:00");
        return {
          ...s,
          effectiveRenewalDate: nextDate,
          effectiveDays: Math.ceil((nextDateObj.getTime() - todayDate.getTime()) / 86400000),
        };
      })
      .filter((s: any) => {
        const rd = new Date(s.effectiveRenewalDate + "T00:00:00");
        return rd >= todayDate && rd <= limit;
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.effectiveRenewalDate + "T00:00:00").getTime() -
          new Date(b.effectiveRenewalDate + "T00:00:00").getTime()
      );
  }, [subscriptions]);

  const upcoming30dSpend = useMemo(() => {
    return upcomingSubs.reduce((s: number, sub: any) => s + Number(sub.amount || 0), 0);
  }, [upcomingSubs]);

  const priceChangedSubs = useMemo(() => {
    return subscriptions.filter(
      (s: any) =>
        s.lastPaidAmount != null &&
        Number(s.lastPaidAmount) > 0 &&
        Math.round(Number(s.lastPaidAmount) * 100) !== Math.round(Number(s.amount) * 100)
    );
  }, [subscriptions]);

  const dueIn7DaysSubs = useMemo(() => {
    return upcomingSubs.filter((s: any) => s.effectiveDays <= 7);
  }, [upcomingSubs]);

  const filteredSubs = useMemo(() => {
    return subscriptions.filter((s: any) => {
      if (filterStatus === "active" && s.paused) return false;
      if (filterStatus === "paused" && !s.paused) return false;
      if (filterStatus === "dueSoon") {
        if (s.paused || !s.renewalDate) return false;
        const ren = getRenewalInfo(s.renewalDate, s.cycle);
        if (ren.nextDays === null || ren.nextDays > 7) return false;
      }
      if (filterCategory !== "all" && (s.category || "Other") !== filterCategory) return false;
      if (filterOwner !== "all" && (s.owner || "self") !== filterOwner) return false;
      if (filterCycle !== "all" && (s.cycle || "monthly").toLowerCase() !== filterCycle.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (s.name || "").toLowerCase().includes(q);
        const matchCat = (s.category || "").toLowerCase().includes(q);
        const matchRemark = (s.remark || "").toLowerCase().includes(q);
        const matchOwner = getProfileName(s.owner).toLowerCase().includes(q);
        const matchPayment = (s.paymentMethod || "").toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchRemark && !matchOwner && !matchPayment) return false;
      }
      return true;
    });
  }, [subscriptions, filterStatus, filterCategory, filterOwner, filterCycle, searchQuery, getProfileName]);

  const sortedTableSubs = useMemo(() => {
    const list = [...filteredSubs];
    list.sort((a: any, b: any) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "amount") {
        valA = Number(a.amount || 0);
        valB = Number(b.amount || 0);
      } else if (sortField === "monthly") {
        valA = getSubscriptionMonthlyEquivalent(a.amount, a.cycle);
        valB = getSubscriptionMonthlyEquivalent(b.amount, b.cycle);
      } else if (sortField === "renewalDate") {
        valA = getNextSubscriptionRenewal(a.renewalDate, a.cycle, today()) || "9999-99-99";
        valB = getNextSubscriptionRenewal(b.renewalDate, b.cycle, today()) || "9999-99-99";
      } else if (sortField === "name") {
        valA = (a.name || "").toLowerCase();
        valB = (b.name || "").toLowerCase();
      } else if (sortField === "category") {
        valA = (a.category || "Other").toLowerCase();
        valB = (b.category || "Other").toLowerCase();
      } else if (sortField === "owner") {
        valA = getProfileName(a.owner).toLowerCase();
        valB = getProfileName(b.owner).toLowerCase();
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredSubs, sortField, sortDir, getProfileName]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const groupedSubs = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const cat of CATEGORY_ORDER) groups[cat] = [];
    filteredSubs.filter((s) => !s.paused).forEach((s: any) => {
      const cat = s.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    return Object.entries(groups).filter(([, subs]) => subs.length > 0);
  }, [filteredSubs]);

  const categoryBreakdown = useMemo(
    () => {
      const map: Record<string, { monthly: number; count: number }> = {};
      activeSubs.forEach((s: any) => {
        const cat = s.category || "Other";
        if (!map[cat]) map[cat] = { monthly: 0, count: 0 };
        map[cat].monthly += getSubscriptionMonthlyEquivalent(s.amount, s.cycle);
        map[cat].count += 1;
      });
      return Object.entries(map)
        .map(([cat, data]) => ({
          category: cat,
          monthly: data.monthly,
          count: data.count,
          color: CATEGORY_COLORS[cat] || THEME.muted,
        }))
        .filter((c) => c.monthly > 0)
        .sort((a, b) => b.monthly - a.monthly);
    },
    [activeSubs]
  );

  const monthlyOnlySubs = useMemo(
    () => activeSubs.filter((s: any) => (s.cycle || "monthly").toLowerCase() === "monthly"),
    [activeSubs]
  );

  const potentialAnnualSavings = useMemo(() => {
    const monthlySum = monthlyOnlySubs.reduce((s: number, sub: any) => s + Number(sub.amount || 0), 0);
    return monthlySum * 12 * 0.16;
  }, [monthlyOnlySubs]);

  const priceChanged = (s: any) =>
    s.lastPaidAmount != null &&
    Number(s.lastPaidAmount) > 0 &&
    Math.round(Number(s.lastPaidAmount) * 100) !== Math.round(Number(s.amount) * 100);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const downloadCSV = () => {
    const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = ["Name,Owner,Category,Amount (₹),Cycle,Monthly Equiv (₹),Payment Channel,Next Renewal,Status,AutoPay,Remark"];
    subscriptions.forEach((s: any) => {
      const monthly = getSubscriptionMonthlyEquivalent(s.amount, s.cycle);
      rows.push(
        [
          q(s.name),
          q(getProfileName(s.owner)),
          q(s.category),
          q(s.amount),
          q(s.cycle),
          q(monthly.toFixed(0)),
          q(getPaymentMethodLabel(s.paymentMethod)),
          q(s.renewalDate || ""),
          q(s.paused ? "Paused" : "Active"),
          q(s.autopay !== false ? "Yes" : "No"),
          q(s.remark || ""),
        ].join(",")
      );
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscriptions_recurring_ledger.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub="Monitor and optimize streaming, cloud SaaS, memberships, and recurring services with live renewal intelligence"
        rightElement={
          subscriptions.length > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {pastActiveSubs.length > 0 && (
                <Button
                  onClick={syncAllPastRenewals}
                  variant="ghost"
                  loading={syncingAll}
                  icon={<RotateCw size={13} />}
                  title="Synchronize all past renewal dates to their next upcoming billing cycle"
                  style={{
                    border: `1px solid color-mix(in srgb, ${THEME.sage} 40%, transparent)`,
                    color: THEME.sage,
                    borderRadius: "var(--radius-md)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Sync Renewals ({pastActiveSubs.length})
                </Button>
              )}
              <Button
                onClick={downloadCSV}
                variant="ghost"
                icon={<Download size={14} />}
                style={{ border: `1px solid ${THEME.line}`, borderRadius: "var(--radius-md)" }}
              >
                Export CSV
              </Button>
              <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShow(true)}>
                Add Subscription
              </Button>
            </div>
          )
        }
      >
        Subscriptions & Recurring
      </SectionTitle>

      {/* Hero Stats Cockpit */}
      {subscriptions.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 1fr 1fr 1.1fr",
              gap: 14,
              marginBottom: 18,
            }}
            className="subs-stats-grid"
          >
            <style>{`
              @media (max-width: 960px) {
                .subs-stats-grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)) !important; }
              }
            `}</style>
            <StatCard
              label="Monthly Equivalent Run-Rate"
              value={fmtINRFull(totalMonthly)}
              numericValue={totalMonthly}
              formatValue={fmtINRFull}
              sub={
                metrics?.monthIncome > 0 ? (
                  <>
                    <span style={{ fontWeight: 800, color: THEME.accent }}>
                      {((totalMonthly / metrics.monthIncome) * 100).toFixed(1)}%
                    </span>{" "}
                    of monthly income · <Money value={totalAnnual} variant="full" />/yr
                  </>
                ) : (
                  <>
                    Projected monthly burn · <Money value={totalAnnual} variant="full" />/yr
                  </>
                )
              }
              color={THEME.gold}
              icon={<Wallet />}
            />
            <StatCard
              label="Active Subscriptions"
              value={String(activeSubs.length)}
              numericValue={activeSubs.length}
              formatValue={(n) => String(Math.round(n))}
              sub={
                pausedSubs.length > 0 ? (
                  <>
                    {activeSubs.length} active · <span style={{ color: THEME.sage, fontWeight: 700 }}>{pausedSubs.length} paused</span>
                  </>
                ) : (
                  "All active commitments"
                )
              }
              color={THEME.accent}
              icon={<Repeat />}
            />
            <StatCard
              label="Annual Commitment"
              value={fmtINRFull(totalAnnual)}
              numericValue={totalAnnual}
              formatValue={fmtINRFull}
              sub={
                metrics?.annualIncome > 0
                  ? `${((totalAnnual / metrics.annualIncome) * 100).toFixed(1)}% of annual income`
                  : "Total yearly expenditure"
              }
              color={THEME.rust}
              icon={<Clock />}
            />
            <StatCard
              label="Upcoming Outflow (30d)"
              value={fmtINRFull(upcoming30dSpend)}
              numericValue={upcoming30dSpend}
              formatValue={fmtINRFull}
              sub={
                dueIn7DaysSubs.length > 0 ? (
                  <span style={{ color: THEME.gold, fontWeight: 700 }}>
                    {dueIn7DaysSubs.length} renewal{dueIn7DaysSubs.length > 1 ? "s" : ""} due in ≤ 7 days
                  </span>
                ) : (
                  `${upcomingSubs.length} renewals in next 30 days`
                )
              }
              color={dueIn7DaysSubs.length > 0 ? THEME.gold : THEME.sage}
              icon={<CalendarDays />}
            />
          </div>

          {/* Actionable Price Changed or Urgent Renewal Notice Banner */}
          {priceChangedSubs.length > 0 && (
            <Card
              style={{
                marginBottom: 16,
                padding: "12px 18px",
                background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.rust} 8%, var(--surface-0)), var(--surface-0))`,
                border: `1px solid color-mix(in srgb, ${THEME.rust} 25%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <TrendingUp size={18} color={THEME.rust} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                    Subscription Price Changes Detected
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted }}>
                    {priceChangedSubs.length} subscription{priceChangedSubs.length > 1 ? "s have" : " has"} recent billed amounts different from tracked costs.
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {priceChangedSubs.map((s) => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant="ghost"
                    onClick={() => updateSub(s.id!, { amount: s.lastPaidAmount })}
                    style={{ fontSize: 11, color: THEME.rust, border: `1px solid color-mix(in srgb, ${THEME.rust} 30%, transparent)` }}
                  >
                    Update {s.name} to <Money value={s.lastPaidAmount} variant="exact" />
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {/* Savings Optimization Tip Banner */}
          {potentialAnnualSavings > 1000 && (
            <Card
              style={{
                marginBottom: 16,
                padding: "12px 18px",
                background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.sage} 8%, var(--surface-0)), var(--surface-0))`,
                border: `1px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Percent size={18} color={THEME.sage} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                    Switch to Annual Billing Opportunity
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted }}>
                    You have {monthlyOnlySubs.length} monthly subscriptions. Switching eligible services to annual plans could save up to{" "}
                    <strong style={{ color: THEME.sage }}><Money value={potentialAnnualSavings} variant="full" />/year</strong> (~16% discount).
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Controls Hub: Multi-Mode View Switcher, Search, and Multi-Filters */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 18,
              padding: "12px 16px",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              borderRadius: "var(--radius-lg)",
            }}
          >
            {/* View Mode Buttons */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => setViewMode("cards")}
                className={`demat-portfolio-pill ${viewMode === "cards" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontWeight: 700 }}
              >
                <LayoutGrid size={14} /> Category Grid
              </button>
              <button
                onClick={() => setViewMode("timeline")}
                className={`demat-portfolio-pill ${viewMode === "timeline" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontWeight: 700 }}
              >
                <CalendarDays size={14} /> Renewal Calendar
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`demat-portfolio-pill ${viewMode === "table" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontWeight: 700 }}
              >
                <TableIcon size={14} /> Full Ledger
              </button>
              <button
                onClick={() => setViewMode("analytics")}
                className={`demat-portfolio-pill ${viewMode === "analytics" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontWeight: 700 }}
              >
                <BarChart3 size={14} /> Analytics & Matrix
              </button>
            </div>

            {/* Search and Filters */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative", minWidth: 170 }}>
                <Search
                  size={13}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: THEME.muted,
                  }}
                />
                <input
                  type="text"
                  placeholder="Search service, note, user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px 6px 30px",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-1)",
                    color: THEME.ink,
                    fontSize: 12,
                    outline: "none",
                  }}
                />
              </div>

              {/* Owner Filter */}
              {familyProfiles.length > 1 && (
                <select
                  value={filterOwner}
                  onChange={(e) => setFilterOwner(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-1)",
                    color: THEME.ink,
                    fontSize: 12,
                    outline: "none",
                  }}
                >
                  <option value="all">All Members</option>
                  {familyProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatProfileOption(p)}
                    </option>
                  ))}
                </select>
              )}

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${THEME.line}`,
                  background: "var(--surface-1)",
                  color: THEME.ink,
                  fontSize: 12,
                  outline: "none",
                }}
              >
                <option value="all">All Categories</option>
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Status Filter */}
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "active", label: "Active" },
                    { id: "dueSoon", label: "Due Soon" },
                    { id: "paused", label: "Paused" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setFilterStatus(s.id)}
                    className={`demat-portfolio-pill ${filterStatus === s.id ? "active" : ""}`}
                    style={{ fontSize: 11, padding: "5px 10px" }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      {subscriptions.length === 0 ? (
        <EmptyState
          icon={Repeat}
          gradient={`linear-gradient(135deg, ${THEME.gold} 0%, color-mix(in srgb, ${THEME.gold} 55%, white) 100%)`}
          dotColor={THEME.gold}
          title="No Subscriptions Tracked"
          description="Track Netflix, Spotify, Swiggy One, ChatGPT, cloud storage, broadband, and any recurring bill — monthly or annual — with automated renewal tracking."
          pills={[
            "Streaming & OTT",
            "SaaS & AI Tools",
            "Broadband & Utilities",
            "Renewal Reminders",
          ]}
          buttonLabel="Add First Subscription"
          onAdd={() => setShow(true)}
        />
      ) : filteredSubs.length === 0 ? (
        <Card style={{ padding: 48, textAlign: "center" }}>
          <div style={{ color: THEME.muted, fontSize: 13, marginBottom: 12 }}>
            No subscriptions match your active filters or search term.
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearchQuery("");
              setFilterCategory("all");
              setFilterOwner("all");
              setFilterCycle("all");
              setFilterStatus("all");
            }}
          >
            Clear Filters
          </Button>
        </Card>
      ) : viewMode === "analytics" ? (
        /* ANALYTICS & OPTIMIZATION MATRIX VIEW */
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {/* Category Donut Breakdown Card */}
            <Card style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PieIcon size={16} color={THEME.accent} />
                  <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>Monthly Spend by Category</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>
                  Total: <Money value={totalMonthly} variant="full" />/mo
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <div style={{ width: 140, height: 140, position: "relative", flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="monthly"
                        nameKey="category"
                        stroke="var(--surface-0)"
                        strokeWidth={2}
                      >
                        {categoryBreakdown.map((c) => (
                          <Cell key={c.category} fill={c.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any, name: any) => [
                          privacyMode ? "••••" : fmtINRFull(Number(value)),
                          name,
                        ]}
                        contentStyle={{
                          background: "var(--surface-0)",
                          border: `1px solid ${THEME.line}`,
                          borderRadius: 8,
                          fontSize: 12,
                          color: THEME.ink,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>SHARE</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>
                      {activeSubs.length} plans
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 8 }}>
                  {categoryBreakdown.map((c) => (
                    <div key={c.category} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                      <span style={{ color: THEME.ink, fontWeight: 700, flex: 1 }}>{c.category}</span>
                      <span style={{ color: THEME.muted, fontSize: 11 }}>
                        {c.count} {c.count === 1 ? "plan" : "plans"} ({((c.monthly / (totalMonthly || 1)) * 100).toFixed(0)}%)
                      </span>
                      <span style={{ color: THEME.ink, fontWeight: 800 }}>
                        <Money value={c.monthly} variant="full" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Billing Frequency & Burn Rate Card */}
            <Card style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Clock size={16} color={THEME.gold} />
                <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>Billing Cycle Breakdown & Burn Rate</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
                  <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>Daily Burn</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginTop: 4 }}>
                    <Money value={totalMonthly / 30} variant="full" />
                  </div>
                  <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>per day cost</div>
                </div>
                <div style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
                  <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>Annual Commitment</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: THEME.rust, marginTop: 4 }}>
                    <Money value={totalAnnual} variant="full" />
                  </div>
                  <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>per year total</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
                  Cycle Distribution
                </div>
                {(["monthly", "quarterly", "half-yearly", "yearly"] as const).map((cycle) => {
                  const subsInCycle = activeSubs.filter((s: any) => (s.cycle || "monthly").toLowerCase() === cycle);
                  const spendInCycle = subsInCycle.reduce((sum: number, s: any) => sum + getSubscriptionMonthlyEquivalent(s.amount, s.cycle), 0);
                  if (subsInCycle.length === 0) return null;
                  return (
                    <div key={cycle} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ textTransform: "capitalize", color: THEME.ink, fontWeight: 600 }}>
                        {cycle} ({subsInCycle.length})
                      </span>
                      <span style={{ fontWeight: 700, color: THEME.accent }}>
                        <Money value={spendInCycle} variant="full" />/mo
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE LEDGER VIEW */
        <Card style={{ overflow: "hidden", marginBottom: 20 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-1)", borderBottom: `1.5px solid ${THEME.line}` }}>
                  <th
                    onClick={() => handleSort("name")}
                    style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      Service {sortField === "name" && <ArrowUpDown size={11} />}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("category")}
                    style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      Category {sortField === "category" && <ArrowUpDown size={11} />}
                    </div>
                  </th>
                  {familyProfiles.length > 1 && (
                    <th
                      onClick={() => handleSort("owner")}
                      style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase", cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        Owner {sortField === "owner" && <ArrowUpDown size={11} />}
                      </div>
                    </th>
                  )}
                  <th
                    onClick={() => handleSort("amount")}
                    style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                      Billed Cost {sortField === "amount" && <ArrowUpDown size={11} />}
                    </div>
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>
                    Cycle
                  </th>
                  <th
                    onClick={() => handleSort("monthly")}
                    style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                      Monthly Equiv {sortField === "monthly" && <ArrowUpDown size={11} />}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("renewalDate")}
                    style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      Next Renewal {sortField === "renewalDate" && <ArrowUpDown size={11} />}
                    </div>
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>
                    Payment Mode
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>
                    Status
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTableSubs.map((s: any) => {
                  const monthly = getSubscriptionMonthlyEquivalent(s.amount, s.cycle);
                  const renewal = getRenewalInfo(s.renewalDate, s.cycle);
                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: `1px solid ${THEME.line}`,
                        opacity: s.paused ? 0.65 : 1,
                        transition: "background 0.15s ease",
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: THEME.ink }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <ServiceLogo name={s.name} size={28} website={s.website} category={s.category} />
                          <div>
                            <div>{s.name}</div>
                            {s.remark && <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>{s.remark}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {getCategoryIcon(s.category, 12, CATEGORY_COLORS[s.category] || THEME.accent)}
                          <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>{s.category || "Other"}</span>
                        </div>
                      </td>
                      {familyProfiles.length > 1 && (
                        <td style={{ padding: "14px 16px", fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <User size={12} color={THEME.muted} />
                            <span>{getProfileName(s.owner)}</span>
                          </div>
                        </td>
                      )}
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800 }}>
                        <Money value={s.amount} variant="exact" />
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span style={{ textTransform: "capitalize", fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                          {s.cycle}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800, color: THEME.accent }}>
                        <Money value={monthly} variant="exact" />
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 12 }}>
                        {s.renewalDate ? (
                          <div>
                            <div style={{ color: renewal.color, fontWeight: 700 }}>
                              {renewal.label}
                            </div>
                            {renewal.isPast && (
                              <div style={{ fontSize: 10, color: THEME.muted }}>
                                Stored: {fmtDate(s.renewalDate)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: THEME.muted }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          {getPaymentMethodIcon(s.paymentMethod, 12)}
                          <span>{getPaymentMethodLabel(s.paymentMethod)}</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: s.paused ? THEME.muted : THEME.sage,
                            background: `color-mix(in srgb, ${s.paused ? THEME.muted : THEME.sage} 12%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${s.paused ? THEME.muted : THEME.sage} 25%, transparent)`,
                            padding: "2px 8px",
                            borderRadius: 4,
                            textTransform: "uppercase",
                          }}
                        >
                          {s.paused ? "Paused" : "Active"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                          {!s.paused && (
                            <button
                              onClick={() => advanceSubCycle(s.id, s)}
                              disabled={togglingId === s.id}
                              className="icon-btn"
                              style={{ background: "none", border: "none", cursor: "pointer", color: THEME.sage, padding: 4 }}
                              title="Mark Paid & Advance to Next Cycle"
                            >
                              <CheckCircle2 size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => updateSub(s.id, { paused: !s.paused })}
                            className="icon-btn"
                            style={{ background: "none", border: "none", cursor: "pointer", color: s.paused ? THEME.sage : THEME.gold, padding: 4 }}
                            title={s.paused ? "Resume" : "Pause"}
                          >
                            {s.paused ? <Play size={13} /> : <Pause size={13} />}
                          </button>
                          <button
                            onClick={() => setEditSub(s)}
                            className="icon-btn"
                            style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteSub(s.id, s.name)}
                            className="icon-btn danger"
                            style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}
                            title="Delete"
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
      ) : viewMode === "timeline" ? (
        /* RENEWAL CALENDAR TIMELINE VIEW */
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {filteredSubs
            .slice()
            .sort((a: any, b: any) => {
              const renA = getRenewalInfo(a.renewalDate, a.cycle);
              const renB = getRenewalInfo(b.renewalDate, b.cycle);
              if (!renA.nextDate) return 1;
              if (!renB.nextDate) return -1;
              return new Date(renA.nextDate).getTime() - new Date(renB.nextDate).getTime();
            })
            .map((s: any) => {
              const renewal = getRenewalInfo(s.renewalDate, s.cycle);
              const monthly = getSubscriptionMonthlyEquivalent(s.amount, s.cycle);
              return (
                <Card
                  key={s.id}
                  style={{
                    padding: "14px 18px",
                    borderLeft: `4px solid ${renewal.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                    opacity: s.paused ? 0.65 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <ServiceLogo name={s.name} size={36} website={s.website} category={s.category} />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>{s.name}</span>
                        <Badge variant="muted" style={{ fontSize: 9 }}>{s.category}</Badge>
                        {familyProfiles.length > 1 && (
                          <Badge variant="muted" style={{ fontSize: 9 }}>
                            {getProfileName(s.owner)}
                          </Badge>
                        )}
                        {s.paused && <Badge variant="muted" style={{ fontSize: 9 }}>PAUSED</Badge>}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginTop: 2 }}>
                        <Money value={s.amount} variant="exact" /> · {s.cycle} (<Money value={monthly} variant="exact" />/mo) ·{" "}
                        <span style={{ color: THEME.ink }}>{getPaymentMethodLabel(s.paymentMethod)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: renewal.color }}>
                        {renewal.label}
                      </div>
                      {renewal.isPast && s.renewalDate && (
                        <div style={{ fontSize: 10, color: THEME.muted }}>
                          Last: {fmtDate(s.renewalDate)}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 4 }}>
                      {!s.paused && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => advanceSubCycle(s.id, s)}
                          loading={togglingId === s.id}
                          disabled={togglingId === s.id}
                          style={{ padding: 6, color: THEME.sage }}
                          title="Mark Paid & Advance to Next Cycle"
                          aria-label={`Renew ${s.name}`}
                        >
                          <CheckCircle2 size={13} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateSub(s.id, { paused: !s.paused })}
                        style={{ padding: 6, color: s.paused ? THEME.sage : THEME.gold }}
                        title={s.paused ? "Resume" : "Pause"}
                      >
                        {s.paused ? <Play size={13} /> : <Pause size={13} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditSub(s)}
                        style={{ padding: 6 }}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSub(s.id, s.name)}
                        style={{ padding: 6, color: THEME.rust }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
        </div>
      ) : (
        /* CATEGORY CARDS VIEW (DEFAULT) */
        <div>
          {groupedSubs.map(([cat, subs]) => {
            const collapsed = collapsedCategories.has(cat);
            const catMonthly = subs.reduce((acc: number, s: any) => acc + getSubscriptionMonthlyEquivalent(s.amount, s.cycle), 0);
            return (
              <div key={cat} style={{ marginBottom: 20 }}>
                <button
                  onClick={() => toggleCategory(cat)}
                  aria-expanded={!collapsed}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 0",
                    width: "100%",
                  }}
                >
                  {collapsed ? (
                    <ChevronRight size={15} color={THEME.muted} />
                  ) : (
                    <ChevronDown size={15} color={THEME.muted} />
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {getCategoryIcon(cat, 14, CATEGORY_COLORS[cat] || THEME.accent)}
                    <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>{cat}</span>
                  </div>
                  <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                    {subs.length} service{subs.length !== 1 ? "s" : ""} ·{" "}
                    <Money value={catMonthly} variant="full" />/mo
                  </span>
                </button>

                {!collapsed && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(380px, 100%), 1fr))",
                      gap: 12,
                    }}
                  >
                    {subs.map((s: any) => {
                      const monthly = getSubscriptionMonthlyEquivalent(s.amount, s.cycle);
                      const renewal = getRenewalInfo(s.renewalDate, s.cycle);
                      const color = renewal.urgent ? renewal.color : (CATEGORY_COLORS[s.category] || THEME.accent);

                      return (
                        <Card
                          key={s.id}
                          className="card-lift"
                          style={{
                            padding: "16px 20px",
                            borderTop: `3px solid ${color}`,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <ServiceLogo name={s.name} size={40} website={s.website} category={s.category} />

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  marginBottom: 2,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 800,
                                    fontSize: 15,
                                    color: THEME.ink,
                                    letterSpacing: "-0.01em",
                                  }}
                                >
                                  {s.name}
                                </span>
                                <Badge variant="muted" style={{ fontSize: 9, opacity: 0.8 }}>
                                  {s.category}
                                </Badge>
                                {familyProfiles.length > 1 && s.owner && s.owner !== "self" && (
                                  <Badge variant="muted" style={{ fontSize: 9 }}>
                                    {getProfileName(s.owner)}
                                  </Badge>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: THEME.muted,
                                  fontWeight: 600,
                                  display: "flex",
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                  columnGap: 6,
                                  rowGap: 2,
                                }}
                              >
                                <span style={{ color: THEME.accent, whiteSpace: "nowrap" }}>
                                  <Money value={s.amount} variant="exact" />
                                </span>
                                <span style={{ opacity: 0.4 }}>·</span>
                                <span style={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>
                                  {s.cycle}
                                </span>
                                <span style={{ opacity: 0.4 }}>·</span>
                                <span
                                  style={{
                                    color: renewal.color,
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                >
                                  {renewal.urgent && <AlertTriangle size={10} />}
                                  {s.renewalDate ? renewal.label : "No date set"}
                                </span>
                              </div>
                              {s.remark && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: THEME.muted,
                                    marginTop: 4,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontWeight: 500,
                                    opacity: 0.9,
                                  }}
                                  title={s.remark}
                                >
                                  <MessageSquare
                                    size={11}
                                    style={{ opacity: 0.7, flexShrink: 0 }}
                                  />
                                  <span
                                    style={{
                                      fontStyle: "italic",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {s.remark}
                                  </span>
                                </div>
                              )}
                              {priceChanged(s) && (
                                <div
                                  style={{
                                    fontSize: 10.5,
                                    color: THEME.rust,
                                    marginTop: 5,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    fontWeight: 700,
                                  }}
                                >
                                  <TrendingUp size={11} style={{ flexShrink: 0 }} />
                                  <span>
                                    Price changed to <Money value={s.lastPaidAmount} variant="exact" />
                                  </span>
                                  <button
                                    onClick={() => updateSub(s.id, { amount: s.lastPaidAmount })}
                                    disabled={togglingId === s.id}
                                    style={{
                                      border: "none",
                                      background: "none",
                                      color: THEME.accent,
                                      fontWeight: 800,
                                      fontSize: 10.5,
                                      cursor: "pointer",
                                      padding: 0,
                                      textDecoration: "underline",
                                    }}
                                  >
                                    {togglingId === s.id ? "Updating…" : "Update tracked cost"}
                                  </button>
                                </div>
                              )}
                            </div>

                            <div style={{ textAlign: "right", paddingRight: 4, flexShrink: 0 }}>
                              <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                                <Money value={monthly} variant="exact" />
                              </div>
                              <div
                                style={{
                                  fontSize: 9,
                                  color: THEME.muted,
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                equiv/mo
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 2, flexShrink: 0, alignItems: "center" }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => advanceSubCycle(s.id, s)}
                                loading={togglingId === s.id}
                                disabled={togglingId === s.id || deletingId === s.id}
                                style={{ padding: 6, color: THEME.sage }}
                                title="Mark Paid & Advance to Next Cycle"
                                aria-label={`Renew ${s.name}`}
                              >
                                <CheckCircle2 size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateSub(s.id, { paused: !s.paused })}
                                loading={togglingId === s.id}
                                disabled={togglingId === s.id || deletingId === s.id}
                                style={{ padding: 6, color: THEME.gold }}
                                title="Pause"
                                aria-label={`Pause ${s.name}`}
                              >
                                <Pause size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditSub(s)}
                                style={{ padding: 6 }}
                                title="Edit"
                                aria-label="Edit subscription"
                              >
                                <Pencil size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteSub(s.id, s.name)}
                                loading={deletingId === s.id}
                                disabled={togglingId === s.id || deletingId === s.id}
                                style={{ padding: 6, color: THEME.rust }}
                                title="Delete"
                                aria-label="Delete subscription"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                          {totalMonthly > 0 && (
                            <div style={{ marginTop: 4 }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginBottom: 3,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 9,
                                    color: THEME.muted,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                  }}
                                >
                                  Share of monthly
                                </span>
                                <span style={{ fontSize: 9, color, fontWeight: 700 }}>
                                  {((monthly / totalMonthly) * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="progress-track">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${Math.min((monthly / totalMonthly) * 100, 100)}%`,
                                    background: color,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Paused Subscriptions Drawer */}
          {pausedSubs.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: THEME.muted }}>Paused Services</span>
                <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                  {pausedSubs.length} service{pausedSubs.length !== 1 ? "s" : ""} ·{" "}
                  <Money value={pausedMonthlySavings} variant="full" />/mo saved
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(380px, 100%), 1fr))",
                  gap: 12,
                }}
              >
                {pausedSubs.map((s: any) => {
                  const monthly = getSubscriptionMonthlyEquivalent(s.amount, s.cycle);
                  return (
                    <Card
                      key={s.id}
                      style={{
                        padding: "16px 20px",
                        borderTop: `3px solid ${THEME.muted}`,
                        opacity: 0.7,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <ServiceLogo name={s.name} size={40} website={s.website} category={s.category} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 2,
                              flexWrap: "wrap",
                            }}
                          >
                            <span style={{ fontWeight: 800, fontSize: 15, color: THEME.ink }}>
                              {s.name}
                            </span>
                            <Badge variant="muted" style={{ fontSize: 9 }}>
                              PAUSED
                            </Badge>
                            <Badge variant="muted" style={{ fontSize: 9, opacity: 0.8 }}>
                              {s.category}
                            </Badge>
                          </div>
                          <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                            <Money value={s.amount} variant="exact" /> · {s.cycle} · {getPaymentMethodLabel(s.paymentMethod)}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", paddingRight: 4, flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.muted }}>
                            <Money value={monthly} variant="exact" />/mo
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateSub(s.id, { paused: false })}
                            loading={togglingId === s.id}
                            disabled={togglingId === s.id || deletingId === s.id}
                            style={{ padding: 6, color: THEME.sage }}
                            title="Resume"
                            aria-label={`Resume ${s.name}`}
                          >
                            <Play size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditSub(s)}
                            style={{ padding: 6 }}
                            title="Edit"
                            aria-label="Edit subscription"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSub(s.id, s.name)}
                            loading={deletingId === s.id}
                            disabled={togglingId === s.id || deletingId === s.id}
                            style={{ padding: 6, color: THEME.rust }}
                            title="Delete"
                            aria-label="Delete subscription"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {show && (
        <SubModal
          onClose={() => setShow(false)}
          onSave={saveNewSub}
          saving={savingNewSub}
        />
      )}
      {editSub && (
        <SubModal
          initialValues={editSub}
          onClose={() => setEditSub(null)}
          onSave={saveSubEdit}
          saving={savingSubEdit}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete "${confirmDelete.name}"? This cannot be undone.`}
          onConfirm={() => {
            doDeleteSub(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
