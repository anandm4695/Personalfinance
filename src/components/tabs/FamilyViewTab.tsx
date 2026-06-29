// @ts-nocheck
import React, { useMemo } from "react";
import {
  Users,
  User,
  TrendingUp,
  AlertTriangle,
  Shield,
  Crown,
  Heart,
  Baby,
  Building2,
  CreditCard,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Info,
  Award,
  Percent,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { THEME, PIE_COLORS, PROFILES } from "../../utils/constants";
import { fmtINRFull, rdMaturity, calculateEpfBalance } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";

const MEMBER_COLORS_LIGHT = ["#4F46E5", "#059669", "#D97706", "#7C3AED"];
const MEMBER_COLORS_DARK = ["#818CF8", "#34D399", "#FBBF24", "#A78BFA"];
const MEMBER_ICONS = {
  self: Crown,
  wife: Heart,
  daughter: Baby,
  huf: Building2,
};

const ASSET_CLASS_COLORS_LIGHT = {
  Cash: "#2563EB",
  "Fixed Deposits": "#0891B2",
  "Recurring Deposits": "#06B6D4",
  Equity: "#059669",
  "Mutual Funds": "#10B981",
  PPF: "#D97706",
  NPS: "#EA580C",
  EPF: "#F59E0B",
  Insurance: "#7C3AED",
  "Real Estate": "#DC2626",
  Vehicles: "#64748B",
};

const ASSET_CLASS_COLORS_DARK = {
  Cash: "#60A5FA",
  "Fixed Deposits": "#22D3EE",
  "Recurring Deposits": "#67E8F9",
  Equity: "#34D399",
  "Mutual Funds": "#6EE7B7",
  PPF: "#FBBF24",
  NPS: "#FB923C",
  EPF: "#FCD34D",
  Insurance: "#A78BFA",
  "Real Estate": "#F87171",
  Vehicles: "#94A3B8",
};

const getMemberColors = (dark: boolean) => dark ? MEMBER_COLORS_DARK : MEMBER_COLORS_LIGHT;
const getAssetClassColors = (dark: boolean) => dark ? ASSET_CLASS_COLORS_DARK : ASSET_CLASS_COLORS_LIGHT;

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

const memberAssets = (state, owner) => {
  const filter = (arr) => (arr || []).filter((a) => a.owner === owner);

  const cash = filter(state.bankAccounts).reduce((s, a) => s + Number(a.balance || 0), 0);
  const fd = filter(state.fixedDeposits).reduce((s, f) => s + Number(f.principal || 0), 0);
  const rd = filter(state.recurringDeposits).reduce((s, r) => {
    const now = new Date();
    const start = r.startDate ? new Date(r.startDate + "T00:00:00") : now;
    const totalMonths = Number(r.tenureMonths || 0);
    const elapsed = Math.min(
      totalMonths,
      Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()))
    );
    return s + rdMaturity(Number(r.monthly || 0), Number(r.rate || 6), elapsed);
  }, 0);
  const stocks = filter(state.stocks).reduce(
    (s, st) => s + (Number(st.qty) || 0) * (Number(st.currentPrice) || Number(st.avgPrice) || 0),
    0
  );
  const mf = filter(state.mutualFunds).reduce(
    (s, m) => s + (Number(m.units) || 0) * (Number(m.currentNav) || Number(m.buyNav) || 0),
    0
  );
  const ppf = filter(state.ppf).reduce((s, p) => s + Number(p.balance || 0), 0);
  const nps = filter(state.nps).reduce((s: number, n: any) => {
    const bal = Number(n.balance) || 0;
    if (bal > 0) return s + bal;
    return s + (n.transactions || []).reduce(
      (ss: number, t: any) => ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0), 0
    );
  }, 0);
  const epf = filter(state.epf).reduce((s: number, e: any) => s + calculateEpfBalance(e), 0);
  const lic = filter(state.lic).reduce((s: number, l: any) => {
    const txTotal = (l.transactions || []).reduce(
      (sum: number, t: any) => sum + Number(t.amount || 0), 0
    );
    return s + (txTotal > 0 ? txTotal : Number(l.premiumPaid || 0));
  }, 0);
  const re = filter(state.realEstateProperties).reduce(
    (s, r) => s + Number(r.marketValue || r.agreementValue || 0),
    0
  );
  const vehicles = filter(state.vehicles).reduce((s, v) => s + Number(v.currentValue || 0), 0);
  const loans = filter(state.loansTaken).reduce((s, l) => s + Number(l.outstanding || 0), 0);
  const cc = filter(state.creditCards).reduce((s, c) => s + Number(c.outstanding || 0), 0);

  const totalAssets = cash + fd + rd + stocks + mf + ppf + nps + epf + lic + re + vehicles;
  const totalLiabilities = loans + cc;

  return {
    cash, fd, rd, stocks, mf, ppf, nps, epf, lic, re, vehicles,
    totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities,
    loans, cc,
  };
};

const getAllocationData = (m) => {
  const items = [
    { name: "Cash", value: m.cash },
    { name: "Fixed Deposits", value: m.fd },
    { name: "Recurring Deposits", value: m.rd },
    { name: "Equity", value: m.stocks },
    { name: "Mutual Funds", value: m.mf },
    { name: "PPF", value: m.ppf },
    { name: "NPS", value: m.nps },
    { name: "EPF", value: m.epf },
    { name: "Insurance", value: m.lic },
    { name: "Real Estate", value: m.re },
    { name: "Vehicles", value: m.vehicles },
  ];
  return items.filter((i) => i.value > 0);
};

const getTopHoldings = (state, owner) => {
  const holdings = [];

  (state.stocks || [])
    .filter((s) => s.owner === owner)
    .forEach((s) => {
      const val = (Number(s.qty) || 0) * (Number(s.currentPrice) || Number(s.avgPrice) || 0);
      if (val > 0) holdings.push({ name: s.symbol || s.name || "Stock", value: val, type: "Stock" });
    });

  (state.mutualFunds || [])
    .filter((m) => m.owner === owner)
    .forEach((m) => {
      const val = (Number(m.units) || 0) * (Number(m.currentNav) || Number(m.buyNav) || 0);
      if (val > 0) holdings.push({ name: m.schemeName || m.name || "MF", value: val, type: "Mutual Fund" });
    });

  (state.realEstateProperties || [])
    .filter((r) => r.owner === owner)
    .forEach((r) => {
      const val = Number(r.marketValue || r.agreementValue || 0);
      if (val > 0) holdings.push({ name: r.name || r.type || "Property", value: val, type: "Real Estate" });
    });

  (state.fixedDeposits || [])
    .filter((f) => f.owner === owner)
    .forEach((f) => {
      const val = Number(f.principal || 0);
      if (val > 0) holdings.push({ name: f.bank || "FD", value: val, type: "FD" });
    });

  (state.bankAccounts || [])
    .filter((b) => b.owner === owner)
    .forEach((b) => {
      const val = Number(b.balance || 0);
      if (val > 0) holdings.push({ name: b.bankName || b.name || "Bank", value: val, type: "Cash" });
    });

  holdings.sort((a, b) => b.value - a.value);
  return holdings.slice(0, 3);
};

export const FamilyViewTab = ({ state, metrics, marketData }) => {
  const dark = state.settings?.darkMode ?? false;
  const MEMBER_COLORS = getMemberColors(dark);
  const ASSET_CLASS_COLORS = getAssetClassColors(dark);

  const familyData = useMemo(() => {
    const colors = getMemberColors(dark);
    const members = PROFILES.map((p, idx) => {
      const assets = memberAssets(state, p.id);
      const topHoldings = getTopHoldings(state, p.id);
      const allocation = getAllocationData(assets);
      const color = colors[idx % colors.length];

      const licCover = (state.lic || [])
        .filter((l) => l.owner === p.id)
        .reduce((s, l) => s + Number(l.sumAssured || 0), 0);
      const termCover = (state.termPlans || [])
        .filter((t) => t.owner === p.id)
        .reduce((s, t) => s + Number(t.coverAmount || 0), 0);
      const totalLifeCover = licCover + termCover;

      const ownerIncome = (state.income || [])
        .filter((i) => i.owner === p.id)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      const latestMonthlyIncome = ownerIncome.length > 0 ? Number(ownerIncome[0].amount || 0) : 0;
      const memberIncome = latestMonthlyIncome * 12;

      return {
        ...p, ...assets, topHoldings, allocation, color,
        licCover, termCover, totalLifeCover, memberIncome,
        coverageRatio: memberIncome > 0 ? totalLifeCover / memberIncome : 0,
        hasAssets: assets.totalAssets > 0 || assets.totalLiabilities > 0,
      };
    });

    const activeMembers = members.filter((m) => m.hasAssets);
    const totalNetWorth = activeMembers.reduce((s, m) => s + m.netWorth, 0);
    const totalAssets = activeMembers.reduce((s, m) => s + m.totalAssets, 0);
    const totalLiabilities = activeMembers.reduce((s, m) => s + m.totalLiabilities, 0);
    const totalLifeCover = activeMembers.reduce((s, m) => s + m.totalLifeCover, 0);

    return { members, activeMembers, totalNetWorth, totalAssets, totalLiabilities, totalLifeCover };
  }, [state, dark]);

  const unownedAssets = useMemo(() => {
    const flagged = [];
    const allArrays = [
      { key: "bankAccounts", label: "Bank Account" },
      { key: "fixedDeposits", label: "Fixed Deposit" },
      { key: "recurringDeposits", label: "Recurring Deposit" },
      { key: "stocks", label: "Stock" },
      { key: "mutualFunds", label: "Mutual Fund" },
      { key: "ppf", label: "PPF" },
      { key: "nps", label: "NPS" },
      { key: "epf", label: "EPF" },
      { key: "lic", label: "LIC Policy" },
      { key: "termPlans", label: "Term Plan" },
      { key: "realEstateProperties", label: "Real Estate" },
      { key: "vehicles", label: "Vehicle" },
      { key: "loansTaken", label: "Loan" },
      { key: "creditCards", label: "Credit Card" },
    ];

    const profileIds = PROFILES.map((p) => p.id);

    allArrays.forEach(({ key, label }) => {
      (state[key] || []).forEach((item) => {
        if (!item.owner || item.owner === "all" || !profileIds.includes(item.owner)) {
          flagged.push({
            type: label,
            name:
              item.name || item.bankName || item.symbol || item.schemeName ||
              item.planName || item.insurer || item.bank || "Unnamed",
            owner: item.owner || "none",
          });
        }
      });
    });

    return flagged;
  }, [state]);

  const comparisonData = useMemo(() => {
    const classes = [
      { key: "cash", label: "Cash" },
      { key: "fd", label: "FD" },
      { key: "stocks", label: "Stocks" },
      { key: "mf", label: "MF" },
      { key: "ppf", label: "PPF" },
      { key: "epf", label: "EPF" },
      { key: "nps", label: "NPS" },
      { key: "re", label: "Real Estate" },
      { key: "lic", label: "Insurance" },
      { key: "vehicles", label: "Vehicles" },
    ];

    return classes
      .map((c) => {
        const row = { name: c.label };
        let hasValue = false;
        familyData.activeMembers.forEach((m) => {
          row[capitalize(m.id)] = m[c.key] || 0;
          if (m[c.key] > 0) hasValue = true;
        });
        return hasValue ? row : null;
      })
      .filter(Boolean);
  }, [familyData]);

  const contributionData = useMemo(() => {
    return familyData.activeMembers
      .filter((m) => m.netWorth > 0)
      .map((m) => ({
        name: capitalize(m.id),
        value: m.netWorth,
        color: m.color,
      }));
  }, [familyData]);

  const { activeMembers, totalNetWorth, totalAssets, totalLiabilities, totalLifeCover } = familyData;

  // ─── EMPTY STATE ────────────────────────────────────────────────────────────
  if (activeMembers.length === 0) {
    return (
      <div className="tab-content-enter">
        <Card style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, var(--t-accent) 65%, white) 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Users size={28} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
              Family View
            </div>
            <div
              style={{
                fontSize: 13,
                color: THEME.muted,
                maxWidth: 380,
                lineHeight: 1.6,
              }}
            >
              Add assets with owners assigned to see a consolidated family financial dashboard. Each
              asset needs an owner (Self, Wife, Daughter, or HUF) to appear here.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {["Net Worth Breakdown", "Asset Comparison", "Insurance Coverage", "Contribution Split"].map(
              (t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 11,
                    padding: "5px 12px",
                    borderRadius: 20,
                    background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                    color: THEME.accent,
                    fontWeight: 600,
                    border: `1px solid color-mix(in srgb, ${THEME.accent} 18%, transparent)`,
                  }}
                >
                  {t}
                </span>
              )
            )}
          </div>
        </Card>
      </div>
    );
  }

  const debtToAssetRatio = totalAssets > 0 ? ((totalLiabilities / totalAssets) * 100) : 0;

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="tab-content-enter">
      {/* ── PAGE HEADER ───────────────────────────────────────────── */}
      <SectionTitle sub="Consolidated financial overview across all family members">
        Family View
      </SectionTitle>

      {/* ── 1. HERO CARD — FAMILY NET WORTH ──────────────────────── */}
      <Card variant="hero" style={{ padding: "clamp(24px, 4vw, 40px)", marginBottom: 24 }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <Users size={26} color="#fff" />
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  marginBottom: 6,
                }}
              >
                Family Net Worth
              </div>
              <div
                style={{
                  fontSize: "clamp(28px, 5vw, 42px)",
                  fontWeight: 900,
                  color: "#fff",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <Prv>{fmtINRFull(totalNetWorth)}</Prv>
              </div>
            </div>
          </div>

          {/* Contribution bars — within hero */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: "20px 0 0",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {activeMembers.map((m) => {
              const pct = totalNetWorth > 0 ? (m.netWorth / totalNetWorth) * 100 : 0;
              const MemberIcon = MEMBER_ICONS[m.id] || User;
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `${m.color}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <MemberIcon size={14} color={m.color} />
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.85)",
                      minWidth: 70,
                    }}
                  >
                    {capitalize(m.id)}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      background: "rgba(255,255,255,0.08)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        height: "100%",
                        borderRadius: 4,
                        background: m.color,
                        transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#fff",
                      minWidth: 90,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <Prv>{fmtINRFull(m.netWorth)}</Prv>
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: m.color,
                      background: `${m.color}20`,
                      padding: "2px 8px",
                      borderRadius: 10,
                      minWidth: 38,
                      textAlign: "center",
                    }}
                  >
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── 2. QUICK STATS TILES ─────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard label="Total Assets" value={fmtINRFull(totalAssets)} icon={<TrendingUp />} color={THEME.sage} />
        <StatCard label="Liabilities" value={fmtINRFull(totalLiabilities)} icon={<CreditCard />} color={totalLiabilities > 0 ? THEME.rust : THEME.sage} />
        <StatCard label="Members" value={`${activeMembers.length} / ${PROFILES.length}`} icon={<Users />} color={THEME.accent} />
        <StatCard label="Debt Ratio" value={`${debtToAssetRatio.toFixed(1)}%`} icon={<Percent />} color={debtToAssetRatio > 30 ? THEME.rust : debtToAssetRatio > 15 ? THEME.gold : THEME.sage} />
        {totalLifeCover > 0 && (
          <StatCard label="Life Cover" value={fmtINRFull(totalLifeCover)} icon={<Shield />} color={dark ? "#A78BFA" : "#7C3AED"} />
        )}
      </div>

      {/* ── 3. NET WORTH SPLIT — DONUT + LEGEND ──────────────────── */}
      {contributionData.length > 1 && (
        <>
          <SectionTitle sub="How each member contributes to family wealth">
            Net Worth Contribution
          </SectionTitle>
          <Card style={{ padding: "24px 28px", marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
                gap: 28,
              }}
            >
              <div style={{ width: 220, height: 220, flexShrink: 0, margin: "0 auto" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={contributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      dataKey="value"
                      stroke="none"
                      paddingAngle={2}
                    >
                      {contributionData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => fmtINRFull(v)}
                      contentStyle={{
                        background: "var(--surface-0)",
                        border: `1px solid ${THEME.line}`,
                        borderRadius: 10,
                        fontSize: 12,
                        color: THEME.ink,
                      }}
                      labelStyle={{ color: THEME.muted }}
                      itemStyle={{ color: THEME.ink }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 200 }}>
                {contributionData.map((d) => {
                  const pct = totalNetWorth > 0 ? ((d.value / totalNetWorth) * 100).toFixed(1) : "0";
                  return (
                    <div
                      key={d.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderRadius: 12,
                        background: `color-mix(in srgb, ${d.color} 6%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${d.color} 12%, transparent)`,
                      }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: d.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, flex: 1 }}>
                        {d.name}
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: THEME.ink,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Prv>{fmtINRFull(d.value)}</Prv>
                      </span>
                      <Badge variant="accent" style={{ fontSize: 10, minWidth: 40, textAlign: "center" }}>
                        {pct}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ── 4. MEMBER PORTFOLIO CARDS ────────────────────────────── */}
      <SectionTitle sub="Detailed breakdown per family member">
        Member Portfolios
      </SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
          gap: 18,
          marginBottom: 28,
        }}
      >
        {activeMembers.map((m) => {
          const MemberIcon = MEMBER_ICONS[m.id] || User;
          const pct = totalNetWorth > 0 ? ((m.netWorth / totalNetWorth) * 100).toFixed(1) : "0";
          return (
            <Card
              key={m.id}
              style={{
                padding: "24px 24px 20px",
                borderTop: `4px solid ${m.color}`,
              }}
            >
              {/* Member header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 13,
                    background: `color-mix(in srgb, ${m.color} 12%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: m.color,
                    flexShrink: 0,
                  }}
                >
                  <MemberIcon size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: THEME.ink, letterSpacing: "-0.01em" }}>
                    {capitalize(m.id)}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>
                    {m.allocation.length} asset {m.allocation.length === 1 ? "class" : "classes"} · {pct}% of family
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 900,
                      color: THEME.ink,
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    <Prv>{fmtINRFull(m.netWorth)}</Prv>
                  </div>
                  <div style={{ fontSize: 10, color: THEME.muted, marginTop: 1 }}>Net Worth</div>
                </div>
              </div>

              {/* Assets / Liabilities pills */}
              <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                {(() => {
                  const assetColor = dark ? "#34D399" : "#059669";
                  const liabColor = dark ? "#F87171" : "#DC2626";
                  return (
                    <>
                <div
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: `color-mix(in srgb, ${assetColor} ${dark ? "10" : "7"}%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${assetColor} ${dark ? "18" : "12"}%, transparent)`,
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: assetColor, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Assets
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: THEME.ink,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <Prv>{fmtINRFull(m.totalAssets)}</Prv>
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: `color-mix(in srgb, ${liabColor} ${dark ? "10" : "7"}%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${liabColor} ${dark ? "18" : "12"}%, transparent)`,
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: liabColor, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Liabilities
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: THEME.ink,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <Prv>{fmtINRFull(m.totalLiabilities)}</Prv>
                  </div>
                </div>
                    </>
                  );
                })()}
              </div>

              {/* Asset allocation pie + legend */}
              {m.allocation.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                  <div style={{ width: 110, height: 110, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={m.allocation}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={48}
                          dataKey="value"
                          stroke="none"
                          paddingAngle={1}
                        >
                          {m.allocation.map((d, i) => (
                            <Cell
                              key={i}
                              fill={ASSET_CLASS_COLORS[d.name] || PIE_COLORS[i % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => fmtINRFull(v)}
                          contentStyle={{
                            background: "var(--surface-0)",
                            border: `1px solid ${THEME.line}`,
                            borderRadius: 8,
                            fontSize: 11,
                            color: THEME.ink,
                          }}
                          labelStyle={{ color: THEME.muted }}
                          itemStyle={{ color: THEME.ink }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                    {m.allocation.slice(0, 5).map((d, i) => {
                      const allocPct =
                        m.totalAssets > 0 ? ((d.value / m.totalAssets) * 100).toFixed(1) : "0";
                      return (
                        <div
                          key={d.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 11,
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background:
                                ASSET_CLASS_COLORS[d.name] || PIE_COLORS[i % PIE_COLORS.length],
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ color: THEME.muted, flex: 1 }}>{d.name}</span>
                          <span style={{ fontWeight: 700, color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>{allocPct}%</span>
                        </div>
                      );
                    })}
                    {m.allocation.length > 5 && (
                      <div style={{ fontSize: 10, color: THEME.muted, paddingLeft: 13 }}>
                        +{m.allocation.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Top 3 holdings */}
              {m.topHoldings.length > 0 && (
                <div
                  style={{
                    borderTop: `1px solid ${THEME.line}`,
                    paddingTop: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Award size={11} color={THEME.muted} />
                    Top Holdings
                  </div>
                  {m.topHoldings.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "7px 0",
                        borderBottom:
                          i < m.topHoldings.length - 1 ? `1px dashed color-mix(in srgb, ${THEME.line} 60%, transparent)` : "none",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: THEME.ink,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h.name}
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted }}>{h.type}</div>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: THEME.ink,
                          fontVariantNumeric: "tabular-nums",
                          flexShrink: 0,
                          marginLeft: 12,
                        }}
                      >
                        <Prv>{fmtINRFull(h.value)}</Prv>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── 5. ASSET CLASS COMPARISON CHART ───────────────────────── */}
      {comparisonData.length > 0 && (
        <>
          <SectionTitle sub="Side-by-side comparison across asset classes">
            Asset Class Comparison
          </SectionTitle>
          <Card style={{ padding: "24px 20px", marginBottom: 28 }}>
            <div style={{ width: "100%", height: 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 30 }}
                  barGap={4}
                  barCategoryGap="25%"
                >
                  <defs>
                    {activeMembers.map((m) => (
                      <React.Fragment key={m.id}>
                        <linearGradient id={`gBar-${m.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={m.color} stopOpacity={dark ? 1 : 0.9} />
                          <stop offset="100%" stopColor={m.color} stopOpacity={dark ? 0.7 : 0.4} />
                        </linearGradient>
                        <filter id={`glow-${m.id}`} x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={m.color} floodOpacity={dark ? "0.55" : "0.4"} />
                        </filter>
                      </React.Fragment>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: THEME.muted, fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fill: THEME.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => fmtINRFull(v)}
                  />
                  <Tooltip
                    cursor={{ fill: THEME.line, opacity: 0.4 }}
                    contentStyle={{
                      background: "var(--surface-0)",
                      border: "1px solid var(--t-line)",
                      borderRadius: 12,
                      boxShadow: "var(--shadow-xl)",
                      color: THEME.ink,
                    }}
                    labelStyle={{ color: THEME.muted }}
                    itemStyle={{ color: THEME.ink }}
                    formatter={(value) => fmtINRFull(value)}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}
                    iconType="circle"
                    iconSize={8}
                  />
                  {activeMembers.map((m) => (
                    <Bar
                      key={m.id}
                      dataKey={capitalize(m.id)}
                      fill={`url(#gBar-${m.id})`}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                      style={{ filter: `url(#glow-${m.id})` }}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {/* ── 6. INSURANCE COVERAGE ────────────────────────────────── */}
      <SectionTitle sub="Life cover adequacy benchmark: 10x annual income">
        Insurance Coverage
      </SectionTitle>
      <Card style={{ padding: "24px 24px", marginBottom: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activeMembers.map((m) => {
            const MemberIcon = MEMBER_ICONS[m.id] || User;
            const hasIncome = m.memberIncome > 0;
            const isAdequate = m.coverageRatio >= 10;
            const hasCoverage = m.totalLifeCover > 0;

            const statusColor = !hasCoverage ? (dark ? "#F87171" : "#DC2626") : hasIncome && !isAdequate ? (dark ? "#FBBF24" : "#D97706") : (dark ? "#34D399" : "#059669");
            const goodColor = dark ? "#34D399" : "#059669";
            const warnColor = dark ? "#FBBF24" : "#D97706";
            const dangerColor = dark ? "#F87171" : "#DC2626";

            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 18px",
                  borderRadius: 12,
                  background: `color-mix(in srgb, ${statusColor} ${dark ? "8" : "5"}%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${statusColor} ${dark ? "20" : "14"}%, transparent)`,
                  transition: "all 0.2s ease",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    background: `color-mix(in srgb, ${m.color} 12%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: m.color,
                    flexShrink: 0,
                  }}
                >
                  <MemberIcon size={18} />
                </div>

                <div style={{ flex: 1, minWidth: 100 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                    {capitalize(m.id)}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span>LIC: <Prv>{fmtINRFull(m.licCover)}</Prv></span>
                    <span style={{ opacity: 0.4 }}>|</span>
                    <span>Term: <Prv>{fmtINRFull(m.termCover)}</Prv></span>
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: THEME.ink,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <Prv>{fmtINRFull(m.totalLifeCover)}</Prv>
                  </div>
                  <div style={{ fontSize: 11, marginTop: 3 }}>
                    {hasIncome ? (
                      <span
                        style={{
                          fontWeight: 700,
                          color: isAdequate ? goodColor : warnColor,
                        }}
                      >
                        {m.coverageRatio.toFixed(1)}x income
                        {!isAdequate && " (need 10x)"}
                      </span>
                    ) : (
                      <span style={{ color: THEME.muted, fontStyle: "italic", fontSize: 10 }}>
                        No income data
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ flexShrink: 0, marginLeft: 2 }}>
                  {!hasCoverage ? (
                    <XCircle size={20} color={dangerColor} />
                  ) : hasIncome && !isAdequate ? (
                    <AlertTriangle size={20} color={warnColor} />
                  ) : (
                    <CheckCircle2 size={20} color={goodColor} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 18,
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1px solid ${THEME.line}`,
            flexWrap: "wrap",
            fontSize: 11,
            color: THEME.muted,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <CheckCircle2 size={13} color={dark ? "#34D399" : "#059669"} /> Adequate (10x+)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <AlertTriangle size={13} color={dark ? "#FBBF24" : "#D97706"} /> Under-covered
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <XCircle size={13} color={dark ? "#F87171" : "#DC2626"} /> No coverage
          </span>
        </div>
      </Card>

      {/* ── 7. UNOWNED ASSETS ALERT ──────────────────────────────── */}
      {unownedAssets.length > 0 && (
        <>
          <SectionTitle sub="Assign a family member to include these in the consolidated view">
            Unassigned Assets
          </SectionTitle>
          <Card
            style={{
              padding: "22px 24px",
              borderLeft: `4px solid ${dark ? "#FBBF24" : "#D97706"}`,
              background: `color-mix(in srgb, ${dark ? "#FBBF24" : "#D97706"} ${dark ? "6" : "3"}%, transparent)`,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: `color-mix(in srgb, ${dark ? "#FBBF24" : "#D97706"} 12%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ShieldAlert size={16} color={dark ? "#FBBF24" : "#D97706"} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                  {unownedAssets.length} asset{unownedAssets.length !== 1 ? "s" : ""} without owner
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>
                  Edit each asset and set a specific owner to include it
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {unownedAssets.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 14px",
                    borderRadius: 10,
                    background: "var(--surface-0)",
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  <Info size={14} color={dark ? "#FBBF24" : "#D97706"} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.name}
                  </span>
                  <Badge variant="gold" style={{ fontSize: 10 }}>
                    {a.type}
                  </Badge>
                  <Badge variant="muted" style={{ fontSize: 10 }}>
                    {a.owner}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
