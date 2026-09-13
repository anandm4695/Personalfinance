import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  Plus,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Percent,
  ArrowLeftRight,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Scissors,
  BarChart3,
  Search,
  PieChart as PieIcon,
  Activity,
  Star,
  X,
  Upload,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Target,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  Building,
  ShieldCheck,
  Layers,
  Sparkles,
  Award,
  SlidersHorizontal,
  History,
  Info,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { fmtINRFull, calcCAGR, today, calcXIRR, exportArrayToCSV } from "../../utils/finance";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { INDEX_BENCHMARKS, BENCHMARK_DATA_ASOF } from "../../utils/benchmarkData";
import { isLongTerm } from "./CapitalGainsTab";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { ConfirmDialog } from "../ui/Feedback";
import { BrokerImportModal } from "../modals/BrokerImportModal";
import { BrokerLogo } from "../ui/BrandLogos";

export { BrokerLogo };

// Broker logo domains for Clearbit / fallback
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

export function getBrokerTheme(broker: string) {
  const key = (broker || "").toLowerCase().replace(/[\s\-_.]+/g, "");
  for (const [k, v] of Object.entries(BROKER_THEMES)) {
    if (key.includes(k)) return v;
  }
  const hue =
    Array.from(broker || "?").reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0) % 360;
  const color = `hsl(${hue},55%,42%)`;
  return {
    gradient: `linear-gradient(135deg,hsl(${hue},55%,42%) 0%,hsl(${hue},70%,62%) 100%)`,
    color,
  };
}

export function brokerInitials(broker: string): string {
  const words = (broker || "?").trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function calcPeriodChange(points: Array<{ p: number }> | null | undefined) {
  if (!points || points.length < 2) return null;
  const first = points[0]?.p;
  const last = points[points.length - 1]?.p;
  if (first == null || last == null || !isFinite(first) || !isFinite(last) || first === 0) {
    return null;
  }
  const amount = last - first;
  const pct = (amount / first) * 100;
  return { amount, pct };
}

const GROWW_SYMBOL_OVERRIDES: Record<string, string> = {
  ZOMATO: "ETERNAL",
};

const _logoCache: Record<string, { logoUrl: string | null; faviconUrl: string | null } | null> = {};

export const StockLogo = ({ yfSym, size = 36 }: { yfSym: string; size?: number }) => {
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = React.useState<string | null>(null);
  const [failedUrls, setFailedUrls] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setFailedUrls(new Set());
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

  const imgStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    imageRendering: "-webkit-optimize-contrast",
  };
  const wrapStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: br,
    background: "var(--surface-0, #ffffff)",
    border: `1px solid ${THEME.line}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
    padding: pad,
    boxSizing: "border-box",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  };

  const markFailed = (url: string) => setFailedUrls((prev) => new Set([...prev, url]));

  const growwSym = GROWW_SYMBOL_OVERRIDES[base.toUpperCase()] ?? base;
  const growwUrl = !isBSE
    ? `https://assets-netstorage.groww.in/stock-assets/logos2/${encodeURIComponent(growwSym)}.webp`
    : null;

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
          color: THEME.darkInk,
          letterSpacing: "-0.01em",
        }}
      >
        {base.slice(0, 2)}
      </span>
    </div>
  );
};

export type FifoAlloc = {
  lot: any;
  consume: number;
  buyPrice: number;
  pnl: number;
  isLTCG: boolean;
  fullyConsumed: boolean;
};

export function computeFifoAlloc(
  lots: any[],
  sellQty: number,
  sellPrice: number,
  sellDate: string
): FifoAlloc[] {
  const sortedLots = [...lots].sort((a, b) => {
    if (!a.buyDate && !b.buyDate) return 0;
    if (!a.buyDate) return 1;
    if (!b.buyDate) return -1;
    return new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime();
  });

  let remainingToSell = sellQty;
  const allocs: FifoAlloc[] = [];

  for (const lot of sortedLots) {
    if (remainingToSell <= 0.0001) break;
    const lotQty = Number(lot.qty) || 0;
    if (lotQty <= 0) continue;

    const consume = Math.min(lotQty, remainingToSell);
    const buyPrice = Number(lot.avgPrice) || 0;
    const pnl = (sellPrice - buyPrice) * consume;
    const isLTCG = lot.buyDate ? isLongTerm(lot.buyDate, sellDate, 12) : false;
    const fullyConsumed = Math.abs(lotQty - consume) <= 0.0001;

    allocs.push({
      lot,
      consume,
      buyPrice,
      pnl,
      isLTCG,
      fullyConsumed,
    });

    remainingToSell -= consume;
  }

  return allocs;
}

const WISHLIST_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: "var(--radius-md)",
  color: THEME.ink,
  fontSize: 14,
  background: "var(--surface-0)",
  outline: "none",
  boxSizing: "border-box",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: THEME.muted,
  fontWeight: 800,
  borderBottom: `1.5px solid var(--t-line)`,
  whiteSpace: "nowrap",
  background: "var(--surface-0)",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 14px",
  borderBottom: "1px solid var(--t-line)",
  color: "var(--t-ink)",
  verticalAlign: "middle",
};

export function DematTab({
  state,
  addItem,
  removeItem,
  updateItem,
  missingTables = [],
  marketData = {},
  fetchLivePrices,
  fetchingPrices = false,
  marketDataTs,
  wishlists = [],
  wishlistItems = [],
  activeProfile = "all",
  showToast,
}: any) {
  const { privacyMode } = usePrivacy();
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(
    null
  );
  const [showDemat, setShowDemat] = useState(false);
  const [editDematId, setEditDematId] = useState<string | null>(null);
  const [showStock, setShowStock] = useState(false);
  const [stockDefaults, setStockDefaults] = useState<any>(null);
  const [editStockId, setEditStockId] = useState<string | null>(null);
  const [showBrokerImport, setShowBrokerImport] = useState(false);

  // Tab View Switcher
  const [dematView, setDematView] = useState<"holdings" | "analytics" | "watchlist" | "corporateActions">(
    "holdings"
  );
  const [expandedWishlistId, setExpandedWishlistId] = useState<string | null>(null);
  const [expandedWatchlistItems, setExpandedWatchlistItems] = useState(new Set<string>());
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [editWishlistId, setEditWishlistId] = useState<string | null>(null);
  const [showWishlistItemModal, setShowWishlistItemModal] = useState(false);
  const [wishlistItemTarget, setWishlistItemTarget] = useState<string | null>(null);
  const [editWishlistItemId, setEditWishlistItemId] = useState<string | null>(null);

  const [chartData, setChartData] = useState<Record<string, any>>({});
  const [expandedSymbols, setExpandedSymbols] = useState(new Set<string>());
  const [lotSortDir, setLotSortDir] = useState<Record<string, "asc" | "desc">>({});
  const [fetchingChart, setFetchingChart] = useState<string | null>(null);
  const [chartPeriod, setChartPeriod] = useState<Record<string, string>>({});
  const [sellLot, setSellLot] = useState<any>(null);
  const [fifoSellGroup, setFifoSellGroup] = useState<any>(null);
  const [splitBonusGroup, setSplitBonusGroup] = useState<any>(null);
  const [selectedDematId, setSelectedDematId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [selectedCap, setSelectedCap] = useState<"all" | "large" | "mid" | "small">("all");
  const [selectedPnlStatus, setSelectedPnlStatus] = useState<"all" | "profit" | "loss">("all");
  const [sortBy, setSortBy] = useState<"value" | "pnl" | "name" | "change">(() => {
    return (localStorage.getItem("finance_demat_sort") as any) || "value";
  });

  const { run: saveNewDemat, loading: savingNewDemat } = useAsyncAction(
    async (v: any) => {
      await addItem("demat", v);
    },
    {
      onSuccess: () => setShowDemat(false),
      onError: (e: any) =>
        showToast?.(`Failed to add demat account: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveDematEdit, loading: savingDematEdit } = useAsyncAction(
    async (id: string, v: any) => {
      await updateItem("demat", id, v);
    },
    {
      onSuccess: () => setEditDematId(null),
      onError: (e: any) =>
        showToast?.(`Failed to save demat account: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveNewStock, loading: savingNewStock } = useAsyncAction(
    async (v: any) => {
      await addItem("stocks", v);
    },
    {
      onSuccess: () => {
        setShowStock(false);
        setStockDefaults(null);
      },
      onError: (e: any) =>
        showToast?.(`Failed to add stock: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveStockEdit, loading: savingStockEdit } = useAsyncAction(
    async (id: string, v: any) => {
      await updateItem("stocks", id, v);
    },
    {
      onSuccess: () => setEditStockId(null),
      onError: (e: any) =>
        showToast?.(`Failed to save stock: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveSellStock, loading: savingSellStock } = useAsyncAction(
    async (lotId: string, sellRecord: any, remainingQty: number) => {
      await addItem("stockSells", sellRecord);
      if (remainingQty <= 0.0001) await removeItem("stocks", lotId);
      else await updateItem("stocks", lotId, { qty: String(Number(remainingQty.toFixed(4))) });
    },
    {
      onSuccess: () => setSellLot(null),
      onError: (e: any) =>
        showToast?.(`Failed to record sale: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveFifoSell, loading: savingFifoSell } = useAsyncAction(
    async (
      group: any,
      allocs: FifoAlloc[],
      sellPrice: number,
      sellDate: string,
      broker: string
    ) => {
      for (let i = 0; i < allocs.length; i++) {
        const alloc = allocs[i];
        await addItem("stockSells", {
          id: `ss-${Date.now()}-${i}`,
          owner: alloc.lot.owner || "self",
          symbol: group.base,
          exchange: group.exchange,
          qty: alloc.consume,
          buyPrice: alloc.buyPrice,
          buyDate: alloc.lot.buyDate || "",
          sellPrice,
          sellDate,
          broker,
          dematId: alloc.lot.dematId || "",
          profit: Number(alloc.pnl.toFixed(2)),
        });
        const rem = Number(alloc.lot.qty) - alloc.consume;
        if (alloc.fullyConsumed || rem <= 0.0001) await removeItem("stocks", alloc.lot.id);
        else
          await updateItem("stocks", alloc.lot.id, {
            qty: String(Number(rem.toFixed(4))),
          });
      }
    },
    {
      onSuccess: () => setFifoSellGroup(null),
      onError: (e: any) =>
        showToast?.(`Failed to record sale: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveSplitBonus, loading: savingSplitBonus } = useAsyncAction(
    async (updates: any[], actionLog: any, removals: string[] = []) => {
      for (const u of updates) {
        await updateItem("stocks", u.id, { qty: u.qty, avgPrice: u.avgPrice });
      }
      for (const id of removals) {
        await removeItem("stocks", id);
      }
      await addItem("corporateActions", actionLog);
    },
    {
      onSuccess: () => setSplitBonusGroup(null),
      onError: (e: any) =>
        showToast?.(`Failed to apply corporate action: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveNewWishlist, loading: savingNewWishlist } = useAsyncAction(
    async (v: any) => {
      await addItem("wishlists", v);
    },
    {
      onSuccess: () => setShowWishlistModal(false),
      onError: (e: any) =>
        showToast?.(`Failed to add watchlist: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveWishlistEdit, loading: savingWishlistEdit } = useAsyncAction(
    async (id: string, v: any) => {
      await updateItem("wishlists", id, v);
    },
    {
      onSuccess: () => setEditWishlistId(null),
      onError: (e: any) =>
        showToast?.(`Failed to save watchlist: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveNewWishlistItem, loading: savingNewWishlistItem } = useAsyncAction(
    async (v: any, watchlistId: string) => {
      await addItem("wishlistItems", { ...v, watchlistId });
    },
    {
      onSuccess: () => {
        setShowWishlistItemModal(false);
        setWishlistItemTarget(null);
      },
      onError: (e: any) =>
        showToast?.(`Failed to add stock to watchlist: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveWishlistItemEdit, loading: savingWishlistItemEdit } = useAsyncAction(
    async (id: string, v: any) => {
      await updateItem("wishlistItems", id, { targetPrice: v.targetPrice, notes: v.notes });
    },
    {
      onSuccess: () => setEditWishlistItemId(null),
      onError: (e: any) =>
        showToast?.(`Failed to save watchlist item: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  React.useEffect(() => {
    localStorage.setItem("finance_demat_sort", sortBy);
  }, [sortBy]);

  // Cleanup zero/negative qty stocks
  const cleanedZeroQtyIds = React.useRef(new Set<string>());
  React.useEffect(() => {
    (state.stocks || []).forEach((s: any) => {
      if (Number(s.qty) <= 0 && !cleanedZeroQtyIds.current.has(s.id)) {
        cleanedZeroQtyIds.current.add(s.id);
        removeItem("stocks", s.id);
      }
    });
  }, [state.stocks, removeItem]);

  const groups: any[] = useMemo(
    () =>
      Object.values(
        (state.stocks || [])
          .filter((s: any) => Number(s.qty) > 0)
          .reduce((acc: any, s: any) => {
            const base = (s.symbol || "").replace(/\.(NS|BO)$/i, "").toUpperCase();
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

  // Available sectors list for filter
  const allSectors = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => {
      const sec = marketData[g.yfSym]?.sector;
      if (sec) set.add(sec);
    });
    return Array.from(set).sort();
  }, [groups, marketData]);

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
          g.base.toLowerCase().includes(q) ||
          marketData[g.yfSym]?.sector?.toLowerCase().includes(q) ||
          marketData[g.yfSym]?.name?.toLowerCase().includes(q)
      );
    }

    if (selectedSector !== "all") {
      baseGroups = baseGroups.filter(
        (g) => (marketData[g.yfSym]?.sector || "Unclassified") === selectedSector
      );
    }

    if (selectedCap !== "all") {
      baseGroups = baseGroups.filter((g) => {
        const md = marketData[g.yfSym];
        const cap = md?.marketCap || 0;
        if (selectedCap === "large") return cap >= 500000000000 || !cap; // >= 50,000 Cr default
        if (selectedCap === "mid") return cap >= 150000000000 && cap < 500000000000;
        if (selectedCap === "small") return cap > 0 && cap < 150000000000;
        return true;
      });
    }

    if (selectedPnlStatus !== "all") {
      baseGroups = baseGroups.filter((g) => {
        const md = marketData[g.yfSym];
        const totalQty = g.lots.reduce((s: number, l: any) => s + Number(l.qty || 0), 0);
        const totalInv = g.lots.reduce((s: number, l: any) => s + Number(l.qty || 0) * Number(l.avgPrice || 0), 0);
        const totalCurr = g.lots.reduce((s: number, l: any) => s + Number(l.qty || 0) * (md?.price ?? Number(l.currentPrice || 0)), 0);
        const lotPnl = totalCurr - totalInv;
        return selectedPnlStatus === "profit" ? lotPnl >= 0 : lotPnl < 0;
      });
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

      const valA = a.lots.reduce(
        (s: number, l: any) => s + Number(l.qty) * (mdA?.price ?? Number(l.currentPrice || 0)),
        0
      );
      const valB = b.lots.reduce(
        (s: number, l: any) => s + Number(l.qty) * (mdB?.price ?? Number(l.currentPrice || 0)),
        0
      );

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
  }, [groups, selectedDematId, marketData, sortBy, search, selectedSector, selectedCap, selectedPnlStatus]);

  const filteredStocks = selectedDematId
    ? (state.stocks || []).filter((s: any) => s.dematId === selectedDematId)
    : state.stocks || [];

  const dayMovers = useMemo(() => {
    const withChange = groups
      .filter((g) => !selectedDematId || g.lots.some((l: any) => l.dematId === selectedDematId))
      .map((g) => {
        const md = marketData[g.yfSym];
        if (!md || md.changePercent == null) return null;
        return { base: g.base, exchange: g.exchange, changePercent: Number(md.changePercent) };
      })
      .filter(Boolean) as { base: string; exchange: string; changePercent: number }[];
    if (withChange.length < 2) return null;
    const sorted = [...withChange].sort((a, b) => b.changePercent - a.changePercent);
    return { top: sorted[0], bottom: sorted[sorted.length - 1] };
  }, [groups, marketData, selectedDematId]);

  const handleRefresh = async () => {
    try {
      await fetchLivePrices?.();
    } catch (e: any) {
      console.error(`Failed to fetch: ${e?.message}`);
      showToast?.(`Failed to refresh live prices: ${e?.message || "Unknown error"}`, "error");
    }
  };

  const handleExportHoldings = () => {
    const rows = filteredStocks.map((st: any) => {
      const base = (st.symbol || "").replace(/\.(NS|BO)$/i, "");
      const exch = st.exchange || "NSE";
      const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
      const md = marketData[yfSym];
      const qty = Number(st.qty) || 0;
      const avgPrice = Number(st.avgPrice) || 0;
      const currentPrice = md?.price ?? Number(st.currentPrice || 0);
      const invested = qty * avgPrice;
      const currentValue = qty * currentPrice;
      const demat = (state.demat || []).find((d: any) => d.id === st.dematId);
      return {
        symbol: base,
        exchange: exch,
        broker: demat?.broker || "",
        qty,
        avgPrice: avgPrice.toFixed(2),
        currentPrice: currentPrice.toFixed(2),
        buyDate: st.buyDate || "",
        invested: invested.toFixed(2),
        currentValue: currentValue.toFixed(2),
        pnl: (currentValue - invested).toFixed(2),
        pnlPct: invested ? (((currentValue - invested) / invested) * 100).toFixed(2) : "0.00",
      };
    });
    exportArrayToCSV(
      rows,
      [
        { key: "symbol", label: "Symbol" },
        { key: "exchange", label: "Exchange" },
        { key: "broker", label: "Broker" },
        { key: "qty", label: "Quantity" },
        { key: "avgPrice", label: "Avg Price" },
        { key: "currentPrice", label: "Current Price" },
        { key: "buyDate", label: "Buy Date" },
        { key: "invested", label: "Invested" },
        { key: "currentValue", label: "Current Value" },
        { key: "pnl", label: "P&L" },
        { key: "pnlPct", label: "P&L %" },
      ],
      `demat-holdings-${today()}.csv`
    );
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const CHART_PERIOD_LABELS: Record<string, string> = {
    "1d": "1D",
    "5d": "5D",
    "1m": "1M",
    "6m": "6M",
    ytd: "YTD",
    "1y": "1Y",
    "3y": "3Y",
    "5y": "5Y",
    max: "All",
  };
  const CHART_PERIODS = Object.keys(CHART_PERIOD_LABELS);

  const fetchChart = async (yfSym: string, range: string = "1d") => {
    const cacheKey = `${yfSym}__${range}`;
    if (chartData[cacheKey] || fetchingChart === yfSym) return;
    setFetchingChart(yfSym);
    try {
      const res = await fetch(
        `/api/stock-chart?symbol=${encodeURIComponent(yfSym)}&range=${range}`
      );
      if (res.ok) {
        const data = await res.json();
        const entry = Array.isArray(data) ? { date: null, points: data } : data;
        setChartData((prev) => ({ ...prev, [cacheKey]: entry }));
      } else {
        setChartData((prev) => ({ ...prev, [cacheKey]: { date: null, points: [] } }));
      }
    } catch (_) {
      setChartData((prev) => ({ ...prev, [cacheKey]: { date: null, points: [] } }));
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
        fetchChart(yfSym, chartPeriod[yfSym] || "1d");
      }
      return next;
    });
  };

  const totalValue = filteredStocks.reduce((s: number, st: any) => {
    const base = (st.symbol || "").replace(/\.(NS|BO)$/i, "");
    const exch = st.exchange || "NSE";
    const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
    const livePrice = marketData[yfSym]?.price;
    const price = livePrice !== undefined ? Number(livePrice) : Number(st.currentPrice || 0);
    return s + Number(st.qty || 0) * price;
  }, 0);

  const totalInvested = filteredStocks.reduce(
    (s: number, st: any) => s + Number(st.qty || 0) * Number(st.avgPrice || 0),
    0
  );

  const totalDividendsReceived = useMemo(() => {
    const heldSymbols = new Set(
      filteredStocks.map((st: any) =>
        (st.symbol || "")
          .replace(/\.(NS|BO)$/i, "")
          .trim()
          .toUpperCase()
      )
    );
    return (state.dividends || [])
      .filter((d: any) => heldSymbols.has((d.symbol || "").trim().toUpperCase()))
      .reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);
  }, [filteredStocks, state.dividends]);

  const overallXirr = useMemo(() => {
    try {
      const cashFlows: any[] = [];
      const safeFilteredStocks = Array.isArray(filteredStocks) ? filteredStocks : [];
      const safeStockSells = Array.isArray(state.stockSells) ? state.stockSells : [];

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
    const base = (st.symbol || "").replace(/\.(NS|BO)$/i, "");
    const exch = st.exchange || "NSE";
    const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
    const md = marketData[yfSym];
    if (!md) return s;
    const change = md.change ?? 0;
    return s + Number(st.qty || 0) * change;
  }, 0);

  const prevCloseValue = totalValue - totalDaysPnL;
  const totalDaysPnLPct = prevCloseValue > 0 ? (totalDaysPnL / prevCloseValue) * 100 : 0;

  const animatedTotalValue = useAnimatedNumber(totalValue);
  const animatedTotalDaysPnL = useAnimatedNumber(totalDaysPnL);
  const animatedPnl = useAnimatedNumber(pnl);
  const animatedOverallXirr = useAnimatedNumber(overallXirr ?? 0);
  const netReturnPct = totalInvested ? (pnl / totalInvested) * 100 : 0;
  const animatedNetReturnPct = useAnimatedNumber(netReturnPct);

  // Health Score Calculations
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

    const getStockPrice = (st: any) => {
      const base = (st.symbol || "").replace(/\.(NS|BO)$/i, "");
      const exch = st.exchange || "NSE";
      const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
      const livePrice = marketData[yfSym]?.price;
      return livePrice !== undefined ? Number(livePrice) : Number(st.currentPrice || 0);
    };

    const stockValues = filteredStocks.map((st: any) => {
      const val = Number(st.qty || 0) * getStockPrice(st);
      const base = (st.symbol || "").replace(/\.(NS|BO)$/i, "").toUpperCase();
      const exch = st.exchange || "NSE";
      return {
        symbol: base,
        exchange: exch,
        yfSym: `${base}.${exch === "BSE" ? "BO" : "NS"}`,
        qty: Number(st.qty || 0),
        avgPrice: Number(st.avgPrice || 0),
        currentPrice: getStockPrice(st),
        value: val,
      };
    });

    const aggregatedBySymbol: Record<string, any> = {};
    stockValues.forEach((s: (typeof stockValues)[number]) => {
      const key = `${s.symbol}|${s.exchange}`;
      if (!aggregatedBySymbol[key]) {
        aggregatedBySymbol[key] = {
          symbol: s.symbol,
          exchange: s.exchange,
          yfSym: s.yfSym,
          qty: 0,
          invested: 0,
          value: 0,
          currentPrice: s.currentPrice,
        };
      }
      aggregatedBySymbol[key].qty += s.qty;
      aggregatedBySymbol[key].invested += s.qty * s.avgPrice;
      aggregatedBySymbol[key].value += s.value;
    });

    const stockValuesAgg = Object.values(aggregatedBySymbol).map((s: any) => ({
      symbol: s.symbol,
      exchange: s.exchange,
      yfSym: s.yfSym,
      qty: s.qty,
      avgPrice: s.qty > 0 ? s.invested / s.qty : 0,
      currentPrice: s.currentPrice,
      value: s.value,
    }));

    const totalVal = stockValuesAgg.reduce((sum: number, s: any) => sum + s.value, 0) || 1;

    const stockWeights = stockValuesAgg
      .map((s: any) => ({
        ...s,
        weight: (s.value / totalVal) * 100,
      }))
      .sort((a: any, b: any) => b.value - a.value);

    const highQualityList = [
      "RELIANCE",
      "TCS",
      "INFY",
      "HDFCBANK",
      "ICICIBANK",
      "HINDUNILVR",
      "ITC",
      "LT",
      "BHARTIARTL",
      "SBIN",
      "TATASTEEL",
      "MARUTI",
      "WIPRO",
      "HCLTECH",
      "KOTAKBANK",
      "AXISBANK",
      "ASIANPAINT",
      "BAJFINANCE",
      "SUNPHARMA",
      "NTPC",
      "POWERGRID",
      "TITAN",
      "ULTRACEMCO",
    ];
    const midQualityList = [
      "TATAELXSI",
      "KPIT",
      "COFORGE",
      "CDSL",
      "HAL",
      "BEL",
      "IREDA",
      "IRFC",
      "RVNL",
      "NHPC",
      "TATAPOWER",
      "JIOFIN",
      "ZOMATO",
      "ETERNAL",
      "PFC",
      "RECL",
      "HUDCO",
      "BHEL",
      "LICHSGFIN",
    ];
    const speculativeList = [
      "YESBANK",
      "SUZLON",
      "IDEA",
      "GTLINFRA",
      "JPPOWER",
      "GTL",
      "RPOWER",
      "INFIBEAM",
      "PCJEWELLER",
      "RELIANCEINFRA",
      "RELIANCEPOWER",
      "RCOM",
    ];

    const getQualityVal = (sym: string) => {
      if (highQualityList.includes(sym)) return 95;
      if (midQualityList.includes(sym)) return 80;
      if (speculativeList.includes(sym)) return 35;
      let scoreSum = 0;
      for (let i = 0; i < sym.length; i++) {
        scoreSum += sym.charCodeAt(i);
      }
      return 55 + (scoreSum % 26);
    };

    const qualityScore = Math.round(
      stockWeights.reduce(
        (sum: number, s: any) => sum + getQualityVal(s.symbol) * (s.weight / 100),
        0
      )
    );

    const getMomentumVal = (s: any) => {
      const absoluteReturnPct =
        s.avgPrice > 0 ? ((s.currentPrice - s.avgPrice) / s.avgPrice) * 100 : 0;
      let score = 50 + absoluteReturnPct * 0.9;
      const md = marketData[s.yfSym];
      const dailyChangePct = md?.changePercent ?? 0;
      score += dailyChangePct * 1.5;
      return Math.max(10, Math.min(99, score));
    };

    const momentumScore = Math.round(
      stockWeights.reduce((sum: number, s: any) => sum + getMomentumVal(s) * (s.weight / 100), 0)
    );

    const hhi = stockWeights.reduce((sum: number, s: any) => sum + s.weight * s.weight, 0);
    let divScore = 100;
    if (hhi > 1000) {
      divScore = 100 - ((hhi - 1000) * 90) / 9000;
    }
    const diversificationScore = Math.max(10, Math.min(100, Math.round(divScore)));

    const getRiskVal = (sym: string) => {
      if (highQualityList.includes(sym)) return 90;
      if (midQualityList.includes(sym)) return 70;
      if (speculativeList.includes(sym)) return 30;
      return 60;
    };
    const baseRiskScore = stockWeights.reduce(
      (sum: number, s: any) => sum + getRiskVal(s.symbol) * (s.weight / 100),
      0
    );
    const maxWeight = stockWeights[0]?.weight ?? 0;
    let concentrationPenalty = 0;
    if (maxWeight > 40) concentrationPenalty = 20;
    else if (maxWeight > 25) concentrationPenalty = 10;

    const riskManagementScore = Math.max(10, Math.round(baseRiskScore - concentrationPenalty));

    const positiveReturnCount = stockWeights.filter(
      (s: any) => s.currentPrice >= s.avgPrice
    ).length;
    const consistencyScore = Math.round((positiveReturnCount / stockWeights.length) * 50 + 50);

    const overall = Math.round(
      qualityScore * 0.3 +
        momentumScore * 0.25 +
        diversificationScore * 0.25 +
        riskManagementScore * 0.2
    );

    let status = "Moderate";
    let statusColor = THEME.gold;
    if (overall >= 80) {
      status = "Very Strong";
      statusColor = THEME.sage;
    } else if (overall < 50) {
      status = "Action Required";
      statusColor = THEME.rust;
    }

    let rationale = "";
    if (overall >= 80) {
      rationale =
        "Your portfolio exhibits exceptional health, characterized by high-quality assets, solid diversification, and robust risk management. Maintain your current holding pattern.";
    } else if (overall >= 65) {
      rationale =
        "Your portfolio is in a healthy, moderate state. Consider trimming speculative holdings or consolidating some of your smaller positions to improve quality.";
    } else if (overall >= 50) {
      rationale =
        "Your portfolio health is average. Performance is likely held back by either concentrated holdings, weak momentum, or speculative asset exposure.";
    } else {
      rationale =
        "Your portfolio health requires immediate attention. High concentration in speculative stocks or deeply negative momentum represents severe exposure.";
    }

    const insights: string[] = [];

    if (maxWeight > 25) {
      insights.push(
        `[WARN] High concentration in a single stock: "${stockWeights[0].symbol}" makes up ${maxWeight.toFixed(1)}% of your portfolio. Consider trimming this to below 20% to mitigate single-stock risk.`
      );
    }

    const speculativeWeight = stockWeights.reduce(
      (sum: number, s: any) => sum + (speculativeList.includes(s.symbol) ? s.weight : 0),
      0
    );
    if (speculativeWeight > 20) {
      insights.push(
        `[WARN] Speculative exposure is high: Penny or highly volatile stocks represent ${speculativeWeight.toFixed(1)}% of holdings. Rotate some capital into stable blue-chip companies.`
      );
    }

    if (diversificationScore < 50) {
      insights.push(
        `[WARN] Highly concentrated portfolio: Your HHI is ${Math.round(hhi)}. Broaden your diversification by spreading capital across 3-4 additional sectors.`
      );
    } else if (diversificationScore > 90 && filteredStocks.length > 25) {
      insights.push(
        `[IDEA] Over-diversification alert: You have ${filteredStocks.length} holdings. This may dilute your returns. Consider consolidating into your 12-15 highest conviction stocks.`
      );
    }

    if (momentumScore < 50) {
      insights.push(
        `[WARN] Weak price momentum: A significant portion of your holdings are underperforming. Review companies with decaying returns.`
      );
    }

    const mutualFundsList = state.mutualFunds || [];
    const totalMfVal = mutualFundsList.reduce((sum: number, mf: any) => {
      const units = Number(mf.units) || 0;
      const nav = Number(mf.currentNav) || Number(mf.buyNav) || 0;
      return sum + units * nav;
    }, 0);

    if (totalMfVal > 0) {
      const ratio = totalVal / (totalVal + totalMfVal);
      if (ratio > 0.8) {
        insights.push(
          `[IDEA] Combined asset check: You are heavily tilted towards direct stocks (${(ratio * 100).toFixed(0)}% vs ${(100 - ratio * 100).toFixed(0)}% Mutual Funds). Consider raising your mutual fund allocation for passive stability.`
        );
      } else {
        insights.push(
          `[OK] Combined asset balance: Healthy mix of Direct Stocks (${(ratio * 100).toFixed(0)}%) and Mutual Funds (${(100 - ratio * 100).toFixed(0)}%) provides defensive stability.`
        );
      }
    } else if (filteredStocks.length > 0) {
      insights.push(
        `[IDEA] Diversification tip: You do not have any Mutual Funds registered. Allocating a portion of your wealth to index or hybrid mutual funds can improve long-term resilience.`
      );
    }

    if (insights.length === 0) {
      insights.push(
        "[OK] No immediate actions needed. Your portfolio looks well-structured and healthy."
      );
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

  const sectorAllocation = useMemo(() => {
    const bySector: Record<string, number> = {};
    portfolioScoreData.stockWeights.forEach((s: any) => {
      const sector = marketData[s.yfSym]?.sector || "Unclassified";
      bySector[sector] = (bySector[sector] || 0) + s.value;
    });
    const totalVal = Object.values(bySector).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(bySector)
      .map(([sector, value]) => ({ sector, value, weight: (value / totalVal) * 100 }))
      .sort((a, b) => b.value - a.value);
  }, [portfolioScoreData.stockWeights, marketData]);

  const fmtVol = (v: number) => {
    if (!v) return "—";
    if (v >= 1e7) return (v / 1e7).toFixed(2) + "Cr";
    if (v >= 1e5) return (v / 1e5).toFixed(2) + "L";
    if (v >= 1000) return (v / 1000).toFixed(1) + "K";
    return String(v);
  };

  // Live Market Status Helper (IST 09:15 to 15:30 weekdays)
  const isMarketOpen = useMemo(() => {
    const now = new Date();
    const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const h = ist.getHours();
    const m = ist.getMinutes();
    const day = ist.getDay();
    const isWeekday = day >= 1 && day <= 5;
    const afterOpen = h > 9 || (h === 9 && m >= 15);
    const beforeClose = h < 15 || (h === 15 && m <= 30);
    return isWeekday && afterOpen && beforeClose;
  }, []);

  return (
    <div className="tab-content-enter">
      {/* ── HEADER ── */}
      <SectionTitle
        sub="Live institutional-grade equity portfolio & brokerage telemetry"
        rightElement={
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Button
              variant="secondary"
              icon={<RefreshCw size={13} className={fetchingPrices ? "spin" : ""} />}
              onClick={handleRefresh}
              disabled={fetchingPrices}
            >
              {fetchingPrices ? "Updating…" : "Live Refresh"}
            </Button>
            {(state.stocks || []).length > 0 && (
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
              Add Demat
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
        Demat &amp; Stocks
      </SectionTitle>

      {/* ── MIGRATION BANNER ── */}
      {missingTables.includes("corporate_actions") && (
        <div
          style={{
            background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
            border: `1.5px solid ${THEME.rust}`,
            borderRadius: 14,
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
              <AlertTriangle size={18} color="#ffffff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.rust, marginBottom: 4 }}>
                One-time DB setup required — Corporate Actions &amp; Splits History
              </div>
              <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 12 }}>
                The <b>corporate_actions</b> table is missing in your Supabase database. Your actions are currently stored locally.
              </div>
              <pre
                style={{
                  fontSize: 11,
                  background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
                  padding: "10px 14px",
                  borderRadius: 8,
                  color: THEME.ink,
                  margin: 0,
                  overflowX: "auto",
                  whiteSpace: "pre",
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
CREATE POLICY "Users can access own data" ON public.corporate_actions FOR ALL USING (auth.uid() = user_id);`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ── EXECUTIVE COCKPIT HERO ── */}
      <div className="demat-cockpit-hero">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: THEME.muted,
                }}
              >
                Equity Portfolio Net Worth
              </span>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  background: isMarketOpen
                    ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)`
                    : `color-mix(in srgb, ${THEME.muted} 12%, transparent)`,
                  color: isMarketOpen ? THEME.sage : THEME.muted,
                  border: `1px solid ${isMarketOpen ? `color-mix(in srgb, ${THEME.sage} 25%, transparent)` : `color-mix(in srgb, ${THEME.muted} 20%, transparent)`}`,
                }}
              >
                <span className={`demat-live-dot ${isMarketOpen ? "" : "closed"}`} />
                {isMarketOpen ? "NSE/BSE Open" : "Market Closed"}
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 34,
                fontWeight: 700,
                color: THEME.ink,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                marginTop: 6,
              }}
            >
              <Money value={animatedTotalValue} variant="full" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: THEME.muted, fontWeight: 600 }}>
                Invested: <Money value={totalInvested} variant="full" />
              </span>
              <span style={{ color: THEME.line }}>•</span>
              <span
                className={`demat-trend-pill ${pnl >= 0 ? "up" : "down"}`}
                style={{ fontSize: 12, padding: "2px 10px" }}
              >
                {pnl >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {pnl >= 0 ? "+" : ""}
                <Money value={animatedPnl} variant="full" /> ({animatedNetReturnPct.toFixed(2)}%)
              </span>
            </div>
          </div>

          {marketDataTs && (
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                {(() => {
                  const diffMin = Math.floor((Date.now() - marketDataTs) / 60000);
                  if (diffMin < 1) return "Prices updated just now";
                  if (diffMin === 1) return "Prices updated 1 min ago";
                  if (diffMin < 60) return `Prices updated ${diffMin} min ago`;
                  return `Prices updated ${Math.floor(diffMin / 60)}h ago`;
                })()}
              </span>
            </div>
          )}
        </div>

        {/* Cockpit Secondary Stat Boxes */}
        <div className="demat-cockpit-grid">
          {/* Day's P&L */}
          <div className="demat-stat-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Day's P&amp;L
              </span>
              <Activity size={16} color={totalDaysPnL >= 0 ? THEME.sage : THEME.rust} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 700,
                  color: totalDaysPnL >= 0 ? THEME.sage : THEME.rust,
                  letterSpacing: "-0.02em",
                }}
              >
                {animatedTotalDaysPnL >= 0 ? "+" : ""}
                <Money value={animatedTotalDaysPnL} variant="full" />
              </div>
              <div style={{ fontSize: 11, marginTop: 2 }}>
                <span className={`demat-trend-pill ${totalDaysPnL >= 0 ? "up" : "down"}`}>
                  {totalDaysPnL >= 0 ? "+" : ""}{totalDaysPnLPct.toFixed(2)}% today
                </span>
              </div>
            </div>
          </div>

          {/* Overall Portfolio XIRR */}
          <div className="demat-stat-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Portfolio XIRR
              </span>
              <Percent size={16} color={overallXirr !== null && overallXirr >= 0 ? THEME.sage : THEME.rust} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 700,
                  color: overallXirr !== null && overallXirr >= 0 ? THEME.sage : THEME.rust,
                  letterSpacing: "-0.02em",
                }}
              >
                {overallXirr !== null ? (
                  <Prv>{`${animatedOverallXirr >= 0 ? "+" : ""}${animatedOverallXirr.toFixed(2)}%`}</Prv>
                ) : (
                  "—"
                )}
              </div>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4, fontWeight: 600 }}>
                Annualized wealth rate
              </div>
            </div>
          </div>

          {/* True Total Return (Gains + Dividends) */}
          <div className="demat-stat-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                True Total Return
              </span>
              <Sparkles size={16} color={THEME.accent} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 700,
                  color: pnl + totalDividendsReceived >= 0 ? THEME.sage : THEME.rust,
                  letterSpacing: "-0.02em",
                }}
              >
                {pnl + totalDividendsReceived >= 0 ? "+" : ""}
                <Money value={pnl + totalDividendsReceived} variant="full" />
              </div>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4, fontWeight: 600 }}>
                Incl. <Money value={totalDividendsReceived} variant="full" /> dividends
              </div>
            </div>
          </div>

          {/* Portfolio Health Dial */}
          <div className="demat-stat-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Health Score
              </span>
              <Award size={16} color={portfolioScoreData.statusColor} />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 800,
                  color: THEME.ink,
                }}
              >
                {portfolioScoreData.overall}
              </span>
              <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>/ 100</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: `color-mix(in srgb, ${portfolioScoreData.statusColor} 12%, transparent)`,
                  color: portfolioScoreData.statusColor,
                  border: `1px solid color-mix(in srgb, ${portfolioScoreData.statusColor} 25%, transparent)`,
                  textTransform: "uppercase",
                }}
              >
                {portfolioScoreData.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 NAVIGATION TABS ── */}
      <div className="demat-portfolio-bar no-scrollbar">
        {[
          { id: "holdings" as const, label: "Holdings Management", Icon: BarChart3, count: (state.stocks || []).length },
          { id: "analytics" as const, label: "Intelligence & Health", Icon: Activity },
          { id: "watchlist" as const, label: "Watchlists & Targets", Icon: Star, count: (wishlistItems || []).length },
          { id: "corporateActions" as const, label: "Splits & Tax Ledger", Icon: History, count: (state.corporateActions || []).length },
        ].map(({ id, label, Icon, count }) => {
          const active = dematView === id;
          return (
            <button
              key={id}
              onClick={() => setDematView(id)}
              className={`demat-portfolio-pill ${active ? "active" : ""}`}
            >
              <Icon size={15} />
              <span>{label}</span>
              {count !== undefined && count > 0 && (
                <span
                  style={{
                    padding: "1px 7px",
                    borderRadius: "var(--radius-xs)",
                    fontSize: 10,
                    fontWeight: 850,
                    background: active
                      ? `color-mix(in srgb, ${THEME.accent} 20%, transparent)`
                      : `color-mix(in srgb, ${THEME.muted} 15%, transparent)`,
                    color: active ? THEME.accent : THEME.muted,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── MULTI-BROKER FILTER CAROUSEL (For Holdings View) ── */}
      {dematView === "holdings" && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }} className="no-scrollbar">
            {/* Global View Button */}
            <button
              onClick={() => setSelectedDematId(null)}
              className={`demat-filter-chip ${selectedDematId === null ? "active" : ""}`}
              style={{ padding: "8px 16px" }}
            >
              <PieIcon size={14} />
              <span>All Demat Accounts</span>
              <span style={{ opacity: 0.7, fontSize: 11 }}>({(state.stocks || []).length})</span>
            </button>

            {/* Individual Broker Chips */}
            {(state.demat || []).map((d: any) => {
              const active = selectedDematId === d.id;
              const theme = getBrokerTheme(d.broker || "");
              const dematStocks = (state.stocks || []).filter((st: any) => st.dematId === d.id);
              const dematVal = dematStocks.reduce((s: number, st: any) => {
                const base = (st.symbol || "").replace(/\.(NS|BO)$/i, "");
                const exch = st.exchange || "NSE";
                const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
                const livePrice = marketData[yfSym]?.price;
                const price = livePrice !== undefined ? Number(livePrice) : Number(st.currentPrice || 0);
                return s + Number(st.qty || 0) * price;
              }, 0);

              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDematId(d.id)}
                  className={`demat-filter-chip ${active ? "active" : ""}`}
                  style={{
                    padding: "8px 16px",
                    borderColor: active ? theme.color : undefined,
                    background: active ? `color-mix(in srgb, ${theme.color} 12%, transparent)` : undefined,
                    color: active ? theme.color : undefined,
                  }}
                >
                  <BrokerLogo broker={d.broker || "?"} theme={theme} size={18} borderRadius={4} />
                  <span>{d.broker || "Broker"}</span>
                  <span style={{ fontWeight: 800, fontSize: 11 }}>
                    <Money value={dematVal} variant="compact" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── VIEW 1: HOLDINGS MANAGEMENT ── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {dematView === "holdings" && (
        <div style={{ width: "100%" }}>
          {/* Broker Account Overview Cards if accounts exist */}
          {(state.demat || []).length > 0 && selectedDematId === null && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {(state.demat || []).map((d: any) => {
                const theme = getBrokerTheme(d.broker || "");
                const dematStocks = (state.stocks || []).filter((st: any) => st.dematId === d.id);
                const dematValue = dematStocks.reduce((s: number, st: any) => {
                  const base = (st.symbol || "").replace(/\.(NS|BO)$/i, "");
                  const exch = st.exchange || "NSE";
                  const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
                  const livePrice = marketData[yfSym]?.price;
                  const price = livePrice !== undefined ? Number(livePrice) : Number(st.currentPrice || 0);
                  return s + Number(st.qty || 0) * price;
                }, 0);
                const dematInvested = dematStocks.reduce(
                  (s: number, st: any) => s + Number(st.qty || 0) * Number(st.avgPrice || 0),
                  0
                );
                const dematPnl = dematValue - dematInvested;
                const dematPnlPct = dematInvested > 0 ? (dematPnl / dematInvested) * 100 : 0;
                const scripsCount = new Set(dematStocks.map((st: any) => st.symbol)).size;

                return (
                  <Card
                    key={d.id}
                    hover
                    style={{
                      borderTop: `3.5px solid ${theme.color}`,
                      padding: "18px 20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <BrokerLogo broker={d.broker || "?"} theme={theme} size={36} borderRadius={10} />
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                            {d.broker || "Broker"}
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                            {d.clientId && (
                              <button
                                onClick={() => copyToClipboard(d.clientId, `client-${d.id}`)}
                                className="demat-copy-btn"
                                title="Click to copy Client ID"
                              >
                                {copiedKey === `client-${d.id}` ? <Check size={9} color={THEME.sage} /> : <Copy size={9} />}
                                ID: {d.clientId}
                              </button>
                            )}
                            {d.dpId && (
                              <button
                                onClick={() => copyToClipboard(d.dpId, `dp-${d.id}`)}
                                className="demat-copy-btn"
                                title="Click to copy DP ID"
                              >
                                {copiedKey === `dp-${d.id}` ? <Check size={9} color={THEME.sage} /> : <Copy size={9} />}
                                DP: {d.dpId}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <button
                          onClick={() => setEditDematId(d.id)}
                          className="icon-btn"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: THEME.muted,
                            padding: "4px 6px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 6,
                          }}
                          title="Edit Demat"
                          aria-label="Edit Demat"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setConfirmAction({
                              message: `Delete "${d.broker}" demat account? Linked stocks will lose account association.`,
                              onConfirm: () => removeItem("demat", d.id),
                            });
                          }}
                          className="icon-btn danger"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: THEME.rust,
                            padding: "4px 6px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 6,
                          }}
                          title="Delete Demat"
                          aria-label="Delete Demat"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div style={{ borderTop: `1px dashed ${THEME.line}`, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div>
                        <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                          Current Value
                        </div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                          <Money value={dematValue} variant="full" />
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span className={`demat-trend-pill ${dematPnl >= 0 ? "up" : "down"}`}>
                          {dematPnl >= 0 ? "+" : ""}{dematPnlPct.toFixed(2)}%
                        </span>
                        <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2, fontWeight: 600 }}>
                          {scripsCount} scrip{scripsCount === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Today's Movers Banner */}
          {dayMovers && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
                  fontSize: 12,
                }}
              >
                <TrendingUp size={14} color={THEME.sage} />
                <span style={{ color: THEME.muted, fontWeight: 600 }}>Top Mover:</span>
                <b style={{ color: THEME.ink }}>{dayMovers.top.base}</b>
                <span style={{ color: THEME.sage, fontWeight: 800 }}>
                  +{dayMovers.top.changePercent.toFixed(2)}%
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.rust} 25%, transparent)`,
                  fontSize: 12,
                }}
              >
                <TrendingDown size={14} color={THEME.rust} />
                <span style={{ color: THEME.muted, fontWeight: 600 }}>Top Dip:</span>
                <b style={{ color: THEME.ink }}>{dayMovers.bottom.base}</b>
                <span style={{ color: THEME.rust, fontWeight: 800 }}>
                  {dayMovers.bottom.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          )}

          {/* ── SEARCH & FILTER CONTROLS ── */}
          {(state.stocks || []).length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {/* Search Bar */}
              <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360 }}>
                <input
                  placeholder="Search symbol, sector or company..."
                  aria-label="Search stocks or sectors"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    ...inputStyle,
                    paddingLeft: 38,
                    paddingRight: search ? 36 : undefined,
                    height: 40,
                    borderRadius: 10,
                  }}
                />
                <div style={{ position: "absolute", left: 12, top: 12, color: THEME.muted }}>
                  <Search size={16} />
                </div>
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "none",
                      background: "var(--surface-2)",
                      color: THEME.muted,
                      cursor: "pointer",
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Sector Dropdown Filter */}
              {allSectors.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "var(--surface-0)",
                    padding: "0 12px",
                    borderRadius: 10,
                    border: `1.5px solid ${THEME.line}`,
                    height: 40,
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
                    Sector
                  </span>
                  <select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: 12,
                      fontWeight: 700,
                      color: THEME.ink,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="all">All Sectors ({allSectors.length})</option>
                    {allSectors.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Market Cap Filter */}
              <div
                style={{
                  display: "flex",
                  background: "var(--surface-1)",
                  padding: 3,
                  borderRadius: 10,
                  border: `1.5px solid ${THEME.line}`,
                }}
              >
                {[
                  { id: "all" as const, label: "All Caps" },
                  { id: "large" as const, label: "Large" },
                  { id: "mid" as const, label: "Mid" },
                  { id: "small" as const, label: "Small" },
                ].map((cap) => (
                  <button
                    key={cap.id}
                    onClick={() => setSelectedCap(cap.id)}
                    style={{
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: selectedCap === cap.id ? 800 : 600,
                      border: "none",
                      borderRadius: 7,
                      cursor: "pointer",
                      background: selectedCap === cap.id ? "var(--surface-0)" : "transparent",
                      color: selectedCap === cap.id ? THEME.accent : THEME.muted,
                      boxShadow: selectedCap === cap.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    {cap.label}
                  </button>
                ))}
              </div>

              {/* P&L Filter (Gainers/Losers) */}
              <div
                style={{
                  display: "flex",
                  background: "var(--surface-1)",
                  padding: 3,
                  borderRadius: 10,
                  border: `1.5px solid ${THEME.line}`,
                }}
              >
                {[
                  { id: "all" as const, label: "All Returns" },
                  { id: "profit" as const, label: "In Profit" },
                  { id: "loss" as const, label: "In Loss" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPnlStatus(p.id)}
                    style={{
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: selectedPnlStatus === p.id ? 800 : 600,
                      border: "none",
                      borderRadius: 7,
                      cursor: "pointer",
                      background: selectedPnlStatus === p.id ? "var(--surface-0)" : "transparent",
                      color: selectedPnlStatus === p.id ? THEME.accent : THEME.muted,
                      boxShadow: selectedPnlStatus === p.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Sort By Dropdown */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--surface-0)",
                  padding: "0 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${THEME.line}`,
                  height: 40,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
                  Sort
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: 12,
                    fontWeight: 700,
                    color: THEME.ink,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="value">Highest Value</option>
                  <option value="pnl">Best Returns (%)</option>
                  <option value="change">Day Gainers (%)</option>
                  <option value="name">Symbol (A-Z)</option>
                </select>
              </div>

              {/* Export CSV Button */}
              <button
                onClick={handleExportHoldings}
                className="icon-btn"
                title="Export holdings to CSV"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: `1.5px solid ${THEME.line}`,
                  background: "var(--surface-0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Download size={15} />
              </button>
            </div>
          )}

          {/* ── HOLDINGS TABLE ── */}
          {(state.stocks || []).length === 0 ? (
            <Card style={{ padding: "48px 32px", textAlign: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <TrendingUp size={44} color={THEME.accent} />
                <div style={{ fontSize: 18, fontWeight: 850, color: THEME.ink }}>No Stock Holdings Yet</div>
                <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 400 }}>
                  Track your direct equity holdings across Zerodha, Groww, Upstox, and other brokers with live NSE/BSE pricing, FIFO sell simulator, and CAGR analytics.
                </div>
                <Button
                  variant="accent"
                  icon={<Plus size={14} />}
                  onClick={() => {
                    setStockDefaults(null);
                    setShowStock(true);
                  }}
                >
                  Add Your First Scrip
                </Button>
              </div>
            </Card>
          ) : visibleGroups.length === 0 ? (
            <Card style={{ padding: 36, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: THEME.muted, fontWeight: 600 }}>
                No stock scrips match your selected search or filter criteria.
              </div>
            </Card>
          ) : (
            <div
              style={{
                background: "var(--surface-0)",
                borderRadius: 16,
                border: `1px solid ${THEME.line}`,
                overflowX: "auto",
                marginBottom: 20,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead className="demat-table-thead">
                  <tr>
                    <th style={{ ...thStyle, paddingLeft: 20 }}>Asset / Scrip</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Quantity</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Avg Price</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Live Price</th>
                    <th style={{ ...thStyle, textAlign: "center", minWidth: 120 }}>52W Range</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Invested</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Current Value</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Weight</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Day's P&amp;L</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Total Return</th>
                    <th style={{ ...thStyle, textAlign: "right", paddingRight: 20 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGroups.map(({ base, exchange, yfSym, lots }) => {
                    const md = marketData[yfSym];
                    const totalQty = lots.reduce((s: number, l: any) => s + (Number(l.qty) || 0), 0);
                    const totalInv = lots.reduce((s: number, l: any) => s + (Number(l.qty) || 0) * (Number(l.avgPrice) || 0), 0);
                    const totalCurr = lots.reduce(
                      (s: number, l: any) => s + (Number(l.qty) || 0) * (md?.price ?? Number(l.currentPrice || 0)),
                      0
                    );
                    const currentPrice = totalQty > 0 ? totalCurr / totalQty : 0;
                    const totalPnl = totalCurr - totalInv;
                    const totalPnlPct = totalInv ? (totalPnl / totalInv) * 100 : 0;

                    const isExpanded = expandedSymbols.has(yfSym);
                    const isLive = !!md;
                    const activePeriod = chartPeriod[yfSym] || "1d";
                    const chartEntry = chartData[`${yfSym}__${activePeriod}`];
                    const charts: any[] | null = chartEntry ? chartEntry.points ?? chartEntry : null;
                    const chartDate: string | null = chartEntry?.date ?? null;
                    const changeAmt = md?.change ?? 0;
                    const changePct = md?.changePercent ?? 0;
                    const periodChange = calcPeriodChange(charts);
                    const chartChangeAmt = periodChange?.amount ?? changeAmt;

                    // 52-Week Range Percent Position
                    const weekHigh = md?.weekHigh52;
                    const weekLow = md?.weekLow52;
                    const rangePos =
                      weekHigh != null && weekLow != null && weekHigh > weekLow
                        ? Math.max(0, Math.min(100, ((currentPrice - weekLow) / (weekHigh - weekLow)) * 100))
                        : 50;

                    return (
                      <React.Fragment key={yfSym}>
                        <tr
                          className="demat-holdings-row"
                          onClick={() => toggleExpand(yfSym)}
                          style={{
                            cursor: "pointer",
                            background: isExpanded ? `color-mix(in srgb, ${THEME.accent} 5%, transparent)` : "transparent",
                            borderBottom: `1px solid ${THEME.line}`,
                          }}
                        >
                          {/* Asset / Scrip */}
                          <td style={{ ...tdStyle, paddingLeft: 20 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span
                                style={{
                                  color: isExpanded ? THEME.accent : THEME.muted,
                                  display: "inline-flex",
                                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                  transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                }}
                              >
                                <ChevronDown size={15} />
                              </span>
                              <StockLogo yfSym={yfSym} size={36} />
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                                    {base}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 9,
                                      background: `color-mix(in srgb, ${THEME.line} 40%, transparent)`,
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
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                                  <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                                    {md?.sector || "Sector N/A"}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 9,
                                      background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
                                      color: THEME.muted,
                                      padding: "1px 6px",
                                      borderRadius: 10,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {lots.length} {lots.length === 1 ? "lot" : "lots"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Quantity */}
                          <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                            {totalQty}
                          </td>

                          {/* Avg Buy Price */}
                          <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                            <Prv>
                              ₹
                              {Number(totalQty > 0 ? totalInv / totalQty : 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </Prv>
                          </td>

                          {/* Live Price */}
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            <div style={{ fontWeight: 800, color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>
                              <Prv>
                                ₹
                                {currentPrice.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </Prv>
                            </div>
                            {isLive ? (
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: changeAmt >= 0 ? THEME.sage : THEME.rust,
                                  marginTop: 1,
                                }}
                              >
                                {changeAmt >= 0 ? "+" : ""}
                                {changePct.toFixed(2)}%
                              </div>
                            ) : (
                              <div style={{ fontSize: 10, color: THEME.muted, fontStyle: "italic" }}>Offline</div>
                            )}
                          </td>

                          {/* 52-Week Range Bar */}
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            {weekHigh != null && weekLow != null ? (
                              <div className="demat-52w-wrap">
                                <div className="demat-52w-track">
                                  <div className="demat-52w-needle" style={{ left: `${rangePos}%` }} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: THEME.muted }}>
                                  <span>₹{Math.round(weekLow)}</span>
                                  <span>₹{Math.round(weekHigh)}</span>
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: 10, color: THEME.muted }}>—</span>
                            )}
                          </td>

                          {/* Invested */}
                          <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>
                            <Money value={totalInv} variant="full" />
                          </td>

                          {/* Current Value */}
                          <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                            <Money value={totalCurr} variant="full" />
                          </td>

                          {/* Portfolio Weight */}
                          <td style={{ ...tdStyle, textAlign: "right", minWidth: 90 }}>
                            {totalValue > 0 ? (
                              (() => {
                                const weight = (totalCurr / totalValue) * 100;
                                return (
                                  <div className="demat-allocation-bar-wrap" style={{ justifyContent: "flex-end" }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>
                                      {weight.toFixed(1)}%
                                    </span>
                                    <div className="demat-allocation-bar-track" style={{ width: 44 }}>
                                      <div
                                        className="demat-allocation-bar-fill"
                                        style={{ width: `${Math.min(100, weight)}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <span style={{ color: THEME.muted }}>—</span>
                            )}
                          </td>

                          {/* Day's P&L */}
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            {isLive ? (
                              <>
                                <div
                                  style={{
                                    fontWeight: 800,
                                    color: totalQty * changeAmt >= 0 ? THEME.sage : THEME.rust,
                                  }}
                                >
                                  {totalQty * changeAmt >= 0 ? "+" : ""}
                                  <Money value={totalQty * changeAmt} variant="full" />
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: totalQty * changeAmt >= 0 ? THEME.sage : THEME.rust,
                                  }}
                                >
                                  {changePct >= 0 ? "+" : "−"}{Math.abs(changePct).toFixed(2)}%
                                </div>
                              </>
                            ) : (
                              <span style={{ color: THEME.muted }}>—</span>
                            )}
                          </td>

                          {/* Total Return */}
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            <div
                              style={{
                                fontWeight: 850,
                                color: totalPnl >= 0 ? THEME.sage : THEME.rust,
                              }}
                            >
                              {totalPnl >= 0 ? "+" : ""}
                              <Money value={totalPnl} variant="full" />
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                color: totalPnl >= 0 ? THEME.sage : THEME.rust,
                              }}
                            >
                              {totalPnlPct >= 0 ? "+" : "−"}{Math.abs(totalPnlPct).toFixed(2)}%
                            </div>
                          </td>

                          {/* Actions */}
                          <td style={{ ...tdStyle, textAlign: "right", paddingRight: 20 }}>
                            <div
                              style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  if (lots.length === 1) {
                                    setEditStockId(lots[0].id);
                                  } else {
                                    toggleExpand(yfSym);
                                  }
                                }}
                                className="icon-btn"
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: THEME.muted,
                                  padding: "4px 6px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 6,
                                }}
                                title={lots.length === 1 ? "Edit Holding" : "View & Edit Lots"}
                                aria-label="Edit Holding"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmAction({
                                    message: `Delete ${lots.length > 1 ? `all ${lots.length} lots of` : ""} ${base} (${totalQty} shares total)?`,
                                    onConfirm: () => {
                                      lots.forEach((l: any) => removeItem("stocks", l.id));
                                    },
                                  });
                                }}
                                className="icon-btn danger"
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: THEME.rust,
                                  padding: "4px 6px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 6,
                                }}
                                title="Delete Holding"
                                aria-label="Delete Holding"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* ── EXPANDABLE LOT & INTELLIGENCE DRAWER ── */}
                        {isExpanded && (
                          <tr
                            className="demat-drawer-row"
                            style={{
                              background: `linear-gradient(180deg, color-mix(in srgb, ${THEME.accent} 4%, var(--surface-0)) 0%, var(--surface-0) 100%)`,
                            }}
                          >
                            <td colSpan={11} style={{ padding: "20px 24px", borderBottom: `1.5px solid ${THEME.line}` }}>
                              <div className="demat-drawer-content" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                                {/* Chart Left Panel */}
                                {isLive && (
                                  <div style={{ flex: "1 1 300px", minWidth: 280 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                                        <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 800, textTransform: "uppercase" }}>
                                          {activePeriod === "1d" && chartDate ? `Intraday · ${chartDate}` : `${CHART_PERIOD_LABELS[activePeriod]} Performance`}
                                        </span>
                                        {periodChange && (
                                          <span
                                            style={{
                                              fontSize: 11,
                                              fontWeight: 800,
                                              color: periodChange.amount >= 0 ? THEME.sage : THEME.rust,
                                            }}
                                          >
                                            {periodChange.amount >= 0 ? "+" : "-"}₹{Math.abs(periodChange.amount).toFixed(2)} ({periodChange.pct.toFixed(2)}%)
                                          </span>
                                        )}
                                      </div>

                                      {/* Chart Period Selector */}
                                      <div
                                        style={{
                                          display: "flex",
                                          background: "var(--surface-1)",
                                          padding: 2,
                                          borderRadius: 8,
                                          border: `1px solid ${THEME.line}`,
                                        }}
                                      >
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
                                              fontSize: 9,
                                              fontWeight: activePeriod === p ? 850 : 600,
                                              border: "none",
                                              borderRadius: 6,
                                              cursor: "pointer",
                                              background: activePeriod === p ? "var(--surface-0)" : "transparent",
                                              color: activePeriod === p ? THEME.accent : THEME.muted,
                                            }}
                                          >
                                            {CHART_PERIOD_LABELS[p]}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Chart SVG */}
                                    <div
                                      style={{
                                        background: "var(--surface-1)",
                                        borderRadius: 12,
                                        border: `1px solid ${THEME.line}`,
                                        padding: "12px 10px",
                                        height: 140,
                                      }}
                                    >
                                      {charts && charts.length > 2 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                          <AreaChart data={charts} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                                            <defs>
                                              <linearGradient id={`ig-${base}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={chartChangeAmt >= 0 ? THEME.sage : THEME.rust} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={chartChangeAmt >= 0 ? THEME.sage : THEME.rust} stopOpacity={0.01} />
                                              </linearGradient>
                                            </defs>
                                            <XAxis dataKey="t" tick={{ fontSize: 9, fill: "var(--t-muted)" }} axisLine={false} tickLine={false} />
                                            <YAxis hide domain={["auto", "auto"]} />
                                            <Tooltip
                                              contentStyle={{
                                                fontSize: 11,
                                                background: "var(--surface-0)",
                                                border: `1px solid ${THEME.line}`,
                                                borderRadius: 8,
                                                color: THEME.ink,
                                              }}
                                              formatter={(v: any) => [privacyMode ? "••••" : `₹${Number(v).toFixed(2)}`, "Price"]}
                                            />
                                            <Area
                                              type="monotone"
                                              dataKey="p"
                                              stroke={chartChangeAmt >= 0 ? THEME.sage : THEME.rust}
                                              strokeWidth={1.5}
                                              fill={`url(#ig-${base})`}
                                              dot={false}
                                            />
                                          </AreaChart>
                                        </ResponsiveContainer>
                                      ) : (
                                        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: THEME.muted, fontSize: 12 }}>
                                          {fetchingChart === yfSym ? "Loading price chart…" : "No intraday chart available"}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Lots Detail Table Right Panel */}
                                <div style={{ flex: "1.3 1 420px", minWidth: 320 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 800, textTransform: "uppercase" }}>
                                        Purchase Lots &amp; Tax Status
                                      </span>
                                      <span
                                        style={{
                                          fontSize: 10,
                                          fontWeight: 800,
                                          background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                                          color: THEME.accent,
                                          padding: "1px 7px",
                                          borderRadius: 4,
                                        }}
                                      >
                                        {lots.length} {lots.length === 1 ? "lot" : "lots"}
                                      </span>
                                    </div>

                                    <button
                                      onClick={() =>
                                        setLotSortDir((prev) => ({
                                          ...prev,
                                          [yfSym]: (prev[yfSym] ?? "asc") === "asc" ? "desc" : "asc",
                                        }))
                                      }
                                      style={{
                                        background: "transparent",
                                        border: "none",
                                        fontSize: 11,
                                        color: THEME.accent,
                                        cursor: "pointer",
                                        fontWeight: 700,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 2,
                                      }}
                                    >
                                      Date {(lotSortDir[yfSym] ?? "asc") === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                    </button>
                                  </div>

                                  <div style={{ border: `1px solid ${THEME.line}`, borderRadius: 10, overflow: "hidden", background: "var(--surface-0)" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                      <thead>
                                        <tr style={{ background: "var(--surface-1)" }}>
                                          <th style={{ ...thStyle, padding: "8px 10px" }}>Broker</th>
                                          <th style={{ ...thStyle, padding: "8px 10px", textAlign: "right" }}>Qty</th>
                                          <th style={{ ...thStyle, padding: "8px 10px", textAlign: "right" }}>Buy Price</th>
                                          <th style={{ ...thStyle, padding: "8px 10px", textAlign: "right" }}>Tax Status</th>
                                          <th style={{ ...thStyle, padding: "8px 10px", textAlign: "right" }}>Return</th>
                                          <th style={{ ...thStyle, padding: "8px 10px", textAlign: "right" }}>Value</th>
                                          <th style={{ ...thStyle, padding: "8px 10px", width: 80 }}></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {[...lots]
                                          .sort((a: any, b: any) => {
                                            const da = a.buyDate ? new Date(a.buyDate).getTime() : 0;
                                            const db = b.buyDate ? new Date(b.buyDate).getTime() : 0;
                                            return (lotSortDir[yfSym] ?? "asc") === "asc" ? da - db : db - da;
                                          })
                                          .map((lot: any) => {
                                            const lInv = Number(lot.qty || 0) * Number(lot.avgPrice || 0);
                                            const lCurr = Number(lot.qty || 0) * currentPrice;
                                            const lPnl = lCurr - lInv;
                                            const lPnlPct = lInv ? (lPnl / lInv) * 100 : 0;
                                            const demat = (state.demat || []).find((d: any) => d.id === lot.dematId);
                                            const theme = getBrokerTheme(demat?.broker || "");
                                            const isLtcg = lot.buyDate ? isLongTerm(lot.buyDate, today(), 12) : false;

                                            const daysHeld = lot.buyDate
                                              ? Math.floor((new Date().getTime() - new Date(lot.buyDate).getTime()) / (1000 * 60 * 60 * 24))
                                              : null;

                                            return (
                                              <tr key={lot.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                                                <td style={{ ...tdStyle, padding: "8px 10px" }}>
                                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    <BrokerLogo broker={demat?.broker || "?"} theme={theme} size={18} borderRadius={4} />
                                                    <span style={{ fontWeight: 700, color: THEME.ink }}>
                                                      {demat?.broker || "Direct"}
                                                    </span>
                                                  </div>
                                                </td>
                                                <td style={{ ...tdStyle, padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>
                                                  {lot.qty}
                                                </td>
                                                <td style={{ ...tdStyle, padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>
                                                  <Prv>₹{Number(lot.avgPrice).toFixed(2)}</Prv>
                                                </td>
                                                <td style={{ ...tdStyle, padding: "8px 10px", textAlign: "right" }}>
                                                  {lot.buyDate ? (
                                                    <span className={isLtcg ? "demat-tax-badge-ltcg" : "demat-tax-badge-stcg"}>
                                                      <ShieldCheck size={9} />
                                                      {isLtcg ? `LTCG · ${((daysHeld || 0) / 365).toFixed(1)}y` : `STCG · ${daysHeld}d`}
                                                    </span>
                                                  ) : (
                                                    <span style={{ fontSize: 10, color: THEME.muted }}>—</span>
                                                  )}
                                                </td>
                                                <td style={{ ...tdStyle, padding: "8px 10px", textAlign: "right" }}>
                                                  <span style={{ fontWeight: 800, color: lPnl >= 0 ? THEME.sage : THEME.rust }}>
                                                    {lPnl >= 0 ? "+" : ""}{lPnlPct.toFixed(1)}%
                                                  </span>
                                                </td>
                                                <td style={{ ...tdStyle, padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>
                                                  <Money value={lCurr} variant="full" />
                                                </td>
                                                <td style={{ ...tdStyle, padding: "8px 10px", textAlign: "right" }}>
                                                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", alignItems: "center" }}>
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
                                                      style={{
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        color: THEME.rust,
                                                        padding: "3px 6px",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        borderRadius: 6,
                                                      }}
                                                      title="Sell Lot"
                                                      aria-label="Sell Lot"
                                                    >
                                                      <ArrowLeftRight size={12} />
                                                    </button>
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditStockId(lot.id);
                                                      }}
                                                      className="icon-btn"
                                                      style={{
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        color: THEME.muted,
                                                        padding: "3px 6px",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        borderRadius: 6,
                                                      }}
                                                      title="Edit Lot"
                                                      aria-label="Edit Lot"
                                                    >
                                                      <Pencil size={12} />
                                                    </button>
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmAction({
                                                          message: `Delete this ${base} lot (${lot.qty} shares)?`,
                                                          onConfirm: () => removeItem("stocks", lot.id),
                                                        });
                                                      }}
                                                      className="icon-btn danger"
                                                      style={{
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        color: THEME.rust,
                                                        padding: "3px 6px",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        borderRadius: 6,
                                                      }}
                                                      title="Delete Lot"
                                                      aria-label="Delete Lot"
                                                    >
                                                      <Trash2 size={12} />
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Quick Actions Footer inside drawer */}
                                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      icon={<Plus size={12} />}
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
                                      Add More Shares
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      icon={<ArrowLeftRight size={12} />}
                                      onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setFifoSellGroup({ base, exchange, yfSym, lots });
                                      }}
                                    >
                                      FIFO Sell
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      icon={<Scissors size={12} />}
                                      onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setSplitBonusGroup({ base, exchange, lots });
                                      }}
                                    >
                                      Stock Split / Bonus
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
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── VIEW 2: INTELLIGENCE & HEALTH STUDIO ── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {dematView === "analytics" && (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
          {filteredStocks.length === 0 ? (
            <Card style={{ padding: 36, textAlign: "center" }}>
              <div style={{ color: THEME.muted, fontSize: 13 }}>
                Add direct stock holdings to view your portfolio health analysis and diagnostics.
              </div>
            </Card>
          ) : (
            <>
              {/* Health Score & Diagnostics Card */}
              <Card style={{ padding: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, borderBottom: `1px solid ${THEME.line}`, paddingBottom: 10, marginBottom: 20 }}>
                  Portfolio Health &amp; Risk Intelligence
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, alignItems: "center" }}>
                  {/* Radial Gauge */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ position: "relative", width: 140, height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="70" cy="70" r="60" strokeWidth="10" fill="transparent" style={{ stroke: "var(--t-line)" }} />
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
                      <div style={{ position: "absolute", textAlign: "center" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: THEME.ink, lineHeight: 1 }}>
                          {portfolioScoreData.overall}
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", marginTop: 3 }}>
                          out of 100
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: 14,
                        fontSize: 11,
                        fontWeight: 850,
                        background: `color-mix(in srgb, ${portfolioScoreData.statusColor} 12%, transparent)`,
                        color: portfolioScoreData.statusColor,
                        padding: "4px 12px",
                        borderRadius: 6,
                        border: `1px solid color-mix(in srgb, ${portfolioScoreData.statusColor} 25%, transparent)`,
                        textTransform: "uppercase",
                      }}
                    >
                      {portfolioScoreData.status}
                    </div>
                  </div>

                  {/* Diagnostic Rationale */}
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
                      Executive Diagnostic Overview
                    </div>
                    <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.6, marginBottom: 16 }}>
                      {portfolioScoreData.rationale}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, borderTop: `1px solid ${THEME.line}`, paddingTop: 14 }}>
                      <div>
                        <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                          Holdings Value
                        </div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                          <Money value={totalValue} variant="full" />
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                          Diversification Count
                        </div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                          {filteredStocks.length} scrips
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* 5 Health Dimensions & Sector Allocation */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
                {/* Score Breakdown Bars */}
                <Card style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, borderBottom: `1px solid ${THEME.line}`, paddingBottom: 10 }}>
                    Core Portfolio Dimensions
                  </div>
                  {[
                    { label: "Asset Quality", score: portfolioScoreData.quality, desc: "Blue chip allocation vs speculative small-caps." },
                    { label: "Price Momentum", score: portfolioScoreData.momentum, desc: "Performance relative to cost basis & daily swings." },
                    { label: "Diversification (HHI)", score: portfolioScoreData.diversification, desc: "Single scrip concentration balance." },
                    { label: "Risk Management", score: portfolioScoreData.riskManagement, desc: "Asset risk profile & concentration weighting." },
                    { label: "Defensive Consistency", score: portfolioScoreData.consistency, desc: "Share of profitable holdings protecting downside." },
                  ].map((dim) => {
                    const color = dim.score >= 80 ? THEME.sage : dim.score >= 50 ? THEME.gold : THEME.rust;
                    return (
                      <div key={dim.label} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span style={{ fontWeight: 700, color: THEME.ink }}>{dim.label}</span>
                          <span style={{ fontWeight: 850, color }}>{dim.score} / 100</span>
                        </div>
                        <div style={{ width: "100%", height: 6, borderRadius: 99, background: "var(--surface-1)", overflow: "hidden" }}>
                          <div style={{ width: `${dim.score}%`, height: "100%", borderRadius: 99, background: color }} />
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted }}>{dim.desc}</div>
                      </div>
                    );
                  })}
                </Card>

                {/* Sector Allocation Breakdown */}
                <Card style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, borderBottom: `1px solid ${THEME.line}`, paddingBottom: 10 }}>
                    Sector Allocation Matrix
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {sectorAllocation.slice(0, 6).map((sec, idx) => {
                      const hues = [210, 160, 42, 12, 280, 190, 330, 100];
                      const color = `hsl(${hues[idx % hues.length]}, 60%, 50%)`;
                      return (
                        <div key={sec.sector} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span style={{ fontWeight: 700, color: THEME.ink }}>{sec.sector}</span>
                            <span style={{ fontWeight: 800, color: THEME.muted }}>{sec.weight.toFixed(1)}%</span>
                          </div>
                          <div style={{ width: "100%", height: 6, borderRadius: 99, background: "var(--surface-1)", overflow: "hidden" }}>
                            <div style={{ width: `${sec.weight}%`, height: "100%", borderRadius: 99, background: color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* ── BENCHMARK COMPARISON ── */}
              {(() => {
                const oldestBuyDate = filteredStocks.reduce(
                  (oldest: string | null, st: any) => {
                    if (!st.buyDate) return oldest;
                    if (!oldest) return st.buyDate;
                    return new Date(st.buyDate).getTime() < new Date(oldest).getTime() ? st.buyDate : oldest;
                  },
                  null as string | null
                );

                const portfolioCagr = oldestBuyDate ? calcCAGR(totalInvested, totalValue, oldestBuyDate) : null;
                const benchmarks = [
                  { name: INDEX_BENCHMARKS.nifty50.label, ...INDEX_BENCHMARKS.nifty50, color: THEME.accent },
                  { name: INDEX_BENCHMARKS.sensex.label, ...INDEX_BENCHMARKS.sensex, color: THEME.muted },
                  { name: INDEX_BENCHMARKS.niftyMidcap.label, ...INDEX_BENCHMARKS.niftyMidcap, color: THEME.violet },
                  { name: INDEX_BENCHMARKS.niftySmallcap.label, ...INDEX_BENCHMARKS.niftySmallcap, color: THEME.gold },
                ];

                const holdingYears = oldestBuyDate
                  ? (Date.now() - new Date(oldestBuyDate).getTime()) / (365.25 * 24 * 3600 * 1000)
                  : 1;
                const benchmarkPeriod: "1Y" | "3Y" | "5Y" | "10Y" =
                  holdingYears >= 7 ? "10Y" : holdingYears >= 4 ? "5Y" : holdingYears >= 2 ? "3Y" : "1Y";
                const niftyBenchmark = benchmarks[0][benchmarkPeriod];
                const alpha = portfolioCagr !== null ? portfolioCagr - niftyBenchmark : null;

                const barChartData = [
                  { name: "Portfolio", return: portfolioCagr !== null ? Number(portfolioCagr.toFixed(1)) : 0, fill: THEME.accent },
                  { name: "Nifty 50", return: benchmarks[0][benchmarkPeriod], fill: THEME.accent },
                  { name: "Nifty Midcap", return: benchmarks[2][benchmarkPeriod], fill: THEME.violet },
                  { name: "Nifty Smallcap", return: benchmarks[3][benchmarkPeriod], fill: THEME.gold },
                ];

                return (
                  <Card style={{ padding: 24 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, borderBottom: `1px solid ${THEME.line}`, paddingBottom: 10, marginBottom: 16 }}>
                      Portfolio Alpha vs Market Benchmarks ({benchmarkPeriod})
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, alignItems: "center" }}>
                      <div>
                        {alpha !== null && (
                          <div
                            className={`demat-benchmark-banner ${alpha >= 0 ? "outperform" : "underperform"}`}
                          >
                            <Award size={24} color={alpha >= 0 ? THEME.sage : THEME.rust} />
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: alpha >= 0 ? THEME.sage : THEME.rust }}>
                                {alpha >= 0 ? "Outperforming Benchmark" : "Trailing Benchmark"}
                              </div>
                              <div style={{ fontSize: 12, color: THEME.muted }}>
                                Portfolio delivers <b>{alpha >= 0 ? "+" : ""}{alpha.toFixed(1)}% Alpha</b> over Nifty 50 ({benchmarkPeriod} CAGR).
                              </div>
                            </div>
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: THEME.muted }}>Portfolio CAGR</span>
                            <b>{portfolioCagr !== null ? `${portfolioCagr.toFixed(2)}%` : "N/A"}</b>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: THEME.muted }}>Nifty 50 ({benchmarkPeriod})</span>
                            <b>{niftyBenchmark}%</b>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: THEME.muted }}>Sensex ({benchmarkPeriod})</span>
                            <b>{benchmarks[1][benchmarkPeriod]}%</b>
                          </div>
                        </div>
                      </div>

                      <div style={{ height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barChartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--t-muted)" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: "var(--t-muted)" }} axisLine={false} tickLine={false} />
                            <Tooltip
                              contentStyle={{ background: "var(--surface-0)", border: `1px solid ${THEME.line}`, borderRadius: 8, fontSize: 11 }}
                              formatter={(v: any) => [`${v}%`, "CAGR"]}
                            />
                            <Bar dataKey="return" radius={[6, 6, 0, 0]}>
                              {barChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </Card>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── VIEW 3: WATCHLISTS & TARGETS ── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {dematView === "watchlist" && (
        <div style={{ width: "100%" }}>
          {/* Watchlist Hero Header */}
          <div className="watchlist-hero">
            <Star size={32} color={THEME.accent} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.02em" }}>
                Target Price Watchlists
              </div>
              <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                Track scrips of interest and trigger automated Buy Signal alerts when prices approach your targets.
              </div>
            </div>
            <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShowWishlistModal(true)}>
              New Watchlist
            </Button>
          </div>

          {/* Watchlists List */}
          {(wishlists || []).length === 0 ? (
            <Card style={{ padding: "48px 32px", textAlign: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <Star size={36} color={THEME.muted} />
                <div style={{ fontSize: 17, fontWeight: 800, color: THEME.ink }}>No Watchlists Created</div>
                <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 360 }}>
                  Create watchlists to track high-conviction ideas, set target entry prices, and monitor discount gaps.
                </div>
                <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShowWishlistModal(true)}>
                  Create First Watchlist
                </Button>
              </div>
            </Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {(wishlists || []).map((wl: any) => {
                const items = (wishlistItems || []).filter((it: any) => it.watchlistId === wl.id);
                const isExpanded = expandedWishlistId === wl.id;

                return (
                  <Card
                    key={wl.id}
                    style={{
                      padding: 0,
                      overflow: "hidden",
                      borderLeft: `4px solid ${wl.color || WISHLIST_COLORS[0]}`,
                    }}
                  >
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
                      <Star size={18} color={wl.color || WISHLIST_COLORS[0]} fill={wl.color || WISHLIST_COLORS[0]} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                          {wl.name}
                        </div>
                        {wl.description && (
                          <div style={{ fontSize: 12, color: THEME.muted, marginTop: 1 }}>
                            {wl.description}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: `color-mix(in srgb, ${wl.color || WISHLIST_COLORS[0]} 12%, transparent)`,
                            color: wl.color || WISHLIST_COLORS[0],
                          }}
                        >
                          {items.length} scrips
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setWishlistItemTarget(wl.id);
                            setEditWishlistItemId(null);
                            setShowWishlistItemModal(true);
                          }}
                          className="icon-btn"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: THEME.muted,
                            padding: "4px 6px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 6,
                          }}
                          title="Add Scrip to Watchlist"
                          aria-label="Add Scrip"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditWishlistId(wl.id);
                          }}
                          className="icon-btn"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: THEME.muted,
                            padding: "4px 6px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 6,
                          }}
                          title="Edit Watchlist"
                          aria-label="Edit Watchlist"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmAction({
                              message: `Delete watchlist "${wl.name}" and its tracked scrips?`,
                              onConfirm: () => removeItem("wishlists", wl.id),
                            });
                          }}
                          className="icon-btn danger"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: THEME.rust,
                            padding: "4px 6px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 6,
                          }}
                          title="Delete Watchlist"
                          aria-label="Delete Watchlist"
                        >
                          <Trash2 size={13} />
                        </button>
                        <ChevronRight
                          size={16}
                          color={THEME.muted}
                          style={{
                            transform: isExpanded ? "rotate(90deg)" : "none",
                            transition: "transform 0.2s",
                          }}
                        />
                      </div>
                    </div>

                    {/* Expanded Watchlist Table */}
                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${THEME.line}` }}>
                        {items.length === 0 ? (
                          <div style={{ padding: 24, textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                            No stocks added to this watchlist yet. Click "+" above to add your first stock.
                          </div>
                        ) : (
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                              <thead>
                                <tr>
                                  <th style={{ ...thStyle, paddingLeft: 20 }}>Stock</th>
                                  <th style={{ ...thStyle, textAlign: "right" }}>Live Price</th>
                                  <th style={{ ...thStyle, textAlign: "right" }}>Target Price</th>
                                  <th style={{ ...thStyle, textAlign: "right", minWidth: 140 }}>Target Gap</th>
                                  <th style={thStyle}>Notes</th>
                                  <th style={{ ...thStyle, width: 100, textAlign: "right", paddingRight: 20 }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((it: any) => {
                                  const yfSym = `${it.symbol}.${it.exchange === "BSE" ? "BO" : "NS"}`;
                                  const md = marketData[yfSym];
                                  const livePrice = md?.price ?? null;
                                  const gap =
                                    it.targetPrice && livePrice
                                      ? ((Number(it.targetPrice) - Number(livePrice)) / Number(livePrice)) * 100
                                      : null;
                                  const isBuySignal = gap !== null && Math.abs(gap) <= 2;

                                  return (
                                    <tr key={it.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                                      <td style={{ ...tdStyle, paddingLeft: 20 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                          <StockLogo yfSym={yfSym} size={30} />
                                          <div>
                                            <div style={{ fontWeight: 800, color: THEME.ink }}>{it.symbol}</div>
                                            <div style={{ fontSize: 10, color: THEME.muted }}>{it.exchange}</div>
                                          </div>
                                        </div>
                                      </td>

                                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                                        {livePrice != null ? <Prv>₹{Number(livePrice).toFixed(2)}</Prv> : "—"}
                                      </td>

                                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: THEME.gold }}>
                                        {it.targetPrice ? <Prv>₹{Number(it.targetPrice).toFixed(2)}</Prv> : "—"}
                                      </td>

                                      <td style={{ ...tdStyle, textAlign: "right" }}>
                                        {gap !== null ? (
                                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                              {isBuySignal && (
                                                <span className="buy-signal-badge">
                                                  <Target size={9} /> Buy Signal
                                                </span>
                                              )}
                                              <span
                                                style={{
                                                  fontWeight: 800,
                                                  fontSize: 12,
                                                  color: gap >= 0 ? THEME.sage : THEME.rust,
                                                }}
                                              >
                                                {gap >= 0 ? "▲ " : "▼ "}{Math.abs(gap).toFixed(1)}%
                                              </span>
                                            </div>
                                            <div className="watchlist-target-bar-track" style={{ width: 80 }}>
                                              <div
                                                className="watchlist-target-bar-fill"
                                                style={{
                                                  width: `${Math.min(100, Math.max(0, 100 - Math.min(100, Math.abs(gap))))}%`,
                                                  background: gap <= 5 ? THEME.sage : THEME.accent,
                                                }}
                                              />
                                            </div>
                                          </div>
                                        ) : (
                                          <span style={{ color: THEME.muted }}>—</span>
                                        )}
                                      </td>

                                      <td style={{ ...tdStyle, color: THEME.muted, maxWidth: 200 }}>
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                                          {it.notes || "—"}
                                        </span>
                                      </td>

                                      <td style={{ ...tdStyle, textAlign: "right", paddingRight: 20 }}>
                                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                          <Button
                                            variant="secondary"
                                            size="sm"
                                            style={{ padding: "3px 8px", fontSize: 11 }}
                                            onClick={() => {
                                              setStockDefaults({
                                                symbol: it.symbol,
                                                exchange: it.exchange || "NSE",
                                                avgPrice: livePrice ? String(livePrice) : "",
                                              });
                                              setShowStock(true);
                                            }}
                                          >
                                            Buy
                                          </Button>
                                          <button
                                            className="icon-btn"
                                            style={{
                                              background: "none",
                                              border: "none",
                                              cursor: "pointer",
                                              color: THEME.muted,
                                              padding: "3px 6px",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              borderRadius: 6,
                                            }}
                                            onClick={() => setEditWishlistItemId(it.id)}
                                            title="Edit Item"
                                            aria-label="Edit Item"
                                          >
                                            <Pencil size={12} />
                                          </button>
                                          <button
                                            className="icon-btn danger"
                                            style={{
                                              background: "none",
                                              border: "none",
                                              cursor: "pointer",
                                              color: THEME.rust,
                                              padding: "3px 6px",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              borderRadius: 6,
                                            }}
                                            onClick={() => {
                                              setConfirmAction({
                                                message: `Remove "${it.symbol}" from watchlist?`,
                                                onConfirm: () => removeItem("wishlistItems", it.id),
                                              });
                                            }}
                                            title="Delete Item"
                                            aria-label="Delete Item"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
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
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── VIEW 4: CORPORATE ACTIONS & TAX LEDGER ── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {dematView === "corporateActions" && (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Tax Rules Overview */}
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, marginBottom: 10 }}>
              Indian Capital Gains Tax Rules (Budget 2024 / FY 2024–25+)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              <div style={{ padding: 14, borderRadius: 10, background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: THEME.sage, textTransform: "uppercase" }}>
                  Long-Term Capital Gains (LTCG)
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginTop: 4 }}>
                  12.5% <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>above ₹1.25 Lakh exemption</span>
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                  Applicable when equity scrips are held for more than 12 months (Section 112A).
                </div>
              </div>

              <div style={{ padding: 14, borderRadius: 10, background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: THEME.gold, textTransform: "uppercase" }}>
                  Short-Term Capital Gains (STCG)
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginTop: 4 }}>
                  20.0% <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>flat tax</span>
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                  Applicable on equity shares sold within 12 months of purchase date (Section 111A).
                </div>
              </div>
            </div>
          </Card>

          {/* Corporate Actions History Table */}
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, marginBottom: 14 }}>
              Split &amp; Bonus Issues Audit Trail
            </div>
            {(state.corporateActions || []).length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: THEME.muted, fontSize: 13 }}>
                No corporate action splits or bonus shares recorded yet. When you perform a split or bonus action on a holding, its adjustment audit trail will appear here.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, paddingLeft: 16 }}>Symbol</th>
                      <th style={thStyle}>Action</th>
                      <th style={thStyle}>Ratio</th>
                      <th style={thStyle}>Date</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Qty Adjustment</th>
                      <th style={{ ...thStyle, textAlign: "right", paddingRight: 16 }}>Avg Price Adjustment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(state.corporateActions || []).map((a: any) => (
                      <tr key={a.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                        <td style={{ ...tdStyle, paddingLeft: 16, fontWeight: 800 }}>
                          {a.symbol} ({a.exchange || "NSE"})
                        </td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 850,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: a.actionType === "split" ? `color-mix(in srgb, ${THEME.gold} 12%, transparent)` : `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                              color: a.actionType === "split" ? THEME.gold : THEME.sage,
                              textTransform: "uppercase",
                            }}
                          >
                            {a.actionType}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>
                          {a.ratioN} : {a.ratioM}
                        </td>
                        <td style={{ ...tdStyle, color: THEME.muted }}>
                          {a.actionDate || "—"}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          <span style={{ color: THEME.muted }}>{a.oldQty}</span> → <b>{a.newQty}</b>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", paddingRight: 16, fontVariantNumeric: "tabular-nums" }}>
                          <span style={{ color: THEME.muted }}>₹{Number(a.oldAvgPrice).toFixed(2)}</span> → <b>₹{Number(a.newAvgPrice).toFixed(2)}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── MODALS ── */}
      {showDemat && (
        <DematModal
          onClose={() => setShowDemat(false)}
          onSave={saveNewDemat}
          activeProfile={activeProfile}
          saving={savingNewDemat}
        />
      )}

      {editDematId && (
        <DematModal
          initial={(state.demat || []).find((d: any) => d.id === editDematId)}
          onClose={() => setEditDematId(null)}
          onSave={(v: any) => saveDematEdit(editDematId, v)}
          activeProfile={activeProfile}
          saving={savingDematEdit}
        />
      )}

      {showStock && (
        <StockModal
          demats={state.demat || []}
          defaults={stockDefaults}
          onClose={() => {
            setShowStock(false);
            setStockDefaults(null);
          }}
          onSave={saveNewStock}
          activeProfile={activeProfile}
          saving={savingNewStock}
        />
      )}

      {editStockId && (
        <StockModal
          demats={state.demat || []}
          initial={(state.stocks || []).find((s: any) => s.id === editStockId)}
          onClose={() => setEditStockId(null)}
          onSave={(v: any) => saveStockEdit(editStockId, v)}
          activeProfile={activeProfile}
          saving={savingStockEdit}
        />
      )}

      {sellLot && (
        <SellStockModal
          lot={sellLot}
          onClose={() => setSellLot(null)}
          onSave={(record: any, remainingQty: number) => saveSellStock(sellLot.id, record, remainingQty)}
          saving={savingSellStock}
        />
      )}

      {fifoSellGroup && (
        <FifoSellModal
          group={fifoSellGroup}
          currentPrice={marketData[fifoSellGroup.yfSym]?.price}
          demats={state.demat || []}
          onClose={() => setFifoSellGroup(null)}
          onSave={(allocs: any, sellPrice: number, sellDate: string, broker: string) =>
            saveFifoSell(fifoSellGroup, allocs, sellPrice, sellDate, broker)
          }
          saving={savingFifoSell}
        />
      )}

      {splitBonusGroup && (
        <SplitBonusModal
          group={splitBonusGroup}
          onClose={() => setSplitBonusGroup(null)}
          onApply={saveSplitBonus}
          saving={savingSplitBonus}
        />
      )}

      {showWishlistModal && (
        <WishlistModal
          onClose={() => setShowWishlistModal(false)}
          onSave={saveNewWishlist}
          saving={savingNewWishlist}
        />
      )}

      {editWishlistId && (
        <WishlistModal
          initial={(wishlists || []).find((w: any) => w.id === editWishlistId)}
          onClose={() => setEditWishlistId(null)}
          onSave={(v: any) => saveWishlistEdit(editWishlistId, v)}
          saving={savingWishlistEdit}
        />
      )}

      {showWishlistItemModal && wishlistItemTarget && (
        <WishlistItemModal
          onClose={() => {
            setShowWishlistItemModal(false);
            setWishlistItemTarget(null);
          }}
          onSave={(v: any) => saveNewWishlistItem(v, wishlistItemTarget)}
          saving={savingNewWishlistItem}
        />
      )}

      {editWishlistItemId && (
        <WishlistItemModal
          initial={(wishlistItems || []).find((it: any) => it.id === editWishlistItemId)}
          onClose={() => setEditWishlistItemId(null)}
          onSave={(v: any) => saveWishlistItemEdit(editWishlistItemId, v)}
          saving={savingWishlistItemEdit}
        />
      )}

      {showBrokerImport && (
        <BrokerImportModal
          demats={state.demat || []}
          existingStocks={state.stocks || []}
          activeProfile={activeProfile}
          onClose={() => setShowBrokerImport(false)}
          onImport={saveBrokerImport}
          saving={savingBrokerImport}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          title="Confirm Action"
          message={confirmAction.message}
          onConfirm={() => {
            confirmAction.onConfirm();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

export default DematTab;

/* ═══════════════════════════════════════════════════════════════════════ */
/* ── SUB-MODALS ── */
/* ═══════════════════════════════════════════════════════════════════════ */

function DematModal({ onClose, onSave, initial = null, activeProfile = "all", saving = false }: any) {
  const { familyProfiles } = useMasterData();
  const defaultOwner = activeProfile !== "all" ? activeProfile : "self";
  const [f, setF] = useState(
    initial || { broker: "", dpId: "", clientId: "", owner: defaultOwner }
  );

  const POPULAR_BROKERS = [
    "Zerodha",
    "Groww",
    "Angel One",
    "Upstox",
    "ICICI Direct",
    "HDFC Sky",
    "Kotak Neo",
    "Dhan",
    "Paytm Money",
    "Motilal Oswal",
    "Sharekhan",
    "5paisa",
  ];

  const isValid = !!f.broker?.trim();
  return (
    <Modal title={initial ? "Edit Demat Account" : "Add Demat Account"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select
          style={inputStyle}
          value={f.owner || "self"}
          onChange={(e) => setF({ ...f, owner: e.target.value })}
        >
          {familyProfiles.map((p: any) => (
            <option key={p.id} value={p.id}>
              {formatProfileOption(p)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Broker Name">
        <input
          style={inputStyle}
          value={f.broker}
          onChange={(e) => setF({ ...f, broker: e.target.value })}
          placeholder="e.g. Zerodha, Groww"
        />
      </Field>

      {/* Quick Broker Chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {POPULAR_BROKERS.slice(0, 8).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setF({ ...f, broker: b })}
            style={{
              fontSize: 11,
              padding: "4px 8px",
              borderRadius: 6,
              border: `1px solid ${THEME.line}`,
              background: f.broker.toLowerCase() === b.toLowerCase() ? THEME.accent : "var(--surface-1)",
              color: f.broker.toLowerCase() === b.toLowerCase() ? THEME.darkInk : THEME.ink,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {b}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="DP ID (Optional)">
          <input
            style={inputStyle}
            value={f.dpId}
            onChange={(e) => setF({ ...f, dpId: e.target.value })}
            placeholder="e.g. 12081600"
          />
        </Field>
        <Field label="Client ID / BOID (Optional)">
          <input
            style={inputStyle}
            value={f.clientId}
            onChange={(e) => setF({ ...f, clientId: e.target.value })}
            placeholder="e.g. YB1234"
          />
        </Field>
      </div>

      <ModalActions
        onSave={() => isValid && onSave(f)}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Add Demat Account"}
        disabled={!isValid || saving}
        loading={saving}
      />
    </Modal>
  );
}

function StockModal({ demats = [], onClose, onSave, initial = null, defaults = null, activeProfile = "all", saving = false }: any) {
  const { familyProfiles } = useMasterData();
  const defaultOwner = activeProfile !== "all" ? activeProfile : "self";
  const [f, setF] = useState(
    initial || {
      symbol: defaults?.symbol || "",
      exchange: defaults?.exchange || "NSE",
      dematId: defaults?.dematId || demats[0]?.id || "",
      qty: "",
      avgPrice: defaults?.avgPrice || "",
      currentPrice: "",
      buyDate: today(),
      owner: defaultOwner,
    }
  );

  const qtyNum = Number(f.qty);
  const avgPriceNum = Number(f.avgPrice);
  const currentPriceNum = Number(f.currentPrice);
  const isValid =
    !!f.symbol.trim() &&
    !!f.dematId &&
    qtyNum > 0 &&
    avgPriceNum > 0 &&
    (f.currentPrice === "" || (Number.isFinite(currentPriceNum) && currentPriceNum >= 0));

  return (
    <Modal title={initial ? "Edit Stock Scrip" : "Add Stock Scrip"} onClose={onClose}>
      <Field label="Owner / Family Profile">
        <select
          style={inputStyle}
          value={f.owner || "self"}
          onChange={(e) => setF({ ...f, owner: e.target.value })}
        >
          {familyProfiles.map((p: any) => (
            <option key={p.id} value={p.id}>
              {formatProfileOption(p)}
            </option>
          ))}
        </select>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 12 }}>
        <Field label="Scrip Symbol">
          <input
            style={inputStyle}
            value={f.symbol}
            onChange={(e) =>
              setF({ ...f, symbol: e.target.value.toUpperCase().replace(/\.(NS|BO)$/i, "") })
            }
            placeholder="e.g. RELIANCE, TCS"
          />
        </Field>
        <Field label="Exchange">
          <select
            style={inputStyle}
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
          style={inputStyle}
          value={f.dematId}
          onChange={(e) => setF({ ...f, dematId: e.target.value })}
        >
          {demats.length === 0 && <option value="">Please add a Demat Account first</option>}
          {demats.map((d: any) => (
            <option key={d.id} value={d.id}>
              {d.broker} {d.clientId ? `(${d.clientId})` : ""}
            </option>
          ))}
        </select>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
        <Field label="Quantity">
          <input
            style={inputStyle}
            type="number"
            min="0.0001"
            value={f.qty}
            onChange={(e) => setF({ ...f, qty: e.target.value })}
            placeholder="e.g. 50"
          />
        </Field>
        <Field label="Buy Price (₹)">
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            min="0.01"
            value={f.avgPrice}
            onChange={(e) => setF({ ...f, avgPrice: e.target.value })}
            placeholder="e.g. 2450.50"
          />
        </Field>
        <Field label="Current Price (Optional)">
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            min="0.01"
            value={f.currentPrice}
            onChange={(e) => setF({ ...f, currentPrice: e.target.value })}
            placeholder="Auto-updated live"
          />
        </Field>
      </div>

      <Field label="Buy Date (Enables LTCG/STCG Tax Calculation & CAGR)">
        <input
          style={inputStyle}
          type="date"
          max={today()}
          value={f.buyDate || ""}
          onChange={(e) => setF({ ...f, buyDate: e.target.value })}
        />
      </Field>

      <ModalActions
        onSave={() => isValid && onSave(f)}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Add Scrip"}
        disabled={!isValid || saving}
        loading={saving}
      />
    </Modal>
  );
}

function SellStockModal({ lot, onClose, onSave, saving = false }: any) {
  const [f, setF] = useState({
    sellQty: String(lot.qty),
    sellPrice: String(lot.currentPrice || lot.avgPrice || ""),
    sellDate: today(),
    broker: lot.broker || "",
  });

  const sellQtyNum = Number(f.sellQty) || 0;
  const sellPriceNum = Number(f.sellPrice) || 0;
  const totalLotQty = Number(lot.qty) || 0;
  const actualSellQty = Math.abs(sellQtyNum - totalLotQty) <= 0.0001 ? totalLotQty : sellQtyNum;
  const remainingQty = Math.max(0, totalLotQty - actualSellQty) <= 0.0001 ? 0 : totalLotQty - actualSellQty;
  const profit = (sellPriceNum - Number(lot.avgPrice)) * actualSellQty;
  const isLtcg = lot.buyDate ? isLongTerm(lot.buyDate, f.sellDate, 12) : false;
  const isValid = sellQtyNum > 0 && sellPriceNum > 0 && sellQtyNum <= totalLotQty + 0.0001 && !!f.sellDate;

  const handleSave = () => {
    if (!isValid) return;
    const record = {
      id: `ss-${Date.now()}`,
      owner: lot.owner || "self",
      symbol: lot.base || lot.symbol,
      exchange: lot.exchange || "NSE",
      qty: actualSellQty,
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
    <Modal title={`Sell Shares — ${lot.base || lot.symbol}`} onClose={onClose}>
      <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 14 }}>
        Lot: <b>{lot.qty} shares</b> @ cost basis <Prv>₹{Number(lot.avgPrice).toFixed(2)}</Prv> (Bought: {lot.buyDate || "—"})
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Sell Quantity">
          <input
            style={inputStyle}
            type="number"
            min="0.0001"
            max={lot.qty}
            value={f.sellQty}
            onChange={(e) => setF({ ...f, sellQty: e.target.value })}
          />
        </Field>
        <Field label="Sell Price (₹)">
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            min="0.01"
            value={f.sellPrice}
            onChange={(e) => setF({ ...f, sellPrice: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Sell Date">
        <input
          style={inputStyle}
          type="date"
          min={lot.buyDate || undefined}
          max={today()}
          value={f.sellDate}
          onChange={(e) => setF({ ...f, sellDate: e.target.value })}
        />
      </Field>

      {sellQtyNum > 0 && sellPriceNum > 0 && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: profit >= 0 ? `color-mix(in srgb, ${THEME.sage} 10%, transparent)` : `color-mix(in srgb, ${THEME.rust} 10%, transparent)`,
            marginTop: 4,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: THEME.muted, fontWeight: 600 }}>Estimated Capital Gain/Loss:</span>
            <b style={{ color: profit >= 0 ? THEME.sage : THEME.rust, fontSize: 14 }}>
              {profit >= 0 ? "+" : ""}₹{Math.abs(profit).toFixed(2)}
            </b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 11 }}>
            <span className={isLtcg ? "demat-tax-badge-ltcg" : "demat-tax-badge-stcg"}>
              {isLtcg ? "LTCG @ 12.5%" : "STCG @ 20.0%"}
            </span>
            {remainingQty > 0 && <span style={{ color: THEME.muted }}>{remainingQty} shares will remain</span>}
          </div>
        </div>
      )}

      <ModalActions
        onSave={handleSave}
        onClose={onClose}
        saveLabel="Confirm Sell"
        disabled={!isValid || saving}
        loading={saving}
      />
    </Modal>
  );
}

function FifoSellModal({ group, currentPrice, demats = [], onClose, onSave, saving = false }: any) {
  const totalQty = group.lots.reduce((s: number, l: any) => s + Number(l.qty || 0), 0);
  const [f, setF] = useState({
    sellQty: String(totalQty),
    sellPrice: currentPrice ? String(Number(currentPrice).toFixed(2)) : "",
    sellDate: today(),
    broker: demats[0]?.broker || "",
  });

  const sellQtyNum = Number(f.sellQty) || 0;
  const sellPriceNum = Number(f.sellPrice) || 0;
  const allocs: FifoAlloc[] =
    sellQtyNum > 0 && sellPriceNum > 0 && sellQtyNum <= totalQty + 0.0001
      ? computeFifoAlloc(
          group.lots,
          Math.abs(sellQtyNum - totalQty) <= 0.0001 ? totalQty : sellQtyNum,
          sellPriceNum,
          f.sellDate
        )
      : [];

  const totalProceeds = sellQtyNum * sellPriceNum;
  const totalCost = allocs.reduce((s, a) => s + a.consume * a.buyPrice, 0);
  const totalPnl = totalProceeds - totalCost;
  const stcgPnl = allocs.filter((a) => !a.isLTCG).reduce((s, a) => s + a.pnl, 0);
  const ltcgPnl = allocs.filter((a) => a.isLTCG).reduce((s, a) => s + a.pnl, 0);
  const remainingAfter = totalQty - sellQtyNum;
  const isValid = sellQtyNum > 0 && sellPriceNum > 0 && sellQtyNum <= totalQty + 0.0001 && !!f.sellDate;

  return (
    <Modal title={`FIFO Share Sell — ${group.base}`} onClose={onClose} maxWidth={640}>
      <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 12 }}>
        Automated FIFO allocation sells oldest lots first for maximum LTCG tax benefits.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Total Sell Qty">
          <input
            style={inputStyle}
            type="number"
            min="0.0001"
            max={totalQty}
            value={f.sellQty}
            onChange={(e) => setF({ ...f, sellQty: e.target.value })}
          />
        </Field>
        <Field label="Sell Price (₹)">
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            min="0.01"
            value={f.sellPrice}
            onChange={(e) => setF({ ...f, sellPrice: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Sell Date">
        <input
          style={inputStyle}
          type="date"
          max={today()}
          value={f.sellDate}
          onChange={(e) => setF({ ...f, sellDate: e.target.value })}
        />
      </Field>

      {/* FIFO Lot Allocation Breakdown Preview */}
      {allocs.length > 0 && (
        <div style={{ marginTop: 12, border: `1px solid ${THEME.line}`, borderRadius: 10, padding: 14, background: "var(--surface-1)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
            FIFO Lot Allocation Preview ({allocs.length} lot{allocs.length === 1 ? "" : "s"} consumed)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
            {allocs.map((a, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  Lot #{i + 1} ({a.lot.buyDate || "—"}): <b>{a.consume} sh</b> @ ₹{a.buyPrice.toFixed(2)}
                </span>
                <span className={a.isLTCG ? "demat-tax-badge-ltcg" : "demat-tax-badge-stcg"}>
                  {a.isLTCG ? "LTCG" : "STCG"} · {a.pnl >= 0 ? "+" : ""}₹{a.pnl.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${THEME.line}`, marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: THEME.muted, fontWeight: 600 }}>Total Realized P&amp;L:</span>
            <b style={{ color: totalPnl >= 0 ? THEME.sage : THEME.rust }}>
              {totalPnl >= 0 ? "+" : ""}₹{totalPnl.toFixed(2)}
            </b>
          </div>
        </div>
      )}

      <ModalActions
        onSave={() => isValid && onSave(allocs, sellPriceNum, f.sellDate, f.broker)}
        onClose={onClose}
        saveLabel="Confirm FIFO Sell"
        disabled={!isValid || allocs.length === 0 || saving}
        loading={saving}
      />
    </Modal>
  );
}

function SplitBonusModal({ group, onClose, onApply, saving = false }: any) {
  const [type, setType] = useState<"split" | "bonus">("split");
  const [ratioN, setRatioN] = useState("2");
  const [ratioM, setRatioM] = useState("1");
  const [actionDate, setActionDate] = useState(today());

  const n = Number(ratioN) || 0;
  const m = Number(ratioM) || 0;
  const totalQty = group.lots.reduce((s: number, l: any) => s + Number(l.qty || 0), 0);
  const totalInv = group.lots.reduce((s: number, l: any) => s + Number(l.qty || 0) * Number(l.avgPrice || 0), 0);

  let newTotalQty = 0;
  if (n > 0 && m > 0)
    newTotalQty = type === "split" ? Math.floor((totalQty * n) / m) : Math.floor((totalQty * (m + n)) / m);
  const newAvgPreview = newTotalQty > 0 ? totalInv / newTotalQty : 0;
  const isValid = n > 0 && m > 0 && !!actionDate && (type === "split" ? n !== m : true);

  const handleApply = () => {
    if (!isValid) return;
    const lotCalcs = group.lots.map((lot: any) => {
      const oldQty = Number(lot.qty);
      const oldAvg = Number(lot.avgPrice);
      const exact = type === "split" ? (oldQty * n) / m : (oldQty * (m + n)) / m;
      return {
        lot,
        oldQty,
        oldAvg,
        floored: Math.floor(exact),
        remainder: exact - Math.floor(exact),
      };
    });
    let shortfall = newTotalQty - lotCalcs.reduce((s: number, c: any) => s + c.floored, 0);
    const sorted = [...lotCalcs].sort((a: any, b: any) => b.remainder - a.remainder);
    for (const c of sorted) {
      if (shortfall <= 0) break;
      c.floored += 1;
      shortfall -= 1;
    }
    const updates = lotCalcs
      .filter((c: any) => c.floored > 0)
      .map((c: any) => {
        const newAvg = (c.oldQty * c.oldAvg) / c.floored;
        return {
          id: c.lot.id,
          qty: String(c.floored),
          avgPrice: String(Number(newAvg.toFixed(4))),
        };
      });
    const removals = lotCalcs.filter((c: any) => c.floored <= 0).map((c: any) => c.lot.id);
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
    onApply(updates, actionLog, removals);
  };

  return (
    <Modal title={`Corporate Action — ${group.base}`} onClose={onClose}>
      <Field label="Action Type">
        <div style={{ display: "flex", gap: 10 }}>
          {(["split", "bonus"] as const).map((t) => (
            <button
              key={t}
              type="button"
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: `1.5px solid ${type === t ? THEME.accent : THEME.line}`,
                background: type === t ? THEME.accent : "transparent",
                color: type === t ? THEME.darkInk : THEME.ink,
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={() => {
                setType(t);
                if (t === "bonus") {
                  setRatioN("1");
                  setRatioM("1");
                } else {
                  setRatioN("2");
                  setRatioM("1");
                }
              }}
            >
              {t === "split" ? "Stock Split" : "Bonus Issue"}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Corporate Action Date">
        <input
          style={inputStyle}
          type="date"
          max={today()}
          value={actionDate}
          onChange={(e) => setActionDate(e.target.value)}
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "end" }}>
        <Field label={type === "split" ? "New Shares" : "Bonus Shares"}>
          <input
            style={inputStyle}
            type="number"
            min="1"
            value={ratioN}
            onChange={(e) => setRatioN(e.target.value)}
          />
        </Field>
        <div style={{ paddingBottom: 10, fontWeight: 700, fontSize: 20, color: THEME.muted, textAlign: "center" }}>:</div>
        <Field label="Existing Shares">
          <input
            style={inputStyle}
            type="number"
            min="1"
            value={ratioM}
            onChange={(e) => setRatioM(e.target.value)}
          />
        </Field>
      </div>

      {isValid && newTotalQty > 0 && (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface-1)", border: `1px solid ${THEME.line}`, marginTop: 8, fontSize: 13 }}>
          <div>
            Total Qty: <span style={{ color: THEME.muted }}>{totalQty}</span> → <b style={{ color: THEME.gold }}>{newTotalQty} shares</b>
          </div>
          <div style={{ marginTop: 4 }}>
            Adjusted Avg Price: <span style={{ color: THEME.muted }}>₹{(totalQty > 0 ? totalInv / totalQty : 0).toFixed(2)}</span> → <b style={{ color: THEME.gold }}>₹{newAvgPreview.toFixed(2)}</b>
          </div>
        </div>
      )}

      <ModalActions
        onSave={handleApply}
        onClose={onClose}
        saveLabel="Apply Action"
        disabled={!isValid || saving}
        loading={saving}
      />
    </Modal>
  );
}

function WishlistModal({ onClose, onSave, initial = null, saving = false }: any) {
  const [f, setF] = useState(
    initial || { name: "", description: "", color: WISHLIST_COLORS[0] }
  );

  const isValid = !!f.name.trim();

  return (
    <Modal title={initial ? "Edit Watchlist" : "Create New Watchlist"} onClose={onClose}>
      <Field label="Watchlist Name">
        <input
          style={inputStyle}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="e.g. High Conviction Bluechips, Growth 2026"
        />
      </Field>

      <Field label="Description (Optional)">
        <input
          style={inputStyle}
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
          placeholder="e.g. Quality compounders on dips"
        />
      </Field>

      <Field label="Theme Color">
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {WISHLIST_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setF({ ...f, color: c })}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: c,
                border: f.color === c ? `3px solid var(--surface-0)` : "none",
                boxShadow: f.color === c ? `0 0 0 2px ${c}` : "none",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      </Field>

      <ModalActions
        onSave={() => isValid && onSave(f)}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Create Watchlist"}
        disabled={!isValid || saving}
        loading={saving}
      />
    </Modal>
  );
}

function WishlistItemModal({ onClose, onSave, initial = null, saving = false }: any) {
  const [f, setF] = useState(
    initial || {
      symbol: "",
      exchange: "NSE",
      targetPrice: "",
      notes: "",
      addedOn: today(),
    }
  );

  const isValid = !!f.symbol.trim();

  return (
    <Modal title={initial ? "Edit Tracked Scrip" : "Add Scrip to Watchlist"} onClose={onClose}>
      {!initial && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 12 }}>
          <Field label="Stock Symbol">
            <input
              style={inputStyle}
              value={f.symbol}
              onChange={(e) =>
                setF({ ...f, symbol: e.target.value.toUpperCase().replace(/\.(NS|BO)$/i, "") })
              }
              placeholder="e.g. TITAN, LT"
            />
          </Field>
          <Field label="Exchange">
            <select
              style={inputStyle}
              value={f.exchange || "NSE"}
              onChange={(e) => setF({ ...f, exchange: e.target.value })}
            >
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
            </select>
          </Field>
        </div>
      )}

      <Field label="Target Buy Price (₹)">
        <input
          style={inputStyle}
          type="number"
          step="0.01"
          value={f.targetPrice}
          onChange={(e) => setF({ ...f, targetPrice: e.target.value })}
          placeholder="e.g. 3200.00"
        />
      </Field>

      <Field label="Notes / Buy Thesis (Optional)">
        <input
          style={inputStyle}
          value={f.notes}
          onChange={(e) => setF({ ...f, notes: e.target.value })}
          placeholder="e.g. Buy on breakout or 200 EMA pullback"
        />
      </Field>

      <ModalActions
        onSave={() => isValid && onSave(f)}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Add to Watchlist"}
        disabled={!isValid || saving}
        loading={saving}
      />
    </Modal>
  );
}
