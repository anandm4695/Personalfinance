// @ts-nocheck
import React, { useState } from "react";
import { Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { THEME, PIE_COLORS } from "../../utils/constants";
import { fmtINRFull, getCCDueDate } from "../../utils/finance";
import { Modal } from "../ui/Modal";

const btnGhost = {
  background: "transparent",
  border: `1.5px solid ${THEME.line}`,
  color: THEME.ink,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 10,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const btnSolid = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 16px",
  background: THEME.accent,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

export function MonthlyReportModal({ metrics, state, selectedDate, onClose }: any) {
  const [reportDate, setReportDate] = useState(() => selectedDate || new Date());
  
  const monthLabel = reportDate.toLocaleString("en-IN", { month: "long", year: "numeric" });
  const ym = reportDate.toISOString().slice(0, 7);
  const txns = state.transactions.filter((t: any) => t.date?.startsWith(ym));
  const income = txns.filter((t: any) => t.type === "credit").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const expense = txns.filter((t: any) => t.type === "debit").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const saving = income - expense;
  const savingRate = income > 0 ? ((saving / income) * 100).toFixed(1) : "0";
  
  const catMap: Record<string, number> = {};
  txns.filter((t: any) => t.type === "debit").forEach((t: any) => {
    const c = t.category || "Other";
    catMap[c] = (catMap[c] || 0) + Number(t.amount || 0);
  });
  const topCats = Object.entries(catMap).sort(([, a], [, b]) => b - a).slice(0, 6);
  
  const upcoming: { label: string; amount: number; date: string }[] = [];
  state.creditCards.filter((c: any) => (c.status || "").toLowerCase() !== "closed").forEach((c: any) => {
    const due = getCCDueDate(c, reportDate);
    if (due) upcoming.push({ label: `${c.issuer} CC`, amount: Number(c.outstanding || 0), date: due });
  });
  state.loansTaken.forEach((l: any) => {
    upcoming.push({ label: `${l.lender} ${l.type} Loan`, amount: Number(l.emi || 0), date: "Monthly EMI" });
  });

  // Dynamic historical net worth lookup for selected month
  const historicalNW = (state.netWorthHistory || []).find((h: any) => h.month === ym);
  const displayNetWorth = historicalNW ? (historicalNW.netWorth ?? historicalNW.net_worth ?? 0) : metrics.netWorth;

  return (
    <Modal title={`Monthly Report — ${monthLabel}`} onClose={onClose}>
      <style>{`@media print { .no-print { display: none !important; } body { background: white !important; } .print-scroll { max-height: none !important; overflow: visible !important; } }`}</style>
      <div style={{ maxHeight: "72vh", overflowY: "auto" }} className="print-scroll">
        
        {/* Month Selector Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(128,128,128,0.06)", borderRadius: 10, marginBottom: 16, border: `1px solid ${THEME.line}` }} className="no-print">
          <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>Select Report Month</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setReportDate(new Date(reportDate.getFullYear(), reportDate.getMonth() - 1, 1))}
              style={{ ...btnGhost, padding: "5px 8px", display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, minWidth: 100, textAlign: "center", color: THEME.accent }}>
              {reportDate.toLocaleString("en-IN", { month: "short", year: "numeric" })}
            </span>
            <button
              onClick={() => setReportDate(new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 1))}
              style={{ ...btnGhost, padding: "5px 8px", display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setReportDate(selectedDate || new Date())}
              style={{ ...btnGhost, padding: "5px 12px", fontSize: 11, fontWeight: 700, color: THEME.muted, border: `1px solid ${THEME.line}` }}
            >
              Reset
            </button>
          </div>
        </div>

        <div style={{ background: "#0f172a", borderRadius: 10, padding: "16px 20px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>Net Worth Snapshot</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>{fmtINRFull(displayNetWorth)}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
            Assets {fmtINRFull(metrics.totalAssets)} · Liabilities {fmtINRFull(metrics.totalLiabilities)}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Income", value: income, color: THEME.sage },
            { label: "Expense", value: expense, color: THEME.rust },
            { label: `Saved (${savingRate}%)`, value: saving, color: saving >= 0 ? THEME.sage : THEME.rust },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ padding: 12, borderRadius: 8, background: "rgba(128,128,128,0.06)", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color }}>{fmtINRFull(value)}</div>
            </div>
          ))}
        </div>

        {topCats.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8, fontWeight: 700 }}>Top Expenses</div>
            {topCats.map(([cat, amt], i) => (
              <div key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px dashed ${THEME.line}`, fontSize: 13 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], display: "inline-block" }} />
                  {cat}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 50, height: 4, background: THEME.line, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${expense > 0 ? Math.min(100, (amt / expense) * 100) : 0}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  </div>
                  <span style={{ fontWeight: 700, minWidth: 80, textAlign: "right" }}>{fmtINRFull(amt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8, fontWeight: 700 }}>Portfolio Snapshot</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {([
              ["Bank Cash", metrics.cashInBanks],
              ["Fixed Deposits", metrics.fdValue],
              ["Mutual Funds", metrics.mfValue],
              ["Stocks", metrics.stockValue],
              ["PPF", metrics.ppfValue],
              ["NPS", metrics.npsValue],
            ] as [string, number][]).filter(([, v]) => v > 0).map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "rgba(128,128,128,0.05)", borderRadius: 6, fontSize: 13 }}>
                <span style={{ color: THEME.muted }}>{label}</span>
                <span style={{ fontWeight: 700 }}>{fmtINRFull(val)}</span>
              </div>
            ))}
          </div>
        </div>

        {upcoming.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8, fontWeight: 700 }}>Upcoming Dues</div>
            {upcoming.map((d, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px dashed ${THEME.line}`, fontSize: 13 }}>
                <span>{d.label}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: THEME.rust }}>{fmtINRFull(d.amount)}</div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>{d.date}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }} className="no-print">
        <button style={btnGhost} onClick={onClose}>Close</button>
        <button style={btnSolid} onClick={() => window.print()}>
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>
    </Modal>
  );
}
