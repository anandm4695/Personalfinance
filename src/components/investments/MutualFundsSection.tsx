import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  Activity,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  Search,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Calendar,
  Layers,
  Sparkles,
  SlidersHorizontal,
  FileSpreadsheet,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
  Lock,
  Unlock,
  Coins,
  Receipt,
  Tag,
  Filter,
  Check,
  Copy,
  Percent,
  Calculator,
  Grid,
  List,
  Flame,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from "recharts";
import { THEME, PIE_COLORS } from "../../utils/constants";
import { getCurrentFY } from "../../utils/appConstants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Money } from "../ui/Money";
import {
  fmtINRFull,
  today,
  calcXIRR,
  calcCAGR,
  isLongTerm,
  exportArrayToCSV,
  uid,
} from "../../utils/finance";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { StatCard } from "../ui/StatCard";
import { ConfirmDialog } from "../ui/Feedback";
import { MFLogo } from "../ui/BrandLogos";
import { MFCasPanel } from "../tabs/MFCasPanel";

/* ── Valuation Helpers ── */
export const liveMfNav = (m: any, mfMarketData?: Record<string, any>): number => {
  const live = mfMarketData?.[m?.mfCode]?.nav;
  return live !== undefined && live !== null && live !== "" ? Number(live) : Number(m?.currentNav) || 0;
};

export const mfInvestedValue = (m: any): number => {
  const stored = Number(m?.invested ?? m?.investedValue) || 0;
  if (stored > 0) return stored;
  const units = Number(m?.units) || 0;
  const buyNav = Number(m?.buyNav) || 0;
  return units * buyNav;
};

export const mfCurrentValueOf = (
  m: any,
  getLiveNavFn: (m: any) => number
): { value: number; isStale: boolean } => {
  const units = Number(m?.units) || 0;
  const nav = getLiveNavFn(m);
  if (units > 0 && nav > 0) return { value: units * nav, isStale: false };
  return { value: mfInvestedValue(m), isStale: true };
};

/* ── Category Color Palette ── */
export const MF_CATEGORY_COLORS: Record<string, string> = {
  Equity: THEME.accent,
  "Large Cap": THEME.accent,
  "Flexi Cap": THEME.sage,
  "Mid Cap": THEME.gold,
  "Small Cap": THEME.rust,
  ELSS: THEME.violet,
  Index: THEME.cyan,
  Debt: THEME.gold,
  Liquid: THEME.muted,
  Hybrid: THEME.sage,
  International: THEME.pink,
  Other: THEME.muted,
  "Direct Growth": THEME.accent,
  "Direct IDCW": THEME.gold,
  "Regular Growth": THEME.sage,
  "Regular IDCW": THEME.pink,
};

export const getCategoryColor = (cat: string) => {
  if (!cat) return THEME.accent;
  for (const [key, color] of Object.entries(MF_CATEGORY_COLORS)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return THEME.accent;
};

/* ── Common Input Style ── */
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: `1.5px solid ${THEME.line}`,
  background: "var(--surface-0)",
  color: THEME.ink,
  fontSize: 13,
  fontWeight: 600,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s ease",
};

export interface MutualFundsSectionProps {
  items: any[];
  mfSells?: any[];
  addItem: (collection: string, item: any) => Promise<any>;
  removeItem: (collection: string, id: string) => Promise<any>;
  updateItem: (collection: string, id: string, patch: any) => Promise<any>;
  onAdd?: () => void;
  activeProfile?: string;
  mfMarketData?: Record<string, any>;
  fetchMfNavs?: () => void;
  fetchingMfNavs?: boolean;
  mfMarketDataTs?: number | null;
  showToast?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function MutualFundsSection({
  items = [],
  mfSells = [],
  addItem,
  removeItem,
  updateItem,
  onAdd,
  activeProfile = "all",
  mfMarketData,
  fetchMfNavs,
  fetchingMfNavs,
  mfMarketDataTs,
  showToast,
}: MutualFundsSectionProps) {
  const { privacyMode } = usePrivacy();
  const { familyProfiles, mfCategories } = useMasterData();
  const getLiveNav = (m: any) => liveMfNav(m, mfMarketData);

  /* ── Tab Views ── */
  type MFViewType = "holdings" | "analytics" | "terOptimizer" | "taxHarvesting" | "sipSimulator" | "redemptions";
  const [activeTab, setActiveTab] = useState<MFViewType>(() => {
    return (localStorage.getItem("finance_mf_main_view") as MFViewType) || "holdings";
  });
  useEffect(() => {
    localStorage.setItem("finance_mf_main_view", activeTab);
  }, [activeTab]);

  /* ── Holdings Display Mode ── */
  const [layoutMode, setLayoutMode] = useState<"table" | "grid">(() => {
    return (localStorage.getItem("finance_mf_layout") as "table" | "grid") || "table";
  });
  useEffect(() => {
    localStorage.setItem("finance_mf_layout", layoutMode);
  }, [layoutMode]);

  /* ── Filter / Sort / Group State ── */
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState<"all" | "direct" | "regular">("all");
  const [mfSortBy, setMfSortBy] = useState<"value" | "pnl" | "daysGain" | "name" | "units" | "xirr">(() => {
    return (localStorage.getItem("finance_mf_sort") as any) || "value";
  });
  useEffect(() => {
    localStorage.setItem("finance_mf_sort", mfSortBy);
  }, [mfSortBy]);

  const [mfGroupBy, setMfGroupBy] = useState<"none" | "category" | "amc" | "type" | "folio">(() => {
    return (localStorage.getItem("finance_mf_group") as any) || "category";
  });
  useEffect(() => {
    localStorage.setItem("finance_mf_group", mfGroupBy);
  }, [mfGroupBy]);

  /* ── Expanded Rows State ── */
  const [lotExpandedGroups, setLotExpandedGroups] = useState<Set<string>>(new Set());
  const toggleLotExpand = (gKey: string) => {
    setLotExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(gKey)) next.delete(gKey);
      else next.add(gKey);
      return next;
    });
  };

  /* ── Modals State ── */
  const [editMF, setEditMF] = useState<any>(null);
  const [showAddMFModal, setShowAddMFModal] = useState(false);
  const [confirmDeleteLot, setConfirmDeleteLot] = useState<any>(null);
  const [sellMF, setSellMF] = useState<any>(null);
  const [fifoSellMFGroup, setFifoSellMFGroup] = useState<any>(null);
  const [addLotGroup, setAddLotGroup] = useState<any>(null);
  const [showCasImport, setShowCasImport] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);

  /* ── Chart & Live Meta State ── */
  const [mfMeta, setMfMeta] = useState<Record<string, any>>({});
  const [mfChartData, setMfChartData] = useState<Record<string, any[]>>({});
  const [mfChartLoading, setMfChartLoading] = useState<Record<string, boolean>>({});
  const [mfChartError, setMfChartError] = useState<Record<string, string | null>>({});
  const [mfChartPeriod, setMfChartPeriod] = useState<Record<string, string>>({});
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [navError, setNavError] = useState<Record<string, string>>({});

  /* ── Active Items Filter (profile + positive units) ── */
  const activeItems = useMemo(() => {
    let list = (items || []).filter((m: any) => (Number(m.units) || 0) > 0.0001);
    if (activeProfile && activeProfile !== "all") {
      list = list.filter((m: any) => (m.owner || "self") === activeProfile);
    }
    return list;
  }, [items, activeProfile]);

  /* ── Meta Bulk Fetcher on Load ── */
  const mfMetaFetchInFlight = useRef<Set<string>>(new Set());
  useEffect(() => {
    const byCode: Record<string, any[]> = {};
    activeItems.forEach((m: any) => {
      const code = (m?.mfCode || "").trim();
      if (!code || !m?.id || mfMeta[code] || mfMeta[m.id]) return;
      (byCode[code] = byCode[code] || []).push(m);
    });
    Object.entries(byCode).forEach(([code, group]) => {
      if (mfMetaFetchInFlight.current.has(code)) return;
      mfMetaFetchInFlight.current.add(code);
      fetch(`/api/mf-nav?code=${encodeURIComponent(code)}&range=1m`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          const metaEntry = {
            prevNav: data.prevNav,
            navChange: data.navChange,
            navChangePct: data.navChangePct,
            high52: data.high52,
            low52: data.low52,
            navDate: data.date,
            schemeName: data.schemeName,
          };
          setMfMeta((prev) => {
            const next = { ...prev, [code]: metaEntry };
            group.forEach((m: any) => {
              next[m.id] = metaEntry;
            });
            return next;
          });
        })
        .catch(() => {})
        .finally(() => mfMetaFetchInFlight.current.delete(code));
    });
  }, [activeItems]);

  /* ── Chart Fetcher ── */
  const mfFetchInFlight = useRef<Set<string>>(new Set());
  const fetchMFData = async (
    idOrCode: string,
    mfCode: string,
    period: string = "3m",
    forceRetry: boolean = false
  ) => {
    const cleanCode = (mfCode || "").trim();
    if (!cleanCode) return;
    const periodKey = period || "3m";
    const primaryKey = `${cleanCode}__${periodKey}`;
    const aliasKey = idOrCode ? `${idOrCode}__${periodKey}` : primaryKey;

    if (!forceRetry && (mfChartData[primaryKey]?.length || mfChartData[aliasKey]?.length)) {
      return;
    }
    if (mfFetchInFlight.current.has(primaryKey)) return;
    mfFetchInFlight.current.add(primaryKey);

    setMfChartLoading((prev) => ({ ...prev, [primaryKey]: true, [aliasKey]: true }));
    setMfChartError((prev) => ({ ...prev, [primaryKey]: null, [aliasKey]: null }));

    try {
      const res = await fetch(
        `/api/mf-nav?code=${encodeURIComponent(cleanCode)}&range=${encodeURIComponent(periodKey)}`
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg =
          res.status === 429
            ? "Rate limit reached — please retry shortly"
            : errJson?.error || `Failed to load chart (HTTP ${res.status})`;
        setMfChartError((prev) => ({ ...prev, [primaryKey]: errMsg, [aliasKey]: errMsg }));
        return;
      }
      const data = await res.json();
      const metaEntry = {
        prevNav: data.prevNav,
        navChange: data.navChange,
        navChangePct: data.navChangePct,
        high52: data.high52,
        low52: data.low52,
        navDate: data.date,
        schemeName: data.schemeName,
      };

      setMfMeta((prev) => ({
        ...prev,
        [cleanCode]: metaEntry,
        ...(idOrCode ? { [idOrCode]: metaEntry } : {}),
      }));

      const points = Array.isArray(data.chart) ? data.chart : [];
      setMfChartData((prev) => ({
        ...prev,
        [primaryKey]: points,
        [aliasKey]: points,
      }));
      setMfChartError((prev) => ({ ...prev, [primaryKey]: null, [aliasKey]: null }));
    } catch (e: any) {
      const errMsg = e?.message || "Network error loading chart";
      setMfChartError((prev) => ({ ...prev, [primaryKey]: errMsg, [aliasKey]: errMsg }));
    } finally {
      mfFetchInFlight.current.delete(primaryKey);
      setMfChartLoading((prev) => ({ ...prev, [primaryKey]: false, [aliasKey]: false }));
    }
  };

  /* ── Refresh All NAVs ── */
  const refreshAllNavs = async () => {
    const withCode = activeItems.filter((m: any) => (m.mfCode || "").trim());
    if (!withCode.length) return;
    setRefreshingAll(true);
    setNavError({});
    try {
      const byCode: Record<string, any[]> = {};
      withCode.forEach((m: any) => {
        const code = (m.mfCode || "").trim();
        (byCode[code] = byCode[code] || []).push(m);
      });

      const uniqueCodes = Object.keys(byCode);
      const concurrency = 4;
      for (let i = 0; i < uniqueCodes.length; i += concurrency) {
        const chunk = uniqueCodes.slice(i, i + concurrency);
        await Promise.all(
          chunk.map(async (code) => {
            const group = byCode[code];
            const period = mfChartPeriod[code] || mfChartPeriod[group[0]?.id] || "3m";
            try {
              const res = await fetch(
                `/api/mf-nav?code=${encodeURIComponent(code)}&range=${encodeURIComponent(period)}`
              );
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const data = await res.json();
              if (!data.nav) throw new Error("No NAV in response");

              for (const m of group) {
                await updateItem("mutualFunds", m.id, { currentNav: String(data.nav) });
              }

              const metaEntry = {
                prevNav: data.prevNav,
                navChange: data.navChange,
                navChangePct: data.navChangePct,
                high52: data.high52,
                low52: data.low52,
                navDate: data.date,
                schemeName: data.schemeName,
              };

              setMfMeta((prev) => {
                const next = { ...prev, [code]: metaEntry };
                group.forEach((m: any) => {
                  next[m.id] = metaEntry;
                });
                return next;
              });

              if (data.chart?.length) {
                setMfChartData((prev) => {
                  const next = { ...prev, [`${code}__${period}`]: data.chart };
                  group.forEach((m: any) => {
                    next[`${m.id}__${period}`] = data.chart;
                  });
                  return next;
                });
              }
            } catch (e: any) {
              const msg = e.message || "Refresh failed";
              setNavError((prev) => {
                const next = { ...prev, [code]: msg };
                group.forEach((m: any) => {
                  next[m.id] = msg;
                });
                return next;
              });
            }
          })
        );
      }

      if (fetchMfNavs) await fetchMfNavs();
      showToast?.("Mutual Fund NAVs refreshed successfully", "success");
    } catch (err: any) {
      showToast?.(`Refresh finished with some errors: ${err?.message}`, "warning");
    } finally {
      setRefreshingAll(false);
    }
  };

  /* ── Calculations & Aggregate KPIs ── */
  const totalInvested = useMemo(
    () => activeItems.reduce((s: number, m: any) => s + mfInvestedValue(m), 0),
    [activeItems]
  );

  const totalCurrent = useMemo(
    () => activeItems.reduce((s: number, m: any) => s + mfCurrentValueOf(m, getLiveNav).value, 0),
    [activeItems, mfMarketData]
  );

  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const totalDaysPnL = useMemo(() => {
    return activeItems.reduce((s: number, m: any) => {
      const meta = mfMeta[m.id] || (m.mfCode ? mfMeta[m.mfCode] : null);
      if (!meta || meta.navChange == null) return s;
      return s + Number(m.units || 0) * meta.navChange;
    }, 0);
  }, [activeItems, mfMeta]);

  const prevCloseValue = totalCurrent - totalDaysPnL;
  const totalDaysPnLPct = prevCloseValue > 0 ? (totalDaysPnL / prevCloseValue) * 100 : 0;
  const hasDaysPnLData = activeItems.some(
    (m: any) => m?.mfCode && (mfMeta[m.id]?.navChange != null || mfMeta[m.mfCode]?.navChange != null)
  );

  const overallXirr = useMemo(() => {
    try {
      const cashFlows: any[] = [];
      activeItems.forEach((m: any) => {
        const units = Number(m.units) || 0;
        const currentNav = getLiveNav(m);
        const invested = mfInvestedValue(m);
        if (units > 0 && m.buyDate) {
          cashFlows.push({ date: m.buyDate, amount: -invested });
          cashFlows.push({ date: today(), amount: units * currentNav });
        }
      });
      (mfSells || []).forEach((s: any) => {
        const units = Number(s.units) || 0;
        const buyNav = Number(s.buyNav) || 0;
        const sellNav = Number(s.sellNav) || 0;
        if (units > 0 && s.sellDate) {
          if (s.buyDate) cashFlows.push({ date: s.buyDate, amount: -(units * buyNav) });
          cashFlows.push({ date: s.sellDate, amount: units * sellNav });
        }
      });
      return calcXIRR(cashFlows);
    } catch {
      return null;
    }
  }, [activeItems, mfSells, mfMarketData]);

  /* ── Grouping & Folio Aggregation ── */
  interface FolioGroup {
    key: string;
    fundName: string;
    folio: string;
    category: string;
    mfType: string;
    amc: string;
    items: any[];
  }

  const getAmcName = (name: string): string => {
    const n = (name || "").toLowerCase();
    if (n.includes("hdfc")) return "HDFC Mutual Fund";
    if (n.includes("icici") || n.includes("prudential")) return "ICICI Prudential MF";
    if (n.includes("sbi")) return "SBI Mutual Fund";
    if (n.includes("nippon")) return "Nippon India MF";
    if (n.includes("kotak")) return "Kotak Mutual Fund";
    if (n.includes("axis")) return "Axis Mutual Fund";
    if (n.includes("mirae")) return "Mirae Asset MF";
    if (n.includes("uti")) return "UTI Mutual Fund";
    if (n.includes("parag parikh") || n.includes("ppfas")) return "PPFAS Mutual Fund";
    if (n.includes("dsp")) return "DSP Mutual Fund";
    if (n.includes("tata")) return "Tata Mutual Fund";
    if (n.includes("motilal")) return "Motilal Oswal MF";
    if (n.includes("quant")) return "Quant Mutual Fund";
    if (n.includes("bandhan") || n.includes("idfc")) return "Bandhan Mutual Fund";
    if (n.includes("edelweiss")) return "Edelweiss MF";
    if (n.includes("hsbc")) return "HSBC Mutual Fund";
    if (n.includes("invesco")) return "Invesco Mutual Fund";
    if (n.includes("franklin")) return "Franklin Templeton";
    if (n.includes("canara")) return "Canara Robeco MF";
    return "Other AMC";
  };

  const folioGroups = useMemo(() => {
    const groups: Record<string, FolioGroup> = {};
    activeItems.forEach((m: any) => {
      const name = (m.name || m.scheme || "").trim();
      const folio = (m.folioNumber || "").trim();
      const cat = (m.category || m.type || "Equity").trim();
      const mft = (m.mfType || "Direct Growth").trim();
      const amc = getAmcName(name);
      const key = `${name}|||${folio}|||${cat}|||${mft}`;
      if (!groups[key]) {
        groups[key] = { key, fundName: name, folio, category: cat, mfType: mft, amc, items: [] };
      }
      groups[key].items.push(m);
    });
    return groups;
  }, [activeItems]);

  const grpVal = (g: FolioGroup) =>
    g.items.reduce((s: number, m: any) => s + mfCurrentValueOf(m, getLiveNav).value, 0);
  const grpInv = (g: FolioGroup) => g.items.reduce((s: number, m: any) => s + mfInvestedValue(m), 0);
  const grpUnits = (g: FolioGroup) => g.items.reduce((s: number, m: any) => s + (Number(m.units) || 0), 0);

  /* ── Filtered & Sorted Folio Groups ── */
  const filteredSortedGroups = useMemo(() => {
    let list = Object.values(folioGroups);

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) =>
          g.fundName.toLowerCase().includes(q) ||
          g.folio.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q) ||
          g.amc.toLowerCase().includes(q) ||
          g.items.some((m) => (m.mfCode || "").includes(q) || (m.owner || "").toLowerCase().includes(q))
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      list = list.filter((g) => g.category.toLowerCase().includes(categoryFilter.toLowerCase()));
    }

    // Plan filter (Direct vs Regular)
    if (planFilter !== "all") {
      list = list.filter((g) => {
        const isDir = g.mfType.toLowerCase().includes("direct") || g.fundName.toLowerCase().includes("direct");
        return planFilter === "direct" ? isDir : !isDir;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (mfSortBy === "name") return a.fundName.localeCompare(b.fundName);
      if (mfSortBy === "value") return grpVal(b) - grpVal(a);
      if (mfSortBy === "units") return grpUnits(b) - grpUnits(a);
      if (mfSortBy === "pnl") {
        const invA = grpInv(a);
        const invB = grpInv(b);
        const pnlA = invA > 0 ? ((grpVal(a) - invA) / invA) * 100 : 0;
        const pnlB = invB > 0 ? ((grpVal(b) - invB) / invB) * 100 : 0;
        return pnlB - pnlA;
      }
      if (mfSortBy === "daysGain") {
        const getDayChange = (grp: FolioGroup) => {
          return grp.items.reduce((sum, item) => {
            const meta = mfMeta[item.id] || (item.mfCode ? mfMeta[item.mfCode] : null);
            return sum + (meta?.navChange ? Number(item.units || 0) * meta.navChange : 0);
          }, 0);
        };
        return getDayChange(b) - getDayChange(a);
      }
      return 0;
    });

    return list;
  }, [folioGroups, searchQuery, categoryFilter, planFilter, mfSortBy, mfMeta, mfMarketData]);

  /* ── Grouping into Sections (Category, AMC, Type, Folio, None) ── */
  const sectionedGroups = useMemo(() => {
    if (mfGroupBy === "none") {
      return [{ label: "", groups: filteredSortedGroups }];
    }
    const buckets: Record<string, FolioGroup[]> = {};
    const order: string[] = [];

    filteredSortedGroups.forEach((g) => {
      let bucket = "Other";
      if (mfGroupBy === "category") bucket = g.category || "Equity";
      else if (mfGroupBy === "amc") bucket = g.amc || "Other AMC";
      else if (mfGroupBy === "type") bucket = g.mfType || "Direct Growth";
      else if (mfGroupBy === "folio") bucket = g.folio ? `Folio: ${g.folio}` : "No Folio";

      if (!buckets[bucket]) {
        buckets[bucket] = [];
        order.push(bucket);
      }
      buckets[bucket].push(g);
    });

    order.sort((a, b) => {
      const valA = buckets[a].reduce((s, g) => s + grpVal(g), 0);
      const valB = buckets[b].reduce((s, g) => s + grpVal(g), 0);
      return valB - valA;
    });

    return order.map((label) => ({ label, groups: buckets[label] }));
  }, [filteredSortedGroups, mfGroupBy, mfMarketData]);

  /* ── CSV Export Handler ── */
  const handleExportCSV = () => {
    if (!activeItems.length) {
      showToast?.("No mutual fund data to export", "info");
      return;
    }
    const exportData = activeItems.map((m: any) => ({
      "Fund Name": m.name || m.scheme || "",
      Category: m.category || m.type || "Equity",
      "Fund Type": m.mfType || "Direct Growth",
      "Folio Number": m.folioNumber || "",
      "AMFI Code": m.mfCode || "",
      "Buy Date": m.buyDate || "",
      "Buy NAV (₹)": m.buyNav || "",
      Units: m.units || "",
      "Current NAV (₹)": getLiveNav(m) || m.currentNav || "",
      "Invested (₹)": mfInvestedValue(m),
      "Current Value (₹)": mfCurrentValueOf(m, getLiveNav).value,
      Owner: m.owner || "self",
    }));
    exportArrayToCSV(exportData, `mutual_funds_${today()}`);
    showToast?.("Mutual Funds exported to CSV", "success");
  };

  /* ── CAS / CSV Import Handlers ── */
  const handleImport = async (rows: any[], onProgress?: (done: number, total: number) => void) => {
    for (let i = 0; i < rows.length; i++) {
      const { _merge, _delete, id, ...patch } = rows[i];
      if (_merge && id) {
        if (_delete || (patch.units != null && Number(patch.units) <= 0.0001)) {
          await removeItem("mutualFunds", id);
        } else {
          await updateItem("mutualFunds", id, patch);
        }
      } else if (Number(rows[i].units || 0) > 0.0001) {
        await addItem("mutualFunds", rows[i]);
      }
      onProgress?.(i + 1, rows.length);
    }
    showToast?.(`Imported ${rows.length} mutual fund records`, "success");
  };

  /* ── Async Actions: Edit / Sell / FIFO Sell / Add Lot ── */
  const { run: saveMFEdit, loading: savingMFEdit } = useAsyncAction(
    async (id: string, updated: any) => {
      await updateItem("mutualFunds", id, updated);
    },
    {
      onSuccess: () => {
        setEditMF(null);
        showToast?.("Mutual fund updated successfully", "success");
      },
      onError: (e: any) => showToast?.(`Failed to save: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveMFSell, loading: savingMFSell } = useAsyncAction(
    async (mf: any, sellRecord: any, remainingUnits: number) => {
      const sellSaved = await addItem("mfSells", sellRecord);
      if (sellSaved && sellSaved.success === false) {
        throw new Error("Sale record could not be saved.");
      }
      if (remainingUnits <= 0.0001) {
        await removeItem("mutualFunds", mf.id);
      } else {
        const remUnits = Number(remainingUnits.toFixed(4));
        const newInvested = Number(mf.buyNav || 0) * remUnits;
        await updateItem("mutualFunds", mf.id, {
          units: String(remUnits),
          invested: String(newInvested || (Number(mf.invested || 0) * remUnits) / Number(mf.units)),
        });
      }
    },
    {
      onSuccess: () => {
        setSellMF(null);
        showToast?.("Redemption recorded successfully", "success");
      },
      onError: (e: any) => showToast?.(`Failed to save sale: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveFifoSell, loading: savingFifoSell } = useAsyncAction(
    async (group: any, allocs: any[], sellNav: number, sellDate: string) => {
      for (let i = 0; i < allocs.length; i++) {
        const alloc = allocs[i];
        const sellSaved = await addItem("mfSells", {
          id: `mfs-${Date.now()}-${i}`,
          owner: alloc.lot.owner || "self",
          scheme: group.fundName || group.schemeName,
          category: alloc.lot.category || "",
          units: alloc.consume,
          buyNav: alloc.buyNav,
          buyDate: alloc.lot.buyDate || "",
          sellNav,
          sellDate,
          profit: Number(alloc.pnl.toFixed(2)),
        });
        if (sellSaved && sellSaved.success === false) {
          throw new Error(`Sale failed after ${i} lots — remaining lots were not changed.`);
        }
        const remaining = Number(alloc.lot.units) - alloc.consume;
        if (alloc.fullyConsumed || remaining <= 0.0001) {
          await removeItem("mutualFunds", alloc.lot.id);
        } else {
          const remUnits = Number(remaining.toFixed(4));
          const newInvested = Number(alloc.lot.buyNav || 0) * remUnits;
          await updateItem("mutualFunds", alloc.lot.id, {
            units: String(remUnits),
            invested: String(newInvested || (Number(alloc.lot.invested || 0) * remUnits) / Number(alloc.lot.units)),
          });
        }
      }
    },
    {
      onSuccess: () => {
        setFifoSellMFGroup(null);
        showToast?.("FIFO bulk redemption recorded successfully", "success");
      },
      onError: (e: any) => showToast?.(`FIFO sale failed: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveAddLot, loading: savingAddLot } = useAsyncAction(
    async (data: any) => {
      await addItem("mutualFunds", data);
    },
    {
      onSuccess: () => {
        setAddLotGroup(null);
        showToast?.("New lot added successfully", "success");
      },
      onError: (e: any) => showToast?.(`Failed to add lot: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveNewMF, loading: savingNewMF } = useAsyncAction(
    async (data: any) => {
      await addItem("mutualFunds", data);
    },
    {
      onSuccess: () => {
        setShowAddMFModal(false);
        showToast?.("Mutual Fund added successfully", "success");
      },
      onError: (e: any) => showToast?.(`Failed to add mutual fund: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── HERO KPI BANNER ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        <StatCard
          label="Total Invested"
          value={fmtINRFull(totalInvested)}
          numericValue={totalInvested}
          formatValue={fmtINRFull}
          color={THEME.accent}
          icon={<IndianRupee />}
        />
        <StatCard
          label="Current Valuation"
          value={fmtINRFull(totalCurrent)}
          numericValue={totalCurrent}
          formatValue={fmtINRFull}
          color={THEME.sage}
          icon={<TrendingUp />}
        />
        <StatCard
          label="Day's P&L"
          value={
            hasDaysPnLData
              ? `${totalDaysPnL >= 0 ? "+" : ""}${fmtINRFull(totalDaysPnL)} (${totalDaysPnL >= 0 ? "+" : ""}${totalDaysPnLPct.toFixed(2)}%)`
              : "—"
          }
          numericValue={hasDaysPnLData ? totalDaysPnL : undefined}
          formatValue={
            hasDaysPnLData
              ? (n: number) =>
                  `${n >= 0 ? "+" : ""}${fmtINRFull(n)} (${n >= 0 ? "+" : ""}${totalDaysPnLPct.toFixed(2)}%)`
              : undefined
          }
          color={!hasDaysPnLData ? THEME.muted : totalDaysPnL >= 0 ? THEME.sage : THEME.rust}
          icon={<Activity />}
        />
        <StatCard
          label="Overall Returns"
          value={`${totalPnl >= 0 ? "+" : ""}${fmtINRFull(Math.abs(totalPnl))}`}
          numericValue={totalPnl}
          formatValue={(n: number) => `${n >= 0 ? "+" : ""}${fmtINRFull(Math.abs(n))}`}
          color={totalPnl >= 0 ? THEME.sage : THEME.rust}
          icon={totalPnl >= 0 ? <TrendingUp /> : <TrendingDown />}
          sub={`${totalPnl >= 0 ? "+" : ""}${totalPnlPct.toFixed(2)}%`}
        />
        <StatCard
          label="Portfolio XIRR"
          value={overallXirr !== null ? `${overallXirr >= 0 ? "+" : ""}${overallXirr.toFixed(2)}%` : "—"}
          numericValue={overallXirr !== null ? overallXirr : undefined}
          formatValue={overallXirr !== null ? (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%` : undefined}
          color={overallXirr === null ? THEME.muted : overallXirr >= 0 ? THEME.sage : THEME.rust}
          icon={<Sparkles />}
          sub={`${Object.keys(folioGroups).length} schemes · ${activeItems.length} lots`}
        />
      </div>

      {/* ── TOP SUB-VIEW NAVIGATION BAR ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1.5px solid ${THEME.line}`,
          paddingBottom: 8,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
          {[
            { id: "holdings" as const, label: "Holdings & Folios", icon: BarChart3, count: Object.keys(folioGroups).length },
            { id: "analytics" as const, label: "Portfolio Analytics", icon: PieIcon },
            { id: "terOptimizer" as const, label: "TER & Direct Optimizer", icon: Zap },
            { id: "taxHarvesting" as const, label: "Tax & ELSS Lock-in", icon: ShieldCheck },
            { id: "sipSimulator" as const, label: "SIP Growth Simulator", icon: Calculator },
            { id: "redemptions" as const, label: "Realized Redemptions", icon: Receipt, count: (mfSells || []).length },
          ].map(({ id, label, icon: Icon, count }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? "#ffffff" : THEME.muted,
                  background: isActive ? THEME.accent : "transparent",
                  border: `1px solid ${isActive ? THEME.accent : "transparent"}`,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon size={15} />
                <span>{label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "1px 6px",
                      borderRadius: 10,
                      background: isActive ? "rgba(255,255,255,0.25)" : "var(--surface-0)",
                      color: isActive ? "#ffffff" : THEME.muted,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <Button
            variant="accent"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => (onAdd ? onAdd() : setShowAddMFModal(true))}
          >
            Add Mutual Fund
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={13} className={refreshingAll || fetchingMfNavs ? "animate-spin" : ""} />}
            onClick={refreshAllNavs}
            disabled={refreshingAll || fetchingMfNavs}
            title="Refresh latest AMFI NAVs"
          >
            {refreshingAll || fetchingMfNavs ? "Updating…" : "Refresh NAVs"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={13} />}
            onClick={handleExportCSV}
            title="Export portfolio to CSV"
          >
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Upload size={13} />}
            onClick={() => {
              setShowCasImport((v) => !v);
              setShowCsvImport(false);
            }}
            title="Import CAMS/KFintech CAS Statement"
          >
            Import CAS
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<FileSpreadsheet size={13} />}
            onClick={() => {
              setShowCsvImport((v) => !v);
              setShowCasImport(false);
            }}
            title="Import CSV File"
          >
            Import CSV
          </Button>
        </div>
      </div>

      {/* ── CAS & CSV IMPORT DRAWERS ── */}
      {showCasImport && (
        <div style={{ marginBottom: 12 }}>
          <MFCasPanel
            onImport={handleImport}
            onClose={() => setShowCasImport(false)}
            existingFunds={items || []}
            activeProfile={activeProfile}
          />
        </div>
      )}

      {showCsvImport && (
        <div style={{ marginBottom: 12 }}>
          <MFCsvImportModal
            onImport={async (rows: any[]) => {
              try {
                await handleImport(rows);
                setShowCsvImport(false);
              } catch (e: any) {
                showToast?.(`Failed to import CSV: ${e?.message || "Unknown error"}`, "error");
              }
            }}
            onClose={() => setShowCsvImport(false)}
          />
        </div>
      )}

      {/* ── TAB 1: HOLDINGS & FOLIOS ── */}
      {activeTab === "holdings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Quick Category Chips Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {[
              { id: "all", label: "All Funds" },
              { id: "Equity", label: "Equity" },
              { id: "Large Cap", label: "Large Cap" },
              { id: "Flexi Cap", label: "Flexi Cap" },
              { id: "Mid Cap", label: "Mid Cap" },
              { id: "Small Cap", label: "Small Cap" },
              { id: "ELSS", label: "ELSS (Tax Saver)" },
              { id: "Index", label: "Index" },
              { id: "Debt", label: "Debt" },
              { id: "Hybrid", label: "Hybrid" },
            ].map((chip) => {
              const active = categoryFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setCategoryFilter(chip.id)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    border: `1.5px solid ${active ? THEME.accent : THEME.line}`,
                    background: active ? `color-mix(in srgb, ${THEME.accent} 12%, transparent)` : "var(--surface-0)",
                    color: active ? THEME.accent : THEME.muted,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Controls Bar: Search, Group, Sort, Layout Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {/* Search Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--surface-0)",
                border: `1.5px solid ${THEME.line}`,
                borderRadius: 10,
                padding: "6px 12px",
                flex: "1 1 240px",
                maxWidth: 380,
                height: 38,
              }}
            >
              <Search size={15} color={THEME.muted} />
              <input
                type="text"
                placeholder="Search scheme, folio, AMC, code…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 13,
                  color: THEME.ink,
                  width: "100%",
                  fontWeight: 600,
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ background: "transparent", border: "none", color: THEME.muted, cursor: "pointer" }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Group, Sort, Plan Selectors */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* Plan Filter (All, Direct, Regular) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 10,
                  padding: "6px 10px",
                  height: 38,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
                  Plan:
                </span>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value as any)}
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
                  <option value="all">All Plans</option>
                  <option value="direct">Direct Only</option>
                  <option value="regular">Regular Only</option>
                </select>
              </div>

              {/* Group By */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 10,
                  padding: "6px 10px",
                  height: 38,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
                  Group:
                </span>
                <select
                  value={mfGroupBy}
                  onChange={(e) => setMfGroupBy(e.target.value as any)}
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
                  <option value="category">Category</option>
                  <option value="amc">Fund House (AMC)</option>
                  <option value="type">Plan Type</option>
                  <option value="folio">Folio Number</option>
                  <option value="none">Flat (No Grouping)</option>
                </select>
              </div>

              {/* Sort By */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 10,
                  padding: "6px 10px",
                  height: 38,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
                  Sort:
                </span>
                <select
                  value={mfSortBy}
                  onChange={(e) => setMfSortBy(e.target.value as any)}
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
                  <option value="daysGain">Day's Gain</option>
                  <option value="name">Scheme Name (A-Z)</option>
                  <option value="units">Most Units</option>
                </select>
              </div>

              {/* Layout Switcher (Table vs Grid) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 10,
                  padding: 3,
                  height: 38,
                }}
              >
                <button
                  onClick={() => setLayoutMode("table")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "5px 8px",
                    borderRadius: 7,
                    border: "none",
                    background: layoutMode === "table" ? THEME.accent : "transparent",
                    color: layoutMode === "table" ? "#ffffff" : THEME.muted,
                    cursor: "pointer",
                  }}
                  title="Table View"
                >
                  <List size={15} />
                </button>
                <button
                  onClick={() => setLayoutMode("grid")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "5px 8px",
                    borderRadius: 7,
                    border: "none",
                    background: layoutMode === "grid" ? THEME.accent : "transparent",
                    color: layoutMode === "grid" ? "#ffffff" : THEME.muted,
                    cursor: "pointer",
                  }}
                  title="Card Grid View"
                >
                  <Grid size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {filteredSortedGroups.length === 0 ? (
            <Card style={{ textAlign: "center", padding: "48px 24px" }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                  color: THEME.accent,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <BarChart3 size={30} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
                No Mutual Funds Found
              </h3>
              <p style={{ fontSize: 13, color: THEME.muted, maxWidth: 450, margin: "0 auto 20px" }}>
                {searchQuery || categoryFilter !== "all" || planFilter !== "all"
                  ? "No holdings match your current filter and search criteria. Try resetting filters."
                  : "Start tracking your mutual fund portfolio — SIPs, lumpsums, NAVs, and capital gains."}
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                {searchQuery || categoryFilter !== "all" || planFilter !== "all" ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("all");
                      setPlanFilter("all");
                    }}
                  >
                    Reset Filters
                  </Button>
                ) : (
                  <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShowAddMFModal(true)}>
                    Add Mutual Fund
                  </Button>
                )}
              </div>
            </Card>
          ) : layoutMode === "table" ? (
            /* ── TABLE VIEW ── */
            <div
              style={{
                background: "var(--t-card-bg)",
                borderRadius: 16,
                border: `1px solid ${THEME.line}`,
                overflowX: "auto",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--surface-0)" }}>
                    <th style={thStyle(true)}>Scheme / Fund House</th>
                    <th style={thStyle(false, "right")}>Units</th>
                    <th style={thStyle(false, "right")}>Avg NAV</th>
                    <th style={thStyle(false, "right")}>Live NAV</th>
                    <th style={thStyle(false, "right")}>Invested</th>
                    <th style={thStyle(false, "right")}>Current Value</th>
                    <th style={thStyle(false, "right")}>Weight</th>
                    <th style={thStyle(false, "right")}>Day's P&L</th>
                    <th style={thStyle(false, "right", true)}>Total Returns</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionedGroups.map((section) => {
                    const sectionInv = section.groups.reduce((s, g) => s + grpInv(g), 0);
                    const sectionCurr = section.groups.reduce((s, g) => s + grpVal(g), 0);
                    const sectionPnl = sectionCurr - sectionInv;
                    const sectionPnlPct = sectionInv > 0 ? (sectionPnl / sectionInv) * 100 : 0;
                    const dotColor = getCategoryColor(section.label);

                    return (
                      <React.Fragment key={section.label || "__flat__"}>
                        {section.label && (
                          <tr style={{ background: `color-mix(in srgb, ${dotColor} 4%, transparent)` }}>
                            <td
                              colSpan={9}
                              style={{
                                padding: "10px 20px",
                                borderBottom: `2px solid ${`color-mix(in srgb, ${dotColor} 20%, transparent)`}`,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  flexWrap: "wrap",
                                  gap: 8,
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span
                                    style={{
                                      width: 10,
                                      height: 10,
                                      borderRadius: "50%",
                                      background: dotColor,
                                      display: "inline-block",
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 900,
                                      color: THEME.ink,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    {section.label}
                                  </span>
                                  <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                                    ({section.groups.length} {section.groups.length === 1 ? "scheme" : "schemes"})
                                  </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12 }}>
                                  <span style={{ color: THEME.muted }}>
                                    Invested:{" "}
                                    <b style={{ color: THEME.ink }}>
                                      <Money value={sectionInv} variant="full" />
                                    </b>
                                  </span>
                                  <span style={{ color: THEME.muted }}>
                                    Value:{" "}
                                    <b style={{ color: THEME.ink }}>
                                      <Money value={sectionCurr} variant="full" />
                                    </b>
                                  </span>
                                  <span
                                    style={{
                                      fontWeight: 800,
                                      color: sectionPnl >= 0 ? THEME.sage : THEME.rust,
                                    }}
                                  >
                                    {sectionPnl >= 0 ? "+" : ""}
                                    <Money value={sectionPnl} variant="full" /> ({sectionPnlPct >= 0 ? "+" : ""}
                                    {sectionPnlPct.toFixed(2)}%)
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {section.groups.map((grp) => {
                          const isExpanded = lotExpandedGroups.has(grp.key);
                          const totalUnits = grpUnits(grp);
                          const invested = grpInv(grp);
                          const currentVal = grpVal(grp);
                          const pnl = currentVal - invested;
                          const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                          const avgNav = totalUnits > 0 ? invested / totalUnits : 0;
                          const firstLot = grp.items[0];
                          const liveNavVal = getLiveNav(firstLot);
                          const weight = totalCurrent > 0 ? (currentVal / totalCurrent) * 100 : 0;

                          // Day's gain for group
                          const groupDayPnl = grp.items.reduce((s, item) => {
                            const meta = mfMeta[item.id] || (item.mfCode ? mfMeta[item.mfCode] : null);
                            return s + (meta?.navChange ? Number(item.units || 0) * meta.navChange : 0);
                          }, 0);
                          const groupMeta = grp.items
                            .map((m) => mfMeta[m.id] || (m.mfCode ? mfMeta[m.mfCode] : null))
                            .find((m) => m?.navChange != null);

                          // Group XIRR
                          const grpXirr = (() => {
                            try {
                              const cashFlows: any[] = [];
                              grp.items.forEach((m) => {
                                const u = Number(m.units) || 0;
                                const cNav = getLiveNav(m);
                                const inv = mfInvestedValue(m);
                                if (u > 0 && m.buyDate) {
                                  cashFlows.push({ date: m.buyDate, amount: -inv });
                                  cashFlows.push({ date: today(), amount: u * cNav });
                                }
                              });
                              (mfSells || [])
                                .filter((s) => (s.scheme || "").toLowerCase() === grp.fundName.toLowerCase())
                                .forEach((s) => {
                                  const u = Number(s.units) || 0;
                                  if (u > 0 && s.sellDate) {
                                    if (s.buyDate) cashFlows.push({ date: s.buyDate, amount: -(u * Number(s.buyNav || 0)) });
                                    cashFlows.push({ date: s.sellDate, amount: u * Number(s.sellNav || 0) });
                                  }
                                });
                              return calcXIRR(cashFlows);
                            } catch {
                              return null;
                            }
                          })();

                          return (
                            <React.Fragment key={grp.key}>
                              {/* Main Scheme Row */}
                              <tr
                                onClick={() => toggleLotExpand(grp.key)}
                                style={{
                                  cursor: "pointer",
                                  background: isExpanded
                                    ? `color-mix(in srgb, ${THEME.accent} 5%, transparent)`
                                    : "transparent",
                                  transition: "background 0.15s ease",
                                  borderBottom: `1px solid ${THEME.line}`,
                                }}
                              >
                                <td style={{ ...tdStyle(), paddingLeft: 20 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <span
                                      style={{
                                        color: isExpanded ? THEME.accent : THEME.muted,
                                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                        transition: "transform 0.2s ease",
                                      }}
                                    >
                                      <ChevronDown size={16} />
                                    </span>
                                    <MFLogo fundName={grp.fundName} size={36} />
                                    <div>
                                      <div style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                                        {grp.fundName}
                                      </div>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 6,
                                          marginTop: 3,
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        {grp.folio && (
                                          <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                                            Folio: {grp.folio}
                                          </span>
                                        )}
                                        {grp.category && (
                                          <span
                                            style={{
                                              fontSize: 9,
                                              padding: "1px 6px",
                                              borderRadius: 10,
                                              fontWeight: 700,
                                              background: `color-mix(in srgb, ${getCategoryColor(grp.category)} 10%, transparent)`,
                                              color: getCategoryColor(grp.category),
                                              border: `1px solid ${`color-mix(in srgb, ${getCategoryColor(grp.category)} 20%, transparent)`}`,
                                            }}
                                          >
                                            {grp.category}
                                          </span>
                                        )}
                                        {grp.mfType && (
                                          <span
                                            style={{
                                              fontSize: 9,
                                              padding: "1px 6px",
                                              borderRadius: 10,
                                              fontWeight: 700,
                                              background: "var(--surface-0)",
                                              color: THEME.muted,
                                              border: `1px solid ${THEME.line}`,
                                            }}
                                          >
                                            {grp.mfType}
                                          </span>
                                        )}
                                        <span
                                          style={{
                                            fontSize: 9,
                                            padding: "1px 6px",
                                            borderRadius: 10,
                                            fontWeight: 700,
                                            background: "var(--surface-0)",
                                            color: THEME.muted,
                                            border: `1px solid ${THEME.line}`,
                                          }}
                                        >
                                          {grp.items.length} {grp.items.length === 1 ? "lot" : "lots"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ ...tdStyle("right"), fontWeight: 700 }}>
                                  {totalUnits.toLocaleString("en-IN", { maximumFractionDigits: 3 })}
                                </td>
                                <td style={{ ...tdStyle("right"), fontWeight: 600 }}>
                                  <Prv>₹{avgNav.toFixed(2)}</Prv>
                                </td>
                                <td style={tdStyle("right")}>
                                  <div style={{ fontWeight: 800, color: THEME.ink }}>
                                    {liveNavVal > 0 ? <Prv>₹{liveNavVal.toFixed(2)}</Prv> : "—"}
                                  </div>
                                </td>
                                <td style={{ ...tdStyle("right"), fontWeight: 600 }}>
                                  <Money value={invested} variant="full" />
                                </td>
                                <td style={{ ...tdStyle("right"), fontWeight: 800 }}>
                                  <Money value={currentVal} variant="full" />
                                </td>
                                <td style={{ ...tdStyle("right"), minWidth: 90 }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>
                                      {weight.toFixed(1)}%
                                    </span>
                                    <div
                                      style={{
                                        width: 48,
                                        height: 5,
                                        borderRadius: 3,
                                        background: THEME.line,
                                        overflow: "hidden",
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: `${Math.min(100, weight)}%`,
                                          height: "100%",
                                          background: THEME.accent,
                                          borderRadius: 3,
                                        }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td style={tdStyle("right")}>
                                  {groupMeta?.navChange != null ? (
                                    <>
                                      <div
                                        style={{
                                          fontWeight: 800,
                                          color: groupDayPnl >= 0 ? THEME.sage : THEME.rust,
                                        }}
                                      >
                                        {groupDayPnl >= 0 ? "+" : ""}
                                        <Money value={groupDayPnl} variant="full" />
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 10,
                                          fontWeight: 700,
                                          color: (groupMeta.navChangePct ?? 0) >= 0 ? THEME.sage : THEME.rust,
                                        }}
                                      >
                                        {(groupMeta.navChangePct ?? 0) >= 0 ? "+" : ""}
                                        {Number(groupMeta.navChangePct || 0).toFixed(2)}%
                                      </div>
                                    </>
                                  ) : (
                                    <span style={{ color: THEME.muted }}>—</span>
                                  )}
                                </td>
                                <td style={{ ...tdStyle("right"), paddingRight: 20 }}>
                                  <div style={{ fontWeight: 800, color: pnl >= 0 ? THEME.sage : THEME.rust }}>
                                    {pnl >= 0 ? "+" : ""}
                                    <Money value={pnl} variant="full" />
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: pnlPct >= 0 ? THEME.sage : THEME.rust,
                                    }}
                                  >
                                    {pnlPct >= 0 ? "+" : ""}
                                    {pnlPct.toFixed(2)}%
                                  </div>
                                  {grpXirr !== null && (
                                    <div
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 800,
                                        color: grpXirr >= 0 ? THEME.sage : THEME.rust,
                                        marginTop: 2,
                                      }}
                                    >
                                      {grpXirr >= 0 ? "+" : ""}
                                      {grpXirr.toFixed(1)}% XIRR
                                    </div>
                                  )}
                                </td>
                              </tr>

                              {/* Expanded Drawer */}
                              {isExpanded && (
                                <tr style={{ background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)` }}>
                                  <td colSpan={9} style={{ padding: "20px 24px", borderBottom: `1.5px solid ${THEME.line}` }}>
                                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                                      {/* Left: NAV Trend Chart */}
                                      {firstLot?.mfCode && (
                                        <div style={{ flex: "1 1 340px", minWidth: 280 }}>
                                          <MFNavTrendCard
                                            item={firstLot}
                                            meta={mfMeta[firstLot.id] || mfMeta[firstLot.mfCode]}
                                            chartData={mfChartData}
                                            chartLoading={mfChartLoading}
                                            chartError={mfChartError}
                                            chartPeriod={mfChartPeriod}
                                            setChartPeriod={setMfChartPeriod}
                                            fetchMFData={fetchMFData}
                                            privacyMode={privacyMode}
                                          />
                                        </div>
                                      )}

                                      {/* Right: Lots Table */}
                                      <div style={{ flex: "1.5 1 450px", minWidth: 320 }}>
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            marginBottom: 10,
                                          }}
                                        >
                                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span
                                              style={{
                                                fontSize: 11,
                                                fontWeight: 800,
                                                color: THEME.muted,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
                                              }}
                                            >
                                              Lot Breakdown
                                            </span>
                                            <Badge variant="accent" style={{ fontSize: 10 }}>
                                              {grp.items.length} {grp.items.length === 1 ? "lot" : "lots"}
                                            </Badge>
                                          </div>
                                          <div style={{ display: "flex", gap: 6 }}>
                                            <Button
                                              variant="secondary"
                                              size="sm"
                                              icon={<Plus size={12} />}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setAddLotGroup({
                                                  fundName: grp.fundName,
                                                  folio: grp.folio,
                                                  refLot: { ...grp.items[0], currentNav: liveNavVal },
                                                });
                                              }}
                                            >
                                              Add Lot
                                            </Button>
                                            {grp.items.length > 1 && (
                                              <Button
                                                variant="secondary"
                                                size="sm"
                                                icon={<ArrowDownRight size={12} />}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setFifoSellMFGroup({
                                                    schemeName: grp.fundName + (grp.folio ? ` (${grp.folio})` : ""),
                                                    fundName: grp.fundName,
                                                    lots: grp.items.map((m) => ({ ...m, currentNav: getLiveNav(m) })),
                                                  });
                                                }}
                                                style={{ color: THEME.gold }}
                                              >
                                                Bulk FIFO Sell
                                              </Button>
                                            )}
                                          </div>
                                        </div>

                                        {/* Lots Table */}
                                        <div
                                          style={{
                                            background: "var(--surface-0)",
                                            border: `1px solid ${THEME.line}`,
                                            borderRadius: 12,
                                            overflow: "hidden",
                                          }}
                                        >
                                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                            <thead>
                                              <tr style={{ background: "var(--surface-0)", borderBottom: `1px solid ${THEME.line}` }}>
                                                <th style={subThStyle(true)}>Purchase Date</th>
                                                <th style={subThStyle(false, "right")}>Buy NAV</th>
                                                <th style={subThStyle(false, "right")}>Units</th>
                                                <th style={subThStyle(false, "right")}>Returns</th>
                                                <th style={subThStyle(false, "right")}>Current Value</th>
                                                <th style={subThStyle(false, "right", true)}>Actions</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {grp.items
                                                .slice()
                                                .sort((a, b) => new Date(a.buyDate || 0).getTime() - new Date(b.buyDate || 0).getTime())
                                                .map((lot) => {
                                                  const lotUnits = Number(lot.units) || 0;
                                                  const lotBuyNav = Number(lot.buyNav) || 0;
                                                  const lotLiveNav = getLiveNav(lot);
                                                  const lotInv = mfInvestedValue(lot);
                                                  const lotCurr = lotUnits * lotLiveNav;
                                                  const lotPnl = lotCurr - lotInv;
                                                  const lotPnlPct = lotInv > 0 ? (lotPnl / lotInv) * 100 : 0;
                                                  const days = lot.buyDate
                                                    ? Math.floor((Date.now() - new Date(lot.buyDate).getTime()) / (1000 * 60 * 60 * 24))
                                                    : null;
                                                  const isLTCG = lot.buyDate && isLongTerm(lot.buyDate, today(), 12);
                                                  const cagr =
                                                    lot.buyDate && lotInv > 0 ? calcCAGR(lotInv, lotCurr, lot.buyDate) : null;

                                                  return (
                                                    <tr
                                                      key={lot.id}
                                                      style={{ borderBottom: `1px solid ${THEME.line}` }}
                                                    >
                                                      <td style={{ ...subTdStyle(), paddingLeft: 12 }}>
                                                        <div style={{ fontWeight: 700, color: THEME.ink }}>
                                                          {lot.buyDate
                                                            ? new Date(lot.buyDate + "T00:00:00").toLocaleDateString("en-IN", {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric",
                                                              })
                                                            : "—"}
                                                        </div>
                                                        {days !== null && (
                                                          <span
                                                            style={{
                                                              fontSize: 9,
                                                              fontWeight: 800,
                                                              padding: "1px 6px",
                                                              borderRadius: 4,
                                                              background: isLTCG
                                                                ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)`
                                                                : `color-mix(in srgb, ${THEME.gold} 10%, transparent)`,
                                                              color: isLTCG ? THEME.sage : THEME.gold,
                                                              display: "inline-block",
                                                              marginTop: 2,
                                                            }}
                                                          >
                                                            {isLTCG ? `LTCG · ${(days / 365).toFixed(1)}y` : `STCG · ${days}d`}
                                                          </span>
                                                        )}
                                                      </td>
                                                      <td style={subTdStyle("right")}>
                                                        <Prv>₹{lotBuyNav.toFixed(2)}</Prv>
                                                      </td>
                                                      <td style={{ ...subTdStyle("right"), fontWeight: 700 }}>
                                                        {lotUnits.toLocaleString("en-IN", { maximumFractionDigits: 3 })}
                                                      </td>
                                                      <td style={subTdStyle("right")}>
                                                        <div
                                                          style={{
                                                            fontWeight: 800,
                                                            color: lotPnl >= 0 ? THEME.sage : THEME.rust,
                                                          }}
                                                        >
                                                          {lotPnl >= 0 ? "+" : ""}
                                                          {lotPnlPct.toFixed(1)}%
                                                        </div>
                                                        <div
                                                          style={{
                                                            fontSize: 9,
                                                            color: lotPnl >= 0 ? THEME.sage : THEME.rust,
                                                          }}
                                                        >
                                                          {lotPnl >= 0 ? "+" : ""}
                                                          <Money value={lotPnl} variant="full" />
                                                        </div>
                                                        {cagr !== null && (
                                                          <div
                                                            style={{
                                                              fontSize: 9,
                                                              fontWeight: 800,
                                                              color: cagr >= 12 ? THEME.sage : THEME.gold,
                                                            }}
                                                          >
                                                            {cagr.toFixed(1)}% CAGR
                                                          </div>
                                                        )}
                                                      </td>
                                                      <td style={{ ...subTdStyle("right"), fontWeight: 800 }}>
                                                        <Money value={lotCurr} variant="full" />
                                                      </td>
                                                      <td style={{ ...subTdStyle("right"), paddingRight: 12 }}>
                                                        <div style={{ display: "flex", gap: 3, justifyContent: "flex-end" }}>
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              if (grp.items.length > 1) {
                                                                setFifoSellMFGroup({
                                                                  schemeName: grp.fundName + (grp.folio ? ` (${grp.folio})` : ""),
                                                                  fundName: grp.fundName,
                                                                  lots: grp.items.map((m) => ({ ...m, currentNav: getLiveNav(m) })),
                                                                });
                                                              } else {
                                                                setSellMF({ ...lot, currentNav: lotLiveNav });
                                                              }
                                                            }}
                                                            style={actionBtnStyle(THEME.gold)}
                                                            title="Sell Units"
                                                          >
                                                            <ArrowDownRight size={12} />
                                                          </button>
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              setEditMF(lot);
                                                            }}
                                                            style={actionBtnStyle(THEME.accent)}
                                                            title="Edit Lot"
                                                          >
                                                            <Pencil size={12} />
                                                          </button>
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              setConfirmDeleteLot({ lot, label: grp.fundName });
                                                            }}
                                                            style={actionBtnStyle(THEME.rust)}
                                                            title="Delete Lot"
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
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── GRID CARD VIEW ── */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 16,
              }}
            >
              {filteredSortedGroups.map((grp) => {
                const totalUnits = grpUnits(grp);
                const invested = grpInv(grp);
                const currentVal = grpVal(grp);
                const pnl = currentVal - invested;
                const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                const avgNav = totalUnits > 0 ? invested / totalUnits : 0;
                const liveNavVal = getLiveNav(grp.items[0]);
                const weight = totalCurrent > 0 ? (currentVal / totalCurrent) * 100 : 0;
                const catColor = getCategoryColor(grp.category);

                return (
                  <Card
                    key={grp.key}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 14,
                      padding: 18,
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 14,
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <MFLogo fundName={grp.fundName} size={42} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: THEME.ink,
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={grp.fundName}
                        >
                          {grp.fundName}
                        </h4>
                        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                          {grp.category && (
                            <span
                              style={{
                                fontSize: 9,
                                padding: "1px 6px",
                                borderRadius: 8,
                                fontWeight: 700,
                                background: `color-mix(in srgb, ${catColor} 10%, transparent)`,
                                color: catColor,
                                border: `1px solid ${`color-mix(in srgb, ${catColor} 20%, transparent)`}`,
                              }}
                            >
                              {grp.category}
                            </span>
                          )}
                          {grp.folio && (
                            <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
                              Folio: {grp.folio}
                            </span>
                          )}
                          <span style={{ fontSize: 9, color: THEME.muted, fontWeight: 600 }}>
                            {grp.items.length} {grp.items.length === 1 ? "lot" : "lots"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Valuation Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                        background: "var(--surface-0)",
                        padding: 12,
                        borderRadius: 10,
                        border: `1px solid ${THEME.line}`,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                          Current Value
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink, marginTop: 2 }}>
                          <Money value={currentVal} variant="full" />
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted, marginTop: 1 }}>
                          NAV: <Prv>₹{liveNavVal.toFixed(2)}</Prv>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                          Returns
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 900,
                            color: pnl >= 0 ? THEME.sage : THEME.rust,
                            marginTop: 2,
                          }}
                        >
                          {pnl >= 0 ? "+" : ""}
                          {pnlPct.toFixed(1)}%
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: pnl >= 0 ? THEME.sage : THEME.rust,
                            marginTop: 1,
                          }}
                        >
                          {pnl >= 0 ? "+" : ""}
                          <Money value={pnl} variant="full" />
                        </div>
                      </div>
                    </div>

                    {/* Weight Bar */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: THEME.muted }}>Portfolio Weight</span>
                        <span style={{ fontWeight: 700, color: THEME.ink }}>{weight.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: THEME.line, overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${Math.min(100, weight)}%`,
                            height: "100%",
                            background: THEME.accent,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderTop: `1px solid ${THEME.line}`,
                        paddingTop: 10,
                        gap: 8,
                      }}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Plus size={12} />}
                        onClick={() =>
                          setAddLotGroup({
                            fundName: grp.fundName,
                            folio: grp.folio,
                            refLot: { ...grp.items[0], currentNav: liveNavVal },
                          })
                        }
                      >
                        Add Lot
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<ArrowDownRight size={12} />}
                        onClick={() => {
                          if (grp.items.length > 1) {
                            setFifoSellMFGroup({
                              schemeName: grp.fundName + (grp.folio ? ` (${grp.folio})` : ""),
                              fundName: grp.fundName,
                              lots: grp.items.map((m) => ({ ...m, currentNav: getLiveNav(m) })),
                            });
                          } else {
                            setSellMF({ ...grp.items[0], currentNav: liveNavVal });
                          }
                        }}
                        style={{ color: THEME.gold }}
                      >
                        Sell
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: PORTFOLIO ANALYTICS ── */}
      {activeTab === "analytics" && (
        <MFAnalyticsView items={activeItems} getLiveNav={getLiveNav} totalCurrent={totalCurrent} />
      )}

      {/* ── TAB 3: TER & DIRECT OPTIMIZER ── */}
      {activeTab === "terOptimizer" && (
        <MFTEROptimizerView items={activeItems} getLiveNav={getLiveNav} />
      )}

      {/* ── TAB 4: TAX & ELSS LOCK-IN HARVESTING ── */}
      {activeTab === "taxHarvesting" && (
        <MFTaxHarvestingView items={activeItems} getLiveNav={getLiveNav} />
      )}

      {/* ── TAB 5: SIP SIMULATOR ── */}
      {activeTab === "sipSimulator" && <MFSIPSimulatorView />}

      {/* ── TAB 6: REALIZED REDEMPTIONS LEDGER ── */}
      {activeTab === "redemptions" && (
        <MFRedemptionsLedgerView mfSells={mfSells || []} />
      )}

      {/* ── MODALS ── */}
      {/* 1. Add Mutual Fund Modal */}
      {showAddMFModal && (
        <AddMFModal
          onClose={() => setShowAddMFModal(false)}
          onSave={saveNewMF}
          saving={savingNewMF}
          activeProfile={activeProfile}
          familyProfiles={familyProfiles}
          mfCategories={mfCategories}
        />
      )}

      {/* 2. Edit Mutual Fund Modal */}
      {editMF && (
        <EditMFModal
          mf={editMF}
          onClose={() => setEditMF(null)}
          onSave={(updated: any) => saveMFEdit(editMF.id, updated)}
          saving={savingMFEdit}
          activeProfile={activeProfile}
          familyProfiles={familyProfiles}
          mfCategories={mfCategories}
        />
      )}

      {/* 3. Add Lot Modal */}
      {addLotGroup && (
        <AddLotMFModal
          group={addLotGroup}
          onClose={() => setAddLotGroup(null)}
          onSave={saveAddLot}
          saving={savingAddLot}
        />
      )}

      {/* 4. Single Lot Sell Modal */}
      {sellMF && (
        <SellMFModal
          mf={sellMF}
          onClose={() => setSellMF(null)}
          onSave={(mf: any, sellRecord: any, remainingUnits: number) =>
            saveMFSell(mf, sellRecord, remainingUnits)
          }
          saving={savingMFSell}
        />
      )}

      {/* 5. Bulk FIFO Sell Modal */}
      {fifoSellMFGroup && (
        <FifoSellMFModal
          group={fifoSellMFGroup}
          onClose={() => setFifoSellMFGroup(null)}
          onSave={(group: any, allocs: any[], sellNav: number, sellDate: string) =>
            saveFifoSell(group, allocs, sellNav, sellDate)
          }
          saving={savingFifoSell}
        />
      )}

      {/* 6. Confirm Delete Dialog */}
      {confirmDeleteLot && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Mutual Fund Lot?"
          message={`Are you sure you want to delete this lot of ${confirmDeleteLot.label}? This action cannot be undone.`}
          confirmLabel="Delete Lot"
          variant="danger"
          onConfirm={() => {
            removeItem("mutualFunds", confirmDeleteLot.lot.id);
            setConfirmDeleteLot(null);
            showToast?.("Lot deleted", "info");
          }}
          onCancel={() => setConfirmDeleteLot(null)}
        />
      )}
    </div>
  );
}

/* ── SUB-COMPONENT: PORTFOLIO ANALYTICS VIEW ── */
function MFAnalyticsView({ items, getLiveNav, totalCurrent }: any) {
  // Category Breakdown
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((m: any) => {
      const cat = m.category || "Equity";
      const val = mfCurrentValueOf(m, getLiveNav).value;
      map[cat] = (map[cat] || 0) + val;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, pct: totalCurrent > 0 ? (value / totalCurrent) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [items, totalCurrent, getLiveNav]);

  // Plan Type Breakdown (Direct vs Regular)
  const planData = useMemo(() => {
    let direct = 0;
    let regular = 0;
    items.forEach((m: any) => {
      const val = mfCurrentValueOf(m, getLiveNav).value;
      const isDir = (m.mfType || "").toLowerCase().includes("direct") || (m.name || "").toLowerCase().includes("direct");
      if (isDir) direct += val;
      else regular += val;
    });
    return [
      { name: "Direct Plan", value: direct, pct: totalCurrent > 0 ? (direct / totalCurrent) * 100 : 0, color: THEME.sage },
      { name: "Regular Plan", value: regular, pct: totalCurrent > 0 ? (regular / totalCurrent) * 100 : 0, color: THEME.gold },
    ].filter((p) => p.value > 0);
  }, [items, totalCurrent, getLiveNav]);

  // AMC Concentration Breakdown
  const amcData = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((m: any) => {
      const val = mfCurrentValueOf(m, getLiveNav).value;
      const name = m.name || m.scheme || "";
      let amc = "Other AMC";
      if (name.includes("HDFC")) amc = "HDFC MF";
      else if (name.includes("ICICI") || name.includes("Prudential")) amc = "ICICI Pru MF";
      else if (name.includes("SBI")) amc = "SBI MF";
      else if (name.includes("Nippon")) amc = "Nippon India";
      else if (name.includes("Kotak")) amc = "Kotak MF";
      else if (name.includes("Axis")) amc = "Axis MF";
      else if (name.includes("Mirae")) amc = "Mirae Asset";
      else if (name.includes("Parag Parikh") || name.includes("PPFAS")) amc = "PPFAS MF";
      else if (name.includes("Quant")) amc = "Quant MF";
      else if (name.includes("UTI")) amc = "UTI MF";
      map[amc] = (map[amc] || 0) + val;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, pct: totalCurrent > 0 ? (value / totalCurrent) * 100 : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [items, totalCurrent, getLiveNav]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
      {/* Category Allocation Donut */}
      <Card style={{ padding: 20 }}>
        <h4 style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, marginBottom: 16 }}>
          Category Asset Allocation
        </h4>
        <div style={{ height: 220, position: "relative" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={3}
              >
                {categoryData.map((entry, idx) => (
                  <Cell key={entry.name} fill={getCategoryColor(entry.name) || PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Value"]}
                contentStyle={{ background: "var(--surface-0)", border: `1px solid ${THEME.line}`, borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
          {categoryData.slice(0, 5).map((cat) => (
            <div key={cat.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: getCategoryColor(cat.name) }} />
                <span style={{ color: THEME.ink, fontWeight: 600 }}>{cat.name}</span>
              </div>
              <span style={{ fontWeight: 800, color: THEME.ink }}>
                <Money value={cat.value} variant="full" /> ({cat.pct.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Plan Type Split */}
      <Card style={{ padding: 20 }}>
        <h4 style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, marginBottom: 16 }}>
          Direct vs Regular Plan Adoption
        </h4>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={planData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={85} paddingAngle={4}>
                {planData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Value"]}
                contentStyle={{ background: "var(--surface-0)", border: `1px solid ${THEME.line}`, borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {planData.map((p) => (
            <div key={p.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                <span style={{ color: THEME.ink, fontWeight: 700 }}>{p.name}</span>
              </div>
              <span style={{ fontWeight: 800, color: THEME.ink }}>
                <Money value={p.value} variant="full" /> ({p.pct.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* AMC Concentration */}
      <Card style={{ padding: 20, gridColumn: "1 / -1" }}>
        <h4 style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, marginBottom: 16 }}>
          Fund House (AMC) Concentration Exposure
        </h4>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={amcData} layout="vertical" margin={{ left: 80, right: 30, top: 10, bottom: 10 }}>
              <XAxis type="number" tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: THEME.ink }} />
              <Tooltip
                formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Valuation"]}
                contentStyle={{ background: "var(--surface-0)", border: `1px solid ${THEME.line}`, borderRadius: 8 }}
              />
              <Bar dataKey="value" fill={THEME.accent} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

/* ── SUB-COMPONENT: TER & DIRECT OPTIMIZER VIEW ── */
function MFTEROptimizerView({ items, getLiveNav }: any) {
  const getExpenseInfo = (name: string, mfType: string, category: string) => {
    const nameLC = (name || "").toLowerCase();
    const typeLC = (mfType || "").toLowerCase();
    const catLC = (category || "").toLowerCase();

    const isDirect = nameLC.includes("direct") || typeLC.includes("direct");
    const planType = isDirect ? "Direct" : "Regular";
    const isDebt = catLC.includes("debt") || catLC.includes("liquid") || catLC.includes("gilt");
    const assetType = isDebt ? "Debt" : "Equity";

    let expenseRatio = 0.01;
    if (planType === "Direct" && assetType === "Equity") expenseRatio = 0.005;
    else if (planType === "Direct" && assetType === "Debt") expenseRatio = 0.002;
    else if (planType === "Regular" && assetType === "Equity") expenseRatio = 0.015;
    else expenseRatio = 0.01;

    return { planType, assetType, expenseRatio };
  };

  const fundAnalysis = useMemo(() => {
    return items
      .map((m: any) => {
        const name = m.name || m.scheme || "";
        const units = Number(m.units) || 0;
        const nav = getLiveNav(m);
        const currentValue = units * nav;
        const { planType, assetType, expenseRatio } = getExpenseInfo(name, m.mfType || "", m.category || "");
        const annualCost = currentValue * expenseRatio;
        const directRatio = planType === "Regular" ? (assetType === "Equity" ? 0.005 : 0.002) : null;
        const directCost = directRatio !== null ? currentValue * directRatio : null;
        const annualSaving = directCost !== null ? annualCost - directCost : 0;

        return { name, currentValue, planType, assetType, expenseRatio, annualCost, directRatio, annualSaving };
      })
      .filter((f: any) => f.currentValue > 0);
  }, [items, getLiveNav]);

  const totalAnnualCost = fundAnalysis.reduce((s: number, f: any) => s + f.annualCost, 0);
  const totalAnnualSaving = fundAnalysis.reduce((s: number, f: any) => s + f.annualSaving, 0);
  const regularFunds = fundAnalysis.filter((f: any) => f.planType === "Regular");
  const directFunds = fundAnalysis.filter((f: any) => f.planType === "Direct");

  const compoundSaving = (annual: number, years: number) => {
    if (annual <= 0) return 0;
    const rate = 0.12;
    let savings = 0;
    for (let y = 0; y < years; y++) {
      savings = (savings + annual) * (1 + rate);
    }
    return savings;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Top Banner Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <StatCard
          label="Total Annual TER Drag"
          value={fmtINRFull(totalAnnualCost)}
          numericValue={totalAnnualCost}
          formatValue={fmtINRFull}
          color={THEME.rust}
          icon={<Zap />}
        />
        <StatCard
          label="Regular Plans"
          value={String(regularFunds.length)}
          color={THEME.gold}
          icon={<AlertTriangle />}
          sub="Paying distributor commissions"
        />
        <StatCard
          label="Direct Plans"
          value={String(directFunds.length)}
          color={THEME.sage}
          icon={<CheckCircle2 />}
          sub="Zero distributor commission"
        />
        <StatCard
          label="Annual Savings by Switching"
          value={fmtINRFull(totalAnnualSaving)}
          numericValue={totalAnnualSaving}
          formatValue={fmtINRFull}
          color={THEME.accent}
          icon={<Sparkles />}
          sub="Direct plan advantage"
        />
      </div>

      {/* 10, 20, 30 Year Compounding Projection */}
      {totalAnnualSaving > 0 && (
        <Card style={{ padding: 20, background: `color-mix(in srgb, ${THEME.sage} 4%, transparent)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Sparkles size={18} color={THEME.sage} />
            <h4 style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, margin: 0 }}>
              Potential Compounded Wealth Lost to Regular Plan Expense Ratios (at 12% CAGR)
            </h4>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[10, 20, 30].map((yrs) => (
              <div
                key={yrs}
                style={{
                  textAlign: "center",
                  padding: "14px 12px",
                  borderRadius: 10,
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
                  Over {yrs} Years
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: THEME.sage, marginTop: 4 }}>
                  <Money value={compoundSaving(totalAnnualSaving, yrs)} variant="full" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Per-Fund Table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.line}` }}>
          <h4 style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, margin: 0 }}>
            Per-Fund Expense Breakdown & Direct Switch Recommendations
          </h4>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--surface-0)", borderBottom: `1px solid ${THEME.line}` }}>
                <th style={thStyle(true)}>Scheme</th>
                <th style={thStyle(false, "right")}>Current Valuation</th>
                <th style={thStyle(false, "center")}>Plan Type</th>
                <th style={thStyle(false, "right")}>Est. TER</th>
                <th style={thStyle(false, "right")}>Annual Cost</th>
                <th style={thStyle(false, "right", true)}>Potential Annual Saving</th>
              </tr>
            </thead>
            <tbody>
              {fundAnalysis.map((f: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                  <td style={{ ...tdStyle(), paddingLeft: 20, fontWeight: 700, color: THEME.ink }}>{f.name}</td>
                  <td style={tdStyle("right")}>
                    <Money value={f.currentValue} variant="full" />
                  </td>
                  <td style={tdStyle("center")}>
                    <Badge variant={f.planType === "Direct" ? "success" : "warning"}>{f.planType}</Badge>
                  </td>
                  <td style={tdStyle("right")}>{(f.expenseRatio * 100).toFixed(2)}%</td>
                  <td style={{ ...tdStyle("right"), color: THEME.rust, fontWeight: 700 }}>
                    <Money value={f.annualCost} variant="full" />
                  </td>
                  <td style={{ ...tdStyle("right"), paddingRight: 20 }}>
                    {f.annualSaving > 0 ? (
                      <span style={{ color: THEME.sage, fontWeight: 800 }}>
                        +<Money value={f.annualSaving} variant="full" />/yr
                      </span>
                    ) : (
                      <span style={{ color: THEME.muted }}>Optimized (Direct)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ── SUB-COMPONENT: TAX & ELSS LOCK-IN HARVESTING VIEW ── */
function MFTaxHarvestingView({ items, getLiveNav }: any) {
  // ELSS Lots Calculation
  const elssLots = useMemo(() => {
    const list: any[] = [];
    items.forEach((m: any) => {
      const cat = (m.category || "").toLowerCase();
      const name = (m.name || m.scheme || "").toLowerCase();
      if (cat.includes("elss") || cat.includes("tax") || name.includes("elss") || name.includes("tax saver")) {
        const buyDate = m.buyDate ? new Date(m.buyDate + "T00:00:00") : null;
        let unlockDate: Date | null = null;
        let isUnlocked = false;
        let daysLeft = 0;
        if (buyDate) {
          unlockDate = new Date(buyDate);
          unlockDate.setFullYear(unlockDate.getFullYear() + 3);
          const diff = unlockDate.getTime() - Date.now();
          daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
          isUnlocked = daysLeft <= 0;
        }
        const units = Number(m.units) || 0;
        const nav = getLiveNav(m);
        const currVal = units * nav;
        const inv = mfInvestedValue(m);
        const pnl = currVal - inv;

        list.push({
          id: m.id,
          scheme: m.name || m.scheme,
          buyDate: m.buyDate,
          unlockDate: unlockDate ? unlockDate.toISOString().slice(0, 10) : "—",
          units,
          inv,
          currVal,
          pnl,
          isUnlocked,
          daysLeft: Math.max(0, daysLeft),
        });
      }
    });
    return list.sort((a, b) => (a.daysLeft || 0) - (b.daysLeft || 0));
  }, [items, getLiveNav]);

  const totalElssVal = elssLots.reduce((s, l) => s + l.currVal, 0);
  const unlockedElssVal = elssLots.filter((l) => l.isUnlocked).reduce((s, l) => s + l.currVal, 0);

  // LTCG vs STCG Breakdown across entire equity portfolio
  const taxSummary = useMemo(() => {
    let equityLtcg = 0;
    let equityStcg = 0;
    items.forEach((m: any) => {
      const u = Number(m.units) || 0;
      const nav = getLiveNav(m);
      const curr = u * nav;
      const inv = mfInvestedValue(m);
      const gain = curr - inv;
      if (gain > 0 && m.buyDate) {
        if (isLongTerm(m.buyDate, today(), 12)) equityLtcg += gain;
        else equityStcg += gain;
      }
    });
    return { equityLtcg, equityStcg };
  }, [items, getLiveNav]);

  const LTCG_EXEMPTION_LIMIT = 125000; // Revised ₹1.25L exemption (Budget 2024 / FY 2024-25+)
  const ltcgTaxable = Math.max(0, taxSummary.equityLtcg - LTCG_EXEMPTION_LIMIT);
  const estLtcgTax = ltcgTaxable * 0.125; // 12.5% LTCG
  const estStcgTax = taxSummary.equityStcg * 0.20; // 20% STCG

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Top Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <StatCard
          label="Unrealized LTCG (Equity)"
          value={fmtINRFull(taxSummary.equityLtcg)}
          numericValue={taxSummary.equityLtcg}
          formatValue={fmtINRFull}
          color={THEME.sage}
          icon={<TrendingUp />}
          sub={`Exemption: ₹1.25L / FY`}
        />
        <StatCard
          label="Tax-Free LTCG Available"
          value={fmtINRFull(Math.min(LTCG_EXEMPTION_LIMIT, taxSummary.equityLtcg))}
          numericValue={Math.min(LTCG_EXEMPTION_LIMIT, taxSummary.equityLtcg)}
          formatValue={fmtINRFull}
          color={THEME.accent}
          icon={<ShieldCheck />}
          sub="Harvestable gain at 0% tax"
        />
        <StatCard
          label="Unrealized STCG (Equity)"
          value={fmtINRFull(taxSummary.equityStcg)}
          numericValue={taxSummary.equityStcg}
          formatValue={fmtINRFull}
          color={THEME.gold}
          icon={<Clock />}
          sub="Taxable @ 20%"
        />
        <StatCard
          label="Est. Tax on Full Liquidation"
          value={fmtINRFull(estLtcgTax + estStcgTax)}
          numericValue={estLtcgTax + estStcgTax}
          formatValue={fmtINRFull}
          color={THEME.rust}
          icon={<Receipt />}
          sub={`LTCG @ 12.5% + STCG @ 20%`}
        />
      </div>

      {/* LTCG ₹1.25L Harvesting Progress Tracker */}
      <Card style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Coins size={18} color={THEME.accent} />
            <h4 style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, margin: 0 }}>
              Section 112A LTCG ₹1,25,000 Annual Exemption Meter
            </h4>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>
            <Money value={Math.min(LTCG_EXEMPTION_LIMIT, taxSummary.equityLtcg)} variant="full" /> / ₹1,25,000
          </span>
        </div>
        <div style={{ height: 10, borderRadius: 5, background: THEME.line, overflow: "hidden" }}>
          <div
            style={{
              width: `${Math.min(100, (taxSummary.equityLtcg / LTCG_EXEMPTION_LIMIT) * 100)}%`,
              height: "100%",
              background: taxSummary.equityLtcg >= LTCG_EXEMPTION_LIMIT ? THEME.gold : THEME.sage,
              borderRadius: 5,
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted, marginTop: 6 }}>
          <span>0% Tax Buffer</span>
          <span>
            {taxSummary.equityLtcg >= LTCG_EXEMPTION_LIMIT
              ? `Exceeded by ₹${(taxSummary.equityLtcg - LTCG_EXEMPTION_LIMIT).toLocaleString("en-IN")}`
              : `₹${(LTCG_EXEMPTION_LIMIT - taxSummary.equityLtcg).toLocaleString("en-IN")} tax-free room remaining`}
          </span>
        </div>
      </Card>

      {/* ELSS 3-Year Lock-in Tracker */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${THEME.line}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, margin: 0 }}>
              ELSS (Section 80C) 3-Year Lock-in Schedule
            </h4>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
              Unlocked corpus: <Money value={unlockedElssVal} variant="full" /> of <Money value={totalElssVal} variant="full" />
            </div>
          </div>
          <Badge variant="accent">{elssLots.length} ELSS Lots</Badge>
        </div>
        {elssLots.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center", color: THEME.muted, fontSize: 13 }}>
            No ELSS tax-saver funds found in your portfolio.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-0)", borderBottom: `1px solid ${THEME.line}` }}>
                  <th style={thStyle(true)}>Scheme</th>
                  <th style={thStyle(false, "left")}>Buy Date</th>
                  <th style={thStyle(false, "left")}>Unlock Date</th>
                  <th style={thStyle(false, "right")}>Units</th>
                  <th style={thStyle(false, "right")}>Current Value</th>
                  <th style={thStyle(false, "right", true)}>Lock Status</th>
                </tr>
              </thead>
              <tbody>
                {elssLots.map((lot, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                    <td style={{ ...tdStyle(), paddingLeft: 20, fontWeight: 700, color: THEME.ink }}>{lot.scheme}</td>
                    <td style={tdStyle()}>{lot.buyDate || "—"}</td>
                    <td style={tdStyle()}>{lot.unlockDate}</td>
                    <td style={{ ...tdStyle("right"), fontWeight: 700 }}>{lot.units.toFixed(3)}</td>
                    <td style={{ ...tdStyle("right"), fontWeight: 800 }}>
                      <Money value={lot.currVal} variant="full" />
                    </td>
                    <td style={{ ...tdStyle("right"), paddingRight: 20 }}>
                      {lot.isUnlocked ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                            color: THEME.sage,
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          <Unlock size={12} /> Unlocked
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: `color-mix(in srgb, ${THEME.rust} 10%, transparent)`,
                            color: THEME.rust,
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          <Lock size={12} /> Locked ({lot.daysLeft}d left)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── SUB-COMPONENT: SIP SIMULATOR VIEW ── */
function MFSIPSimulatorView() {
  const [monthlySip, setMonthlySip] = useState(25000);
  const [years, setYears] = useState(15);
  const [cagr, setCagr] = useState(12);
  const [stepUpPct, setStepUpPct] = useState(10);

  const projectionData = useMemo(() => {
    const data: any[] = [];
    const monthlyRate = cagr / 100 / 12;
    let currentMonthly = monthlySip;
    let totalInvested = 0;
    let corpus = 0;

    for (let y = 1; y <= years; y++) {
      for (let m = 1; m <= 12; m++) {
        totalInvested += currentMonthly;
        corpus = (corpus + currentMonthly) * (1 + monthlyRate);
      }
      data.push({
        year: `Yr ${y}`,
        Invested: Math.round(totalInvested),
        Wealth: Math.round(corpus),
        Gain: Math.round(corpus - totalInvested),
      });
      currentMonthly = currentMonthly * (1 + stepUpPct / 100);
    }
    return data;
  }, [monthlySip, years, cagr, stepUpPct]);

  const finalYear = projectionData[projectionData.length - 1] || { Invested: 0, Wealth: 0, Gain: 0 };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
      {/* Simulator Controls */}
      <Card style={{ padding: 20 }}>
        <h4 style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, marginBottom: 16 }}>
          SIP & Step-Up Compounding Controls
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label={`Monthly SIP Amount: ₹${monthlySip.toLocaleString("en-IN")}`}>
            <input
              type="range"
              min={1000}
              max={200000}
              step={1000}
              value={monthlySip}
              onChange={(e) => setMonthlySip(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.accent }}
            />
          </Field>
          <Field label={`Investment Horizon: ${years} Years`}>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.accent }}
            />
          </Field>
          <Field label={`Expected Return: ${cagr}% CAGR`}>
            <input
              type="range"
              min={6}
              max={22}
              step={0.5}
              value={cagr}
              onChange={(e) => setCagr(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.accent }}
            />
          </Field>
          <Field label={`Annual Step-Up: ${stepUpPct}% / yr`}>
            <input
              type="range"
              min={0}
              max={25}
              step={1}
              value={stepUpPct}
              onChange={(e) => setStepUpPct(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.accent }}
            />
          </Field>
        </div>
      </Card>

      {/* Projection Summary Cards & Chart */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div style={simStatStyle(THEME.accent)}>
            <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 800, textTransform: "uppercase" }}>
              Total Invested
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink, marginTop: 4 }}>
              <Money value={finalYear.Invested} variant="full" />
            </div>
          </div>
          <div style={simStatStyle(THEME.sage)}>
            <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 800, textTransform: "uppercase" }}>
              Future Wealth
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: THEME.sage, marginTop: 4 }}>
              <Money value={finalYear.Wealth} variant="full" />
            </div>
          </div>
          <div style={simStatStyle(THEME.gold)}>
            <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 800, textTransform: "uppercase" }}>
              Estimated Returns
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: THEME.gold, marginTop: 4 }}>
              <Money value={finalYear.Gain} variant="full" />
            </div>
          </div>
        </div>

        <Card style={{ padding: 18, height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: THEME.muted }} />
              <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 10, fill: THEME.muted }} />
              <Tooltip
                formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, ""]}
                contentStyle={{ background: "var(--surface-0)", border: `1px solid ${THEME.line}`, borderRadius: 8 }}
              />
              <Area type="monotone" dataKey="Wealth" stroke={THEME.sage} fill={THEME.sage} fillOpacity={0.2} strokeWidth={2} />
              <Area type="monotone" dataKey="Invested" stroke={THEME.accent} fill={THEME.accent} fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

/* ── SUB-COMPONENT: REALIZED REDEMPTIONS LEDGER VIEW ── */
function MFRedemptionsLedgerView({ mfSells }: { mfSells: any[] }) {
  const [fyFilter, setFyFilter] = useState("all");

  const distinctFYs = useMemo(() => {
    const set = new Set<string>();
    mfSells.forEach((s) => {
      if (s.sellDate) {
        const [y, m] = s.sellDate.split("-").map(Number);
        const fy = m >= 4 ? `FY ${y}-${(y + 1) % 100}` : `FY ${y - 1}-${y % 100}`;
        set.add(fy);
      }
    });
    return Array.from(set).sort().reverse();
  }, [mfSells]);

  const filteredSales = useMemo(() => {
    if (fyFilter === "all") return mfSells;
    return mfSells.filter((s) => {
      if (!s.sellDate) return false;
      const [y, m] = s.sellDate.split("-").map(Number);
      const fy = m >= 4 ? `FY ${y}-${(y + 1) % 100}` : `FY ${y - 1}-${y % 100}`;
      return fy === fyFilter;
    });
  }, [mfSells, fyFilter]);

  const totalRealizedGain = filteredSales.reduce((s, x) => s + (Number(x.profit) || 0), 0);
  const totalProceeds = filteredSales.reduce(
    (s, x) => s + (Number(x.units) || 0) * (Number(x.sellNav) || 0),
    0
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={simStatStyle(THEME.sage)}>
            <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
              Total Realized P&L
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: totalRealizedGain >= 0 ? THEME.sage : THEME.rust }}>
              {totalRealizedGain >= 0 ? "+" : ""}
              <Money value={totalRealizedGain} variant="full" />
            </div>
          </div>
          <div style={simStatStyle(THEME.accent)}>
            <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
              Redemption Proceeds
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink }}>
              <Money value={totalProceeds} variant="full" />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              borderRadius: 10,
              padding: "6px 12px",
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
              Financial Year:
            </span>
            <select
              value={fyFilter}
              onChange={(e) => setFyFilter(e.target.value)}
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
              <option value="all">All FYs</option>
              {distinctFYs.map((fy) => (
                <option key={fy} value={fy}>
                  {fy}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Realized Sales Table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {filteredSales.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: THEME.muted, fontSize: 13 }}>
            No realized sales records found for the selected period.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-0)", borderBottom: `1px solid ${THEME.line}` }}>
                  <th style={thStyle(true)}>Scheme</th>
                  <th style={thStyle(false, "left")}>Sell Date</th>
                  <th style={thStyle(false, "left")}>Buy Date</th>
                  <th style={thStyle(false, "right")}>Units</th>
                  <th style={thStyle(false, "right")}>Buy NAV</th>
                  <th style={thStyle(false, "right")}>Sell NAV</th>
                  <th style={thStyle(false, "right", true)}>Realized Profit / Loss</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((s, idx) => {
                  const profit = Number(s.profit) || 0;
                  return (
                    <tr key={s.id || idx} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                      <td style={{ ...tdStyle(), paddingLeft: 20, fontWeight: 700, color: THEME.ink }}>
                        {s.scheme}
                      </td>
                      <td style={tdStyle()}>{s.sellDate || "—"}</td>
                      <td style={tdStyle()}>{s.buyDate || "—"}</td>
                      <td style={{ ...tdStyle("right"), fontWeight: 700 }}>
                        {Number(s.units || 0).toFixed(3)}
                      </td>
                      <td style={tdStyle("right")}>₹{Number(s.buyNav || 0).toFixed(2)}</td>
                      <td style={tdStyle("right")}>₹{Number(s.sellNav || 0).toFixed(2)}</td>
                      <td style={{ ...tdStyle("right"), paddingRight: 20 }}>
                        <span
                          style={{
                            fontWeight: 800,
                            color: profit >= 0 ? THEME.sage : THEME.rust,
                          }}
                        >
                          {profit >= 0 ? "+" : ""}
                          <Money value={profit} variant="full" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── SUB-COMPONENT: NAV TREND CARD ── */
function MFNavTrendCard({
  item,
  meta,
  chartData,
  chartLoading,
  chartError,
  chartPeriod,
  setChartPeriod,
  fetchMFData,
  privacyMode,
}: any) {
  const code = (item?.mfCode || "").trim();
  const period = chartPeriod[code] || chartPeriod[item.id] || "3m";
  const pKey = `${code}__${period}`;
  const points = chartData[pKey] || chartData[`${item.id}__${period}`] || [];
  const loading = chartLoading[pKey] || chartLoading[`${item.id}__${period}`];
  const error = chartError[pKey] || chartError[`${item.id}__${period}`];
  const isUp = points.length > 1 ? points[points.length - 1].p >= points[0].p : true;

  useEffect(() => {
    if (code && !points.length && !loading) {
      fetchMFData(item.id, code, period);
    }
  }, [code, period]);

  return (
    <div
      style={{
        background: "var(--surface-0)",
        border: `1px solid ${THEME.line}`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
          Historical NAV Trend
        </span>
        <div style={{ display: "flex", gap: 3 }}>
          {["1m", "3m", "6m", "1y", "3y", "all"].map((p) => (
            <button
              key={p}
              onClick={() => {
                setChartPeriod((prev: any) => ({ ...prev, [code]: p, [item.id]: p }));
                fetchMFData(item.id, code, p);
              }}
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: "2px 6px",
                borderRadius: 4,
                border: "none",
                background: period === p ? THEME.accent : "transparent",
                color: period === p ? "#ffffff" : THEME.muted,
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 160, position: "relative" }}>
        {loading ? (
          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={18} className="animate-spin" color={THEME.muted} />
          </div>
        ) : points.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id={`mf-grad-${code}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isUp ? THEME.sage : THEME.rust} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={isUp ? THEME.sage : THEME.rust} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                formatter={(v: any) => [privacyMode ? "••••" : `₹${Number(v).toFixed(2)}`, "NAV"]}
                contentStyle={{ background: "var(--surface-0)", border: `1px solid ${THEME.line}`, borderRadius: 8, fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="p"
                stroke={isUp ? THEME.sage : THEME.rust}
                strokeWidth={2}
                fill={`url(#mf-grad-${code})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 12, color: THEME.muted }}>
            {error || "Historical NAV unavailable for this AMFI code"}
          </div>
        )}
      </div>

      {meta && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted, marginTop: 8, borderTop: `1px solid ${THEME.line}`, paddingTop: 6 }}>
          <span>Prev NAV: <b>₹{Number(meta.prevNav || 0).toFixed(2)}</b></span>
          {meta.high52 && (
            <span>52W: <b style={{ color: THEME.sage }}>₹{meta.high52}</b> / <b style={{ color: THEME.rust }}>₹{meta.low52}</b></span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── MODALS IMPLEMENTATIONS ── */

// 1. Add Mutual Fund Modal
function AddMFModal({ onClose, onSave, saving, activeProfile, familyProfiles, mfCategories }: any) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Large Cap");
  const [mfType, setMfType] = useState("Direct Growth");
  const [folioNumber, setFolioNumber] = useState("");
  const [mfCode, setMfCode] = useState("");
  const [buyDate, setBuyDate] = useState(today());
  const [buyNav, setBuyNav] = useState("");
  const [units, setUnits] = useState("");
  const [currentNav, setCurrentNav] = useState("");
  const [owner, setOwner] = useState(activeProfile !== "all" ? activeProfile : "self");

  const autoInvested = Number(units || 0) * Number(buyNav || 0);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: uid(),
      name: name.trim(),
      category,
      mfType,
      folioNumber: folioNumber.trim(),
      mfCode: mfCode.trim(),
      buyDate,
      buyNav: String(buyNav),
      units: String(units),
      currentNav: currentNav ? String(currentNav) : String(buyNav),
      invested: String(autoInvested),
      owner,
    });
  };

  return (
    <Modal title="Add Mutual Fund Holding" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Scheme / Fund Name *">
          <input
            style={inputStyle}
            placeholder="e.g. Parag Parikh Flexi Cap Fund - Direct Plan"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Category">
            <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
              {mfCategories.map((c: string) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plan & Dividend Type">
            <select style={inputStyle} value={mfType} onChange={(e) => setMfType(e.target.value)}>
              <option>Direct Growth</option>
              <option>Direct IDCW</option>
              <option>Regular Growth</option>
              <option>Regular IDCW</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Folio Number">
            <input
              style={inputStyle}
              placeholder="e.g. 1029384756"
              value={folioNumber}
              onChange={(e) => setFolioNumber(e.target.value)}
            />
          </Field>
          <Field label="AMFI Code (for live NAV)">
            <input
              style={inputStyle}
              placeholder="e.g. 122639"
              value={mfCode}
              onChange={(e) => setMfCode(e.target.value)}
            />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Purchase Date">
            <input type="date" style={inputStyle} value={buyDate} onChange={(e) => setBuyDate(e.target.value)} />
          </Field>
          <Field label="Buy NAV (₹)">
            <input
              type="number"
              step="any"
              style={inputStyle}
              placeholder="65.42"
              value={buyNav}
              onChange={(e) => setBuyNav(e.target.value)}
            />
          </Field>
          <Field label="Units Purchased">
            <input
              type="number"
              step="any"
              style={inputStyle}
              placeholder="152.84"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
            />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Current NAV (optional)">
            <input
              type="number"
              step="any"
              style={inputStyle}
              placeholder="Leave blank to use Buy NAV"
              value={currentNav}
              onChange={(e) => setCurrentNav(e.target.value)}
            />
          </Field>
          <Field label="Owner Profile">
            <select style={inputStyle} value={owner} onChange={(e) => setOwner(e.target.value)}>
              {familyProfiles.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {formatProfileOption(p)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {autoInvested > 0 && (
          <div style={{ fontSize: 12, color: THEME.muted, textAlign: "right" }}>
            Total Invested: <b style={{ color: THEME.ink }}>₹{autoInvested.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</b>
          </div>
        )}
      </div>
      <ModalActions>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="accent" onClick={handleSave} disabled={saving || !name.trim() || !buyNav || !units}>
          {saving ? "Saving…" : "Save Mutual Fund"}
        </Button>
      </ModalActions>
    </Modal>
  );
}

// 2. Edit Mutual Fund Modal
function EditMFModal({ mf, onClose, onSave, saving, familyProfiles, mfCategories }: any) {
  const [name, setName] = useState(mf?.name || mf?.scheme || "");
  const [category, setCategory] = useState(mf?.category || "Large Cap");
  const [mfType, setMfType] = useState(mf?.mfType || "Direct Growth");
  const [folioNumber, setFolioNumber] = useState(mf?.folioNumber || "");
  const [mfCode, setMfCode] = useState(mf?.mfCode || "");
  const [buyDate, setBuyDate] = useState(mf?.buyDate || today());
  const [buyNav, setBuyNav] = useState(String(mf?.buyNav || ""));
  const [units, setUnits] = useState(String(mf?.units || ""));
  const [currentNav, setCurrentNav] = useState(String(mf?.currentNav || ""));
  const [owner, setOwner] = useState(mf?.owner || "self");

  const autoInvested = Number(units || 0) * Number(buyNav || 0);

  const handleSave = () => {
    onSave({
      name: name.trim(),
      category,
      mfType,
      folioNumber: folioNumber.trim(),
      mfCode: mfCode.trim(),
      buyDate,
      buyNav: String(buyNav),
      units: String(units),
      currentNav: String(currentNav || buyNav),
      invested: String(autoInvested),
      owner,
    });
  };

  return (
    <Modal title="Edit Mutual Fund Holding" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Scheme / Fund Name *">
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Category">
            <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
              {mfCategories.map((c: string) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plan & Dividend Type">
            <select style={inputStyle} value={mfType} onChange={(e) => setMfType(e.target.value)}>
              <option>Direct Growth</option>
              <option>Direct IDCW</option>
              <option>Regular Growth</option>
              <option>Regular IDCW</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Folio Number">
            <input style={inputStyle} value={folioNumber} onChange={(e) => setFolioNumber(e.target.value)} />
          </Field>
          <Field label="AMFI Code">
            <input style={inputStyle} value={mfCode} onChange={(e) => setMfCode(e.target.value)} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Purchase Date">
            <input type="date" style={inputStyle} value={buyDate} onChange={(e) => setBuyDate(e.target.value)} />
          </Field>
          <Field label="Buy NAV (₹)">
            <input type="number" step="any" style={inputStyle} value={buyNav} onChange={(e) => setBuyNav(e.target.value)} />
          </Field>
          <Field label="Units">
            <input type="number" step="any" style={inputStyle} value={units} onChange={(e) => setUnits(e.target.value)} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Current NAV (₹)">
            <input type="number" step="any" style={inputStyle} value={currentNav} onChange={(e) => setCurrentNav(e.target.value)} />
          </Field>
          <Field label="Owner Profile">
            <select style={inputStyle} value={owner} onChange={(e) => setOwner(e.target.value)}>
              {familyProfiles.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {formatProfileOption(p)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      <ModalActions>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="accent" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </ModalActions>
    </Modal>
  );
}

// 3. Add Lot Modal
function AddLotMFModal({ group, onClose, onSave, saving }: any) {
  const ref = group.refLot || {};
  const [buyDate, setBuyDate] = useState(today());
  const [buyNav, setBuyNav] = useState(String(ref.currentNav || ref.buyNav || ""));
  const [units, setUnits] = useState("");

  const autoInvested = Number(units || 0) * Number(buyNav || 0);

  const handleSave = () => {
    onSave({
      id: uid(),
      name: ref.name || ref.scheme,
      category: ref.category,
      mfType: ref.mfType,
      folioNumber: ref.folioNumber,
      mfCode: ref.mfCode,
      buyDate,
      buyNav: String(buyNav),
      units: String(units),
      currentNav: String(ref.currentNav || buyNav),
      invested: String(autoInvested),
      owner: ref.owner || "self",
    });
  };

  return (
    <Modal title={`Add Lot: ${group.fundName}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 13, color: THEME.muted }}>
          Adding lot under <b>{group.fundName}</b> (Folio: {group.folio || "Default"})
        </div>
        <Field label="Purchase Date">
          <input type="date" style={inputStyle} value={buyDate} onChange={(e) => setBuyDate(e.target.value)} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Purchase NAV (₹)">
            <input type="number" step="any" style={inputStyle} value={buyNav} onChange={(e) => setBuyNav(e.target.value)} />
          </Field>
          <Field label="Units Purchased">
            <input type="number" step="any" style={inputStyle} value={units} onChange={(e) => setUnits(e.target.value)} />
          </Field>
        </div>
        {autoInvested > 0 && (
          <div style={{ fontSize: 12, color: THEME.muted, textAlign: "right" }}>
            Total Invested: <b style={{ color: THEME.ink }}>₹{autoInvested.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</b>
          </div>
        )}
      </div>
      <ModalActions>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="accent" onClick={handleSave} disabled={saving || !buyNav || !units}>
          {saving ? "Adding…" : "Add Lot"}
        </Button>
      </ModalActions>
    </Modal>
  );
}

// 4. Single Lot Sell Modal
function SellMFModal({ mf, onClose, onSave, saving }: any) {
  const totalUnits = Number(mf?.units) || 0;
  const [sellUnits, setSellUnits] = useState(String(totalUnits));
  const [sellNav, setSellNav] = useState(String(mf?.currentNav || mf?.buyNav || ""));
  const [sellDate, setSellDate] = useState(today());

  const sUnits = Number(sellUnits) || 0;
  const sNav = Number(sellNav) || 0;
  const proceeds = sUnits * sNav;
  const cost = sUnits * Number(mf?.buyNav || 0);
  const profit = proceeds - cost;
  const remaining = Math.max(0, totalUnits - sUnits);

  const handleSave = () => {
    if (sUnits <= 0 || sNav <= 0) return;
    const sellRecord = {
      id: uid(),
      owner: mf.owner || "self",
      scheme: mf.name || mf.scheme,
      category: mf.category || "",
      units: sUnits,
      buyNav: Number(mf.buyNav || 0),
      buyDate: mf.buyDate || "",
      sellNav: sNav,
      sellDate,
      profit: Number(profit.toFixed(2)),
    };
    onSave(mf, sellRecord, remaining);
  };

  return (
    <Modal title={`Sell Units: ${mf.name || mf.scheme}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={`Units to Sell (Max: ${totalUnits})`}>
            <input
              type="number"
              step="any"
              max={totalUnits}
              style={inputStyle}
              value={sellUnits}
              onChange={(e) => setSellUnits(e.target.value)}
            />
          </Field>
          <Field label="Redemption NAV (₹)">
            <input
              type="number"
              step="any"
              style={inputStyle}
              value={sellNav}
              onChange={(e) => setSellNav(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Redemption Date">
          <input type="date" style={inputStyle} value={sellDate} onChange={(e) => setSellDate(e.target.value)} />
        </Field>
        <div
          style={{
            background: "var(--surface-0)",
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${THEME.line}`,
            fontSize: 12,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: THEME.muted }}>Total Proceeds:</span>
            <b style={{ color: THEME.ink }}>₹{proceeds.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: THEME.muted }}>Realized Gain / Loss:</span>
            <b style={{ color: profit >= 0 ? THEME.sage : THEME.rust }}>
              {profit >= 0 ? "+" : ""}₹{profit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </b>
          </div>
        </div>
      </div>
      <ModalActions>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="accent" onClick={handleSave} disabled={saving || sUnits <= 0 || sUnits > totalUnits || sNav <= 0}>
          {saving ? "Confirming…" : "Confirm Redemption"}
        </Button>
      </ModalActions>
    </Modal>
  );
}

// 5. Bulk FIFO Sell Modal
function FifoSellMFModal({ group, onClose, onSave, saving }: any) {
  const sortedLots = useMemo(() => {
    return [...group.lots].sort(
      (a, b) => new Date(a.buyDate || 0).getTime() - new Date(b.buyDate || 0).getTime()
    );
  }, [group.lots]);

  const totalAvailUnits = sortedLots.reduce((s, l) => s + (Number(l.units) || 0), 0);
  const [sellUnits, setSellUnits] = useState(String(totalAvailUnits));
  const [sellNav, setSellNav] = useState(String(sortedLots[0]?.currentNav || sortedLots[0]?.buyNav || ""));
  const [sellDate, setSellDate] = useState(today());

  const sUnits = Number(sellUnits) || 0;
  const sNav = Number(sellNav) || 0;

  // FIFO Allocation Preview
  const { allocs, totalProfit, totalProceeds } = useMemo(() => {
    let remainingToConsume = sUnits;
    const res: any[] = [];
    let totProfit = 0;
    let totProceeds = 0;

    for (const lot of sortedLots) {
      if (remainingToConsume <= 0) break;
      const lotU = Number(lot.units) || 0;
      const consume = Math.min(lotU, remainingToConsume);
      const buyNav = Number(lot.buyNav) || 0;
      const proceeds = consume * sNav;
      const cost = consume * buyNav;
      const pnl = proceeds - cost;
      totProfit += pnl;
      totProceeds += proceeds;

      res.push({
        lot,
        consume,
        buyNav,
        pnl,
        fullyConsumed: consume >= lotU - 0.0001,
      });

      remainingToConsume -= consume;
    }

    return { allocs: res, totalProfit: totProfit, totalProceeds: totProceeds };
  }, [sortedLots, sUnits, sNav]);

  const handleSave = () => {
    if (sUnits <= 0 || sNav <= 0 || allocs.length === 0) return;
    onSave(group, allocs, sNav, sellDate);
  };

  return (
    <Modal title={`Bulk FIFO Sell: ${group.fundName}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 12, color: THEME.muted }}>
          Sells units strictly from the <b>oldest purchase lot first (FIFO)</b> to ensure accurate Indian capital gains tax (Section 2(42A)).
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={`Units to Sell (Max: ${totalAvailUnits.toFixed(3)})`}>
            <input
              type="number"
              step="any"
              max={totalAvailUnits}
              style={inputStyle}
              value={sellUnits}
              onChange={(e) => setSellUnits(e.target.value)}
            />
          </Field>
          <Field label="Redemption NAV (₹)">
            <input
              type="number"
              step="any"
              style={inputStyle}
              value={sellNav}
              onChange={(e) => setSellNav(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Redemption Date">
          <input type="date" style={inputStyle} value={sellDate} onChange={(e) => setSellDate(e.target.value)} />
        </Field>

        {/* FIFO Allocation Preview Table */}
        <div
          style={{
            border: `1px solid ${THEME.line}`,
            borderRadius: 10,
            overflow: "hidden",
            maxHeight: 180,
            overflowY: "auto",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "var(--surface-0)", borderBottom: `1px solid ${THEME.line}` }}>
                <th style={{ padding: "6px 10px", textAlign: "left" }}>Lot Date</th>
                <th style={{ padding: "6px 10px", textAlign: "right" }}>Units Redeemed</th>
                <th style={{ padding: "6px 10px", textAlign: "right" }}>Buy NAV</th>
                <th style={{ padding: "6px 10px", textAlign: "right" }}>Est. P&L</th>
              </tr>
            </thead>
            <tbody>
              {allocs.map((a, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                  <td style={{ padding: "6px 10px", fontWeight: 600 }}>{a.lot.buyDate}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700 }}>{a.consume.toFixed(3)}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>₹{a.buyNav.toFixed(2)}</td>
                  <td
                    style={{
                      padding: "6px 10px",
                      textAlign: "right",
                      fontWeight: 800,
                      color: a.pnl >= 0 ? THEME.sage : THEME.rust,
                    }}
                  >
                    {a.pnl >= 0 ? "+" : ""}₹{a.pnl.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800 }}>
          <span>Total Proceeds: ₹{totalProceeds.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
          <span style={{ color: totalProfit >= 0 ? THEME.sage : THEME.rust }}>
            Total Gain: {totalProfit >= 0 ? "+" : ""}₹{totalProfit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
      <ModalActions>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="accent" onClick={handleSave} disabled={saving || sUnits <= 0 || sUnits > totalAvailUnits || sNav <= 0}>
          {saving ? "Processing FIFO Sale…" : "Confirm Bulk Sell"}
        </Button>
      </ModalActions>
    </Modal>
  );
}

// 6. CSV Import Modal
function MFCsvImportModal({ onImport, onClose }: any) {
  const [csvText, setCsvText] = useState("");
  const [error, setError] = useState("");

  const handleParseAndImport = () => {
    setError("");
    try {
      const lines = csvText
        .trim()
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#"));
      if (!lines.length) throw new Error("CSV is empty");

      const rows = lines.map((line, idx) => {
        const parts = line.split(",").map((p) => p.replace(/^"|"$/g, "").trim());
        if (parts.length < 3) throw new Error(`Row ${idx + 1}: Needs at least Fund Name, Buy NAV, and Units.`);
        const [name, category, mfType, folioNumber, mfCode, buyDate, buyNav, units, currentNav, owner] = parts;
        return {
          id: uid(),
          name: name || "Mutual Fund",
          category: category || "Equity",
          mfType: mfType || "Direct Growth",
          folioNumber: folioNumber || "",
          mfCode: mfCode || "",
          buyDate: buyDate || today(),
          buyNav: String(Number(buyNav) || 10),
          units: String(Number(units) || 1),
          currentNav: String(Number(currentNav) || Number(buyNav) || 10),
          invested: String((Number(units) || 1) * (Number(buyNav) || 10)),
          owner: owner || "self",
        };
      });

      onImport(rows);
    } catch (e: any) {
      setError(e.message || "Failed to parse CSV");
    }
  };

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h4 style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, margin: 0 }}>Import Mutual Funds via CSV</h4>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>
      <p style={{ fontSize: 12, color: THEME.muted, marginBottom: 10 }}>
        Paste CSV content with columns: <code>Fund Name, Category, Type, Folio Number, AMFI Code, Buy Date, Buy NAV, Units, Current NAV, Owner</code>
      </p>
      <textarea
        rows={6}
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        placeholder={`Parag Parikh Flexi Cap,Flexi Cap,Direct Growth,10293847,122639,2023-01-15,48.50,206.18,72.40,self`}
        style={{
          ...inputStyle,
          fontFamily: "monospace",
          fontSize: 12,
          resize: "vertical",
          marginBottom: 10,
        }}
      />
      {error && <div style={{ fontSize: 12, color: THEME.rust, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="accent" onClick={handleParseAndImport} disabled={!csvText.trim()}>
          Import CSV Rows
        </Button>
      </div>
    </Card>
  );
}

/* ── STYLES ── */
const thStyle = (isFirst = false, align = "left", isLast = false): React.CSSProperties => ({
  textAlign: align as any,
  padding: "11px 12px",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: THEME.muted,
  fontWeight: 800,
  borderBottom: `1.5px solid ${THEME.line}`,
  whiteSpace: "nowrap",
  paddingLeft: isFirst ? 20 : 12,
  paddingRight: isLast ? 20 : 12,
});

const tdStyle = (align = "left"): React.CSSProperties => ({
  padding: "12px 12px",
  verticalAlign: "middle",
  fontSize: 13,
  textAlign: align as any,
  borderBottom: `1px solid ${THEME.line}`,
  fontVariantNumeric: "tabular-nums",
});

const subThStyle = (isFirst = false, align = "left", isLast = false): React.CSSProperties => ({
  textAlign: align as any,
  padding: "8px 10px",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: THEME.muted,
  fontWeight: 800,
  borderBottom: `1px solid ${THEME.line}`,
  whiteSpace: "nowrap",
  paddingLeft: isFirst ? 12 : 10,
  paddingRight: isLast ? 12 : 10,
});

const subTdStyle = (align = "left"): React.CSSProperties => ({
  padding: "8px 10px",
  verticalAlign: "middle",
  fontSize: 12,
  textAlign: align as any,
  borderBottom: `1px solid ${THEME.line}`,
  fontVariantNumeric: "tabular-nums",
});

const actionBtnStyle = (color: string): React.CSSProperties => ({
  background: "transparent",
  border: "none",
  color,
  cursor: "pointer",
  padding: "4px 6px",
  borderRadius: 4,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "opacity 0.15s ease",
});

const simStatStyle = (color: string): React.CSSProperties => ({
  padding: "12px 14px",
  borderRadius: 10,
  background: `color-mix(in srgb, ${color} 5%, transparent)`,
  border: `1px solid ${`color-mix(in srgb, ${color} 15%, transparent)`}`,
  flex: 1,
});
