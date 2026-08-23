// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Coins,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  IndianRupee,
  Calendar,
  Award,
  RefreshCw,
  Download,
  ArrowUpDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
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
  { id: "physical", label: "Physical Gold", color: THEME.gold },
  { id: "sgb", label: "Sovereign Gold Bond (SGB)", color: THEME.sage },
  { id: "digital", label: "Digital Gold", color: THEME.accent },
  { id: "etf", label: "Gold ETF", color: THEME.violet },
  { id: "mf", label: "Gold Mutual Fund", color: THEME.pink },
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

const SORT_OPTIONS = [
  { id: "value", label: "Current Value (High-Low)" },
  { id: "pnl", label: "P&L (High-Low)" },
  { id: "purchaseDate", label: "Purchase Date (Newest)" },
  { id: "name", label: "Name (A-Z)" },
];

export const GoldSGBTab = ({ state, addItem, removeItem, updateItem, updateSettings, showToast }) => {
  const { familyProfiles } = useMasterData();
  const { privacyMode } = usePrivacy();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_GOLD });
  const [sortBy, setSortBy] = useState("value");
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Gold price is entered here but consumed by many other tabs (Net Worth,
  // Analytics, Rebalancing, Family View, Benchmark) — it's synced through
  // state.settings.goldPricePerGram (DB-backed, so it's the same on every
  // device) via getGoldPricePerGram(); localStorage is kept only as a
  // same-device cache for the instant before settings load.
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
      // Without a recorded purchase price there's no gain/loss to compute — fall
      // back to currentValue (so this holding contributes 0, not a fabricated
      // number) but flag it via hasPurchasePrice so the UI can say "not tracked"
      // instead of lying with a "+₹0 (0.0%)" P&L.
      const invested = hasPurchasePrice ? purchasePrice : currentValue;
      const pnl = currentValue - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
      const cagr =
        hasPurchasePrice && h.purchaseDate ? calcCAGR(invested, currentValue, h.purchaseDate) : null;

      // SGB interest — accrues only up to maturity/redemption; SGBs stop paying
      // interest once matured, so accrual must not run past maturityDate.
      let interest = 0;
      if (h.type === "sgb" && h.purchaseDate) {
        // Parse at local midnight — bare `new Date("YYYY-MM-DD")` parses as UTC
        // midnight, which for IST shifts both dates by hours vs. `new Date()` (an
        // exact local instant), skewing the accrued-years figure.
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

  const sorted = useMemo(() => {
    const arr = [...enriched];
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
  }, [enriched, sortBy]);

  const stats = useMemo(() => {
    const totalGrams = enriched.reduce((s, h) => s + h.grams, 0);
    const totalInvested = enriched.reduce((s, h) => s + h.invested, 0);
    const totalValue = enriched.reduce((s, h) => s + h.currentValue, 0);
    const totalPnL = totalValue - totalInvested;
    const totalInterest = enriched
      .filter((h) => h.type === "sgb")
      .reduce((s, h) => s + h.interest, 0);
    const untrackedCount = enriched.filter((h) => !h.hasPurchasePrice).length;

    const byType = GOLD_TYPES.map((t) => {
      const items = enriched.filter((h) => h.type === t.id);
      return {
        name: t.label,
        grams: items.reduce((s, h) => s + h.grams, 0),
        value: items.reduce((s, h) => s + h.currentValue, 0),
        color: t.color,
      };
    }).filter((t) => t.grams > 0);

    return { totalGrams, totalInvested, totalValue, totalPnL, totalInterest, untrackedCount, byType };
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
    async (id) => { await removeItem("goldHoldings", id); },
    { onError: (e) => showToast?.(`Failed to delete gold holding: ${e?.message || "Unknown error"}`, "error") }
  );

  const handleEdit = (h) => {
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
      purity: h.purity,
    });
    setEditingId(h.id);
    setShowModal(true);
  };

  // Commits the price into state.settings via the shared updateSettings helper
  // (which also upserts user_settings.gold_price_per_gram in the DB, so the
  // daily email cron and every other tab see the same number on any device) —
  // committed once on blur/Enter rather than on every keystroke.
  const commitGoldPrice = async (price) => {
    const clean = Number(price);
    if (!clean || clean <= 0) {
      setManualPrice(false);
      return;
    }
    try {
      localStorage.setItem("gold_price_per_gram", String(clean));
    } catch {}
    await updateSettings({ goldPricePerGram: clean });
    setManualPrice(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <SectionTitle sub="Track physical gold, SGBs, ETFs and digital gold">
          Gold & Sovereign Gold Bonds
        </SectionTitle>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              background: THEME.bg,
              border: `1px solid ${THEME.border}`,
            }}
          >
            <Coins size={14} color={THEME.gold} />
            <span style={{ fontSize: 12, color: THEME.textSecondary }}>Gold:</span>
            {manualPrice ? (
              <input
                type="number"
                value={draftPrice}
                aria-label="Gold price per gram override"
                onChange={(e) => setDraftPrice(Number(e.target.value))}
                onBlur={() => commitGoldPrice(draftPrice)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setManualPrice(false);
                  }
                }}
                autoFocus
                style={{
                  width: 70,
                  padding: "2px 4px",
                  borderRadius: 4,
                  border: `1px solid ${THEME.border}`,
                  background: THEME.card,
                  color: THEME.text,
                  fontSize: 13,
                }}
              />
            ) : (
              <span
                role="button"
                tabIndex={0}
                aria-label={`Gold price ${privacyMode ? "••••" : fmtINRFull(goldPrice)} per gram. Click to edit.`}
                onClick={() => {
                  setDraftPrice(goldPrice);
                  setManualPrice(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDraftPrice(goldPrice);
                    setManualPrice(true);
                  }
                }}
                style={{ fontSize: 13, fontWeight: 600, color: THEME.gold, cursor: "pointer" }}
              >
                <Money value={goldPrice} variant="full" />/g
              </span>
            )}
          </div>
          {holdings.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="icon-btn"
              title="Export holdings to CSV"
              aria-label="Export holdings to CSV"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 12px",
                borderRadius: 8,
                border: `1px solid ${THEME.border}`,
                background: THEME.card,
                color: THEME.textSecondary,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              <Download size={14} />
            </button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setForm({ ...EMPTY_GOLD });
              setEditingId(null);
              setShowModal(true);
            }}
          >
            <Plus size={16} /> Add Gold
          </Button>
        </div>
      </div>

      {holdings.length > 0 && (
        <>
          {/* Current Value is the one number this whole tab answers, so it earns
              the hero-card slot — matches the FIRE Number / Goals Overall Progress
              / Real Estate Portfolio Value treatment used across the app. */}
          <Card
            variant="hero"
            style={{
              padding: "clamp(24px, 4vw, 36px)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              <Coins size={13} /> Current Gold Value
            </div>
            <div
              style={{
                fontSize: "clamp(32px, 5vw, 52px)",
                fontWeight: 900,
                color: "#fff",
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <Money value={animatedTotalValue} variant="full" />
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
              {stats.totalGrams.toFixed(2)}g held ·{" "}
              {stats.totalPnL >= 0 ? "Up " : "Down "}
              <Money value={Math.abs(stats.totalPnL)} variant="full" /> against{" "}
              <Money value={stats.totalInvested} variant="full" /> invested
            </div>
          </Card>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
            }}
          >
            <StatCard
              label="Total Gold"
              value={`${stats.totalGrams.toFixed(2)}g`}
              numericValue={stats.totalGrams}
              formatValue={(n) => `${n.toFixed(2)}g`}
              icon={<Coins />}
              color={THEME.gold}
            />
            <StatCard
              label="Total Invested"
              value={fmtINRFull(stats.totalInvested)}
              numericValue={stats.totalInvested}
              formatValue={fmtINRFull}
              icon={<IndianRupee />}
              color={THEME.accent}
            />
            <StatCard
              label="P&L"
              value={fmtINRFull(stats.totalPnL)}
              numericValue={stats.totalPnL}
              formatValue={fmtINRFull}
              sub={
                stats.untrackedCount > 0
                  ? `${stats.untrackedCount} holding${stats.untrackedCount > 1 ? "s" : ""} missing purchase price — understated`
                  : undefined
              }
              icon={<TrendingUp />}
              color={stats.totalPnL >= 0 ? THEME.sage : THEME.rust}
            />
            {stats.totalInterest > 0 && (
              <StatCard
                label="SGB Interest Earned"
                value={fmtINRFull(stats.totalInterest)}
                numericValue={stats.totalInterest}
                formatValue={fmtINRFull}
                icon={<Award />}
                color={THEME.sage}
              />
            )}
          </div>
        </>
      )}

      {/* Type Breakdown */}
      {stats.byType.length > 1 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          <Card style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>
              By Type
            </h3>
            <div style={{ width: "100%", height: 250, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={stats.byType}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {stats.byType.map((t, i) => (
                    <Cell key={i} fill={t.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => <Money value={v} variant="full" />}
                  contentStyle={{
                    background: "var(--surface-0)",
                    border: `1px solid ${THEME.line}`,
                    borderRadius: 8,
                    color: THEME.ink,
                  }}
                  labelStyle={{ color: THEME.ink }}
                  itemStyle={{ color: THEME.ink }}
                />
              </PieChart>
            </ResponsiveContainer></div>
          </Card>
          <Card style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>
              Holdings by Type
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {stats.byType.map((t) => (
                <div
                  key={t.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: THEME.bg,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{ width: 10, height: 10, borderRadius: "50%", background: t.color }}
                    />
                    <span style={{ fontSize: 13, color: THEME.text }}>{t.name}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>
                      <Money value={t.value} variant="full" />
                    </div>
                    <div style={{ fontSize: 11, color: THEME.textSecondary }}>
                      {t.grams.toFixed(2)}g
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Holdings Cards */}
      {enriched.length > 0 ? (
        <>
          {enriched.length > 1 && (
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
              <ArrowUpDown size={13} color={THEME.textSecondary} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort holdings by"
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  background: THEME.card,
                  color: THEME.text,
                  fontSize: 12,
                }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    Sort: {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(var(--grid-min-lg), 1fr))",
              gap: 16,
            }}
          >
            {sorted.map((h) => (
            <Card key={h.id} style={{ padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${h.typeInfo.color} 20%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Coins size={20} color={h.typeInfo.color} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: THEME.text }}>
                      {h.name || h.typeInfo.label}
                    </div>
                    <div style={{ fontSize: 12, color: THEME.textSecondary, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span>
                        {h.typeInfo.label} {h.purity && `• ${h.purity}`}
                      </span>
                      {h.maturityStatus && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "1px 7px",
                            borderRadius: 999,
                            background:
                              h.maturityStatus === "Matured"
                                ? `color-mix(in srgb, ${THEME.sage} 18%, transparent)`
                                : `color-mix(in srgb, ${THEME.accent} 14%, transparent)`,
                            color: h.maturityStatus === "Matured" ? THEME.sage : THEME.accent,
                          }}
                        >
                          {h.maturityStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => handleEdit(h)}
                    className="icon-btn"
                    aria-label="Edit holding"
                    title="Edit"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: THEME.textSecondary,
                      padding: 6,
                    }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: h.id, label: h.name || h.typeInfo.label })}
                    className="icon-btn danger"
                    aria-label="Delete holding"
                    title="Delete"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: THEME.rust,
                      padding: 6,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <div>
                  <div style={{ color: THEME.textSecondary, fontSize: 11 }}>Weight</div>
                  <div style={{ fontWeight: 600 }}>{h.grams}g</div>
                </div>
                <div>
                  <div style={{ color: THEME.textSecondary, fontSize: 11 }}>Current Value</div>
                  <div style={{ fontWeight: 600, color: h.typeInfo.color }}>
                    <Money value={h.currentValue} variant="full" />
                  </div>
                </div>
                <div>
                  <div style={{ color: THEME.textSecondary, fontSize: 11 }}>Invested</div>
                  <div style={{ fontWeight: 600 }}>
                    <Money value={h.invested} variant="full" />
                  </div>
                </div>
                <div>
                  <div style={{ color: THEME.textSecondary, fontSize: 11 }}>P&L</div>
                  {h.hasPurchasePrice ? (
                    <div style={{ fontWeight: 600, color: h.pnl >= 0 ? THEME.sage : THEME.rust }}>
                      {h.pnl >= 0 ? "+" : ""}
                      <Money value={h.pnl} variant="full" />{" "}
                      ({h.pnlPct.toFixed(1)}%)
                      {h.cagr != null && (
                        <span style={{ fontSize: 11, color: THEME.textSecondary, fontWeight: 500 }}>
                          {" "}
                          · {h.cagr.toFixed(1)}% CAGR
                        </span>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{ fontWeight: 500, fontSize: 12, color: THEME.textSecondary, fontStyle: "italic" }}
                      title="Add a purchase price to track gains/losses on this holding"
                    >
                      Not tracked
                    </div>
                  )}
                </div>
                {h.type === "sgb" && (
                  <>
                    <div>
                      <div style={{ color: THEME.textSecondary, fontSize: 11 }}>Interest Rate</div>
                      <div style={{ fontWeight: 600 }}>{h.interestRate}% p.a.</div>
                    </div>
                    <div>
                      <div style={{ color: THEME.textSecondary, fontSize: 11 }}>
                        Interest Earned
                      </div>
                      <div style={{ fontWeight: 600, color: THEME.sage }}>
                        <Money value={h.interest} variant="full" />
                      </div>
                    </div>
                    {h.maturityDate && (
                      <div>
                        <div style={{ color: THEME.textSecondary, fontSize: 11 }}>Maturity</div>
                        <div style={{ fontWeight: 600 }}>{h.maturityDate}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
              {h.owner && h.owner !== "self" && (
                <div style={{ marginTop: 8, fontSize: 11, color: THEME.textSecondary }}>
                  Owner: {familyProfiles.find((p) => p.id === h.owner)?.name || h.owner}
                </div>
              )}
            </Card>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={Coins}
          gradient={`linear-gradient(135deg, ${THEME.gold} 0%, color-mix(in srgb, ${THEME.gold} 65%, white) 100%)`}
          dotColor={THEME.gold}
          title="No Gold Holdings"
          description="Track your physical gold, Sovereign Gold Bonds (SGBs), Gold ETFs, and digital gold holdings."
          pills={["P&L + CAGR", "SGB Interest Tracking", "Net Worth Integration"]}
          buttonLabel="Add Your First Gold Holding"
          onAdd={() => {
            setForm({ ...EMPTY_GOLD });
            setEditingId(null);
            setShowModal(true);
          }}
        />
      )}

      {/* Modal */}
      {showModal && (
        <Modal
          title={editingId ? "Edit Gold Holding" : "Add Gold Holding"}
          onClose={() => setShowModal(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Name / Description">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Gold Chain 22K"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  background: THEME.card,
                  color: THEME.text,
                }}
              />
            </Field>
            <Field label="Type">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  background: THEME.card,
                  color: THEME.text,
                }}
              >
                {GOLD_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Weight (grams)">
              <input
                type="number"
                step="0.01"
                value={form.grams}
                onChange={(e) => setForm({ ...form, grams: Number(e.target.value) })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  background: THEME.card,
                  color: THEME.text,
                }}
              />
            </Field>
            <Field label="Purchase Price (total ₹) — needed to track gain/loss">
              <input
                type="number"
                value={form.purchasePrice}
                onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  background: THEME.card,
                  color: THEME.text,
                }}
              />
            </Field>
            {form.type === "physical" && (
              <Field label="Purity">
                <select
                  value={form.purity}
                  onChange={(e) => setForm({ ...form, purity: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    background: THEME.card,
                    color: THEME.text,
                  }}
                >
                  {["24K", "22K", "18K", "14K"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Purchase Date">
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  background: THEME.card,
                  color: THEME.text,
                }}
              />
            </Field>
            {form.type === "sgb" && (
              <>
                <Field label="Maturity Date">
                  <input
                    type="date"
                    value={form.maturityDate}
                    onChange={(e) => setForm({ ...form, maturityDate: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1px solid ${THEME.border}`,
                      background: THEME.card,
                      color: THEME.text,
                    }}
                  />
                </Field>
                <Field label="Interest Rate (% p.a.)">
                  <input
                    type="number"
                    step="0.1"
                    value={form.interestRate}
                    onChange={(e) => setForm({ ...form, interestRate: Number(e.target.value) })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1px solid ${THEME.border}`,
                      background: THEME.card,
                      color: THEME.text,
                    }}
                  />
                </Field>
              </>
            )}
            <Field label="Owner">
              <select
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  background: THEME.card,
                  color: THEME.text,
                }}
              >
                {familyProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {formatProfileOption(p)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  background: THEME.card,
                  color: THEME.text,
                }}
              />
            </Field>
          </div>
          <ModalActions
            onSave={handleSave}
            onClose={() => setShowModal(false)}
            disabled={!form.grams || savingGold}
            loading={savingGold}
          />
        </Modal>
      )}
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete "${confirmDelete.label}" holding? This cannot be undone.`}
          onConfirm={() => {
            deleteHolding(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};
