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
  LabelList,
} from "recharts";
import { THEME, PIE_COLORS } from "../../utils/constants";
import { useMasterData } from "../../utils/masterData";
import {
  fmtINR,
  fmtINRFull,
  rdMaturity,
  calculateEpfBalance,
  monthsBetween,
  today,
  getGoldPricePerGram,
  GOLD_PURITY_FACTOR,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";
import { Prv, usePrivacy } from "../../context/PrivacyContext";

// Family-member swatch colors. Deliberately drawn from the app's fixed
// "extension" tokens (--t-violet/--t-cyan/--t-pink/--t-gold — see THEME
// comment in constants.ts) rather than raw hex: these are theme-aware
// (light/dark) automatically via the CSS var and, critically, are NOT part
// of the 11 user-selectable ACCENT_PALETTES, so a member's color can never
// collide with the app's live accent color the way the old raw-hex set did
// (every one of its 4 entries happened to exactly equal a preset accent).
const MEMBER_COLORS = [THEME.violet, THEME.cyan, THEME.pink, THEME.gold];
const MEMBER_ICONS = {
  self: Crown,
  wife: Heart,
  daughter: Baby,
  huf: Building2,
};

// Asset-class swatch colors for the allocation pies/legends. A handful of
// these used to exactly equal a user-selectable ACCENT_PALETTES hex (Cash ==
// "indigo" preset, Equity == "emerald", PPF == "amber", Insurance ==
// "purple", Bonds == "teal") — nudged those five off the exact preset values
// below so a themed accent color never becomes visually indistinguishable
// from one of these category dots. The rest were already distinct.
const ASSET_CLASS_COLORS_LIGHT = {
  Cash: "#3B5BDB",
  "Fixed Deposits": "#0891B2",
  "Recurring Deposits": "#06B6D4",
  Equity: "#0E9F6E",
  "Mutual Funds": "#10B981",
  PPF: "#C2650C",
  NPS: "#EA580C",
  EPF: "#F59E0B",
  Insurance: "#8B5CF6",
  "Real Estate": "#DC2626",
  Vehicles: "#64748B",
  Bonds: "#0F9B8E",
  "Investment Plans": "#6D28D9",
  "Gold & SGBs": "#B45309",
  "Loans Given": "#0369A1",
  "Prepaid Cards": "#4338CA",
  "Rental Properties": "#BE185D",
  "Security Deposit": "#475569",
  "Informal Loans Given": "#1D4ED8",
};

const ASSET_CLASS_COLORS_DARK = {
  Cash: "#748FFC",
  "Fixed Deposits": "#22D3EE",
  "Recurring Deposits": "#67E8F9",
  Equity: "#3DD68C",
  "Mutual Funds": "#6EE7B7",
  PPF: "#F2A93B",
  NPS: "#FB923C",
  EPF: "#FCD34D",
  Insurance: "#B197FC",
  "Real Estate": "#F87171",
  Vehicles: "#94A3B8",
  Bonds: "#5CE1D0",
  "Investment Plans": "#C084FC",
  "Gold & SGBs": "#FCD34D",
  "Loans Given": "#38BDF8",
  "Prepaid Cards": "#818CF8",
  "Rental Properties": "#F472B6",
  "Security Deposit": "#94A3B8",
  "Informal Loans Given": "#60A5FA",
};

const getMemberColors = () => MEMBER_COLORS;
const getAssetClassColors = (dark: boolean) =>
  dark ? ASSET_CLASS_COLORS_DARK : ASSET_CLASS_COLORS_LIGHT;

// ── Custom Tooltip for Recharts ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const isPie = payload[0]?.payload?.percent !== undefined || payload[0]?.payload?.cx !== undefined;

  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--surface-0) 90%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1.5px solid var(--t-line)`,
        borderRadius: "12px",
        padding: "14px 16px",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minWidth: "200px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: "var(--t-muted)",
          borderBottom: `1px solid var(--t-line)`,
          paddingBottom: "6px",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {isPie ? "Wealth Share" : label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {payload.map((entry: any, index: number) => {
          const color = entry.color || entry.fill;
          const value = Number(entry.value) || 0;
          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: color,
                    display: "inline-block",
                  }}
                />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--t-ink)" }}>
                  {entry.name}
                </span>
              </div>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--t-ink)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <Prv>{fmtINRFull(value)}</Prv>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Fraction of a real estate property's value attributable to `owner`. Properties
// can be jointly held (`owners: [{id, sharePct}]`); this falls back to the
// legacy single `owner` field (100% share) for properties saved before joint
// ownership existed.
const realEstateShareFor = (property, owner) => {
  if (Array.isArray(property.owners) && property.owners.length > 0) {
    const match = property.owners.find((o) => o?.id === owner);
    return match ? Number(match.sharePct || 0) / 100 : 0;
  }
  return property.owner === owner ? 1 : 0;
};

const memberAssets = (state, owner, marketData) => {
  const filter = (arr) => (arr || []).filter((a) => a.owner === owner);

  const cash = filter(state.bankAccounts).reduce((s, a) => s + Number(a.balance || 0), 0);
  const fd = filter(state.fixedDeposits).reduce((s, f) => s + Number(f.principal || 0), 0);
  const rd = filter(state.recurringDeposits).reduce((s, r) => {
    const elapsed = r.startDate
      ? Math.min(Number(r.tenureMonths || 0), Math.max(0, monthsBetween(r.startDate, today())))
      : Number(r.tenureMonths || 0);
    return s + rdMaturity(Number(r.monthly || 0), Number(r.rate || 0), elapsed);
  }, 0);
  const stocks = filter(state.stocks).reduce((s, st) => {
    const yfSym = `${(st.symbol || "").replace(/\.(NS|BO)$/i, "")}.${(st.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
    const md = (marketData || {})[yfSym];
    const livePrice = md?.price ?? Number(st.currentPrice || 0);
    const fallbackPrice = livePrice || Number(st.avgPrice || 0);
    return s + Number(st.qty || 0) * fallbackPrice;
  }, 0);
  const mf = filter(state.mutualFunds).reduce((s, m) => {
    const liveNav = Number(m.currentNav || 0);
    const fallbackNav =
      liveNav ||
      Number(m.buyNav || 0) ||
      (Number(m.units || 1) > 0 ? Number(m.invested || 0) / Number(m.units || 1) : 0);
    return s + Number(m.units || 0) * fallbackNav;
  }, 0);
  const ppf = filter(state.ppf).reduce((s, p) => s + Number(p.balance || 0), 0);
  const nps = filter(state.nps).reduce((s, n) => {
    const bal = Number(n.balance) || 0;
    if (bal > 0) return s + bal;
    return (
      s +
      (n.transactions || []).reduce(
        (ss, t) => ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
        0
      )
    );
  }, 0);
  const epf = filter(state.epf).reduce((s, e) => s + calculateEpfBalance(e), 0);
  const lic = filter(state.lic).reduce((s, l) => {
    const txTotal = (l.transactions || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);
    return s + (txTotal > 0 ? txTotal : Number(l.premiumPaid || 0));
  }, 0);
  const bonds = filter(state.bonds).reduce(
    (s, b) => s + Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || 0),
    0
  );
  const investmentPlans = filter(state.investmentPlans).reduce((s, ip) => {
    const txTotal = (ip.transactions || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);
    return s + (txTotal > 0 ? txTotal : Number(ip.premiumPaid || 0));
  }, 0);
  const re = (state.realEstateProperties || [])
    .filter((p) => p.status !== "sold")
    .reduce(
      (s, r) => s + Number(r.marketValue || r.agreementValue || 0) * realEstateShareFor(r, owner),
      0
    );
  const vehicles = filter(state.vehicles).reduce(
    (s, v) => s + Number(v.currentValue || v.purchasePrice || 0),
    0
  );
  const loansGiven = filter(state.loansGiven).reduce((s, l) => s + Number(l.outstanding || 0), 0);
  const prepaid = filter(state.prepaidCards)
    .filter((p) => (p.status || "").toLowerCase() !== "closed")
    .reduce((s, p) => {
      const txns = p.transactions || [];
      const loaded = txns
        .filter((t) => t.type === "load")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const spent = txns
        .filter((t) => t.type === "spend")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      return s + (loaded - spent);
    }, 0);
  const rentedDeposit = filter(state.rentedProperties || []).reduce((s, p) => {
    const actualDeposit =
      p.depositTransactions && p.depositTransactions.length > 0
        ? p.depositTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
        : Number(p.securityDeposit || 0);
    const returned = Number(p.depositReturned || 0);
    return s + Math.max(0, actualDeposit - returned);
  }, 0);
  const informalLent = filter(state.informalLent || []).reduce((s, person) => {
    const totalT = (person.tranches || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalP = (person.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return s + Math.max(0, totalT - totalP);
  }, 0);
  const rentalProps = filter(state.rentalProperties || []).reduce(
    (s, r) => s + Number(r.propertyValue || 0),
    0
  );
  const goldPrice = getGoldPricePerGram(state);
  const gold = filter(state.goldHoldings || []).reduce((s, h) => {
    const grams = Number(h.grams || 0);
    const purityMul = h.type === "physical" ? GOLD_PURITY_FACTOR[h.purity] || 1 : 1;
    return s + grams * goldPrice * purityMul;
  }, 0);

  // Liabilities
  const loans = filter(state.loansTaken).reduce((s, l) => s + Number(l.outstanding || 0), 0);
  const cc = filter(state.creditCards)
    .filter((c) => (c.status || "").toLowerCase() !== "closed")
    .reduce((s, c) => s + Number(c.outstanding || 0), 0);
  const rentalDepositLiab = filter(state.rentalProperties || []).reduce((s, p) => {
    const actualDeposit =
      p.depositTransactions && p.depositTransactions.length > 0
        ? p.depositTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
        : Number(p.securityDeposit || 0);
    const deducted = (p.depositDeductions || []).reduce((a, d) => a + Number(d.amount || 0), 0);
    const returned = Number(p.depositReturned || 0);
    return s + Math.max(0, actualDeposit - deducted - returned);
  }, 0);
  const informalBorrowed = filter(state.informalBorrowed || []).reduce((s, person) => {
    const totalT = (person.tranches || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalP = (person.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return s + Math.max(0, totalT - totalP);
  }, 0);
  const realEstateOutstanding = (() => {
    const ucShares = (state.realEstateProperties || [])
      .filter((p) => p.status === "under-construction")
      .map((p) => ({ p, share: realEstateShareFor(p, owner) }))
      .filter(({ share }) => share > 0);
    if (ucShares.length === 0) return 0;
    return ucShares.reduce((sum, { p, share }) => {
      const demanded = (state.realEstateDemands || [])
        .filter((d) => d.propertyId === p.id)
        .reduce((s, d) => s + Number(d.totalAmount || d.amount || 0), 0);
      const paid = (state.realEstatePayments || [])
        .filter((pay) => pay.propertyId === p.id)
        .reduce((s, pay) => s + Number(pay.amount || 0), 0);
      return sum + Math.max(0, demanded - paid) * share;
    }, 0);
  })();

  const totalAssets =
    cash +
    fd +
    rd +
    stocks +
    mf +
    ppf +
    nps +
    epf +
    lic +
    bonds +
    investmentPlans +
    re +
    vehicles +
    loansGiven +
    prepaid +
    rentedDeposit +
    informalLent +
    rentalProps +
    gold;
  const totalLiabilities =
    loans + cc + rentalDepositLiab + informalBorrowed + realEstateOutstanding;

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
    bonds,
    investmentPlans,
    re,
    vehicles,
    loansGiven,
    prepaid,
    rentedDeposit,
    informalLent,
    rentalProps,
    gold,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    loans,
    cc,
    rentalDepositLiab,
    informalBorrowed,
    realEstateOutstanding,
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
    { name: "Bonds", value: m.bonds },
    { name: "Insurance", value: m.lic },
    { name: "Investment Plans", value: m.investmentPlans },
    { name: "Real Estate", value: m.re },
    { name: "Vehicles", value: m.vehicles },
    { name: "Gold & SGBs", value: m.gold },
    { name: "Loans Given", value: m.loansGiven },
    { name: "Prepaid Cards", value: m.prepaid },
    { name: "Rental Properties", value: m.rentalProps },
    { name: "Security Deposit", value: m.rentedDeposit },
    { name: "Informal Loans Given", value: m.informalLent },
  ];
  return items.filter((i) => i.value > 0);
};

const getTopHoldings = (state, owner) => {
  const holdings = [];

  (state.stocks || [])
    .filter((s) => s.owner === owner)
    .forEach((s) => {
      const val = (Number(s.qty) || 0) * (Number(s.currentPrice) || Number(s.avgPrice) || 0);
      if (val > 0)
        holdings.push({ name: s.symbol || s.name || "Stock", value: val, type: "Stock" });
    });

  (state.mutualFunds || [])
    .filter((m) => m.owner === owner)
    .forEach((m) => {
      const val = (Number(m.units) || 0) * (Number(m.currentNav) || Number(m.buyNav) || 0);
      if (val > 0)
        holdings.push({ name: m.schemeName || m.name || "MF", value: val, type: "Mutual Fund" });
    });

  (state.realEstateProperties || [])
    .map((r) => ({ r, share: realEstateShareFor(r, owner) }))
    .filter(({ share }) => share > 0)
    .forEach(({ r, share }) => {
      const val = Number(r.marketValue || r.agreementValue || 0) * share;
      if (val > 0)
        holdings.push({
          name: r.name || r.type || "Property",
          value: val,
          type: share < 1 ? `Real Estate (${Math.round(share * 100)}% share)` : "Real Estate",
        });
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
      if (val > 0)
        holdings.push({ name: b.bankName || b.name || "Bank", value: val, type: "Cash" });
    });

  holdings.sort((a, b) => b.value - a.value);
  return holdings.slice(0, 3);
};

export const FamilyViewTab = ({ state, metrics, marketData }) => {
  const { familyProfiles } = useMasterData();
  const { privacyMode } = usePrivacy();
  const dark = state.settings?.darkMode ?? false;
  const ASSET_CLASS_COLORS = getAssetClassColors(dark);

  const familyData = useMemo(() => {
    const colors = getMemberColors();
    const members = familyProfiles.map((p, idx) => {
      const assets = memberAssets(state, p.id, marketData);
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
    const totalLifeCover = activeMembers.reduce((s, m) => s + m.totalLifeCover, 0);

    return { members, activeMembers, totalNetWorth, totalAssets, totalLiabilities, totalLifeCover };
  }, [state, dark, marketData, familyProfiles]);

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
      { key: "bonds", label: "Bond" },
      { key: "lic", label: "LIC Policy" },
      { key: "investmentPlans", label: "Investment Plan" },
      { key: "termPlans", label: "Term Plan" },
      { key: "realEstateProperties", label: "Real Estate" },
      { key: "vehicles", label: "Vehicle" },
      { key: "loansTaken", label: "Loan" },
      { key: "loansGiven", label: "Loan Given" },
      { key: "creditCards", label: "Credit Card" },
      { key: "prepaidCards", label: "Prepaid Card" },
      { key: "goldHoldings", label: "Gold/SGB" },
      { key: "rentalProperties", label: "Rental Property" },
      { key: "rentedProperties", label: "Rented Property" },
      { key: "informalLent", label: "Informal Loan Given" },
      { key: "informalBorrowed", label: "Informal Borrowing" },
    ];

    const profileIds = familyProfiles.map((p) => p.id);

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
  }, [state, familyProfiles]);

  const comparisonData = useMemo(() => {
    const classes = [
      { key: "cash", label: "Cash" },
      { key: "fd", label: "FD" },
      { key: "stocks", label: "Stocks" },
      { key: "mf", label: "MF" },
      { key: "ppf", label: "PPF" },
      { key: "epf", label: "EPF" },
      { key: "nps", label: "NPS" },
      { key: "bonds", label: "Bonds" },
      { key: "lic", label: "Insurance" },
      { key: "investmentPlans", label: "Inv. Plans" },
      { key: "re", label: "Real Estate" },
      { key: "vehicles", label: "Vehicles" },
      { key: "gold", label: "Gold & SGBs" },
      { key: "loansGiven", label: "Loans Given" },
      { key: "rentalProps", label: "Rental Props" },
    ];

    return classes
      .map((c) => {
        const row = { name: c.label };
        let hasValue = false;
        familyData.activeMembers.forEach((m) => {
          row[m.name] = m[c.key] || 0;
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
        name: m.name,
        value: m.netWorth,
        color: m.color,
      }));
  }, [familyData]);

  const { activeMembers, totalNetWorth, totalAssets, totalLiabilities, totalLifeCover } =
    familyData;

  // ─── EMPTY STATE ────────────────────────────────────────────────────────────
  if (activeMembers.length === 0) {
    return (
      <div className="tab-content-enter">
        <SectionTitle sub="Consolidated financial overview across all family members">
          Family View
        </SectionTitle>
        <EmptyState
          icon={Users}
          gradient={`linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, var(--t-accent) 65%, white) 100%)`}
          dotColor={THEME.accent}
          title="No Family Data Yet"
          description="Add assets with owners assigned to see a consolidated family financial dashboard. Each asset needs an owner (Self, Wife, Daughter, or HUF) to appear here."
          pills={[
            "Net Worth Breakdown",
            "Asset Comparison",
            "Insurance Coverage",
            "Contribution Split",
          ]}
        />
      </div>
    );
  }

  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="tab-content-enter"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      {/* ── PAGE HEADER ───────────────────────────────────────────── */}
      <SectionTitle sub="Consolidated financial overview across all family members">
        Family View
      </SectionTitle>

      {/* ── 1. HERO CARD — FAMILY NET WORTH ──────────────────────── */}
      <Card
        variant="hero"
        style={{
          padding: "clamp(24px, 4vw, 40px)",
          marginBottom: 8,
          position: "relative",
          overflow: "hidden",
          borderRadius: 24,
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 32,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background: "rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1.5px solid rgba(255, 255, 255, 0.15)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
              }}
            >
              <Users size={28} color="#fff" />
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "rgba(255, 255, 255, 0.6)",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  marginBottom: 4,
                }}
              >
                Consolidated Family Net Worth
              </div>
              <div
                style={{
                  fontSize: "clamp(32px, 5vw, 46px)",
                  fontWeight: 900,
                  color: "#fff",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  textShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
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
              gap: 12,
              padding: "24px 0 0",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {activeMembers.map((m) => {
              const pct = totalNetWorth > 0 ? (m.netWorth / totalNetWorth) * 100 : 0;
              const MemberIcon = MEMBER_ICONS[m.id] || User;
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: "10px 16px",
                    borderRadius: 14,
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    transition: "all 0.2s var(--ease-premium)",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${m.color} 20%, rgba(255, 255, 255, 0.1))`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <MemberIcon size={15} color="#fff" />
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#fff",
                      minWidth: 120,
                      maxWidth: 160,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={m.name}
                  >
                    {m.name}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      background: "rgba(255, 255, 255, 0.08)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        height: "100%",
                        borderRadius: 4,
                        background: `linear-gradient(90deg, ${m.color} 0%, color-mix(in srgb, ${m.color} 75%, white) 100%)`,
                        transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#fff",
                      minWidth: 100,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <Prv>{fmtINRFull(m.netWorth)}</Prv>
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: "#fff",
                      background: "rgba(255, 255, 255, 0.15)",
                      padding: "2px 8px",
                      borderRadius: 12,
                      minWidth: 42,
                      textAlign: "center",
                      fontVariantNumeric: "tabular-nums",
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
          gap: 16,
          marginBottom: 8,
        }}
      >
        <StatCard
          label="Total Family Assets"
          value={fmtINRFull(totalAssets)}
          numericValue={totalAssets}
          formatValue={fmtINRFull}
          sub="Combined Financial Capital"
          icon={<TrendingUp />}
          color={THEME.sage}
        />

        <StatCard
          label="Total Liabilities"
          value={fmtINRFull(totalLiabilities)}
          numericValue={totalLiabilities}
          formatValue={fmtINRFull}
          sub="Outstanding Debt & Cards"
          icon={<CreditCard />}
          color={totalLiabilities > 0 ? THEME.rust : THEME.sage}
        />

        <StatCard
          label="Active Profiles"
          value={`${activeMembers.length} / ${familyProfiles.length}`}
          sub="Profiles with Registered Assets"
          icon={<Users />}
          color={THEME.accent}
        />

        <StatCard
          label="Debt-to-Asset Ratio"
          value={`${debtToAssetRatio.toFixed(1)}%`}
          numericValue={debtToAssetRatio}
          formatValue={(n) => `${n.toFixed(1)}%`}
          sub={
            debtToAssetRatio > 30
              ? "High Leverage"
              : debtToAssetRatio > 15
                ? "Moderate Leverage"
                : "Healthy Leverage"
          }
          subColor={debtToAssetRatio > 30 ? THEME.rust : debtToAssetRatio > 15 ? THEME.gold : THEME.sage}
          icon={<Percent />}
          color={debtToAssetRatio > 30 ? THEME.rust : debtToAssetRatio > 15 ? THEME.gold : THEME.sage}
        />

        {totalLifeCover > 0 && (
          <StatCard
            label="Consolidated Life Cover"
            value={fmtINRFull(totalLifeCover)}
            numericValue={totalLifeCover}
            formatValue={fmtINRFull}
            sub="Aggregate Insurance Cover"
            icon={<Shield />}
            color={THEME.violet}
          />
        )}
      </div>

      {/* ── 3. NET WORTH SPLIT — DONUT + LEGEND ──────────────────── */}
      {contributionData.length > 1 && (
        <>
          <SectionTitle sub="How each member contributes to family wealth">
            Net Worth Contribution
          </SectionTitle>
          <Card style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
                gap: 32,
              }}
            >
              {/* Pie/Donut Container */}
              <div style={{ width: 220, height: 220, flexShrink: 0, margin: "0 auto" }}>
                <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={contributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      dataKey="value"
                      stroke="var(--surface-0)"
                      strokeWidth={2}
                      paddingAngle={2}
                    >
                      {contributionData.map((d, i) => (
                        <Cell
                          key={i}
                          fill={d.color}
                          style={{ outline: "none", cursor: "pointer" }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer></div>
              </div>

              {/* Legend List on Right */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  flex: 1,
                  minWidth: 240,
                }}
              >
                {contributionData.map((d) => {
                  const pct =
                    totalNetWorth > 0 ? ((d.value / totalNetWorth) * 100).toFixed(1) : "0";
                  return (
                    <div
                      key={d.name}
                      className="card-lift"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderRadius: 14,
                        background: `color-mix(in srgb, ${d.color} 6%, var(--surface-0))`,
                        border: `1.5px solid color-mix(in srgb, ${d.color} 12%, transparent)`,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: d.color,
                          flexShrink: 0,
                          boxShadow: `0 0 0 3px color-mix(in srgb, ${d.color} 20%, transparent)`,
                        }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, flex: 1 }}>
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
                      <Badge
                        variant="accent"
                        style={{ fontSize: 10, fontWeight: 800, minWidth: 42, textAlign: "center" }}
                      >
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
      <SectionTitle sub="Detailed breakdown per family member">Member Portfolios</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 350px), 1fr))",
          gap: 20,
        }}
      >
        {activeMembers.map((m) => {
          const MemberIcon = MEMBER_ICONS[m.id] || User;
          const pct = totalNetWorth > 0 ? ((m.netWorth / totalNetWorth) * 100).toFixed(1) : "0";
          return (
            <Card
              key={m.id}
              hover
              style={{
                padding: "24px 24px 20px",
                borderTop: `4px solid ${m.color}`,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* Member header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `color-mix(in srgb, ${m.color} 12%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: m.color,
                    flexShrink: 0,
                    border: `1px solid color-mix(in srgb, ${m.color} 20%, transparent)`,
                  }}
                >
                  <MemberIcon size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: THEME.ink,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {m.name}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>
                    {m.allocation.length} asset {m.allocation.length === 1 ? "class" : "classes"} ·{" "}
                    {pct}% of family
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

              {/* Assets / Liabilities Sub-Cards */}
              <div style={{ display: "flex", gap: 10 }}>
                {(() => {
                  const assetColor = THEME.sage;
                  const liabColor = THEME.rust;
                  return (
                    <>
                      <div
                        style={{
                          flex: 1,
                          padding: "10px 14px",
                          borderRadius: 12,
                          background: `color-mix(in srgb, ${assetColor} 8%, var(--surface-0))`,
                          border: `1.5px solid color-mix(in srgb, ${assetColor} 15%, transparent)`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: assetColor,
                            marginBottom: 4,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
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
                          borderRadius: 12,
                          background: `color-mix(in srgb, ${liabColor} 8%, var(--surface-0))`,
                          border: `1.5px solid color-mix(in srgb, ${liabColor} 15%, transparent)`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: liabColor,
                            marginBottom: 4,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
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
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    background: "var(--surface-1)",
                    padding: "12px",
                    borderRadius: 14,
                    border: `1.5px solid ${THEME.line}`,
                  }}
                >
                  <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                    <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <PieChart>
                        <Pie
                          data={m.allocation}
                          cx="50%"
                          cy="50%"
                          innerRadius={28}
                          outerRadius={45}
                          dataKey="value"
                          stroke="var(--surface-1)"
                          strokeWidth={1.5}
                          paddingAngle={1}
                        >
                          {m.allocation.map((d, i) => (
                            <Cell
                              key={i}
                              fill={ASSET_CLASS_COLORS[d.name] || PIE_COLORS[i % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer></div>
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
                          <span
                            style={{
                              color: THEME.muted,
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {d.name}
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: THEME.ink,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {allocPct}%
                          </span>
                        </div>
                      );
                    })}
                    {m.allocation.length > 5 && (
                      <div
                        style={{
                          fontSize: 10,
                          color: THEME.muted,
                          paddingLeft: 13,
                          fontWeight: 600,
                        }}
                      >
                        +{m.allocation.length - 5} more classes
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Top holdings checklist */}
              {m.topHoldings.length > 0 && (
                <div
                  style={{
                    borderTop: `1px solid ${THEME.line}`,
                    paddingTop: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Award size={13} color={THEME.muted} />
                    Top Asset Holdings
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {m.topHoldings.map((h, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderRadius: 10,
                          background: "var(--surface-0)",
                          border: `1.5px solid ${THEME.line}`,
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: THEME.ink,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h.name}
                          </div>
                          <div style={{ fontSize: 10, color: THEME.muted, marginTop: 1 }}>
                            {h.type}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: THEME.ink,
                            fontVariantNumeric: "tabular-nums",
                            marginLeft: 12,
                          }}
                        >
                          <Prv>{fmtINRFull(h.value)}</Prv>
                        </div>
                      </div>
                    ))}
                  </div>
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
          <Card style={{ padding: 24 }}>
            <div className="asset-comparison-chart" style={{ width: "100%", height: 460 }}>
              <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={comparisonData}
                  margin={{ top: 16, right: 16, left: 4, bottom: 20 }}
                  barGap={4}
                  barCategoryGap="25%"
                >
                  <defs>
                    {activeMembers.map((m) => (
                      <React.Fragment key={m.id}>
                        <linearGradient id={`gBar-${m.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={m.color} stopOpacity={dark ? 1 : 0.9} />
                          <stop offset="100%" stopColor={m.color} stopOpacity={dark ? 0.55 : 0.25} />
                        </linearGradient>
                        <filter
                          id={`glowBar-${m.id}`}
                          x="-20%"
                          y="-20%"
                          width="140%"
                          height="140%"
                        >
                          <feDropShadow
                            dx="0"
                            dy="2"
                            stdDeviation="4"
                            floodColor={m.color}
                            floodOpacity={dark ? "0.55" : "0.4"}
                          />
                        </filter>
                      </React.Fragment>
                    ))}
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke={THEME.line}
                    opacity={0.25}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: THEME.muted, fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    angle={-30}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    tick={{ fill: THEME.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (privacyMode ? "••••" : fmtINR(v))}
                    width={64}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: THEME.line, opacity: 0.4 }} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}
                    iconType="circle"
                    iconSize={8}
                  />
                  {activeMembers.map((m) => (
                    <Bar
                      key={m.id}
                      dataKey={m.name}
                      fill={`url(#gBar-${m.id})`}
                      stroke={m.color}
                      strokeWidth={1}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                      style={{ filter: `url(#glowBar-${m.id})` }}
                    >
                      <LabelList
                        dataKey={m.name}
                        position="top"
                        formatter={(v: number) => (v > 0 ? (privacyMode ? "••••" : fmtINR(v)) : "")}
                        style={{ fill: THEME.muted, fontSize: 9, fontWeight: 700 }}
                      />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer></div>
            </div>
          </Card>
        </>
      )}

      {/* ── 6. INSURANCE COVERAGE ────────────────────────────────── */}
      <SectionTitle sub="Life cover adequacy benchmark: 10x annual income">
        Insurance Coverage Adequacy
      </SectionTitle>
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {activeMembers.map((m) => {
            const MemberIcon = MEMBER_ICONS[m.id] || User;
            const hasIncome = m.memberIncome > 0;
            const isAdequate = m.coverageRatio >= 10;
            const hasCoverage = m.totalLifeCover > 0;

            const statusColor = !hasCoverage
              ? THEME.rust
              : hasIncome && !isAdequate
                ? THEME.gold
                : THEME.sage;
            const goodColor = THEME.sage;
            const warnColor = THEME.gold;
            const dangerColor = THEME.rust;

            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  borderRadius: 14,
                  background: `color-mix(in srgb, ${statusColor} 6%, var(--surface-0))`,
                  border: `1.5px solid color-mix(in srgb, ${statusColor} 20%, transparent)`,
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
                    border: `1px solid color-mix(in srgb, ${m.color} 20%, transparent)`,
                  }}
                >
                  <MemberIcon size={18} />
                </div>

                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>{m.name}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: THEME.muted,
                      marginTop: 2,
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      fontWeight: 600,
                    }}
                  >
                    <span>
                      LIC: <Prv>{fmtINRFull(m.licCover)}</Prv>
                    </span>
                    <span style={{ opacity: 0.3 }}>|</span>
                    <span>
                      Term: <Prv>{fmtINRFull(m.termCover)}</Prv>
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      color: THEME.ink,
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.01em",
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
                      <span
                        style={{
                          color: THEME.muted,
                          fontStyle: "italic",
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        No income data
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{ flexShrink: 0, marginLeft: 6, display: "flex", alignItems: "center" }}
                >
                  {!hasCoverage ? (
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: `color-mix(in srgb, ${dangerColor} 12%, transparent)`,
                        color: dangerColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <XCircle size={16} strokeWidth={2.5} />
                    </div>
                  ) : hasIncome && !isAdequate ? (
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: `color-mix(in srgb, ${warnColor} 12%, transparent)`,
                        color: warnColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <AlertTriangle size={15} strokeWidth={2.5} />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: `color-mix(in srgb, ${goodColor} 12%, transparent)`,
                        color: goodColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CheckCircle2 size={16} strokeWidth={2.5} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend indicators */}
        <div
          style={{
            display: "flex",
            gap: 18,
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1.5px solid ${THEME.line}`,
            flexWrap: "wrap",
            fontSize: 11,
            fontWeight: 700,
            color: THEME.muted,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={14} color={THEME.sage} /> Adequate Coverage (10x+ Income)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} color={THEME.gold} /> Under-insured (Coverage &lt; 10x)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <XCircle size={14} color={THEME.rust} /> Uninsured (No active policies)
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
              padding: 24,
              borderLeft: `4px solid ${THEME.gold}`,
              background: `color-mix(in srgb, ${THEME.gold} 5%, var(--surface-0))`,
              marginBottom: 12,
            }}
          >
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
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${THEME.gold} 12%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: THEME.gold,
                }}
              >
                <ShieldAlert size={18} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                  {unownedAssets.length} Asset{unownedAssets.length !== 1 ? "s" : ""} without Owner
                  assigned
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1, fontWeight: 600 }}>
                  Edit assets and set a specific member owner to incorporate them in the summary
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {unownedAssets.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                  }}
                >
                  <Info size={14} color={THEME.gold} style={{ flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: THEME.ink,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.name}
                  </span>
                  <Badge variant="gold" style={{ fontSize: 10, fontWeight: 800 }}>
                    {a.type}
                  </Badge>
                  <Badge variant="muted" style={{ fontSize: 10, fontWeight: 800 }}>
                    Unassigned ({a.owner})
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
