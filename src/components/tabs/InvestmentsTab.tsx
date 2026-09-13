import React, { useState, useEffect, useMemo } from "react";
import { ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area } from "recharts";
import {
  Coins,
  Repeat,
  ChevronDown,
  FileText,
  Shield,
  Briefcase,
  BarChart3,
  Plus,
  Trash2,
  Pencil,
  TrendingUp,
  TrendingDown,
  Activity,
  IndianRupee,
  Receipt,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  List,
  Clock,
  Zap,
  PiggyBank,
  Target,
  RefreshCw,
  ArrowDownRight,
  User,
} from "lucide-react";
import { THEME, PIE_COLORS } from "../../utils/constants";
import { getCurrentFY } from "../../utils/appConstants";
import {
  fmtINRFull,
  fdMaturity,
  rdMaturity,
  today,
  uid,
  monthsBetween,
  addMonthsToDateStr,
  calculateEpfBalance,
  calcCAGR,
  calcXIRR,
} from "../../utils/finance";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { ConfirmDialog } from "../ui/Feedback";
import { MFCasPanel } from "./MFCasPanel";
import { FixedDepositsSection } from "../investments/FixedDepositsSection";
import { RecurringDepositsSection } from "../investments/RecurringDepositsSection";
import { BondsSection } from "../investments/BondsSection";
import { PPFSection } from "../investments/PPFSection";
import { NPSSection } from "../investments/NPSSection";
import { EPFSection } from "../investments/EPFSection";
import { MutualFundsSection } from "../investments/MutualFundsSection";
import { DividendsSection, DividendTracker } from "../investments/DividendsSection";
// Shared with CapitalGainsTab so LTCG/STCG shown here always agrees with the actual tax
// report — see the isLongTerm doc comment there for the Section 2(42A) anniversary-date
// rules (day-of-month aware, strict >, not a naive "> 365 days" count).
import { isLongTerm } from "./CapitalGainsTab";
import { BankLogo, MFLogo, resolveBrand, resolveBankDomain } from "../ui/BrandLogos";

interface InvestmentsTabProps {
  state: any;
  addItem: (key: string, data: any) => void;
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
  subTab?: string;
  onSubTabChange?: (sub: string) => void;
  activeProfile?: string;
  mfMarketData?: Record<string, any>;
  fetchMfNavs?: () => void;
  fetchingMfNavs?: boolean;
  mfMarketDataTs?: number | null;
  showToast?: (msg: string, type?: any) => void;
}

// Mirrors Demat's `marketData[yfSym]?.price ?? st.currentPrice` fallback: prefer the
// live-fetched NAV cached by mfCode, fall back to the manually-refreshed stored field.
const liveMfNav = (m: any, mfMarketData?: Record<string, any>): number => {
  const live = mfMarketData?.[m?.mfCode]?.nav;
  return live !== undefined && live !== null && live !== "" ? Number(live) : Number(m?.currentNav) || 0;
};

// Bonds don't compound like FD/RD — their principal is flat and the return comes purely from
// coupon income. Previously "current value" was hardcoded identical to "principal" everywhere
// (portfolio summary strip AND per-card display), so bonds silently contributed zero gain/loss
// to Net Returns / Return % no matter how long they'd been held or what coupon they paid.
// This adds a real (if simplified — no per-coupon-date ledger exists) valuation: principal plus
// coupon income accrued since purchase, capped at the term so a matured bond doesn't keep
// accruing forever, and shown as a single running total rather than modeling each individual
// coupon payment date.
// Bug fix: this file had four different, disagreeing formulas for an MF lot's "current value"
// (portfolio KPI strip, table group rows, row display, per-lot rows) — whenever a fund had no
// live NAV and no stored currentNav, some fell back to the invested amount (implying 0% return)
// while others returned a hard ₹0 or "—", so the same fund could show conflicting figures within
// one screen (e.g. a nonzero "Current Value" but a near-0% "Weight", with P&L hidden). Centralize
// both the invested-value fallback and the current-value fallback here, and expose isStale so
// callers can show an honest "NAV unavailable" indicator instead of a silently fabricated number.
const mfInvestedValue = (m: any): number => {
  const stored = Number(m?.invested ?? m?.investedValue) || 0;
  if (stored > 0) return stored;
  const units = Number(m?.units) || 0;
  const buyNav = Number(m?.buyNav) || 0;
  return units * buyNav;
};

const mfCurrentValueOf = (
  m: any,
  getLiveNavFn: (m: any) => number
): { value: number; isStale: boolean } => {
  const units = Number(m?.units) || 0;
  const nav = getLiveNavFn(m);
  if (units > 0 && nav > 0) return { value: units * nav, isStale: false };
  return { value: mfInvestedValue(m), isStale: true };
};

const isBondMatured = (b: any): boolean => {
  if (!b?.maturityDate) return false;
  const [y, m, d] = String(b.maturityDate).split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  const matDate = new Date(y, m - 1, d);
  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  return matDate.getTime() < nowDate.getTime();
};

const getFdMaturityDate = (f: any): string => {
  if (f?.maturityDate) return f.maturityDate;
  if (f?.startDate && f?.years && !isNaN(Number(f.years))) {
    return addMonthsToDateStr(f.startDate, Math.round(Number(f.years) * 12));
  }
  return "";
};

const isFdMatured = (f: any): boolean => {
  const matStr = getFdMaturityDate(f);
  if (!matStr) return false;
  const [y, m, d] = String(matStr).split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  const matDate = new Date(y, m - 1, d);
  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  return matDate.getTime() < nowDate.getTime();
};

const bondAnnualCoupon = (b: any): number => {
  const principal =
    Number(b?.totalPrincipalAmount || 0) ||
    Number(b?.numberOfUnits || 0) * Number(b?.faceValuePerUnit || 0) ||
    Number(b?.totalInvestmentAmount || 0) ||
    Number(b?.faceValue || 0);
  return (principal * (Number(b?.coupon) || 0)) / 100;
};

const bondCurrentValue = (b: any): number => {
  const principal =
    Number(b?.totalInvestmentAmount || 0) ||
    Number(b?.totalPrincipalAmount || 0) ||
    Number(b?.numberOfUnits || 0) * Number(b?.faceValuePerUnit || 0) ||
    Number(b?.faceValue || 0);
  const annualCoupon = bondAnnualCoupon(b);
  if (annualCoupon <= 0) return principal;

  const fullTermYears =
    b?.maturityDate && b?.orderDate
      ? Math.max(0, monthsBetween(b.orderDate, b.maturityDate) / 12)
      : b?.maturityDate
      ? Math.max(0, monthsBetween(today(), b.maturityDate) / 12)
      : Infinity;

  if (isBondMatured(b)) {
    // When matured, full lifetime coupon is realized upon completion
    return principal + annualCoupon * (isFinite(fullTermYears) ? fullTermYears : 0);
  }

  if (!b?.orderDate) return principal;
  const elapsedYears = Math.max(0, monthsBetween(b.orderDate, today()) / 12);
  return principal + annualCoupon * Math.min(elapsedYears, fullTermYears);
};

// AMC / fund-house names, longest-first so multi-word brands (e.g. "ICICI Prudential")
// match before their shorter substrings (e.g. "ICICI") would.
const MF_AMC_LIST = [
  "Aditya Birla Sun Life", "Bank of India", "Baroda BNP Paribas", "Canara Robeco",
  "Franklin Templeton", "ICICI Prudential", "Mahindra Manulife", "Motilal Oswal",
  "Old Bridge", "WhiteOak Capital", "JM Financial", "Bajaj Finserv", "360 ONE",
  "Nippon India", "Mirae Asset", "Quantum", "Sundaram", "Shriram", "Bandhan",
  "Invesco", "Edelweiss", "PPFAS", "Parag Parikh", "Groww", "Zerodha", "Samco",
  "Union", "Taurus", "Navi", "Trust", "PGIM", "HSBC", "Kotak", "Axis", "HDFC",
  "SBI", "UTI", "DSP", "LIC", "Tata", "ITI", "NJ",
].sort((a, b) => b.length - a.length);

const inferMFAmc = (name: string): string => {
  const n = (name || "").toLowerCase();
  const hit = MF_AMC_LIST.find((amc) => n.includes(amc.toLowerCase()));
  if (hit === "Parag Parikh") return "PPFAS";
  if (hit) return hit;
  const firstWord = (name || "").trim().split(/\s+/)[0];
  return firstWord || "Other";
};

// Market-cap style, inferred from scheme name text (AMFI doesn't expose this via
// mfapi.in — no live look-through data is available, so this is a best-effort label
// only, editable nowhere yet; treat as approximate).
const MF_CAP_PATTERNS: Array<[RegExp, string]> = [
  [/large\s*&?\s*mid\s*cap|large\s*and\s*mid\s*cap/i, "Large & Mid Cap"],
  [/large\s*cap|blue\s*chip|bluechip/i, "Large Cap"],
  [/mid\s*cap|midcap/i, "Mid Cap"],
  [/small\s*cap|smallcap/i, "Small Cap"],
  [/multi\s*cap|multicap/i, "Multi Cap"],
  [/flexi\s*cap|flexicap/i, "Flexi Cap"],
  [/focused/i, "Focused"],
  [/\bvalue\b|\bcontra\b/i, "Value/Contra"],
  [/dividend\s*yield/i, "Dividend Yield"],
  [/elss|tax\s*saver/i, "ELSS (Tax Saver)"],
  [/index|nifty|sensex|\betf\b/i, "Index/ETF"],
  [
    /banking|psu|infrastructure|infra\b|pharma|technology|\btech\b|consumption|energy|manufactur|international|global|\bus\b|nasdaq|china|commodit|reit|gold|silver/i,
    "Sectoral/Thematic",
  ],
];
const MF_DEBT_LIKE = /debt|liquid|gilt|overnight|money\s*market|corporate\s*bond|banking\s*&?\s*psu|credit\s*risk|short\s*duration|ultra\s*short|low\s*duration|floater|hybrid|balanced|arbitrage|conservative/i;

const inferMFCapType = (name: string, category: string): string | null => {
  const n = name || "";
  for (const [re, label] of MF_CAP_PATTERNS) {
    if (re.test(n)) return label;
  }
  const cat = (category || "").toLowerCase();
  if (MF_DEBT_LIKE.test(n) || MF_DEBT_LIKE.test(cat)) return null;
  if (cat.includes("equity")) return "Diversified/Other";
  return null;
};

/* ── shared input style (matches GoalModal) ─────────────────────────── */
const inp = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--surface-0)",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: 10,
  color: THEME.ink,
  fontSize: 14,
} as const;

/* ── sub-tab metadata ─────────────────────────────────────────────────── */
const SUBS = [
  { id: "fd", label: "Fixed Deposits", icon: Coins, stateKey: "fixedDeposits" },
  { id: "rd", label: "Recurring Deposits", icon: Repeat, stateKey: "recurringDeposits" },
  { id: "bond", label: "Bonds", icon: FileText, stateKey: "bonds" },
  { id: "ppf", label: "PPF", icon: Shield, stateKey: "ppf" },
  { id: "nps", label: "NPS", icon: Briefcase, stateKey: "nps" },
  { id: "epf", label: "EPF (EPFO)", icon: Shield, stateKey: "epf" },
  { id: "mf", label: "Mutual Funds", icon: BarChart3, stateKey: "mutualFunds" },
  { id: "dividends", label: "Dividends", icon: Coins, stateKey: "dividends" },
  { id: "income", label: "Yield Tracker", icon: Activity, stateKey: null },
];

const OwnerBadge = ({ owner }: { owner?: string }) => {
  const { familyProfiles } = useMasterData();
  if (!owner) return null;
  const p = familyProfiles.find((x) => x.id === owner || x.name === owner);
  const name = p ? p.name : owner === "self" ? "Self" : owner;
  if (!name) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 10.5,
        fontWeight: 700,
        background: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
        border: "1px solid color-mix(in srgb, var(--t-accent) 25%, transparent)",
        color: "var(--t-accent)",
      }}
    >
      <User size={10} />
      {name}
    </span>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   ADD INVESTMENT MODAL
══════════════════════════════════════════════════════════════════════ */
const AddInvestmentModal = ({ sub, onClose, onSave, activeProfile = "all", saving }: any) => {
  const { mfCategories, familyProfiles } = useMasterData();
  const defaultOwner = activeProfile !== "all" ? activeProfile : "self";
  const subMeta = SUBS.find((s) => s.id === sub);

  // ── FD State ──
  const [fd, setFd] = useState({
    bank: "",
    principal: "",
    rate: "",
    years: "",
    startDate: today(),
    maturityDate: "",
    fdNumber: "",
    accountNumber: "",
    owner: defaultOwner,
    interestPayout: "cumulative",
    depositType: "standard",
    autoRenew: "none",
    nominee: "",
    tag: "",
    notes: "",
  });
  const calcFdMaturity = (startDate: string, years: string) => {
    if (!startDate || !years || isNaN(Number(years))) return "";
    // Bug fix: the previous new Date(str)+setMonth+toISOString round trip both mis-handled
    // day-of-month overflow (e.g. 31 Jan + 1 month silently rolled into March) and was subject
    // to a UTC/local-timezone off-by-one for browsers outside IST. addMonthsToDateStr works
    // entirely on Y-M-D components and clamps the day, avoiding both.
    const totalMonths = Math.round(Number(years) * 12);
    return addMonthsToDateStr(startDate, totalMonths);
  };
  const setFdField = (field: string, value: string) => {
    setFd((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "startDate" || field === "years") {
        const sDate = field === "startDate" ? value : prev.startDate;
        const yrs = field === "years" ? value : prev.years;
        next.maturityDate = calcFdMaturity(sDate, yrs);
      }
      return next;
    });
  };
  // ── RD State ──
  const [rd, setRd] = useState({
    bank: "",
    monthly: "",
    rate: "",
    tenureMonths: "",
    startDate: today(),
  });
  // ── Bond State ──
  const [bond, setBond] = useState({
    name: "",
    issuer: "",
    isin: "",
    securityNature: "",
    orderId: "",
    faceValuePerUnit: "",
    numberOfUnits: "",
    coupon: "",
    ytmRate: "",
    maturityDate: "",
    orderDate: today(),
    principalRepayment: "At Maturity",
    interestPaymentDate: "Annually",
    cleanPricePerUnit: "",
    accruedInterestPerUnit: "",
    brokerage: "0",
    stampDuty: "0",
    buyerName: "",
    sellerName: "",
  });
  // ── PPF State ──
  const [ppf, setPpf] = useState({ institution: "", balance: "", accountNumber: "" });
  // ── NPS State ──
  const [nps, setNps] = useState({
    tier: "I",
    pran: "",
    balance: "",
    schemeType: "All Citizen",
    fundManager: "",
    investmentChoice: "Auto",
    lifecycleFund: "LC-50",
    equityPct: "",
    corpBondPct: "",
    govtSecPct: "",
    altAssetPct: "",
    yearContribution: "",
    employerContribution: "",
  });
  // ── EPF State ──
  const [epf, setEpf] = useState({ uan: "", employer: "", balance: "" });
  const [mf, setMf] = useState({
    name: "",
    category: "Equity",
    mfType: "Direct Growth",
    folioNumber: "",
    mfCode: "",
    buyDate: today(),
    buyNav: "",
    units: "",
    currentNav: "",
    invested: "",
    owner: defaultOwner,
  });

  const handleSave = () => {
    switch (sub) {
      case "fd":
        if (!fd.bank || !fd.principal || !fd.rate) return;
        onSave("fixedDeposits", fd);
        break;
      case "rd":
        if (!rd.bank || !rd.monthly || !rd.rate) return;
        onSave("recurringDeposits", rd);
        break;
      case "bond": {
        if (!bond.name || !bond.coupon) return;
        const units = Number(bond.numberOfUnits) || 0;
        const fvpu = Number(bond.faceValuePerUnit) || 0;
        const cppu = Number(bond.cleanPricePerUnit) || 0;
        const aipu = Number(bond.accruedInterestPerUnit) || 0;
        const totalPrincipal = units * fvpu;
        const totalAccrued = units * aipu;
        const totalConsideration = units * cppu + totalAccrued;
        const totalInvestment =
          totalConsideration + Number(bond.brokerage || 0) + Number(bond.stampDuty || 0);
        onSave("bonds", {
          ...bond,
          faceValue: totalPrincipal || Number(bond.faceValuePerUnit) || 0,
          totalPrincipalAmount: totalPrincipal,
          totalAccruedInterest: totalAccrued,
          totalConsideration: totalConsideration,
          totalInvestmentAmount: totalInvestment,
        });
        break;
      }
      case "ppf":
        if (!ppf.balance) return;
        onSave("ppf", ppf);
        break;
      case "nps":
        onSave("nps", { ...nps, balance: nps.balance || "0" });
        break;
      case "epf":
        onSave("epf", epf);
        break;
      case "mf": {
        if (!mf.name) return;
        const autoInvested =
          !mf.invested && mf.units && mf.buyNav
            ? String(Number(mf.units) * Number(mf.buyNav))
            : mf.invested;
        if (!autoInvested) return;
        onSave("mutualFunds", { ...mf, invested: autoInvested });
        break;
      }
      default:
        break;
    }
  };

  const title = `Add ${subMeta?.label || "Investment"}`;

  return (
    <Modal title={title} onClose={onClose}>
      {/* ── Fixed Deposit ── */}
      {sub === "fd" && (
        <>
          <Field label="Bank / Institution">
            <input
              style={inp}
              value={fd.bank}
              onChange={(e) => setFdField("bank", e.target.value)}
              placeholder="e.g. SBI, HDFC Bank, ICICI Bank"
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Principal Amount (₹)">
              <input
                style={inp}
                type="number"
                value={fd.principal}
                onChange={(e) => setFdField("principal", e.target.value)}
                placeholder="500000"
              />
            </Field>
            <Field label="Interest Rate (% p.a.)">
              <input
                style={inp}
                type="number"
                value={fd.rate}
                onChange={(e) => setFdField("rate", e.target.value)}
                placeholder="7.5"
                step="0.05"
              />
            </Field>
            <Field label="Tenure (Years)">
              <input
                style={inp}
                type="number"
                value={fd.years}
                onChange={(e) => setFdField("years", e.target.value)}
                placeholder="2"
                step="0.25"
              />
            </Field>
            <Field label="Start Date">
              <input
                style={inp}
                type="date"
                value={fd.startDate}
                onChange={(e) => setFdField("startDate", e.target.value)}
              />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Maturity Date">
              <input
                style={inp}
                type="date"
                value={fd.maturityDate}
                onChange={(e) => setFdField("maturityDate", e.target.value)}
              />
            </Field>
            <Field label="FD / Certificate #">
              <input
                style={inp}
                value={fd.fdNumber}
                onChange={(e) => setFdField("fdNumber", e.target.value)}
                placeholder="e.g. FD1093847"
              />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Account Owner">
              <select
                style={inp}
                value={fd.owner}
                onChange={(e) => setFdField("owner", e.target.value)}
              >
                <option value="self">Self</option>
                {familyProfiles
                  .filter((p: any) => p.id !== "self")
                  .map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Deposit Type">
              <select
                style={inp}
                value={fd.depositType}
                onChange={(e) => setFdField("depositType", e.target.value)}
              >
                <option value="standard">Standard Bank FD</option>
                <option value="tax_saver">5-Year Tax Saver (Sec 80C)</option>
                <option value="senior">Senior Citizen FD (+0.5%)</option>
                <option value="nbfc">Corporate / NBFC FD</option>
              </select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Interest Payout">
              <select
                style={inp}
                value={fd.interestPayout}
                onChange={(e) => setFdField("interestPayout", e.target.value)}
              >
                <option value="cumulative">Cumulative (Quarterly Compounding)</option>
                <option value="monthly">Monthly Interest Payout</option>
                <option value="quarterly">Quarterly Interest Payout</option>
                <option value="half_yearly">Half-Yearly Payout</option>
                <option value="annual">Annual Payout</option>
              </select>
            </Field>
            <Field label="Nominee Name">
              <input
                style={inp}
                value={fd.nominee}
                onChange={(e) => setFdField("nominee", e.target.value)}
                placeholder="e.g. Spouse / Son"
              />
            </Field>
          </div>
          {fd.principal && fd.rate && fd.years && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: `color-mix(in srgb, ${THEME.gold} 7%, transparent)`,
                border: `1px solid ${`color-mix(in srgb, ${THEME.gold} 25%, transparent)`}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 11, color: THEME.muted }}>Maturity Value</span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, color: THEME.gold, fontSize: 15 }}>
                <Money value={fdMaturity(Number(fd.principal), Number(fd.rate), Number(fd.years))} variant="full" />
              </span>
            </div>
          )}
        </>
      )}

      {/* ── Recurring Deposit ── */}
      {sub === "rd" && (
        <>
          <Field label="Bank / Institution">
            <input
              style={inp}
              value={rd.bank}
              onChange={(e) => setRd({ ...rd, bank: e.target.value })}
              placeholder="e.g. Axis Bank, Post Office"
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Monthly Installment (₹)">
              <input
                style={inp}
                type="number"
                value={rd.monthly}
                onChange={(e) => setRd({ ...rd, monthly: e.target.value })}
                placeholder="10000"
              />
            </Field>
            <Field label="Interest Rate (% p.a.)">
              <input
                style={inp}
                type="number"
                value={rd.rate}
                onChange={(e) => setRd({ ...rd, rate: e.target.value })}
                placeholder="7.0"
                step="0.1"
              />
            </Field>
            <Field label="Tenure (Months)">
              <input
                style={inp}
                type="number"
                value={rd.tenureMonths}
                onChange={(e) => setRd({ ...rd, tenureMonths: e.target.value })}
                placeholder="24"
              />
            </Field>
            <Field label="Start Date">
              <input
                style={inp}
                type="date"
                value={rd.startDate}
                onChange={(e) => setRd({ ...rd, startDate: e.target.value })}
              />
            </Field>
          </div>
        </>
      )}

      {/* ── Bonds ── */}
      {sub === "bond" &&
        (() => {
          const units = Number(bond.numberOfUnits) || 0;
          const fvpu = Number(bond.faceValuePerUnit) || 0;
          const cppu = Number(bond.cleanPricePerUnit) || 0;
          const aipu = Number(bond.accruedInterestPerUnit) || 0;
          const brok = Number(bond.brokerage) || 0;
          const sdut = Number(bond.stampDuty) || 0;
          const totalPrincipal = units * fvpu;
          const totalAccrued = units * aipu;
          const totalConsideration = units * cppu + totalAccrued;
          const totalInvestment = totalConsideration + brok + sdut;
          const labelStyle = {
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.12em",
            color: THEME.muted,
            marginTop: 16,
            marginBottom: 4,
            borderTop: `1px solid ${THEME.line}`,
            paddingTop: 12,
          };
          return (
            <>
              <div style={{ ...labelStyle, marginTop: 0, borderTop: "none", paddingTop: 0 }}>
                Bond Identity
              </div>
              <Field label="Bond / Product Name *">
                <input
                  style={inp}
                  value={bond.name}
                  onChange={(e) => setBond({ ...bond, name: e.target.value })}
                  placeholder="e.g. IIFL Samasta Mar'25"
                />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Issuer">
                  <input
                    style={inp}
                    value={bond.issuer}
                    onChange={(e) => setBond({ ...bond, issuer: e.target.value })}
                    placeholder="e.g. IIFL, NHAI"
                  />
                </Field>
                <Field label="Security Nature">
                  <input
                    style={inp}
                    value={bond.securityNature}
                    onChange={(e) => setBond({ ...bond, securityNature: e.target.value })}
                    placeholder="Senior Secured Bond"
                  />
                </Field>
                <Field label="ISIN">
                  <input
                    style={inp}
                    value={bond.isin}
                    onChange={(e) => setBond({ ...bond, isin: e.target.value })}
                    placeholder="INE413U07335"
                  />
                </Field>
                <Field label="Order ID">
                  <input
                    style={inp}
                    value={bond.orderId}
                    onChange={(e) => setBond({ ...bond, orderId: e.target.value })}
                    placeholder="1514021"
                  />
                </Field>
              </div>

              <div style={labelStyle}>Financial Terms</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Face Value per Unit (₹)">
                  <input
                    style={inp}
                    type="number"
                    value={bond.faceValuePerUnit}
                    onChange={(e) => setBond({ ...bond, faceValuePerUnit: e.target.value })}
                    placeholder="1000"
                  />
                </Field>
                <Field label="Number of Units">
                  <input
                    style={inp}
                    type="number"
                    value={bond.numberOfUnits}
                    onChange={(e) => setBond({ ...bond, numberOfUnits: e.target.value })}
                    placeholder="10"
                  />
                </Field>
                <Field label="Coupon Rate (% p.a.) *">
                  <input
                    style={inp}
                    type="number"
                    value={bond.coupon}
                    onChange={(e) => setBond({ ...bond, coupon: e.target.value })}
                    placeholder="9.6"
                    step="0.01"
                  />
                </Field>
                <Field label="YTM Rate (% after brokerage)">
                  <input
                    style={inp}
                    type="number"
                    value={bond.ytmRate}
                    onChange={(e) => setBond({ ...bond, ytmRate: e.target.value })}
                    placeholder="11.25"
                    step="0.01"
                  />
                </Field>
                <Field label="Maturity Date">
                  <input
                    style={inp}
                    type="date"
                    value={bond.maturityDate}
                    onChange={(e) => setBond({ ...bond, maturityDate: e.target.value })}
                  />
                </Field>
                <Field label="Order Date">
                  <input
                    style={inp}
                    type="date"
                    value={bond.orderDate}
                    onChange={(e) => setBond({ ...bond, orderDate: e.target.value })}
                  />
                </Field>
                <Field label="Principal Repayment">
                  <select
                    style={inp}
                    value={bond.principalRepayment}
                    onChange={(e) => setBond({ ...bond, principalRepayment: e.target.value })}
                  >
                    <option>At Maturity</option>
                    <option>Installments</option>
                  </select>
                </Field>
                <Field label="Interest Payment">
                  <select
                    style={inp}
                    value={bond.interestPaymentDate}
                    onChange={(e) => setBond({ ...bond, interestPaymentDate: e.target.value })}
                  >
                    <option>Annually</option>
                    <option>Semi-Annually</option>
                    <option>Quarterly</option>
                    <option>Monthly</option>
                    <option>At Maturity</option>
                  </select>
                </Field>
              </div>

              <div style={labelStyle}>Transaction Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Clean Price per Unit (₹)">
                  <input
                    style={inp}
                    type="number"
                    value={bond.cleanPricePerUnit}
                    onChange={(e) => setBond({ ...bond, cleanPricePerUnit: e.target.value })}
                    placeholder="991.087"
                    step="0.001"
                  />
                </Field>
                <Field label="Accrued Interest per Unit (₹)">
                  <input
                    style={inp}
                    type="number"
                    value={bond.accruedInterestPerUnit}
                    onChange={(e) => setBond({ ...bond, accruedInterestPerUnit: e.target.value })}
                    placeholder="47.8685"
                    step="0.0001"
                  />
                </Field>
                <Field label="Brokerage incl. GST (₹)">
                  <input
                    style={inp}
                    type="number"
                    value={bond.brokerage}
                    onChange={(e) => setBond({ ...bond, brokerage: e.target.value })}
                    placeholder="0"
                  />
                </Field>
                <Field label="Stamp Duty (₹)">
                  <input
                    style={inp}
                    type="number"
                    value={bond.stampDuty}
                    onChange={(e) => setBond({ ...bond, stampDuty: e.target.value })}
                    placeholder="0"
                  />
                </Field>
              </div>

              {/* Live computed summary */}
              {(units > 0 || cppu > 0) && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 14,
                    borderRadius: 12,
                    background: "var(--surface-0)",
                    border: `1px solid ${THEME.line}`,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {[
                    ["Total Principal", totalPrincipal],
                    ["Total Accrued Interest", totalAccrued],
                    ["Total Consideration", totalConsideration],
                    ["Total Investment", totalInvestment],
                  ].map(([lbl, val]) => (
                    <div key={lbl}>
                      <div
                        style={{
                          fontSize: 9,
                          color: THEME.muted,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {lbl}
                      </div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                        <Money value={val} variant="full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={labelStyle}>Parties</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Buyer Name">
                  <input
                    style={inp}
                    value={bond.buyerName}
                    onChange={(e) => setBond({ ...bond, buyerName: e.target.value })}
                    placeholder="Your name"
                  />
                </Field>
                <Field label="Seller Name">
                  <input
                    style={inp}
                    value={bond.sellerName}
                    onChange={(e) => setBond({ ...bond, sellerName: e.target.value })}
                    placeholder="e.g. Ambium Finserve"
                  />
                </Field>
              </div>
            </>
          );
        })()}

      {/* ── PPF ── */}
      {sub === "ppf" && (
        <>
          <Field label="Bank / Post Office">
            <input
              style={inp}
              value={ppf.institution}
              onChange={(e) => setPpf({ ...ppf, institution: e.target.value })}
              placeholder="e.g. SBI, Post Office"
            />
          </Field>
          <Field label="Account Number">
            <input
              style={inp}
              value={ppf.accountNumber}
              onChange={(e) => setPpf({ ...ppf, accountNumber: e.target.value })}
              placeholder="PPF account number"
            />
          </Field>
          <Field label="Current Balance (₹)">
            <input
              style={inp}
              type="number"
              value={ppf.balance}
              onChange={(e) => setPpf({ ...ppf, balance: e.target.value })}
              placeholder="250000"
            />
          </Field>
        </>
      )}

      {/* ── NPS ── */}
      {sub === "nps" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Tier">
              <select
                style={inp}
                value={nps.tier}
                onChange={(e) => setNps({ ...nps, tier: e.target.value })}
              >
                <option value="I">Tier I — Pension (Tax Benefits)</option>
                <option value="II">Tier II — Savings (Flexible)</option>
              </select>
            </Field>
            <Field label="Subscriber Type">
              <select
                style={inp}
                value={nps.schemeType}
                onChange={(e) => setNps({ ...nps, schemeType: e.target.value })}
              >
                <option value="All Citizen">All Citizen Model</option>
                <option value="Corporate">Corporate NPS</option>
                <option value="Government">Government (NPS-G)</option>
                <option value="NPS Lite">NPS Lite / Swavalamban</option>
              </select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="PRAN Number">
              <input
                style={inp}
                value={nps.pran}
                onChange={(e) => setNps({ ...nps, pran: e.target.value })}
                placeholder="12-digit PRAN"
                maxLength={12}
              />
            </Field>
            <Field label="Pension Fund Manager (PFM)">
              <select
                style={inp}
                value={nps.fundManager}
                onChange={(e) => setNps({ ...nps, fundManager: e.target.value })}
              >
                <option value="">Select Fund Manager</option>
                <option value="SBI">SBI Pension Funds</option>
                <option value="LIC">LIC Pension Fund</option>
                <option value="UTI">UTI Retirement Solutions</option>
                <option value="HDFC">HDFC Pension Management</option>
                <option value="ICICI">ICICI Prudential Pension</option>
                <option value="Kotak">Kotak Mahindra Pension</option>
                <option value="Aditya Birla">Aditya Birla Sun Life Pension</option>
                <option value="DSP">DSP Pension Fund</option>
                <option value="Tata">Tata Pension Management</option>
                <option value="Max Life">Max Life Pension Fund</option>
              </select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Investment Choice">
              <select
                style={inp}
                value={nps.investmentChoice}
                onChange={(e) => setNps({ ...nps, investmentChoice: e.target.value })}
              >
                <option value="Auto">Auto Choice (Lifecycle)</option>
                <option value="Active">Active Choice (Manual)</option>
              </select>
            </Field>
            {nps.investmentChoice === "Auto" ? (
              <Field label="Lifecycle Fund">
                <select
                  style={inp}
                  value={nps.lifecycleFund}
                  onChange={(e) => setNps({ ...nps, lifecycleFund: e.target.value })}
                >
                  <option value="LC-75">LC-75 Aggressive (High Equity)</option>
                  <option value="LC-50">LC-50 Moderate (Balanced)</option>
                  <option value="LC-25">LC-25 Conservative (Low Equity)</option>
                </select>
              </Field>
            ) : (
              <Field label="Equity (E) % — max 75%">
                <input
                  style={inp}
                  type="number"
                  min={0}
                  max={75}
                  value={nps.equityPct}
                  onChange={(e) => setNps({ ...nps, equityPct: e.target.value })}
                  placeholder="e.g. 50"
                />
              </Field>
            )}
          </div>
          {nps.investmentChoice === "Active" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                <Field label="Corp Bond (C) %">
                  <input
                    style={inp}
                    type="number"
                    min={0}
                    max={100}
                    value={nps.corpBondPct}
                    onChange={(e) => setNps({ ...nps, corpBondPct: e.target.value })}
                    placeholder="e.g. 30"
                  />
                </Field>
                <Field label="Govt Sec (G) %">
                  <input
                    style={inp}
                    type="number"
                    min={0}
                    max={100}
                    value={nps.govtSecPct}
                    onChange={(e) => setNps({ ...nps, govtSecPct: e.target.value })}
                    placeholder="e.g. 15"
                  />
                </Field>
                <Field label="Alternative (A) % — max 5%">
                  <input
                    style={inp}
                    type="number"
                    min={0}
                    max={5}
                    value={nps.altAssetPct}
                    onChange={(e) => setNps({ ...nps, altAssetPct: e.target.value })}
                    placeholder="e.g. 5"
                  />
                </Field>
              </div>
              {(() => {
                const allocTotal =
                  (Number(nps.equityPct) || 0) +
                  (Number(nps.corpBondPct) || 0) +
                  (Number(nps.govtSecPct) || 0) +
                  (Number(nps.altAssetPct) || 0);
                if (allocTotal > 0 && allocTotal !== 100)
                  return (
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
                        border: `1px solid ${`color-mix(in srgb, ${THEME.rust} 20%, transparent)`}`,
                        fontSize: 11,
                        color: THEME.rust,
                        fontWeight: 600,
                      }}
                    >
                      Allocation total is {allocTotal}% — must sum to 100% (E + C + G + A)
                    </div>
                  );
                return null;
              })()}
            </>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Current Corpus (₹)">
              <input
                style={inp}
                type="number"
                value={nps.balance}
                onChange={(e) => setNps({ ...nps, balance: e.target.value })}
                placeholder="e.g. 500000"
              />
            </Field>
            <Field label="Annual Contribution (₹)">
              <input
                style={inp}
                type="number"
                value={nps.yearContribution}
                onChange={(e) => setNps({ ...nps, yearContribution: e.target.value })}
                placeholder="e.g. 50000"
              />
            </Field>
          </div>
          {nps.schemeType === "Corporate" && (
            <Field label="Employer Contribution (₹/year) — 80CCD(2)">
              <input
                style={inp}
                type="number"
                value={nps.employerContribution}
                onChange={(e) => setNps({ ...nps, employerContribution: e.target.value })}
                placeholder="e.g. 60000"
              />
            </Field>
          )}
        </>
      )}

      {/* ── EPF ── */}
      {sub === "epf" && (
        <>
          <Field label="UAN (Universal Account Number)">
            <input
              style={inp}
              value={epf.uan}
              onChange={(e) => setEpf({ ...epf, uan: e.target.value })}
              placeholder="12-digit UAN"
              maxLength={12}
            />
          </Field>
          <Field label="Employer / Company Name">
            <input
              style={inp}
              value={epf.employer}
              onChange={(e) => setEpf({ ...epf, employer: e.target.value })}
              placeholder="e.g. Infosys, TCS, Your Company Ltd."
            />
          </Field>
          <Field label="Current EPF Corpus (₹)">
            <input
              style={inp}
              type="number"
              value={epf.balance}
              onChange={(e) => setEpf({ ...epf, balance: e.target.value })}
              placeholder="500000"
            />
          </Field>
        </>
      )}

      {/* ── Mutual Funds ── */}
      {sub === "mf" &&
        (() => {
          const autoInvested = mf.units && mf.buyNav ? Number(mf.units) * Number(mf.buyNav) : null;
          const currentValue =
            mf.units && mf.currentNav ? Number(mf.units) * Number(mf.currentNav) : null;
          const costBasis = mf.invested ? Number(mf.invested) : autoInvested;
          const pnl = currentValue !== null && costBasis ? currentValue - costBasis : null;
          const pnlPct = pnl !== null && costBasis ? (pnl / costBasis) * 100 : null;
          return (
            <>
              <Field label="Fund Name *">
                <input
                  style={inp}
                  value={mf.name}
                  onChange={(e) => setMf({ ...mf, name: e.target.value })}
                  placeholder="e.g. Mirae Asset Large Cap Fund"
                />
              </Field>
              <Field label="Owner / Profile">
                <select
                  style={inp}
                  value={mf.owner || "self"}
                  onChange={(e) => setMf({ ...mf, owner: e.target.value })}
                >
                  {familyProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatProfileOption(p)}
                    </option>
                  ))}
                </select>
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Category (from Master Data)">
                  <select
                    style={inp}
                    value={mf.category}
                    onChange={(e) => setMf({ ...mf, category: e.target.value })}
                  >
                    {mfCategories.map((c: string) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Fund Type">
                  <select
                    style={inp}
                    value={mf.mfType}
                    onChange={(e) => setMf({ ...mf, mfType: e.target.value })}
                  >
                    <option>Direct Growth</option>
                    <option>Direct IDCW</option>
                    <option>Regular Growth</option>
                    <option>Regular IDCW</option>
                  </select>
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Folio Number">
                  <input
                    style={inp}
                    value={mf.folioNumber}
                    onChange={(e) => setMf({ ...mf, folioNumber: e.target.value })}
                    placeholder="e.g. 1234567890"
                  />
                </Field>
                <Field label="AMFI Code (for live NAV)">
                  <input
                    style={inp}
                    value={mf.mfCode}
                    onChange={(e) => setMf({ ...mf, mfCode: e.target.value })}
                    placeholder="e.g. 120716"
                  />
                </Field>
                <Field label="Purchase Date">
                  <input
                    style={inp}
                    type="date"
                    value={mf.buyDate}
                    onChange={(e) => setMf({ ...mf, buyDate: e.target.value })}
                  />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Units Held *">
                  <input
                    style={inp}
                    type="number"
                    value={mf.units}
                    onChange={(e) => setMf({ ...mf, units: e.target.value })}
                    placeholder="1234.56"
                    step="0.01"
                  />
                </Field>
                <Field label="Buy NAV (₹ per unit)">
                  <input
                    style={inp}
                    type="number"
                    value={mf.buyNav}
                    onChange={(e) => setMf({ ...mf, buyNav: e.target.value })}
                    placeholder="80.00"
                    step="0.0001"
                  />
                </Field>
                <Field label="Amount Invested (₹)">
                  <input
                    style={inp}
                    type="number"
                    value={mf.invested}
                    onChange={(e) => setMf({ ...mf, invested: e.target.value })}
                    placeholder={autoInvested ? String(autoInvested.toFixed(2)) : "100000"}
                  />
                </Field>
                <Field label="Current NAV (₹)">
                  <input
                    style={inp}
                    type="number"
                    value={mf.currentNav}
                    onChange={(e) => setMf({ ...mf, currentNav: e.target.value })}
                    placeholder="93.22"
                    step="0.0001"
                  />
                </Field>
              </div>
              {(autoInvested || currentValue) && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
                    border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 19%, transparent)`}`,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 12,
                  }}
                >
                  {autoInvested && (
                    <div>
                      <div style={{ fontSize: 10, color: THEME.muted }}>Cost Basis</div>
                      <div style={{ fontWeight: 800, color: THEME.ink, fontSize: 13 }}>
                        <Money value={autoInvested} variant="full" />
                      </div>
                    </div>
                  )}
                  {currentValue && (
                    <div>
                      <div style={{ fontSize: 10, color: THEME.muted }}>Current Value</div>
                      <div style={{ fontWeight: 800, color: THEME.accent, fontSize: 13 }}>
                        <Money value={currentValue} variant="full" />
                      </div>
                    </div>
                  )}
                  {pnl !== null && (
                    <div>
                      <div style={{ fontSize: 10, color: THEME.muted }}>P&L</div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 13,
                          color: pnl >= 0 ? THEME.sage : THEME.rust,
                        }}
                      >
                        {pnl >= 0 ? "+" : ""}
                        {pnlPct !== null ? pnlPct.toFixed(2) : "0"}%
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          );
        })()}

      <ModalActions
        onSave={handleSave}
        onClose={onClose}
        saveLabel={`Add ${subMeta?.label || ""}`}
        disabled={saving}
        loading={saving}
      />
    </Modal>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   MAIN TAB COMPONENT
══════════════════════════════════════════════════════════════════════ */
export const InvestmentsTab: React.FC<InvestmentsTabProps> = ({
  state,
  addItem,
  removeItem,
  updateItem,
  subTab,
  onSubTabChange,
  activeProfile = "all",
  mfMarketData,
  fetchMfNavs,
  fetchingMfNavs,
  mfMarketDataTs,
  showToast,
}) => {
  const [sub, setSub] = useState(subTab || "fd");
  const [showModal, setShowModal] = useState(false);

  // Sync internal sub when parent drives subTab via sidebar click
  useEffect(() => {
    if (subTab) setSub(subTab);
  }, [subTab]);

  const subs = SUBS.map((s) => ({
    ...s,
    count: s.stateKey ? (state[s.stateKey]?.length ?? 0) : undefined,
  }));

  const { run: handleSave, loading: savingInvestment } = useAsyncAction(
    async (key: string, data: any) => {
      await addItem(key, data);
    },
    {
      onSuccess: () => setShowModal(false),
      onError: (e: any) =>
        showToast?.(`Failed to save: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const canAdd = sub !== "income" && sub !== "dividends";

  // ── Portfolio Calculation Helpers ──────────────────────────────────────
  // FD accrued value: use elapsed years not full tenure (shows real current worth)
  const fdCurrentValue = (x: any) => {
    const principal = Number(x.principal) || 0;
    const rate = Number(x.rate) || 0;
    const years = Number(x.years) || 0;
    if (!years || !principal) return principal;
    // If already matured, return full maturity value
    if (isFdMatured(x)) return fdMaturity(principal, rate, years);
    const elapsedYears = x.startDate
      ? Math.min(years, monthsBetween(x.startDate, today()) / 12)
      : years;
    return fdMaturity(principal, rate, Math.max(0, elapsedYears));
  };

  // RD: only count installments actually deposited, and accrue interest on those
  const rdElapsed = (x: any) =>
    x.startDate
      ? Math.min(Number(x.tenureMonths) || 0, Math.max(0, monthsBetween(x.startDate, today())))
      : Number(x.tenureMonths) || 0;

  const rdCurrentValue = (x: any) =>
    rdMaturity(Number(x.monthly) || 0, Number(x.rate) || 0, rdElapsed(x));

  const rdPrincipal = (x: any) => (Number(x.monthly) || 0) * rdElapsed(x);

  // Portfolio Calculations
  const totalPrincipal =
    (state.fixedDeposits?.reduce((s: number, x: any) => s + (Number(x.principal) || 0), 0) || 0) +
    (state.recurringDeposits?.reduce((s: number, x: any) => s + rdPrincipal(x), 0) || 0) +
    (state.bonds?.reduce(
      (s: number, x: any) => s + (Number(x.totalInvestmentAmount || x.faceValue) || 0),
      0
    ) || 0) +
    (state.ppf?.reduce((s: number, x: any) => {
      const txs = x.transactions || [];
      if (txs.length > 0) {
        const deposits = txs
          .filter((t: any) => t.type === "deposit")
          .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const withdrawals = txs
          .filter((t: any) => t.type === "withdrawal")
          .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        return s + deposits - withdrawals;
      }
      return s + (Number(x.balance) || 0);
    }, 0) || 0) +
    (state.nps?.reduce((s: number, x: any) => {
      const txs = x.transactions || [];
      if (txs.length > 0) {
        return (
          s +
          txs.reduce(
            (sum: number, t: any) =>
              sum + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
            0
          )
        );
      }
      return s + (Number(x.balance) || 0);
    }, 0) || 0) +
    (state.epf?.reduce((s: number, x: any) => s + calculateEpfBalance(x), 0) || 0) +
    (state.mutualFunds?.reduce(
      (s: number, x: any) => s + (Number(x.invested || x.investedValue) || 0),
      0
    ) || 0) +
    (state.lic?.reduce((s: number, x: any) => {
      const txTotal = (x.transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      return s + (txTotal > 0 ? txTotal : Number(x.premiumPaid || 0));
    }, 0) || 0);

  const totalCurrent =
    (state.fixedDeposits?.reduce((s: number, x: any) => s + fdCurrentValue(x), 0) || 0) +
    (state.recurringDeposits?.reduce((s: number, x: any) => s + rdCurrentValue(x), 0) || 0) +
    (state.bonds?.reduce((s: number, x: any) => s + bondCurrentValue(x), 0) || 0) +
    (state.ppf?.reduce((s: number, x: any) => {
      // Bug fix: unlike totalPrincipal just above, this had no ledger fallback — a PPF account
      // tracked purely via the deposit/withdrawal ledger (balance left at 0) showed a large
      // "Total Invested" against a near-zero "Current Value", implying a huge loss. Mirror NPS's
      // fallback (below): use the manual balance when set, else net ledger deposits-withdrawals.
      const manualBalance = Number(x.balance) || 0;
      if (manualBalance > 0) return s + manualBalance;
      const txs = x.transactions || [];
      if (txs.length === 0) return s;
      const deposits = txs
        .filter((t: any) => t.type === "deposit")
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const withdrawals = txs
        .filter((t: any) => t.type === "withdrawal")
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      return s + Math.max(0, deposits - withdrawals);
    }, 0) || 0) +
    (state.nps?.reduce((s: number, x: any) => {
      const bal = Number(x.balance) || 0;
      if (bal > 0) return s + bal;
      return (
        s +
        (x.transactions || []).reduce(
          (ss: number, t: any) =>
            ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
          0
        )
      );
    }, 0) || 0) +
    (state.epf?.reduce((s: number, x: any) => s + calculateEpfBalance(x), 0) || 0) +
    (state.mutualFunds?.reduce(
      (s: number, x: any) =>
        s +
        (Number(x.units || 0) * liveMfNav(x, mfMarketData) ||
          Number(x.invested || x.investedValue) ||
          0),
      0
    ) || 0) +
    (state.lic?.reduce((s: number, x: any) => {
      const txTotal = (x.transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      return s + (txTotal > 0 ? txTotal : Number(x.premiumPaid || 0));
    }, 0) || 0);

  const netGain = totalCurrent - totalPrincipal;
  const gainPct = totalPrincipal > 0 ? (netGain / totalPrincipal) * 100 : 0;

  const renderContent = () => {
    const onAdd = () => setShowModal(true);
    switch (sub) {
      case "fd":
        return (
          <FixedDepositsSection
            items={state.fixedDeposits || []}
            removeItem={removeItem}
            updateItem={updateItem}
            addItem={addItem}
            onAdd={onAdd}
            showToast={showToast}
            activeProfile={activeProfile}
          />
        );
      case "rd":
        return (
          <RecurringDepositsSection
            items={state.recurringDeposits || []}
            removeItem={removeItem}
            updateItem={updateItem}
            addItem={addItem}
            onAdd={onAdd}
            showToast={showToast}
            activeProfile={activeProfile}
          />
        );
      case "bond":
        return (
          <BondsSection
            items={state.bonds || []}
            removeItem={removeItem}
            updateItem={updateItem}
            addItem={addItem}
            onAdd={onAdd}
            showToast={showToast}
            activeProfile={activeProfile}
          />
        );
      case "ppf":
        return (
          <PPFSection
            items={state.ppf || []}
            removeItem={removeItem}
            updateItem={updateItem}
            addItem={addItem}
            onAdd={onAdd}
            showToast={showToast}
            activeProfile={activeProfile}
          />
        );
      case "nps":
        return (
          <NPSSection
            items={state.nps || []}
            removeItem={removeItem}
            updateItem={updateItem}
            addItem={addItem}
            onAdd={onAdd}
            showToast={showToast}
            activeProfile={activeProfile}
          />
        );
      case "epf":
        return (
          <EPFSection
            items={state.epf || []}
            removeItem={removeItem}
            updateItem={updateItem}
            addItem={addItem}
            onAdd={onAdd}
            showToast={showToast}
            activeProfile={activeProfile}
          />
        );
      case "mf":
        return (
          <MutualFundsSection
            items={state.mutualFunds}
            mfSells={state.mfSells || []}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
            onAdd={onAdd}
            activeProfile={activeProfile}
            mfMarketData={mfMarketData}
            fetchMfNavs={fetchMfNavs}
            fetchingMfNavs={fetchingMfNavs}
            mfMarketDataTs={mfMarketDataTs}
            showToast={showToast}
          />
        );
      case "dividends":
        return (
          <DividendTracker
            state={state}
            addItem={addItem}
            removeItem={removeItem}
            showToast={showToast}
          />
        );
      case "income":
        return <YieldTracker state={state} />;
      default:
        return null;
    }
  };

  return (
    <div className="tab-content-enter">
      {/* ── HEADER ── */}
      <SectionTitle
        sub="Growth, preservation, and yield instruments across multiple asset classes"
        rightElement={
          canAdd && (
            <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShowModal(true)}>
              Add {subs.find((s) => s.id === sub)?.label || "Investment"}
            </Button>
          )
        }
      >
        Investments Portfolio
      </SectionTitle>

      {/* Portfolio summary strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {[
          {
            label: "Total Invested",
            value: fmtINRFull(totalPrincipal),
            numericValue: totalPrincipal,
            formatValue: fmtINRFull,
            color: THEME.accent,
            Icon: IndianRupee,
          },
          {
            label: "Current Value",
            value: fmtINRFull(totalCurrent),
            numericValue: totalCurrent,
            formatValue: fmtINRFull,
            color: THEME.sage,
            Icon: TrendingUp,
          },
          {
            label: "Net Returns",
            value: `${netGain >= 0 ? "+" : "-"}${fmtINRFull(Math.abs(netGain))}`,
            numericValue: netGain,
            formatValue: (n: number) => `${n >= 0 ? "+" : "-"}${fmtINRFull(Math.abs(n))}`,
            color: netGain >= 0 ? THEME.sage : THEME.rust,
            Icon: netGain >= 0 ? TrendingUp : TrendingDown,
          },
          {
            label: "Return %",
            value: `${netGain >= 0 ? "+" : "-"}${Math.abs(gainPct).toFixed(1)}%`,
            numericValue: gainPct,
            formatValue: (n: number) => `${n >= 0 ? "+" : "-"}${Math.abs(n).toFixed(1)}%`,
            color: netGain >= 0 ? THEME.sage : THEME.rust,
            Icon: Activity,
            sub: netGain >= 0 ? "Gain" : "Loss",
          },
          {
            label: "Instruments",
            value: String(
              subs.filter((s) => s.id !== "income").reduce((sum, s) => sum + (s.count ?? 0), 0)
            ),
            numericValue: subs
              .filter((s) => s.id !== "income")
              .reduce((sum, s) => sum + (s.count ?? 0), 0),
            formatValue: (n: number) => String(Math.round(n)),
            color: THEME.muted,
            Icon: BarChart3,
          },
        ].map(({ label, value, numericValue, formatValue, color, Icon, sub }) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            numericValue={numericValue}
            formatValue={formatValue}
            icon={<Icon />}
            color={color}
            sub={sub}
            subColor={color}
          />
        ))}
      </div>

      <div>
        {/* Inline sub-tab navigation */}
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            padding: 6,
            background: "var(--surface-1)",
            border: `1.5px solid ${THEME.line}`,
            borderRadius: 16,
            marginBottom: 28,
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.02)",
          }}
          className="no-scrollbar"
        >
          {subs.map((s) => {
            const Icon = s.icon;
            const active = sub === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setSub(s.id);
                  onSubTabChange?.(s.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: active
                    ? `color-mix(in srgb, ${THEME.accent} 12%, transparent)`
                    : "transparent",
                  color: active ? THEME.accent : THEME.muted,
                  fontWeight: active ? 800 : 600,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: active ? `inset 0 -2px 0 ${THEME.accent}` : "none",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon size={14} style={{ color: active ? THEME.accent : THEME.muted }} />
                {s.label}
                {s.count !== undefined && s.count > 0 && (
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: "var(--radius-xs)",
                      fontSize: 10,
                      fontWeight: 800,
                      background: active
                        ? `color-mix(in srgb, ${THEME.accent} 22%, transparent)`
                        : `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                      color: THEME.accent,
                      transition: "all 0.25s",
                    }}
                  >
                    {s.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {renderContent()}
      </div>

      {/* ── ADD MODAL ── */}
      {showModal && (
        <AddInvestmentModal
          sub={sub}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          activeProfile={activeProfile}
          saving={savingInvestment}
        />
      )}
    </div>
  );
};

/* ── Edit Bond Modal ────────────────────────────────────────────────── */
function EditBondModal({ bond: initial, onClose, onSave, saving }: any) {
  const labelStyle = {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: THEME.muted,
    marginTop: 16,
    marginBottom: 4,
    borderTop: `1px solid ${THEME.line}`,
    paddingTop: 12,
  };
  const [bond, setBond] = useState({
    name: initial.name || "",
    issuer: initial.issuer || "",
    isin: initial.isin || "",
    securityNature: initial.securityNature || "",
    orderId: initial.orderId || "",
    faceValuePerUnit: initial.faceValuePerUnit != null ? String(initial.faceValuePerUnit) : "",
    numberOfUnits: initial.numberOfUnits != null ? String(initial.numberOfUnits) : "",
    coupon: initial.coupon != null ? String(initial.coupon) : "",
    ytmRate: initial.ytmRate != null ? String(initial.ytmRate) : "",
    maturityDate: initial.maturityDate || "",
    orderDate: initial.orderDate || today(),
    principalRepayment: initial.principalRepayment || "At Maturity",
    interestPaymentDate: initial.interestPaymentDate || "Annually",
    cleanPricePerUnit: initial.cleanPricePerUnit != null ? String(initial.cleanPricePerUnit) : "",
    accruedInterestPerUnit:
      initial.accruedInterestPerUnit != null ? String(initial.accruedInterestPerUnit) : "",
    brokerage: initial.brokerage != null ? String(initial.brokerage) : "0",
    stampDuty: initial.stampDuty != null ? String(initial.stampDuty) : "0",
    buyerName: initial.buyerName || "",
    sellerName: initial.sellerName || "",
  });

  const units = Number(bond.numberOfUnits) || 0;
  const fvpu = Number(bond.faceValuePerUnit) || 0;
  const cppu = Number(bond.cleanPricePerUnit) || 0;
  const aipu = Number(bond.accruedInterestPerUnit) || 0;
  const brok = Number(bond.brokerage) || 0;
  const sdut = Number(bond.stampDuty) || 0;
  const totalPrincipal = units * fvpu;
  const totalAccrued = units * aipu;
  const totalConsideration = units * cppu + totalAccrued;
  const totalInvestment = totalConsideration + brok + sdut;

  const handleSave = () => {
    if (!bond.name || !bond.coupon) return;
    onSave({
      ...bond,
      faceValue: totalPrincipal || Number(bond.faceValuePerUnit) || 0,
      totalPrincipalAmount: totalPrincipal,
      totalAccruedInterest: totalAccrued,
      totalConsideration,
      totalInvestmentAmount: totalInvestment,
    });
  };

  return (
    <Modal title="Edit Bond" onClose={onClose}>
      <div style={{ ...labelStyle, marginTop: 0, borderTop: "none", paddingTop: 0 }}>
        Bond Identity
      </div>
      <Field label="Bond / Product Name *">
        <input
          style={inp}
          value={bond.name}
          onChange={(e) => setBond({ ...bond, name: e.target.value })}
          placeholder="e.g. IIFL Samasta Mar'25"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Issuer">
          <input
            style={inp}
            value={bond.issuer}
            onChange={(e) => setBond({ ...bond, issuer: e.target.value })}
            placeholder="e.g. IIFL, NHAI"
          />
        </Field>
        <Field label="Security Nature">
          <input
            style={inp}
            value={bond.securityNature}
            onChange={(e) => setBond({ ...bond, securityNature: e.target.value })}
            placeholder="Senior Secured Bond"
          />
        </Field>
        <Field label="ISIN">
          <input
            style={inp}
            value={bond.isin}
            onChange={(e) => setBond({ ...bond, isin: e.target.value })}
            placeholder="INE413U07335"
          />
        </Field>
        <Field label="Order ID">
          <input
            style={inp}
            value={bond.orderId}
            onChange={(e) => setBond({ ...bond, orderId: e.target.value })}
            placeholder="1514021"
          />
        </Field>
      </div>

      <div style={labelStyle}>Financial Terms</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Face Value per Unit (₹)">
          <input
            style={inp}
            type="number"
            value={bond.faceValuePerUnit}
            onChange={(e) => setBond({ ...bond, faceValuePerUnit: e.target.value })}
            placeholder="1000"
          />
        </Field>
        <Field label="Number of Units">
          <input
            style={inp}
            type="number"
            value={bond.numberOfUnits}
            onChange={(e) => setBond({ ...bond, numberOfUnits: e.target.value })}
            placeholder="10"
          />
        </Field>
        <Field label="Coupon Rate (% p.a.) *">
          <input
            style={inp}
            type="number"
            value={bond.coupon}
            onChange={(e) => setBond({ ...bond, coupon: e.target.value })}
            placeholder="9.6"
            step="0.01"
          />
        </Field>
        <Field label="YTM Rate (% after brokerage)">
          <input
            style={inp}
            type="number"
            value={bond.ytmRate}
            onChange={(e) => setBond({ ...bond, ytmRate: e.target.value })}
            placeholder="11.25"
            step="0.01"
          />
        </Field>
        <Field label="Maturity Date">
          <input
            style={inp}
            type="date"
            value={bond.maturityDate}
            onChange={(e) => setBond({ ...bond, maturityDate: e.target.value })}
          />
        </Field>
        <Field label="Order Date">
          <input
            style={inp}
            type="date"
            value={bond.orderDate}
            onChange={(e) => setBond({ ...bond, orderDate: e.target.value })}
          />
        </Field>
        <Field label="Principal Repayment">
          <select
            style={inp}
            value={bond.principalRepayment}
            onChange={(e) => setBond({ ...bond, principalRepayment: e.target.value })}
          >
            <option>At Maturity</option>
            <option>Installments</option>
          </select>
        </Field>
        <Field label="Interest Payment">
          <select
            style={inp}
            value={bond.interestPaymentDate}
            onChange={(e) => setBond({ ...bond, interestPaymentDate: e.target.value })}
          >
            <option>Annually</option>
            <option>Semi-Annually</option>
            <option>Quarterly</option>
            <option>Monthly</option>
            <option>At Maturity</option>
          </select>
        </Field>
      </div>

      <div style={labelStyle}>Transaction Details</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Clean Price per Unit (₹)">
          <input
            style={inp}
            type="number"
            value={bond.cleanPricePerUnit}
            onChange={(e) => setBond({ ...bond, cleanPricePerUnit: e.target.value })}
            placeholder="991.087"
            step="0.001"
          />
        </Field>
        <Field label="Accrued Interest per Unit (₹)">
          <input
            style={inp}
            type="number"
            value={bond.accruedInterestPerUnit}
            onChange={(e) => setBond({ ...bond, accruedInterestPerUnit: e.target.value })}
            placeholder="47.8685"
            step="0.0001"
          />
        </Field>
        <Field label="Brokerage incl. GST (₹)">
          <input
            style={inp}
            type="number"
            value={bond.brokerage}
            onChange={(e) => setBond({ ...bond, brokerage: e.target.value })}
            placeholder="0"
          />
        </Field>
        <Field label="Stamp Duty (₹)">
          <input
            style={inp}
            type="number"
            value={bond.stampDuty}
            onChange={(e) => setBond({ ...bond, stampDuty: e.target.value })}
            placeholder="0"
          />
        </Field>
      </div>

      {(units > 0 || cppu > 0) && (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 12,
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {[
            ["Total Principal", totalPrincipal],
            ["Total Accrued Interest", totalAccrued],
            ["Total Consideration", totalConsideration],
            ["Total Investment", totalInvestment],
          ].map(([lbl, val]) => (
            <div key={lbl}>
              <div
                style={{
                  fontSize: 9,
                  color: THEME.muted,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {lbl}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                <Money value={val} variant="full" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={labelStyle}>Parties</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Buyer Name">
          <input
            style={inp}
            value={bond.buyerName}
            onChange={(e) => setBond({ ...bond, buyerName: e.target.value })}
            placeholder="Your name"
          />
        </Field>
        <Field label="Seller Name">
          <input
            style={inp}
            value={bond.sellerName}
            onChange={(e) => setBond({ ...bond, sellerName: e.target.value })}
            placeholder="e.g. Ambium Finserve"
          />
        </Field>
      </div>
      <ModalActions
        onSave={handleSave}
        onClose={onClose}
        saveLabel="Save Changes"
        disabled={saving}
        loading={saving}
      />
    </Modal>
  );
}


/* ── Edit RD Modal ───────────────────────────────────────────────────── */
function EditRDModal({ rd: initial, onClose, onSave, saving }: any) {
  const [form, setForm] = useState({
    bank: initial.bank || "",
    monthly: initial.monthly != null ? String(initial.monthly) : "",
    rate: initial.rate != null ? String(initial.rate) : "",
    tenureMonths: initial.tenureMonths != null ? String(initial.tenureMonths) : "",
    startDate: initial.startDate || today(),
  });
  const maturity = rdMaturity(Number(form.monthly), Number(form.rate), Number(form.tenureMonths));
  return (
    <Modal title="Edit Recurring Deposit" onClose={onClose}>
      <Field label="Bank / Institution">
        <input
          style={inp}
          value={form.bank}
          onChange={(e) => setForm({ ...form, bank: e.target.value })}
          placeholder="e.g. Axis Bank"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Monthly Installment (₹)">
          <input
            style={inp}
            type="number"
            value={form.monthly}
            onChange={(e) => setForm({ ...form, monthly: e.target.value })}
            placeholder="10000"
          />
        </Field>
        <Field label="Interest Rate (% p.a.)">
          <input
            style={inp}
            type="number"
            value={form.rate}
            onChange={(e) => setForm({ ...form, rate: e.target.value })}
            placeholder="7.0"
            step="0.1"
          />
        </Field>
        <Field label="Tenure (Months)">
          <input
            style={inp}
            type="number"
            value={form.tenureMonths}
            onChange={(e) => setForm({ ...form, tenureMonths: e.target.value })}
            placeholder="24"
          />
        </Field>
        <Field label="Start Date">
          <input
            style={inp}
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </Field>
      </div>
      {form.monthly && form.rate && form.tenureMonths && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: `color-mix(in srgb, ${THEME.cyan} 6%, transparent)`,
            border: `1px solid color-mix(in srgb, ${THEME.cyan} 20%, transparent)`,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11, color: THEME.muted }}>Projected Maturity</span>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, color: THEME.cyan, fontSize: 15 }}>
            <Money value={maturity} variant="full" />
          </span>
        </div>
      )}
      <ModalActions
        onSave={() => form.bank && form.monthly && form.rate && onSave(form)}
        onClose={onClose}
        saveLabel="Save Changes"
        disabled={saving}
        loading={saving}
      />
    </Modal>
  );
}

/* ── Edit MF Modal ────────────────────────────────────────────────────── */
function EditMFModal({ mf: initial, onClose, onSave, activeProfile = "all", saving }: any) {
  const { mfCategories, familyProfiles } = useMasterData();
  const defaultOwner = activeProfile !== "all" ? activeProfile : "self";
  const [form, setForm] = useState({
    name: initial.name || "",
    category: initial.category || "Equity",
    mfType: initial.mfType || "Direct Growth",
    folioNumber: initial.folioNumber || "",
    mfCode: initial.mfCode || "",
    buyDate: initial.buyDate || "",
    buyNav: initial.buyNav != null ? String(initial.buyNav || "") : "",
    units: initial.units != null ? String(initial.units) : "",
    currentNav: initial.currentNav != null ? String(initial.currentNav) : "",
    invested:
      initial.invested != null ? String(initial.invested || initial.investedValue || "") : "",
    owner: initial.owner || defaultOwner,
  });

  const currentValue = Number(form.units) * Number(form.currentNav) || 0;
  const costBasis = form.invested
    ? Number(form.invested)
    : form.units && form.buyNav
      ? Number(form.units) * Number(form.buyNav)
      : 0;
  const pnl = currentValue - costBasis;
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

  return (
    <Modal title="Edit Mutual Fund" onClose={onClose}>
      <Field label="Fund Name *">
        <input
          style={inp}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Mirae Asset Large Cap Fund"
        />
      </Field>
      <Field label="Owner / Profile">
        <select
          style={inp}
          value={form.owner || "self"}
          onChange={(e) => setForm({ ...form, owner: e.target.value })}
        >
          {familyProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {formatProfileOption(p)}
            </option>
          ))}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Category (from Master Data)">
          <select
            style={inp}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {mfCategories.map((c: string) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Fund Type">
          <select
            style={inp}
            value={form.mfType}
            onChange={(e) => setForm({ ...form, mfType: e.target.value })}
          >
            <option>Direct Growth</option>
            <option>Direct IDCW</option>
            <option>Regular Growth</option>
            <option>Regular IDCW</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Folio Number">
          <input
            style={inp}
            value={form.folioNumber}
            onChange={(e) => setForm({ ...form, folioNumber: e.target.value })}
            placeholder="e.g. 1234567890"
          />
        </Field>
        <Field label="AMFI Code (for live NAV)">
          <input
            style={inp}
            value={form.mfCode}
            onChange={(e) => setForm({ ...form, mfCode: e.target.value })}
            placeholder="e.g. 120716"
          />
        </Field>
        <Field label="Purchase Date">
          <input
            style={inp}
            type="date"
            value={form.buyDate}
            onChange={(e) => setForm({ ...form, buyDate: e.target.value })}
          />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Units Held *">
          <input
            style={inp}
            type="number"
            value={form.units}
            onChange={(e) => setForm({ ...form, units: e.target.value })}
            placeholder="1234.56"
            step="0.01"
          />
        </Field>
        <Field label="Buy NAV (₹ per unit)">
          <input
            style={inp}
            type="number"
            value={form.buyNav}
            onChange={(e) => setForm({ ...form, buyNav: e.target.value })}
            placeholder="80.00"
            step="0.0001"
          />
        </Field>
        <Field label="Amount Invested (₹)">
          <input
            style={inp}
            type="number"
            value={form.invested}
            onChange={(e) => setForm({ ...form, invested: e.target.value })}
            placeholder="100000"
          />
        </Field>
        <Field label="Current NAV (₹)">
          <input
            style={inp}
            type="number"
            value={form.currentNav}
            onChange={(e) => setForm({ ...form, currentNav: e.target.value })}
            placeholder="93.22"
            step="0.0001"
          />
        </Field>
      </div>
      {(currentValue > 0 || costBasis > 0) && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
            border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 20%, transparent)`}`,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: THEME.muted }}>Cost Basis</div>
            <div style={{ fontWeight: 800, color: THEME.ink, fontSize: 13 }}>
              <Money value={costBasis} variant="full" />
            </div>
          </div>
          {currentValue > 0 && (
            <div>
              <div style={{ fontSize: 10, color: THEME.muted }}>Current Value</div>
              <div style={{ fontWeight: 800, color: THEME.accent, fontSize: 13 }}>
                <Money value={currentValue} variant="full" />
              </div>
            </div>
          )}
          {currentValue > 0 && costBasis > 0 && (
            <div>
              <div style={{ fontSize: 10, color: THEME.muted }}>P&L</div>
              <div
                style={{ fontWeight: 800, fontSize: 13, color: pnl >= 0 ? THEME.sage : THEME.rust }}
              >
                {pnl >= 0 ? "+" : ""}
                {pnlPct.toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      )}
      <ModalActions
        onSave={() => {
          if (!form.name) return;
          const autoInvested =
            !form.invested && form.units && form.buyNav
              ? String(Number(form.units) * Number(form.buyNav))
              : form.invested;
          if (!autoInvested) return;
          onSave({ ...form, invested: autoInvested });
        }}
        onClose={onClose}
        saveLabel="Save Changes"
        disabled={saving}
        loading={saving}
      />
    </Modal>
  );
}



/* ── Investment-specific empty state ────────────────────────────────── */
function InvestmentEmptyState({
  icon: Icon,
  dotColor,
  title,
  description,
  pills,
  buttonLabel,
  onAdd,
}: any) {
  return (
    <div
      style={{
        padding: "54px 36px",
        textAlign: "center" as const,
        background: "var(--surface-0)",
        border: `1px solid ${THEME.line}`,
        borderRadius: "var(--radius-xl)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          color: dotColor,
        }}
      >
        <Icon size={44} strokeWidth={1.5} />
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: THEME.ink,
          marginBottom: 10,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: THEME.muted,
          maxWidth: 420,
          margin: "0 auto 18px",
          lineHeight: 1.6,
        }}
      >
        {description}
      </div>
      <div
        style={{
          fontSize: 11,
          color: THEME.muted,
          marginBottom: 28,
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap" as const,
        }}
      >
        {pills.map((t: string) => (
          <span
            key={t}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 12,
              background: "var(--surface-1)",
              border: `1.5px solid ${THEME.line}`,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: dotColor,
                display: "inline-block",
              }}
            />
            {t}
          </span>
        ))}
      </div>
      <Button variant="accent" icon={<Plus size={14} />} onClick={onAdd}>
        {buttonLabel}
      </Button>
    </div>
  );
}



/* ── RD Section ─────────────────────────────────────────────────────── */
function RDSection({ items, removeItem, updateItem, onAdd, showToast }: any) {
  const [editRD, setEditRD] = useState<any>(null);
  const [confirmDeleteRD, setConfirmDeleteRD] = useState<any>(null);
  const [filterTab, setFilterTab] = useState<"all" | "active" | "matured">("all");
  const { run: saveRDEdit, loading: savingRDEdit } = useAsyncAction(
    async (id: string, v: any) => {
      await updateItem("recurringDeposits", id, v);
    },
    {
      onSuccess: () => setEditRD(null),
      onError: (e: any) =>
        showToast?.(`Failed to save recurring deposit: ${e?.message || "Unknown error"}`, "error"),
    }
  );
  // Fixed chart-extension token (not the user-selectable accent) — a raw hex
  // here would go stale in dark mode and could collide with the active
  // accent preset.
  const RD_BLUE = THEME.cyan;

  const rdElapsedFn = (r: any) =>
    r.startDate
      ? Math.min(
          Number(r.tenureMonths) || 0,
          Math.max(0, monthsBetween(r.startDate, today()))
        )
      : Number(r.tenureMonths) || 0;
  const isRDMatured = (r: any) =>
    rdElapsedFn(r) >= (Number(r.tenureMonths) || 0) && (Number(r.tenureMonths) || 0) > 0;

  const maturedCount = items.filter(isRDMatured).length;
  const activeCount = items.length - maturedCount;
  const activeItems = items.filter((r: any) => !isRDMatured(r));

  // Accounting standard: Monthly SIP requirement only applies to active (non-matured) RDs
  const totalMonthly = activeItems.reduce(
    (s: number, r: any) => s + (Number(r.monthly) || 0),
    0
  );
  const totalDeposited = items.reduce(
    (s: number, r: any) => s + (Number(r.monthly) || 0) * rdElapsedFn(r),
    0
  );
  const totalMaturity = items.reduce(
    (s: number, r: any) =>
      s + rdMaturity(Number(r.monthly), Number(r.rate), Number(r.tenureMonths) || 0),
    0
  );

  const filteredItems = items.filter((r: any) => {
    if (filterTab === "active") return !isRDMatured(r);
    if (filterTab === "matured") return isRDMatured(r);
    return true;
  });

  return (
    <div className="animate-fade-in-up">
      {items.length === 0 ? (
        <InvestmentEmptyState
          icon={Repeat}
          gradient="linear-gradient(135deg,#0284c7 0%,#38bdf8 100%)"
          dotColor="#0ea5e9"
          title="No Recurring Deposits Added Yet"
          description="Track your monthly RD installments, interest rate, tenure, and projected maturity value."
          pills={["Monthly Installment", "Interest Rate", "Tenure", "Maturity Value"]}
          buttonLabel="Add Recurring Deposit"
          onAdd={onAdd}
        />
      ) : (
        <>
          {/* RD summary strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "Monthly SIP Total",
                value: fmtINRFull(totalMonthly),
                numericValue: totalMonthly,
                formatValue: fmtINRFull,
                color: RD_BLUE,
                Icon: Repeat,
              },
              {
                label: "Total Deposited",
                value: fmtINRFull(totalDeposited),
                numericValue: totalDeposited,
                formatValue: fmtINRFull,
                color: THEME.accent,
                Icon: IndianRupee,
              },
              {
                label: "Projected Maturity",
                value: fmtINRFull(totalMaturity),
                numericValue: totalMaturity,
                formatValue: fmtINRFull,
                color: THEME.sage,
                Icon: TrendingUp,
              },
              {
                label: maturedCount > 0 ? `${maturedCount} Matured` : "RDs Active",
                value: String(activeCount),
                numericValue: activeCount,
                formatValue: (n: number) => String(Math.round(n)),
                color: maturedCount > 0 ? THEME.rust : THEME.sage,
                Icon: BarChart3,
              },
            ].map(({ label, value, numericValue, formatValue, color, Icon }) => (
              <StatCard
                key={label}
                label={label}
                value={value}
                numericValue={numericValue}
                formatValue={formatValue}
                icon={<Icon />}
                color={color}
              />
            ))}
          </div>

          {/* Filter Pills */}
          {items.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`demat-portfolio-pill ${filterTab === "all" ? "active" : ""}`}
                style={{ cursor: "pointer", border: "none" }}
              >
                {`All (${items.length})`}
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("active")}
                className={`demat-portfolio-pill ${filterTab === "active" ? "active" : ""}`}
                style={{ cursor: "pointer", border: "none" }}
              >
                {`Active (${activeCount})`}
              </button>
              {maturedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterTab("matured")}
                  className={`demat-portfolio-pill ${filterTab === "matured" ? "active" : ""}`}
                  style={{ cursor: "pointer", border: "none" }}
                >
                  {`Matured (${maturedCount})`}
                </button>
              )}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {filteredItems.map((r: any) => {
              const tenureMonths = Number(r.tenureMonths) || 0;
              const elapsed = r.startDate ? Math.max(0, monthsBetween(r.startDate, today())) : 0;
              const elapsedCapped = Math.min(elapsed, tenureMonths);
              const isMatured = isRDMatured(r);
              const progressPct = isMatured
                ? 100
                : Math.min(
                    100,
                    tenureMonths > 0 ? (elapsedCapped / tenureMonths) * 100 : 0
                  );
              const deposited = (Number(r.monthly) || 0) * elapsedCapped;
              const currentVal = rdMaturity(Number(r.monthly), Number(r.rate), elapsedCapped);
              const fullMaturity = rdMaturity(Number(r.monthly), Number(r.rate), tenureMonths);
              const gain = currentVal - deposited;
              const lbl = {
                fontSize: 9,
                color: THEME.muted,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                marginBottom: 3,
              };

              return (
                <Card
                  key={r.id}
                  style={{
                    padding: 20,
                    borderTop: `3px solid ${isMatured ? THEME.muted : RD_BLUE}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                      <Badge variant={isMatured ? "muted" : "cyan"}>{r.bank}</Badge>
                      {isMatured && <Badge variant="muted">Matured</Badge>}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil size={12} />}
                        onClick={() => setEditRD(r)}
                        aria-label={`Edit ${r.bank} recurring deposit`}
                        title="Edit"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={12} />}
                        style={{ color: THEME.rust }}
                        onClick={() => setConfirmDeleteRD(r)}
                        aria-label={`Delete ${r.bank} recurring deposit`}
                        title="Delete"
                      />
                    </div>
                  </div>

                  {/* Logo + Bank name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <BankLogo name={r.bank} size={36} accentColor={isMatured ? THEME.muted : RD_BLUE} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>{r.bank}</div>
                  </div>

                  <div style={lbl}>{isMatured ? "Monthly Installment (Completed)" : "Monthly Installment"}</div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 24,
                      fontWeight: 600,
                      color: isMatured ? THEME.muted : RD_BLUE,
                      marginBottom: 4,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    <Money value={Number(r.monthly)} variant="full" />
                    <span style={{ fontSize: 14, color: THEME.muted }}>/mo</span>
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 14 }}>
                    {r.rate}% p.a. · {tenureMonths} months
                    {r.startDate &&
                      tenureMonths > 0 &&
                      (() => {
                        // addMonthsToDateStr clamps day-of-month overflow (e.g. 31 Aug + 1mo
                        // must land in Sep, not silently roll into Oct like raw setMonth would).
                        const maturityStr = addMonthsToDateStr(r.startDate, tenureMonths);
                        const d = new Date(maturityStr + "T00:00:00");
                        const lbl = d.toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        });
                        return (
                          <span
                            style={{
                              marginLeft: 8,
                              color: isMatured ? THEME.sage : THEME.ink,
                              fontWeight: 600,
                            }}
                          >
                            · {isMatured ? `Matured (${lbl})` : `Matures ${lbl}`}
                          </span>
                        );
                      })()}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      color: THEME.muted,
                      marginBottom: 5,
                    }}
                  >
                    <span>
                      {isMatured ? "ALL 100% DEPOSITED" : `${elapsedCapped} of ${tenureMonths} months`}
                    </span>
                    <span style={{ fontWeight: 700, color: isMatured ? THEME.sage : RD_BLUE }}>
                      {isMatured ? "100% COMPLETED" : `${progressPct.toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="progress-track" style={{ marginBottom: 14 }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${progressPct}%`,
                        background: isMatured ? THEME.sage : RD_BLUE,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      borderTop: `1px solid ${THEME.line}`,
                      paddingTop: 12,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={lbl}>Deposited</div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 13,
                          fontWeight: 800,
                          color: THEME.accent,
                        }}
                      >
                        <Money value={deposited} variant="full" />
                      </div>
                      <div style={{ fontSize: 10, color: THEME.sage }}>
                        +<Money value={gain} variant="full" /> interest
                      </div>
                    </div>
                    <div>
                      <div style={lbl}>{isMatured ? "Final Value" : "On Maturity"}</div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 13,
                          fontWeight: 800,
                          color: THEME.sage,
                        }}
                      >
                        <Money value={isMatured ? currentVal : fullMaturity} variant="full" />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
      {editRD && (
        <EditRDModal
          rd={editRD}
          onClose={() => setEditRD(null)}
          onSave={(updated: any) => saveRDEdit(editRD.id, updated)}
          saving={savingRDEdit}
        />
      )}
      {confirmDeleteRD && (
        <ConfirmDialog
          message={`Delete ${confirmDeleteRD.bank} recurring deposit? This cannot be undone.`}
          onConfirm={() => {
            removeItem("recurringDeposits", confirmDeleteRD.id);
            setConfirmDeleteRD(null);
          }}
          onCancel={() => setConfirmDeleteRD(null)}
        />
      )}
    </div>
  );
}





/* ── MF CSV Import Panel ────────────────────────────────────────────── */
function MFCsvPanel({ onImport, onClose }: any) {
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvError, setCsvError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [importDone, setImportDone] = useState(false);

  const parseCsvText = (text: string) => {
    setCsvError("");
    setCsvPreview([]);
    setImportDone(false);
    try {
      const lines = text
        .trim()
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#"));
      if (!lines.length) {
        setCsvError("No data rows found.");
        return;
      }
      const rows = lines.map((line, i) => {
        const parts = [];
        let current = "";
        let inQuotes = false;
        for (let charIndex = 0; charIndex < line.length; charIndex++) {
          const char = line[charIndex];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            parts.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        parts.push(current.trim());
        const cleanParts = parts.map((p) => p.replace(/^"|"$/g, "").trim());

        if (cleanParts.length < 3)
          throw new Error(`Row ${i + 1}: need at least Fund Name, Buy NAV, and Units.`);

        const [
          name,
          category,
          mfType,
          folioNumber,
          mfCode,
          buyDate,
          buyNav,
          units,
          currentNav,
          owner,
        ] = cleanParts;

        if (!name) throw new Error(`Row ${i + 1}: Fund Name is required`);

        const bNav = Number(buyNav);
        if (isNaN(bNav) || bNav <= 0)
          throw new Error(`Row ${i + 1}: Buy NAV must be a positive number (got "${buyNav}")`);

        const u = Number(units);
        if (isNaN(u) || u <= 0)
          throw new Error(`Row ${i + 1}: Units must be a positive number (got "${units}")`);

        const cNav = currentNav ? Number(currentNav) : bNav;
        if (isNaN(cNav) || cNav <= 0)
          throw new Error(
            `Row ${i + 1}: Current NAV must be a positive number (got "${currentNav}")`
          );

        let finalBuyDate = buyDate || "";
        if (finalBuyDate && !finalBuyDate.match(/^\d{4}-\d{2}-\d{2}$/))
          throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD (got "${buyDate}")`);
        if (!finalBuyDate) {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, "0");
          const dd = String(today.getDate()).padStart(2, "0");
          finalBuyDate = `${yyyy}-${mm}-${dd}`;
        }

        const invested = String(bNav * u);

        return {
          name,
          category: category || "Equity",
          mfType: mfType || "Direct Growth",
          folioNumber: folioNumber || "",
          mfCode: mfCode || "",
          buyDate: finalBuyDate,
          buyNav: String(bNav),
          units: String(u),
          currentNav: String(cNav),
          invested,
          owner: owner || "self",
          id: uid(),
        };
      });
      setCsvPreview(rows);
    } catch (e: any) {
      setCsvError(e.message);
    }
  };

  const handleFile = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const content =
      "# Mutual Fund Import Template\n" +
      "# Columns: Fund Name, Category, Type, Folio Number, Fund Code, Buy Date (YYYY-MM-DD), Buy NAV, Units, Current NAV, Owner\n" +
      "# Category: Equity, Debt, Hybrid, ELSS, Gold, etc. (defaults to Equity)\n" +
      "# Type: Direct Growth, Direct IDCW, Regular Growth, Regular IDCW (defaults to Direct Growth)\n" +
      "Aditya Birla Sun Life Frontline Equity Fund,Equity,Direct Growth,12345678/90,,2025-04-10,385.50,150,392.20,self\n" +
      "Parag Parikh Flexi Cap Fund,Equity,Direct Growth,98765432,,2025-05-15,82.40,500,85.10,spouse\n";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mutual_funds_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = () => {
    if (!csvPreview.length) return;
    onImport(csvPreview);
    setImportDone(true);
    setCsvPreview([]);
    setCsvText("");
    setCsvFileName("");
  };

  const areaStyle = {
    border: `2px dashed ${THEME.line}`,
    borderRadius: 12,
    padding: "24px 16px",
    textAlign: "center" as const,
    cursor: "pointer",
    background: "var(--surface-0)",
    marginBottom: 16,
    transition: "border-color 0.2s",
  };

  const textareaStyle = {
    width: "100%",
    height: 100,
    background: "var(--t-paper)",
    border: `1.5px solid ${THEME.line}`,
    borderRadius: 10,
    padding: "10px 14px",
    color: THEME.ink,
    fontSize: 12,
    outline: "none",
    fontFamily: "monospace",
    resize: "vertical" as const,
    boxSizing: "border-box" as const,
  };

  const btnStyle = {
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "none",
  };

  return (
    <Card
      style={{
        padding: 20,
        border: `1px solid ${THEME.line}`,
        background: "var(--surface-0)",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: THEME.muted,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Upload size={13} /> Import Mutual Funds via CSV
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{ ...btnStyle, background: `color-mix(in srgb, ${THEME.accent} 7%, transparent)`, color: THEME.accent }}
            onClick={downloadTemplate}
          >
            <Download size={12} /> Download Template
          </button>
          <button
            style={{
              ...btnStyle,
              background: "transparent",
              color: THEME.muted,
              border: `1px solid ${THEME.line}`,
            }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      <div
        style={areaStyle}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => document.getElementById("mf-file-input")?.click()}
        role="button"
        tabIndex={0}
        aria-label="Drop CSV file here or click to browse"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.getElementById("mf-file-input")?.click();
          }
        }}
      >
        <Upload size={22} color={THEME.accent} style={{ marginBottom: 8 }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
          {csvFileName || "Drop CSV file here or click to browse"}
        </div>
        <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
          Supports .csv and .txt files
        </div>
        <input
          type="file"
          id="mf-file-input"
          accept=".csv,.txt"
          style={{ display: "none" }}
          onChange={handleFile}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: THEME.muted,
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          Or Paste CSV Raw Text
        </div>
        <textarea
          style={textareaStyle}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder="Fund Name,Category,Type,Folio Number,Fund Code,Buy Date,Buy NAV,Units,Current NAV,Owner"
        />
        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
          <button
            style={{
              ...btnStyle,
              background: "var(--t-paper)",
              color: THEME.ink,
              border: `1px solid ${THEME.line}`,
            }}
            onClick={() => parseCsvText(csvText)}
          >
            Parse Text
          </button>
        </div>
      </div>

      {csvError && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: `color-mix(in srgb, ${THEME.rust} 7%, transparent)`,
            color: THEME.rust,
            fontSize: 12,
            marginBottom: 16,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{csvError}</span>
        </div>
      )}

      {csvPreview.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.sage }}>
              {csvPreview.length} rows parsed and ready for import
            </div>
            <button
              style={{ ...btnStyle, background: THEME.sage, color: THEME.darkInk }}
              onClick={doImport}
            >
              Import {csvPreview.length} Lot{csvPreview.length !== 1 ? "s" : ""}
            </button>
          </div>

          <div
            style={{
              maxHeight: 200,
              overflow: "auto",
              border: `1px solid ${THEME.line}`,
              borderRadius: 8,
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: 820,
                borderCollapse: "collapse",
                fontSize: 11,
              }}
            >
              <thead>
                <tr style={{ background: "var(--surface-0)", textAlign: "left" }}>
                  <th
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${THEME.line}`,
                      position: "sticky",
                      top: 0,
                      background: "var(--surface-0)",
                    }}
                  >
                    Fund Name
                  </th>
                  <th
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${THEME.line}`,
                      position: "sticky",
                      top: 0,
                      background: "var(--surface-0)",
                    }}
                  >
                    Category
                  </th>
                  <th
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${THEME.line}`,
                      position: "sticky",
                      top: 0,
                      background: "var(--surface-0)",
                    }}
                  >
                    Type
                  </th>
                  <th
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${THEME.line}`,
                      position: "sticky",
                      top: 0,
                      background: "var(--surface-0)",
                    }}
                  >
                    Folio
                  </th>
                  <th
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${THEME.line}`,
                      position: "sticky",
                      top: 0,
                      background: "var(--surface-0)",
                    }}
                  >
                    Buy Date
                  </th>
                  <th
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${THEME.line}`,
                      textAlign: "right",
                      position: "sticky",
                      top: 0,
                      background: "var(--surface-0)",
                    }}
                  >
                    Buy NAV
                  </th>
                  <th
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${THEME.line}`,
                      textAlign: "right",
                      position: "sticky",
                      top: 0,
                      background: "var(--surface-0)",
                    }}
                  >
                    Units
                  </th>
                  <th
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${THEME.line}`,
                      textAlign: "right",
                      position: "sticky",
                      top: 0,
                      background: "var(--surface-0)",
                    }}
                  >
                    Current NAV
                  </th>
                  <th
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${THEME.line}`,
                      textAlign: "right",
                      position: "sticky",
                      top: 0,
                      background: "var(--surface-0)",
                    }}
                  >
                    Invested
                  </th>
                  <th
                    style={{
                      padding: "6px 8px",
                      borderBottom: `1px solid ${THEME.line}`,
                      position: "sticky",
                      top: 0,
                      background: "var(--surface-0)",
                    }}
                  >
                    Owner
                  </th>
                </tr>
              </thead>
              <tbody>
                {csvPreview.map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: "6px 8px", color: THEME.muted }}>{r.category}</td>
                    <td style={{ padding: "6px 8px", color: THEME.muted }}>{r.mfType}</td>
                    <td style={{ padding: "6px 8px", color: THEME.muted }}>
                      {r.folioNumber || "—"}
                    </td>
                    <td style={{ padding: "6px 8px", color: THEME.muted }}>{r.buyDate}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{r.buyNav}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{r.units}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{r.currentNav}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>
                      <Money value={Number(r.invested)} variant="full" />
                    </td>
                    <td style={{ padding: "6px 8px", color: THEME.muted }}>{r.owner || "self"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {importDone && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: `color-mix(in srgb, ${THEME.sage} 7%, transparent)`,
            color: THEME.sage,
            fontSize: 12,
            fontWeight: 600,
            textAlign: "center" as const,
          }}
        >
          Import completed successfully!
        </div>
      )}
    </Card>
  );
}







/* ── Bank / Institution Logo & MF Logo ────────────────────────────────── */
export { BankLogo, MFLogo };
export const getBankDomain = resolveBankDomain;
export const getMFDomain = (name: string) => {
  const brand = resolveBrand(name);
  return brand ? brand.domain : "";
};

const MF_CHART_PERIOD_LABELS: Record<string, string> = {
  "1m": "1M",
  "3m": "3M",
  "6m": "6M",
  "1y": "1Y",
  "3y": "3Y",
  "5y": "5Y",
  max: "All",
};
const MF_CHART_PERIODS = Object.keys(MF_CHART_PERIOD_LABELS);

// Value/% change across the currently selected chart period (first vs last NAV point)
function calcMfPeriodChange(points: Array<{ p: number }> | null | undefined) {
  if (!points || points.length < 2) return null;
  const first = points[0]?.p;
  const last = points[points.length - 1]?.p;
  if (first == null || last == null || !isFinite(first) || !isFinite(last) || first === 0) {
    return null;
  }
  const amount = last - first;
  const pct = (amount / first) * 100;
  return { amount, pct };
}

/* ── MF Nav Trend Drawer Component ──────────────────────────────────── */
const MFNavTrendDrawer: React.FC<{
  groupItem: any;
  mfMeta: Record<string, any>;
  mfMarketData?: Record<string, any>;
  mfChartData: Record<string, any[]>;
  mfChartLoading: Record<string, boolean>;
  mfChartError: Record<string, string | null>;
  mfChartPeriod: Record<string, string>;
  setMfChartPeriod: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  fetchMFData: (idOrCode: string, mfCode: string, period?: string, forceRetry?: boolean) => Promise<void>;
  privacyMode: boolean;
}> = ({
  groupItem,
  mfMeta,
  mfMarketData,
  mfChartData,
  mfChartLoading,
  mfChartError,
  mfChartPeriod,
  setMfChartPeriod,
  fetchMFData,
  privacyMode,
}) => {
  const cId = groupItem?.id;
  const mfCode = (groupItem?.mfCode || "").trim();
  const activePeriod = mfChartPeriod[mfCode] || mfChartPeriod[cId] || "3m";

  const primaryKey = `${mfCode}__${activePeriod}`;
  const aliasKey = `${cId}__${activePeriod}`;

  const chart = mfChartData[primaryKey] || mfChartData[aliasKey];
  const isLoading = Boolean(mfChartLoading[primaryKey] || mfChartLoading[aliasKey]);
  const error = mfChartError[primaryKey] || mfChartError[aliasKey];
  const meta = mfMeta[mfCode] || mfMeta[cId] || mfMarketData?.[mfCode];

  useEffect(() => {
    if (mfCode && !chart && !isLoading && !error) {
      fetchMFData(cId, mfCode, activePeriod);
    }
  }, [mfCode, cId, activePeriod, chart, isLoading, error, fetchMFData]);

  const periodChange = calcMfPeriodChange(chart);
  const navUp = periodChange
    ? periodChange.amount >= 0
    : meta?.navChange != null
      ? meta.navChange >= 0
      : true;

  const handlePeriodChange = (p: string) => {
    setMfChartPeriod((prev) => ({
      ...prev,
      [mfCode]: p,
      [cId]: p,
    }));
    const newKey = `${mfCode}__${p}`;
    if (!mfChartData[newKey]?.length) {
      fetchMFData(cId, mfCode, p);
    }
  };

  const handleRetry = () => {
    if (mfCode) {
      fetchMFData(cId, mfCode, activePeriod, true);
    }
  };

  return (
    <div style={{ flex: "1 1 300px", minWidth: 280 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: THEME.muted,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {MF_CHART_PERIOD_LABELS[activePeriod] || activePeriod.toUpperCase()} NAV Trend
          </div>
          {periodChange && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: periodChange.amount >= 0 ? THEME.sage : THEME.rust,
              }}
            >
              {periodChange.amount >= 0 ? "+" : "−"}₹
              {Math.abs(periodChange.amount).toFixed(4)} (
              {periodChange.amount >= 0 ? "+" : "−"}
              {Math.abs(periodChange.pct).toFixed(2)}%)
            </div>
          )}
        </div>

        {/* Segmented Period Selector */}
        <div
          style={{
            display: "flex",
            background: "var(--t-line)",
            padding: 2,
            borderRadius: 8,
            border: `1px solid ${THEME.line}`,
          }}
        >
          {MF_CHART_PERIODS.map((p) => (
            <button
              key={p}
              onClick={(e) => {
                e.stopPropagation();
                handlePeriodChange(p);
              }}
              style={{
                padding: "4px 8px",
                fontSize: 9,
                fontWeight: activePeriod === p ? 850 : 600,
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                background: activePeriod === p ? "var(--t-card-bg)" : "transparent",
                color: activePeriod === p ? THEME.accent : THEME.muted,
                boxShadow: activePeriod === p ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {MF_CHART_PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          background: "var(--surface-0)",
          border: `1.5px solid ${THEME.line}`,
          borderRadius: 12,
          padding: "12px 14px",
          minHeight: 174,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {isLoading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "36px 0",
              gap: 8,
            }}
          >
            <RefreshCw size={18} className="animate-spin" style={{ color: THEME.accent }} />
            <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
              Loading NAV trend…
            </span>
          </div>
        ) : error ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px 16px",
              textAlign: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={20} style={{ color: THEME.rust }} />
            <div style={{ fontSize: 11, color: THEME.muted, maxWidth: 260 }}>
              {error}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRetry();
              }}
              style={{
                marginTop: 4,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 6,
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-1)",
                color: THEME.accent,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <RefreshCw size={11} /> Retry
            </button>
          </div>
        ) : chart && chart.length > 0 ? (
          <div style={{ width: "100%", height: 150, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart
                data={chart}
                margin={{
                  top: 4,
                  right: 4,
                  bottom: 0,
                  left: 0,
                }}
              >
                <defs>
                  <linearGradient id={`mf-g-${cId || mfCode}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={navUp ? THEME.sage : THEME.rust}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor={navUp ? THEME.sage : THEME.rust}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="t"
                  tick={{
                    fontSize: 9,
                    fill: "var(--t-muted)",
                  }}
                  interval="preserveStartEnd"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  cursor={{ stroke: THEME.line }}
                  contentStyle={{
                    fontSize: 12,
                    background: "var(--surface-0)",
                    border: `1px solid ${THEME.line}`,
                    borderRadius: 6,
                    color: THEME.ink,
                  }}
                  labelStyle={{ color: THEME.ink }}
                  itemStyle={{ color: THEME.ink }}
                  formatter={(v: any) => [
                    privacyMode ? "••••" : `₹${Number(v).toFixed(4)}`,
                    "NAV",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="p"
                  stroke={navUp ? THEME.sage : THEME.rust}
                  strokeWidth={1.5}
                  fill={`url(#mf-g-${cId || mfCode})`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
              fontSize: 11,
              color: THEME.muted,
            }}
          >
            No historical NAV data available for this scheme
          </div>
        )}
      </div>

      {meta && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px 16px",
            marginTop: 12,
            fontSize: 12,
            borderTop: `1px solid ${THEME.line}`,
            paddingTop: 10,
          }}
        >
          {meta.prevNav != null && (
            <span>
              <span style={{ color: THEME.muted }}>Prev NAV: </span>
              <b>
                <Prv>₹{Number(meta.prevNav).toFixed(4)}</Prv>
              </b>
            </span>
          )}
          {meta.navChange != null && (
            <span>
              <span style={{ color: THEME.muted }}>Change: </span>
              <b
                style={{
                  color: meta.navChange >= 0 ? THEME.sage : THEME.rust,
                }}
              >
                {meta.navChange >= 0 ? "+" : ""}
                {Number(meta.navChange).toFixed(4)}
                {meta.navChangePct != null &&
                  ` (${meta.navChange >= 0 ? "+" : ""}${Number(meta.navChangePct).toFixed(2)}%)`}
              </b>
            </span>
          )}
          {meta.high52 != null && meta.low52 != null && (
            <span>
              <span style={{ color: THEME.muted }}>52W H/L: </span>
              <b style={{ color: THEME.sage }}>
                <Prv>₹{Number(meta.high52).toFixed(4)}</Prv>
              </b>
              <span style={{ color: THEME.muted }}> / </span>
              <b style={{ color: THEME.rust }}>
                <Prv>₹{Number(meta.low52).toFixed(4)}</Prv>
              </b>
            </span>
          )}
          {meta.navDate && (
            <span style={{ color: THEME.muted, fontSize: 11, marginLeft: "auto" }}>
              NAV Date: <b>{meta.navDate}</b>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/* ── MF Insights ────────────────────────────────────────────────────── */
const MFInsightsEmptyNote = ({ text }: { text: string }) => (
  <div
    style={{
      padding: "40px 0",
      textAlign: "center",
      color: THEME.muted,
      fontSize: 13,
      background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
      borderRadius: 12,
    }}
  >
    {text}
  </div>
);

const MFInsightsBarList = ({ rows }: { rows: Array<{ name: string; value: number; pct: number }> }) => (
  <div style={{ display: "grid", gap: 14 }}>
    {rows.map((r, i) => {
      const color = PIE_COLORS[i % PIE_COLORS.length];
      return (
        <div key={r.name}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 12,
              marginBottom: 6,
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 600 }}>{r.name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color,
                  background: `color-mix(in srgb, ${color} 9%, transparent)`,
                  padding: "1px 6px",
                  borderRadius: 4,
                }}
              >
                {r.pct.toFixed(1)}%
              </span>
              <span style={{ fontWeight: 700, color: THEME.muted }}>
                <Money value={r.value} variant="full" />
              </span>
            </div>
          </div>
          <div style={{ height: 6, background: THEME.line, borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, r.pct)}%`,
                background: color,
                borderRadius: 3,
              }}
            />
          </div>
        </div>
      );
    })}
  </div>
);

function MFInsights({ items, getLiveNav }: any) {
  const data = useMemo(() => {
    const funds = (items || [])
      .map((m: any) => {
        const units = Number(m.units) || 0;
        const nav = getLiveNav(m);
        const value = units * nav || Number(m.invested || m.investedValue) || 0;
        const name = (m.name || m.scheme || "Unnamed Fund").trim();
        const category = (m.category || m.type || "Equity").trim();
        const mfType = (m.mfType || "Direct Growth").trim();
        return {
          name,
          category,
          isDirect: /direct/i.test(mfType) || /direct/i.test(name),
          amc: inferMFAmc(name),
          capType: inferMFCapType(name, category),
          value,
        };
      })
      .filter((f: any) => f.value > 0);

    const totalValue = funds.reduce((s: number, f: any) => s + f.value, 0);

    const aggregate = (list: any[], keyFn: (f: any) => string | null, base: number) => {
      const map: Record<string, number> = {};
      list.forEach((f) => {
        const k = keyFn(f);
        if (!k) return;
        map[k] = (map[k] || 0) + f.value;
      });
      return Object.entries(map)
        .map(([name, value]) => ({ name, value, pct: base > 0 ? (value / base) * 100 : 0 }))
        .sort((a, b) => b.value - a.value);
    };

    const schemeMap: Record<string, number> = {};
    funds.forEach((f: any) => {
      schemeMap[f.name] = (schemeMap[f.name] || 0) + f.value;
    });
    const schemeWeights = Object.entries(schemeMap)
      .map(([name, value]) => ({
        name,
        value,
        weight: totalValue > 0 ? value / totalValue : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const categoryBreakdown = aggregate(funds, (f) => f.category, totalValue);
    const amcBreakdown = aggregate(funds, (f) => f.amc, totalValue);
    const equityFunds = funds.filter((f: any) => f.capType);
    const equityValue = equityFunds.reduce((s: number, f: any) => s + f.value, 0);
    const capBreakdown = aggregate(equityFunds, (f) => f.capType, equityValue);

    const distinctAmcs = new Set(funds.map((f: any) => f.amc)).size;
    const distinctCategories = new Set(funds.map((f: any) => f.category)).size;
    const diversificationScore =
      funds.length === 0
        ? 0
        : (Math.min(distinctAmcs, 5) / 5) * 12.5 + (Math.min(distinctCategories, 4) / 4) * 12.5;

    const hhi = schemeWeights.reduce((s, w) => s + w.weight * w.weight, 0);
    const concentrationScore = 25 * Math.max(0, 1 - Math.min(1, hhi / 0.35));
    const topWeight = schemeWeights[0]?.weight || 0;

    const directValue = funds.filter((f: any) => f.isDirect).reduce((s: number, f: any) => s + f.value, 0);
    const directWeight = totalValue > 0 ? directValue / totalValue : 0;
    const costScore = 25 * directWeight;

    const distinctCapTypes = new Set(equityFunds.map((f: any) => f.capType)).size;
    const overlapScore = equityFunds.length > 0 ? 25 * (distinctCapTypes / equityFunds.length) : 20;

    const healthScore = Math.round(
      Math.max(0, Math.min(100, diversificationScore + concentrationScore + costScore + overlapScore))
    );

    return {
      totalValue,
      schemeWeights,
      categoryBreakdown,
      amcBreakdown,
      capBreakdown,
      distinctAmcs,
      distinctCategories,
      diversificationScore,
      concentrationScore,
      topWeight,
      costScore,
      directWeight,
      overlapScore,
      equityFundsCount: equityFunds.length,
      distinctCapTypes,
      healthScore,
    };
  }, [items, getLiveNav]);

  if (!items?.length || data.totalValue === 0) {
    return (
      <Card style={{ padding: 24, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 220 }}>
        <div style={{ textAlign: "center", color: THEME.muted }}>
          <Activity size={32} style={{ marginBottom: 12, opacity: 0.5, margin: "0 auto", display: "block" }} />
          <div style={{ fontWeight: 600, fontSize: 14, color: THEME.ink }}>No Mutual Fund holdings value detected.</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Add transactions or update NAV prices to enable smart insights.</div>
        </div>
      </Card>
    );
  }

  const {
    totalValue,
    schemeWeights,
    categoryBreakdown,
    amcBreakdown,
    capBreakdown,
    distinctAmcs,
    distinctCategories,
    diversificationScore,
    concentrationScore,
    topWeight,
    costScore,
    directWeight,
    overlapScore,
    equityFundsCount,
    distinctCapTypes,
    healthScore,
  } = data;

  const band =
    healthScore >= 80
      ? { label: "Excellent", color: THEME.sage }
      : healthScore >= 60
        ? { label: "Good", color: THEME.accent }
        : healthScore >= 40
          ? { label: "Fair", color: THEME.gold }
          : { label: "Needs Attention", color: THEME.rust };

  const pillars = [
    {
      label: "Diversification",
      score: diversificationScore,
      note: `${distinctAmcs} fund house${distinctAmcs === 1 ? "" : "s"}, ${distinctCategories} categor${distinctCategories === 1 ? "y" : "ies"}. ${
        diversificationScore >= 20
          ? "Well spread out."
          : "Add more fund houses or categories to reduce concentration."
      }`,
    },
    {
      label: "Concentration Risk",
      score: concentrationScore,
      note: `Largest fund is ${(topWeight * 100).toFixed(1)}% of your MF corpus. ${
        topWeight <= 0.25 ? "Healthy spread." : "Consider trimming your biggest position."
      }`,
    },
    {
      label: "Cost Efficiency",
      score: costScore,
      note: `${(directWeight * 100).toFixed(0)}% is in Direct plans. ${
        directWeight >= 0.8
          ? "Great — you're minimizing expense ratio drag."
          : "Switching Regular funds to Direct could cut costs — see Expense Analyzer below."
      }`,
    },
    {
      label: "Style Overlap",
      score: overlapScore,
      note:
        equityFundsCount > 0
          ? `${distinctCapTypes} market-cap style${distinctCapTypes === 1 ? "" : "s"} across ${equityFundsCount} equity fund${equityFundsCount === 1 ? "" : "s"}. ${
              overlapScore >= 18 ? "Low overlap." : "You may hold multiple funds with a similar mandate."
            }`
          : "No equity-style funds detected.",
    },
  ];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div className="section-label" style={{ marginBottom: 4 }}>
              Portfolio Health Score
            </div>
            <div style={{ fontSize: 12, color: THEME.muted }}>
              Based on diversification, concentration, cost efficiency &amp; style overlap
            </div>
          </div>
          <Badge variant="muted" title="Category/AMC/market-cap are inferred from scheme names — mfapi.in doesn't expose true look-through holdings, so treat these as approximate">
            Estimated
          </Badge>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: `conic-gradient(${band.color} ${healthScore * 3.6}deg, ${THEME.line} 0deg)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 78,
                height: 78,
                borderRadius: "50%",
                background: "var(--surface-0)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 26,
                  fontWeight: 600,
                  color: THEME.ink,
                  lineHeight: 1,
                }}
              >
                {healthScore}
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
                / 100
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: band.color, marginBottom: 4 }}>
              {band.label}
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, maxWidth: 340 }}>
              Across {schemeWeights.length} fund{schemeWeights.length === 1 ? "" : "s"} worth{" "}
              <Money value={totalValue} variant="full" />.
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {pillars.map((p) => (
            <div key={p.label}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                <span style={{ fontWeight: 700 }}>{p.label}</span>
                <span style={{ fontWeight: 800, color: THEME.ink }}>{Math.round(p.score)}/25</span>
              </div>
              <div
                style={{
                  height: 6,
                  background: THEME.line,
                  borderRadius: 3,
                  overflow: "hidden",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(0, Math.min(100, (p.score / 25) * 100))}%`,
                    background: band.color,
                    borderRadius: 3,
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.5 }}>{p.note}</div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        <Card style={{ padding: 24 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: THEME.ink,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <List size={16} /> Category Mix
          </div>
          {categoryBreakdown.length === 0 ? (
            <MFInsightsEmptyNote text="No category data available" />
          ) : (
            <MFInsightsBarList rows={categoryBreakdown} />
          )}
        </Card>
        <Card style={{ padding: 24 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: THEME.ink,
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Activity size={16} /> Market Cap Allocation
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 16 }}>
            Inferred from scheme names · Debt/Hybrid/Liquid funds excluded
          </div>
          {capBreakdown.length === 0 ? (
            <MFInsightsEmptyNote text="No equity-style funds detected" />
          ) : (
            <MFInsightsBarList rows={capBreakdown} />
          )}
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        <Card style={{ padding: 24 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: THEME.ink,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Briefcase size={16} /> Fund House (AMC) Spread
          </div>
          <MFInsightsBarList rows={amcBreakdown.slice(0, 8)} />
        </Card>
        <Card style={{ padding: 24 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: THEME.ink,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Target size={16} /> Top Holdings
          </div>
          <MFInsightsBarList
            rows={schemeWeights.slice(0, 8).map((w) => ({ name: w.name, value: w.value, pct: w.weight * 100 }))}
          />
        </Card>
      </div>
    </div>
  );
}

/* ── MF Section ─────────────────────────────────────────────────────── */
function MFSection({
  items,
  mfSells,
  addItem,
  removeItem,
  updateItem,
  onAdd,
  activeProfile = "all",
  mfMarketData,
  fetchMfNavs,
  fetchingMfNavs,
  mfMarketDataTs,
  showToast,
}: any) {
  const { privacyMode } = usePrivacy();
  const getLiveNav = (m: any) => liveMfNav(m, mfMarketData);
  const [editMF, setEditMF] = useState<any>(null);
  const [confirmDeleteLot, setConfirmDeleteLot] = useState<any>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [navError, setNavError] = useState<Record<string, string>>({});
  const [mfMeta, setMfMeta] = useState<Record<string, any>>({});
  const [mfChartData, setMfChartData] = useState<Record<string, any[]>>({});
  const [mfChartLoading, setMfChartLoading] = useState<Record<string, boolean>>({});
  const [mfChartError, setMfChartError] = useState<Record<string, string | null>>({});
  const [mfChartPeriod, setMfChartPeriod] = useState<Record<string, string>>({});
  const [expandedMF, setExpandedMF] = useState<Set<string>>(new Set());
  const [sellMF, setSellMF] = useState<any>(null);
  const [fifoSellMFGroup, setFifoSellMFGroup] = useState<any>(null);
  const [addLotGroup, setAddLotGroup] = useState<any>(null);
  const [mfSortBy, setMfSortBy] = useState<"name" | "value" | "pnl" | "units">(() => {
    return (localStorage.getItem("finance_mf_sort") as any) || "value";
  });
  useEffect(() => {
    localStorage.setItem("finance_mf_sort", mfSortBy);
  }, [mfSortBy]);
  const [mfGroupBy, setMfGroupBy] = useState<"none" | "category" | "type">(() => {
    return (localStorage.getItem("finance_mf_group") as any) || "none";
  });
  useEffect(() => {
    localStorage.setItem("finance_mf_group", mfGroupBy);
  }, [mfGroupBy]);
  const [mfView, setMfView] = useState<"holdings" | "insights">(() => {
    return (localStorage.getItem("finance_mf_view") as any) || "holdings";
  });
  useEffect(() => {
    localStorage.setItem("finance_mf_view", mfView);
  }, [mfView]);
  const [lotExpandedGroups, setLotExpandedGroups] = useState<Set<string>>(new Set());
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showCasImport, setShowCasImport] = useState(false);
  const [showExpenseAnalyzer, setShowExpenseAnalyzer] = useState(false);

  const activeItems = useMemo(
    () => (items || []).filter((m: any) => (Number(m.units) || 0) > 0.0001),
    [items]
  );

  const handleExport = () => {
    if (!activeItems || activeItems.length === 0) return;
    const header =
      "Fund Name,Category,Type,Folio Number,Fund Code,Buy Date,Buy NAV,Units,Current NAV,Invested,Owner\n";
    const rows = activeItems
      .map((m: any) => {
        const name = `"${(m.name || m.scheme || "").replace(/"/g, '""')}"`;
        const cat = `"${(m.category || m.type || "Equity").replace(/"/g, '""')}"`;
        const type = `"${(m.mfType || "Direct Growth").replace(/"/g, '""')}"`;
        const folio = `"${(m.folioNumber || "").replace(/"/g, '""')}"`;
        const code = `"${(m.mfCode || "").replace(/"/g, '""')}"`;
        const bDate = `"${m.buyDate || ""}"`;
        const bNav = `"${m.buyNav || ""}"`;
        const units = `"${m.units || ""}"`;
        const cNav = `"${m.currentNav || ""}"`;
        const inv = `"${m.invested || ""}"`;
        const owner = `"${m.owner || "self"}"`;
        return [name, cat, type, folio, code, bDate, bNav, units, cNav, inv, owner].join(",");
      })
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mutual_funds_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (
    rows: any[],
    onProgress?: (done: number, total: number) => void
  ) => {
    for (let i = 0; i < rows.length; i++) {
      const { _merge, _delete, id, ...patch } = rows[i];
      // MFCasPanel flags rows it fuzzy-matched to an existing holding with `_merge` so they
      // update that holding in place instead of being inserted as a second, duplicate row
      // sharing the same id (addItem's local-state upsert only appends, it never replaces).
      if (_merge && id) {
        if (_delete || (patch.units != null && Number(patch.units) <= 0.0001)) {
          await removeItem("mutualFunds", id);
        } else {
          await updateItem("mutualFunds", id, patch);
        }
      } else if (Number(rows[i].units || 0) > 0.0001) {
        await addItem("mutualFunds", rows[i]);
      }
      onProgress?.(i + 1, rows.length);
    }
  };

  const { run: saveMFEdit, loading: savingMFEdit } = useAsyncAction(
    async (id: string, updated: any) => {
      await updateItem("mutualFunds", id, updated);
    },
    {
      onSuccess: () => setEditMF(null),
      onError: (e: any) =>
        showToast?.(`Failed to save mutual fund: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveMFSell, loading: savingMFSell } = useAsyncAction(
    async (mf: any, sellRecord: any, remainingUnits: number) => {
      const sellSaved = await addItem("mfSells", sellRecord);
      if (sellSaved && sellSaved.success === false) {
        // Sale record failed to persist to Supabase — stop here so the
        // holding isn't shrunk/deleted for a sale that doesn't exist in the DB.
        throw new Error("Sale could not be saved — holding was not changed.");
      }
      if (remainingUnits <= 0.0001) {
        await removeItem("mutualFunds", mf.id);
      } else {
        const remUnits = Number(remainingUnits.toFixed(4));
        const newInvested = Number(mf.buyNav || 0) * remUnits;
        await updateItem("mutualFunds", mf.id, {
          units: String(remUnits),
          invested: String(
            newInvested || (Number(mf.invested || 0) * remUnits) / Number(mf.units)
          ),
        });
      }
    },
    {
      onSuccess: () => setSellMF(null),
      onError: (e: any) => showToast?.(`Failed to save sale: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveFifoSell, loading: savingFifoSell } = useAsyncAction(
    async (group: any, allocs: any[], sellNav: number, sellDate: string) => {
      for (let i = 0; i < allocs.length; i++) {
        const alloc = allocs[i];
        const sellSaved = await addItem("mfSells", {
          id: `mfs-${Date.now()}-${i}`,
          owner: alloc.lot.owner || "self",
          scheme: group.fundName || group.schemeName,
          // Preserved from the live lot so CapitalGainsTab.isEquityMF() can
          // use the user's actual Equity/Debt classification instead of
          // falling back to guessing from the fund name text — see the
          // matching comment in SellMFModal's single-lot sell path above.
          category: alloc.lot.category || "",
          units: alloc.consume,
          buyNav: alloc.buyNav,
          buyDate: alloc.lot.buyDate || "",
          sellNav,
          sellDate,
          profit: Number(alloc.pnl.toFixed(2)),
        });
        if (sellSaved && sellSaved.success === false) {
          // Stop processing further lots so a failure partway through the FIFO
          // sweep doesn't shrink/delete holdings for lots whose sale never made
          // it to the DB. Lots before this one are already saved and applied.
          throw new Error(
            i === 0
              ? "Sale could not be saved — no lots were changed."
              : `Sale failed after ${i} of ${allocs.length} lot(s) — remaining lots were not changed.`
          );
        }
        const remaining = Number(alloc.lot.units) - alloc.consume;
        if (alloc.fullyConsumed || remaining <= 0.0001) {
          await removeItem("mutualFunds", alloc.lot.id);
        } else {
          const remUnits = Number(remaining.toFixed(4));
          const newInvested = Number(alloc.lot.buyNav || 0) * remUnits;
          await updateItem("mutualFunds", alloc.lot.id, {
            units: String(remUnits),
            invested: String(
              newInvested || (Number(alloc.lot.invested || 0) * remUnits) / Number(alloc.lot.units)
            ),
          });
        }
      }
    },
    {
      onSuccess: () => setFifoSellMFGroup(null),
      onError: (e: any) => showToast?.(`Failed to save sale: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveAddLot, loading: savingAddLot } = useAsyncAction(
    async (data: any) => {
      await addItem("mutualFunds", data);
    },
    {
      onSuccess: () => setAddLotGroup(null),
      onError: (e: any) => showToast?.(`Failed to add lot: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const toggleLotExpand = (gKey: string) => {
    setLotExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(gKey)) next.delete(gKey);
      else next.add(gKey);
      return next;
    });
  };

  const toggleExpandMF = (id: string, mfCode: string) => {
    setExpandedMF((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (mfCode && !mfMeta[mfCode] && !mfMeta[id]) {
          fetchMFData(id, mfCode, mfChartPeriod[mfCode] || mfChartPeriod[id] || "3m");
        }
      }
      return next;
    });
  };

  // Bulk-fetch prevNav/navChange for every fund on load (mirrors Demat's bulk marketData
  // fetch) so Day's P&L is available on the collapsed table without requiring each row
  // to be expanded or "Refresh All" clicked first. Deduped by mfCode since multiple lots
  // of the same fund share one NAV.
  const mfMetaFetchInFlight = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    const byCode: Record<string, any[]> = {};
    items.forEach((m: any) => {
      const code = (m?.mfCode || "").trim();
      if (!code || !m?.id || mfMeta[code] || mfMeta[m.id]) return;
      (byCode[code] = byCode[code] || []).push(m);
    });
    Object.entries(byCode).forEach(([code, group]) => {
      if (mfMetaFetchInFlight.current.has(code)) return;
      mfMetaFetchInFlight.current.add(code);
      fetch(`/api/mf-nav?code=${encodeURIComponent(code)}&range=1m`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          const metaEntry = {
            prevNav: data.prevNav,
            navChange: data.navChange,
            navChangePct: data.navChangePct,
            high52: data.high52,
            low52: data.low52,
            navDate: data.date,
            schemeName: data.schemeName,
          };
          setMfMeta((prev) => {
            const next = { ...prev, [code]: metaEntry };
            group.forEach((m: any) => {
              next[m.id] = metaEntry;
            });
            return next;
          });
        })
        .catch(() => {})
        .finally(() => mfMetaFetchInFlight.current.delete(code));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const mfFetchInFlight = React.useRef<Set<string>>(new Set());
  const fetchMFData = async (
    idOrCode: string,
    mfCode: string,
    period: string = "3m",
    forceRetry: boolean = false
  ) => {
    const cleanCode = (mfCode || "").trim();
    if (!cleanCode) return;
    const periodKey = period || "3m";
    const primaryKey = `${cleanCode}__${periodKey}`;
    const aliasKey = idOrCode ? `${idOrCode}__${periodKey}` : primaryKey;

    if (!forceRetry && (mfChartData[primaryKey]?.length || mfChartData[aliasKey]?.length)) {
      return;
    }
    if (mfFetchInFlight.current.has(primaryKey)) return;
    mfFetchInFlight.current.add(primaryKey);

    setMfChartLoading((prev) => ({ ...prev, [primaryKey]: true, [aliasKey]: true }));
    setMfChartError((prev) => ({ ...prev, [primaryKey]: null, [aliasKey]: null }));

    try {
      const res = await fetch(
        `/api/mf-nav?code=${encodeURIComponent(cleanCode)}&range=${encodeURIComponent(periodKey)}`
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg =
          res.status === 429
            ? "Rate limit reached — please retry in a moment"
            : errJson?.error || `Failed to load chart (HTTP ${res.status})`;
        setMfChartError((prev) => ({ ...prev, [primaryKey]: errMsg, [aliasKey]: errMsg }));
        return;
      }
      const data = await res.json();
      const metaEntry = {
        prevNav: data.prevNav,
        navChange: data.navChange,
        navChangePct: data.navChangePct,
        high52: data.high52,
        low52: data.low52,
        navDate: data.date,
        schemeName: data.schemeName,
      };

      setMfMeta((prev) => ({
        ...prev,
        [cleanCode]: metaEntry,
        ...(idOrCode ? { [idOrCode]: metaEntry } : {}),
      }));

      const points = Array.isArray(data.chart) ? data.chart : [];
      setMfChartData((prev) => ({
        ...prev,
        [primaryKey]: points,
        [aliasKey]: points,
      }));
      setMfChartError((prev) => ({ ...prev, [primaryKey]: null, [aliasKey]: null }));
    } catch (e: any) {
      const errMsg = e?.message || "Network error loading chart";
      setMfChartError((prev) => ({ ...prev, [primaryKey]: errMsg, [aliasKey]: errMsg }));
    } finally {
      mfFetchInFlight.current.delete(primaryKey);
      setMfChartLoading((prev) => ({ ...prev, [primaryKey]: false, [aliasKey]: false }));
    }
  };

  const refreshNav = async (m: any) => {
    const code = (m?.mfCode || "").trim();
    if (!code) return;
    setRefreshingId(m.id || code);
    setNavError((prev) => ({ ...prev, [m.id]: "", [code]: "" }));
    const period = mfChartPeriod[code] || mfChartPeriod[m.id] || "3m";
    try {
      const res = await fetch(
        `/api/mf-nav?code=${encodeURIComponent(code)}&range=${encodeURIComponent(period)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.nav) throw new Error("No NAV in response");
      if (m.id) {
        await updateItem("mutualFunds", m.id, { currentNav: String(data.nav) });
      }
      const metaEntry = {
        prevNav: data.prevNav,
        navChange: data.navChange,
        navChangePct: data.navChangePct,
        high52: data.high52,
        low52: data.low52,
        navDate: data.date,
        schemeName: data.schemeName,
      };
      setMfMeta((prev) => ({
        ...prev,
        [code]: metaEntry,
        ...(m.id ? { [m.id]: metaEntry } : {}),
      }));
      if (data.chart?.length) {
        setMfChartData((prev) => ({
          ...prev,
          [`${code}__${period}`]: data.chart,
          ...(m.id ? { [`${m.id}__${period}`]: data.chart } : {}),
        }));
      }
    } catch (e: any) {
      setNavError((prev) => ({ ...prev, [m.id || code]: e.message || "Refresh failed" }));
    } finally {
      setRefreshingId(null);
    }
  };

  const refreshAllNavs = async () => {
    const withCode = items.filter((m: any) => (m.mfCode || "").trim());
    if (!withCode.length) return;
    setRefreshingAll(true);
    setNavError({});
    try {
      // Group items by unique mfCode to avoid redundant API calls
      const byCode: Record<string, any[]> = {};
      withCode.forEach((m: any) => {
        const code = (m.mfCode || "").trim();
        (byCode[code] = byCode[code] || []).push(m);
      });

      const uniqueCodes = Object.keys(byCode);
      const concurrency = 4;
      for (let i = 0; i < uniqueCodes.length; i += concurrency) {
        const chunk = uniqueCodes.slice(i, i + concurrency);
        await Promise.all(
          chunk.map(async (code) => {
            const group = byCode[code];
            const period = mfChartPeriod[code] || mfChartPeriod[group[0]?.id] || "3m";
            try {
              const res = await fetch(
                `/api/mf-nav?code=${encodeURIComponent(code)}&range=${encodeURIComponent(period)}`
              );
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const data = await res.json();
              if (!data.nav) throw new Error("No NAV in response");

              // Update all lots of this fund in DB
              for (const m of group) {
                await updateItem("mutualFunds", m.id, { currentNav: String(data.nav) });
              }

              const metaEntry = {
                prevNav: data.prevNav,
                navChange: data.navChange,
                navChangePct: data.navChangePct,
                high52: data.high52,
                low52: data.low52,
                navDate: data.date,
                schemeName: data.schemeName,
              };

              setMfMeta((prev) => {
                const next = { ...prev, [code]: metaEntry };
                group.forEach((m: any) => {
                  next[m.id] = metaEntry;
                });
                return next;
              });

              if (data.chart?.length) {
                setMfChartData((prev) => {
                  const next = { ...prev, [`${code}__${period}`]: data.chart };
                  group.forEach((m: any) => {
                    next[`${m.id}__${period}`] = data.chart;
                  });
                  return next;
                });
              }
            } catch (e: any) {
              const msg = e.message || "Refresh failed";
              setNavError((prev) => {
                const next = { ...prev, [code]: msg };
                group.forEach((m: any) => {
                  next[m.id] = msg;
                });
                return next;
              });
            }
          })
        );
      }

      if (fetchMfNavs) await fetchMfNavs();
    } finally {
      setRefreshingAll(false);
    }
  };

  const overallXirr = useMemo(() => {
    try {
      const cashFlows: any[] = [];
      const safeItems = Array.isArray(activeItems) ? activeItems : [];
      const safeMfSells = Array.isArray(mfSells) ? mfSells : [];

      // Active lots
      safeItems.forEach((m: any) => {
        if (!m) return;
        const units = Number(m.units) || 0;
        const currentNav = getLiveNav(m);
        const invested = Number(m.invested || m.investedValue) || Number(m.buyNav || 0) * units;
        if (units > 0 && m.buyDate) {
          cashFlows.push({
            date: m.buyDate,
            amount: -invested,
          });
          cashFlows.push({
            date: today(),
            amount: units * currentNav,
          });
        }
      });

      // Historical sales
      safeMfSells.forEach((s: any) => {
        if (!s) return;
        const units = Number(s.units) || 0;
        const buyNav = Number(s.buyNav) || 0;
        const sellNav = Number(s.sellNav) || 0;
        const buyDate = s.buyDate;
        const sellDate = s.sellDate;
        if (units > 0 && sellDate) {
          if (buyDate) {
            cashFlows.push({
              date: buyDate,
              amount: -(units * buyNav),
            });
          }
          cashFlows.push({
            date: sellDate,
            amount: units * sellNav,
          });
        }
      });

      return calcXIRR(cashFlows);
    } catch (e) {
      console.error("Error calculating overall MF XIRR:", e);
      return null;
    }
  }, [activeItems, mfSells]);

  const totalInvested = activeItems.reduce((s: number, m: any) => s + mfInvestedValue(m), 0);
  const totalCurrent = activeItems.reduce(
    (s: number, m: any) => s + mfCurrentValueOf(m, getLiveNav).value,
    0
  );
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const totalDaysPnL = activeItems.reduce((s: number, m: any) => {
    const meta = mfMeta[m.id];
    if (!meta || meta.navChange == null) return s;
    return s + Number(m.units || 0) * meta.navChange;
  }, 0);
  const prevCloseValue = totalCurrent - totalDaysPnL;
  const totalDaysPnLPct = prevCloseValue > 0 ? (totalDaysPnL / prevCloseValue) * 100 : 0;
  const hasDaysPnLData = activeItems.some((m: any) => m?.mfCode && mfMeta[m.id]?.navChange != null);

  return (
    <div className="animate-fade-in-up">
      {activeItems.length === 0 ? (
        <InvestmentEmptyState
          icon={BarChart3}
          gradient="linear-gradient(135deg,#5b21b6 0%,#8b5cf6 100%)"
          dotColor="#7c3aed"
          title="No Mutual Funds Added Yet"
          description="Track all your MF investments — fund name, category, NAV, units, invested value, and P&L returns."
          pills={["Invested Value", "Current Value", "P&L Returns", "NAV Tracking"]}
          buttonLabel="Add Mutual Fund"
          onAdd={onAdd}
        />
      ) : (
        <>
          {/* View switcher: Holdings | Insights */}
          <div className="demat-portfolio-bar no-scrollbar">
            {[
              { id: "holdings" as const, label: "Holdings", Icon: BarChart3 },
              { id: "insights" as const, label: "Insights", Icon: Activity },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setMfView(id)}
                className={`demat-portfolio-pill ${mfView === id ? "active" : ""}`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {mfView === "insights" && <MFInsights items={activeItems} getLiveNav={getLiveNav} />}

          {mfView === "holdings" && (
            <>
          {/* Summary strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "Total Invested",
                value: fmtINRFull(totalInvested),
                numericValue: totalInvested,
                formatValue: fmtINRFull,
                color: THEME.accent,
                Icon: IndianRupee,
              },
              {
                label: "Current Value",
                value: fmtINRFull(totalCurrent),
                numericValue: totalCurrent,
                formatValue: fmtINRFull,
                color: THEME.sage,
                Icon: TrendingUp,
              },
              {
                label: "Day's P&L",
                value: hasDaysPnLData
                  ? `${totalDaysPnL >= 0 ? "+" : ""}${fmtINRFull(totalDaysPnL)} (${totalDaysPnL >= 0 ? "+" : ""}${totalDaysPnLPct.toFixed(2)}%)`
                  : "—",
                numericValue: hasDaysPnLData ? totalDaysPnL : undefined,
                formatValue: hasDaysPnLData
                  ? (n: number) =>
                      `${n >= 0 ? "+" : ""}${fmtINRFull(n)} (${n >= 0 ? "+" : ""}${totalDaysPnLPct.toFixed(2)}%)`
                  : undefined,
                color: !hasDaysPnLData ? THEME.muted : totalDaysPnL >= 0 ? THEME.sage : THEME.rust,
                Icon: Activity,
              },
              {
                label: "Overall P&L",
                value: `${totalPnl >= 0 ? "+" : ""}${fmtINRFull(Math.abs(totalPnl))}`,
                numericValue: totalPnl,
                formatValue: (n: number) => `${n >= 0 ? "+" : ""}${fmtINRFull(Math.abs(n))}`,
                color: totalPnl >= 0 ? THEME.sage : THEME.rust,
                Icon: totalPnl >= 0 ? TrendingUp : TrendingDown,
              },
              {
                label: "Return %",
                value: `${totalPnl >= 0 ? "+" : ""}${totalPnlPct.toFixed(2)}%`,
                numericValue: totalPnlPct,
                formatValue: (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`,
                color: totalPnl >= 0 ? THEME.sage : THEME.rust,
                Icon: Activity,
              },
              {
                label: "Overall XIRR",
                value:
                  overallXirr !== null
                    ? `${overallXirr >= 0 ? "+" : ""}${overallXirr.toFixed(2)}%`
                    : "—",
                numericValue: overallXirr !== null ? overallXirr : undefined,
                formatValue:
                  overallXirr !== null
                    ? (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`
                    : undefined,
                color:
                  overallXirr === null ? THEME.muted : overallXirr >= 0 ? THEME.sage : THEME.rust,
                Icon: TrendingUp,
              },
            ].map(({ label, value, numericValue, formatValue, color, Icon }) => (
              <StatCard
                key={label}
                label={label}
                value={value}
                numericValue={numericValue}
                formatValue={formatValue}
                icon={<Icon />}
                color={color}
              />
            ))}
          </div>

          {/* Sort + Refresh toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 10,
                  padding: "6px 12px",
                  height: 36,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Group by:
                </span>
                <select
                  value={mfGroupBy}
                  onChange={(e) => setMfGroupBy(e.target.value as any)}
                  aria-label="Group mutual funds by"
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: 13,
                    fontWeight: 700,
                    color: THEME.ink,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="none">None</option>
                  <option value="category">Category</option>
                  <option value="type">Fund Type</option>
                </select>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 10,
                  padding: "6px 12px",
                  height: 36,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Sort by:
                </span>
                <select
                  value={mfSortBy}
                  onChange={(e) => setMfSortBy(e.target.value as any)}
                  aria-label="Sort mutual funds by"
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: 13,
                    fontWeight: 700,
                    color: THEME.ink,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="value">Highest Value</option>
                  <option value="pnl">Best Returns (%)</option>
                  <option value="name">Fund Name (A-Z)</option>
                  <option value="units">Most Units</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={13} />}
                onClick={handleExport}
                title="Export mutual funds to CSV"
              >
                Export CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Upload size={13} />}
                onClick={() => {
                  setShowCsvImport((v) => !v);
                  setShowCasImport(false);
                }}
                title="Import mutual funds from CSV"
              >
                Import CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Upload size={13} />}
                onClick={() => {
                  setShowCasImport((v) => !v);
                  setShowCsvImport(false);
                }}
                title="Import mutual funds from CAS Statement copy"
              >
                Import CAS
              </Button>
              {items.some((m: any) => m.mfCode) && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={
                      <RefreshCw
                        size={13}
                        className={refreshingAll || fetchingMfNavs ? "animate-spin" : ""}
                      />
                    }
                    onClick={refreshAllNavs}
                    disabled={refreshingAll || fetchingMfNavs}
                    style={{ opacity: refreshingAll || fetchingMfNavs ? 0.6 : 1 }}
                  >
                    {refreshingAll || fetchingMfNavs ? "Refreshing NAVs…" : "Refresh All NAVs"}
                  </Button>
                  {/* Previously plumbed in but never rendered — non-technical users had no way
                      to tell whether displayed NAVs were fresh or hours-old from cache. */}
                  {!refreshingAll && !fetchingMfNavs && mfMarketDataTs && (
                    <span style={{ fontSize: 10, color: THEME.muted }}>
                      NAVs as of{" "}
                      {new Date(mfMarketDataTs).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  {!refreshingAll &&
                    (() => {
                      const failed = Object.values(navError).filter(Boolean).length;
                      return failed > 0 ? (
                        <span
                          style={{ fontSize: 11, color: THEME.rust, fontWeight: 600 }}
                          title={Object.entries(navError)
                            .filter(([, v]) => v)
                            .map(([id, v]) => `${id}: ${v}`)
                            .join("\n")}
                        >
                          {failed} failed
                        </span>
                      ) : null;
                    })()}
                </>
              )}
            </div>
          </div>

          {showCsvImport && (
            <div style={{ marginBottom: 16 }}>
              <MFCsvPanel
                onImport={async (rows: any[]) => {
                  try {
                    await handleImport(rows);
                    setShowCsvImport(false);
                  } catch (e: any) {
                    showToast?.(`Failed to import: ${e?.message || "Unknown error"}`, "error");
                  }
                }}
                onClose={() => setShowCsvImport(false)}
              />
            </div>
          )}

          {showCasImport && (
            <div style={{ marginBottom: 16 }}>
              <MFCasPanel
                // Don't close the panel here — MFCasPanel awaits this itself and shows a
                // success banner once the writes actually land; closing immediately (this
                // used to fire-and-forget handleImport, then close synchronously right
                // after) unmounted the panel before that confirmation could ever be seen.
                onImport={handleImport}
                onClose={() => setShowCasImport(false)}
                existingFunds={items || []}
                activeProfile={activeProfile}
              />
            </div>
          )}

          {/* Grouped by fund name + folio — table layout like stocks */}
          {(() => {
            const mfTh: React.CSSProperties = {
              textAlign: "left",
              padding: "11px 10px",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: THEME.muted,
              fontWeight: 700,
              borderBottom: `1.5px solid ${THEME.line}`,
              whiteSpace: "nowrap",
            };
            const mfTd: React.CSSProperties = {
              padding: "12px 10px",
              verticalAlign: "middle",
              fontSize: 13,
              borderBottom: `1px solid ${THEME.line}`,
              fontVariantNumeric: "tabular-nums",
            };

            const folioGroups: Record<
              string,
              { fundName: string; folio: string; category: string; mfType: string; items: any[] }
            > = {};
            activeItems.forEach((m: any) => {
              const name = (m.name || m.scheme || "").trim();
              const folio = (m.folioNumber || "").trim();
              const cat = (m.category || m.type || "Equity").trim();
              const mft = (m.mfType || "Direct Growth").trim();
              const key = `${name}|||${folio}|||${cat}|||${mft}`;
              if (!folioGroups[key])
                folioGroups[key] = { fundName: name, folio, category: cat, mfType: mft, items: [] };
              folioGroups[key].items.push(m);
            });
            const grpVal = (g: any) =>
              g.items.reduce(
                (s: number, m: any) => s + mfCurrentValueOf(m, getLiveNav).value,
                0
              );
            const grpInvFn = (g: any) =>
              g.items.reduce((s: number, m: any) => s + mfInvestedValue(m), 0);
            const grpIsStale = (g: any) =>
              g.items.every((m: any) => mfCurrentValueOf(m, getLiveNav).isStale);
            const grpUnits = (g: any) =>
              g.items.reduce((s: number, m: any) => s + (Number(m.units) || 0), 0);

            const sortedKeys = Object.keys(folioGroups).sort((a, b) => {
              const ga = folioGroups[a];
              const gb = folioGroups[b];
              if (mfSortBy === "name") {
                const nc = ga.fundName.localeCompare(gb.fundName);
                return nc !== 0 ? nc : ga.folio.localeCompare(gb.folio);
              }
              if (mfSortBy === "value") return grpVal(gb) - grpVal(ga);
              if (mfSortBy === "pnl") {
                const invA = grpInvFn(ga);
                const invB = grpInvFn(gb);
                return (
                  (invB > 0 ? ((grpVal(gb) - invB) / invB) * 100 : 0) -
                  (invA > 0 ? ((grpVal(ga) - invA) / invA) * 100 : 0)
                );
              }
              if (mfSortBy === "units") return grpUnits(gb) - grpUnits(ga);
              return 0;
            });

            const sectionGroups: { label: string; keys: string[] }[] = (() => {
              if (mfGroupBy === "none") return [{ label: "", keys: sortedKeys }];
              const buckets: Record<string, string[]> = {};
              const bucketOrder: string[] = [];
              sortedKeys.forEach((gKey) => {
                const fg = folioGroups[gKey];
                const bucket =
                  mfGroupBy === "category" ? fg.category || "Other" : fg.mfType || "Other";
                if (!buckets[bucket]) {
                  buckets[bucket] = [];
                  bucketOrder.push(bucket);
                }
                buckets[bucket].push(gKey);
              });
              bucketOrder.sort((a, b) => {
                const totalA = buckets[a].reduce((s, k) => s + grpVal(folioGroups[k]), 0);
                const totalB = buckets[b].reduce((s, k) => s + grpVal(folioGroups[k]), 0);
                return totalB - totalA;
              });
              return bucketOrder.map((label) => ({ label, keys: buckets[label] }));
            })();

            // Fixed chart-extension tokens (not the user-selectable accent) — raw
            // hex here would go stale in dark mode and could exactly match the
            // active accent preset (e.g. a raw "#6366f1" would collide with the
            // "Indigo"/"Ocean Blue" presets).
            const categoryColors: Record<string, string> = {
              Equity: THEME.accent,
              Debt: THEME.gold,
              Hybrid: THEME.sage,
              ELSS: THEME.violet,
              Index: THEME.cyan,
              Liquid: THEME.muted,
              International: THEME.pink,
              "Direct Growth": THEME.accent,
              "Direct IDCW": THEME.gold,
              "Regular Growth": THEME.sage,
              "Regular IDCW": THEME.pink,
            };

            return (
              <div
                style={{
                  background: "var(--t-card-bg)",
                  borderRadius: 16,
                  border: `1px solid ${THEME.line}`,
                  overflowX: "auto",
                  marginBottom: 20,
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--surface-0)" }}>
                      <th style={{ ...mfTh, paddingLeft: 20 }}>Fund / Scheme</th>
                      <th style={{ ...mfTh, textAlign: "right" }}>Units</th>
                      <th style={{ ...mfTh, textAlign: "right" }}>Avg NAV</th>
                      <th style={{ ...mfTh, textAlign: "right" }}>Current NAV</th>
                      <th style={{ ...mfTh, textAlign: "right" }}>Invested</th>
                      <th style={{ ...mfTh, textAlign: "right" }}>Current Value</th>
                      <th style={{ ...mfTh, textAlign: "right" }}>Weight</th>
                      <th style={{ ...mfTh, textAlign: "right" }}>Day's P&L</th>
                      <th style={{ ...mfTh, textAlign: "right", paddingRight: 20 }}>
                        Total Return
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionGroups.map((section) => {
                      const sectionInvested = section.keys.reduce(
                        (s, k) => s + grpInvFn(folioGroups[k]),
                        0
                      );
                      const sectionValue = section.keys.reduce(
                        (s, k) => s + grpVal(folioGroups[k]),
                        0
                      );
                      const sectionPnl = sectionValue - sectionInvested;
                      const sectionPnlPct =
                        sectionInvested > 0 ? (sectionPnl / sectionInvested) * 100 : 0;
                      const dotColor = categoryColors[section.label] || THEME.accent;
                      return (
                        <React.Fragment key={section.label || "__flat__"}>
                          {section.label && (
                            <tr style={{ background: `color-mix(in srgb, ${dotColor} 3%, transparent)` }}>
                              <td
                                colSpan={9}
                                style={{
                                  padding: "10px 20px",
                                  borderBottom: `2px solid ${`color-mix(in srgb, ${dotColor} 19%, transparent)`}`,
                                }}
                              >
                                <div
                                  style={{
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
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        background: dotColor,
                                        display: "inline-block",
                                        flexShrink: 0,
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 900,
                                        color: THEME.ink,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.04em",
                                      }}
                                    >
                                      {section.label}
                                    </span>
                                    <span
                                      style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}
                                    >
                                      ({section.keys.length}{" "}
                                      {section.keys.length === 1 ? "fund" : "funds"})
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 16,
                                      fontSize: 12,
                                    }}
                                  >
                                    <span style={{ color: THEME.muted, fontWeight: 600 }}>
                                      Invested:{" "}
                                      <b style={{ color: THEME.ink }}>
                                        <Money value={sectionInvested} variant="full" />
                                      </b>
                                    </span>
                                    <span style={{ color: THEME.muted, fontWeight: 600 }}>
                                      Value:{" "}
                                      <b style={{ color: THEME.ink }}>
                                        <Money value={sectionValue} variant="full" />
                                      </b>
                                    </span>
                                    <span
                                      style={{
                                        fontWeight: 800,
                                        color: sectionPnl >= 0 ? THEME.sage : THEME.rust,
                                      }}
                                    >
                                      {sectionPnl >= 0 ? "+" : ""}
                                      <Money value={sectionPnl} variant="full" /> ({sectionPnlPct >= 0 ? "+" : ""}
                                      {sectionPnlPct.toFixed(2)}%)
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                          {section.keys.map((gKey) => {
                            const grp = folioGroups[gKey];
                            const groupItems = grp.items;
                            const hasMultiple = groupItems.length > 1;
                            const totalUnits = groupItems.reduce(
                              (s: number, m: any) => s + (Number(m.units) || 0),
                              0
                            );
                            const grpInvested = grpInvFn(grp);
                            const grpCurrent = grpVal(grp);
                            const grpStale = grpIsStale(grp);
                            const grpPnl = grpStale ? 0 : grpCurrent - grpInvested;
                            const grpPnlPct =
                              grpInvested > 0 && !grpStale ? (grpPnl / grpInvested) * 100 : 0;
                            const displayName = grp.fundName || "Unnamed Fund";
                            const displayFolio = grp.folio;
                            const isExpanded = lotExpandedGroups.has(gKey);
                            const firstWithCode = groupItems.find((m: any) => m.mfCode);
                            const avgNav = totalUnits > 0 ? grpInvested / totalUnits : 0;
                            const currentNav = getLiveNav(groupItems[0]);

                            const grpXirr = (() => {
                              try {
                                const cashFlows: any[] = [];
                                const safeGroupItems = Array.isArray(groupItems) ? groupItems : [];
                                const safeMfSells = Array.isArray(mfSells) ? mfSells : [];

                                safeGroupItems.forEach((m: any) => {
                                  if (!m) return;
                                  const units = Number(m.units) || 0;
                                  const currentNavVal = getLiveNav(m);
                                  const invested =
                                    Number(m.invested || m.investedValue) ||
                                    Number(m.buyNav || 0) * units;
                                  if (units > 0 && m.buyDate) {
                                    cashFlows.push({ date: m.buyDate, amount: -invested });
                                    cashFlows.push({
                                      date: today(),
                                      amount: units * currentNavVal,
                                    });
                                  }
                                });
                                const sells = safeMfSells.filter(
                                  (s: any) =>
                                    s &&
                                    (s.scheme || "").trim().toLowerCase() ===
                                      displayName.trim().toLowerCase()
                                );
                                sells.forEach((s: any) => {
                                  const units = Number(s.units) || 0;
                                  const buyNav = Number(s.buyNav) || 0;
                                  const sellNav = Number(s.sellNav) || 0;
                                  const buyDate = s.buyDate;
                                  const sellDate = s.sellDate;
                                  if (units > 0 && sellDate) {
                                    if (buyDate)
                                      cashFlows.push({ date: buyDate, amount: -(units * buyNav) });
                                    cashFlows.push({ date: sellDate, amount: units * sellNav });
                                  }
                                });
                                return calcXIRR(cashFlows);
                              } catch (e) {
                                console.error("Error calculating group XIRR:", e);
                                return null;
                              }
                            })();

                            return (
                              <React.Fragment key={gKey}>
                                {/* Main row */}
                                <tr
                                  onClick={() => toggleLotExpand(gKey)}
                                  tabIndex={0}
                                  aria-expanded={isExpanded}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      toggleLotExpand(gKey);
                                    }
                                  }}
                                  style={{
                                    cursor: "pointer",
                                    background: isExpanded ? `color-mix(in srgb, ${THEME.accent} 4%, transparent)` : "transparent",
                                    transition: "background 0.15s ease",
                                    borderBottom: `1px solid ${THEME.line}`,
                                  }}
                                >
                                  <td style={{ ...mfTd, paddingLeft: 20 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                      <span
                                        style={{
                                          color: isExpanded ? THEME.accent : THEME.muted,
                                          display: "inline-flex",
                                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                          transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1)",
                                        }}
                                      >
                                        <ChevronDown size={16} />
                                      </span>
                                      <MFLogo fundName={displayName} size={36} />
                                      <div>
                                        <div
                                          style={{ display: "flex", alignItems: "center", gap: 6 }}
                                        >
                                          <span
                                            style={{
                                              fontWeight: 800,
                                              fontSize: 14,
                                              color: THEME.ink,
                                            }}
                                          >
                                            {displayName}
                                          </span>
                                        </div>
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            marginTop: 2,
                                            flexWrap: "wrap",
                                          }}
                                        >
                                          {displayFolio && (
                                            <span
                                              style={{
                                                fontSize: 11,
                                                color: THEME.muted,
                                                fontWeight: 600,
                                              }}
                                            >
                                              Folio: {displayFolio}
                                            </span>
                                          )}
                                          {grp.category && (
                                            <span
                                              style={{
                                                fontSize: 9,
                                                background: `color-mix(in srgb, ${categoryColors[grp.category] || THEME.accent} 8%, transparent)`,
                                                color: categoryColors[grp.category] || THEME.accent,
                                                padding: "1px 6px",
                                                borderRadius: 10,
                                                fontWeight: 700,
                                                border: `1px solid ${`color-mix(in srgb, ${categoryColors[grp.category] || THEME.accent} 19%, transparent)`}`,
                                              }}
                                            >
                                              {grp.category}
                                            </span>
                                          )}
                                          {grp.mfType && (
                                            <span
                                              style={{
                                                fontSize: 9,
                                                background: `color-mix(in srgb, ${THEME.line} 19%, transparent)`,
                                                color: THEME.muted,
                                                padding: "1px 6px",
                                                borderRadius: 10,
                                                fontWeight: 700,
                                                border: `1px solid ${THEME.line}`,
                                              }}
                                            >
                                              {grp.mfType}
                                            </span>
                                          )}
                                          <OwnerBadge owner={groupItems[0]?.owner} />
                                          <span
                                            style={{
                                              fontSize: 9,
                                              background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
                                              color: THEME.muted,
                                              padding: "1px 6px",
                                              borderRadius: 10,
                                              fontWeight: 700,
                                              border: `1px solid ${THEME.line}`,
                                            }}
                                          >
                                            {groupItems.length}{" "}
                                            {groupItems.length === 1 ? "lot" : "lots"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ ...mfTd, textAlign: "right", fontWeight: 700 }}>
                                    {totalUnits.toLocaleString("en-IN", {
                                      maximumFractionDigits: 3,
                                    })}
                                  </td>
                                  <td style={{ ...mfTd, textAlign: "right", fontWeight: 600 }}>
                                    <Prv>₹{avgNav.toFixed(2)}</Prv>
                                  </td>
                                  <td style={{ ...mfTd, textAlign: "right" }}>
                                    <div style={{ fontWeight: 700, color: THEME.ink }}>
                                      {currentNav > 0 ? <Prv>₹{currentNav.toFixed(2)}</Prv> : "—"}
                                    </div>
                                  </td>
                                  <td style={{ ...mfTd, textAlign: "right", fontWeight: 600 }}>
                                    <Money value={grpInvested} variant="full" />
                                  </td>
                                  <td style={{ ...mfTd, textAlign: "right", fontWeight: 800 }}>
                                    <Money value={grpCurrent} variant="full" />
                                    {grpStale && (
                                      <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 600 }}>
                                        NAV unavailable
                                      </div>
                                    )}
                                  </td>

                                  {/* Portfolio Weight column with allocation bar */}
                                  <td style={{ ...mfTd, textAlign: "right", minWidth: 90 }}>
                                    {totalCurrent > 0 ? (
                                      (() => {
                                        const weight = (grpCurrent / totalCurrent) * 100;
                                        return (
                                          <div
                                            className="demat-allocation-bar-wrap"
                                            style={{ justifyContent: "flex-end" }}
                                          >
                                            <span
                                              style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: THEME.muted,
                                                minWidth: 36,
                                                textAlign: "right",
                                              }}
                                            >
                                              {weight.toFixed(1)}%
                                            </span>
                                            <div
                                              className="demat-allocation-bar-track"
                                              style={{ width: 52 }}
                                            >
                                              <div
                                                className="demat-allocation-bar-fill"
                                                style={{ width: `${Math.min(100, weight)}%` }}
                                              />
                                            </div>
                                          </div>
                                        );
                                      })()
                                    ) : (
                                      <span style={{ color: THEME.muted }}>—</span>
                                    )}
                                  </td>

                                  {/* Day's P&L column */}
                                  <td style={{ ...mfTd, textAlign: "right" }}>
                                    {(() => {
                                      const groupMeta = groupItems
                                        .map((m: any) => mfMeta[m.id])
                                        .find((meta: any) => meta?.navChange != null);
                                      if (!groupMeta) return <span style={{ color: THEME.muted }}>—</span>;
                                      const dayPnl = totalUnits * groupMeta.navChange;
                                      return (
                                        <>
                                          <div
                                            style={{
                                              fontWeight: 800,
                                              color: dayPnl >= 0 ? THEME.sage : THEME.rust,
                                            }}
                                          >
                                            {dayPnl >= 0 ? "+" : ""}
                                            <Money value={dayPnl} variant="full" />
                                          </div>
                                          <div
                                            style={{
                                              fontSize: 11,
                                              fontWeight: 700,
                                              color: groupMeta.navChangePct >= 0 ? THEME.sage : THEME.rust,
                                              marginTop: 1,
                                            }}
                                          >
                                            {groupMeta.navChangePct >= 0 ? "+" : "−"}{Math.abs(groupMeta.navChangePct ?? 0).toFixed(2)}%
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </td>

                                  <td style={{ ...mfTd, textAlign: "right", paddingRight: 20 }}>
                                    {!grpStale ? (
                                      <>
                                        <div
                                          style={{
                                            fontWeight: 800,
                                            color: grpPnl >= 0 ? THEME.sage : THEME.rust,
                                          }}
                                        >
                                          {grpPnl >= 0 ? "+" : ""}
                                          <Money value={grpPnl} variant="full" />
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: grpPnlPct >= 0 ? THEME.sage : THEME.rust,
                                            marginTop: 1,
                                          }}
                                        >
                                          {grpPnlPct >= 0 ? "+" : "−"}{Math.abs(grpPnlPct).toFixed(2)}%
                                        </div>
                                        {grpXirr !== null && (
                                          <div
                                            style={{
                                              fontSize: 10,
                                              fontWeight: 800,
                                              color: grpXirr >= 0 ? THEME.sage : THEME.rust,
                                              marginTop: 2,
                                            }}
                                          >
                                            {grpXirr >= 0 ? "+" : ""}
                                            {grpXirr.toFixed(2)}% XIRR
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <span style={{ color: THEME.muted }}>—</span>
                                    )}
                                  </td>
                                </tr>

                                {/* Expanded detail drawer */}
                                {isExpanded && (
                                  <tr style={{ background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)` }}>
                                    <td
                                      colSpan={9}
                                      style={{
                                        padding: "20px 24px",
                                        borderBottom: `1px solid ${THEME.line}`,
                                      }}
                                    >
                                      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                                        {/* Left: Chart */}
                                        {firstWithCode && (
                                          <MFNavTrendDrawer
                                            groupItem={firstWithCode}
                                            mfMeta={mfMeta}
                                            mfMarketData={mfMarketData}
                                            mfChartData={mfChartData}
                                            mfChartLoading={mfChartLoading}
                                            mfChartError={mfChartError}
                                            mfChartPeriod={mfChartPeriod}
                                            setMfChartPeriod={setMfChartPeriod}
                                            fetchMFData={fetchMFData}
                                            privacyMode={privacyMode}
                                          />
                                        )}

                                        {/* Right: Lot breakdown */}
                                        <div style={{ flex: "1.2 1 450px", minWidth: 320 }}>
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 8,
                                              marginBottom: 10,
                                            }}
                                          >
                                            <span
                                              style={{
                                                fontSize: 11,
                                                color: THEME.muted,
                                                fontWeight: 700,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
                                              }}
                                            >
                                              Lot Breakdown
                                            </span>
                                            <span
                                              style={{
                                                fontSize: 10,
                                                fontWeight: 800,
                                                background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                                                color: THEME.accent,
                                                padding: "1px 8px",
                                                borderRadius: "var(--radius-xs)",
                                                border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 15%, transparent)`}`,
                                              }}
                                            >
                                              {groupItems.length}{" "}
                                              {groupItems.length === 1 ? "lot" : "lots"}
                                            </span>
                                            <div
                                              style={{
                                                marginLeft: "auto",
                                                display: "flex",
                                                gap: 6,
                                              }}
                                            >
                                              <Button
                                                variant="secondary"
                                                size="sm"
                                                icon={<Plus size={12} />}
                                                onClick={(e: any) => {
                                                  e.stopPropagation();
                                                  setAddLotGroup({
                                                    fundName: displayName,
                                                    folio: displayFolio,
                                                    refLot: {
                                                      ...groupItems[0],
                                                      currentNav: getLiveNav(groupItems[0]),
                                                    },
                                                  });
                                                }}
                                              >
                                                Add Lot
                                              </Button>
                                              {hasMultiple && (
                                                <Button
                                                  variant="secondary"
                                                  size="sm"
                                                  icon={<ArrowDownRight size={12} />}
                                                  onClick={(e: any) => {
                                                    e.stopPropagation();
                                                    setFifoSellMFGroup({
                                                      schemeName:
                                                        displayName +
                                                        (displayFolio ? ` (${displayFolio})` : ""),
                                                      // Kept separate from schemeName (which
                                                      // includes the folio suffix for display) —
                                                      // grpXirr below and SellMFModal's single-lot
                                                      // path both key mfSells.scheme off the bare
                                                      // fund name, so persisting the folio-suffixed
                                                      // string here silently orphaned this fund's
                                                      // realized-sale cash flows from its own XIRR.
                                                      fundName: displayName,
                                                      lots: groupItems.map((m: any) => ({
                                                        ...m,
                                                        currentNav: getLiveNav(m),
                                                      })),
                                                    });
                                                  }}
                                                  style={{ color: THEME.gold }}
                                                >
                                                  Bulk Sell
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                          <div
                                            style={{
                                              background: "var(--surface-0)",
                                              border: `1.5px solid ${THEME.line}`,
                                              borderRadius: 12,
                                              overflow: "hidden",
                                            }}
                                          >
                                          <div
                                            style={{
                                              maxHeight: 420,
                                              overflowY: "auto",
                                              overflowX: "auto" as const,
                                              padding: "0 10px 10px",
                                            }}
                                          >
                                          <table
                                            style={{
                                              width: "100%",
                                              borderCollapse: "separate",
                                              borderSpacing: "0 6px",
                                              fontSize: 12,
                                            }}
                                          >
                                            <thead>
                                              <tr>
                                                {[
                                                  "Buy Date",
                                                  "Buy NAV",
                                                  "Units",
                                                  "Return",
                                                  "Value",
                                                  "",
                                                ].map((h, i) => (
                                                  <th
                                                    key={h || "act"}
                                                    style={{
                                                      ...mfTh,
                                                      background: "var(--surface-0)",
                                                      borderBottom: `1.5px solid ${THEME.line}`,
                                                      padding: "10px 8px 8px",
                                                      textAlign: i === 0 ? "left" : "right",
                                                      position: "sticky",
                                                      top: 0,
                                                      zIndex: 1,
                                                    }}
                                                  >
                                                    {h}
                                                  </th>
                                                ))}
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {[...groupItems]
                                                .sort((a: any, b: any) => {
                                                  const da = a.buyDate
                                                    ? new Date(a.buyDate).getTime()
                                                    : 0;
                                                  const db = b.buyDate
                                                    ? new Date(b.buyDate).getTime()
                                                    : 0;
                                                  return da - db;
                                                })
                                                .map((lot: any) => {
                                                  const lotUnits = Number(lot.units) || 0;
                                                  const lotBuyNav = Number(lot.buyNav) || 0;
                                                  const lotCurrentNav = getLiveNav(lot);
                                                  const lotInv = mfInvestedValue(lot);
                                                  const lotValueInfo = mfCurrentValueOf(lot, getLiveNav);
                                                  const lotCurr = lotValueInfo.value;
                                                  const lotStale = lotValueInfo.isStale;
                                                  const lotPnl = lotStale ? 0 : lotCurr - lotInv;
                                                  const lotPnlPct =
                                                    lotInv > 0 && !lotStale ? (lotPnl / lotInv) * 100 : 0;
                                                  const days = lot.buyDate
                                                    ? Math.floor(
                                                        (Date.now() -
                                                          new Date(lot.buyDate).getTime()) /
                                                          (1000 * 60 * 60 * 24)
                                                      )
                                                    : null;
                                                  // Anniversary-date-aware (Section 2(42A)), matching
                                                  // CapitalGainsTab.isLongTerm — a naive "> 365 days" check
                                                  // disagreed with the actual tax report near month/leap-year
                                                  // boundaries.
                                                  const isLTCG =
                                                    lot.buyDate && isLongTerm(lot.buyDate, today(), 12);
                                                  const nearLTCG =
                                                    days !== null && !isLTCG && days > 300;
                                                  const cagr =
                                                    lot.buyDate && lotInv > 0 && !lotStale
                                                      ? calcCAGR(lotInv, lotCurr, lot.buyDate)
                                                      : null;

                                                  return (
                                                    <tr
                                                      key={lot.id}
                                                      style={{ background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)` }}
                                                    >
                                                      <td
                                                        style={{
                                                          ...mfTd,
                                                          borderBottom: "none",
                                                          padding: "8px",
                                                          borderTopLeftRadius: 8,
                                                          borderBottomLeftRadius: 8,
                                                        }}
                                                      >
                                                        <div style={{ fontWeight: 600 }}>
                                                          {lot.buyDate ? (
                                                            new Date(
                                                              lot.buyDate + "T00:00:00"
                                                            ).toLocaleDateString("en-IN", {
                                                              day: "2-digit",
                                                              month: "short",
                                                              year: "numeric",
                                                            })
                                                          ) : (
                                                            <span style={{ color: THEME.muted }}>
                                                              —
                                                            </span>
                                                          )}
                                                        </div>
                                                        {days !== null && (
                                                          <span
                                                            style={{
                                                              marginTop: 3,
                                                              display: "inline-block",
                                                              fontSize: 9,
                                                              fontWeight: 800,
                                                              padding: "1px 6px",
                                                              borderRadius: 4,
                                                              background: isLTCG
                                                                ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)`
                                                                : `color-mix(in srgb, ${THEME.gold} 10%, transparent)`,
                                                              color: isLTCG ? THEME.sage : THEME.gold,
                                                            }}
                                                          >
                                                            {isLTCG
                                                              ? `LTCG · ${(days / 365).toFixed(1)}y`
                                                              : `STCG · ${days}d`}
                                                          </span>
                                                        )}
                                                      </td>
                                                      <td
                                                        style={{
                                                          ...mfTd,
                                                          borderBottom: "none",
                                                          padding: "8px",
                                                          textAlign: "right",
                                                          fontWeight: 600,
                                                        }}
                                                      >
                                                        {lotBuyNav > 0 ? (
                                                          <Prv>₹{lotBuyNav.toFixed(4)}</Prv>
                                                        ) : (
                                                          "—"
                                                        )}
                                                      </td>
                                                      <td
                                                        style={{
                                                          ...mfTd,
                                                          borderBottom: "none",
                                                          padding: "8px",
                                                          textAlign: "right",
                                                          fontWeight: 700,
                                                        }}
                                                      >
                                                        {lotUnits.toLocaleString("en-IN", {
                                                          maximumFractionDigits: 3,
                                                        })}
                                                      </td>
                                                      <td
                                                        style={{
                                                          ...mfTd,
                                                          borderBottom: "none",
                                                          padding: "8px",
                                                          textAlign: "right",
                                                        }}
                                                      >
                                                        {!lotStale ? (
                                                          <>
                                                            <div
                                                              style={{
                                                                color:
                                                                  lotPnl >= 0
                                                                    ? THEME.sage
                                                                    : THEME.rust,
                                                                fontWeight: 800,
                                                              }}
                                                            >
                                                              {lotPnl >= 0 ? "+" : ""}
                                                              {Math.round(lotPnlPct)}%
                                                            </div>
                                                            <div
                                                              style={{
                                                                fontSize: 10,
                                                                color:
                                                                  lotPnl >= 0
                                                                    ? THEME.sage
                                                                    : THEME.rust,
                                                                fontWeight: 600,
                                                              }}
                                                            >
                                                              {lotPnl >= 0 ? "+" : ""}
                                                              <Money value={lotPnl} variant="full" />
                                                            </div>
                                                            {cagr !== null && (
                                                              <div
                                                                style={{
                                                                  fontSize: 9,
                                                                  fontWeight: 800,
                                                                  color:
                                                                    cagr >= 15
                                                                      ? THEME.sage
                                                                      : cagr >= 8
                                                                        ? THEME.gold
                                                                        : THEME.rust,
                                                                }}
                                                              >
                                                                {cagr.toFixed(0)}% CAGR
                                                              </div>
                                                            )}
                                                          </>
                                                        ) : (
                                                          <span style={{ color: THEME.muted }}>
                                                            —
                                                          </span>
                                                        )}
                                                      </td>
                                                      <td
                                                        style={{
                                                          ...mfTd,
                                                          borderBottom: "none",
                                                          padding: "8px",
                                                          textAlign: "right",
                                                          fontWeight: 800,
                                                        }}
                                                      >
                                                        <Money value={lotCurr} variant="full" />
                                                        {lotStale && (
                                                          <div
                                                            style={{
                                                              fontSize: 9,
                                                              color: THEME.muted,
                                                              fontWeight: 600,
                                                            }}
                                                          >
                                                            NAV unavailable
                                                          </div>
                                                        )}
                                                      </td>
                                                      <td
                                                        style={{
                                                          ...mfTd,
                                                          borderBottom: "none",
                                                          padding: "8px",
                                                          borderTopRightRadius: 8,
                                                          borderBottomRightRadius: 8,
                                                        }}
                                                      >
                                                        <div
                                                          style={{
                                                            display: "flex",
                                                            gap: 3,
                                                            justifyContent: "flex-end",
                                                          }}
                                                        >
                                                          <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            icon={<ArrowDownRight size={11} />}
                                                            style={{ color: THEME.gold }}
                                                            onClick={(e: any) => {
                                                              e.stopPropagation();
                                                              if (hasMultiple) {
                                                                // Selling an arbitrarily-chosen lot out of
                                                                // purchase order would bypass mandatory FIFO
                                                                // cost-basis matching (Sec 2(42A)/AMC redemption
                                                                // rules always consume the oldest lot first) —
                                                                // route multi-lot funds through the FIFO
                                                                // allocator instead so STCG/LTCG splits here
                                                                // actually match the AMC's Capital Gains
                                                                // Statement / Form 26AS.
                                                                setFifoSellMFGroup({
                                                                  schemeName:
                                                                    displayName +
                                                                    (displayFolio ? ` (${displayFolio})` : ""),
                                                                  fundName: displayName,
                                                                  lots: groupItems.map((m: any) => ({
                                                                    ...m,
                                                                    currentNav: getLiveNav(m),
                                                                  })),
                                                                });
                                                              } else {
                                                                setSellMF({ ...lot, currentNav: getLiveNav(lot) });
                                                              }
                                                            }}
                                                            aria-label={
                                                              hasMultiple
                                                                ? `Sell ${lot.fundName || displayName} — multiple lots, opens FIFO order`
                                                                : `Sell ${lot.fundName || displayName} lot`
                                                            }
                                                            title={
                                                              hasMultiple
                                                                ? "Multiple lots — sells oldest-first (FIFO) as required for correct STCG/LTCG"
                                                                : "Sell"
                                                            }
                                                          />
                                                          <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            icon={<Pencil size={11} />}
                                                            onClick={(e: any) => {
                                                              e.stopPropagation();
                                                              setEditMF(lot);
                                                            }}
                                                            aria-label={`Edit ${lot.fundName || displayName} lot`}
                                                            title="Edit"
                                                          />
                                                          <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            icon={<Trash2 size={11} />}
                                                            style={{ color: THEME.rust }}
                                                            onClick={(e: any) => {
                                                              e.stopPropagation();
                                                              setConfirmDeleteLot({
                                                                lot,
                                                                label: lot.fundName || displayName,
                                                              });
                                                            }}
                                                            aria-label={`Delete ${lot.fundName || displayName} lot`}
                                                            title="Delete"
                                                          />
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                            </tbody>
                                          </table>
                                          </div>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* ── Expense Ratio Impact Analyzer ── */}
          {items.length > 0 && (
            <Card style={{ padding: 0, marginTop: 20, overflow: "hidden" }}>
              <button
                onClick={() => setShowExpenseAnalyzer((v) => !v)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", color: THEME.gold, flexShrink: 0 }}>
                    <Activity size={20} />
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 14,
                        fontWeight: 800,
                        color: THEME.ink,
                      }}
                    >
                      Expense Ratio Impact Analyzer
                      <Badge
                        variant="muted"
                        style={{ fontSize: 9 }}
                        title="Uses flat assumed expense ratios by plan/asset type (Direct Equity 0.5%, Regular Equity 1.5%, Direct Debt 0.2%, Regular Debt 1%) — actual TERs vary by fund and can be materially higher for sectoral/small-AUM funds"
                      >
                        Estimated
                      </Badge>
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>
                      Hidden cost of expense ratios and potential savings from switching to Direct
                      plans
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  style={{
                    color: THEME.muted,
                    transform: showExpenseAnalyzer ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    flexShrink: 0,
                  }}
                />
              </button>

              {showExpenseAnalyzer &&
                (() => {
                  const getExpenseInfo = (name: string, mfType: string, category: string) => {
                    const nameLC = (name || "").toLowerCase();
                    const typeLC = (mfType || "").toLowerCase();
                    const catLC = (category || "").toLowerCase();

                    const isDirect = nameLC.includes("direct") || typeLC.includes("direct");
                    const isRegular = nameLC.includes("regular") || typeLC.includes("regular");
                    const planType = isDirect
                      ? "Direct"
                      : isRegular
                        ? "Regular"
                        : typeLC.includes("direct")
                          ? "Direct"
                          : "Regular";

                    const isDebt =
                      catLC.includes("debt") ||
                      catLC.includes("liquid") ||
                      catLC.includes("gilt") ||
                      catLC.includes("overnight") ||
                      catLC.includes("money market") ||
                      catLC.includes("corporate bond") ||
                      catLC.includes("banking") ||
                      catLC.includes("credit risk");
                    const assetType = isDebt ? "Debt" : "Equity";

                    let expenseRatio: number;
                    if (planType === "Direct" && assetType === "Equity") expenseRatio = 0.005;
                    else if (planType === "Direct" && assetType === "Debt") expenseRatio = 0.002;
                    else if (planType === "Regular" && assetType === "Equity") expenseRatio = 0.015;
                    else expenseRatio = 0.01;

                    return { planType, assetType, expenseRatio };
                  };

                  const fundAnalysis = items
                    .map((m: any) => {
                      const name = m.name || m.scheme || "";
                      const units = Number(m.units) || 0;
                      const nav = getLiveNav(m);
                      const currentValue = units * nav;
                      const { planType, assetType, expenseRatio } = getExpenseInfo(
                        name,
                        m.mfType || "",
                        m.category || ""
                      );
                      const annualCost = currentValue * expenseRatio;

                      let directRatio: number | null = null;
                      if (planType === "Regular") {
                        directRatio = assetType === "Equity" ? 0.005 : 0.002;
                      }
                      const directAnnualCost =
                        directRatio !== null ? currentValue * directRatio : null;
                      const annualSaving =
                        directAnnualCost !== null ? annualCost - directAnnualCost : 0;

                      return {
                        name,
                        currentValue,
                        planType,
                        assetType,
                        expenseRatio,
                        annualCost,
                        directRatio,
                        annualSaving,
                      };
                    })
                    .filter((f: any) => f.currentValue > 0);

                  const totalAnnualCost = fundAnalysis.reduce(
                    (s: number, f: any) => s + f.annualCost,
                    0
                  );
                  const totalAnnualSaving = fundAnalysis.reduce(
                    (s: number, f: any) => s + f.annualSaving,
                    0
                  );
                  const regularFunds = fundAnalysis.filter((f: any) => f.planType === "Regular");
                  const directFunds = fundAnalysis.filter((f: any) => f.planType === "Direct");

                  const compoundSaving = (annual: number, years: number) => {
                    if (annual <= 0) return 0;
                    const rate = 0.12;
                    let savings = 0;
                    for (let y = 0; y < years; y++) {
                      savings = (savings + annual) * (1 + rate);
                    }
                    return savings;
                  };

                  return (
                    <div style={{ padding: "0 20px 20px" }}>
                      {/* Summary strip */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                          gap: 10,
                          marginBottom: 18,
                        }}
                      >
                        {[
                          {
                            label: "Total Annual Cost",
                            value: <Money value={totalAnnualCost} variant="full" />,
                            color: THEME.rust,
                          },
                          {
                            label: "Regular Plans",
                            value: String(regularFunds.length),
                            color: THEME.gold,
                          },
                          {
                            label: "Direct Plans",
                            value: String(directFunds.length),
                            color: THEME.sage,
                          },
                          {
                            label: "Annual Savings Possible",
                            value: <Money value={totalAnnualSaving} variant="full" />,
                            color: THEME.accent,
                          },
                        ].map(({ label, value, color }) => (
                          <div
                            key={label}
                            style={{
                              padding: "12px 14px",
                              borderRadius: 10,
                              background: `color-mix(in srgb, ${color} 4%, transparent)`,
                              border: `1px solid ${`color-mix(in srgb, ${color} 13%, transparent)`}`,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: THEME.muted,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.08em",
                                lineHeight: 1.3,
                                minHeight: 26,
                                marginBottom: 4,
                              }}
                            >
                              {label}
                            </div>
                            <div
                              style={{
                                fontFamily: "var(--font-display)",
                                fontSize: 18,
                                fontWeight: 600,
                                color: THEME.ink,
                              }}
                            >
                              <Prv>{value}</Prv>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Long-term savings projection */}
                      {totalAnnualSaving > 0 && (
                        <div
                          style={{
                            padding: "14px 16px",
                            borderRadius: 10,
                            background: `color-mix(in srgb, ${THEME.sage} 3%, transparent)`,
                            border: `1px solid ${`color-mix(in srgb, ${THEME.sage} 13%, transparent)`}`,
                            marginBottom: 18,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: THEME.muted,
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.05em",
                              marginBottom: 10,
                            }}
                          >
                            Potential Savings from Switching Regular to Direct (at 12% growth)
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3, 1fr)",
                              gap: 10,
                            }}
                          >
                            {[10, 20, 30].map((yrs) => (
                              <div
                                key={yrs}
                                style={{
                                  textAlign: "center",
                                  padding: "10px 8px",
                                  borderRadius: 8,
                                  background: "var(--surface-0)",
                                  border: `1px solid ${THEME.line}`,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: THEME.muted,
                                    textTransform: "uppercase" as const,
                                    marginBottom: 4,
                                  }}
                                >
                                  {yrs} Years
                                </div>
                                <div
                                  style={{
                                    fontFamily: "var(--font-display)",
                                    fontSize: 16,
                                    fontWeight: 900,
                                    color: THEME.sage,
                                  }}
                                >
                                  <Money value={compoundSaving(totalAnnualSaving, yrs)} variant="full" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Per-fund breakdown */}
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: THEME.muted,
                          textTransform: "uppercase" as const,
                          letterSpacing: "0.05em",
                          marginBottom: 10,
                        }}
                      >
                        Per-Fund Expense Breakdown
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr>
                              {[
                                "Fund",
                                "Value",
                                "Plan",
                                "Type",
                                "Expense %",
                                "Annual Cost",
                                "Savings/yr",
                              ].map((h) => (
                                <th
                                  key={h}
                                  style={{
                                    textAlign: h === "Fund" ? "left" : "right",
                                    padding: "10px 8px",
                                    fontSize: 10,
                                    letterSpacing: "0.1em",
                                    textTransform: "uppercase" as const,
                                    color: THEME.muted,
                                    fontWeight: 700,
                                    borderBottom: `1.5px solid ${THEME.line}`,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {fundAnalysis.map((f: any, idx: number) => (
                              <tr key={idx}>
                                <td
                                  style={{
                                    padding: "10px 8px",
                                    borderBottom: `1px solid ${THEME.line}`,
                                    fontWeight: 600,
                                    maxWidth: 200,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={f.name}
                                >
                                  {f.name.length > 30 ? f.name.slice(0, 30) + "..." : f.name}
                                </td>
                                <td
                                  style={{
                                    padding: "10px 8px",
                                    borderBottom: `1px solid ${THEME.line}`,
                                    textAlign: "right",
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  <Money value={f.currentValue} variant="full" />
                                </td>
                                <td
                                  style={{
                                    padding: "10px 8px",
                                    borderBottom: `1px solid ${THEME.line}`,
                                    textAlign: "right",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: "2px 8px",
                                      borderRadius: 6,
                                      background:
                                        f.planType === "Direct"
                                          ? `color-mix(in srgb, ${THEME.sage} 9%, transparent)`
                                          : `color-mix(in srgb, ${THEME.gold} 9%, transparent)`,
                                      color: f.planType === "Direct" ? THEME.sage : THEME.gold,
                                    }}
                                  >
                                    {f.planType}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    padding: "10px 8px",
                                    borderBottom: `1px solid ${THEME.line}`,
                                    textAlign: "right",
                                    color: THEME.muted,
                                  }}
                                >
                                  {f.assetType}
                                </td>
                                <td
                                  style={{
                                    padding: "10px 8px",
                                    borderBottom: `1px solid ${THEME.line}`,
                                    textAlign: "right",
                                    fontWeight: 700,
                                  }}
                                >
                                  {(f.expenseRatio * 100).toFixed(1)}%
                                </td>
                                <td
                                  style={{
                                    padding: "10px 8px",
                                    borderBottom: `1px solid ${THEME.line}`,
                                    textAlign: "right",
                                    color: THEME.rust,
                                    fontWeight: 700,
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  <Money value={f.annualCost} variant="full" />
                                </td>
                                <td
                                  style={{
                                    padding: "10px 8px",
                                    borderBottom: `1px solid ${THEME.line}`,
                                    textAlign: "right",
                                    color: f.annualSaving > 0 ? THEME.sage : THEME.muted,
                                    fontWeight: 700,
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {f.annualSaving > 0 ? (
                                    <Money value={f.annualSaving} variant="full" />
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {fundAnalysis.length === 0 && (
                        <div
                          style={{
                            textAlign: "center",
                            fontSize: 13,
                            color: THEME.muted,
                            padding: "16px 0",
                          }}
                        >
                          No funds with current value to analyze
                        </div>
                      )}
                    </div>
                  );
                })()}
            </Card>
          )}
            </>
          )}
        </>
      )}
      {editMF && (
        <EditMFModal
          mf={editMF}
          onClose={() => setEditMF(null)}
          onSave={(updated: any) => saveMFEdit(editMF.id, updated)}
          saving={savingMFEdit}
          activeProfile={activeProfile}
        />
      )}
      {confirmDeleteLot && (
        <ConfirmDialog
          message={`Delete this ${confirmDeleteLot.label} lot? This cannot be undone.`}
          onConfirm={() => {
            removeItem("mutualFunds", confirmDeleteLot.lot.id);
            setConfirmDeleteLot(null);
          }}
          onCancel={() => setConfirmDeleteLot(null)}
        />
      )}
      {sellMF && (
        <SellMFModal
          mf={sellMF}
          onClose={() => setSellMF(null)}
          onSave={(sellRecord: any, remainingUnits: number) =>
            saveMFSell(sellMF, sellRecord, remainingUnits)
          }
          saving={savingMFSell}
        />
      )}
      {fifoSellMFGroup && (
        <FifoSellMFModal
          group={fifoSellMFGroup}
          onClose={() => setFifoSellMFGroup(null)}
          onSave={(allocs: any[], sellNav: number, sellDate: string) =>
            saveFifoSell(fifoSellMFGroup, allocs, sellNav, sellDate)
          }
          saving={savingFifoSell}
        />
      )}
      {addLotGroup && (
        <AddLotMFModal
          group={addLotGroup}
          onClose={() => setAddLotGroup(null)}
          onSave={(data: any) => saveAddLot(data)}
          saving={savingAddLot}
        />
      )}
    </div>
  );
}

/* ── Add Lot MF Modal ──────────────────────────────────────────────── */
function AddLotMFModal({ group, onClose, onSave, saving }: any) {
  const ref = group.refLot || {};
  const [f, setF] = useState({
    buyDate: today(),
    buyNav: "",
    units: "",
    invested: "",
  });

  const autoInvested = f.units && f.buyNav ? Number(f.units) * Number(f.buyNav) : null;
  const currentNav = Number(ref.currentNav) || 0;
  const currentValue = f.units && currentNav ? Number(f.units) * currentNav : null;
  const costBasis = f.invested ? Number(f.invested) : autoInvested;
  const pnl = currentValue !== null && costBasis ? currentValue - costBasis : null;
  const pnlPct = pnl !== null && costBasis ? (pnl / costBasis) * 100 : null;

  const handleSave = () => {
    if (!f.units) return;
    const invested = f.invested || (autoInvested ? String(autoInvested) : "");
    if (!invested) return;
    onSave({
      name: group.fundName || ref.name || ref.scheme || "",
      category: ref.category || "Equity",
      mfType: ref.mfType || "Direct Growth",
      folioNumber: group.folio || ref.folioNumber || "",
      mfCode: ref.mfCode || "",
      currentNav: ref.currentNav || "",
      buyDate: f.buyDate,
      buyNav: f.buyNav,
      units: f.units,
      invested,
      owner: ref.owner || "self",
    });
  };

  const fundLabel = group.fundName || "Mutual Fund";

  return (
    <Modal
      title={`Add Lot — ${fundLabel.length > 40 ? fundLabel.slice(0, 40) + "…" : fundLabel}`}
      onClose={onClose}
    >
      {/* Auto-filled info */}
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
          border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 13%, transparent)`}`,
          marginBottom: 16,
          fontSize: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 16px",
        }}
      >
        <span>
          <span style={{ color: THEME.muted }}>Fund: </span>
          <b>{group.fundName}</b>
        </span>
        {group.folio && (
          <span>
            <span style={{ color: THEME.muted }}>Folio: </span>
            <b>{group.folio}</b>
          </span>
        )}
        {ref.category && (
          <span>
            <span style={{ color: THEME.muted }}>Category: </span>
            <b>{ref.category}</b>
          </span>
        )}
        {ref.mfType && (
          <span>
            <span style={{ color: THEME.muted }}>Type: </span>
            <b>{ref.mfType}</b>
          </span>
        )}
        {ref.mfCode && (
          <span>
            <span style={{ color: THEME.muted }}>AMFI: </span>
            <b>{ref.mfCode}</b>
          </span>
        )}
        {currentNav > 0 && (
          <span>
            <span style={{ color: THEME.muted }}>Current NAV: </span>
            <b>
              <Prv>₹{currentNav.toFixed(4)}</Prv>
            </b>
          </span>
        )}
      </div>

      {/* Lot-specific fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Purchase Date">
          <input
            style={inp}
            type="date"
            value={f.buyDate}
            onChange={(e) => setF({ ...f, buyDate: e.target.value })}
          />
        </Field>
        <Field label="Buy NAV (₹ per unit)">
          <input
            style={inp}
            type="number"
            step="0.0001"
            value={f.buyNav}
            onChange={(e) => setF({ ...f, buyNav: e.target.value })}
            placeholder="e.g. 85.5000"
          />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Units *">
          <input
            style={inp}
            type="number"
            step="0.001"
            value={f.units}
            onChange={(e) => setF({ ...f, units: e.target.value })}
            placeholder="e.g. 500.123"
          />
        </Field>
        <Field label="Amount Invested (₹)">
          <input
            style={inp}
            type="number"
            value={f.invested}
            onChange={(e) => setF({ ...f, invested: e.target.value })}
            placeholder={autoInvested ? autoInvested.toFixed(2) : "e.g. 50000"}
          />
        </Field>
      </div>

      {/* Preview */}
      {f.units && (autoInvested || f.invested) && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background:
              pnl !== null && pnl >= 0
                ? `color-mix(in srgb, ${THEME.sage} 10%, transparent)`
                : pnl !== null
                  ? `color-mix(in srgb, ${THEME.rust} 10%, transparent)`
                  : `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
            marginTop: 8,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 12 }}>
            <span>
              <span style={{ color: THEME.muted }}>Invested: </span>
              <b>
                <Prv>
                  ₹
                  {(Number(f.invested) || autoInvested || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Prv>
              </b>
            </span>
            {currentValue !== null && (
              <span>
                <span style={{ color: THEME.muted }}>Current: </span>
                <b style={{ color: THEME.accent }}>
                  <Prv>
                    ₹
                    {currentValue.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Prv>
                </b>
              </span>
            )}
            {pnl !== null && (
              <span>
                <span style={{ color: THEME.muted }}>P&L: </span>
                <b style={{ color: pnl >= 0 ? THEME.sage : THEME.rust }}>
                  <Prv>
                    {pnl >= 0 ? "+" : ""}₹
                    {Math.abs(pnl).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    {pnlPct !== null && ` (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%)`}
                  </Prv>
                </b>
              </span>
            )}
          </div>
        </div>
      )}

      <ModalActions
        onSave={handleSave}
        onClose={onClose}
        saveLabel="Add Lot"
        disabled={saving}
        loading={saving}
      />
    </Modal>
  );
}

/* ── Sell MF Modal ─────────────────────────────────────────────────── */
function SellMFModal({ mf, onClose, onSave, saving }: any) {
  const totalUnits = Number(mf.units) || 0;
  const buyNav = Number(mf.buyNav) || 0;
  const currentNav = Number(mf.currentNav) || 0;
  const [f, setF] = useState({
    sellUnits: String(totalUnits),
    sellNav: currentNav ? String(currentNav.toFixed(4)) : "",
    sellDate: today(),
  });
  const sellUnitsNum = Number(f.sellUnits) || 0;
  const sellNavNum = Number(f.sellNav) || 0;
  const profit = buyNav > 0 ? (sellNavNum - buyNav) * sellUnitsNum : 0;
  const remainingUnits = totalUnits - sellUnitsNum;
  const proceeds = sellUnitsNum * sellNavNum;
  // Anniversary-date-aware (Section 2(42A)) and evaluated against the user-selected
  // sell date (not always "today"), matching CapitalGainsTab.isLongTerm — the previous
  // naive "> 365 days since today" check both ignored a backdated sell date and could
  // disagree with the actual tax report near month/leap-year boundaries.
  const isLTCG = mf.buyDate ? isLongTerm(mf.buyDate, f.sellDate || today(), 12) : false;

  const handleSave = () => {
    if (!sellUnitsNum || !sellNavNum || sellUnitsNum > totalUnits + 0.0001) return;
    const actualSellUnits = Math.abs(sellUnitsNum - totalUnits) <= 0.0001 ? totalUnits : sellUnitsNum;
    const actualRemaining =
      Math.max(0, totalUnits - actualSellUnits) <= 0.0001 ? 0 : totalUnits - actualSellUnits;
    const record = {
      id: `mfs-${Date.now()}`,
      owner: mf.owner || "self",
      scheme: mf.name || mf.scheme || "",
      // Preserved from the live lot so CapitalGainsTab.isEquityMF() can use the
      // user's actual Equity/Debt classification instead of falling back to
      // guessing from the fund name text — a fund like "Axis Bluechip Fund"
      // contains no keyword from CapitalGainsTab's EQUITY_CATEGORIES list and
      // would silently misclassify as Debt (wrong tax rate, wrong LTCG
      // threshold) without this.
      category: mf.category || "",
      units: actualSellUnits,
      buyNav,
      buyDate: mf.buyDate || "",
      sellNav: sellNavNum,
      sellDate: f.sellDate,
      profit: Number((actualSellUnits * (sellNavNum - buyNav)).toFixed(2)),
    };
    onSave(record, actualRemaining);
  };

  return (
    <Modal
      title={`Sell — ${(mf.name || mf.scheme || "Mutual Fund").slice(0, 40)}`}
      onClose={onClose}
    >
      <div style={{ fontSize: 13, color: "var(--t-muted)", marginBottom: 12 }}>
        Holding: <b>{totalUnits.toLocaleString("en-IN", { maximumFractionDigits: 3 })}</b> units
        {buyNav > 0 && (
          <>
            {" "}
            @ buy NAV <Prv>₹{buyNav.toFixed(4)}</Prv>
          </>
        )}
        {mf.buyDate && (
          <>
            {" "}
            · Bought{" "}
            {new Date(mf.buyDate + "T00:00:00").toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "2-digit",
            })}
          </>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Units to Sell">
          <input
            style={inp}
            type="number"
            min="0.001"
            max={totalUnits}
            step="0.001"
            value={f.sellUnits}
            onChange={(e) => setF({ ...f, sellUnits: e.target.value })}
          />
        </Field>
        <Field label="Sell NAV (₹)">
          <input
            style={inp}
            type="number"
            step="0.0001"
            value={f.sellNav}
            onChange={(e) => setF({ ...f, sellNav: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Sell Date">
        <input
          style={inp}
          type="date"
          value={f.sellDate}
          onChange={(e) => setF({ ...f, sellDate: e.target.value })}
        />
      </Field>
      {sellUnitsNum > totalUnits && (
        <div style={{ fontSize: 12, color: THEME.rust, fontWeight: 600, marginTop: 4 }}>
          Cannot sell more than {totalUnits.toLocaleString("en-IN", { maximumFractionDigits: 3 })}{" "}
          units available
        </div>
      )}
      {sellUnitsNum > 0 && sellNavNum > 0 && sellUnitsNum <= totalUnits && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: profit >= 0 ? `color-mix(in srgb, ${THEME.sage} 10%, transparent)` : `color-mix(in srgb, ${THEME.rust} 10%, transparent)`,
            marginTop: 8,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--t-muted)" }}>
              Proceeds:{" "}
              <b>
                <Prv>
                  ₹
                  {proceeds.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Prv>
              </b>
            </span>
            <span style={{ fontSize: 13, color: "var(--t-muted)" }}>
              P&L:{" "}
              <b style={{ color: profit >= 0 ? THEME.sage : THEME.rust }}>
                <Prv>
                  {profit >= 0 ? "+" : ""}₹
                  {Math.abs(profit).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Prv>
              </b>
            </span>
            <span
              style={{
                fontSize: 9,
                padding: "2px 7px",
                borderRadius: 4,
                fontWeight: 800,
                background: isLTCG ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)` : `color-mix(in srgb, ${THEME.gold} 12%, transparent)`,
                color: isLTCG ? THEME.sage : THEME.gold,
              }}
            >
              {isLTCG ? "LTCG" : "STCG"}
            </span>
          </div>
          {remainingUnits > 0 && (
            <div style={{ fontSize: 12, color: "var(--t-muted)", marginTop: 6 }}>
              {remainingUnits.toLocaleString("en-IN", { maximumFractionDigits: 3 })} units remaining
              after sell
            </div>
          )}
        </div>
      )}
      <ModalActions
        onSave={handleSave}
        onClose={onClose}
        saveLabel="Confirm Sell"
        disabled={saving}
        loading={saving}
      />
    </Modal>
  );
}

/* ── Bulk Sell MF Modal ─────────────────────────────────────────────── */
function FifoSellMFModal({ group, onClose, onSave, saving }: any) {
  const lots = group.lots;
  const totalUnits = lots.reduce((s: number, l: any) => s + (Number(l.units) || 0), 0);

  const sortedLots = [...lots].sort((a: any, b: any) => {
    if (!a.buyDate && !b.buyDate) return 0;
    if (!a.buyDate) return 1;
    if (!b.buyDate) return -1;
    return new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime();
  });

  const defaultNav = (() => {
    const navVals = lots.map((l: any) => Number(l.currentNav)).filter((n: number) => n > 0);
    return navVals.length ? Math.max(...navVals) : 0;
  })();

  const [f, setF] = useState({
    sellUnits: String(totalUnits),
    sellNav: defaultNav ? String(defaultNav.toFixed(4)) : "",
    sellDate: today(),
  });

  const sellUnitsNum = Number(f.sellUnits) || 0;
  const sellNavNum = Number(f.sellNav) || 0;
  const qtyOver = sellUnitsNum > totalUnits;

  type MFAlloc = {
    lot: any;
    consume: number;
    buyNav: number;
    pnl: number;
    isLTCG: boolean;
    fullyConsumed: boolean;
  };
  const allocs: MFAlloc[] = (() => {
    if (sellUnitsNum <= 0 || sellNavNum <= 0 || qtyOver) return [];
    const result: MFAlloc[] = [];
    let remaining = Math.abs(sellUnitsNum - totalUnits) <= 0.0001 ? totalUnits : sellUnitsNum;
    const refDateStr = f.sellDate || today();
    for (const lot of sortedLots) {
      if (remaining <= 0.00001) break;
      const available = Number(lot.units) || 0;
      if (available <= 0.00001) continue;
      const isFull = remaining >= available - 0.0001;
      const consume = isFull ? available : Math.min(available, remaining);
      const lotBuyNav = Number(lot.buyNav) || 0;
      // Anniversary-date-aware (Section 2(42A)) and evaluated against the user-selected
      // sell date (not always "today"), matching CapitalGainsTab.isLongTerm.
      const isLTCG = lot.buyDate ? isLongTerm(lot.buyDate, refDateStr, 12) : false;
      result.push({
        lot,
        consume,
        buyNav: lotBuyNav,
        pnl: (sellNavNum - lotBuyNav) * consume,
        isLTCG,
        fullyConsumed: isFull || consume >= available - 0.0001,
      });
      remaining -= consume;
    }
    return result;
  })();

  const totalProceeds = sellUnitsNum * sellNavNum;
  const totalCost = allocs.reduce((s, a) => s + a.consume * a.buyNav, 0);
  const totalPnl = totalProceeds - totalCost;
  const stcgPnl = allocs.filter((a) => !a.isLTCG).reduce((s, a) => s + a.pnl, 0);
  const ltcgPnl = allocs.filter((a) => a.isLTCG).reduce((s, a) => s + a.pnl, 0);
  const remainingAfter = totalUnits - sellUnitsNum;
  const isValid = sellUnitsNum > 0 && sellNavNum > 0 && !qtyOver && !!f.sellDate;

  const fmt2 = (n: number) =>
    Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt4 = (n: number) => Number(n).toFixed(4);

  return (
    <Modal
      title={`Sell ${group.schemeName.length > 35 ? group.schemeName.slice(0, 35) + "…" : group.schemeName}`}
      onClose={onClose}
      maxWidth={720}
    >
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          marginBottom: 16,
          fontSize: 13,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span>
          <span style={{ color: THEME.muted }}>Available: </span>
          <b>{totalUnits.toLocaleString("en-IN", { maximumFractionDigits: 3 })} units</b>
        </span>
        <span>
          <span style={{ color: THEME.muted }}>Lots: </span>
          <b>{lots.length}</b>
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: THEME.muted }}>
          Oldest lot consumed first
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Field label="Units to Sell">
          <input
            style={{ ...inp, borderColor: qtyOver ? THEME.rust : undefined }}
            type="number"
            min="0.001"
            max={totalUnits}
            step="0.001"
            value={f.sellUnits}
            onChange={(e) => setF({ ...f, sellUnits: e.target.value })}
          />
        </Field>
        <Field label="Sell NAV (₹)">
          <input
            style={inp}
            type="number"
            step="0.0001"
            value={f.sellNav}
            onChange={(e) => setF({ ...f, sellNav: e.target.value })}
          />
        </Field>
        <Field label="Sell Date">
          <input
            style={inp}
            type="date"
            value={f.sellDate}
            onChange={(e) => setF({ ...f, sellDate: e.target.value })}
          />
        </Field>
      </div>

      {qtyOver && (
        <div style={{ fontSize: 12, color: THEME.rust, fontWeight: 600, marginBottom: 10 }}>
          Cannot sell more than {totalUnits.toLocaleString("en-IN", { maximumFractionDigits: 3 })}{" "}
          units available
        </div>
      )}

      {allocs.length > 0 && (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: THEME.muted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Lot-wise Allocation
          </div>
          <div
            style={{
              borderRadius: 10,
              border: `1px solid ${THEME.line}`,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            <div style={{ overflowX: "auto" as const }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--surface-0)" }}>
                  {["Buy Date", "Buy NAV", "Available", "Selling", "Cost Basis", "P&L", "Type"].map(
                    (h, i) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 12px",
                          fontSize: 9,
                          fontWeight: 700,
                          color: THEME.muted,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          textAlign: i === 0 ? "left" : i === 6 ? "center" : "right",
                          borderBottom: `1px solid ${THEME.line}`,
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {allocs.map((a, i) => (
                  <tr
                    key={a.lot.id}
                    style={{
                      borderTop: i > 0 ? `1px solid ${THEME.line}` : undefined,
                      background: i % 2 === 0 ? "transparent" : `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
                    }}
                  >
                    <td style={{ padding: "9px 12px" }}>
                      {a.lot.buyDate ? (
                        new Date(a.lot.buyDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })
                      ) : (
                        <span style={{ color: THEME.muted }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "right" }}>
                      <Prv>₹{fmt4(a.buyNav)}</Prv>
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: THEME.muted }}>
                      {Number(a.lot.units).toLocaleString("en-IN", { maximumFractionDigits: 3 })}
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 800 }}>
                      {a.consume.toLocaleString("en-IN", { maximumFractionDigits: 3 })}
                      <span
                        style={{
                          display: "block",
                          fontSize: 8,
                          color: a.fullyConsumed ? THEME.rust : THEME.gold,
                          fontWeight: 700,
                          lineHeight: 1.2,
                        }}
                      >
                        {a.fullyConsumed ? "full lot" : "partial"}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: THEME.muted }}>
                      <Prv>₹{fmt2(a.consume * a.buyNav)}</Prv>
                    </td>
                    <td
                      style={{
                        padding: "9px 12px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: a.pnl >= 0 ? THEME.sage : THEME.rust,
                      }}
                    >
                      <Prv>
                        {a.pnl >= 0 ? "+" : "−"}₹{fmt2(Math.abs(a.pnl))}
                      </Prv>
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 7px",
                          borderRadius: 4,
                          fontWeight: 800,
                          background: a.isLTCG ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)` : `color-mix(in srgb, ${THEME.gold} 12%, transparent)`,
                          color: a.isLTCG ? THEME.sage : THEME.gold,
                        }}
                      >
                        {a.isLTCG ? "LTCG" : "STCG"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Summary card */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 10,
              background: totalPnl >= 0 ? `color-mix(in srgb, ${THEME.sage} 7%, transparent)` : `color-mix(in srgb, ${THEME.rust} 7%, transparent)`,
              border: `1px solid ${totalPnl >= 0 ? `color-mix(in srgb, ${THEME.sage} 33%, transparent)` : `color-mix(in srgb, ${THEME.rust} 33%, transparent)`}`,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 3 }}>
                  Total Proceeds
                </div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>
                  <Prv>₹{fmt2(totalProceeds)}</Prv>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 3 }}>Cost Basis</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: THEME.muted }}>
                  <Prv>₹{fmt2(totalCost)}</Prv>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 3 }}>Net P&L</div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: totalPnl >= 0 ? THEME.sage : THEME.rust,
                  }}
                >
                  <Prv>
                    {totalPnl >= 0 ? "+" : "−"}₹{fmt2(Math.abs(totalPnl))}
                  </Prv>
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                paddingTop: 10,
                borderTop: `1px solid ${`color-mix(in srgb, ${THEME.line} 25%, transparent)`}`,
                flexWrap: "wrap",
              }}
            >
              {stcgPnl !== 0 && (
                <span style={{ fontSize: 12 }}>
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: 4,
                      fontSize: 9,
                      fontWeight: 800,
                      background: `color-mix(in srgb, ${THEME.gold} 12%, transparent)`,
                      color: THEME.gold,
                      marginRight: 6,
                    }}
                  >
                    STCG
                  </span>
                  <b style={{ color: stcgPnl >= 0 ? THEME.sage : THEME.rust }}>
                    <Prv>
                      {stcgPnl >= 0 ? "+" : "−"}₹{fmt2(Math.abs(stcgPnl))}
                    </Prv>
                  </b>
                </span>
              )}
              {ltcgPnl !== 0 && (
                <span style={{ fontSize: 12 }}>
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: 4,
                      fontSize: 9,
                      fontWeight: 800,
                      background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                      color: THEME.sage,
                      marginRight: 6,
                    }}
                  >
                    LTCG
                  </span>
                  <b style={{ color: ltcgPnl >= 0 ? THEME.sage : THEME.rust }}>
                    <Prv>
                      {ltcgPnl >= 0 ? "+" : "−"}₹{fmt2(Math.abs(ltcgPnl))}
                    </Prv>
                  </b>
                </span>
              )}
              {remainingAfter > 0 && (
                <span style={{ fontSize: 12, marginLeft: "auto" }}>
                  <span style={{ color: THEME.muted }}>Remaining: </span>
                  <b>
                    {remainingAfter.toLocaleString("en-IN", { maximumFractionDigits: 3 })} units
                  </b>
                </span>
              )}
            </div>
          </div>
        </>
      )}

      <ModalActions
        onSave={() => isValid && onSave(allocs, sellNavNum, f.sellDate)}
        onClose={onClose}
        saveLabel="Confirm Sell"
        disabled={!isValid || allocs.length === 0 || saving}
        loading={saving}
      />
    </Modal>
  );
}

/* ── Dividend Tracker: Modularized in src/components/investments/DividendsSection.tsx ── */

/* ── Yield Tracker ──────────────────────────────────────────────────── */
const YieldTracker = ({ state }: any) => {
  const PPF_RATE = 7.1;
  const EPF_RATE = 8.25;
  const RD_NOTE = "based on current interest rate";

  const [activeCategory, setActiveCategory] = useState<"all" | "cash" | "retirement">("all");

  // 1. FD: only count active (non-matured) FDs — compound quarterly (Indian banking standard)
  const activeFds = (state.fixedDeposits || []).filter((f: any) => {
    if (isFdMatured(f)) return false;
    return (Number(f.principal) || 0) > 0;
  });
  const fdPrincipal = activeFds.reduce((s: number, f: any) => s + (Number(f.principal) || 0), 0);
  const fdInterest = activeFds.reduce((s: number, f: any) => {
    const principal = Number(f.principal || 0);
    const rate = Number(f.rate || 0);
    if (principal <= 0 || rate <= 0) return s;
    return s + (fdMaturity(principal, rate, 1) - principal);
  }, 0);
  const fdEffectiveRate = fdPrincipal > 0 ? (fdInterest / fdPrincipal) * 100 : 0;

  // 2. Bond coupon — only active (non-matured) bonds
  const activeBonds = (state.bonds || []).filter((b: any) => !isBondMatured(b));
  const bondPrincipal = activeBonds.reduce((s: number, b: any) => {
    return (
      s +
      (Number(b?.totalPrincipalAmount || 0) ||
        Number(b?.numberOfUnits || 0) * Number(b?.faceValuePerUnit || 0) ||
        Number(b?.totalInvestmentAmount || 0) ||
        Number(b?.faceValue || 0))
    );
  }, 0);
  const bondInterest = activeBonds.reduce((s: number, b: any) => s + bondAnnualCoupon(b), 0);
  const bondEffectiveRate = bondPrincipal > 0 ? (bondInterest / bondPrincipal) * 100 : 0;

  // 3. RD: interest = maturityValue - deposited (annualised) — only active (non-matured) RDs
  const activeRds = (state.recurringDeposits || []).filter((r: any) => {
    const tenureMonths = Number(r.tenureMonths) || 0;
    if (!tenureMonths) return false;
    if (r.maturityDate && r.maturityDate < today()) return false;
    if (r.startDate && addMonthsToDateStr(r.startDate, tenureMonths) < today()) return false;
    return (Number(r.monthly) || 0) > 0;
  });
  const rdDepositedPrincipal = activeRds.reduce((s: number, r: any) => {
    const tenureMonths = Number(r.tenureMonths) || 0;
    return s + (Number(r.monthly) || 0) * tenureMonths;
  }, 0);
  const rdInterest = activeRds.reduce((s: number, r: any) => {
    const tenureMonths = Number(r.tenureMonths) || 0;
    const monthly = Number(r.monthly) || 0;
    const rate = Number(r.rate) || 0;
    if (!tenureMonths || !monthly || !rate) return s;
    const fullMaturity = rdMaturity(monthly, rate, tenureMonths);
    const fullDeposited = monthly * tenureMonths;
    const annualisedInterest = (fullMaturity - fullDeposited) / (tenureMonths / 12);
    return s + Math.max(0, annualisedInterest);
  }, 0);
  const rdEffectiveRate = rdDepositedPrincipal > 0 ? (rdInterest / rdDepositedPrincipal) * 100 : 0;

  // 4. PPF: balance × 7.10% (support both manual balance and ledger deposit/withdrawal history)
  const ppfPrincipal = (state.ppf || []).reduce((s: number, p: any) => {
    const manualBalance = Number(p.balance) || 0;
    if (manualBalance > 0) return s + manualBalance;
    const txs = p.transactions || [];
    if (txs.length > 0) {
      const deposits = txs
        .filter((t: any) => t.type === "deposit")
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const withdrawals = txs
        .filter((t: any) => t.type === "withdrawal")
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      return s + Math.max(0, deposits - withdrawals);
    }
    return s;
  }, 0);
  const ppfInterest = (ppfPrincipal * PPF_RATE) / 100;

  // 5. EPF: balance × 8.25% (statutory EPFO rate)
  const epfPrincipal = (state.epf || []).reduce((s: number, e: any) => s + calculateEpfBalance(e), 0);
  const epfInterest = (epfPrincipal * EPF_RATE) / 100;

  // 6. Government Schemes: SCSS (8.2%), Post Office MIS (7.4%), SSY (8.2%), NSC (7.7%), KVP (7.5%), RBI Bonds (8.05%)
  const govtRates: Record<string, number> = {
    SSY: 8.2,
    SCSS: 8.2,
    NSC: 7.7,
    KVP: 7.5,
    POST_MIS: 7.4,
    RBI_BOND: 8.05,
    NPS_LITE: 7.0,
  };
  const activeGovtSchemes = (state.govtSchemes || []).filter((sc: any) => {
    if (sc.maturityDate && sc.maturityDate < today()) return false;
    return (Number(sc.currentBalance || sc.principal || sc.investedAmount) || 0) > 0;
  });
  const govtPrincipal = activeGovtSchemes.reduce(
    (s: number, sc: any) =>
      s + (Number(sc.currentBalance || sc.principal || sc.investedAmount) || 0),
    0
  );
  const govtInterest = activeGovtSchemes.reduce((s: number, sc: any) => {
    const rate = Number(sc.interestRate) || govtRates[sc.schemeType] || 7.5;
    const balance = Number(sc.currentBalance || sc.principal || sc.investedAmount) || 0;
    return s + (balance * rate) / 100;
  }, 0);
  const govtEffectiveRate = govtPrincipal > 0 ? (govtInterest / govtPrincipal) * 100 : 0;

  // 7. Dividends: Trailing 12 months net of TDS
  const oneYearAgoStr = (() => {
    const [y, m, d] = today().split("-").map(Number);
    return `${y - 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  })();
  const dividendYield = (state.dividends || []).reduce((s: number, d: any) => {
    if (!d.paymentDate || d.paymentDate < oneYearAgoStr) return s;
    return s + Math.max(0, (Number(d.amount) || 0) - (Number(d.tds) || 0));
  }, 0);
  const stockPortfolioVal = (state.stocks || []).reduce((s: number, st: any) => {
    const qty = Number(st.shares || st.quantity || st.units || 0);
    const price = Number(st.currentPrice || st.cmp || st.buyPrice || st.avgBuyPrice || 0);
    return s + (qty * price || Number(st.invested || 0));
  }, 0);
  const dividendEffectiveRate =
    stockPortfolioVal > 0 ? (dividendYield / stockPortfolioVal) * 100 : 0;

  // 8. NPS: ~10% annual growth estimate (mixed equity/debt hybrid corpus)
  const npsCorpus = (state.nps || []).reduce((s: number, n: any) => {
    const bal = Number(n.balance) || 0;
    if (bal > 0) return s + bal;
    const txCorpus = (n.transactions || []).reduce(
      (sum: number, t: any) =>
        sum + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
      0
    );
    return s + txCorpus;
  }, 0);
  const npsGrowth = (npsCorpus * 10) / 100;

  // Streams list with classification
  const allStreams = [
    {
      id: "fd",
      label: "Fixed Deposits",
      category: "cash" as const,
      value: fdInterest,
      capital: fdPrincipal,
      rateBadge: fdEffectiveRate > 0 ? `${fdEffectiveRate.toFixed(2)}% effective` : `Quart. Comp.`,
      count: activeFds.length,
      color: THEME.gold,
      icon: Coins,
      note: "Annual interest on active FDs (quarterly compounding)",
    },
    {
      id: "bond",
      label: "Bonds & Debentures",
      category: "cash" as const,
      value: bondInterest,
      capital: bondPrincipal,
      rateBadge: bondEffectiveRate > 0 ? `${bondEffectiveRate.toFixed(2)}% coupon` : `Fixed Coupon`,
      count: activeBonds.length,
      color: THEME.muted,
      icon: FileText,
      note: "Contractual annual coupon payout on face value",
    },
    {
      id: "govt",
      label: "Govt / Post Office Schemes",
      category: "cash" as const,
      value: govtInterest,
      capital: govtPrincipal,
      rateBadge: govtEffectiveRate > 0 ? `${govtEffectiveRate.toFixed(2)}% p.a.` : "7.40–8.20%",
      count: activeGovtSchemes.length,
      color: THEME.cyan,
      icon: Target,
      note: "SCSS, Post Office MIS, SSY, NSC & RBI Bonds",
    },
    {
      id: "rd",
      label: "Recurring Deposits",
      category: "cash" as const,
      value: rdInterest,
      capital: rdDepositedPrincipal,
      rateBadge: rdEffectiveRate > 0 ? `${rdEffectiveRate.toFixed(2)}% p.a.` : "Annualised",
      count: activeRds.length,
      color: THEME.accent,
      icon: Repeat,
      note: "Annualised interest across active RD contracts",
    },
    {
      id: "dividends",
      label: "Dividends (TTM)",
      category: "cash" as const,
      value: dividendYield,
      capital: stockPortfolioVal,
      rateBadge:
        dividendEffectiveRate > 0
          ? `${dividendEffectiveRate.toFixed(2)}% div yield`
          : "Net of TDS",
      count: (state.dividends || []).filter(
        (d: any) => d.paymentDate && d.paymentDate >= oneYearAgoStr
      ).length,
      color: THEME.rust,
      icon: IndianRupee,
      note: "Trailing 12-month net dividend receipts logged",
    },
    {
      id: "epf",
      label: "EPF / EPFO",
      category: "retirement" as const,
      value: epfInterest,
      capital: epfPrincipal,
      rateBadge: `@ ${EPF_RATE}% p.a.`,
      count: (state.epf || []).length,
      color: THEME.sage,
      icon: Shield,
      note: "Declared statutory interest on cumulative EPF balance",
    },
    {
      id: "ppf",
      label: "PPF (Public Provident)",
      category: "retirement" as const,
      value: ppfInterest,
      capital: ppfPrincipal,
      rateBadge: `@ ${PPF_RATE}% p.a.`,
      count: (state.ppf || []).length,
      color: THEME.sage,
      icon: Shield,
      note: "Tax-free compound interest on PPF balance",
    },
    {
      id: "nps",
      label: "NPS Growth (Est.)",
      category: "retirement" as const,
      value: npsGrowth,
      capital: npsCorpus,
      rateBadge: "~10.0% CAGR",
      count: (state.nps || []).length,
      color: THEME.violet,
      icon: Briefcase,
      note: "Blended market CAGR projection — capital appreciation, not cash payout",
      isEstimate: true,
    },
  ].filter((s) => s.value > 0);

  const filteredStreams = allStreams.filter((s) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "cash") return s.category === "cash";
    if (activeCategory === "retirement") return s.category === "retirement";
    return true;
  });

  const contractualAnnual = allStreams
    .filter((s) => !s.isEstimate)
    .reduce((s, x) => s + x.value, 0);
  const estimatedAnnual = allStreams.filter((s) => s.isEstimate).reduce((s, x) => s + x.value, 0);
  const totalAnnual = contractualAnnual + estimatedAnnual;
  const totalMonthly = totalAnnual / 12;
  const totalDaily = totalAnnual / 365;

  const contractualCapital = allStreams
    .filter((s) => !s.isEstimate)
    .reduce((s, x) => s + x.capital, 0);
  const totalCapital = allStreams.reduce((s, x) => s + x.capital, 0);
  const weightedYieldRate =
    contractualCapital > 0 ? (contractualAnnual / contractualCapital) * 100 : 0;

  const maxVal = Math.max(...filteredStreams.map((s) => s.value), 1);

  return (
    <div className="animate-fade-in-up">
      {/* Top stat tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Annual Yield",
            value: fmtINRFull(totalAnnual),
            numericValue: totalAnnual,
            formatValue: fmtINRFull,
            sub:
              estimatedAnnual > 0 ? (
                <>
                  {fmtINRFull(contractualAnnual)} contractual + {fmtINRFull(estimatedAnnual)} est.
                </>
              ) : (
                "Combined interest, coupons & dividends"
              ),
            color: THEME.accent,
            Icon: IndianRupee,
          },
          {
            label: "Weighted Yield Rate",
            value: `${weightedYieldRate > 0 ? weightedYieldRate.toFixed(2) : "0.00"}% p.a.`,
            numericValue: weightedYieldRate,
            formatValue: (n: number) => `${n.toFixed(2)}% p.a.`,
            sub: `On ${fmtINRFull(contractualCapital)} active capital`,
            color: THEME.gold,
            Icon: Activity,
          },
          {
            label: "Monthly Income",
            value: fmtINRFull(totalMonthly),
            numericValue: totalMonthly,
            formatValue: fmtINRFull,
            sub: "Average cash flow / month",
            color: THEME.sage,
            Icon: Receipt,
          },
          {
            label: "Daily Passive",
            value: fmtINRFull(totalDaily),
            numericValue: totalDaily,
            formatValue: fmtINRFull,
            sub: "₹ earned per day",
            color: THEME.accent,
            Icon: Zap,
          },
          {
            label: "Capital Deployed",
            value: fmtINRFull(totalCapital),
            numericValue: totalCapital,
            formatValue: fmtINRFull,
            sub: `${allStreams.length} active yielding streams`,
            color: THEME.muted,
            Icon: Target,
          },
        ].map(({ label, value, numericValue, formatValue, sub, color, Icon }) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            numericValue={numericValue}
            formatValue={formatValue}
            icon={<Icon />}
            color={color}
            sub={sub}
          />
        ))}
      </div>

      {allStreams.length === 0 ? (
        <Card style={{ padding: "48px 32px", textAlign: "center" as const }}>
          <PiggyBank size={48} color={THEME.muted} style={{ margin: "0 auto 16px" }} />
          <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
            No Yield Data Yet
          </div>
          <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 360, margin: "0 auto" }}>
            Add Fixed Deposits, Bonds, PPF, EPF, Recurring Deposits, Govt Schemes, NPS or Dividends
            to track your automated income stream breakdown here.
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 24 }}>
          {/* Header and Category Pills */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                }}
              >
                Yield Breakdown by Instrument
              </div>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                Accounting audit of active cash flows and compounding interest
              </div>
            </div>

            {/* Filter Pills */}
            <div
              style={{
                display: "flex",
                gap: 6,
                background: "var(--surface-1)",
                padding: 4,
                borderRadius: 10,
                border: `1px solid ${THEME.line}`,
              }}
            >
              {[
                { id: "all", label: `All Streams (${allStreams.length})` },
                {
                  id: "cash",
                  label: `Cash Flow (${allStreams.filter((s) => s.category === "cash").length})`,
                },
                {
                  id: "retirement",
                  label: `Retirement & Compounding (${
                    allStreams.filter((s) => s.category === "retirement").length
                  })`,
                },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setActiveCategory(pill.id as any)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 8,
                    border: "none",
                    fontSize: 11,
                    fontWeight: activeCategory === pill.id ? 700 : 500,
                    background: activeCategory === pill.id ? THEME.accent : "transparent",
                    color: activeCategory === pill.id ? "#ffffff" : THEME.muted,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Breakdown List */}
          <div style={{ display: "grid", gap: 14 }}>
            {filteredStreams.map(
              ({ label, value, capital, rateBadge, color, icon: Icon, note, isEstimate }) => {
                const barPct = (value / maxVal) * 100;
                const sharePct = totalAnnual > 0 ? (value / totalAnnual) * 100 : 0;
                return (
                  <div
                    key={label}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "var(--surface-1)",
                      border: `1px solid ${THEME.line}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: `color-mix(in srgb, ${color} 14%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
                          }}
                        >
                          <Icon size={16} color={color} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                              {label}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: 6,
                                background: `color-mix(in srgb, ${color} 12%, transparent)`,
                                color,
                              }}
                            >
                              {rateBadge}
                            </span>
                            {isEstimate && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  padding: "1px 5px",
                                  borderRadius: 4,
                                  background: `color-mix(in srgb, ${THEME.violet} 12%, transparent)`,
                                  color: THEME.violet,
                                }}
                              >
                                Projection
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                            {note}{" "}
                            {capital > 0 && (
                              <span style={{ opacity: 0.85 }}>
                                • Capital: <Money value={capital} variant="full" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" as const }}>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 15,
                            fontWeight: 900,
                            color,
                          }}
                        >
                          <Money value={value} variant="full" />
                          <span style={{ fontSize: 10, fontWeight: 500, color: THEME.muted }}>
                            {" "}
                            /yr
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                          {sharePct.toFixed(1)}% of yield
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 4,
                        background: `color-mix(in srgb, ${color} 10%, transparent)`,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${barPct}%`,
                          background: color,
                          borderRadius: 4,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {/* Bottom Totals Bar */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: `2px solid ${THEME.line}`,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  marginBottom: 2,
                }}
              >
                Contractual Cash Flow
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  fontWeight: 700,
                  color: THEME.ink,
                }}
              >
                <Money value={contractualAnnual} variant="full" />
              </div>
              <div style={{ fontSize: 10, color: THEME.muted }}>Guaranteed / declared cash</div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 10,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  marginBottom: 2,
                }}
              >
                Total Annual Yield
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 800,
                  color: THEME.accent,
                }}
              >
                <Money value={totalAnnual} variant="full" />
              </div>
              <div style={{ fontSize: 10, color: THEME.muted }}>Inclusive of NPS CAGR est.</div>
            </div>

            <div style={{ textAlign: "right" as const }}>
              <div
                style={{
                  fontSize: 10,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  marginBottom: 2,
                }}
              >
                Monthly Run-Rate
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  fontWeight: 700,
                  color: THEME.sage,
                }}
              >
                <Money value={totalMonthly} variant="full" />
              </div>
              <div style={{ fontSize: 10, color: THEME.muted }}>
                ~<Money value={totalDaily} variant="full" /> / day
              </div>
            </div>
          </div>

          {/* Audit & Accounting Standards Reference Note */}
          <div
            style={{
              marginTop: 18,
              padding: "12px 16px",
              borderRadius: 10,
              background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
              border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 15%, transparent)`}`,
              fontSize: 11,
              color: THEME.muted,
              lineHeight: 1.6,
            }}
          >
            <b style={{ color: THEME.ink }}>Accounting & Regulatory Audit Notes:</b>
            <ul style={{ margin: "4px 0 0 0", paddingLeft: 18 }}>
              <li>
                <b>FD:</b> Computed using Indian banking standard quarterly compounding (A = P × (1
                + r/400)⁴ⁿ). Only active, non-matured deposits are counted.
              </li>
              <li>
                <b>Bonds:</b> Annual coupon computed on active face value / principal.
              </li>
              <li>
                <b>Govt Schemes:</b> Includes SCSS (8.2%), Post Office MIS (7.4%), SSY (8.2%), NSC
                (7.7%), and RBI Floating Rate Bonds (8.05%).
              </li>
              <li>
                <b>PPF & EPF:</b> PPF compounded @ {PPF_RATE}% p.a. (Section 80C exempt). EPF
                accrued @ {EPF_RATE}% p.a. declared EPFO rate.
              </li>
              <li>
                <b>Dividends:</b> Net of TDS trailing 12-month actual cash receipts.
              </li>
              <li>
                <b>NPS:</b> Marked at ~10% blended benchmark CAGR (wealth accumulation, non-cash
                distribution).
              </li>
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
};
