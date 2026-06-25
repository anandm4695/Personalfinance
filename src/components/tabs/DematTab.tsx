import React, { useState, useMemo } from "react";
import { ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area, PieChart, Pie, Cell, Legend, BarChart, Bar } from "recharts";
import {
  Plus,
  Briefcase,
  TrendingUp,
  Percent,
  ArrowLeftRight,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  Scissors,
  BarChart3,
  Search,
  PieChart as PieIcon,
  Activity,
  ArrowUp,
  ArrowDown,
  Star,
  X,
  Upload,
} from "lucide-react";
import { THEME, PROFILES } from "../../utils/constants";
import { fmtINRFull, calcCAGR, today, calcXIRR } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";
import { BrokerImportModal } from "../modals/BrokerImportModal";

// Broker logo domains for Clearbit
const BROKER_LOGO_DOMAINS: Record<string, string> = {
  zerodha: "zerodha.com",
  kite: "zerodha.com",
  groww: "groww.in",
  kotak: "kotak.com",
  upstox: "upstox.com",
  hdfc: "hdfcsec.com",
  icici: "icicidirect.com",
  angel: "angelbroking.com",
  motilal: "motilaloswal.com",
  "5paisa": "5paisa.com",
  paytm: "paytmmoney.com",
  sharekhan: "sharekhan.com",
  fyers: "fyers.in",
  dhan: "dhan.co",
  iifl: "iiflsecurities.com",
  sbi: "sbisecurities.in",
  axis: "axisdirect.in",
  ninestar: "9star.in",
  "9star": "9star.in",
};

// Broker brand colors — covers all major Indian brokers
const BROKER_THEMES: Record<string, { gradient: string; color: string }> = {
  zerodha: { gradient: "linear-gradient(135deg,#387ed1 0%,#60a5fa 100%)", color: "#387ed1" },
  kite: { gradient: "linear-gradient(135deg,#387ed1 0%,#60a5fa 100%)", color: "#387ed1" },
  groww: { gradient: "linear-gradient(135deg,#00b899 0%,#34d399 100%)", color: "#00b899" },
  kotak: { gradient: "linear-gradient(135deg,#dc2626 0%,#f87171 100%)", color: "#dc2626" },
  upstox: { gradient: "linear-gradient(135deg,#7c3aed 0%,#a78bfa 100%)", color: "#7c3aed" },
  hdfc: { gradient: "linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%)", color: "#1e40af" },
  icici: { gradient: "linear-gradient(135deg,#f47920 0%,#fb923c 100%)", color: "#f47920" },
  angel: { gradient: "linear-gradient(135deg,#1e40af 0%,#60a5fa 100%)", color: "#1e40af" },
  motilal: { gradient: "linear-gradient(135deg,#d97706 0%,#fbbf24 100%)", color: "#d97706" },
  "5paisa": { gradient: "linear-gradient(135deg,#0891b2 0%,#22d3ee 100%)", color: "#0891b2" },
  paytm: { gradient: "linear-gradient(135deg,#2563eb 0%,#60a5fa 100%)", color: "#2563eb" },
  sharekhan: { gradient: "linear-gradient(135deg,#059669 0%,#34d399 100%)", color: "#059669" },
  fyers: { gradient: "linear-gradient(135deg,#0f172a 0%,#334155 100%)", color: "#334155" },
  dhan: { gradient: "linear-gradient(135deg,#7c3aed 0%,#c084fc 100%)", color: "#7c3aed" },
  iifl: { gradient: "linear-gradient(135deg,#b45309 0%,#f59e0b 100%)", color: "#b45309" },
  sbi: { gradient: "linear-gradient(135deg,#1d4ed8 0%,#60a5fa 100%)", color: "#1d4ed8" },
  axis: { gradient: "linear-gradient(135deg,#7c2d12 0%,#f97316 100%)", color: "#ea580c" },
  ninestar: { gradient: "linear-gradient(135deg,#b45309 0%,#fbbf24 100%)", color: "#b45309" },
  "9star": { gradient: "linear-gradient(135deg,#b45309 0%,#fbbf24 100%)", color: "#b45309" },
};

function getBrokerTheme(broker: string) {
  const key = (broker || "").toLowerCase().replace(/[\s\-_.]+/g, "");
  for (const [k, v] of Object.entries(BROKER_THEMES)) {
    if (key.includes(k)) return v;
  }
  // Deterministic color from broker name so it's stable across renders
  const hue =
    Array.from(broker || "?").reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0) % 360;
  const color = `hsl(${hue},55%,42%)`;
  return {
    gradient: `linear-gradient(135deg,hsl(${hue},55%,42%) 0%,hsl(${hue},70%,62%) 100%)`,
    color,
  };
}

function brokerInitials(broker: string): string {
  const words = (broker || "?").trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// NSE symbols that have been renamed — Groww CDN uses the current exchange symbol
const GROWW_SYMBOL_OVERRIDES: Record<string, string> = {
  ZOMATO: "ETERNAL", // Zomato Ltd rebranded to Eternal Ltd on NSE (2025)
};

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
      .then((r) => r.json())
      .then((d) => {
        _logoCache[yfSym] = d;
        if (!cancelled) {
          setLogoUrl(d.logoUrl ?? null);
          setFaviconUrl(d.faviconUrl ?? null);
        }
      })
      .catch(() => {
        _logoCache[yfSym] = null;
      });
    return () => {
      cancelled = true;
    };
  }, [yfSym]);

  const base = yfSym.replace(/\.(NS|BO)$/i, "");
  const isBSE = /\.BO$/i.test(yfSym);
  const exch = isBSE ? "BSE" : "NSE";
  const eohdUrl = `https://eodhd.com/img/logos/${exch}/${base}.png`;
  const hue =
    Array.from(base).reduce((h: number, c: string) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0) % 360;
  const br = Math.round(size * 0.28);
  const pad = Math.round(size * 0.1);

  const imgStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "contain" };
  const wrapStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: br,
    background: "var(--surface-0)",
    border: `1px solid ${THEME.line}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
    padding: pad,
    boxSizing: "border-box",
  };

  const markFailed = (url: string) => setFailedUrls((prev) => new Set([...prev, url]));

  // Groww CDN: 256×256 WebP, covers virtually all NSE stocks, clean 404 on unknown symbols.
  // Only for NSE stocks (BSE symbols don't match Groww's naming). Handles renamings via
  // GROWW_SYMBOL_OVERRIDES (e.g. ZOMATO→ETERNAL) and special chars via encodeURIComponent.
  const growwSym = GROWW_SYMBOL_OVERRIDES[base.toUpperCase()] ?? base;
  const growwUrl = !isBSE
    ? `https://assets-netstorage.groww.in/stock-assets/logos2/${encodeURIComponent(growwSym)}.webp`
    : null;

  // Fallback chain: Groww CDN (256×256 WebP) → Clearbit/EODHD (from API) → EODHD CDN (client-direct)
  // → faviconUrl (Google Favicon, last resort). Any source returning a 404 fires onError → next candidate.
  const candidates: string[] = [
    growwUrl,
    logoUrl,
    eohdUrl !== logoUrl ? eohdUrl : null,
    faviconUrl,
  ].filter(Boolean) as string[];
  const activeSrc = candidates.find((u) => !failedUrls.has(u));

  if (activeSrc) {
    return (
      <div style={wrapStyle}>
        <img src={activeSrc} alt={base} onError={() => markFailed(activeSrc)} style={imgStyle} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: br,
        background: `linear-gradient(135deg,hsl(${hue},55%,42%) 0%,hsl(${hue},70%,62%) 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: Math.round(size * 0.3),
          fontWeight: 900,
          color: "#fff",
          letterSpacing: "-0.01em",
        }}
      >
        {base.slice(0, 2)}
      </span>
    </div>
  );
};

const BrokerLogo = ({
  broker,
  theme,
  size,
  borderRadius,
}: {
  broker: string;
  theme: { gradient: string; color: string };
  size: number;
  borderRadius: number;
}) => {
  const key = (broker || "").toLowerCase().replace(/[\s\-_.]+/g, "");
  let domain = "";
  for (const [k, d] of Object.entries(BROKER_LOGO_DOMAINS)) {
    if (key.includes(k)) {
      domain = d;
      break;
    }
  }

  const [imgSrc, setImgSrc] = React.useState<string | null>(null);
  const [fallbackLevel, setFallbackLevel] = React.useState<number>(0); // 0: hunter.io, 1: google favicon, 2: initials

  React.useEffect(() => {
    if (domain) {
      setImgSrc(`https://logos.hunter.io/${domain}`);
      setFallbackLevel(0);
    } else {
      setImgSrc(null);
      setFallbackLevel(2);
    }
  }, [domain]);

  const handleError = () => {
    if (fallbackLevel === 0) {
      setFallbackLevel(1);
      setImgSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`);
    } else if (fallbackLevel === 1) {
      setFallbackLevel(2);
      setImgSrc(null);
    }
  };

  const initials = brokerInitials(broker || "?");
  const fontSize = Math.round(size * 0.38);

  if (domain && fallbackLevel < 2 && imgSrc) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius,
          background: "var(--surface-0)",
          border: `1.5px solid ${theme.color}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 4px 14px ${theme.color}30`,
          overflow: "hidden",
        }}
      >
        <img
          src={imgSrc}
          alt={broker}
          onError={handleError}
          style={{
            width: Math.round(size * 0.80),
            height: Math.round(size * 0.80),
            objectFit: "contain",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        background: theme.gradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: `0 4px 14px ${theme.color}40`,
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 900,
          color: "#fff",
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        {initials}
      </span>
    </div>
  );
};

const EmptyHint = ({ text }: { text: string }) => (
  <div
    style={{
      padding: "40px 24px",
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
        background: `${THEME.accent}12`,
        border: `1px solid ${THEME.accent}26`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Briefcase size={18} color={THEME.accent} />
    </div>
    <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 500 }}>{text}</div>
  </div>
);

const DematEmptyState = ({ onAdd }: any) => (
  <div
    style={{
      padding: "48px 40px",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 16,
    }}
  >
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 18,
        background: `linear-gradient(135deg, ${THEME.sage} 0%, ${THEME.sage}b3 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Briefcase size={24} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>No Demat Accounts Added</div>
      <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 340 }}>
        Add your Zerodha, Groww, or Upstox account to start tracking your equity portfolio.
      </div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {[
        "Zerodha / Groww / Upstox",
        "DP ID & Client ID",
        "Multi-broker Support",
        "Portfolio View",
      ].map((f) => (
        <span
          key={f}
          style={{
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 20,
            background: `${THEME.sage}15`,
            color: THEME.sage,
            fontWeight: 600,
            border: `1px solid ${THEME.sage}26`,
          }}
        >
          ● {f}
        </span>
      ))}
    </div>
    <Button variant="accent" icon={<Plus size={15} />} onClick={onAdd}>
      Add Demat Account
    </Button>
  </div>
);

const StockEmptyState = ({ onAdd }: any) => (
  <div
    style={{
      padding: "60px 40px",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 20,
    }}
  >
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 20,
        background: `linear-gradient(135deg, ${THEME.accent} 0%, ${THEME.accent}b3 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <TrendingUp size={28} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No Stock Holdings Yet</div>
      <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 380 }}>
        Add your equity scrips to track live NSE/BSE prices, unrealised P&L, CAGR, and intraday
        charts — all in one place.
      </div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {["Live NSE / BSE Prices", "Unrealised P&L", "CAGR Calculator", "Buy / Sell Ledger"].map(
        (f) => (
          <span
            key={f}
            style={{
              fontSize: 11,
              padding: "5px 12px",
              borderRadius: 20,
              background: `${THEME.accent}15`,
              color: THEME.accent,
              fontWeight: 600,
              border: `1px solid ${THEME.accent}26`,
            }}
          >
            ● {f}
          </span>
        )
      )}
    </div>
    <Button variant="accent" icon={<Plus size={16} />} style={{ marginTop: 8 }} onClick={onAdd}>
      Add Stock Scrip
    </Button>
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
  background: "var(--surface-0)",
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
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 16,
      marginBottom: 32,
    }}
  >
    {children}
  </div>
);

const InvestCard = ({ children, onRemove, onEdit, style: extraStyle }: any) => (
  <Card style={{ position: "relative", overflow: "hidden", ...extraStyle }}>
    <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4 }}>
      <button onClick={onEdit} className="icon-btn" style={iconBtn} title="Edit account">
        <Edit3 size={14} />
      </button>
      <button onClick={onRemove} className="icon-btn danger" style={iconBtn} title="Delete account">
        <Trash2 size={14} />
      </button>
    </div>
    {children}
  </Card>
);

const th = {
  textAlign: "left" as const,
  padding: "11px 10px",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: THEME.muted,
  fontWeight: 700,
  borderBottom: `1px solid var(--t-line)`,
  whiteSpace: "nowrap" as const,
};
const td = {
  padding: "12px 10px",
  verticalAlign: "middle" as const,
  fontSize: 13,
  borderBottom: `1px solid var(--t-line)`,
  fontVariantNumeric: "tabular-nums" as const,
};

type FifoAlloc = {
  lot: any;
  consume: number;
  buyPrice: number;
  pnl: number;
  isLTCG: boolean;
  fullyConsumed: boolean;
};

function computeFifoAlloc(lots: any[], sellQty: number, sellPrice: number, sellDate?: string): FifoAlloc[] {
  const sorted = [...lots].sort((a: any, b: any) => {
    if (!a.buyDate && !b.buyDate) return 0;
    if (!a.buyDate) return 1;
    if (!b.buyDate) return -1;
    return new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime();
  });
  const result: FifoAlloc[] = [];
  let remaining = sellQty;
  const refTime = sellDate ? new Date(sellDate).getTime() : Date.now();
  for (const lot of sorted) {
    if (remaining <= 0) break;
    const available = Number(lot.qty);
    const consume = Math.min(available, remaining);
    const buyPrice = Number(lot.avgPrice);
    const isLTCG = lot.buyDate ? refTime - new Date(lot.buyDate).getTime() > 365 * 86400 * 1000 : false;
    result.push({
      lot,
      consume,
      buyPrice,
      pnl: (sellPrice - buyPrice) * consume,
      isLTCG,
      fullyConsumed: consume >= available,
    });
    remaining -= consume;
  }
  return result;
}

// ─── WATCHLIST ──────────────────────────────────────────────────────────────

const WISHLIST_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#64748b",
];

function WishlistModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: any;
  onClose: () => void;
  onSave: (v: any) => void;
}) {
  const [name, setName] = React.useState(initial?.name || "");
  const [description, setDescription] = React.useState(initial?.description || "");
  const [color, setColor] = React.useState(initial?.color || WISHLIST_COLORS[0]);

  return (
    <Modal
      title={initial ? "Rename Watchlist" : "New Watchlist"}
      onClose={onClose}
    >
      <Field label="Watchlist Name ★">
        <input
          style={input}
          placeholder="e.g. Tech Picks, Blue Chip, Dividend Stars"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </Field>
      <Field label="Description (optional)">
        <input
          style={input}
          placeholder="Short note about this watchlist"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <Field label="Color">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {WISHLIST_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: c,
                border: color === c ? `3px solid ${THEME.ink}` : "3px solid transparent",
                cursor: "pointer",
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </Field>
      <ModalActions
        onSave={() => {
          if (!name.trim()) return;
          onSave({ name: name.trim(), description: description.trim(), color });
        }}
        onClose={onClose}
        saveLabel={initial ? "Save" : "Create Watchlist"}
        disabled={!name.trim()}
      />
    </Modal>
  );
}

function WishlistItemModal({
  wishlistName,
  initial,
  onClose,
  onSave,
}: {
  wishlistName: string;
  initial?: any;
  onClose: () => void;
  onSave: (v: any) => void;
}) {
  const isEdit = !!initial;
  const [symbol, setSymbol] = React.useState(initial?.symbol || "");
  const [exchange, setExchange] = React.useState(initial?.exchange || "NSE");
  const [targetPrice, setTargetPrice] = React.useState(
    initial?.targetPrice != null ? String(initial.targetPrice) : ""
  );
  const [notes, setNotes] = React.useState(initial?.notes || "");

  return (
    <Modal title={isEdit ? `Edit "${initial.symbol}"` : `Add Stock to Watchlist "${wishlistName}"`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
        <Field label="Symbol ★">
          <input
            style={{ ...input, textTransform: "uppercase" }}
            placeholder="e.g. RELIANCE, INFY"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            disabled={isEdit}
            autoFocus={!isEdit}
          />
        </Field>
        <Field label="Exchange">
          <select
            style={{ ...input, width: 80 }}
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
            disabled={isEdit}
          >
            <option value="NSE">NSE</option>
            <option value="BSE">BSE</option>
          </select>
        </Field>
      </div>
      <Field label="Target Price (₹)">
        <input
          style={input}
          type="number"
          min="0"
          placeholder="Buy target — optional"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          autoFocus={isEdit}
        />
      </Field>
      <Field label="Notes (optional)">
        <input
          style={input}
          placeholder="Why this stock? Catalyst, thesis…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <ModalActions
        onSave={() => {
          if (!symbol.trim()) return;
          onSave({
            symbol: symbol.trim(),
            exchange,
            targetPrice: targetPrice ? Number(targetPrice) : null,
            notes: notes.trim() || null,
          });
        }}
        onClose={onClose}
        saveLabel={isEdit ? "Save Changes" : "Add to Watchlist"}
        disabled={!symbol.trim()}
      />
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function DematTab({
  state,
  addItem,
  removeItem,
  updateItem,
  missingTables = [],
  marketData,
  fetchLivePrices,
  fetchingPrices,
  marketDataTs,
  wishlists = [],
  wishlistItems = [],
}: any) {
  const [showDemat, setShowDemat] = useState(false);
  const [editDematId, setEditDematId] = useState<string | null>(null);
  const [showStock, setShowStock] = useState(false);
  const [stockDefaults, setStockDefaults] = useState<any>(null);
  const [editStockId, setEditStockId] = useState<string | null>(null);
  const [showBrokerImport, setShowBrokerImport] = useState(false);

  // Watchlist UI state
  const [dematView, setDematView] = useState<"holdings" | "analytics" | "watchlist">("holdings");
  const [expandedWishlistId, setExpandedWishlistId] = useState<string | null>(null);
  const [expandedWatchlistItems, setExpandedWatchlistItems] = useState(new Set<string>());
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [editWishlistId, setEditWishlistId] = useState<string | null>(null);
  const [showWishlistItemModal, setShowWishlistItemModal] = useState(false);
  const [wishlistItemTarget, setWishlistItemTarget] = useState<string | null>(null);
  const [editWishlistItemId, setEditWishlistItemId] = useState<string | null>(null);

  const [chartData, setChartData] = useState<any>({});
  const [expandedSymbols, setExpandedSymbols] = useState(new Set<string>());
  const [lotSortDir, setLotSortDir] = useState<Record<string, "asc" | "desc">>({});
  const [fetchingChart, setFetchingChart] = useState<string | null>(null);
  const [chartPeriod, setChartPeriod] = useState<Record<string, string>>({});
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

  const groups: any[] = useMemo(
    () =>
      Object.values(
        state.stocks.reduce((acc: any, s: any) => {
          const base = s.symbol.replace(/\.(NS|BO)$/i, "");
          const exch = s.exchange || "NSE";
          const key = `${base}|${exch}`;
          if (!acc[key])
            acc[key] = {
              base,
              exchange: exch,
              yfSym: `${base}.${exch === "BSE" ? "BO" : "NS"}`,
              lots: [],
            };
          acc[key].lots.push(s);
          return acc;
        }, {})
      ),
    [state.stocks]
  );

  const visibleGroups = useMemo(() => {
    let baseGroups = selectedDematId
      ? groups
          .map((g) => ({ ...g, lots: g.lots.filter((l: any) => l.dematId === selectedDematId) }))
          .filter((g) => g.lots.length > 0)
      : groups;

    if (search) {
      const q = search.toLowerCase();
      baseGroups = baseGroups.filter(
        (g) =>
          g.base.toLowerCase().includes(q) || marketData[g.yfSym]?.sector?.toLowerCase().includes(q)
      );
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
      const valA = a.lots.reduce((s: number, l: any) => s + Number(l.qty) * priceA, 0);
      const valB = b.lots.reduce((s: number, l: any) => s + Number(l.qty) * priceB, 0);

      if (sortBy === "value") return valB - valA;

      if (sortBy === "pnl") {
        const invA = a.lots.reduce(
          (s: number, l: any) => s + Number(l.qty) * Number(l.avgPrice),
          0
        );
        const invB = b.lots.reduce(
          (s: number, l: any) => s + Number(l.qty) * Number(l.avgPrice),
          0
        );
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

  const CHART_PERIODS = ["1d", "5d", "1m", "6m", "ytd", "1y", "3y", "5y", "max"] as const;
  const CHART_PERIOD_LABELS: Record<string, string> = {
    "1d": "1D", "5d": "5D", "1m": "1M", "6m": "6M", "ytd": "YTD",
    "1y": "1Y", "3y": "3Y", "5y": "5Y", "max": "All",
  };

  const fetchChart = async (yfSym: string, range: string = "1d") => {
    const cacheKey = `${yfSym}__${range}`;
    if (chartData[cacheKey] || fetchingChart === yfSym) return;
    setFetchingChart(yfSym);
    try {
      const res = await fetch(`/api/stock-chart?symbol=${encodeURIComponent(yfSym)}&range=${range}`);
      if (res.ok) {
        const data = await res.json();
        const entry = Array.isArray(data) ? { date: null, points: data } : data;
        setChartData((prev: any) => ({ ...prev, [cacheKey]: entry }));
      } else {
        setChartData((prev: any) => ({ ...prev, [cacheKey]: { date: null, points: [] } }));
      }
    } catch (_) {
      setChartData((prev: any) => ({ ...prev, [cacheKey]: { date: null, points: [] } }));
    }
    setFetchingChart(null);
  };

  const fetchIntradayChart = (yfSym: string) => fetchChart(yfSym, chartPeriod[yfSym] || "1d");

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
    return s + Number(st.qty) * price;
  }, 0);

  const totalInvested = filteredStocks.reduce(
    (s: number, st: any) => s + Number(st.qty) * Number(st.avgPrice),
    0
  );

  const overallXirr = useMemo(() => {
    try {
      const cashFlows: any[] = [];
      const safeFilteredStocks = Array.isArray(filteredStocks) ? filteredStocks : [];
      const safeStockSells = Array.isArray(state.stockSells) ? state.stockSells : [];

      // Active stocks
      safeFilteredStocks.forEach((st: any) => {
        if (!st) return;
        const qty = Number(st.qty) || 0;
        const avgPrice = Number(st.avgPrice) || 0;
        const base = (st.symbol || "").replace(/\.(NS|BO)$/i, "");
        const exch = st.exchange || "NSE";
        const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
        const md = marketData[yfSym];
        const currentPrice = md?.price ?? Number(st.currentPrice ?? 0);

        if (qty > 0 && st.buyDate) {
          cashFlows.push({
            date: st.buyDate,
            amount: -(qty * avgPrice),
          });
          cashFlows.push({
            date: today(),
            amount: qty * currentPrice,
          });
        }
      });

      // Sold stock transactions
      const sells = safeStockSells.filter((s: any) => {
        if (!s) return false;
        if (selectedDematId && s.dematId !== selectedDematId) return false;
        return true;
      });

      sells.forEach((s: any) => {
        const qty = Number(s.qty) || 0;
        const buyPrice = Number(s.buyPrice) || 0;
        const sellPrice = Number(s.sellPrice) || 0;
        const buyDate = s.buyDate;
        const sellDate = s.sellDate;
        if (qty > 0 && sellDate) {
          if (buyDate) {
            cashFlows.push({
              date: buyDate,
              amount: -(qty * buyPrice),
            });
          }
          cashFlows.push({
            date: sellDate,
            amount: qty * sellPrice,
          });
        }
      });

      return calcXIRR(cashFlows);
    } catch (e) {
      console.error("Error calculating overall Stock XIRR:", e);
      return null;
    }
  }, [filteredStocks, state.stockSells, marketData, selectedDematId]);

  const pnl = totalValue - totalInvested;

  const totalDaysPnL = filteredStocks.reduce((s: number, st: any) => {
    const base = st.symbol.replace(/\.(NS|BO)$/i, "");
    const exch = st.exchange || "NSE";
    const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
    const md = marketData[yfSym];
    if (!md) return s;
    const change = md.change ?? 0;
    return s + Number(st.qty) * change;
  }, 0);

  const prevCloseValue = totalValue - totalDaysPnL;
  const totalDaysPnLPct = prevCloseValue > 0 ? (totalDaysPnL / prevCloseValue) * 100 : 0;

  // ─── PORTFOLIO HEALTH SCORE CALCULATIONS ──────────────────────────────────
  const portfolioScoreData = useMemo(() => {
    if (!filteredStocks || filteredStocks.length === 0) {
      return {
        overall: 0,
        quality: 0,
        momentum: 0,
        diversification: 0,
        riskManagement: 0,
        consistency: 0,
        status: "Empty Portfolio",
        statusColor: THEME.muted,
        rationale: "Add stock scrips to calculate your portfolio health scores.",
        insights: [],
        hhi: 0,
        stockWeights: [],
        totalMfVal: 0,
      };
    }

    // Helper: Ticker price resolver
    const getStockPrice = (st: any) => {
      const base = st.symbol.replace(/\.(NS|BO)$/i, "");
      const exch = st.exchange || "NSE";
      const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
      const livePrice = marketData[yfSym]?.price;
      return livePrice !== undefined ? Number(livePrice) : Number(st.currentPrice || 0);
    };

    // Calculate stock values and weights
    const stockValues = filteredStocks.map((st: any) => {
      const val = Number(st.qty) * getStockPrice(st);
      const base = st.symbol.replace(/\.(NS|BO)$/i, "").toUpperCase();
      const exch = st.exchange || "NSE";
      return {
        symbol: base,
        exchange: exch,
        yfSym: `${base}.${exch === "BSE" ? "BO" : "NS"}`,
        qty: Number(st.qty),
        avgPrice: Number(st.avgPrice),
        currentPrice: getStockPrice(st),
        value: val,
      };
    });

    const totalVal = stockValues.reduce((sum: number, s: any) => sum + s.value, 0) || 1;

    // Weights
    const stockWeights = stockValues.map((s: any) => ({
      ...s,
      weight: (s.value / totalVal) * 100,
    })).sort((a: any, b: any) => b.value - a.value);

    // 1. QUALITY SCORE (0-100)
    // Heuristic maps for popular Indian tickers
    const highQualityList = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "HINDUNILVR", "ITC", "LT", "BHARTIARTL", "SBIN", "TATASTEEL", "MARUTI", "WIPRO", "HCLTECH", "KOTAKBANK", "AXISBANK", "ASIANPAINT", "BAJFINANCE", "SUNPHARMA", "NTPC", "POWERGRID"];
    const midQualityList = ["TATAELXSI", "KPIT", "COFORGE", "CDSL", "HAL", "BEL", "IREDA", "IRFC", "RVNL", "NHPC", "TATAPOWER", "JIOFIN", "ZOMATO", "PFC", "RECL", "HUDCO", "BHEL", "LICHSGFIN"];
    const speculativeList = ["YESBANK", "SUZLON", "IDEA", "GTLINFRA", "JPPOWER", "GTL", "RPOWER", "INFIBEAM", "PCJEWELLER", "RELIANCEINFRA", "RELIANCEPOWER", "RCOM"];

    const getQualityVal = (sym: string) => {
      if (highQualityList.includes(sym)) return 95;
      if (midQualityList.includes(sym)) return 80;
      if (speculativeList.includes(sym)) return 35;
      // Deterministic fallback based on symbol name
      let scoreSum = 0;
      for (let i = 0; i < sym.length; i++) {
        scoreSum += sym.charCodeAt(i);
      }
      return 55 + (scoreSum % 26); // returns between 55 and 80
    };

    const qualityScore = Math.round(
      stockWeights.reduce((sum: number, s: any) => sum + getQualityVal(s.symbol) * (s.weight / 100), 0)
    );

    // 2. MOMENTUM SCORE (0-100)
    // Based on return percentage + day change
    const getMomentumVal = (s: any) => {
      const absoluteReturnPct = s.avgPrice > 0 ? ((s.currentPrice - s.avgPrice) / s.avgPrice) * 100 : 0;
      let score = 50 + absoluteReturnPct * 0.9;

      const md = marketData[s.yfSym];
      const dailyChangePct = md?.changePercent ?? 0;
      score += dailyChangePct * 1.5;

      return Math.max(10, Math.min(99, score));
    };

    const momentumScore = Math.round(
      stockWeights.reduce((sum: number, s: any) => sum + getMomentumVal(s) * (s.weight / 100), 0)
    );

    // 3. DIVERSIFICATION SCORE (0-100)
    // HHI concentration index: w_i is weight percentage (e.g. 20)
    // HHI = Sum of w_i^2. 
    // Concentrated: HHI > 2500. Well diversified: HHI < 1500.
    const hhi = stockWeights.reduce((sum: number, s: any) => sum + (s.weight * s.weight), 0);
    // Map HHI from [1000, 10000] to [100, 10]
    let divScore = 100;
    if (hhi > 1000) {
      divScore = 100 - ((hhi - 1000) * 90) / 9000;
    }
    const diversificationScore = Math.max(10, Math.min(100, Math.round(divScore)));

    // 4. RISK MANAGEMENT SCORE (0-100)
    // Combines individual asset risk with concentration penalty
    const getRiskVal = (sym: string) => {
      if (highQualityList.includes(sym)) return 90; // high score = low risk
      if (midQualityList.includes(sym)) return 70;
      if (speculativeList.includes(sym)) return 30;
      return 60;
    };
    const baseRiskScore = stockWeights.reduce((sum: number, s: any) => sum + getRiskVal(s.symbol) * (s.weight / 100), 0);
    // Penalty for excessive concentration (largest stock > 25%)
    const maxWeight = stockWeights[0]?.weight ?? 0;
    let concentrationPenalty = 0;
    if (maxWeight > 40) concentrationPenalty = 20;
    else if (maxWeight > 25) concentrationPenalty = 10;

    const riskManagementScore = Math.max(10, Math.round(baseRiskScore - concentrationPenalty));

    // 5. CONSISTENCY / DEFENSIVE SCORE (0-100)
    // Evaluates what portion of holdings are positive vs negative
    const positiveReturnCount = stockWeights.filter((s: any) => s.currentPrice >= s.avgPrice).length;
    const consistencyScore = Math.round(
      (positiveReturnCount / stockWeights.length) * 50 + 50
    );

    // Overall blended score
    const overall = Math.round(
      qualityScore * 0.3 +
        momentumScore * 0.25 +
        diversificationScore * 0.25 +
        riskManagementScore * 0.20
    );

    // Status mapping
    let status = "Moderate";
    let statusColor = THEME.gold;
    if (overall >= 80) {
      status = "Very Strong";
      statusColor = THEME.sage;
    } else if (overall < 50) {
      status = "Action Required";
      statusColor = THEME.rust;
    }

    // Dynamic Rationale
    let rationale = "";
    if (overall >= 80) {
      rationale = "Your portfolio exhibits exceptional health, characterized by high-quality assets, solid diversification, and robust risk management. Maintain your current holding pattern.";
    } else if (overall >= 65) {
      rationale = "Your portfolio is in a healthy, moderate state. Consider trimming speculative holdings or consolidating some of your smaller, low-conviction positions to improve quality.";
    } else if (overall >= 50) {
      rationale = "Your portfolio health is average. Performance is likely held back by either highly concentrated holdings, weak stock momentum, or high speculative asset exposure.";
    } else {
      rationale = "Your portfolio health requires immediate attention. High concentration in speculative stocks or deeply negative momentum represents severe exposure. Review the insights below.";
    }

    // Generate actionable insights
    const insights: string[] = [];

    if (maxWeight > 25) {
      insights.push(
        `⚠️ High concentration in a single stock: "${stockWeights[0].symbol}" makes up ${maxWeight.toFixed(1)}% of your portfolio. Consider trimming this to below 20% to mitigate single-stock risk.`
      );
    }
    
    const speculativeWeight = stockWeights.reduce(
      (sum: number, s: any) => sum + (speculativeList.includes(s.symbol) ? s.weight : 0),
      0
    );
    if (speculativeWeight > 20) {
      insights.push(
        `⚠️ Speculative exposure is high: Penny or highly volatile stocks represent ${speculativeWeight.toFixed(1)}% of holdings. Rotate some capital into stable Nifty 50 companies.`
      );
    }

    if (diversificationScore < 50) {
      insights.push(
        `📉 Highly concentrated portfolio: Your HHI is ${Math.round(hhi)}. Broaden your diversification by spreading capital across 3-4 additional sectors.`
      );
    } else if (diversificationScore > 90 && filteredStocks.length > 25) {
      insights.push(
        `ℹ️ Over-diversification alert: You have ${filteredStocks.length} holdings. This may dilute your returns. Consider consolidating into your 12-15 highest conviction stocks.`
      );
    }

    if (momentumScore < 50) {
      insights.push(
        `📉 Weak price momentum: A significant portion of your holdings are underperforming. Review companies with decaying returns and check if their business fundamentals are deteriorating.`
      );
    }

    // Combined summary logic for Mutual Funds
    const mutualFundsList = state.mutualFunds || [];
    const totalMfVal = mutualFundsList.reduce((sum: number, mf: any) => {
      const units = Number(mf.units) || 0;
      const nav = Number(mf.currentNav) || Number(mf.buyNav) || 0;
      return sum + (units * nav);
    }, 0);

    if (totalMfVal > 0) {
      const ratio = totalVal / (totalVal + totalMfVal);
      if (ratio > 0.8) {
        insights.push(
          `💡 Combined asset check: You are heavily tilted towards direct stocks (${(ratio * 100).toFixed(0)}% vs ${(100 - ratio * 100).toFixed(0)}% Mutual Funds). Consider raising your mutual fund allocation for passive stability.`
        );
      } else {
        insights.push(
          `✓ Combined asset balance: Healthy mix of Direct Stocks (${(ratio * 100).toFixed(0)}%) and Mutual Funds (${(100 - ratio * 100).toFixed(0)}%) provides defensive stability.`
        );
      }
    } else if (filteredStocks.length > 0) {
      insights.push(
        `💡 Diversification tip: You do not have any Mutual Funds registered. Allocating a portion of your wealth to index or hybrid mutual funds can improve long-term resilience.`
      );
    }

    if (insights.length === 0) {
      insights.push("✓ No immediate actions needed. Your portfolio looks well-structured and healthy.");
    }

    return {
      overall,
      quality: qualityScore,
      momentum: momentumScore,
      diversification: diversificationScore,
      riskManagement: riskManagementScore,
      consistency: consistencyScore,
      status,
      statusColor,
      rationale,
      insights,
      hhi,
      stockWeights,
      totalMfVal,
    };
  }, [filteredStocks, marketData, state.mutualFunds]);

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
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Button
              variant="secondary"
              icon={<RefreshCw size={13} className={fetchingPrices ? "spin" : ""} />}
              onClick={handleRefresh}
              disabled={fetchingPrices}
            >
              {fetchingPrices ? "Updating…" : "Refresh"}
            </Button>
            {state.stocks.length > 0 && (
              <Button
                variant="secondary"
                icon={<Upload size={14} />}
                onClick={() => setShowBrokerImport(true)}
              >
                Import Trades
              </Button>
            )}
            <Button
              variant="secondary"
              icon={<Briefcase size={14} />}
              onClick={() => setShowDemat(true)}
            >
              Add Account
            </Button>
            <Button
              variant="accent"
              icon={<Plus size={14} />}
              onClick={() => {
                setStockDefaults(null);
                setShowStock(true);
              }}
            >
              Add Scrip
            </Button>
          </div>
        }
      >
        Demat & Stocks
      </SectionTitle>
      {/* Refresh timestamp */}
      {marketDataTs && !fetchingPrices && (
        <div style={{ marginTop: -24, marginBottom: 20 }}>
          <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>
            {(() => {
              const diffMin = Math.floor((Date.now() - marketDataTs) / 60000);
              if (diffMin < 1) return "Updated just now";
              if (diffMin === 1) return "Updated 1 min ago";
              if (diffMin < 60) return `Updated ${diffMin} min ago`;
              const hrs = Math.floor(diffMin / 60);
              return `Updated ${hrs}h ago`;
            })()}
          </span>
        </div>
      )}

      {/* ── MIGRATION BANNER: shown when corporate_actions table is missing in Supabase ── */}
      {missingTables.includes("corporate_actions") && (
        <div
          style={{
            background: `${THEME.rust}0f`,
            border: `1.5px solid ${THEME.rust}`,
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: THEME.rust,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>!</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.rust, marginBottom: 4 }}>
                One-time DB setup required — Stock Split / Bonus History won't save to cloud yet
              </div>
              <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 12 }}>
                The <b>corporate_actions</b> table is missing in your Supabase database. Your
                split/bonus actions are saved <b>locally on this device only</b> until you run this
                SQL once in Supabase.
              </div>
              <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 6, fontWeight: 700 }}>
                Steps: Go to supabase.com → your project → SQL Editor → paste and run:
              </div>
              <pre
                style={{
                  fontSize: 11,
                  background: `${THEME.line}40`,
                  padding: "10px 14px",
                  borderRadius: 8,
                  color: THEME.ink,
                  margin: 0,
                  overflowX: "auto" as const,
                  whiteSpace: "pre" as const,
                  lineHeight: 1.6,
                }}
              >{`CREATE TABLE IF NOT EXISTS public.corporate_actions (
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

      {/* ── VIEW SWITCHER: Holdings | Analytics | Watchlist ── */}
      <div className="demat-portfolio-bar no-scrollbar">
        {([
          { id: "holdings" as const, label: "Holdings", Icon: BarChart3 },
          { id: "analytics" as const, label: "Analytics", Icon: Activity },
          { id: "watchlist" as const, label: "Watchlist", Icon: Star },
        ]).map(({ id, label, Icon }) => {
          const active = dematView === id;
          return (
            <button
              key={id}
              onClick={() => setDematView(id)}
              className={`demat-portfolio-pill ${active ? "active" : ""}`}
            >
              <Icon size={14} />
              {label}
              {id === "watchlist" && wishlists.length > 0 && (
                <span style={{
                  padding: "1px 6px",
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 800,
                  background: `${THEME.accent}22`,
                  color: THEME.accent,
                }}>
                  {wishlists.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── BROKER FILTER BAR — shown for Holdings & Analytics tabs ── */}
      {(dematView === "holdings" || dematView === "analytics") && (
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
                style={
                  active
                    ? ({
                        "--active-bg": `${theme.color}15`,
                        "--active-color": theme.color,
                        "--active-border": `${theme.color}30`,
                      } as React.CSSProperties)
                    : {}
                }
              >
                <BrokerLogo broker={d.broker || "?"} theme={theme} size={20} borderRadius={5} />
                <span>{d.broker || "Broker"}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── MAIN CONTENT AREA (100% width) ── */}
      {dematView === "holdings" && <div style={{ width: "100%", marginTop: 24 }}>
        <div className="demat-stats-grid">
          <StatCard
            icon={<BarChart3 />}
            label="Portfolio Value"
            value={fmtINRFull(totalValue)}
            color={THEME.accent}
            borderColor={THEME.accent}
            sub={`Invested ${fmtINRFull(totalInvested)}`}
          />
          <StatCard
            icon={<Activity />}
            label="Day's P&L"
            value={fmtINRFull(totalDaysPnL)}
            color={totalDaysPnL >= 0 ? THEME.sage : THEME.rust}
            borderColor="#f59e0b"
            sub={
              totalDaysPnL !== 0
                ? `${totalDaysPnL >= 0 ? "+" : ""}${totalDaysPnLPct.toFixed(2)}% today`
                : "No change today"
            }
          />
          <StatCard
            icon={<TrendingUp />}
            label="Unrealized P&L"
            value={fmtINRFull(pnl)}
            color={pnl >= 0 ? THEME.sage : THEME.rust}
            borderColor={pnl >= 0 ? THEME.sage : THEME.rust}
            sub={
              totalInvested
                ? `${((pnl / totalInvested) * 100).toFixed(2)}% absolute return`
                : undefined
            }
          />
          <StatCard
            icon={<TrendingUp />}
            label="Overall XIRR"
            value={overallXirr !== null ? `${overallXirr >= 0 ? "+" : ""}${overallXirr.toFixed(2)}%` : "—"}
            color={overallXirr === null ? THEME.muted : overallXirr >= 0 ? THEME.sage : THEME.rust}
            borderColor="#8b5cf6"
            sub="Annualized rate of return"
          />
        </div>

        {/* Broker Account Cards */}
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
                style={{ borderTop: `4px solid ${theme.color}` }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <BrokerLogo broker={d.broker || "?"} theme={theme} size={46} borderRadius={13} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, marginBottom: 6 }}
                    >
                      {d.broker || "Broker"}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {d.dpId && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              fontSize: 9,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: `${theme.color}18`,
                              color: theme.color,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              lineHeight: 1.2,
                            }}
                          >
                            DP
                          </span>
                          <span
                            style={{
                              color: THEME.ink,
                              fontFamily: "monospace",
                              fontSize: 12,
                              fontWeight: 600,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {d.dpId}
                          </span>
                        </div>
                      )}
                      {d.clientId && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              fontSize: 9,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: `${theme.color}18`,
                              color: theme.color,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              lineHeight: 1.2,
                            }}
                          >
                            ID
                          </span>
                          <span
                            style={{
                              color: THEME.ink,
                              fontFamily: "monospace",
                              fontSize: 12,
                              fontWeight: 600,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {d.clientId}
                          </span>
                        </div>
                      )}
                      {!d.dpId && !d.clientId && (
                        <span style={{ fontSize: 11, color: THEME.muted, fontStyle: "italic" }}>
                          DP & Client ID not configured
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </InvestCard>
            );
          })}
        </Grid>

        {/* Search & Sort Bar */}
        {state.stocks.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              gap: 16,
            }}
          >
            <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
              <input
                placeholder="Search stocks or sectors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  ...input,
                  paddingLeft: 40,
                  borderRadius: 14,
                  height: 44,
                  border: `1.5px solid ${THEME.line}`,
                }}
              />
              <div style={{ position: "absolute", left: 14, top: 13, color: THEME.muted }}>
                <Search size={18} />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--surface-0)",
                padding: "0 12px",
                borderRadius: 12,
                border: `1px solid ${THEME.line}`,
                height: 40,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Sort by:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 700,
                  color: THEME.ink,
                  outline: "none",
                  cursor: "pointer",
                  height: "100%",
                }}
              >
                <option value="value">Highest Value</option>
                <option value="pnl">Best Returns (%)</option>
                <option value="change">Day Gainers (%)</option>
                <option value="name">Symbol (A-Z)</option>
              </select>
            </div>
          </div>
        )}

        {state.stocks.length === 0 ? (
          <div style={card}>
            <StockEmptyState
              onAdd={() => {
                setStockDefaults(null);
                setShowStock(true);
              }}
            />
          </div>
        ) : visibleGroups.length === 0 ? (
          <div style={card}>
            <EmptyHint
              text={`No holdings in ${state.demat.find((d: any) => d.id === selectedDematId)?.broker || "this account"}`}
            />
          </div>
        ) : (
          <div
            style={{
              background: "var(--t-card-bg)",
              borderRadius: 16,
              border: `1px solid ${THEME.line}`,
              overflowX: "auto",
              boxShadow: "var(--t-card-shadow)",
              marginBottom: 20,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-0)" }}>
                  <th style={{ ...th, paddingLeft: 20, borderBottom: `1.5px solid ${THEME.line}` }}>
                    Asset / Scrip
                  </th>
                  <th
                    style={{ ...th, textAlign: "right", borderBottom: `1.5px solid ${THEME.line}` }}
                  >
                    Quantity
                  </th>
                  <th
                    style={{ ...th, textAlign: "right", borderBottom: `1.5px solid ${THEME.line}` }}
                  >
                    Avg Price
                  </th>
                  <th
                    style={{ ...th, textAlign: "right", borderBottom: `1.5px solid ${THEME.line}` }}
                  >
                    Live Price
                  </th>
                  <th
                    style={{ ...th, textAlign: "right", borderBottom: `1.5px solid ${THEME.line}` }}
                  >
                    Invested
                  </th>
                  <th
                    style={{ ...th, textAlign: "right", borderBottom: `1.5px solid ${THEME.line}` }}
                  >
                    Current Value
                  </th>
                  <th
                    style={{ ...th, textAlign: "right", borderBottom: `1.5px solid ${THEME.line}` }}
                  >
                    Day's P&L
                  </th>
                  <th
                    style={{
                      ...th,
                      textAlign: "right",
                      paddingRight: 20,
                      borderBottom: `1.5px solid ${THEME.line}`,
                    }}
                  >
                    Total Return
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleGroups.map(({ base, exchange, yfSym, lots }) => {
                  const md = marketData[yfSym];
                  const currentPrice = md?.price ?? Number(lots[0]?.currentPrice ?? 0);
                  const totalQty = lots.reduce((s: number, l: any) => s + Number(l.qty), 0);
                  const totalInv = lots.reduce(
                    (s: number, l: any) => s + Number(l.qty) * Number(l.avgPrice),
                    0
                  );
                  const totalCurr = totalQty * currentPrice;
                  const totalPnl = totalCurr - totalInv;
                  const totalPnlPct = totalInv ? (totalPnl / totalInv) * 100 : 0;

                  const stockXirr = (() => {
                    try {
                      const cashFlows: any[] = [];
                      const safeLots = Array.isArray(lots) ? lots : [];
                      const safeStockSells = Array.isArray(state.stockSells) ? state.stockSells : [];
                      
                      // Active lots
                      safeLots.forEach((lot: any) => {
                        if (!lot) return;
                        const qty = Number(lot.qty) || 0;
                        const avgPrice = Number(lot.avgPrice) || 0;
                        if (qty > 0 && lot.buyDate) {
                          cashFlows.push({
                            date: lot.buyDate,
                            amount: -(qty * avgPrice),
                          });
                          cashFlows.push({
                            date: today(),
                            amount: qty * currentPrice,
                          });
                        }
                      });

                      // Historical stock sells matching base symbol and exchange
                      const sells = safeStockSells.filter((s: any) => {
                        if (!s) return false;
                        const sSymbol = (s.symbol || "").trim().toLowerCase();
                        const gSymbol = base.trim().toLowerCase();
                        return sSymbol === gSymbol && s.exchange === exchange;
                      });

                      sells.forEach((s: any) => {
                        const qty = Number(s.qty) || 0;
                        const buyPrice = Number(s.buyPrice) || 0;
                        const sellPrice = Number(s.sellPrice) || 0;
                        const buyDate = s.buyDate;
                        const sellDate = s.sellDate;
                        if (qty > 0 && sellDate) {
                          if (buyDate) {
                            cashFlows.push({
                              date: buyDate,
                              amount: -(qty * buyPrice),
                            });
                          }
                          cashFlows.push({
                            date: sellDate,
                            amount: qty * sellPrice,
                          });
                        }
                      });

                      return calcXIRR(cashFlows);
                    } catch (e) {
                      console.error("Error calculating stock-wise XIRR:", e);
                      return null;
                    }
                  })();
                  const isExpanded = expandedSymbols.has(yfSym);
                  const isLive = !!md;
                  const activePeriod = chartPeriod[yfSym] || "1d";
                  const chartEntry = chartData[`${yfSym}__${activePeriod}`];
                  const charts: any[] | null = chartEntry
                    ? (chartEntry.points ?? chartEntry)
                    : null;
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
                          borderBottom: `1px solid ${THEME.line}`,
                        }}
                      >
                        <td style={{ ...td, paddingLeft: 20 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span
                              style={{
                                color: isExpanded ? THEME.accent : THEME.muted,
                                display: "inline-flex",
                                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                              }}
                            >
                              <ChevronDown size={16} />
                            </span>
                            <StockLogo yfSym={yfSym} size={36} />
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                                  {base}
                                </span>
                                <span
                                  style={{
                                    fontSize: 8,
                                    background: `${THEME.line}40`,
                                    color: THEME.muted,
                                    padding: "1px 5px",
                                    borderRadius: 4,
                                    fontWeight: 800,
                                    border: `1px solid ${THEME.line}`,
                                  }}
                                >
                                  {exchange}
                                </span>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  marginTop: 2,
                                }}
                              >
                                {isLive && (
                                  <span
                                    style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}
                                  >
                                    {md.sector || "Sector N/A"}
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: 9,
                                    background: `${THEME.line}40`,
                                    color: THEME.muted,
                                    padding: "1px 6px",
                                    borderRadius: 10,
                                    fontWeight: 700,
                                    border: `1px solid ${THEME.line}`,
                                  }}
                                >
                                  {lots.length} {lots.length === 1 ? "lot" : "lots"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{totalQty}</td>

                        <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                          ₹
                          {Number(totalQty > 0 ? totalInv / totalQty : 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        <td style={{ ...td, textAlign: "right" }}>
                          <div style={{ fontWeight: 700, color: THEME.ink }}>
                            ₹
                            {currentPrice.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          {isLive ? (
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: changeAmt >= 0 ? THEME.sage : THEME.rust,
                                marginTop: 1,
                              }}
                            >
                              {changeAmt >= 0 ? "+" : ""}
                              {changePct.toFixed(2)}%
                            </div>
                          ) : (
                            <div
                              style={{
                                fontSize: 10,
                                color: THEME.muted,
                                fontStyle: "italic",
                                marginTop: 1,
                              }}
                            >
                              Offline
                            </div>
                          )}
                        </td>

                        <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                          {fmtINRFull(totalInv)}
                        </td>

                        <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>
                          {fmtINRFull(totalCurr)}
                        </td>

                        <td style={{ ...td, textAlign: "right" }}>
                          {isLive ? (
                            <>
                              <div
                                style={{
                                  fontWeight: 800,
                                  color: totalQty * changeAmt >= 0 ? THEME.sage : THEME.rust,
                                }}
                              >
                                {totalQty * changeAmt >= 0 ? "+" : ""}
                                {fmtINRFull(totalQty * changeAmt)}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: totalQty * changeAmt >= 0 ? THEME.sage : THEME.rust,
                                  marginTop: 1,
                                }}
                              >
                                {changePct >= 0 ? "▲" : "▼"}
                                {Math.abs(changePct).toFixed(2)}%
                              </div>
                            </>
                          ) : (
                            <span style={{ color: THEME.muted }}>—</span>
                          )}
                        </td>

                        <td style={{ ...td, textAlign: "right", paddingRight: 20 }}>
                          <div
                            style={{
                              fontWeight: 800,
                              color: totalPnl >= 0 ? THEME.sage : THEME.rust,
                            }}
                          >
                            {totalPnl >= 0 ? "+" : ""}
                            {fmtINRFull(totalPnl)}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: totalPnl >= 0 ? THEME.sage : THEME.rust,
                              marginTop: 1,
                            }}
                          >
                            {totalPnlPct >= 0 ? "▲" : "▼"}
                            {Math.abs(totalPnlPct).toFixed(2)}%
                          </div>
                          {stockXirr !== null && (
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: stockXirr >= 0 ? THEME.sage : THEME.rust,
                                marginTop: 2,
                              }}
                            >
                              {stockXirr >= 0 ? "+" : ""}
                              {stockXirr.toFixed(1)}% XIRR
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Collapsible detail drawer row */}
                      {isExpanded && (
                        <tr
                          className="demat-drawer-row"
                          style={{ background: `${THEME.accent}08` }}
                        >
                          <td
                            colSpan={8}
                            style={{
                              padding: "20px 24px",
                              borderBottom: `1px solid ${THEME.line}`,
                            }}
                          >
                            <div
                              className="demat-drawer-content"
                              style={{ display: "flex", gap: 32, flexWrap: "wrap" }}
                            >
                              {/* Left Panel: Price chart with period selector */}
                              {isLive && (
                                <div style={{ flex: "1 1 300px", minWidth: 280 }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                                    <div
                                      style={{
                                        fontSize: 11,
                                        color: THEME.muted,
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                      }}
                                    >
                                      {activePeriod === "1d" && chartDate
                                        ? `Intraday — ${chartDate}`
                                        : `${CHART_PERIOD_LABELS[activePeriod]} Chart`}
                                    </div>
                                    <div style={{ display: "flex", gap: 2 }}>
                                      {CHART_PERIODS.map((p) => (
                                        <button
                                          key={p}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setChartPeriod((prev) => ({ ...prev, [yfSym]: p }));
                                            fetchChart(yfSym, p);
                                          }}
                                          style={{
                                            padding: "3px 7px",
                                            fontSize: 10,
                                            fontWeight: activePeriod === p ? 800 : 600,
                                            border: "none",
                                            borderRadius: 4,
                                            cursor: "pointer",
                                            background: activePeriod === p ? THEME.accent : "transparent",
                                            color: activePeriod === p ? "#fff" : THEME.muted,
                                            transition: "all 0.15s ease",
                                          }}
                                        >
                                          {CHART_PERIOD_LABELS[p]}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div
                                    style={{
                                      background: "var(--surface-0)",
                                      border: `1.5px solid ${THEME.line}`,
                                      borderRadius: 12,
                                      padding: "12px 14px",
                                      boxSizing: "border-box",
                                    }}
                                  >
                                    {charts && charts.length > 2 ? (
                                      <>
                                        <ResponsiveContainer width="100%" height={150}>
                                          <AreaChart
                                            data={charts}
                                            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                                          >
                                            <defs>
                                              <linearGradient
                                                id={`ig-${base}`}
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                              >
                                                <stop
                                                  offset="5%"
                                                  stopColor={changeAmt >= 0 ? THEME.sage : THEME.rust}
                                                  stopOpacity={0.35}
                                                />
                                                <stop
                                                  offset="95%"
                                                  stopColor={changeAmt >= 0 ? THEME.sage : THEME.rust}
                                                  stopOpacity={0.02}
                                                />
                                              </linearGradient>
                                            </defs>
                                            <XAxis
                                              dataKey="t"
                                              tick={{ fontSize: 9, fill: "var(--t-muted)" }}
                                              interval="preserveStartEnd"
                                              axisLine={false}
                                              tickLine={false}
                                            />
                                            <YAxis hide domain={["auto", "auto"]} />
                                            <Tooltip
                                              cursor={{ stroke: THEME.line }}
                                              contentStyle={{
                                                fontSize: 12,
                                                background: "var(--surface-0)",
                                                border: `1px solid ${THEME.line}`,
                                                borderRadius: 6,
                                                color: THEME.ink,
                                              }}
                                              labelStyle={{ color: THEME.ink }}
                                              itemStyle={{ color: THEME.ink }}
                                              formatter={(v: any) => [
                                                `₹${Number(v).toFixed(2)}`,
                                                "Price",
                                              ]}
                                            />
                                            <Area
                                              type="monotone"
                                              dataKey="p"
                                              stroke={changeAmt >= 0 ? THEME.sage : THEME.rust}
                                              strokeWidth={1.5}
                                              fill={`url(#ig-${base})`}
                                              dot={false}
                                            />
                                          </AreaChart>
                                        </ResponsiveContainer>
                                        <div
                                          style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: "10px 16px",
                                            marginTop: 12,
                                            fontSize: 12,
                                            borderTop: `1px solid ${THEME.line}`,
                                            paddingTop: 10,
                                          }}
                                        >
                                          {md.prevClose != null && (
                                            <span>
                                              <span style={{ color: THEME.muted }}>Prev Close: </span>
                                              <b>₹{md.prevClose.toFixed(2)}</b>
                                            </span>
                                          )}
                                          {md.dayHigh != null && (
                                            <span>
                                              <span style={{ color: THEME.muted }}>Day High/Low: </span>
                                              <b style={{ color: THEME.sage }}>
                                                ₹{md.dayHigh.toFixed(2)}
                                              </b>{" "}
                                              /{" "}
                                              <b style={{ color: THEME.rust }}>
                                                ₹{md.dayLow?.toFixed(2) ?? "—"}
                                              </b>
                                            </span>
                                          )}
                                          {md.weekHigh52 != null && (
                                            <span>
                                              <span style={{ color: THEME.muted }}>52W H/L: </span>
                                              <b style={{ color: THEME.sage }}>
                                                ₹{md.weekHigh52.toFixed(2)}
                                              </b>{" "}
                                              /{" "}
                                              <b style={{ color: THEME.rust }}>
                                                ₹{md.weekLow52?.toFixed(2) ?? "—"}
                                              </b>
                                            </span>
                                          )}
                                          {md.volume != null && (
                                            <span>
                                              <span style={{ color: THEME.muted }}>Volume: </span>
                                              <b>{fmtVol(md.volume)}</b>
                                            </span>
                                          )}
                                        </div>
                                      </>
                                    ) : (
                                      <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <span style={{ color: THEME.muted, fontSize: 12 }}>
                                          {fetchingChart === yfSym ? "Loading chart…" : "No chart data available"}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Right Panel: Buy lots detail & actions */}
                              <div style={{ flex: "1.2 1 450px", minWidth: 320 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    marginBottom: 10,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 11,
                                      color: THEME.muted,
                                      fontWeight: 700,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                    }}
                                  >
                                    Holdings Lot Breakdown
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 800,
                                      background: `${THEME.accent}15`,
                                      color: THEME.accent,
                                      padding: "1px 8px",
                                      borderRadius: 20,
                                      border: `1px solid ${THEME.accent}25`,
                                    }}
                                  >
                                    {lots.length} {lots.length === 1 ? "lot" : "lots"}
                                  </span>
                                </div>
                                <table
                                  style={{
                                    width: "100%",
                                    borderCollapse: "separate",
                                    borderSpacing: "0 6px",
                                    fontSize: 12,
                                  }}
                                >
                                  <thead>
                                    <tr>
                                      <th
                                        style={{
                                          ...th,
                                          background: "transparent",
                                          borderBottom: `1.5px solid ${THEME.line}`,
                                          padding: "4px 8px",
                                          paddingLeft: 8,
                                        }}
                                      >
                                        Broker
                                      </th>
                                      <th
                                        style={{
                                          ...th,
                                          background: "transparent",
                                          borderBottom: `1.5px solid ${THEME.line}`,
                                          padding: "4px 8px",
                                          textAlign: "right",
                                        }}
                                      >
                                        Qty
                                      </th>
                                      <th
                                        style={{
                                          ...th,
                                          background: "transparent",
                                          borderBottom: `1.5px solid ${THEME.line}`,
                                          padding: "4px 8px",
                                          textAlign: "right",
                                        }}
                                      >
                                        Buy Price
                                      </th>
                                      <th
                                        style={{
                                          ...th,
                                          background: "transparent",
                                          borderBottom: `1.5px solid ${THEME.line}`,
                                          padding: "4px 8px",
                                          textAlign: "right",
                                          cursor: "pointer",
                                          userSelect: "none",
                                          color: THEME.accent,
                                        }}
                                        onClick={() =>
                                          setLotSortDir((prev) => ({
                                            ...prev,
                                            [yfSym]:
                                              (prev[yfSym] ?? "asc") === "asc" ? "desc" : "asc",
                                          }))
                                        }
                                      >
                                        <span
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 3,
                                          }}
                                        >
                                          Period{" "}
                                          {(lotSortDir[yfSym] ?? "asc") === "asc" ? (
                                            <ArrowUp size={9} />
                                          ) : (
                                            <ArrowDown size={9} />
                                          )}
                                        </span>
                                      </th>
                                      <th
                                        style={{
                                          ...th,
                                          background: "transparent",
                                          borderBottom: `1.5px solid ${THEME.line}`,
                                          padding: "4px 8px",
                                          textAlign: "right",
                                        }}
                                      >
                                        Return
                                      </th>
                                      <th
                                        style={{
                                          ...th,
                                          background: "transparent",
                                          borderBottom: `1.5px solid ${THEME.line}`,
                                          padding: "4px 8px",
                                          textAlign: "right",
                                        }}
                                      >
                                        Value
                                      </th>
                                      <th
                                        style={{
                                          ...th,
                                          background: "transparent",
                                          borderBottom: `1.5px solid ${THEME.line}`,
                                          padding: "4px 8px",
                                        }}
                                      ></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[...lots]
                                      .sort((a: any, b: any) => {
                                        const da = a.buyDate ? new Date(a.buyDate).getTime() : 0;
                                        const db = b.buyDate ? new Date(b.buyDate).getTime() : 0;
                                        return (lotSortDir[yfSym] ?? "asc") === "asc"
                                          ? da - db
                                          : db - da;
                                      })
                                      .map((lot: any) => {
                                        const lInv = Number(lot.qty) * Number(lot.avgPrice);
                                        const lCurr = Number(lot.qty) * currentPrice;
                                        const lPnl = lCurr - lInv;
                                        const lPnlPct = lInv ? (lPnl / lInv) * 100 : 0;
                                        const demat = state.demat.find(
                                          (d: any) => d.id === lot.dematId
                                        );
                                        const theme = getBrokerTheme(demat?.broker || "");

                                        return (
                                          <tr
                                            key={lot.id}
                                            style={{ background: `${THEME.accent}08` }}
                                          >
                                            <td
                                              style={{
                                                ...td,
                                                borderBottom: "none",
                                                padding: "8px",
                                                borderTopLeftRadius: 8,
                                                borderBottomLeftRadius: 8,
                                              }}
                                            >
                                              <div
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: 6,
                                                }}
                                              >
                                                <BrokerLogo
                                                  broker={demat?.broker || "?"}
                                                  theme={theme}
                                                  size={20}
                                                  borderRadius={5}
                                                />
                                                <span style={{ fontWeight: 700, color: THEME.ink }}>
                                                  {demat?.broker || "Direct"}
                                                </span>
                                              </div>
                                            </td>
                                            <td
                                              style={{
                                                ...td,
                                                borderBottom: "none",
                                                padding: "8px",
                                                textAlign: "right",
                                                fontWeight: 700,
                                              }}
                                            >
                                              {lot.qty}
                                            </td>
                                            <td
                                              style={{
                                                ...td,
                                                borderBottom: "none",
                                                padding: "8px",
                                                textAlign: "right",
                                                fontWeight: 600,
                                              }}
                                            >
                                              ₹
                                              {Number(lot.avgPrice).toLocaleString("en-IN", {
                                                minimumFractionDigits: 2,
                                              })}
                                            </td>
                                            <td
                                              style={{
                                                ...td,
                                                borderBottom: "none",
                                                padding: "8px",
                                                textAlign: "right",
                                              }}
                                            >
                                              <div style={{ fontWeight: 600 }}>
                                                {lot.buyDate
                                                  ? new Date(lot.buyDate).toLocaleDateString(
                                                      "en-IN",
                                                      {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                      }
                                                    )
                                                  : "—"}
                                              </div>
                                              {lot.buyDate &&
                                                (() => {
                                                  const diff =
                                                    new Date().getTime() -
                                                    new Date(lot.buyDate).getTime();
                                                  const days = Math.floor(
                                                    diff / (1000 * 60 * 60 * 24)
                                                  );
                                                  const isLTCG = days > 365;
                                                  const nearLTCG = !isLTCG && days > 300;
                                                  return (
                                                    <span
                                                      style={{
                                                        marginTop: 3,
                                                        display: "inline-block",
                                                        fontSize: 9,
                                                        fontWeight: 800,
                                                        padding: "1px 6px",
                                                        borderRadius: 4,
                                                        background: isLTCG
                                                          ? `${THEME.sage}1f`
                                                          : `${THEME.gold}1a`,
                                                        color: isLTCG
                                                          ? THEME.sage
                                                          : nearLTCG
                                                            ? "#d97706"
                                                            : THEME.gold,
                                                      }}
                                                    >
                                                      {isLTCG
                                                        ? `LTCG · ${(days / 365).toFixed(1)}y`
                                                        : `STCG · ${days}d`}
                                                    </span>
                                                  );
                                                })()}
                                            </td>
                                            <td
                                              style={{
                                                ...td,
                                                borderBottom: "none",
                                                padding: "8px",
                                                textAlign: "right",
                                              }}
                                            >
                                              <div
                                                style={{
                                                  color: lPnl >= 0 ? THEME.sage : THEME.rust,
                                                  fontWeight: 800,
                                                }}
                                              >
                                                {lPnl >= 0 ? "+" : ""}
                                                {Math.round(lPnlPct)}%
                                              </div>
                                              <div
                                                style={{
                                                  fontSize: 10,
                                                  color: lPnl >= 0 ? THEME.sage : THEME.rust,
                                                  fontWeight: 600,
                                                }}
                                              >
                                                {lPnl >= 0 ? "+" : ""}
                                                {fmtINRFull(lPnl)}
                                              </div>
                                              {lot.buyDate &&
                                                (() => {
                                                  const cagr = calcCAGR(lInv, lCurr, lot.buyDate);
                                                  return cagr !== null ? (
                                                    <div
                                                      style={{
                                                        fontSize: 9,
                                                        color:
                                                          cagr >= 15
                                                            ? THEME.sage
                                                            : cagr >= 8
                                                              ? THEME.gold
                                                              : THEME.rust,
                                                        fontWeight: 800,
                                                      }}
                                                    >
                                                      {cagr.toFixed(0)}% CAGR
                                                    </div>
                                                  ) : null;
                                                })()}
                                            </td>
                                            <td
                                              style={{
                                                ...td,
                                                borderBottom: "none",
                                                padding: "8px",
                                                textAlign: "right",
                                                fontWeight: 800,
                                              }}
                                            >
                                              {fmtINRFull(lCurr)}
                                            </td>
                                            <td
                                              style={{
                                                ...td,
                                                borderBottom: "none",
                                                padding: "8px",
                                                borderTopRightRadius: 8,
                                                borderBottomRightRadius: 8,
                                              }}
                                            >
                                              <div
                                                style={{
                                                  display: "flex",
                                                  gap: 3,
                                                  justifyContent: "flex-end",
                                                }}
                                              >
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSellLot({
                                                      ...lot,
                                                      base,
                                                      exchange,
                                                      currentPrice,
                                                      broker: demat?.broker || "",
                                                    });
                                                  }}
                                                  className="icon-btn danger"
                                                  style={{ ...iconBtn, padding: 4 }}
                                                  title="Sell Shares"
                                                >
                                                  <ArrowLeftRight size={12} />
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditStockId(lot.id);
                                                  }}
                                                  className="icon-btn"
                                                  style={{ ...iconBtn, padding: 4 }}
                                                  title="Edit lot"
                                                >
                                                  <Edit3 size={12} />
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeItem("stocks", lot.id);
                                                  }}
                                                  className="icon-btn danger"
                                                  style={{ ...iconBtn, padding: 4 }}
                                                  title="Delete lot"
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                                  <tfoot>
                                    <tr>
                                      <td
                                        colSpan={2}
                                        style={{
                                          padding: "8px",
                                          borderTop: `1.5px solid ${THEME.line}`,
                                          fontSize: 11,
                                          fontWeight: 800,
                                          color: THEME.muted,
                                          textTransform: "uppercase",
                                          letterSpacing: "0.04em",
                                        }}
                                      >
                                        Total · {totalQty} shares
                                      </td>
                                      <td
                                        style={{
                                          padding: "8px",
                                          borderTop: `1.5px solid ${THEME.line}`,
                                          textAlign: "right",
                                          fontWeight: 700,
                                          fontSize: 12,
                                          color: THEME.ink,
                                        }}
                                      >
                                        ₹
                                        {Number(
                                          totalQty > 0 ? totalInv / totalQty : 0
                                        ).toLocaleString("en-IN", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}
                                      </td>
                                      <td style={{ borderTop: `1.5px solid ${THEME.line}` }} />
                                      <td
                                        style={{
                                          padding: "8px",
                                          borderTop: `1.5px solid ${THEME.line}`,
                                          textAlign: "right",
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontWeight: 800,
                                            color: totalPnl >= 0 ? THEME.sage : THEME.rust,
                                          }}
                                        >
                                          {totalPnl >= 0 ? "+" : ""}
                                          {Math.round(totalPnlPct)}%
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 10,
                                            fontWeight: 600,
                                            color: totalPnl >= 0 ? THEME.sage : THEME.rust,
                                          }}
                                        >
                                          {totalPnl >= 0 ? "+" : ""}
                                          {fmtINRFull(totalPnl)}
                                        </div>
                                      </td>
                                      <td
                                        style={{
                                          padding: "8px",
                                          borderTop: `1.5px solid ${THEME.line}`,
                                          textAlign: "right",
                                          fontWeight: 800,
                                          fontSize: 13,
                                          color: THEME.ink,
                                        }}
                                      >
                                        {fmtINRFull(totalCurr)}
                                      </td>
                                      <td style={{ borderTop: `1.5px solid ${THEME.line}` }} />
                                    </tr>
                                  </tfoot>
                                </table>

                                {/* Corporate actions logs */}
                                {(() => {
                                  const caHistory = (state.corporateActions || [])
                                    .filter(
                                      (a: any) => a.symbol === base && a.exchange === exchange
                                    )
                                    .sort(
                                      (a: any, b: any) =>
                                        new Date(b.actionDate || b.createdAt).getTime() -
                                        new Date(a.actionDate || a.createdAt).getTime()
                                    );
                                  if (caHistory.length === 0) return null;
                                  return (
                                    <div
                                      style={{
                                        marginTop: 14,
                                        borderTop: `1px solid ${THEME.line}`,
                                        paddingTop: 10,
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: 10,
                                          color: THEME.muted,
                                          fontWeight: 700,
                                          letterSpacing: "0.06em",
                                          textTransform: "uppercase",
                                          marginBottom: 6,
                                        }}
                                      >
                                        Corporate Actions History
                                      </div>
                                      <div
                                        style={{ display: "flex", flexDirection: "column", gap: 5 }}
                                      >
                                        {caHistory.map((a: any) => (
                                          <div
                                            key={a.id}
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              flexWrap: "wrap",
                                              gap: 6,
                                              fontSize: 11,
                                            }}
                                          >
                                            <span
                                              style={{
                                                padding: "1px 6px",
                                                borderRadius: 4,
                                                fontWeight: 800,
                                                fontSize: 9,
                                                background:
                                                  a.actionType === "split"
                                                    ? `${THEME.gold}1a`
                                                    : `${THEME.sage}1a`,
                                                color:
                                                  a.actionType === "split"
                                                    ? THEME.gold
                                                    : THEME.sage,
                                              }}
                                            >
                                              {a.actionType === "split" ? "SPLIT" : "BONUS"}{" "}
                                              {a.ratioN}:{a.ratioM}
                                            </span>
                                            <span style={{ color: THEME.muted }}>
                                              {a.actionDate
                                                ? new Date(a.actionDate).toLocaleDateString(
                                                    "en-IN",
                                                    { day: "2-digit", month: "short" }
                                                  )
                                                : "—"}
                                            </span>
                                            <span style={{ color: THEME.line }}>·</span>
                                            <span style={{ color: THEME.muted }}>
                                              Qty {a.oldQty} →{" "}
                                              <b style={{ color: THEME.ink }}>{a.newQty}</b>
                                            </span>
                                            <span style={{ color: THEME.line }}>·</span>
                                            <span style={{ color: THEME.muted }}>
                                              Avg ₹{Number(a.oldAvgPrice).toFixed(1)} →{" "}
                                              <b style={{ color: THEME.ink }}>
                                                ₹{Number(a.newAvgPrice).toFixed(1)}
                                              </b>
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Nested bottom action buttons */}
                                <div
                                  style={{
                                    marginTop: 14,
                                    display: "flex",
                                    gap: 8,
                                    flexWrap: "wrap",
                                    borderTop: `1px solid ${THEME.line}`,
                                    paddingTop: 12,
                                  }}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={<Plus size={11} />}
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      setStockDefaults({
                                        symbol: base,
                                        exchange,
                                        dematId: lots[0]?.dematId,
                                      });
                                      setShowStock(true);
                                    }}
                                  >
                                    Add Lot
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={<ArrowLeftRight size={11} />}
                                    style={{ color: THEME.rust, borderColor: `${THEME.rust}60` }}
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      setFifoSellGroup({ base, exchange, yfSym, lots });
                                    }}
                                  >
                                    Sell Shares
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={<Scissors size={11} />}
                                    style={{ color: THEME.gold }}
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      setSplitBonusGroup({ base, exchange, lots });
                                    }}
                                  >
                                    Split / Bonus
                                  </Button>
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
      </div>}

      {/* ── ANALYTICS VIEW ── */}
      {dematView === "analytics" && (
        <div style={{ width: "100%", marginTop: 24 }}>
          {filteredStocks.length === 0 ? (
            <Card>
              <EmptyHint text="Add direct stock holdings to view your portfolio health analysis and scores." />
            </Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Stat Cards Overview */}
              <div className="demat-stats-grid">
                <StatCard
                  icon={<BarChart3 />}
                  label="Portfolio Value"
                  value={fmtINRFull(totalValue)}
                  color={THEME.accent}
                  borderColor={THEME.accent}
                  sub={`Invested ${fmtINRFull(totalInvested)}`}
                />
                <StatCard
                  icon={<TrendingUp />}
                  label="Unrealized P&L"
                  value={fmtINRFull(pnl)}
                  color={pnl >= 0 ? THEME.sage : THEME.rust}
                  borderColor={pnl >= 0 ? THEME.sage : THEME.rust}
                  sub={
                    totalInvested
                      ? `${((pnl / totalInvested) * 100).toFixed(2)}% absolute return`
                      : undefined
                  }
                />
                <StatCard
                  icon={<Percent />}
                  label="Net Return"
                  value={totalInvested ? ((pnl / totalInvested) * 100).toFixed(2) + "%" : "—"}
                  color={pnl >= 0 ? THEME.sage : THEME.rust}
                  borderColor="#f59e0b"
                  sub="Absolute portfolio performance"
                />
                <StatCard
                  icon={<TrendingUp />}
                  label="Overall XIRR"
                  value={overallXirr !== null ? `${overallXirr >= 0 ? "+" : ""}${overallXirr.toFixed(2)}%` : "—"}
                  color={overallXirr === null ? THEME.muted : overallXirr >= 0 ? THEME.sage : THEME.rust}
                  borderColor="#8b5cf6"
                  sub="Annualized rate of return"
                />
              </div>

              {/* Portfolio Health Score Card */}
              <Card style={{ padding: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, borderBottom: `1px solid ${THEME.line}`, paddingBottom: 10, marginBottom: 20 }}>
                  Portfolio Health Score
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, alignItems: "center" }}>
                  
                  {/* Circular Radial Score Gauge */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "12px 0" }}>
                    <div style={{ position: "relative", width: 140, height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
                        {/* Background track circle */}
                        <circle
                          cx="70"
                          cy="70"
                          r="60"
                          strokeWidth="10"
                          fill="transparent"
                          style={{ stroke: "var(--t-line)" }}
                        />
                        {/* Colored progress circle */}
                        <circle
                          cx="70"
                          cy="70"
                          r="60"
                          strokeWidth="10"
                          fill="transparent"
                          strokeDasharray={Math.round(2 * Math.PI * 60)}
                          strokeDashoffset={Math.round(2 * Math.PI * 60 * (1 - portfolioScoreData.overall / 100))}
                          strokeLinecap="round"
                          style={{ stroke: portfolioScoreData.statusColor, transition: "stroke-dashoffset 0.8s ease-in-out" }}
                        />
                      </svg>
                      {/* Central label */}
                      <div style={{ position: "absolute", textAlign: "center" }}>
                        <div style={{ fontSize: 32, fontWeight: 900, color: THEME.ink, lineHeight: 1 }}>
                          {portfolioScoreData.overall}
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", marginTop: 2 }}>
                          out of 100
                        </div>
                      </div>
                    </div>
                    
                    {/* Score status badge */}
                    <div style={{
                      marginTop: 16,
                      fontSize: 12,
                      fontWeight: 800,
                      background: `color-mix(in srgb, ${portfolioScoreData.statusColor} 15%, transparent)`,
                      color: portfolioScoreData.statusColor,
                      padding: "4px 12px",
                      borderRadius: 20,
                      border: `1px solid color-mix(in srgb, ${portfolioScoreData.statusColor} 30%, transparent)`,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em"
                    }}>
                      {portfolioScoreData.status}
                    </div>
                  </div>

                  {/* Rationale text and overall metrics */}
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
                      Portfolio Diagnostics
                    </div>
                    <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.6, marginBottom: 16 }}>
                      {portfolioScoreData.rationale}
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, borderTop: `1px solid ${THEME.line}`, paddingTop: 16 }}>
                      <div>
                        <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Holdings Value
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginTop: 2 }}>
                          {fmtINRFull(totalValue)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Holdings Count
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginTop: 2 }}>
                          {filteredStocks.length} scrips
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </Card>

              {/* Sub-Scores Progress Bars & Allocation Pie Chart */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
                
                {/* Score Breakdown Bars */}
                <Card style={{ display: "flex", flexDirection: "column", gap: 20, padding: 24 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, borderBottom: `1px solid ${THEME.line}`, paddingBottom: 10 }}>
                    Health Dimensions
                  </div>

                  {[
                    {
                      label: "Asset Quality",
                      score: portfolioScoreData.quality,
                      color: portfolioScoreData.quality >= 80 ? THEME.sage : portfolioScoreData.quality >= 50 ? THEME.gold : THEME.rust,
                      desc: "Measures direct quality tiering (large-cap blue chips vs. speculative small-caps).",
                    },
                    {
                      label: "Price Momentum",
                      score: portfolioScoreData.momentum,
                      color: portfolioScoreData.momentum >= 80 ? THEME.sage : portfolioScoreData.momentum >= 50 ? THEME.gold : THEME.rust,
                      desc: "Evaluates returns relative to cost basis combined with short-term price swings.",
                    },
                    {
                      label: "Concentration (Diversification)",
                      score: portfolioScoreData.diversification,
                      color: portfolioScoreData.diversification >= 80 ? THEME.sage : portfolioScoreData.diversification >= 50 ? THEME.gold : THEME.rust,
                      desc: "Concentration index scoring direct allocation balance. Protects against single scrip risk.",
                    },
                    {
                      label: "Risk Management",
                      score: portfolioScoreData.riskManagement,
                      color: portfolioScoreData.riskManagement >= 80 ? THEME.sage : portfolioScoreData.riskManagement >= 50 ? THEME.gold : THEME.rust,
                      desc: "Combines asset-level risk parameters with concentration exposure penalties.",
                    },
                    {
                      label: "Defensive Consistency",
                      score: portfolioScoreData.consistency,
                      color: portfolioScoreData.consistency >= 80 ? THEME.sage : portfolioScoreData.consistency >= 50 ? THEME.gold : THEME.rust,
                      desc: "Tracks the share of positive-return holdings, representing cushioning strength.",
                    },
                  ].map((s) => (
                    <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                        <span style={{ fontWeight: 700, color: THEME.ink }}>{s.label}</span>
                        <span style={{ fontWeight: 800, color: s.color }}>{s.score} / 100</span>
                      </div>
                      
                      {/* Bar Track */}
                      <div style={{ width: "100%", height: 8, borderRadius: 4, background: "var(--t-line)", overflow: "hidden" }}>
                        <div style={{ width: `${s.score}%`, height: "100%", borderRadius: 4, background: s.color, transition: "width 0.8s ease-in-out" }} />
                      </div>
                      
                      <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4, marginTop: 2 }}>
                        {s.desc}
                      </div>
                    </div>
                  ))}
                </Card>

                {/* Pie Chart Visualization */}
                <Card style={{ display: "flex", flexDirection: "column", gap: 16, padding: 24 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, borderBottom: `1px solid ${THEME.line}`, paddingBottom: 10 }}>
                    Portfolio Allocation
                  </div>

                  <div style={{ width: "100%", height: 220, position: "relative" }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={portfolioScoreData.stockWeights.slice(0, 7)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {portfolioScoreData.stockWeights.slice(0, 7).map((entry: any, index: number) => {
                            const hues = [210, 160, 42, 12, 280, 190, 330];
                            const color = `hsl(${hues[index % hues.length]}, 60%, 50%)`;
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [
                            `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
                            "Current Value"
                          ]}
                          contentStyle={{ background: "var(--surface-0)", border: `1px solid ${THEME.line}`, borderRadius: 8, fontSize: 12, color: THEME.ink }}
                          labelStyle={{ color: THEME.ink }}
                          itemStyle={{ color: THEME.ink }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend list of top stocks */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                    {portfolioScoreData.stockWeights.slice(0, 4).map((s: any, idx: number) => {
                      const hues = [210, 160, 42, 12, 280, 190, 330];
                      const color = `hsl(${hues[idx % hues.length]}, 60%, 50%)`;
                      return (
                        <div key={s.symbol} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                            <span style={{ fontWeight: 700, color: THEME.ink }}>{s.symbol}</span>
                            <span style={{ color: THEME.muted, fontSize: 11 }}>({s.qty} shares)</span>
                          </div>
                          <span style={{ fontWeight: 800, color: THEME.ink }}>{s.weight.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                    {portfolioScoreData.stockWeights.length > 4 && (
                      <div style={{ textAlign: "center", fontSize: 11, color: THEME.muted, paddingTop: 4, borderTop: `1px dashed ${THEME.line}` }}>
                        and {portfolioScoreData.stockWeights.length - 4} other assets
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* ── BENCHMARK COMPARISON SECTION ── */}
              {(() => {
                const oldestBuyDate = filteredStocks.reduce((oldest: string | null, st: any) => {
                  if (!st.buyDate) return oldest;
                  if (!oldest) return st.buyDate;
                  return new Date(st.buyDate).getTime() < new Date(oldest).getTime() ? st.buyDate : oldest;
                }, null as string | null);

                const portfolioCagr = oldestBuyDate ? calcCAGR(totalInvested, totalValue, oldestBuyDate) : null;
                const absoluteReturnPct = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

                const benchmarks = [
                  { name: "Nifty 50",       "1Y": 8.5,  "3Y": 11.2, "5Y": 14.8, "10Y": 12.1, color: "#3b82f6" },
                  { name: "Sensex",         "1Y": 8.2,  "3Y": 10.9, "5Y": 14.5, "10Y": 12.0, color: "#64748b" },
                  { name: "Nifty Midcap",   "1Y": 15.3, "3Y": 18.7, "5Y": 19.2, "10Y": 16.5, color: "#8b5cf6" },
                  { name: "Nifty Smallcap", "1Y": 12.1, "3Y": 20.5, "5Y": 18.9, "10Y": 15.8, color: "#f59e0b" },
                ];

                const holdingYears = oldestBuyDate ? (Date.now() - new Date(oldestBuyDate).getTime()) / (365.25 * 24 * 3600 * 1000) : 1;
                const benchmarkPeriod: "1Y" | "3Y" | "5Y" | "10Y" = holdingYears >= 7 ? "10Y" : holdingYears >= 4 ? "5Y" : holdingYears >= 2 ? "3Y" : "1Y";
                const niftyBenchmark = benchmarks[0][benchmarkPeriod];
                const alpha = portfolioCagr !== null ? portfolioCagr - niftyBenchmark : null;

                let ratingLabel = "Underperforming";
                let ratingColor = THEME.rust;
                if (alpha !== null) {
                  if (alpha > 5) { ratingLabel = "Outperforming"; ratingColor = THEME.sage; }
                  else if (alpha >= 0) { ratingLabel = "Market Pace"; ratingColor = THEME.gold; }
                }

                const barChartData = [
                  { name: "Your Portfolio", return: portfolioCagr !== null ? Number(portfolioCagr.toFixed(1)) : 0, fill: THEME.accent },
                  { name: "Nifty 50", return: benchmarks[0][benchmarkPeriod], fill: "#3b82f6" },
                  { name: "Nifty Midcap", return: benchmarks[2][benchmarkPeriod], fill: "#8b5cf6" },
                  { name: "Nifty Smallcap", return: benchmarks[3][benchmarkPeriod], fill: "#f59e0b" },
                ];

                return (
                  <Card style={{ padding: 24 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, borderBottom: `1px solid ${THEME.line}`, paddingBottom: 10, marginBottom: 20 }}>
                      Portfolio vs Benchmark
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20 }}>
                      Compare your portfolio CAGR against {benchmarkPeriod} benchmark returns ({holdingYears.toFixed(1)}y holding period)
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                          Your Portfolio Returns
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
                            <span style={{ fontSize: 13, color: THEME.muted, fontWeight: 600 }}>Total Invested</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>{fmtINRFull(totalInvested)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
                            <span style={{ fontSize: 13, color: THEME.muted, fontWeight: 600 }}>Current Value</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>{fmtINRFull(totalValue)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
                            <span style={{ fontSize: 13, color: THEME.muted, fontWeight: 600 }}>Absolute Return</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: absoluteReturnPct >= 0 ? THEME.sage : THEME.rust }}>
                              {absoluteReturnPct >= 0 ? "+" : ""}{absoluteReturnPct.toFixed(2)}%
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: portfolioCagr !== null && portfolioCagr >= 0 ? `${THEME.sage}0d` : `${THEME.rust}0d`, border: `1.5px solid ${portfolioCagr !== null && portfolioCagr >= 0 ? `${THEME.sage}30` : `${THEME.rust}30`}` }}>
                            <span style={{ fontSize: 13, color: THEME.muted, fontWeight: 600 }}>Portfolio CAGR</span>
                            <span style={{ fontSize: 16, fontWeight: 900, color: portfolioCagr !== null ? (portfolioCagr >= 0 ? THEME.sage : THEME.rust) : THEME.muted }}>
                              {portfolioCagr !== null ? `${portfolioCagr >= 0 ? "+" : ""}${portfolioCagr.toFixed(2)}%` : "N/A"}
                            </span>
                          </div>
                        </div>

                        {alpha !== null && (
                          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{
                              padding: "8px 14px",
                              borderRadius: 10,
                              background: alpha >= 0 ? `${THEME.sage}12` : `${THEME.rust}12`,
                              border: `1.5px solid ${alpha >= 0 ? `${THEME.sage}40` : `${THEME.rust}40`}`,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}>
                              <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>Alpha vs Nifty 50:</span>
                              <span style={{ fontSize: 15, fontWeight: 900, color: alpha >= 0 ? THEME.sage : THEME.rust }}>
                                {alpha >= 0 ? "+" : ""}{alpha.toFixed(1)}%
                              </span>
                            </div>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: "5px 12px",
                              borderRadius: 20,
                              background: `color-mix(in srgb, ${ratingColor} 15%, transparent)`,
                              color: ratingColor,
                              border: `1px solid color-mix(in srgb, ${ratingColor} 30%, transparent)`,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}>
                              {ratingLabel}
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                          Annualized Return Comparison
                        </div>
                        <div style={{ background: "var(--surface-0)", border: `1px solid ${THEME.line}`, borderRadius: 12, padding: "16px 12px" }}>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={barChartData} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 10 }}>
                              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--t-muted)" }} axisLine={false} tickLine={false} domain={[0, "auto"]} unit="%" />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--t-ink)", fontWeight: 600 }} axisLine={false} tickLine={false} width={110} />
                              <Tooltip
                                cursor={{ fill: THEME.line, opacity: 0.4 }}
                                contentStyle={{ fontSize: 12, background: "var(--surface-0)", border: `1px solid ${THEME.line}`, borderRadius: 8, color: THEME.ink }}
                                labelStyle={{ color: THEME.ink }}
                                itemStyle={{ color: THEME.ink }}
                                formatter={(value: any) => [`${Number(value).toFixed(1)}%`, "CAGR"]}
                              />
                              <Bar dataKey="return" radius={[0, 6, 6, 0]} barSize={22}>
                                {barChartData.map((entry, index) => (
                                  <Cell key={`bar-${index}`} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 24 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                        Index Returns (Historical Annualized)
                      </div>
                      <div style={{ borderRadius: 12, border: `1px solid ${THEME.line}`, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: "var(--surface-0)" }}>
                              <th style={{ ...th, paddingLeft: 16 }}>Index</th>
                              <th style={{ ...th, textAlign: "right" }}>1Y</th>
                              <th style={{ ...th, textAlign: "right" }}>3Y</th>
                              <th style={{ ...th, textAlign: "right" }}>5Y</th>
                              <th style={{ ...th, textAlign: "right", paddingRight: 16 }}>10Y</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ background: `${THEME.accent}0a` }}>
                              <td style={{ ...td, paddingLeft: 16, fontWeight: 800, color: THEME.accent }}>
                                Your Portfolio
                              </td>
                              <td style={{ ...td, textAlign: "right", fontWeight: 800, color: portfolioCagr !== null ? (portfolioCagr >= 0 ? THEME.sage : THEME.rust) : THEME.muted }} colSpan={4}>
                                <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 500, marginRight: 8 }}>CAGR:</span>
                                {portfolioCagr !== null ? `${portfolioCagr >= 0 ? "+" : ""}${portfolioCagr.toFixed(1)}%` : "N/A"}
                              </td>
                            </tr>
                            {benchmarks.map((b) => (
                              <tr key={b.name}>
                                <td style={{ ...td, paddingLeft: 16 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: b.color, flexShrink: 0 }} />
                                    <span style={{ fontWeight: 700, color: THEME.ink }}>{b.name}</span>
                                  </div>
                                </td>
                                <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{b["1Y"]}%</td>
                                <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{b["3Y"]}%</td>
                                <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{b["5Y"]}%</td>
                                <td style={{ ...td, textAlign: "right", fontWeight: 600, paddingRight: 16 }}>{b["10Y"]}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </Card>
                );
              })()}

              {/* Actionable Financial Insights checklist */}
              <Card style={{ display: "flex", flexDirection: "column", gap: 16, padding: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, borderBottom: `1px solid ${THEME.line}`, paddingBottom: 10 }}>
                  💡 Financial Optimization Suggestions
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {portfolioScoreData.insights.map((insight: string, idx: number) => (
                    <div key={idx} style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: insight.includes("⚠️") || insight.includes("📉") 
                        ? `color-mix(in srgb, ${THEME.rust} 6%, transparent)` 
                        : insight.includes("💡") 
                          ? `color-mix(in srgb, ${THEME.gold} 6%, transparent)` 
                          : `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
                      border: `1.5px solid ${
                        insight.includes("⚠️") || insight.includes("📉") 
                          ? `color-mix(in srgb, ${THEME.rust} 20%, transparent)` 
                          : insight.includes("💡") 
                            ? `color-mix(in srgb, ${THEME.gold} 20%, transparent)` 
                            : `color-mix(in srgb, ${THEME.sage} 20%, transparent)`
                      }`,
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: THEME.ink
                    }}>
                      <div style={{ marginTop: 1 }}>{insight.split(" ")[0]}</div>
                      <div style={{ fontWeight: 500 }}>{insight.substring(insight.indexOf(" ") + 1)}</div>
                    </div>
                  ))}
                </div>
              </Card>

            </div>
          )}
        </div>
      )}

      {/* ── WATCHLIST SECTION ── */}
      {dematView === "watchlist" && (
        <div style={{ width: "100%", marginTop: 24 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>Your Watchlists</div>
              <div style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>
                {wishlists.length === 0
                  ? "Create watchlists to track stocks you want to buy"
                  : `${wishlists.length} watchlist${wishlists.length !== 1 ? "s" : ""} · ${wishlistItems.length} stock${wishlistItems.length !== 1 ? "s" : ""} total`}
              </div>
            </div>
            <Button
              variant="accent"
              icon={<Plus size={14} />}
              onClick={() => setShowWishlistModal(true)}
            >
              New Watchlist
            </Button>
          </div>

          {/* Empty state */}
          {wishlists.length === 0 && (
            <div style={{
              ...card,
              textAlign: "center",
              padding: "48px 32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                background: `${THEME.accent}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Star size={28} color={THEME.accent} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink }}>No Watchlists Yet</div>
              <div style={{ fontSize: 14, color: THEME.muted, maxWidth: 340 }}>
                Create watchlists to track stocks you're watching — set target prices and monitor when to buy.
              </div>
              <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShowWishlistModal(true)}>
                Create Your First Watchlist
              </Button>
            </div>
          )}

          {/* Watchlist cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {wishlists.map((wl: any) => {
              const items = wishlistItems.filter((it: any) => it.watchlistId === wl.id);
              const isExpanded = expandedWishlistId === wl.id;

              return (
                <div
                  key={wl.id}
                  style={{
                    ...card,
                    padding: 0,
                    overflow: "hidden",
                    borderLeft: `4px solid ${wl.color || WISHLIST_COLORS[0]}`,
                  }}
                >
                  {/* Watchlist card header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "16px 20px",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => setExpandedWishlistId(isExpanded ? null : wl.id)}
                  >
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: `${wl.color || WISHLIST_COLORS[0]}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <Star size={18} color={wl.color || WISHLIST_COLORS[0]} fill={`${wl.color || WISHLIST_COLORS[0]}40`} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>{wl.name}</div>
                      {wl.description && (
                        <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {wl.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        background: `${wl.color || WISHLIST_COLORS[0]}18`,
                        color: wl.color || WISHLIST_COLORS[0],
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: 20,
                        whiteSpace: "nowrap",
                      }}>
                        {items.length} stock{items.length !== 1 ? "s" : ""}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditWishlistId(wl.id); }}
                        className="icon-btn"
                        style={iconBtn}
                        title="Rename watchlist"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete watchlist "${wl.name}" and all its stocks?`)) {
                            removeItem("wishlists", wl.id);
                            if (expandedWishlistId === wl.id) setExpandedWishlistId(null);
                          }
                        }}
                        className="icon-btn danger"
                        style={iconBtn}
                        title="Delete watchlist"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight
                        size={16}
                        color={THEME.muted}
                        style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}
                      />
                    </div>
                  </div>

                  {/* Expanded: stock list */}
                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${THEME.line}` }}>
                      {items.length === 0 ? (
                        <div style={{ padding: "24px 20px", textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                          No stocks yet. Add your first stock to watch.
                        </div>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                              <tr>
                                <th style={{ ...th, paddingLeft: 20 }}>Stock</th>
                                <th style={{ ...th, textAlign: "right" }}>Live Price</th>
                                <th style={{ ...th, textAlign: "right" }}>Target</th>
                                <th style={{ ...th, textAlign: "right" }}>Gap to Target</th>
                                <th style={th}>Notes</th>
                                <th style={{ ...th, textAlign: "right" }}>Added</th>
                                <th style={{ ...th, width: 72 }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((it: any) => {
                                const yfSym = `${it.symbol}.${it.exchange === "BSE" ? "BO" : "NS"}`;
                                const md = marketData[yfSym];
                                const livePrice = md?.price ?? null;
                                const gap = it.targetPrice && livePrice
                                  ? ((it.targetPrice - livePrice) / livePrice) * 100
                                  : null;
                                const gapColor = gap === null ? THEME.muted : gap >= 0 ? THEME.sage : THEME.rust;
                                const isItemExpanded = expandedWatchlistItems.has(it.id);
                                const wlActivePeriod = chartPeriod[yfSym] || "1d";
                                const chartEntry = chartData[`${yfSym}__${wlActivePeriod}`];
                                const charts: any[] | null = chartEntry ? (chartEntry.points ?? chartEntry) : null;
                                const chartDate: string | null = chartEntry?.date ?? null;
                                const changeAmt = md?.change ?? 0;
                                const changePct = md?.changePercent ?? 0;

                                const toggleWatchItem = () => {
                                  const isExpanding = !expandedWatchlistItems.has(it.id);
                                  setExpandedWatchlistItems((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(it.id)) {
                                      next.delete(it.id);
                                    } else {
                                      next.add(it.id);
                                    }
                                    return next;
                                  });
                                  if (isExpanding) fetchChart(yfSym, chartPeriod[yfSym] || "1d");
                                };

                                return (
                                  <React.Fragment key={it.id}>
                                    <tr
                                      className="demat-holdings-row"
                                      onClick={toggleWatchItem}
                                      style={{
                                        cursor: "pointer",
                                        background: isItemExpanded ? `${THEME.accent}09` : "transparent",
                                        transition: "background 0.15s ease",
                                      }}
                                    >
                                      <td style={{ ...td, paddingLeft: 20 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                          <span
                                            style={{
                                              color: isItemExpanded ? THEME.accent : THEME.muted,
                                              display: "inline-flex",
                                              transform: isItemExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                              transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                            }}
                                          >
                                            <ChevronDown size={14} />
                                          </span>
                                          <StockLogo yfSym={yfSym} size={32} />
                                          <div>
                                            <div style={{ fontWeight: 700, color: THEME.ink }}>{it.symbol}</div>
                                            <div style={{ fontSize: 11, color: THEME.muted }}>{it.exchange}</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                        {livePrice != null ? (
                                          <div>
                                            <div style={{ fontWeight: 700, color: THEME.ink }}>
                                              ₹{livePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                            </div>
                                            {md && (
                                              <div style={{ fontSize: 11, fontWeight: 700, color: changeAmt >= 0 ? THEME.sage : THEME.rust, marginTop: 1 }}>
                                                {changeAmt >= 0 ? "+" : ""}{changePct.toFixed(2)}%
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <span style={{ color: THEME.muted }}>—</span>
                                        )}
                                      </td>
                                      <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                        {it.targetPrice ? (
                                          <span style={{ fontWeight: 700, color: THEME.gold }}>
                                            ₹{Number(it.targetPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                          </span>
                                        ) : (
                                          <span style={{ color: THEME.muted }}>—</span>
                                        )}
                                      </td>
                                      <td style={{ ...td, textAlign: "right" }}>
                                        {gap !== null ? (
                                          <span style={{ fontWeight: 700, color: gapColor }}>
                                            {gap >= 0 ? "▲ " : "▼ "}{Math.abs(gap).toFixed(1)}% {gap >= 0 ? "below target" : "above target"}
                                          </span>
                                        ) : (
                                          <span style={{ color: THEME.muted }}>—</span>
                                        )}
                                      </td>
                                      <td style={{ ...td, color: THEME.muted, maxWidth: 200 }} onClick={(e) => e.stopPropagation()}>
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                                          {it.notes || "—"}
                                        </span>
                                      </td>
                                      <td style={{ ...td, textAlign: "right", color: THEME.muted, whiteSpace: "nowrap" }}>
                                        {it.addedOn || "—"}
                                      </td>
                                      <td style={{ ...td, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                          <button
                                            className="icon-btn"
                                            style={iconBtn}
                                            onClick={() => setEditWishlistItemId(it.id)}
                                            title="Edit target price / notes"
                                          >
                                            <Edit3 size={13} />
                                          </button>
                                          <button
                                            className="icon-btn danger"
                                            style={iconBtn}
                                            onClick={() => {
                                              if (window.confirm(`Remove ${it.symbol} from this wishlist?`)) {
                                                removeItem("wishlistItems", it.id);
                                              }
                                            }}
                                            title="Remove from watchlist"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>

                                    {/* Expandable chart drawer */}
                                    {isItemExpanded && (
                                      <tr style={{ background: `${THEME.accent}08` }}>
                                        <td colSpan={7} style={{ padding: "20px 24px", borderBottom: `1px solid ${THEME.line}` }}>
                                          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                                            {/* Price chart with period selector */}
                                            {md && charts && charts.length > 2 ? (
                                              <div style={{ flex: "1 1 300px", minWidth: 280 }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                                                  <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                    {wlActivePeriod === "1d" && chartDate
                                                      ? `Intraday — ${chartDate}`
                                                      : `${CHART_PERIOD_LABELS[wlActivePeriod]} Chart`}
                                                  </div>
                                                  <div style={{ display: "flex", gap: 2 }}>
                                                    {CHART_PERIODS.map((p) => (
                                                      <button
                                                        key={p}
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setChartPeriod((prev) => ({ ...prev, [yfSym]: p }));
                                                          fetchChart(yfSym, p);
                                                        }}
                                                        style={{
                                                          padding: "3px 7px",
                                                          fontSize: 10,
                                                          fontWeight: wlActivePeriod === p ? 800 : 600,
                                                          border: "none",
                                                          borderRadius: 4,
                                                          cursor: "pointer",
                                                          background: wlActivePeriod === p ? THEME.accent : "transparent",
                                                          color: wlActivePeriod === p ? "#fff" : THEME.muted,
                                                          transition: "all 0.15s ease",
                                                        }}
                                                      >
                                                        {CHART_PERIOD_LABELS[p]}
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>
                                                <div style={{ background: "var(--surface-0)", border: `1.5px solid ${THEME.line}`, borderRadius: 12, padding: "12px 14px", boxSizing: "border-box" }}>
                                                  {charts && charts.length > 2 ? (
                                                    <>
                                                      <ResponsiveContainer width="100%" height={150}>
                                                        <AreaChart data={charts} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                                                          <defs>
                                                            <linearGradient id={`wl-ig-${it.symbol}`} x1="0" y1="0" x2="0" y2="1">
                                                              <stop offset="5%" stopColor={changeAmt >= 0 ? THEME.sage : THEME.rust} stopOpacity={0.35} />
                                                              <stop offset="95%" stopColor={changeAmt >= 0 ? THEME.sage : THEME.rust} stopOpacity={0.02} />
                                                            </linearGradient>
                                                          </defs>
                                                          <XAxis dataKey="t" tick={{ fontSize: 9, fill: "var(--t-muted)" }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                                                          <YAxis hide domain={["auto", "auto"]} />
                                                          <Tooltip
                                                            cursor={{ stroke: THEME.line }}
                                                            contentStyle={{ fontSize: 12, background: "var(--surface-0)", border: `1px solid ${THEME.line}`, borderRadius: 6, color: THEME.ink }}
                                                            labelStyle={{ color: THEME.ink }}
                                                            itemStyle={{ color: THEME.ink }}
                                                            formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, "Price"]}
                                                          />
                                                          <Area type="monotone" dataKey="p" stroke={changeAmt >= 0 ? THEME.sage : THEME.rust} strokeWidth={1.5} fill={`url(#wl-ig-${it.symbol})`} dot={false} />
                                                        </AreaChart>
                                                      </ResponsiveContainer>
                                                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", marginTop: 12, fontSize: 12, borderTop: `1px solid ${THEME.line}`, paddingTop: 10 }}>
                                                        {md.prevClose != null && (
                                                          <span><span style={{ color: THEME.muted }}>Prev Close: </span><b>₹{md.prevClose.toFixed(2)}</b></span>
                                                        )}
                                                        {md.dayHigh != null && (
                                                          <span>
                                                            <span style={{ color: THEME.muted }}>Day High/Low: </span>
                                                            <b style={{ color: THEME.sage }}>₹{md.dayHigh.toFixed(2)}</b>{" / "}
                                                            <b style={{ color: THEME.rust }}>₹{md.dayLow?.toFixed(2) ?? "—"}</b>
                                                          </span>
                                                        )}
                                                        {md.weekHigh52 != null && (
                                                          <span>
                                                            <span style={{ color: THEME.muted }}>52W H/L: </span>
                                                            <b style={{ color: THEME.sage }}>₹{md.weekHigh52.toFixed(2)}</b>{" / "}
                                                            <b style={{ color: THEME.rust }}>₹{md.weekLow52?.toFixed(2) ?? "—"}</b>
                                                          </span>
                                                        )}
                                                        {md.volume != null && (
                                                          <span><span style={{ color: THEME.muted }}>Volume: </span><b>{fmtVol(md.volume)}</b></span>
                                                        )}
                                                      </div>
                                                    </>
                                                  ) : (
                                                    <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                      <span style={{ color: THEME.muted, fontSize: 12 }}>
                                                        {fetchingChart === yfSym ? "Loading chart…" : "No chart data available"}
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ) : !md ? (
                                              <div style={{ flex: "1 1 300px", minWidth: 280 }}>
                                                <div style={{ background: "var(--surface-0)", border: `1.5px solid ${THEME.line}`, borderRadius: 12, padding: "20px 14px", textAlign: "center" }}>
                                                  <div style={{ color: THEME.muted, fontSize: 13 }}>No live data — click Live Refresh to load prices</div>
                                                </div>
                                              </div>
                                            ) : null}

                                            {/* Target price summary panel */}
                                            <div style={{ flex: "0 0 220px", minWidth: 200 }}>
                                              <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                Target Summary
                                              </div>
                                              <div style={{ background: "var(--surface-0)", border: `1.5px solid ${THEME.line}`, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                  <span style={{ color: THEME.muted }}>Symbol</span>
                                                  <b>{it.symbol} · {it.exchange}</b>
                                                </div>
                                                {livePrice != null && (
                                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                    <span style={{ color: THEME.muted }}>Live Price</span>
                                                    <b>₹{livePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</b>
                                                  </div>
                                                )}
                                                {it.targetPrice && (
                                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                    <span style={{ color: THEME.muted }}>Target</span>
                                                    <b style={{ color: THEME.gold }}>₹{Number(it.targetPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</b>
                                                  </div>
                                                )}
                                                {gap !== null && (
                                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                    <span style={{ color: THEME.muted }}>Gap</span>
                                                    <b style={{ color: gapColor }}>{gap >= 0 ? "▲ " : "▼ "}{Math.abs(gap).toFixed(1)}%</b>
                                                  </div>
                                                )}
                                                {it.notes && (
                                                  <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 8, color: THEME.muted, fontSize: 12, fontStyle: "italic" }}>
                                                    {it.notes}
                                                  </div>
                                                )}
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
                      {/* Add stock button */}
                      <div style={{ padding: "12px 20px", borderTop: items.length > 0 ? `1px solid ${THEME.line}` : "none" }}>
                        <Button
                          variant="ghost"
                          icon={<Plus size={13} />}
                          style={{ fontSize: 13 }}
                          onClick={() => {
                            setWishlistItemTarget(wl.id);
                            setShowWishlistItemModal(true);
                          }}
                        >
                          Add Stock to Watchlist {wl.name}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showDemat && (
        <DematModal
          onClose={() => setShowDemat(false)}
          onSave={(v: any) => {
            addItem("demat", v);
            setShowDemat(false);
          }}
        />
      )}
      {editDematId && (
        <DematModal
          initial={state.demat.find((d: any) => d.id === editDematId)}
          onClose={() => setEditDematId(null)}
          onSave={(v: any) => {
            updateItem("demat", editDematId, v);
            setEditDematId(null);
          }}
        />
      )}
      {showStock && (
        <StockModal
          demats={state.demat}
          defaults={stockDefaults}
          onClose={() => {
            setShowStock(false);
            setStockDefaults(null);
          }}
          onSave={(v: any) => {
            addItem("stocks", v);
            setShowStock(false);
            setStockDefaults(null);
          }}
        />
      )}
      {editStockId && (
        <StockModal
          demats={state.demat}
          initial={state.stocks.find((x: any) => x.id === editStockId)}
          onClose={() => setEditStockId(null)}
          onSave={(v: any) => {
            updateItem("stocks", editStockId, v);
            setEditStockId(null);
          }}
        />
      )}
      {sellLot && (
        <SellStockModal
          lot={sellLot}
          onClose={() => setSellLot(null)}
          onSave={(sellRecord: any, remainingQty: number) => {
            addItem("stockSells", sellRecord);
            if (remainingQty <= 0) removeItem("stocks", sellLot.id);
            else updateItem("stocks", sellLot.id, { qty: String(remainingQty) });
            setSellLot(null);
          }}
        />
      )}
      {fifoSellGroup && (
        <FifoSellModal
          group={fifoSellGroup}
          currentPrice={
            marketData[fifoSellGroup.yfSym]?.price ??
            Number(fifoSellGroup.lots[0]?.currentPrice ?? 0)
          }
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
              else
                updateItem("stocks", alloc.lot.id, {
                  qty: String(Number(alloc.lot.qty) - alloc.consume),
                });
            });
            setFifoSellGroup(null);
          }}
        />
      )}
      {splitBonusGroup && (
        <SplitBonusModal
          group={splitBonusGroup}
          onClose={() => setSplitBonusGroup(null)}
          onApply={(updates: any[], actionLog: any) => {
            updates.forEach((u: any) =>
              updateItem("stocks", u.id, { qty: u.qty, avgPrice: u.avgPrice })
            );
            addItem("corporateActions", actionLog);
            setSplitBonusGroup(null);
          }}
        />
      )}

      {showWishlistModal && (
        <WishlistModal
          onClose={() => setShowWishlistModal(false)}
          onSave={(v: any) => {
            addItem("wishlists", v);
            setShowWishlistModal(false);
          }}
        />
      )}
      {editWishlistId && (
        <WishlistModal
          initial={wishlists.find((wl: any) => wl.id === editWishlistId)}
          onClose={() => setEditWishlistId(null)}
          onSave={(v: any) => {
            updateItem("wishlists", editWishlistId, v);
            setEditWishlistId(null);
          }}
        />
      )}
      {showWishlistItemModal && wishlistItemTarget && (
        <WishlistItemModal
          wishlistName={wishlists.find((wl: any) => wl.id === wishlistItemTarget)?.name || "Wishlist"}
          onClose={() => { setShowWishlistItemModal(false); setWishlistItemTarget(null); }}
          onSave={(v: any) => {
            addItem("wishlistItems", { ...v, watchlistId: wishlistItemTarget });
            setShowWishlistItemModal(false);
            setWishlistItemTarget(null);
          }}
        />
      )}
      {editWishlistItemId && (() => {
        const item = wishlistItems.find((it: any) => it.id === editWishlistItemId);
        const wl = wishlists.find((w: any) => w.id === item?.watchlistId);
        if (!item) return null;
        return (
          <WishlistItemModal
            wishlistName={wl?.name || "Watchlist"}
            initial={item}
            onClose={() => setEditWishlistItemId(null)}
            onSave={(v: any) => {
              updateItem("wishlistItems", editWishlistItemId, {
                targetPrice: v.targetPrice,
                notes: v.notes,
              });
              setEditWishlistItemId(null);
            }}
          />
        );
      })()}

      {showBrokerImport && (
        <BrokerImportModal
          existingStocks={state.stocks || []}
          demats={state.demat || []}
          onClose={() => setShowBrokerImport(false)}
          onImport={(buys: any[], sells: any[]) => {
            buys.forEach((t: any) => addItem("stocks", t));
            sells.forEach((s: any) => addItem("stockSells", s));
            setShowBrokerImport(false);
          }}
        />
      )}
    </div>
  );
}

function DematModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || { broker: "", dpId: "", clientId: "", owner: "self" });
  return (
    <Modal title={initial ? "Edit Demat Account" : "Add Demat Account"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select
          style={input}
          value={f.owner || "self"}
          onChange={(e) => setF({ ...f, owner: e.target.value })}
        >
          {PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Broker">
        <input
          style={input}
          value={f.broker}
          onChange={(e) => setF({ ...f, broker: e.target.value })}
          placeholder="e.g. Zerodha, Groww"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="DP ID">
          <input
            style={input}
            value={f.dpId}
            onChange={(e) => setF({ ...f, dpId: e.target.value })}
          />
        </Field>
        <Field label="Client ID">
          <input
            style={input}
            value={f.clientId}
            onChange={(e) => setF({ ...f, clientId: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions onSave={() => f.broker && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function StockModal({ demats, onClose, onSave, initial = null, defaults = null }: any) {
  const [f, setF] = useState(
    initial || {
      symbol: defaults?.symbol || "",
      exchange: defaults?.exchange || "NSE",
      dematId: defaults?.dematId || demats[0]?.id || "",
      qty: "",
      avgPrice: "",
      currentPrice: "",
      buyDate: "",
      owner: "self",
    }
  );
  return (
    <Modal title={initial ? "Edit Stock" : "Add Stock"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select
          style={input}
          value={f.owner || "self"}
          onChange={(e) => setF({ ...f, owner: e.target.value })}
        >
          {PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
        <Field label="Symbol">
          <input
            style={input}
            value={f.symbol}
            onChange={(e) =>
              setF({ ...f, symbol: e.target.value.toUpperCase().replace(/\.(NS|BO)$/i, "") })
            }
            placeholder="e.g. RELIANCE"
          />
        </Field>
        <Field label="Exchange">
          <select
            style={{ ...input, width: 90 }}
            value={f.exchange || "NSE"}
            onChange={(e) => setF({ ...f, exchange: e.target.value })}
          >
            <option value="NSE">NSE</option>
            <option value="BSE">BSE</option>
          </select>
        </Field>
      </div>
      <Field label="Demat Account">
        <select
          style={input}
          value={f.dematId}
          onChange={(e) => setF({ ...f, dematId: e.target.value })}
        >
          {demats.length === 0 && <option value="">Add demat first</option>}
          {demats.map((d: any) => (
            <option key={d.id} value={d.id}>
              {d.broker}
            </option>
          ))}
        </select>
      </Field>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <Field label="Quantity">
          <input
            style={input}
            type="number"
            value={f.qty}
            onChange={(e) => setF({ ...f, qty: e.target.value })}
          />
        </Field>
        <Field label="Avg Price">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.avgPrice}
            onChange={(e) => setF({ ...f, avgPrice: e.target.value })}
          />
        </Field>
        <Field label="Current Price">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.currentPrice}
            onChange={(e) => setF({ ...f, currentPrice: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Buy Date (optional — enables CAGR calculation)">
        <input
          style={input}
          type="date"
          value={f.buyDate || ""}
          onChange={(e) => setF({ ...f, buyDate: e.target.value })}
        />
      </Field>
      <ModalActions onSave={() => f.symbol && f.qty && f.avgPrice && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function SellStockModal({ lot, onClose, onSave }: any) {
  const [f, setF] = useState({
    sellQty: String(lot.qty),
    sellPrice: String(lot.currentPrice || ""),
    sellDate: today(),
    broker: lot.broker || "",
  });
  const sellQtyNum = Number(f.sellQty) || 0;
  const sellPriceNum = Number(f.sellPrice) || 0;
  const profit = (sellPriceNum - Number(lot.avgPrice)) * sellQtyNum;
  const remainingQty = Number(lot.qty) - sellQtyNum;
  const handleSave = () => {
    if (!sellQtyNum || !sellPriceNum || sellQtyNum > Number(lot.qty)) return;
    const record = {
      id: `ss-${Date.now()}`,
      owner: lot.owner || "self",
      symbol: lot.base || lot.symbol,
      exchange: lot.exchange || "NSE",
      qty: sellQtyNum,
      buyPrice: Number(lot.avgPrice),
      buyDate: lot.buyDate || "",
      sellPrice: sellPriceNum,
      sellDate: f.sellDate,
      broker: f.broker,
      dematId: lot.dematId || "",
      profit: Number(profit.toFixed(2)),
    };
    onSave(record, remainingQty);
  };
  return (
    <Modal title={`Sell ${lot.base || lot.symbol}`} onClose={onClose}>
      <div style={{ fontSize: 13, color: "var(--t-muted)", marginBottom: 12 }}>
        Holding: <b>{lot.qty}</b> shares @ avg ₹{Number(lot.avgPrice).toFixed(2)} · Lot bought{" "}
        {lot.buyDate || "—"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Sell Qty">
          <input
            style={input}
            type="number"
            min="1"
            max={lot.qty}
            value={f.sellQty}
            onChange={(e) => setF({ ...f, sellQty: e.target.value })}
          />
        </Field>
        <Field label="Sell Price (₹)">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.sellPrice}
            onChange={(e) => setF({ ...f, sellPrice: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Sell Date">
        <input
          style={input}
          type="date"
          value={f.sellDate}
          onChange={(e) => setF({ ...f, sellDate: e.target.value })}
        />
      </Field>
      <Field label="Broker">
        {lot.broker ? (
          <input
            style={{ ...input, background: `${THEME.line}40`, cursor: "default" }}
            value={f.broker}
            readOnly
          />
        ) : (
          <input
            style={input}
            value={f.broker}
            placeholder="e.g. Zerodha"
            onChange={(e) => setF({ ...f, broker: e.target.value })}
          />
        )}
      </Field>
      {sellQtyNum > 0 && sellPriceNum > 0 && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: profit >= 0 ? `${THEME.sage}1a` : `${THEME.rust}1a`,
            marginTop: 4,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--t-muted)" }}>Estimated Profit/Loss: </span>
          <b style={{ color: profit >= 0 ? THEME.sage : THEME.rust }}>
            {profit >= 0 ? "+" : ""}₹
            {Math.abs(profit).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </b>
          {remainingQty > 0 && (
            <span style={{ fontSize: 12, color: "var(--t-muted)", marginLeft: 12 }}>
              {remainingQty} shares remain
            </span>
          )}
        </div>
      )}
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
  const allocs: FifoAlloc[] =
    sellQtyNum > 0 && sellPriceNum > 0 && sellQtyNum <= totalQty
      ? computeFifoAlloc(group.lots, sellQtyNum, sellPriceNum, f.sellDate)
      : [];

  const totalProceeds = sellQtyNum * sellPriceNum;
  const totalCost = allocs.reduce((s, a) => s + a.consume * a.buyPrice, 0);
  const totalPnl = totalProceeds - totalCost;
  const stcgPnl = allocs.filter((a) => !a.isLTCG).reduce((s, a) => s + a.pnl, 0);
  const ltcgPnl = allocs.filter((a) => a.isLTCG).reduce((s, a) => s + a.pnl, 0);
  const remainingAfter = totalQty - sellQtyNum;
  const qtyOver = sellQtyNum > totalQty;
  const isValid = sellQtyNum > 0 && sellPriceNum > 0 && !qtyOver && !!f.sellDate;

  const fmt = (n: number) =>
    Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmt2 = (n: number) =>
    Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Modal title={`Sell ${group.base} — FIFO`} onClose={onClose} maxWidth={720}>
      {/* Info bar */}
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          marginBottom: 16,
          fontSize: 13,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span>
          <span style={{ color: THEME.muted }}>Available: </span>
          <b>{totalQty} shares</b>
        </span>
        <span>
          <span style={{ color: THEME.muted }}>Lots: </span>
          <b>{group.lots.length}</b>
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: THEME.muted }}>
          Oldest lot consumed first (FIFO)
        </span>
      </div>

      {/* Inputs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Field label="Qty to Sell">
          <input
            style={{ ...input, borderColor: qtyOver ? THEME.rust : undefined }}
            type="number"
            min="1"
            max={totalQty}
            value={f.sellQty}
            onChange={(e) => setF({ ...f, sellQty: e.target.value })}
          />
        </Field>
        <Field label="Sell Price (₹)">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.sellPrice}
            onChange={(e) => setF({ ...f, sellPrice: e.target.value })}
          />
        </Field>
        <Field label="Sell Date">
          <input
            style={input}
            type="date"
            value={f.sellDate}
            onChange={(e) => setF({ ...f, sellDate: e.target.value })}
          />
        </Field>
        <Field label="Broker">
          <input
            style={input}
            value={f.broker}
            placeholder="e.g. Zerodha"
            onChange={(e) => setF({ ...f, broker: e.target.value })}
          />
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
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: THEME.muted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            FIFO Allocation
          </div>
          <div
            style={{
              borderRadius: 10,
              border: `1px solid ${THEME.line}`,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--surface-0)" }}>
                  <th style={{ ...th, padding: "8px 12px", fontSize: 9 }}>Buy Date</th>
                  <th style={{ ...th, padding: "8px 12px", fontSize: 9, textAlign: "right" }}>
                    Buy Price
                  </th>
                  <th style={{ ...th, padding: "8px 12px", fontSize: 9, textAlign: "right" }}>
                    Available
                  </th>
                  <th style={{ ...th, padding: "8px 12px", fontSize: 9, textAlign: "right" }}>
                    Selling
                  </th>
                  <th style={{ ...th, padding: "8px 12px", fontSize: 9, textAlign: "right" }}>
                    Cost Basis
                  </th>
                  <th style={{ ...th, padding: "8px 12px", fontSize: 9, textAlign: "right" }}>
                    P&L
                  </th>
                  <th style={{ ...th, padding: "8px 12px", fontSize: 9, textAlign: "center" }}>
                    Type
                  </th>
                </tr>
              </thead>
              <tbody>
                {allocs.map((a, i) => (
                  <tr
                    key={a.lot.id}
                    style={{
                      borderTop: i > 0 ? `1px solid ${THEME.line}` : undefined,
                      background: i % 2 === 0 ? "transparent" : `${THEME.accent}08`,
                    }}
                  >
                    <td style={{ ...td, padding: "9px 12px", borderBottom: "none" }}>
                      {a.lot.buyDate ? (
                        new Date(a.lot.buyDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })
                      ) : (
                        <span style={{ color: THEME.muted }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        ...td,
                        padding: "9px 12px",
                        borderBottom: "none",
                        textAlign: "right",
                      }}
                    >
                      ₹{Number(a.buyPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      style={{
                        ...td,
                        padding: "9px 12px",
                        borderBottom: "none",
                        textAlign: "right",
                        color: THEME.muted,
                      }}
                    >
                      {Number(a.lot.qty)}
                    </td>
                    <td
                      style={{
                        ...td,
                        padding: "9px 12px",
                        borderBottom: "none",
                        textAlign: "right",
                        fontWeight: 800,
                      }}
                    >
                      {a.consume}
                      {a.fullyConsumed ? (
                        <span
                          style={{
                            display: "block",
                            fontSize: 8,
                            color: THEME.rust,
                            fontWeight: 700,
                            lineHeight: 1.2,
                          }}
                        >
                          full lot
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "block",
                            fontSize: 8,
                            color: THEME.gold,
                            fontWeight: 700,
                            lineHeight: 1.2,
                          }}
                        >
                          partial
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        ...td,
                        padding: "9px 12px",
                        borderBottom: "none",
                        textAlign: "right",
                        color: THEME.muted,
                      }}
                    >
                      ₹{fmt2(a.consume * a.buyPrice)}
                    </td>
                    <td
                      style={{
                        ...td,
                        padding: "9px 12px",
                        borderBottom: "none",
                        textAlign: "right",
                        fontWeight: 700,
                        color: a.pnl >= 0 ? THEME.sage : THEME.rust,
                      }}
                    >
                      {a.pnl >= 0 ? "+" : "−"}₹{fmt2(Math.abs(a.pnl))}
                    </td>
                    <td
                      style={{
                        ...td,
                        padding: "9px 12px",
                        borderBottom: "none",
                        textAlign: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 7px",
                          borderRadius: 4,
                          fontWeight: 800,
                          background: a.isLTCG ? `${THEME.sage}1f` : `${THEME.gold}1f`,
                          color: a.isLTCG ? THEME.sage : THEME.gold,
                        }}
                      >
                        {a.isLTCG ? "LTCG" : "STCG"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary card */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 10,
              background: totalPnl >= 0 ? `${THEME.sage}12` : `${THEME.rust}12`,
              border: `1px solid ${totalPnl >= 0 ? `${THEME.sage}55` : `${THEME.rust}55`}`,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 3 }}>
                  Total Proceeds
                </div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>₹{fmt2(totalProceeds)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 3 }}>
                  Cost Basis (FIFO)
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: THEME.muted }}>
                  ₹{fmt2(totalCost)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 3 }}>Net P&L</div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: totalPnl >= 0 ? THEME.sage : THEME.rust,
                  }}
                >
                  {totalPnl >= 0 ? "+" : "−"}₹{fmt2(Math.abs(totalPnl))}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                paddingTop: 10,
                borderTop: `1px solid ${THEME.line}40`,
                flexWrap: "wrap",
              }}
            >
              {stcgPnl !== 0 && (
                <span style={{ fontSize: 12 }}>
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: 4,
                      fontSize: 9,
                      fontWeight: 800,
                      background: `${THEME.gold}1f`,
                      color: THEME.gold,
                      marginRight: 6,
                    }}
                  >
                    STCG
                  </span>
                  <b style={{ color: stcgPnl >= 0 ? THEME.sage : THEME.rust }}>
                    {stcgPnl >= 0 ? "+" : "−"}₹{fmt2(Math.abs(stcgPnl))}
                  </b>
                </span>
              )}
              {ltcgPnl !== 0 && (
                <span style={{ fontSize: 12 }}>
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: 4,
                      fontSize: 9,
                      fontWeight: 800,
                      background: `${THEME.sage}1f`,
                      color: THEME.sage,
                      marginRight: 6,
                    }}
                  >
                    LTCG
                  </span>
                  <b style={{ color: ltcgPnl >= 0 ? THEME.sage : THEME.rust }}>
                    {ltcgPnl >= 0 ? "+" : "−"}₹{fmt2(Math.abs(ltcgPnl))}
                  </b>
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

      <ModalActions
        onSave={() => isValid && onSave(allocs, sellPriceNum, f.sellDate, f.broker)}
        onClose={onClose}
        saveLabel="Confirm Sell"
        disabled={!isValid || allocs.length === 0}
      />
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
  const totalInv = group.lots.reduce(
    (s: number, l: any) => s + Number(l.qty) * Number(l.avgPrice),
    0
  );
  let newTotalQty = 0;
  if (n > 0 && m > 0)
    newTotalQty =
      type === "split" ? Math.floor((totalQty * n) / m) : Math.floor((totalQty * (m + n)) / m);
  const newAvgPreview = newTotalQty > 0 ? totalInv / newTotalQty : 0;
  const isValid = n > 0 && m > 0 && !!actionDate && (type === "split" ? n > m : true);
  const handleApply = () => {
    if (!isValid) return;
    const lotCalcs = group.lots.map((lot: any) => {
      const oldQty = Number(lot.qty);
      const oldAvg = Number(lot.avgPrice);
      const exact =
        type === "split" ? (oldQty * n) / m : (oldQty * (m + n)) / m;
      return { lot, oldQty, oldAvg, floored: Math.floor(exact), remainder: exact - Math.floor(exact) };
    });
    let shortfall = newTotalQty - lotCalcs.reduce((s: number, c: any) => s + c.floored, 0);
    const sorted = [...lotCalcs].sort((a: any, b: any) => b.remainder - a.remainder);
    for (const c of sorted) {
      if (shortfall <= 0) break;
      c.floored += 1;
      shortfall -= 1;
    }
    const updates = lotCalcs.map((c: any) => {
      const newAvg = c.floored > 0 ? (c.oldQty * c.oldAvg) / c.floored : c.oldAvg;
      return { id: c.lot.id, qty: String(c.floored), avgPrice: String(Number(newAvg.toFixed(4))) };
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
      <Field label="Action Type">
        <div style={{ display: "flex", gap: 10 }}>
          {(["split", "bonus"] as const).map((t) => (
            <button
              key={t}
              style={{
                ...btnGhost,
                flex: 1,
                justifyContent: "center",
                background: type === t ? THEME.accent : undefined,
                color: type === t ? "#fff" : undefined,
                border: type === t ? `1px solid ${THEME.accent}` : undefined,
              }}
              onClick={() => setType(t)}
            >
              {t === "split" ? "Stock Split" : "Bonus Shares"}
            </button>
          ))}
        </div>
      </Field>
      <div
        style={{
          padding: "14px 16px",
          borderRadius: 10,
          border: `2px solid ${actionDate ? THEME.sage : THEME.rust}`,
          background: actionDate ? `${THEME.sage}09` : `${THEME.rust}09`,
          marginBottom: 16,
        }}
      >
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: actionDate ? THEME.sage : THEME.rust,
            marginBottom: 6,
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
          }}
        >
          Action Date — when did this corporate action happen? {!actionDate && "★ Required"}
        </label>
        <input
          style={{ ...input, borderColor: actionDate ? THEME.sage : THEME.rust }}
          type="date"
          value={actionDate}
          onChange={(e) => setActionDate(e.target.value)}
        />
        {!actionDate && (
          <div style={{ fontSize: 12, color: THEME.rust, marginTop: 6, fontWeight: 600 }}>
            Enter the actual date (e.g. 15 Jan 2025) — this is saved in the history log
          </div>
        )}
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "end" }}
      >
        <Field label={type === "split" ? "New Shares" : "Bonus Shares"}>
          <input
            style={input}
            type="number"
            min="1"
            value={ratioN}
            onChange={(e) => setRatioN(e.target.value)}
          />
        </Field>
        <div
          style={{
            paddingBottom: 10,
            fontWeight: 700,
            fontSize: 20,
            color: THEME.muted,
            textAlign: "center",
          }}
        >
          :
        </div>
        <Field label="Existing Shares">
          <input
            style={input}
            type="number"
            min="1"
            value={ratioM}
            onChange={(e) => setRatioM(e.target.value)}
          />
        </Field>
      </div>
      {isValid && newTotalQty > 0 && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            marginTop: 4,
            fontSize: 13,
          }}
        >
          <span>
            <span style={{ color: THEME.muted }}>Total Qty: </span>
            <b style={{ color: THEME.muted }}>{totalQty}</b> →{" "}
            <b style={{ color: THEME.gold }}>{newTotalQty}</b>
          </span>
          <span style={{ marginLeft: 20 }}>
            <span style={{ color: THEME.muted }}>Avg Price: </span>
            <b style={{ color: THEME.muted }}>₹{(totalQty > 0 ? totalInv / totalQty : 0).toFixed(2)}</b> →{" "}
            <b style={{ color: THEME.gold }}>₹{newAvgPreview.toFixed(2)}</b>
          </span>
        </div>
      )}
      <ModalActions
        onSave={handleApply}
        onClose={onClose}
        saveLabel="Apply Action"
        disabled={!isValid}
      />
    </Modal>
  );
}
