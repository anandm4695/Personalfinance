// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Coins,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  IndianRupee,
  Calendar,
  Award,
  RefreshCw,
  Download,
  ArrowUpDown,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Sparkles,
  ShieldCheck,
  Zap,
  Sliders,
  Clock,
  Flame,
  Landmark,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { THEME } from "../../utils/constants";
import { useMasterData } from "../../utils/masterData";
import {
  fmtINR,
  fmtINRFull,
  uid,
  today,
  monthsBetween,
  calcCAGR,
  exportArrayToCSV,
  getGoldPricePerGram,
  GOLD_PURITY_FACTOR,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { ConfirmDialog } from "../ui/Feedback";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

const GOLD_TYPES = [
  { id: "physical", label: "Physical Gold", color: THEME.gold, iconName: "Coins" },
  { id: "sgb", label: "Sovereign Gold Bond (SGB)", color: THEME.sage, iconName: "Landmark" },
  { id: "digital", label: "Digital Gold", color: THEME.accent, iconName: "Zap" },
  { id: "etf", label: "Gold ETF", color: THEME.violet, iconName: "BarChart3" },
  { id: "mf", label: "Gold Mutual Fund", color: THEME.pink, iconName: "TrendingUp" },
];

const EMPTY_GOLD = {
  name: "",
  type: "physical",
  grams: 0,
  purchasePrice: 0,
  purchaseDate: "",
  maturityDate: "",
  interestRate: 2.5,
  notes: "",
  owner: "self",
  purity: "24K",
};

export const GoldSGBTab = ({
  state,
  addItem,
  removeItem,
  updateItem,
  updateSettings,
  showToast,
}: any) => {
  const { familyProfiles } = useMasterData();
  const { privacyMode } = usePrivacy();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_GOLD });
  const [viewMode, setViewMode] = useState<"cards" | "sgb" | "table">("cards");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("value");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const goldPrice = useMemo(() => getGoldPricePerGram(state), [state?.settings?.goldPricePerGram]);
  const [draftPrice, setDraftPrice] = useState(goldPrice);
  const [manualPrice, setManualPrice] = useState(false);

  const holdings = useMemo(() => [...(state.goldHoldings || [])], [state.goldHoldings]);

  const enriched = useMemo(() => {
    return holdings.map((h) => {
      const grams = Number(h.grams || 0);
      const purchasePrice = Number(h.purchasePrice || 0);
      const hasPurchasePrice = purchasePrice > 0;
      const purityMul = h.type === "physical" ? GOLD_PURITY_FACTOR[h.purity] || 1 : 1;
      const currentValue = grams * goldPrice * purityMul;
      const invested = hasPurchasePrice ? purchasePrice : currentValue;
      const pnl = currentValue - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
      const cagr =
        hasPurchasePrice && h.purchaseDate ? calcCAGR(invested, currentValue, h.purchaseDate) : null;

      let interest = 0;
      if (h.type === "sgb" && h.purchaseDate) {
        const accrualEndTime = h.maturityDate
          ? Math.min(new Date().getTime(), new Date(h.maturityDate + "T00:00:00").getTime())
          : new Date().getTime();
        const years = Math.max(
          0,
          (accrualEndTime - new Date(h.purchaseDate + "T00:00:00").getTime()) / (365.25 * 86400000)
        );
        interest = invested * (Number(h.interestRate || 2.5) / 100) * years;
      }

      let maturityStatus = null;
      if (h.type === "sgb" && h.maturityDate) {
        const monthsToMaturity = monthsBetween(today(), h.maturityDate);
        if (monthsToMaturity <= 0) {
          maturityStatus = "Matured";
        } else if (monthsToMaturity < 12) {
          maturityStatus = `Matures in ${monthsToMaturity}mo`;
        } else {
          const y = Math.floor(monthsToMaturity / 12);
          const m = monthsToMaturity % 12;
          maturityStatus = `Matures in ${y}y${m ? ` ${m}mo` : ""}`;
        }
      }

      const typeInfo = GOLD_TYPES.find((t) => t.id === h.type) || GOLD_TYPES[0];
      return {
        ...h,
        grams,
        hasPurchasePrice,
        invested,
        currentValue,
        pnl,
        pnlPct,
        cagr,
        interest,
        maturityStatus,
        typeInfo,
      };
    });
  }, [holdings, goldPrice]);

  const filtered = useMemo(() => {
    return enriched.filter((h) => {
      if (filterType !== "all" && h.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (h.name || "").toLowerCase().includes(q);
        const matchType = (h.typeInfo.label || "").toLowerCase().includes(q);
        if (!matchName && !matchType) return false;
      }
      return true;
    });
  }, [enriched, filterType, searchQuery]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case "pnl":
        return arr.sort((a, b) => b.pnl - a.pnl);
      case "purchaseDate":
        return arr.sort((a, b) => (b.purchaseDate || "").localeCompare(a.purchaseDate || ""));
      case "name":
        return arr.sort((a, b) =>
          (a.name || a.typeInfo.label).localeCompare(b.name || b.typeInfo.label)
        );
      case "value":
      default:
        return arr.sort((a, b) => b.currentValue - a.currentValue);
    }
  }, [filtered, sortBy]);

  const stats = useMemo(() => {
    const totalGrams = enriched.reduce((s, h) => s + h.grams, 0);
    const totalInvested = enriched.reduce((s, h) => s + h.invested, 0);
    const totalValue = enriched.reduce((s, h) => s + h.currentValue, 0);
    const totalPnL = totalValue - totalInvested;
    const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    const totalInterest = enriched
      .filter((h) => h.type === "sgb")
      .reduce((s, h) => s + h.interest, 0);
    const sgbAnnualCoupon = enriched
      .filter((h) => h.type === "sgb" && h.maturityStatus !== "Matured")
      .reduce((s, h) => s + (h.invested * Number(h.interestRate || 2.5)) / 100, 0);

    const byType = GOLD_TYPES.map((t) => {
      const items = enriched.filter((h) => h.type === t.id);
      return {
        name: t.label,
        grams: items.reduce((s, h) => s + h.grams, 0),
        value: items.reduce((s, h) => s + h.currentValue, 0),
        color: t.color,
      };
    }).filter((t) => t.grams > 0);

    return {
      totalGrams,
      totalInvested,
      totalValue,
      totalPnL,
      totalPnLPct,
      totalInterest,
      sgbAnnualCoupon,
      byType,
    };
  }, [enriched]);

  const animatedTotalValue = useAnimatedNumber(stats.totalValue);

  const handleExportCSV = () => {
    const rows = sorted.map((h) => ({
      name: h.name || h.typeInfo.label,
      type: h.typeInfo.label,
      grams: h.grams,
      purity: h.type === "physical" ? h.purity : "",
      purchaseDate: h.purchaseDate || "",
      purchasePrice: h.hasPurchasePrice ? h.invested.toFixed(2) : "",
      currentValue: h.currentValue.toFixed(2),
      pnl: h.hasPurchasePrice ? h.pnl.toFixed(2) : "",
      pnlPct: h.hasPurchasePrice ? h.pnlPct.toFixed(2) : "",
      interestRate: h.type === "sgb" ? h.interestRate : "",
      interestEarned: h.type === "sgb" ? h.interest.toFixed(2) : "",
      maturityDate: h.maturityDate || "",
      owner: familyProfiles.find((p) => p.id === h.owner)?.name || h.owner || "",
    }));
    exportArrayToCSV(
      rows,
      [
        { key: "name", label: "Name" },
        { key: "type", label: "Type" },
        { key: "grams", label: "Grams" },
        { key: "purity", label: "Purity" },
        { key: "purchaseDate", label: "Purchase Date" },
        { key: "purchasePrice", label: "Purchase Price" },
        { key: "currentValue", label: "Current Value" },
        { key: "pnl", label: "P&L" },
        { key: "pnlPct", label: "P&L %" },
        { key: "interestRate", label: "Interest Rate %" },
        { key: "interestEarned", label: "Interest Earned" },
        { key: "maturityDate", label: "Maturity Date" },
        { key: "owner", label: "Owner" },
      ],
      `gold-sgb-holdings-${today()}.csv`
    );
  };

  const { run: handleSave, loading: savingGold } = useAsyncAction(
    async () => {
      if (editingId) {
        await updateItem("goldHoldings", editingId, form);
      } else {
        await addItem("goldHoldings", { ...form, id: uid() });
      }
    },
    {
      onSuccess: () => {
        setShowModal(false);
        setForm({ ...EMPTY_GOLD });
        setEditingId(null);
      },
      onError: (e) =>
        showToast?.(`Failed to save gold holding: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: deleteHolding } = useAsyncAction(
    async (id) => {
      await removeItem("goldHoldings", id);
    },
    {
      onError: (e) =>
        showToast?.(`Failed to delete gold holding: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const handleEdit = (h: any) => {
    setForm({
      name: h.name,
      type: h.type,
      grams: h.grams,
      purchasePrice: h.purchasePrice,
      purchaseDate: h.purchaseDate,
      maturityDate: h.maturityDate,
      interestRate: h.interestRate || 2.5,
      notes: h.notes,
      owner: h.owner,
      purity: h.purity || "24K",
    });
    setEditingId(h.id);
    setShowModal(true);
  };

  const commitGoldPrice = async (price: any) => {
    const clean = Number(price);
    if (!clean || clean <= 0) {
      setManualPrice(false);
      return;
    }
    try {
      localStorage.setItem("gold_price_per_gram", String(clean));
    } catch {}
    if (updateSettings) {
      await updateSettings({ goldPricePerGram: clean });
    }
    setManualPrice(false);
  };

  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub="Precious metals portfolio, Sovereign Gold Bonds (SGBs), 2.5% RBI interest payouts, and purity tracking"
        rightElement={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {holdings.length > 0 && (
              <Button variant="ghost" size="sm" icon={<Download size={13} />} onClick={handleExportCSV}>
                Export CSV
              </Button>
            )}
            <Button
              variant="accent"
              icon={<Plus size={14} />}
              onClick={() => {
                setForm({ ...EMPTY_GOLD });
                setEditingId(null);
                setShowModal(true);
              }}
            >
              Add Holding
            </Button>
          </div>
        }
      >
        Gold & SGB Portfolio
      </SectionTitle>

      {/* Hero Cockpit */}
      {holdings.length > 0 && (
        <>
          <Card
            variant="base"
            style={{
              marginBottom: 20,
              padding: "clamp(24px, 4vw, 36px)",
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 94%, var(--t-gold) 6%), var(--surface-0))",
              border: `1px solid ${THEME.line}`,
              borderTop: `4px solid ${THEME.gold}`,
              borderRadius: "var(--radius-xl)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 20,
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: THEME.muted,
                    marginBottom: 6,
                  }}
                >
                  <Coins size={14} color={THEME.gold} /> Total Precious Metals Valuation
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(34px, 5vw, 52px)",
                    fontWeight: 900,
                    color: THEME.ink,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.05,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <Money value={animatedTotalValue} variant="full" />
                </div>
                <div style={{ fontSize: 13, color: THEME.muted, marginTop: 6, fontWeight: 600 }}>
                  <strong style={{ color: THEME.ink }}>{stats.totalGrams.toFixed(2)}g</strong> total gold holding ·{" "}
                  <span style={{ color: stats.totalPnL >= 0 ? THEME.sage : THEME.rust, fontWeight: 700 }}>
                    {stats.totalPnL >= 0 ? "+" : ""}
                    <Money value={stats.totalPnL} variant="full" /> ({stats.totalPnL >= 0 ? "+" : ""}
                    {stats.totalPnLPct.toFixed(1)}%)
                  </span>{" "}
                  unrealized gain
                </div>
              </div>

              {/* Live Gold Benchmark Price Box */}
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  alignItems: "flex-end",
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: THEME.muted }}>
                  24K Benchmark Rate / Gram
                </span>
                {manualPrice ? (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input
                      type="number"
                      autoFocus
                      value={draftPrice}
                      onChange={(e) => setDraftPrice(Number(e.target.value))}
                      onBlur={() => commitGoldPrice(draftPrice)}
                      onKeyDown={(e) => e.key === "Enter" && commitGoldPrice(draftPrice)}
                      style={{
                        width: 80,
                        padding: "3px 6px",
                        borderRadius: 4,
                        border: `1px solid ${THEME.accent}`,
                        fontSize: 13,
                        fontWeight: 800,
                        background: "var(--surface-1)",
                        color: THEME.ink,
                      }}
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => setManualPrice(true)}
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      color: THEME.gold,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                    title="Click to update benchmark price"
                  >
                    {fmtINR(goldPrice)}/g <Pencil size={11} style={{ opacity: 0.6 }} />
                  </div>
                )}
                <span style={{ fontSize: 10, color: THEME.muted }}>22K: {fmtINR(goldPrice * 0.916)}/g</span>
              </div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <StatCard
              label="Total Gold Weight"
              value={`${stats.totalGrams.toFixed(2)} grams`}
              sub={`~${(stats.totalGrams / 10).toFixed(2)} tola`}
              icon={<Coins />}
              color={THEME.gold}
            />
            <StatCard
              label="Total Invested"
              value={fmtINRFull(stats.totalInvested)}
              numericValue={stats.totalInvested}
              formatValue={fmtINRFull}
              sub="Acquisition cost"
              icon={<IndianRupee />}
              color={THEME.accent}
            />
            <StatCard
              label="Total Returns (P&L)"
              value={`${stats.totalPnL >= 0 ? "+" : ""}${fmtINRFull(stats.totalPnL)}`}
              numericValue={stats.totalPnL}
              formatValue={(n) => `${n >= 0 ? "+" : ""}${fmtINRFull(n)}`}
              sub={`${stats.totalPnL >= 0 ? "+" : ""}${stats.totalPnLPct.toFixed(1)}% portfolio gain`}
              icon={<TrendingUp />}
              color={stats.totalPnL >= 0 ? THEME.sage : THEME.rust}
            />
            <StatCard
              label="SGB Annual 2.5% Coupon"
              value={fmtINRFull(stats.sgbAnnualCoupon)}
              numericValue={stats.sgbAnnualCoupon}
              formatValue={fmtINRFull}
              sub={`+${fmtINRFull(stats.totalInterest)} accrued interest`}
              icon={<Award />}
              color={THEME.sage}
            />
          </div>

          {/* View Mode Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
              padding: "12px 16px",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                onClick={() => setViewMode("cards")}
                className={`demat-portfolio-pill ${viewMode === "cards" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
              >
                <LayoutGrid size={13} /> All Holdings
              </button>
              <button
                onClick={() => setViewMode("sgb")}
                className={`demat-portfolio-pill ${viewMode === "sgb" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
              >
                <Landmark size={13} /> SGB Tranches
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`demat-portfolio-pill ${viewMode === "table" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
              >
                <TableIcon size={13} /> Table
              </button>
            </div>

            {/* Filter Pills */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {(["all", "physical", "sgb", "digital", "etf"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`demat-portfolio-pill ${filterType === t ? "active" : ""}`}
                  style={{ fontSize: 11, padding: "4px 10px" }}
                >
                  {t === "all" ? "All Types" : t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Render View */}
      {holdings.length === 0 ? (
        <EmptyState
          icon={Coins}
          gradient={`linear-gradient(135deg, ${THEME.gold}, ${THEME.sage})`}
          title="No Gold or SGB Holdings Added"
          description="Track physical jewelry, gold coins, Sovereign Gold Bonds (SGBs), and gold mutual funds with live valuations."
          pills={["Sovereign Gold Bonds (SGB)", "Physical Gold 22K/24K", "Gold ETFs", "Digital Gold"]}
          buttonLabel="Add First Holding"
          onAdd={() => {
            setForm({ ...EMPTY_GOLD });
            setEditingId(null);
            setShowModal(true);
          }}
        />
      ) : viewMode === "sgb" ? (
        /* SGB SPECIALIZED VIEW */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {enriched
            .filter((h) => h.type === "sgb")
            .map((h) => {
              const isMatured = h.maturityStatus === "Matured";
              return (
                <div
                  key={h.id}
                  className="card-lift"
                  style={{
                    padding: 20,
                    borderRadius: "var(--radius-xl)",
                    background: "var(--surface-0)",
                    border: `1px solid ${THEME.line}`,
                    borderTop: `4px solid ${isMatured ? THEME.muted : THEME.sage}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: isMatured ? THEME.muted : THEME.sage, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
                      <Landmark size={13} /> Sovereign Gold Bond
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isMatured ? THEME.muted : THEME.gold }}>
                      {isMatured ? "Interest Ceased (Matured)" : "2.5% p.a. RBI Interest"}
                    </span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink, marginBottom: 8 }}>
                    {h.name || "RBI SGB Series"}
                  </div>
                  <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 14 }}>
                    {h.grams} grams · {isMatured ? "Final Redemption Value: " : "Current Value: "}<strong><Money value={h.currentValue} variant="full" /></strong>
                  </div>

                  <div
                    style={{
                      padding: 12,
                      borderRadius: "var(--radius-md)",
                      background: `color-mix(in srgb, ${isMatured ? THEME.muted : THEME.sage} 6%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${isMatured ? THEME.muted : THEME.sage} 15%, transparent)`,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: THEME.muted }}>Maturity Status:</span>
                      <span style={{ fontWeight: 800, color: isMatured ? THEME.muted : THEME.ink }}>{h.maturityStatus || "—"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: THEME.muted }}>{isMatured ? "Total Lifetime Interest:" : "Accrued Interest:"}</span>
                      <span style={{ fontWeight: 800, color: isMatured ? THEME.ink : THEME.sage }}>+{fmtINR(h.interest)}</span>
                    </div>
                  </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                  <button onClick={() => handleEdit(h)} className="icon-btn" style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setConfirmDelete(h.id)} className="icon-btn danger" style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <Card style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-1)", borderBottom: `1.5px solid ${THEME.line}` }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Name</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Type</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Grams</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Invested</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Current Value</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>P&L</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((h) => (
                  <tr key={h.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: THEME.ink }}>
                      {h.name || h.typeInfo.label}
                    </td>
                    <td style={{ padding: "14px 16px", color: THEME.muted }}>{h.typeInfo.label}</td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800 }}>{h.grams}g</td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <Money value={h.invested} variant="full" />
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800, color: THEME.gold }}>
                      <Money value={h.currentValue} variant="full" />
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800, color: h.pnl >= 0 ? THEME.sage : THEME.rust }}>
                      {h.pnl >= 0 ? "+" : ""}{fmtINR(h.pnl)} ({h.pnlPct.toFixed(1)}%)
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button onClick={() => handleEdit(h)} className="icon-btn" style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setConfirmDelete(h.id)} className="icon-btn danger" style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* CARDS VIEW */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {sorted.map((h) => (
            <div
              key={h.id}
              className="card-lift"
              style={{
                padding: 20,
                borderRadius: "var(--radius-xl)",
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
                borderTop: `4px solid ${h.typeInfo.color}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: h.typeInfo.color,
                    background: `color-mix(in srgb, ${h.typeInfo.color} 12%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${h.typeInfo.color} 25%, transparent)`,
                    padding: "2px 8px",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {h.type === "sgb" ? <Landmark size={11} /> : h.type === "etf" ? <BarChart3 size={11} /> : h.type === "digital" ? <Zap size={11} /> : <Coins size={11} />} {h.typeInfo.label}
                </span>
                {h.type === "physical" && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: THEME.muted }}>
                    Purity: <strong>{h.purity || "24K"}</strong>
                  </span>
                )}
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => handleEdit(h)} className="icon-btn" style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setConfirmDelete(h.id)} className="icon-btn danger" style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
                {h.name || h.typeInfo.label}
              </div>
              <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 14 }}>
                Weight: <strong style={{ color: THEME.ink }}>{h.grams} grams</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", fontWeight: 700 }}>
                    Current Value
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: THEME.gold }}>
                    <Money value={h.currentValue} variant="full" />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", fontWeight: 700 }}>
                    Total Return
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: h.pnl >= 0 ? THEME.sage : THEME.rust }}>
                    {h.pnl >= 0 ? "+" : ""}{fmtINR(h.pnl)} ({h.pnlPct.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal
          title={editingId ? "Edit Gold Holding" : "Add Gold / SGB Holding"}
          onClose={() => {
            setShowModal(false);
            setForm({ ...EMPTY_GOLD });
            setEditingId(null);
          }}
        >
          <div className="form-grid-2" style={{ gap: 12 }}>
            <Field label="Holding Name">
              <input
                type="text"
                placeholder="e.g. 24K Gold Bar, Tanishq Ring, SGB 2023-24 Series I"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${THEME.line}` }}
              />
            </Field>
            <Field label="Asset Type">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${THEME.line}` }}
              >
                {GOLD_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Weight (Grams) *">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.grams || ""}
                onChange={(e) => setForm({ ...form, grams: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${THEME.line}` }}
              />
            </Field>
            {form.type === "physical" && (
              <Field label="Purity">
                <select
                  value={form.purity || "24K"}
                  onChange={(e) => setForm({ ...form, purity: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${THEME.line}` }}
                >
                  <option value="24K">24K (99.9% Pure Gold)</option>
                  <option value="22K">22K (91.6% Hallmark Gold)</option>
                  <option value="18K">18K (75.0% Jewelry Gold)</option>
                  <option value="14K">14K (58.3% Gold)</option>
                </select>
              </Field>
            )}
            <Field label="Purchase Price (Total ₹)">
              <input
                type="number"
                min="0"
                value={form.purchasePrice || ""}
                onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${THEME.line}` }}
              />
            </Field>
            <Field label="Purchase Date">
              <input
                type="date"
                value={form.purchaseDate || ""}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${THEME.line}` }}
              />
            </Field>
            {form.type === "sgb" && (
              <>
                <Field label="Maturity Date">
                  <input
                    type="date"
                    value={form.maturityDate || ""}
                    onChange={(e) => setForm({ ...form, maturityDate: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${THEME.line}` }}
                  />
                </Field>
                <Field label="Interest Rate (% p.a.)">
                  <input
                    type="number"
                    step="0.1"
                    value={form.interestRate || 2.5}
                    onChange={(e) => setForm({ ...form, interestRate: Number(e.target.value) })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${THEME.line}` }}
                  />
                </Field>
              </>
            )}
          </div>
          <ModalActions>
            <Button
              variant="ghost"
              onClick={() => {
                setShowModal(false);
                setForm({ ...EMPTY_GOLD });
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="accent" onClick={handleSave} disabled={!(Number(form.grams) > 0)} loading={savingGold}>
              Save Holding
            </Button>
          </ModalActions>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="Delete this gold holding? This cannot be undone."
          onConfirm={() => {
            deleteHolding(confirmDelete);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};
