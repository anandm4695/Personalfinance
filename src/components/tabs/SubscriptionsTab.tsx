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
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, fmtINRExact } from "../../utils/finance";
import { SubModal } from "../modals/SubModal";
import { SectionTitle } from "../ui/SectionTitle";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { Prv, usePrivacy } from "../../context/PrivacyContext";

// Fixed, validated colorblind-safe order (see THEME.chart1..6 / --t-chart-N in
// styles.css) — "Other" gets the neutral muted gray, a deliberate exception
// (not part of the 6-color categorical sequence) since it's a catch-all, not
// a real identity.
const CATEGORY_COLORS: Record<string, string> = {
  Entertainment: THEME.chart1,
  Productivity: THEME.chart2,
  "Storage/Cloud": THEME.chart3,
  "News/Media": THEME.chart4,
  Fitness: THEME.chart5,
  Utilities: THEME.chart6,
  Other: THEME.muted,
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

  // User-supplied website takes priority over the hardcoded name→domain map
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
  const [fallbackLevel, setFallbackLevel] = React.useState<number>(0); // 0: hunter.io, 1: google favicon, 2: initials

  React.useEffect(() => {
    if (domain) {
      setImgSrc(`https://logos.hunter.io/${domain}`);
      setFallbackLevel(0);
    } else {
      setImgSrc(null);
      setFallbackLevel(2);
    }
  }, [domain]);

  const handleError = () => {
    if (fallbackLevel === 0) {
      setFallbackLevel(1);
      setImgSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`);
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

function getRenewalInfo(renewalDate: string | undefined) {
  if (!renewalDate) return { days: null, label: "No date set", color: THEME.muted, urgent: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rd = new Date(renewalDate + "T00:00:00");
  rd.setHours(0, 0, 0, 0);
  const days = Math.ceil((rd.getTime() - today.getTime()) / 86400000);
  if (days < 0)
    return { days, label: `${Math.abs(days)}d overdue`, color: THEME.rust, urgent: true };
  if (days === 0) return { days, label: "Due today", color: THEME.rust, urgent: true };
  if (days <= 7) return { days, label: `Due in ${days}d`, color: THEME.gold, urgent: true };
  if (days <= 30) return { days, label: `Due in ${days}d`, color: THEME.accent, urgent: false };
  return { days, label: `${days}d away`, color: THEME.muted, urgent: false };
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

export function SubscriptionsTab({ state, addItem, removeItem, updateItem, metrics }: any) {
  const { privacyMode } = usePrivacy();
  const [show, setShow] = useState(false);
  const [editSub, setEditSub] = useState<any>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const activeSubs = state.subscriptions.filter((s: any) => !s.paused);
  const pausedSubs = state.subscriptions.filter((s: any) => s.paused);

  const totalMonthly = useMemo(
    () =>
      activeSubs.reduce((acc: number, s: any) => {
        const amount = Number(s.amount) || 0;
        if (s.cycle === "yearly") return acc + amount / 12;
        if (s.cycle === "quarterly") return acc + amount / 3;
        return acc + amount;
      }, 0),
    [activeSubs]
  );

  const totalAnnual = totalMonthly * 12;

  const pausedMonthlySavings = useMemo(
    () =>
      pausedSubs.reduce((acc: number, s: any) => {
        const amount = Number(s.amount) || 0;
        if (s.cycle === "yearly") return acc + amount / 12;
        if (s.cycle === "quarterly") return acc + amount / 3;
        return acc + amount;
      }, 0),
    [pausedSubs]
  );

  const upcomingSubs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + 30);
    return state.subscriptions
      .filter((s: any) => !s.paused && s.renewalDate)
      .filter((s: any) => {
        // Parse as local midnight (matches `today`/`limit`, both local) — a bare
        // "YYYY-MM-DD" parses as UTC midnight, which in IST lands at 05:30 local,
        // pushing a renewal due exactly on the 30-day boundary out of range.
        const rd = new Date(s.renewalDate + "T00:00:00");
        return rd >= today && rd <= limit;
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.renewalDate + "T00:00:00").getTime() -
          new Date(b.renewalDate + "T00:00:00").getTime()
      );
  }, [state.subscriptions]);

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

  // Category → monthly-equivalent spend, for the breakdown donut chart. Reuses the
  // exact same category grouping as the accordion above so the two never disagree.
  const categoryBreakdown = useMemo(
    () =>
      groupedSubs
        .map(([cat, subs]) => ({
          category: cat,
          monthly: (subs as any[]).reduce((acc: number, s: any) => {
            const amount = Number(s.amount) || 0;
            if (s.cycle === "yearly") return acc + amount / 12;
            if (s.cycle === "quarterly") return acc + amount / 3;
            return acc + amount;
          }, 0),
          count: (subs as any[]).length,
          color: CATEGORY_COLORS[cat] || THEME.muted,
        }))
        .filter((c) => c.monthly > 0)
        .sort((a, b) => b.monthly - a.monthly),
    [groupedSubs]
  );

  // Subscriptions where the last bank-linked auto-posted payment (`lastPaidAmount`,
  // set by BanksTab's autoPostLinkedTransaction) differs from the tracked cost —
  // i.e. the service actually charged more/less than what's recorded here.
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
    state.subscriptions.forEach((s: any) => {
      const monthly =
        s.cycle === "yearly"
          ? Number(s.amount) / 12
          : s.cycle === "quarterly"
            ? Number(s.amount) / 3
            : Number(s.amount);
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
        sub="Manage recurring services, streaming, and software bills"
        rightElement={
          state.subscriptions.length > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
        Subscriptions
      </SectionTitle>

      {(() => {
        const tile4 =
          pausedMonthlySavings > 0
            ? {
                label: "Paused Savings",
                value: fmtINRFull(pausedMonthlySavings),
                numericValue: pausedMonthlySavings,
                formatValue: fmtINRFull,
                sub: `${pausedSubs.length} paused service${pausedSubs.length !== 1 ? "s" : ""} · /mo equiv`,
                color: THEME.muted,
                Icon: Pause,
              }
            : {
                label: "Total Tracked",
                value: String(state.subscriptions.length),
                numericValue: state.subscriptions.length,
                formatValue: (n: number) => String(Math.round(n)),
                sub: "Including paused services",
                color: THEME.muted,
                Icon: Play,
              };
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
              gap: 14,
              marginBottom: 28,
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
                    <Prv>{fmtINRFull(totalAnnual)}</Prv>/yr
                  </>
                ) : (
                  <>
                    Projected monthly spend · <Prv>{fmtINRFull(totalAnnual)}</Prv>/yr
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
                  : "Total annual outgo"
              }
              color={THEME.rust}
              icon={<Clock />}
            />
            <StatCard
              label={tile4.label}
              value={tile4.value}
              numericValue={tile4.numericValue}
              formatValue={tile4.formatValue}
              sub={tile4.sub}
              color={tile4.color}
              icon={<tile4.Icon />}
            />
          </div>
        );
      })()}

      {/* ── Category Breakdown Donut ── */}
      {categoryBreakdown.length > 1 && (
        <Card
          style={{
            marginBottom: 24,
            padding: "18px 20px",
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "0 0 auto" }}>
            <div style={{ width: 150, height: 150, position: "relative", flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={2}
                    dataKey="monthly"
                    nameKey="category"
                    stroke="var(--t-paper)"
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
                      background: "var(--t-paper)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: THEME.ink,
                    }}
                    labelStyle={{ color: THEME.ink }}
                    itemStyle={{ color: THEME.ink }}
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
                <PieIcon size={13} color={THEME.muted} style={{ marginBottom: 2 }} />
                <span style={{ fontSize: 9, color: THEME.muted, fontWeight: 700 }}>By category</span>
              </div>
            </div>
          </div>
          <div style={{ flex: "1 1 220px", minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, marginBottom: 10 }}>
              Category Breakdown
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {categoryBreakdown.map((c) => (
                <div
                  key={c.category}
                  style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 3,
                      background: c.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: THEME.ink, fontWeight: 700, flex: 1 }}>{c.category}</span>
                  <span style={{ color: THEME.muted, fontWeight: 600, fontSize: 11 }}>
                    {c.count} · {((c.monthly / totalMonthly) * 100).toFixed(0)}%
                  </span>
                  <span
                    style={{
                      color: THEME.ink,
                      fontWeight: 800,
                      minWidth: 64,
                      textAlign: "right",
                    }}
                  >
                    <Prv>{fmtINRFull(c.monthly)}</Prv>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ── Upcoming Renewals Section ── */}
      {upcomingSubs.length > 0 && (
        <Card
          style={{
            marginBottom: 24,
            padding: "14px 18px",
            border: `1px solid color-mix(in srgb, ${THEME.gold} 27%, transparent)`,
            background: `color-mix(in srgb, ${THEME.gold} 4%, transparent)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Clock size={15} color={THEME.gold} />
            <span style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>
              Upcoming Renewals — next 30 days
            </span>
            <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
              (
              <Prv>
                {fmtINRFull(
                  upcomingSubs.reduce((s: number, sub: any) => s + Number(sub.amount || 0), 0)
                )}
              </Prv>{" "}
              total)
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {upcomingSubs.map((s: any) => {
              const { days, color } = getRenewalInfo(s.renewalDate);
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "var(--t-paper)",
                    border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
                    minWidth: 160,
                  }}
                >
                  <ServiceLogo name={s.name} size={28} website={s.website} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>{s.name}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color }}>
                      {days === 0
                        ? "Due today"
                        : days < 0
                          ? `${Math.abs(days)}d overdue`
                          : `${days}d`}{" "}
                      · <Prv>{fmtINRExact(s.amount)}</Prv>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

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
      ) : (
        <div>
          {/* ── Active subs grouped by category ── */}
          {groupedSubs.map(([cat, subs]) => {
            const collapsed = collapsedCategories.has(cat);
            const catMonthly = subs.reduce((acc: number, s: any) => {
              const amount = Number(s.amount) || 0;
              if (s.cycle === "yearly") return acc + amount / 12;
              if (s.cycle === "quarterly") return acc + amount / 3;
              return acc + amount;
            }, 0);
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
                  <span style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>{cat}</span>
                  <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                    {subs.length} service{subs.length !== 1 ? "s" : ""} ·{" "}
                    <Prv>{fmtINRFull(catMonthly)}</Prv>
                    /mo
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
                      const monthly =
                        s.cycle === "yearly"
                          ? Number(s.amount) / 12
                          : s.cycle === "quarterly"
                            ? Number(s.amount) / 3
                            : Number(s.amount);
                      const renewal = getRenewalInfo(s.renewalDate);
                      const color = renewal.urgent ? renewal.color : THEME.accent;

                      return (
                        <Card
                          key={s.id}
                          style={{ padding: "16px 20px", borderTop: `3px solid ${color}` }}
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
                                  <Prv>{fmtINRExact(s.amount)}</Prv>
                                </span>
                                <span style={{ opacity: 0.4 }}>·</span>
                                <span style={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>
                                  {s.cycle}
                                </span>
                                <span style={{ opacity: 0.4 }}>·</span>
                                {/* Renewal countdown with urgency coloring */}
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
                                  {s.renewalDate
                                    ? `${fmtDate(s.renewalDate)} (${renewal.label})`
                                    : "No date set"}
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
                                  title={`Last bank-linked payment was ${fmtINRExact(s.lastPaidAmount)}, but the tracked cost is ${fmtINRExact(s.amount)}`}
                                >
                                  <TrendingUp size={11} style={{ flexShrink: 0 }} />
                                  <span>
                                    Price {Number(s.lastPaidAmount) > Number(s.amount) ? "increased" : "changed"}
                                    {" "}to <Prv>{fmtINRExact(s.lastPaidAmount)}</Prv>
                                  </span>
                                  <button
                                    onClick={() =>
                                      updateItem("subscriptions", s.id, { amount: s.lastPaidAmount })
                                    }
                                    aria-label={`Update ${s.name} tracked cost to last paid amount`}
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
                                    Update tracked cost
                                  </button>
                                </div>
                              )}
                            </div>

                            <div style={{ textAlign: "right", paddingRight: 4, flexShrink: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                                <Prv>{fmtINRExact(monthly)}</Prv>
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
                              {s.cycle !== "monthly" && (
                                <div
                                  style={{
                                    fontSize: 10.5,
                                    color: THEME.muted,
                                    fontWeight: 700,
                                    marginTop: 4,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    gap: 3,
                                  }}
                                  title={`Actual renewal: ${fmtINRExact(s.amount)} every ${s.cycle}`}
                                >
                                  <span style={{ fontSize: 9, opacity: 0.65, fontWeight: 600 }}>
                                    RENEWAL:
                                  </span>
                                  <span style={{ color: THEME.accent }}>
                                    <Prv>{fmtINRExact(s.amount)}</Prv>
                                  </span>
                                </div>
                              )}
                            </div>

                            <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  updateItem("subscriptions", s.id, { paused: !s.paused })
                                }
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
                                onClick={() => removeItem("subscriptions", s.id)}
                                style={{ padding: 6, color: THEME.rust }}
                                title="Delete"
                                aria-label="Delete subscription"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                          {totalMonthly > 0 && (
                            <div style={{ marginTop: 10 }}>
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

          {/* ── Paused subscriptions ── */}
          {pausedSubs.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: THEME.muted }}>Paused</span>
                <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                  {pausedSubs.length} service{pausedSubs.length !== 1 ? "s" : ""} ·{" "}
                  <Prv>{fmtINRFull(pausedMonthlySavings)}</Prv>/mo saved
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
                  const monthly =
                    s.cycle === "yearly"
                      ? Number(s.amount) / 12
                      : s.cycle === "quarterly"
                        ? Number(s.amount) / 3
                        : Number(s.amount);
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
                            <Prv>{fmtINRExact(s.amount)}</Prv> · {s.cycle}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", paddingRight: 4, flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.muted }}>
                            <Prv>{fmtINRExact(monthly)}</Prv>/mo
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateItem("subscriptions", s.id, { paused: false })}
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
                            onClick={() => removeItem("subscriptions", s.id)}
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
          onSave={(v: any) => {
            addItem("subscriptions", v);
            setShow(false);
          }}
        />
      )}
      {editSub && (
        <SubModal
          initialValues={editSub}
          onClose={() => setEditSub(null)}
          onSave={(v: any) => {
            updateItem("subscriptions", editSub.id, v);
            setEditSub(null);
          }}
        />
      )}
    </div>
  );
}
