// @ts-nocheck
import React, { useMemo } from "react";
import {
  Users,
  User,
  TrendingUp,
  AlertTriangle,
  Shield,
  PieChart as PieIcon,
  BarChart2,
  Crown,
  Heart,
  Baby,
  Building2,
  Wallet,
  Home,
  Car,
  Banknote,
  CreditCard,
  Landmark,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Info,
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
import { fmtINR, fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";

// ─── MEMBER COLORS ──────────────────────────────────────────────────────────
const MEMBER_COLORS = ["#4F46E5", "#059669", "#D97706", "#7C3AED"];
const MEMBER_ICONS = {
  self: Crown,
  wife: Heart,
  daughter: Baby,
  huf: Building2,
};

// ─── ASSET CLASS COLORS ─────────────────────────────────────────────────────
const ASSET_CLASS_COLORS = {
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

// ─── HELPERS ────────────────────────────────────────────────────────────────
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

const memberAssets = (state, owner) => {
  const filter = (arr) => (arr || []).filter((a) => a.owner === owner);

  const cash = filter(state.bankAccounts).reduce((s, a) => s + Number(a.balance || 0), 0);
  const fd = filter(state.fixedDeposits).reduce((s, f) => s + Number(f.principal || 0), 0);
  const rd = filter(state.recurringDeposits).reduce(
    (s, r) => s + Number(r.monthly || 0) * Number(r.tenureMonths || 0),
    0
  );
  const stocks = filter(state.stocks).reduce(
    (s, st) => s + (Number(st.qty) || 0) * (Number(st.currentPrice) || Number(st.avgPrice) || 0),
    0
  );
  const mf = filter(state.mutualFunds).reduce(
    (s, m) => s + (Number(m.units) || 0) * (Number(m.currentNav) || Number(m.buyNav) || 0),
    0
  );
  const ppf = filter(state.ppf).reduce((s, p) => s + Number(p.balance || 0), 0);
  const nps = filter(state.nps).reduce((s, n) => s + Number(n.balance || 0), 0);
  const epf = filter(state.epf).reduce((s, e) => s + Number(e.balance || 0), 0);
  const lic = filter(state.lic).reduce((s, l) => s + Number(l.premiumPaid || 0), 0);
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
    cash,
    fd,
    rd,
    stocks,
    mf,
    ppf,
    nps,
    epf,
    lic,
    re,
    vehicles,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    loans,
    cc,
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
      if (val > 0)
        holdings.push({ name: m.schemeName || m.name || "MF", value: val, type: "Mutual Fund" });
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

// ─── TOOLTIP FORMATTERS ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--surface-0)",
        border: `1px solid ${THEME.line}`,
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "var(--shadow-card)",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: THEME.ink }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
          <span style={{ color: THEME.muted }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: THEME.ink }}>{fmtINRFull(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export const FamilyViewTab = ({ state, metrics, marketData }) => {
  // Compute per-member data
  const familyData = useMemo(() => {
    const members = PROFILES.map((p, idx) => {
      const assets = memberAssets(state, p.id);
      const topHoldings = getTopHoldings(state, p.id);
      const allocation = getAllocationData(assets);
      const color = MEMBER_COLORS[idx % MEMBER_COLORS.length];

      // Insurance coverage
      const licCover = (state.lic || [])
        .filter((l) => l.owner === p.id)
        .reduce((s, l) => s + Number(l.sumAssured || 0), 0);
      const termCover = (state.termPlans || [])
        .filter((t) => t.owner === p.id)
        .reduce((s, t) => s + Number(t.coverAmount || 0), 0);
      const totalLifeCover = licCover + termCover;

      // Per-member annual income from income entries
      const memberIncome = (state.income || [])
        .filter((i) => i.owner === p.id)
        .reduce((s, i) => s + Number(i.amount || 0) * 12, 0);

      return {
        ...p,
        ...assets,
        topHoldings,
        allocation,
        color,
        licCover,
        termCover,
        totalLifeCover,
        memberIncome,
        coverageRatio: memberIncome > 0 ? totalLifeCover / memberIncome : 0,
        hasAssets: assets.totalAssets > 0 || assets.totalLiabilities > 0,
      };
    });

    const activeMembers = members.filter((m) => m.hasAssets);
    const totalNetWorth = activeMembers.reduce((s, m) => s + m.netWorth, 0);
    const totalAssets = activeMembers.reduce((s, m) => s + m.totalAssets, 0);
    const totalLiabilities = activeMembers.reduce((s, m) => s + m.totalLiabilities, 0);

    return { members, activeMembers, totalNetWorth, totalAssets, totalLiabilities };
  }, [state]);

  // Find unowned assets
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
              item.name ||
              item.bankName ||
              item.symbol ||
              item.schemeName ||
              item.planName ||
              item.insurer ||
              item.bank ||
              "Unnamed",
            owner: item.owner || "none",
          });
        }
      });
    });

    return flagged;
  }, [state]);

  // Build comparison chart data
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

  // Contribution pie data
  const contributionData = useMemo(() => {
    return familyData.activeMembers
      .filter((m) => m.netWorth > 0)
      .map((m) => ({
        name: capitalize(m.id),
        value: m.netWorth,
        color: m.color,
      }));
  }, [familyData]);

  const { activeMembers, totalNetWorth, totalAssets, totalLiabilities } = familyData;

  // ─── EMPTY STATE ────────────────────────────────────────────────────────────
  if (activeMembers.length === 0) {
    return (
      <Card style={{ padding: "48px 32px", textAlign: "center" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <Users size={30} color="#fff" />
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: THEME.ink,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}
        >
          Family View
        </div>
        <div
          style={{
            fontSize: 13,
            color: THEME.muted,
            maxWidth: 380,
            margin: "0 auto 12px",
            lineHeight: 1.6,
          }}
        >
          Add assets with owners assigned to see a consolidated family financial dashboard. Each
          asset needs an owner (Self, Wife, Daughter, or HUF) to appear here.
        </div>
        <div
          style={{
            fontSize: 12,
            color: THEME.muted,
            display: "flex",
            justifyContent: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {["Net Worth Breakdown", "Asset Comparison", "Insurance Coverage", "Contribution Split"].map(
            (t) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#4F46E5",
                    display: "inline-block",
                  }}
                />
                {t}
              </span>
            )
          )}
        </div>
      </Card>
    );
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── 1. FAMILY NET WORTH HEADER ──────────────────────────────────── */}
      <Card
        style={{
          padding: "28px 32px",
          background: "linear-gradient(135deg, rgba(79,70,229,0.06) 0%, rgba(124,58,237,0.04) 100%)",
          borderTop: `4px solid #4F46E5`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Users size={24} color="#fff" />
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 4,
              }}
            >
              Family Net Worth
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: THEME.ink,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <Prv>{fmtINRFull(totalNetWorth)}</Prv>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <StatCard
            label="Total Assets"
            value={fmtINRFull(totalAssets)}
            icon={<TrendingUp />}
            color="#059669"
          />
          <StatCard
            label="Total Liabilities"
            value={fmtINRFull(totalLiabilities)}
            icon={<CreditCard />}
            color="#DC2626"
          />
          <StatCard
            label="Family Members"
            value={String(activeMembers.length)}
            sub={`of ${PROFILES.length} profiles`}
            icon={<Users />}
            color="#4F46E5"
          />
        </div>

        {/* Net worth donut */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
          <div style={{ width: 200, height: 200, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  stroke="none"
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
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            {activeMembers.map((m) => {
              const pct = totalNetWorth > 0 ? (m.netWorth / totalNetWorth) * 100 : 0;
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: m.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: THEME.ink,
                      minWidth: 80,
                    }}
                  >
                    {capitalize(m.id)}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      background: `color-mix(in srgb, ${m.color} 12%, transparent)`,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(pct, 1)}%`,
                        height: "100%",
                        borderRadius: 4,
                        background: m.color,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: THEME.ink,
                      minWidth: 100,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <Prv>{fmtINRFull(m.netWorth)}</Prv>
                  </span>
                  <Badge variant="muted" style={{ fontSize: 10 }}>
                    {pct.toFixed(1)}%
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── 2. MEMBER CARDS ─────────────────────────────────────────────── */}
      <SectionTitle icon={<User size={18} />} title="Member Portfolios" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 18,
        }}
      >
        {activeMembers.map((m) => {
          const MemberIcon = MEMBER_ICONS[m.id] || User;
          return (
            <Card
              key={m.id}
              style={{
                padding: "22px 24px",
                borderTop: `4px solid ${m.color}`,
              }}
            >
              {/* Member header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: `color-mix(in srgb, ${m.color} 14%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: m.color,
                    flexShrink: 0,
                  }}
                >
                  <MemberIcon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                    {capitalize(m.id)}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>
                    {m.allocation.length} asset {m.allocation.length === 1 ? "class" : "classes"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                      color: THEME.ink,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <Prv>{fmtINRFull(m.netWorth)}</Prv>
                  </div>
                  <div style={{ fontSize: 10, color: THEME.muted }}>Net Worth</div>
                </div>
              </div>

              {/* Assets / Liabilities summary */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "color-mix(in srgb, #059669 8%, transparent)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#059669", marginBottom: 2 }}>
                    Assets
                  </div>
                  <div
                    style={{
                      fontSize: 14,
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
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "color-mix(in srgb, #DC2626 8%, transparent)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#DC2626", marginBottom: 2 }}>
                    Liabilities
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: THEME.ink,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <Prv>{fmtINRFull(m.totalLiabilities)}</Prv>
                  </div>
                </div>
              </div>

              {/* Asset allocation mini pie */}
              {m.allocation.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={m.allocation}
                          cx="50%"
                          cy="50%"
                          innerRadius={28}
                          outerRadius={45}
                          dataKey="value"
                          stroke="none"
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
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
                    {m.allocation.slice(0, 5).map((d, i) => {
                      const pct =
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
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background:
                                ASSET_CLASS_COLORS[d.name] || PIE_COLORS[i % PIE_COLORS.length],
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ color: THEME.muted, flex: 1 }}>{d.name}</span>
                          <span style={{ fontWeight: 600, color: THEME.ink }}>{pct}%</span>
                        </div>
                      );
                    })}
                    {m.allocation.length > 5 && (
                      <div style={{ fontSize: 10, color: THEME.muted, paddingLeft: 12 }}>
                        +{m.allocation.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Top 3 holdings */}
              {m.topHoldings.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 8,
                    }}
                  >
                    Top Holdings
                  </div>
                  {m.topHoldings.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 0",
                        borderBottom: i < m.topHoldings.length - 1 ? `1px solid ${THEME.line}` : "none",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: THEME.ink,
                            maxWidth: 180,
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
                          fontSize: 12,
                          fontWeight: 700,
                          color: THEME.ink,
                          fontVariantNumeric: "tabular-nums",
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

      {/* ── 3. ASSET COMPARISON CHART ───────────────────────────────────── */}
      {comparisonData.length > 0 && (
        <>
          <SectionTitle icon={<BarChart2 size={18} />} title="Asset Class Comparison" />
          <Card style={{ padding: "24px 20px" }}>
            <div style={{ width: "100%", height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: THEME.muted, fontSize: 11 }}
                    axisLine={{ stroke: THEME.line }}
                    tickLine={false}
                    angle={-25}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fill: THEME.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => {
                      if (v >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
                      if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
                      if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                      return v;
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  {activeMembers.map((m, i) => (
                    <Bar
                      key={m.id}
                      dataKey={capitalize(m.id)}
                      fill={m.color}
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {/* ── 4. INSURANCE COVERAGE SUMMARY ───────────────────────────────── */}
      <SectionTitle icon={<Shield size={18} />} title="Insurance Coverage Summary" />
      <Card style={{ padding: "24px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {activeMembers.map((m) => {
            const MemberIcon = MEMBER_ICONS[m.id] || User;
            const hasIncome = m.memberIncome > 0;
            const isAdequate = m.coverageRatio >= 10;
            const hasCoverage = m.totalLifeCover > 0;

            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: !hasCoverage
                    ? "color-mix(in srgb, #DC2626 6%, transparent)"
                    : hasIncome && !isAdequate
                    ? "color-mix(in srgb, #D97706 6%, transparent)"
                    : "color-mix(in srgb, #059669 6%, transparent)",
                  border: `1px solid ${
                    !hasCoverage
                      ? "color-mix(in srgb, #DC2626 16%, transparent)"
                      : hasIncome && !isAdequate
                      ? "color-mix(in srgb, #D97706 16%, transparent)"
                      : "color-mix(in srgb, #059669 16%, transparent)"
                  }`,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `color-mix(in srgb, ${m.color} 14%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: m.color,
                    flexShrink: 0,
                  }}
                >
                  <MemberIcon size={18} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                    {capitalize(m.id)}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>
                    LIC: <Prv>{fmtINRFull(m.licCover)}</Prv>
                    {" + "}
                    Term: <Prv>{fmtINRFull(m.termCover)}</Prv>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: THEME.ink,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <Prv>{fmtINRFull(m.totalLifeCover)}</Prv>
                  </div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>
                    {hasIncome ? (
                      <span
                        style={{
                          fontWeight: 700,
                          color: isAdequate ? "#059669" : "#D97706",
                        }}
                      >
                        {m.coverageRatio.toFixed(1)}x income
                        {!isAdequate && " (< 10x)"}
                      </span>
                    ) : (
                      <span style={{ color: THEME.muted, fontStyle: "italic" }}>
                        No income data
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ flexShrink: 0, marginLeft: 4 }}>
                  {!hasCoverage ? (
                    <XCircle size={20} color="#DC2626" />
                  ) : hasIncome && !isAdequate ? (
                    <AlertTriangle size={20} color="#D97706" />
                  ) : (
                    <CheckCircle2 size={20} color="#059669" />
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
            gap: 16,
            marginTop: 14,
            flexWrap: "wrap",
            fontSize: 11,
            color: THEME.muted,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <CheckCircle2 size={12} color="#059669" /> Adequate (10x+ income)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <AlertTriangle size={12} color="#D97706" /> Undercovered (&lt; 10x)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <XCircle size={12} color="#DC2626" /> No coverage
          </span>
        </div>
      </Card>

      {/* ── 5. CONTRIBUTION PIE CHART ───────────────────────────────────── */}
      {contributionData.length > 1 && (
        <>
          <SectionTitle icon={<PieIcon size={18} />} title="Net Worth Contribution" />
          <Card style={{ padding: "24px 20px" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 24,
              }}
            >
              <div style={{ width: 240, height: 240, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={contributionData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      stroke="none"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
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
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {contributionData.map((d) => {
                  const pct = totalNetWorth > 0 ? ((d.value / totalNetWorth) * 100).toFixed(1) : "0";
                  return (
                    <div
                      key={d.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: `color-mix(in srgb, ${d.color} 6%, transparent)`,
                        border: `1px solid ${d.color}22`,
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
                          fontSize: 13,
                          fontWeight: 800,
                          color: THEME.ink,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Prv>{fmtINRFull(d.value)}</Prv>
                      </span>
                      <Badge variant="accent" style={{ fontSize: 10 }}>
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

      {/* ── 6. ASSETS WITHOUT OWNER ─────────────────────────────────────── */}
      {unownedAssets.length > 0 && (
        <>
          <SectionTitle icon={<AlertTriangle size={18} />} title="Assets Without Owner" />
          <Card
            style={{
              padding: "20px 24px",
              borderLeft: "4px solid #D97706",
              background: "color-mix(in srgb, #D97706 4%, transparent)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <ShieldAlert size={18} color="#D97706" />
              <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                {unownedAssets.length} asset{unownedAssets.length !== 1 ? "s" : ""} found without a
                valid owner assignment
              </div>
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 14, lineHeight: 1.6 }}>
              These assets have no owner or are assigned to "all". Assign a specific family member to
              include them in the consolidated view.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {unownedAssets.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--surface-0)",
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  <Info size={14} color="#D97706" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink, flex: 1 }}>
                    {a.name}
                  </span>
                  <Badge variant="gold" style={{ fontSize: 10 }}>
                    {a.type}
                  </Badge>
                  <Badge variant="muted" style={{ fontSize: 10 }}>
                    owner: {a.owner}
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
