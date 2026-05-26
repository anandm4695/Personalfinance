// @ts-nocheck
import React, { useState, useMemo, useCallback } from "react";
import { Trash2, BarChart3, ArrowLeftRight, Layers, Coins, Download, Search, Receipt } from "lucide-react";
import { THEME } from "../../utils/constants";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

const th = { textAlign: "left" as const, padding: "12px 10px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: THEME.muted, fontWeight: 700, borderBottom: `1px solid ${THEME.line}`, whiteSpace: "nowrap" as const };
const td = { padding: "16px 10px", verticalAlign: "top" as const, fontSize: 13, borderBottom: `1px solid ${THEME.line}` };

export function TxnHistoryTab({ state, removeItem }: any) {
  const currentFY = (() => {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 3 ? y : y - 1;
  })();
  const [selectedFY, setSelectedFY] = useState(currentFY);
  const [activeSection, setActiveSection] = useState<"all" | "stocks_bought" | "stocks_sold" | "mf_bought" | "mf_sold" | "cash_ledger">("all");
  const [txnDematId, setTxnDematId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fyStart = (fy: number) => new Date(`${fy}-04-01`);
  const fyEnd = (fy: number) => new Date(`${fy + 1}-03-31T23:59:59`);
  
  const inFY = useCallback((dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= fyStart(selectedFY) && d <= fyEnd(selectedFY);
  }, [selectedFY]);

  const matchesSearch = useCallback((text: string) => {
    if (!searchQuery) return true;
    return (text || "").toLowerCase().includes(searchQuery.toLowerCase());
  }, [searchQuery]);

  const allFYs = useMemo(() => {
    const fySet = new Set<number>();
    fySet.add(currentFY);
    const addFY = (dateStr: string) => {
      if (!dateStr) return;
      const d = new Date(dateStr);
      fySet.add(d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1);
    };
    (state.stocks || []).forEach((s: any) => addFY(s.buyDate));
    (state.stockSells || []).forEach((s: any) => addFY(s.sellDate));
    (state.mutualFunds || []).forEach((m: any) => addFY(m.buyDate));
    (state.mfSells || []).forEach((m: any) => addFY(m.sellDate));
    (state.transactions || []).forEach((t: any) => addFY(t.date));
    return Array.from(fySet).sort((a, b) => b - a);
  }, [state.stocks, state.stockSells, state.mutualFunds, state.mfSells, state.transactions, currentFY]);

  const stocksBoughtInFY = useMemo(() =>
    (state.stocks || [])
      .filter((s: any) => inFY(s.buyDate) && (!txnDematId || s.dematId === txnDematId) && matchesSearch(`${s.symbol} ${s.broker}`))
      .sort((a: any, b: any) => new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()),
    [state.stocks, txnDematId, inFY, matchesSearch]
  );

  const stocksSoldInFY = useMemo(() =>
    (state.stockSells || [])
      .filter((s: any) => inFY(s.sellDate) && (!txnDematId || s.dematId === txnDematId) && matchesSearch(`${s.symbol} ${s.broker}`))
      .sort((a: any, b: any) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()),
    [state.stockSells, txnDematId, inFY, matchesSearch]
  );

  const mfBoughtInFY = useMemo(() =>
    (state.mutualFunds || []).filter((m: any) => inFY(m.buyDate) && matchesSearch(`${m.scheme} ${m.type}`))
      .sort((a: any, b: any) => new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()),
    [state.mutualFunds, inFY, matchesSearch]
  );

  const mfSoldInFY = useMemo(() =>
    (state.mfSells || []).filter((m: any) => inFY(m.sellDate) && matchesSearch(`${m.scheme} ${m.type}`))
      .sort((a: any, b: any) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()),
    [state.mfSells, inFY, matchesSearch]
  );

  const cashTransactionsInFY = useMemo(() =>
    (state.transactions || [])
      .filter((t: any) => inFY(t.date) && matchesSearch(`${t.note} ${t.category} ${t.description || ""} ${t.type}`))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [state.transactions, inFY, matchesSearch]
  );

  const stocksRealizedPnl = stocksSoldInFY.reduce((s: number, sl: any) => s + Number(sl.profit || 0), 0);
  const mfRealizedPnl = mfSoldInFY.reduce((s: number, sl: any) => s + Number(sl.profit || 0), 0);
  const totalRealizedPnl = stocksRealizedPnl + mfRealizedPnl;

  const totalCredits = cashTransactionsInFY.filter((t: any) => t.type === "credit").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const totalDebits = cashTransactionsInFY.filter((t: any) => t.type === "debit").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fyLabel = `FY ${String(selectedFY).slice(2)}-${String(selectedFY + 1).slice(2)}`;

  const sections = [
    { id: "all", label: "All Assets" },
    { id: "stocks_bought", label: "Stocks Bought" },
    { id: "stocks_sold", label: "Stocks Sold" },
    { id: "mf_bought", label: "MF Bought" },
    { id: "mf_sold", label: "MF Sold" },
    { id: "cash_ledger", label: "Bank & Cash Ledger" },
  ] as const;

  const show = (id: typeof sections[number]["id"]) => activeSection === "all" || activeSection === id;

  // ── Excel CSV Exporter ──
  const exportToCSV = (data: any[], filename: string, headers: string[], rowMapper: (row: any) => string[]) => {
    if (!data || data.length === 0) return;
    const csvRows = [
      headers.join(","),
      ...data.map(row => 
        rowMapper(row)
          .map(val => `"${String(val ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SoldTable = ({ rows, type }: { rows: any[], type: "stock" | "mf" }) => {
    const total = rows.reduce((s: number, r: any) => s + Number(r.profit || 0), 0);
    if (rows.length === 0) return (
      <Card style={{ padding: 48, textAlign: "center" }}>
        <div style={{ fontSize: 14, color: THEME.muted }}>No {type === "stock" ? "stock sales" : "MF redemptions"} recorded in {fyLabel}</div>
      </Card>
    );
    return (
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(128,128,128,0.02)" }}>
                <th style={{ ...th, paddingLeft: 10 }}>{type === "stock" ? "Company" : "Scheme"}</th>
                <th style={{ ...th, textAlign: "right" }}>Buy Date</th>
                <th style={{ ...th, textAlign: "right" }}>{type === "stock" ? "Buy Price" : "Buy NAV"}</th>
                <th style={{ ...th, textAlign: "right" }}>{type === "stock" ? "Qty" : "Units"}</th>
                <th style={{ ...th, textAlign: "right" }}>Sell Date</th>
                <th style={{ ...th, textAlign: "right" }}>{type === "stock" ? "Sell Price" : "Sell NAV"}</th>
                <th style={{ ...th, textAlign: "right" }}>Profit / Loss</th>
                <th style={{ ...th, textAlign: "right" }}>Broker</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s: any) => {
                const profit = Number(s.profit || 0);
                const buyP = type === "stock" ? Number(s.buyPrice) : Number(s.buyNav);
                const sellP = type === "stock" ? Number(s.sellPrice) : Number(s.sellNav);
                return (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${THEME.line}`, transition: "background 0.2s" }} className="table-row-hover">
                    <td style={{ ...td, paddingLeft: 10 }}>
                      <b>{type === "stock" ? s.symbol?.replace(/\.(NS|BO)$/i, "") : s.scheme}</b>
                      {type === "stock" && <span style={{ fontSize: 10, marginLeft: 5, color: THEME.muted, background: THEME.line, padding: "1px 4px", borderRadius: 3 }}>{s.exchange || "NSE"}</span>}
                      {type === "mf" && s.type && <span style={{ fontSize: 10, marginLeft: 5, color: THEME.muted, background: THEME.line, padding: "1px 4px", borderRadius: 3 }}>{s.type}</span>}
                    </td>
                    <td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12 }}>{fmtDate(s.buyDate)}</td>
                    <td style={{ ...td, textAlign: "right" }}>₹{buyP.toFixed(type === "mf" ? 4 : 2)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{type === "stock" ? s.qty : Number(s.units).toFixed(3)}</td>
                    <td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12 }}>{fmtDate(s.sellDate)}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <span style={{ color: sellP >= buyP ? THEME.sage : THEME.rust }}>
                        ₹{sellP.toFixed(type === "mf" ? 4 : 2)} {sellP >= buyP ? "↑" : "↓"}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "right", color: profit >= 0 ? THEME.sage : THEME.rust, fontWeight: 800, fontSize: 14 }}>
                      {profit >= 0 ? "+" : ""}₹{Math.abs(profit).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                    <td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12, fontWeight: 600 }}>{s.broker || "—"}</td>
                    <td style={td}>
                      <Button variant="ghost" size="sm" onClick={() => removeItem(type === "stock" ? "stockSells" : "mfSells", s.id)} style={{ padding: 6, color: THEME.rust }}>
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "rgba(128,128,128,0.03)" }}>
                <td colSpan={6} style={{ ...td, paddingLeft: 10, fontWeight: 800 }}>Total Realized P&L</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 900, color: total >= 0 ? THEME.sage : THEME.rust, fontSize: 15 }}>
                  {total >= 0 ? "+" : ""}₹{Math.abs(total).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </td>
                <td colSpan={2} style={td}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    );
  };

  return (
    <div className="tab-content-enter">
      <SectionTitle sub="Unified transaction accounting for capital demat investments and liquidity bank accounts">
        Global Ledger
      </SectionTitle>

      {/* Glassmorphic Search & Filter Bar */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", flex: "1 1 280px", position: "relative", alignItems: "center" }}>
          <Search size={16} color={THEME.muted} style={{ position: "absolute", left: 14, pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search symbols, notes, categories, brokers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 40px",
              borderRadius: 12,
              border: `1px solid ${THEME.line}`,
              background: "var(--surface-0)",
              color: THEME.ink,
              fontSize: 13.5,
              outline: "none",
              boxShadow: "var(--shadow-sm)",
              transition: "border 0.2s ease",
            }}
            className="focus:border-accent"
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(128,128,128,0.04)", padding: "4px 14px", borderRadius: 12, border: `1px solid ${THEME.line}`, height: 42 }}>
          <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>Period</span>
          <select 
            style={{ background: "transparent", border: "none", color: THEME.ink, fontWeight: 800, fontSize: 13, cursor: "pointer", outline: "none" }} 
            value={selectedFY} 
            onChange={(e) => setSelectedFY(Number(e.target.value))}
          >
            {allFYs.map((fy) => <option key={fy} value={fy}>FY {String(fy).slice(2)}-{String(fy + 1).slice(2)}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
        {sections.map((s) => (
          <Button 
            key={s.id} 
            size="sm"
            variant={activeSection === s.id ? "accent" : "ghost"} 
            onClick={() => setActiveSection(s.id)}
            style={{ padding: "6px 16px", height: 34, borderRadius: 10 }}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {(state.demat || []).length > 1 && activeSection !== "cash_ledger" && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>Account:</span>
          <Button 
            size="sm"
            variant={txnDematId === null ? "accent" : "ghost"}
            onClick={() => setTxnDematId(null)} 
            style={{ height: 28, padding: "0 12px", fontSize: 11 }}
          >
            All Accounts
          </Button>
          {(state.demat || []).map((d: any) => (
            <Button 
              key={d.id} 
              size="sm"
              variant={txnDematId === d.id ? "accent" : "ghost"}
              onClick={() => setTxnDematId(d.id)} 
              style={{ height: 28, padding: "0 12px", fontSize: 11 }}
            >
              {d.broker || d.dpId || "Account"}
            </Button>
          ))}
        </div>
      )}

      {/* Interactive Drill-Down Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 32 }}>
        <div onClick={() => setActiveSection("stocks_bought")} style={{ cursor: "pointer", transition: "transform 0.2s ease" }} className="hover:scale-[1.02]">
          <StatCard 
            icon={<BarChart3 />} 
            label="Stocks Bought" 
            value={String(stocksBoughtInFY.length)} 
            sub={`${fyLabel} lots`} 
            color={THEME.accent}
          />
        </div>
        <div onClick={() => setActiveSection("stocks_sold")} style={{ cursor: "pointer", transition: "transform 0.2s ease" }} className="hover:scale-[1.02]">
          <StatCard 
            icon={<ArrowLeftRight />} 
            label="Stocks Sold" 
            value={String(stocksSoldInFY.length)} 
            sub={`Realized: ${stocksRealizedPnl >= 0 ? "+" : ""}₹${Math.abs(stocksRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} 
            subColor={stocksRealizedPnl >= 0 ? THEME.sage : THEME.rust} 
            color={THEME.accent}
          />
        </div>
        <div onClick={() => setActiveSection("mf_bought")} style={{ cursor: "pointer", transition: "transform 0.2s ease" }} className="hover:scale-[1.02]">
          <StatCard 
            icon={<Layers />} 
            label="MF Bought" 
            value={String(mfBoughtInFY.length)} 
            sub={`${fyLabel} lots`} 
            color={THEME.accent}
          />
        </div>
        <div onClick={() => setActiveSection("mf_sold")} style={{ cursor: "pointer", transition: "transform 0.2s ease" }} className="hover:scale-[1.02]">
          <StatCard 
            icon={<ArrowLeftRight />} 
            label="MF Redeemed" 
            value={String(mfSoldInFY.length)} 
            sub={`Realized: ${mfRealizedPnl >= 0 ? "+" : ""}₹${Math.abs(mfRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} 
            subColor={mfRealizedPnl >= 0 ? THEME.sage : THEME.rust} 
            color={THEME.accent}
          />
        </div>
        <div onClick={() => setActiveSection("cash_ledger")} style={{ cursor: "pointer", transition: "transform 0.2s ease" }} className="hover:scale-[1.02]">
          <StatCard 
            icon={<Coins />} 
            label="Bank & Cash ledger" 
            value={String(cashTransactionsInFY.length)} 
            sub={`Credits: +${totalCredits.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} 
            subColor={THEME.sage} 
            color="#0891B2"
          />
        </div>
      </div>

      {/* ────────────────── SECTION: STOCKS BOUGHT ────────────────── */}
      {show("stocks_bought") && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>Stocks Bought</div>
            {stocksBoughtInFY.length > 0 && (
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<Download size={14} />} 
                onClick={() => exportToCSV(
                  stocksBoughtInFY,
                  `Stocks_Bought_${fyLabel}.csv`,
                  ["Company", "Exchange", "Qty", "Buy Date", "Buy Price", "Invested Amount", "Current Price", "Unrealized P&L"],
                  (s) => [s.symbol?.replace(/\.(NS|BO)$/i, ""), s.exchange || "NSE", s.qty, s.buyDate, s.avgPrice, Number(s.qty) * Number(s.avgPrice), s.currentPrice || 0, (Number(s.currentPrice || 0) - Number(s.avgPrice)) * Number(s.qty)]
                )}
              >
                Export CSV
              </Button>
            )}
          </div>
          {stocksBoughtInFY.length === 0 ? (
            <Card style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: THEME.muted }}>No stock purchases recorded in {fyLabel}</div>
            </Card>
          ) : (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(128,128,128,0.02)" }}>
                      <th style={{ ...th, paddingLeft: 10 }}>Company</th>
                      <th style={{ ...th, textAlign: "right" }}>Qty</th>
                      <th style={{ ...th, textAlign: "right" }}>Buy Date</th>
                      <th style={{ ...th, textAlign: "right" }}>Buy Price</th>
                      <th style={{ ...th, textAlign: "right" }}>Amount</th>
                      <th style={{ ...th, textAlign: "right" }}>Curr Price</th>
                      <th style={{ ...th, textAlign: "right" }}>Unrealized P&L</th>
                    </tr>
                  </thead>
                  <tbody>{stocksBoughtInFY.map((s: any) => { const curr = Number(s.currentPrice || 0); const inv = Number(s.qty) * Number(s.avgPrice); const val = Number(s.qty) * curr; const pnl = val - inv; return (<tr key={s.id} style={{ borderBottom: `1px solid ${THEME.line}`, transition: "background 0.2s" }} className="table-row-hover"><td style={{ ...td, paddingLeft: 10 }}><b>{s.symbol?.replace(/\.(NS|BO)$/i, "")}</b><span style={{ fontSize: 10, marginLeft: 6, color: THEME.muted, background: "rgba(128,128,128,0.1)", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>{s.exchange || "NSE"}</span></td><td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{s.qty}</td><td style={{ ...td, textAlign: "right", color: THEME.muted }}>{fmtDate(s.buyDate)}</td><td style={{ ...td, textAlign: "right", fontWeight: 600 }}>₹{Number(s.avgPrice).toFixed(2)}</td><td style={{ ...td, textAlign: "right", fontWeight: 800 }}>₹{inv.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td><td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{curr ? `₹${curr.toFixed(2)}` : "—"}</td><td style={{ ...td, textAlign: "right", color: pnl >= 0 ? THEME.sage : THEME.rust, fontWeight: 800 }}>{curr ? `${pnl >= 0 ? "+" : ""}₹${Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}</td></tr>); })}</tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ────────────────── SECTION: STOCKS SOLD ────────────────── */}
      {show("stocks_sold") && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>Stocks Sold</div>
              {stocksSoldInFY.length > 0 && <div style={{ fontSize: 12, fontWeight: 600, color: THEME.muted }}>Net Realized: <b style={{ color: stocksRealizedPnl >= 0 ? THEME.sage : THEME.rust, fontSize: 13 }}>{stocksRealizedPnl >= 0 ? "+" : ""}₹{Math.abs(stocksRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</b></div>}
            </div>
            {stocksSoldInFY.length > 0 && (
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<Download size={14} />} 
                onClick={() => exportToCSV(
                  stocksSoldInFY,
                  `Stocks_Sold_${fyLabel}.csv`,
                  ["Company", "Buy Date", "Buy Price", "Qty", "Sell Date", "Sell Price", "Profit/Loss", "Broker"],
                  (s) => [s.symbol?.replace(/\.(NS|BO)$/i, ""), s.buyDate, s.buyPrice, s.qty, s.sellDate, s.sellPrice, s.profit, s.broker]
                )}
              >
                Export CSV
              </Button>
            )}
          </div>
          <SoldTable rows={stocksSoldInFY} type="stock" />
        </div>
      )}

      {/* ────────────────── SECTION: MF BOUGHT ────────────────── */}
      {show("mf_bought") && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>Mutual Funds Bought</div>
            {mfBoughtInFY.length > 0 && (
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<Download size={14} />} 
                onClick={() => exportToCSV(
                  mfBoughtInFY,
                  `MF_Bought_${fyLabel}.csv`,
                  ["Scheme", "Category/Type", "Units", "Buy Date", "Buy NAV", "Invested Amount", "Current NAV", "Unrealized P&L"],
                  (m) => [m.scheme, m.type || "Equity", m.units, m.buyDate, m.buyNav || 0, Number(m.units) * Number(m.buyNav || 0), m.currentNav || 0, (Number(m.currentNav || 0) - Number(m.buyNav || 0)) * Number(m.units)]
                )}
              >
                Export CSV
              </Button>
            )}
          </div>
          {mfBoughtInFY.length === 0 ? (
            <Card style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: THEME.muted }}>No MF purchases recorded in {fyLabel}</div>
            </Card>
          ) : (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(128,128,128,0.02)" }}>
                      <th style={{ ...th, paddingLeft: 10 }}>Scheme</th>
                      <th style={{ ...th, textAlign: "right" }}>Units</th>
                      <th style={{ ...th, textAlign: "right" }}>Buy Date</th>
                      <th style={{ ...th, textAlign: "right" }}>Buy NAV</th>
                      <th style={{ ...th, textAlign: "right" }}>Amount</th>
                      <th style={{ ...th, textAlign: "right" }}>Curr NAV</th>
                      <th style={{ ...th, textAlign: "right" }}>Unrealized P&L</th>
                    </tr>
                  </thead>
                  <tbody>{mfBoughtInFY.map((m: any) => { const buyNav = m.buyNav ? Number(m.buyNav) : (m.invested && m.units ? Number(m.invested) / Number(m.units) : 0); const currNav = Number(m.currentNav || 0); const inv = Number(m.units) * buyNav; const val = Number(m.units) * currNav; const pnl = val - inv; return (<tr key={m.id} style={{ borderBottom: `1px solid ${THEME.line}`, transition: "background 0.2s" }} className="table-row-hover"><td style={{ ...td, paddingLeft: 10 }}><b>{m.scheme}</b>{m.type && <span style={{ fontSize: 10, marginLeft: 6, color: THEME.muted, background: "rgba(128,128,128,0.1)", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>{m.type}</span>}</td><td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{Number(m.units).toFixed(3)}</td><td style={{ ...td, textAlign: "right", color: THEME.muted }}>{fmtDate(m.buyDate)}</td><td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{buyNav ? `₹${buyNav.toFixed(4)}` : "—"}</td><td style={{ ...td, textAlign: "right", fontWeight: 800 }}>₹{inv.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td><td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{currNav ? `₹${currNav.toFixed(4)}` : "—"}</td><td style={{ ...td, textAlign: "right", color: pnl >= 0 ? THEME.sage : THEME.rust, fontWeight: 800 }}>{currNav ? `${pnl >= 0 ? "+" : ""}₹${Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}</td></tr>); })}</tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ────────────────── SECTION: MF SOLD ────────────────── */}
      {show("mf_sold") && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>Mutual Funds Redeemed</div>
              {mfSoldInFY.length > 0 && <div style={{ fontSize: 12, fontWeight: 600, color: THEME.muted }}>Net Realized: <b style={{ color: mfRealizedPnl >= 0 ? THEME.sage : THEME.rust, fontSize: 13 }}>{mfRealizedPnl >= 0 ? "+" : ""}₹{Math.abs(mfRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</b></div>}
            </div>
            {mfSoldInFY.length > 0 && (
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<Download size={14} />} 
                onClick={() => exportToCSV(
                  mfSoldInFY,
                  `MF_Redeemed_${fyLabel}.csv`,
                  ["Scheme", "Buy Date", "Buy NAV", "Units", "Sell Date", "Sell NAV", "Profit/Loss", "Broker"],
                  (m) => [m.scheme, m.buyDate, m.buyNav, m.units, m.sellDate, m.sellNav, m.profit, m.broker]
                )}
              >
                Export CSV
              </Button>
            )}
          </div>
          <SoldTable rows={mfSoldInFY} type="mf" />
        </div>
      )}

      {/* ────────────────── SECTION: CASH & BANK LEDGER ────────────────── */}
      {show("cash_ledger") && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>Bank & Cash Ledger</div>
              {cashTransactionsInFY.length > 0 && (
                <div style={{ fontSize: 12, fontWeight: 600, color: THEME.muted }}>
                  Total Inflow: <span style={{ color: THEME.sage }}>+₹{totalCredits.toLocaleString("en-IN")}</span> · 
                  Total Outflow: <span style={{ color: THEME.rust }}>-₹{totalDebits.toLocaleString("en-IN")}</span>
                </div>
              )}
            </div>
            {cashTransactionsInFY.length > 0 && (
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<Download size={14} />} 
                onClick={() => exportToCSV(
                  cashTransactionsInFY,
                  `Cash_Ledger_${fyLabel}.csv`,
                  ["Date", "Note", "Category", "Type", "Amount", "Description"],
                  (t) => [t.date, t.note, t.category, t.type, t.amount, t.description || ""]
                )}
              >
                Export CSV
              </Button>
            )}
          </div>

          {cashTransactionsInFY.length === 0 ? (
            <Card style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: THEME.muted }}>No bank/cash transactions recorded in {fyLabel} matching your search</div>
            </Card>
          ) : (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(128,128,128,0.02)" }}>
                      <th style={{ ...th, paddingLeft: 10 }}>Note / Category</th>
                      <th style={{ ...th, textAlign: "right" }}>Date</th>
                      <th style={{ ...th, textAlign: "right" }}>Type</th>
                      <th style={{ ...th, textAlign: "right" }}>Amount</th>
                      <th style={{ ...th, textAlign: "right" }}>Description</th>
                      <th style={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashTransactionsInFY.map((t: any) => {
                      const amount = Number(t.amount || 0);
                      const isCredit = t.type === "credit";
                      return (
                        <tr key={t.id} style={{ borderBottom: `1px solid ${THEME.line}`, transition: "background 0.2s" }} className="table-row-hover">
                          <td style={{ ...td, paddingLeft: 10 }}>
                            <b>{t.note || "General Ledger"}</b>
                            <span style={{ fontSize: 10, marginLeft: 6, color: THEME.muted, background: "rgba(128,128,128,0.1)", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>{t.category || "Other"}</span>
                          </td>
                          <td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12 }}>{fmtDate(t.date)}</td>
                          <td style={{ ...td, textAlign: "right", color: isCredit ? THEME.sage : THEME.rust, fontWeight: 700, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.02em" }}>
                            {t.type || "debit"}
                          </td>
                          <td style={{ ...td, textAlign: "right", color: isCredit ? THEME.sage : THEME.ink, fontWeight: 800, fontSize: 14 }}>
                            {isCredit ? "+" : "-"}₹{amount.toLocaleString("en-IN")}
                          </td>
                          <td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.description || "—"}
                          </td>
                          <td style={td}>
                            <Button variant="ghost" size="sm" onClick={() => removeItem("transactions", t.id)} style={{ padding: 6, color: THEME.rust }}>
                              <Trash2 size={14} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
