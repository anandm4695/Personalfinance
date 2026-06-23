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

/** Build FY options from 2023-24 to current + 1 */
const buildFYOptions = (): { label: string; startYear: number }[] => {
  const now = new Date();
  const currentFYStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const opts: { label: string; startYear: number }[] = [];
  for (let y = 2023; y <= currentFYStart + 1; y++) {
    opts.push({ label: `FY ${y}-${String(y + 1).slice(2)}`, startYear: y });
  }
  return opts.reverse();
};

const FY_OPTIONS = buildFYOptions();

/** Check if a date falls within a financial year (Apr 1 to Mar 31) */
const isInFY = (dateStr: string, fyStartYear: number): boolean => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const fyStart = new Date(fyStartYear, 3, 1); // Apr 1
  const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59); // Mar 31
  return d >= fyStart && d <= fyEnd;
};

/* ── Tax Rate Constants (Post Budget 2024) ─────────────────────── */
const EQUITY_STCG_RATE = 0.20;         // 20%
const EQUITY_LTCG_RATE = 0.125;        // 12.5%
const EQUITY_LTCG_EXEMPTION = 125000;  // Rs 1.25L
const DEBT_STCG_SLAB_RATE = 0.30;      // assumed highest slab for estimate
const DEBT_LTCG_RATE = 0.20;           // 20% with indexation (pre-Apr 2023)
// Post Apr 2023 debt MF purchases: always taxed at slab rate (no LTCG benefit)

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
   SUMMARY CARD COMPONENT
   ══════════════════════════════════════════════════════════════════ */

const SummaryCard = ({ icon: Icon, label, value, sub, color, gradient }: any) => (
  <Card style={{ padding: 20, minWidth: 0 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} color="#fff" />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, letterSpacing: "0.02em" }}>
        {label}
      </span>
    </div>
    <div style={{ fontSize: 22, fontWeight: 800, color: color || THEME.ink, letterSpacing: "-0.02em" }}>
      <Prv>{fmtINRFull(value)}</Prv>
    </div>
    {sub && (
      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>{sub}</div>
    )}
  </Card>
);

/* ══════════════════════════════════════════════════════════════════
   TRANSACTION TABLE
   ══════════════════════════════════════════════════════════════════ */

const TransactionTable = ({ rows, title }: { rows: ClassifiedSell[]; title: string }) => {
  const [expanded, setExpanded] = useState(true);
  if (!rows.length) return null;

  const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
  const totalTax = rows.reduce((s, r) => s + r.estimatedTax, 0);

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          borderBottom: expanded ? `1px solid ${THEME.line}` : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>{title}</span>
          <Badge variant={totalProfit >= 0 ? "sage" : "rust"}>{rows.length} txns</Badge>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: totalProfit >= 0 ? THEME.sage : THEME.rust }}>
              <Prv>P&L: {fmtINRFull(totalProfit)}</Prv>
            </div>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              <Prv>Tax: {fmtINRFull(totalTax)}</Prv>
            </div>
          </div>
          {expanded ? <ChevronUp size={16} color={THEME.muted} /> : <ChevronDown size={16} color={THEME.muted} />}
        </div>
      </div>
      {expanded && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: `${THEME.accent}08` }}>
                {["Asset", "Type", "Buy Date", "Buy Price", "Sell Date", "Sell Price", "Qty", "Holding", "P&L", "Tax Rate", "Est. Tax"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: h === "Asset" || h === "Type" ? "left" : "right",
                      fontWeight: 600,
                      color: THEME.muted,
                      fontSize: 11,
                      letterSpacing: "0.03em",
                      whiteSpace: "nowrap",
                      borderBottom: `1px solid ${THEME.line}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: `1px solid ${THEME.line}`,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = `${THEME.accent}06`)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: THEME.ink, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.name}
                  </td>
                  <td style={{ padding: "10px 12px", color: THEME.muted, fontSize: 11 }}>
                    <Badge variant="muted">{r.assetType}</Badge>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: THEME.muted, whiteSpace: "nowrap" }}>{fmtDate(r.buyDate)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: THEME.ink }}><Prv>{fmtINRFull(r.buyPrice)}</Prv></td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: THEME.muted, whiteSpace: "nowrap" }}>{fmtDate(r.sellDate)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: THEME.ink }}><Prv>{fmtINRFull(r.sellPrice)}</Prv></td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: THEME.ink }}>{r.qty}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: THEME.muted, whiteSpace: "nowrap" }}>
                    {r.holdingMonths} mo
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: r.profit >= 0 ? THEME.sage : THEME.rust }}>
                    <Prv>{fmtINRFull(r.profit)}</Prv>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: THEME.muted }}>
                    {(r.taxRate * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: THEME.rust }}>
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

    // Stock sells
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
      const taxRate = isLTCG ? EQUITY_LTCG_RATE : EQUITY_STCG_RATE;

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
        estimatedTax: 0, // computed after exemption
        gainType,
        assetType: "Stock",
      });
    }

    // MF sells
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
        taxRate = isLTCG ? EQUITY_LTCG_RATE : EQUITY_STCG_RATE;
      } else {
        // Debt MF: post-Apr 2023 purchases have no LTCG benefit
        const buyDate = new Date(m.buyDate);
        const postApr2023 = buyDate >= new Date(2023, 3, 1);
        if (postApr2023) {
          // Always taxed at slab rate regardless of holding period
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
      });
    }

    return result;
  }, [state.stockSells, state.mfSells, fyStartYear]);

  /* ── Compute Totals by Type ──────────────────────────────────── */
  const { byType, totalTax, ltcgExemptionUsed } = useMemo(() => {
    const groups: Record<GainType, ClassifiedSell[]> = {
      EQUITY_STCG: [],
      EQUITY_LTCG: [],
      DEBT_STCG: [],
      DEBT_LTCG: [],
    };

    for (const c of classified) {
      groups[c.gainType].push(c);
    }

    // Compute totals
    const totals: Record<GainType, number> = {
      EQUITY_STCG: groups.EQUITY_STCG.reduce((s, r) => s + r.profit, 0),
      EQUITY_LTCG: groups.EQUITY_LTCG.reduce((s, r) => s + r.profit, 0),
      DEBT_STCG: groups.DEBT_STCG.reduce((s, r) => s + r.profit, 0),
      DEBT_LTCG: groups.DEBT_LTCG.reduce((s, r) => s + r.profit, 0),
    };

    // LTCG exemption of 1.25L (only on net positive equity LTCG gains)
    const netEquityLTCG = Math.max(0, totals.EQUITY_LTCG);
    const exemptionUsed = Math.min(netEquityLTCG, EQUITY_LTCG_EXEMPTION);
    const taxableEquityLTCG = Math.max(0, netEquityLTCG - exemptionUsed);

    // Compute estimated tax for each row (distribute exemption proportionally for LTCG)
    const ltcgGains = groups.EQUITY_LTCG.filter((r) => r.profit > 0);
    const totalLTCGProfit = ltcgGains.reduce((s, r) => s + r.profit, 0);

    for (const r of classified) {
      if (r.gainType === "EQUITY_LTCG" && r.profit > 0 && totalLTCGProfit > 0) {
        const share = r.profit / totalLTCGProfit;
        const taxableShare = taxableEquityLTCG * share;
        r.estimatedTax = Math.round(taxableShare * EQUITY_LTCG_RATE);
      } else if (r.profit > 0) {
        r.estimatedTax = Math.round(r.profit * r.taxRate);
      } else {
        r.estimatedTax = 0;
      }
    }

    // Equity STCG tax
    const equitySTCGTax = Math.max(0, totals.EQUITY_STCG) * EQUITY_STCG_RATE;
    // Equity LTCG tax (after exemption)
    const equityLTCGTax = taxableEquityLTCG * EQUITY_LTCG_RATE;
    // Debt STCG tax
    const debtSTCGTax = Math.max(0, totals.DEBT_STCG) * DEBT_STCG_SLAB_RATE;
    // Debt LTCG tax
    const debtLTCGTax = Math.max(0, totals.DEBT_LTCG) * DEBT_LTCG_RATE;

    const total = Math.round(equitySTCGTax + equityLTCGTax + debtSTCGTax + debtLTCGTax);

    return {
      byType: { groups, totals },
      totalTax: total,
      ltcgExemptionUsed: exemptionUsed,
    };
  }, [classified]);

  /* ── Unrealized Gains ────────────────────────────────────────── */
  const unrealized = useMemo(() => {
    const result: UnrealizedHolding[] = [];
    const todayStr = today();

    // Stocks
    const stocks = state.stocks || [];
    for (const s of stocks) {
      if (!s.buyDate) continue;
      const qty = Number(s.qty) || 0;
      const buyPrice = Number(s.buyPrice || s.avgPrice) || 0;
      const currentPrice = Number(s.currentPrice || s.ltp || s.price) || 0;
      const months = getHoldingMonths(s.buyDate, todayStr);
      const unrealizedPL = (currentPrice - buyPrice) * qty;
      const isLTCG = months >= 12;
      const wouldBeType: GainType = isLTCG ? "EQUITY_LTCG" : "EQUITY_STCG";
      const monthsToLTCG = isLTCG ? null : 12 - months;

      result.push({
        name: s.symbol || s.name || "Unknown",
        buyDate: s.buyDate,
        buyPrice: buyPrice * qty,
        currentPrice: currentPrice * qty,
        qty,
        holdingMonths: months,
        unrealizedPL,
        wouldBeType,
        assetType: "Stock",
        monthsToLTCG,
      });
    }

    // Mutual Funds
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
        if (postApr2023) {
          wouldBeType = "DEBT_STCG"; // always STCG for post-Apr 2023 debt
        } else {
          wouldBeType = isLTCG ? "DEBT_LTCG" : "DEBT_STCG";
        }
      }

      const monthsToLTCG = isLTCG ? null : ltcgThreshold - months;

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
  const harvestingSuggestions = useMemo(() => {
    const losses = unrealized.filter((h) => h.unrealizedPL < 0);
    const realizedSTCG = Math.max(0, byType.totals.EQUITY_STCG);
    const realizedLTCG = Math.max(0, byType.totals.EQUITY_LTCG - EQUITY_LTCG_EXEMPTION);

    return losses.map((h) => {
      const absLoss = Math.abs(h.unrealizedPL);
      // STCG losses can offset both STCG + LTCG; LTCG losses only offset LTCG
      const isSTCG = h.wouldBeType === "EQUITY_STCG" || h.wouldBeType === "DEBT_STCG";
      const canOffset = isSTCG ? realizedSTCG + realizedLTCG : realizedLTCG;
      const usableLoss = Math.min(absLoss, canOffset);
      const taxRate = isSTCG ? EQUITY_STCG_RATE : EQUITY_LTCG_RATE;
      const potentialSaving = Math.round(usableLoss * taxRate);

      return { ...h, usableLoss, potentialSaving };
    }).filter((h) => h.potentialSaving > 0)
      .sort((a, b) => b.potentialSaving - a.potentialSaving);
  }, [unrealized, byType.totals]);

  /* ── CSV Export ──────────────────────────────────────────────── */
  const handleExport = () => {
    const allRows = classified.map((r) => ({
      "Asset Name": r.name,
      "Asset Type": r.assetType,
      "Gain Category": r.gainType.replace("_", " "),
      "Buy Date": r.buyDate,
      "Buy Value": Math.round(r.buyPrice),
      "Sell Date": r.sellDate,
      "Sell Value": Math.round(r.sellPrice),
      Qty: r.qty,
      "Holding (Months)": r.holdingMonths,
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

  /* ── No Data State ───────────────────────────────────────────── */
  const hasSells = classified.length > 0;
  const hasHoldings = unrealized.length > 0;

  if (!hasSells && !hasHoldings) {
    return (
      <div style={{ padding: "0 0 40px" }}>
        <SectionTitle sub="Capital gains report for ITR filing with tax estimates and harvesting insights">
          Capital Gains Report
        </SectionTitle>
        <Card style={{ padding: "48px 32px", textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: "linear-gradient(135deg, #4F46E5, #818CF8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <FileText size={30} color="#fff" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
            No Capital Gains Data
          </div>
          <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 380, margin: "0 auto", lineHeight: 1.6 }}>
            Add stock or mutual fund sell transactions in the Demat or Investments tab to see your capital gains report, tax estimates, and harvesting suggestions.
          </div>
        </Card>
      </div>
    );
  }

  /* ── Detail Tabs Config ──────────────────────────────────────── */
  const detailTabs: { key: GainType; label: string; color: string }[] = [
    { key: "EQUITY_STCG", label: "Equity STCG", color: THEME.gold },
    { key: "EQUITY_LTCG", label: "Equity LTCG", color: THEME.sage },
    { key: "DEBT_STCG", label: "Debt STCG", color: THEME.rust },
    { key: "DEBT_LTCG", label: "Debt LTCG", color: THEME.accent },
  ];

  const fyLabel = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;

  return (
    <div style={{ padding: "0 0 40px", display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <SectionTitle
        sub="Capital gains report for ITR filing with tax estimates, LTCG exemption tracking, and tax-loss harvesting insights"
        rightElement={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select
              value={fyStartYear}
              onChange={(e) => setFyStartYear(Number(e.target.value))}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: `1.5px solid ${THEME.line}`,
                background: "transparent",
                color: THEME.ink,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              {FY_OPTIONS.map((fy) => (
                <option key={fy.startYear} value={fy.startYear}>
                  {fy.label}
                </option>
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

      {/* ── Summary Cards ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <SummaryCard
          icon={TrendingUp}
          label="Equity STCG"
          value={byType.totals.EQUITY_STCG}
          sub={`Tax @ 20%: ${fmtINR(Math.max(0, byType.totals.EQUITY_STCG) * EQUITY_STCG_RATE)}`}
          color={byType.totals.EQUITY_STCG >= 0 ? THEME.sage : THEME.rust}
          gradient="linear-gradient(135deg, #D97706, #FBBF24)"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Equity LTCG"
          value={byType.totals.EQUITY_LTCG}
          sub={`Tax @ 12.5% (above ₹1.25L): ${fmtINR(Math.max(0, byType.totals.EQUITY_LTCG - EQUITY_LTCG_EXEMPTION) * EQUITY_LTCG_RATE)}`}
          color={byType.totals.EQUITY_LTCG >= 0 ? THEME.sage : THEME.rust}
          gradient="linear-gradient(135deg, #059669, #34D399)"
        />
        <SummaryCard
          icon={BarChart3}
          label="Debt STCG"
          value={byType.totals.DEBT_STCG}
          sub={`Taxed at slab rate (~30%): ${fmtINR(Math.max(0, byType.totals.DEBT_STCG) * DEBT_STCG_SLAB_RATE)}`}
          color={byType.totals.DEBT_STCG >= 0 ? THEME.sage : THEME.rust}
          gradient="linear-gradient(135deg, #B91C1C, #FCA5A5)"
        />
        <SummaryCard
          icon={BarChart3}
          label="Debt LTCG"
          value={byType.totals.DEBT_LTCG}
          sub={`Tax @ 20% (indexation): ${fmtINR(Math.max(0, byType.totals.DEBT_LTCG) * DEBT_LTCG_RATE)}`}
          color={byType.totals.DEBT_LTCG >= 0 ? THEME.sage : THEME.rust}
          gradient="linear-gradient(135deg, #4F46E5, #818CF8)"
        />
      </div>

      {/* ── Tax Liability + Exemption Row ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #B91C1C, #F87171)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IndianRupee size={18} color="#fff" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: THEME.muted }}>TOTAL ESTIMATED TAX</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: THEME.rust, letterSpacing: "-0.02em" }}>
            <Prv>{fmtINRFull(totalTax)}</Prv>
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
            Across all capital gain categories for {fyLabel}
          </div>
        </Card>

        <Card style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #059669, #34D399)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={18} color="#fff" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: THEME.muted }}>LTCG EXEMPTION (Sec 112A)</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: THEME.sage, letterSpacing: "-0.02em" }}>
              <Prv>{fmtINRFull(ltcgExemptionUsed)}</Prv>
            </span>
            <span style={{ fontSize: 13, color: THEME.muted }}>/ {fmtINRFull(EQUITY_LTCG_EXEMPTION)}</span>
          </div>
          {/* Exemption progress bar */}
          <div
            style={{
              marginTop: 12,
              height: 6,
              borderRadius: 3,
              background: `${THEME.line}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, (ltcgExemptionUsed / EQUITY_LTCG_EXEMPTION) * 100)}%`,
                borderRadius: 3,
                background: "linear-gradient(90deg, #059669, #34D399)",
                transition: "width 0.5s ease",
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            {ltcgExemptionUsed >= EQUITY_LTCG_EXEMPTION
              ? "Exemption fully utilized"
              : `${fmtINRFull(EQUITY_LTCG_EXEMPTION - ltcgExemptionUsed)} remaining exemption`}
          </div>
        </Card>
      </div>

      {/* ── Detailed Transactions ─────────────────────────────────── */}
      {hasSells && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: -12 }}>
            <FileText size={18} color={THEME.accent} />
            <span style={{ fontSize: 16, fontWeight: 700, color: THEME.ink }}>Transaction Details</span>
          </div>

          {/* Sub-tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {detailTabs.map((t) => {
              const active = activeDetailTab === t.key;
              const count = byType.groups[t.key].length;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveDetailTab(t.key)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: `1.5px solid ${active ? t.color : THEME.line}`,
                    background: active ? `${t.color}14` : "transparent",
                    color: active ? t.color : THEME.muted,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s ease",
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
                        fontSize: 11,
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

          {/* Active table */}
          {byType.groups[activeDetailTab].length > 0 ? (
            <TransactionTable
              rows={byType.groups[activeDetailTab]}
              title={detailTabs.find((t) => t.key === activeDetailTab)?.label || ""}
            />
          ) : (
            <Card style={{ padding: "32px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 14, color: THEME.muted }}>
                No {detailTabs.find((t) => t.key === activeDetailTab)?.label} transactions in {fyLabel}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Unrealized Gains ──────────────────────────────────────── */}
      {hasHoldings && (
        <>
          <div
            onClick={() => setShowUnrealized(!showUnrealized)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              marginBottom: -12,
            }}
          >
            <Clock size={18} color={THEME.accent} />
            <span style={{ fontSize: 16, fontWeight: 700, color: THEME.ink }}>Unrealized Gains (Current Holdings)</span>
            {showUnrealized ? <ChevronUp size={16} color={THEME.muted} /> : <ChevronDown size={16} color={THEME.muted} />}
          </div>

          {showUnrealized && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: `${THEME.accent}08` }}>
                      {["Asset", "Type", "Buy Date", "Invested", "Current", "P&L", "Holding", "Classification", "To LTCG"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 12px",
                            textAlign: h === "Asset" || h === "Type" || h === "Classification" || h === "To LTCG" ? "left" : "right",
                            fontWeight: 600,
                            color: THEME.muted,
                            fontSize: 11,
                            letterSpacing: "0.03em",
                            whiteSpace: "nowrap",
                            borderBottom: `1px solid ${THEME.line}`,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {unrealized.map((h, i) => (
                      <tr
                        key={i}
                        style={{ borderBottom: `1px solid ${THEME.line}` }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = `${THEME.accent}06`)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: THEME.ink, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {h.name}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <Badge variant="muted">{h.assetType}</Badge>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: THEME.muted, whiteSpace: "nowrap" }}>{fmtDate(h.buyDate)}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: THEME.ink }}><Prv>{fmtINRFull(h.buyPrice)}</Prv></td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: THEME.ink }}><Prv>{fmtINRFull(h.currentPrice)}</Prv></td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: h.unrealizedPL >= 0 ? THEME.sage : THEME.rust }}>
                          <Prv>{fmtINRFull(h.unrealizedPL)}</Prv>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: THEME.muted, whiteSpace: "nowrap" }}>
                          {h.holdingMonths} mo
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <Badge variant={h.wouldBeType.includes("LTCG") ? "sage" : "gold"}>
                            {h.wouldBeType.replace("_", " ")}
                          </Badge>
                        </td>
                        <td style={{ padding: "10px 12px", color: THEME.muted, whiteSpace: "nowrap" }}>
                          {h.monthsToLTCG != null ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <Clock size={12} />
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
            </Card>
          )}
        </>
      )}

      {/* ── Tax-Loss Harvesting ───────────────────────────────────── */}
      {harvestingSuggestions.length > 0 && (
        <>
          <div
            onClick={() => setShowHarvesting(!showHarvesting)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              marginBottom: -12,
            }}
          >
            <Scissors size={18} color={THEME.gold} />
            <span style={{ fontSize: 16, fontWeight: 700, color: THEME.ink }}>Tax-Loss Harvesting Suggestions</span>
            {showHarvesting ? <ChevronUp size={16} color={THEME.muted} /> : <ChevronDown size={16} color={THEME.muted} />}
          </div>

          {showHarvesting && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Summary insight */}
              <Card style={{ padding: 16, borderLeft: `3px solid ${THEME.gold}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Lightbulb size={16} color={THEME.gold} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>Harvesting Opportunity</span>
                </div>
                <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.6 }}>
                  You have{" "}
                  <strong style={{ color: THEME.ink }}>{harvestingSuggestions.length} holdings</strong> with unrealized losses.
                  Selling them could save up to{" "}
                  <strong style={{ color: THEME.sage }}>
                    <Prv>{fmtINRFull(harvestingSuggestions.reduce((s, h) => s + h.potentialSaving, 0))}</Prv>
                  </strong>{" "}
                  in taxes by offsetting realized gains.
                </div>
              </Card>

              {/* Individual suggestions */}
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: `${THEME.gold}10` }}>
                        {["Asset", "Type", "Unrealized Loss", "Usable Loss", "Potential Tax Saving", "Classification"].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 12px",
                              textAlign: h === "Asset" || h === "Type" || h === "Classification" ? "left" : "right",
                              fontWeight: 600,
                              color: THEME.muted,
                              fontSize: 11,
                              letterSpacing: "0.03em",
                              whiteSpace: "nowrap",
                              borderBottom: `1px solid ${THEME.line}`,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {harvestingSuggestions.map((h, i) => (
                        <tr
                          key={i}
                          style={{ borderBottom: `1px solid ${THEME.line}` }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = `${THEME.gold}06`)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: THEME.ink, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {h.name}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <Badge variant="muted">{h.assetType}</Badge>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: THEME.rust }}>
                            <Prv>{fmtINRFull(h.unrealizedPL)}</Prv>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: THEME.ink }}>
                            <Prv>{fmtINRFull(h.usableLoss)}</Prv>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: THEME.sage }}>
                            <Prv>{fmtINRFull(h.potentialSaving)}</Prv>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <Badge variant={h.wouldBeType.includes("LTCG") ? "sage" : "gold"}>
                              {h.wouldBeType.replace("_", " ")}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ── Disclaimer ────────────────────────────────────────────── */}
      <Card style={{ padding: 14, borderLeft: `3px solid ${THEME.muted}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <Info size={14} color={THEME.muted} style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.6 }}>
            <strong>Disclaimer:</strong> Tax estimates are approximate and based on Budget 2024 rates.
            Equity STCG is taxed at 20%, Equity LTCG at 12.5% above the ₹1.25L exemption.
            Debt MFs purchased after 1 Apr 2023 are taxed at slab rate regardless of holding period.
            Actual liability may vary based on your income slab, surcharge, cess, and indexation benefits.
            Consult a tax professional for ITR filing.
          </div>
        </div>
      </Card>
    </div>
  );
};
