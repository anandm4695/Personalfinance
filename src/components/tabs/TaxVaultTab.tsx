// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Calculator, Shield, History, Plus, Trash2, Calendar, Target,
  CheckCircle2, TrendingUp, HelpCircle, Sparkles, BookOpen,
  Percent, RefreshCw, ArrowLeftRight, Info, AlertTriangle, Download
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, calcTaxNew, calcTaxOld, today, uid } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Field, Input } from "../ui/Form";
import { SectionTitle } from "../ui/SectionTitle";
import { Modal, ModalActions } from "../ui/Modal";

// FY 2025-26 standard deductions
const STD_DED_NEW = 75000;
const STD_DED_OLD = 50000;

/* ══════════════════════════════════════════════════════════════════════
   HELPERS & MODALS
   ══════════════════════════════════════════════════════════════════════ */

const AddTaxPaymentModal = ({ onClose, onSave }: any) => {
  const [f, setF] = useState({ date: today(), type: "TDS", amount: "", note: "" });
  const types = ["TDS", "Advance Tax", "Self-Assessment", "Professional Tax"];

  return (
    <Modal title="Record Tax Payment" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Payment Date">
          <input className="form-input" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label="Type">
          <select className="form-input" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Amount (₹)">
        <input className="form-input" type="number" placeholder="0" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
      </Field>
      <Field label="Note / Reference">
        <input className="form-input" placeholder="e.g. Q2 Advance Tax, Salary TDS" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
      </Field>
      <ModalActions onSave={() => f.amount && onSave(f)} onClose={onClose} saveLabel="Record Payment" />
    </Modal>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */

interface TaxVaultTabProps {
  state: any;
  metrics: any;
  addItem: any;
  removeItem: any;
  updateItem: any;
}

export const TaxVaultTab: React.FC<TaxVaultTabProps> = ({ state, metrics, addItem, removeItem }) => {
  const [activeRegime, setActiveRegime] = useState<"new" | "old">(state.profile.regime || "new");
  const [showModal, setShowModal] = useState(false);
  const [subTab, setSubTab] = useState<"income" | "capitalGains">("income");
  const [incomeOverride, setIncomeOverride] = useState<string>("");
  const [simulatedHarvestIds, setSimulatedHarvestIds] = useState<string[]>([]);

  // 1. FY date range helper
  const fyParts = (state.profile?.fy || "2025-26").split("-");
  const fyStartYear = Number(fyParts[0]) || new Date().getFullYear() - 1;
  const fyStartStr = `${fyStartYear}-04-01`;
  const fyEndStr = `${fyStartYear + 1}-03-31`;
  const inFY = (dateStr: string) => dateStr && dateStr >= fyStartStr && dateStr <= fyEndStr;

  /* ══════════════════════════════════════════════════════════════════════
     MEMOIZED CAPITAL GAINS COMPUTATIONS
     ══════════════════════════════════════════════════════════════════════ */
  const realizedGainsData = useMemo(() => {
    const stockSells = state.stockSells || [];
    const mfSells = state.mfSells || [];

    const fyStockSells = stockSells.filter((s: any) => inFY(s.sellDate));
    const fyMfSells = mfSells.filter((m: any) => inFY(m.sellDate));

    const allSells: any[] = [];

    // Map stocks
    fyStockSells.forEach((s: any) => {
      const buyPrice = Number(s.buyPrice) || 0;
      const sellPrice = Number(s.sellPrice) || 0;
      const qty = Number(s.qty) || 0;
      const profit = (s.profit != null && s.profit !== "") ? Number(s.profit) : (sellPrice - buyPrice) * qty;

      let days = 0;
      if (s.buyDate && s.sellDate) {
        days = Math.max(0, Math.ceil((new Date(s.sellDate).getTime() - new Date(s.buyDate).getTime()) / 86400000));
      }
      const isLtcg = days > 365;

      allSells.push({
        id: s.id,
        name: s.symbol,
        type: "Stock",
        qty,
        buyPrice,
        sellPrice,
        buyDate: s.buyDate,
        sellDate: s.sellDate,
        profit,
        isLtcg,
        days
      });
    });

    // Map mutual funds
    fyMfSells.forEach((m: any) => {
      const buyNav = Number(m.buyNav) || Number(m.avgPrice) || 0;
      const sellNav = Number(m.sellNav) || Number(m.sellPrice) || 0;
      const qty = Number(m.qty) || Number(m.units) || 0;
      const profit = (m.profit != null && m.profit !== "") ? Number(m.profit) : (sellNav - buyNav) * qty;

      let days = 0;
      if (m.buyDate && m.sellDate) {
        days = Math.max(0, Math.ceil((new Date(m.sellDate).getTime() - new Date(m.buyDate).getTime()) / 86400000));
      }
      const isLtcg = days > 365;

      allSells.push({
        id: m.id,
        name: m.name || m.symbol,
        type: "Mutual Fund",
        qty,
        buyPrice: buyNav,
        sellPrice: sellNav,
        buyDate: m.buyDate,
        sellDate: m.sellDate,
        profit,
        isLtcg,
        days
      });
    });

    allSells.sort((a, b) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime());

    let stcgGains = 0;
    let stcgLosses = 0;
    let ltcgGains = 0;
    let ltcgLosses = 0;

    allSells.forEach(s => {
      if (s.isLtcg) {
        if (s.profit > 0) ltcgGains += s.profit;
        else ltcgLosses += Math.abs(s.profit);
      } else {
        if (s.profit > 0) stcgGains += s.profit;
        else stcgLosses += Math.abs(s.profit);
      }
    });

    return {
      allSells,
      stcgGains,
      stcgLosses,
      ltcgGains,
      ltcgLosses
    };
  }, [state.stockSells, state.mfSells, state.profile.fy]);

  /* ══════════════════════════════════════════════════════════════════════
     MEMOIZED UNREALIZED LOSS HARVEST CANDIDATES
     ══════════════════════════════════════════════════════════════════════ */
  const harvestCandidates = useMemo(() => {
    const stocks = state.stocks || [];
    const mutualFunds = state.mutualFunds || [];
    const candidates: any[] = [];

    // Scan Stocks
    stocks.forEach((s: any) => {
      const qty = Number(s.qty) || 0;
      const avgPrice = Number(s.avgPrice) || 0;
      const currentPrice = Number(s.currentPrice) || avgPrice;
      const invested = qty * avgPrice;
      const currentVal = qty * currentPrice;
      const loss = invested - currentVal;

      if (loss > 0 && qty > 0) {
        let days = 0;
        if (s.buyDate) {
          days = Math.max(0, Math.ceil((new Date().getTime() - new Date(s.buyDate).getTime()) / 86400000));
        }
        const isLtcg = days > 365;

        candidates.push({
          id: s.id,
          name: s.symbol || s.name,
          type: "Stock",
          qty,
          buyPrice: avgPrice,
          currentPrice,
          invested,
          currentVal,
          loss,
          buyDate: s.buyDate,
          isLtcg,
          days
        });
      }
    });

    // Scan Mutual Funds
    mutualFunds.forEach((m: any) => {
      const units = Number(m.units) || 0;
      const invested = Number(m.invested) || Number(m.investedValue) || 0;
      const currentNav = Number(m.currentNav) || 0;
      const currentVal = units * currentNav || invested;
      const loss = invested - currentVal;

      if (loss > 0 && units > 0) {
        let days = 0;
        if (m.buyDate) {
          days = Math.max(0, Math.ceil((new Date().getTime() - new Date(m.buyDate).getTime()) / 86400000));
        }
        const isLtcg = days > 365;

        candidates.push({
          id: m.id,
          name: m.name || m.symbol,
          type: "Mutual Fund",
          qty: units,
          buyPrice: units > 0 ? invested / units : 0,
          currentPrice: currentNav,
          invested,
          currentVal,
          loss,
          buyDate: m.buyDate,
          isLtcg,
          days
        });
      }
    });

    return candidates.sort((a, b) => b.loss - a.loss);
  }, [state.stocks, state.mutualFunds]);

  /* ══════════════════════════════════════════════════════════════════════
     MEMOIZED STATUTORY TAX NETTING MATH
     ══════════════════════════════════════════════════════════════════════ */
  const taxCalculations = useMemo(() => {
    const { stcgGains, stcgLosses, ltcgGains, ltcgLosses } = realizedGainsData;

    // 1. Actual netting
    let actualNetSTCG = stcgGains - stcgLosses;
    let actualNetLTCG = ltcgGains - ltcgLosses;

    if (actualNetSTCG < 0) {
      // STCL offsets LTCG
      actualNetLTCG = Math.max(0, actualNetLTCG + actualNetSTCG);
      actualNetSTCG = 0;
    }

    const actualTaxSTCG = Math.max(0, actualNetSTCG) * 0.20;
    const actualTaxLTCG = actualNetLTCG > 125000 ? (actualNetLTCG - 125000) * 0.125 : 0;
    const totalActualTax = actualTaxSTCG + actualTaxLTCG;

    // 2. Simulated netting (with checked loss candidates)
    let simulatedSTCLosses = 0;
    let simulatedLTCLosses = 0;

    harvestCandidates.forEach(cand => {
      if (simulatedHarvestIds.includes(cand.id)) {
        if (cand.isLtcg) {
          simulatedLTCLosses += cand.loss;
        } else {
          simulatedSTCLosses += cand.loss;
        }
      }
    });

    let simNetSTCG = stcgGains - (stcgLosses + simulatedSTCLosses);
    let simNetLTCG = ltcgGains - (ltcgLosses + simulatedLTCLosses);

    if (simNetSTCG < 0) {
      simNetLTCG = Math.max(0, simNetLTCG + simNetSTCG);
      simNetSTCG = 0;
    }

    const simTaxSTCG = Math.max(0, simNetSTCG) * 0.20;
    const simTaxLTCG = simNetLTCG > 125000 ? (simNetLTCG - 125000) * 0.125 : 0;
    const totalSimTax = simTaxSTCG + simTaxLTCG;

    const totalSaved = Math.max(0, totalActualTax - totalSimTax);

    return {
      actual: {
        netSTCG: Math.max(0, actualNetSTCG),
        netLTCG: Math.max(0, actualNetLTCG),
        taxSTCG: actualTaxSTCG,
        taxLTCG: actualTaxLTCG,
        totalTax: totalActualTax
      },
      simulated: {
        stcLossesAdded: simulatedSTCLosses,
        ltcLossesAdded: simulatedLTCLosses,
        netSTCG: Math.max(0, simNetSTCG),
        netLTCG: Math.max(0, simNetLTCG),
        taxSTCG: simTaxSTCG,
        taxLTCG: simTaxLTCG,
        totalTax: totalSimTax
      },
      totalSaved
    };
  }, [realizedGainsData, harvestCandidates, simulatedHarvestIds]);

  /* ══════════════════════════════════════════════════════════════════════
     INCOME REGIME COMPUTATION
     ══════════════════════════════════════════════════════════════════════ */
  const printTaxSummary = () => {
    const regime = activeRegime === "new" ? "New Regime" : "Old Regime";
    const lines = [
      `TAX SUMMARY — FY ${state.profile.fy}`,
      `Regime: ${regime}`,
      ``,
      `INCOME`,
      `  Annual Income          : ${fmtINRFull(annualIncome)}`,
      `  Standard Deduction     : ${activeRegime === "new" ? fmtINRFull(75000) : fmtINRFull(50000)}`,
      ``,
      `TAX COMPUTATION`,
      `  Gross Tax Liability    : ${fmtINRFull(currentTotalTax)}`,
      `  TDS Already Deducted   : ${fmtINRFull(totalTDS)}`,
      `  Advance Tax Paid       : ${fmtINRFull(totalAdvancePaid)}`,
      `  Self-Assessment Paid   : ${fmtINRFull(totalSelfAssessment)}`,
      `  Remaining Liability    : ${fmtINRFull(remainingAdvance)}`,
      ``,
      `REGIME COMPARISON`,
      `  New Regime Tax         : ${fmtINRFull(taxNew.total)}`,
      `  Old Regime Tax         : ${fmtINRFull(taxOld.total)}`,
      `  Better Choice          : ${taxOld.total < taxNew.total ? "Old Regime" : "New Regime"} (saves ${fmtINRFull(Math.abs(taxNew.total - taxOld.total))})`,
      ``,
      `ADVANCE TAX INSTALMENTS`,
      ...installments.map(i => `  ${i.q} by ${i.due} (${i.pct}%)    : ${fmtINRFull(i.amt)}`),
      ``,
      `Generated by Personal Finance by Anand Mohta`,
    ].join("\n");

    const w = window.open("", "_blank", "width=560,height=680");
    if (w) {
      w.document.write(
        `<html><head><title>Tax Summary FY ${state.profile.fy}</title>` +
        `<style>body{font-family:'Courier New',monospace;padding:40px;background:#0f172a;color:#e2e8f0;font-size:14px;line-height:1.8}` +
        `h2{color:#c5a152;margin-bottom:8px}pre{white-space:pre-wrap;margin:0}` +
        `@media print{body{background:#fff;color:#000}}</style></head>` +
        `<body><h2>Tax Summary — FY ${state.profile.fy}</h2><pre>${lines}</pre>` +
        `<script>setTimeout(()=>window.print(),300);</script></body></html>`
      );
      w.document.close();
    }
  };

  // Controlled deduction state — 80C pre-filled from real state data
  const [deductions, setDeductions] = useState(() => {
    const elss = (state.mutualFunds || [])
      .filter((m: any) => (m.type || m.category || "").toUpperCase().includes("ELSS") && m.buyDate && m.buyDate >= fyStartStr && m.buyDate <= fyEndStr)
      .reduce((s: number, m: any) => s + Number(m.invested || m.investedAmount || 0), 0);
    const ppfThisYear = (state.ppfLedger || [])
      .filter((t: any) => t.date && t.date >= fyStartStr && t.date <= fyEndStr && t.type !== "withdrawal")
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const ppf = ppfThisYear > 0 ? ppfThisYear
      : (state.ppf || []).reduce((s: number, p: any) => s + Number(p.yearlyContribution || p.annualContribution || 0), 0);
    const lic = (state.lic || []).reduce((s: number, l: any) => s + Number(l.annualPremium || 0), 0);
    return {
      d80C: Math.min(elss + ppf + lic, 150000),
      d80D: 25000,
      hra: 0,
      homeLoan: 0,
      nps: 0,
      d80CCD2: 0,
      d80G: 0,
      d80E: 0,
    };
  });

  const setDed = (key: string, val: string) =>
    setDeductions(prev => ({ ...prev, [key]: Number(val) || 0 }));

  const detectedIncome = metrics.annualIncome || (metrics.monthIncome || 0) * 12;
  const annualIncome = incomeOverride !== "" ? (Number(incomeOverride) || 0) : detectedIncome;

  const taxableNew = Math.max(0, annualIncome - STD_DED_NEW);
  const taxNew = calcTaxNew(taxableNew);

  const totalOldDeductions = STD_DED_OLD + deductions.d80C + deductions.d80D +
    deductions.hra + deductions.homeLoan + deductions.nps +
    (deductions.d80CCD2 || 0) + (deductions.d80G || 0) + (deductions.d80E || 0);
  const taxOld = calcTaxOld(annualIncome, totalOldDeductions);

  const currentTotalTax = activeRegime === "new" ? taxNew.total : taxOld.total;

  const taxPayments = state.taxPayments || [];
  const totalTDS = taxPayments.filter((p: any) => p.type === "TDS").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const totalAdvancePaid = taxPayments.filter((p: any) => p.type === "Advance Tax").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const totalSelfAssessment = taxPayments.filter((p: any) => p.type === "Self-Assessment").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const totalPaidSoFar = totalTDS + totalAdvancePaid + totalSelfAssessment;

  const netLiability = Math.max(0, currentTotalTax - totalTDS);
  const remainingAdvance = Math.max(0, netLiability - totalAdvancePaid - totalSelfAssessment);
  const isAdvanceTaxApplicable = netLiability > 10000;

  const progressPct = currentTotalTax > 0
    ? Math.min(100, (totalPaidSoFar / currentTotalTax) * 100)
    : 0;

  const installments = [
    { q: "Q1", due: "15 Jun", pct: 15, amt: netLiability * 0.15 },
    { q: "Q2", due: "15 Sep", pct: 45, amt: netLiability * 0.45 },
    { q: "Q3", due: "15 Dec", pct: 75, amt: netLiability * 0.75 },
    { q: "Q4", due: "15 Mar", pct: 100, amt: netLiability * 1.00 },
  ];

  const downloadCGCsv = () => {
    const header = "name,type,buy_date,sell_date,holding_days,buy_price,sell_price,qty,profit,gain_type";
    const rows = realizedGainsData.allSells.map((s: any) =>
      `"${String(s.name || "").replace(/"/g, '""')}","${s.type}",${s.buyDate || ""},${s.sellDate || ""},${s.days},${s.buyPrice},${s.sellPrice},${s.qty},${s.profit},${s.isLtcg ? "LTCG" : "STCG"}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capital_gains_FY${state.profile.fy || "2025-26"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSavePayment = (data: any) => {
    addItem("taxPayments", data);
    setShowModal(false);
  };

  const handleToggleHarvest = (id: string) => {
    setSimulatedHarvestIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleResetHarvest = () => {
    setSimulatedHarvestIds([]);
  };

  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub={subTab === "income" 
          ? `Financial Year ${state.profile.fy} · Advance tax tracking & regime comparison` 
          : `Financial Year ${state.profile.fy} · Capital Gains (STCG/LTCG) & Loss Harvesting Simulator`
        }
        rightElement={
          subTab === "income" ? (
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="sm" variant={activeRegime === "new" ? "accent" : "ghost"} onClick={() => setActiveRegime("new")}>New Regime</Button>
              <Button size="sm" variant={activeRegime === "old" ? "accent" : "ghost"} onClick={() => setActiveRegime("old")}>Old Regime</Button>
            </div>
          ) : undefined
        }
      >
        Tax Vault
      </SectionTitle>

      {/* Modern Sliding Segmented Control for Subtabs */}
      <div style={{ display: "flex", gap: 6, background: THEME.line, padding: 4, borderRadius: 12, width: "fit-content", marginBottom: 28 }}>
        {[
          { id: "income", label: "Income & Advance Tax", icon: Shield },
          { id: "capitalGains", label: "Capital Gains & Harvesting", icon: TrendingUp }
        ].map((tabInfo) => {
          const Icon = tabInfo.icon;
          const active = subTab === tabInfo.id;
          return (
            <button
              key={tabInfo.id}
              onClick={() => setSubTab(tabInfo.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 10,
                border: "none",
                background: active ? THEME.darkInk : "transparent",
                color: active ? THEME.accent : THEME.muted,
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.25s var(--ease-premium)",
                boxShadow: active ? "var(--shadow-md)" : "none",
              }}
            >
              <Icon size={16} />
              <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>{tabInfo.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
         SUB-TAB 1: INCOME & ADVANCE TAX (PREVIOUS VIEW)
         ══════════════════════════════════════════════════════════════════════ */}
      {subTab === "income" && (
        <>
          {/* ── SUMMARY DASHBOARD ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, marginBottom: 32 }}>
            <Card variant="hero" style={{ padding: 32, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>Advance Tax Still to Pay</div>
                <div style={{ fontSize: 52, fontWeight: 900, color: "#fff", marginBottom: 4, letterSpacing: "-0.03em" }}>{fmtINRFull(remainingAdvance)}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500 }}>
                  <Shield size={14} /> Total tax: {fmtINRFull(currentTotalTax)} · TDS credited: {fmtINRFull(totalTDS)}
                </div>
              </div>

              <div style={{ marginTop: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>
                  <span>Progress Paid</span>
                  <span>{progressPct.toFixed(0)}%</span>
                </div>
                <div style={{ height: 8, background: "rgba(255,255,255,0.15)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progressPct}%`, background: "#fff", boxShadow: "0 0 15px rgba(255,255,255,0.3)", borderRadius: 10 }} />
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>TDS Deducted</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{fmtINRFull(totalTDS)}</div>
                  </div>
                  <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
                  <div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Advance Paid</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{fmtINRFull(totalAdvancePaid)}</div>
                  </div>
                  {totalSelfAssessment > 0 && <>
                    <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
                    <div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Self-Assessment</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{fmtINRFull(totalSelfAssessment)}</div>
                    </div>
                  </>}
                </div>
              </div>
            </Card>

            <Card style={{ padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: THEME.muted, marginBottom: 20 }}>Advance Tax Schedule</div>
              <div style={{ display: "grid", gap: 12 }}>
                {installments.map(inst => {
                  const isPaid = totalAdvancePaid >= inst.amt;
                  const isPartiallyPaid = totalAdvancePaid > 0 && totalAdvancePaid < inst.amt;

                  return (
                    <div key={inst.q} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: isPaid ? "color-mix(in srgb, var(--t-sage) 12%, transparent)" : "color-mix(in srgb, var(--t-gold) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isPaid ? <CheckCircle2 size={18} color={THEME.sage} /> : <Calendar size={18} color={THEME.gold} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{inst.q} · <span style={{ color: THEME.muted }}>By {inst.due}</span></div>
                        <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Cumulative {inst.pct}% · {fmtINRFull(inst.amt)}</div>
                      </div>
                      {isPaid && <Badge variant="sage" style={{ fontSize: 9 }}>Paid</Badge>}
                      {!isPaid && isPartiallyPaid && <Badge variant="gold" style={{ fontSize: 9 }}>Shortfall</Badge>}
                    </div>
                  );
                })}
              </div>
              {!isAdvanceTaxApplicable && (
                <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--t-sage) 8%, transparent)", border: `1px solid color-mix(in srgb, var(--t-sage) 20%, transparent)`, display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, color: THEME.sage }}>
                  <Shield size={14} /> Advance Tax not applicable (Liability &lt; ₹10k)
                </div>
              )}
            </Card>
          </div>

          {/* ── ADVANCE TAX COUNTDOWN ── */}
          {isAdvanceTaxApplicable && (() => {
            const fyParts = (state.profile.fy || "").split("-");
            const fyStartYear = Number(fyParts[0]) || new Date().getFullYear();
            const fyEndYear = fyStartYear + 1;
            const now = new Date();
            const todayMs = now.getTime();

            const instDates = [
              { q: "Q1", label: "1st Instalment", dueDate: new Date(fyStartYear, 5, 15), pct: 15, cumAmt: netLiability * 0.15 },
              { q: "Q2", label: "2nd Instalment", dueDate: new Date(fyStartYear, 8, 15), pct: 45, cumAmt: netLiability * 0.45 },
              { q: "Q3", label: "3rd Instalment", dueDate: new Date(fyStartYear, 11, 15), pct: 75, cumAmt: netLiability * 0.75 },
              { q: "Q4", label: "4th Instalment", dueDate: new Date(fyEndYear, 2, 15), pct: 100, cumAmt: netLiability * 1.00 },
            ];

            const upcoming = instDates.find(i => totalAdvancePaid < i.cumAmt && i.dueDate.getTime() >= todayMs);
            const overdue = instDates.find(i => totalAdvancePaid < i.cumAmt && i.dueDate.getTime() < todayMs);
            const target = upcoming || overdue;
            const allPaid = instDates.every(i => totalAdvancePaid >= i.cumAmt);

            if (allPaid) {
              return (
                <Card style={{ padding: 20, marginBottom: 28, background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.2)", display: "flex", alignItems: "center", gap: 16 }}>
                  <CheckCircle2 size={32} color={THEME.sage} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: THEME.sage }}>All advance tax payments on track!</div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>FY {state.profile.fy} — {fmtINRFull(totalAdvancePaid)} paid of {fmtINRFull(netLiability)} net liability</div>
                  </div>
                </Card>
              );
            }

            if (!target) return null;

            const daysLeft = Math.ceil((target.dueDate.getTime() - todayMs) / 86400000);
            const isOverdue = daysLeft < 0;
            const isUrgent = daysLeft >= 0 && daysLeft <= 15;
            const amountDue = Math.max(0, target.cumAmt - totalAdvancePaid);
            const countColor = isOverdue ? THEME.rust : isUrgent ? "#f59e0b" : THEME.sage;
            const dueDateStr = target.dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

            return (
              <Card style={{ padding: 24, marginBottom: 28, border: `1.5px solid ${countColor}30` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: THEME.muted, marginBottom: 4 }}>Advance Tax Countdown</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink }}>{target.label} — {target.q} · {target.pct}% cumulative</div>
                    <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>Due by {dueDateStr}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 48, fontWeight: 900, color: countColor, letterSpacing: "-0.03em", lineHeight: 1 }}>
                      {Math.abs(daysLeft)}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: countColor, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
                      {isOverdue ? "days overdue" : "days left"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                  {[
                    { label: "Amount Due Now", value: fmtINRFull(amountDue), color: countColor },
                    { label: "Already Paid", value: fmtINRFull(totalAdvancePaid), color: THEME.sage },
                    { label: "Net Liability", value: fmtINRFull(netLiability), color: THEME.ink },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: "center", padding: "12px 8px", background: "rgba(128,128,128,0.03)", borderRadius: 10, border: `1px solid ${THEME.line}` }}>
                      <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color }}>{value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted, fontWeight: 700 }}>
                  <span>FY Progress</span>
                  <span>{instDates.filter(i => totalAdvancePaid >= i.cumAmt).length} / {instDates.length} instalments done</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {instDates.map((i) => {
                    const paid = totalAdvancePaid >= i.cumAmt;
                    const isCurrent = i.q === target.q;
                    return (
                      <div key={i.q} style={{ flex: 1, height: 8, borderRadius: 4, background: paid ? THEME.sage : isCurrent ? countColor : THEME.line, opacity: isCurrent && !paid ? 0.85 : 1, transition: "background 0.3s" }} title={`${i.q}: ${i.pct}%`} />
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: THEME.muted }}>
                  {instDates.map(i => <span key={i.q}>{i.q}</span>)}
                </div>

                {isOverdue && (
                  <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", fontSize: 12, color: THEME.rust, fontWeight: 600 }}>
                    ⚠️ Overdue by {Math.abs(daysLeft)} days. Interest u/s 234B/234C may apply. Pay immediately.
                  </div>
                )}
              </Card>
            );
          })()}

          {/* ── ITR FILING DEADLINE BANNER ── */}
          {(() => {
            const itrDeadline = new Date(fyStartYear + 1, 6, 31); // July 31 of the assessment year
            const now = new Date();
            const daysToITR = Math.ceil((itrDeadline.getTime() - now.getTime()) / 86400000);
            const dueDateStr = itrDeadline.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
            if (daysToITR < -30) return null; // past deadline by >30 days, don't show
            const isOverdue = daysToITR < 0;
            const isUrgent = daysToITR >= 0 && daysToITR <= 30;
            const bannerColor = isOverdue ? THEME.rust : isUrgent ? "#f59e0b" : THEME.sage;
            const bannerBg = isOverdue ? "rgba(239,68,68,0.05)" : isUrgent ? "rgba(245,158,11,0.05)" : "rgba(52,211,153,0.05)";
            return (
              <div style={{ padding: "14px 20px", borderRadius: 12, background: bannerBg, border: `1.5px solid ${bannerColor}30`, display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${bannerColor}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Calendar size={22} color={bannerColor} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                    ITR Filing Deadline — AY {fyStartYear + 1}-{String(fyStartYear + 2).slice(-2)} · {dueDateStr}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3, fontWeight: 600 }}>
                    {isOverdue
                      ? `Filing was due ${Math.abs(daysToITR)} days ago. File immediately to avoid penalty u/s 234F (up to ₹5,000).`
                      : `${daysToITR} day${daysToITR === 1 ? "" : "s"} remaining to file your Income Tax Return (non-audit salaried). Keep Form 16 and AIS ready.`}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: bannerColor, lineHeight: 1 }}>{Math.abs(daysToITR)}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: bannerColor, textTransform: "uppercase" }}>{isOverdue ? "days late" : "days left"}</div>
                </div>
              </div>
            );
          })()}

          {/* ── TAX PAYMENTS LOG ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>Payment Log & TDS</h3>
            <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => setShowModal(true)}>Record Payment</Button>
          </div>

          {taxPayments.length === 0 ? (
            <Card style={{ padding: "40px 0", textAlign: "center", color: THEME.muted, fontSize: 13 }}>
              No tax payments or TDS entries recorded yet. Use 'Record Payment' to track.
            </Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14, marginBottom: 40 }}>
              {taxPayments.map((p: any) => (
                <Card key={p.id} style={{ padding: "16px 20px", borderLeft: `3px solid ${p.type === "TDS" ? THEME.gold : THEME.sage}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(128,128,128,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <History size={18} color={THEME.muted} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: THEME.ink }}>{fmtINRFull(p.amount)}</span>
                        <Badge variant="muted" style={{ fontSize: 9 }}>{p.type}</Badge>
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.date} · {p.note || "No note"}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeItem("taxPayments", p.id)} style={{ padding: 6, color: THEME.rust }}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* ── PLANNING SECTION ── */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>Tax Planning & Deductions</h3>
          </div>
          <Card style={{ padding: 32 }}>
            {/* Income Source Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: `1.5px solid ${THEME.line}` }}>
              <Field label="Annual Income (for tax computation)">
                <input
                  className="form-input"
                  type="number"
                  placeholder={detectedIncome > 0 ? `Auto-detected: ${Math.round(detectedIncome).toLocaleString("en-IN")}` : "Enter annual income"}
                  value={incomeOverride}
                  onChange={e => setIncomeOverride(e.target.value)}
                />
              </Field>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 2 }}>
                <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, lineHeight: 1.5 }}>
                  {incomeOverride !== "" ? (
                    <span style={{ color: THEME.gold }}>⚡ Using manual override: {fmtINRFull(Number(incomeOverride) || 0)}/yr</span>
                  ) : detectedIncome > 0 ? (
                    <span>Auto-detected from transactions & income ledger: <b style={{ color: THEME.ink }}>{fmtINRFull(detectedIncome)}/yr</b></span>
                  ) : (
                    <span style={{ color: THEME.rust }}>No income detected — enter annual income manually above</span>
                  )}
                  {incomeOverride !== "" && (
                    <button onClick={() => setIncomeOverride("")} style={{ marginLeft: 8, background: "none", border: "none", color: THEME.muted, cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Reset to auto</button>
                  )}
                </div>
                {annualIncome > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: activeRegime === "new" ? THEME.sage : THEME.accent }}>
                    {activeRegime === "new" && annualIncome - STD_DED_NEW <= 1200000
                      ? "✓ New regime: ₹0 tax (87A rebate applies — income within ₹12L threshold)"
                      : `Taxable income (${activeRegime === "new" ? "new" : "old"}): ${fmtINRFull(activeRegime === "new" ? Math.max(0, annualIncome - STD_DED_NEW) : Math.max(0, annualIncome - totalOldDeductions))}`}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, borderBottom: `1.5px solid ${THEME.line}`, paddingBottom: 16 }}>
                <Target size={18} color={THEME.accent} />
                <span style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: THEME.accent }}>Estimated Deductions (Old Regime)</span>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="80C — LIC, ELSS, PPF (max ₹1.5L)">
                  <input className="form-input" type="number" value={deductions.d80C} onChange={e => setDed("d80C", e.target.value)} />
                </Field>
                {/* 80C utilization gauge */}
                {(() => {
                  const used = Math.min(Number(deductions.d80C) || 0, 150000);
                  const pct = Math.min(100, (used / 150000) * 100);
                  const remaining = Math.max(0, 150000 - used);
                  const barColor = pct >= 100 ? THEME.sage : pct >= 60 ? THEME.gold : THEME.rust;
                  return (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted, fontWeight: 700, marginBottom: 4 }}>
                        <span style={{ color: barColor }}>{pct.toFixed(0)}% utilized · {fmtINRFull(used)} of ₹1.5L limit</span>
                        <span>{remaining > 0 ? `${fmtINRFull(remaining)} more room` : "Fully utilized ✓"}</span>
                      </div>
                      <div style={{ height: 5, background: THEME.line, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 4, transition: "width 0.3s" }} />
                      </div>
                    </div>
                  );
                })()}
              </div>

              <Field label="80D — Health Insurance (max ₹25K)">
                <input className="form-input" type="number" value={deductions.d80D} onChange={e => setDed("d80D", e.target.value)} />
              </Field>
              <Field label="HRA Exemption">
                <input className="form-input" type="number" value={deductions.hra} onChange={e => setDed("hra", e.target.value)} />
              </Field>
              <Field label="Home Loan Interest — Sec 24(b) (max ₹2L)">
                <input className="form-input" type="number" value={deductions.homeLoan} onChange={e => setDed("homeLoan", e.target.value)} />
              </Field>
              <Field label="NPS Self — 80CCD(1B) (max ₹50K)">
                <input className="form-input" type="number" value={deductions.nps} onChange={e => setDed("nps", e.target.value)} />
              </Field>
              <Field label="NPS Employer — 80CCD(2) (10% of salary)">
                <input className="form-input" type="number" value={deductions.d80CCD2 || 0} onChange={e => setDed("d80CCD2", e.target.value)} />
              </Field>
              <Field label="80G — Donations to Charities">
                <input className="form-input" type="number" value={deductions.d80G || 0} onChange={e => setDed("d80G", e.target.value)} />
              </Field>
              <Field label="80E — Education Loan Interest">
                <input className="form-input" type="number" value={deductions.d80E || 0} onChange={e => setDed("d80E", e.target.value)} />
              </Field>
              <Field label="Standard Deduction (Old Regime)">
                <input className="form-input" type="number" value={STD_DED_OLD} disabled />
              </Field>
            </div>

            <div style={{ marginTop: 40, paddingTop: 32, borderTop: `2px solid ${THEME.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                  {taxOld.total < taxNew.total ? "Old Regime Saves You" : "New Regime Saves You"}
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: THEME.sage }}>
                  {fmtINRFull(Math.abs(taxNew.total - taxOld.total))}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, marginTop: 4 }}>
                  New regime tax: {fmtINRFull(taxNew.total)} · Old regime tax: {fmtINRFull(taxOld.total)}
                </div>
              </div>
              <Button variant="accent" size="lg" icon={<Calculator size={20} />} style={{ padding: "12px 40px" }} onClick={printTaxSummary}>Generate Tax Report</Button>
            </div>
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         SUB-TAB 2: CAPITAL GAINS VAULT & LOSS HARVESTING OPTIMIZER
         ══════════════════════════════════════════════════════════════════════ */}
      {subTab === "capitalGains" && (
        <div className="tab-content-enter">
          
          {/* ── SIMULATED COMPARATIVE DASHBOARD ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, marginBottom: 32 }}>
            <Card variant="hero" style={{ padding: 32, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>
                  <Sparkles size={12} /> Simulated Tax Saved
                </div>
                <div style={{ fontSize: 52, fontWeight: 900, color: "#34D399", marginBottom: 4, letterSpacing: "-0.03em", textShadow: "0 0 20px rgba(52,211,153,0.3)" }}>
                  {fmtINRFull(taxCalculations.totalSaved)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500 }}>
                  <Percent size={14} /> Actual Tax: {fmtINRFull(taxCalculations.actual.totalTax)} · Stressed: {fmtINRFull(taxCalculations.simulated.totalTax)}
                </div>
              </div>

              <div style={{ marginTop: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>
                  <span>Offset Target Achieved</span>
                  <span>
                    {taxCalculations.actual.totalTax > 0 
                      ? `${Math.min(100, (taxCalculations.totalSaved / taxCalculations.actual.totalTax) * 100).toFixed(0)}%` 
                      : "0%"
                    }
                  </span>
                </div>
                <div style={{ height: 8, background: "rgba(255,255,255,0.15)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ 
                    height: "100%", 
                    width: taxCalculations.actual.totalTax > 0 
                      ? `${Math.min(100, (taxCalculations.totalSaved / taxCalculations.actual.totalTax) * 100)}%` 
                      : "0%", 
                    background: "#34D399", 
                    boxShadow: "0 0 15px rgba(52,211,153,0.5)", 
                    borderRadius: 10,
                    transition: "width 0.4s var(--ease-spring)"
                  }} />
                </div>
                <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
                  <div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Realized STCG (Actual)</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
                      {fmtINRFull(taxCalculations.actual.netSTCG)} <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>(Tax: {fmtINRFull(taxCalculations.actual.taxSTCG)})</span>
                    </div>
                  </div>
                  <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
                  <div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Realized LTCG (Actual)</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
                      {fmtINRFull(taxCalculations.actual.netLTCG)} <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>(Tax: {fmtINRFull(taxCalculations.actual.taxLTCG)})</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: THEME.muted }}>Simulation Status</div>
                  {simulatedHarvestIds.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleResetHarvest} icon={<RefreshCw size={12} />} style={{ fontSize: 11, padding: "2px 8px", color: THEME.rust, background: "color-mix(in srgb, var(--t-rust) 8%, transparent)" }}>
                      Reset Simulation
                    </Button>
                  )}
                </div>
                
                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: `1px solid ${THEME.line}` }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>Securities Harvested</span>
                    <Badge variant={simulatedHarvestIds.length > 0 ? "sage" : "muted"} style={{ fontSize: 12, fontWeight: 800 }}>
                      {simulatedHarvestIds.length} Assets
                    </Badge>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: `1px solid ${THEME.line}` }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>Simulated STCL Applied</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                      -{fmtINRFull(taxCalculations.simulated.stcLossesAdded)}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: `1px solid ${THEME.line}` }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>Simulated LTCL Applied</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                      -{fmtINRFull(taxCalculations.simulated.ltcLossesAdded)}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>Simulated Net Tax Liability</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: taxCalculations.simulated.totalTax > 0 ? THEME.gold : THEME.sage }}>
                      {fmtINRFull(taxCalculations.simulated.totalTax)}
                    </span>
                  </div>
                </div>
              </div>

              {taxCalculations.actual.totalTax === 0 && (
                <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: 10, background: "rgba(59,130,246,0.06)", border: `1px solid rgba(59,130,246,0.15)`, display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, fontWeight: 600, color: "rgb(59,130,246)", lineHeight: 1.4 }}>
                  <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} /> 
                  <div>
                    No realized tax liability recorded this FY yet. Simulated losses can be carried forward for up to 8 assessment years to offset future profits.
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* ── TAX LOSS HARVESTING OPTIMIZER candidates ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>Tax Loss Harvesting Optimizer</h3>
              <p style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>Select holdings below trading at an unrealized loss to simulate selling and offsetting realized gains.</p>
            </div>
            <Badge variant="muted" style={{ fontWeight: 800 }}>{harvestCandidates.length} Loss Candidates Found</Badge>
          </div>

          {harvestCandidates.length === 0 ? (
            <Card style={{ padding: "40px 0", textAlign: "center", color: THEME.muted, fontSize: 13, marginBottom: 32 }}>
              🎉 Incredible! None of your current stock or mutual fund holdings are currently trading at a loss. No tax harvesting offset needed!
            </Card>
          ) : (
            <div style={{ display: "grid", gap: 12, marginBottom: 32 }}>
              {harvestCandidates.map(cand => {
                const isSelected = simulatedHarvestIds.includes(cand.id);
                // Potential tax offset savings estimation
                const taxSavedEstimation = cand.isLtcg ? cand.loss * 0.125 : cand.loss * 0.20;

                return (
                  <div 
                    key={cand.id} 
                    onClick={() => handleToggleHarvest(cand.id)}
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 16, 
                      padding: "16px 20px", 
                      borderRadius: 14, 
                      background: isSelected ? "color-mix(in srgb, var(--t-sage) 4%, var(--surface-0))" : "var(--surface-0)", 
                      border: `1.5px solid ${isSelected ? THEME.sage : THEME.line}`,
                      boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-sm)",
                      cursor: "pointer",
                      transition: "all 0.2s var(--ease-premium)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => {}} // Handled by outer div onClick
                        style={{ 
                          width: 18, 
                          height: 18, 
                          accentColor: "var(--t-sage)", 
                          cursor: "pointer" 
                        }} 
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: THEME.ink }}>{cand.name}</span>
                        <Badge variant="muted" style={{ fontSize: 9 }}>{cand.type}</Badge>
                        <Badge variant={cand.isLtcg ? "muted" : "gold"} style={{ fontSize: 9 }}>
                          {cand.isLtcg ? "Long-Term (LT)" : "Short-Term (ST)"}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, marginTop: 4 }}>
                        Bought: {cand.buyDate || "—"} · Holding: {cand.qty.toFixed(2)} units · Cost: {fmtINRFull(cand.invested)} · Market Val: {fmtINRFull(cand.currentVal)}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>Unrealized Loss</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: THEME.rust, marginTop: 2 }}>
                        {fmtINRFull(cand.loss)}
                      </div>
                      <div style={{ fontSize: 10, color: THEME.sage, fontWeight: 700, marginTop: 2 }}>
                        Offsets up to {fmtINRFull(taxSavedEstimation)} tax
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── CTO COMPLIANCE & WASH SALE ADVISORY CARD ── */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
              <BookOpen size={20} color={THEME.accent} /> CTO & CFO Statutory Compliance Vault
            </h3>
          </div>
          
          <Card style={{ padding: 24, background: "rgba(79,70,229,0.03)", border: "1.5px solid rgba(79,70,229,0.12)", marginBottom: 32 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(79,70,229,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sparkles size={18} color={THEME.accent} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontWeight: 800, fontSize: 15, color: THEME.ink, marginBottom: 6 }}>Premium Capital Gains & Loss Harvesting Guidelines</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: THEME.accent, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Indian Statutory Netting Rules</div>
                    <ul style={{ fontSize: 12, color: THEME.muted, margin: 0, paddingLeft: 16, lineHeight: 1.6 }}>
                      <li><b>Short-Term Capital Loss (STCL)</b> can be set off against both Short-Term and Long-Term Capital Gains.</li>
                      <li style={{ marginTop: 4 }}><b>Long-Term Capital Loss (LTCL)</b> can *only* be set off against Long-Term Capital Gains.</li>
                      <li style={{ marginTop: 4 }}><b>Carry Forward Benefit:</b> Unabsorbed losses can be carried forward for up to <b>8 assessment years</b> to offset future gains.</li>
                    </ul>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: THEME.gold, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertTriangle size={13} /> CFO Advisory: Avoid Wash-Sales
                    </div>
                    <p style={{ fontSize: 12, color: THEME.muted, margin: 0, lineHeight: 1.6 }}>
                      Selling stocks purely to book tax losses and buying them back the exact same day can invite audit scrutiny under **GAAR (General Anti-Avoidance Rule)**. 
                      To avoid tax evasion flags, wait at least **2-3 business days** before re-entering, or re-invest the capital in a highly correlated alternative ETF/Mutual Fund to lock in the tax savings safely.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* ── REALIZED CAPITAL GAINS LEDGER ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>Realized Transactions Ledger</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Badge variant="muted" style={{ fontWeight: 800 }}>{realizedGainsData.allSells.length} Transactions</Badge>
              {realizedGainsData.allSells.length > 0 && (
                <button
                  onClick={downloadCGCsv}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: `1px solid ${THEME.sage}55`, background: "transparent", color: THEME.sage, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  <Download size={13} /> Export CSV
                </button>
              )}
            </div>
          </div>

          {realizedGainsData.allSells.length === 0 ? (
            <Card style={{ padding: "40px 0", textAlign: "center", color: THEME.muted, fontSize: 13, marginBottom: 40 }}>
              No realized stock or mutual fund sales recorded in FY {state.profile.fy} yet. Sales added in Demat / Mutual Fund trackers will compound here automatically.
            </Card>
          ) : (
            <div style={{ background: "var(--surface-0)", borderRadius: 14, border: `1px solid ${THEME.line}`, overflow: "hidden", marginBottom: 40, boxShadow: "var(--shadow-sm)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(128,128,128,0.03)", borderBottom: `1px solid ${THEME.line}` }}>
                    <th style={{ padding: "14px 20px", fontWeight: 800, color: THEME.muted }}>Asset Name</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, color: THEME.muted }}>Type</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, color: THEME.muted, textAlign: "center" }}>Holding Days</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, color: THEME.muted, textAlign: "right" }}>Buy NAV/Price</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, color: THEME.muted, textAlign: "right" }}>Sell NAV/Price</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, color: THEME.muted, textAlign: "right" }}>Realized Gain/Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {realizedGainsData.allSells.map((sell, idx) => {
                    const isProfit = sell.profit >= 0;
                    return (
                      <tr key={sell.id || idx} style={{ borderBottom: idx < realizedGainsData.allSells.length - 1 ? `1px solid ${THEME.line}` : "none", transition: "background 0.2s" }} className="hover-row">
                        <td style={{ padding: "14px 20px", fontWeight: 800 }}>
                          <div>{sell.name}</div>
                          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 500, marginTop: 4 }}>Sold {sell.sellDate} · Qty: {sell.qty}</div>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <Badge variant={sell.isLtcg ? "muted" : "gold"}>
                            {sell.isLtcg ? "LTCG" : "STCG"}
                          </Badge>
                        </td>
                        <td style={{ padding: "14px 20px", textAlign: "center", fontWeight: 600, color: THEME.muted }}>
                          {sell.days} Days
                        </td>
                        <td style={{ padding: "14px 20px", textAlign: "right", fontWeight: 600 }}>
                          {fmtINRFull(sell.buyPrice)}
                        </td>
                        <td style={{ padding: "14px 20px", textAlign: "right", fontWeight: 600 }}>
                          {fmtINRFull(sell.sellPrice)}
                        </td>
                        <td style={{ padding: "14px 20px", textAlign: "right", fontWeight: 800, color: isProfit ? THEME.sage : THEME.rust }}>
                          {isProfit ? "+" : ""}{fmtINRFull(sell.profit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {showModal && <AddTaxPaymentModal onClose={() => setShowModal(false)} onSave={handleSavePayment} />}
    </div>
  );
};

