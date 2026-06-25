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
import { fmtINR, fmtINRFull, monthsBetween, today, exportArrayToCSV } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";
import { Prv } from "../../context/PrivacyContext";

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ══════════════════════════════════════════════════════════════════ */

const EQUITY_CATEGORIES = [
  "equity", "elss", "flexi", "large cap", "mid cap", "small cap",
  "multi cap", "focused", "sectoral", "thematic", "index", "hybrid",
  "balanced advantage", "aggressive hybrid", "nifty", "sensex",
];

const isEquityMF = (mf: any): boolean => {
  const cat = (mf.category || mf.type || mf.scheme || mf.name || "").toLowerCase();
  return EQUITY_CATEGORIES.some((k) => cat.includes(k));
};

const getHoldingMonths = (buyDate: string, sellDate: string): number => {
  if (!buyDate || !sellDate) return 0;
  return monthsBetween(buyDate, sellDate);
};

const fmtDate = (d: string) => {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const dateToFYStart = (d: string): number => {
  const dt = new Date(d);
  return dt.getMonth() >= 3 ? dt.getFullYear() : dt.getFullYear() - 1;
};

const buildFYOptions = (stockSells: any[], mfSells: any[]): { label: string; startYear: number }[] => {
  const fySet = new Set<number>();
  const now = new Date();
  const currentFYStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  fySet.add(currentFYStart);

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
  const d = new Date(dateStr);
  const fyStart = new Date(fyStartYear, 3, 1);
  const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59);
  return d >= fyStart && d <= fyEnd;
};

/* ── Tax Rate helpers (FY-aware: Budget 2024 rates from FY 2024-25) ── */
const getEquitySTCGRate = (fy: number) => (fy >= 2024 ? 0.20 : 0.15);
const getEquityLTCGRate = (fy: number) => (fy >= 2024 ? 0.125 : 0.10);
const getEquityLTCGExemption = (fy: number) => (fy >= 2024 ? 125000 : 100000);
const DEBT_STCG_SLAB_RATE = 0.30;
const DEBT_LTCG_RATE = 0.20;

/* ── Classification Types ──────────────────────────────────────── */
type GainType = "EQUITY_STCG" | "EQUITY_LTCG" | "DEBT_STCG" | "DEBT_LTCG";

interface ClassifiedSell {
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
  monthsToLTCG: number | null;
}

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

/* ══════════════════════════════════════════════════════════════════
   TRANSACTION TABLE
   ══════════════════════════════════════════════════════════════════ */

const TransactionTable = ({ rows, title, color }: { rows: ClassifiedSell[]; title: string; color: string }) => {
  const [expanded, setExpanded] = useState(true);
  if (!rows.length) return null;

  const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
  const totalTax = rows.reduce((s, r) => s + r.estimatedTax, 0);

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {/* Section header bar (matching TaxVaultTab section headers) */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "10px 16px",
          background: `${color}10`,
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
            <span style={{ fontSize: 12, fontWeight: 700, color: totalProfit >= 0 ? THEME.sage : THEME.rust }}>
              <Prv>P&L: {fmtINRFull(totalProfit)}</Prv>
            </span>
            <span style={{ fontSize: 11, color: THEME.muted, marginLeft: 12 }}>
              <Prv>Tax: {fmtINRFull(totalTax)}</Prv>
            </span>
          </div>
          {expanded ? <ChevronUp size={14} color={THEME.muted} /> : <ChevronDown size={14} color={THEME.muted} />}
        </div>
      </div>
      {expanded && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                  <th key={h} style={{ ...thStyle, textAlign: align as any }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  onMouseEnter={(e) => (e.currentTarget.style.background = `${THEME.accent}06`)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ ...tdStyle, fontWeight: 600, color: THEME.ink, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.name}
                  </td>
                  <td style={tdStyle}>
                    <Badge variant="muted">{r.assetType}</Badge>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: THEME.muted, whiteSpace: "nowrap" }}>{fmtDate(r.buyDate)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}><Prv>{fmtINRFull(r.buyPrice)}</Prv></td>
                  <td style={{ ...tdStyle, textAlign: "right", color: THEME.muted, whiteSpace: "nowrap" }}>{fmtDate(r.sellDate)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}><Prv>{fmtINRFull(r.sellPrice)}</Prv></td>
                  <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>{r.qty}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: THEME.muted, whiteSpace: "nowrap" }}>{r.holdingMonths} mo</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: r.profit >= 0 ? THEME.sage : THEME.rust }}>
                    <Prv>{fmtINRFull(r.profit)}</Prv>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: THEME.muted }}>{(r.taxRate * 100).toFixed(1)}%</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: THEME.rust }}>
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

export const CapitalGainsTab = ({ state }: { state: any }) => {
  const fyOptions = useMemo(
    () => buildFYOptions(state.stockSells || [], state.mfSells || []),
    [state.stockSells, state.mfSells]
  );

  const [fyStartYear, setFyStartYear] = useState(() => {
    const now = new Date();
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  });
  const [activeDetailTab, setActiveDetailTab] = useState<GainType>("EQUITY_STCG");
  const [showUnrealized, setShowUnrealized] = useState(true);
  const [showHarvesting, setShowHarvesting] = useState(true);

  /* ── Classify Sells ──────────────────────────────────────────── */
  const classified = useMemo(() => {
    const result: ClassifiedSell[] = [];

    const stockSells = state.stockSells || [];
    for (const s of stockSells) {
      if (!isInFY(s.sellDate, fyStartYear)) continue;
      const months = getHoldingMonths(s.buyDate, s.sellDate);
      const qty = Number(s.qty) || 0;
      const buyTotal = (Number(s.buyPrice) || 0) * qty;
      const sellTotal = (Number(s.sellPrice) || 0) * qty;
      const profit = s.profit != null ? Number(s.profit) : sellTotal - buyTotal;
      const isLTCG = months >= 12;
      const gainType: GainType = isLTCG ? "EQUITY_LTCG" : "EQUITY_STCG";
      const taxRate = isLTCG ? getEquityLTCGRate(fyStartYear) : getEquitySTCGRate(fyStartYear);

      result.push({
        name: s.symbol || s.name || "Unknown Stock",
        buyDate: s.buyDate, buyPrice: buyTotal,
        sellDate: s.sellDate, sellPrice: sellTotal,
        qty, holdingMonths: months, profit, taxRate,
        estimatedTax: 0, gainType, assetType: "Stock",
      });
    }

    const mfSells = state.mfSells || [];
    for (const m of mfSells) {
      if (!isInFY(m.sellDate, fyStartYear)) continue;
      const months = getHoldingMonths(m.buyDate, m.sellDate);
      const units = Number(m.units || m.qty) || 0;
      const buyTotal = (Number(m.buyNav || m.buyPrice) || 0) * units;
      const sellTotal = (Number(m.sellNav || m.sellPrice) || 0) * units;
      const profit = m.profit != null ? Number(m.profit) : sellTotal - buyTotal;
      const equity = isEquityMF(m);

      let gainType: GainType;
      let taxRate: number;

      if (equity) {
        const isLTCG = months >= 12;
        gainType = isLTCG ? "EQUITY_LTCG" : "EQUITY_STCG";
        taxRate = isLTCG ? getEquityLTCGRate(fyStartYear) : getEquitySTCGRate(fyStartYear);
      } else {
        const buyDate = new Date(m.buyDate);
        const postApr2023 = buyDate >= new Date(2023, 3, 1);
        if (postApr2023) {
          gainType = "DEBT_STCG";
          taxRate = DEBT_STCG_SLAB_RATE;
        } else {
          const isLTCG = months >= 36;
          gainType = isLTCG ? "DEBT_LTCG" : "DEBT_STCG";
          taxRate = isLTCG ? DEBT_LTCG_RATE : DEBT_STCG_SLAB_RATE;
        }
      }

      result.push({
        name: m.name || m.scheme || "Unknown MF",
        buyDate: m.buyDate, buyPrice: buyTotal,
        sellDate: m.sellDate, sellPrice: sellTotal,
        qty: units, holdingMonths: months, profit, taxRate,
        estimatedTax: 0, gainType, assetType: "Mutual Fund",
      });
    }

    return result;
  }, [state.stockSells, state.mfSells, fyStartYear]);

  /* ── Compute Totals by Type ──────────────────────────────────── */
  const { byType, totalTax, ltcgExemptionUsed, ltcgExemptionLimit, stcgRate, ltcgRate } = useMemo(() => {
    const groups: Record<GainType, ClassifiedSell[]> = {
      EQUITY_STCG: [], EQUITY_LTCG: [], DEBT_STCG: [], DEBT_LTCG: [],
    };
    for (const c of classified) groups[c.gainType].push(c);

    const totals: Record<GainType, number> = {
      EQUITY_STCG: groups.EQUITY_STCG.reduce((s, r) => s + r.profit, 0),
      EQUITY_LTCG: groups.EQUITY_LTCG.reduce((s, r) => s + r.profit, 0),
      DEBT_STCG: groups.DEBT_STCG.reduce((s, r) => s + r.profit, 0),
      DEBT_LTCG: groups.DEBT_LTCG.reduce((s, r) => s + r.profit, 0),
    };

    const ltcgExemptionLimit = getEquityLTCGExemption(fyStartYear);
    const stcgRate = getEquitySTCGRate(fyStartYear);
    const ltcgRate = getEquityLTCGRate(fyStartYear);

    const netEquityLTCG = Math.max(0, totals.EQUITY_LTCG);
    const exemptionUsed = Math.min(netEquityLTCG, ltcgExemptionLimit);
    const taxableEquityLTCG = Math.max(0, netEquityLTCG - exemptionUsed);

    const ltcgGains = groups.EQUITY_LTCG.filter((r) => r.profit > 0);
    const totalLTCGProfit = ltcgGains.reduce((s, r) => s + r.profit, 0);

    for (const r of classified) {
      if (r.gainType === "EQUITY_LTCG" && r.profit > 0 && totalLTCGProfit > 0) {
        const share = r.profit / totalLTCGProfit;
        r.estimatedTax = Math.round(taxableEquityLTCG * share * ltcgRate);
      } else if (r.profit > 0) {
        r.estimatedTax = Math.round(r.profit * r.taxRate);
      } else {
        r.estimatedTax = 0;
      }
    }

    const total = Math.round(
      Math.max(0, totals.EQUITY_STCG) * stcgRate +
      taxableEquityLTCG * ltcgRate +
      Math.max(0, totals.DEBT_STCG) * DEBT_STCG_SLAB_RATE +
      Math.max(0, totals.DEBT_LTCG) * DEBT_LTCG_RATE
    );

    return { byType: { groups, totals }, totalTax: total, ltcgExemptionUsed: exemptionUsed, ltcgExemptionLimit, stcgRate, ltcgRate };
  }, [classified, fyStartYear]);

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
      const isLTCG = months >= 12;
      result.push({
        name: s.symbol || s.name || "Unknown",
        buyDate: s.buyDate, buyPrice: buyPrice * qty,
        currentPrice: currentPrice * qty, qty, holdingMonths: months,
        unrealizedPL, wouldBeType: isLTCG ? "EQUITY_LTCG" : "EQUITY_STCG",
        assetType: "Stock", monthsToLTCG: isLTCG ? null : 12 - months,
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
      const isLTCG = months >= ltcgThreshold;

      let wouldBeType: GainType;
      if (equity) {
        wouldBeType = isLTCG ? "EQUITY_LTCG" : "EQUITY_STCG";
      } else {
        const postApr2023 = new Date(bd) >= new Date(2023, 3, 1);
        wouldBeType = postApr2023 ? "DEBT_STCG" : (isLTCG ? "DEBT_LTCG" : "DEBT_STCG");
      }

      result.push({
        name: m.name || m.scheme || "Unknown MF",
        buyDate: bd, buyPrice: buyNav * units,
        currentPrice: currentNav * units, qty: units, holdingMonths: months,
        unrealizedPL, wouldBeType, assetType: "Mutual Fund",
        monthsToLTCG: isLTCG ? null : ltcgThreshold - months,
      });
    }

    return result;
  }, [state.stocks, state.mutualFunds]);

  /* ── Tax-Loss Harvesting Suggestions ─────────────────────────── */
  const harvestingSuggestions = useMemo(() => {
    const losses = unrealized.filter((h) => h.unrealizedPL < 0);
    const realizedSTCG = Math.max(0, byType.totals.EQUITY_STCG);
    const realizedLTCG = Math.max(0, byType.totals.EQUITY_LTCG - ltcgExemptionLimit);

    return losses.map((h) => {
      const absLoss = Math.abs(h.unrealizedPL);
      const isSTCG = h.wouldBeType === "EQUITY_STCG" || h.wouldBeType === "DEBT_STCG";
      const canOffset = isSTCG ? realizedSTCG + realizedLTCG : realizedLTCG;
      const usableLoss = Math.min(absLoss, canOffset);
      const rate = isSTCG ? stcgRate : ltcgRate;
      const potentialSaving = Math.round(usableLoss * rate);
      return { ...h, usableLoss, potentialSaving };
    }).filter((h) => h.potentialSaving > 0)
      .sort((a, b) => b.potentialSaving - a.potentialSaving);
  }, [unrealized, byType.totals, ltcgExemptionLimit, stcgRate, ltcgRate]);

  /* ── CSV Export ──────────────────────────────────────────────── */
  const handleExport = () => {
    const allRows = classified.map((r) => ({
      "Asset Name": r.name, "Asset Type": r.assetType,
      "Gain Category": r.gainType.replace("_", " "),
      "Buy Date": r.buyDate, "Buy Value": Math.round(r.buyPrice),
      "Sell Date": r.sellDate, "Sell Value": Math.round(r.sellPrice),
      Qty: r.qty, "Holding (Months)": r.holdingMonths,
      "Profit/Loss": Math.round(r.profit),
      "Tax Rate": `${(r.taxRate * 100).toFixed(1)}%`,
      "Estimated Tax": r.estimatedTax,
    }));
    if (!allRows.length) return;
    const headers = Object.keys(allRows[0]);
    const csv = [
      headers.join(","),
      ...allRows.map((r) => headers.map((h) => `"${r[h] ?? ""}"`).join(",")),
    ].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Capital_Gains_FY${fyStartYear}-${String(fyStartYear + 1).slice(2)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ── Derived ─────────────────────────────────────────────────── */
  const hasSells = classified.length > 0;
  const hasHoldings = unrealized.length > 0;
  const fyLabel = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;
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
              border: `1px solid ${THEME.accent}26`,
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
          <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 380, margin: "0 auto", lineHeight: 1.6 }}>
            Add stock or mutual fund sell transactions in the Demat or Investments tab to see your capital gains report, tax estimates, and harvesting suggestions.
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
              style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600, minWidth: 130 }}
            >
              {fyOptions.map((fy) => (
                <option key={fy.startYear} value={fy.startYear}>{fy.label}</option>
              ))}
            </select>
            {hasSells && (
              <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport}>
                Export CSV
              </Button>
            )}
          </div>
        }
      >
        Capital Gains Report
      </SectionTitle>

      {/* ── Summary StatCards (standard component) ────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <StatCard
          icon={<TrendingUp />}
          label="Total Realized P&L"
          value={fmtINRFull(totalRealizedPL)}
          sub={`${classified.length} transactions in ${fyLabel}`}
          subColor={totalRealizedPL >= 0 ? THEME.sage : THEME.rust}
          color={totalRealizedPL >= 0 ? THEME.sage : THEME.rust}
        />
        <StatCard
          icon={<IndianRupee />}
          label="Estimated Tax"
          value={fmtINRFull(totalTax)}
          sub="Across all gain categories"
          color={THEME.rust}
        />
        <StatCard
          icon={<Shield />}
          label="LTCG Exemption Used"
          value={fmtINRFull(ltcgExemptionUsed)}
          sub={`of ${fmtINRFull(ltcgExemptionLimit)} (Sec 112A)`}
          subColor={ltcgExemptionUsed >= ltcgExemptionLimit ? THEME.sage : undefined}
          color={THEME.sage}
        />
        <StatCard
          icon={<Scissors />}
          label="Harvesting Potential"
          value={fmtINRFull(harvestingSuggestions.reduce((s, h) => s + h.potentialSaving, 0))}
          sub={`${harvestingSuggestions.length} opportunities`}
          color={THEME.gold}
        />
      </div>

      {/* ── Gain Breakdown Cards ──────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        {[
          { label: "Equity STCG", key: "EQUITY_STCG" as GainType, rate: `${(stcgRate * 100)}%`, color: THEME.gold, icon: <TrendingUp /> },
          { label: "Equity LTCG", key: "EQUITY_LTCG" as GainType, rate: `${(ltcgRate * 100)}%`, color: THEME.sage, icon: <TrendingUp /> },
          { label: "Debt STCG", key: "DEBT_STCG" as GainType, rate: "~30% slab", color: THEME.rust, icon: <BarChart3 /> },
          { label: "Debt LTCG", key: "DEBT_LTCG" as GainType, rate: "20%", color: THEME.accent, icon: <BarChart3 /> },
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
              <span style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {g.label}
              </span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: byType.totals[g.key] >= 0 ? THEME.sage : THEME.rust, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
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
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                LTCG Exemption (Sec 112A)
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                {fyLabel} · Equity long-term gains
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: THEME.sage, letterSpacing: "-0.02em" }}>
              <Prv>{fmtINRFull(ltcgExemptionUsed)}</Prv>
            </span>
            <span style={{ fontSize: 12, color: THEME.muted, marginLeft: 4 }}>/ {fmtINRFull(ltcgExemptionLimit)}</span>
          </div>
        </div>
        <div style={{ width: "100%", height: 6, borderRadius: 6, background: "var(--surface-2)" }}>
          <div
            style={{
              width: `${Math.min(100, (ltcgExemptionUsed / ltcgExemptionLimit) * 100)}%`,
              height: "100%",
              borderRadius: 6,
              background: THEME.sage,
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <div style={{ fontSize: 10, color: THEME.muted, marginTop: 6 }}>
          {ltcgExemptionUsed >= ltcgExemptionLimit
            ? "Exemption fully utilized"
            : `${fmtINRFull(ltcgExemptionLimit - ltcgExemptionUsed)} remaining exemption`}
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
                  style={{
                    background: active ? `${t.color}15` : "transparent",
                    border: `1.5px solid ${active ? `${t.color}30` : THEME.line}`,
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
                        background: active ? t.color : `${THEME.muted}`,
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
            />
          ) : (
            <div style={{ padding: "32px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${THEME.accent}12`, border: `1px solid ${THEME.accent}26`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={18} color={THEME.accent} />
              </div>
              <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 500 }}>
                No {detailTabs.find((t) => t.key === activeDetailTab)?.label} transactions in {fyLabel}
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
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: showUnrealized ? 16 : 0 }}
          >
            <CardHeading icon={Clock} title="Unrealized Gains (Current Holdings)" />
            {showUnrealized ? <ChevronUp size={16} color={THEME.muted} /> : <ChevronDown size={16} color={THEME.muted} />}
          </div>

          {showUnrealized && (
            <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${THEME.line}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                      <th key={h} style={{ ...thStyle, textAlign: align as any }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unrealized.map((h, i) => (
                    <tr
                      key={i}
                      onMouseEnter={(e) => (e.currentTarget.style.background = `${THEME.accent}06`)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ ...tdStyle, fontWeight: 600, color: THEME.ink, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {h.name}
                      </td>
                      <td style={tdStyle}><Badge variant="muted">{h.assetType}</Badge></td>
                      <td style={{ ...tdStyle, textAlign: "right", color: THEME.muted, whiteSpace: "nowrap" }}>{fmtDate(h.buyDate)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}><Prv>{fmtINRFull(h.buyPrice)}</Prv></td>
                      <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}><Prv>{fmtINRFull(h.currentPrice)}</Prv></td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: h.unrealizedPL >= 0 ? THEME.sage : THEME.rust }}>
                        <Prv>{fmtINRFull(h.unrealizedPL)}</Prv>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: THEME.muted, whiteSpace: "nowrap" }}>{h.holdingMonths} mo</td>
                      <td style={tdStyle}>
                        <Badge variant={h.wouldBeType.includes("LTCG") ? "sage" : "gold"}>
                          {h.wouldBeType.replace("_", " ")}
                        </Badge>
                      </td>
                      <td style={{ ...tdStyle, color: THEME.muted, whiteSpace: "nowrap" }}>
                        {h.monthsToLTCG != null ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={11} />{h.monthsToLTCG} mo
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
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: showHarvesting ? 16 : 0 }}
          >
            <CardHeading icon={Scissors} title="Tax-Loss Harvesting Suggestions" color={THEME.gold} />
            {showHarvesting ? <ChevronUp size={16} color={THEME.muted} /> : <ChevronDown size={16} color={THEME.muted} />}
          </div>

          {showHarvesting && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Info banner */}
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: `${THEME.gold}09`,
                  border: `1px solid ${THEME.gold}22`,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: 12,
                  color: THEME.muted,
                }}
              >
                <Lightbulb size={15} color={THEME.gold} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  You have <strong style={{ color: THEME.ink }}>{harvestingSuggestions.length} holdings</strong> with unrealized losses.
                  Selling them could save up to{" "}
                  <strong style={{ color: THEME.sage }}>
                    <Prv>{fmtINRFull(harvestingSuggestions.reduce((s, h) => s + h.potentialSaving, 0))}</Prv>
                  </strong>{" "}
                  in taxes by offsetting realized gains.
                </span>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${THEME.line}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                        <th key={h} style={{ ...thStyle, textAlign: align as any }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {harvestingSuggestions.map((h, i) => (
                      <tr
                        key={i}
                        onMouseEnter={(e) => (e.currentTarget.style.background = `${THEME.gold}06`)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ ...tdStyle, fontWeight: 600, color: THEME.ink, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {h.name}
                        </td>
                        <td style={tdStyle}><Badge variant="muted">{h.assetType}</Badge></td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: THEME.rust }}>
                          <Prv>{fmtINRFull(h.unrealizedPL)}</Prv>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: THEME.ink }}>
                          <Prv>{fmtINRFull(h.usableLoss)}</Prv>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: THEME.sage }}>
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
          background: `${THEME.muted}09`,
          border: `1px solid ${THEME.muted}22`,
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
          <strong>Disclaimer:</strong> Tax estimates are approximate.
          For {fyLabel}: Equity STCG at {(stcgRate * 100)}%, Equity LTCG at {(ltcgRate * 100)}% above {fmtINRFull(ltcgExemptionLimit)} exemption.
          Debt MFs purchased after 1 Apr 2023 are taxed at slab rate regardless of holding period.
          Actual liability may vary based on your income slab, surcharge, cess, and indexation benefits.
          Consult a tax professional for ITR filing.
        </span>
      </div>
    </div>
  );
};
