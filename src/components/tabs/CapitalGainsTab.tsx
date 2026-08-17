// @ts-nocheck
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
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, today, exportArrayToCSV } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";
import { Prv, usePrivacy } from "../../context/PrivacyContext";

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

// mf_sells rows written before migration 94 (2026-08-16) never got a `category`
// column to write into — Supabase silently stripped the field on save (PGRST204
// auto-retry, see App.tsx), so those historical sale records have no category
// and isEquityMF() falls all the way back to guessing Equity/Debt from the fund
// NAME text. A plain name like "Axis Bluechip Fund" matches none of
// EQUITY_CATEGORIES, so it silently misfiles into the Debt STCG/LTCG tab
// instead of Equity. Recover the real category from the user's still-live
// holding of the same fund (same name + owner) before falling back to the
// keyword guess — fixes the classification for any fund not yet fully sold
// off, with zero risk since it only fills in a value that's currently empty.
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

// Parse a "YYYY-MM-DD" string as a local-midnight Date instead of letting the
// Date constructor treat it as UTC (per the ISO-8601 spec, a date-only string
// parses as UTC). Reading local getters (getMonth/getDate) off a UTC-parsed
// date can silently shift the date by a day depending on the runtime's
// timezone — the same footgun already documented and worked around in
// calcXIRR() in utils/finance.ts. Matters here because getHoldingMonths/
// isLongTerm below do exact day-of-month arithmetic.
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

// Complete months elapsed between two dates, honoring day-of-month.
// The shared monthsBetween() helper only diffs calendar (year, month) pairs
// and ignores the day component entirely — e.g. monthsBetween('2023-02-15',
// '2024-02-10') returns 12 even though only ~11mo 26d actually elapsed. That
// coarse approximation is fine for its other callers (SIP/loan tenure
// displays) but is not acceptable here: it can flip a transaction's STCG/LTCG
// classification (and thus its tax rate) near a month boundary.
export const getHoldingMonths = (buyDate: string, sellDate: string): number => {
  if (!buyDate || !sellDate) return 0;
  const a = parseLocalDate(buyDate);
  const b = parseLocalDate(sellDate);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  return Math.max(0, months);
};

// Section 2(42A): a capital asset qualifies for LTCG only when held for MORE
// than `monthsThreshold` months — i.e. the sale date must be strictly after
// the N-month anniversary of the purchase date, not on it. Selling exactly on
// the anniversary (e.g. bought 15-Jan-2023, sold 15-Jan-2024) is still
// short-term. Comparing calendar-month counts with >= (the previous approach)
// incorrectly treated the exact-anniversary sale as long-term.
export const isLongTerm = (buyDate: string, sellDate: string, monthsThreshold: number): boolean => {
  if (!buyDate || !sellDate) return false;
  const buy = parseLocalDate(buyDate);
  const sell = parseLocalDate(sellDate);
  const anniversary = new Date(buy.getFullYear(), buy.getMonth() + monthsThreshold, buy.getDate());
  return sell > anniversary;
};

// NOTE: every date comparison below goes through parseLocalDate (never the
// bare `new Date(dateStr)` constructor) — see the comment on parseLocalDate
// above for why: a raw `new Date("YYYY-MM-DD")` parses as UTC midnight, and
// reading local getters off it (or comparing it against a locally-built
// Date) can silently shift the effective calendar day depending on the
// runtime's timezone.
const fmtDate = (d: string) => {
  if (!d) return "-";
  const dt = parseLocalDate(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const dateToFYStart = (d: string): number => {
  const dt = parseLocalDate(d);
  return dt.getMonth() >= 3 ? dt.getFullYear() : dt.getFullYear() - 1;
};

// FY (April→March) that "today" falls in.
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

  for (const s of stockSells) {
    if (s.sellDate) fySet.add(dateToFYStart(s.sellDate));
    if (s.buyDate) fySet.add(dateToFYStart(s.buyDate));
  }
  for (const m of mfSells) {
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

/* ── Tax Rate helpers ──────────────────────────────────────────────
   Budget 2024 raised equity STCG/LTCG rates effective a specific
   TRANSACTION date — 23-Jul-2024 — not at the start of FY2024-25
   (01-Apr-2024). FY2024-25 straddles the change: a sale on, say,
   15-May-2024 must still be taxed at the OLD rate even though it falls in
   the same financial year as a sale made after 23-Jul-2024, which gets the
   NEW rate. So these two rate lookups are keyed off the actual sell date,
   NOT the selected/filed financial year (fixing a bug where the whole of
   FY2024-25 was previously taxed at the new rate, including pre-23-Jul
   sales).
   The LTCG exemption limit is the one exception that legitimately stays
   FY-keyed: per CBDT's Budget 2024 clarification, the enhanced ₹1.25L
   exemption applies to the ENTIRE FY2024-25 (it is not prorated/split at
   23-Jul), unlike the tax rate itself. */
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

// For display-only "headline" rate figures (glossary banner, category cards,
// disclaimer) where a single scalar rate is shown for a whole FY: use
// today's rate if the FY is still open/ongoing, or the rate as of that FY's
// last day if it's a closed, past FY. Per-transaction figures (the ledger
// table, tax totals) never use this — they use each row's own sell-date-based
// rate via getEquitySTCGRate/getEquityLTCGRate above.
const referenceDateForFY = (fyStartYear: number): string => {
  if (fyStartYear >= getCurrentFYStartYear()) return today();
  return `${fyStartYear + 1}-03-31`;
};

/* ── Classification Types ──────────────────────────────────────── */
type GainType = "EQUITY_STCG" | "EQUITY_LTCG" | "DEBT_STCG" | "DEBT_LTCG";
const GAIN_TYPE_ORDER: GainType[] = ["EQUITY_STCG", "EQUITY_LTCG", "DEBT_STCG", "DEBT_LTCG"];

interface ClassifiedSell {
  id?: string;
  name: string;
  buyDate: string;
  buyPrice: number;
  sellDate: string;
  sellPrice: number;
  qty: number;
  holdingMonths: number;
  profit: number;
  taxRate: number;
  estimatedTax: number;
  gainType: GainType;
  assetType: "Stock" | "Mutual Fund";
  // true when this MF sell has no confirmed Equity/Debt category — from itself
  // or a still-live matching holding — so its gain type/tax rate above are
  // only a best-effort guess from the fund's name text (see isEquityMF).
  categoryGuessed?: boolean;
}

interface UnrealizedHolding {
  name: string;
  buyDate: string;
  buyPrice: number;
  currentPrice: number;
  qty: number;
  holdingMonths: number;
  unrealizedPL: number;
  wouldBeType: GainType;
  assetType: "Stock" | "Mutual Fund";
  // number = months remaining to LTCG; null = already LTCG; "never" = this
  // lot can NEVER become LTCG regardless of holding period (debt MF units
  // bought on/after 1-Apr-2023 — no indexation/LTCG benefit exists for them).
  monthsToLTCG: number | null | "never";
}

/* ══════════════════════════════════════════════════════════════════
   SELL CLASSIFICATION & TAX-TOTAL COMPUTATION (pure, FY-parameterized)
   Pulled out of the component so the same logic can be run twice: once
   for whichever FY the user has selected in the ledger dropdown, and
   once — independently — for the CURRENT FY, which the tax-loss
   harvesting section below always needs regardless of which FY the user
   is browsing (see the comment above harvestingSuggestions).
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
    const isLTCG = isLongTerm(s.buyDate, s.sellDate, 12);
    const gainType: GainType = isLTCG ? "EQUITY_LTCG" : "EQUITY_STCG";
    // Rate keyed to the actual sell date (see comment above getEquitySTCGRate).
    const taxRate = isLTCG ? getEquityLTCGRate(s.sellDate) : getEquitySTCGRate(s.sellDate);

    result.push({
      name: s.symbol || s.name || "Unknown Stock",
      buyDate: s.buyDate,
      buyPrice: buyTotal,
      sellDate: s.sellDate,
      sellPrice: sellTotal,
      qty,
      holdingMonths: months,
      profit,
      taxRate,
      estimatedTax: 0,
      gainType,
      assetType: "Stock",
    });
  }

  for (const m of mfSells || []) {
    if (!isInFY(m.sellDate, fyStartYear)) continue;
    const months = getHoldingMonths(m.buyDate, m.sellDate);
    const units = Number(m.units || m.qty) || 0;
    const buyTotal = (Number(m.buyNav || m.buyPrice) || 0) * units;
    const sellTotal = (Number(m.sellNav || m.sellPrice) || 0) * units;
    const profit = m.profit != null ? Number(m.profit) : sellTotal - buyTotal;
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
      taxRate,
      estimatedTax: 0,
      gainType,
      assetType: "Mutual Fund",
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

  // Section 70 Loss Set-Off Rules (equity only — see report for the
  // debt-cross-asset-class limitation this simplification carries):
  // 1. STCL (Short Term Loss) can set off STCG and LTCG.
  // 2. LTCL (Long Term Loss) can only set off LTCG.
  const rawEqSTCG = totals.EQUITY_STCG;
  const rawEqLTCG = totals.EQUITY_LTCG;
  const rawDebtSTCG = totals.DEBT_STCG;
  const rawDebtLTCG = totals.DEBT_LTCG;

  // Calculate net STCG after absorbing short-term losses
  let netSTCG = Math.max(0, rawEqSTCG);
  let stclRemaining = rawEqSTCG < 0 ? Math.abs(rawEqSTCG) : 0;

  // Calculate net LTCG after absorbing long-term losses
  let netEqLTCG = Math.max(0, rawEqLTCG);

  // Apply remaining STCL against Equity LTCG (u/s 70)
  if (stclRemaining > 0 && netEqLTCG > 0) {
    const offset = Math.min(stclRemaining, netEqLTCG);
    netEqLTCG -= offset;
    stclRemaining -= offset;
  }

  // Apply Section 112A exemption (1.25L / 1L) to net Equity LTCG
  const exemptionUsed = Math.min(netEqLTCG, ltcgExemptionLimit);
  const taxableEquityLTCG = Math.max(0, netEqLTCG - exemptionUsed);
  const taxableEquitySTCG = netSTCG;
  const taxableDebtSTCG = Math.max(0, rawDebtSTCG);
  const taxableDebtLTCG = Math.max(0, rawDebtLTCG);

  // Distribute each taxable pool back across its member rows, proportional
  // to each row's own profit share, using each ROW'S OWN tax rate — not a
  // single blended FY rate. This matters now that equity rates can differ
  // transaction-to-transaction within FY2024-25 (see getEquitySTCGRate). It
  // also fixes a prior bug where a row's "Est. Tax" ignored other losses in
  // the same bucket (a profitable STCG row showed tax on its full gross
  // profit even when a loss elsewhere in the same STCG bucket had already
  // reduced the group's true net taxable amount).
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
  };
};

/* ══════════════════════════════════════════════════════════════════
   SHARED TABLE STYLES (matching TaxVaultTab / AnnualReportTab)
   ══════════════════════════════════════════════════════════════════ */

const thStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: `1.5px solid ${THEME.line}`,
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: THEME.muted,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 10px",
  borderBottom: `1px solid ${THEME.line}`,
  fontSize: 12,
  verticalAlign: "middle",
};

/* ══════════════════════════════════════════════════════════════════
   CARD HEADING (matching AnnualReportTab)
   ══════════════════════════════════════════════════════════════════ */

const CardHeading = ({ icon: Icon, title, color = THEME.accent }: any) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={16} style={{ color }} />
    </div>
    <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, letterSpacing: "-0.02em" }}>
      {title}
    </div>
  </div>
);

/* ── Category Fix Badge ──────────────────────────────────────────
   Shown on an MF sell row whose Equity/Debt category couldn't be confirmed
   (neither the sale record nor any still-live matching holding had one, so
   the gain type/tax rate shown is only a best-effort guess from the fund's
   name text). Lets the user resolve it inline — the fix is written straight
   back to the mf_sells row so it's permanent, not just a display patch. */
const CategoryFixBadge = ({
  sellId,
  onFix,
}: {
  sellId?: string;
  onFix?: (id: string, category: string) => Promise<void> | void;
}) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!sellId || !onFix) {
    return (
      <span title="Equity/Debt could not be confirmed for this sale — showing a best-effort guess based on the fund's name.">
        <AlertTriangle size={12} color={THEME.gold} />
      </span>
    );
  }

  const pick = async (category: string) => {
    setSaving(true);
    await onFix(sellId, category);
    setSaving(false);
    setOpen(false);
  };

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Equity/Debt not confirmed for this sale — showing a best-effort guess. Click to set it."
        aria-label="Fix mutual fund tax category"
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <AlertTriangle size={12} color={THEME.gold} />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            zIndex: 20,
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            borderRadius: 8,
            boxShadow: "var(--shadow-card)",
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            minWidth: 150,
          }}
        >
          <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>
            This fund is actually:
          </span>
          <Button variant="secondary" size="sm" disabled={saving} onClick={() => pick("Equity")}>
            Equity
          </Button>
          <Button variant="secondary" size="sm" disabled={saving} onClick={() => pick("Debt")}>
            Debt
          </Button>
        </div>
      )}
    </span>
  );
};

/* ══════════════════════════════════════════════════════════════════
   TRANSACTION TABLE
   ══════════════════════════════════════════════════════════════════ */

const TransactionTable = ({
  rows,
  title,
  color,
  onFixCategory,
}: {
  rows: ClassifiedSell[];
  title: string;
  color: string;
  onFixCategory?: (id: string, category: string) => Promise<void> | void;
}) => {
  const [expanded, setExpanded] = useState(true);
  if (!rows.length) return null;

  const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
  const totalTax = rows.reduce((s, r) => s + r.estimatedTax, 0);

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {/* Section header bar (matching TaxVaultTab section headers) */}
      <div
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        aria-expanded={expanded}
        style={{
          padding: "10px 16px",
          background: `color-mix(in srgb, ${color} 6%, transparent)`,
          borderBottom: expanded ? `1px solid ${THEME.line}` : "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color }}>{title}</span>
          <Badge variant={totalProfit >= 0 ? "sage" : "rust"}>{rows.length} txns</Badge>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: totalProfit >= 0 ? THEME.sage : THEME.rust,
              }}
            >
              <Prv>P&L: {fmtINRFull(totalProfit)}</Prv>
            </span>
            <span style={{ fontSize: 11, color: THEME.muted, marginLeft: 12 }}>
              <Prv>Tax: {fmtINRFull(totalTax)}</Prv>
            </span>
          </div>
          {expanded ? (
            <ChevronUp size={14} color={THEME.muted} />
          ) : (
            <ChevronDown size={14} color={THEME.muted} />
          )}
        </div>
      </div>
      {expanded && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  { h: "Asset", align: "left" },
                  { h: "Type", align: "left" },
                  { h: "Buy Date", align: "right" },
                  { h: "Buy Price", align: "right" },
                  { h: "Sell Date", align: "right" },
                  { h: "Sell Price", align: "right" },
                  { h: "Qty", align: "right" },
                  { h: "Holding", align: "right" },
                  { h: "P&L", align: "right" },
                  { h: "Tax Rate", align: "right" },
                  { h: "Est. Tax", align: "right" },
                ].map(({ h, align }) => (
                  <th key={h} style={{ ...thStyle, textAlign: align as any }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className="table-row-hover"
                >
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
                    {r.name}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Badge variant="muted">{r.assetType}</Badge>
                      {r.assetType === "Mutual Fund" && r.categoryGuessed && (
                        <CategoryFixBadge sellId={r.id} onFix={onFixCategory} />
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      color: THEME.muted,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtDate(r.buyDate)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>
                    <Prv>{fmtINRFull(r.buyPrice)}</Prv>
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      color: THEME.muted,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtDate(r.sellDate)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>
                    <Prv>{fmtINRFull(r.sellPrice)}</Prv>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>{r.qty}</td>
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
                    <Prv>{fmtINRFull(r.profit)}</Prv>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: THEME.muted }}>
                    {(r.taxRate * 100).toFixed(1)}%
                  </td>
                  <td
                    style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: THEME.rust }}
                  >
                    <Prv>{fmtINRFull(r.estimatedTax)}</Prv>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export const CapitalGainsTab = ({
  state,
  updateItem,
}: {
  state: any;
  updateItem?: (key: string, id: string, patch: any) => Promise<any>;
}) => {
  const { privacyMode } = usePrivacy();

  const handleFixMFCategory = async (id: string, category: string) => {
    if (!updateItem) return;
    await updateItem("mfSells", id, { category });
  };
  const fyOptions = useMemo(
    () => buildFYOptions(state.stockSells || [], state.mfSells || []),
    [state.stockSells, state.mfSells]
  );

  const [fyStartYear, setFyStartYear] = useState(getCurrentFYStartYear);
  // null = user hasn't manually picked a tab yet — default to whichever gain
  // type actually has transactions (STCG/LTCG/Equity/Debt in that priority
  // order) instead of always opening on Equity STCG, which can be empty while
  // all of a user's real activity sits under a different tab (e.g. all
  // long-term MF sales), making the report look like it's missing data.
  const [manualActiveDetailTab, setManualActiveDetailTab] = useState<GainType | null>(null);
  const [showUnrealized, setShowUnrealized] = useState(true);
  const [showHarvesting, setShowHarvesting] = useState(true);

  const currentFYStartYear = getCurrentFYStartYear();

  const mfCategoryIndex = useMemo(
    () => buildMFCategoryIndex(state.mutualFunds || []),
    [state.mutualFunds]
  );

  /* ── Classify Sells (for whichever FY is selected in the dropdown) ── */
  const classified = useMemo(
    () => classifySells(state.stockSells || [], state.mfSells || [], fyStartYear, mfCategoryIndex),
    [state.stockSells, state.mfSells, fyStartYear, mfCategoryIndex]
  );

  /* ── Compute Totals by Type (for the selected FY) ──────────────── */
  const { byType, totalTax, ltcgExemptionUsed, ltcgExemptionLimit, stcgRate, ltcgRate } = useMemo(
    () => computeGainTotals(classified, fyStartYear),
    [classified, fyStartYear]
  );

  const activeDetailTab: GainType =
    manualActiveDetailTab ??
    GAIN_TYPE_ORDER.find((k) => byType.groups[k].length > 0) ??
    "EQUITY_STCG";
  const setActiveDetailTab = setManualActiveDetailTab;

  // Tax-loss harvesting concerns a hypothetical sale made TODAY, to offset
  // whatever realized gains exist in the CURRENTLY OPEN financial year — it
  // is independent of whichever FY the user happens to be browsing in the
  // ledger dropdown above. Recompute totals against the current FY
  // specifically (reusing `classified`/`byType` when the dropdown already
  // is on the current FY, to avoid duplicate work) so switching the FY
  // filter to review old, closed years doesn't silently change the
  // harvesting savings estimate to stale numbers from a past year.
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

  /* ── Unrealized Gains ────────────────────────────────────────── */
  const unrealized = useMemo(() => {
    const result: UnrealizedHolding[] = [];
    const todayStr = today();

    const stocks = state.stocks || [];
    for (const s of stocks) {
      if (!s.buyDate) continue;
      const qty = Number(s.qty) || 0;
      const buyPrice = Number(s.buyPrice || s.avgPrice) || 0;
      const currentPrice = Number(s.currentPrice || s.ltp || s.price) || 0;
      const months = getHoldingMonths(s.buyDate, todayStr);
      const unrealizedPL = (currentPrice - buyPrice) * qty;
      const isLTCG = isLongTerm(s.buyDate, todayStr, 12);
      result.push({
        name: s.symbol || s.name || "Unknown",
        buyDate: s.buyDate,
        buyPrice: buyPrice * qty,
        currentPrice: currentPrice * qty,
        qty,
        holdingMonths: months,
        unrealizedPL,
        wouldBeType: isLTCG ? "EQUITY_LTCG" : "EQUITY_STCG",
        assetType: "Stock",
        monthsToLTCG: isLTCG ? null : 12 - months,
      });
    }

    const mfs = state.mutualFunds || [];
    for (const m of mfs) {
      if (!m.buyDate && !m.purchaseDate) continue;
      const bd = m.buyDate || m.purchaseDate;
      const units = Number(m.units || m.qty) || 0;
      const buyNav = Number(m.buyNav || m.avgNav || m.purchaseNav) || 0;
      const currentNav = Number(m.currentNav || m.nav || m.ltp) || 0;
      const months = getHoldingMonths(bd, todayStr);
      const unrealizedPL = (currentNav - buyNav) * units;
      const equity = isEquityMF(m);
      const ltcgThreshold = equity ? 12 : 36;

      let wouldBeType: GainType;
      let monthsToLTCG: number | null | "never";
      if (equity) {
        const isLTCG = isLongTerm(bd, todayStr, ltcgThreshold);
        wouldBeType = isLTCG ? "EQUITY_LTCG" : "EQUITY_STCG";
        monthsToLTCG = isLTCG ? null : ltcgThreshold - months;
      } else {
        const postApr2023 = parseLocalDate(bd) >= parseLocalDate(DEBT_INDEXATION_CUTOFF_DATE);
        if (postApr2023) {
          // Units bought on/after 1-Apr-2023 can NEVER qualify for LTCG or
          // indexation, no matter how long they're held — always slab rate.
          // (Previously this fell through to the isLTCG check below, which
          // could hit >36 months and wrongly show a green "LTCG" badge —
          // implying a tax benefit that does not exist for these units.)
          wouldBeType = "DEBT_STCG";
          monthsToLTCG = "never";
        } else {
          const isLTCG = isLongTerm(bd, todayStr, ltcgThreshold);
          wouldBeType = isLTCG ? "DEBT_LTCG" : "DEBT_STCG";
          monthsToLTCG = isLTCG ? null : ltcgThreshold - months;
        }
      }

      result.push({
        name: m.name || m.scheme || "Unknown MF",
        buyDate: bd,
        buyPrice: buyNav * units,
        currentPrice: currentNav * units,
        qty: units,
        holdingMonths: months,
        unrealizedPL,
        wouldBeType,
        assetType: "Mutual Fund",
        monthsToLTCG,
      });
    }

    return result;
  }, [state.stocks, state.mutualFunds]);

  /* ── Tax-Loss Harvesting Suggestions ─────────────────────────── */
  // Deliberately pulls its offset pool + rates from `currentFYTotals` (always
  // the CURRENT financial year), not from `byType`/`stcgRate`/`ltcgRate`
  // (whichever FY the ledger dropdown above is set to) — see the comment on
  // currentFYTotals above.
  const harvestingSuggestions = useMemo(() => {
    const losses = unrealized.filter((h) => h.unrealizedPL < 0);
    let remainingSTCG = Math.max(0, currentFYTotals.byType.totals.EQUITY_STCG);
    let remainingLTCG = Math.max(
      0,
      currentFYTotals.byType.totals.EQUITY_LTCG - currentFYTotals.ltcgExemptionLimit
    );

    // Harvest largest losses first so the shared, finite realized-gains pool
    // is depleted across suggestions rather than reused by each independently
    // (which previously overstated the combined "potential savings" total).
    const sorted = [...losses].sort(
      (a, b) => Math.abs(b.unrealizedPL) - Math.abs(a.unrealizedPL)
    );

    return sorted
      .map((h) => {
        const absLoss = Math.abs(h.unrealizedPL);
        const isSTCG = h.wouldBeType === "EQUITY_STCG" || h.wouldBeType === "DEBT_STCG";
        const rate = isSTCG ? currentFYTotals.stcgRate : currentFYTotals.ltcgRate;
        let usableLoss: number;
        if (isSTCG) {
          // STCG losses can offset either realized STCG or LTCG gains.
          const fromSTCG = Math.min(absLoss, remainingSTCG);
          remainingSTCG -= fromSTCG;
          const fromLTCG = Math.min(absLoss - fromSTCG, remainingLTCG);
          remainingLTCG -= fromLTCG;
          usableLoss = fromSTCG + fromLTCG;
        } else {
          // LTCG losses can only offset realized LTCG gains.
          usableLoss = Math.min(absLoss, remainingLTCG);
          remainingLTCG -= usableLoss;
        }
        const potentialSaving = Math.round(usableLoss * rate);
        return { ...h, usableLoss, potentialSaving };
      })
      .filter((h) => h.potentialSaving > 0)
      .sort((a, b) => b.potentialSaving - a.potentialSaving);
  }, [unrealized, currentFYTotals]);

  /* ── CSV Export ──────────────────────────────────────────────── */
  const handleExport = () => {
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
    // Reuse the shared, already-tested CSV exporter (it correctly escapes
    // embedded quotes/commas in fund names — the previous hand-rolled
    // version here did not) instead of duplicating that logic.
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
      `Capital_Gains_FY${fyStartYear}-${String(fyStartYear + 1).slice(2)}.csv`
    );
  };

  /* ── Derived ─────────────────────────────────────────────────── */
  const hasSells = classified.length > 0;
  const hasHoldings = unrealized.length > 0;
  const fyLabel = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;
  const currentFYLabel = `FY ${currentFYStartYear}-${String(currentFYStartYear + 1).slice(2)}`;
  const totalRealizedPL = classified.reduce((s, r) => s + r.profit, 0);

  const detailTabs: { key: GainType; label: string; color: string }[] = [
    { key: "EQUITY_STCG", label: "Equity STCG", color: THEME.gold },
    { key: "EQUITY_LTCG", label: "Equity LTCG", color: THEME.sage },
    { key: "DEBT_STCG", label: "Debt STCG", color: THEME.rust },
    { key: "DEBT_LTCG", label: "Debt LTCG", color: THEME.accent },
  ];

  /* ── Empty State ─────────────────────────────────────────────── */
  if (!hasSells && !hasHoldings) {
    return (
      <div style={{ padding: "0 0 40px" }}>
        <SectionTitle sub="Capital gains report for ITR filing with tax estimates and harvesting insights">
          Capital Gains Report
        </SectionTitle>
        <Card style={{ padding: "48px 32px", textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <FileText size={22} color={THEME.accent} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginBottom: 6 }}>
            No Capital Gains Data
          </div>
          <div
            style={{
              fontSize: 13,
              color: THEME.muted,
              maxWidth: 380,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Add stock or mutual fund sell transactions in the Demat or Investments tab to see your
            capital gains report, tax estimates, and harvesting suggestions.
          </div>
        </Card>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: "0 0 40px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <SectionTitle
        sub={`${fyLabel} · Capital gains report with tax estimates, LTCG exemption tracking & harvesting insights`}
        rightElement={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select
              className="form-input"
              value={fyStartYear}
              onChange={(e) => setFyStartYear(Number(e.target.value))}
              aria-label="Select financial year"
              style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600, minWidth: 130 }}
            >
              {fyOptions.map((fy) => (
                <option key={fy.startYear} value={fy.startYear}>
                  {fy.label}
                </option>
              ))}
            </select>
            {hasSells && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={14} />}
                onClick={handleExport}
              >
                Export CSV
              </Button>
            )}
          </div>
        }
      >
        Capital Gains Report
      </SectionTitle>

      {/* Plain-English glossary for the STCG/LTCG jargon used throughout this
          page's stat cards below — placed up top, before a first-time user
          hits those abbreviations, rather than only in the small-print
          disclaimer at the very bottom of the page. */}
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          background: `color-mix(in srgb, ${THEME.accent} 6%, transparent)`,
          border: `1px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
          fontSize: 12,
          color: THEME.muted,
        }}
      >
        <b style={{ color: THEME.ink }}>STCG vs LTCG:</b> Sell an equity stock/fund within 12 months
        of buying it and the profit is <b style={{ color: THEME.ink }}>Short-Term (STCG)</b>, taxed
        at {stcgRate * 100}%. Hold it longer and it's{" "}
        <b style={{ color: THEME.ink }}>Long-Term (LTCG)</b>, taxed at only {ltcgRate * 100}% — and
        the first <Prv>{fmtINRFull(ltcgExemptionLimit)}</Prv> of LTCG each financial year is
        tax-free
        (Section 112A exemption).
      </div>

      {/* ── Summary StatCards (standard component) ────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          icon={<TrendingUp />}
          label="Total Realized P&L"
          value={fmtINRFull(totalRealizedPL)}
          numericValue={totalRealizedPL}
          formatValue={fmtINRFull}
          sub={`${classified.length} transactions in ${fyLabel}`}
          subColor={totalRealizedPL >= 0 ? THEME.sage : THEME.rust}
          color={totalRealizedPL >= 0 ? THEME.sage : THEME.rust}
        />
        <StatCard
          icon={<IndianRupee />}
          label="Estimated Tax"
          value={fmtINRFull(totalTax)}
          numericValue={totalTax}
          formatValue={fmtINRFull}
          sub="Across all gain categories"
          color={THEME.rust}
        />
        <StatCard
          icon={<Shield />}
          label="LTCG Exemption Used"
          value={fmtINRFull(ltcgExemptionUsed)}
          numericValue={ltcgExemptionUsed}
          formatValue={fmtINRFull}
          sub={privacyMode ? "of •••• (Sec 112A)" : `of ${fmtINRFull(ltcgExemptionLimit)} (Sec 112A)`}
          subColor={ltcgExemptionUsed >= ltcgExemptionLimit ? THEME.sage : undefined}
          color={THEME.sage}
        />
        <StatCard
          icon={<Scissors />}
          label="Harvesting Potential"
          value={fmtINRFull(harvestingSuggestions.reduce((s, h) => s + h.potentialSaving, 0))}
          numericValue={harvestingSuggestions.reduce((s, h) => s + h.potentialSaving, 0)}
          formatValue={fmtINRFull}
          sub={
            isViewingCurrentFY
              ? `${harvestingSuggestions.length} opportunities`
              : `${harvestingSuggestions.length} opportunities (current FY, not ${fyLabel})`
          }
          color={THEME.gold}
        />
      </div>

      {/* ── Gain Breakdown Cards ──────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        {[
          {
            label: "Equity STCG",
            key: "EQUITY_STCG" as GainType,
            rate: `${stcgRate * 100}%`,
            color: THEME.gold,
            icon: <TrendingUp />,
          },
          {
            label: "Equity LTCG",
            key: "EQUITY_LTCG" as GainType,
            rate: `${ltcgRate * 100}%`,
            color: THEME.sage,
            icon: <TrendingUp />,
          },
          {
            label: "Debt STCG",
            key: "DEBT_STCG" as GainType,
            rate: "~30% slab",
            color: THEME.rust,
            icon: <BarChart3 />,
          },
          {
            label: "Debt LTCG",
            key: "DEBT_LTCG" as GainType,
            rate: "20%",
            color: THEME.accent,
            icon: <BarChart3 />,
          },
        ].map((g) => (
          <div
            key={g.key}
            style={{
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              borderTop: `4px solid ${g.color}`,
              borderRadius: 14,
              padding: "14px 16px",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `color-mix(in srgb, ${g.color} 12%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: g.color,
                  flexShrink: 0,
                }}
              >
                {React.cloneElement(g.icon, { size: 14 })}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                {g.label}
              </span>
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: byType.totals[g.key] >= 0 ? THEME.sage : THEME.rust,
                letterSpacing: "-0.03em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <Prv>{fmtINRFull(byType.totals[g.key])}</Prv>
            </div>
            <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>
              Tax @ {g.rate} · {byType.groups[g.key].length} txns
            </div>
          </div>
        ))}
      </div>

      {/* ── LTCG Exemption Progress ───────────────────────────────── */}
      <Card style={{ padding: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={16} style={{ color: THEME.sage }} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                LTCG Exemption (Sec 112A)
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                {fyLabel} · Equity long-term gains
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span
              style={{ fontSize: 18, fontWeight: 800, color: THEME.sage, letterSpacing: "-0.02em" }}
            >
              <Prv>{fmtINRFull(ltcgExemptionUsed)}</Prv>
            </span>
            <span style={{ fontSize: 12, color: THEME.muted, marginLeft: 4 }}>
              / <Prv>{fmtINRFull(ltcgExemptionLimit)}</Prv>
            </span>
          </div>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill progress-fill-sage"
            style={{ width: `${Math.min(100, (ltcgExemptionUsed / ltcgExemptionLimit) * 100)}%` }}
          />
        </div>
        <div style={{ fontSize: 10, color: THEME.muted, marginTop: 6 }}>
          {ltcgExemptionUsed >= ltcgExemptionLimit ? (
            "Exemption fully utilized"
          ) : (
            <>
              <Prv>{fmtINRFull(ltcgExemptionLimit - ltcgExemptionUsed)}</Prv> remaining exemption
            </>
          )}
        </div>
      </Card>

      {/* ── Transaction Details ───────────────────────────────────── */}
      {hasSells && (
        <Card style={{ padding: 24 }}>
          <CardHeading icon={FileText} title="Transaction Details" />

          {/* Pill-bar tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {detailTabs.map((t) => {
              const active = activeDetailTab === t.key;
              const count = byType.groups[t.key].length;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveDetailTab(t.key)}
                  aria-pressed={active}
                  className={active ? "" : "table-row-hover"}
                  style={{
                    background: active
                      ? `color-mix(in srgb, ${t.color} 8%, transparent)`
                      : "transparent",
                    border: `1.5px solid ${active ? `color-mix(in srgb, ${t.color} 19%, transparent)` : THEME.line}`,
                    color: active ? t.color : THEME.muted,
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {t.label}
                  {count > 0 && (
                    <span
                      style={{
                        background: active ? t.color : THEME.muted,
                        color: "#fff",
                        borderRadius: 10,
                        padding: "1px 7px",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {byType.groups[activeDetailTab].length > 0 ? (
            <TransactionTable
              rows={byType.groups[activeDetailTab]}
              title={detailTabs.find((t) => t.key === activeDetailTab)?.label || ""}
              color={detailTabs.find((t) => t.key === activeDetailTab)?.color || THEME.accent}
              onFixCategory={handleFixMFCategory}
            />
          ) : (
            <div
              style={{
                padding: "32px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: `color-mix(in srgb, ${THEME.accent} 7%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileText size={18} color={THEME.accent} />
              </div>
              <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 500 }}>
                No {detailTabs.find((t) => t.key === activeDetailTab)?.label} transactions in{" "}
                {fyLabel}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Unrealized Gains ──────────────────────────────────────── */}
      {hasHoldings && (
        <Card style={{ padding: 24 }}>
          <div
            onClick={() => setShowUnrealized(!showUnrealized)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowUnrealized(!showUnrealized);
              }
            }}
            aria-expanded={showUnrealized}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              marginBottom: showUnrealized ? 16 : 0,
            }}
          >
            <CardHeading icon={Clock} title="Unrealized Gains (Current Holdings)" />
            {showUnrealized ? (
              <ChevronUp size={16} color={THEME.muted} />
            ) : (
              <ChevronDown size={16} color={THEME.muted} />
            )}
          </div>

          {showUnrealized && (
            <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${THEME.line}` }}>
              <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {[
                      { h: "Asset", align: "left" },
                      { h: "Type", align: "left" },
                      { h: "Buy Date", align: "right" },
                      { h: "Invested", align: "right" },
                      { h: "Current", align: "right" },
                      { h: "P&L", align: "right" },
                      { h: "Holding", align: "right" },
                      { h: "Class", align: "left" },
                      { h: "To LTCG", align: "left" },
                    ].map(({ h, align }) => (
                      <th key={h} style={{ ...thStyle, textAlign: align as any }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unrealized.map((h, i) => (
                    <tr
                      key={i}
                      className="table-row-hover"
                    >
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
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          color: THEME.muted,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtDate(h.buyDate)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>
                        <Prv>{fmtINRFull(h.buyPrice)}</Prv>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>
                        <Prv>{fmtINRFull(h.currentPrice)}</Prv>
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 700,
                          color: h.unrealizedPL >= 0 ? THEME.sage : THEME.rust,
                        }}
                      >
                        <Prv>{fmtINRFull(h.unrealizedPL)}</Prv>
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          color: THEME.muted,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h.holdingMonths} mo
                      </td>
                      <td style={tdStyle}>
                        <Badge variant={h.wouldBeType.includes("LTCG") ? "sage" : "gold"}>
                          {h.wouldBeType.replace("_", " ")}
                        </Badge>
                      </td>
                      <td style={{ ...tdStyle, color: THEME.muted, whiteSpace: "nowrap" }}>
                        {h.monthsToLTCG === "never" ? (
                          <span
                            title="Debt fund units bought on/after 1-Apr-2023 never qualify for LTCG or indexation, no matter how long they're held — always taxed at slab rate"
                          >
                            <Badge variant="muted">No LTCG (slab)</Badge>
                          </span>
                        ) : h.monthsToLTCG != null ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={11} />
                            {h.monthsToLTCG} mo
                          </span>
                        ) : (
                          <Badge variant="sage">LTCG</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Tax-Loss Harvesting ───────────────────────────────────── */}
      {harvestingSuggestions.length > 0 && (
        <Card style={{ padding: 24 }}>
          <div
            onClick={() => setShowHarvesting(!showHarvesting)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowHarvesting(!showHarvesting);
              }
            }}
            aria-expanded={showHarvesting}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              marginBottom: showHarvesting ? 16 : 0,
            }}
          >
            <CardHeading
              icon={Scissors}
              title="Tax-Loss Harvesting Suggestions"
              color={THEME.gold}
            />
            {showHarvesting ? (
              <ChevronUp size={16} color={THEME.muted} />
            ) : (
              <ChevronDown size={16} color={THEME.muted} />
            )}
          </div>

          {showHarvesting && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Info banner */}
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${THEME.gold} 4%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.gold} 13%, transparent)`,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: 12,
                  color: THEME.muted,
                }}
              >
                <Lightbulb size={15} color={THEME.gold} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  You have{" "}
                  <strong style={{ color: THEME.ink }}>
                    {harvestingSuggestions.length} holdings
                  </strong>{" "}
                  with unrealized losses. Selling them could save up to{" "}
                  <strong style={{ color: THEME.sage }}>
                    <Prv>
                      {fmtINRFull(harvestingSuggestions.reduce((s, h) => s + h.potentialSaving, 0))}
                    </Prv>
                  </strong>{" "}
                  in taxes by offsetting your realized gains in {currentFYLabel}
                  {!isViewingCurrentFY ? ` (the currently open FY, not the ${fyLabel} shown above)` : ""}.
                </span>
              </div>

              {/* Table */}
              <div
                style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${THEME.line}` }}
              >
                <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {[
                        { h: "Asset", align: "left" },
                        { h: "Type", align: "left" },
                        { h: "Unrealized Loss", align: "right" },
                        { h: "Usable Loss", align: "right" },
                        { h: "Tax Saving", align: "right" },
                        { h: "Class", align: "left" },
                      ].map(({ h, align }) => (
                        <th key={h} style={{ ...thStyle, textAlign: align as any }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {harvestingSuggestions.map((h, i) => (
                      <tr
                        key={i}
                        className="table-row-hover"
                      >
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
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            fontWeight: 700,
                            color: THEME.rust,
                          }}
                        >
                          <Prv>{fmtINRFull(h.unrealizedPL)}</Prv>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>
                          <Prv>{fmtINRFull(h.usableLoss)}</Prv>
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            fontWeight: 700,
                            color: THEME.sage,
                          }}
                        >
                          <Prv>{fmtINRFull(h.potentialSaving)}</Prv>
                        </td>
                        <td style={tdStyle}>
                          <Badge variant={h.wouldBeType.includes("LTCG") ? "sage" : "gold"}>
                            {h.wouldBeType.replace("_", " ")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
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
          <strong>Disclaimer:</strong> Tax estimates are approximate. For {fyLabel}: Equity STCG at{" "}
          {stcgRate * 100}%, Equity LTCG at {ltcgRate * 100}% above{" "}
          <Prv>{fmtINRFull(ltcgExemptionLimit)}</Prv> exemption. Debt MFs purchased after 1 Apr 2023
          are taxed at slab rate regardless of holding period, with no LTCG or indexation benefit
          ever, no matter how long they are held. Actual liability may vary based on your income
          slab, surcharge, cess, and indexation benefits. Consult a tax professional for ITR
          filing.
          {fyStartYear === 2024 && (
            <>
              {" "}
              Note: FY2024-25 straddled the 23-Jul-2024 Budget rate change — sales before that
              date were taxed at 15% (STCG) / 10% (LTCG); sales on/after at 20% (STCG) / 12.5%
              (LTCG). Each transaction in the ledger above is taxed at its own correct rate based
              on its actual sale date.
            </>
          )}
        </span>
      </div>
    </div>
  );
};
