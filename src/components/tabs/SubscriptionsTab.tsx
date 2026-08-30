// @ts-nocheck
import React, { useState, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
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
  Sliders,
  ExternalLink,
  ShieldCheck,
  RotateCw,
  RefreshCw,
  Percent,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  fmtINRFull,
  fmtINRExact,
  today,
  getSubscriptionMonthlyEquivalent,
  getSubscriptionCycleStep,
  getNextSubscriptionRenewal,
  addMonthsToDateStr,
} from "../../utils/finance";
import { SubModal } from "../modals/SubModal";
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

const SUB_LOGOS: Record<string, string> = {
  netflix: "netflix.com",
  spotify: "spotify.com",
  amazon: "amazon.in",
  prime: "primevideo.com",
  hotstar: "hotstar.com",
  youtube: "youtube.com",
  apple: "apple.com",
  google: "google.com",
  icloud: "apple.com",
  swiggy: "swiggy.com",
  zomato: "zomato.com",
  "1password": "1password.com",
  cursor: "cursor.com",
  openai: "openai.com",
  claude: "anthropic.com",
  figma: "figma.com",
  notion: "notion.so",
  slack: "slack.com",
  zoom: "zoom.us",
  adobe: "adobe.com",
  canva: "canva.com",
  linkedin: "linkedin.com",
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

function extractDomain(website: string): string {
  try {
    const url = website.includes("://") ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  }
}

const ServiceLogo = ({
  name,
  size = 40,
  website,
}: {
  name: string;
  size?: number;
  website?: string;
}) => {
  const n = (name || "").toLowerCase();
  let domain = "";

  if (website && website.trim()) {
    domain = extractDomain(website.trim());
  } else {
    for (const [k, d] of Object.entries(SUB_LOGOS)) {
      if (n.includes(k)) {
        domain = d;
        break;
      }
    }
  }

  const [imgSrc, setImgSrc] = React.useState<string | null>(null);
  const [fallbackLevel, setFallbackLevel] = React.useState<number>(0);

  React.useEffect(() => {
    if (domain) {
      setImgSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`);
      setFallbackLevel(0);
    } else {
      setImgSrc(null);
      setFallbackLevel(2);
    }
  }, [domain]);

  const handleError = () => {
    if (fallbackLevel === 0) {
      setFallbackLevel(1);
      setImgSrc(`https://logos.hunter.io/${domain}`);
    } else if (fallbackLevel === 1) {
      setFallbackLevel(2);
      setImgSrc(null);
    }
  };

  if (domain && fallbackLevel < 2 && imgSrc) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <img
          src={imgSrc}
          alt={name}
          style={{ width: "80%", height: "80%", objectFit: "contain" }}
          onError={handleError}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: `color-mix(in srgb, ${THEME.muted} 8%, transparent)`,
        border: `1px solid ${THEME.line}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: size / 2.5, fontWeight: 800, color: THEME.muted }}>
        {name.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
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
  const [show, setShow] = useState(false);
  const [editSub, setEditSub] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"cards" | "timeline" | "table">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "paused">("all");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

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
      const newRenewalDate = addMonthsToDateStr(currentRenewal, step);
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

  const activeSubs = (state.subscriptions || []).filter((s: any) => !s.paused);
  const pausedSubs = (state.subscriptions || []).filter((s: any) => s.paused);

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
    return (state.subscriptions || [])
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
  }, [state.subscriptions]);

  const filteredSubs = useMemo(() => {
    return (state.subscriptions || []).filter((s: any) => {
      if (filterStatus === "active" && s.paused) return false;
      if (filterStatus === "paused" && !s.paused) return false;
      if (filterCategory !== "all" && (s.category || "Other") !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (s.name || "").toLowerCase().includes(q);
        const matchCat = (s.category || "").toLowerCase().includes(q);
        const matchRemark = (s.remark || "").toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchRemark) return false;
      }
      return true;
    });
  }, [state.subscriptions, filterStatus, filterCategory, searchQuery]);

  const groupedSubs = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const cat of CATEGORY_ORDER) groups[cat] = [];
    activeSubs.forEach((s: any) => {
      const cat = s.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    return Object.entries(groups).filter(([, subs]) => subs.length > 0);
  }, [activeSubs]);

  const categoryBreakdown = useMemo(
    () =>
      groupedSubs
        .map(([cat, subs]) => ({
          category: cat,
          monthly: (subs as any[]).reduce((acc: number, s: any) => acc + getSubscriptionMonthlyEquivalent(s.amount, s.cycle), 0),
          count: (subs as any[]).length,
          color: CATEGORY_COLORS[cat] || THEME.muted,
        }))
        .filter((c) => c.monthly > 0)
        .sort((a, b) => b.monthly - a.monthly),
    [groupedSubs]
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
    const rows = ["Name,Category,Amount (₹),Cycle,Monthly Equiv (₹),Next Renewal,Status,Remark"];
    (state.subscriptions || []).forEach((s: any) => {
      const monthly = getSubscriptionMonthlyEquivalent(s.amount, s.cycle);
      rows.push(
        [
          q(s.name),
          q(s.category),
          q(s.amount),
          q(s.cycle),
          q(monthly.toFixed(0)),
          q(s.renewalDate || ""),
          q(s.paused ? "Paused" : "Active"),
          q(s.remark || ""),
        ].join(",")
      );
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscriptions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub="Manage recurring services, streaming, and software bills with live renewal tracking"
        rightElement={
          (state.subscriptions || []).length > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {pastActiveSubs.length > 0 && (
                <Button
                  onClick={syncAllPastRenewals}
                  variant="ghost"
                  loading={syncingAll}
                  icon={<RotateCw size={13} />}
                  title="Synchronize all past renewal dates to their next upcoming billing cycle"
                  style={{ border: `1px solid color-mix(in srgb, ${THEME.sage} 40%, transparent)`, color: THEME.sage, borderRadius: 8, fontSize: 12 }}
                >
                  Sync Renewals ({pastActiveSubs.length})
                </Button>
              )}
              <Button
                onClick={downloadCSV}
                variant="ghost"
                icon={<Download size={14} />}
                style={{ border: `1px solid ${THEME.line}`, borderRadius: 8 }}
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
      {state.subscriptions.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
              gap: 14,
              marginBottom: 20,
            }}
            className="subs-stats-grid"
          >
            <style>{`
              @media (max-width: 900px) {
                .subs-stats-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important; }
              }
            `}</style>
            <StatCard
              label="Monthly Equivalent"
              value={fmtINRFull(totalMonthly)}
              numericValue={totalMonthly}
              formatValue={fmtINRFull}
              sub={
                metrics?.monthIncome > 0 ? (
                  <>
                    {((totalMonthly / metrics.monthIncome) * 100).toFixed(1)}% of monthly income ·{" "}
                    <Money value={totalAnnual} variant="full" />/yr
                  </>
                ) : (
                  <>
                    Projected monthly spend · <Money value={totalAnnual} variant="full" />/yr
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
              sub="Monthly / annual recurring"
              color={THEME.accent}
              icon={<Repeat />}
            />
            <StatCard
              label="Annual Cost"
              value={fmtINRFull(totalAnnual)}
              numericValue={totalAnnual}
              formatValue={fmtINRFull}
              sub={
                metrics?.annualIncome > 0
                  ? `${((totalAnnual / metrics.annualIncome) * 100).toFixed(1)}% of annual income`
                  : "Total annual commitment"
              }
              color={THEME.rust}
              icon={<Clock />}
            />
            <StatCard
              label={pausedMonthlySavings > 0 ? "Paused Savings" : "Tracked Services"}
              value={pausedMonthlySavings > 0 ? fmtINRFull(pausedMonthlySavings) : String(state.subscriptions.length)}
              numericValue={pausedMonthlySavings > 0 ? pausedMonthlySavings : state.subscriptions.length}
              formatValue={pausedMonthlySavings > 0 ? fmtINRFull : (n) => String(Math.round(n))}
              sub={pausedMonthlySavings > 0 ? `${pausedSubs.length} paused /mo saved` : "All active + paused"}
              color={pausedMonthlySavings > 0 ? THEME.sage : THEME.muted}
              icon={pausedMonthlySavings > 0 ? <Pause /> : <Play />}
            />
          </div>

          {/* Savings Optimization Tip Banner */}
          {potentialAnnualSavings > 1000 && (
            <Card
              style={{
                marginBottom: 20,
                padding: "14px 18px",
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
                    You have {monthlyOnlySubs.length} monthly subscriptions. Switching eligible ones to annual plans can save up to{" "}
                    <strong style={{ color: THEME.sage }}><Money value={potentialAnnualSavings} variant="full" />/year</strong> (~16% discount).
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Category Breakdown Donut & Upcoming Renewals */}
          <div style={{ display: "grid", gridTemplateColumns: categoryBreakdown.length > 1 ? "1.2fr 1fr" : "1fr", gap: 16, marginBottom: 20 }}>
            {categoryBreakdown.length > 1 && (
              <Card
                style={{
                  padding: "18px 20px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 20,
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "0 0 auto" }}>
                  <div style={{ width: 130, height: 130, position: "relative", flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={2}
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
                      <PieIcon size={12} color={THEME.muted} />
                      <span style={{ fontSize: 9, color: THEME.muted, fontWeight: 700 }}>Share</span>
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: THEME.ink, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Category Breakdown
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {categoryBreakdown.slice(0, 4).map((c) => (
                      <div key={c.category} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                        <span style={{ color: THEME.ink, fontWeight: 700, flex: 1 }}>{c.category}</span>
                        <span style={{ color: THEME.muted }}>{((c.monthly / totalMonthly) * 100).toFixed(0)}%</span>
                        <span style={{ color: THEME.ink, fontWeight: 800 }}>
                          <Money value={c.monthly} variant="full" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Upcoming Renewals in Next 30 Days */}
            <Card
              style={{
                padding: "18px 20px",
                background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.gold} 6%, var(--surface-0)), var(--surface-0))`,
                border: `1px solid color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Clock size={15} color={THEME.gold} />
                  <span style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>Upcoming Renewals (30d)</span>
                </div>
                <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                  <Money value={upcomingSubs.reduce((s: number, sub: any) => s + Number(sub.amount || 0), 0)} variant="full" />
                </span>
              </div>
              {upcomingSubs.length === 0 ? (
                <div style={{ fontSize: 12, color: THEME.muted, padding: "12px 0" }}>
                  No subscriptions renewing in the next 30 days.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 130, overflowY: "auto" }}>
                  {upcomingSubs.map((s: any) => {
                    const renewal = getRenewalInfo(s.renewalDate, s.cycle);
                    const daysLabel = s.effectiveDays === 0 ? "Today" : `${s.effectiveDays}d`;
                    return (
                      <div
                        key={s.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 10px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--surface-1)",
                          border: `1px solid ${THEME.line}`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <ServiceLogo name={s.name} size={22} website={s.website} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>{s.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: renewal.color }}>{daysLabel}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>
                            <Money value={s.amount} variant="exact" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Controls Bar: Multi-Mode View Switcher, Search, and Category Filters */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
              padding: "12px 16px",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              borderRadius: "var(--radius-lg)",
            }}
          >
            {/* View Mode Buttons */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                onClick={() => setViewMode("cards")}
                className={`demat-portfolio-pill ${viewMode === "cards" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
              >
                <LayoutGrid size={13} /> Categories
              </button>
              <button
                onClick={() => setViewMode("timeline")}
                className={`demat-portfolio-pill ${viewMode === "timeline" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
              >
                <CalendarDays size={13} /> Renewal Calendar
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`demat-portfolio-pill ${viewMode === "table" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
              >
                <TableIcon size={13} /> Full Ledger
              </button>
            </div>

            {/* Search and Filters */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative", minWidth: 160 }}>
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
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px 6px 30px",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-1)",
                    color: THEME.ink,
                    fontSize: 12,
                    outline: "none",
                  }}
                />
              </div>

              {/* Status Filter */}
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "active", label: "Active" },
                    { id: "paused", label: "Paused" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setFilterStatus(s.id)}
                    className={`demat-portfolio-pill ${filterStatus === s.id ? "active" : ""}`}
                    style={{ fontSize: 11, padding: "4px 10px" }}
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
      {state.subscriptions.length === 0 ? (
        <EmptyState
          icon={Repeat}
          gradient={`linear-gradient(135deg, ${THEME.gold} 0%, color-mix(in srgb, ${THEME.gold} 55%, white) 100%)`}
          dotColor={THEME.gold}
          title="No Subscriptions Tracked"
          description="Track Netflix, Spotify, Swiggy One, cloud tools, and any recurring bill — monthly or annual — so nothing slips through unnoticed."
          pills={[
            "Streaming & OTT",
            "Monthly / Annual Cycles",
            "Renewal Alerts",
            "Monthly Spend View",
          ]}
          buttonLabel="Add First Subscription"
          onAdd={() => setShow(true)}
        />
      ) : filteredSubs.length === 0 ? (
        <Card style={{ padding: 48, textAlign: "center" }}>
          <div style={{ color: THEME.muted, fontSize: 13 }}>No subscriptions match your search or filter.</div>
        </Card>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <Card style={{ overflow: "hidden", marginBottom: 20 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-1)", borderBottom: `1.5px solid ${THEME.line}` }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Service</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Category</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Amount</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Billing Cycle</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Monthly Equiv</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Next Renewal</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((s: any) => {
                  const monthly = getSubscriptionMonthlyEquivalent(s.amount, s.cycle);
                  const renewal = getRenewalInfo(s.renewalDate, s.cycle);
                  return (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${THEME.line}`, opacity: s.paused ? 0.65 : 1 }}>
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: THEME.ink }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <ServiceLogo name={s.name} size={28} website={s.website} />
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
                    <ServiceLogo name={s.name} size={36} website={s.website} />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>{s.name}</span>
                        <Badge variant="muted" style={{ fontSize: 9 }}>{s.category}</Badge>
                        {s.paused && <Badge variant="muted" style={{ fontSize: 9 }}>PAUSED</Badge>}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginTop: 2 }}>
                        <Money value={s.amount} variant="exact" /> · {s.cycle} (<Money value={monthly} variant="exact" />/mo)
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
                      const color = renewal.urgent ? renewal.color : THEME.accent;

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
                            <ServiceLogo name={s.name} website={s.website} />

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
                                    marginTop: 5,
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
                        <ServiceLogo name={s.name} website={s.website} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 2,
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
                            <Money value={s.amount} variant="exact" /> · {s.cycle}
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
