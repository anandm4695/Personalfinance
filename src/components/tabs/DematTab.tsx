import React, { useState, useMemo } from "react";
import { ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area } from "recharts";
import { Plus, Briefcase, TrendingUp, Percent, ArrowLeftRight, RefreshCw, ChevronDown, Edit3, Trash2, Scissors, BarChart3, Search, PieChart as PieIcon, Activity, ArrowUp, ArrowDown } from "lucide-react";
import { THEME, PROFILES } from "../../utils/constants";
import { fmtINR, fmtINRFull, calcCAGR, today } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";

// Broker logo domains for Clearbit
const BROKER_LOGO_DOMAINS: Record<string, string> = {
  zerodha:   "zerodha.com",
  kite:      "zerodha.com",
  groww:     "groww.in",
  kotak:     "kotakneo.com",
  upstox:    "upstox.com",
  hdfc:      "hdfcsec.com",
  icici:     "icicidirect.com",
  angel:     "angelbroking.com",
  motilal:   "motilaloswal.com",
  "5paisa":  "5paisa.com",
  paytm:     "paytmmoney.com",
  sharekhan: "sharekhan.com",
  fyers:     "fyers.in",
  dhan:      "dhan.co",
  iifl:      "iiflsecurities.com",
  sbi:       "sbisec.co.in",
  axis:      "axissecurities.in",
  ninestar:  "9star.in",
  "9star":   "9star.in",
};

// Broker brand colors — covers all major Indian brokers
const BROKER_THEMES: Record<string, { gradient: string; color: string }> = {
  zerodha:   { gradient: "linear-gradient(135deg,#387ed1 0%,#60a5fa 100%)", color: "#387ed1" },
  kite:      { gradient: "linear-gradient(135deg,#387ed1 0%,#60a5fa 100%)", color: "#387ed1" },
  groww:     { gradient: "linear-gradient(135deg,#00b899 0%,#34d399 100%)", color: "#00b899" },
  kotak:     { gradient: "linear-gradient(135deg,#dc2626 0%,#f87171 100%)", color: "#dc2626" },
  upstox:    { gradient: "linear-gradient(135deg,#7c3aed 0%,#a78bfa 100%)", color: "#7c3aed" },
  hdfc:      { gradient: "linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%)", color: "#1e40af" },
  icici:     { gradient: "linear-gradient(135deg,#f47920 0%,#fb923c 100%)", color: "#f47920" },
  angel:     { gradient: "linear-gradient(135deg,#1e40af 0%,#60a5fa 100%)", color: "#1e40af" },
  motilal:   { gradient: "linear-gradient(135deg,#d97706 0%,#fbbf24 100%)", color: "#d97706" },
  "5paisa":  { gradient: "linear-gradient(135deg,#0891b2 0%,#22d3ee 100%)", color: "#0891b2" },
  paytm:     { gradient: "linear-gradient(135deg,#2563eb 0%,#60a5fa 100%)", color: "#2563eb" },
  sharekhan: { gradient: "linear-gradient(135deg,#059669 0%,#34d399 100%)", color: "#059669" },
  fyers:     { gradient: "linear-gradient(135deg,#0f172a 0%,#334155 100%)", color: "#334155" },
  dhan:      { gradient: "linear-gradient(135deg,#7c3aed 0%,#c084fc 100%)", color: "#7c3aed" },
  iifl:      { gradient: "linear-gradient(135deg,#b45309 0%,#f59e0b 100%)", color: "#b45309" },
  sbi:       { gradient: "linear-gradient(135deg,#1d4ed8 0%,#60a5fa 100%)", color: "#1d4ed8" },
  axis:      { gradient: "linear-gradient(135deg,#7c2d12 0%,#f97316 100%)", color: "#ea580c" },
  ninestar:  { gradient: "linear-gradient(135deg,#b45309 0%,#fbbf24 100%)", color: "#b45309" },
  "9star":   { gradient: "linear-gradient(135deg,#b45309 0%,#fbbf24 100%)", color: "#b45309" },
};

function getBrokerTheme(broker: string) {
  const key = (broker || "").toLowerCase().replace(/[\s\-_.]+/g, "");
  for (const [k, v] of Object.entries(BROKER_THEMES)) {
    if (key.includes(k)) return v;
  }
  // Deterministic color from broker name so it's stable across renders
  const hue = Array.from(broker || "?").reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0) % 360;
  const color = `hsl(${hue},55%,42%)`;
  return { gradient: `linear-gradient(135deg,hsl(${hue},55%,42%) 0%,hsl(${hue},70%,62%) 100%)`, color };
}

function getBrokerLogoUrl(broker: string): string | null {
  const key = (broker || "").toLowerCase().replace(/[\s\-_.]+/g, "");
  for (const [k, domain] of Object.entries(BROKER_LOGO_DOMAINS)) {
    if (key.includes(k)) return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }
  return null;
}

function brokerInitials(broker: string): string {
  const words = (broker || "?").trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Module-level cache so logos persist across re-renders without extra fetches
const _logoCache: Record<string, { logoUrl: string | null; faviconUrl: string | null } | null> = {};

export const StockLogo = ({ yfSym, size = 36 }: { yfSym: string; size?: number }) => {
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = React.useState<string | null>(null);
  // Track failed URLs by URL string — avoids eohdErr timing bug where initial EODHD attempt
  // poisons the fallback state before the API responds with better sources.
  const [failedUrls, setFailedUrls] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setFailedUrls(new Set()); // reset failures when symbol changes
    if (yfSym in _logoCache) {
      const c = _logoCache[yfSym];
      setLogoUrl(c?.logoUrl ?? null);
      setFaviconUrl(c?.faviconUrl ?? null);
      return;
    }
    let cancelled = false;
    fetch(`/api/stock-logo?symbol=${encodeURIComponent(yfSym)}`)
      .then(r => r.json())
      .then(d => {
        _logoCache[yfSym] = d;
        if (!cancelled) { setLogoUrl(d.logoUrl ?? null); setFaviconUrl(d.faviconUrl ?? null); }
      })
      .catch(() => { _logoCache[yfSym] = null; });
    return () => { cancelled = true; };
  }, [yfSym]);

  const base = yfSym.replace(/\.(NS|BO)$/i, "");
  const isBSE = /\.BO$/i.test(yfSym);
  const exch = isBSE ? "BSE" : "NSE";
  const eohdUrl = `https://eodhd.com/img/logos/${exch}/${base}.png`;
  const hue = Array.from(base).reduce((h: number, c: string) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0) % 360;
  const br = Math.round(size * 0.28);
  const pad = Math.round(size * 0.1);

  const imgStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "contain" };
  const wrapStyle: React.CSSProperties = { width: size, height: size, borderRadius: br, background: "#fff", border: `1px solid ${THEME.line}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, padding: pad, boxSizing: "border-box" };

  const markFailed = (url: string) => setFailedUrls(prev => new Set([...prev, url]));

  // Fallback chain: Clearbit/EODHD (from API) → EODHD CDN (client-direct, if not already logoUrl)
  // → faviconUrl (Yahoo-sourced Google Favicon, last resort — always returns something).
  // faviconUrl sits last so EODHD is tried first; it never triggers onError so acts as a guaranteed net.
  const candidates: string[] = [logoUrl, eohdUrl !== logoUrl ? eohdUrl : null, faviconUrl]
    .filter(Boolean) as string[];
  const activeSrc = candidates.find(u => !failedUrls.has(u));

  if (activeSrc) {
    return (
      <div style={wrapStyle}>
        <img src={activeSrc} alt={base} onError={() => markFailed(activeSrc)} style={imgStyle} />
      </div>
    );
  }

  return (
    <div style={{ width: size, height: size, borderRadius: br, background: `linear-gradient(135deg,hsl(${hue},55%,42%) 0%,hsl(${hue},70%,62%) 100%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: Math.round(size * 0.3), fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>{base.slice(0, 2)}</span>
    </div>
  );
};

const BrokerLogo = ({ broker, theme, size, borderRadius }: { broker: string; theme: { gradient: string; color: string }; size: number; borderRadius: number }) => {
  const [imgErr, setImgErr] = React.useState(false);
  const logoUrl = getBrokerLogoUrl(broker);
  const initials = brokerInitials(broker || "?");
  const fontSize = Math.round(size * 0.38);

  if (logoUrl && !imgErr) {
    return (
      <div style={{
        width: size, height: size, borderRadius,
        background: "#fff",
        border: `1.5px solid ${theme.color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        boxShadow: `0 4px 14px ${theme.color}30`,
        overflow: "hidden",
      }}>
        <img
          src={logoUrl}
          alt={broker}
          onError={() => setImgErr(true)}
          style={{ width: Math.round(size * 0.75), height: Math.round(size * 0.75), objectFit: "contain" }}
        />
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius,
      background: theme.gradient,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      boxShadow: `0 4px 14px ${theme.color}40`,
    }}>
      <span style={{ fontSize, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em", lineHeight: 1 }}>{initials}</span>
    </div>
  );
};




const EmptyHint = ({ text }: { text: string }) => (
  <div style={{ padding: "32px 20px", textAlign: "center", color: THEME.muted }}>
    <div style={{ fontSize: 13 }}>{text}</div>
  </div>
);

const DematEmptyState = ({ onAdd }: any) => (
  <div style={{ padding: "48px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
    <div style={{ width: 56, height: 56, borderRadius: 18, background: "linear-gradient(135deg,#059669 0%,#34d399 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Briefcase size={24} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>No Demat Accounts Added</div>
      <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 340 }}>Add your Zerodha, Groww, or Upstox account to start tracking your equity portfolio.</div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {["Zerodha / Groww / Upstox", "DP ID & Client ID", "Multi-broker Support", "Portfolio View"].map(f => (
        <span key={f} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: `${THEME.sage}15`, color: THEME.sage, fontWeight: 600, border: `1px solid ${THEME.sage}26` }}>● {f}</span>
      ))}
    </div>
    <button style={{ padding: "9px 22px", background: "linear-gradient(135deg,#059669 0%,#34d399 100%)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={onAdd}>
      <Plus size={15} /> Add Demat Account
    </button>
  </div>
);

const StockEmptyState = ({ onAdd }: any) => (
  <div style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
    <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#7c3aed 0%,#c084fc 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <TrendingUp size={28} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No Stock Holdings Yet</div>
      <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 380 }}>Add your equity scrips to track live NSE/BSE prices, unrealised P&L, CAGR, and intraday charts — all in one place.</div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {["Live NSE / BSE Prices", "Unrealised P&L", "CAGR Calculator", "Buy / Sell Ledger"].map(f => (
        <span key={f} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, background: "#7c3aed15", color: "#7c3aed", fontWeight: 600, border: "1px solid #7c3aed26" }}>● {f}</span>
      ))}
    </div>
    <button style={{ marginTop: 8, padding: "10px 24px", background: "linear-gradient(135deg,#7c3aed 0%,#c084fc 100%)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={onAdd}>
      <Plus size={16} /> Add Stock Scrip
    </button>
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

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
    {children}
  </div>
);

const InvestCard = ({ children, onRemove, onEdit, style: extraStyle }: any) => (
  <Card style={{ position: "relative", overflow: "hidden", ...extraStyle }}>
    <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4 }}>
      <button onClick={onEdit} style={iconBtn}><Edit3 size={14} /></button>
      <button onClick={onRemove} style={iconBtn}><Trash2 size={14} /></button>
    </div>
    {children}
  </Card>
);

const th = { textAlign: "left" as const, padding: "11px 10px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: THEME.muted, fontWeight: 700, borderBottom: `1px solid var(--t-line)`, whiteSpace: "nowrap" as const };
const td = { padding: "12px 10px", verticalAlign: "top" as const, fontSize: 13, borderBottom: `1px solid var(--t-line)` };

type FifoAlloc = {
  lot: any;
  consume: number;
  buyPrice: number;
  pnl: number;
  isLTCG: boolean;
  fullyConsumed: boolean;
};

function computeFifoAlloc(lots: any[], sellQty: number, sellPrice: number): FifoAlloc[] {
  const sorted = [...lots].sort((a: any, b: any) => {
    if (!a.buyDate && !b.buyDate) return 0;
    if (!a.buyDate) return 1;
    if (!b.buyDate) return -1;
    return new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime();
  });
  const result: FifoAlloc[] = [];
  let remaining = sellQty;
  const now = Date.now();
  for (const lot of sorted) {
    if (remaining <= 0) break;
    const available = Number(lot.qty);
    const consume = Math.min(available, remaining);
    const buyPrice = Number(lot.avgPrice);
    const isLTCG = lot.buyDate
      ? (now - new Date(lot.buyDate).getTime()) > 365 * 86400 * 1000
      : false;
    result.push({ lot, consume, buyPrice, pnl: (sellPrice - buyPrice) * consume, isLTCG, fullyConsumed: consume >= available });
    remaining -= consume;
  }
  return result;
}

export function DematTab({ state, addItem, removeItem, updateItem, missingTables = [], marketData, fetchLivePrices, fetchingPrices, marketDataTs }: any) {
  const [showDemat, setShowDemat] = useState(false);
  const [editDematId, setEditDematId] = useState<string | null>(null);
  const [showStock, setShowStock] = useState(false);
  const [stockDefaults, setStockDefaults] = useState<any>(null);
  const [editStockId, setEditStockId] = useState<string | null>(null);

  const [chartData, setChartData] = useState<any>({});
  const [expandedSymbols, setExpandedSymbols] = useState(new Set<string>());
  const [lotSortDir, setLotSortDir] = useState<Record<string, "asc" | "desc">>({});
  const [fetchingChart, setFetchingChart] = useState<string | null>(null);
  const [sellLot, setSellLot] = useState<any>(null);
  const [fifoSellGroup, setFifoSellGroup] = useState<any>(null);
  const [splitBonusGroup, setSplitBonusGroup] = useState<any>(null);
  const [selectedDematId, setSelectedDematId] = useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<"value" | "pnl" | "name" | "change">(() => {
    return (localStorage.getItem("finance_demat_sort") as any) || "value";
  });
  const [search, setSearch] = useState("");

  React.useEffect(() => {
    localStorage.setItem("finance_demat_sort", sortBy);
  }, [sortBy]);

  const groups: any[] = useMemo(() => Object.values(
    state.stocks.reduce((acc: any, s: any) => {
      const base = s.symbol.replace(/\.(NS|BO)$/i, "");
      const exch = s.exchange || "NSE";
      const key = `${base}|${exch}`;
      if (!acc[key]) acc[key] = { base, exchange: exch, yfSym: `${base}.${exch === "BSE" ? "BO" : "NS"}`, lots: [] };
      acc[key].lots.push(s);
      return acc;
    }, {})
  ), [state.stocks]);

  const visibleGroups = useMemo(() => {
    let baseGroups = selectedDematId
      ? groups.map((g) => ({ ...g, lots: g.lots.filter((l: any) => l.dematId === selectedDematId) })).filter((g) => g.lots.length > 0)
      : groups;

    if (search) {
      const q = search.toLowerCase();
      baseGroups = baseGroups.filter(g => g.base.toLowerCase().includes(q) || marketData[g.yfSym]?.sector?.toLowerCase().includes(q));
    }

    return [...baseGroups].sort((a, b) => {
      const mdA = marketData[a.yfSym];
      const mdB = marketData[b.yfSym];
      
      if (sortBy === "name") return a.base.localeCompare(b.base);
      
      if (sortBy === "change") {
        const cA = mdA?.changePercent || 0;
        const cB = mdB?.changePercent || 0;
        return cB - cA;
      }
      
      const priceA = mdA?.price || Number(a.lots[0]?.currentPrice || 0);
      const priceB = mdB?.price || Number(b.lots[0]?.currentPrice || 0);
      const valA = a.lots.reduce((s: number, l: any) => s + (Number(l.qty) * priceA), 0);
      const valB = b.lots.reduce((s: number, l: any) => s + (Number(l.qty) * priceB), 0);
      
      if (sortBy === "value") return valB - valA;
      
      if (sortBy === "pnl") {
        const invA = a.lots.reduce((s: number, l: any) => s + (Number(l.qty) * Number(l.avgPrice)), 0);
        const invB = b.lots.reduce((s: number, l: any) => s + (Number(l.qty) * Number(l.avgPrice)), 0);
        const pnlPctA = invA ? ((valA - invA) / invA) * 100 : 0;
        const pnlPctB = invB ? ((valB - invB) / invB) * 100 : 0;
        return pnlPctB - pnlPctA;
      }
      
      return 0;
    });
  }, [groups, selectedDematId, marketData, sortBy, search]);

  const filteredStocks = selectedDematId
    ? state.stocks.filter((s: any) => s.dematId === selectedDematId)
    : state.stocks;

  const handleRefresh = async () => {
    try {
      await fetchLivePrices();
    } catch (e: any) {
      console.error(`Failed to fetch: ${e.message}`);
    }
  };

  const fetchIntradayChart = async (yfSym: string) => {
    if (chartData[yfSym] || fetchingChart === yfSym) return;
    setFetchingChart(yfSym);
    try {
      const res = await fetch(`/api/stock-chart?symbol=${encodeURIComponent(yfSym)}`);
      if (res.ok) {
        const data = await res.json();
        const entry = Array.isArray(data) ? { date: null, points: data } : data;
        setChartData((prev: any) => ({ ...prev, [yfSym]: entry }));
      } else {
        setChartData((prev: any) => ({ ...prev, [yfSym]: { date: null, points: [] } }));
      }
    } catch (_) {
      setChartData((prev: any) => ({ ...prev, [yfSym]: { date: null, points: [] } }));
    }
    setFetchingChart(null);
  };

  const toggleExpand = (yfSym: string) => {
    setExpandedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(yfSym)) {
        next.delete(yfSym);
      } else {
        next.add(yfSym);
        fetchIntradayChart(yfSym);
      }
      return next;
    });
  };

  const totalValue = filteredStocks.reduce((s: number, st: any) => {
    const base = st.symbol.replace(/\.(NS|BO)$/i, "");
    const exch = st.exchange || "NSE";
    const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
    const livePrice = marketData[yfSym]?.price;
    const price = livePrice !== undefined ? Number(livePrice) : Number(st.currentPrice || 0);
    return s + (Number(st.qty) * price);
  }, 0);
  
  const totalInvested = filteredStocks.reduce((s: number, st: any) => s + Number(st.qty) * Number(st.avgPrice), 0);
  const pnl = totalValue - totalInvested;

  const totalDaysPnL = filteredStocks.reduce((s: number, st: any) => {
    const base = st.symbol.replace(/\.(NS|BO)$/i, "");
    const exch = st.exchange || "NSE";
    const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
    const md = marketData[yfSym];
    if (!md) return s;
    const change = md.change ?? 0;
    return s + (Number(st.qty) * change);
  }, 0);

  const prevCloseValue = totalValue - totalDaysPnL;
  const totalDaysPnLPct = prevCloseValue > 0 ? (totalDaysPnL / prevCloseValue) * 100 : 0;

  const fmtVol = (v: number) => {
    if (!v) return "—";
    if (v >= 1e7) return (v / 1e7).toFixed(2) + "Cr";
    if (v >= 1e5) return (v / 1e5).toFixed(2) + "L";
    if (v >= 1000) return (v / 1000).toFixed(1) + "K";
    return String(v);
  };

  return (
    <div className="tab-content-enter">
      <SectionTitle 
        sub="Live portfolio tracking and brokerage management"
        rightElement={
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              <Button
                variant="ghost"
                icon={<RefreshCw size={13} className={fetchingPrices ? "spin" : ""} />}
                onClick={handleRefresh}
                disabled={fetchingPrices}
                style={{ minWidth: 120, justifyContent: "center" }}
              >
                {fetchingPrices ? "Updating…" : "Live Refresh"}
              </Button>
              {marketDataTs && !fetchingPrices && (
                <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 500 }}>
                  {(() => {
                    const diffMin = Math.floor((Date.now() - marketDataTs) / 60000);
                    if (diffMin < 1) return "Updated just now";
                    if (diffMin === 1) return "Updated 1 min ago";
                    if (diffMin < 60) return `Updated ${diffMin} min ago`;
                    const hrs = Math.floor(diffMin / 60);
                    return `Updated ${hrs}h ago`;
                  })()}
                </span>
              )}
            </div>
            {state.stocks.length > 0 && (
              <Button variant="accent" icon={<Plus size={14} />} onClick={() => { setStockDefaults(null); setShowStock(true); }}>
                Add Scrip
              </Button>
            )}
          </div>
        }
      >
        Demat & Stocks
      </SectionTitle>

      {/* ── MIGRATION BANNER: shown when corporate_actions table is missing in Supabase ── */}
      {missingTables.includes("corporate_actions") && (
        <div style={{ background: `${THEME.rust}0f`, border: `1.5px solid ${THEME.rust}`, borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: THEME.rust, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>!</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.rust, marginBottom: 4 }}>One-time DB setup required — Stock Split / Bonus History won't save to cloud yet</div>
              <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 12 }}>
                The <b>corporate_actions</b> table is missing in your Supabase database. Your split/bonus actions are saved <b>locally on this device only</b> until you run this SQL once in Supabase.
              </div>
              <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 6, fontWeight: 700 }}>Steps: Go to supabase.com → your project → SQL Editor → paste and run:</div>
              <pre style={{ fontSize: 11, background: "rgba(0,0,0,0.07)", padding: "10px 14px", borderRadius: 8, color: THEME.ink, margin: 0, overflowX: "auto" as const, whiteSpace: "pre" as const, lineHeight: 1.6 }}>{`CREATE TABLE IF NOT EXISTS public.corporate_actions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  owner text not null default 'self',
  symbol text not null,
  exchange text not null default 'NSE',
  action_type text not null check (action_type in ('split', 'bonus')),
  ratio_n numeric not null,  ratio_m numeric not null,
  action_date date, old_qty numeric, new_qty numeric,
  old_avg_price numeric, new_avg_price numeric,
  created_at timestamp with time zone default now()
);
ALTER TABLE public.corporate_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access own data" ON public.corporate_actions;
CREATE POLICY "Users can access own data" ON public.corporate_actions
  FOR ALL USING (auth.uid() = user_id);`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ── HORIZONTAL PORTFOLIOS SEGMENT BAR ── */}
      <div className="demat-portfolio-bar no-scrollbar">
        <button
          onClick={() => setSelectedDematId(null)}
          className={`demat-portfolio-pill ${selectedDematId === null ? "active" : ""}`}
        >
          <PieIcon size={16} strokeWidth={selectedDematId === null ? 2.5 : 2} />
          <span>Global View</span>
        </button>
        {state.demat.map((d: any) => {
          const active = selectedDematId === d.id;
          const theme = getBrokerTheme(d.broker || "");
          return (
            <button
              key={d.id}
              onClick={() => setSelectedDematId(d.id)}
              className={`demat-portfolio-pill ${active ? "active" : ""}`}
              style={active ? {
                "--active-bg": `${theme.color}15`,
                "--active-color": theme.color,
                "--active-border": `${theme.color}30`
              } as React.CSSProperties : {}}
            >
              <BrokerLogo broker={d.broker || "?"} theme={theme} size={20} borderRadius={5} />
              <span>{d.broker || "Broker"}</span>
            </button>
          );
        })}
      </div>

      {/* ── MAIN CONTENT AREA (100% width) ── */}
      <div style={{ width: "100%" }}>
        <div className="demat-stats-grid">
            <StatCard
              icon={<BarChart3 />}
              label="Portfolio Value"
              value={fmtINRFull(totalValue)}
              color={THEME.accent}
              sub={`Invested ${fmtINRFull(totalInvested)}`}
            />
            <StatCard
              icon={<Activity />}
              label="Day's P&L"
              value={fmtINRFull(totalDaysPnL)}
              color={totalDaysPnL >= 0 ? THEME.sage : THEME.rust}
              sub={totalDaysPnL !== 0 ? `${totalDaysPnL >= 0 ? "+" : ""}${totalDaysPnLPct.toFixed(2)}% today` : "No change today"}
            />
            <StatCard
              icon={<TrendingUp />}
              label="Unrealized P&L"
              value={fmtINRFull(pnl)}
              color={pnl >= 0 ? THEME.sage : THEME.rust}
              sub={totalInvested ? `${((pnl / totalInvested) * 100).toFixed(2)}% absolute return` : undefined}
            />
            <StatCard
              icon={<Percent />}
              label="Net Return"
              value={totalInvested ? ((pnl / totalInvested) * 100).toFixed(2) + "%" : "—"}
              color={pnl >= 0 ? THEME.sage : THEME.rust}
              sub="Combined portfolio performance"
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 16 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
              <input 
                placeholder="Search stocks or sectors..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...input, paddingLeft: 40, borderRadius: 14, height: 44, border: `1.5px solid ${THEME.line}` }}
              />
              <div style={{ position: "absolute", left: 14, top: 13, color: THEME.muted }}><Search size={18} /></div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(128,128,128,0.04)", padding: "0 12px", borderRadius: 12, border: `1px solid ${THEME.line}`, height: 40 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sort by:</span>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{ background: "transparent", border: "none", fontSize: 13, fontWeight: 700, color: THEME.ink, outline: "none", cursor: "pointer", height: "100%" }}
                >
                  <option value="value">Highest Value</option>
                  <option value="pnl">Best Returns (%)</option>
                  <option value="change">Day Gainers (%)</option>
                  <option value="name">Symbol (A-Z)</option>
                </select>
              </div>
              <button style={{ ...btnGhost, height: 40, padding: "0 16px", borderRadius: 12 }} onClick={() => setShowDemat(true)}><Plus size={14} /> Add Account</button>
            </div>
          </div>
          <Grid>
            {state.demat.length === 0 && (
              <div style={{ ...card, gridColumn: "1 / -1" }}>
                <DematEmptyState onAdd={() => setShowDemat(true)} />
              </div>
            )}
            {state.demat.map((d: any) => {
              const theme = getBrokerTheme(d.broker || "");
              return (
                <InvestCard
                  key={d.id}
                  onRemove={() => removeItem("demat", d.id)}
                  onEdit={() => setEditDematId(d.id)}
                  style={{ borderLeft: `4px solid ${theme.color}` }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <BrokerLogo broker={d.broker || "?"} theme={theme} size={46} borderRadius={13} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, marginBottom: 6 }}>{d.broker || "Broker"}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {d.dpId && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${theme.color}18`, color: theme.color, fontWeight: 700, letterSpacing: "0.06em", lineHeight: 1.2 }}>DP</span>
                            <span style={{ color: THEME.ink, fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>{d.dpId}</span>
                          </div>
                        )}
                        {d.clientId && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${theme.color}18`, color: theme.color, fontWeight: 700, letterSpacing: "0.06em", lineHeight: 1.2 }}>ID</span>
                            <span style={{ color: THEME.ink, fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>{d.clientId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </InvestCard>
              );
            })}
          </Grid>

      {state.stocks.length === 0 ? (
        <div style={card}><StockEmptyState onAdd={() => { setStockDefaults(null); setShowStock(true); }} /></div>
      ) : visibleGroups.length === 0 ? (
        <div style={card}><EmptyHint text={`No holdings in ${state.demat.find((d: any) => d.id === selectedDematId)?.broker || "this account"}`} /></div>
      ) : (
        <div style={{ background: "var(--t-card-bg)", borderRadius: 16, border: `1px solid ${THEME.line}`, overflowX: "auto", boxShadow: "var(--t-card-shadow)", marginBottom: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(128,128,128,0.04)" }}>
                <th style={{ ...th, paddingLeft: 20, borderBottom: `1.5px solid ${THEME.line}` }}>Asset / Scrip</th>
                <th style={{ ...th, textAlign: "right", borderBottom: `1.5px solid ${THEME.line}` }}>Quantity</th>
                <th style={{ ...th, textAlign: "right", borderBottom: `1.5px solid ${THEME.line}` }}>Avg Price</th>
                <th style={{ ...th, textAlign: "right", borderBottom: `1.5px solid ${THEME.line}` }}>Live Price</th>
                <th style={{ ...th, textAlign: "right", borderBottom: `1.5px solid ${THEME.line}` }}>Invested</th>
                <th style={{ ...th, textAlign: "right", borderBottom: `1.5px solid ${THEME.line}` }}>Current Value</th>
                <th style={{ ...th, textAlign: "right", borderBottom: `1.5px solid ${THEME.line}` }}>Day's P&L</th>
                <th style={{ ...th, textAlign: "right", paddingRight: 20, borderBottom: `1.5px solid ${THEME.line}` }}>Total Return</th>
              </tr>
            </thead>
            <tbody>
              {visibleGroups.map(({ base, exchange, yfSym, lots }) => {
                const md = marketData[yfSym];
                const currentPrice = md?.price ?? Number(lots[0]?.currentPrice ?? 0);
                const totalQty = lots.reduce((s: number, l: any) => s + Number(l.qty), 0);
                const totalInv = lots.reduce((s: number, l: any) => s + Number(l.qty) * Number(l.avgPrice), 0);
                const totalCurr = totalQty * currentPrice;
                const totalPnl = totalCurr - totalInv;
                const totalPnlPct = totalInv ? (totalPnl / totalInv) * 100 : 0;
                const isExpanded = expandedSymbols.has(yfSym);
                const isLive = !!md;
                const chartEntry = chartData[yfSym];
                const charts: any[] | null = chartEntry ? (chartEntry.points ?? chartEntry) : null;
                const chartDate: string | null = chartEntry?.date ?? null;
                const changeAmt = md?.change ?? 0;
                const changePct = md?.changePercent ?? 0;

                return (
                  <React.Fragment key={yfSym}>
                    {/* Collapsible main row */}
                    <tr 
                      className="demat-holdings-row"
                      onClick={() => toggleExpand(yfSym)}
                      style={{ 
                        cursor: "pointer", 
                        background: isExpanded ? `${THEME.accent}09` : "transparent",
                        transition: "background 0.15s ease",
                        borderBottom: `1px solid ${THEME.line}`
                      }}
                    >
                      <td style={{ ...td, paddingLeft: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ 
                            color: isExpanded ? THEME.accent : THEME.muted, 
                            display: "inline-flex",
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
                          }}>
                            <ChevronDown size={16} />
                          </span>
                          <StockLogo yfSym={yfSym} size={36} />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>{base}</span>
                              <span style={{ fontSize: 8, background: THEME.line, color: THEME.muted, padding: "1px 5px", borderRadius: 4, fontWeight: 800 }}>{exchange}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                              {isLive && <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>{md.sector || "Sector N/A"}</span>}
                              <span style={{ fontSize: 9, background: "rgba(128,128,128,0.08)", color: THEME.muted, padding: "1px 6px", borderRadius: 10, fontWeight: 700, border: `1px solid ${THEME.line}` }}>{lots.length} {lots.length === 1 ? "lot" : "lots"}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>
                        {totalQty}
                      </td>
                      
                      <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                        ₹{Number(totalQty > 0 ? (totalInv / totalQty) : 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      
                      <td style={{ ...td, textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: THEME.ink }}>
                           ₹{currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {isLive ? (
                          <div style={{ fontSize: 11, fontWeight: 700, color: changeAmt >= 0 ? THEME.sage : THEME.rust, marginTop: 1 }}>
                            {changeAmt >= 0 ? "+" : ""}{changePct.toFixed(2)}%
                          </div>
                        ) : (
                          <div style={{ fontSize: 10, color: THEME.muted, fontStyle: "italic", marginTop: 1 }}>Offline</div>
                        )}
                      </td>
                      
                      <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                        {fmtINR(totalInv)}
                      </td>
                      
                      <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>
                        {fmtINR(totalCurr)}
                      </td>
                      
                      <td style={{ ...td, textAlign: "right" }}>
                        {isLive ? (
                          <>
                            <div style={{ fontWeight: 800, color: (totalQty * changeAmt) >= 0 ? THEME.sage : THEME.rust }}>
                              {(totalQty * changeAmt) >= 0 ? "+" : ""}{fmtINR(totalQty * changeAmt)}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: (totalQty * changeAmt) >= 0 ? THEME.sage : THEME.rust, marginTop: 1 }}>
                              {changePct >= 0 ? "▲" : "▼"}{Math.abs(changePct).toFixed(2)}%
                            </div>
                          </>
                        ) : (
                          <span style={{ color: THEME.muted }}>—</span>
                        )}
                      </td>
                      
                      <td style={{ ...td, textAlign: "right", paddingRight: 20 }}>
                        <div style={{ fontWeight: 800, color: totalPnl >= 0 ? THEME.sage : THEME.rust }}>
                          {totalPnl >= 0 ? "+" : ""}{fmtINR(totalPnl)}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: totalPnl >= 0 ? THEME.sage : THEME.rust, marginTop: 1 }}>
                          {totalPnlPct >= 0 ? "▲" : "▼"}{Math.abs(totalPnlPct).toFixed(2)}%
                        </div>
                      </td>
                    </tr>
                    
                    {/* Collapsible detail drawer row */}
                    {isExpanded && (
                      <tr className="demat-drawer-row" style={{ background: "rgba(128,128,128,0.015)" }}>
                        <td colSpan={8} style={{ padding: "20px 24px", borderBottom: `1px solid ${THEME.line}` }}>
                          <div className="demat-drawer-content" style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                            {/* Left Panel: Session sparkline chart */}
                            {isLive && charts && charts.length > 2 && (
                              <div style={{ flex: "1 1 300px", minWidth: 280 }}>
                                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  {chartDate ? `Session Sparkline — ${chartDate}` : "Live Intraday Chart"}
                                </div>
                                <div style={{ background: "var(--t-paper)", border: `1.5px solid ${THEME.line}`, borderRadius: 12, padding: "12px 14px", boxSizing: "border-box" }}>
                                  <ResponsiveContainer width="100%" height={150}>
                                    <AreaChart data={charts} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                                      <defs>
                                        <linearGradient id={`ig-${base}`} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor={changeAmt >= 0 ? THEME.sage : THEME.rust} stopOpacity={0.35} />
                                          <stop offset="95%" stopColor={changeAmt >= 0 ? THEME.sage : THEME.rust} stopOpacity={0.02} />
                                        </linearGradient>
                                      </defs>
                                      <XAxis dataKey="t" tick={{ fontSize: 9, fill: "var(--t-muted)" }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                                      <YAxis hide domain={["auto", "auto"]} />
                                      <Tooltip contentStyle={{ fontSize: 12, background: "var(--t-paper)", border: `1px solid ${THEME.line}`, borderRadius: 6 }} formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, "Price"]} />
                                      <Area type="monotone" dataKey="p" stroke={changeAmt >= 0 ? THEME.sage : THEME.rust} strokeWidth={1.5} fill={`url(#ig-${base})`} dot={false} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                  {/* Scrip details pill list */}
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", marginTop: 12, fontSize: 12, borderTop: `1px solid ${THEME.line}`, paddingTop: 10 }}>
                                    {md.prevClose != null && <span><span style={{ color: THEME.muted }}>Prev Close: </span><b>₹{md.prevClose.toFixed(2)}</b></span>}
                                    {md.dayHigh != null && <span><span style={{ color: THEME.muted }}>Day High/Low: </span><b style={{ color: THEME.sage }}>₹{md.dayHigh.toFixed(2)}</b> / <b style={{ color: THEME.rust }}>₹{md.dayLow?.toFixed(2) ?? "—"}</b></span>}
                                    {md.weekHigh52 != null && <span><span style={{ color: THEME.muted }}>52W H/L: </span><b style={{ color: THEME.sage }}>₹{md.weekHigh52.toFixed(2)}</b> / <b style={{ color: THEME.rust }}>₹{md.weekLow52?.toFixed(2) ?? "—"}</b></span>}
                                    {md.volume != null && <span><span style={{ color: THEME.muted }}>Volume: </span><b>{fmtVol(md.volume)}</b></span>}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Right Panel: Buy lots detail & actions */}
                            <div style={{ flex: "1.2 1 450px", minWidth: 320 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Holdings Lot Breakdown</span>
                                <span style={{ fontSize: 10, fontWeight: 800, background: `${THEME.accent}15`, color: THEME.accent, padding: "1px 8px", borderRadius: 20, border: `1px solid ${THEME.accent}25` }}>{lots.length} {lots.length === 1 ? "lot" : "lots"}</span>
                              </div>
                              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px", fontSize: 12 }}>
                                <thead>
                                  <tr>
                                    <th style={{ ...th, background: "transparent", borderBottom: `1.5px solid ${THEME.line}`, padding: "4px 8px", paddingLeft: 8 }}>Broker</th>
                                    <th style={{ ...th, background: "transparent", borderBottom: `1.5px solid ${THEME.line}`, padding: "4px 8px", textAlign: "right" }}>Qty</th>
                                    <th style={{ ...th, background: "transparent", borderBottom: `1.5px solid ${THEME.line}`, padding: "4px 8px", textAlign: "right" }}>Buy Price</th>
                                    <th style={{ ...th, background: "transparent", borderBottom: `1.5px solid ${THEME.line}`, padding: "4px 8px", textAlign: "right", cursor: "pointer", userSelect: "none", color: THEME.accent }} onClick={() => setLotSortDir(prev => ({ ...prev, [yfSym]: (prev[yfSym] ?? "asc") === "asc" ? "desc" : "asc" }))}><span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>Period {(lotSortDir[yfSym] ?? "asc") === "asc" ? <ArrowUp size={9} /> : <ArrowDown size={9} />}</span></th>
                                    <th style={{ ...th, background: "transparent", borderBottom: `1.5px solid ${THEME.line}`, padding: "4px 8px", textAlign: "right" }}>Return</th>
                                    <th style={{ ...th, background: "transparent", borderBottom: `1.5px solid ${THEME.line}`, padding: "4px 8px", textAlign: "right" }}>Value</th>
                                    <th style={{ ...th, background: "transparent", borderBottom: `1.5px solid ${THEME.line}`, padding: "4px 8px" }}></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[...lots].sort((a: any, b: any) => {
                                    const da = a.buyDate ? new Date(a.buyDate).getTime() : 0;
                                    const db = b.buyDate ? new Date(b.buyDate).getTime() : 0;
                                    return (lotSortDir[yfSym] ?? "asc") === "asc" ? da - db : db - da;
                                  }).map((lot: any) => {
                                    const lInv = Number(lot.qty) * Number(lot.avgPrice);
                                    const lCurr = Number(lot.qty) * currentPrice;
                                    const lPnl = lCurr - lInv;
                                    const lPnlPct = lInv ? (lPnl / lInv) * 100 : 0;
                                    const demat = state.demat.find((d: any) => d.id === lot.dematId);
                                    const theme = getBrokerTheme(demat?.broker || "");
                                    
                                    return (
                                      <tr key={lot.id} style={{ background: "rgba(128,128,128,0.03)" }}>
                                        <td style={{ ...td, borderBottom: "none", padding: "8px", borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <BrokerLogo broker={demat?.broker || "?"} theme={theme} size={20} borderRadius={5} />
                                            <span style={{ fontWeight: 700, color: THEME.ink }}>{demat?.broker || "Direct"}</span>
                                          </div>
                                        </td>
                                        <td style={{ ...td, borderBottom: "none", padding: "8px", textAlign: "right", fontWeight: 700 }}>{lot.qty}</td>
                                        <td style={{ ...td, borderBottom: "none", padding: "8px", textAlign: "right", fontWeight: 600 }}>₹{Number(lot.avgPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                        <td style={{ ...td, borderBottom: "none", padding: "8px", textAlign: "right" }}>
                                          <div style={{ fontWeight: 600 }}>{lot.buyDate ? new Date(lot.buyDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</div>
                                          {lot.buyDate && (() => {
                                            const diff = new Date().getTime() - new Date(lot.buyDate).getTime();
                                            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                            const isLTCG = days > 365;
                                            const nearLTCG = !isLTCG && days > 300;
                                            return (
                                              <span style={{ marginTop: 3, display: "inline-block", fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 4, background: isLTCG ? `${THEME.sage}1f` : `${THEME.gold}1a`, color: isLTCG ? THEME.sage : nearLTCG ? "#d97706" : THEME.gold }}>
                                                {isLTCG ? `LTCG · ${(days/365).toFixed(1)}y` : `STCG · ${days}d`}
                                              </span>
                                            );
                                          })()}
                                        </td>
                                        <td style={{ ...td, borderBottom: "none", padding: "8px", textAlign: "right" }}>
                                          <div style={{ color: lPnl >= 0 ? THEME.sage : THEME.rust, fontWeight: 800 }}>
                                            {lPnl >= 0 ? "+" : ""}{Math.round(lPnlPct)}%
                                          </div>
                                          <div style={{ fontSize: 10, color: lPnl >= 0 ? THEME.sage : THEME.rust, fontWeight: 600 }}>
                                            {lPnl >= 0 ? "+" : ""}{fmtINR(lPnl)}
                                          </div>
                                          {lot.buyDate && (() => {
                                            const cagr = calcCAGR(lInv, lCurr, lot.buyDate);
                                            return cagr !== null ? <div style={{ fontSize: 9, color: cagr >= 15 ? THEME.sage : cagr >= 8 ? THEME.gold : THEME.rust, fontWeight: 800 }}>{cagr.toFixed(0)}% CAGR</div> : null;
                                          })()}
                                        </td>
                                        <td style={{ ...td, borderBottom: "none", padding: "8px", textAlign: "right", fontWeight: 800 }}>{fmtINR(lCurr)}</td>
                                        <td style={{ ...td, borderBottom: "none", padding: "8px", borderTopRightRadius: 8, borderBottomRightRadius: 8 }}>
                                          <div style={{ display: "flex", gap: 3, justifyContent: "flex-end" }}>
                                            <button onClick={(e) => { e.stopPropagation(); setSellLot({ ...lot, base, exchange, currentPrice, broker: demat?.broker || "" }); }} style={{ ...iconBtn, padding: 4, color: THEME.rust, background: `${THEME.rust}0f` }} title="Sell Shares"><ArrowLeftRight size={12} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); setEditStockId(lot.id); }} style={{ ...iconBtn, padding: 4, background: "rgba(128,128,128,0.06)" }}><Edit3 size={12} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); removeItem("stocks", lot.id); }} style={{ ...iconBtn, padding: 4, background: "rgba(128,128,128,0.06)" }}><Trash2 size={12} /></button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td colSpan={2} style={{ padding: "8px", borderTop: `1.5px solid ${THEME.line}`, fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total · {totalQty} shares</td>
                                    <td style={{ padding: "8px", borderTop: `1.5px solid ${THEME.line}`, textAlign: "right", fontWeight: 700, fontSize: 12, color: THEME.ink }}>₹{Number(totalQty > 0 ? totalInv / totalQty : 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td style={{ borderTop: `1.5px solid ${THEME.line}` }} />
                                    <td style={{ padding: "8px", borderTop: `1.5px solid ${THEME.line}`, textAlign: "right" }}>
                                      <div style={{ fontWeight: 800, color: totalPnl >= 0 ? THEME.sage : THEME.rust }}>{totalPnl >= 0 ? "+" : ""}{Math.round(totalPnlPct)}%</div>
                                      <div style={{ fontSize: 10, fontWeight: 600, color: totalPnl >= 0 ? THEME.sage : THEME.rust }}>{totalPnl >= 0 ? "+" : ""}{fmtINR(totalPnl)}</div>
                                    </td>
                                    <td style={{ padding: "8px", borderTop: `1.5px solid ${THEME.line}`, textAlign: "right", fontWeight: 800, fontSize: 13, color: THEME.ink }}>{fmtINR(totalCurr)}</td>
                                    <td style={{ borderTop: `1.5px solid ${THEME.line}` }} />
                                  </tr>
                                </tfoot>
                              </table>

                              {/* Corporate actions logs */}
                              {(() => {
                                const caHistory = (state.corporateActions || []).filter((a: any) => a.symbol === base && a.exchange === exchange).sort((a: any, b: any) => new Date(b.actionDate || b.createdAt).getTime() - new Date(a.actionDate || a.createdAt).getTime());
                                if (caHistory.length === 0) return null;
                                return (
                                  <div style={{ marginTop: 14, borderTop: `1px dashed ${THEME.line}`, paddingTop: 10 }}>
                                    <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Corporate Actions History</div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                      {caHistory.map((a: any) => (
                                        <div key={a.id} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, fontSize: 11 }}>
                                          <span style={{ padding: "1px 6px", borderRadius: 4, fontWeight: 800, fontSize: 9, background: a.actionType === "split" ? `${THEME.gold}1a` : `${THEME.sage}1a`, color: a.actionType === "split" ? THEME.gold : THEME.sage }}>
                                            {a.actionType === "split" ? "SPLIT" : "BONUS"} {a.ratioN}:{a.ratioM}
                                          </span>
                                          <span style={{ color: THEME.muted }}>{a.actionDate ? new Date(a.actionDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}</span>
                                          <span style={{ color: THEME.line }}>·</span>
                                          <span style={{ color: THEME.muted }}>Qty {a.oldQty} → <b style={{ color: THEME.ink }}>{a.newQty}</b></span>
                                          <span style={{ color: THEME.line }}>·</span>
                                          <span style={{ color: THEME.muted }}>Avg ₹{Number(a.oldAvgPrice).toFixed(1)} → <b style={{ color: THEME.ink }}>₹{Number(a.newAvgPrice).toFixed(1)}</b></span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Nested bottom action buttons */}
                              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", borderTop: `1px solid ${THEME.line}`, paddingTop: 12 }}>
                                <button style={{ ...btnGhost, fontSize: 11, padding: "5px 10px" }} onClick={(e) => { e.stopPropagation(); setStockDefaults({ symbol: base, exchange, dematId: lots[0]?.dematId }); setShowStock(true); }}><Plus size={11} /> Add Lot</button>
                                <button style={{ ...btnGhost, fontSize: 11, padding: "5px 10px", color: THEME.rust, borderColor: `${THEME.rust}60` }} onClick={(e) => { e.stopPropagation(); setFifoSellGroup({ base, exchange, yfSym, lots }); }}><ArrowLeftRight size={11} /> Sell Shares</button>
                                <button style={{ ...btnGhost, fontSize: 11, padding: "5px 10px", color: THEME.gold }} onClick={(e) => { e.stopPropagation(); setSplitBonusGroup({ base, exchange, lots }); }}><Scissors size={11} /> Split / Bonus</button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
        </div>


      {showDemat && <DematModal onClose={() => setShowDemat(false)} onSave={(v: any) => { addItem("demat", v); setShowDemat(false); }} />}
      {editDematId && <DematModal initial={state.demat.find((d: any) => d.id === editDematId)} onClose={() => setEditDematId(null)} onSave={(v: any) => { updateItem("demat", editDematId, v); setEditDematId(null); }} />}
      {showStock && <StockModal demats={state.demat} defaults={stockDefaults} onClose={() => { setShowStock(false); setStockDefaults(null); }} onSave={(v: any) => { addItem("stocks", v); setShowStock(false); setStockDefaults(null); }} />}
      {editStockId && <StockModal demats={state.demat} initial={state.stocks.find((x: any) => x.id === editStockId)} onClose={() => setEditStockId(null)} onSave={(v: any) => { updateItem("stocks", editStockId, v); setEditStockId(null); }} />}
      {sellLot && <SellStockModal lot={sellLot} onClose={() => setSellLot(null)} onSave={(sellRecord: any, remainingQty: number) => { addItem("stockSells", sellRecord); if (remainingQty <= 0) removeItem("stocks", sellLot.id); else updateItem("stocks", sellLot.id, { qty: String(remainingQty) }); setSellLot(null); }} />}
      {fifoSellGroup && (
        <FifoSellModal
          group={fifoSellGroup}
          currentPrice={marketData[fifoSellGroup.yfSym]?.price ?? Number(fifoSellGroup.lots[0]?.currentPrice ?? 0)}
          demats={state.demat}
          onClose={() => setFifoSellGroup(null)}
          onSave={(allocs: FifoAlloc[], sellPrice: number, sellDate: string, broker: string) => {
            allocs.forEach((alloc, i) => {
              addItem("stockSells", {
                id: `ss-${Date.now()}-${i}`,
                owner: alloc.lot.owner || "self",
                symbol: fifoSellGroup.base,
                exchange: fifoSellGroup.exchange,
                qty: alloc.consume,
                buyPrice: alloc.buyPrice,
                buyDate: alloc.lot.buyDate || "",
                sellPrice,
                sellDate,
                broker,
                dematId: alloc.lot.dematId || "",
                profit: Number(alloc.pnl.toFixed(2)),
              });
              if (alloc.fullyConsumed) removeItem("stocks", alloc.lot.id);
              else updateItem("stocks", alloc.lot.id, { qty: String(Number(alloc.lot.qty) - alloc.consume) });
            });
            setFifoSellGroup(null);
          }}
        />
      )}
      {splitBonusGroup && <SplitBonusModal group={splitBonusGroup} onClose={() => setSplitBonusGroup(null)} onApply={(updates: any[], actionLog: any) => { updates.forEach((u: any) => updateItem("stocks", u.id, { qty: u.qty, avgPrice: u.avgPrice })); addItem("corporateActions", actionLog); setSplitBonusGroup(null); }} />}
    </div>
  );
}

function DematModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || { broker: "", dpId: "", clientId: "", owner: "self" });
  return (
    <Modal title={initial ? "Edit Demat Account" : "Add Demat Account"} onClose={onClose}>
      <Field label="Owner / Profile"><select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>{PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Broker"><input style={input} value={f.broker} onChange={(e) => setF({ ...f, broker: e.target.value })} placeholder="e.g. Zerodha, Groww" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="DP ID"><input style={input} value={f.dpId} onChange={(e) => setF({ ...f, dpId: e.target.value })} /></Field>
        <Field label="Client ID"><input style={input} value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })} /></Field>
      </div>
      <ModalActions onSave={() => f.broker && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function StockModal({ demats, onClose, onSave, initial = null, defaults = null }: any) {
  const [f, setF] = useState(initial || { symbol: defaults?.symbol || "", exchange: defaults?.exchange || "NSE", dematId: defaults?.dematId || demats[0]?.id || "", qty: "", avgPrice: "", currentPrice: "", buyDate: "", owner: "self" });
  return (
    <Modal title={initial ? "Edit Stock" : "Add Stock"} onClose={onClose}>
      <Field label="Owner / Profile"><select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>{PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
        <Field label="Symbol"><input style={input} value={f.symbol} onChange={(e) => setF({ ...f, symbol: e.target.value.toUpperCase().replace(/\.(NS|BO)$/i, "") })} placeholder="e.g. RELIANCE" /></Field>
        <Field label="Exchange"><select style={{ ...input, width: 90 }} value={f.exchange || "NSE"} onChange={e => setF({ ...f, exchange: e.target.value })}><option value="NSE">NSE</option><option value="BSE">BSE</option></select></Field>
      </div>
      <Field label="Demat Account"><select style={input} value={f.dematId} onChange={(e) => setF({ ...f, dematId: e.target.value })}>{demats.length === 0 && <option value="">Add demat first</option>}{demats.map((d: any) => <option key={d.id} value={d.id}>{d.broker}</option>)}</select></Field>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <Field label="Quantity"><input style={input} type="number" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></Field>
        <Field label="Avg Price"><input style={input} type="number" step="0.01" value={f.avgPrice} onChange={(e) => setF({ ...f, avgPrice: e.target.value })} /></Field>
        <Field label="Current Price"><input style={input} type="number" step="0.01" value={f.currentPrice} onChange={(e) => setF({ ...f, currentPrice: e.target.value })} /></Field>
      </div>
      <Field label="Buy Date (optional — enables CAGR calculation)"><input style={input} type="date" value={f.buyDate || ""} onChange={(e) => setF({ ...f, buyDate: e.target.value })} /></Field>
      <ModalActions onSave={() => f.symbol && f.qty && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function SellStockModal({ lot, onClose, onSave }: any) {
  const [f, setF] = useState({ sellQty: String(lot.qty), sellPrice: String(lot.currentPrice || ""), sellDate: today(), broker: lot.broker || "" });
  const sellQtyNum = Number(f.sellQty) || 0;
  const sellPriceNum = Number(f.sellPrice) || 0;
  const profit = (sellPriceNum - Number(lot.avgPrice)) * sellQtyNum;
  const remainingQty = Number(lot.qty) - sellQtyNum;
  const handleSave = () => { if (!sellQtyNum || !sellPriceNum || sellQtyNum > Number(lot.qty)) return; const record = { id: `ss-${Date.now()}`, owner: lot.owner || "self", symbol: lot.base || lot.symbol, exchange: lot.exchange || "NSE", qty: sellQtyNum, buyPrice: Number(lot.avgPrice), buyDate: lot.buyDate || "", sellPrice: sellPriceNum, sellDate: f.sellDate, broker: f.broker, dematId: lot.dematId || "", profit: Number(profit.toFixed(2)) }; onSave(record, remainingQty); };
  return (
    <Modal title={`Sell ${lot.base || lot.symbol}`} onClose={onClose}>
      <div style={{ fontSize: 13, color: "var(--t-muted)", marginBottom: 12 }}>Holding: <b>{lot.qty}</b> shares @ avg ₹{Number(lot.avgPrice).toFixed(2)} · Lot bought {lot.buyDate || "—"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Sell Qty"><input style={input} type="number" min="1" max={lot.qty} value={f.sellQty} onChange={(e) => setF({ ...f, sellQty: e.target.value })} /></Field>
        <Field label="Sell Price (₹)"><input style={input} type="number" step="0.01" value={f.sellPrice} onChange={(e) => setF({ ...f, sellPrice: e.target.value })} /></Field>
      </div>
      <Field label="Sell Date"><input style={input} type="date" value={f.sellDate} onChange={(e) => setF({ ...f, sellDate: e.target.value })} /></Field>
      <Field label="Broker">{lot.broker ? <input style={{ ...input, background: "rgba(128,128,128,0.08)", cursor: "default" }} value={f.broker} readOnly /> : <input style={input} value={f.broker} placeholder="e.g. Zerodha" onChange={(e) => setF({ ...f, broker: e.target.value })} />}</Field>
      {sellQtyNum > 0 && sellPriceNum > 0 && <div style={{ padding: "10px 14px", borderRadius: 8, background: profit >= 0 ? `${THEME.sage}1a` : `${THEME.rust}1a`, marginTop: 4 }}><span style={{ fontSize: 13, color: "var(--t-muted)" }}>Estimated Profit/Loss: </span><b style={{ color: profit >= 0 ? THEME.sage : THEME.rust }}>{profit >= 0 ? "+" : ""}₹{Math.abs(profit).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>{remainingQty > 0 && <span style={{ fontSize: 12, color: "var(--t-muted)", marginLeft: 12 }}>{remainingQty} shares remain</span>}</div>}
      <ModalActions onSave={handleSave} onClose={onClose} />
    </Modal>
  );
}

function FifoSellModal({ group, currentPrice, demats, onClose, onSave }: any) {
  const totalQty = group.lots.reduce((s: number, l: any) => s + Number(l.qty), 0);
  const sortedForDefault = [...group.lots].sort((a: any, b: any) => {
    if (!a.buyDate) return 1;
    if (!b.buyDate) return -1;
    return new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime();
  });
  const defaultBroker = (() => {
    const d = demats.find((x: any) => x.id === sortedForDefault[0]?.dematId);
    return d?.broker || "";
  })();

  const [f, setF] = useState({
    sellQty: String(totalQty),
    sellPrice: currentPrice ? String(Number(currentPrice).toFixed(2)) : "",
    sellDate: today(),
    broker: defaultBroker,
  });

  const sellQtyNum = Number(f.sellQty) || 0;
  const sellPriceNum = Number(f.sellPrice) || 0;
  const allocs: FifoAlloc[] = sellQtyNum > 0 && sellPriceNum > 0 && sellQtyNum <= totalQty
    ? computeFifoAlloc(group.lots, sellQtyNum, sellPriceNum)
    : [];

  const totalProceeds = sellQtyNum * sellPriceNum;
  const totalCost     = allocs.reduce((s, a) => s + a.consume * a.buyPrice, 0);
  const totalPnl      = totalProceeds - totalCost;
  const stcgPnl       = allocs.filter(a => !a.isLTCG).reduce((s, a) => s + a.pnl, 0);
  const ltcgPnl       = allocs.filter(a =>  a.isLTCG).reduce((s, a) => s + a.pnl, 0);
  const remainingAfter = totalQty - sellQtyNum;
  const qtyOver = sellQtyNum > totalQty;
  const isValid = sellQtyNum > 0 && sellPriceNum > 0 && !qtyOver && !!f.sellDate;

  const fmt = (n: number) => Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmt2 = (n: number) => Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Modal title={`Sell ${group.base} — FIFO`} onClose={onClose} maxWidth={720}>
      {/* Info bar */}
      <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(128,128,128,0.06)", marginBottom: 16, fontSize: 13, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span><span style={{ color: THEME.muted }}>Available: </span><b>{totalQty} shares</b></span>
        <span><span style={{ color: THEME.muted }}>Lots: </span><b>{group.lots.length}</b></span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: THEME.muted }}>Oldest lot consumed first (FIFO)</span>
      </div>

      {/* Inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Field label="Qty to Sell">
          <input
            style={{ ...input, borderColor: qtyOver ? THEME.rust : undefined }}
            type="number" min="1" max={totalQty}
            value={f.sellQty}
            onChange={e => setF({ ...f, sellQty: e.target.value })}
          />
        </Field>
        <Field label="Sell Price (₹)">
          <input style={input} type="number" step="0.01" value={f.sellPrice}
            onChange={e => setF({ ...f, sellPrice: e.target.value })} />
        </Field>
        <Field label="Sell Date">
          <input style={input} type="date" value={f.sellDate}
            onChange={e => setF({ ...f, sellDate: e.target.value })} />
        </Field>
        <Field label="Broker">
          <input style={input} value={f.broker} placeholder="e.g. Zerodha"
            onChange={e => setF({ ...f, broker: e.target.value })} />
        </Field>
      </div>

      {qtyOver && (
        <div style={{ fontSize: 12, color: THEME.rust, fontWeight: 600, marginBottom: 10 }}>
          Cannot sell more than {totalQty} shares available
        </div>
      )}

      {/* FIFO Breakdown Table */}
      {allocs.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            FIFO Allocation
          </div>
          <div style={{ borderRadius: 10, border: `1px solid ${THEME.line}`, overflow: "hidden", marginBottom: 14 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "rgba(128,128,128,0.05)" }}>
                  <th style={{ ...th, padding: "8px 12px", fontSize: 9 }}>Buy Date</th>
                  <th style={{ ...th, padding: "8px 12px", fontSize: 9, textAlign: "right" }}>Buy Price</th>
                  <th style={{ ...th, padding: "8px 12px", fontSize: 9, textAlign: "right" }}>Available</th>
                  <th style={{ ...th, padding: "8px 12px", fontSize: 9, textAlign: "right" }}>Selling</th>
                  <th style={{ ...th, padding: "8px 12px", fontSize: 9, textAlign: "right" }}>Cost Basis</th>
                  <th style={{ ...th, padding: "8px 12px", fontSize: 9, textAlign: "right" }}>P&L</th>
                  <th style={{ ...th, padding: "8px 12px", fontSize: 9, textAlign: "center" }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {allocs.map((a, i) => (
                  <tr key={a.lot.id} style={{ borderTop: i > 0 ? `1px solid ${THEME.line}` : undefined, background: i % 2 === 0 ? "transparent" : "rgba(128,128,128,0.02)" }}>
                    <td style={{ ...td, padding: "9px 12px", borderBottom: "none" }}>
                      {a.lot.buyDate
                        ? new Date(a.lot.buyDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
                        : <span style={{ color: THEME.muted }}>—</span>}
                    </td>
                    <td style={{ ...td, padding: "9px 12px", borderBottom: "none", textAlign: "right" }}>
                      ₹{Number(a.buyPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ ...td, padding: "9px 12px", borderBottom: "none", textAlign: "right", color: THEME.muted }}>
                      {Number(a.lot.qty)}
                    </td>
                    <td style={{ ...td, padding: "9px 12px", borderBottom: "none", textAlign: "right", fontWeight: 800 }}>
                      {a.consume}
                      {a.fullyConsumed
                        ? <span style={{ display: "block", fontSize: 8, color: THEME.rust, fontWeight: 700, lineHeight: 1.2 }}>full lot</span>
                        : <span style={{ display: "block", fontSize: 8, color: THEME.gold, fontWeight: 700, lineHeight: 1.2 }}>partial</span>}
                    </td>
                    <td style={{ ...td, padding: "9px 12px", borderBottom: "none", textAlign: "right", color: THEME.muted }}>
                      ₹{fmt(a.consume * a.buyPrice)}
                    </td>
                    <td style={{ ...td, padding: "9px 12px", borderBottom: "none", textAlign: "right", fontWeight: 700, color: a.pnl >= 0 ? THEME.sage : THEME.rust }}>
                      {a.pnl >= 0 ? "+" : "−"}₹{fmt(Math.abs(a.pnl))}
                    </td>
                    <td style={{ ...td, padding: "9px 12px", borderBottom: "none", textAlign: "center" }}>
                      <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, fontWeight: 800, background: a.isLTCG ? `${THEME.sage}1f` : `${THEME.gold}1f`, color: a.isLTCG ? THEME.sage : THEME.gold }}>
                        {a.isLTCG ? "LTCG" : "STCG"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary card */}
          <div style={{ padding: "14px 16px", borderRadius: 10, background: totalPnl >= 0 ? `${THEME.sage}12` : `${THEME.rust}12`, border: `1px solid ${totalPnl >= 0 ? `${THEME.sage}55` : `${THEME.rust}55`}`, marginBottom: 4 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 3 }}>Total Proceeds</div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>₹{fmt2(totalProceeds)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 3 }}>Cost Basis (FIFO)</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: THEME.muted }}>₹{fmt2(totalCost)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 3 }}>Net P&L</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: totalPnl >= 0 ? THEME.sage : THEME.rust }}>
                  {totalPnl >= 0 ? "+" : "−"}₹{fmt2(Math.abs(totalPnl))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, paddingTop: 10, borderTop: `1px solid ${THEME.line}40`, flexWrap: "wrap" }}>
              {stcgPnl !== 0 && (
                <span style={{ fontSize: 12 }}>
                  <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 800, background: `${THEME.gold}1f`, color: THEME.gold, marginRight: 6 }}>STCG</span>
                  <b style={{ color: stcgPnl >= 0 ? THEME.sage : THEME.rust }}>{stcgPnl >= 0 ? "+" : "−"}₹{fmt(Math.abs(stcgPnl))}</b>
                </span>
              )}
              {ltcgPnl !== 0 && (
                <span style={{ fontSize: 12 }}>
                  <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 800, background: `${THEME.sage}1f`, color: THEME.sage, marginRight: 6 }}>LTCG</span>
                  <b style={{ color: ltcgPnl >= 0 ? THEME.sage : THEME.rust }}>{ltcgPnl >= 0 ? "+" : "−"}₹{fmt(Math.abs(ltcgPnl))}</b>
                </span>
              )}
              {remainingAfter > 0 && (
                <span style={{ fontSize: 12, marginLeft: "auto" }}>
                  <span style={{ color: THEME.muted }}>Remaining after sell: </span>
                  <b>{remainingAfter} shares</b>
                </span>
              )}
            </div>
          </div>
        </>
      )}

      <ModalActions onSave={() => isValid && onSave(allocs, sellPriceNum, f.sellDate, f.broker)} onClose={onClose} saveLabel="Confirm Sell" disabled={!isValid || allocs.length === 0} />
    </Modal>
  );
}

function SplitBonusModal({ group, onClose, onApply }: any) {
  const [type, setType] = useState<"split" | "bonus">("split");
  const [ratioN, setRatioN] = useState("2");
  const [ratioM, setRatioM] = useState("1");
  const [actionDate, setActionDate] = useState(""); // user must pick the actual corporate action date
  const n = Number(ratioN) || 0;
  const m = Number(ratioM) || 0;
  const totalQty = group.lots.reduce((s: number, l: any) => s + Number(l.qty), 0);
  const totalInv = group.lots.reduce((s: number, l: any) => s + Number(l.qty) * Number(l.avgPrice), 0);
  let newTotalQty = 0;
  if (n > 0 && m > 0) newTotalQty = type === "split" ? Math.floor(totalQty * n / m) : Math.floor(totalQty * (m + n) / m);
  const newAvgPreview = newTotalQty > 0 ? totalInv / newTotalQty : 0;
  const isValid = n > 0 && m > 0 && !!actionDate && (type === "split" ? n > m : true);
  const handleApply = () => {
    if (!isValid) return;
    const updates = group.lots.map((lot: any) => {
      const oldQty = Number(lot.qty);
      const oldAvg = Number(lot.avgPrice);
      const newQty = type === "split" ? Math.floor(oldQty * n / m) : Math.floor(oldQty * (m + n) / m);
      const newAvg = newQty > 0 ? (oldQty * oldAvg) / newQty : oldAvg;
      return { id: lot.id, qty: String(newQty), avgPrice: String(Number(newAvg.toFixed(4))) };
    });
    const actionLog = {
      symbol: group.base,
      exchange: group.exchange,
      actionType: type,
      ratioN: n,
      ratioM: m,
      actionDate,
      oldQty: totalQty,
      newQty: newTotalQty,
      oldAvgPrice: totalQty > 0 ? Number((totalInv / totalQty).toFixed(2)) : 0,
      newAvgPrice: Number(newAvgPreview.toFixed(2)),
    };
    onApply(updates, actionLog);
  };
  return (
    <Modal title={`Corporate Action — ${group.base} (${group.exchange})`} onClose={onClose}>
      <Field label="Action Type"><div style={{ display: "flex", gap: 10 }}>{(["split", "bonus"] as const).map((t) => <button key={t} style={{ ...btnGhost, flex: 1, justifyContent: "center", background: type === t ? THEME.accent : undefined, color: type === t ? "#fff" : undefined, border: type === t ? `1px solid ${THEME.accent}` : undefined }} onClick={() => setType(t)}>{t === "split" ? "Stock Split" : "Bonus Shares"}</button>)}</div></Field>
      <div style={{ padding: "14px 16px", borderRadius: 10, border: `2px solid ${actionDate ? THEME.sage : THEME.rust}`, background: actionDate ? `${THEME.sage}09` : `${THEME.rust}09`, marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: actionDate ? THEME.sage : THEME.rust, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
          Action Date — when did this corporate action happen? {!actionDate && "★ Required"}
        </label>
        <input style={{ ...input, borderColor: actionDate ? THEME.sage : THEME.rust }} type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} />
        {!actionDate && <div style={{ fontSize: 12, color: THEME.rust, marginTop: 6, fontWeight: 600 }}>Enter the actual date (e.g. 15 Jan 2025) — this is saved in the history log</div>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "end" }}><Field label={type === "split" ? "New Shares" : "Bonus Shares"}><input style={input} type="number" min="1" value={ratioN} onChange={(e) => setRatioN(e.target.value)} /></Field><div style={{ paddingBottom: 10, fontWeight: 700, fontSize: 20, color: THEME.muted, textAlign: "center" }}>:</div><Field label="Existing Shares"><input style={input} type="number" min="1" value={ratioM} onChange={(e) => setRatioM(e.target.value)} /></Field></div>
      {isValid && newTotalQty > 0 && <div style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(128,128,128,0.08)", marginTop: 4, fontSize: 13 }}><span><span style={{ color: THEME.muted }}>Total Qty: </span><b style={{ color: THEME.muted }}>{totalQty}</b> → <b style={{ color: THEME.gold }}>{newTotalQty}</b></span><span style={{ marginLeft: 20 }}><span style={{ color: THEME.muted }}>Avg Price: </span><b style={{ color: THEME.muted }}>₹{(totalInv / totalQty).toFixed(2)}</b> → <b style={{ color: THEME.gold }}>₹{newAvgPreview.toFixed(2)}</b></span></div>}
      <ModalActions onSave={handleApply} onClose={onClose} saveLabel="Apply Action" disabled={!isValid} />
    </Modal>
  );
}
