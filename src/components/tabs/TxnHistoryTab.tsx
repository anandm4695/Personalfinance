// @ts-nocheck
import React, { useState, useMemo, useCallback } from "react";
import { Trash2, BarChart3, ArrowLeftRight, Layers, Coins } from "lucide-react";
import { THEME } from "../../utils/constants";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

// Internal helper components


const th = { textAlign: "left" as const, padding: "12px 10px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: THEME.muted, fontWeight: 700, borderBottom: `1px solid ${THEME.line}`, whiteSpace: "nowrap" as const };
const td = { padding: "16px 10px", verticalAlign: "top" as const, fontSize: 13, borderBottom: `1px solid ${THEME.line}` };

export function TxnHistoryTab({ state, removeItem }: any) {
  const currentFY = (() => {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 3 ? y : y - 1;
  })();
  const [selectedFY, setSelectedFY] = useState(currentFY);
  const [activeSection, setActiveSection] = useState<"all" | "stocks_bought" | "stocks_sold" | "mf_bought" | "mf_sold">("all");
  const [txnDematId, setTxnDematId] = useState<string | null>(null);

  const fyStart = (fy: number) => new Date(`${fy}-04-01`);
  const fyEnd = (fy: number) => new Date(`${fy + 1}-03-31T23:59:59`);
  const inFY = useCallback((dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= fyStart(selectedFY) && d <= fyEnd(selectedFY);
  }, [selectedFY]);

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
    return Array.from(fySet).sort((a, b) => b - a);
  }, [state.stocks, state.stockSells, state.mutualFunds, state.mfSells, currentFY]);

  const stocksBoughtInFY = useMemo(() =>
    (state.stocks || [])
      .filter((s: any) => inFY(s.buyDate) && (!txnDematId || s.dematId === txnDematId))
      .sort((a: any, b: any) => new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()),
    [state.stocks, txnDematId, inFY]
  );
  const stocksSoldInFY = useMemo(() =>
    (state.stockSells || [])
      .filter((s: any) => inFY(s.sellDate) && (!txnDematId || s.dematId === txnDematId))
      .sort((a: any, b: any) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()),
    [state.stockSells, txnDematId, inFY]
  );
  const mfBoughtInFY = useMemo(() =>
    (state.mutualFunds || []).filter((m: any) => inFY(m.buyDate))
      .sort((a: any, b: any) => new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()),
    [state.mutualFunds, inFY]
  );
  const mfSoldInFY = useMemo(() =>
    (state.mfSells || []).filter((m: any) => inFY(m.sellDate))
      .sort((a: any, b: any) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()),
    [state.mfSells, inFY]
  );

  const stocksRealizedPnl = stocksSoldInFY.reduce((s: number, sl: any) => s + Number(sl.profit || 0), 0);
  const mfRealizedPnl = mfSoldInFY.reduce((s: number, sl: any) => s + Number(sl.profit || 0), 0);
  const totalRealizedPnl = stocksRealizedPnl + mfRealizedPnl;

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fyLabel = `FY ${String(selectedFY).slice(2)}-${String(selectedFY + 1).slice(2)}`;

  const sections = [
    { id: "all", label: "All" },
    { id: "stocks_bought", label: "Stocks Bought" },
    { id: "stocks_sold", label: "Stocks Sold" },
    { id: "mf_bought", label: "MF Bought" },
    { id: "mf_sold", label: "MF Sold" },
  ] as const;

  const show = (id: typeof sections[number]["id"]) => activeSection === "all" || activeSection === id;

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
              <th style={{ ...th, paddingLeft: 4 }}>{type === "stock" ? "Company" : "Scheme"}</th>
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
                  <td style={{ ...td, paddingLeft: 4 }}>
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
      <SectionTitle sub="Complete record of every stock and MF you bought and sold">
        Transaction History
      </SectionTitle>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 20, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(128,128,128,0.04)", padding: "4px 14px", borderRadius: 10, border: `1px solid ${THEME.line}` }}>
          <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Period</span>
          <select 
            style={{ background: "transparent", border: "none", color: THEME.ink, fontWeight: 800, fontSize: 13, cursor: "pointer", outline: "none" }} 
            value={selectedFY} 
            onChange={(e) => setSelectedFY(Number(e.target.value))}
          >
            {allFYs.map((fy) => <option key={fy} value={fy}>FY {String(fy).slice(2)}-{String(fy + 1).slice(2)}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {sections.map((s) => (
            <Button 
              key={s.id} 
              size="sm"
              variant={activeSection === s.id ? "accent" : "ghost"} 
              onClick={() => setActiveSection(s.id)}
              style={{ padding: "4px 14px", height: 32 }}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {(state.demat || []).length > 1 && (
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 32 }}>
        <StatCard 
          icon={<BarChart3 />} 
          label="Stocks Bought" 
          value={String(stocksBoughtInFY.length)} 
          sub={`${fyLabel} lots`} 
          color={THEME.accent}
        />
        <StatCard 
          icon={<ArrowLeftRight />} 
          label="Stocks Sold" 
          value={String(stocksSoldInFY.length)} 
          sub={`Realized: ${stocksRealizedPnl >= 0 ? "+" : ""}₹${Math.abs(stocksRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} 
          subColor={stocksRealizedPnl >= 0 ? THEME.sage : THEME.rust} 
          color={THEME.accent}
        />
        <StatCard 
          icon={<Layers />} 
          label="MF Bought" 
          value={String(mfBoughtInFY.length)} 
          sub={`${fyLabel} lots`} 
          color={THEME.accent}
        />
        <StatCard 
          icon={<ArrowLeftRight />} 
          label="MF Redeemed" 
          value={String(mfSoldInFY.length)} 
          sub={`Realized: ${mfRealizedPnl >= 0 ? "+" : ""}₹${Math.abs(mfRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} 
          subColor={mfRealizedPnl >= 0 ? THEME.sage : THEME.rust} 
          color={THEME.accent}
        />
        <StatCard 
          icon={<Coins />} 
          label="Total Realized P&L" 
          value={`${totalRealizedPnl >= 0 ? "+" : ""}₹${Math.abs(totalRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} 
          subColor={totalRealizedPnl >= 0 ? THEME.sage : THEME.rust} 
          sub={fyLabel} 
          color={totalRealizedPnl >= 0 ? THEME.sage : THEME.rust}
        />
      </div>

      {show("stocks_bought") && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, letterSpacing: "-0.01em" }}>Stocks Bought</div>
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

      {show("stocks_sold") && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>Stocks Sold</div>
            {stocksSoldInFY.length > 0 && <div style={{ fontSize: 13, fontWeight: 600 }}>Net Realized: <b style={{ color: stocksRealizedPnl >= 0 ? THEME.sage : THEME.rust, fontSize: 15 }}>{stocksRealizedPnl >= 0 ? "+" : ""}₹{Math.abs(stocksRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</b></div>}
          </div>
          <SoldTable rows={stocksSoldInFY} type="stock" />
        </div>
      )}

      {show("mf_bought") && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, letterSpacing: "-0.01em" }}>Mutual Funds Bought</div>
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

      {show("mf_sold") && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>Mutual Funds Redeemed</div>
            {mfSoldInFY.length > 0 && <div style={{ fontSize: 13, fontWeight: 600 }}>Net Realized: <b style={{ color: mfRealizedPnl >= 0 ? THEME.sage : THEME.rust, fontSize: 15 }}>{mfRealizedPnl >= 0 ? "+" : ""}₹{Math.abs(mfRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</b></div>}
          </div>
          <SoldTable rows={mfSoldInFY} type="mf" />
        </div>
      )}
    </div>
  );
}
