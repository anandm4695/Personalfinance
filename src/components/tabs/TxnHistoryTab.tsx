// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Trash2, BarChart3, ArrowLeftRight, Layers, Coins } from "lucide-react";
import { THEME } from "../../utils/constants";
import { Prv } from "../../context/PrivacyContext";

// Internal helper components
const SectionTitle = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <div style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>{children}</h2>
    {sub && <p style={{ color: THEME.muted, fontSize: 13, marginTop: 4 }}>{sub}</p>}
  </div>
);

const Tile = ({ icon: Icon, label, value, sub, subColor }: any) => (
  <div style={{ background: "var(--surface-0)", padding: 20, borderRadius: 12, border: `1px solid ${THEME.line}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: THEME.muted, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
      <Icon size={14} /> {label}
    </div>
    <div style={{ fontSize: 20, fontWeight: 800 }}><Prv>{value}</Prv></div>
    {sub && <div style={{ fontSize: 11, color: subColor || THEME.muted, marginTop: 4, fontWeight: 600 }}>{sub}</div>}
  </div>
);

const EmptyHint = ({ text }: { text: string }) => (
  <div style={{ padding: "40px 20px", textAlign: "center", color: THEME.muted }}>
    <div style={{ fontSize: 14 }}>{text}</div>
  </div>
);

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

const input = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--t-paper)",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: 10,
  color: THEME.ink,
  fontSize: 14,
};

const card = {
  background: "var(--surface-0)",
  borderRadius: 12,
  border: `1px solid ${THEME.line}`,
  padding: 20,
};

const iconBtn = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: THEME.muted,
  padding: "5px",
  borderRadius: 6,
  display: "inline-flex",
  alignItems: "center",
};

const th = { textAlign: "left" as const, padding: "11px 10px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: THEME.muted, fontWeight: 700, borderBottom: `1px solid var(--t-line)`, whiteSpace: "nowrap" as const };
const td = { padding: "12px 10px", verticalAlign: "top" as const, fontSize: 13, borderBottom: `1px solid var(--t-line)` };

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
  const inFY = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= fyStart(selectedFY) && d <= fyEnd(selectedFY);
  };

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
    [state.stocks, selectedFY, txnDematId]
  );
  const stocksSoldInFY = useMemo(() =>
    (state.stockSells || [])
      .filter((s: any) => inFY(s.sellDate) && (!txnDematId || s.dematId === txnDematId))
      .sort((a: any, b: any) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()),
    [state.stockSells, selectedFY, txnDematId]
  );
  const mfBoughtInFY = useMemo(() =>
    (state.mutualFunds || []).filter((m: any) => inFY(m.buyDate))
      .sort((a: any, b: any) => new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()),
    [state.mutualFunds, selectedFY]
  );
  const mfSoldInFY = useMemo(() =>
    (state.mfSells || []).filter((m: any) => inFY(m.sellDate))
      .sort((a: any, b: any) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()),
    [state.mfSells, selectedFY]
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
    if (rows.length === 0) return <div style={card}><EmptyHint text={`No ${type === "stock" ? "stock sales" : "MF redemptions"} recorded in ${fyLabel}`} /></div>;
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${THEME.line}` }}>
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
                <tr key={s.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
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
                  <td style={{ ...td, textAlign: "right", color: profit >= 0 ? THEME.sage : THEME.rust, fontWeight: 600 }}>
                    {profit >= 0 ? "+" : ""}₹{Math.abs(profit).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12 }}>{s.broker || "—"}</td>
                  <td style={td}>
                    <button onClick={() => removeItem(type === "stock" ? "stockSells" : "mfSells", s.id)} style={iconBtn}><Trash2 size={13} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${THEME.line}` }}>
              <td colSpan={6} style={{ ...td, paddingLeft: 4, fontWeight: 700 }}>Total</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 700, color: total >= 0 ? THEME.sage : THEME.rust }}>
                {total >= 0 ? "+" : ""}₹{Math.abs(total).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </td>
              <td colSpan={2} style={td}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div>
      <SectionTitle sub="Complete record of every stock and MF you bought and sold">
        Transaction History
      </SectionTitle>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--t-muted)" }}>Period:</span>
          <select style={{ ...input, width: "auto", padding: "6px 10px" }} value={selectedFY} onChange={(e) => setSelectedFY(Number(e.target.value))}>
            {allFYs.map((fy) => <option key={fy} value={fy}>FY {String(fy).slice(2)}-{String(fy + 1).slice(2)}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {sections.map((s) => (
            <button key={s.id} style={{ ...btnGhost, fontSize: 12, padding: "5px 12px", ...(activeSection === s.id ? { background: THEME.accent, color: "#fff", borderColor: THEME.accent } : {}) }} onClick={() => setActiveSection(s.id)}>{s.label}</button>
          ))}
        </div>
      </div>

      {(state.demat || []).length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--t-muted)" }}>Account:</span>
          <button onClick={() => setTxnDematId(null)} style={{ ...btnGhost, fontSize: 12, padding: "4px 12px", ...(txnDematId === null ? { background: THEME.accent, color: "#fff", borderColor: THEME.accent } : {}) }}>All</button>
          {(state.demat || []).map((d: any) => (
            <button key={d.id} onClick={() => setTxnDematId(d.id)} style={{ ...btnGhost, fontSize: 12, padding: "4px 12px", ...(txnDematId === d.id ? { background: THEME.accent, color: "#fff", borderColor: THEME.accent } : {}) }}>{d.broker || d.dpId || "Account"}</button>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 14, marginBottom: 28 }}>
        <Tile icon={BarChart3} label="Stocks Bought" value={String(stocksBoughtInFY.length)} sub={`${fyLabel} lots`} />
        <Tile icon={ArrowLeftRight} label="Stocks Sold" value={String(stocksSoldInFY.length)} sub={`Realized: ${stocksRealizedPnl >= 0 ? "+" : ""}₹${Math.abs(stocksRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} subColor={stocksRealizedPnl >= 0 ? THEME.sage : THEME.rust} />
        <Tile icon={Layers} label="MF Bought" value={String(mfBoughtInFY.length)} sub={`${fyLabel} lots`} />
        <Tile icon={ArrowLeftRight} label="MF Redeemed" value={String(mfSoldInFY.length)} sub={`Realized: ${mfRealizedPnl >= 0 ? "+" : ""}₹${Math.abs(mfRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} subColor={mfRealizedPnl >= 0 ? THEME.sage : THEME.rust} />
        <Tile icon={Coins} label="Total Realized P&L" value={`${totalRealizedPnl >= 0 ? "+" : ""}₹${Math.abs(totalRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} subColor={totalRealizedPnl >= 0 ? THEME.sage : THEME.rust} sub={fyLabel} />
      </div>

      {show("stocks_bought") && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Stocks Bought</div>
          {stocksBoughtInFY.length === 0 ? <div style={card}><EmptyHint text={`No stock purchases recorded in ${fyLabel}`} /></div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ borderBottom: `2px solid ${THEME.line}` }}><th style={{ ...th, paddingLeft: 4 }}>Company</th><th style={{ ...th, textAlign: "right" }}>Qty</th><th style={{ ...th, textAlign: "right" }}>Buy Date</th><th style={{ ...th, textAlign: "right" }}>Buy Price</th><th style={{ ...th, textAlign: "right" }}>Amount</th><th style={{ ...th, textAlign: "right" }}>Curr Price</th><th style={{ ...th, textAlign: "right" }}>Unrealized P&L</th></tr></thead>
                <tbody>{stocksBoughtInFY.map((s: any) => { const curr = Number(s.currentPrice || 0); const inv = Number(s.qty) * Number(s.avgPrice); const val = Number(s.qty) * curr; const pnl = val - inv; return (<tr key={s.id} style={{ borderBottom: `1px solid ${THEME.line}` }}><td style={{ ...td, paddingLeft: 4 }}><b>{s.symbol?.replace(/\.(NS|BO)$/i, "")}</b><span style={{ fontSize: 10, marginLeft: 5, color: THEME.muted, background: THEME.line, padding: "1px 4px", borderRadius: 3 }}>{s.exchange || "NSE"}</span></td><td style={{ ...td, textAlign: "right" }}>{s.qty}</td><td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12 }}>{fmtDate(s.buyDate)}</td><td style={{ ...td, textAlign: "right" }}>₹{Number(s.avgPrice).toFixed(2)}</td><td style={{ ...td, textAlign: "right" }}>₹{inv.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td><td style={{ ...td, textAlign: "right" }}>{curr ? `₹${curr.toFixed(2)}` : "—"}</td><td style={{ ...td, textAlign: "right", color: pnl >= 0 ? THEME.sage : THEME.rust }}>{curr ? `${pnl >= 0 ? "+" : ""}₹${Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}</td></tr>); })}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {show("stocks_sold") && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}><div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700 }}>Stocks Sold</div>{stocksSoldInFY.length > 0 && <div style={{ fontSize: 13 }}>Net P&L: <b style={{ color: stocksRealizedPnl >= 0 ? THEME.sage : THEME.rust }}>{stocksRealizedPnl >= 0 ? "+" : ""}₹{Math.abs(stocksRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</b></div>}</div>
          <SoldTable rows={stocksSoldInFY} type="stock" />
        </div>
      )}

      {show("mf_bought") && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Mutual Funds Bought</div>
          {mfBoughtInFY.length === 0 ? <div style={card}><EmptyHint text={`No MF purchases recorded in ${fyLabel}`} /></div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ borderBottom: `2px solid ${THEME.line}` }}><th style={{ ...th, paddingLeft: 4 }}>Scheme</th><th style={{ ...th, textAlign: "right" }}>Units</th><th style={{ ...th, textAlign: "right" }}>Buy Date</th><th style={{ ...th, textAlign: "right" }}>Buy NAV</th><th style={{ ...th, textAlign: "right" }}>Amount</th><th style={{ ...th, textAlign: "right" }}>Curr NAV</th><th style={{ ...th, textAlign: "right" }}>Unrealized P&L</th></tr></thead>
                <tbody>{mfBoughtInFY.map((m: any) => { const buyNav = m.buyNav ? Number(m.buyNav) : (m.invested && m.units ? Number(m.invested) / Number(m.units) : 0); const currNav = Number(m.currentNav || 0); const inv = Number(m.units) * buyNav; const val = Number(m.units) * currNav; const pnl = val - inv; return (<tr key={m.id} style={{ borderBottom: `1px solid ${THEME.line}` }}><td style={{ ...td, paddingLeft: 4 }}><b>{m.scheme}</b>{m.type && <span style={{ fontSize: 10, marginLeft: 5, color: THEME.muted, background: THEME.line, padding: "1px 4px", borderRadius: 3 }}>{m.type}</span>}</td><td style={{ ...td, textAlign: "right" }}>{Number(m.units).toFixed(3)}</td><td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12 }}>{fmtDate(m.buyDate)}</td><td style={{ ...td, textAlign: "right" }}>{buyNav ? `₹${buyNav.toFixed(4)}` : "—"}</td><td style={{ ...td, textAlign: "right" }}>₹{inv.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td><td style={{ ...td, textAlign: "right" }}>{currNav ? `₹${currNav.toFixed(4)}` : "—"}</td><td style={{ ...td, textAlign: "right", color: pnl >= 0 ? THEME.sage : THEME.rust }}>{currNav ? `${pnl >= 0 ? "+" : ""}₹${Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}</td></tr>); })}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {show("mf_sold") && (
        <div style={{ marginBottom: 32 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}><div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700 }}>Mutual Funds Redeemed</div>{mfSoldInFY.length > 0 && <div style={{ fontSize: 13 }}>Net P&L: <b style={{ color: mfRealizedPnl >= 0 ? THEME.sage : THEME.rust }}>{mfRealizedPnl >= 0 ? "+" : ""}₹{Math.abs(mfRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</b></div>}</div><SoldTable rows={mfSoldInFY} type="mf" /></div>
      )}
    </div>
  );
}
