import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Scissors,
  Shield,
  IndianRupee,
  ArrowRight,
  Info,
  Search,
  Filter,
  PieChart as PieChartIcon,
  Calculator,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Copy,
  Check,
  Percent,
  Sliders,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINRFull, today, exportArrayToCSV } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";
import { usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { Modal, ModalActions } from "../ui/Modal";
import { EmptyState } from "../ui/EmptyState";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ══════════════════════════════════════════════════════════════════ */

const EQUITY_CATEGORIES = [
  "equity",
  "elss",
  "flexi",
  "large cap",
  "mid cap",
  "small cap",
  "multi cap",
  "focused",
  "sectoral",
  "thematic",
  "index",
  "hybrid",
  "balanced advantage",
  "aggressive hybrid",
  "nifty",
  "sensex",
];

export const isEquityMF = (mf: any): boolean => {
  const cat = (mf.category || mf.type || mf.scheme || mf.name || "").toLowerCase();
  return EQUITY_CATEGORIES.some((k) => cat.includes(k));
};

const mfKey = (name: string, owner: string) =>
  `${(name || "").trim().toLowerCase()}|${owner || "self"}`;

const buildMFCategoryIndex = (mutualFunds: any[]): Map<string, string> => {
  const idx = new Map<string, string>();
  for (const mf of mutualFunds || []) {
    if (!mf.category) continue;
    const key = mfKey(mf.name || mf.scheme, mf.owner);
    if (!idx.has(key)) idx.set(key, mf.category);
  }
  return idx;
};

const resolveMFSellCategory = (m: any, categoryIndex: Map<string, string>): string => {
  if (m.category) return m.category;
  return categoryIndex.get(mfKey(m.name || m.scheme, m.owner)) || "";
};

const parseLocalDate = (dateStr: string): Date => {
  const clean = String(dateStr || "").trim();
  const parts = clean.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(day)) return new Date(y, m, day);
  }
  return new Date(clean);
};

export const getHoldingMonths = (buyDate: string, sellDate: string): number => {
  if (!buyDate || !sellDate) return 0;
  const a = parseLocalDate(buyDate);
  const b = parseLocalDate(sellDate);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  return Math.max(0, months);
};

export const isLongTerm = (buyDate: string, sellDate: string, monthsThreshold: number): boolean => {
  if (!buyDate || !sellDate) return false;
  const buy = parseLocalDate(buyDate);
  const sell = parseLocalDate(sellDate);
  const anniversary = new Date(buy.getFullYear(), buy.getMonth() + monthsThreshold, buy.getDate());
  return sell > anniversary;
};

const fmtDate = (d: string) => {
  if (!d) return "-";
  const dt = parseLocalDate(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const dateToFYStart = (d: string): number => {
  const dt = parseLocalDate(d);
  return dt.getMonth() >= 3 ? dt.getFullYear() : dt.getFullYear() - 1;
};

const getCurrentFYStartYear = (): number => {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
};

const buildFYOptions = (
  stockSells: any[],
  mfSells: any[]
): { label: string; startYear: number }[] => {
  const fySet = new Set<number>();
  fySet.add(getCurrentFYStartYear());

  for (const s of stockSells || []) {
    if (s.sellDate) fySet.add(dateToFYStart(s.sellDate));
    if (s.buyDate) fySet.add(dateToFYStart(s.buyDate));
  }
  for (const m of mfSells || []) {
    if (m.sellDate) fySet.add(dateToFYStart(m.sellDate));
    if (m.buyDate) fySet.add(dateToFYStart(m.buyDate));
  }

  return Array.from(fySet)
    .sort((a, b) => b - a)
    .map((y) => ({ label: `FY ${y}-${String(y + 1).slice(2)}`, startYear: y }));
};

const isInFY = (dateStr: string, fyStartYear: number): boolean => {
  if (!dateStr) return false;
  const d = parseLocalDate(dateStr);
  const fyStart = new Date(fyStartYear, 3, 1);
  const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59);
  return d >= fyStart && d <= fyEnd;
};

/* ── Tax Rate constants & helpers ────────────────────────────────── */
const EQUITY_RATE_CHANGE_DATE = "2024-07-23";
const DEBT_INDEXATION_CUTOFF_DATE = "2023-04-01";

const isOnOrAfterEquityRateChange = (dateStr: string): boolean =>
  parseLocalDate(dateStr) >= parseLocalDate(EQUITY_RATE_CHANGE_DATE);

const getEquitySTCGRate = (sellDate: string) =>
  isOnOrAfterEquityRateChange(sellDate) ? 0.2 : 0.15;
const getEquityLTCGRate = (sellDate: string) =>
  isOnOrAfterEquityRateChange(sellDate) ? 0.125 : 0.1;
const getEquityLTCGExemption = (fy: number) => (fy >= 2024 ? 125000 : 100000);
const DEBT_STCG_SLAB_RATE = 0.3;
const DEBT_LTCG_RATE = 0.2;

const referenceDateForFY = (fyStartYear: number): string => {
  if (fyStartYear >= getCurrentFYStartYear()) return today();
  return `${fyStartYear + 1}-03-31`;
};

/* ── Classification Types ──────────────────────────────────────── */
export type GainType = "EQUITY_STCG" | "EQUITY_LTCG" | "DEBT_STCG" | "DEBT_LTCG";
const GAIN_TYPE_ORDER: GainType[] = ["EQUITY_STCG", "EQUITY_LTCG", "DEBT_STCG", "DEBT_LTCG"];

export interface ClassifiedSell {
  id?: string;
  name: string;
  symbol?: string;
  buyDate: string;
  buyPrice: number;
  sellDate: string;
  sellPrice: number;
  qty: number;
  holdingMonths: number;
  profit: number;
  profitPct: number;
  taxRate: number;
  estimatedTax: number;
  gainType: GainType;
  assetType: "Stock" | "Mutual Fund";
  owner?: string;
  categoryGuessed?: boolean;
}

export interface UnrealizedHolding {
  id?: string;
  name: string;
  symbol?: string;
  buyDate: string;
  buyPrice: number;
  currentPrice: number;
  qty: number;
  holdingMonths: number;
  unrealizedPL: number;
  unrealizedPLPct: number;
  wouldBeType: GainType;
  assetType: "Stock" | "Mutual Fund";
  owner?: string;
  monthsToLTCG: number | null | "never";
  daysToLTCG?: number | null;
}

export interface QuarterAccrual {
  key: string;
  label: string;
  period: string;
  fromDate: string;
  toDate: string;
  equitySTCG: number;
  equityLTCG: number;
  debtSTCG: number;
  debtLTCG: number;
  totalGain: number;
  estimatedTax: number;
  txnCount: number;
}

/* ══════════════════════════════════════════════════════════════════
   CLASSIFICATION & COMPUTATION ENGINES
   ══════════════════════════════════════════════════════════════════ */

const classifySells = (
  stockSells: any[],
  mfSells: any[],
  fyStartYear: number,
  mfCategoryIndex: Map<string, string>
): ClassifiedSell[] => {
  const result: ClassifiedSell[] = [];

  for (const s of stockSells || []) {
    if (!isInFY(s.sellDate, fyStartYear)) continue;
    const months = getHoldingMonths(s.buyDate, s.sellDate);
    const qty = Number(s.qty) || 0;
    const buyTotal = (Number(s.buyPrice) || 0) * qty;
    const sellTotal = (Number(s.sellPrice) || 0) * qty;
    const profit = s.profit != null ? Number(s.profit) : sellTotal - buyTotal;
    const profitPct = buyTotal > 0 ? (profit / buyTotal) * 100 : 0;
    const isLTCG = isLongTerm(s.buyDate, s.sellDate, 12);
    const gainType: GainType = isLTCG ? "EQUITY_LTCG" : "EQUITY_STCG";
    const taxRate = isLTCG ? getEquityLTCGRate(s.sellDate) : getEquitySTCGRate(s.sellDate);

    result.push({
      id: s.id,
      name: s.symbol || s.name || "Unknown Stock",
      symbol: s.symbol,
      buyDate: s.buyDate,
      buyPrice: buyTotal,
      sellDate: s.sellDate,
      sellPrice: sellTotal,
      qty,
      holdingMonths: months,
      profit,
      profitPct,
      taxRate,
      estimatedTax: 0,
      gainType,
      assetType: "Stock",
      owner: s.owner || "self",
    });
  }

  for (const m of mfSells || []) {
    if (!isInFY(m.sellDate, fyStartYear)) continue;
    const months = getHoldingMonths(m.buyDate, m.sellDate);
    const units = Number(m.units || m.qty) || 0;
    const buyTotal = (Number(m.buyNav || m.buyPrice) || 0) * units;
    const sellTotal = (Number(m.sellNav || m.sellPrice) || 0) * units;
    const profit = m.profit != null ? Number(m.profit) : sellTotal - buyTotal;
    const profitPct = buyTotal > 0 ? (profit / buyTotal) * 100 : 0;
    const resolvedCategory = resolveMFSellCategory(m, mfCategoryIndex);
    const equity = isEquityMF({ ...m, category: resolvedCategory });

    let gainType: GainType;
    let taxRate: number;

    if (equity) {
      const isLTCG = isLongTerm(m.buyDate, m.sellDate, 12);
      gainType = isLTCG ? "EQUITY_LTCG" : "EQUITY_STCG";
      taxRate = isLTCG ? getEquityLTCGRate(m.sellDate) : getEquitySTCGRate(m.sellDate);
    } else {
      const postApr2023 =
        parseLocalDate(m.buyDate) >= parseLocalDate(DEBT_INDEXATION_CUTOFF_DATE);
      if (postApr2023) {
        gainType = "DEBT_STCG";
        taxRate = DEBT_STCG_SLAB_RATE;
      } else {
        const isLTCG = isLongTerm(m.buyDate, m.sellDate, 36);
        gainType = isLTCG ? "DEBT_LTCG" : "DEBT_STCG";
        taxRate = isLTCG ? DEBT_LTCG_RATE : DEBT_STCG_SLAB_RATE;
      }
    }

    result.push({
      id: m.id,
      name: m.name || m.scheme || "Unknown MF",
      buyDate: m.buyDate,
      buyPrice: buyTotal,
      sellDate: m.sellDate,
      sellPrice: sellTotal,
      qty: units,
      holdingMonths: months,
      profit,
      profitPct,
      taxRate,
      estimatedTax: 0,
      gainType,
      assetType: "Mutual Fund",
      owner: m.owner || "self",
      categoryGuessed: !resolvedCategory,
    });
  }

  return result;
};

const computeGainTotals = (classified: ClassifiedSell[], fyStartYear: number) => {
  const groups: Record<GainType, ClassifiedSell[]> = {
    EQUITY_STCG: [],
    EQUITY_LTCG: [],
    DEBT_STCG: [],
    DEBT_LTCG: [],
  };
  for (const c of classified) groups[c.gainType].push(c);

  const totals: Record<GainType, number> = {
    EQUITY_STCG: groups.EQUITY_STCG.reduce((s, r) => s + r.profit, 0),
    EQUITY_LTCG: groups.EQUITY_LTCG.reduce((s, r) => s + r.profit, 0),
    DEBT_STCG: groups.DEBT_STCG.reduce((s, r) => s + r.profit, 0),
    DEBT_LTCG: groups.DEBT_LTCG.reduce((s, r) => s + r.profit, 0),
  };

  const ltcgExemptionLimit = getEquityLTCGExemption(fyStartYear);
  const refDate = referenceDateForFY(fyStartYear);
  const stcgRate = getEquitySTCGRate(refDate);
  const ltcgRate = getEquityLTCGRate(refDate);

  // Section 70 Loss Set-Off Rules:
  // 1. STCL (Short Term Loss) can set off STCG and LTCG.
  // 2. LTCL (Long Term Loss) can only set off LTCG.
  const rawEqSTCG = totals.EQUITY_STCG;
  const rawEqLTCG = totals.EQUITY_LTCG;
  const rawDebtSTCG = totals.DEBT_STCG;
  const rawDebtLTCG = totals.DEBT_LTCG;

  const stclAvailable = rawEqSTCG < 0 ? Math.abs(rawEqSTCG) : 0;
  const ltclAvailable = rawEqLTCG < 0 ? Math.abs(rawEqLTCG) : 0;

  let netSTCG = Math.max(0, rawEqSTCG);
  let stclRemaining = stclAvailable;

  let netEqLTCG = Math.max(0, rawEqLTCG);

  // Apply remaining STCL against Equity LTCG (u/s 70)
  let stclOffsetAgainstLTCG = 0;
  if (stclRemaining > 0 && netEqLTCG > 0) {
    stclOffsetAgainstLTCG = Math.min(stclRemaining, netEqLTCG);
    netEqLTCG -= stclOffsetAgainstLTCG;
    stclRemaining -= stclOffsetAgainstLTCG;
  }

  // Section 112A exemption (1.25L / 1L) to net Equity LTCG
  const exemptionUsed = Math.min(netEqLTCG, ltcgExemptionLimit);
  const taxableEquityLTCG = Math.max(0, netEqLTCG - exemptionUsed);
  const taxableEquitySTCG = netSTCG;
  const taxableDebtSTCG = Math.max(0, rawDebtSTCG);
  const taxableDebtLTCG = Math.max(0, rawDebtLTCG);

  const carryForwardSTCL = stclRemaining;
  const carryForwardLTCL = ltclAvailable;

  // Distribute tax back to individual transaction rows
  const distributeTax = (rows: ClassifiedSell[], taxablePool: number) => {
    const grossPositive = rows.filter((r) => r.profit > 0).reduce((s, r) => s + r.profit, 0);
    for (const r of rows) {
      r.estimatedTax =
        r.profit > 0 && grossPositive > 0
          ? Math.round(taxablePool * (r.profit / grossPositive) * r.taxRate)
          : 0;
    }
  };

  distributeTax(groups.EQUITY_STCG, taxableEquitySTCG);
  distributeTax(groups.EQUITY_LTCG, taxableEquityLTCG);
  distributeTax(groups.DEBT_STCG, taxableDebtSTCG);
  distributeTax(groups.DEBT_LTCG, taxableDebtLTCG);

  const totalTax = Math.round(
    groups.EQUITY_STCG.reduce((s, r) => s + r.estimatedTax, 0) +
      groups.EQUITY_LTCG.reduce((s, r) => s + r.estimatedTax, 0) +
      groups.DEBT_STCG.reduce((s, r) => s + r.estimatedTax, 0) +
      groups.DEBT_LTCG.reduce((s, r) => s + r.estimatedTax, 0)
  );

  return {
    byType: { groups, totals },
    totalTax,
    ltcgExemptionUsed: exemptionUsed,
    ltcgExemptionLimit,
    stcgRate,
    ltcgRate,
    taxablePools: {
      equitySTCG: taxableEquitySTCG,
      equityLTCG: taxableEquityLTCG,
      debtSTCG: taxableDebtSTCG,
      debtLTCG: taxableDebtLTCG,
    },
    setOffDetails: {
      rawEqSTCG,
      rawEqLTCG,
      stclAvailable,
      ltclAvailable,
      stclOffsetAgainstLTCG,
      carryForwardSTCL,
      carryForwardLTCL,
      totalCarryForward: carryForwardSTCL + carryForwardLTCL,
    },
  };
};

/* ── Compute ITR Schedule CG Section F Quarters ──────────────────── */
export const computeScheduleCGQuarters = (
  classified: ClassifiedSell[],
  fyStartYear: number
): QuarterAccrual[] => {
  const fyNext = fyStartYear + 1;
  const quartersDef = [
    {
      key: "Q1",
      label: "Up to 15-Jun",
      period: `01-Apr-${fyStartYear} to 15-Jun-${fyStartYear}`,
      from: `${fyStartYear}-04-01`,
      to: `${fyStartYear}-06-15`,
    },
    {
      key: "Q2",
      label: "16-Jun to 15-Sep",
      period: `16-Jun-${fyStartYear} to 15-Sep-${fyStartYear}`,
      from: `${fyStartYear}-06-16`,
      to: `${fyStartYear}-09-15`,
    },
    {
      key: "Q3",
      label: "16-Sep to 15-Dec",
      period: `16-Sep-${fyStartYear} to 15-Dec-${fyStartYear}`,
      from: `${fyStartYear}-09-16`,
      to: `${fyStartYear}-12-15`,
    },
    {
      key: "Q4A",
      label: "16-Dec to 15-Mar",
      period: `16-Dec-${fyStartYear} to 15-Mar-${fyNext}`,
      from: `${fyStartYear}-12-16`,
      to: `${fyNext}-03-15`,
    },
    {
      key: "Q4B",
      label: "16-Mar to 31-Mar",
      period: `16-Mar-${fyNext} to 31-Mar-${fyNext}`,
      from: `${fyNext}-03-16`,
      to: `${fyNext}-03-31`,
    },
  ];

  return quartersDef.map((q) => {
    const qFrom = parseLocalDate(q.from);
    const qTo = parseLocalDate(q.to);
    qTo.setHours(23, 59, 59, 999);

    const rows = classified.filter((r) => {
      const d = parseLocalDate(r.sellDate);
      return d >= qFrom && d <= qTo;
    });

    const eqSTCG = rows.filter((r) => r.gainType === "EQUITY_STCG").reduce((s, r) => s + r.profit, 0);
    const eqLTCG = rows.filter((r) => r.gainType === "EQUITY_LTCG").reduce((s, r) => s + r.profit, 0);
    const dSTCG = rows.filter((r) => r.gainType === "DEBT_STCG").reduce((s, r) => s + r.profit, 0);
    const dLTCG = rows.filter((r) => r.gainType === "DEBT_LTCG").reduce((s, r) => s + r.profit, 0);
    const totalGain = rows.reduce((s, r) => s + r.profit, 0);
    const estTax = rows.reduce((s, r) => s + r.estimatedTax, 0);

    return {
      key: q.key,
      label: q.label,
      period: q.period,
      fromDate: q.from,
      toDate: q.to,
      equitySTCG: eqSTCG,
      equityLTCG: eqLTCG,
      debtSTCG: dSTCG,
      debtLTCG: dLTCG,
      totalGain,
      estimatedTax: estTax,
      txnCount: rows.length,
    };
  });
};

/* ══════════════════════════════════════════════════════════════════
   SHARED UI STYLES
   ══════════════════════════════════════════════════════════════════ */

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: `1.5px solid ${THEME.line}`,
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: THEME.muted,
  whiteSpace: "nowrap",
  background: "color-mix(in srgb, var(--surface-1) 70%, transparent)",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 12px",
  borderBottom: `1px solid ${THEME.line}`,
  fontSize: 12,
  verticalAlign: "middle",
};

/* ══════════════════════════════════════════════════════════════════
   CATEGORY FIX BADGE / MODAL
   ══════════════════════════════════════════════════════════════════ */

const CategoryFixBadge = ({
  sellId,
  name,
  onFix,
}: {
  sellId?: string;
  name?: string;
  onFix?: (id: string, category: string) => Promise<void> | void;
}) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!sellId || !onFix) {
    return (
      <span title="Equity/Debt category not confirmed — showing best-effort guess.">
        <AlertTriangle size={13} color={THEME.gold} />
      </span>
    );
  }

  const pick = async (category: string) => {
    setSaving(true);
    try {
      await onFix(sellId, category);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="button-ghost"
        title="Category unconfirmed — Click to fix"
        style={{
          background: `color-mix(in srgb, ${THEME.gold} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${THEME.gold} 30%, transparent)`,
          color: THEME.gold,
          padding: "2px 6px",
          borderRadius: 6,
          fontSize: 10,
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <AlertTriangle size={11} />
        <span>Fix</span>
      </button>

      {open && (
        <Modal
          title="Resolve Fund Tax Category"
          onClose={() => setOpen(false)}
          width={440}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13, color: THEME.muted, margin: 0, lineHeight: 1.5 }}>
              Choose whether <strong style={{ color: THEME.ink }}>{name}</strong> is an Equity or Debt mutual fund. This permanently updates your historical record and ensures correct tax calculation.
            </p>
            <div
              style={{
                padding: "12px",
                borderRadius: 8,
                background: "var(--surface-1)",
                border: `1px solid ${THEME.line}`,
                fontSize: 12,
                color: THEME.muted,
              }}
            >
              <div style={{ marginBottom: 4 }}>
                <strong style={{ color: THEME.ink }}>Equity:</strong> ≥65% domestic equities (STCG @ 15/20%, LTCG @ 10/12.5% above ₹1.25L).
              </div>
              <div>
                <strong style={{ color: THEME.ink }}>Debt:</strong> &lt;65% equity (Post-Apr 2023 units taxed at slab rate).
              </div>
            </div>
            <ModalActions>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => pick("Debt")}
              >
                Set as Debt
              </Button>
              <Button
                variant="primary"
                disabled={saving}
                onClick={() => pick("Equity")}
              >
                Set as Equity
              </Button>
            </ModalActions>
          </div>
        </Modal>
      )}
    </>
  );
};

/* ══════════════════════════════════════════════════════════════════
   MAIN CAPITAL GAINS TAB COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export const CapitalGainsTab = ({
  state,
  updateItem,
  showToast,
}: {
  state: any;
  updateItem?: (key: string, id: string, patch: any) => Promise<any>;
  showToast?: (msg: string, type?: string) => void;
}) => {
  const { privacyMode } = usePrivacy();

  /* ── State ─────────────────────────────────────────────────────── */
  const fyOptions = useMemo(
    () => buildFYOptions(state.stockSells || [], state.mfSells || []),
    [state.stockSells, state.mfSells]
  );
  const currentFYStartYear = getCurrentFYStartYear();
  const [fyStartYear, setFyStartYear] = useState<number>(currentFYStartYear);

  // Sub-navigation workspace views
  const [activeView, setActiveView] = useState<
    "overview" | "ledger" | "unrealized" | "harvesting" | "calculator" | "rules"
  >("overview");

  // Filter & Search states for Ledger
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerAssetFilter, setLedgerAssetFilter] = useState<"ALL" | "Stock" | "Mutual Fund">("ALL");
  const [ledgerGainFilter, setLedgerGainFilter] = useState<"ALL" | GainType>("ALL");
  const [ledgerOutcomeFilter, setLedgerOutcomeFilter] = useState<"ALL" | "PROFIT" | "LOSS">("ALL");
  const [ledgerSortBy, setLedgerSortBy] = useState<"date" | "profit" | "holding" | "tax">("date");
  const [ledgerSortOrder, setLedgerSortOrder] = useState<"asc" | "desc">("desc");

  // Filter & Search states for Unrealized
  const [unrealizedSearch, setUnrealizedSearch] = useState("");
  const [unrealizedClassFilter, setUnrealizedClassFilter] = useState<
    "ALL" | "EQUITY_STCG" | "EQUITY_LTCG" | "DEBT_STCG" | "SOON_LTCG"
  >("ALL");

  // Tax-Loss Harvesting Simulator selection
  const [selectedHarvestIds, setSelectedHarvestIds] = useState<Set<string>>(new Set());

  // What-If Simulator Inputs
  const [simAssetType, setSimAssetType] = useState<"Stock" | "Mutual Fund">("Stock");
  const [simFundCategory, setSimFundCategory] = useState<"Equity" | "Debt">("Equity");
  const [simBuyDate, setSimBuyDate] = useState<string>(`${currentFYStartYear - 1}-06-15`);
  const [simBuyPrice, setSimBuyPrice] = useState<number>(100000);
  const [simSellDate, setSimSellDate] = useState<string>(today());
  const [simSellPrice, setSimSellPrice] = useState<number>(135000);
  const [copiedPlan, setCopiedPlan] = useState(false);

  /* ── Category Index ────────────────────────────────────────────── */
  const mfCategoryIndex = useMemo(
    () => buildMFCategoryIndex(state.mutualFunds || []),
    [state.mutualFunds]
  );

  const handleFixMFCategory = async (id: string, category: string) => {
    if (!updateItem) return;
    try {
      await updateItem("mfSells", id, { category });
      showToast?.("Tax category updated successfully.", "success");
    } catch (e: any) {
      showToast?.(`Failed to update tax category: ${e?.message || "Unknown error"}`, "error");
    }
  };

  /* ── Classify Realized Transactions ────────────────────────────── */
  const classified = useMemo(
    () => classifySells(state.stockSells || [], state.mfSells || [], fyStartYear, mfCategoryIndex),
    [state.stockSells, state.mfSells, fyStartYear, mfCategoryIndex]
  );

  const {
    byType,
    totalTax,
    ltcgExemptionUsed,
    ltcgExemptionLimit,
    stcgRate,
    ltcgRate,
    taxablePools,
    setOffDetails,
  } = useMemo(() => computeGainTotals(classified, fyStartYear), [classified, fyStartYear]);

  // Current FY totals specifically for harvesting
  const isViewingCurrentFY = fyStartYear === currentFYStartYear;
  const currentFYClassified = useMemo(
    () =>
      isViewingCurrentFY
        ? classified
        : classifySells(state.stockSells || [], state.mfSells || [], currentFYStartYear, mfCategoryIndex),
    [isViewingCurrentFY, classified, state.stockSells, state.mfSells, currentFYStartYear, mfCategoryIndex]
  );
  const currentFYTotals = useMemo(
    () =>
      isViewingCurrentFY
        ? { byType, ltcgExemptionLimit, stcgRate, ltcgRate }
        : computeGainTotals(currentFYClassified, currentFYStartYear),
    [isViewingCurrentFY, byType, ltcgExemptionLimit, stcgRate, ltcgRate, currentFYClassified, currentFYStartYear]
  );

  /* ── Schedule CG Section F Quarters ────────────────────────────── */
  const scheduleCGQuarters = useMemo(
    () => computeScheduleCGQuarters(classified, fyStartYear),
    [classified, fyStartYear]
  );

  /* ── Unrealized Holdings Analysis ──────────────────────────────── */
  const unrealized = useMemo(() => {
    const result: UnrealizedHolding[] = [];
    const todayStr = today();
    const todayDate = parseLocalDate(todayStr);

    const stocks = state.stocks || [];
    for (const s of stocks) {
      if (!s.buyDate) continue;
      const qty = Number(s.qty) || 0;
      if (qty <= 0) continue;
      const buyPricePerUnit = Number(s.buyPrice || s.avgPrice) || 0;
      const currentPricePerUnit = Number(s.currentPrice || s.ltp || s.price) || 0;
      const buyTotal = buyPricePerUnit * qty;
      const currentTotal = currentPricePerUnit * qty;
      const months = getHoldingMonths(s.buyDate, todayStr);
      const unrealizedPL = currentTotal - buyTotal;
      const unrealizedPLPct = buyTotal > 0 ? (unrealizedPL / buyTotal) * 100 : 0;
      const isLTCG = isLongTerm(s.buyDate, todayStr, 12);

      // Days to LTCG calculation
      const buyD = parseLocalDate(s.buyDate);
      const anniversary = new Date(buyD.getFullYear() + 1, buyD.getMonth(), buyD.getDate());
      const diffMs = anniversary.getTime() - todayDate.getTime();
      const daysToLTCG = isLTCG ? 0 : Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      result.push({
        id: s.id || `stock-${s.symbol}-${s.buyDate}`,
        name: s.symbol || s.name || "Unknown Stock",
        symbol: s.symbol,
        buyDate: s.buyDate,
        buyPrice: buyTotal,
        currentPrice: currentTotal,
        qty,
        holdingMonths: months,
        unrealizedPL,
        unrealizedPLPct,
        wouldBeType: isLTCG ? "EQUITY_LTCG" : "EQUITY_STCG",
        assetType: "Stock",
        owner: s.owner || "self",
        monthsToLTCG: isLTCG ? null : 12 - months,
        daysToLTCG: isLTCG ? null : daysToLTCG,
      });
    }

    const mfs = state.mutualFunds || [];
    for (const m of mfs) {
      const bd = m.buyDate || m.purchaseDate;
      if (!bd) continue;
      const units = Number(m.units || m.qty) || 0;
      if (units <= 0) continue;
      const buyNav = Number(m.buyNav || m.avgNav || m.purchaseNav) || 0;
      const currentNav = Number(m.currentNav || m.nav || m.ltp) || 0;
      const buyTotal = buyNav * units;
      const currentTotal = currentNav * units;
      const months = getHoldingMonths(bd, todayStr);
      const unrealizedPL = currentTotal - buyTotal;
      const unrealizedPLPct = buyTotal > 0 ? (unrealizedPL / buyTotal) * 100 : 0;
      const equity = isEquityMF(m);
      const ltcgThreshold = equity ? 12 : 36;

      let wouldBeType: GainType;
      let monthsToLTCG: number | null | "never";
      let daysToLTCG: number | null = null;

      if (equity) {
        const isLTCG = isLongTerm(bd, todayStr, ltcgThreshold);
        wouldBeType = isLTCG ? "EQUITY_LTCG" : "EQUITY_STCG";
        monthsToLTCG = isLTCG ? null : ltcgThreshold - months;
        const buyD = parseLocalDate(bd);
        const anniversary = new Date(buyD.getFullYear() + 1, buyD.getMonth(), buyD.getDate());
        const diffMs = anniversary.getTime() - todayDate.getTime();
        daysToLTCG = isLTCG ? 0 : Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      } else {
        const postApr2023 = parseLocalDate(bd) >= parseLocalDate(DEBT_INDEXATION_CUTOFF_DATE);
        if (postApr2023) {
          wouldBeType = "DEBT_STCG";
          monthsToLTCG = "never";
          daysToLTCG = null;
        } else {
          const isLTCG = isLongTerm(bd, todayStr, ltcgThreshold);
          wouldBeType = isLTCG ? "DEBT_LTCG" : "DEBT_STCG";
          monthsToLTCG = isLTCG ? null : ltcgThreshold - months;
          const buyD = parseLocalDate(bd);
          const anniversary = new Date(buyD.getFullYear() + 3, buyD.getMonth(), buyD.getDate());
          const diffMs = anniversary.getTime() - todayDate.getTime();
          daysToLTCG = isLTCG ? 0 : Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }
      }

      result.push({
        id: m.id || `mf-${m.name || m.scheme}-${bd}`,
        name: m.name || m.scheme || "Unknown MF",
        buyDate: bd,
        buyPrice: buyTotal,
        currentPrice: currentTotal,
        qty: units,
        holdingMonths: months,
        unrealizedPL,
        unrealizedPLPct,
        wouldBeType,
        assetType: "Mutual Fund",
        owner: m.owner || "self",
        monthsToLTCG,
        daysToLTCG,
      });
    }

    return result;
  }, [state.stocks, state.mutualFunds]);

  /* ── Tax-Loss Harvesting Suggestions & Simulator ────────────────── */
  const lossCandidates = useMemo(
    () => unrealized.filter((h) => h.unrealizedPL < 0),
    [unrealized]
  );

  // Initialize selected IDs with all loss positions on first load
  React.useEffect(() => {
    if (lossCandidates.length > 0 && selectedHarvestIds.size === 0) {
      setSelectedHarvestIds(new Set(lossCandidates.map((c) => c.id || c.name)));
    }
  }, [lossCandidates]);

  const harvestingCalculations = useMemo(() => {
    let remainingSTCG = Math.max(0, currentFYTotals.byType.totals.EQUITY_STCG);
    let remainingLTCG = Math.max(
      0,
      currentFYTotals.byType.totals.EQUITY_LTCG - currentFYTotals.ltcgExemptionLimit
    );

    const sorted = [...lossCandidates].sort(
      (a, b) => Math.abs(b.unrealizedPL) - Math.abs(a.unrealizedPL)
    );

    const activeList = sorted.map((h) => {
      const isSelected = selectedHarvestIds.has(h.id || h.name);
      const absLoss = Math.abs(h.unrealizedPL);
      const isSTCG = h.wouldBeType === "EQUITY_STCG" || h.wouldBeType === "DEBT_STCG";
      const rate = isSTCG ? currentFYTotals.stcgRate : currentFYTotals.ltcgRate;

      let usableLoss = 0;
      if (isSelected) {
        if (isSTCG) {
          const fromSTCG = Math.min(absLoss, remainingSTCG);
          remainingSTCG -= fromSTCG;
          const fromLTCG = Math.min(absLoss - fromSTCG, remainingLTCG);
          remainingLTCG -= fromLTCG;
          usableLoss = fromSTCG + fromLTCG;
        } else {
          usableLoss = Math.min(absLoss, remainingLTCG);
          remainingLTCG -= usableLoss;
        }
      }

      const potentialSaving = Math.round(usableLoss * rate);

      return {
        ...h,
        isSelected,
        usableLoss,
        potentialSaving,
        rate,
      };
    });

    const totalPotentialSavings = activeList.reduce((s, h) => s + h.potentialSaving, 0);
    const totalHarvestedLoss = activeList
      .filter((h) => h.isSelected)
      .reduce((s, h) => s + Math.abs(h.unrealizedPL), 0);
    const totalUsableLoss = activeList.reduce((s, h) => s + h.usableLoss, 0);

    return {
      activeList,
      totalPotentialSavings,
      totalHarvestedLoss,
      totalUsableLoss,
      currentRealizedTax: currentFYTotals.totalTax || 0,
      projectedTaxAfterHarvest: Math.max(
        0,
        (currentFYTotals.totalTax || 0) - totalPotentialSavings
      ),
    };
  }, [lossCandidates, selectedHarvestIds, currentFYTotals]);

  /* ── Filtered & Sorted Ledger ──────────────────────────────────── */
  const filteredLedger = useMemo(() => {
    let list = [...classified];

    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.symbol && r.symbol.toLowerCase().includes(q))
      );
    }

    if (ledgerAssetFilter !== "ALL") {
      list = list.filter((r) => r.assetType === ledgerAssetFilter);
    }

    if (ledgerGainFilter !== "ALL") {
      list = list.filter((r) => r.gainType === ledgerGainFilter);
    }

    if (ledgerOutcomeFilter === "PROFIT") {
      list = list.filter((r) => r.profit >= 0);
    } else if (ledgerOutcomeFilter === "LOSS") {
      list = list.filter((r) => r.profit < 0);
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (ledgerSortBy === "date") {
        cmp = parseLocalDate(a.sellDate).getTime() - parseLocalDate(b.sellDate).getTime();
      } else if (ledgerSortBy === "profit") {
        cmp = a.profit - b.profit;
      } else if (ledgerSortBy === "holding") {
        cmp = a.holdingMonths - b.holdingMonths;
      } else if (ledgerSortBy === "tax") {
        cmp = a.estimatedTax - b.estimatedTax;
      }
      return ledgerSortOrder === "asc" ? cmp : -cmp;
    });

    return list;
  }, [
    classified,
    ledgerSearch,
    ledgerAssetFilter,
    ledgerGainFilter,
    ledgerOutcomeFilter,
    ledgerSortBy,
    ledgerSortOrder,
  ]);

  /* ── Filtered Unrealized Holdings ──────────────────────────────── */
  const filteredUnrealized = useMemo(() => {
    let list = [...unrealized];

    if (unrealizedSearch.trim()) {
      const q = unrealizedSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.symbol && r.symbol.toLowerCase().includes(q))
      );
    }

    if (unrealizedClassFilter === "SOON_LTCG") {
      list = list.filter(
        (r) =>
          r.daysToLTCG !== null &&
          r.daysToLTCG !== undefined &&
          r.daysToLTCG > 0 &&
          r.daysToLTCG <= 60
      );
    } else if (unrealizedClassFilter !== "ALL") {
      list = list.filter((r) => r.wouldBeType === unrealizedClassFilter);
    }

    return list;
  }, [unrealized, unrealizedSearch, unrealizedClassFilter]);

  /* ── What-If Simulator Output ──────────────────────────────────── */
  const whatIfCalculation = useMemo(() => {
    const buyD = parseLocalDate(simBuyDate);
    const months = getHoldingMonths(simBuyDate, simSellDate);
    const profit = simSellPrice - simBuyPrice;
    const profitPct = simBuyPrice > 0 ? (profit / simBuyPrice) * 100 : 0;

    let isLTCG = false;
    let gainType: GainType;
    let taxRate = 0;
    let taxAmount = 0;

    if (simAssetType === "Stock" || simFundCategory === "Equity") {
      isLTCG = isLongTerm(simBuyDate, simSellDate, 12);
      gainType = isLTCG ? "EQUITY_LTCG" : "EQUITY_STCG";
      taxRate = isLTCG ? getEquityLTCGRate(simSellDate) : getEquitySTCGRate(simSellDate);

      if (isLTCG) {
        const simFY = dateToFYStart(simSellDate);
        const exemptionLimit = getEquityLTCGExemption(simFY);
        const exemptionRemaining =
          simFY === fyStartYear
            ? Math.max(0, ltcgExemptionLimit - ltcgExemptionUsed)
            : exemptionLimit;
        const taxableGain = Math.max(0, profit - exemptionRemaining);
        taxAmount = profit > 0 ? Math.round(taxableGain * taxRate) : 0;
      } else {
        taxAmount = profit > 0 ? Math.round(profit * taxRate) : 0;
      }
    } else {
      // Debt Fund
      const postApr2023 = buyD >= parseLocalDate(DEBT_INDEXATION_CUTOFF_DATE);
      if (postApr2023) {
        gainType = "DEBT_STCG";
        taxRate = DEBT_STCG_SLAB_RATE;
        taxAmount = profit > 0 ? Math.round(profit * taxRate) : 0;
      } else {
        isLTCG = isLongTerm(simBuyDate, simSellDate, 36);
        gainType = isLTCG ? "DEBT_LTCG" : "DEBT_STCG";
        taxRate = isLTCG ? DEBT_LTCG_RATE : DEBT_STCG_SLAB_RATE;
        taxAmount = profit > 0 ? Math.round(profit * taxRate) : 0;
      }
    }

    const netInHand = simSellPrice - taxAmount;

    return {
      months,
      profit,
      profitPct,
      isLTCG,
      gainType,
      taxRate,
      taxAmount,
      netInHand,
    };
  }, [
    simBuyDate,
    simSellDate,
    simBuyPrice,
    simSellPrice,
    simAssetType,
    simFundCategory,
    fyStartYear,
    ltcgExemptionLimit,
    ltcgExemptionUsed,
  ]);

  /* ── Export Handlers ───────────────────────────────────────────── */
  const handleExportDetailedLedger = () => {
    if (!classified.length) return;
    const allRows = classified.map((r) => ({
      assetName: r.name,
      assetType: r.assetType,
      gainCategory: r.gainType.replace("_", " "),
      buyDate: r.buyDate,
      buyValue: Math.round(r.buyPrice),
      sellDate: r.sellDate,
      sellValue: Math.round(r.sellPrice),
      qty: r.qty,
      holdingMonths: r.holdingMonths,
      profitLoss: Math.round(r.profit),
      taxRate: `${(r.taxRate * 100).toFixed(1)}%`,
      estimatedTax: r.estimatedTax,
    }));

    exportArrayToCSV(
      allRows,
      [
        { key: "assetName", label: "Asset Name" },
        { key: "assetType", label: "Asset Type" },
        { key: "gainCategory", label: "Gain Category" },
        { key: "buyDate", label: "Buy Date" },
        { key: "buyValue", label: "Buy Value" },
        { key: "sellDate", label: "Sell Date" },
        { key: "sellValue", label: "Sell Value" },
        { key: "qty", label: "Qty" },
        { key: "holdingMonths", label: "Holding (Months)" },
        { key: "profitLoss", label: "Profit/Loss" },
        { key: "taxRate", label: "Tax Rate" },
        { key: "estimatedTax", label: "Estimated Tax" },
      ],
      `Capital_Gains_Detailed_FY${fyStartYear}-${String(fyStartYear + 1).slice(2)}.csv`
    );
  };

  const handleExportScheduleCGSummary = () => {
    if (!scheduleCGQuarters.length) return;
    const rows = scheduleCGQuarters.map((q) => ({
      quarter: q.label,
      period: q.period,
      equitySTCG: Math.round(q.equitySTCG),
      equityLTCG: Math.round(q.equityLTCG),
      debtSTCG: Math.round(q.debtSTCG),
      debtLTCG: Math.round(q.debtLTCG),
      totalGain: Math.round(q.totalGain),
      estimatedTax: Math.round(q.estimatedTax),
      txns: q.txnCount,
    }));

    exportArrayToCSV(
      rows,
      [
        { key: "quarter", label: "ITR Quarter" },
        { key: "period", label: "Period" },
        { key: "equitySTCG", label: "Equity STCG (₹)" },
        { key: "equityLTCG", label: "Equity LTCG (₹)" },
        { key: "debtSTCG", label: "Debt STCG (₹)" },
        { key: "debtLTCG", label: "Debt LTCG (₹)" },
        { key: "totalGain", label: "Net Gain (₹)" },
        { key: "estimatedTax", label: "Est. Tax (₹)" },
        { key: "txns", label: "Txn Count" },
      ],
      `Schedule_CG_Quarterly_FY${fyStartYear}-${String(fyStartYear + 1).slice(2)}.csv`
    );
  };

  const handleCopyHarvestPlan = () => {
    const selectedRows = harvestingCalculations.activeList.filter((h) => h.isSelected);
    if (!selectedRows.length) return;

    let text = `TAX-LOSS HARVESTING PLAN — ${today()}\n`;
    text += `Target Savings: ₹${harvestingCalculations.totalPotentialSavings.toLocaleString("en-IN")}\n`;
    text += `Total Loss Harvested: ₹${harvestingCalculations.totalHarvestedLoss.toLocaleString("en-IN")}\n\n`;
    text += `POSITIONS TO SELL:\n`;
    selectedRows.forEach((r, idx) => {
      text += `${idx + 1}. ${r.name} (${r.assetType}) | Unrealized Loss: ₹${Math.abs(Math.round(r.unrealizedPL)).toLocaleString("en-IN")} | Tax Saving: ₹${r.potentialSaving.toLocaleString("en-IN")}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2500);
    showToast?.("Harvesting plan copied to clipboard!", "success");
  };

  /* ── Derived Metrics & Visual Charts Data ──────────────────────── */
  const hasSells = classified.length > 0;
  const hasHoldings = unrealized.length > 0;
  const fyLabel = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;
  const currentFYLabel = `FY ${currentFYStartYear}-${String(currentFYStartYear + 1).slice(2)}`;
  const totalRealizedPL = classified.reduce((s, r) => s + r.profit, 0);
  const totalTurnover = classified.reduce((s, r) => s + r.sellPrice, 0);

  // Animated numbers for Hero KPIs
  const animRealizedPL = useAnimatedNumber(totalRealizedPL);
  const animTotalTax = useAnimatedNumber(totalTax);
  const animHarvestSavings = useAnimatedNumber(harvestingCalculations.totalPotentialSavings);
  const animExemptionUsed = useAnimatedNumber(ltcgExemptionUsed);

  // Chart Data: Quarterly Accrual Bar Chart
  const quarterlyChartData = scheduleCGQuarters.map((q) => ({
    name: q.key,
    label: q.label,
    "Equity STCG": Math.round(q.equitySTCG),
    "Equity LTCG": Math.round(q.equityLTCG),
    Debt: Math.round(q.debtSTCG + q.debtLTCG),
    Total: Math.round(q.totalGain),
    Tax: Math.round(q.estimatedTax),
  }));

  /* ══════════════════════════════════════════════════════════════════
     EMPTY STATE
     ══════════════════════════════════════════════════════════════════ */
  if (!hasSells && !hasHoldings) {
    return (
      <div style={{ padding: "0 0 40px" }}>
        <SectionTitle sub="Capital gains workstation for Schedule CG ITR filing, tax optimization & harvesting">
          Capital Gains & Tax Studio
        </SectionTitle>
        <Card style={{ padding: "48px 32px", textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: THEME.muted,
            }}
          >
            <Layers size={40} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
            No Capital Gains Records Found
          </div>
          <div
            style={{
              fontSize: 13,
              color: THEME.muted,
              maxWidth: 440,
              margin: "0 auto 20px",
              lineHeight: 1.6,
            }}
          >
            Add stock or mutual fund trade transactions in the Demat or Investments workspace.
            Realized sales and live holdings will automatically generate Schedule CG reports, tax
            estimates, and harvesting insights.
          </div>
        </Card>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     RENDER WORKSTATION
     ══════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: "0 0 40px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Header & Action Bar ───────────────────────────────────── */}
      <SectionTitle
        sub={`${fyLabel} · Schedule CG ITR studio with Budget 2024 compliance, quarterly advance-tax accrual & loss harvesting`}
        rightElement={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>FY:</span>
              <select
                className="form-input"
                value={fyStartYear}
                onChange={(e) => setFyStartYear(Number(e.target.value))}
                aria-label="Select financial year"
                style={{
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  minWidth: 125,
                  borderRadius: 8,
                }}
              >
                {fyOptions.map((fy) => (
                  <option key={fy.startYear} value={fy.startYear}>
                    {fy.label} {fy.startYear === currentFYStartYear ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {hasSells && (
              <div style={{ display: "flex", gap: 6 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Download size={13} />}
                  onClick={handleExportDetailedLedger}
                  title="Export complete transaction ledger to CSV"
                >
                  Export Ledger
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<FileText size={13} />}
                  onClick={handleExportScheduleCGSummary}
                  title="Export ITR Schedule CG Quarterly Summary"
                >
                  ITR Schedule CG
                </Button>
              </div>
            )}
          </div>
        }
      >
        Capital Gains & Schedule CG Studio
      </SectionTitle>

      {/* ── Sub-Navigation Tabs ───────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: 4,
          background: "var(--surface-1)",
          borderRadius: 12,
          border: `1px solid ${THEME.line}`,
          overflowX: "auto",
          alignItems: "center",
        }}
      >
        {[
          { id: "overview", label: "Overview & Analytics", icon: BarChart3 },
          {
            id: "ledger",
            label: "Schedule CG Ledger",
            icon: FileText,
            count: classified.length,
          },
          {
            id: "unrealized",
            label: "Holdings & LTCG Radar",
            icon: Clock,
            count: unrealized.length,
          },
          {
            id: "harvesting",
            label: "Loss Harvesting Studio",
            icon: Scissors,
            badge:
              harvestingCalculations.totalPotentialSavings > 0
                ? `Save ₹${Math.round(harvestingCalculations.totalPotentialSavings / 1000)}k`
                : undefined,
          },
          { id: "calculator", label: "What-If Simulator", icon: Calculator },
          { id: "rules", label: "Tax Rules & Guide", icon: BookOpen },
        ].map((tab) => {
          const active = activeView === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: active ? 700 : 600,
                color: active ? "var(--surface-0)" : THEME.muted,
                background: active ? THEME.accent : "transparent",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 700,
                    background: active ? "rgba(255,255,255,0.25)" : "var(--surface-2)",
                    color: active ? "#ffffff" : THEME.ink,
                  }}
                >
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 800,
                    background: active ? "#ffffff" : THEME.gold,
                    color: active ? THEME.gold : "#ffffff",
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Budget 2024 Statutory Banner ──────────────────────────── */}
      <div
        style={{
          padding: "12px 16px",
          borderRadius: 12,
          background: `color-mix(in srgb, ${THEME.accent} 5%, transparent)`,
          border: `1px solid color-mix(in srgb, ${THEME.accent} 18%, transparent)`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 12,
          color: THEME.muted,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1, minWidth: 280 }}>
          <Shield size={18} color={THEME.accent} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, color: THEME.ink, marginBottom: 2 }}>
              Budget 2024 Tax Regime Active ({fyLabel})
            </div>
            <div>
              Equity STCG @ <strong style={{ color: THEME.ink }}>{stcgRate * 100}%</strong> · Equity
              LTCG @ <strong style={{ color: THEME.ink }}>{ltcgRate * 100}%</strong> with{" "}
              <strong style={{ color: THEME.sage }}>
                <Money value={ltcgExemptionLimit} variant="full" />
              </strong>{" "}
              tax-free limit (Sec 112A) · Post-Apr 2023 Debt Funds at slab rate.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              fontSize: 11,
              fontWeight: 600,
              color: THEME.ink,
            }}
          >
            STCG Threshold: &lt; 12 Mo
          </span>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              fontSize: 11,
              fontWeight: 600,
              color: THEME.ink,
            }}
          >
            LTCG Threshold: &gt; 12 Mo
          </span>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
         VIEW 1: OVERVIEW & ANALYTICS
         ═════════════════════════════════════════════════════════════ */}
      {activeView === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Executive KPI Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            <StatCard
              icon={<TrendingUp />}
              label="Total Realized P&L"
              value={fmtINRFull(animRealizedPL)}
              numericValue={totalRealizedPL}
              formatValue={fmtINRFull}
              sub={`${classified.length} closed trades · Turnover: ${fmtINRFull(totalTurnover)}`}
              subColor={totalRealizedPL >= 0 ? THEME.sage : THEME.rust}
              color={totalRealizedPL >= 0 ? THEME.sage : THEME.rust}
            />
            <StatCard
              icon={<IndianRupee />}
              label="Net Tax Liability"
              value={fmtINRFull(animTotalTax)}
              numericValue={totalTax}
              formatValue={fmtINRFull}
              sub="Across all asset classes u/s 111A & 112A"
              color={THEME.rust}
            />
            <StatCard
              icon={<Shield />}
              label="Sec 112A LTCG Exemption"
              value={fmtINRFull(animExemptionUsed)}
              numericValue={ltcgExemptionUsed}
              formatValue={fmtINRFull}
              sub={
                privacyMode
                  ? "of •••• exemption ceiling"
                  : `of ${fmtINRFull(ltcgExemptionLimit)} max tax-free cap`
              }
              subColor={ltcgExemptionUsed >= ltcgExemptionLimit ? THEME.sage : undefined}
              color={THEME.sage}
            />
            <StatCard
              icon={<Scissors />}
              label="Tax Harvesting Savings"
              value={fmtINRFull(animHarvestSavings)}
              numericValue={harvestingCalculations.totalPotentialSavings}
              formatValue={fmtINRFull}
              sub={`${lossCandidates.length} unrealized loss holdings available`}
              color={THEME.gold}
            />
          </div>

          {/* Gain Classification Breakdown 4-Card Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {[
              {
                label: "Equity STCG (u/s 111A)",
                key: "EQUITY_STCG" as GainType,
                rate: `${stcgRate * 100}%`,
                color: THEME.gold,
                taxable: taxablePools.equitySTCG,
                icon: <TrendingUp size={16} />,
              },
              {
                label: "Equity LTCG (u/s 112A)",
                key: "EQUITY_LTCG" as GainType,
                rate: `${ltcgRate * 100}%`,
                color: THEME.sage,
                taxable: taxablePools.equityLTCG,
                icon: <TrendingUp size={16} />,
              },
              {
                label: "Debt STCG (Slab Rate)",
                key: "DEBT_STCG" as GainType,
                rate: "Slab ~30%",
                color: THEME.rust,
                taxable: taxablePools.debtSTCG,
                icon: <BarChart3 size={16} />,
              },
              {
                label: "Debt LTCG (Grandfathered)",
                key: "DEBT_LTCG" as GainType,
                rate: "20% + idx",
                color: THEME.accent,
                taxable: taxablePools.debtLTCG,
                icon: <BarChart3 size={16} />,
              },
            ].map((g) => {
              const val = byType.totals[g.key];
              const count = byType.groups[g.key].length;
              return (
                <Card key={g.key} style={{ padding: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>
                      {g.label}
                    </span>
                    <Badge variant={val >= 0 ? "sage" : "rust"}>{count} txns</Badge>
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: val >= 0 ? THEME.sage : THEME.rust,
                      fontFamily: "var(--font-display)",
                      letterSpacing: "-0.01em",
                      marginBottom: 6,
                    }}
                  >
                    <Money value={val} variant="full" />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: THEME.muted,
                      borderTop: `1px dashed ${THEME.line}`,
                      paddingTop: 6,
                    }}
                  >
                    <span>Rate: {g.rate}</span>
                    <span>
                      Taxable: <Money value={g.taxable} variant="full" />
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Visual Recharts Analytics & LTCG Gauge */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            {/* LTCG Exemption Tracker Card */}
            <Card style={{ padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Shield size={20} color={THEME.sage} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                      Section 112A Tax-Free Exemption Tracker
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>
                      {fyLabel} · Annual Equity Long-Term Exemption
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 18,
                      fontWeight: 800,
                      color: THEME.sage,
                    }}
                  >
                    <Money value={ltcgExemptionUsed} variant="full" />
                  </span>
                  <span style={{ fontSize: 12, color: THEME.muted, marginLeft: 4 }}>
                    / <Money value={ltcgExemptionLimit} variant="full" />
                  </span>
                </div>
              </div>

              <div className="progress-track" style={{ height: 10, borderRadius: 5, marginBottom: 10 }}>
                <div
                  className="progress-fill progress-fill-sage"
                  style={{
                    width: `${Math.min(100, (ltcgExemptionUsed / ltcgExemptionLimit) * 100)}%`,
                    borderRadius: 5,
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: THEME.muted,
                  padding: "8px 12px",
                  background: "var(--surface-1)",
                  borderRadius: 8,
                }}
              >
                <span>
                  {ltcgExemptionUsed >= ltcgExemptionLimit ? (
                    <strong style={{ color: THEME.gold }}>Exemption ceiling fully exhausted</strong>
                  ) : (
                    <>
                      <strong style={{ color: THEME.sage }}>
                        <Money value={ltcgExemptionLimit - ltcgExemptionUsed} variant="full" />
                      </strong>{" "}
                      tax-free headroom remaining
                    </>
                  )}
                </span>
                <span>{((ltcgExemptionUsed / ltcgExemptionLimit) * 100).toFixed(0)}% Used</span>
              </div>
            </Card>

            {/* Quarterly Accrual Bar Chart */}
            <Card style={{ padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Calendar size={18} color={THEME.accent} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                    Quarterly Realized P&L Distribution
                  </span>
                </div>
                <Badge variant="muted">Schedule CG Sec F</Badge>
              </div>

              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quarterlyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--t-muted)" }}
                      axisLine={{ stroke: "var(--t-line)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--t-muted)" }}
                      axisLine={{ stroke: "var(--t-line)" }}
                      tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [fmtINRFull(val), ""]}
                      contentStyle={{
                        background: "var(--surface-0)",
                        border: `1px solid ${THEME.line}`,
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                    />
                    <Bar dataKey="Equity STCG" fill={THEME.gold} stackId="a" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Equity LTCG" fill={THEME.sage} stackId="a" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Debt" fill={THEME.accent} stackId="a" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Section 70 Loss Set-Off & Carry-Forward Waterfall Card */}
          <Card style={{ padding: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Layers size={20} color={THEME.accent} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                    Section 70 Inter-Source Loss Set-Off Flow
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>
                    Statutory rules: STCL absorbs STCG & LTCG · LTCL absorbs only LTCG
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 4 }}>
                  1. Realized STCL Absorbed
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: setOffDetails.stclAvailable > 0 ? THEME.rust : THEME.ink,
                  }}
                >
                  <Money value={setOffDetails.stclAvailable} variant="full" />
                </div>
                <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>
                  Set off against STCG first, then LTCG
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 4 }}>
                  2. STCL Used Against LTCG
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                  <Money value={setOffDetails.stclOffsetAgainstLTCG} variant="full" />
                </div>
                <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>
                  Permitted cross-category offset
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 4 }}>
                  3. Sec 112A Exemption Offset
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: THEME.sage }}>
                  <Money value={ltcgExemptionUsed} variant="full" />
                </div>
                <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>
                  Direct reduction of taxable LTCG
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${THEME.gold} 5%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 4 }}>
                  4. Unabsorbed Loss Carry-Forward
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: setOffDetails.totalCarryForward > 0 ? THEME.gold : THEME.muted,
                  }}
                >
                  <Money value={setOffDetails.totalCarryForward} variant="full" />
                </div>
                <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>
                  Eligible for 8 AYs carry forward
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
         VIEW 2: SCHEDULE CG & REALIZED LEDGER
         ═════════════════════════════════════════════════════════════ */}
      {activeView === "ledger" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* ITR Schedule CG Section F Quarterly Accordion */}
          <Card style={{ padding: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Calendar size={18} color={THEME.accent} />
                <span style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                  ITR-2 / ITR-3 Schedule CG (Section F) — Accrual / Receipt Breakdown
                </span>
              </div>
              <Badge variant="sage">For Advance Tax & Surcharge Computation</Badge>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 680, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: "left" }}>ITR Accrual Bucket</th>
                    <th style={{ ...thStyle, textAlign: "left" }}>Period</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Equity STCG</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Equity LTCG</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Debt STCG/LTCG</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Net Gain</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Est. Tax</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Trades</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleCGQuarters.map((q) => (
                    <tr key={q.key} className="table-row-hover">
                      <td style={{ ...tdStyle, fontWeight: 700, color: THEME.ink }}>{q.label}</td>
                      <td style={{ ...tdStyle, color: THEME.muted, fontSize: 11 }}>{q.period}</td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 600,
                          color: q.equitySTCG >= 0 ? THEME.sage : THEME.rust,
                        }}
                      >
                        <Money value={q.equitySTCG} variant="full" />
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 600,
                          color: q.equityLTCG >= 0 ? THEME.sage : THEME.rust,
                        }}
                      >
                        <Money value={q.equityLTCG} variant="full" />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>
                        <Money value={q.debtSTCG + q.debtLTCG} variant="full" />
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 700,
                          color: q.totalGain >= 0 ? THEME.sage : THEME.rust,
                        }}
                      >
                        <Money value={q.totalGain} variant="full" />
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 700,
                          color: THEME.rust,
                        }}
                      >
                        <Money value={q.estimatedTax} variant="full" />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <Badge variant="muted">{q.txnCount}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Ledger Filter & Search Toolbar */}
          <Card style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              {/* Search */}
              <div style={{ position: "relative", minWidth: 220, flex: 1 }}>
                <Search
                  size={14}
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
                  placeholder="Search stock symbol or fund name..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="form-input"
                  style={{ width: "100%", paddingLeft: 30, fontSize: 12 }}
                />
              </div>

              {/* Filters */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {/* Asset Filter */}
                <select
                  value={ledgerAssetFilter}
                  onChange={(e) => setLedgerAssetFilter(e.target.value as any)}
                  className="form-input"
                  style={{ fontSize: 12, padding: "6px 10px" }}
                >
                  <option value="ALL">All Asset Types</option>
                  <option value="Stock">Stocks Only</option>
                  <option value="Mutual Fund">Mutual Funds Only</option>
                </select>

                {/* Gain Type Filter */}
                <select
                  value={ledgerGainFilter}
                  onChange={(e) => setLedgerGainFilter(e.target.value as any)}
                  className="form-input"
                  style={{ fontSize: 12, padding: "6px 10px" }}
                >
                  <option value="ALL">All Gain Types</option>
                  <option value="EQUITY_STCG">Equity STCG</option>
                  <option value="EQUITY_LTCG">Equity LTCG</option>
                  <option value="DEBT_STCG">Debt STCG</option>
                  <option value="DEBT_LTCG">Debt LTCG</option>
                </select>

                {/* Outcome Filter */}
                <select
                  value={ledgerOutcomeFilter}
                  onChange={(e) => setLedgerOutcomeFilter(e.target.value as any)}
                  className="form-input"
                  style={{ fontSize: 12, padding: "6px 10px" }}
                >
                  <option value="ALL">All Outcomes</option>
                  <option value="PROFIT">Profits Only</option>
                  <option value="LOSS">Losses Only</option>
                </select>

                {/* Sort Order */}
                <select
                  value={`${ledgerSortBy}-${ledgerSortOrder}`}
                  onChange={(e) => {
                    const [by, ord] = e.target.value.split("-") as any;
                    setLedgerSortBy(by);
                    setLedgerSortOrder(ord);
                  }}
                  className="form-input"
                  style={{ fontSize: 12, padding: "6px 10px" }}
                >
                  <option value="date-desc">Sell Date (Newest First)</option>
                  <option value="date-asc">Sell Date (Oldest First)</option>
                  <option value="profit-desc">Highest Profit</option>
                  <option value="profit-asc">Highest Loss</option>
                  <option value="holding-desc">Longest Holding</option>
                  <option value="tax-desc">Highest Tax</option>
                </select>
              </div>
            </div>

            {/* Results Table */}
            {filteredLedger.length > 0 ? (
              <div
                style={{
                  overflowX: "auto",
                  borderRadius: 10,
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <table style={{ width: "100%", minWidth: 880, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, textAlign: "left" }}>Asset</th>
                      <th style={{ ...thStyle, textAlign: "left" }}>Type / Classification</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Buy Date</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Buy Price</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Sell Date</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Sell Price</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Qty</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Holding</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Realized P&L</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Tax Rate</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Est. Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedger.map((r, i) => (
                      <tr key={r.id || i} className="table-row-hover">
                        <td
                          style={{
                            ...tdStyle,
                            fontWeight: 600,
                            color: THEME.ink,
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <div>{r.name}</div>
                          {r.owner && r.owner !== "self" && (
                            <span style={{ fontSize: 10, color: THEME.muted }}>
                              Owner: {r.owner}
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Badge
                              variant={
                                r.gainType.includes("LTCG")
                                  ? "sage"
                                  : r.gainType.includes("DEBT")
                                    ? "rust"
                                    : "gold"
                              }
                            >
                              {r.gainType.replace("_", " ")}
                            </Badge>
                            {r.assetType === "Mutual Fund" && r.categoryGuessed && (
                              <CategoryFixBadge
                                sellId={r.id}
                                name={r.name}
                                onFix={handleFixMFCategory}
                              />
                            )}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: THEME.muted }}>
                          {fmtDate(r.buyDate)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>
                          <Money value={r.buyPrice} variant="full" />
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: THEME.muted }}>
                          {fmtDate(r.sellDate)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>
                          <Money value={r.sellPrice} variant="full" />
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>
                          {r.qty}
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            color: THEME.muted,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.holdingMonths} mo
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            fontWeight: 700,
                            color: r.profit >= 0 ? THEME.sage : THEME.rust,
                          }}
                        >
                          <div>
                            <Money value={r.profit} variant="full" />
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 500 }}>
                            {r.profitPct >= 0 ? "+" : ""}
                            {r.profitPct.toFixed(1)}%
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: THEME.muted }}>
                          {(r.taxRate * 100).toFixed(1)}%
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            fontWeight: 700,
                            color: r.estimatedTax > 0 ? THEME.rust : THEME.muted,
                          }}
                        >
                          <Money value={r.estimatedTax} variant="full" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Filter}
                title="No matching transactions"
                description="Try clearing your search query or adjusting your filters above."
              />
            )}
          </Card>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
         VIEW 3: UNREALIZED HOLDINGS & LTCG RADAR
         ═════════════════════════════════════════════════════════════ */}
      {activeView === "unrealized" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Radar Hero Banner */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: 12,
              background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Clock size={24} color={THEME.sage} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                  LTCG Milestone Radar & Holding Horizons
                </div>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  Track time remaining until your short-term investments cross into lower long-term
                  tax brackets
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Badge variant="sage">
                {unrealized.filter((u) => u.wouldBeType.includes("LTCG")).length} Already LTCG
              </Badge>
              <Badge variant="gold">
                {
                  unrealized.filter(
                    (u) => u.daysToLTCG !== null && u.daysToLTCG !== undefined && u.daysToLTCG <= 60
                  ).length
                }{" "}
                Crossing in &lt;60d
              </Badge>
            </div>
          </div>

          {/* Filter Bar */}
          <Card style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 14,
              }}
            >
              <div style={{ position: "relative", minWidth: 220, flex: 1 }}>
                <Search
                  size={14}
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
                  placeholder="Filter holdings..."
                  value={unrealizedSearch}
                  onChange={(e) => setUnrealizedSearch(e.target.value)}
                  className="form-input"
                  style={{ width: "100%", paddingLeft: 30, fontSize: 12 }}
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={unrealizedClassFilter}
                  onChange={(e) => setUnrealizedClassFilter(e.target.value as any)}
                  className="form-input"
                  style={{ fontSize: 12, padding: "6px 10px" }}
                >
                  <option value="ALL">All Holdings ({unrealized.length})</option>
                  <option value="SOON_LTCG">Becoming LTCG Soon (&lt;60 Days)</option>
                  <option value="EQUITY_LTCG">Equity LTCG (&gt;12 Months)</option>
                  <option value="EQUITY_STCG">Equity STCG (&lt;12 Months)</option>
                  <option value="DEBT_STCG">Debt (Slab Rate)</option>
                </select>
              </div>
            </div>

            {/* Holdings Table */}
            {filteredUnrealized.length > 0 ? (
              <div
                style={{
                  overflowX: "auto",
                  borderRadius: 10,
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <table style={{ width: "100%", minWidth: 840, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, textAlign: "left" }}>Asset</th>
                      <th style={{ ...thStyle, textAlign: "left" }}>Type</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Buy Date</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Invested</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Current Value</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Unrealized P&L</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Holding</th>
                      <th style={{ ...thStyle, textAlign: "left" }}>Target Status</th>
                      <th style={{ ...thStyle, textAlign: "left" }}>Countdown to LTCG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnrealized.map((h, i) => (
                      <tr key={h.id || i} className="table-row-hover">
                        <td
                          style={{
                            ...tdStyle,
                            fontWeight: 600,
                            color: THEME.ink,
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <div>{h.name}</div>
                          {h.owner && h.owner !== "self" && (
                            <span style={{ fontSize: 10, color: THEME.muted }}>
                              Owner: {h.owner}
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <Badge variant="muted">{h.assetType}</Badge>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: THEME.muted }}>
                          {fmtDate(h.buyDate)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>
                          <Money value={h.buyPrice} variant="full" />
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>
                          <Money value={h.currentPrice} variant="full" />
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            fontWeight: 700,
                            color: h.unrealizedPL >= 0 ? THEME.sage : THEME.rust,
                          }}
                        >
                          <div>
                            <Money value={h.unrealizedPL} variant="full" />
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 500 }}>
                            {h.unrealizedPLPct >= 0 ? "+" : ""}
                            {h.unrealizedPLPct.toFixed(1)}%
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: THEME.muted }}>
                          {h.holdingMonths} mo
                        </td>
                        <td style={tdStyle}>
                          <Badge variant={h.wouldBeType.includes("LTCG") ? "sage" : "gold"}>
                            {h.wouldBeType.replace("_", " ")}
                          </Badge>
                        </td>
                        <td style={{ ...tdStyle, color: THEME.muted, whiteSpace: "nowrap" }}>
                          {h.monthsToLTCG === "never" ? (
                            <Badge variant="muted">No LTCG (Slab)</Badge>
                          ) : h.daysToLTCG === 0 || h.monthsToLTCG === null ? (
                            <Badge variant="sage">Eligible for LTCG</Badge>
                          ) : h.daysToLTCG && h.daysToLTCG <= 60 ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <Sparkles size={13} color={THEME.gold} />
                              <strong style={{ color: THEME.gold }}>{h.daysToLTCG} days</strong>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <Clock size={12} />
                              <span>{h.monthsToLTCG} mo</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                title="No holdings found"
                description="No holdings match the current filter criteria."
              />
            )}
          </Card>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
         VIEW 4: TAX-LOSS HARVESTING STUDIO
         ═════════════════════════════════════════════════════════════ */}
      {activeView === "harvesting" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Harvesting Studio Overview */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: 12,
              background: `color-mix(in srgb, ${THEME.gold} 6%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <Scissors size={24} color={THEME.gold} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                  Tax-Loss Harvesting Studio & Offset Planner
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, maxWidth: 580 }}>
                  Realize losses on underperforming holdings to legally wipe out capital gains tax
                  in {currentFYLabel}. You can immediately reinvest proceeds into similar index funds
                  or alternative securities to keep your portfolio allocation intact.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Button
                variant="secondary"
                size="sm"
                icon={copiedPlan ? <Check size={14} /> : <Copy size={14} />}
                onClick={handleCopyHarvestPlan}
              >
                {copiedPlan ? "Copied!" : "Copy Harvest Plan"}
              </Button>
            </div>
          </div>

          {/* Interactive Impact Simulator Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            <Card style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 4 }}>
                Realized Gains to Offset ({currentFYLabel})
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink }}>
                <Money
                  value={
                    Math.max(0, currentFYTotals.byType.totals.EQUITY_STCG) +
                    Math.max(
                      0,
                      currentFYTotals.byType.totals.EQUITY_LTCG -
                        currentFYTotals.ltcgExemptionLimit
                    )
                  }
                  variant="full"
                />
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>
                Taxable STCG + LTCG above ₹1.25L
              </div>
            </Card>

            <Card style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 4 }}>
                Selected Losses to Harvest
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: THEME.rust }}>
                <Money value={harvestingCalculations.totalHarvestedLoss} variant="full" />
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>
                Usable: <Money value={harvestingCalculations.totalUsableLoss} variant="full" />
              </div>
            </Card>

            <Card
              style={{
                padding: 16,
                background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
                border: `1px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.sage, marginBottom: 4 }}>
                Immediate Tax Savings
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: THEME.sage }}>
                <Money value={harvestingCalculations.totalPotentialSavings} variant="full" />
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>
                Direct reduction in current FY tax
              </div>
            </Card>
          </div>

          {/* Harvesting Table with Checkboxes */}
          <Card style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                Select Positions to Harvest ({harvestingCalculations.activeList.length} opportunities)
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedHarvestIds(
                      new Set(harvestingCalculations.activeList.map((h) => h.id || h.name))
                    )
                  }
                  className="button-ghost"
                  style={{
                    background: "none",
                    border: "none",
                    color: THEME.accent,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Select All
                </button>
                <span style={{ color: THEME.line }}>|</span>
                <button
                  type="button"
                  onClick={() => setSelectedHarvestIds(new Set())}
                  className="button-ghost"
                  style={{
                    background: "none",
                    border: "none",
                    color: THEME.muted,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>

            {harvestingCalculations.activeList.length > 0 ? (
              <div
                style={{
                  overflowX: "auto",
                  borderRadius: 10,
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 40, textAlign: "center" }}>Harvest</th>
                      <th style={{ ...thStyle, textAlign: "left" }}>Asset</th>
                      <th style={{ ...thStyle, textAlign: "left" }}>Type</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Invested</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Current Value</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Unrealized Loss</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Usable Loss</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Tax Savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {harvestingCalculations.activeList.map((h) => {
                      const id = h.id || h.name;
                      return (
                        <tr
                          key={id}
                          className="table-row-hover"
                          onClick={() => {
                            const next = new Set(selectedHarvestIds);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            setSelectedHarvestIds(next);
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={h.isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                const next = new Set(selectedHarvestIds);
                                if (e.target.checked) next.add(id);
                                else next.delete(id);
                                setSelectedHarvestIds(next);
                              }}
                              style={{ cursor: "pointer", accentColor: THEME.accent }}
                            />
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              fontWeight: 600,
                              color: THEME.ink,
                              maxWidth: 180,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h.name}
                          </td>
                          <td style={tdStyle}>
                            <Badge variant="muted">{h.assetType}</Badge>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>
                            <Money value={h.buyPrice} variant="full" />
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>
                            <Money value={h.currentPrice} variant="full" />
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              textAlign: "right",
                              fontWeight: 700,
                              color: THEME.rust,
                            }}
                          >
                            <Money value={h.unrealizedPL} variant="full" />
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>
                            <Money value={h.usableLoss} variant="full" />
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              textAlign: "right",
                              fontWeight: 700,
                              color: h.potentialSaving > 0 ? THEME.sage : THEME.muted,
                            }}
                          >
                            <Money value={h.potentialSaving} variant="full" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Scissors}
                title="No unrealized losses found"
                description="All your current holdings are in profit. No tax loss harvesting opportunities currently exist."
              />
            )}
          </Card>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
         VIEW 5: CAPITAL GAINS WHAT-IF SIMULATOR
         ═════════════════════════════════════════════════════════════ */}
      {activeView === "calculator" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Calculator size={20} color={THEME.accent} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                    Capital Gains "What-If" Trade Simulator
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted }}>
                    Simulate selling any stock or mutual fund to test holding duration, tax bracket & net profit before trading
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              {/* Input Form */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, display: "block", marginBottom: 4 }}>
                      Asset Class
                    </label>
                    <select
                      value={simAssetType}
                      onChange={(e) => setSimAssetType(e.target.value as any)}
                      className="form-input"
                      style={{ width: "100%", fontSize: 12 }}
                    >
                      <option value="Stock">Direct Equity / Stock</option>
                      <option value="Mutual Fund">Mutual Fund</option>
                    </select>
                  </div>

                  {simAssetType === "Mutual Fund" && (
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, display: "block", marginBottom: 4 }}>
                        Fund Category
                      </label>
                      <select
                        value={simFundCategory}
                        onChange={(e) => setSimFundCategory(e.target.value as any)}
                        className="form-input"
                        style={{ width: "100%", fontSize: 12 }}
                      >
                        <option value="Equity">Equity Fund (≥65% Equity)</option>
                        <option value="Debt">Debt Fund (&lt;65% Equity)</option>
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, display: "block", marginBottom: 4 }}>
                      Buy Date
                    </label>
                    <input
                      type="date"
                      value={simBuyDate}
                      onChange={(e) => setSimBuyDate(e.target.value)}
                      className="form-input"
                      style={{ width: "100%", fontSize: 12 }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, display: "block", marginBottom: 4 }}>
                      Total Buy Cost (₹)
                    </label>
                    <input
                      type="number"
                      value={simBuyPrice}
                      onChange={(e) => setSimBuyPrice(Number(e.target.value))}
                      className="form-input"
                      style={{ width: "100%", fontSize: 12 }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, display: "block", marginBottom: 4 }}>
                      Simulated Sell Date
                    </label>
                    <input
                      type="date"
                      value={simSellDate}
                      onChange={(e) => setSimSellDate(e.target.value)}
                      className="form-input"
                      style={{ width: "100%", fontSize: 12 }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, display: "block", marginBottom: 4 }}>
                      Simulated Sell Value (₹)
                    </label>
                    <input
                      type="number"
                      value={simSellPrice}
                      onChange={(e) => setSimSellPrice(Number(e.target.value))}
                      className="form-input"
                      style={{ width: "100%", fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>

              {/* Simulation Result Card */}
              <div
                style={{
                  padding: 18,
                  borderRadius: 12,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                    Simulation Outcome
                  </span>
                  <Badge variant={whatIfCalculation.isLTCG ? "sage" : "gold"}>
                    {whatIfCalculation.gainType.replace("_", " ")}
                  </Badge>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    padding: 12,
                    background: "var(--surface-0)",
                    borderRadius: 8,
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted }}>Holding Period</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                      {whatIfCalculation.months} Months
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted }}>Tax Rate</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                      {(whatIfCalculation.taxRate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted }}>Gross Profit/Loss</div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: whatIfCalculation.profit >= 0 ? THEME.sage : THEME.rust,
                      }}
                    >
                      <Money value={whatIfCalculation.profit} variant="full" />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted }}>Estimated Tax</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: THEME.rust }}>
                      <Money value={whatIfCalculation.taxAmount} variant="full" />
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: `color-mix(in srgb, ${THEME.accent} 6%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>
                    Net In-Hand Realization:
                  </span>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: THEME.accent,
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    <Money value={whatIfCalculation.netInHand} variant="full" />
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
         VIEW 6: STATUTORY RULES & GUIDE
         ═════════════════════════════════════════════════════════════ */}
      {activeView === "rules" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Holding Periods Table */}
          <Card style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <BookOpen size={18} color={THEME.accent} />
              <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                Statutory Holding Periods & Classification Matrix (Budget 2024 Updated)
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: "left" }}>Asset Class</th>
                    <th style={{ ...thStyle, textAlign: "left" }}>STCG Threshold</th>
                    <th style={{ ...thStyle, textAlign: "left" }}>LTCG Threshold</th>
                    <th style={{ ...thStyle, textAlign: "left" }}>STCG Tax Rate</th>
                    <th style={{ ...thStyle, textAlign: "left" }}>LTCG Tax Rate</th>
                    <th style={{ ...thStyle, textAlign: "left" }}>Exemption Cap</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="table-row-hover">
                    <td style={{ ...tdStyle, fontWeight: 700, color: THEME.ink }}>
                      Listed Equity Shares & Equity MFs (≥65%)
                    </td>
                    <td style={tdStyle}>≤ 12 Months</td>
                    <td style={tdStyle}>&gt; 12 Months</td>
                    <td style={{ ...tdStyle, color: THEME.gold, fontWeight: 600 }}>20% (15% pre-23-Jul)</td>
                    <td style={{ ...tdStyle, color: THEME.sage, fontWeight: 600 }}>12.5% (10% pre-23-Jul)</td>
                    <td style={tdStyle}>₹1,25,000 / FY</td>
                  </tr>
                  <tr className="table-row-hover">
                    <td style={{ ...tdStyle, fontWeight: 700, color: THEME.ink }}>
                      Debt Mutual Funds (Bought on/after 1-Apr-2023)
                    </td>
                    <td style={tdStyle}>Any duration</td>
                    <td style={{ ...tdStyle, color: THEME.muted }}>No LTCG Allowed</td>
                    <td style={{ ...tdStyle, color: THEME.rust, fontWeight: 600 }}>Slab Rate (30%)</td>
                    <td style={{ ...tdStyle, color: THEME.muted }}>N/A (Slab Rate)</td>
                    <td style={tdStyle}>None</td>
                  </tr>
                  <tr className="table-row-hover">
                    <td style={{ ...tdStyle, fontWeight: 700, color: THEME.ink }}>
                      Debt Mutual Funds (Bought before 1-Apr-2023)
                    </td>
                    <td style={tdStyle}>≤ 36 Months</td>
                    <td style={tdStyle}>&gt; 36 Months</td>
                    <td style={{ ...tdStyle, color: THEME.rust, fontWeight: 600 }}>Slab Rate</td>
                    <td style={{ ...tdStyle, color: THEME.accent, fontWeight: 600 }}>20% with Indexation</td>
                    <td style={tdStyle}>None</td>
                  </tr>
                  <tr className="table-row-hover">
                    <td style={{ ...tdStyle, fontWeight: 700, color: THEME.ink }}>
                      Unlisted Shares & Real Estate
                    </td>
                    <td style={tdStyle}>≤ 24 Months</td>
                    <td style={tdStyle}>&gt; 24 Months</td>
                    <td style={tdStyle}>Slab Rate</td>
                    <td style={{ ...tdStyle, color: THEME.accent, fontWeight: 600 }}>12.5% (Without Indexation)</td>
                    <td style={tdStyle}>Sec 54 / 54F</td>
                  </tr>
                  <tr className="table-row-hover">
                    <td style={{ ...tdStyle, fontWeight: 700, color: THEME.ink }}>
                      Physical Gold & SGBs (Secondary Market)
                    </td>
                    <td style={tdStyle}>≤ 24 Months</td>
                    <td style={tdStyle}>&gt; 24 Months</td>
                    <td style={tdStyle}>Slab Rate</td>
                    <td style={{ ...tdStyle, color: THEME.sage, fontWeight: 600 }}>12.5%</td>
                    <td style={tdStyle}>None</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Section 70/71 Matrix */}
          <Card style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Layers size={18} color={THEME.accent} />
              <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                Set-off & Carry-Forward Matrix (Section 70, 71 & 74)
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.gold, marginBottom: 6 }}>
                  Short-Term Capital Loss (STCL)
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
                  <li>Can be set off against <strong>both STCG and LTCG</strong> in the same FY.</li>
                  <li>Can be carried forward for up to <strong>8 Assessment Years</strong>.</li>
                  <li>In future years, brought-forward STCL can set off STCG and LTCG.</li>
                </ul>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.sage, marginBottom: 6 }}>
                  Long-Term Capital Loss (LTCL)
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
                  <li>Can only be set off against <strong>LTCG</strong> (cannot offset STCG).</li>
                  <li>Can be carried forward for up to <strong>8 Assessment Years</strong>.</li>
                  <li>In future years, brought-forward LTCL can set off only LTCG.</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Disclaimer ────────────────────────────────────────────── */}
      <div
        style={{
          padding: "10px 16px",
          borderRadius: 10,
          background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
          border: `1px solid color-mix(in srgb, ${THEME.muted} 13%, transparent)`,
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          fontSize: 11,
          color: THEME.muted,
          lineHeight: 1.6,
        }}
      >
        <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          <strong>Statutory Disclaimer:</strong> Tax estimates are computed per Indian Income Tax
          Act provisions (Finance Act 2024). STCG on equity is taxed at {stcgRate * 100}%, LTCG at{" "}
          {ltcgRate * 100}% above <Money value={ltcgExemptionLimit} variant="full" /> exemption. Debt
          mutual funds purchased on or after 1-Apr-2023 are taxed at your applicable slab rate with
          no indexation benefit. For ITR filing, verify against your AIS/TIS and capital gain
          statements from CAMS/KFintech/brokers.
        </span>
      </div>
    </div>
  );
};
