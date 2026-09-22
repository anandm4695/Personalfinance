/* eslint-disable */
import React, { useState, useMemo } from "react";
import {
  Coins,
  TrendingUp,
  Calendar,
  Plus,
  Trash2,
  Download,
  Search,
  X,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Info,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpRight,
  ShieldCheck,
  Building,
  Landmark,
  PieChart as PieIcon,
  BarChart3,
  Flame,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Percent,
  Check,
  Edit2,
  Clock,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { THEME, PIE_COLORS } from "../../utils/constants";
import { getCurrentFY } from "../../utils/appConstants";
import { fmtINRFull, fmtINRExact, today, exportArrayToCSV, uid } from "../../utils/finance";
import { Prv } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { StatCard } from "../ui/StatCard";
import { ConfirmDialog } from "../ui/Feedback";
import { DataTable, Column } from "../design-system/DataTable";
import { MFLogo, StockLogo } from "../ui/BrandLogos";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fyFromDate = (d: string): string => {
  if (!d) return "Unknown";
  const [y, m] = d.split("-").map(Number);
  if (!y || !m) return "Unknown";
  const startYear = m >= 4 ? y : y - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

export function DividendsSection({
  state,
  addItem,
  removeItem,
  showToast,
  marketData,
}: {
  state: any;
  addItem: (collection: string, item: any) => Promise<any>;
  removeItem: (collection: string, id: string) => Promise<any>;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  marketData?: Record<string, any>;
}) {
  const todayStr = today();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "stock" | "mf" | "auto">("all");
  const [selectedFY, setSelectedFY] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDividend, setEditingDividend] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [chartTab, setChartTab] = useState<"growth" | "seasonality" | "distribution">("growth");
  const [dismissedAutoIds, setDismissedAutoIds] = useState<string[]>([]);

  // Add / Edit Modal Form State
  const [form, setForm] = useState({
    symbol: "",
    fundName: "",
    type: "stock" as "stock" | "mf",
    amount: "",
    tds: "",
    paymentDate: todayStr,
    recordDate: "",
    fy: state?.profile?.fy || getCurrentFY(),
    note: "",
    divPerShare: "",
    qty: "",
    owner: "self",
  });

  const manualDividends: any[] = state?.dividends || [];

  // Auto-detected dividends from transactions (credit with category "Dividend" or narration mentioning dividend)
  const autoDividends = useMemo(() => {
    const manualNetByDate = new Map<string, number[]>();
    manualDividends.forEach((d: any) => {
      if (!d.paymentDate) return;
      const net = (Number(d.amount) || 0) - (Number(d.tds) || 0);
      const arr = manualNetByDate.get(d.paymentDate) || [];
      arr.push(net);
      manualNetByDate.set(d.paymentDate, arr);
    });

    const isAlreadyLogged = (date: string, amount: number) => {
      const nets = manualNetByDate.get(date);
      if (!nets) return false;
      return nets.some((net) => Math.abs(net - amount) <= 1.5);
    };

    return (state?.transactions || [])
      .filter((t: any) => {
        if (dismissedAutoIds.includes(t.id)) return false;
        const cat = (t.category || "").toLowerCase();
        const note = (t.note || t.narration || t.description || "").toLowerCase();
        return (
          t.type === "credit" &&
          (cat === "dividend" ||
            cat === "dividends" ||
            cat === "idcw" ||
            note.includes("dividend") ||
            note.includes("div payout") ||
            note.includes("interim div") ||
            note.includes("final div") ||
            note.includes("idcw"))
        );
      })
      .filter((t: any) => !isAlreadyLogged(t.date, Number(t.amount) || 0))
      .map((t: any) => ({
        id: `auto-${t.id}`,
        rawTxId: t.id,
        symbol: (t.note || t.narration || t.description || "").slice(0, 36),
        fundName: "",
        type: "auto",
        amount: Number(t.amount) || 0,
        tds: 0,
        paymentDate: t.date,
        fy: fyFromDate(t.date),
        note: `Auto-detected from ${t.account || "bank"} transaction`,
        isAuto: true,
      }));
  }, [state?.transactions, manualDividends, dismissedAutoIds]);

  // Combined records
  const allDividends = useMemo(() => {
    return [
      ...manualDividends.map((d: any) => ({ ...d, isAuto: false })),
      ...autoDividends,
    ];
  }, [manualDividends, autoDividends]);

  // Available FY list for filtering
  const availableFYs = useMemo(() => {
    const set = new Set<string>();
    allDividends.forEach((d) => {
      if (d.fy && d.fy !== "Unknown") set.add(d.fy);
    });
    return Array.from(set).sort().reverse();
  }, [allDividends]);

  // Portfolio holdings lookup for smart autocomplete
  const stockHoldings = useMemo(() => {
    const map = new Map<string, { symbol: string; qty: number; avgPrice: number; exchange: string }>();
    (state?.stocks || []).forEach((s: any) => {
      if (!s.symbol || Number(s.qty || 0) <= 0) return;
      const base = String(s.symbol).replace(/\.(NS|BO)$/i, "");
      const existing = map.get(base);
      if (existing) {
        existing.qty += Number(s.qty || 0);
      } else {
        map.set(base, {
          symbol: base,
          qty: Number(s.qty || 0),
          avgPrice: Number(s.avgPrice || 0),
          exchange: s.exchange || "NSE",
        });
      }
    });
    return Array.from(map.values());
  }, [state?.stocks]);

  const mfHoldings = useMemo(() => {
    const list: { name: string; units: number }[] = [];
    (state?.mutualFunds || []).forEach((m: any) => {
      const name = m.name || m.fundName;
      if (name && Number(m.units || 0) > 0) {
        list.push({ name, units: Number(m.units || 0) });
      }
    });
    return list;
  }, [state?.mutualFunds]);

  // Total Portfolio Invested Capital & Current Market Value (for Yield on Cost calculation)
  const portfolioMetrics = useMemo(() => {
    let stockInvested = 0;
    let stockValue = 0;
    (state?.stocks || []).forEach((s: any) => {
      const qty = Number(s.qty || 0);
      const avg = Number(s.avgPrice || 0);
      const base = String(s.symbol).replace(/\.(NS|BO)$/i, "");
      const yfSym = `${base}.${s.exchange === "BSE" ? "BO" : "NS"}`;
      const livePrice = Number(marketData?.[yfSym]?.price ?? s.currentPrice ?? avg);
      stockInvested += qty * avg;
      stockValue += qty * livePrice;
    });

    const totalGross = allDividends.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const totalTDS = allDividends.reduce((s, d) => s + (Number(d.tds) || 0), 0);
    const totalNet = totalGross - totalTDS;

    // Trailing 12-month (TTM) dividends
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const ttmGross = allDividends
      .filter((d) => {
        const pDate = d.paymentDate ? new Date(d.paymentDate + "T00:00:00") : null;
        return pDate && pDate >= oneYearAgo;
      })
      .reduce((s, d) => s + (Number(d.amount) || 0), 0);

    const yieldOnCost = stockInvested > 0 ? (ttmGross / stockInvested) * 100 : 0;
    const currentMarketYield = stockValue > 0 ? (ttmGross / stockValue) * 100 : 0;

    return {
      totalGross,
      totalTDS,
      totalNet,
      ttmGross,
      stockInvested,
      stockValue,
      yieldOnCost,
      currentMarketYield,
    };
  }, [allDividends, state?.stocks, marketData]);

  // FY-wise aggregation
  const fyData = useMemo(() => {
    const map: Record<string, { fy: string; gross: number; tds: number; net: number; count: number }> = {};
    allDividends.forEach((d) => {
      const fy = d.fy || "Unknown";
      if (!map[fy]) {
        map[fy] = { fy: `FY ${fy}`, gross: 0, tds: 0, net: 0, count: 0 };
      }
      const amt = Number(d.amount) || 0;
      const tds = Number(d.tds) || 0;
      map[fy].gross += amt;
      map[fy].tds += tds;
      map[fy].net += amt - tds;
      map[fy].count += 1;
    });
    return Object.values(map).sort((a, b) => a.fy.localeCompare(b.fy));
  }, [allDividends]);

  // Monthly Seasonality aggregation
  const seasonalityData = useMemo(() => {
    const months = MONTH_SHORT.map((name, idx) => ({
      month: name,
      monthIdx: idx,
      amount: 0,
      count: 0,
    }));

    allDividends.forEach((d) => {
      if (!d.paymentDate) return;
      const date = new Date(d.paymentDate + "T00:00:00");
      if (!isNaN(date.getTime())) {
        const m = date.getMonth();
        months[m].amount += Number(d.amount) || 0;
        months[m].count += 1;
      }
    });

    return months;
  }, [allDividends]);

  // Security distribution
  const securityDistribution = useMemo(() => {
    const map: Record<string, { name: string; amount: number; type: string }> = {};
    allDividends.forEach((d) => {
      const name = d.symbol || d.fundName || "Other";
      if (!map[name]) {
        map[name] = { name, amount: 0, type: d.type || (d.fundName ? "mf" : "stock") };
      }
      map[name].amount += Number(d.amount) || 0;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [allDividends]);

  // Filtered rows for the DataTable
  const filteredRows = useMemo(() => {
    return allDividends
      .filter((d) => {
        if (selectedType === "stock") return d.type === "stock";
        if (selectedType === "mf") return d.type === "mf" || (!d.symbol && d.fundName);
        if (selectedType === "auto") return d.isAuto;
        return true;
      })
      .filter((d) => {
        if (selectedFY === "all") return true;
        return d.fy === selectedFY;
      })
      .filter((d) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const sym = (d.symbol || "").toLowerCase();
        const fund = (d.fundName || "").toLowerCase();
        const note = (d.note || "").toLowerCase();
        const fy = (d.fy || "").toLowerCase();
        return sym.includes(q) || fund.includes(q) || note.includes(q) || fy.includes(q);
      })
      .sort((a, b) => (b.paymentDate || "").localeCompare(a.paymentDate || ""));
  }, [allDividends, selectedType, selectedFY, searchQuery]);

  // Open modal for new dividend or auto-convert
  const handleOpenAddModal = (initial?: Partial<typeof form>) => {
    setForm({
      symbol: initial?.symbol || "",
      fundName: initial?.fundName || "",
      type: initial?.type || "stock",
      amount: initial?.amount ? String(initial.amount) : "",
      tds: initial?.tds ? String(initial.tds) : "",
      paymentDate: initial?.paymentDate || todayStr,
      recordDate: initial?.recordDate || "",
      fy: initial?.fy || (initial?.paymentDate ? fyFromDate(initial.paymentDate) : getCurrentFY()),
      note: initial?.note || "",
      divPerShare: initial?.divPerShare || "",
      qty: initial?.qty || "",
      owner: initial?.owner || "self",
    });
    setEditingDividend(null);
    setShowAddModal(true);
  };

  // Convert an auto-detected bank credit into a verified manual record
  const handleVerifyAuto = (autoItem: any) => {
    handleOpenAddModal({
      symbol: autoItem.symbol,
      amount: autoItem.amount,
      paymentDate: autoItem.paymentDate,
      fy: autoItem.fy,
      note: `Verified from bank credit: ${autoItem.symbol}`,
      type: "stock",
    });
  };

  const handleDismissAuto = (id: string) => {
    setDismissedAutoIds((prev) => [...prev, id]);
    showToast?.("Auto-detected transaction dismissed", "info");
  };

  // Save Dividend Handler
  const handleSaveDividend = async () => {
    const amt = Number(form.amount) || 0;
    if (amt <= 0) {
      showToast?.("Please enter a valid dividend amount", "error");
      return;
    }
    const name = form.type === "stock" ? form.symbol : form.fundName;
    if (!name.trim()) {
      showToast?.(`Please enter a valid ${form.type === "stock" ? "Stock symbol" : "Mutual fund name"}`, "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        symbol: form.type === "stock" ? form.symbol.toUpperCase().trim() : "",
        fundName: form.type === "mf" ? form.fundName.trim() : "",
        type: form.type,
        amount: amt,
        tds: Number(form.tds) || 0,
        paymentDate: form.paymentDate || todayStr,
        recordDate: form.recordDate || form.paymentDate || todayStr,
        fy: form.fy || fyFromDate(form.paymentDate),
        note: form.note.trim(),
        owner: form.owner || "self",
      };

      await addItem("dividends", payload);
      showToast?.(`Dividend from ${name} saved successfully`, "success");
      setShowAddModal(false);
      setEditingDividend(null);
    } catch (e: any) {
      showToast?.(`Failed to save dividend: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const rows = filteredRows.map((d) => ({
      security: d.symbol || d.fundName || "—",
      type: d.type === "mf" ? "Mutual Fund" : d.isAuto ? "Auto Bank Credit" : "Stock",
      grossAmount: Number(d.amount || 0),
      tds: Number(d.tds || 0),
      netAmount: Number(d.amount || 0) - Number(d.tds || 0),
      paymentDate: d.paymentDate || "—",
      fy: d.fy || "—",
      note: d.note || "—",
    }));

    exportArrayToCSV(
      rows,
      [
        { key: "security", label: "Security / Fund" },
        { key: "type", label: "Type" },
        { key: "grossAmount", label: "Gross Amount (INR)" },
        { key: "tds", label: "TDS Deducted (INR)" },
        { key: "netAmount", label: "Net Received (INR)" },
        { key: "paymentDate", label: "Payment Date" },
        { key: "fy", label: "Financial Year" },
        { key: "note", label: "Notes" },
      ],
      `dividend_records_${todayStr}.csv`
    );
    showToast?.("Dividend ledger exported to CSV", "success");
  };

  // Autocomplete select for stocks
  const handleSelectStock = (sym: string) => {
    const found = stockHoldings.find((s) => s.symbol === sym);
    setForm((prev) => {
      const qty = found ? String(found.qty) : prev.qty;
      const divPerShare = prev.divPerShare;
      let calculatedAmt = prev.amount;
      if (Number(divPerShare) > 0 && Number(qty) > 0) {
        calculatedAmt = String(Number(divPerShare) * Number(qty));
      }
      return {
        ...prev,
        symbol: sym,
        qty,
        amount: calculatedAmt,
      };
    });
  };

  // When divPerShare or qty changes, auto calculate gross amount
  const handleDivRateChange = (dps: string) => {
    setForm((prev) => {
      const q = Number(prev.qty) || 0;
      const rate = Number(dps) || 0;
      const amt = rate > 0 && q > 0 ? String(rate * q) : prev.amount;
      // If gross amount > 5000, Indian IT rules suggest 10% TDS (Section 194)
      const numAmt = Number(amt) || 0;
      const suggestedTDS = numAmt > 5000 ? String(Math.round(numAmt * 0.1)) : prev.tds;
      return {
        ...prev,
        divPerShare: dps,
        amount: amt,
        tds: suggestedTDS,
      };
    });
  };

  return (
    <div className="tab-content-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Header Row ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 800,
              color: THEME.ink,
              letterSpacing: "-0.02em",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: `color-mix(in srgb, ${THEME.sage} 14%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: THEME.sage,
              }}
            >
              <Coins size={22} />
            </div>
            Dividend Tracker & Income Hub
          </div>
          <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4, fontWeight: 500 }}>
            Real-time dividend cashflows, Yield on Cost (YoC), TDS deductions & DRIP compounding engine
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportCSV}
            disabled={filteredRows.length === 0}
          >
            Export CSV
          </Button>
          <Button
            variant="accent"
            size="sm"
            icon={<Plus size={15} />}
            onClick={() => handleOpenAddModal()}
          >
            + Log Dividend
          </Button>
        </div>
      </div>

      {/* ── Executive KPI Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 16,
        }}
      >
        <StatCard
          label="Total Gross Dividends"
          value={fmtINRFull(portfolioMetrics.totalGross)}
          numericValue={portfolioMetrics.totalGross}
          formatValue={fmtINRFull}
          icon={<Coins />}
          color={THEME.sage}
          caption={`Lifetime Payouts Across ${allDividends.length} Records`}
        />

        <StatCard
          label="Net Realized (Post-TDS)"
          value={fmtINRFull(portfolioMetrics.totalNet)}
          numericValue={portfolioMetrics.totalNet}
          formatValue={fmtINRFull}
          icon={<CheckCircle2 />}
          color={THEME.accent}
          caption={`Direct Cash Landed in Bank`}
        />

        <StatCard
          label="Total TDS Withheld"
          value={fmtINRFull(portfolioMetrics.totalTDS)}
          numericValue={portfolioMetrics.totalTDS}
          formatValue={fmtINRFull}
          icon={<ShieldCheck />}
          color={THEME.rust}
          caption={
            portfolioMetrics.totalGross > 0
              ? `${((portfolioMetrics.totalTDS / portfolioMetrics.totalGross) * 100).toFixed(1)}% effective tax rate`
              : "Claimable in ITR / Form 26AS"
          }
        />

        <StatCard
          label="Yield on Cost (YoC)"
          value={portfolioMetrics.yieldOnCost > 0 ? `${portfolioMetrics.yieldOnCost.toFixed(2)}%` : "—"}
          numericValue={portfolioMetrics.yieldOnCost}
          formatValue={(n) => (n > 0 ? `${n.toFixed(2)}%` : "—")}
          icon={<TrendingUp />}
          color={THEME.gold}
          caption={`Vs Market Yield: ${portfolioMetrics.currentMarketYield > 0 ? portfolioMetrics.currentMarketYield.toFixed(2) + "%" : "—"}`}
        />
      </div>

      {/* ── Smart Bank Auto-Detection & Reconciliation Hub ── */}
      {autoDividends.length > 0 && (
        <Card
          style={{
            padding: "16px 20px",
            background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
            border: `1.5px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: THEME.accent,
                }}
              >
                <Sparkles size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                  {autoDividends.length} Auto-Detected Dividend Credit{autoDividends.length > 1 ? "s" : ""}
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 500 }}>
                  Found in your bank transactions matching dividend keywords. Verify and link them to log accurate TDS.
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {autoDividends.slice(0, 3).map((item: any) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                  <Badge variant="accent" style={{ fontSize: 10 }}>
                    Auto
                  </Badge>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: THEME.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.symbol}
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>
                      {formatDate(item.paymentDate)} • FY {item.fy}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: THEME.sage }}>
                    <Money value={item.amount} variant="exact" />
                  </div>
                  <div style={{ fontSize: 10, color: THEME.muted }}>Bank credit (Net)</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleVerifyAuto(item)}
                    className="card-lift"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: "var(--t-accent)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Check size={13} /> Verify & Log TDS
                  </button>
                  <button
                    onClick={() => handleDismissAuto(item.rawTxId)}
                    title="Dismiss"
                    style={{
                      padding: 6,
                      borderRadius: 8,
                      border: `1px solid ${THEME.line}`,
                      background: "transparent",
                      color: THEME.muted,
                      cursor: "pointer",
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Visual Analytics Section (Tabbed Charts) ── */}
      {allDividends.length > 0 && (
        <Card style={{ padding: 22, border: `1.5px solid ${THEME.line}` }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: THEME.ink, letterSpacing: "-0.015em" }}>
                Dividend Insights & Trajectory
              </div>
              <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                Annual growth patterns, payout seasonality & asset contribution
              </div>
            </div>

            {/* Tab switch */}
            <div
              style={{
                display: "flex",
                border: `1.5px solid ${THEME.line}`,
                borderRadius: 12,
                overflow: "hidden",
                background: "var(--surface-0)",
              }}
            >
              {[
                { key: "growth", label: "FY Growth", icon: BarChart3 },
                { key: "seasonality", label: "Seasonality", icon: Calendar },
                { key: "distribution", label: "Top Assets", icon: PieIcon },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setChartTab(key as any)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    border: "none",
                    borderRight: key !== "distribution" ? `1px solid ${THEME.line}` : "none",
                    background: chartTab === key ? "var(--t-accent)" : "transparent",
                    color: chartTab === key ? "#fff" : THEME.muted,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 260, width: "100%", marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartTab === "growth" ? (
                <BarChart data={fyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} opacity={0.6} />
                  <XAxis dataKey="fy" stroke={THEME.muted} fontSize={11} tickLine={false} />
                  <YAxis
                    stroke={THEME.muted}
                    fontSize={11}
                    tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 10,
                      boxShadow: "var(--shadow-md)",
                      fontSize: 12,
                    }}
                    formatter={(val: any, name: any) => [
                      fmtINRExact(Number(val)),
                      name === "net" ? "Net Received" : "TDS Withheld",
                    ]}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                  <Bar dataKey="net" name="Net Received" fill={THEME.sage} radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="tds" name="TDS Deducted" fill={THEME.rust} radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              ) : chartTab === "seasonality" ? (
                <AreaChart data={seasonalityData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="divSeasonGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.accent} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={THEME.accent} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} opacity={0.6} />
                  <XAxis dataKey="month" stroke={THEME.muted} fontSize={11} tickLine={false} />
                  <YAxis
                    stroke={THEME.muted}
                    fontSize={11}
                    tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 10,
                      boxShadow: "var(--shadow-md)",
                      fontSize: 12,
                    }}
                    formatter={(val: any) => [fmtINRExact(Number(val)), "Total Dividends"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke={THEME.accent}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#divSeasonGrad)"
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={securityDistribution}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} opacity={0.6} horizontal={false} />
                  <XAxis
                    type="number"
                    stroke={THEME.muted}
                    fontSize={11}
                    tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                  />
                  <YAxis dataKey="name" type="category" stroke={THEME.muted} fontSize={11} tickLine={false} width={80} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 10,
                      boxShadow: "var(--shadow-md)",
                      fontSize: 12,
                    }}
                    formatter={(val: any) => [fmtINRExact(Number(val)), "Total Dividends"]}
                  />
                  <Bar dataKey="amount" fill={THEME.gold} radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* ── Dividend Records Ledger (DataTable) ── */}
      <Card style={{ padding: 22, border: `1.5px solid ${THEME.line}` }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: THEME.ink, letterSpacing: "-0.015em" }}>
              Dividend Ledger & History
            </div>
            <Badge variant="muted" style={{ fontSize: 11 }}>
              {filteredRows.length} {filteredRows.length === 1 ? "record" : "records"}
            </Badge>
          </div>

          {/* Search and Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Search Input */}
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search
                size={15}
                color={THEME.muted}
                style={{ position: "absolute", left: 12, pointerEvents: "none" }}
              />
              <input
                type="text"
                placeholder="Search symbol, fund, FY..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: 200,
                  padding: `8px ${searchQuery ? 32 : 12}px 8px 34px`,
                  borderRadius: 10,
                  border: `1.5px solid ${THEME.line}`,
                  background: "var(--surface-0)",
                  color: THEME.ink,
                  fontSize: 12.5,
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "none",
                    background: "var(--surface-2)",
                    color: THEME.muted,
                    cursor: "pointer",
                  }}
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Type Filter Pills */}
            <div
              style={{
                display: "flex",
                border: `1.5px solid ${THEME.line}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {[
                { id: "all", label: "All" },
                { id: "stock", label: "Stocks" },
                { id: "mf", label: "Mutual Funds" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id as any)}
                  style={{
                    padding: "6px 12px",
                    border: "none",
                    background: selectedType === t.id ? "var(--t-accent)" : "var(--surface-0)",
                    color: selectedType === t.id ? "#fff" : THEME.muted,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* FY Dropdown */}
            {availableFYs.length > 0 && (
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${THEME.line}`,
                  background: "var(--surface-0)",
                  color: THEME.ink,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <option value="all">All Financial Years</option>
                {availableFYs.map((fy) => (
                  <option key={fy} value={fy}>
                    FY {fy}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Ledger Table */}
        <DataTable
          columns={[
            {
              key: "symbol",
              header: "Security / Fund",
              sortable: true,
              align: "left",
              accessor: (r) => {
                const isMF = r.type === "mf" || (!r.symbol && r.fundName);
                const name = r.symbol || r.fundName || "—";
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {isMF ? (
                      <MFLogo name={name} size={30} />
                    ) : (
                      <StockLogo yfSym={`${name}.NS`} size={30} />
                    )}
                    <div>
                      <div style={{ fontWeight: 800, color: THEME.ink, fontSize: 13.5 }}>{name}</div>
                      {r.note && (
                        <div style={{ fontSize: 11, color: THEME.muted, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.note}
                        </div>
                      )}
                    </div>
                  </div>
                );
              },
            },
            {
              key: "type",
              header: "Type",
              sortable: true,
              align: "center",
              accessor: (r) => (
                <Badge
                  variant={r.isAuto ? "accent" : r.type === "stock" ? "muted" : "gold"}
                  style={{ fontSize: 10 }}
                >
                  {r.isAuto ? "Auto" : r.type === "stock" ? "Stock" : "MF IDCW"}
                </Badge>
              ),
            },
            {
              key: "amount",
              header: "Gross Amount",
              sortable: true,
              align: "right",
              accessor: (r) => (
                <span style={{ fontWeight: 800, color: THEME.ink }}>
                  <Money value={r.amount} variant="exact" />
                </span>
              ),
            },
            {
              key: "tds",
              header: "TDS (10%)",
              sortable: true,
              align: "right",
              accessor: (r) => (
                <span style={{ color: Number(r.tds || 0) > 0 ? THEME.rust : THEME.muted, fontWeight: 600 }}>
                  {Number(r.tds || 0) > 0 ? <Money value={r.tds} variant="exact" /> : "₹0"}
                </span>
              ),
            },
            {
              key: "net",
              header: "Net Received",
              sortable: true,
              align: "right",
              accessor: (r) => (
                <span style={{ fontWeight: 800, color: THEME.sage }}>
                  <Money value={Number(r.amount || 0) - Number(r.tds || 0)} variant="exact" />
                </span>
              ),
            },
            {
              key: "paymentDate",
              header: "Payment Date",
              sortable: true,
              align: "right",
              accessor: (r) => (
                <span style={{ color: THEME.ink, whiteSpace: "nowrap", fontSize: 12 }}>
                  {formatDate(r.paymentDate)}
                </span>
              ),
            },
            {
              key: "fy",
              header: "FY",
              sortable: true,
              align: "center",
              accessor: (r) => (
                <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>
                  {r.fy ? `FY ${r.fy}` : "—"}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              align: "right",
              accessor: (r) => {
                if (r.isAuto) {
                  return (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVerifyAuto(r)}
                      style={{ fontSize: 11, padding: "4px 8px" }}
                    >
                      Verify
                    </Button>
                  );
                }
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setConfirmDelete(r)}
                      title="Delete"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.muted,
                        padding: 6,
                        display: "flex",
                        alignItems: "center",
                        borderRadius: 6,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              },
            },
          ]}
          data={filteredRows}
          hideSearch
          keyExtractor={(r) => r.id || `${r.symbol}-${r.paymentDate}`}
          emptyState={
            <div style={{ padding: "36px 16px", textAlign: "center", color: THEME.muted, fontSize: 13 }}>
              {searchQuery
                ? `No dividend records found matching "${searchQuery}".`
                : "No dividends logged yet. Click '+ Log Dividend' above to add payouts or track bank credits."}
            </div>
          }
        />
      </Card>

      {/* ── DRIP Simulator 2.0 (Dividend Reinvestment Plan) ── */}
      {allDividends.length > 0 && (
        <DRIPSimulator2 allDividends={allDividends} totalDividends={portfolioMetrics.totalNet} />
      )}

      {/* ── Indian Income Tax & Compliance Advisory Card ── */}
      <Card
        style={{
          padding: 20,
          background: `color-mix(in srgb, ${THEME.gold} 4%, transparent)`,
          border: `1.5px solid color-mix(in srgb, ${THEME.gold} 18%, transparent)`,
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: `color-mix(in srgb, ${THEME.gold} 12%, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: THEME.gold,
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
              Indian Income Tax & TDS Advisory (Section 194 & 194K)
            </div>
            <div style={{ fontSize: 12.5, color: THEME.muted, marginTop: 4, lineHeight: 1.6 }}>
              • <b>Section 194 (Stocks)</b>: Companies deduct 10% TDS on dividend payouts if the aggregate dividend paid to you exceeds <b>₹5,000 in a Financial Year</b>.
              <br />
              • <b>Section 194K (Mutual Funds)</b>: AMCs deduct 10% TDS on IDCW payouts exceeding <b>₹5,000 in a FY</b>.
              <br />
              • <b>ITR Filing</b>: Dividend income is taxed under "Income from Other Sources" at your applicable slab rates. You can claim full credit for TDS withheld during annual ITR filing via Form 26AS / AIS reconciliation.
            </div>
          </div>
        </div>
      </Card>

      {/* ── Add / Edit Dividend Modal ── */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title={editingDividend ? "Edit Dividend Payout" : "Log Dividend Payout"}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "10px 0" }}>
            {/* Asset Type */}
            <Field label="Asset Category">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "stock" })}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: form.type === "stock" ? `2px solid ${THEME.accent}` : `1.5px solid ${THEME.line}`,
                    background: form.type === "stock" ? `color-mix(in srgb, ${THEME.accent} 10%, transparent)` : "var(--surface-0)",
                    color: form.type === "stock" ? THEME.accent : THEME.muted,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Equity Stock
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "mf" })}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: form.type === "mf" ? `2px solid ${THEME.accent}` : `1.5px solid ${THEME.line}`,
                    background: form.type === "mf" ? `color-mix(in srgb, ${THEME.accent} 10%, transparent)` : "var(--surface-0)",
                    color: form.type === "mf" ? THEME.accent : THEME.muted,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Mutual Fund IDCW
                </button>
              </div>
            </Field>

            {/* Security Autocomplete or Text */}
            {form.type === "stock" ? (
              <div>
                <Field label="Stock Symbol">
                  <input
                    className="form-input"
                    placeholder="e.g. TCS, INFY, RELIANCE"
                    value={form.symbol}
                    onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                  />
                </Field>
                {stockHoldings.length > 0 && !form.symbol && (
                  <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Quick pick:</span>
                    {stockHoldings.slice(0, 6).map((s) => (
                      <button
                        key={s.symbol}
                        type="button"
                        onClick={() => handleSelectStock(s.symbol)}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                          border: `1px solid ${THEME.line}`,
                          background: "var(--surface-1)",
                          color: THEME.ink,
                          cursor: "pointer",
                        }}
                      >
                        {s.symbol} ({s.qty} sh)
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <Field label="Fund Name">
                  <input
                    className="form-input"
                    placeholder="e.g. HDFC Top 100 IDCW Plan"
                    value={form.fundName}
                    onChange={(e) => setForm({ ...form, fundName: e.target.value })}
                  />
                </Field>
                {mfHoldings.length > 0 && !form.fundName && (
                  <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Quick pick:</span>
                    {mfHoldings.slice(0, 4).map((m) => (
                      <button
                        key={m.name}
                        type="button"
                        onClick={() => setForm({ ...form, fundName: m.name })}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                          border: `1px solid ${THEME.line}`,
                          background: "var(--surface-1)",
                          color: THEME.ink,
                          cursor: "pointer",
                        }}
                      >
                        {m.name.slice(0, 20)}…
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dividend per share & Qty calculator helper */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Div Per Share (₹) [Optional]">
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 28"
                  value={form.divPerShare}
                  onChange={(e) => handleDivRateChange(e.target.value)}
                />
              </Field>
              <Field label="Shares Held [Optional]">
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 50"
                  value={form.qty}
                  onChange={(e) => {
                    const q = e.target.value;
                    setForm((prev) => {
                      const rate = Number(prev.divPerShare) || 0;
                      const numQ = Number(q) || 0;
                      const calculatedAmt = rate > 0 && numQ > 0 ? String(rate * numQ) : prev.amount;
                      return { ...prev, qty: q, amount: calculatedAmt };
                    });
                  }}
                />
              </Field>
            </div>

            {/* Gross Amount & TDS */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Gross Dividend Amount (₹) *">
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 5000"
                  value={form.amount}
                  onChange={(e) => {
                    const amt = e.target.value;
                    const numAmt = Number(amt) || 0;
                    setForm({
                      ...form,
                      amount: amt,
                      tds: numAmt > 5000 && !form.tds ? String(Math.round(numAmt * 0.1)) : form.tds,
                    });
                  }}
                />
              </Field>
              <Field label="TDS Deducted (₹)">
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 500 (10%)"
                  value={form.tds}
                  onChange={(e) => setForm({ ...form, tds: e.target.value })}
                />
              </Field>
            </div>

            {/* Payment Date & FY */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Payment Date">
                <input
                  className="form-input"
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => {
                    const dt = e.target.value;
                    setForm({ ...form, paymentDate: dt, fy: fyFromDate(dt) });
                  }}
                />
              </Field>
              <Field label="Financial Year">
                <input
                  className="form-input"
                  placeholder="2025-26"
                  value={form.fy}
                  onChange={(e) => setForm({ ...form, fy: e.target.value })}
                />
              </Field>
            </div>

            {/* Notes */}
            <Field label="Notes / Reference (Optional)">
              <input
                className="form-input"
                placeholder="e.g. Interim dividend, Q3 payout"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </Field>

            {/* Net preview */}
            {Number(form.amount) > 0 && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>Net Cash Received:</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: THEME.sage }}>
                  <Money value={Math.max(0, (Number(form.amount) || 0) - (Number(form.tds) || 0))} variant="exact" />
                </span>
              </div>
            )}
          </div>

          <ModalActions
            onClose={() => setShowAddModal(false)}
            onSave={handleSaveDividend}
            saveLabel="Save Dividend"
            loading={saving}
          />
        </Modal>
      )}

      {/* ── Confirm Delete Dialog ── */}
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete dividend record from ${confirmDelete.symbol || confirmDelete.fundName || "this security"}? This will remove it from all yield & tax calculations.`}
          onConfirm={async () => {
            await removeItem("dividends", confirmDelete.id);
            setConfirmDelete(null);
            showToast?.("Dividend record deleted", "info");
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// Alias for backward compatibility
export const DividendTracker = DividendsSection;

/* ── DRIP Simulator 2.0 Component ── */
const DRIP_RATES = [
  { label: "8% (Conservative)", rate: 0.08 },
  { label: "10% (Balanced)", rate: 0.1 },
  { label: "12% (Nifty 50 Index)", rate: 0.12 },
  { label: "15% (Midcap / Alpha)", rate: 0.15 },
  { label: "18% (High Growth)", rate: 0.18 },
];

const HORIZONS = [3, 5, 10, 15, 20];

function DRIPSimulator2({
  allDividends,
  totalDividends,
}: {
  allDividends: any[];
  totalDividends: number;
}) {
  const [rateIdx, setRateIdx] = useState(2); // default 12% (Nifty 50 Index)
  const [horizonYears, setHorizonYears] = useState(10);
  const selectedRate = DRIP_RATES[rateIdx].rate;

  const netDividendAmt = (d: any) => Math.max(0, (Number(d.amount) || 0) - (Number(d.tds) || 0));

  // Projected compounding curves for chart
  const projectionCurve = useMemo(() => {
    const points: { year: string; cash: number; reinvested: number }[] = [];
    const baseTotal = totalDividends;

    for (let yr = 0; yr <= horizonYears; yr++) {
      const compounded = baseTotal * Math.pow(1 + selectedRate, yr);
      points.push({
        year: yr === 0 ? "Today" : `Yr ${yr}`,
        cash: Math.round(baseTotal),
        reinvested: Math.round(compounded),
      });
    }
    return points;
  }, [totalDividends, selectedRate, horizonYears]);

  const finalReinvestedValue = projectionCurve[projectionCurve.length - 1]?.reinvested || totalDividends;
  const wealthDelta = finalReinvestedValue - totalDividends;
  const multiplier = totalDividends > 0 ? (finalReinvestedValue / totalDividends).toFixed(1) : "1.0";

  return (
    <Card style={{ padding: 22, border: `1.5px solid ${THEME.line}` }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: THEME.sage,
            }}
          >
            <RefreshCw size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: THEME.ink, letterSpacing: "-0.015em" }}>
              DRIP Simulator 2.0 (Dividend Reinvestment Engine)
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 1 }}>
              Simulate the exponential power of reinvesting dividends into compounding assets
            </div>
          </div>
        </div>

        {/* Rate Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {DRIP_RATES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRateIdx(i)}
              style={{
                padding: "5px 11px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                border: i === rateIdx ? `2px solid ${THEME.sage}` : `1px solid ${THEME.line}`,
                background: i === rateIdx ? `color-mix(in srgb, ${THEME.sage} 10%, transparent)` : "transparent",
                color: i === rateIdx ? THEME.sage : THEME.muted,
                transition: "all 0.15s ease",
              }}
            >
              {r.label.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Horizon selector + Opportunity Card Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 12,
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
          }}
        >
          <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
            Total Net Dividend Capital
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: THEME.ink, marginTop: 4 }}>
            <Money value={totalDividends} variant="exact" />
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>Kept in Savings / Spent</div>
        </div>

        <div
          style={{
            padding: "14px 16px",
            borderRadius: 12,
            background: `color-mix(in srgb, ${THEME.sage} 4%, transparent)`,
            border: `1.5px solid color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
          }}
        >
          <div style={{ fontSize: 11, color: THEME.sage, fontWeight: 700, textTransform: "uppercase" }}>
            If Reinvested at {DRIP_RATES[rateIdx].label.split(" ")[0]} ({horizonYears} yrs)
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: THEME.sage, marginTop: 4 }}>
            <Money value={finalReinvestedValue} variant="exact" />
          </div>
          <div style={{ fontSize: 11, color: THEME.sage, fontWeight: 600, marginTop: 2 }}>
            {multiplier}x Wealth Creation Multiplier
          </div>
        </div>

        <div
          style={{
            padding: "14px 16px",
            borderRadius: 12,
            background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
            border: `1.5px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
          }}
        >
          <div style={{ fontSize: 11, color: THEME.accent, fontWeight: 700, textTransform: "uppercase" }}>
            Opportunity Cost / Growth Delta
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: THEME.accent, marginTop: 4 }}>
            +<Money value={wealthDelta} variant="exact" />
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>Pure compounding returns</div>
        </div>
      </div>

      {/* Projection Chart */}
      <div style={{ height: 230, width: "100%", marginTop: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={projectionCurve} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="dripReinvestGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={THEME.sage} stopOpacity={0.4} />
                <stop offset="95%" stopColor={THEME.sage} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} opacity={0.6} />
            <XAxis dataKey="year" stroke={THEME.muted} fontSize={11} tickLine={false} />
            <YAxis
              stroke={THEME.muted}
              fontSize={11}
              tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
                borderRadius: 10,
                boxShadow: "var(--shadow-md)",
                fontSize: 12,
              }}
              formatter={(val: any, name: any) => [
                fmtINRExact(Number(val)),
                name === "reinvested" ? `Reinvested (${DRIP_RATES[rateIdx].label.split(" ")[0]})` : "Cash Spent / Kept",
              ]}
            />
            <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
            <Area
              type="monotone"
              dataKey="cash"
              name="Cash Kept"
              stroke={THEME.muted}
              strokeWidth={2}
              fill="transparent"
            />
            <Area
              type="monotone"
              dataKey="reinvested"
              name="Reinvested Portfolio"
              stroke={THEME.sage}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#dripReinvestGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Horizon selector buttons */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>Projection Horizon:</span>
        {HORIZONS.map((h) => (
          <button
            key={h}
            onClick={() => setHorizonYears(h)}
            style={{
              padding: "4px 10px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              border: horizonYears === h ? `1.5px solid ${THEME.accent}` : `1px solid ${THEME.line}`,
              background: horizonYears === h ? "var(--t-accent)" : "transparent",
              color: horizonYears === h ? "#fff" : THEME.muted,
            }}
          >
            {h} Years
          </button>
        ))}
      </div>
    </Card>
  );
}
