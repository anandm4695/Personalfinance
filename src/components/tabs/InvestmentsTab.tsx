// @ts-nocheck
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
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { MFCasPanel } from "./MFCasPanel";
// Shared with CapitalGainsTab so LTCG/STCG shown here always agrees with the actual tax
// report — see the isLongTerm doc comment there for the Section 2(42A) anniversary-date
// rules (day-of-month aware, strict >, not a naive "> 365 days" count).
import { isLongTerm } from "./CapitalGainsTab";

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

const bondAnnualCoupon = (b: any): number => {
  const principal =
    Number(b?.totalPrincipalAmount || 0) ||
    Number(b?.numberOfUnits || 0) * Number(b?.faceValuePerUnit || 0);
  return (principal * (Number(b?.coupon) || 0)) / 100;
};

const bondCurrentValue = (b: any): number => {
  const principal = Number(b?.totalInvestmentAmount || b?.totalPrincipalAmount || b?.faceValue) || 0;
  const annualCoupon = bondAnnualCoupon(b);
  if (!b?.orderDate || annualCoupon <= 0) return principal;
  const fullTermYears = b?.maturityDate ? monthsBetween(b.orderDate, b.maturityDate) / 12 : Infinity;
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
  const p = familyProfiles.find((x) => x.id === owner);
  if (!p) return null;
  return (
    <Badge variant="accent" style={{ fontSize: 10 }}>
      {p.name}
    </Badge>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   ADD INVESTMENT MODAL
══════════════════════════════════════════════════════════════════════ */
const AddInvestmentModal = ({ sub, onClose, onSave, activeProfile = "all" }: any) => {
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
              placeholder="e.g. SBI, HDFC Bank"
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
                step="0.1"
              />
            </Field>
            <Field label="Tenure (Years)">
              <input
                style={inp}
                type="number"
                value={fd.years}
                onChange={(e) => setFdField("years", e.target.value)}
                placeholder="2"
                step="0.5"
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
          <Field label="Maturity Date">
            <input
              style={inp}
              type="date"
              value={fd.maturityDate}
              onChange={(e) => setFdField("maturityDate", e.target.value)}
            />
          </Field>
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
              <span style={{ fontWeight: 900, color: THEME.gold, fontSize: 15 }}>
                <Prv>{fmtINRFull(fdMaturity(Number(fd.principal), Number(fd.rate), Number(fd.years)))}</Prv>
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
                    ["Total Principal", fmtINRFull(totalPrincipal)],
                    ["Total Accrued Interest", fmtINRFull(totalAccrued)],
                    ["Total Consideration", fmtINRFull(totalConsideration)],
                    ["Total Investment", fmtINRFull(totalInvestment)],
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
                      <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                        <Prv>{val}</Prv>
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
                        <Prv>{fmtINRFull(autoInvested)}</Prv>
                      </div>
                    </div>
                  )}
                  {currentValue && (
                    <div>
                      <div style={{ fontSize: 10, color: THEME.muted }}>Current Value</div>
                      <div style={{ fontWeight: 800, color: THEME.accent, fontSize: 13 }}>
                        <Prv>{fmtINRFull(currentValue)}</Prv>
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

  const handleSave = (key: string, data: any) => {
    addItem(key, data);
    setShowModal(false);
  };

  const canAdd = sub !== "income" && sub !== "dividends";

  // ── Portfolio Calculation Helpers ──────────────────────────────────────
  // FD accrued value: use elapsed years not full tenure (shows real current worth)
  const fdCurrentValue = (x: any) => {
    const principal = Number(x.principal) || 0;
    const rate = Number(x.rate) || 0;
    const years = Number(x.years) || 0;
    if (!years || !principal) return principal;
    // If already matured, return full maturity value
    if (x.maturityDate) {
      const [y, m, d] = String(x.maturityDate).split("-").map(Number);
      if (new Date(y, m - 1, d) <= new Date()) return fdMaturity(principal, rate, years);
    }
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
          <FDSection
            items={state.fixedDeposits}
            removeItem={removeItem}
            updateItem={updateItem}
            onAdd={onAdd}
          />
        );
      case "rd":
        return (
          <RDSection
            items={state.recurringDeposits}
            removeItem={removeItem}
            updateItem={updateItem}
            onAdd={onAdd}
          />
        );
      case "bond":
        return (
          <BondSection
            items={state.bonds}
            removeItem={removeItem}
            updateItem={updateItem}
            onAdd={onAdd}
          />
        );
      case "ppf":
        return (
          <PPFSection
            items={state.ppf}
            removeItem={removeItem}
            updateItem={updateItem}
            onAdd={onAdd}
          />
        );
      case "nps":
        return (
          <NPSSection
            items={state.nps}
            removeItem={removeItem}
            updateItem={updateItem}
            onAdd={onAdd}
          />
        );
      case "epf":
        return (
          <EPFSection
            items={state.epf || []}
            removeItem={removeItem}
            updateItem={updateItem}
            onAdd={onAdd}
          />
        );
      case "mf":
        return (
          <MFSection
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
          />
        );
      case "dividends":
        return <DividendTracker state={state} addItem={addItem} removeItem={removeItem} />;
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
            value: <Prv>{fmtINRFull(totalPrincipal)}</Prv>,
            color: THEME.accent,
            Icon: IndianRupee,
          },
          {
            label: "Current Value",
            value: <Prv>{fmtINRFull(totalCurrent)}</Prv>,
            color: THEME.sage,
            Icon: TrendingUp,
          },
          {
            label: "Net Returns",
            value: (
              <Prv>{`${netGain >= 0 ? "+" : "-"}${fmtINRFull(Math.abs(netGain))}`}</Prv>
            ),
            color: netGain >= 0 ? THEME.sage : THEME.rust,
            Icon: netGain >= 0 ? TrendingUp : TrendingDown,
          },
          {
            label: "Return %",
            value: `${netGain >= 0 ? "+" : "-"}${Math.abs(gainPct).toFixed(1)}%`,
            color: netGain >= 0 ? THEME.sage : THEME.rust,
            Icon: Activity,
          },
          {
            label: "Instruments",
            value: String(
              subs.filter((s) => s.id !== "income").reduce((sum, s) => sum + (s.count ?? 0), 0)
            ),
            color: THEME.muted,
            Icon: BarChart3,
          },
        ].map(({ label, value, color, Icon }) => (
          <div
            key={label}
            className="card-lift"
            style={{
              background:
                "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 15%, var(--surface-0)) 100%)",
              border: `1.5px solid ${THEME.line}`,
              borderTop: `4px solid ${color}`,
              borderRadius: 16,
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow:
                "0 4px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 color-mix(in srgb, var(--t-ink) 4%, transparent)",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: `linear-gradient(135deg, color-mix(in srgb, ${color} 15%, transparent) 0%, color-mix(in srgb, ${color} 8%, transparent) 100%)`,
                  border: `1.5px solid color-mix(in srgb, ${color} 25%, transparent)`,
                  boxShadow: `0 2px 8px color-mix(in srgb, ${color} 8%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color,
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: THEME.muted,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.1em",
                  }}
                >
                  {label}
                </div>
              </div>
              {label === "Return %" && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 20,
                    background:
                      netGain >= 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                    color: netGain >= 0 ? THEME.sage : THEME.rust,
                    marginLeft: "auto",
                    letterSpacing: "0.02em",
                  }}
                >
                  {netGain >= 0 ? "▲ GAIN" : "▼ LOSS"}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: THEME.ink,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {value}
            </div>
          </div>
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
                    ? `linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, ${THEME.accent} 85%, #000) 100%)`
                    : "transparent",
                  color: active ? THEME.darkInk : THEME.muted,
                  fontWeight: active ? 800 : 600,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: active
                    ? `0 4px 12px color-mix(in srgb, ${THEME.accent} 30%, transparent)`
                    : "none",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon size={14} style={{ color: active ? THEME.darkInk : THEME.muted }} />
                {s.label}
                {s.count !== undefined && s.count > 0 && (
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 800,
                      background: active
                        ? "rgba(255, 255, 255, 0.25)"
                        : `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                      color: active ? THEME.darkInk : THEME.accent,
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
        />
      )}
    </div>
  );
};

/* ── Edit Bond Modal ────────────────────────────────────────────────── */
function EditBondModal({ bond: initial, onClose, onSave }: any) {
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
            ["Total Principal", fmtINRFull(totalPrincipal)],
            ["Total Accrued Interest", fmtINRFull(totalAccrued)],
            ["Total Consideration", fmtINRFull(totalConsideration)],
            ["Total Investment", fmtINRFull(totalInvestment)],
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
              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                <Prv>{val}</Prv>
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
      <ModalActions onSave={handleSave} onClose={onClose} saveLabel="Save Changes" />
    </Modal>
  );
}

/* ── Edit FD Modal ───────────────────────────────────────────────────── */
function EditFDModal({ fd: initial, onClose, onSave }: any) {
  const [form, setForm] = useState({
    bank: initial.bank || "",
    principal: initial.principal != null ? String(initial.principal) : "",
    rate: initial.rate != null ? String(initial.rate) : "",
    years: initial.years != null ? String(initial.years) : "",
    startDate: initial.startDate || today(),
    maturityDate: initial.maturityDate || "",
  });

  const calcMaturity = (sd: string, yrs: string) => {
    if (!sd || !yrs || isNaN(Number(yrs))) return "";
    // Bug fix: see calcFdMaturity in AddInvestmentModal — the old setMonth+toISOString round
    // trip both overflowed day-of-month (31 Jan + 1mo → March) and was UTC-timezone-fragile.
    return addMonthsToDateStr(sd, Math.round(Number(yrs) * 12));
  };
  const setField = (field: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "startDate" || field === "years") {
        const sd = field === "startDate" ? value : prev.startDate;
        const yrs = field === "years" ? value : prev.years;
        next.maturityDate = calcMaturity(sd, yrs);
      }
      return next;
    });
  };

  const maturity = fdMaturity(Number(form.principal), Number(form.rate), Number(form.years));

  return (
    <Modal title="Edit Fixed Deposit" onClose={onClose}>
      <Field label="Bank / Institution">
        <input
          style={inp}
          value={form.bank}
          onChange={(e) => setField("bank", e.target.value)}
          placeholder="e.g. SBI, HDFC Bank"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Principal Amount (₹)">
          <input
            style={inp}
            type="number"
            value={form.principal}
            onChange={(e) => setField("principal", e.target.value)}
            placeholder="500000"
          />
        </Field>
        <Field label="Interest Rate (% p.a.)">
          <input
            style={inp}
            type="number"
            value={form.rate}
            onChange={(e) => setField("rate", e.target.value)}
            placeholder="7.5"
            step="0.1"
          />
        </Field>
        <Field label="Tenure (Years)">
          <input
            style={inp}
            type="number"
            value={form.years}
            onChange={(e) => setField("years", e.target.value)}
            placeholder="2"
            step="0.5"
          />
        </Field>
        <Field label="Start Date">
          <input
            style={inp}
            type="date"
            value={form.startDate}
            onChange={(e) => setField("startDate", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Maturity Date">
        <input
          style={inp}
          type="date"
          value={form.maturityDate}
          onChange={(e) => setField("maturityDate", e.target.value)}
        />
      </Field>
      {form.principal && form.rate && form.years && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: `color-mix(in srgb, ${THEME.gold} 7%, transparent)`,
            border: `1px solid ${`color-mix(in srgb, ${THEME.gold} 25%, transparent)`}`,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11, color: THEME.muted }}>Maturity Value</span>
          <span style={{ fontWeight: 900, color: THEME.gold, fontSize: 15 }}>
            <Prv>{fmtINRFull(maturity)}</Prv>
          </span>
        </div>
      )}
      <ModalActions
        onSave={() => form.bank && form.principal && form.rate && onSave(form)}
        onClose={onClose}
        saveLabel="Save Changes"
      />
    </Modal>
  );
}

/* ── Edit RD Modal ───────────────────────────────────────────────────── */
function EditRDModal({ rd: initial, onClose, onSave }: any) {
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
          <span style={{ fontWeight: 900, color: THEME.cyan, fontSize: 15 }}>
            <Prv>{fmtINRFull(maturity)}</Prv>
          </span>
        </div>
      )}
      <ModalActions
        onSave={() => form.bank && form.monthly && form.rate && onSave(form)}
        onClose={onClose}
        saveLabel="Save Changes"
      />
    </Modal>
  );
}

/* ── Edit MF Modal ────────────────────────────────────────────────────── */
function EditMFModal({ mf: initial, onClose, onSave, activeProfile = "all" }: any) {
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
              <Prv>{fmtINRFull(costBasis)}</Prv>
            </div>
          </div>
          {currentValue > 0 && (
            <div>
              <div style={{ fontSize: 10, color: THEME.muted }}>Current Value</div>
              <div style={{ fontWeight: 800, color: THEME.accent, fontSize: 13 }}>
                <Prv>{fmtINRFull(currentValue)}</Prv>
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
      />
    </Modal>
  );
}

/* ── Edit NPS Modal ────────────────────────────────────────────────────── */
function EditNPSModal({ nps: initial, onClose, onSave }: any) {
  const [form, setForm] = useState({
    tier: initial.tier || "I",
    pran: initial.pran || "",
    balance: initial.balance != null ? String(initial.balance) : "",
    schemeType: initial.schemeType || "All Citizen",
    fundManager: initial.fundManager || "",
    investmentChoice: initial.investmentChoice || "Auto",
    lifecycleFund: initial.lifecycleFund || "LC-50",
    equityPct: initial.equityPct != null ? String(initial.equityPct) : "",
    corpBondPct: initial.corpBondPct != null ? String(initial.corpBondPct) : "",
    govtSecPct: initial.govtSecPct != null ? String(initial.govtSecPct) : "",
    altAssetPct: initial.altAssetPct != null ? String(initial.altAssetPct) : "",
    yearContribution: initial.yearContribution != null ? String(initial.yearContribution) : "",
    employerContribution:
      initial.employerContribution != null ? String(initial.employerContribution) : "",
  });
  return (
    <Modal title="Edit NPS Account" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tier">
          <select
            style={inp}
            value={form.tier}
            onChange={(e) => setForm({ ...form, tier: e.target.value })}
          >
            <option value="I">Tier I — Pension (Tax Benefits)</option>
            <option value="II">Tier II — Savings (Flexible)</option>
          </select>
        </Field>
        <Field label="Subscriber Type">
          <select
            style={inp}
            value={form.schemeType}
            onChange={(e) => setForm({ ...form, schemeType: e.target.value })}
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
            value={form.pran}
            onChange={(e) => setForm({ ...form, pran: e.target.value })}
            placeholder="12-digit PRAN"
            maxLength={12}
          />
        </Field>
        <Field label="Pension Fund Manager (PFM)">
          <select
            style={inp}
            value={form.fundManager}
            onChange={(e) => setForm({ ...form, fundManager: e.target.value })}
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
            value={form.investmentChoice}
            onChange={(e) => setForm({ ...form, investmentChoice: e.target.value })}
          >
            <option value="Auto">Auto Choice (Lifecycle)</option>
            <option value="Active">Active Choice (Manual)</option>
          </select>
        </Field>
        {form.investmentChoice === "Auto" ? (
          <Field label="Lifecycle Fund">
            <select
              style={inp}
              value={form.lifecycleFund}
              onChange={(e) => setForm({ ...form, lifecycleFund: e.target.value })}
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
              value={form.equityPct}
              onChange={(e) => setForm({ ...form, equityPct: e.target.value })}
              placeholder="e.g. 50"
            />
          </Field>
        )}
      </div>
      {form.investmentChoice === "Active" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            <Field label="Corp Bond (C) %">
              <input
                style={inp}
                type="number"
                min={0}
                max={100}
                value={form.corpBondPct}
                onChange={(e) => setForm({ ...form, corpBondPct: e.target.value })}
                placeholder="e.g. 30"
              />
            </Field>
            <Field label="Govt Sec (G) %">
              <input
                style={inp}
                type="number"
                min={0}
                max={100}
                value={form.govtSecPct}
                onChange={(e) => setForm({ ...form, govtSecPct: e.target.value })}
                placeholder="e.g. 15"
              />
            </Field>
            <Field label="Alternative (A) % — max 5%">
              <input
                style={inp}
                type="number"
                min={0}
                max={5}
                value={form.altAssetPct}
                onChange={(e) => setForm({ ...form, altAssetPct: e.target.value })}
                placeholder="e.g. 5"
              />
            </Field>
          </div>
          {(() => {
            const allocTotal =
              (Number(form.equityPct) || 0) +
              (Number(form.corpBondPct) || 0) +
              (Number(form.govtSecPct) || 0) +
              (Number(form.altAssetPct) || 0);
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
            value={form.balance}
            onChange={(e) => setForm({ ...form, balance: e.target.value })}
            placeholder="500000"
          />
        </Field>
        <Field label="Annual Contribution (₹)">
          <input
            style={inp}
            type="number"
            value={form.yearContribution}
            onChange={(e) => setForm({ ...form, yearContribution: e.target.value })}
            placeholder="50000"
          />
        </Field>
      </div>
      {form.schemeType === "Corporate" && (
        <Field label="Employer Contribution (₹/year) — 80CCD(2)">
          <input
            style={inp}
            type="number"
            value={form.employerContribution}
            onChange={(e) => setForm({ ...form, employerContribution: e.target.value })}
            placeholder="60000"
          />
        </Field>
      )}
      <ModalActions onSave={() => onSave(form)} onClose={onClose} saveLabel="Save Changes" />
    </Modal>
  );
}

/* ── Investment-specific empty state ────────────────────────────────── */
function InvestmentEmptyState({
  icon: Icon,
  gradient,
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
        background:
          "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 12%, var(--surface-0)) 100%)",
        border: `1.5px solid ${THEME.line}`,
        borderRadius: 20,
        boxShadow: "0 4px 24px -4px rgba(0, 0, 0, 0.03)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 22,
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          boxShadow: `0 8px 24px -4px color-mix(in srgb, ${dotColor} 30%, transparent)`,
          border: "2px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        <Icon size={32} color={THEME.darkInk} />
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

/* ── FD Section ─────────────────────────────────────────────────────── */
function FDSection({ items, removeItem, updateItem, onAdd }: any) {
  const [editFD, setEditFD] = useState<any>(null);

  const fdDaysLeft = (f: any) => {
    if (!f.maturityDate) return null;
    const [y, m, d] = String(f.maturityDate).split("-").map(Number);
    const matDate = new Date(y, m - 1, d);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((matDate.getTime() - now.getTime()) / 86400000);
  };

  const totalInvested = items.reduce((s: number, f: any) => s + (Number(f.principal) || 0), 0);
  const totalMaturity = items.reduce(
    (s: number, f: any) => s + fdMaturity(Number(f.principal), Number(f.rate), Number(f.years)),
    0
  );
  const avgRate =
    items.length > 0
      ? items.reduce((s: number, f: any) => s + Number(f.rate || 0), 0) / items.length
      : 0;
  const maturedCount = items.filter((f: any) => (fdDaysLeft(f) ?? 1) < 0).length;
  const FD_AMBER = THEME.gold;

  return (
    <div className="animate-fade-in-up">
      {items.length === 0 ? (
        <InvestmentEmptyState
          icon={Coins}
          gradient="linear-gradient(135deg,#d97706 0%,#fbbf24 100%)"
          dotColor="#f59e0b"
          title="No Fixed Deposits Added Yet"
          description="Track all your FD accounts — bank, interest rate, maturity date, and projected returns in one place."
          pills={["Principal Amount", "Interest Rate", "Maturity Date", "Projected Returns"]}
          buttonLabel="Add Fixed Deposit"
          onAdd={onAdd}
        />
      ) : (
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
                value: <Prv>{fmtINRFull(totalInvested)}</Prv>,
                color: FD_AMBER,
                Icon: IndianRupee,
              },
              {
                label: "Total Maturity",
                value: <Prv>{fmtINRFull(totalMaturity)}</Prv>,
                color: THEME.sage,
                Icon: TrendingUp,
              },
              {
                label: "Avg. Rate",
                value: `${avgRate.toFixed(2)}%`,
                color: THEME.accent,
                Icon: Activity,
              },
              {
                label: maturedCount > 0 ? `${maturedCount} Matured` : "FDs Active",
                value: String(items.length - maturedCount),
                color: maturedCount > 0 ? THEME.rust : THEME.sage,
                Icon: BarChart3,
              },
            ].map(({ label, value, color, Icon }) => (
              <div
                key={label}
                className="card-lift"
                style={{
                  background:
                    "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 15%, var(--surface-0)) 100%)",
                  border: `1.5px solid ${THEME.line}`,
                  borderTop: `4px solid ${color}`,
                  borderRadius: 16,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  boxShadow:
                    "0 4px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 color-mix(in srgb, var(--t-ink) 4%, transparent)",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: `linear-gradient(135deg, color-mix(in srgb, ${color} 15%, transparent) 0%, color-mix(in srgb, ${color} 8%, transparent) 100%)`,
                      border: `1.5px solid color-mix(in srgb, ${color} 25%, transparent)`,
                      boxShadow: `0 2px 8px color-mix(in srgb, ${color} 8%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {label}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: THEME.ink,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {items.map((f: any) => {
              const maturity = fdMaturity(Number(f.principal), Number(f.rate), Number(f.years));
              const daysLeft = fdDaysLeft(f);
              const isMatured = daysLeft !== null && daysLeft < 0;
              const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
              const accrued = (() => {
                if (!f.startDate || !f.years) return Number(f.principal) || 0;
                const elapsed = Math.min(
                  Number(f.years),
                  Math.max(0, monthsBetween(f.startDate, today()) / 12)
                );
                return fdMaturity(Number(f.principal), Number(f.rate), elapsed);
              })();
              const gain = accrued - (Number(f.principal) || 0);
              const gainPct =
                (Number(f.principal) || 0) > 0 ? (gain / (Number(f.principal) || 1)) * 100 : 0;
              const fdProgress =
                f.years && f.startDate
                  ? Math.min(
                      100,
                      Math.max(
                        0,
                        (monthsBetween(f.startDate, today()) / (Number(f.years) * 12)) * 100
                      )
                    )
                  : 0;
              const borderColor = isMatured ? THEME.muted : isDueSoon ? THEME.rust : FD_AMBER;
              const lbl = {
                fontSize: 9,
                color: THEME.muted,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                marginBottom: 3,
              };

              return (
                <Card key={f.id} style={{ padding: 20, borderTop: `3px solid ${borderColor}` }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                      <Badge variant={isMatured ? "muted" : "gold"}>{f.bank}</Badge>
                      {isMatured && <Badge variant="muted">Matured</Badge>}
                      {isDueSoon && !isMatured && (
                        <Badge variant="rust">
                          {daysLeft === 0 ? "Today!" : `${daysLeft}d left`}
                        </Badge>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil size={12} />}
                        onClick={() => setEditFD(f)}
                        aria-label={`Edit ${f.bank} fixed deposit`}
                        title="Edit"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={12} />}
                        style={{ color: THEME.rust }}
                        onClick={() => removeItem("fixedDeposits", f.id)}
                        aria-label={`Delete ${f.bank} fixed deposit`}
                        title="Delete"
                      />
                    </div>
                  </div>

                  {/* Logo + Bank name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <BankLogo name={f.bank} size={36} accentColor={FD_AMBER} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>{f.bank}</div>
                  </div>

                  <div style={lbl}>Principal</div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: FD_AMBER,
                      letterSpacing: "-0.02em",
                      marginBottom: 14,
                    }}
                  >
                    <Prv>{fmtINRFull(Number(f.principal))}</Prv>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 6,
                      marginBottom: 14,
                    }}
                  >
                    {[
                      ["Rate", `${f.rate}%`],
                      ["Tenure", `${f.years}y`],
                      [
                        "Start",
                        f.startDate
                          ? new Date(f.startDate + "T00:00:00").toLocaleDateString("en-IN", {
                              month: "short",
                              year: "2-digit",
                            })
                          : "—",
                      ],
                      [
                        "Matures",
                        f.maturityDate
                          ? new Date(f.maturityDate + "T00:00:00").toLocaleDateString("en-IN", {
                              month: "short",
                              year: "2-digit",
                            })
                          : "—",
                      ],
                    ].map(([l, v]) => (
                      <div
                        key={l}
                        style={{
                          padding: "7px 6px",
                          background: `color-mix(in srgb, ${THEME.gold} 6%, transparent)`,
                          borderRadius: 8,
                          border: `1px solid ${`color-mix(in srgb, ${THEME.gold} 14%, transparent)`}`,
                          textAlign: "center" as const,
                        }}
                      >
                        <div style={{ ...lbl, marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: THEME.ink }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {f.years && f.startDate && (
                    <div style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 9,
                          color: THEME.muted,
                          marginBottom: 4,
                          fontWeight: 600,
                        }}
                      >
                        <span>TENURE PROGRESS</span>
                        <span style={{ color: isMatured ? THEME.sage : FD_AMBER, fontWeight: 700 }}>
                          {fdProgress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${fdProgress}%`,
                            background: isMatured ? THEME.muted : FD_AMBER,
                          }}
                        />
                      </div>
                    </div>
                  )}
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
                      <div style={lbl}>Current Accrued</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.accent }}>
                        <Prv>{fmtINRFull(accrued)}</Prv>
                      </div>
                      <div style={{ fontSize: 10, color: gain >= 0 ? THEME.sage : THEME.rust }}>
                        {gain >= 0 ? "+" : ""}
                        <Prv>{fmtINRFull(gain)}</Prv> · {gainPct.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div style={lbl}>{isMatured ? "Final Value" : "On Maturity"}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>
                        <Prv>{fmtINRFull(maturity)}</Prv>
                      </div>
                      {!isMatured && daysLeft !== null && (
                        <div
                          style={{
                            fontSize: 10,
                            color: daysLeft <= 30 ? THEME.rust : THEME.muted,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <Clock size={9} /> {daysLeft === 0 ? "Today" : `${daysLeft}d away`}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
      {editFD && (
        <EditFDModal
          fd={editFD}
          onClose={() => setEditFD(null)}
          onSave={(updated: any) => {
            updateItem("fixedDeposits", editFD.id, updated);
            setEditFD(null);
          }}
        />
      )}
    </div>
  );
}

/* ── RD Section ─────────────────────────────────────────────────────── */
function RDSection({ items, removeItem, updateItem, onAdd }: any) {
  const [editRD, setEditRD] = useState<any>(null);
  // Fixed chart-extension token (not the user-selectable accent) — a raw hex
  // here would go stale in dark mode and could collide with the active
  // accent preset.
  const RD_BLUE = THEME.cyan;

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
          {(() => {
            const rdElapsedFn = (r: any) =>
              r.startDate
                ? Math.min(
                    Number(r.tenureMonths) || 0,
                    Math.max(0, monthsBetween(r.startDate, today()))
                  )
                : Number(r.tenureMonths) || 0;
            const totalMonthly = items.reduce(
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
            const activeCount = items.filter(
              (r: any) => rdElapsedFn(r) < (Number(r.tenureMonths) || 0)
            ).length;
            return (
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
                    value: <Prv>{fmtINRFull(totalMonthly)}</Prv>,
                    color: RD_BLUE,
                    Icon: Repeat,
                  },
                  {
                    label: "Total Deposited",
                    value: <Prv>{fmtINRFull(totalDeposited)}</Prv>,
                    color: THEME.accent,
                    Icon: IndianRupee,
                  },
                  {
                    label: "Projected Maturity",
                    value: <Prv>{fmtINRFull(totalMaturity)}</Prv>,
                    color: THEME.sage,
                    Icon: TrendingUp,
                  },
                  {
                    label: "RDs Active",
                    value: String(activeCount),
                    color: activeCount > 0 ? THEME.sage : THEME.muted,
                    Icon: BarChart3,
                  },
                ].map(({ label, value, color, Icon }) => (
                  <div
                    key={label}
                    className="card-lift"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 15%, var(--surface-0)) 100%)",
                      border: `1.5px solid ${THEME.line}`,
                      borderTop: `4px solid ${color}`,
                      borderRadius: 16,
                      padding: "18px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      boxShadow:
                        "0 4px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 color-mix(in srgb, var(--t-ink) 4%, transparent)",
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: `linear-gradient(135deg, color-mix(in srgb, ${color} 15%, transparent) 0%, color-mix(in srgb, ${color} 8%, transparent) 100%)`,
                          border: `1.5px solid color-mix(in srgb, ${color} 25%, transparent)`,
                          boxShadow: `0 2px 8px color-mix(in srgb, ${color} 8%, transparent)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color,
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: THEME.muted,
                          textTransform: "uppercase" as const,
                          letterSpacing: "0.1em",
                        }}
                      >
                        {label}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        color: THEME.ink,
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {items.map((r: any) => {
              const tenureMonths = Number(r.tenureMonths) || 0;
              const elapsed = r.startDate ? Math.max(0, monthsBetween(r.startDate, today())) : 0;
              const elapsedCapped = Math.min(elapsed, tenureMonths);
              const isMatured = elapsed >= tenureMonths && tenureMonths > 0;
              const progressPct = Math.min(
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
                      <Badge variant="muted">{r.bank}</Badge>
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
                        onClick={() => removeItem("recurringDeposits", r.id)}
                        aria-label={`Delete ${r.bank} recurring deposit`}
                        title="Delete"
                      />
                    </div>
                  </div>

                  {/* Logo + Bank name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <BankLogo name={r.bank} size={36} accentColor={RD_BLUE} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>{r.bank}</div>
                  </div>

                  <div style={lbl}>Monthly Installment</div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: RD_BLUE,
                      marginBottom: 4,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    <Prv>{fmtINRFull(Number(r.monthly))}</Prv>
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
                            · Matures {lbl}
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
                      {elapsedCapped} of {tenureMonths} months
                    </span>
                    <span style={{ fontWeight: 700, color: isMatured ? THEME.muted : RD_BLUE }}>
                      {progressPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="progress-track" style={{ marginBottom: 14 }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${progressPct}%`,
                        background: isMatured ? THEME.muted : RD_BLUE,
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
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.accent }}>
                        <Prv>{fmtINRFull(deposited)}</Prv>
                      </div>
                      <div style={{ fontSize: 10, color: THEME.sage }}>
                        +<Prv>{fmtINRFull(gain)}</Prv> interest
                      </div>
                    </div>
                    <div>
                      <div style={lbl}>{isMatured ? "Final Value" : "On Maturity"}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>
                        <Prv>{fmtINRFull(isMatured ? currentVal : fullMaturity)}</Prv>
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
          onSave={(updated: any) => {
            updateItem("recurringDeposits", editRD.id, updated);
            setEditRD(null);
          }}
        />
      )}
    </div>
  );
}

/* ── Bond Section ───────────────────────────────────────────────────── */
function BondSection({ items, removeItem, updateItem, onAdd }: any) {
  const [editBond, setEditBond] = useState<any>(null);

  const totalInvested = items.reduce(
    (s: number, b: any) =>
      s + Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || 0),
    0
  );
  const annualIncome = items.reduce((s: number, b: any) => {
    const principal =
      Number(b.totalPrincipalAmount || 0) ||
      Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0);
    return s + (principal * Number(b.coupon || 0)) / 100;
  }, 0);

  const maturityCountdown = (dateStr: string) => {
    if (!dateStr) return null;
    const [y, m, d] = String(dateStr).split("-").map(Number);
    const matDate = new Date(y, m - 1, d);
    const nowDate = new Date();
    nowDate.setHours(0, 0, 0, 0);
    const days = Math.ceil((matDate.getTime() - nowDate.getTime()) / 86400000);
    if (days < 0) return { text: "Matured", color: THEME.muted, matured: true };
    if (days === 0) return { text: "Matures today!", color: THEME.rust, matured: false };
    if (days <= 30) return { text: `${days}d left`, color: THEME.rust, matured: false };
    if (days <= 365)
      return { text: `${Math.ceil(days / 30)}m left`, color: THEME.gold, matured: false };
    const yrs = Math.floor(days / 365);
    const mos = Math.ceil((days % 365) / 30);
    return { text: `${yrs}y ${mos}m`, color: THEME.muted, matured: false };
  };

  const BOND_AMBER = THEME.gold;
  const lbl = {
    fontSize: 9,
    color: THEME.muted,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: 3,
  };

  return (
    <div className="animate-fade-in-up">
      {items.length === 0 ? (
        <InvestmentEmptyState
          icon={FileText}
          gradient="linear-gradient(135deg,#92400e 0%,#d97706 100%)"
          dotColor="#d97706"
          title="No Bonds Added Yet"
          description="Track government bonds, SGBs, and corporate bonds with full order slip details — coupon rate, YTM, maturity, and investment breakdown."
          pills={["Senior Secured", "Govt / SGB", "Coupon & YTM", "Order Details"]}
          buttonLabel="Add Bond"
          onAdd={onAdd}
        />
      ) : (
        <>
          {/* Summary strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <StatCard
              label="Total Invested"
              value={fmtINRFull(totalInvested)}
              numericValue={totalInvested}
              formatValue={fmtINRFull}
              icon={<IndianRupee />}
              color={BOND_AMBER}
            />
            <StatCard
              label="Annual Coupon"
              value={fmtINRFull(annualIncome)}
              numericValue={annualIncome}
              formatValue={fmtINRFull}
              icon={<Coins />}
              color={THEME.sage}
            />
            <StatCard
              label="Bonds Held"
              value={String(items.length)}
              numericValue={items.length}
              formatValue={(n) => String(Math.round(n))}
              icon={<BarChart3 />}
              color={THEME.accent}
            />
          </div>

          {/* Bond cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(var(--grid-min-lg), 1fr))",
              gap: 20,
            }}
          >
            {items.map((b: any) => {
              const investmentAmt = Number(
                b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || 0
              );
              const ml = maturityCountdown(b.maturityDate);
              const annualCoupon =
                ((Number(b.totalPrincipalAmount || 0) ||
                  Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0)) *
                  Number(b.coupon || 0)) /
                100;
              const charges = Number(b.brokerage || 0) + Number(b.stampDuty || 0);
              const bondProgress =
                b.orderDate && b.maturityDate
                  ? (() => {
                      const start = new Date(b.orderDate + "T00:00:00").getTime();
                      const end = new Date(b.maturityDate + "T00:00:00").getTime();
                      return end > start
                        ? Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100))
                        : 0;
                    })()
                  : 0;
              const fmtBondDate = (d: string) =>
                d
                  ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—";
              const currentVal = bondCurrentValue(b);
              const couponEarned = currentVal - investmentAmt;

              return (
                <Card key={b.id} style={{ padding: 22, borderTop: `3px solid ${BOND_AMBER}` }}>
                  {/* Header: badges + actions */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap" as const,
                        flex: 1,
                        marginRight: 8,
                      }}
                    >
                      {b.securityNature && (
                        <Badge variant="gold" style={{ fontSize: 9 }}>
                          {b.securityNature}
                        </Badge>
                      )}
                      {b.issuer && (
                        <Badge variant="muted" style={{ fontSize: 9 }}>
                          {b.issuer}
                        </Badge>
                      )}
                      {ml?.matured && (
                        <Badge variant="muted" style={{ fontSize: 9 }}>
                          Matured
                        </Badge>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil size={12} />}
                        onClick={() => setEditBond(b)}
                        aria-label={`Edit ${b.issuer || "bond"}`}
                        title="Edit"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={12} />}
                        style={{ color: THEME.rust }}
                        onClick={() => removeItem("bonds", b.id)}
                        aria-label={`Delete ${b.issuer || "bond"}`}
                        title="Delete"
                      />
                    </div>
                  </div>

                  {/* Logo + Bond name + ISIN */}
                  <div
                    style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}
                  >
                    <BankLogo name={b.issuer || b.name} size={36} accentColor={BOND_AMBER} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: THEME.ink,
                          lineHeight: 1.3,
                          marginBottom: 2,
                        }}
                      >
                        {b.name}
                      </div>
                      {b.isin && (
                        <div
                          style={{
                            fontSize: 10,
                            color: THEME.muted,
                            fontFamily: "monospace",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {b.isin}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Investment amount (primary) */}
                  <div style={lbl}>Total Investment</div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      color: BOND_AMBER,
                      letterSpacing: "-0.02em",
                      marginBottom: couponEarned > 0 ? 4 : 16,
                    }}
                  >
                    <Prv>{fmtINRFull(investmentAmt)}</Prv>
                  </div>
                  {couponEarned > 0 && (
                    <div style={{ fontSize: 10, color: THEME.sage, marginBottom: 16 }}>
                      +<Prv>{fmtINRFull(couponEarned)}</Prv> coupon earned to date ·{" "}
                      <Prv>{fmtINRFull(currentVal)}</Prv> current value
                    </div>
                  )}

                  {/* Key metrics — 4 amber pills */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 6,
                      marginBottom: 14,
                    }}
                  >
                    {[
                      ["Coupon", b.coupon ? `${b.coupon}%` : "—"],
                      ["YTM", b.ytmRate ? `${b.ytmRate}%` : "—"],
                      ["Units", b.numberOfUnits || "—"],
                      [
                        "FV/Unit",
                        b.faceValuePerUnit ? <Prv>{fmtINRFull(b.faceValuePerUnit)}</Prv> : "—",
                      ],
                    ].map(([l, v]) => (
                      <div
                        key={l}
                        style={{
                          padding: "8px 6px",
                          background: `color-mix(in srgb, ${THEME.gold} 6%, transparent)`,
                          borderRadius: 8,
                          border: `1px solid ${`color-mix(in srgb, ${THEME.gold} 14%, transparent)`}`,
                          textAlign: "center" as const,
                        }}
                      >
                        <div style={{ ...lbl, marginBottom: 3 }}>{l}</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: THEME.ink }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Maturity + Annual Income row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      padding: "12px 0",
                      borderTop: `1px solid ${THEME.line}`,
                      borderBottom: bondProgress > 0 ? "none" : `1px solid ${THEME.line}`,
                      marginBottom: bondProgress > 0 ? 0 : 14,
                    }}
                  >
                    <div>
                      <div style={lbl}>Maturity Date</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                        {fmtBondDate(b.maturityDate)}
                      </div>
                      {ml && (
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: ml.color,
                            marginTop: 2,
                          }}
                        >
                          {ml.text}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={lbl}>Annual Income</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>
                        {annualCoupon > 0 ? <Prv>{fmtINRFull(annualCoupon)}</Prv> : "—"}
                      </div>
                      {b.interestPaymentDate && (
                        <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                          {b.interestPaymentDate}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Elapsed progress bar — full width */}
                  {bondProgress > 0 && (
                    <div
                      style={{
                        padding: "10px 0 14px",
                        borderBottom: `1px solid ${THEME.line}`,
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 9,
                          color: THEME.muted,
                          marginBottom: 4,
                          fontWeight: 600,
                        }}
                      >
                        <span>ELAPSED</span>
                        <span
                          style={{ color: ml?.matured ? THEME.sage : BOND_AMBER, fontWeight: 700 }}
                        >
                          {bondProgress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${bondProgress}%`,
                            background: ml?.matured ? THEME.muted : BOND_AMBER,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Investment breakdown — 3 col */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    {[
                      ["Principal", b.totalPrincipalAmount],
                      ["Accrued Int.", b.totalAccruedInterest],
                      ["Consideration", b.totalConsideration],
                    ].map(([label, val]) => (
                      <div key={label as string}>
                        <div style={lbl}>{label}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: THEME.ink }}>
                          {val ? <Prv>{fmtINRFull(val)}</Prv> : "—"}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer meta row */}
                  <div
                    style={{
                      paddingTop: 10,
                      borderTop: `1px solid ${THEME.line}`,
                      display: "flex",
                      flexWrap: "wrap" as const,
                      gap: "3px 14px",
                    }}
                  >
                    {b.principalRepayment && (
                      <span style={{ fontSize: 10, color: THEME.muted }}>
                        Principal:{" "}
                        <span style={{ color: THEME.ink, fontWeight: 600 }}>
                          {b.principalRepayment}
                        </span>
                      </span>
                    )}
                    {charges > 0 && (
                      <span style={{ fontSize: 10, color: THEME.muted }}>
                        Charges:{" "}
                        <span style={{ color: THEME.ink, fontWeight: 600 }}>
                          <Prv>{fmtINRFull(charges)}</Prv>
                        </span>
                      </span>
                    )}
                    {b.orderId && (
                      <span style={{ fontSize: 10, color: THEME.muted }}>
                        Order #:{" "}
                        <span style={{ color: THEME.ink, fontWeight: 600 }}>{b.orderId}</span>
                      </span>
                    )}
                    {b.orderDate && (
                      <span style={{ fontSize: 10, color: THEME.muted }}>
                        Ordered:{" "}
                        <span style={{ color: THEME.ink, fontWeight: 600 }}>{b.orderDate}</span>
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
      {editBond && (
        <EditBondModal
          bond={editBond}
          onClose={() => setEditBond(null)}
          onSave={(updated: any) => {
            updateItem("bonds", editBond.id, updated);
            setEditBond(null);
          }}
        />
      )}
    </div>
  );
}

/* ── PPF Transaction Modal ───────────────────────────────────────────── */
function PPFTransactionModal({ onClose, onSave, initial }: any) {
  const [form, setForm] = useState(
    initial || { date: today(), type: "deposit", amount: "", note: "" }
  );
  const valid = form.amount && Number(form.amount) > 0;
  return (
    <Modal title={initial ? "Edit Transaction" : "Add PPF Transaction"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date">
          <input
            style={inp}
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </Field>
        <Field label="Type">
          <select
            style={inp}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="deposit">Deposit (Load Money)</option>
            <option value="withdrawal">Withdrawal</option>
          </select>
        </Field>
      </div>
      <Field label="Amount (₹)">
        <input
          style={inp}
          type="number"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          placeholder="50000"
          min="1"
        />
      </Field>
      <Field label="Note (optional)">
        <input
          style={inp}
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder="e.g. Annual contribution FY 2025-26"
        />
      </Field>
      <ModalActions
        onSave={() => valid && onSave(form)}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Add Transaction"}
      />
    </Modal>
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
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 8,
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
              ✓ {csvPreview.length} rows parsed and ready for import
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
                      <Prv>{fmtINRFull(Number(r.invested))}</Prv>
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
          ✓ Import completed successfully!
        </div>
      )}
    </Card>
  );
}

/* ── PPF CSV Import Panel ────────────────────────────────────────────── */
function PPFCsvPanel({ onImport }: any) {
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
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 3)
          throw new Error(`Row ${i + 1}: need date, type, amount (got: "${line}")`);
        const [date, type, amount, note] = parts;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/))
          throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD`);
        const t = type.toLowerCase();
        if (!["deposit", "withdrawal", "d", "w"].includes(t))
          throw new Error(`Row ${i + 1}: type must be deposit or withdrawal`);
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0)
          throw new Error(`Row ${i + 1}: amount must be a positive number`);
        return {
          date,
          type: t.startsWith("d") ? "deposit" : "withdrawal",
          amount: amt,
          note: note || "",
          id: `ppftx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
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
      "# PPF Transaction Import Template\n# Columns: date, type, amount, note\n# type: deposit or withdrawal\n2025-04-05,deposit,150000,Annual contribution FY 2025-26\n2025-10-10,deposit,50000,Mid-year top up\n2026-01-15,withdrawal,25000,Partial withdrawal";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ppf_import_template.csv";
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

  const btnStyle = {
    padding: "8px 16px",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  };

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 12,
        marginBottom: 16,
        background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
        border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 22%, transparent)`}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: THEME.accent,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FileText size={15} /> Bulk Import via CSV
        </div>
        <button
          onClick={downloadTemplate}
          style={{
            ...btnStyle,
            border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 30%, transparent)`}`,
            background: "transparent",
            color: THEME.accent,
          }}
        >
          Download Template
        </button>
      </div>
      <div
        style={{
          fontSize: 11,
          color: THEME.muted,
          marginBottom: 12,
          padding: "8px 12px",
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: 8,
          lineHeight: 1.6,
        }}
      >
        <b style={{ color: THEME.ink }}>Format:</b>{" "}
        <code style={{ background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`, padding: "1px 5px", borderRadius: 4 }}>
          date, type, amount, note
        </code>
        <br />
        Deposit:{" "}
        <code style={{ background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`, padding: "1px 5px", borderRadius: 4 }}>
          2025-04-05, deposit, 150000, Annual contribution
        </code>
        &nbsp;&nbsp;Withdrawal:{" "}
        <code style={{ background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`, padding: "1px 5px", borderRadius: 4 }}>
          2026-01-15, withdrawal, 25000, Partial
        </code>
      </div>
      <label
        style={{
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "20px 0",
          border: `1.5px dashed ${`color-mix(in srgb, ${THEME.accent} 40%, transparent)`}`,
          borderRadius: 10,
          cursor: "pointer",
          marginBottom: 12,
          background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload size={22} color={THEME.accent} />
        <div style={{ fontSize: 13, fontWeight: 600, color: THEME.accent }}>
          {csvFileName || "Drop CSV file here or click to browse"}
        </div>
        <div style={{ fontSize: 11, color: THEME.muted }}>Supports .csv and .txt files</div>
        <input type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFile} />
      </label>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: THEME.muted,
          marginBottom: 6,
          textAlign: "center" as const,
        }}
      >
        — or paste CSV text below —
      </div>
      <textarea
        style={{
          width: "100%",
          minHeight: 80,
          padding: "10px 12px",
          background: "var(--surface-0)",
          border: `1.5px solid ${THEME.line}`,
          borderRadius: 10,
          color: THEME.ink,
          fontSize: 12,
          fontFamily: "monospace",
          resize: "vertical" as const,
          boxSizing: "border-box" as const,
        }}
        value={csvText}
        onChange={(e) => {
          setCsvText(e.target.value);
          setCsvPreview([]);
          setCsvError("");
          setImportDone(false);
        }}
        placeholder={
          "2025-04-05, deposit, 150000, Annual contribution FY 2025-26\n2025-10-10, deposit, 50000, Mid-year top up"
        }
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" as const }}>
        <button
          style={{
            ...btnStyle,
            border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 40%, transparent)`}`,
            background: "transparent",
            color: THEME.accent,
          }}
          onClick={() => parseCsvText(csvText)}
        >
          Preview Data
        </button>
        {csvPreview.length > 0 && !importDone && (
          <button
            style={{ ...btnStyle, border: "none", background: THEME.accent, color: THEME.darkInk }}
            onClick={doImport}
          >
            Import {csvPreview.length} Row{csvPreview.length !== 1 ? "s" : ""}
          </button>
        )}
        {importDone && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: THEME.sage,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={15} /> Imported!
          </div>
        )}
      </div>
      {csvError && (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            color: THEME.rust,
            fontSize: 12,
            padding: "8px 12px",
            background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
            borderRadius: 8,
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {csvError}
        </div>
      )}
      {csvPreview.length > 0 && (
        <div
          style={{
            marginTop: 12,
            border: `1px solid ${THEME.line}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              background: `color-mix(in srgb, ${THEME.accent} 7%, transparent)`,
              fontSize: 11,
              fontWeight: 700,
              color: THEME.accent,
            }}
          >
            {csvPreview.length} rows ready — preview:
          </div>
          <div style={{ maxHeight: 160, overflowY: "auto" as const, overflowX: "auto" as const }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--surface-0)" }}>
                  {["Date", "Type", "Amount", "Note"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "6px 10px",
                        textAlign: "left" as const,
                        fontWeight: 600,
                        fontSize: 10,
                        color: THEME.muted,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvPreview.map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${THEME.line}` }}>
                    <td style={{ padding: "6px 10px" }}>{r.date}</td>
                    <td style={{ padding: "6px 10px" }}>
                      <span
                        style={{
                          color: r.type === "deposit" ? THEME.sage : THEME.rust,
                          fontWeight: 600,
                          textTransform: "capitalize" as const,
                        }}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td style={{ padding: "6px 10px", fontWeight: 700 }}>
                      <Prv>{fmtINRFull(r.amount)}</Prv>
                    </td>
                    <td style={{ padding: "6px 10px", color: THEME.muted }}>{r.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Edit PPF Modal ──────────────────────────────────────────────────── */
// Lets the balance be reconciled after the bank/post-office credits the annual PPF interest —
// previously PPF had no edit path at all, so `p.balance` was frozen at whatever was entered
// once when the account was first added (see PPFAccountCard's ledger-fallback comment below).
function EditPPFModal({ ppf: initial, onClose, onSave }: any) {
  const [form, setForm] = useState({
    institution: initial.institution || initial.bank || "",
    accountNumber: initial.accountNumber || "",
    balance: initial.balance != null ? String(initial.balance) : "",
  });
  return (
    <Modal title="Edit PPF Account" onClose={onClose}>
      <Field label="Bank / Post Office">
        <input
          style={inp}
          value={form.institution}
          onChange={(e) => setForm({ ...form, institution: e.target.value })}
          placeholder="e.g. SBI, Post Office"
        />
      </Field>
      <Field label="Account Number">
        <input
          style={inp}
          value={form.accountNumber}
          onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
          placeholder="PPF account number"
        />
      </Field>
      <Field label="Current Balance (₹)">
        <input
          style={inp}
          type="number"
          value={form.balance}
          onChange={(e) => setForm({ ...form, balance: e.target.value })}
          placeholder="250000"
        />
      </Field>
      <div style={{ fontSize: 11, color: THEME.muted, marginTop: -6, marginBottom: 4 }}>
        Update this after your bank/post office credits the yearly PPF interest — the ledger
        below tracks deposits &amp; withdrawals only, not interest.
      </div>
      <ModalActions
        onSave={() => form.institution && onSave({ ...form, balance: Number(form.balance) || 0 })}
        onClose={onClose}
        saveLabel="Save Changes"
      />
    </Modal>
  );
}

/* ── PPF Account Card with Ledger ────────────────────────────────────── */
function PPFAccountCard({ p, removeItem, updateItem }: any) {
  const [txs, setTxs] = useState<any[]>(p.transactions || []);
  const [showLedger, setShowLedger] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);

  const sorted = [...txs].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const totalDeposits = txs
    .filter((t) => t.type === "deposit")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdrawals = txs
    .filter((t) => t.type === "withdrawal")
    .reduce((s, t) => s + Number(t.amount), 0);
  // Bug fix: the balance display below previously always rendered the static p.balance field,
  // ignoring the transaction ledger entirely — an account tracked purely via deposits/withdrawals
  // (and never given a manual balance) showed ₹0 forever. Mirror NPSAccountCard's fallback.
  const manualBalance = Number(p.balance) || 0;
  const ledgerNet = Math.max(0, totalDeposits - totalWithdrawals);
  const balanceFromLedger = manualBalance === 0 && txs.length > 0;
  const displayBalance = manualBalance > 0 ? manualBalance : ledgerNet;

  const persist = (updated: any[]) => {
    setTxs(updated);
    updateItem("ppf", p.id, { transactions: updated });
  };

  const saveTx = (form: any) => {
    const updated = editTx
      ? txs.map((t) => (t.id === editTx.id ? { ...form, id: editTx.id } : t))
      : [...txs, { ...form, id: uid() }];
    persist(updated);
    setShowTxModal(false);
    setEditTx(null);
  };

  const removeTx = (id: string) => persist(txs.filter((t) => t.id !== id));
  const importRows = (rows: any[]) => {
    persist([...txs, ...rows]);
    setShowCsvImport(false);
  };

  const btnGhost = {
    background: "transparent",
    border: `1px solid ${THEME.line}`,
    borderRadius: 8,
    color: THEME.ink,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 600,
    fontSize: 12,
    padding: "7px 14px",
  } as const;

  return (
    <Card style={{ padding: 20, borderTop: `3px solid ${THEME.sage}` }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <BankLogo name={p.institution || p.bank || "PPF"} size={36} accentColor={THEME.sage} />
          <div>
            <Badge variant="accent">PPF Account</Badge>
            {(p.institution || p.bank) && (
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
                Bank/Post Office:{" "}
                <span style={{ color: THEME.ink, fontWeight: 600 }}>{p.institution || p.bank}</span>
              </div>
            )}
            {p.accountNumber && (
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3 }}>
                A/C: <span style={{ color: THEME.ink, fontWeight: 600 }}>{p.accountNumber}</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <Button
            variant="ghost"
            size="sm"
            icon={<Pencil size={12} />}
            onClick={() => setShowEditAccount(true)}
            aria-label={`Edit ${p.institution || p.bank || "PPF"} account`}
            title="Edit"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={12} />}
            style={{ color: THEME.rust }}
            onClick={() => removeItem("ppf", p.id)}
            aria-label={`Delete ${p.institution || p.bank || "PPF"} account`}
            title="Delete"
          />
        </div>
      </div>

      {/* Balance */}
      <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>
        Current Balance
        {balanceFromLedger && (
          <span style={{ fontSize: 10, color: THEME.cyan, marginLeft: 6, fontWeight: 600 }}>
            from ledger — update after yearly interest credit
          </span>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: THEME.sage, letterSpacing: "-0.02em" }}>
        <Prv>{fmtINRFull(displayBalance)}</Prv>
      </div>

      {/* Stats row */}
      {txs.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
          {[
            { label: "Total Deposits", value: totalDeposits, color: THEME.sage, Icon: TrendingUp },
            {
              label: "Total Withdrawals",
              value: totalWithdrawals,
              color: THEME.rust,
              Icon: TrendingDown,
            },
          ].map(({ label, value, color, Icon }) => (
            <div
              key={label}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-0)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Icon size={10} color={color} /> {label}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color }}>
                <Prv>{fmtINRFull(value)}</Prv>
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                {
                  txs.filter((t) =>
                    label === "Total Deposits" ? t.type === "deposit" : t.type === "withdrawal"
                  ).length
                }{" "}
                entries
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" as const }}>
        <button
          style={btnGhost}
          onClick={() => {
            setShowTxModal(true);
            setEditTx(null);
            setShowCsvImport(false);
          }}
        >
          <Plus size={13} /> Add Transaction
        </button>
        <button
          style={{ ...btnGhost, color: THEME.accent, borderColor: `color-mix(in srgb, ${THEME.accent} 40%, transparent)` }}
          onClick={() => {
            setShowCsvImport((v) => !v);
            setShowLedger(true);
          }}
        >
          <Upload size={13} /> Import CSV
        </button>
        {txs.length > 0 && (
          <button style={btnGhost} onClick={() => setShowLedger((v) => !v)}>
            <List size={13} /> {showLedger ? "Hide" : "View"} Ledger ({txs.length})
          </button>
        )}
      </div>

      {/* CSV Import Panel */}
      {showCsvImport && (
        <div style={{ marginTop: 16 }}>
          <PPFCsvPanel
            onImport={(rows: any[]) => {
              importRows(rows);
              setShowCsvImport(false);
            }}
          />
        </div>
      )}

      {/* Transaction Ledger */}
      {showLedger && txs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: THEME.muted,
              marginBottom: 10,
              textTransform: "uppercase" as const,
              letterSpacing: "0.07em",
            }}
          >
            Transaction Ledger
          </div>
          <div style={{ border: `1px solid ${THEME.line}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" as const }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
              <thead>
                <tr style={{ background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)` }}>
                  {["Date", "Type", "Amount", "Note", ""].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "8px 10px",
                        textAlign: i >= 3 ? ("right" as const) : ("left" as const),
                        fontWeight: 600,
                        fontSize: 10,
                        color: THEME.muted,
                        textTransform: "uppercase" as const,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => (
                  <tr key={t.id} style={{ borderTop: `1px solid ${THEME.line}` }}>
                    <td style={{ padding: "8px 10px", color: THEME.muted }}>{t.date}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontWeight: 700,
                          fontSize: 11,
                          color: t.type === "deposit" ? THEME.sage : THEME.rust,
                        }}
                      >
                        {t.type === "deposit" ? (
                          <TrendingUp size={11} />
                        ) : (
                          <TrendingDown size={11} />
                        )}
                        {t.type === "deposit" ? "Deposit" : "Withdrawal"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        fontWeight: 800,
                        color: t.type === "deposit" ? THEME.sage : THEME.rust,
                      }}
                    >
                      {t.type === "withdrawal" ? "-" : "+"}
                      <Prv>{fmtINRFull(t.amount)}</Prv>
                    </td>
                    <td style={{ padding: "8px 10px", color: THEME.muted }}>{t.note || "—"}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" as const }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => {
                            setEditTx(t);
                            setShowTxModal(true);
                          }}
                          aria-label={`Edit ${t.type} transaction dated ${t.date}`}
                          title="Edit"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: THEME.muted,
                            padding: 6,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => removeTx(t.id)}
                          aria-label={`Delete ${t.type} transaction dated ${t.date}`}
                          title="Delete"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: THEME.rust,
                            padding: 6,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          {txs.length === 0 && (
            <div
              style={{
                padding: "20px 0",
                textAlign: "center" as const,
                color: THEME.muted,
                fontSize: 12,
              }}
            >
              No transactions yet — add manually or import CSV above
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Transaction Modal */}
      {showTxModal && (
        <PPFTransactionModal
          initial={
            editTx
              ? {
                  date: editTx.date,
                  type: editTx.type,
                  amount: String(editTx.amount),
                  note: editTx.note || "",
                }
              : undefined
          }
          onClose={() => {
            setShowTxModal(false);
            setEditTx(null);
          }}
          onSave={saveTx}
        />
      )}

      {/* Edit Account Modal */}
      {showEditAccount && (
        <EditPPFModal
          ppf={p}
          onClose={() => setShowEditAccount(false)}
          onSave={(updated: any) => {
            updateItem("ppf", p.id, updated);
            setShowEditAccount(false);
          }}
        />
      )}
    </Card>
  );
}

/* ── PPF Section ────────────────────────────────────────────────────── */
const PPFSection = ({ items, removeItem, updateItem, onAdd }: any) => (
  <div className="animate-fade-in-up">
    {items.length === 0 ? (
      <InvestmentEmptyState
        icon={Shield}
        gradient="linear-gradient(135deg,#15803d 0%,#22c55e 100%)"
        dotColor="#16a34a"
        title="No PPF Account Added Yet"
        description="Track your Public Provident Fund — deposits, withdrawals, and full transaction ledger with CSV import."
        pills={["Annual Deposits", "Partial Withdrawals", "Transaction Ledger", "CSV Import"]}
        buttonLabel="Add PPF Account"
        onAdd={onAdd}
      />
    ) : (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(var(--grid-min-lg), 1fr))",
          gap: 20,
        }}
      >
        {items.map((p: any) => (
          <PPFAccountCard key={p.id} p={p} removeItem={removeItem} updateItem={updateItem} />
        ))}
      </div>
    )}
  </div>
);

/* ── NPS helpers ─────────────────────────────────────────────────────── */
// Fixed chart-extension token (not the user-selectable accent) — a raw hex
// here would go stale in dark mode and could collide with the active accent
// preset.
const NPS_ORANGE = THEME.gold;

// Actual Pension Fund Manager brand colors — deliberately fixed regardless
// of app theme, same convention as BankLogo/BrokerLogo brand colors.
const NPS_PFM_COLOR: Record<string, string> = {
  SBI: "#0067b2",
  LIC: "#00a651",
  UTI: "#e31b23",
  HDFC: "#004c8f",
  ICICI: "#F58220",
  Kotak: "#e31e25",
  "Aditya Birla": "#d2232a",
  DSP: "#003087",
  Tata: "#00529b",
  "Max Life": "#c2185b",
};

const NPS_LC_LABEL: Record<string, string> = {
  "LC-75": "LC-75 Aggressive",
  "LC-50": "LC-50 Moderate",
  "LC-25": "LC-25 Conservative",
};

function NpsAllocationBar({ equityPct, corpBondPct, govtSecPct, altAssetPct }: any) {
  const e = Number(equityPct) || 0;
  const c = Number(corpBondPct) || 0;
  const g = Number(govtSecPct) || 0;
  const a = Number(altAssetPct) || 0;
  const total = e + c + g + a;
  if (!total) return null;
  // Bug fix: bar segments used to be renormalized to (pct/total)*100%, so the bar always
  // visually filled edge-to-edge regardless of whether e+c+g+a actually summed to 100 — an
  // incomplete (e.g. 80%) or invalid (e.g. 110%) allocation looked exactly like a valid,
  // complete one, while the labels beside it still showed the raw (non-renormalized) percentages.
  // Segments are now sized directly off the raw percentages against a fixed 100%-wide track, so
  // an incomplete allocation visibly leaves a gap instead of silently stretching to fill it.
  const isInvalid = Math.abs(total - 100) > 1;
  // Fixed chart-extension tokens (not the user-selectable accent) — raw hex
  // here would go stale in dark mode and could collide with the active
  // accent preset. Deliberately avoids THEME.gold since it matches the NPS
  // section's own brand color (NPS_ORANGE) used on the same account cards.
  const bars = [
    { label: "E", pct: e, color: THEME.rust },
    { label: "C", pct: c, color: THEME.cyan },
    { label: "G", pct: g, color: THEME.sage },
    { label: "A", pct: a, color: THEME.violet },
  ].filter((b) => b.pct > 0);
  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          display: "flex",
          borderRadius: 6,
          overflow: "hidden",
          height: 8,
          width: "100%",
          background: `color-mix(in srgb, ${THEME.muted} 15%, transparent)`,
        }}
      >
        {bars.map((b) => (
          <div
            key={b.label}
            style={{ width: `${Math.min(100, b.pct)}%`, background: b.color, flexShrink: 0 }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 5, flexWrap: "wrap" as const }}>
        {bars.map((b) => (
          <span
            key={b.label}
            style={{
              fontSize: 10,
              color: THEME.muted,
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: b.color,
                display: "inline-block",
              }}
            />
            {b.label} {b.pct}%
          </span>
        ))}
        {isInvalid && (
          <span style={{ fontSize: 10, color: THEME.rust, fontWeight: 700 }}>
            Total {total}% — should sum to 100%
          </span>
        )}
      </div>
    </div>
  );
}

/* ── NPS Transaction Modal ──────────────────────────────────────────── */
function NPSTransactionModal({ onClose, onSave, initial }: any) {
  const [form, setForm] = useState(() => {
    if (!initial)
      return {
        date: today(),
        particulars: "",
        uploadedBy: "",
        employeeAmount: "",
        employerAmount: "",
      };
    return {
      date: initial.date || today(),
      particulars: initial.particulars || "",
      uploadedBy: initial.uploadedBy || "",
      employeeAmount: initial.employeeAmount != null ? String(initial.employeeAmount) : "",
      employerAmount: initial.employerAmount != null ? String(initial.employerAmount) : "",
    };
  });

  const empAmt = Number(form.employeeAmount || 0);
  const erAmt = Number(form.employerAmount || 0);
  // Bug fix: previously only required ONE side positive, so e.g. employeeAmount=-5000,
  // employerAmount=10000 passed validation and silently corrupted totalEmployee/corpus sums —
  // the `min={0}` on the inputs below doesn't block a pasted or programmatically-set negative.
  const valid = !!form.date && empAmt >= 0 && erAmt >= 0 && (empAmt > 0 || erAmt > 0);

  return (
    <Modal title={initial ? "Edit NPS Transaction" : "Add NPS Transaction"} onClose={onClose}>
      <Field label="Date *">
        <input
          style={inp}
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
      </Field>
      <Field label="Particulars">
        <input
          style={inp}
          value={form.particulars}
          onChange={(e) => setForm({ ...form, particulars: e.target.value })}
          placeholder="e.g. By Arrear - Regular Contribution for April"
        />
      </Field>
      <Field label="Uploaded By / Source">
        <input
          style={inp}
          value={form.uploadedBy}
          onChange={(e) => setForm({ ...form, uploadedBy: e.target.value })}
          placeholder="e.g. Kotak Mahindra Bank Limited (5000041) or eNPS - Online"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Employee Contribution (₹)">
          <input
            style={inp}
            type="number"
            min={0}
            value={form.employeeAmount}
            onChange={(e) => setForm({ ...form, employeeAmount: e.target.value })}
            placeholder="0"
          />
        </Field>
        <Field label="Employer Contribution (₹)">
          <input
            style={inp}
            type="number"
            min={0}
            value={form.employerAmount}
            onChange={(e) => setForm({ ...form, employerAmount: e.target.value })}
            placeholder="0"
          />
        </Field>
      </div>
      {(empAmt > 0 || erAmt > 0) && (
        <div
          style={{
            padding: "8px 12px",
            background: `color-mix(in srgb, ${NPS_ORANGE} 5%, transparent)`,
            borderRadius: 8,
            fontSize: 12,
            color: NPS_ORANGE,
            fontWeight: 700,
          }}
        >
          Total: <Prv>{fmtINRFull(empAmt + erAmt)}</Prv>
          {empAmt > 0 && erAmt > 0 && (
            <span style={{ color: THEME.muted, fontWeight: 500 }}>
              {" "}
              (Employee: <Prv>{fmtINRFull(empAmt)}</Prv> + Employer: <Prv>{fmtINRFull(erAmt)}</Prv>)
            </span>
          )}
        </div>
      )}
      <ModalActions
        onSave={() =>
          valid &&
          onSave({
            date: form.date,
            particulars: form.particulars,
            uploadedBy: form.uploadedBy,
            employeeAmount: empAmt,
            employerAmount: erAmt,
          })
        }
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Add Transaction"}
      />
    </Modal>
  );
}

/* ── NPS CSV Import Panel ───────────────────────────────────────────── */
function NPSCsvPanel({ onImport }: any) {
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
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 4)
          throw new Error(
            `Row ${i + 1}: need date, particulars, uploaded_by, employee_amount[, employer_amount]`
          );
        const [date, particulars, uploadedBy, empRaw, erRaw] = parts;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/))
          throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD`);
        const empAmt = Number(empRaw) || 0;
        const erAmt = Number(erRaw || 0) || 0;
        if (empAmt < 0 || erAmt < 0) throw new Error(`Row ${i + 1}: amounts cannot be negative`);
        if (empAmt === 0 && erAmt === 0)
          throw new Error(`Row ${i + 1}: at least one of employee or employer amount must be > 0`);
        return {
          id: `npstx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          date,
          particulars,
          uploadedBy,
          employeeAmount: empAmt,
          employerAmount: erAmt,
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
      "# NPS Transaction Import Template\n# Columns: date, particulars, uploaded_by, employee_amount, employer_amount\n# Amounts: 0 means no contribution from that side\n2025-04-14,By Arrear - Regular Contribution for April,Kotak Mahindra Bank Limited (5000041),0,4664.6\n2025-08-17,By Voluntary Contributions,eNPS - Online (5000682),20000,0\n2026-01-13,For January 2026,Kotak Mahindra Bank Limited (5000041),0,4664.6";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nps_import_template.csv";
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

  const btnStyle = {
    padding: "8px 16px",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  } as const;

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 12,
        marginBottom: 16,
        background: `color-mix(in srgb, ${NPS_ORANGE} 4%, transparent)`,
        border: `1px solid ${`color-mix(in srgb, ${NPS_ORANGE} 22%, transparent)`}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: NPS_ORANGE,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FileText size={15} /> Bulk Import via CSV
        </div>
        <button
          onClick={downloadTemplate}
          style={{
            ...btnStyle,
            border: `1px solid ${`color-mix(in srgb, ${NPS_ORANGE} 30%, transparent)`}`,
            background: "transparent",
            color: NPS_ORANGE,
          }}
        >
          Download Template
        </button>
      </div>
      <div
        style={{
          fontSize: 11,
          color: THEME.muted,
          marginBottom: 12,
          padding: "8px 12px",
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: 8,
          lineHeight: 1.6,
        }}
      >
        <b style={{ color: THEME.ink }}>Format:</b>{" "}
        <code style={{ background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`, padding: "1px 5px", borderRadius: 4 }}>
          date, particulars, uploaded_by, employee_amount, employer_amount
        </code>
        <br />
        Use{" "}
        <code style={{ background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`, padding: "1px 5px", borderRadius: 4 }}>
          0
        </code>{" "}
        for the side that did not contribute. Date format:{" "}
        <code style={{ background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`, padding: "1px 5px", borderRadius: 4 }}>
          YYYY-MM-DD
        </code>
      </div>
      <label
        style={{
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "20px 0",
          border: `1.5px dashed ${`color-mix(in srgb, ${NPS_ORANGE} 40%, transparent)`}`,
          borderRadius: 10,
          cursor: "pointer",
          marginBottom: 12,
          background: `color-mix(in srgb, ${NPS_ORANGE} 3%, transparent)`,
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload size={22} color={NPS_ORANGE} />
        <div style={{ fontSize: 13, fontWeight: 600, color: NPS_ORANGE }}>
          {csvFileName || "Drop CSV file here or click to browse"}
        </div>
        <div style={{ fontSize: 11, color: THEME.muted }}>Supports .csv and .txt files</div>
        <input type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFile} />
      </label>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: THEME.muted,
          marginBottom: 6,
          textAlign: "center" as const,
        }}
      >
        — or paste CSV text below —
      </div>
      <textarea
        style={{
          width: "100%",
          minHeight: 80,
          padding: "10px 12px",
          background: "var(--surface-0)",
          border: `1.5px solid ${THEME.line}`,
          borderRadius: 10,
          color: THEME.ink,
          fontSize: 12,
          fontFamily: "monospace",
          resize: "vertical" as const,
          boxSizing: "border-box" as const,
        }}
        value={csvText}
        onChange={(e) => {
          setCsvText(e.target.value);
          setCsvPreview([]);
          setCsvError("");
          setImportDone(false);
        }}
        placeholder={
          "2025-04-14, By Arrear - Regular Contribution for April, Kotak Mahindra Bank (5000041), 0, 4664.60\n2025-08-17, By Voluntary Contributions, eNPS - Online (5000682), 20000, 0"
        }
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" as const }}>
        <button
          style={{
            ...btnStyle,
            border: `1px solid ${`color-mix(in srgb, ${NPS_ORANGE} 40%, transparent)`}`,
            background: "transparent",
            color: NPS_ORANGE,
          }}
          onClick={() => parseCsvText(csvText)}
        >
          Preview Data
        </button>
        {csvPreview.length > 0 && !importDone && (
          <button
            style={{ ...btnStyle, border: "none", background: NPS_ORANGE, color: THEME.darkInk }}
            onClick={doImport}
          >
            Import {csvPreview.length} Row{csvPreview.length !== 1 ? "s" : ""}
          </button>
        )}
        {importDone && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: THEME.sage,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={15} /> Imported!
          </div>
        )}
      </div>
      {csvError && (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            color: THEME.rust,
            fontSize: 12,
            padding: "8px 12px",
            background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
            borderRadius: 8,
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {csvError}
        </div>
      )}
      {csvPreview.length > 0 && (
        <div
          style={{
            marginTop: 12,
            border: `1px solid ${THEME.line}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              background: `color-mix(in srgb, ${NPS_ORANGE} 7%, transparent)`,
              fontSize: 11,
              fontWeight: 700,
              color: NPS_ORANGE,
            }}
          >
            {csvPreview.length} rows ready — preview:
          </div>
          <div style={{ maxHeight: 160, overflowY: "auto" as const, overflowX: "auto" as const }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--surface-0)" }}>
                  {["Date", "Particulars", "Uploaded By", "Employee (₹)", "Employer (₹)"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: "6px 10px",
                          textAlign: "left" as const,
                          fontWeight: 600,
                          fontSize: 10,
                          color: THEME.muted,
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {csvPreview.map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${THEME.line}` }}>
                    <td style={{ padding: "6px 10px" }}>{r.date}</td>
                    <td
                      style={{
                        padding: "6px 10px",
                        maxWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap" as const,
                      }}
                    >
                      {r.particulars || "—"}
                    </td>
                    <td style={{ padding: "6px 10px", color: THEME.muted, fontSize: 11 }}>
                      {r.uploadedBy || "—"}
                    </td>
                    <td style={{ padding: "6px 10px", fontWeight: 700, color: THEME.accent }}>
                      {r.employeeAmount > 0 ? <Prv>{fmtINRFull(r.employeeAmount)}</Prv> : "—"}
                    </td>
                    <td style={{ padding: "6px 10px", fontWeight: 700, color: THEME.cyan }}>
                      {r.employerAmount > 0 ? <Prv>{fmtINRFull(r.employerAmount)}</Prv> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── NPS Account Card ────────────────────────────────────────────────── */
function NPSAccountCard({ n, removeItem, updateItem }: any) {
  const pfmColor = NPS_PFM_COLOR[n.fundManager] || NPS_ORANGE;
  const isActive = n.investmentChoice === "Active";

  const [txs, setTxs] = useState<any[]>(n.transactions || []);
  const [showLedger, setShowLedger] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);

  useEffect(() => {
    setTxs(n.transactions || []);
  }, [n.id]);

  const persistTxs = (updated: any[]) => {
    setTxs(updated);
    updateItem("nps", n.id, { transactions: updated });
  };

  const saveTx = (form: any) => {
    const entry = { ...form, id: editTx ? editTx.id : uid() };
    const updated = editTx ? txs.map((t) => (t.id === editTx.id ? entry : t)) : [...txs, entry];
    persistTxs(updated);
    setShowTxModal(false);
    setEditTx(null);
  };

  const removeTx = (id: string) => persistTxs(txs.filter((t) => t.id !== id));
  const importRows = (rows: any[]) => {
    persistTxs([...txs, ...rows]);
    setShowCsvImport(false);
  };

  const sortedTxs = [...txs].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const totalEmployee = txs.reduce((s, t) => s + (Number(t.employeeAmount) || 0), 0);
  const totalEmployer = txs.reduce((s, t) => s + (Number(t.employerAmount) || 0), 0);
  const totalContributed = totalEmployee + totalEmployer;
  const annualTotal = (Number(n.yearContribution) || 0) + (Number(n.employerContribution) || 0);

  const fmtDate = (d: string) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "—";

  const exportCsv = () => {
    const header =
      "Date,Particulars,Uploaded By,Employee Contribution (Rs),Employer Contribution (Rs)";
    const rows = sortedTxs.map((t) =>
      [
        t.date,
        `"${(t.particulars || "").replace(/"/g, '""')}"`,
        `"${(t.uploadedBy || "").replace(/"/g, '""')}"`,
        t.employeeAmount || 0,
        t.employerAmount || 0,
      ].join(",")
    );
    const content = [header, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nps_transactions_${(n.pran || n.id || "account").replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const btnGhost = {
    background: "transparent",
    border: `1px solid ${THEME.line}`,
    borderRadius: 8,
    color: THEME.ink,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 600,
    fontSize: 12,
    padding: "7px 14px",
  } as const;

  return (
    <Card style={{ padding: 20, borderTop: `3px solid ${pfmColor}` }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <BankLogo name={n.fundManager || "NPS"} size={36} accentColor={pfmColor} />
          <div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
              <Badge variant="gold">NPS Tier {n.tier || "I"}</Badge>
              {n.schemeType && n.schemeType !== "All Citizen" && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 20,
                    background: `color-mix(in srgb, ${pfmColor} 9%, transparent)`,
                    color: pfmColor,
                    fontWeight: 700,
                    border: `1px solid ${`color-mix(in srgb, ${pfmColor} 25%, transparent)`}`,
                  }}
                >
                  {n.schemeType}
                </span>
              )}
            </div>
            {n.fundManager && (
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                PFM:{" "}
                <span style={{ color: pfmColor, fontWeight: 700 }}>{n.fundManager} Pension</span>
              </div>
            )}
            {n.pran && (
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                PRAN:{" "}
                <span style={{ color: THEME.ink, fontWeight: 600 }}>
                  <Prv>{n.pran}</Prv>
                </span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <Button
            variant="ghost"
            size="sm"
            icon={<Pencil size={12} />}
            onClick={() => setShowEditAccount(true)}
            aria-label={`Edit NPS account${n.pran ? ` ${n.pran}` : ""}`}
            title="Edit"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={12} />}
            style={{ color: THEME.rust }}
            onClick={() => removeItem("nps", n.id)}
            aria-label={`Delete NPS account${n.pran ? ` ${n.pran}` : ""}`}
            title="Delete"
          />
        </div>
      </div>

      {/* Corpus */}
      {(() => {
        const manualBalance = Number(n.balance) || 0;
        const corpusFromTxs = manualBalance === 0 && totalContributed > 0;
        const displayCorpus = manualBalance > 0 ? manualBalance : totalContributed;
        return (
          <>
            <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>
              Current Corpus
              {corpusFromTxs && (
                <span style={{ fontSize: 10, color: THEME.cyan, marginLeft: 6, fontWeight: 600 }}>
                  based on contributions — update corpus for market value
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: NPS_ORANGE,
                letterSpacing: "-0.03em",
                marginBottom: 12,
              }}
            >
              <Prv>{fmtINRFull(displayCorpus)}</Prv>
            </div>
          </>
        );
      })()}

      {/* Contribution breakdown (from ledger) */}
      {totalContributed > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {[
            {
              label: "Employee Total",
              value: totalEmployee,
              color: THEME.accent,
              bg: `color-mix(in srgb, ${THEME.accent} 10%, var(--t-paper))`,
              border: `color-mix(in srgb, ${THEME.accent} 25%, transparent)`,
            },
            {
              label: "Employer Total",
              value: totalEmployer,
              color: THEME.cyan,
              bg: `color-mix(in srgb, ${THEME.cyan} 10%, var(--t-paper))`,
              border: `color-mix(in srgb, ${THEME.cyan} 25%, transparent)`,
            },
          ].map(({ label, value, color, bg, border }) => (
            <div
              key={label}
              style={{
                padding: "9px 12px",
                borderRadius: 10,
                border: `1px solid ${border}`,
                background: bg,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: THEME.muted,
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                  marginBottom: 3,
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color }}>
                <Prv>{fmtINRFull(value)}</Prv>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Investment approach */}
      <div style={{ fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: THEME.muted }}>Investment: </span>
        <span style={{ fontWeight: 700, color: THEME.ink }}>
          {isActive
            ? "Active Choice (Manual)"
            : `Auto Choice — ${NPS_LC_LABEL[n.lifecycleFund] || n.lifecycleFund || "LC-50"}`}
        </span>
      </div>
      {!isActive && (
        <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 8 }}>
          {n.lifecycleFund === "LC-75"
            ? "Starts 75% equity at ≤35 yrs, tapers to 15% at 55"
            : n.lifecycleFund === "LC-25"
              ? "Starts 25% equity, low risk — tapers to 5% at 55"
              : "Starts 50% equity, balanced — tapers to 10% at 55"}
        </div>
      )}

      {/* Asset allocation bar (Active only) */}
      {isActive && (
        <NpsAllocationBar
          equityPct={n.equityPct}
          corpBondPct={n.corpBondPct}
          govtSecPct={n.govtSecPct}
          altAssetPct={n.altAssetPct}
        />
      )}

      {/* Annual contribution from account fields */}
      {annualTotal > 0 && totalContributed === 0 && (
        <div style={{ marginTop: 8, fontSize: 10, color: THEME.cyan, fontWeight: 600 }}>
          Annual estimate: <Prv>{fmtINRFull(annualTotal)}</Prv>/yr
          {Number(n.employerContribution) > 0 ? " (incl. employer — 80CCD(2))" : ""}
        </div>
      )}

      {/* Tier note */}
      <div
        style={{
          fontSize: 10,
          color: THEME.muted,
          marginTop: 12,
          padding: "6px 10px",
          background: "var(--surface-1)",
          borderRadius: 8,
          lineHeight: 1.5,
        }}
      >
        {n.tier === "II"
          ? "Tier II — No lock-in. Fully withdrawable anytime. No additional tax benefit."
          : "Tier I — Locked till age 60. At exit: 60% lump sum (tax-free) + 40% compulsory annuity."}
      </div>

      {/* Ledger toolbar */}
      <div
        style={{
          marginTop: 18,
          display: "flex",
          gap: 8,
          flexWrap: "wrap" as const,
          alignItems: "center",
        }}
      >
        <button
          style={{ ...btnGhost, color: NPS_ORANGE, borderColor: `color-mix(in srgb, ${NPS_ORANGE} 30%, transparent)` }}
          onClick={() => {
            setShowLedger((v) => !v);
            setShowCsvImport(false);
          }}
        >
          <List size={13} />{" "}
          {showLedger ? "Hide Ledger" : `Ledger${txs.length > 0 ? ` (${txs.length})` : ""}`}
        </button>
        <button
          style={{ ...btnGhost }}
          onClick={() => {
            setShowTxModal(true);
            setEditTx(null);
          }}
        >
          <Plus size={13} /> Add Transaction
        </button>
        <button
          style={{ ...btnGhost }}
          onClick={() => {
            setShowCsvImport((v) => !v);
            setShowLedger(false);
          }}
        >
          <Upload size={13} /> Import CSV
        </button>
        {txs.length > 0 && (
          <button style={{ ...btnGhost }} onClick={exportCsv}>
            <FileText size={13} /> Export CSV
          </button>
        )}
      </div>

      {/* CSV import panel */}
      {showCsvImport && (
        <div style={{ marginTop: 14 }}>
          <NPSCsvPanel onImport={importRows} />
        </div>
      )}

      {/* Ledger table */}
      {showLedger && (
        <div style={{ marginTop: 14 }}>
          {txs.length === 0 ? (
            <div
              style={{
                padding: "24px 0",
                textAlign: "center" as const,
                color: THEME.muted,
                fontSize: 13,
              }}
            >
              No transactions yet — add manually or import CSV above
            </div>
          ) : (
            <div
              style={{ border: `1px solid ${THEME.line}`, borderRadius: 12, overflow: "hidden" }}
            >
              <div style={{ overflowX: "auto" as const }}>
                <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--surface-1)" }}>
                      {[
                        "Date",
                        "Particulars",
                        "Uploaded By",
                        "Employee (₹)",
                        "Employer (₹)",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 12px",
                            textAlign:
                              h === "Employee (₹)" || h === "Employer (₹)"
                                ? ("right" as const)
                                : ("left" as const),
                            fontWeight: 700,
                            fontSize: 10,
                            color: THEME.muted,
                            textTransform: "uppercase" as const,
                            letterSpacing: "0.06em",
                            whiteSpace: "nowrap" as const,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTxs.map((t) => (
                      <tr key={t.id} style={{ borderTop: `1px solid ${THEME.line}` }}>
                        <td
                          style={{
                            padding: "8px 12px",
                            whiteSpace: "nowrap" as const,
                            color: THEME.muted,
                            fontSize: 11,
                          }}
                        >
                          {fmtDate(t.date)}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap" as const,
                          }}
                        >
                          {t.particulars || "—"}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            color: THEME.muted,
                            fontSize: 11,
                            maxWidth: 160,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap" as const,
                          }}
                        >
                          {t.uploadedBy || "—"}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            textAlign: "right" as const,
                            fontWeight: 700,
                            color: t.employeeAmount > 0 ? THEME.accent : THEME.muted,
                          }}
                        >
                          {t.employeeAmount > 0 ? <Prv>{fmtINRFull(t.employeeAmount)}</Prv> : "—"}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            textAlign: "right" as const,
                            fontWeight: 700,
                            color: t.employerAmount > 0 ? THEME.cyan : THEME.muted,
                          }}
                        >
                          {t.employerAmount > 0 ? <Prv>{fmtINRFull(t.employerAmount)}</Prv> : "—"}
                        </td>
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap" as const }}>
                          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Pencil size={11} />}
                              onClick={() => {
                                setEditTx(t);
                                setShowTxModal(true);
                              }}
                              aria-label={`Edit transaction dated ${t.date}`}
                              title="Edit"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 size={11} />}
                              style={{ color: THEME.rust }}
                              onClick={() => removeTx(t.id)}
                              aria-label={`Delete transaction dated ${t.date}`}
                              title="Delete"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        borderTop: `2px solid ${THEME.line}`,
                        background: "var(--surface-1)",
                      }}
                    >
                      <td
                        colSpan={3}
                        style={{ padding: "8px 12px", fontWeight: 700, fontSize: 11 }}
                      >
                        Total ({txs.length} entries)
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right" as const,
                          fontWeight: 800,
                          color: THEME.accent,
                        }}
                      >
                        <Prv>{fmtINRFull(totalEmployee)}</Prv>
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right" as const,
                          fontWeight: 800,
                          color: THEME.cyan,
                        }}
                      >
                        <Prv>{fmtINRFull(totalEmployer)}</Prv>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showTxModal && (
        <NPSTransactionModal
          initial={editTx}
          onClose={() => {
            setShowTxModal(false);
            setEditTx(null);
          }}
          onSave={saveTx}
        />
      )}
      {showEditAccount && (
        <EditNPSModal
          nps={n}
          onClose={() => setShowEditAccount(false)}
          onSave={(updated: any) => {
            updateItem("nps", n.id, updated);
            setShowEditAccount(false);
          }}
        />
      )}
    </Card>
  );
}

/* ── NPS Section ────────────────────────────────────────────────────── */
function NPSSection({ items, removeItem, updateItem, onAdd }: any) {
  const totalCorpus = items.reduce((s: number, n: any) => {
    const bal = Number(n.balance) || 0;
    const txTotal = (n.transactions || []).reduce(
      (ss: number, t: any) =>
        ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
      0
    );
    return s + (bal > 0 ? bal : txTotal);
  }, 0);
  const totalEmployee = items.reduce(
    (s: number, n: any) =>
      s +
      (n.transactions || []).reduce(
        (ss: number, t: any) => ss + (Number(t.employeeAmount) || 0),
        0
      ),
    0
  );
  const totalEmployer = items.reduce(
    (s: number, n: any) =>
      s +
      (n.transactions || []).reduce(
        (ss: number, t: any) => ss + (Number(t.employerAmount) || 0),
        0
      ),
    0
  );
  const totalTx = items.reduce((s: number, n: any) => s + (n.transactions || []).length, 0);

  return (
    <div className="animate-fade-in-up">
      {items.length === 0 ? (
        <InvestmentEmptyState
          icon={Briefcase}
          gradient="linear-gradient(135deg,#c2410c 0%,#fb923c 100%)"
          dotColor="#ea580c"
          title="No NPS Account Added Yet"
          description="Track your NPS — Tier I & II, fund manager, scheme type, asset allocation (E/C/G/A), and corpus."
          pills={["Tier I / Tier II", "PRAN Number", "Fund Manager", "Asset Allocation"]}
          buttonLabel="Add NPS Account"
          onAdd={onAdd}
        />
      ) : (
        <>
          {/* Summary tiles */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "Total NPS Corpus",
                value: fmtINRFull(totalCorpus),
                numericValue: totalCorpus,
                formatValue: fmtINRFull,
                color: NPS_ORANGE,
                Icon: PiggyBank,
              },
              ...(totalEmployee + totalEmployer > 0
                ? [
                    {
                      label: "Employee Contributions",
                      value: fmtINRFull(totalEmployee),
                      numericValue: totalEmployee,
                      formatValue: fmtINRFull,
                      color: THEME.accent,
                      Icon: TrendingUp,
                    },
                    {
                      label: "Employer Contributions",
                      value: fmtINRFull(totalEmployer),
                      numericValue: totalEmployer,
                      formatValue: fmtINRFull,
                      color: THEME.cyan,
                      Icon: Briefcase,
                    },
                  ]
                : [
                    {
                      label: "Accounts",
                      value: String(items.length),
                      numericValue: items.length,
                      formatValue: (n: number) => String(Math.round(n)),
                      color: THEME.accent,
                      Icon: BarChart3,
                    },
                  ]),
              ...(totalTx > 0
                ? [
                    {
                      label: "Transactions",
                      value: String(totalTx),
                      numericValue: totalTx,
                      formatValue: (n: number) => String(Math.round(n)),
                      color: THEME.gold,
                      Icon: List,
                    },
                  ]
                : []),
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

          {/* NPS account cards */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
            {items.map((n: any) => (
              <NPSAccountCard key={n.id} n={n} removeItem={removeItem} updateItem={updateItem} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── EPF Account Card ────────────────────────────────────────────────── */
// Fixed chart-extension tokens (not the user-selectable accent) — raw hex
// here would go stale in dark mode and could exactly match the active
// accent preset.
const EPF_TX_TYPES = [
  { value: "monthly_contribution", label: "Monthly Contribution (Passbook)", color: THEME.violet },
  { value: "employee_contribution", label: "Employee Contribution", color: THEME.accent },
  { value: "employer_contribution", label: "Employer Contribution", color: THEME.cyan },
  { value: "interest_credit", label: "Interest Credit (EPFO)", color: THEME.sage },
  { value: "transfer_in", label: "Transfer In (from Previous Employer)", color: THEME.gold },
  { value: "withdrawal", label: "Withdrawal", color: THEME.rust },
];

function EPFTransactionModal({ onClose, onSave, initial, establishments = [] }: any) {
  const [form, setForm] = useState(() => {
    if (!initial)
      return {
        date: today(),
        type: "monthly_contribution",
        amount: "",
        note: "",
        wageMonth: "",
        particulars: "",
        epfWages: "",
        epsWages: "",
        employeeShare: "",
        employerShare: "",
        pensionShare: "",
        estId: "",
        fromEmployer: "",
      };
    return {
      date: initial.date || today(),
      type: initial.type || "monthly_contribution",
      amount: initial.amount != null ? String(initial.amount) : "",
      note: initial.note || "",
      wageMonth: initial.wageMonth || "",
      particulars: initial.particulars || "",
      epfWages: initial.epfWages != null ? String(initial.epfWages) : "",
      epsWages: initial.epsWages != null ? String(initial.epsWages) : "",
      employeeShare: initial.employeeShare != null ? String(initial.employeeShare) : "",
      employerShare: initial.employerShare != null ? String(initial.employerShare) : "",
      pensionShare: initial.pensionShare != null ? String(initial.pensionShare) : "",
      estId: initial.estId || "",
      fromEmployer: initial.fromEmployer || "",
    };
  });

  const isMonthly = form.type === "monthly_contribution";
  const isInterest = form.type === "interest_credit";
  const isTransfer = form.type === "transfer_in";
  const monthlyHasAmount =
    Number(form.employeeShare || 0) > 0 ||
    Number(form.employerShare || 0) > 0 ||
    Number(form.pensionShare || 0) > 0;
  const interestHasAmount =
    Number(form.employeeShare || 0) > 0 || Number(form.employerShare || 0) > 0;
  const valid = isMonthly
    ? !!form.wageMonth && monthlyHasAmount
    : isInterest
      ? interestHasAmount
      : !!form.amount && Number(form.amount) > 0;

  return (
    <Modal title={initial ? "Edit Transaction" : "Add EPF Transaction"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Transaction Date">
          <input
            style={inp}
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </Field>
        <Field label="Type">
          <select
            style={inp}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {EPF_TX_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Establishment tag — shown for monthly/interest when establishments exist */}
      {!isTransfer && establishments.length > 0 && (
        <Field label="Link to Establishment (optional)">
          <select
            style={inp}
            value={form.estId}
            onChange={(e) => setForm({ ...form, estId: e.target.value })}
          >
            <option value="">— Not tagged —</option>
            {[...establishments]
              .sort((a, b) => (b.joiningDate || "").localeCompare(a.joiningDate || ""))
              .map((est: any) => (
                <option key={est.id} value={est.id}>
                  {est.employerName}
                  {est.exitDate ? ` (exited)` : " (current)"}
                </option>
              ))}
          </select>
        </Field>
      )}

      {isMonthly ? (
        <>
          <div
            style={{
              marginTop: 4,
              padding: "9px 12px",
              borderRadius: 8,
              background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
              border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 15%, transparent)`}`,
              fontSize: 11,
              color: THEME.accent,
              marginBottom: 4,
            }}
          >
            Enter one row from your EPFO passbook — each wage month is one entry.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Wage Month *">
              <input
                style={inp}
                value={form.wageMonth}
                onChange={(e) => setForm({ ...form, wageMonth: e.target.value })}
                placeholder="e.g. Apr-2021"
              />
            </Field>
            <Field label="Particulars">
              <input
                style={inp}
                value={form.particulars}
                onChange={(e) => setForm({ ...form, particulars: e.target.value })}
                placeholder="Cont. For Due-Month 052021"
              />
            </Field>
            <Field label="EPF Wages (₹)">
              <input
                style={inp}
                type="number"
                value={form.epfWages}
                onChange={(e) => setForm({ ...form, epfWages: e.target.value })}
                placeholder="15000"
              />
            </Field>
            <Field label="EPS Wages (₹)">
              <input
                style={inp}
                type="number"
                value={form.epsWages}
                onChange={(e) => setForm({ ...form, epsWages: e.target.value })}
                placeholder="15000"
              />
            </Field>
            <Field label="Employee Share 12% (₹)">
              <input
                style={inp}
                type="number"
                value={form.employeeShare}
                onChange={(e) => setForm({ ...form, employeeShare: e.target.value })}
                placeholder="1800"
              />
            </Field>
            <Field label="Employer Share 3.67% (₹)">
              <input
                style={inp}
                type="number"
                value={form.employerShare}
                onChange={(e) => setForm({ ...form, employerShare: e.target.value })}
                placeholder="550"
              />
            </Field>
            <Field label="Pension Share 8.33% (₹)">
              <input
                style={inp}
                type="number"
                value={form.pensionShare}
                onChange={(e) => setForm({ ...form, pensionShare: e.target.value })}
                placeholder="1250"
              />
            </Field>
          </div>
        </>
      ) : isInterest ? (
        <>
          <div
            style={{
              marginTop: 4,
              padding: "9px 12px",
              borderRadius: 8,
              background: `color-mix(in srgb, ${THEME.sage} 4%, transparent)`,
              border: `1px solid ${`color-mix(in srgb, ${THEME.sage} 20%, transparent)`}`,
              fontSize: 11,
              color: THEME.sage,
              marginBottom: 4,
            }}
          >
            EPFO credits interest separately to Employee PF and Employer PF — enter both splits
            exactly as shown in your passbook.
          </div>
          <Field label="Period / Label (optional)">
            <input
              style={inp}
              value={form.particulars}
              onChange={(e) => setForm({ ...form, particulars: e.target.value })}
              placeholder="e.g. Int. Updated upto 31/03/2026"
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Employee PF Interest (₹)">
              <input
                style={inp}
                type="number"
                value={form.employeeShare}
                onChange={(e) => setForm({ ...form, employeeShare: e.target.value })}
                placeholder="668"
              />
            </Field>
            <Field label="Employer PF Interest (₹)">
              <input
                style={inp}
                type="number"
                value={form.employerShare}
                onChange={(e) => setForm({ ...form, employerShare: e.target.value })}
                placeholder="204"
              />
            </Field>
            <Field label="Pension Interest (₹)">
              <input
                style={inp}
                type="number"
                value={form.pensionShare}
                onChange={(e) => setForm({ ...form, pensionShare: e.target.value })}
                placeholder="0"
              />
            </Field>
          </div>
          <Field label="Note (optional)">
            <input
              style={inp}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="e.g. EPFO Interest FY 2025-26 @ 8.25%"
            />
          </Field>
        </>
      ) : isTransfer ? (
        <>
          <div
            style={{
              marginTop: 4,
              padding: "9px 12px",
              borderRadius: 8,
              background: `color-mix(in srgb, ${THEME.sage} 4%, transparent)`,
              border: `1px solid ${`color-mix(in srgb, ${THEME.sage} 25%, transparent)`}`,
              fontSize: 11,
              color: THEME.sage,
              marginBottom: 4,
            }}
          >
            Record EPF balance transferred from your previous employer (Form 13). The amount will be
            credited to your current PF account.
          </div>
          <Field label="From Employer (Previous Company Name)">
            <input
              style={inp}
              value={form.fromEmployer}
              onChange={(e) => setForm({ ...form, fromEmployer: e.target.value })}
              placeholder="e.g. Infosys Ltd."
            />
          </Field>
          {establishments.length > 0 && (
            <Field label="Credit To Establishment (optional)">
              <select
                style={inp}
                value={form.estId}
                onChange={(e) => setForm({ ...form, estId: e.target.value })}
              >
                <option value="">— Not tagged —</option>
                {[...establishments]
                  .filter((e: any) => !e.exitDate)
                  .map((est: any) => (
                    <option key={est.id} value={est.id}>
                      {est.employerName} (current)
                    </option>
                  ))}
              </select>
            </Field>
          )}
          <Field label="Total Transfer Amount (₹) *">
            <input
              style={inp}
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 42500"
              min="1"
            />
          </Field>
          <div style={{ marginBottom: 4, fontSize: 11, color: THEME.muted }}>
            Optional: enter the split as shown in your EPFO passbook Transfer-In entry
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Employee PF (₹)">
              <input
                style={inp}
                type="number"
                value={form.employeeShare}
                onChange={(e) => setForm({ ...form, employeeShare: e.target.value })}
                placeholder="20468"
              />
            </Field>
            <Field label="Employer PF (₹)">
              <input
                style={inp}
                type="number"
                value={form.employerShare}
                onChange={(e) => setForm({ ...form, employerShare: e.target.value })}
                placeholder="6254"
              />
            </Field>
            <Field label="Pension (EPS) (₹)">
              <input
                style={inp}
                type="number"
                value={form.pensionShare}
                onChange={(e) => setForm({ ...form, pensionShare: e.target.value })}
                placeholder="13750"
              />
            </Field>
          </div>
          <Field label="Note (optional)">
            <input
              style={inp}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="e.g. Form 13 transfer — approved 15 Sep 2022"
            />
          </Field>
        </>
      ) : (
        <>
          <Field label="Amount (₹)">
            <input
              style={inp}
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 5000"
              min="1"
            />
          </Field>
          <Field label="Note (optional)">
            <input
              style={inp}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="e.g. April 2025 contribution"
            />
          </Field>
        </>
      )}
      <ModalActions
        onSave={() => valid && onSave(form)}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Add Transaction"}
      />
    </Modal>
  );
}

function EPFCsvPanel({ onImport }: any) {
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvError, setCsvError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [importDone, setImportDone] = useState(false);

  const TYPE_MAP: Record<string, string> = {
    employee: "employee_contribution",
    emp: "employee_contribution",
    e: "employee_contribution",
    employee_contribution: "employee_contribution",
    employer: "employer_contribution",
    er: "employer_contribution",
    employer_contribution: "employer_contribution",
    interest: "interest_credit",
    i: "interest_credit",
    interest_credit: "interest_credit",
    withdrawal: "withdrawal",
    w: "withdrawal",
  };

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
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 3) throw new Error(`Row ${i + 1}: need date, type, amount`);
        const [date, type, amount, note] = parts;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/))
          throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD`);
        const mappedType = TYPE_MAP[type.toLowerCase().replace(/\s+/g, "_")];
        if (!mappedType)
          throw new Error(`Row ${i + 1}: type must be employee, employer, interest, or withdrawal`);
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0)
          throw new Error(`Row ${i + 1}: amount must be a positive number`);
        return {
          date,
          type: mappedType,
          amount: amt,
          note: note || "",
          id: `epftx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
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
      "# EPF Transaction Import Template\n# Columns: date, type, amount, note\n# type: employee | employer | interest | withdrawal\n2025-04-30,employee,5000,April 2025 employee share\n2025-04-30,employer,5000,April 2025 employer share\n2026-03-31,interest,41250,EPFO interest FY 2025-26 @ 8.25%\n2026-02-15,withdrawal,50000,Partial withdrawal";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "epf_import_template.csv";
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

  const btnStyle = {
    padding: "8px 16px",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  };
  const typeInfo = (t: string) =>
    EPF_TX_TYPES.find((x) => x.value === t) || { label: t, color: THEME.muted };

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 12,
        marginBottom: 16,
        background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
        border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 22%, transparent)`}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: THEME.accent,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FileText size={15} /> Bulk Import via CSV
        </div>
        <button
          onClick={downloadTemplate}
          style={{
            ...btnStyle,
            border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 30%, transparent)`}`,
            background: "transparent",
            color: THEME.accent,
          }}
        >
          Download Template
        </button>
      </div>
      <div
        style={{
          fontSize: 11,
          color: THEME.muted,
          marginBottom: 12,
          padding: "8px 12px",
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: 8,
          lineHeight: 1.6,
        }}
      >
        <b style={{ color: THEME.ink }}>Format:</b>{" "}
        <code style={{ background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`, padding: "1px 5px", borderRadius: 4 }}>
          date, type, amount, note
        </code>
        <br />
        Type values:{" "}
        <code style={{ background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`, padding: "1px 5px", borderRadius: 4 }}>
          employee
        </code>{" "}
        &nbsp;
        <code style={{ background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`, padding: "1px 5px", borderRadius: 4 }}>
          employer
        </code>{" "}
        &nbsp;
        <code style={{ background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`, padding: "1px 5px", borderRadius: 4 }}>
          interest
        </code>{" "}
        &nbsp;
        <code style={{ background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`, padding: "1px 5px", borderRadius: 4 }}>
          withdrawal
        </code>
      </div>
      <label
        style={{
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "20px 0",
          border: `1.5px dashed ${`color-mix(in srgb, ${THEME.accent} 40%, transparent)`}`,
          borderRadius: 10,
          cursor: "pointer",
          marginBottom: 12,
          background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload size={22} color={THEME.accent} />
        <div style={{ fontSize: 13, fontWeight: 600, color: THEME.accent }}>
          {csvFileName || "Drop CSV file here or click to browse"}
        </div>
        <div style={{ fontSize: 11, color: THEME.muted }}>Supports .csv and .txt files</div>
        <input type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFile} />
      </label>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: THEME.muted,
          marginBottom: 6,
          textAlign: "center" as const,
        }}
      >
        — or paste CSV text below —
      </div>
      <textarea
        style={{
          width: "100%",
          minHeight: 80,
          padding: "10px 12px",
          background: "var(--surface-0)",
          border: `1.5px solid ${THEME.line}`,
          borderRadius: 10,
          color: THEME.ink,
          fontSize: 12,
          fontFamily: "monospace",
          resize: "vertical" as const,
          boxSizing: "border-box" as const,
        }}
        value={csvText}
        onChange={(e) => {
          setCsvText(e.target.value);
          setCsvPreview([]);
          setCsvError("");
          setImportDone(false);
        }}
        placeholder={
          "2025-04-30, employee, 5000, April 2025\n2025-04-30, employer, 5000, April 2025\n2026-03-31, interest, 41250, EPFO FY 2025-26"
        }
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" as const }}>
        <button
          style={{
            ...btnStyle,
            border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 40%, transparent)`}`,
            background: "transparent",
            color: THEME.accent,
          }}
          onClick={() => parseCsvText(csvText)}
        >
          Preview Data
        </button>
        {csvPreview.length > 0 && !importDone && (
          <button
            style={{ ...btnStyle, border: "none", background: THEME.accent, color: THEME.darkInk }}
            onClick={doImport}
          >
            Import {csvPreview.length} Row{csvPreview.length !== 1 ? "s" : ""}
          </button>
        )}
        {importDone && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: THEME.sage,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={15} /> Imported!
          </div>
        )}
      </div>
      {csvError && (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            color: THEME.rust,
            fontSize: 12,
            padding: "8px 12px",
            background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
            borderRadius: 8,
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {csvError}
        </div>
      )}
      {csvPreview.length > 0 && (
        <div
          style={{
            marginTop: 12,
            border: `1px solid ${THEME.line}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              background: `color-mix(in srgb, ${THEME.accent} 7%, transparent)`,
              fontSize: 11,
              fontWeight: 700,
              color: THEME.accent,
            }}
          >
            {csvPreview.length} rows ready — preview:
          </div>
          <div style={{ maxHeight: 160, overflowY: "auto" as const, overflowX: "auto" as const }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--surface-0)" }}>
                  {["Date", "Type", "Amount", "Note"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "6px 10px",
                        textAlign: "left" as const,
                        fontWeight: 600,
                        fontSize: 10,
                        color: THEME.muted,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvPreview.map((r, i) => {
                  const ti = typeInfo(r.type);
                  return (
                    <tr key={i} style={{ borderTop: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "6px 10px" }}>{r.date}</td>
                      <td style={{ padding: "6px 10px" }}>
                        <span style={{ color: ti.color, fontWeight: 600, fontSize: 11 }}>
                          {ti.label}
                        </span>
                      </td>
                      <td style={{ padding: "6px 10px", fontWeight: 700 }}>
                        <Prv>{fmtINRFull(r.amount)}</Prv>
                      </td>
                      <td style={{ padding: "6px 10px", color: THEME.muted }}>{r.note || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Add / Edit Establishment (Service History) ─────────────────────── */
function AddEstablishmentModal({ onClose, onSave, initial }: any) {
  const [form, setForm] = useState(
    initial || {
      employerName: "",
      estId: "",
      memberId: "",
      joiningDate: "",
      exitDate: "",
      ncpDays: "0",
    }
  );
  const calcService = () => {
    if (!form.joiningDate) return "";
    const from = new Date(form.joiningDate);
    const to = form.exitDate ? new Date(form.exitDate) : new Date();
    let yrs = to.getFullYear() - from.getFullYear();
    let mos = to.getMonth() - from.getMonth();
    let dys = to.getDate() - from.getDate();
    if (dys < 0) {
      mos--;
      dys += 30;
    }
    if (mos < 0) {
      yrs--;
      mos += 12;
    }
    return `${yrs} Years ${mos} Months ${dys} Days`;
  };
  const svc = calcService();
  return (
    <Modal
      title={initial ? "Edit Establishment" : "Add Establishment (Service History)"}
      onClose={onClose}
    >
      <Field label="Employer / Organisation Name *">
        <input
          style={inp}
          value={form.employerName}
          onChange={(e) => setForm({ ...form, employerName: e.target.value })}
          placeholder="e.g. SAROJ LANDMARK REALTY LLP"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Establishment ID (Est Id)">
          <input
            style={inp}
            value={form.estId}
            onChange={(e) => setForm({ ...form, estId: e.target.value })}
            placeholder="e.g. KDMAL1612627000"
          />
        </Field>
        <Field label="Member ID">
          <input
            style={inp}
            value={form.memberId}
            onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            placeholder="e.g. KDMAL16126270000010147"
          />
        </Field>
        <Field label="Joining Date">
          <input
            style={inp}
            type="date"
            value={form.joiningDate}
            onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
          />
        </Field>
        <Field label="Exit Date (blank = currently working)">
          <input
            style={inp}
            type="date"
            value={form.exitDate}
            onChange={(e) => setForm({ ...form, exitDate: e.target.value })}
          />
        </Field>
        <Field label="NCP Days">
          <input
            style={inp}
            type="number"
            value={form.ncpDays}
            onChange={(e) => setForm({ ...form, ncpDays: e.target.value })}
            placeholder="0"
            min="0"
          />
        </Field>
        {svc && (
          <div
            style={{
              display: "flex",
              flexDirection: "column" as const,
              justifyContent: "flex-end",
              paddingBottom: 2,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: THEME.muted,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                marginBottom: 4,
              }}
            >
              Total Service
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>{svc}</div>
          </div>
        )}
      </div>
      <ModalActions
        onSave={() => form.employerName.trim() && onSave(form)}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Add Establishment"}
      />
    </Modal>
  );
}

function EditEPFModal({ epf: initial, onClose, onSave }: any) {
  const [form, setForm] = useState({
    uan: initial.uan || initial.accountNumber || "",
    employer: initial.employer || initial.bank || "",
    balance: initial.balance != null ? String(initial.balance) : "",
  });
  const valid = form.balance !== "" && Number(form.balance) >= 0;
  return (
    <Modal title="Edit EPF Account" onClose={onClose}>
      <Field label="UAN (Universal Account Number)">
        <input
          style={inp}
          value={form.uan}
          onChange={(e) => setForm({ ...form, uan: e.target.value })}
          placeholder="12-digit UAN"
          maxLength={12}
        />
      </Field>
      <Field label="Employer / Company Name">
        <input
          style={inp}
          value={form.employer}
          onChange={(e) => setForm({ ...form, employer: e.target.value })}
          placeholder="e.g. Infosys, TCS, Your Company Ltd."
        />
      </Field>
      <Field label="Current EPF Corpus (₹)">
        <input
          style={inp}
          type="number"
          value={form.balance}
          onChange={(e) => setForm({ ...form, balance: e.target.value })}
          placeholder="500000"
          min="0"
        />
      </Field>
      <ModalActions
        onSave={() => valid && onSave(form)}
        onClose={onClose}
        saveLabel="Save Changes"
      />
    </Modal>
  );
}

function EPFAccountCard({ p, removeItem, updateItem }: any) {
  const [txs, setTxs] = useState<any[]>(p.transactions || []);
  const [ests, setEsts] = useState<any[]>(p.establishments || []);
  const [showLedger, setShowLedger] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [showEstModal, setShowEstModal] = useState(false);
  const [editEst, setEditEst] = useState<any>(null);
  const [transferPrefill, setTransferPrefill] = useState<any>(null);

  // Sync local state when the selected EPF record changes (p.id change = different record).
  // Intentionally omit p.transactions and p.establishments: adding them would re-run on every
  // save, which resets in-progress edits before the user can save them.
  useEffect(() => {
    setTxs(p.transactions || []);
    setEsts(p.establishments || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);

  /* ── helpers ── */
  const typeInfo = (t: string) =>
    EPF_TX_TYPES.find((x) => x.value === t) || { label: t, color: THEME.muted };
  const btnGhost = {
    background: "transparent",
    border: `1px solid ${THEME.line}`,
    borderRadius: 8,
    color: THEME.ink,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 600,
    fontSize: 12,
    padding: "7px 14px",
  } as const;

  const fmtDate = (d: string) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "—";
  const fmtMY = (d: string) =>
    d ? new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—";
  const calcService = (join: string, exit: string) => {
    if (!join) return "—";
    const from = new Date(join);
    const to = exit ? new Date(exit) : new Date();
    let yrs = to.getFullYear() - from.getFullYear();
    let mos = to.getMonth() - from.getMonth();
    let dys = to.getDate() - from.getDate();
    if (dys < 0) {
      mos--;
      dys += 30;
    }
    if (mos < 0) {
      yrs--;
      mos += 12;
    }
    return `${yrs}Y ${mos}M ${dys}D`;
  };

  /* ── stats ── */
  // Establishments whose balance has been transferred out via Form 13 (transfer_in recorded).
  // Their individual transactions must NOT be summed — the transfer_in amount already captures them.
  const transferredOutEstIds = new Set<string>(
    txs
      .filter((x) => x.type === "transfer_in" && x.fromEmployer)
      .map((x) => {
        const e = ests.find((e: any) => e.employerName === x.fromEmployer);
        return e ? e.id : null;
      })
      .filter(Boolean)
  );

  // activeTxs = everything except transactions explicitly tagged to transferred-out establishments
  const activeTxs = txs.filter((t) => !t.estId || !transferredOutEstIds.has(t.estId));

  const byType = (type: string) =>
    activeTxs.filter((x) => x.type === type).reduce((s, x) => s + Number(x.amount || 0), 0);
  const monthlyRows = activeTxs.filter((x) => x.type === "monthly_contribution");
  const interestRows = activeTxs.filter((x) => x.type === "interest_credit");
  const transferRows = txs.filter((x) => x.type === "transfer_in"); // all txs — all transfer_ins count

  const totalEmployee =
    byType("employee_contribution") +
    monthlyRows.reduce((s, x) => s + Number(x.employeeShare || 0), 0);
  const totalEmployer =
    byType("employer_contribution") +
    monthlyRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);
  const totalPension = monthlyRows.reduce((s, x) => s + Number(x.pensionShare || 0), 0);
  const totalInterest = interestRows.reduce((s, x) => {
    if (x.employeeShare !== undefined || x.employerShare !== undefined)
      return (
        s +
        Number(x.employeeShare || 0) +
        Number(x.employerShare || 0) +
        Number(x.pensionShare || 0)
      );
    return s + Number(x.amount || 0);
  }, 0);
  const totalTransferIn = transferRows.reduce((s, x) => s + Number(x.amount || 0), 0);
  const totalWithdrawal = byType("withdrawal");

  // Compute closing balances per EPFO passbook column
  const empInterest = interestRows.reduce((s, x) => {
    if (x.employeeShare !== undefined) return s + Number(x.employeeShare || 0);
    return s + Number(x.amount || 0); // backward compat: old single-amount interest → employee
  }, 0);
  const erInterest = interestRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);
  const penInterest = interestRows.reduce((s, x) => s + Number(x.pensionShare || 0), 0);
  // employee gets remainder: total - er - pen (handles partial splits and no-splits correctly)
  const transferInEr = transferRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);
  const transferInPen = transferRows.reduce((s, x) => s + Number(x.pensionShare || 0), 0);
  const transferInEmp = totalTransferIn - transferInEr - transferInPen;

  const closingEmployee = totalEmployee + empInterest + transferInEmp;
  const closingEmployer = totalEmployer + erInterest + transferInEr;
  const closingPension = totalPension + transferInPen + penInterest;
  const closingTotal = closingEmployee + closingEmployer + closingPension - totalWithdrawal;
  // Any non-empty ledger wins over the static balance fallback — matches calculateEpfBalance
  // in finance.ts (previously only monthly_contribution/interest_credit/transfer_in counted,
  // so accounts tracked via the simpler employee/employer/withdrawal entry types had their
  // logged transactions silently ignored here).
  const hasPassbook = txs.length > 0;
  const displayCorpus = hasPassbook ? closingTotal : Number(p.balance || 0);

  const stats = [
    ...(totalInterest > 0
      ? [{ label: "Interest (EPFO)", value: totalInterest, color: THEME.sage }]
      : []),
    ...(totalTransferIn > 0
      ? [{ label: "Transfer In", value: totalTransferIn, color: THEME.sage }]
      : []),
    ...(totalWithdrawal > 0
      ? [{ label: "Withdrawn", value: totalWithdrawal, color: THEME.rust }]
      : []),
  ].filter((s) => s.value > 0);

  /* ── refs to avoid stale closures when both arrays are updated close together ── */
  const txsRef = React.useRef(txs);
  const estsRef = React.useRef(ests);
  txsRef.current = txs;
  estsRef.current = ests;

  /* ── persist ── */
  const persistTxs = (updated: any[]) => {
    setTxs(updated);
    updateItem("epf", p.id, { transactions: updated, establishments: estsRef.current });
  };
  const persistEsts = (updated: any[]) => {
    setEsts(updated);
    updateItem("epf", p.id, { transactions: txsRef.current, establishments: updated });
  };

  const saveTx = (form: any) => {
    let entry: any;
    if (form.type === "monthly_contribution") {
      entry = {
        date: form.date,
        type: form.type,
        estId: form.estId || "",
        wageMonth: form.wageMonth,
        particulars: form.particulars || "",
        epfWages: Number(form.epfWages || 0),
        epsWages: Number(form.epsWages || 0),
        employeeShare: Number(form.employeeShare || 0),
        employerShare: Number(form.employerShare || 0),
        pensionShare: Number(form.pensionShare || 0),
        amount: Number(form.employeeShare || 0),
        note: form.note || "",
      };
    } else if (form.type === "interest_credit") {
      const empInt = Number(form.employeeShare || 0);
      const erInt = Number(form.employerShare || 0);
      const penInt = Number(form.pensionShare || 0);
      entry = {
        date: form.date,
        type: form.type,
        estId: form.estId || "",
        particulars: form.particulars || "",
        employeeShare: empInt,
        employerShare: erInt,
        pensionShare: penInt,
        amount: empInt + erInt + penInt,
        note: form.note || "",
      };
    } else if (form.type === "transfer_in") {
      const empT = Number(form.employeeShare || 0);
      const erT = Number(form.employerShare || 0);
      const penT = Number(form.pensionShare || 0);
      const total = Number(form.amount || 0) || empT + erT + penT;
      entry = {
        date: form.date,
        type: form.type,
        estId: form.estId || "",
        fromEmployer: form.fromEmployer || "",
        employeeShare: empT,
        employerShare: erT,
        pensionShare: penT,
        amount: total,
        note: form.note || "",
      };
    } else {
      entry = {
        date: form.date,
        type: form.type,
        estId: form.estId || "",
        amount: Number(form.amount || 0),
        note: form.note || "",
      };
    }
    const updated = editTx
      ? txs.map((t) => (t.id === editTx.id ? { ...entry, id: editTx.id } : t))
      : [...txs, { ...entry, id: uid() }];
    persistTxs(updated);
    setShowTxModal(false);
    setEditTx(null);
  };
  const removeTx = (id: string) => persistTxs(txs.filter((t) => t.id !== id));
  const importRows = (rows: any[]) => {
    persistTxs([...txs, ...rows]);
    setShowCsvImport(false);
  };

  const saveEst = (form: any) => {
    const clean = { ...form, ncpDays: Number(form.ncpDays || 0) };
    const updated = editEst
      ? ests.map((e) => (e.id === editEst.id ? { ...clean, id: editEst.id } : e))
      : [...ests, { ...clean, id: uid() }];
    persistEsts(updated);
    setShowEstModal(false);
    setEditEst(null);
  };
  const removeEst = (id: string) => persistEsts(ests.filter((e) => e.id !== id));

  /* ── sorted ledger split ── */
  const sortedTxs = [...txs].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const passbookRows = sortedTxs.filter(
    (t) =>
      t.type === "monthly_contribution" || t.type === "interest_credit" || t.type === "transfer_in"
  );
  const regularRows = sortedTxs.filter(
    (t) =>
      t.type !== "monthly_contribution" && t.type !== "interest_credit" && t.type !== "transfer_in"
  );
  const sortedEsts = [...ests].sort((a, b) =>
    (b.joiningDate || "").localeCompare(a.joiningDate || "")
  );

  return (
    <Card style={{ padding: 20, borderTop: `4px solid ${THEME.accent}` }}>
      {/* ── Account Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <BankLogo name="EPFO" size={36} accentColor={THEME.accent} />
          <div>
            <Badge variant="accent">EPF Account</Badge>
            {(p.employer || p.bank) && (
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
                Employer:{" "}
                <span style={{ color: THEME.ink, fontWeight: 600 }}>{p.employer || p.bank}</span>
              </div>
            )}
            {(p.uan || p.accountNumber) && (
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3 }}>
                UAN:{" "}
                <span style={{ color: THEME.ink, fontWeight: 600 }}>
                  {p.uan || p.accountNumber}
                </span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <Button
            variant="ghost"
            size="sm"
            icon={<Pencil size={12} />}
            onClick={() => setShowEditAccount(true)}
            aria-label={`Edit EPF account${p.uan || p.accountNumber ? ` ${p.uan || p.accountNumber}` : ""}`}
            title="Edit"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={12} />}
            style={{ color: THEME.rust }}
            onClick={() => removeItem("epf", p.id)}
            aria-label={`Delete EPF account${p.uan || p.accountNumber ? ` ${p.uan || p.accountNumber}` : ""}`}
            title="Delete"
          />
        </div>
      </div>

      {/* ── Corpus ── */}
      <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>
        Total Corpus
        {hasPassbook && (
          <span style={{ fontSize: 10, color: THEME.sage, marginLeft: 6, fontWeight: 600 }}>
            auto-calculated from passbook
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: THEME.accent,
          letterSpacing: "-0.02em",
          marginBottom: hasPassbook ? 10 : 20,
        }}
      >
        <Prv>{fmtINRFull(displayCorpus)}</Prv>
      </div>
      {hasPassbook && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {[
            {
              label: "Employee PF",
              value: closingEmployee,
              color: THEME.accent,
              bg: `color-mix(in srgb, ${THEME.accent} 10%, var(--t-paper))`,
              border: `color-mix(in srgb, ${THEME.accent} 25%, transparent)`,
            },
            {
              label: "Employer PF",
              value: closingEmployer,
              color: THEME.cyan,
              bg: `color-mix(in srgb, ${THEME.cyan} 10%, var(--t-paper))`,
              border: `color-mix(in srgb, ${THEME.cyan} 25%, transparent)`,
            },
            {
              label: "EPS (Pension)",
              value: closingPension,
              color: THEME.gold,
              bg: `color-mix(in srgb, ${THEME.gold} 10%, var(--t-paper))`,
              border: `color-mix(in srgb, ${THEME.gold} 25%, transparent)`,
            },
          ].map(({ label, value, color, bg, border }) => (
            <div
              key={label}
              style={{
                padding: "9px 12px",
                borderRadius: 10,
                border: `1px solid ${border}`,
                background: bg,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: THEME.muted,
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                  marginBottom: 3,
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color }}>
                <Prv>{fmtINRFull(value)}</Prv>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Service History ── */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: THEME.muted,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
            }}
          >
            Service History
          </div>
          <button
            style={{
              ...btnGhost,
              fontSize: 11,
              padding: "5px 10px",
              color: THEME.accent,
              borderColor: `color-mix(in srgb, ${THEME.accent} 30%, transparent)`,
            }}
            onClick={() => {
              setEditEst(null);
              setShowEstModal(true);
            }}
          >
            <Plus size={11} /> Add Employer
          </button>
        </div>

        {ests.length === 0 ? (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
              border: `1px dashed ${`color-mix(in srgb, ${THEME.accent} 20%, transparent)`}`,
              fontSize: 11,
              color: THEME.muted,
              textAlign: "center" as const,
            }}
          >
            Add your EPFO service history — Est ID, Member ID, Joining &amp; Exit dates
          </div>
        ) : (
          <div style={{ position: "relative", paddingLeft: 32 }}>
            <div
              style={{
                position: "absolute",
                left: 11,
                top: 12,
                bottom: 12,
                width: 2,
                background: `color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
                borderRadius: 2,
              }}
            />
            {sortedEsts.map((est, idx) => {
              const isCurrent = !est.exitDate;
              const dateLabel = isCurrent
                ? `${fmtMY(est.joiningDate)} — Present`
                : `${fmtMY(est.joiningDate)} — ${fmtMY(est.exitDate)}`;

              /* per-establishment closing balance */
              const estTxs = txs.filter((t) => t.estId === est.id);
              const estEmpC = estTxs
                .filter(
                  (x) => x.type === "monthly_contribution" || x.type === "employee_contribution"
                )
                .reduce((s, x) => s + Number(x.employeeShare || x.amount || 0), 0);
              const estErC = estTxs
                .filter(
                  (x) => x.type === "monthly_contribution" || x.type === "employer_contribution"
                )
                .reduce((s, x) => s + Number(x.employerShare || x.amount || 0), 0);
              const estPenC = estTxs
                .filter((x) => x.type === "monthly_contribution")
                .reduce((s, x) => s + Number(x.pensionShare || 0), 0);
              const estIntEmp = estTxs
                .filter((x) => x.type === "interest_credit")
                .reduce(
                  (s, x) =>
                    s + Number(x.employeeShare !== undefined ? x.employeeShare : x.amount || 0),
                  0
                );
              const estIntEr = estTxs
                .filter((x) => x.type === "interest_credit")
                .reduce((s, x) => s + Number(x.employerShare || 0), 0);
              const estPenInt = estTxs
                .filter((x) => x.type === "interest_credit")
                .reduce((s, x) => s + Number(x.pensionShare || 0), 0);
              const estTransIn = estTxs
                .filter((x) => x.type === "transfer_in")
                .reduce((s, x) => s + Number(x.amount || 0), 0);
              const estClosing =
                estEmpC + estErC + estPenC + estIntEmp + estIntEr + estPenInt + estTransIn;
              const estHasTxs = estTxs.length > 0;

              /* transfer-in already recorded for this establishment */
              const alreadyTransferred = txs.some(
                (t) => t.type === "transfer_in" && t.fromEmployer === est.employerName
              );

              return (
                <div
                  key={est.id}
                  style={{
                    position: "relative",
                    marginBottom: idx < sortedEsts.length - 1 ? 14 : 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: -32,
                      top: 10,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: isCurrent ? THEME.accent : `color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
                      border: `2px solid ${isCurrent ? THEME.accent : `color-mix(in srgb, ${THEME.accent} 35%, transparent)`}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 800,
                      color: isCurrent ? THEME.darkInk : THEME.accent,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: `1px solid ${THEME.line}`,
                      background: "var(--surface-0)",
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
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 9px",
                          borderRadius: 6,
                          background: isCurrent ? THEME.accent : `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
                          color: isCurrent ? THEME.darkInk : THEME.muted,
                        }}
                      >
                        {dateLabel}
                      </div>
                      <div style={{ display: "flex", gap: 2 }}>
                        <button
                          onClick={() => {
                            setEditEst(est);
                            setShowEstModal(true);
                          }}
                          aria-label={`Edit ${est.employerName || "employer"} service history`}
                          title="Edit"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: THEME.muted,
                            padding: 6,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => {
                            if (alreadyTransferred) return;
                            removeEst(est.id);
                          }}
                          disabled={alreadyTransferred}
                          aria-label={`Delete ${est.employerName || "employer"} service history`}
                          title={
                            alreadyTransferred
                              ? "Can't delete — a Transfer In references this employer by name. Deleting it would cause this establishment's own transactions to be double-counted alongside the transfer-in lump sum."
                              : "Delete"
                          }
                          style={{
                            background: "none",
                            border: "none",
                            cursor: alreadyTransferred ? "not-allowed" : "pointer",
                            color: alreadyTransferred ? THEME.muted : THEME.rust,
                            opacity: alreadyTransferred ? 0.5 : 1,
                            padding: 6,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: THEME.ink,
                        marginBottom: 8,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {est.employerName}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto 1fr",
                        gap: "4px 10px",
                        fontSize: 10,
                      }}
                    >
                      <span style={{ color: THEME.muted }}>Est Id</span>
                      <span style={{ color: THEME.ink, fontWeight: 600, fontFamily: "monospace" }}>
                        {est.estId || "—"}
                      </span>
                      <span style={{ color: THEME.muted }}>Joining</span>
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>
                        {fmtDate(est.joiningDate)}
                      </span>
                      <span style={{ color: THEME.muted }}>Member Id</span>
                      <span style={{ color: THEME.ink, fontWeight: 600, fontFamily: "monospace" }}>
                        {est.memberId || "—"}
                      </span>
                      <span style={{ color: THEME.muted }}>Exit</span>
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>
                        {est.exitDate ? fmtDate(est.exitDate) : "—"}
                      </span>
                      <span style={{ color: THEME.muted }}>NCP Days</span>
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>
                        {est.ncpDays || "0"} Days
                      </span>
                      <span style={{ color: THEME.muted }}>Total Service</span>
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>
                        {calcService(est.joiningDate, est.exitDate)}
                      </span>
                    </div>

                    {/* per-establishment closing balance (only if transactions tagged to this est) */}
                    {estHasTxs && (
                      <div
                        style={{
                          marginTop: 10,
                          display: "grid",
                          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                          gap: 6,
                        }}
                      >
                        {[
                          {
                            label: "Emp PF",
                            value: estEmpC + estIntEmp,
                            color: THEME.accent,
                            bg: `color-mix(in srgb, ${THEME.accent} 10%, var(--t-paper))`,
                            border: `color-mix(in srgb, ${THEME.accent} 22%, transparent)`,
                          },
                          {
                            label: "Er PF",
                            value: estErC + estIntEr,
                            color: THEME.cyan,
                            bg: `color-mix(in srgb, ${THEME.cyan} 10%, var(--t-paper))`,
                            border: `color-mix(in srgb, ${THEME.cyan} 22%, transparent)`,
                          },
                          {
                            label: "Pension",
                            value: estPenC + estPenInt,
                            color: THEME.gold,
                            bg: `color-mix(in srgb, ${THEME.gold} 10%, var(--t-paper))`,
                            border: `color-mix(in srgb, ${THEME.gold} 22%, transparent)`,
                          },
                        ].map(({ label, value, color, bg, border }) => (
                          <div
                            key={label}
                            style={{
                              padding: "7px 10px",
                              borderRadius: 8,
                              background: bg,
                              border: `1px solid ${border}`,
                              textAlign: "center" as const,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 8,
                                color: THEME.muted,
                                fontWeight: 700,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                                marginBottom: 2,
                              }}
                            >
                              {label}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 800, color }}>
                              <Prv>{fmtINRFull(value)}</Prv>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {estHasTxs && (
                      <div
                        style={{
                          marginTop: 6,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontSize: 10, color: THEME.muted }}>
                          Closing Balance:{" "}
                          <span
                            style={{ fontWeight: 800, color: isCurrent ? THEME.accent : THEME.ink }}
                          >
                            <Prv>{fmtINRFull(estClosing)}</Prv>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Transfer Balance button — shown for exited establishments */}
                    {!isCurrent && (
                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: `1px dashed ${THEME.line}`,
                        }}
                      >
                        {alreadyTransferred ? (
                          <div
                            style={{
                              fontSize: 10,
                              color: THEME.sage,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <CheckCircle2 size={12} /> Transfer In recorded
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setTransferPrefill({
                                type: "transfer_in",
                                date: est.exitDate || today(),
                                fromEmployer: est.employerName,
                                amount: String(estClosing || ""),
                                employeeShare: String(estEmpC + estIntEmp || ""),
                                employerShare: String(estErC + estIntEr || ""),
                                pensionShare: String(estPenC || ""),
                                note: `Form 13 transfer from ${est.employerName}`,
                                estId: "",
                              });
                              setShowTxModal(true);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 12px",
                              borderRadius: 8,
                              border: `1px solid ${`color-mix(in srgb, ${THEME.sage} 40%, transparent)`}`,
                              background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
                              color: THEME.sage,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            <Repeat size={11} /> Record Transfer to New Employer
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Interest / Withdrawal Stats ── */}
      {stats.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                padding: "9px 12px",
                borderRadius: 10,
                border: `1px solid ${`color-mix(in srgb, ${s.color} 20%, transparent)`}`,
                background: `color-mix(in srgb, ${s.color} 5%, transparent)`,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: THEME.muted,
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                  marginBottom: 3,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>
                <Prv>{fmtINRFull(s.value)}</Prv>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
        <button
          style={btnGhost}
          onClick={() => {
            setShowTxModal(true);
            setEditTx(null);
            setTransferPrefill(null);
            setShowCsvImport(false);
          }}
        >
          <Plus size={13} /> Add Transaction
        </button>
        <button
          style={{ ...btnGhost, color: THEME.accent, borderColor: `color-mix(in srgb, ${THEME.accent} 40%, transparent)` }}
          onClick={() => {
            setShowCsvImport((v) => !v);
            setShowLedger(true);
          }}
        >
          <Upload size={13} /> Import CSV
        </button>
        {txs.length > 0 && (
          <button style={btnGhost} onClick={() => setShowLedger((v) => !v)}>
            <List size={13} /> {showLedger ? "Hide" : "View"} Ledger ({txs.length})
          </button>
        )}
      </div>

      {/* ── CSV Panel ── */}
      {showCsvImport && (
        <div style={{ marginTop: 16 }}>
          <EPFCsvPanel
            onImport={(rows: any[]) => {
              importRows(rows);
              setShowCsvImport(false);
            }}
          />
        </div>
      )}

      {/* ── Ledger ── */}
      {showLedger && txs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {/* Passbook (monthly_contribution) table */}
          {passbookRows.length > 0 &&
            (() => {
              /* show Establishment column only when service history exists */
              const showEstCol = ests.length > 0;
              const estMap: Record<string, any> = {};
              ests.forEach((e: any) => {
                estMap[e.id] = e;
              });
              /* Assign a distinct color per establishment (cycle through palette).
                 Fixed chart-extension tokens (not the user-selectable accent) —
                 raw hex here would go stale in dark mode and could collide with
                 the active accent preset. */
              const EST_COLORS = [
                THEME.accent,
                THEME.cyan,
                THEME.gold,
                THEME.pink,
                THEME.violet,
                THEME.sage,
              ];
              const estColorMap: Record<string, string> = {};
              sortedEsts.forEach((e: any, i: number) => {
                estColorMap[e.id] = EST_COLORS[i % EST_COLORS.length];
              });

              const totalSpan = showEstCol ? 4 : 3;
              return (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.accent,
                      marginBottom: 8,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.07em",
                    }}
                  >
                    EPFO Passbook ({passbookRows.length} entries)
                  </div>
                  <div
                    style={{
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ overflowX: "auto" as const }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse" as const,
                          fontSize: 11,
                          minWidth: showEstCol ? 760 : 640,
                        }}
                      >
                        <thead>
                          <tr style={{ background: `color-mix(in srgb, ${THEME.accent} 6%, transparent)` }}>
                            <th
                              style={{
                                padding: "7px 10px",
                                textAlign: "left" as const,
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.accent,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                              }}
                            >
                              Wage Month / Description
                            </th>
                            {showEstCol && (
                              <th
                                style={{
                                  padding: "7px 10px",
                                  textAlign: "left" as const,
                                  fontWeight: 700,
                                  fontSize: 9,
                                  color: THEME.accent,
                                  textTransform: "uppercase" as const,
                                  letterSpacing: "0.06em",
                                }}
                              >
                                Establishment
                              </th>
                            )}
                            <th
                              style={{
                                padding: "7px 10px",
                                textAlign: "left" as const,
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.accent,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                              }}
                            >
                              Trans. Date
                            </th>
                            <th
                              style={{
                                padding: "7px 10px",
                                textAlign: "left" as const,
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.accent,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                              }}
                            >
                              Particulars / Note
                            </th>
                            <th
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.accent,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                              }}
                            >
                              EPF Wages
                            </th>
                            <th
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.accent,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                              }}
                            >
                              EPS Wages
                            </th>
                            <th
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.accent,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                                whiteSpace: "pre-line" as const,
                              }}
                            >
                              {"Emp. Share\n12%"}
                            </th>
                            <th
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.accent,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                                whiteSpace: "pre-line" as const,
                              }}
                            >
                              {"Empr. Share\n3.67%"}
                            </th>
                            <th
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.accent,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                                whiteSpace: "pre-line" as const,
                              }}
                            >
                              {"Pension\n8.33%"}
                            </th>
                            <th style={{ padding: "7px 10px" }} />
                          </tr>
                        </thead>
                        <tbody>
                          {passbookRows.map((t) => {
                            const isIntRow = t.type === "interest_credit";
                            const isTransferRow = t.type === "transfer_in";
                            const linkedEst = t.estId ? estMap[t.estId] : null;
                            const estColor = t.estId
                              ? estColorMap[t.estId] || THEME.accent
                              : THEME.muted;
                            const descLabel = isTransferRow
                              ? `⇒ Transfer In — ${t.fromEmployer || "Previous Employer"}`
                              : isIntRow
                                ? t.particulars ||
                                  `Int. Updated upto ${new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}`
                                : t.wageMonth || "—";
                            const empVal = isIntRow
                              ? t.employeeShare !== undefined
                                ? t.employeeShare
                                : t.amount
                              : isTransferRow
                                ? Number(t.employeeShare || 0) > 0
                                  ? t.employeeShare
                                  : t.amount
                                : t.employeeShare || 0;
                            const erVal = t.employerShare || 0;
                            const penVal = t.pensionShare || 0;
                            const rowBg = isTransferRow
                              ? `color-mix(in srgb, ${THEME.sage} 6%, transparent)`
                              : isIntRow
                                ? `color-mix(in srgb, ${THEME.sage} 4%, transparent)`
                                : undefined;
                            const txColor = isTransferRow
                              ? THEME.sage
                              : isIntRow
                                ? THEME.sage
                                : THEME.ink;
                            const numColor = (base: string) =>
                              isTransferRow ? THEME.sage : isIntRow ? THEME.sage : base;
                            return (
                              <tr
                                key={t.id}
                                style={{
                                  borderTop: isTransferRow
                                    ? `2px dashed ${`color-mix(in srgb, ${THEME.sage} 40%, transparent)`}`
                                    : `1px solid ${THEME.line}`,
                                  background: rowBg,
                                }}
                              >
                                <td
                                  style={{ padding: "6px 10px", fontWeight: 700, color: txColor }}
                                >
                                  {descLabel}
                                </td>
                                {showEstCol && (
                                  <td style={{ padding: "6px 10px" }}>
                                    {linkedEst ? (
                                      <div
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 4,
                                          padding: "2px 7px",
                                          borderRadius: 5,
                                          background: `color-mix(in srgb, ${estColor} 9%, transparent)`,
                                          border: `1px solid ${`color-mix(in srgb, ${estColor} 25%, transparent)`}`,
                                          maxWidth: 130,
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: 5,
                                            height: 5,
                                            borderRadius: "50%",
                                            background: estColor,
                                            flexShrink: 0,
                                          }}
                                        />
                                        <span
                                          style={{
                                            fontSize: 9,
                                            fontWeight: 700,
                                            color: estColor,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap" as const,
                                          }}
                                          title={linkedEst.employerName}
                                        >
                                          {linkedEst.employerName.length > 14
                                            ? linkedEst.employerName.slice(0, 13) + "…"
                                            : linkedEst.employerName}
                                        </span>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: 9, color: THEME.muted }}>—</span>
                                    )}
                                  </td>
                                )}
                                <td
                                  style={{ padding: "6px 10px", color: THEME.muted, fontSize: 10 }}
                                >
                                  {t.date || "—"}
                                </td>
                                <td
                                  style={{ padding: "6px 10px", color: THEME.muted, fontSize: 10 }}
                                >
                                  {isTransferRow
                                    ? t.note || "Form 13 Transfer"
                                    : isIntRow
                                      ? t.note || "—"
                                      : t.particulars || "—"}
                                </td>
                                <td
                                  style={{
                                    padding: "6px 10px",
                                    textAlign: "right" as const,
                                    fontWeight: 600,
                                  }}
                                >
                                  {!isIntRow && !isTransferRow && t.epfWages ? (
                                    <Prv>{fmtINRFull(t.epfWages)}</Prv>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td
                                  style={{
                                    padding: "6px 10px",
                                    textAlign: "right" as const,
                                    fontWeight: 600,
                                  }}
                                >
                                  {!isIntRow && !isTransferRow && t.epsWages ? (
                                    <Prv>{fmtINRFull(t.epsWages)}</Prv>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td
                                  style={{
                                    padding: "6px 10px",
                                    textAlign: "right" as const,
                                    fontWeight: 800,
                                    color: numColor(THEME.accent),
                                  }}
                                >
                                  <Prv>{fmtINRFull(empVal)}</Prv>
                                </td>
                                <td
                                  style={{
                                    padding: "6px 10px",
                                    textAlign: "right" as const,
                                    fontWeight: 800,
                                    color: numColor(THEME.cyan),
                                  }}
                                >
                                  <Prv>{fmtINRFull(erVal)}</Prv>
                                </td>
                                <td
                                  style={{
                                    padding: "6px 10px",
                                    textAlign: "right" as const,
                                    fontWeight: 800,
                                    color: isIntRow || isTransferRow ? THEME.muted : THEME.gold,
                                  }}
                                >
                                  <Prv>{fmtINRFull(penVal)}</Prv>
                                </td>
                                <td style={{ padding: "6px 10px" }}>
                                  <div
                                    style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}
                                  >
                                    <button
                                      onClick={() => {
                                        setEditTx(t);
                                        setTransferPrefill(null);
                                        setShowTxModal(true);
                                      }}
                                      aria-label={`Edit transaction dated ${t.date}`}
                                      title="Edit"
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: THEME.muted,
                                        padding: 6,
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <Pencil size={11} />
                                    </button>
                                    <button
                                      onClick={() => removeTx(t.id)}
                                      aria-label={`Delete transaction dated ${t.date}`}
                                      title="Delete"
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: THEME.rust,
                                        padding: 6,
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr
                            style={{
                              borderTop: `2px solid ${THEME.line}`,
                              background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
                            }}
                          >
                            <td
                              colSpan={totalSpan}
                              style={{
                                padding: "7px 10px",
                                fontWeight: 700,
                                fontSize: 9,
                                color: THEME.muted,
                                textTransform: "uppercase" as const,
                              }}
                            >
                              Total
                            </td>
                            <td
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 800,
                              }}
                            >
                              <Prv>
                                {fmtINRFull(
                                  passbookRows
                                    .filter((t) => t.type === "monthly_contribution")
                                    .reduce((s, t) => s + Number(t.epfWages || 0), 0)
                                )}
                              </Prv>
                            </td>
                            <td
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 800,
                              }}
                            >
                              <Prv>
                                {fmtINRFull(
                                  passbookRows
                                    .filter((t) => t.type === "monthly_contribution")
                                    .reduce((s, t) => s + Number(t.epsWages || 0), 0)
                                )}
                              </Prv>
                            </td>
                            <td
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 900,
                                color: THEME.accent,
                              }}
                            >
                              <Prv>
                                {fmtINRFull(
                                  passbookRows.reduce((s, t) => {
                                    if (t.type === "interest_credit")
                                      return (
                                        s +
                                        Number(
                                          t.employeeShare !== undefined
                                            ? t.employeeShare
                                            : t.amount || 0
                                        )
                                      );
                                    if (t.type === "transfer_in") {
                                      const erT = Number(t.employerShare || 0);
                                      const penT = Number(t.pensionShare || 0);
                                      return s + (Number(t.amount || 0) - erT - penT);
                                    }
                                    return s + Number(t.employeeShare || 0);
                                  }, 0)
                                )}
                              </Prv>
                            </td>
                            <td
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 900,
                                color: THEME.cyan,
                              }}
                            >
                              <Prv>
                                {fmtINRFull(
                                  passbookRows.reduce((s, t) => s + Number(t.employerShare || 0), 0)
                                )}
                              </Prv>
                            </td>
                            <td
                              style={{
                                padding: "7px 10px",
                                textAlign: "right" as const,
                                fontWeight: 900,
                                color: THEME.gold,
                              }}
                            >
                              <Prv>
                                {fmtINRFull(
                                  passbookRows
                                    .filter((t) => t.type === "monthly_contribution")
                                    .reduce((s, t) => s + Number(t.pensionShare || 0), 0)
                                )}
                              </Prv>
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* Regular transactions */}
          {regularRows.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.muted,
                  marginBottom: 8,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.07em",
                }}
              >
                Other Transactions ({regularRows.length})
              </div>
              <div
                style={{ border: `1px solid ${THEME.line}`, borderRadius: 10, overflow: "hidden" }}
              >
                <div style={{ overflowX: "auto" as const }}>
                <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)` }}>
                      {["Date", "Type", "Amount", "Note", ""].map((h, i) => (
                        <th
                          key={i}
                          style={{
                            padding: "8px 10px",
                            textAlign: i >= 2 ? ("right" as const) : ("left" as const),
                            fontWeight: 600,
                            fontSize: 10,
                            color: THEME.muted,
                            textTransform: "uppercase" as const,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {regularRows.map((t) => {
                      const ti = typeInfo(t.type);
                      const isOut = t.type === "withdrawal";
                      return (
                        <tr key={t.id} style={{ borderTop: `1px solid ${THEME.line}` }}>
                          <td style={{ padding: "8px 10px", color: THEME.muted }}>{t.date}</td>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{ fontWeight: 700, fontSize: 11, color: ti.color }}>
                              {ti.label}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              textAlign: "right" as const,
                              fontWeight: 800,
                              color: isOut ? THEME.rust : ti.color,
                            }}
                          >
                            {isOut ? "-" : "+"}
                            <Prv>{fmtINRFull(t.amount)}</Prv>
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              textAlign: "right" as const,
                              color: THEME.muted,
                            }}
                          >
                            {t.note || "—"}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              <button
                                onClick={() => {
                                  setEditTx(t);
                                  setShowTxModal(true);
                                }}
                                aria-label={`Edit transaction dated ${t.date}`}
                                title="Edit"
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: THEME.muted,
                                  padding: 6,
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => removeTx(t.id)}
                                aria-label={`Delete transaction dated ${t.date}`}
                                title="Delete"
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: THEME.rust,
                                  padding: 6,
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
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
          )}
        </div>
      )}

      {showTxModal && (
        <EPFTransactionModal
          initial={transferPrefill || editTx}
          establishments={ests}
          onClose={() => {
            setShowTxModal(false);
            setEditTx(null);
            setTransferPrefill(null);
          }}
          onSave={saveTx}
        />
      )}
      {showEstModal && (
        <AddEstablishmentModal
          initial={editEst}
          onClose={() => {
            setShowEstModal(false);
            setEditEst(null);
          }}
          onSave={saveEst}
        />
      )}
      {showEditAccount && (
        <EditEPFModal
          epf={p}
          onClose={() => setShowEditAccount(false)}
          onSave={(updated: any) => {
            updateItem("epf", p.id, { ...updated, transactions: txs, establishments: ests });
            setShowEditAccount(false);
          }}
        />
      )}
    </Card>
  );
}

/* ── EPF Empty State ─────────────────────────────────────────────────── */
function EPFEmptyState({ onAdd }: any) {
  return (
    <div
      style={{
        padding: "54px 36px",
        textAlign: "center" as const,
        background:
          "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 12%, var(--surface-0)) 100%)",
        border: `1.5px solid ${THEME.line}`,
        borderRadius: 20,
        boxShadow: "0 4px 24px -4px rgba(0, 0, 0, 0.03)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 22,
          background: `linear-gradient(135deg,${THEME.accent} 0%,${`color-mix(in srgb, ${THEME.accent} 80%, transparent)`} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          boxShadow: `0 8px 24px -4px color-mix(in srgb, ${THEME.accent} 30%, transparent)`,
          border: "2px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        <Shield size={32} color={THEME.darkInk} />
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
        No EPF Account Added Yet
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
        Track your Employee Provident Fund — employee &amp; employer contributions, EPFO interest
        credits, and withdrawals.
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
        {["Employee Contribution", "Employer Contribution", "EPFO Interest", "Withdrawals"].map(
          (t) => (
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
                  background: THEME.accent,
                  display: "inline-block",
                }}
              />
              {t}
            </span>
          )
        )}
      </div>
      <Button variant="accent" icon={<Plus size={14} />} onClick={onAdd}>
        Add EPF Account
      </Button>
    </div>
  );
}

/* ── EPF Section ─────────────────────────────────────────────────────── */
const EPFSection = ({ items, removeItem, updateItem, onAdd }: any) => (
  <div className="animate-fade-in-up">
    {items.length === 0 ? (
      <EPFEmptyState onAdd={onAdd} />
    ) : (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(var(--grid-min-lg), 1fr))",
          gap: 20,
        }}
      >
        {items.map((e: any) => (
          <EPFAccountCard key={e.id} p={e} removeItem={removeItem} updateItem={updateItem} />
        ))}
      </div>
    )}
  </div>
);

/* ── Bank / Institution Logo ─────────────────────────────────────────── */
const BANK_LOGO_DOMAINS: Record<string, string> = {
  // Public sector banks
  "state bank": "sbi.co.in",
  sbi: "sbi.co.in",
  // Private banks
  hdfc: "hdfcbank.com",
  icici: "icicibank.com",
  axis: "axisbank.com",
  kotak: "kotakmahindrabank.com",
  "yes bank": "yesbank.in",
  "yes ": "yesbank.in",
  indusind: "indusind.com",
  rbl: "rblbank.com",
  federal: "federalbank.co.in",
  idfc: "idfcfirstbank.com",
  bandhan: "bandhanbank.com",
  "au bank": "aubank.in",
  "au small": "aubank.in",
  "south indian": "southindianbank.com",
  "karnataka bank": "karnatakabank.com",
  saraswat: "saraswatbank.com",
  jammu: "jkbank.com",
  // Public sector banks (more)
  "bank of baroda": "bankofbaroda.in",
  bob: "bankofbaroda.in",
  canara: "canarabank.in",
  "punjab national": "pnbindia.in",
  pnb: "pnbindia.in",
  "bank of india": "bankofindia.co.in",
  "union bank": "unionbankofindia.co.in",
  idbi: "idbi.co.in",
  "central bank": "centralbankofindia.co.in",
  "indian bank": "indianbank.in",
  "uco bank": "ucobank.in",
  // Post office / Govt savings
  "post office": "indiapost.gov.in",
  "india post": "indiapost.gov.in",
  // Insurance
  lic: "licindia.in",
  // Government / RBI (bonds)
  rbi: "rbi.org.in",
  "reserve bank": "rbi.org.in",
  "government of india": "india.gov.in",
  "govt of india": "india.gov.in",
  nabard: "nabard.org",
  nhai: "nhai.gov.in",
  // NPS PFMs (use AMC domains)
  uti: "utimf.com",
  "aditya birla": "adityabirlacapital.com",
  dsp: "dspim.com",
  tata: "tatamutualfund.com",
  "max life": "maxlifeinsurance.com",
  // EPFO
  epfo: "epfindia.gov.in",
  "employees provident": "epfindia.gov.in",
  // NBFCs / Bond issuers
  iifl: "iifl.com",
  "arman financial": "armanindia.com",
  "arman india": "armanindia.com",
  "muthoottu mini": "muthoottumini.com",
  muthoottu: "muthoottumini.com",
  "muthoot finance": "muthootfin.com",
  "muthoot fin": "muthootfin.com",
};

function getBankDomain(name: string): string {
  const n = (name || "").toLowerCase().trim();
  for (const [k, d] of Object.entries(BANK_LOGO_DOMAINS)) {
    if (n.includes(k)) return d;
  }
  return "";
}

const BankLogo = ({
  name,
  size = 36,
  accentColor,
}: {
  name: string;
  size?: number;
  accentColor?: string;
}) => {
  const domain = getBankDomain(name);
  const color = accentColor || THEME.accent;
  const [imgSrc, setImgSrc] = React.useState<string | null>(
    domain ? `https://logos.hunter.io/${domain}` : null
  );
  const [fallbackLevel, setFallbackLevel] = React.useState<number>(domain ? 0 : 2);

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
    } else {
      setFallbackLevel(2);
      setImgSrc(null);
    }
  };

  const initials =
    (name || "?")
      .split(/\s+/)
      .filter((w: string) => w.length > 1)
      .slice(0, 2)
      .map((w: string) => w[0].toUpperCase())
      .join("") ||
    (name || "?")[0]?.toUpperCase() ||
    "?";

  if (domain && fallbackLevel < 2 && imgSrc) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.25),
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <img
          src={imgSrc}
          alt={name}
          onError={handleError}
          style={{ width: "80%", height: "80%", objectFit: "contain" }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.25),
        background: `color-mix(in srgb, ${color} 9%, transparent)`,
        border: `1px solid ${`color-mix(in srgb, ${color} 19%, transparent)`}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: Math.round(size / 2.8), fontWeight: 800, color }}>{initials}</span>
    </div>
  );
};

/* ── MF Logo ──────────────────────────────────────────────────────────── */
const MF_LOGO_DOMAINS: Record<string, string> = {
  // SBI
  sbi: "sbimf.com",
  // HDFC
  hdfc: "hdfcfund.com",
  // ICICI
  icici: "icicipruamc.com",
  // Nippon / Reliance
  nippon: "nipponindiaim.com",
  reliance: "nipponindiaim.com",
  // Axis
  axis: "axismf.com",
  // Mirae
  mirae: "miraeasset.co.in",
  // Kotak
  kotak: "kotakmf.com",
  // DSP
  dsp: "dspim.com",
  // Aditya Birla / ABSL
  "aditya birla": "adityabirlacapital.com",
  absl: "adityabirlacapital.com",
  birla: "adityabirlacapital.com",
  // Parag Parikh / PPFAS
  "parag parikh": "ppfas.com",
  ppfas: "ppfas.com",
  // UTI
  uti: "utimf.com",
  // Tata
  tata: "tatamutualfund.com",
  // Motilal Oswal
  motilal: "motilaloswalmf.com",
  // Quant
  quant: "quantmutual.com",
  // Sundaram
  sundaram: "sundarammf.com",
  // Franklin / Templeton
  franklin: "franklintempletonindia.com",
  templeton: "franklintempletonindia.com",
  // PGIM
  pgim: "pgimindiamf.com",
  // Edelweiss
  edelweiss: "edelweissmf.com",
  // Canara Robeco
  "canara robeco": "canararobeco.com",
  canara: "canararobeco.com",
  // Invesco
  invesco: "invescomutualfund.com",
  // LIC
  lic: "licmf.com",
  // Navi
  navi: "navi.com",
  // IDFC / Bandhan
  idfc: "bandhanmutual.com",
  bandhan: "bandhanmutual.com",
  // WhiteOak
  whiteoak: "whiteoakam.com",
  "white oak": "whiteoakam.com",
  // Mahindra
  mahindra: "mahindramanulife.com",
  // Samco
  samco: "samcomf.com",
  // ITI
  iti: "itimf.com",
  // JM
  "jm financial": "jmfinancialservices.in",
  // HSBC
  hsbc: "assetmanagement.hsbc.co.in",
  // L&T (now HSBC)
  "l&t": "assetmanagement.hsbc.co.in",
  // Groww
  groww: "groww.in",
  // Zerodha / Coin
  zerodha: "zerodha.com",
  coin: "coin.zerodha.com",
  // Trust
  trust: "trustmf.com",
};

function getMFDomain(fundName: string): string {
  const name = (fundName || "").toLowerCase();
  for (const [k, d] of Object.entries(MF_LOGO_DOMAINS)) {
    if (name.includes(k)) return d;
  }
  return "";
}

export const MFLogo = ({ fundName, size = 40 }: { fundName: string; size?: number }) => {
  const domain = getMFDomain(fundName);
  const [imgSrc, setImgSrc] = React.useState<string | null>(
    domain ? `https://logos.hunter.io/${domain}` : null
  );
  const [fallbackLevel, setFallbackLevel] = React.useState<number>(domain ? 0 : 2);

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
    } else {
      setFallbackLevel(2);
      setImgSrc(null);
    }
  };

  const initials = (fundName || "MF")
    .split(" ")
    .filter((w: string) => w.length > 2)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join("");

  if (domain && fallbackLevel < 2 && imgSrc) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.25),
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
          boxShadow: `0 2px 8px rgba(0,0,0,0.08)`,
        }}
      >
        <img
          src={imgSrc}
          alt={fundName}
          onError={handleError}
          style={{ width: "80%", height: "80%", objectFit: "contain" }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.25),
        background: `color-mix(in srgb, ${THEME.accent} 9%, transparent)`,
        border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 19%, transparent)`}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: Math.round(size / 2.8), fontWeight: 800, color: THEME.accent }}>
        {initials || "MF"}
      </span>
    </div>
  );
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
                <Prv>{fmtINRFull(r.value)}</Prv>
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
              <div style={{ fontSize: 26, fontWeight: 900, color: THEME.ink, lineHeight: 1 }}>
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
              <Prv>{fmtINRFull(totalValue)}</Prv>.
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
}: any) {
  const { privacyMode } = usePrivacy();
  const getLiveNav = (m: any) => liveMfNav(m, mfMarketData);
  const [editMF, setEditMF] = useState<any>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [navError, setNavError] = useState<Record<string, string>>({});
  const [mfMeta, setMfMeta] = useState<Record<string, any>>({});
  const [mfChartData, setMfChartData] = useState<Record<string, any[]>>({});
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

  const handleExport = () => {
    if (!items || items.length === 0) return;
    const header =
      "Fund Name,Category,Type,Folio Number,Fund Code,Buy Date,Buy NAV,Units,Current NAV,Invested,Owner\n";
    const rows = items
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
      const { _merge, id, ...patch } = rows[i];
      // MFCasPanel flags rows it fuzzy-matched to an existing holding with `_merge` so they
      // update that holding in place instead of being inserted as a second, duplicate row
      // sharing the same id (addItem's local-state upsert only appends, it never replaces).
      if (_merge && id) {
        await updateItem("mutualFunds", id, patch);
      } else {
        await addItem("mutualFunds", rows[i]);
      }
      onProgress?.(i + 1, rows.length);
    }
  };

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
        if (mfCode && !mfMeta[id]) fetchMFData(id, mfCode, mfChartPeriod[id] || "3m");
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
      if (!m?.mfCode || !m?.id || mfMeta[m.id]) return;
      (byCode[m.mfCode] = byCode[m.mfCode] || []).push(m);
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
          };
          setMfMeta((prev) => {
            const next = { ...prev };
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
  const fetchMFData = async (id: string, mfCode: string, period: string = "3m") => {
    const cacheKey = `${id}__${period}`;
    if (mfChartData[cacheKey] || mfFetchInFlight.current.has(cacheKey)) return;
    mfFetchInFlight.current.add(cacheKey);
    try {
      const res = await fetch(
        `/api/mf-nav?code=${encodeURIComponent(mfCode)}&range=${encodeURIComponent(period)}`
      );
      if (!res.ok) {
        setMfChartData((prev) => ({ ...prev, [cacheKey]: [] }));
        return;
      }
      const data = await res.json();
      setMfMeta((prev) => ({
        ...prev,
        [id]: {
          prevNav: data.prevNav,
          navChange: data.navChange,
          navChangePct: data.navChangePct,
          high52: data.high52,
          low52: data.low52,
          navDate: data.date,
        },
      }));
      setMfChartData((prev) => ({ ...prev, [cacheKey]: data.chart?.length ? data.chart : [] }));
    } catch (_) {
      setMfChartData((prev) => ({ ...prev, [cacheKey]: [] }));
    } finally {
      mfFetchInFlight.current.delete(cacheKey);
    }
  };

  const refreshNav = async (m: any) => {
    if (!m.mfCode) return;
    setRefreshingId(m.id);
    setNavError((prev) => ({ ...prev, [m.id]: "" }));
    const period = mfChartPeriod[m.id] || "3m";
    try {
      const res = await fetch(
        `/api/mf-nav?code=${encodeURIComponent(m.mfCode)}&range=${encodeURIComponent(period)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.nav) throw new Error("No NAV in response");
      await updateItem("mutualFunds", m.id, { currentNav: String(data.nav) });
      setMfMeta((prev) => ({
        ...prev,
        [m.id]: {
          prevNav: data.prevNav,
          navChange: data.navChange,
          navChangePct: data.navChangePct,
          high52: data.high52,
          low52: data.low52,
          navDate: data.date,
        },
      }));
      if (data.chart?.length)
        setMfChartData((prev) => ({ ...prev, [`${m.id}__${period}`]: data.chart }));
    } catch (e: any) {
      setNavError((prev) => ({ ...prev, [m.id]: e.message || "Refresh failed" }));
    } finally {
      setRefreshingId(null);
    }
  };

  const refreshAllNavs = async () => {
    const withCode = items.filter((m: any) => m.mfCode);
    if (!withCode.length) return;
    setRefreshingAll(true);
    try {
      // Parallel fetch (was a sequential await loop — N round trips in series).
      await Promise.all(withCode.map((m: any) => refreshNav(m)));
      // refreshNav only persists currentNav to the DB, which liveMfNav() treats as a
      // fallback — display values (Current Value, XIRR, Day's P&L, weight) actually read
      // mfMarketData first. Without this, the button showed a spinner and changed nothing
      // on screen until the unrelated 8h mfMarketData cache happened to expire.
      if (fetchMfNavs) await fetchMfNavs();
    } finally {
      setRefreshingAll(false);
    }
  };

  const overallXirr = useMemo(() => {
    try {
      const cashFlows: any[] = [];
      const safeItems = Array.isArray(items) ? items : [];
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
  }, [items, mfSells]);

  const totalInvested = items.reduce((s: number, m: any) => s + mfInvestedValue(m), 0);
  const totalCurrent = items.reduce(
    (s: number, m: any) => s + mfCurrentValueOf(m, getLiveNav).value,
    0
  );
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const totalDaysPnL = items.reduce((s: number, m: any) => {
    const meta = mfMeta[m.id];
    if (!meta || meta.navChange == null) return s;
    return s + Number(m.units || 0) * meta.navChange;
  }, 0);
  const prevCloseValue = totalCurrent - totalDaysPnL;
  const totalDaysPnLPct = prevCloseValue > 0 ? (totalDaysPnL / prevCloseValue) * 100 : 0;
  const hasDaysPnLData = items.some((m: any) => m?.mfCode && mfMeta[m.id]?.navChange != null);

  return (
    <div className="animate-fade-in-up">
      {items.length === 0 ? (
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

          {mfView === "insights" && <MFInsights items={items} getLiveNav={getLiveNav} />}

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
                value: <Prv>{fmtINRFull(totalInvested)}</Prv>,
                color: THEME.accent,
                Icon: IndianRupee,
              },
              {
                label: "Current Value",
                value: <Prv>{fmtINRFull(totalCurrent)}</Prv>,
                color: THEME.sage,
                Icon: TrendingUp,
              },
              {
                label: "Day's P&L",
                value: hasDaysPnLData ? (
                  <Prv>{`${totalDaysPnL >= 0 ? "+" : ""}${fmtINRFull(totalDaysPnL)} (${totalDaysPnL >= 0 ? "+" : ""}${totalDaysPnLPct.toFixed(2)}%)`}</Prv>
                ) : (
                  "—"
                ),
                color: !hasDaysPnLData ? THEME.muted : totalDaysPnL >= 0 ? THEME.sage : THEME.rust,
                Icon: Activity,
              },
              {
                label: "Overall P&L",
                value: (
                  <Prv>{`${totalPnl >= 0 ? "+" : ""}${fmtINRFull(Math.abs(totalPnl))}`}</Prv>
                ),
                color: totalPnl >= 0 ? THEME.sage : THEME.rust,
                Icon: totalPnl >= 0 ? TrendingUp : TrendingDown,
              },
              {
                label: "Return %",
                value: `${totalPnl >= 0 ? "+" : ""}${totalPnlPct.toFixed(2)}%`,
                color: totalPnl >= 0 ? THEME.sage : THEME.rust,
                Icon: Activity,
              },
              {
                label: "Overall XIRR",
                value:
                  overallXirr !== null
                    ? `${overallXirr >= 0 ? "+" : ""}${overallXirr.toFixed(2)}%`
                    : "—",
                color:
                  overallXirr === null ? THEME.muted : overallXirr >= 0 ? THEME.sage : THEME.rust,
                Icon: TrendingUp,
              },
            ].map(({ label, value, color, Icon }) => (
              <div
                key={label}
                className="card-lift"
                style={{
                  background:
                    "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 15%, var(--surface-0)) 100%)",
                  border: `1.5px solid ${THEME.line}`,
                  borderTop: `4px solid ${color}`,
                  borderRadius: 16,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  boxShadow:
                    "0 4px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 color-mix(in srgb, var(--t-ink) 4%, transparent)",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: `linear-gradient(135deg, color-mix(in srgb, ${color} 15%, transparent) 0%, color-mix(in srgb, ${color} 8%, transparent) 100%)`,
                      border: `1.5px solid color-mix(in srgb, ${color} 25%, transparent)`,
                      boxShadow: `0 2px 8px color-mix(in srgb, ${color} 8%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {label}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: THEME.ink,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {value}
                </div>
              </div>
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
                onImport={(rows: any[]) => {
                  handleImport(rows);
                  setShowCsvImport(false);
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
            items.forEach((m: any) => {
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
                  boxShadow: "var(--t-card-shadow)",
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
                                        <Prv>{fmtINRFull(sectionInvested)}</Prv>
                                      </b>
                                    </span>
                                    <span style={{ color: THEME.muted, fontWeight: 600 }}>
                                      Value:{" "}
                                      <b style={{ color: THEME.ink }}>
                                        <Prv>{fmtINRFull(sectionValue)}</Prv>
                                      </b>
                                    </span>
                                    <span
                                      style={{
                                        fontWeight: 800,
                                        color: sectionPnl >= 0 ? THEME.sage : THEME.rust,
                                      }}
                                    >
                                      {sectionPnl >= 0 ? "+" : ""}
                                      <Prv>{fmtINRFull(sectionPnl)}</Prv> ({sectionPnlPct >= 0 ? "+" : ""}
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
                                    <Prv>{fmtINRFull(grpInvested)}</Prv>
                                  </td>
                                  <td style={{ ...mfTd, textAlign: "right", fontWeight: 800 }}>
                                    <Prv>{fmtINRFull(grpCurrent)}</Prv>
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
                                            <Prv>{fmtINRFull(dayPnl)}</Prv>
                                          </div>
                                          <div
                                            style={{
                                              fontSize: 11,
                                              fontWeight: 700,
                                              color: groupMeta.navChangePct >= 0 ? THEME.sage : THEME.rust,
                                              marginTop: 1,
                                            }}
                                          >
                                            {groupMeta.navChangePct >= 0 ? "▲" : "▼"}
                                            {Math.abs(groupMeta.navChangePct ?? 0).toFixed(2)}%
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
                                          <Prv>{fmtINRFull(grpPnl)}</Prv>
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: grpPnlPct >= 0 ? THEME.sage : THEME.rust,
                                            marginTop: 1,
                                          }}
                                        >
                                          {grpPnlPct >= 0 ? "▲" : "▼"}
                                          {Math.abs(grpPnlPct).toFixed(2)}%
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
                                            {grpXirr.toFixed(1)}% XIRR
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
                                        {firstWithCode &&
                                          (() => {
                                            const cId = firstWithCode.id;
                                            const meta = mfMeta[cId];
                                            const activePeriod = mfChartPeriod[cId] || "3m";
                                            const chart = mfChartData[`${cId}__${activePeriod}`];
                                            const periodChange = calcMfPeriodChange(chart);
                                            const navUp = periodChange
                                              ? periodChange.amount >= 0
                                              : meta?.navChange != null
                                                ? meta.navChange >= 0
                                                : true;
                                            if (!chart?.length)
                                              fetchMFData(cId, firstWithCode.mfCode, activePeriod);
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
                                                      {MF_CHART_PERIOD_LABELS[activePeriod]} NAV
                                                      Trend
                                                    </div>
                                                    {periodChange && (
                                                      <div
                                                        style={{
                                                          fontSize: 12,
                                                          fontWeight: 800,
                                                          color:
                                                            periodChange.amount >= 0
                                                              ? THEME.sage
                                                              : THEME.rust,
                                                        }}
                                                      >
                                                        {periodChange.amount >= 0 ? "+" : "-"}₹
                                                        {Math.abs(periodChange.amount).toFixed(4)} (
                                                        {periodChange.amount >= 0 ? "+" : "-"}
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
                                                          setMfChartPeriod((prev) => ({
                                                            ...prev,
                                                            [cId]: p,
                                                          }));
                                                          if (!mfChartData[`${cId}__${p}`])
                                                            fetchMFData(
                                                              cId,
                                                              firstWithCode.mfCode,
                                                              p
                                                            );
                                                        }}
                                                        style={{
                                                          padding: "4px 8px",
                                                          fontSize: 9,
                                                          fontWeight:
                                                            activePeriod === p ? 850 : 600,
                                                          border: "none",
                                                          borderRadius: 6,
                                                          cursor: "pointer",
                                                          background:
                                                            activePeriod === p
                                                              ? "var(--t-card-bg)"
                                                              : "transparent",
                                                          color:
                                                            activePeriod === p
                                                              ? THEME.accent
                                                              : THEME.muted,
                                                          boxShadow:
                                                            activePeriod === p
                                                              ? "0 1px 3px rgba(0,0,0,0.08)"
                                                              : "none",
                                                          transition:
                                                            "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
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
                                                  }}
                                                >
                                                  {chart?.length ? (
                                                    <div style={{ width: "100%", height: 150, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                                                          <linearGradient
                                                            id={`mf-g-${cId}`}
                                                            x1="0"
                                                            y1="0"
                                                            x2="0"
                                                            y2="1"
                                                          >
                                                            <stop
                                                              offset="5%"
                                                              stopColor={
                                                                navUp ? THEME.sage : THEME.rust
                                                              }
                                                              stopOpacity={0.35}
                                                            />
                                                            <stop
                                                              offset="95%"
                                                              stopColor={
                                                                navUp ? THEME.sage : THEME.rust
                                                              }
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
                                                          fill={`url(#mf-g-${cId})`}
                                                          dot={false}
                                                        />
                                                      </AreaChart>
                                                    </ResponsiveContainer></div>
                                                  ) : (
                                                    <div
                                                      style={{
                                                        textAlign: "center",
                                                        padding: "20px 0",
                                                        fontSize: 11,
                                                        color: THEME.muted,
                                                      }}
                                                    >
                                                      {chart
                                                        ? "No data for this period"
                                                        : "Loading chart…"}
                                                    </div>
                                                  )}
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
                                                          <span style={{ color: THEME.muted }}>
                                                            Prev NAV:{" "}
                                                          </span>
                                                          <b>
                                                            <Prv>₹{Number(meta.prevNav).toFixed(4)}</Prv>
                                                          </b>
                                                        </span>
                                                      )}
                                                      {meta.navChange != null && (
                                                        <span>
                                                          <span style={{ color: THEME.muted }}>
                                                            Change:{" "}
                                                          </span>
                                                          <b
                                                            style={{
                                                              color:
                                                                meta.navChange >= 0
                                                                  ? THEME.sage
                                                                  : THEME.rust,
                                                            }}
                                                          >
                                                            {meta.navChange >= 0 ? "+" : ""}
                                                            {Number(meta.navChange).toFixed(4)}
                                                            {meta.navChangePct != null &&
                                                              ` (${meta.navChangePct >= 0 ? "+" : ""}${Number(meta.navChangePct).toFixed(2)}%)`}
                                                          </b>
                                                        </span>
                                                      )}
                                                      {meta.high52 != null && (
                                                        <span>
                                                          <span style={{ color: THEME.muted }}>
                                                            52W H/L:{" "}
                                                          </span>
                                                          <b style={{ color: THEME.sage }}>
                                                            <Prv>₹{Number(meta.high52).toFixed(4)}</Prv>
                                                          </b>
                                                          {" / "}
                                                          <b style={{ color: THEME.rust }}>
                                                            {meta.low52 != null ? (
                                                              <Prv>₹{Number(meta.low52).toFixed(4)}</Prv>
                                                            ) : (
                                                              "—"
                                                            )}
                                                          </b>
                                                        </span>
                                                      )}
                                                      {meta.navDate && (
                                                        <span>
                                                          <span style={{ color: THEME.muted }}>
                                                            NAV Date:{" "}
                                                          </span>
                                                          <b>{meta.navDate}</b>
                                                        </span>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })()}

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
                                                borderRadius: 20,
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
                                                              <Prv>{fmtINRFull(lotPnl)}</Prv>
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
                                                        <Prv>{fmtINRFull(lotCurr)}</Prv>
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
                                                              removeItem("mutualFunds", lot.id);
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
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      background: `color-mix(in srgb, ${THEME.gold} 12%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: THEME.gold,
                      flexShrink: 0,
                    }}
                  >
                    <Activity size={16} />
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
                            value: <Prv>{fmtINRFull(totalAnnualCost)}</Prv>,
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
                            value: <Prv>{fmtINRFull(totalAnnualSaving)}</Prv>,
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
                                marginBottom: 4,
                              }}
                            >
                              {label}
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink }}>
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
                                <div style={{ fontSize: 16, fontWeight: 900, color: THEME.sage }}>
                                  <Prv>{fmtINRFull(compoundSaving(totalAnnualSaving, yrs))}</Prv>
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
                                  <Prv>{fmtINRFull(f.currentValue)}</Prv>
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
                                  <Prv>{fmtINRFull(f.annualCost)}</Prv>
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
                                  <Prv>{f.annualSaving > 0 ? fmtINRFull(f.annualSaving) : "—"}</Prv>
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
          onSave={(updated: any) => {
            updateItem("mutualFunds", editMF.id, updated);
            setEditMF(null);
          }}
          activeProfile={activeProfile}
        />
      )}
      {sellMF && (
        <SellMFModal
          mf={sellMF}
          onClose={() => setSellMF(null)}
          onSave={(sellRecord: any, remainingUnits: number) => {
            addItem("mfSells", sellRecord);
            if (remainingUnits <= 0) removeItem("mutualFunds", sellMF.id);
            else {
              const newInvested = Number(sellMF.buyNav || 0) * remainingUnits;
              updateItem("mutualFunds", sellMF.id, {
                units: String(remainingUnits),
                invested: String(
                  newInvested ||
                    (Number(sellMF.invested || 0) * remainingUnits) / Number(sellMF.units)
                ),
              });
            }
            setSellMF(null);
          }}
        />
      )}
      {fifoSellMFGroup && (
        <FifoSellMFModal
          group={fifoSellMFGroup}
          onClose={() => setFifoSellMFGroup(null)}
          onSave={(allocs: any[], sellNav: number, sellDate: string) => {
            allocs.forEach((alloc: any, i: number) => {
              addItem("mfSells", {
                id: `mfs-${Date.now()}-${i}`,
                owner: alloc.lot.owner || "self",
                scheme: fifoSellMFGroup.fundName || fifoSellMFGroup.schemeName,
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
              if (alloc.fullyConsumed) removeItem("mutualFunds", alloc.lot.id);
              else {
                const remaining = Number(alloc.lot.units) - alloc.consume;
                const newInvested = Number(alloc.lot.buyNav || 0) * remaining;
                updateItem("mutualFunds", alloc.lot.id, {
                  units: String(remaining),
                  invested: String(
                    newInvested ||
                      (Number(alloc.lot.invested || 0) * remaining) / Number(alloc.lot.units)
                  ),
                });
              }
            });
            setFifoSellMFGroup(null);
          }}
        />
      )}
      {addLotGroup && (
        <AddLotMFModal
          group={addLotGroup}
          onClose={() => setAddLotGroup(null)}
          onSave={(data: any) => {
            addItem("mutualFunds", data);
            setAddLotGroup(null);
          }}
        />
      )}
    </div>
  );
}

/* ── Add Lot MF Modal ──────────────────────────────────────────────── */
function AddLotMFModal({ group, onClose, onSave }: any) {
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

      <ModalActions onSave={handleSave} onClose={onClose} saveLabel="Add Lot" />
    </Modal>
  );
}

/* ── Sell MF Modal ─────────────────────────────────────────────────── */
function SellMFModal({ mf, onClose, onSave }: any) {
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
    if (!sellUnitsNum || !sellNavNum || sellUnitsNum > totalUnits) return;
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
      units: sellUnitsNum,
      buyNav,
      buyDate: mf.buyDate || "",
      sellNav: sellNavNum,
      sellDate: f.sellDate,
      profit: Number(profit.toFixed(2)),
    };
    onSave(record, remainingUnits);
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
      <ModalActions onSave={handleSave} onClose={onClose} saveLabel="Confirm Sell" />
    </Modal>
  );
}

/* ── Bulk Sell MF Modal ─────────────────────────────────────────────── */
function FifoSellMFModal({ group, onClose, onSave }: any) {
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
    let remaining = sellUnitsNum;
    const refDateStr = f.sellDate || today();
    for (const lot of sortedLots) {
      if (remaining <= 0) break;
      const available = Number(lot.units) || 0;
      const consume = Math.min(available, remaining);
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
        fullyConsumed: consume >= available,
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
        disabled={!isValid || allocs.length === 0}
      />
    </Modal>
  );
}

/* ── Dividend Tracker ──────────────────────────────────────────────── */
const DividendTracker = ({ state, addItem, removeItem }: any) => {
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({
    symbol: "",
    fundName: "",
    type: "stock",
    amount: "",
    tds: "",
    paymentDate: today(),
    fy: state?.profile?.fy || getCurrentFY(),
    note: "",
  });

  // Manual dividend records
  const manualDividends = state.dividends || [];

  // FY (Apr-Mar) for a date, used to bucket auto-detected rows that have no explicit fy field.
  const fyFromDate = (d: string): string => {
    if (!d) return "Unknown";
    const [y, m] = d.split("-").map(Number);
    if (!y || !m) return "Unknown";
    const startYear = m >= 4 ? y : y - 1;
    return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
  };

  // Auto-detected dividends from transactions (category = "Dividend" or narration contains "dividend").
  // Bug fix: a bank credit already logged in detail as a manual entry (the normal workflow, since
  // the manual form is what captures TDS/FY that the bank feed lacks) used to be summed AGAIN here,
  // double-counting the same payout. A bank credit is typically net-of-TDS while the matching manual
  // entry is usually the gross declared amount with tds entered separately, so dedup by date + the
  // manual entry's own net (amount - tds) rather than a naive gross-amount match.
  const autoDividends = React.useMemo(() => {
    const manualNetByDate = new Map<string, number[]>();
    manualDividends.forEach((d: any) => {
      if (!d.paymentDate) return;
      const net = (Number(d.amount) || 0) - (Number(d.tds) || 0);
      const arr = manualNetByDate.get(d.paymentDate) || [];
      arr.push(net);
      manualNetByDate.set(d.paymentDate, arr);
    });
    const isAlreadyLogged = (date: string, amount: number) => {
      const nets = manualNetByDate.get(date);
      if (!nets) return false;
      return nets.some((net) => Math.abs(net - amount) <= 1);
    };
    return (state.transactions || [])
      .filter((t: any) => {
        const cat = (t.category || "").toLowerCase();
        const note = (t.note || t.narration || t.description || "").toLowerCase();
        return (
          t.type === "credit" &&
          (cat === "dividend" ||
            cat === "dividends" ||
            note.includes("dividend") ||
            note.includes("div payout") ||
            note.includes("interim div"))
        );
      })
      .filter((t: any) => !isAlreadyLogged(t.date, Number(t.amount) || 0))
      .map((t: any) => ({
        id: t.id,
        symbol: (t.note || t.narration || t.description || "").slice(0, 30),
        fundName: "",
        type: "auto",
        amount: Number(t.amount) || 0,
        tds: 0,
        paymentDate: t.date,
        fy: fyFromDate(t.date),
        note: "Auto-detected from transactions (net amount — TDS unknown)",
        isAuto: true,
      }));
  }, [state.transactions, manualDividends]);

  // Combined view
  const allDividends = [
    ...manualDividends.map((d: any) => ({ ...d, isAuto: false })),
    ...autoDividends,
  ];
  const totalDividends = allDividends.reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);
  const totalTDS = allDividends.reduce((s: number, d: any) => s + (Number(d.tds) || 0), 0);
  const byFY: Record<string, { amount: number; tds: number; count: number }> = {};
  allDividends.forEach((d: any) => {
    const fy = d.fy || "Unknown";
    if (!byFY[fy]) byFY[fy] = { amount: 0, tds: 0, count: 0 };
    byFY[fy].amount += Number(d.amount) || 0;
    byFY[fy].tds += Number(d.tds) || 0;
    byFY[fy].count++;
  });

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        {[
          { label: "Total Dividends", value: fmtINRFull(totalDividends), color: THEME.sage },
          { label: "TDS Deducted", value: fmtINRFull(totalTDS), color: THEME.rust },
          {
            label: "Net Received",
            value: fmtINRFull(totalDividends - totalTDS),
            color: THEME.accent,
          },
          { label: "Manual Records", value: String(manualDividends.length), color: THEME.gold },
          ...(autoDividends.length > 0
            ? [{ label: "Auto-Detected", value: String(autoDividends.length), color: THEME.accent }]
            : []),
        ].map(({ label, value, color }) => (
          <Card key={label} style={{ padding: "16px 18px", borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>
              <Prv>{value}</Prv>
            </div>
          </Card>
        ))}
      </div>

      {autoDividends.length > 0 && (
        <Card
          style={{
            padding: "14px 18px",
            background: `color-mix(in srgb, ${THEME.accent} 2%, transparent)`,
            border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 13%, transparent)`}`,
          }}
        >
          <div style={{ fontSize: 12, color: THEME.accent, fontWeight: 600 }}>
            {autoDividends.length} dividend transaction{autoDividends.length > 1 ? "s" : ""}{" "}
            auto-detected from your bank transactions (category "Dividend" or narration containing
            "dividend"). These are shown below alongside manual records — any auto-detected credit
            already matched to a manual entry (same date, net-of-TDS amount) is excluded to avoid
            double-counting. Auto-detected amounts are the raw bank credit, so TDS on those rows is
            unknown (shown as ₹0) unless you log the payout manually with its TDS.
          </div>
        </Card>
      )}

      <Card style={{ padding: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800 }}>Dividend Records</div>
          <Button variant="accent" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ Add Dividend"}
          </Button>
        </div>

        {showForm && (
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: `color-mix(in srgb, ${THEME.accent} 2%, transparent)`,
              border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 13%, transparent)`}`,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              <Field label="Type">
                <select
                  className="form-input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="stock">Stock</option>
                  <option value="mf">Mutual Fund</option>
                </select>
              </Field>
              <Field label={form.type === "stock" ? "Symbol" : "Fund Name"}>
                <input
                  className="form-input"
                  placeholder={form.type === "stock" ? "e.g. RELIANCE" : "e.g. HDFC Top 100"}
                  value={form.type === "stock" ? form.symbol : form.fundName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [form.type === "stock" ? "symbol" : "fundName"]: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Amount (₹)">
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 5000"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </Field>
              <Field label="TDS (₹)">
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 500"
                  value={form.tds}
                  onChange={(e) => setForm({ ...form, tds: e.target.value })}
                />
              </Field>
              <Field label="Payment Date">
                <input
                  className="form-input"
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                />
              </Field>
              <Field label="FY">
                <input
                  className="form-input"
                  placeholder={getCurrentFY()}
                  value={form.fy}
                  onChange={(e) => setForm({ ...form, fy: e.target.value })}
                />
              </Field>
            </div>
            <Button
              variant="accent"
              size="sm"
              style={{ marginTop: 12 }}
              onClick={() => {
                if (!form.amount) return;
                addItem("dividends", {
                  symbol: form.symbol,
                  fundName: form.fundName,
                  type: form.type,
                  amount: Number(form.amount) || 0,
                  tds: Number(form.tds) || 0,
                  paymentDate: form.paymentDate,
                  fy: form.fy,
                  note: form.note,
                  owner: "self",
                });
                setForm({
                  symbol: "",
                  fundName: "",
                  type: "stock",
                  amount: "",
                  tds: "",
                  paymentDate: today(),
                  fy: state?.profile?.fy || getCurrentFY(),
                  note: "",
                });
                setShowForm(false);
              }}
            >
              Save Dividend
            </Button>
          </div>
        )}

        {allDividends.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: THEME.muted, fontSize: 13 }}>
            No dividends tracked yet. Add dividend records manually above, or categorize bank
            transactions as "Dividend" for automatic detection.
          </div>
        ) : (
          <div style={{ borderRadius: 12, border: `1px solid ${THEME.line}`, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" as const }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)` }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>
                    Security
                  </th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Source</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Amount</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>TDS</th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Date</th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>FY</th>
                  <th style={{ padding: "10px 6px" }}></th>
                </tr>
              </thead>
              <tbody>
                {[...allDividends]
                  .sort((a: any, b: any) =>
                    (b.paymentDate || "").localeCompare(a.paymentDate || "")
                  )
                  .map((d: any) => (
                    <tr
                      key={d.id}
                      style={{
                        borderTop: `1px solid ${THEME.line}`,
                        background: d.isAuto ? `color-mix(in srgb, ${THEME.accent} 2%, transparent)` : undefined,
                      }}
                    >
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                        {d.symbol || d.fundName || "-"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {d.isAuto ? (
                          <Badge
                            variant="muted"
                            style={{
                              fontSize: 10,
                              background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                              color: THEME.accent,
                            }}
                          >
                            Auto
                          </Badge>
                        ) : (
                          <Badge
                            variant={d.type === "stock" ? "accent" : "muted"}
                            style={{ fontSize: 10 }}
                          >
                            {d.type}
                          </Badge>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: THEME.sage,
                        }}
                      >
                        <Prv>{fmtINRFull(d.amount)}</Prv>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: THEME.rust }}>
                        <Prv>{fmtINRFull(d.tds)}</Prv>
                      </td>
                      <td style={{ padding: "10px 12px", color: THEME.muted }}>
                        {d.paymentDate || "-"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>{d.fy || "-"}</td>
                      <td style={{ padding: "10px 6px" }}>
                        {!d.isAuto && (
                          <button
                            onClick={() => removeItem("dividends", d.id)}
                            aria-label={`Delete dividend from ${d.symbol || d.fundName || "holding"}`}
                            title="Delete"
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: THEME.muted,
                              padding: 6,
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {Object.keys(byFY).length > 1 && (
          <div
            style={{ marginTop: 16, padding: 14, borderRadius: 10, background: `color-mix(in srgb, ${THEME.muted} 2%, transparent)` }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>FY-wise Summary</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 8,
              }}
            >
              {Object.entries(byFY)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([fy, data]) => (
                  <div
                    key={fy}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: THEME.accent }}>
                      FY {fy}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>
                      <Prv>{fmtINRFull(data.amount)}</Prv>
                    </div>
                    <div style={{ fontSize: 10, color: THEME.muted }}>
                      TDS: <Prv>{fmtINRFull(data.tds)}</Prv> · {data.count} records
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </Card>

      {/* ── DRIP Simulator ──────────────────────────────────────────── */}
      {allDividends.length > 0 && (
        <DRIPSimulator allDividends={allDividends} totalDividends={totalDividends} />
      )}
    </div>
  );
};

/* ── DRIP Simulator Component ─────────────────────────────────────── */
const DRIP_RATES = [
  { label: "10%", rate: 0.1 },
  { label: "12%", rate: 0.12 },
  { label: "15%", rate: 0.15 },
  { label: "18%", rate: 0.18 },
];

const DRIPSimulator = ({
  allDividends,
  totalDividends,
}: {
  allDividends: any[];
  totalDividends: number;
}) => {
  const [selectedRateIdx, setSelectedRateIdx] = React.useState(1); // default 12%
  const selectedRate = DRIP_RATES[selectedRateIdx].rate;

  // Bug fix: reinvestment must compound the NET amount actually received (amount - TDS
  // withheld), not the gross declared dividend — only the net amount ever reaches the bank
  // account to be reinvested, so compounding the gross figure inflated every DRIP projection
  // below by however much TDS was withheld on that payout.
  const netDividendAmt = (d: any) => Math.max(0, (Number(d.amount) || 0) - (Number(d.tds) || 0));

  const dripValue = React.useMemo(() => {
    const nowMs = new Date(today()).getTime();
    return allDividends.reduce((sum: number, d: any) => {
      const amt = netDividendAmt(d);
      const dateStr = d.paymentDate || d.date;
      if (!dateStr || amt <= 0) return sum + amt;
      const years = (nowMs - new Date(dateStr).getTime()) / (365.25 * 86400000);
      if (years <= 0) return sum + amt;
      return sum + amt * Math.pow(1 + selectedRate, years);
    }, 0);
  }, [allDividends, selectedRate]);

  const dripAt12 = React.useMemo(() => {
    const nowMs = new Date(today()).getTime();
    return allDividends.reduce((sum: number, d: any) => {
      const amt = netDividendAmt(d);
      const dateStr = d.paymentDate || d.date;
      if (!dateStr || amt <= 0) return sum + amt;
      const years = (nowMs - new Date(dateStr).getTime()) / (365.25 * 86400000);
      if (years <= 0) return sum + amt;
      return sum + amt * Math.pow(1.12, years);
    }, 0);
  }, [allDividends]);

  const dripAt15 = React.useMemo(() => {
    const nowMs = new Date(today()).getTime();
    return allDividends.reduce((sum: number, d: any) => {
      const amt = netDividendAmt(d);
      const dateStr = d.paymentDate || d.date;
      if (!dateStr || amt <= 0) return sum + amt;
      const years = (nowMs - new Date(dateStr).getTime()) / (365.25 * 86400000);
      if (years <= 0) return sum + amt;
      return sum + amt * Math.pow(1.15, years);
    }, 0);
  }, [allDividends]);

  const opportunityCost = dripValue - totalDividends;
  const barMaxVal = Math.max(dripValue, totalDividends, 1);
  const receivedPct = (totalDividends / barMaxVal) * 100;
  const dripPct = (dripValue / barMaxVal) * 100;

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <RefreshCw size={16} style={{ color: THEME.accent }} />
        <span style={{ fontSize: 15, fontWeight: 800 }}>DRIP Simulator</span>
        <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>
          What if you reinvested every dividend?
        </span>
      </div>

      {/* Summary cards: Total Received, If Reinvested at 12%, If Reinvested at 15%, Opportunity Cost */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Card style={{ padding: "14px 16px", borderTop: `3px solid ${THEME.muted}` }}>
          <div
            style={{
              fontSize: 10,
              color: THEME.muted,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Total Received
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
            <Prv>{fmtINRFull(totalDividends)}</Prv>
          </div>
        </Card>
        <Card style={{ padding: "14px 16px", borderTop: `3px solid ${THEME.sage}` }}>
          <div
            style={{
              fontSize: 10,
              color: THEME.muted,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            If Reinvested at 12%
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: THEME.sage, marginTop: 4 }}>
            <Prv>{fmtINRFull(dripAt12)}</Prv>
          </div>
        </Card>
        <Card style={{ padding: "14px 16px", borderTop: `3px solid ${THEME.accent}` }}>
          <div
            style={{
              fontSize: 10,
              color: THEME.muted,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            If Reinvested at 15%
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: THEME.accent, marginTop: 4 }}>
            <Prv>{fmtINRFull(dripAt15)}</Prv>
          </div>
        </Card>
        <Card style={{ padding: "14px 16px", borderTop: `3px solid ${THEME.gold}` }}>
          <div
            style={{
              fontSize: 10,
              color: THEME.muted,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Opportunity Cost
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: THEME.gold, marginTop: 4 }}>
            <Prv>{fmtINRFull(dripAt12 - totalDividends)}</Prv>
          </div>
          <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>at 12% CAGR</div>
        </Card>
      </div>

      {/* Rate toggle pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>Assumed CAGR:</span>
        {DRIP_RATES.map((r, i) => (
          <button
            key={r.label}
            onClick={() => setSelectedRateIdx(i)}
            style={{
              padding: "4px 14px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              border:
                i === selectedRateIdx ? `2px solid ${THEME.accent}` : `1px solid ${THEME.line}`,
              background: i === selectedRateIdx ? `color-mix(in srgb, ${THEME.accent} 8%, transparent)` : "transparent",
              color: i === selectedRateIdx ? THEME.accent : THEME.muted,
              transition: "all 0.15s ease",
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Comparison visualization */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        {/* Received card */}
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 12,
            background: `color-mix(in srgb, ${THEME.muted} 3%, transparent)`,
            border: `1px solid ${THEME.line}`,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: THEME.muted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Received
          </div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>
            <Prv>{fmtINRFull(totalDividends)}</Prv>
          </div>
          {/* Bar */}
          <div
            style={{
              marginTop: 10,
              height: 8,
              borderRadius: 4,
              background: `color-mix(in srgb, ${THEME.muted} 8%, transparent)`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 4,
                background: THEME.muted,
                width: `${receivedPct}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
        {/* If Reinvested card */}
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 12,
            background: `color-mix(in srgb, ${THEME.sage} 3%, transparent)`,
            border: `1px solid ${`color-mix(in srgb, ${THEME.sage} 13%, transparent)`}`,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: THEME.sage,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            If Reinvested at {DRIP_RATES[selectedRateIdx].label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: THEME.sage }}>
            <Prv>{fmtINRFull(dripValue)}</Prv>
          </div>
          {/* Bar */}
          <div
            style={{
              marginTop: 10,
              height: 8,
              borderRadius: 4,
              background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 4,
                background: THEME.sage,
                width: `${dripPct}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Missed growth callout */}
      {opportunityCost > 0 && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: `color-mix(in srgb, ${THEME.sage} 3%, transparent)`,
            border: `1px solid ${`color-mix(in srgb, ${THEME.sage} 13%, transparent)`}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <TrendingUp size={16} style={{ color: THEME.sage, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: THEME.sage }}>
            You missed{" "}
            <Prv>
              <b>{fmtINRFull(opportunityCost)}</b>
            </Prv>{" "}
            in potential growth by not reinvesting dividends at {DRIP_RATES[selectedRateIdx].label}{" "}
            CAGR
          </span>
        </div>
      )}
    </Card>
  );
};

/* ── Yield Tracker ──────────────────────────────────────────────────── */
const YieldTracker = ({ state }: any) => {
  const PPF_RATE = 7.1;
  const EPF_RATE = 8.25;
  const RD_NOTE = "based on current interest rate";

  // FD: only count active (non-matured) FDs — compound quarterly (Indian standard)
  const fdInterest = (state.fixedDeposits || []).reduce((s: number, f: any) => {
    if (f.maturityDate) {
      const [y, m, d] = String(f.maturityDate).split("-").map(Number);
      if (new Date(y, m - 1, d) < new Date()) return s; // skip matured
    }
    const principal = Number(f.principal || 0);
    const rate = Number(f.rate || 0);
    return s + (fdMaturity(principal, rate, 1) - principal);
  }, 0);

  // Bond coupon — only active (non-matured) bonds
  const bondInterest = (state.bonds || []).reduce((s: number, b: any) => {
    if (b.maturityDate) {
      const [y, m, d] = String(b.maturityDate).split("-").map(Number);
      if (new Date(y, m - 1, d) < new Date()) return s;
    }
    const principal =
      Number(b.totalPrincipalAmount || 0) ||
      Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
      Number(b.faceValue || 0);
    return s + (principal * Number(b.coupon || 0)) / 100;
  }, 0);

  // RD: interest = maturityValue - deposited (annualised) — only active (non-matured) RDs
  const rdInterest = (state.recurringDeposits || []).reduce((s: number, r: any) => {
    const tenureMonths = Number(r.tenureMonths) || 0;
    if (!tenureMonths) return s;
    if (r.startDate && tenureMonths) {
      if (addMonthsToDateStr(r.startDate, tenureMonths) < today()) return s;
    }
    const fullMaturity = rdMaturity(Number(r.monthly), Number(r.rate), tenureMonths);
    const fullDeposited = (Number(r.monthly) || 0) * tenureMonths;
    const annualisedInterest = (fullMaturity - fullDeposited) / (tenureMonths / 12);
    return s + Math.max(0, annualisedInterest);
  }, 0);

  // PPF: balance × 7.1%
  const ppfInterest = (state.ppf || []).reduce(
    (s: number, p: any) => s + (Number(p.balance) * PPF_RATE) / 100,
    0
  );

  // EPF: balance × 8.25%
  const epfInterest = (state.epf || []).reduce((s: number, e: any) => {
    return s + (calculateEpfBalance(e) * EPF_RATE) / 100;
  }, 0);

  // NPS: rough 10% annual growth (mixed equity/debt) — fallback to transaction-derived corpus
  const npsGrowth = (state.nps || []).reduce((s: number, n: any) => {
    const bal = Number(n.balance) || 0;
    const txCorpus = (n.transactions || []).reduce(
      (sum: number, t: any) =>
        sum + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
      0
    );
    const corpus = bal > 0 ? bal : txCorpus;
    return s + (corpus * 10) / 100;
  }, 0);

  // Dividends (manually logged only — matching DividendTracker's own dedup logic against
  // auto-detected bank transactions here would duplicate that heuristic; manual entries are
  // the ones with a reliable TDS figure), trailing 12 months, net of TDS actually received.
  const oneYearAgoStr = (() => {
    const [y, m, d] = today().split("-").map(Number);
    return `${y - 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  })();
  const dividendYield = (state.dividends || []).reduce((s: number, d: any) => {
    if (!d.paymentDate || d.paymentDate < oneYearAgoStr) return s;
    return s + Math.max(0, (Number(d.amount) || 0) - (Number(d.tds) || 0));
  }, 0);

  // Fixed chart-extension tokens (not the user-selectable accent) — raw hex
  // here would go stale in dark mode and could collide with the active
  // accent preset.
  const streams = [
    {
      label: "Fixed Deposits",
      value: fdInterest,
      color: THEME.gold,
      icon: Coins,
      note: "annual interest on active FDs",
    },
    {
      label: "Bonds",
      value: bondInterest,
      color: THEME.muted,
      icon: FileText,
      note: "annual coupon on face value",
    },
    {
      label: "Recurring Deposits",
      value: rdInterest,
      color: THEME.cyan,
      icon: Repeat,
      note: RD_NOTE,
    },
    {
      label: "PPF",
      value: ppfInterest,
      color: THEME.sage,
      icon: Shield,
      note: `@ ${PPF_RATE}% current rate`,
    },
    {
      label: "EPF / EPFO",
      value: epfInterest,
      color: THEME.accent,
      icon: Shield,
      note: `@ ${EPF_RATE}% announced rate`,
    },
    {
      label: "Dividends",
      value: dividendYield,
      color: THEME.rust,
      icon: IndianRupee,
      note: "manually logged, trailing 12mo, net of TDS",
    },
    {
      // Bug fix: this used to be folded into the same "Annual Yield" total as every contractual,
      // cash-paying stream above (FD/Bond/RD/PPF/EPF interest) with no distinction — NPS units
      // don't pay out cash, this is a speculative mark-to-market growth guess, not income. Flagged
      // isEstimate so the UI below can separate "money you'll actually receive" from "a projection."
      label: "NPS (est.)",
      value: npsGrowth,
      color: THEME.violet,
      icon: Briefcase,
      note: "@ ~10% blended CAGR estimate — not a cash payout",
      isEstimate: true,
    },
  ].filter((s) => s.value > 0);

  const contractualAnnual = streams
    .filter((s) => !s.isEstimate)
    .reduce((s, x) => s + x.value, 0);
  const estimatedAnnual = streams.filter((s) => s.isEstimate).reduce((s, x) => s + x.value, 0);
  const totalAnnual = contractualAnnual + estimatedAnnual;
  const totalMonthly = totalAnnual / 12;

  const maxVal = Math.max(...streams.map((s) => s.value), 1);

  return (
    <div className="animate-fade-in-up">
      {/* Top stat tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 32,
        }}
      >
        {[
          {
            label: "Annual Yield",
            value: <Prv>{fmtINRFull(totalAnnual)}</Prv>,
            sub:
              estimatedAnnual > 0 ? (
                <Prv>{`${fmtINRFull(contractualAnnual)} contractual + ${fmtINRFull(estimatedAnnual)} est. NPS growth`}</Prv>
              ) : (
                "Interest, coupons & dividends combined"
              ),
            color: THEME.accent,
            Icon: IndianRupee,
          },
          {
            label: "Monthly Income",
            value: <Prv>{fmtINRFull(totalMonthly)}</Prv>,
            sub: "Average cash flow / month",
            color: THEME.sage,
            Icon: Receipt,
          },
          {
            label: "Daily Passive",
            value: <Prv>{fmtINRFull(totalAnnual / 365)}</Prv>,
            sub: "₹ earned every day",
            color: THEME.gold,
            Icon: Zap,
          },
          {
            label: "Income Streams",
            value: String(streams.length),
            sub: "Active yielding instruments",
            color: THEME.accent,
            Icon: Target,
          },
        ].map(({ label, value, sub, color, Icon }) => (
          <div
            key={label}
            className="card-lift"
            style={{
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              borderTop: `4px solid ${color}`,
              borderRadius: 14,
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${color} 12%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color,
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                }}
              >
                {label}
              </div>
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: THEME.ink,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {value}
            </div>
            {sub && <div style={{ fontSize: 10, color: THEME.muted }}>{sub}</div>}
          </div>
        ))}
      </div>

      {streams.length === 0 ? (
        <Card style={{ padding: "48px 32px", textAlign: "center" as const }}>
          <PiggyBank size={48} color={THEME.muted} style={{ margin: "0 auto 16px" }} />
          <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
            No Yield Data Yet
          </div>
          <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 360, margin: "0 auto" }}>
            Add Fixed Deposits, Bonds, PPF, EPF, RD, NPS or Dividends to see your income
            breakdown here.
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 24 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: THEME.muted,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              marginBottom: 20,
            }}
          >
            Yield Breakdown by Instrument
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {streams.map(({ label, value, color, icon: Icon, note }) => {
              const barPct = (value / maxVal) * 100;
              const sharePct = totalAnnual > 0 ? (value / totalAnnual) * 100 : 0;
              return (
                <div key={label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: `color-mix(in srgb, ${color} 9%, transparent)`,
                          border: `1px solid ${`color-mix(in srgb, ${color} 19%, transparent)`}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={13} color={color} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted }}>{note}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" as const }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color }}>
                        <Prv>{fmtINRFull(value)}</Prv>
                      </div>
                      <div style={{ fontSize: 10, color: THEME.muted }}>
                        {sharePct.toFixed(1)}% share
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 4,
                      background: `color-mix(in srgb, ${color} 9%, transparent)`,
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
            })}
          </div>

          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: `2px solid ${THEME.line}`,
              display: "flex",
              justifyContent: "space-between",
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
                  marginBottom: 4,
                }}
              >
                Total Annual Yield
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: THEME.accent }}>
                <Prv>{fmtINRFull(totalAnnual)}</Prv>
              </div>
            </div>
            <div style={{ textAlign: "right" as const }}>
              <div
                style={{
                  fontSize: 10,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                Monthly Avg.
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: THEME.sage }}>
                <Prv>{fmtINRFull(totalMonthly)}</Prv>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: 10,
              background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
              border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 15%, transparent)`}`,
              fontSize: 11,
              color: THEME.muted,
              lineHeight: 1.6,
            }}
          >
            <b style={{ color: THEME.ink }}>Note:</b> FD uses quarterly compounding. Bond uses
            coupon on face value. RD uses annualised interest over full tenure. PPF @ {PPF_RATE}%,
            EPF @ {EPF_RATE}%. NPS is a rough estimate at 10% blended return — actual performance
            varies. All figures are pre-tax.
          </div>
        </Card>
      )}
    </div>
  );
};
