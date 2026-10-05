import React, { useState, useMemo } from "react";
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
  Calendar,
  Layers,
  PieChart as PieChartIcon,
  BarChart3,
  Table as TableIcon,
  Wallet,
  Landmark,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  PiggyBank,
  Home,
  Coins,
  Search,
  FileCheck,
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
import { THEME, PIE_COLORS } from "../../utils/constants";
import { useMasterData, formatAge, calculateAge, isSeniorCitizen, isMinor } from "../../utils/masterData";
import { getCurrentFY } from "../../utils/appConstants";
import {
  fmtINRFull,
  fmtINR,
  rdMaturity,
  calculateEpfBalance,
  monthsBetween,
  today,
  getGoldPricePerGram,
  GOLD_PURITY_FACTOR,
  loanOutstanding,
  loanGivenOutstanding,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";
import { usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";

// Theme-aware member swatch colors (extension tokens)
const MEMBER_COLORS = [THEME.violet, THEME.cyan, THEME.pink, THEME.gold];
const MEMBER_ICONS: Record<string, React.ElementType> = {
  self: Crown,
  wife: Heart,
  spouse: Heart,
  daughter: Baby,
  son: Baby,
  child: Baby,
  huf: Building2,
  father: User,
  mother: User,
  parent: User,
};

// Asset-class colors
const ASSET_CLASS_COLORS_LIGHT: Record<string, string> = {
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
  "Govt Schemes": "#D97706",
  "Loans Given": "#0369A1",
  "Prepaid Cards": "#4338CA",
  "Rental Properties": "#BE185D",
  "Security Deposit": "#475569",
  "Informal Loans Given": "#1D4ED8",
};

const ASSET_CLASS_COLORS_DARK: Record<string, string> = {
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
  "Govt Schemes": "#FBBF24",
  "Loans Given": "#38BDF8",
  "Prepaid Cards": "#818CF8",
  "Rental Properties": "#F472B6",
  "Security Deposit": "#94A3B8",
  "Informal Loans Given": "#60A5FA",
};

// Super-category definitions
const SUPER_CATEGORY_CONFIG = {
  liquid: { label: "Liquid & Cash Reserves", color: "#3B5BDB", icon: Wallet },
  equity: { label: "Equity & Mutual Funds", color: "#10B981", icon: TrendingUp },
  fixedIncome: { label: "Fixed Income & Govt", color: "#F59E0B", icon: Landmark },
  realEstate: { label: "Real Estate & Rentals", color: "#DC2626", icon: Home },
  gold: { label: "Gold & SGBs", color: "#B45309", icon: Coins },
  other: { label: "Other Assets", color: "#8B5CF6", icon: Briefcase },
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
        background: "color-mix(in srgb, var(--surface-0) 94%, transparent)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1.5px solid var(--t-line)`,
        borderRadius: "14px",
        padding: "14px 16px",
        boxShadow: "var(--shadow-xl)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minWidth: "220px",
        zIndex: 50,
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 800,
          color: "var(--t-muted)",
          borderBottom: `1px solid var(--t-line)`,
          paddingBottom: "6px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{isPie ? "Wealth Share" : label}</span>
        {isPie && (
          <Badge variant="accent" size="xs">
            Share
          </Badge>
        )}
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: color,
                    display: "inline-block",
                    boxShadow: `0 0 0 2px color-mix(in srgb, ${color} 25%, transparent)`,
                  }}
                />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--t-ink)" }}>
                  {entry.name}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "var(--t-ink)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <Money value={value} variant="full" />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Fraction of a real estate property's value attributable to `owner`.
const realEstateShareFor = (property: any, owner: string): number => {
  if (Array.isArray(property.owners) && property.owners.length > 0) {
    const match = property.owners.find((o: any) => o?.id === owner);
    return match ? Number(match.sharePct || 0) / 100 : 0;
  }
  return property.owner === owner ? 1 : 0;
};

// Compute detailed asset & liability balance sheet for a member
const memberAssets = (state: any, owner: string, marketData?: any) => {
  const filter = (arr: any[] | undefined) => (arr || []).filter((a: any) => a.owner === owner);

  const cash = filter(state.bankAccounts).reduce((s: number, a: any) => s + Number(a.balance || 0), 0);
  const fd = filter(state.fixedDeposits).reduce((s: number, f: any) => s + Number(f.principal || 0), 0);
  const rd = filter(state.recurringDeposits).reduce((s: number, r: any) => {
    const elapsed = r.startDate
      ? Math.min(Number(r.tenureMonths || 0), Math.max(0, monthsBetween(r.startDate, today())))
      : Number(r.tenureMonths || 0);
    return s + rdMaturity(Number(r.monthly || 0), Number(r.rate || 0), elapsed);
  }, 0);
  const stocks = filter(state.stocks).reduce((s: number, st: any) => {
    const yfSym = `${(st.symbol || "").replace(/\.(NS|BO)$/i, "")}.${(st.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
    const md = (marketData || {})[yfSym];
    const livePrice = md?.price ?? Number(st.currentPrice || 0);
    const fallbackPrice = livePrice || Number(st.avgPrice || 0);
    return s + Number(st.qty || 0) * fallbackPrice;
  }, 0);
  const mf = filter(state.mutualFunds).reduce((s: number, m: any) => {
    const liveNav = Number(m.currentNav || 0);
    const fallbackNav =
      liveNav ||
      Number(m.buyNav || 0) ||
      (Number(m.units || 1) > 0 ? Number(m.invested || 0) / Number(m.units || 1) : 0);
    return s + Number(m.units || 0) * fallbackNav;
  }, 0);
  const ppf = filter(state.ppf).reduce((s: number, p: any) => s + Number(p.balance || 0), 0);
  const nps = filter(state.nps).reduce((s: number, n: any) => {
    const bal = Number(n.balance) || 0;
    if (bal > 0) return s + bal;
    return (
      s +
      (n.transactions || []).reduce(
        (ss: number, t: any) => ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
        0
      )
    );
  }, 0);
  const epf = filter(state.epf).reduce((s: number, e: any) => s + calculateEpfBalance(e), 0);
  const lic = filter(state.lic).reduce((s: number, l: any) => {
    const txTotal = (l.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    return s + (txTotal > 0 ? txTotal : Number(l.premiumPaid || 0));
  }, 0);
  const bonds = filter(state.bonds).reduce(
    (s: number, b: any) =>
      s +
      Number(
        b.totalInvestmentAmount ||
        b.totalPrincipalAmount ||
        (Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0)) ||
        b.faceValue ||
        0
      ),
    0
  );
  const investmentPlans = filter(state.investmentPlans).reduce((s: number, ip: any) => {
    const txTotal = (ip.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    return s + (txTotal > 0 ? txTotal : Number(ip.premiumPaid || 0));
  }, 0);
  const re = (state.realEstateProperties || [])
    .filter((p: any) => p.status !== "sold")
    .reduce(
      (s: number, r: any) => s + Number(r.marketValue || r.agreementValue || 0) * realEstateShareFor(r, owner),
      0
    );
  const vehicles = filter(state.vehicles).reduce(
    (s: number, v: any) => s + Number(v.currentValue || v.purchasePrice || 0),
    0
  );
  const loansGiven = filter(state.loansGiven).reduce((s: number, l: any) => s + loanGivenOutstanding(l), 0);
  const prepaid = filter(state.prepaidCards)
    .filter((p: any) => (p.status || "").toLowerCase() !== "closed")
    .reduce((s: number, p: any) => {
      const txns = p.transactions || [];
      const loaded = txns
        .filter((t: any) => t.type === "load")
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const spent = txns
        .filter((t: any) => t.type === "spend")
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      return s + (loaded - spent);
    }, 0);
  const rentedDeposit = filter(state.rentedProperties || []).reduce((s: number, p: any) => {
    const actualDeposit =
      p.depositTransactions && p.depositTransactions.length > 0
        ? p.depositTransactions.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0)
        : Number(p.securityDeposit || 0);
    const returned = Number(p.depositReturned || 0);
    return s + Math.max(0, actualDeposit - returned);
  }, 0);
  const informalLent = filter(state.informalLent || []).reduce((s: number, person: any) => {
    const tranches = person.tranches || [];
    const payments = person.payments || [];
    const totalT = tranches.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const totalP = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const net =
      tranches.length > 0 || payments.length > 0
        ? Math.max(0, totalT - totalP)
        : Number(person.amount || 0);
    return s + net;
  }, 0);
  const rentalProps = filter(state.rentalProperties || []).reduce(
    (s: number, r: any) => s + Number(r.propertyValue || 0),
    0
  );
  const goldPrice = getGoldPricePerGram(state);
  const gold = filter(state.goldHoldings || []).reduce((s: number, h: any) => {
    const grams = Number(h.grams || 0);
    const purityMul = h.type === "physical" ? (GOLD_PURITY_FACTOR as any)[h.purity] || 1 : 1;
    return s + grams * goldPrice * purityMul;
  }, 0);
  const govtSchemes = filter(state.govtSchemes).reduce(
    (s: number, sc: any) => s + Number(sc.currentBalance || 0),
    0
  );

  // Liabilities
  const loans = filter(state.loansTaken).reduce((s: number, l: any) => s + loanOutstanding(l), 0);
  const cc = filter(state.creditCards)
    .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
    .reduce((s: number, c: any) => s + Number(c.outstanding || 0), 0);
  const rentalDepositLiab = filter(state.rentalProperties || []).reduce((s: number, p: any) => {
    const actualDeposit =
      p.depositTransactions && p.depositTransactions.length > 0
        ? p.depositTransactions.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0)
        : Number(p.securityDeposit || 0);
    const deducted = (p.depositDeductions || []).reduce((a: number, d: any) => a + Number(d.amount || 0), 0);
    const returned = Number(p.depositReturned || 0);
    return s + Math.max(0, actualDeposit - deducted - returned);
  }, 0);
  const informalBorrowed = filter(state.informalBorrowed || []).reduce((s: number, person: any) => {
    const tranches = person.tranches || [];
    const payments = person.payments || [];
    const totalT = tranches.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const totalP = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const net =
      tranches.length > 0 || payments.length > 0
        ? Math.max(0, totalT - totalP)
        : Number(person.amount || 0);
    return s + net;
  }, 0);
  const realEstateOutstanding = (() => {
    const ucShares = (state.realEstateProperties || [])
      .filter((p: any) => p.status === "under-construction")
      .map((p: any) => ({ p, share: realEstateShareFor(p, owner) }))
      .filter(({ share }: any) => share > 0);
    if (ucShares.length === 0) return 0;
    return ucShares.reduce((sum: number, { p, share }: any) => {
      const demanded = (state.realEstateDemands || [])
        .filter((d: any) => d.propertyId === p.id)
        .reduce((s: number, d: any) => s + Number(d.totalAmount || d.amount || 0), 0);
      const paid = (state.realEstatePayments || [])
        .filter((pay: any) => pay.propertyId === p.id)
        .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
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
    gold +
    govtSchemes;
  const totalLiabilities =
    loans + cc + rentalDepositLiab + informalBorrowed + realEstateOutstanding;

  // Super-category aggregation
  const superCategories = {
    liquid: cash + fd + rd + prepaid + rentedDeposit,
    equity: stocks + mf,
    fixedIncome: ppf + epf + nps + bonds + govtSchemes + lic + investmentPlans,
    realEstate: re + rentalProps,
    gold: gold,
    other: vehicles + loansGiven + informalLent,
  };

  // Compile detailed holdings list for member deep dive inspection
  const allHoldings: Array<{ id: string; name: string; category: string; value: number; detail?: string }> = [];

  filter(state.bankAccounts).forEach((b: any) => {
    allHoldings.push({ id: `ba-${b.id}`, name: b.bankName || "Bank Account", category: "Cash & Banking", value: Number(b.balance || 0), detail: b.accountNumber ? `A/C ••••${String(b.accountNumber).slice(-4)}` : undefined });
  });
  filter(state.fixedDeposits).forEach((f: any) => {
    allHoldings.push({ id: `fd-${f.id}`, name: `${f.bank || "FD"} Fixed Deposit`, category: "Fixed Deposits", value: Number(f.principal || 0), detail: f.rate ? `${f.rate}% p.a.` : undefined });
  });
  filter(state.recurringDeposits).forEach((r: any) => {
    const elapsed = r.startDate ? Math.min(Number(r.tenureMonths || 0), Math.max(0, monthsBetween(r.startDate, today()))) : Number(r.tenureMonths || 0);
    allHoldings.push({ id: `rd-${r.id}`, name: `${r.bank || "RD"} Recurring Deposit`, category: "Recurring Deposits", value: rdMaturity(Number(r.monthly || 0), Number(r.rate || 0), elapsed), detail: `₹${r.monthly}/mo` });
  });
  filter(state.stocks).forEach((st: any) => {
    const val = Number(st.qty || 0) * (Number(st.currentPrice || st.avgPrice) || 0);
    allHoldings.push({ id: `st-${st.id}`, name: st.symbol || st.name || "Stock", category: "Direct Equities", value: val, detail: `${st.qty} Qty @ ₹${st.currentPrice || st.avgPrice}` });
  });
  filter(state.mutualFunds).forEach((m: any) => {
    const val = Number(m.units || 0) * (Number(m.currentNav || m.buyNav) || 0);
    allHoldings.push({ id: `mf-${m.id}`, name: m.schemeName || m.name || "Mutual Fund", category: "Mutual Funds", value: val, detail: `${Number(m.units || 0).toFixed(2)} units` });
  });
  filter(state.ppf).forEach((p: any) => {
    allHoldings.push({ id: `ppf-${p.id}`, name: "Public Provident Fund (PPF)", category: "Retirement & Govt", value: Number(p.balance || 0) });
  });
  filter(state.epf).forEach((e: any) => {
    allHoldings.push({ id: `epf-${e.id}`, name: "Employee Provident Fund (EPF)", category: "Retirement & Govt", value: calculateEpfBalance(e) });
  });
  filter(state.nps).forEach((n: any) => {
    const bal = Number(n.balance) || (n.transactions || []).reduce((ss: number, t: any) => ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0), 0);
    allHoldings.push({ id: `nps-${n.id}`, name: "National Pension Scheme (NPS)", category: "Retirement & Govt", value: bal });
  });
  filter(state.govtSchemes).forEach((sc: any) => {
    allHoldings.push({ id: `gs-${sc.id}`, name: sc.schemeName || sc.schemeType || "Govt Scheme", category: "Govt Schemes", value: Number(sc.currentBalance || 0) });
  });
  (state.realEstateProperties || []).filter((p: any) => p.status !== "sold").forEach((r: any) => {
    const share = realEstateShareFor(r, owner);
    if (share > 0) {
      const val = Number(r.marketValue || r.agreementValue || 0) * share;
      allHoldings.push({ id: `re-${r.id}`, name: r.name || "Real Estate Property", category: "Real Estate", value: val, detail: share < 1 ? `${Math.round(share * 100)}% Ownership Share` : "Sole Ownership" });
    }
  });
  filter(state.goldHoldings || []).forEach((g: any) => {
    const purityMul = g.type === "physical" ? (GOLD_PURITY_FACTOR as any)[g.purity] || 1 : 1;
    allHoldings.push({ id: `g-${g.id}`, name: `Gold (${g.purity || "24K"} ${g.type || ""})`, category: "Gold & SGBs", value: Number(g.grams || 0) * goldPrice * purityMul, detail: `${g.grams} grams` });
  });

  allHoldings.sort((a, b) => b.value - a.value);

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
    govtSchemes,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    superCategories,
    allHoldings,
    loans,
    cc,
    rentalDepositLiab,
    informalBorrowed,
    realEstateOutstanding,
  };
};

const getAllocationData = (m: any) => {
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
    { name: "Govt Schemes", value: m.govtSchemes },
    { name: "Loans Given", value: m.loansGiven },
    { name: "Prepaid Cards", value: m.prepaid },
    { name: "Rental Properties", value: m.rentalProps },
    { name: "Security Deposit", value: m.rentedDeposit },
    { name: "Informal Loans Given", value: m.informalLent },
  ];
  return items.filter((i) => i.value > 0);
};

const getTopHoldings = (state: any, owner: string) => {
  const holdings: { name: string; value: number; type: string }[] = [];

  (state.stocks || [])
    .filter((s: any) => s.owner === owner)
    .forEach((s: any) => {
      const val = (Number(s.qty) || 0) * (Number(s.currentPrice) || Number(s.avgPrice) || 0);
      if (val > 0)
        holdings.push({ name: s.symbol || s.name || "Stock", value: val, type: "Stock" });
    });

  (state.mutualFunds || [])
    .filter((m: any) => m.owner === owner)
    .forEach((m: any) => {
      const val = (Number(m.units) || 0) * (Number(m.currentNav) || Number(m.buyNav) || 0);
      if (val > 0)
        holdings.push({ name: m.schemeName || m.name || "MF", value: val, type: "Mutual Fund" });
    });

  (state.realEstateProperties || [])
    .map((r: any) => ({ r, share: realEstateShareFor(r, owner) }))
    .filter(({ share }: { share: number }) => share > 0)
    .forEach(({ r, share }: { r: any; share: number }) => {
      const val = Number(r.marketValue || r.agreementValue || 0) * share;
      if (val > 0)
        holdings.push({
          name: r.name || r.type || "Property",
          value: val,
          type: share < 1 ? `Real Estate (${Math.round(share * 100)}% share)` : "Real Estate",
        });
    });

  (state.fixedDeposits || [])
    .filter((f: any) => f.owner === owner)
    .forEach((f: any) => {
      const val = Number(f.principal || 0);
      if (val > 0) holdings.push({ name: f.bank || "FD", value: val, type: "FD" });
    });

  (state.bankAccounts || [])
    .filter((b: any) => b.owner === owner)
    .forEach((b: any) => {
      const val = Number(b.balance || 0);
      if (val > 0)
        holdings.push({ name: b.bankName || b.name || "Bank", value: val, type: "Cash" });
    });

  holdings.sort((a, b) => b.value - a.value);
  return holdings.slice(0, 3);
};

export const FamilyViewTab: React.FC<{
  state: any;
  metrics?: any;
  marketData?: any;
}> = ({ state, metrics, marketData }) => {
  const { familyProfiles } = useMasterData();
  const { privacyMode } = usePrivacy();
  const dark = state.settings?.darkMode ?? false;
  const ASSET_CLASS_COLORS = getAssetClassColors(dark);

  // Active view filter: "all" or specific member ID
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  // Visual analytics perspective: "contribution" | "comparison" | "superClass" | "matrix"
  const [chartPerspective, setChartPerspective] = useState<"contribution" | "comparison" | "superClass" | "matrix">("contribution");
  // Search query for member holdings inspection
  const [searchQuery, setSearchQuery] = useState<string>("");

  const familyData = useMemo(() => {
    const colors = getMemberColors();
    const fyStart = new Date(`${(state.profile?.fy || getCurrentFY()).split("-")[0]}-04-01`);
    
    // Health insurance coverage across members
    const healthPolicies = state.healthInsurance || [];

    const members = familyProfiles.map((p, idx) => {
      const assets = memberAssets(state, p.id, marketData);
      const topHoldings = getTopHoldings(state, p.id);
      const allocation = getAllocationData(assets);
      const color = colors[idx % colors.length];

      const licCover = (state.lic || [])
        .filter((l: any) => l.owner === p.id)
        .reduce((s: number, l: any) => s + Number(l.sumAssured || 0), 0);
      const termCover = (state.termPlans || [])
        .filter((t: any) => t.owner === p.id)
        .reduce((s: number, t: any) => s + Number(t.coverAmount || 0), 0);
      const totalLifeCover = licCover + termCover;

      const memberHealthCover = healthPolicies
        .filter((hp: any) => hp.owner === p.id || (hp.coveredMembers && hp.coveredMembers.includes(p.id)))
        .reduce((s: number, hp: any) => s + Number(hp.sumInsured || hp.sumAssured || hp.coverAmount || 0), 0);

      const memberIncome = (state.income || [])
        .filter((i: any) => i.owner === p.id && i.date && new Date(i.date) >= fyStart)
        .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

      const hasAssets = assets.totalAssets > 0 || assets.totalLiabilities > 0;
      const age = calculateAge(p.dob);

      return {
        ...p,
        ...assets,
        age,
        topHoldings,
        allocation,
        color,
        licCover,
        termCover,
        totalLifeCover,
        memberHealthCover,
        memberIncome,
        coverageRatio: memberIncome > 0 ? totalLifeCover / memberIncome : 0,
        hasAssets,
      };
    });

    const activeMembers = members.filter((m) => m.hasAssets);
    const totalNetWorth = activeMembers.reduce((s, m) => s + m.netWorth, 0);
    const totalAssets = activeMembers.reduce((s, m) => s + m.totalAssets, 0);
    const totalLiabilities = activeMembers.reduce((s, m) => s + m.totalLiabilities, 0);
    const totalLifeCover = activeMembers.reduce((s, m) => s + m.totalLifeCover, 0);
    const totalLiquid = activeMembers.reduce((s, m) => s + m.superCategories.liquid, 0);
    const totalIncome = activeMembers.reduce((s, m) => s + m.memberIncome, 0);

    // Super categories consolidated
    const combinedSuperCategories = {
      liquid: activeMembers.reduce((s, m) => s + m.superCategories.liquid, 0),
      equity: activeMembers.reduce((s, m) => s + m.superCategories.equity, 0),
      fixedIncome: activeMembers.reduce((s, m) => s + m.superCategories.fixedIncome, 0),
      realEstate: activeMembers.reduce((s, m) => s + m.superCategories.realEstate, 0),
      gold: activeMembers.reduce((s, m) => s + m.superCategories.gold, 0),
      other: activeMembers.reduce((s, m) => s + m.superCategories.other, 0),
    };

    return {
      members,
      activeMembers,
      totalNetWorth,
      totalAssets,
      totalLiabilities,
      totalLifeCover,
      totalLiquid,
      totalIncome,
      combinedSuperCategories,
    };
  }, [state, dark, marketData, familyProfiles]);

  const unownedAssets = useMemo(() => {
    const flagged: any[] = [];
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
      { key: "govtSchemes", label: "Govt Scheme" },
      { key: "rentalProperties", label: "Rental Property" },
      { key: "rentedProperties", label: "Rented Property" },
      { key: "informalLent", label: "Informal Loan Given" },
      { key: "informalBorrowed", label: "Informal Borrowing" },
    ];

    const profileIds = familyProfiles.map((p) => p.id);

    allArrays.forEach(({ key, label }) => {
      (state[key] || []).forEach((item: any) => {
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
      { key: "cash", label: "Cash & Bank" },
      { key: "fd", label: "Fixed Deposits" },
      { key: "rd", label: "Recurring Deposits" },
      { key: "stocks", label: "Stocks" },
      { key: "mf", label: "Mutual Funds" },
      { key: "ppf", label: "PPF" },
      { key: "epf", label: "EPF" },
      { key: "nps", label: "NPS" },
      { key: "bonds", label: "Bonds" },
      { key: "lic", label: "Insurance" },
      { key: "investmentPlans", label: "Inv. Plans" },
      { key: "re", label: "Real Estate" },
      { key: "vehicles", label: "Vehicles" },
      { key: "gold", label: "Gold & SGBs" },
      { key: "govtSchemes", label: "Govt Schemes" },
      { key: "loansGiven", label: "Loans Given" },
      { key: "rentalProps", label: "Rental Props" },
      { key: "prepaid", label: "Prepaid Cards" },
    ];

    return classes
      .map((c) => {
        const row: Record<string, any> = { name: c.label };
        let hasValue = false;
        familyData.activeMembers.forEach((m) => {
          const val = (m as any)[c.key] || 0;
          row[m.name] = val;
          if (val > 0) hasValue = true;
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

  const superClassData = useMemo(() => {
    const { combinedSuperCategories, totalAssets } = familyData;
    if (totalAssets <= 0) return [];
    return Object.entries(SUPER_CATEGORY_CONFIG).map(([key, config]) => {
      const val = (combinedSuperCategories as any)[key] || 0;
      return {
        name: config.label,
        value: val,
        color: config.color,
        pct: totalAssets > 0 ? (val / totalAssets) * 100 : 0,
      };
    }).filter(d => d.value > 0);
  }, [familyData]);

  const {
    activeMembers,
    totalNetWorth,
    totalAssets,
    totalLiabilities,
    totalLifeCover,
    totalLiquid,
    totalIncome,
  } = familyData;

  const selectedMember = useMemo(() => {
    if (selectedMemberId === "all") return null;
    return familyData.members.find((m) => m.id === selectedMemberId) || null;
  }, [selectedMemberId, familyData.members]);

  const filteredMemberHoldings = useMemo(() => {
    if (!selectedMember) return [];
    if (!searchQuery.trim()) return selectedMember.allHoldings;
    const q = searchQuery.toLowerCase();
    return selectedMember.allHoldings.filter((h: any) =>
      h.name.toLowerCase().includes(q) || h.category.toLowerCase().includes(q) || (h.detail && h.detail.toLowerCase().includes(q))
    );
  }, [selectedMember, searchQuery]);

  // ─── EMPTY STATE ────────────────────────────────────────────────────────────
  if (activeMembers.length === 0) {
    return (
      <div className="tab-content-enter">
        <SectionTitle sub="Consolidated financial overview across all family members">
          Family Wealth Overview
        </SectionTitle>
        <EmptyState
          icon={Users}
          gradient={`linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, var(--t-accent) 65%, white) 100%)`}
          dotColor={THEME.accent}
          title="No Family Financial Data Yet"
          description="Add assets and assign owners (Self, Spouse, Daughter, HUF, etc.) to unlock the consolidated family wealth command center."
          pills={[
            "Consolidated Net Worth",
            "Multi-Member Balance Sheet",
            "Protection & Insurance Matrix",
            "Generational Tax Insights",
          ]}
        />
      </div>
    );
  }

  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  return (
    <div
      className="tab-content-enter"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      {/* ── 1. HEADER & MEMBER SWITCHER TOOLBAR ─────────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <SectionTitle sub="Executive family wealth command center, multi-member balance sheets & protection analysis">
          Family Wealth Overview
        </SectionTitle>

        {/* Member Switcher Filter Pills (Clean Lucide Icons, No Emojis) */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "var(--surface-1)",
            padding: "4px",
            borderRadius: "var(--radius-lg)",
            border: `1px solid var(--t-line)`,
            gap: 4,
            overflowX: "auto",
            maxWidth: "100%",
          }}
        >
          <button
            onClick={() => setSelectedMemberId("all")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: "var(--radius-md)",
              fontSize: "12px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s var(--ease-premium)",
              background: selectedMemberId === "all" ? "var(--surface-0)" : "transparent",
              color: selectedMemberId === "all" ? "var(--t-ink)" : "var(--t-muted)",
              boxShadow: selectedMemberId === "all" ? "var(--shadow-sm)" : "none",
            }}
          >
            <Users size={15} color={selectedMemberId === "all" ? THEME.accent : "currentColor"} />
            <span>Consolidated Family</span>
          </button>

          {familyProfiles.map((p, idx) => {
            const MemberIcon = (MEMBER_ICONS as any)[p.id] || (MEMBER_ICONS as any)[p.relation?.toLowerCase()] || User;
            const isSelected = selectedMemberId === p.id;
            const color = MEMBER_COLORS[idx % MEMBER_COLORS.length];
            return (
              <button
                key={p.id}
                onClick={() => setSelectedMemberId(p.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: "var(--radius-md)",
                  fontSize: "12px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s var(--ease-premium)",
                  background: isSelected ? "var(--surface-0)" : "transparent",
                  color: isSelected ? "var(--t-ink)" : "var(--t-muted)",
                  boxShadow: isSelected ? "var(--shadow-sm)" : "none",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: `color-mix(in srgb, ${color} 18%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MemberIcon size={12} color={color} />
                </div>
                <span>{p.name}</span>
                {isSelected && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: color,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. EXECUTIVE HERO COMMAND CENTER ────────────────────────── */}
      <Card
        variant="base"
        style={{
          padding: "clamp(24px, 4vw, 36px)",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 94%, var(--t-accent) 6%), var(--surface-0))",
          border: `1.5px solid var(--t-line)`,
          borderTop: `4px solid ${THEME.gold}`,
          borderRadius: "var(--radius-xl)",
          position: "relative",
          overflow: "hidden",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 24,
              marginBottom: 28,
            }}
          >
            {/* Net Worth Headline */}
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "var(--radius-lg)",
                  background: "color-mix(in srgb, var(--t-gold) 14%, transparent)",
                  border: `1.5px solid color-mix(in srgb, var(--t-gold) 30%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: `0 8px 16px -4px color-mix(in srgb, var(--t-gold) 20%, transparent)`,
                }}
              >
                {selectedMember ? (
                  (() => {
                    const MemberIcon = (MEMBER_ICONS as any)[selectedMember.id] || User;
                    return <MemberIcon size={28} color="var(--t-gold)" />;
                  })()
                ) : (
                  <Users size={28} color="var(--t-gold)" />
                )}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    marginBottom: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>{selectedMember ? `${selectedMember.name}'s Net Worth` : "Consolidated Family Net Worth"}</span>
                  <Badge variant="gold" size="xs">
                    {selectedMember ? selectedMember.relation : `${activeMembers.length} Active Profiles`}
                  </Badge>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(34px, 4.5vw, 52px)",
                    fontWeight: 900,
                    color: THEME.ink,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.05,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <Money value={selectedMember ? selectedMember.netWorth : totalNetWorth} variant="full" />
                </div>
              </div>
            </div>

            {/* Quick Multi-Metric Badges */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  background: "var(--surface-1)",
                  border: `1px solid var(--t-line)`,
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                  Family Assets
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    fontWeight: 800,
                    color: THEME.sage,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <Money value={selectedMember ? selectedMember.totalAssets : totalAssets} variant="full" />
                </span>
              </div>

              <div
                style={{
                  background: "var(--surface-1)",
                  border: `1px solid var(--t-line)`,
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                  Liabilities
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    fontWeight: 800,
                    color: (selectedMember ? selectedMember.totalLiabilities : totalLiabilities) > 0 ? THEME.rust : THEME.sage,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <Money value={selectedMember ? selectedMember.totalLiabilities : totalLiabilities} variant="full" />
                </span>
              </div>

              <div
                style={{
                  background: "var(--surface-1)",
                  border: `1px solid var(--t-line)`,
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                  Instant Liquidity
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    fontWeight: 800,
                    color: THEME.violet,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <Money value={selectedMember ? selectedMember.superCategories.liquid : totalLiquid} variant="full" />
                </span>
              </div>

              {totalIncome > 0 && (
                <div
                  style={{
                    background: "var(--surface-1)",
                    border: `1px solid var(--t-line)`,
                    padding: "10px 16px",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                    Annual FY Inflows
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 15,
                      fontWeight: 800,
                      color: THEME.ink,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <Money value={selectedMember ? selectedMember.memberIncome : totalIncome} variant="full" />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Multi-Segment Family Wealth Progress Bar */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "20px 0 0",
              borderTop: `1px solid var(--t-line)`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 11,
                fontWeight: 800,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              <span>Wealth Distribution Across Family Members</span>
              <span>100% Consolidated</span>
            </div>

            {/* Segmented multi-colored bar */}
            <div
              style={{
                height: 12,
                borderRadius: 6,
                background: "var(--surface-2, var(--t-line))",
                display: "flex",
                overflow: "hidden",
                gap: 2,
              }}
            >
              {activeMembers.map((m) => {
                const pct = totalNetWorth > 0 ? (m.netWorth / totalNetWorth) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <div
                    key={m.id}
                    title={`${m.name}: ${pct.toFixed(1)}%`}
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: m.color,
                      transition: "width 0.8s var(--ease-premium)",
                      opacity: selectedMemberId === "all" || selectedMemberId === m.id ? 1 : 0.35,
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedMemberId(m.id)}
                  />
                );
              })}
            </div>

            {/* Interactive Member Pills Legend */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
                marginTop: 4,
              }}
            >
              {activeMembers.map((m) => {
                const pct = totalNetWorth > 0 ? (m.netWorth / totalNetWorth) * 100 : 0;
                const MemberIcon = (MEMBER_ICONS as any)[m.id] || User;
                const isSelected = selectedMemberId === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMemberId(isSelected ? "all" : m.id)}
                    className="card-lift"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: isSelected ? `color-mix(in srgb, ${m.color} 10%, var(--surface-1))` : "var(--surface-1)",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: `1.5px solid ${isSelected ? m.color : "var(--t-line)"}`,
                      cursor: "pointer",
                      transition: "all 0.2s var(--ease-premium)",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: m.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <MemberIcon size={14} color="#fff" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: THEME.ink,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m.name}
                      </div>
                      <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
                        {m.relation}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 13,
                          fontWeight: 800,
                          color: THEME.ink,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={m.netWorth} variant="full" />
                      </div>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          color: m.color,
                          background: `color-mix(in srgb, ${m.color} 14%, transparent)`,
                          padding: "1px 5px",
                          borderRadius: 6,
                        }}
                      >
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* ── 3. EXECUTIVE KPI STAT GRID ──────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <StatCard
          label="Total Family Assets"
          value={fmtINRFull(totalAssets)}
          numericValue={totalAssets}
          formatValue={fmtINRFull}
          sub="Combined Gross Wealth"
          icon={<TrendingUp />}
          color={THEME.sage}
        />

        <StatCard
          label="Total Liabilities"
          value={fmtINRFull(totalLiabilities)}
          numericValue={totalLiabilities}
          formatValue={fmtINRFull}
          sub="Outstanding Loans & Cards"
          icon={<CreditCard />}
          color={totalLiabilities > 0 ? THEME.rust : THEME.sage}
        />

        <StatCard
          label="Family Debt Ratio"
          value={`${debtToAssetRatio.toFixed(1)}%`}
          numericValue={debtToAssetRatio}
          formatValue={(n) => `${n.toFixed(1)}%`}
          sub={
            debtToAssetRatio > 30
              ? "High Family Leverage"
              : debtToAssetRatio > 15
                ? "Moderate Leverage"
                : "Healthy Debt Balance"
          }
          subColor={debtToAssetRatio > 30 ? THEME.rust : debtToAssetRatio > 15 ? THEME.gold : THEME.sage}
          icon={<Percent />}
          color={debtToAssetRatio > 30 ? THEME.rust : debtToAssetRatio > 15 ? THEME.gold : THEME.sage}
        />

        <StatCard
          label="Consolidated Life Cover"
          value={fmtINRFull(totalLifeCover)}
          numericValue={totalLifeCover}
          formatValue={fmtINRFull}
          sub={
            totalIncome > 0
              ? `${(totalLifeCover / totalIncome).toFixed(1)}x FY Inflow Coverage`
              : "Aggregate Life Protection"
          }
          subColor={totalIncome > 0 && totalLifeCover / totalIncome >= 10 ? THEME.sage : THEME.gold}
          icon={<Shield />}
          color={THEME.violet}
        />

        <StatCard
          label="Liquid Emergency Reserve"
          value={fmtINRFull(totalLiquid)}
          numericValue={totalLiquid}
          formatValue={fmtINRFull}
          sub="Instant Cash, FDs & RDs"
          icon={<Wallet />}
          color={THEME.cyan}
        />
      </div>

      {/* ── 4. MULTI-PERSPECTIVE VISUAL ANALYTICS ───────────────────── */}
      <div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <SectionTitle sub="Interactive analytics by member split, asset class comparison, and macro portfolio mix">
            Family Portfolio Analytics
          </SectionTitle>

          {/* Perspective View Switcher */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "var(--surface-1)",
              padding: "4px",
              borderRadius: "var(--radius-lg)",
              border: `1px solid var(--t-line)`,
              gap: 4,
            }}
          >
            <button
              onClick={() => setChartPerspective("contribution")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                fontSize: "11px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: chartPerspective === "contribution" ? "var(--surface-0)" : "transparent",
                color: chartPerspective === "contribution" ? "var(--t-ink)" : "var(--t-muted)",
                boxShadow: chartPerspective === "contribution" ? "var(--shadow-sm)" : "none",
              }}
            >
              <PieChartIcon size={13} />
              <span>Contribution Split</span>
            </button>

            <button
              onClick={() => setChartPerspective("comparison")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                fontSize: "11px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: chartPerspective === "comparison" ? "var(--surface-0)" : "transparent",
                color: chartPerspective === "comparison" ? "var(--t-ink)" : "var(--t-muted)",
                boxShadow: chartPerspective === "comparison" ? "var(--shadow-sm)" : "none",
              }}
            >
              <BarChart3 size={13} />
              <span>Asset Class Bar Chart</span>
            </button>

            <button
              onClick={() => setChartPerspective("superClass")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                fontSize: "11px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: chartPerspective === "superClass" ? "var(--surface-0)" : "transparent",
                color: chartPerspective === "superClass" ? "var(--t-ink)" : "var(--t-muted)",
                boxShadow: chartPerspective === "superClass" ? "var(--shadow-sm)" : "none",
              }}
            >
              <Layers size={13} />
              <span>Macro Asset Mix</span>
            </button>

            <button
              onClick={() => setChartPerspective("matrix")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                fontSize: "11px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: chartPerspective === "matrix" ? "var(--surface-0)" : "transparent",
                color: chartPerspective === "matrix" ? "var(--t-ink)" : "var(--t-muted)",
                boxShadow: chartPerspective === "matrix" ? "var(--shadow-sm)" : "none",
              }}
            >
              <TableIcon size={13} />
              <span>Balance Sheet Matrix</span>
            </button>
          </div>
        </div>

        <Card style={{ padding: 24 }}>
          {/* 1. Contribution Donut & List View */}
          {chartPerspective === "contribution" && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
                gap: 36,
              }}
            >
              <div style={{ width: 240, height: 240, flexShrink: 0, margin: "0 auto" }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={contributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      dataKey="value"
                      stroke="var(--surface-0)"
                      strokeWidth={3}
                      paddingAngle={2}
                    >
                      {contributionData.map((d, i) => (
                        <Cell key={i} fill={d.color} style={{ outline: "none", cursor: "pointer" }} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minWidth: 260 }}>
                {contributionData.map((d) => {
                  const pct = totalNetWorth > 0 ? ((d.value / totalNetWorth) * 100).toFixed(1) : "0";
                  return (
                    <div
                      key={d.name}
                      className="card-lift"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderRadius: "var(--radius-lg)",
                        background: `color-mix(in srgb, ${d.color} 6%, var(--surface-0))`,
                        border: `1.5px solid color-mix(in srgb, ${d.color} 16%, transparent)`,
                      }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: d.color,
                          flexShrink: 0,
                          boxShadow: `0 0 0 3px color-mix(in srgb, ${d.color} 25%, transparent)`,
                        }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, flex: 1 }}>
                        {d.name}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 15,
                          fontWeight: 800,
                          color: THEME.ink,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={d.value} variant="full" />
                      </span>
                      <Badge
                        variant="accent"
                        style={{ fontSize: 11, fontWeight: 800, minWidth: 46, textAlign: "center" }}
                      >
                        {pct}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Side-by-Side Asset Class Bar Chart */}
          {chartPerspective === "comparison" && comparisonData.length > 0 && (
            <div className="asset-comparison-chart" style={{ width: "100%", height: 440 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                          <stop offset="100%" stopColor={m.color} stopOpacity={dark ? 0.55 : 0.3} />
                        </linearGradient>
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
                    width={90}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: THEME.line, opacity: 0.3 }} />
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
                      maxBarSize={32}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 3. Super Asset Class Macro Allocation */}
          {chartPerspective === "superClass" && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
                gap: 36,
              }}
            >
              <div style={{ width: 240, height: 240, flexShrink: 0, margin: "0 auto" }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={superClassData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      dataKey="value"
                      stroke="var(--surface-0)"
                      strokeWidth={3}
                      paddingAngle={2}
                    >
                      {superClassData.map((d, i) => (
                        <Cell key={i} fill={d.color} style={{ outline: "none", cursor: "pointer" }} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 260 }}>
                {superClassData.map((d) => (
                  <div
                    key={d.name}
                    className="card-lift"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      background: `color-mix(in srgb, ${d.color} 6%, var(--surface-0))`,
                      border: `1.5px solid color-mix(in srgb, ${d.color} 16%, transparent)`,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
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
                        fontFamily: "var(--font-display)",
                        fontSize: 14,
                        fontWeight: 800,
                        color: THEME.ink,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      <Money value={d.value} variant="full" />
                    </span>
                    <Badge variant="muted" style={{ fontSize: 10, fontWeight: 800, minWidth: 42, textAlign: "center" }}>
                      {d.pct.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Balance Sheet Matrix Table */}
          {chartPerspective === "matrix" && (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: `2px solid var(--t-line)` }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        fontWeight: 800,
                        color: THEME.muted,
                        textTransform: "uppercase",
                        fontSize: 11,
                      }}
                    >
                      Asset / Liability Category
                    </th>
                    {activeMembers.map((m) => (
                      <th
                        key={m.id}
                        style={{
                          textAlign: "right",
                          padding: "12px 14px",
                          fontWeight: 800,
                          color: m.color,
                          fontSize: 12,
                        }}
                      >
                        {m.name}
                      </th>
                    ))}
                    <th
                      style={{
                        textAlign: "right",
                        padding: "12px 14px",
                        fontWeight: 900,
                        color: THEME.ink,
                        fontSize: 12,
                      }}
                    >
                      Family Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Cash & Bank Accounts", key: "cash" },
                    { label: "Fixed Deposits (FD)", key: "fd" },
                    { label: "Recurring Deposits (RD)", key: "rd" },
                    { label: "Direct Equities (Stocks)", key: "stocks" },
                    { label: "Mutual Funds", key: "mf" },
                    { label: "Public Provident Fund (PPF)", key: "ppf" },
                    { label: "Employee Provident Fund (EPF)", key: "epf" },
                    { label: "National Pension Scheme (NPS)", key: "nps" },
                    { label: "Government Schemes (SSY/SCSS)", key: "govtSchemes" },
                    { label: "Bonds & Debentures", key: "bonds" },
                    { label: "Insurance & Endowments", key: "lic" },
                    { label: "Investment Plans (ULIP/SIP)", key: "investmentPlans" },
                    { label: "Real Estate Properties", key: "re" },
                    { label: "Rental Properties (Commercial)", key: "rentalProps" },
                    { label: "Gold & SGB Holdings", key: "gold" },
                    { label: "Vehicles", key: "vehicles" },
                    { label: "Loans Given & Deposits", key: "loansGiven" },
                    { label: "Prepaid Cards", key: "prepaid" },
                  ].map((row, idx) => {
                    const familySum = activeMembers.reduce((s, m) => s + ((m as any)[row.key] || 0), 0);
                    if (familySum <= 0) return null;
                    return (
                      <tr
                        key={row.key}
                        style={{
                          borderBottom: `1px solid var(--t-line)`,
                          background: idx % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--surface-1) 50%, transparent)",
                        }}
                      >
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: THEME.ink }}>
                          {row.label}
                        </td>
                        {activeMembers.map((m) => (
                          <td key={m.id} style={{ padding: "10px 14px", textAlign: "right", color: THEME.ink }}>
                            {(m as any)[row.key] > 0 ? <Money value={(m as any)[row.key]} variant="full" /> : "—"}
                          </td>
                        ))}
                        <td
                          style={{
                            padding: "10px 14px",
                            textAlign: "right",
                            fontWeight: 800,
                            color: THEME.ink,
                          }}
                        >
                          <Money value={familySum} variant="full" />
                        </td>
                      </tr>
                    );
                  })}

                  {/* Assets Subtotal */}
                  <tr
                    style={{
                      borderTop: `2px solid var(--t-line)`,
                      borderBottom: `1px solid var(--t-line)`,
                      background: "color-mix(in srgb, var(--t-sage) 8%, var(--surface-0))",
                      fontWeight: 800,
                    }}
                  >
                    <td style={{ padding: "12px 14px", color: THEME.sage }}>
                      Total Assets (Gross)
                    </td>
                    {activeMembers.map((m) => (
                      <td key={m.id} style={{ padding: "12px 14px", textAlign: "right", color: THEME.sage }}>
                        <Money value={m.totalAssets} variant="full" />
                      </td>
                    ))}
                    <td style={{ padding: "12px 14px", textAlign: "right", color: THEME.sage }}>
                      <Money value={totalAssets} variant="full" />
                    </td>
                  </tr>

                  {/* Liabilities Rows */}
                  {[
                    { label: "Loans Outstanding", key: "loans" },
                    { label: "Credit Card Dues", key: "cc" },
                    { label: "Under-Construction Demands", key: "realEstateOutstanding" },
                    { label: "Rental Deposit Liability", key: "rentalDepositLiab" },
                    { label: "Informal Borrowings", key: "informalBorrowed" },
                  ].map((row) => {
                    const familySum = activeMembers.reduce((s, m) => s + ((m as any)[row.key] || 0), 0);
                    if (familySum <= 0) return null;
                    return (
                      <tr
                        key={row.key}
                        style={{
                          borderBottom: `1px solid var(--t-line)`,
                          color: THEME.rust,
                        }}
                      >
                        <td style={{ padding: "10px 14px", fontWeight: 700 }}>
                          {row.label}
                        </td>
                        {activeMembers.map((m) => (
                          <td key={m.id} style={{ padding: "10px 14px", textAlign: "right" }}>
                            {(m as any)[row.key] > 0 ? <Money value={(m as any)[row.key]} variant="full" /> : "—"}
                          </td>
                        ))}
                        <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800 }}>
                          <Money value={familySum} variant="full" />
                        </td>
                      </tr>
                    );
                  })}

                  {/* Liabilities Subtotal */}
                  <tr
                    style={{
                      borderBottom: `2px solid var(--t-line)`,
                      background: "color-mix(in srgb, var(--t-rust) 8%, var(--surface-0))",
                      fontWeight: 800,
                    }}
                  >
                    <td style={{ padding: "12px 14px", color: THEME.rust }}>
                      Total Liabilities
                    </td>
                    {activeMembers.map((m) => (
                      <td key={m.id} style={{ padding: "12px 14px", textAlign: "right", color: THEME.rust }}>
                        <Money value={m.totalLiabilities} variant="full" />
                      </td>
                    ))}
                    <td style={{ padding: "12px 14px", textAlign: "right", color: THEME.rust }}>
                      <Money value={totalLiabilities} variant="full" />
                    </td>
                  </tr>

                  {/* Net Worth Grand Total */}
                  <tr
                    style={{
                      background: "color-mix(in srgb, var(--t-gold) 12%, var(--surface-0))",
                      fontWeight: 900,
                      fontSize: 14,
                    }}
                  >
                    <td style={{ padding: "14px", color: THEME.ink }}>
                      Net Worth (Assets − Liabilities)
                    </td>
                    {activeMembers.map((m) => (
                      <td key={m.id} style={{ padding: "14px", textAlign: "right", color: THEME.ink }}>
                        <Money value={m.netWorth} variant="full" />
                      </td>
                    ))}
                    <td style={{ padding: "14px", textAlign: "right", color: THEME.ink }}>
                      <Money value={totalNetWorth} variant="full" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ── 5. SINGLE MEMBER DEEP-DIVE (WHEN A MEMBER IS SELECTED) ──── */}
      {selectedMember && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <SectionTitle sub={`Deep dive portfolio breakdown, solvency ratios, and individual holdings for ${selectedMember.name}`}>
              {selectedMember.name}&apos;s Member Portfolio
            </SectionTitle>
            <button
              onClick={() => setSelectedMemberId("all")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-1)",
                border: `1px solid var(--t-line)`,
                color: THEME.muted,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s var(--ease-premium)",
              }}
            >
              <Users size={14} />
              <span>Back to Consolidated View</span>
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
              gap: 20,
            }}
          >
            {/* Persona Summary Card */}
            <Card style={{ padding: 24, borderTop: `4px solid ${selectedMember.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: selectedMember.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {(() => {
                    const MemberIcon = (MEMBER_ICONS as any)[selectedMember.id] || User;
                    return <MemberIcon size={24} color="#fff" />;
                  })()}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink }}>
                    {selectedMember.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <Badge variant="accent">{selectedMember.relation}</Badge>
                    {selectedMember.dob && (
                      <Badge variant="muted">
                        Age {formatAge(selectedMember.dob)}
                      </Badge>
                    )}
                    {isSeniorCitizen(selectedMember.dob) && (
                      <Badge variant="gold">Senior Citizen (60+)</Badge>
                    )}
                    {isMinor(selectedMember.dob) && (
                      <Badge variant="muted">Minor Child</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Balance Sheet Sub-grid */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "var(--surface-1)",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>Total Assets</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: THEME.sage }}>
                    <Money value={selectedMember.totalAssets} variant="full" />
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "var(--surface-1)",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>Total Liabilities</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: selectedMember.totalLiabilities > 0 ? THEME.rust : THEME.sage }}>
                    <Money value={selectedMember.totalLiabilities} variant="full" />
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: `color-mix(in srgb, ${selectedMember.color} 10%, var(--surface-0))`,
                    border: `1.5px solid color-mix(in srgb, ${selectedMember.color} 20%, transparent)`,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>Net Worth</span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 900, color: THEME.ink }}>
                    <Money value={selectedMember.netWorth} variant="full" />
                  </span>
                </div>
              </div>
            </Card>

            {/* Asset Allocation Pie & Breakdown */}
            <Card style={{ padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", marginBottom: 16 }}>
                Asset Allocation Split
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 120, height: 120, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={selectedMember.allocation}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={56}
                        dataKey="value"
                        stroke="var(--surface-0)"
                        strokeWidth={2}
                      >
                        {selectedMember.allocation.map((d: any, i: number) => (
                          <Cell
                            key={i}
                            fill={(ASSET_CLASS_COLORS as any)[d.name] || PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  {selectedMember.allocation.slice(0, 5).map((d: any) => {
                    const pct = selectedMember.totalAssets > 0 ? ((d.value / selectedMember.totalAssets) * 100).toFixed(1) : "0";
                    return (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: (ASSET_CLASS_COLORS as any)[d.name] || PIE_COLORS[0],
                            }}
                          />
                          <span style={{ color: THEME.muted, fontWeight: 600 }}>{d.name}</span>
                        </div>
                        <span style={{ fontWeight: 800, color: THEME.ink }}>{pct}%</span>
                      </div>
                    );
                  })}
                  {selectedMember.allocation.length > 5 && (
                    <div style={{ fontSize: 11, color: THEME.muted, paddingLeft: 14 }}>
                      +{selectedMember.allocation.length - 5} more classes
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Solvency & Protection Indicators */}
            <Card style={{ padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", marginBottom: 16 }}>
                Solvency & Protection Status
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>Individual Leverage Ratio</span>
                  <Badge variant={selectedMember.totalAssets > 0 && (selectedMember.totalLiabilities / selectedMember.totalAssets) > 0.3 ? "rust" : "sage"}>
                    {selectedMember.totalAssets > 0 ? `${((selectedMember.totalLiabilities / selectedMember.totalAssets) * 100).toFixed(1)}%` : "0%"}
                  </Badge>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>Liquid Reserve</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: THEME.violet }}>
                    <Money value={selectedMember.superCategories.liquid} variant="full" />
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>Life Insurance Cover</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: selectedMember.totalLifeCover > 0 ? THEME.sage : THEME.rust }}>
                    <Money value={selectedMember.totalLifeCover} variant="full" />
                  </span>
                </div>

                {selectedMember.memberHealthCover > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>Health Cover Sum Insured</span>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: THEME.cyan }}>
                      <Money value={selectedMember.memberHealthCover} variant="full" />
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Detailed Member Holdings Table */}
          <Card style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileCheck size={18} color={selectedMember.color} />
                <span style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                  Registered Assets & Holdings ({filteredMemberHoldings.length})
                </span>
              </div>

              {/* Search input */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--surface-1)",
                  padding: "6px 12px",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid var(--t-line)`,
                  minWidth: 220,
                }}
              >
                <Search size={14} color={THEME.muted} />
                <input
                  type="text"
                  placeholder="Search assets, accounts, schemes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: THEME.ink,
                    fontSize: 12,
                    width: "100%",
                  }}
                />
              </div>
            </div>

            {filteredMemberHoldings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: THEME.muted, fontSize: 13 }}>
                No holdings matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid var(--t-line)` }}>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
                        Asset Name / Description
                      </th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
                        Category
                      </th>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
                        Details
                      </th>
                      <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
                        Valuation
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMemberHoldings.map((h: any, idx: number) => (
                      <tr
                        key={h.id || idx}
                        style={{
                          borderBottom: `1px solid var(--t-line)`,
                          background: idx % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--surface-1) 50%, transparent)",
                        }}
                      >
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: THEME.ink }}>
                          {h.name}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <Badge variant="accent" size="xs">
                            {h.category}
                          </Badge>
                        </td>
                        <td style={{ padding: "10px 12px", color: THEME.muted, fontSize: 12 }}>
                          {h.detail || "—"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "var(--font-display)", fontWeight: 800, color: THEME.ink }}>
                          <Money value={h.value} variant="full" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── 6. ALL MEMBER PERSONA CARDS (GRID VIEW) ────────────────── */}
      {selectedMemberId === "all" && (
        <div>
          <SectionTitle sub="Detailed financial personas, asset allocations, and top holdings per family profile">
            Family Member Portfolios
          </SectionTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 350px), 1fr))",
              gap: 20,
            }}
          >
            {activeMembers.map((m) => {
              const MemberIcon = (MEMBER_ICONS as any)[m.id] || User;
              const pct = totalNetWorth > 0 ? ((m.netWorth / totalNetWorth) * 100).toFixed(1) : "0";
              return (
                <Card
                  key={m.id}
                  hover
                  style={{
                    padding: "24px",
                    borderTop: `4px solid ${m.color}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  {/* Member header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: "50%",
                        background: `color-mix(in srgb, ${m.color} 16%, transparent)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: m.color,
                        flexShrink: 0,
                      }}
                    >
                      <MemberIcon size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                          {m.name}
                        </span>
                        {m.dob && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 10,
                              background: `color-mix(in srgb, ${m.color} 14%, transparent)`,
                              color: m.color,
                            }}
                          >
                            <Calendar size={10} />
                            <span>{formatAge(m.dob)}</span>
                          </span>
                        )}
                        {isMinor(m.dob) && (
                          <Badge variant="muted" size="xs">
                            Minor
                          </Badge>
                        )}
                        {isSeniorCitizen(m.dob) && (
                          <Badge variant="gold" size="xs">
                            Senior (60+)
                          </Badge>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                        <span style={{ fontWeight: 700, color: m.color }}>{m.relation}</span>
                        <span> · {pct}% of family wealth</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 18,
                          fontWeight: 900,
                          color: THEME.ink,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={m.netWorth} variant="full" />
                      </div>
                      <div style={{ fontSize: 10, color: THEME.muted }}>Net Worth</div>
                    </div>
                  </div>

                  {/* Assets vs Liabilities bar gauge */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <div
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: `color-mix(in srgb, ${THEME.sage} 8%, var(--surface-0))`,
                        border: `1.5px solid color-mix(in srgb, ${THEME.sage} 16%, transparent)`,
                      }}
                    >
                      <div style={{ fontSize: 9, fontWeight: 800, color: THEME.sage, textTransform: "uppercase", marginBottom: 2 }}>
                        Assets
                      </div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                        <Money value={m.totalAssets} variant="full" />
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: `color-mix(in srgb, ${THEME.rust} 8%, var(--surface-0))`,
                        border: `1.5px solid color-mix(in srgb, ${THEME.rust} 16%, transparent)`,
                      }}
                    >
                      <div style={{ fontSize: 9, fontWeight: 800, color: THEME.rust, textTransform: "uppercase", marginBottom: 2 }}>
                        Liabilities
                      </div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                        <Money value={m.totalLiabilities} variant="full" />
                      </div>
                    </div>
                  </div>

                  {/* Asset Allocation Mini-Pie & Legend */}
                  {m.allocation.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        background: "var(--surface-1)",
                        padding: "12px",
                        borderRadius: 12,
                        border: `1px solid var(--t-line)`,
                      }}
                    >
                      <div style={{ width: 88, height: 88, flexShrink: 0 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <PieChart>
                            <Pie
                              data={m.allocation}
                              cx="50%"
                              cy="50%"
                              innerRadius={24}
                              outerRadius={40}
                              dataKey="value"
                              stroke="var(--surface-1)"
                              strokeWidth={1.5}
                            >
                              {m.allocation.map((d, i) => (
                                <Cell
                                  key={i}
                                  fill={(ASSET_CLASS_COLORS as any)[d.name] || PIE_COLORS[i % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
                        {m.allocation.slice(0, 4).map((d) => {
                          const allocPct = m.totalAssets > 0 ? ((d.value / m.totalAssets) * 100).toFixed(1) : "0";
                          return (
                            <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                              <span
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: "50%",
                                  background: (ASSET_CLASS_COLORS as any)[d.name] || PIE_COLORS[0],
                                  flexShrink: 0,
                                }}
                              />
                              <span style={{ color: THEME.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {d.name}
                              </span>
                              <span style={{ fontWeight: 800, color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>
                                {allocPct}%
                              </span>
                            </div>
                          );
                        })}
                        {m.allocation.length > 4 && (
                          <div style={{ fontSize: 10, color: THEME.muted, paddingLeft: 13, fontWeight: 600 }}>
                            +{m.allocation.length - 4} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Top holdings */}
                  {m.topHoldings.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
                        <Award size={12} />
                        <span>Top Asset Holdings</span>
                      </div>
                      {m.topHoldings.slice(0, 2).map((h, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            borderRadius: 8,
                            background: "var(--surface-0)",
                            border: `1px solid var(--t-line)`,
                            fontSize: 11,
                          }}
                        >
                          <span style={{ fontWeight: 700, color: THEME.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                            {h.name}
                          </span>
                          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: THEME.ink, marginLeft: 8 }}>
                            <Money value={h.value} variant="full" />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Focus Action Button */}
                  <button
                    onClick={() => setSelectedMemberId(m.id)}
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "8px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--surface-1)",
                      border: `1px solid var(--t-line)`,
                      color: THEME.ink,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.2s var(--ease-premium)",
                    }}
                  >
                    <span>View Member Deep Dive</span>
                    <ChevronRight size={14} />
                  </button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 7. PROTECTION & INSURANCE ADEQUACY MATRIX ───────────────── */}
      <div>
        <SectionTitle sub="Life & health insurance adequacy benchmarked against 10x-15x annual income and family medical needs">
          Protection & Insurance Health Matrix
        </SectionTitle>
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {activeMembers.map((m) => {
              const MemberIcon = (MEMBER_ICONS as any)[m.id] || User;
              const hasIncome = m.memberIncome > 0;
              const isAdequate = m.coverageRatio >= 10;
              const hasCoverage = m.totalLifeCover > 0;

              const statusColor = !hasCoverage
                ? THEME.rust
                : hasIncome && !isAdequate
                  ? THEME.gold
                  : THEME.sage;

              return (
                <div
                  key={m.id}
                  className="card-lift"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "14px 18px",
                    borderRadius: "var(--radius-lg)",
                    background: `color-mix(in srgb, ${statusColor} 6%, var(--surface-0))`,
                    border: `1.5px solid color-mix(in srgb, ${statusColor} 20%, transparent)`,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: m.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <MemberIcon size={18} color="#fff" />
                  </div>

                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                        {m.name}
                      </span>
                      <Badge variant="accent" size="xs">
                        {m.relation}
                      </Badge>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: THEME.muted,
                        marginTop: 3,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        fontWeight: 600,
                      }}
                    >
                      <span>
                        LIC: <Money value={m.licCover} variant="full" />
                      </span>
                      <span style={{ opacity: 0.3 }}>|</span>
                      <span>
                        Term: <Money value={m.termCover} variant="full" />
                      </span>
                      {m.memberHealthCover > 0 && (
                        <>
                          <span style={{ opacity: 0.3 }}>|</span>
                          <span>
                            Health: <Money value={m.memberHealthCover} variant="full" />
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Coverage Adequacy Numbers */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 16,
                        fontWeight: 900,
                        color: THEME.ink,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      <Money value={m.totalLifeCover} variant="full" />
                    </div>
                    <div style={{ fontSize: 11, marginTop: 2 }}>
                      {hasIncome ? (
                        <span
                          style={{
                            fontWeight: 700,
                            color: isAdequate ? THEME.sage : THEME.gold,
                          }}
                        >
                          {m.coverageRatio.toFixed(1)}x income
                          {!isAdequate && " (target 10x)"}
                        </span>
                      ) : (
                        <span style={{ color: THEME.muted, fontStyle: "italic", fontSize: 10 }}>
                          Dependent / No direct income
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator Icon */}
                  <div style={{ flexShrink: 0, marginLeft: 4, display: "flex", alignItems: "center" }}>
                    {!hasCoverage ? (
                      <div style={{ color: THEME.rust, display: "flex", alignItems: "center" }} title="Uninsured">
                        <XCircle size={22} />
                      </div>
                    ) : hasIncome && !isAdequate ? (
                      <div style={{ color: THEME.gold, display: "flex", alignItems: "center" }} title="Under-insured">
                        <AlertTriangle size={22} />
                      </div>
                    ) : (
                      <div style={{ color: THEME.sage, display: "flex", alignItems: "center" }} title="Adequately Covered">
                        <CheckCircle2 size={22} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Matrix Legend */}
          <div
            style={{
              display: "flex",
              gap: 18,
              marginTop: 18,
              paddingTop: 14,
              borderTop: `1.5px solid var(--t-line)`,
              flexWrap: "wrap",
              fontSize: 11,
              fontWeight: 700,
              color: THEME.muted,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={15} color={THEME.sage} /> Adequate Coverage (10x+ Annual Income)
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={15} color={THEME.gold} /> Under-insured (&lt; 10x Annual Income)
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <XCircle size={15} color={THEME.rust} /> Uninsured (No Active Life Insurance)
            </span>
          </div>
        </Card>
      </div>

      {/* ── 8. GENERATIONAL WEALTH & TAX OPTIMIZATION INSIGHTS ──────── */}
      <div>
        <SectionTitle sub="Actionable CFO strategies to optimize family tax slabs, deductions, and generational wealth compounding">
          Family Wealth & Tax Optimization Insights
        </SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {/* HUF Optimization */}
          <Card style={{ padding: 20, borderLeft: `4px solid ${THEME.gold}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Building2 size={20} color={THEME.gold} />
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                Hindu Undivided Family (HUF)
              </span>
            </div>
            <p style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.5, margin: 0 }}>
              {familyProfiles.some((p) => p.id === "huf" || p.relation === "HUF")
                ? "HUF entity is active. Utilize its separate ₹1.5L Section 80C limit and basic income tax exemption slab to optimize family investment earnings."
                : "Create and register an HUF profile to establish a separate tax entity with independent tax slabs and ₹1.5L 80C deductions for joint family assets."}
            </p>
          </Card>

          {/* Section 80D Health Cover */}
          <Card style={{ padding: 20, borderLeft: `4px solid ${THEME.violet}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <ShieldCheck size={20} color={THEME.violet} />
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                Health Insurance (Section 80D)
              </span>
            </div>
            <p style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.5, margin: 0 }}>
              Max out ₹25,000 for self/family floater plus an additional ₹50,000 deduction for senior citizen parents under the Old Tax Regime to reduce family tax burden.
            </p>
          </Card>

          {/* Minor Compounding & SSY */}
          <Card style={{ padding: 20, borderLeft: `4px solid ${THEME.pink}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <PiggyBank size={20} color={THEME.pink} />
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                Minor Children & Long-Term Compounding
              </span>
            </div>
            <p style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.5, margin: 0 }}>
              Leverage Sukanya Samriddhi Yojana (SSY) for girl children (tax-free returns) and long-term equity index funds / PPF for minor children to build dedicated higher-education corpuses.
            </p>
          </Card>

          {/* Senior Citizen Perks */}
          <Card style={{ padding: 20, borderLeft: `4px solid ${THEME.sage}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Award size={20} color={THEME.sage} />
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                Senior Citizen Privileges (60+)
              </span>
            </div>
            <p style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.5, margin: 0 }}>
              Senior family members are eligible for Senior Citizen Savings Scheme (SCSS 8.2%), enhanced bank FD interest rates (+0.50%), and ₹50,000 Section 80TTB interest tax exemptions.
            </p>
          </Card>
        </div>
      </div>

      {/* ── 9. UNASSIGNED ASSETS ALERT & RESOLUTION BANNER ──────────── */}
      {unownedAssets.length > 0 && (
        <div>
          <SectionTitle sub="Assign family member owners to include these assets in the consolidated family balance sheet">
            Unassigned Assets Requiring Review
          </SectionTitle>
          <Card
            style={{
              padding: 24,
              borderLeft: `4px solid ${THEME.gold}`,
              background: `color-mix(in srgb, ${THEME.gold} 6%, var(--surface-0))`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <ShieldAlert size={24} color={THEME.gold} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                  {unownedAssets.length} Unassigned Financial Asset{unownedAssets.length !== 1 ? "s" : ""}
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  These holdings currently do not have an individual family member assigned as the owner.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 10,
              }}
            >
              {unownedAssets.slice(0, 8).map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--surface-0)",
                    border: `1.5px solid var(--t-line)`,
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
                  <Badge variant="gold" size="xs">
                    {a.type}
                  </Badge>
                  <Badge variant="muted" size="xs">
                    {a.owner}
                  </Badge>
                </div>
              ))}
            </div>
            {unownedAssets.length > 8 && (
              <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginTop: 12, textAlign: "center" }}>
                +{unownedAssets.length - 8} more unassigned assets
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
