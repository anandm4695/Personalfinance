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
  PieChart as PieChartIcon,
  Filter,
  Layers,
  Lock,
  Scale,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronRight,
  Gem,
  ArrowUpRight,
  Check,
  Shield,
  Calculator,
  FileSpreadsheet,
  Building2,
  CalendarClock,
  BadgePercent,
  SlidersHorizontal,
  Milestone,
  BookOpen,
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

// Asset Classification Constants
export const GOLD_TYPES = [
  { id: "physical", label: "Physical Gold", color: THEME.gold, icon: Coins, desc: "Jewelry, Coins & Fine Gold Bars" },
  { id: "sgb", label: "Sovereign Gold Bond (SGB)", color: THEME.sage, icon: Landmark, desc: "RBI 2.5% Coupon & 100% Tax Free at Maturity" },
  { id: "etf", label: "Gold ETF", color: THEME.accent, icon: BarChart3, desc: "NSE/BSE Listed Exchange Traded Funds" },
  { id: "mf", label: "Gold Mutual Fund (FoF)", color: THEME.pink || THEME.violet, icon: TrendingUp, desc: "Mutual Fund SIPs & Lump Sum Units" },
  { id: "digital", label: "Digital Gold", color: THEME.cyan || THEME.accent, icon: Zap, desc: "Augmont / MMTC-PAMP Vault Backed" },
];

// Curated RBI Sovereign Gold Bond Tranches Directory for 1-click preset filling
export const RBI_SGB_SERIES_PRESETS = [
  { id: "sgb-2023-24-iv", name: "SGB 2023-24 Series IV", issueDate: "2024-02-21", issuePrice: 6263, maturityDate: "2032-02-21", couponRate: 2.5 },
  { id: "sgb-2023-24-iii", name: "SGB 2023-24 Series III", issueDate: "2023-12-28", issuePrice: 6199, maturityDate: "2031-12-28", couponRate: 2.5 },
  { id: "sgb-2023-24-ii", name: "SGB 2023-24 Series II", issueDate: "2023-09-20", issuePrice: 5923, maturityDate: "2031-09-20", couponRate: 2.5 },
  { id: "sgb-2023-24-i", name: "SGB 2023-24 Series I", issueDate: "2023-06-27", issuePrice: 5926, maturityDate: "2031-06-27", couponRate: 2.5 },
  { id: "sgb-2022-23-iv", name: "SGB 2022-23 Series IV", issueDate: "2023-03-14", issuePrice: 5611, maturityDate: "2031-03-14", couponRate: 2.5 },
  { id: "sgb-2022-23-iii", name: "SGB 2022-23 Series III", issueDate: "2022-12-27", issuePrice: 5409, maturityDate: "2030-12-27", couponRate: 2.5 },
  { id: "sgb-2022-23-ii", name: "SGB 2022-23 Series II", issueDate: "2022-08-30", issuePrice: 5197, maturityDate: "2030-08-30", couponRate: 2.5 },
  { id: "sgb-2022-23-i", name: "SGB 2022-23 Series I", issueDate: "2022-06-28", issuePrice: 5091, maturityDate: "2030-06-28", couponRate: 2.5 },
  { id: "sgb-2021-22-x", name: "SGB 2021-22 Series X", issueDate: "2022-03-08", issuePrice: 5109, maturityDate: "2030-03-08", couponRate: 2.5 },
  { id: "sgb-2021-22-viii", name: "SGB 2021-22 Series VIII", issueDate: "2021-12-07", issuePrice: 4791, maturityDate: "2029-12-07", couponRate: 2.5 },
  { id: "sgb-2021-22-i", name: "SGB 2021-22 Series I", issueDate: "2021-05-25", issuePrice: 4777, maturityDate: "2029-05-25", couponRate: 2.5 },
  { id: "sgb-2020-21-viii", name: "SGB 2020-21 Series VIII", issueDate: "2020-11-18", issuePrice: 5177, maturityDate: "2028-11-18", couponRate: 2.5 },
  { id: "sgb-2020-21-vi", name: "SGB 2020-21 Series VI", issueDate: "2020-09-08", issuePrice: 5117, maturityDate: "2028-09-08", couponRate: 2.5 },
  { id: "sgb-2020-21-i", name: "SGB 2020-21 Series I", issueDate: "2020-04-28", issuePrice: 4639, maturityDate: "2028-04-28", couponRate: 2.5 },
  { id: "sgb-2019-20-i", name: "SGB 2019-20 Series I", issueDate: "2019-06-11", issuePrice: 3196, maturityDate: "2027-06-11", couponRate: 2.5 },
  { id: "sgb-2018-19-i", name: "SGB 2018-19 Series I", issueDate: "2018-05-04", issuePrice: 3114, maturityDate: "2026-05-04", couponRate: 2.5 },
  { id: "sgb-2017-18-iii", name: "SGB 2017-18 Series III", issueDate: "2017-10-23", issuePrice: 2956, maturityDate: "2025-10-23", couponRate: 2.5 },
  { id: "sgb-2016-17-i", name: "SGB 2016-17 Series I", issueDate: "2016-11-17", issuePrice: 3007, maturityDate: "2024-11-17", couponRate: 2.5 },
];

const EMPTY_GOLD = {
  name: "",
  type: "physical",
  grams: 0,
  grossGrams: 0,
  purchasePrice: 0,
  purchaseDate: "",
  maturityDate: "",
  interestRate: 2.5,
  purity: "24K",
  makingCharges: 0,
  vaultLocation: "Bank Locker",
  hallmarkUid: "",
  certificateNo: "",
  dematAccount: "",
  nominee: "",
  owner: "self",
  notes: "",
};

export const GoldSGBTab = ({
  state,
  addItem,
  removeItem,
  updateItem,
  updateSettings,
  showToast,
  activeProfile,
}: any) => {
  const { familyProfiles } = useMasterData();
  const { privacyMode } = usePrivacy();

  // Navigation Sub-Views
  const [viewTab, setViewTab] = useState<"overview" | "sgb" | "physical" | "table" | "simulator" | "tax">("overview");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"value" | "pnl" | "grams" | "purchaseDate" | "maturityDate">("value");

  // Rate Editing State
  const goldPrice = useMemo(() => getGoldPricePerGram(state), [state?.settings?.goldPricePerGram]);
  const [manualPriceModal, setManualPriceModal] = useState(false);
  const [draftPrice, setDraftPrice] = useState<number>(goldPrice);

  // Form & Modals
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_GOLD });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Simulator State
  const [simWeightGrams, setSimWeightGrams] = useState<number>(50);
  const [simHoldingYears, setSimHoldingYears] = useState<number>(8);
  const [simGoldCagr, setSimGoldCagr] = useState<number>(10);
  const [simMakingChargePct, setSimMakingChargePct] = useState<number>(12);

  // Derived Multi-Purity Rates
  const rate24K = goldPrice;
  const rate22K = Math.round(goldPrice * (22 / 24));
  const rate18K = Math.round(goldPrice * (18 / 24));
  const rate14K = Math.round(goldPrice * (14 / 24));

  const holdings = useMemo(() => [...(state?.goldHoldings || [])], [state?.goldHoldings]);

  // Enriched Holdings with Deep Analytics
  const enriched = useMemo(() => {
    return holdings.map((h) => {
      const grams = Number(h.grams || 0);
      const grossGrams = Number(h.grossGrams || h.grams || 0);
      const purchasePrice = Number(h.purchasePrice || 0);
      const hasPurchasePrice = purchasePrice > 0;
      const purity = h.purity || (h.type === "physical" ? "22K" : "24K");
      const purityMul = h.type === "physical" ? GOLD_PURITY_FACTOR[purity] || 1 : 1;
      const currentValue = grams * goldPrice * purityMul;
      const invested = hasPurchasePrice ? purchasePrice : currentValue;
      const pnl = currentValue - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
      const cagr =
        hasPurchasePrice && h.purchaseDate ? calcCAGR(invested, currentValue, h.purchaseDate) : null;

      // SGB 2.5% Semi-Annual Accrued Interest & Early Exit Radar
      let interest = 0;
      let annualCouponAmount = 0;
      let monthsToMaturity = null;
      let prematureExitEligible = false;
      let yearsHeld = 0;

      if (h.type === "sgb") {
        const couponRate = Number(h.interestRate || 2.5);
        annualCouponAmount = (invested * couponRate) / 100;

        if (h.purchaseDate) {
          const nowMs = new Date().getTime();
          const pDateMs = new Date(h.purchaseDate + "T00:00:00").getTime();
          yearsHeld = Math.max(0, (nowMs - pDateMs) / (365.25 * 86400000));
          
          const accrualEndTime = h.maturityDate
            ? Math.min(nowMs, new Date(h.maturityDate + "T00:00:00").getTime())
            : nowMs;
          const activeYears = Math.max(0, (accrualEndTime - pDateMs) / (365.25 * 86400000));
          interest = invested * (couponRate / 100) * activeYears;

          // RBI 5-year premature redemption rule
          if (yearsHeld >= 5 && (!h.maturityDate || monthsBetween(today(), h.maturityDate) > 0)) {
            prematureExitEligible = true;
          }
        }
      }

      let maturityStatus = null;
      let isMatured = false;
      if (h.type === "sgb" && h.maturityDate) {
        monthsToMaturity = monthsBetween(today(), h.maturityDate);
        if (monthsToMaturity <= 0) {
          maturityStatus = "Matured (100% Tax-Free)";
          isMatured = true;
        } else if (monthsToMaturity < 12) {
          maturityStatus = `Matures in ${monthsToMaturity}m`;
        } else {
          const y = Math.floor(monthsToMaturity / 12);
          const m = monthsToMaturity % 12;
          maturityStatus = `Matures in ${y}y${m ? ` ${m}m` : ""}`;
        }
      }

      const typeInfo = GOLD_TYPES.find((t) => t.id === h.type) || GOLD_TYPES[0];
      const ownerName = familyProfiles?.find((p: any) => p.id === h.owner)?.name || (h.owner === "self" ? "Self" : h.owner || "Self");

      return {
        ...h,
        grams,
        grossGrams,
        purity,
        purityMul,
        hasPurchasePrice,
        invested,
        currentValue,
        pnl,
        pnlPct,
        cagr,
        interest,
        annualCouponAmount,
        monthsToMaturity,
        prematureExitEligible,
        yearsHeld,
        isMatured,
        maturityStatus,
        typeInfo,
        ownerName,
      };
    });
  }, [holdings, goldPrice, familyProfiles]);

  // Filtering
  const filtered = useMemo(() => {
    return enriched.filter((h) => {
      if (filterType !== "all" && h.type !== filterType) return false;
      if (filterOwner !== "all" && h.owner !== filterOwner) return false;
      if (activeProfile && h.owner && h.owner !== activeProfile && h.owner !== "joint") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (h.name || "").toLowerCase().includes(q);
        const matchType = (h.typeInfo.label || "").toLowerCase().includes(q);
        const matchLocker = (h.vaultLocation || "").toLowerCase().includes(q);
        const matchNotes = (h.notes || "").toLowerCase().includes(q);
        const matchOwner = (h.ownerName || "").toLowerCase().includes(q);
        if (!matchName && !matchType && !matchLocker && !matchNotes && !matchOwner) return false;
      }
      return true;
    });
  }, [enriched, filterType, filterOwner, activeProfile, searchQuery]);

  // Sorting
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case "pnl":
        return arr.sort((a, b) => b.pnl - a.pnl);
      case "grams":
        return arr.sort((a, b) => b.grams - a.grams);
      case "purchaseDate":
        return arr.sort((a, b) => (b.purchaseDate || "").localeCompare(a.purchaseDate || ""));
      case "maturityDate":
        return arr.sort((a, b) => (a.maturityDate || "9999").localeCompare(b.maturityDate || "9999"));
      case "value":
      default:
        return arr.sort((a, b) => b.currentValue - a.currentValue);
    }
  }, [filtered, sortBy]);

  // High-Level Portfolio Statistics
  const stats = useMemo(() => {
    const totalGrams = enriched.reduce((s, h) => s + h.grams, 0);
    const totalInvested = enriched.reduce((s, h) => s + h.invested, 0);
    const totalValue = enriched.reduce((s, h) => s + h.currentValue, 0);
    const totalPnL = totalValue - totalInvested;
    const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    // SGB Specific Analytics
    const sgbHoldings = enriched.filter((h) => h.type === "sgb");
    const sgbValue = sgbHoldings.reduce((s, h) => s + h.currentValue, 0);
    const sgbGrams = sgbHoldings.reduce((s, h) => s + h.grams, 0);
    const sgbAccruedInterest = sgbHoldings.reduce((s, h) => s + h.interest, 0);
    const sgbAnnualCoupon = sgbHoldings
      .filter((h) => !h.isMatured)
      .reduce((s, h) => s + h.annualCouponAmount, 0);
    const sgbEarlyExitCount = sgbHoldings.filter((h) => h.prematureExitEligible && !h.isMatured).length;

    // Physical Gold Analytics
    const physicalHoldings = enriched.filter((h) => h.type === "physical");
    const physicalValue = physicalHoldings.reduce((s, h) => s + h.currentValue, 0);
    const physicalGrams = physicalHoldings.reduce((s, h) => s + h.grams, 0);

    // Asset Class Breakdown for Charts
    const byType = GOLD_TYPES.map((t) => {
      const items = enriched.filter((h) => h.type === t.id);
      return {
        id: t.id,
        name: t.label,
        grams: items.reduce((s, h) => s + h.grams, 0),
        value: items.reduce((s, h) => s + h.currentValue, 0),
        count: items.length,
        color: t.color,
      };
    }).filter((t) => t.grams > 0 || t.value > 0);

    // Purity Breakdown
    const purityMap: Record<string, { grams: number; value: number }> = {
      "24K": { grams: 0, value: 0 },
      "22K": { grams: 0, value: 0 },
      "18K": { grams: 0, value: 0 },
      "14K": { grams: 0, value: 0 },
    };
    enriched.forEach((h) => {
      const p = h.purity || "24K";
      if (!purityMap[p]) purityMap[p] = { grams: 0, value: 0 };
      purityMap[p].grams += h.grams;
      purityMap[p].value += h.currentValue;
    });

    const purityData = Object.entries(purityMap)
      .map(([k, v]) => ({ purity: k, ...v }))
      .filter((d) => d.grams > 0);

    // Units conversion for Indian contexts
    const tolas = totalGrams / 10; // Standard 10g Tola metric
    const sovereigns = totalGrams / 8; // 8g Pavan / Sovereign

    return {
      totalGrams,
      totalInvested,
      totalValue,
      totalPnL,
      totalPnLPct,
      tolas,
      sovereigns,
      sgbHoldings,
      sgbValue,
      sgbGrams,
      sgbAccruedInterest,
      sgbAnnualCoupon,
      sgbEarlyExitCount,
      physicalHoldings,
      physicalValue,
      physicalGrams,
      byType,
      purityData,
    };
  }, [enriched]);

  const animatedTotalValue = useAnimatedNumber(stats.totalValue);

  // Commit updated gold price
  const handleSaveGoldPrice = async () => {
    const clean = Number(draftPrice);
    if (!clean || clean <= 0) {
      setManualPriceModal(false);
      return;
    }
    try {
      localStorage.setItem("gold_price_per_gram", String(clean));
    } catch {}
    if (updateSettings) {
      await updateSettings({ goldPricePerGram: clean });
    }
    setManualPriceModal(false);
    showToast?.(`Live 24K Benchmark updated to ${fmtINR(clean)}/gram`, "success");
  };

  // CSV Export with Complete Metadata
  const handleExportCSV = () => {
    const rows = sorted.map((h) => ({
      name: h.name || h.typeInfo.label,
      type: h.typeInfo.label,
      grams: h.grams,
      grossGrams: h.grossGrams || h.grams,
      purity: h.purity || "24K",
      purchaseDate: h.purchaseDate || "",
      purchasePrice: h.hasPurchasePrice ? h.invested.toFixed(2) : "",
      currentValue: h.currentValue.toFixed(2),
      pnl: h.hasPurchasePrice ? h.pnl.toFixed(2) : "",
      pnlPct: h.hasPurchasePrice ? h.pnlPct.toFixed(2) : "",
      annualCoupon: h.type === "sgb" ? h.annualCouponAmount.toFixed(2) : "",
      accruedInterest: h.type === "sgb" ? h.interest.toFixed(2) : "",
      maturityDate: h.maturityDate || "",
      maturityStatus: h.maturityStatus || "",
      vaultLocation: h.vaultLocation || "",
      hallmarkUid: h.hallmarkUid || "",
      owner: h.ownerName,
      notes: h.notes || "",
    }));
    exportArrayToCSV(
      rows,
      [
        { key: "name", label: "Holding Name" },
        { key: "type", label: "Asset Type" },
        { key: "grams", label: "Net Weight (Grams)" },
        { key: "grossGrams", label: "Gross Weight (Grams)" },
        { key: "purity", label: "Purity" },
        { key: "purchaseDate", label: "Purchase Date" },
        { key: "purchasePrice", label: "Invested Cost (₹)" },
        { key: "currentValue", label: "Current Value (₹)" },
        { key: "pnl", label: "P&L Gain/Loss (₹)" },
        { key: "pnlPct", label: "P&L Return %" },
        { key: "annualCoupon", label: "SGB Annual Coupon (₹)" },
        { key: "accruedInterest", label: "SGB Accrued Interest (₹)" },
        { key: "maturityDate", label: "Maturity Date" },
        { key: "maturityStatus", label: "Maturity Status" },
        { key: "vaultLocation", label: "Vault / Locker" },
        { key: "hallmarkUid", label: "Hallmark UID / Ref" },
        { key: "owner", label: "Owner Profile" },
        { key: "notes", label: "Notes" },
      ],
      `gold-sgb-portfolio-ledger-${today()}.csv`
    );
  };

  // Save / Add Holding
  const { run: handleSaveHolding, loading: savingHolding } = useAsyncAction(
    async () => {
      const payload = {
        ...form,
        grams: Number(form.grams) || 0,
        grossGrams: Number(form.grossGrams) || Number(form.grams) || 0,
        purchasePrice: Number(form.purchasePrice) || 0,
        makingCharges: Number(form.makingCharges) || 0,
        interestRate: Number(form.interestRate) || 2.5,
      };

      if (editingId) {
        await updateItem("goldHoldings", editingId, payload);
        showToast?.("Gold holding updated successfully", "success");
      } else {
        await addItem("goldHoldings", { ...payload, id: uid() });
        showToast?.("Gold holding added to portfolio", "success");
      }
    },
    {
      onSuccess: () => {
        setShowModal(false);
        setForm({ ...EMPTY_GOLD });
        setEditingId(null);
      },
      onError: (e: any) =>
        showToast?.(`Failed to save holding: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: deleteHolding } = useAsyncAction(
    async (id: string) => {
      await removeItem("goldHoldings", id);
      showToast?.("Holding removed from portfolio", "info");
    },
    {
      onError: (e: any) =>
        showToast?.(`Failed to delete holding: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const handleEdit = (h: any) => {
    setForm({
      name: h.name || "",
      type: h.type || "physical",
      grams: h.grams || 0,
      grossGrams: h.grossGrams || h.grams || 0,
      purchasePrice: h.purchasePrice || 0,
      purchaseDate: h.purchaseDate || "",
      maturityDate: h.maturityDate || "",
      interestRate: h.interestRate || 2.5,
      purity: h.purity || "24K",
      makingCharges: h.makingCharges || 0,
      vaultLocation: h.vaultLocation || "Bank Locker",
      hallmarkUid: h.hallmarkUid || "",
      certificateNo: h.certificateNo || "",
      dematAccount: h.dematAccount || "",
      nominee: h.nominee || "",
      owner: h.owner || "self",
      notes: h.notes || "",
    });
    setEditingId(h.id);
    setShowModal(true);
  };

  // SGB Preset auto-fill helper
  const handleSelectSgbPreset = (presetId: string) => {
    const preset = RBI_SGB_SERIES_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const currentUnits = Number(form.grams) || 10;
    setForm((prev) => ({
      ...prev,
      name: preset.name,
      purchaseDate: preset.issueDate,
      maturityDate: preset.maturityDate,
      purchasePrice: preset.issuePrice * currentUnits,
      interestRate: preset.couponRate,
    }));
  };

  // Simulator Compounding Math
  const simResults = useMemo(() => {
    const initialCost = simWeightGrams * goldPrice;
    const futureGoldPricePerGram = goldPrice * Math.pow(1 + simGoldCagr / 100, simHoldingYears);
    const finalGoldNominalValue = simWeightGrams * futureGoldPricePerGram;

    // 1. SGB: 2.5% simple coupon per year on issue price + 100% Tax Free at 8 years
    const sgbAnnualCoupon = initialCost * 0.025;
    const sgbTotalCoupons = sgbAnnualCoupon * simHoldingYears;
    const sgbPreTaxTotal = finalGoldNominalValue + sgbTotalCoupons;
    const sgbTaxes = simHoldingYears >= 8 ? 0 : (finalGoldNominalValue - initialCost) * 0.125;
    const sgbNetReturn = sgbPreTaxTotal - sgbTaxes;
    const sgbGain = sgbNetReturn - initialCost;

    // 2. Physical Gold: 3% GST + Making Charges at buy, 12.5% LTCG on gain
    const physicalBuyExtra = initialCost * (0.03 + simMakingChargePct / 100);
    const physicalInvested = initialCost + physicalBuyExtra;
    const physicalGrossGain = finalGoldNominalValue - initialCost;
    const physicalLtcgTax = Math.max(0, physicalGrossGain * 0.125);
    const physicalNetReturn = finalGoldNominalValue - physicalLtcgTax;
    const physicalGain = physicalNetReturn - physicalInvested;

    // 3. Gold ETF: 0.50% annual expense ratio, 12.5% LTCG
    const etfEffectiveValue = finalGoldNominalValue * Math.pow(1 - 0.005, simHoldingYears);
    const etfGrossGain = etfEffectiveValue - initialCost;
    const etfLtcgTax = Math.max(0, etfGrossGain * 0.125);
    const etfNetReturn = etfEffectiveValue - etfLtcgTax;
    const etfGain = etfNetReturn - initialCost;

    return {
      initialCost,
      finalGoldNominalValue,
      sgb: { totalReturn: sgbNetReturn, gain: sgbGain, coupons: sgbTotalCoupons, tax: sgbTaxes },
      physical: { totalReturn: physicalNetReturn, gain: physicalGain, extraCost: physicalBuyExtra, tax: physicalLtcgTax },
      etf: { totalReturn: etfNetReturn, gain: etfGain, tax: etfLtcgTax },
    };
  }, [simWeightGrams, goldPrice, simGoldCagr, simHoldingYears, simMakingChargePct]);

  return (
    <div className="tab-content-enter" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Section Title & Quick Actions */}
      <SectionTitle
        sub="Institutional-grade precious metals management, Sovereign Gold Bond (SGB) radar, 2.5% RBI coupon scheduler & purity vault"
        rightElement={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Button
              variant="outline"
              size="sm"
              icon={<Scale size={13} />}
              onClick={() => {
                setDraftPrice(goldPrice);
                setManualPriceModal(true);
              }}
            >
              Rate: {fmtINR(goldPrice)}/g
            </Button>
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

      {/* Main Luxury Hero Valuation Cockpit */}
      {holdings.length > 0 && (
        <Card
          variant="base"
          style={{
            padding: "clamp(20px, 3vw, 28px)",
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            borderTop: `3px solid ${THEME.gold}`,
            borderRadius: "var(--radius-xl)",
            position: "relative",
            overflow: "hidden",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* Subtle watermark background */}
          <div
            style={{
              position: "absolute",
              right: -20,
              bottom: -20,
              opacity: 0.04,
              pointerEvents: "none",
              color: THEME.gold,
            }}
          >
            <Coins size={200} />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 20,
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Primary Net Worth Figure */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: THEME.muted,
                  marginBottom: 6,
                }}
              >
                <Coins size={15} color={THEME.gold} /> Precious Metals & Gold Portfolio Valuation
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(32px, 4vw, 44px)",
                  fontWeight: 900,
                  color: THEME.ink,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.05,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <Money value={animatedTotalValue} variant="full" />
              </div>

              {/* Sub-metrics summary pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 10,
                  fontSize: 13,
                  color: THEME.muted,
                }}
              >
                <span>
                  Holding: <strong style={{ color: THEME.ink }}>{stats.totalGrams.toFixed(2)} grams</strong> (
                  {stats.tolas.toFixed(2)} tola / {stats.sovereigns.toFixed(1)} pavan)
                </span>
                <span style={{ color: THEME.line }}>•</span>
                <span
                  style={{
                    color: stats.totalPnL >= 0 ? THEME.sage : THEME.rust,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <TrendingUp size={13} />
                  {stats.totalPnL >= 0 ? "+" : ""}
                  <Money value={stats.totalPnL} variant="full" /> ({stats.totalPnL >= 0 ? "+" : ""}
                  {stats.totalPnLPct.toFixed(1)}%) Gain
                </span>
                {stats.sgbAnnualCoupon > 0 && (
                  <>
                    <span style={{ color: THEME.line }}>•</span>
                    <span style={{ color: THEME.sage, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <Landmark size={12} />
                      +{fmtINR(stats.sgbAnnualCoupon)}/yr RBI Coupons
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Live Benchmark Rates Quick Card */}
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "var(--radius-lg)",
                background: "var(--surface-1)",
                border: `1px solid ${THEME.line}`,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                minWidth: 230,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: THEME.muted }}>
                  Live Benchmark Rates
                </span>
                <button
                  onClick={() => {
                    setDraftPrice(goldPrice);
                    setManualPriceModal(true);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: THEME.accent,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    padding: 0,
                  }}
                >
                  <Pencil size={10} /> Edit Rate
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>24K Fine Gold:</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: THEME.gold }}>{fmtINR(rate24K)}/g</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted }}>
                <span>22K Hallmark (91.6%):</span>
                <strong style={{ color: THEME.ink }}>{fmtINR(rate22K)}/g</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted }}>
                <span>18K Diamond Gold (75%):</span>
                <strong style={{ color: THEME.ink }}>{fmtINR(rate18K)}/g</strong>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 4 Primary Top Metric Cards */}
      {holdings.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          <StatCard
            label="Total Gold Weight"
            value={`${stats.totalGrams.toFixed(2)} grams`}
            numericValue={stats.totalGrams}
            formatValue={(n) => `${n.toFixed(2)} grams`}
            sub={`${stats.tolas.toFixed(2)} tolas (10g) · ${stats.sovereigns.toFixed(1)} pavans`}
            icon={<Coins />}
            color={THEME.gold}
          />
          <StatCard
            label="Total Invested Cost"
            value={fmtINRFull(stats.totalInvested)}
            numericValue={stats.totalInvested}
            formatValue={fmtINRFull}
            sub="Acquisition Capital Basis"
            icon={<IndianRupee />}
            color={THEME.accent}
          />
          <StatCard
            label="Unrealized Returns (P&L)"
            value={`${stats.totalPnL >= 0 ? "+" : ""}${fmtINRFull(stats.totalPnL)}`}
            numericValue={stats.totalPnL}
            formatValue={(n) => `${n >= 0 ? "+" : ""}${fmtINRFull(n)}`}
            sub={`${stats.totalPnL >= 0 ? "+" : ""}${stats.totalPnLPct.toFixed(1)}% portfolio growth`}
            icon={<TrendingUp />}
            color={stats.totalPnL >= 0 ? THEME.sage : THEME.rust}
          />
          <StatCard
            label="SGB Annual Coupon Income"
            value={fmtINRFull(stats.sgbAnnualCoupon)}
            numericValue={stats.sgbAnnualCoupon}
            formatValue={fmtINRFull}
            sub={`+${fmtINRFull(stats.sgbAccruedInterest)} total interest earned`}
            icon={<Landmark />}
            color={THEME.sage}
          />
        </div>
      )}

      {/* Main Navigation Sub-Views Bar - Styled seamlessly with design system */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "8px 12px",
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: "var(--radius-lg)",
        }}
      >
        {/* Segmented Tab Bar */}
        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            flexWrap: "wrap",
            background: "var(--surface-1)",
            padding: 4,
            borderRadius: "var(--radius-md)",
            border: `1px solid ${THEME.line}`,
          }}
        >
          {[
            { id: "overview", label: "Overview & Analytics", icon: LayoutGrid },
            { id: "sgb", label: "SGB Hub & Radar", icon: Landmark, count: stats.sgbHoldings.length },
            { id: "physical", label: "Physical & Locker", icon: Lock, count: stats.physicalHoldings.length },
            { id: "table", label: "Master Ledger", icon: TableIcon },
            { id: "simulator", label: "8-Yr Returns Simulator", icon: Calculator },
            { id: "tax", label: "Budget 2024 Tax Guide", icon: ShieldCheck },
          ].map(({ id, label, icon: Icon, count }) => {
            const active = viewTab === id;
            return (
              <button
                key={id}
                onClick={() => setViewTab(id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: active ? "var(--surface-0)" : "transparent",
                  color: active ? THEME.ink : THEME.muted,
                  fontWeight: active ? 700 : 500,
                  fontSize: 12,
                  cursor: "pointer",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon size={14} color={active ? THEME.accent : "currentColor"} />
                {label}
                {count !== undefined && count > 0 && (
                  <span
                    style={{
                      background: active ? `color-mix(in srgb, ${THEME.accent} 15%, transparent)` : "var(--surface-2)",
                      color: active ? THEME.accent : THEME.muted,
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "1px 6px",
                      borderRadius: 10,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Search & Type Filter (when in card or table views) */}
        {(viewTab === "overview" || viewTab === "table") && holdings.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--surface-1)",
                padding: "5px 10px",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${THEME.line}`,
              }}
            >
              <Search size={13} color={THEME.muted} />
              <input
                type="text"
                placeholder="Search holdings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 12,
                  color: THEME.ink,
                  outline: "none",
                  width: 130,
                }}
              />
            </div>

            {/* Asset Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-1)",
                color: THEME.ink,
              }}
            >
              <option value="all">All Asset Types</option>
              {GOLD_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* Owner Filter */}
            {familyProfiles && familyProfiles.length > 1 && (
              <select
                value={filterOwner}
                onChange={(e) => setFilterOwner(e.target.value)}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${THEME.line}`,
                  background: "var(--surface-1)",
                  color: THEME.ink,
                }}
              >
                <option value="all">All Family Members</option>
                {familyProfiles.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Empty State */}
      {holdings.length === 0 ? (
        <EmptyState
          icon={Coins}
          gradient={`linear-gradient(135deg, ${THEME.gold}, ${THEME.sage})`}
          title="No Gold or Sovereign Gold Bonds Added"
          description="Track your precious metals portfolio with real-time valuations, RBI Sovereign Gold Bond coupon tracking, vault locations, and automated tax calculations."
          pills={["RBI Sovereign Gold Bonds (SGB)", "Physical Gold 22K/24K", "Gold ETFs", "Digital Gold MMTC-PAMP"]}
          buttonLabel="Add First Holding"
          onAdd={() => {
            setForm({ ...EMPTY_GOLD });
            setEditingId(null);
            setShowModal(true);
          }}
        />
      ) : (
        <>
          {/* VIEW 1: OVERVIEW & ANALYTICS */}
          {viewTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Visual Breakdown Charts */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 16,
                }}
              >
                {/* Asset Class Allocation Donut */}
                <Card
                  variant="base"
                  style={{
                    padding: 20,
                    borderRadius: "var(--radius-xl)",
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, display: "flex", alignItems: "center", gap: 6 }}>
                      <PieChartIcon size={15} color={THEME.accent} /> Asset Class Distribution
                    </div>
                    <span style={{ fontSize: 11, color: THEME.muted }}>Total: {fmtINR(stats.totalValue)}</span>
                  </div>

                  <div style={{ height: 200, width: "100%", display: "flex", alignItems: "center" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.byType}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {stats.byType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: any) => [fmtINR(Number(val)), "Valuation"]}
                          contentStyle={{
                            background: "var(--surface-0)",
                            border: `1px solid ${THEME.line}`,
                            borderRadius: 8,
                            fontSize: 12,
                            color: THEME.ink,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend Chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, justifyContent: "center" }}>
                    {stats.byType.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "var(--surface-1)",
                          border: `1px solid ${THEME.line}`,
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.color }} />
                        <span style={{ color: THEME.ink, fontWeight: 700 }}>{t.name}:</span>
                        <span style={{ color: THEME.muted }}>{fmtINR(t.value)} ({stats.totalValue > 0 ? ((t.value / stats.totalValue) * 100).toFixed(0) : 0}%)</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Purity Weight Breakdown */}
                <Card
                  variant="base"
                  style={{
                    padding: 20,
                    borderRadius: "var(--radius-xl)",
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, display: "flex", alignItems: "center", gap: 6 }}>
                      <Scale size={15} color={THEME.gold} /> Purity & Weight Composition
                    </div>
                    <span style={{ fontSize: 11, color: THEME.muted }}>{stats.totalGrams.toFixed(1)}g total</span>
                  </div>

                  <div style={{ height: 200, width: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.purityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} vertical={false} />
                        <XAxis dataKey="purity" stroke={THEME.muted} fontSize={11} tickLine={false} />
                        <YAxis stroke={THEME.muted} fontSize={11} tickLine={false} unit="g" />
                        <Tooltip
                          formatter={(val: any) => [`${Number(val).toFixed(2)} grams`, "Net Weight"]}
                          contentStyle={{
                            background: "var(--surface-0)",
                            border: `1px solid ${THEME.line}`,
                            borderRadius: 8,
                            fontSize: 12,
                            color: THEME.ink,
                          }}
                        />
                        <Bar dataKey="grams" fill={THEME.gold} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-around", marginTop: 10, fontSize: 11, color: THEME.muted }}>
                    {stats.purityData.map((d) => (
                      <span key={d.purity}>
                        <strong>{d.purity}:</strong> {d.grams.toFixed(1)}g ({fmtINR(d.value)})
                      </span>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Sort & Count Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                  All Holdings ({sorted.length})
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <span style={{ color: THEME.muted }}>Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    style={{
                      fontSize: 12,
                      padding: "5px 8px",
                      borderRadius: "var(--radius-md)",
                      border: `1px solid ${THEME.line}`,
                      background: "var(--surface-1)",
                      color: THEME.ink,
                    }}
                  >
                    <option value="value">Highest Valuation</option>
                    <option value="pnl">Highest Gain (₹)</option>
                    <option value="grams">Highest Weight</option>
                    <option value="purchaseDate">Purchase Date (Recent)</option>
                  </select>
                </div>
              </div>

              {/* Holdings Grid Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: 16,
                }}
              >
                {sorted.map((h) => {
                  const IconComp = h.typeInfo.icon || Coins;
                  return (
                    <div
                      key={h.id}
                      className="card-lift"
                      style={{
                        padding: 20,
                        borderRadius: "var(--radius-xl)",
                        background: "var(--surface-0)",
                        border: `1px solid ${THEME.line}`,
                        borderTop: `3px solid ${h.typeInfo.color}`,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        {/* Header Badge */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: h.typeInfo.color,
                              background: `color-mix(in srgb, ${h.typeInfo.color} 12%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${h.typeInfo.color} 25%, transparent)`,
                              padding: "3px 8px",
                              borderRadius: 6,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <IconComp size={12} /> {h.typeInfo.label}
                          </span>

                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              onClick={() => handleEdit(h)}
                              className="icon-btn"
                              style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}
                              title="Edit holding"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(h.id)}
                              className="icon-btn danger"
                              style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}
                              title="Delete holding"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Title & Specs */}
                        <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
                          {h.name || h.typeInfo.label}
                        </div>
                        <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 12 }}>
                          {h.grams} grams · Purity: <strong style={{ color: THEME.ink }}>{h.purity}</strong>
                          {h.ownerName && ` · Owner: ${h.ownerName}`}
                        </div>

                        {/* Core Financial Figures */}
                        <div
                          style={{
                            padding: "10px 12px",
                            borderRadius: "var(--radius-md)",
                            background: "var(--surface-1)",
                            marginBottom: 12,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: THEME.muted }}>Current Valuation:</span>
                            <span style={{ fontSize: 14, fontWeight: 900, color: THEME.gold }}>
                              <Money value={h.currentValue} variant="full" />
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: THEME.muted }}>Invested Capital:</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                              <Money value={h.invested} variant="full" />
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 11, color: THEME.muted }}>Unrealized Return:</span>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 800,
                                color: h.pnl >= 0 ? THEME.sage : THEME.rust,
                              }}
                            >
                              {h.pnl >= 0 ? "+" : ""}
                              {fmtINR(h.pnl)} ({h.pnlPct.toFixed(1)}%)
                            </span>
                          </div>
                        </div>

                        {/* SGB Coupon Special Info */}
                        {h.type === "sgb" && (
                          <div
                            style={{
                              padding: "8px 10px",
                              borderRadius: 6,
                              background: "color-mix(in srgb, var(--t-sage) 8%, transparent)",
                              border: "1px solid color-mix(in srgb, var(--t-sage) 20%, transparent)",
                              fontSize: 11,
                              color: THEME.sage,
                              marginBottom: 8,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                              <span>RBI 2.5% Payout:</span>
                              <span>+{fmtINR(h.annualCouponAmount)}/yr</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 10, color: THEME.muted }}>
                              <span>Maturity:</span>
                              <span>{h.maturityStatus || "8 Years from issue"}</span>
                            </div>
                          </div>
                        )}

                        {/* Physical Locker Location Info */}
                        {h.type === "physical" && h.vaultLocation && (
                          <div style={{ fontSize: 11, color: THEME.muted, display: "flex", alignItems: "center", gap: 4 }}>
                            <Lock size={11} color={THEME.muted} /> Vault: <strong>{h.vaultLocation}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 2: SGB SOVEREIGN GOLD BONDS HUB & RADAR */}
          {viewTab === "sgb" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* SGB Hero Highlights */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14,
                }}
              >
                <StatCard
                  label="Total SGB Valuation"
                  value={fmtINRFull(stats.sgbValue)}
                  numericValue={stats.sgbValue}
                  formatValue={fmtINRFull}
                  sub={`${stats.sgbGrams.toFixed(2)} units (grams)`}
                  icon={<Landmark />}
                  color={THEME.sage}
                />
                <StatCard
                  label="Annual 2.5% RBI Coupon"
                  value={fmtINRFull(stats.sgbAnnualCoupon)}
                  numericValue={stats.sgbAnnualCoupon}
                  formatValue={fmtINRFull}
                  sub="Paid semi-annually into bank"
                  icon={<BadgePercent />}
                  color={THEME.gold}
                />
                <StatCard
                  label="Lifetime Accrued Interest"
                  value={`+${fmtINRFull(stats.sgbAccruedInterest)}`}
                  numericValue={stats.sgbAccruedInterest}
                  formatValue={(n) => `+${fmtINRFull(n)}`}
                  sub="Cumulative RBI coupon payouts"
                  icon={<Award />}
                  color={THEME.sage}
                />
                <StatCard
                  label="Premature RBI Exit Radar"
                  value={`${stats.sgbEarlyExitCount} Eligible Tranches`}
                  sub="5+ years held buyback window"
                  icon={<CalendarClock />}
                  color={THEME.accent}
                />
              </div>

              {/* SGB Radar Banner Info */}
              <Card
                style={{
                  padding: "16px 20px",
                  borderRadius: "var(--radius-xl)",
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderLeft: `4px solid ${THEME.sage}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: "50%",
                      background: "color-mix(in srgb, var(--t-sage) 15%, transparent)",
                      color: THEME.sage,
                    }}
                  >
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, marginBottom: 4 }}>
                      Sovereign Gold Bond (SGB) Strategic Edge: 100% Tax-Free Capital Gains
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.5 }}>
                      Under <strong>Section 47(viic)</strong> of the Indian Income Tax Act, capital gains arising upon 8-year RBI maturity
                      are completely <strong>EXEMPT from tax for individuals</strong>. You also receive an additional <strong>2.50% p.a. cash interest</strong> credited semi-annually directly to your bank account.
                    </div>
                  </div>
                </div>
              </Card>

              {/* SGB Tranches List */}
              {stats.sgbHoldings.length === 0 ? (
                <EmptyState
                  icon={Landmark}
                  title="No Sovereign Gold Bonds (SGB) Found"
                  description="Add your SGB series to track RBI semi-annual coupon payouts, premature exit radar, and maturity dates."
                  buttonLabel="Add Sovereign Gold Bond"
                  onAdd={() => {
                    setForm({ ...EMPTY_GOLD, type: "sgb", interestRate: 2.5 });
                    setEditingId(null);
                    setShowModal(true);
                  }}
                />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                  {stats.sgbHoldings.map((h) => {
                    return (
                      <div
                        key={h.id}
                        className="card-lift"
                        style={{
                          padding: 20,
                          borderRadius: "var(--radius-xl)",
                          background: "var(--surface-0)",
                          border: `1px solid ${THEME.line}`,
                          borderTop: `3px solid ${h.isMatured ? THEME.muted : THEME.sage}`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: h.isMatured ? THEME.muted : THEME.sage,
                              textTransform: "uppercase",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Landmark size={13} /> {h.isMatured ? "Matured Series" : "Active RBI Tranche"}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: h.prematureExitEligible ? "color-mix(in srgb, var(--t-accent) 15%, transparent)" : "color-mix(in srgb, var(--t-sage) 15%, transparent)",
                              color: h.prematureExitEligible ? THEME.accent : THEME.sage,
                            }}
                          >
                            {h.isMatured ? "Tax Free Matured" : h.prematureExitEligible ? "RBI Buyback Eligible (5y+)" : "Accumulating 2.5%"}
                          </span>
                        </div>

                        <div style={{ fontSize: 17, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
                          {h.name || "RBI SGB Series"}
                        </div>
                        <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 12 }}>
                          {h.grams} units (grams) · Issue Date: {h.purchaseDate || "—"}
                        </div>

                        {/* Financial Box */}
                        <div
                          style={{
                            padding: 12,
                            borderRadius: "var(--radius-md)",
                            background: "var(--surface-1)",
                            marginBottom: 12,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: THEME.muted }}>Current Market Value:</span>
                            <span style={{ fontSize: 15, fontWeight: 900, color: THEME.gold }}>
                              <Money value={h.currentValue} variant="full" />
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
                            <span style={{ color: THEME.muted }}>Issue Cost:</span>
                            <span style={{ fontWeight: 700, color: THEME.ink }}>
                              <Money value={h.invested} variant="full" /> (@ {fmtINR(h.invested / (h.grams || 1))}/g)
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                            <span style={{ color: THEME.muted }}>Capital Gain:</span>
                            <span style={{ fontWeight: 800, color: THEME.sage }}>
                              +{fmtINR(h.pnl)} (+{h.pnlPct.toFixed(1)}%)
                            </span>
                          </div>
                        </div>

                        {/* Payout & Maturity Box */}
                        <div
                          style={{
                            padding: "10px 12px",
                            borderRadius: "var(--radius-md)",
                            background: "color-mix(in srgb, var(--t-sage) 6%, transparent)",
                            border: `1px solid color-mix(in srgb, var(--t-sage) 18%, transparent)`,
                            marginBottom: 14,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                            <span style={{ color: THEME.muted }}>Annual 2.5% Coupon:</span>
                            <span style={{ fontWeight: 800, color: THEME.sage }}>+{fmtINR(h.annualCouponAmount)}/yr</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                            <span style={{ color: THEME.muted }}>Total Accrued Interest:</span>
                            <span style={{ fontWeight: 800, color: THEME.ink }}>+{fmtINR(h.interest)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                            <span style={{ color: THEME.muted }}>Maturity Horizon:</span>
                            <span style={{ fontWeight: 800, color: h.isMatured ? THEME.sage : THEME.ink }}>
                              {h.maturityDate ? `${h.maturityDate} (${h.maturityStatus})` : "8 Years"}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <button
                            onClick={() => handleEdit(h)}
                            className="icon-btn"
                            style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(h.id)}
                            className="icon-btn danger"
                            style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: PHYSICAL GOLD & LOCKER VAULT */}
          {viewTab === "physical" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14,
                }}
              >
                <StatCard
                  label="Physical Gold Value"
                  value={fmtINRFull(stats.physicalValue)}
                  numericValue={stats.physicalValue}
                  formatValue={fmtINRFull}
                  sub={`${stats.physicalGrams.toFixed(2)} grams pure weight`}
                  icon={<Lock />}
                  color={THEME.gold}
                />
                <StatCard
                  label="Total Physical Weight"
                  value={`${stats.physicalGrams.toFixed(1)} grams`}
                  sub={`~${(stats.physicalGrams / 10).toFixed(1)} tolas / ${(stats.physicalGrams / 8).toFixed(1)} pavans`}
                  icon={<Scale />}
                  color={THEME.accent}
                />
                <StatCard
                  label="Total Items in Vault"
                  value={`${stats.physicalHoldings.length} Jewelry / Coins`}
                  sub="Bank lockers & home safe"
                  icon={<Building2 />}
                  color={THEME.violet}
                />
              </div>

              {stats.physicalHoldings.length === 0 ? (
                <EmptyState
                  icon={Coins}
                  title="No Physical Gold or Jewelry Added"
                  description="Track fine gold bars, coins, 22K hallmark jewelry, locker locations, and purity certificates."
                  buttonLabel="Add Physical Gold Item"
                  onAdd={() => {
                    setForm({ ...EMPTY_GOLD, type: "physical", purity: "22K" });
                    setEditingId(null);
                    setShowModal(true);
                  }}
                />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                  {stats.physicalHoldings.map((h) => (
                    <div
                      key={h.id}
                      className="card-lift"
                      style={{
                        padding: 20,
                        borderRadius: "var(--radius-xl)",
                        background: "var(--surface-0)",
                        border: `1px solid ${THEME.line}`,
                        borderTop: `3px solid ${THEME.gold}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: THEME.gold,
                            background: "color-mix(in srgb, var(--t-gold) 12%, transparent)",
                            padding: "3px 8px",
                            borderRadius: 6,
                          }}
                        >
                          {h.purity} Gold
                        </span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={() => handleEdit(h)}
                            className="icon-btn"
                            style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(h.id)}
                            className="icon-btn danger"
                            style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
                        {h.name || "Physical Gold Item"}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 12 }}>
                        Net Gold: <strong style={{ color: THEME.ink }}>{h.grams}g</strong>
                        {h.grossGrams && h.grossGrams !== h.grams && ` (Gross: ${h.grossGrams}g)`}
                        {h.ownerName && ` · ${h.ownerName}`}
                      </div>

                      <div
                        style={{
                          padding: 12,
                          borderRadius: "var(--radius-md)",
                          background: "var(--surface-1)",
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: THEME.muted }}>Market Valuation:</span>
                          <span style={{ fontSize: 15, fontWeight: 900, color: THEME.gold }}>
                            <Money value={h.currentValue} variant="full" />
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                          <span style={{ color: THEME.muted }}>Effective Rate:</span>
                          <span style={{ fontWeight: 700, color: THEME.ink }}>
                            {fmtINR(goldPrice * (GOLD_PURITY_FACTOR[h.purity] || 1))}/g
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                          <span style={{ color: THEME.muted }}>Estimated Return:</span>
                          <span style={{ fontWeight: 800, color: h.pnl >= 0 ? THEME.sage : THEME.rust }}>
                            {h.pnl >= 0 ? "+" : ""}{fmtINR(h.pnl)} ({h.pnlPct.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      {/* Vault & Hallmark info */}
                      <div style={{ fontSize: 11, color: THEME.muted, display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Lock size={12} color={THEME.muted} /> Locker / Storage: <strong>{h.vaultLocation || "Bank Locker"}</strong>
                        </div>
                        {h.hallmarkUid && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <ShieldCheck size={12} color={THEME.sage} /> Hallmark UID / Certificate: <strong>{h.hallmarkUid}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: MASTER TABLE LEDGER */}
          {viewTab === "table" && (
            <Card style={{ overflow: "hidden", borderRadius: "var(--radius-xl)", border: `1px solid ${THEME.line}` }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--surface-1)", borderBottom: `1.5px solid ${THEME.line}` }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Asset Name</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Category</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Purity</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Net Grams</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Cost Basis</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Current Valuation</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>P&L Return</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Storage / Status</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((h) => (
                      <tr key={h.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                        <td style={{ padding: "14px 16px", fontWeight: 700, color: THEME.ink }}>
                          <div>{h.name || h.typeInfo.label}</div>
                          <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 400 }}>{h.ownerName}</div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: h.typeInfo.color,
                              background: `color-mix(in srgb, ${h.typeInfo.color} 10%, transparent)`,
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}
                          >
                            {h.typeInfo.label}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 700, color: THEME.muted }}>
                          {h.purity}
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800 }}>
                          {h.grams}g
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          <Money value={h.invested} variant="full" />
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800, color: THEME.gold }}>
                          <Money value={h.currentValue} variant="full" />
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            textAlign: "right",
                            fontWeight: 800,
                            color: h.pnl >= 0 ? THEME.sage : THEME.rust,
                          }}
                        >
                          {h.pnl >= 0 ? "+" : ""}{fmtINR(h.pnl)} ({h.pnlPct.toFixed(1)}%)
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 12, color: THEME.muted }}>
                          {h.type === "sgb" ? h.maturityStatus || "8Y Maturity" : h.vaultLocation || "Bank Locker"}
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button
                              onClick={() => handleEdit(h)}
                              className="icon-btn"
                              style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(h.id)}
                              className="icon-btn danger"
                              style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}
                            >
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
          )}

          {/* VIEW 5: 8-YEAR WEALTH RETURNS SIMULATOR */}
          {viewTab === "simulator" && (
            <Card
              style={{
                padding: "24px 28px",
                borderRadius: "var(--radius-xl)",
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-0)",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <Calculator size={18} color={THEME.accent} /> SGB vs Physical Gold vs Gold ETF Returns Simulator
              </div>
              <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 20 }}>
                Compare the total after-tax wealth accumulation over time across all three modes of investing in precious metals.
              </div>

              {/* Input Parameters */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                  marginBottom: 24,
                  padding: 16,
                  background: "var(--surface-1)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Gold Weight: {simWeightGrams} grams
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="250"
                    step="5"
                    value={simWeightGrams}
                    onChange={(e) => setSimWeightGrams(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                    Initial Capital: <strong>{fmtINR(simResults.initialCost)}</strong>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Holding Period: {simHoldingYears} Years
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    step="1"
                    value={simHoldingYears}
                    onChange={(e) => setSimHoldingYears(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                    Full 8-yr SGB Tax Exemption: <strong>{simHoldingYears >= 8 ? "Active (100% Tax Free)" : "Not Met (12.5% LTCG)"}</strong>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Expected Gold CAGR: {simGoldCagr}% p.a.
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="18"
                    step="0.5"
                    value={simGoldCagr}
                    onChange={(e) => setSimGoldCagr(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                    Projected Gold Price: <strong>{fmtINR(goldPrice * Math.pow(1 + simGoldCagr / 100, simHoldingYears))}/g</strong>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Physical Making Charges: {simMakingChargePct}%
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="25"
                    step="1"
                    value={simMakingChargePct}
                    onChange={(e) => setSimMakingChargePct(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                    +3% GST on purchase
                  </div>
                </div>
              </div>

              {/* 3 Outcome Comparison Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                {/* SGB Card (Winner) */}
                <div
                  style={{
                    padding: 20,
                    borderRadius: "var(--radius-xl)",
                    background: "var(--surface-1)",
                    border: `2px solid ${THEME.sage}`,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      right: 16,
                      background: THEME.sage,
                      color: "var(--t-darkInk, #ffffff)",
                      fontSize: 10,
                      fontWeight: 900,
                      padding: "2px 8px",
                      borderRadius: 10,
                      textTransform: "uppercase",
                    }}
                  >
                    Top Compounding Choice
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: THEME.sage, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <Landmark size={15} /> Sovereign Gold Bond (SGB)
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
                    {fmtINR(simResults.sgb.totalReturn)}
                  </div>
                  <div style={{ fontSize: 12, color: THEME.sage, fontWeight: 700, marginBottom: 12 }}>
                    +{fmtINR(simResults.sgb.gain)} Net Profit ({((simResults.sgb.gain / simResults.initialCost) * 100).toFixed(1)}%)
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, borderTop: `1px solid ${THEME.line}`, paddingTop: 8 }}>
                    • <strong>+{fmtINR(simResults.sgb.coupons)}</strong> in 2.5% cash coupons<br />
                    • <strong>100% Tax-Free</strong> capital gains at 8 years<br />
                    • Zero making charges & zero storage fees
                  </div>
                </div>

                {/* Physical Gold Card */}
                <div
                  style={{
                    padding: 20,
                    borderRadius: "var(--radius-xl)",
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 900, color: THEME.gold, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <Coins size={15} /> Physical Hallmark Gold
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
                    {fmtINR(simResults.physical.totalReturn)}
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 12 }}>
                    +{fmtINR(simResults.physical.gain)} Net Profit ({((simResults.physical.gain / (simResults.initialCost + simResults.physical.extraCost)) * 100).toFixed(1)}%)
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, borderTop: `1px solid ${THEME.line}`, paddingTop: 8 }}>
                    • <strong>-{fmtINR(simResults.physical.extraCost)}</strong> upfront GST & making charges<br />
                    • <strong>-{fmtINR(simResults.physical.tax)}</strong> in 12.5% LTCG taxes<br />
                    • Physical possession for jewelry wear
                  </div>
                </div>

                {/* Gold ETF Card */}
                <div
                  style={{
                    padding: 20,
                    borderRadius: "var(--radius-xl)",
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 900, color: THEME.accent, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <BarChart3 size={15} /> Gold ETF / FoF
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
                    {fmtINR(simResults.etf.totalReturn)}
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 12 }}>
                    +{fmtINR(simResults.etf.gain)} Net Profit ({((simResults.etf.gain / simResults.initialCost) * 100).toFixed(1)}%)
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, borderTop: `1px solid ${THEME.line}`, paddingTop: 8 }}>
                    • 0.50% annual expense drag<br />
                    • <strong>-{fmtINR(simResults.etf.tax)}</strong> in 12.5% LTCG taxes<br />
                    • High liquidity & instant Demat trading
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* VIEW 6: BUDGET 2024 TAX INTELLIGENCE */}
          {viewTab === "tax" && (
            <Card
              style={{
                padding: "24px 28px",
                borderRadius: "var(--radius-xl)",
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-0)",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={18} color={THEME.sage} /> Indian Taxation Guide for Gold & SGBs (Union Budget 2024 Updated)
              </div>
              <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 20 }}>
                Authoritative taxation treatment across physical gold, sovereign gold bonds, ETFs, and digital gold under the Income Tax Act.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                {/* SGB Tax Rules */}
                <div
                  style={{
                    padding: 16,
                    borderRadius: "var(--radius-lg)",
                    background: "color-mix(in srgb, var(--t-sage) 6%, transparent)",
                    border: `1px solid color-mix(in srgb, var(--t-sage) 20%, transparent)`,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <Landmark size={15} /> Sovereign Gold Bonds (SGB)
                  </div>
                  <div style={{ fontSize: 12, color: THEME.ink, lineHeight: 1.6 }}>
                    • <strong>Maturity at 8 Years:</strong> 100% Tax-Free capital gains for individual investors under <strong>Section 47(viic)</strong>.<br />
                    • <strong>2.5% Annual Interest:</strong> Taxable under "Income from Other Sources" as per your slab rate.<br />
                    • <strong>Premature RBI Exit (5y+):</strong> Treated similarly to maturity (Tax Exempt).<br />
                    • <strong>Secondary Market Sale:</strong> LTCG taxed at 12.5% if held &gt; 12 months in Demat.
                  </div>
                </div>

                {/* Physical Gold Tax Rules */}
                <div
                  style={{
                    padding: 16,
                    borderRadius: "var(--radius-lg)",
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, color: THEME.gold, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <Coins size={15} /> Physical Gold & Jewelry
                  </div>
                  <div style={{ fontSize: 12, color: THEME.ink, lineHeight: 1.6 }}>
                    • <strong>Holding &gt; 24 Months (LTCG):</strong> Taxed at <strong>12.5% flat without indexation</strong> (post-Budget 2024).<br />
                    • <strong>Holding &le; 24 Months (STCG):</strong> Taxed at individual income slab rates.<br />
                    • <strong>GST on Purchase:</strong> 3% on gold value + 5% on making charges.
                  </div>
                </div>

                {/* Gold ETFs & Mutual Funds */}
                <div
                  style={{
                    padding: 16,
                    borderRadius: "var(--radius-lg)",
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, color: THEME.accent, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <BarChart3 size={15} /> Gold ETFs & Gold FoFs
                  </div>
                  <div style={{ fontSize: 12, color: THEME.ink, lineHeight: 1.6 }}>
                    • <strong>Holding &gt; 12 Months (ETFs in Demat):</strong> Qualifies as LTCG at <strong>12.5%</strong>.<br />
                    • <strong>Holding &gt; 24 Months (Gold Mutual Funds):</strong> Qualifies as LTCG at <strong>12.5%</strong>.<br />
                    • <strong>STCG:</strong> Taxed at your applicable income slab rate.
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Manual Benchmark Price Edit Modal */}
      {manualPriceModal && (
        <Modal
          title="Update 24K Live Benchmark Gold Rate"
          onClose={() => setManualPriceModal(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, color: THEME.muted }}>
              Enter the latest 24 Karat gold rate per gram. All 22K hallmark, 18K jewelry, and SGB valuations will automatically adjust across the entire platform.
            </div>

            <Field label="24K Benchmark Rate (₹ / Gram)">
              <input
                type="number"
                autoFocus
                value={draftPrice}
                onChange={(e) => setDraftPrice(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${THEME.accent}`,
                  fontSize: 16,
                  fontWeight: 800,
                  background: "var(--surface-1)",
                  color: THEME.ink,
                }}
              />
            </Field>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-1)",
                fontSize: 12,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Derived 22K (91.6%):</span>
                <strong>{fmtINR(Math.round(draftPrice * (22 / 24)))}/g</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Derived 18K (75.0%):</span>
                <strong>{fmtINR(Math.round(draftPrice * (18 / 24)))}/g</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>10g 24K Bar Value:</span>
                <strong style={{ color: THEME.gold }}>{fmtINR(draftPrice * 10)}</strong>
              </div>
            </div>
          </div>
          <ModalActions
            onClose={() => setManualPriceModal(false)}
            onSave={handleSaveGoldPrice}
            saveLabel="Update Benchmark Rate"
          />
        </Modal>
      )}

      {/* Add / Edit Holding Modal */}
      {showModal && (
        <Modal
          title={editingId ? "Edit Gold / SGB Holding" : "Add Gold / Sovereign Gold Bond Holding"}
          onClose={() => {
            setShowModal(false);
            setForm({ ...EMPTY_GOLD });
            setEditingId(null);
          }}
        >
          <div className="form-grid-2" style={{ gap: 14 }}>
            {/* Asset Type Selector */}
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Asset Category">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${THEME.line}`, background: "var(--surface-0)", color: THEME.ink }}
                >
                  {GOLD_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} — {t.desc}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* SGB 1-Click Preset Selector */}
            {form.type === "sgb" && (
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="RBI Series Auto-Fill Preset (Optional)">
                  <select
                    onChange={(e) => handleSelectSgbPreset(e.target.value)}
                    defaultValue=""
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${THEME.sage}`, background: "color-mix(in srgb, var(--t-sage) 6%, var(--surface-0))", color: THEME.ink }}
                  >
                    <option value="" disabled>
                      Select an RBI SGB Tranche to Auto-Fill Issue Price & Dates...
                    </option>
                    {RBI_SGB_SERIES_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Issued @ {fmtINR(p.issuePrice)}/g on {p.issueDate})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            <Field label="Holding Name *">
              <input
                type="text"
                placeholder={form.type === "sgb" ? "e.g. SGB 2023-24 Series IV" : "e.g. 24K Gold Bar, Tanishq 22K Necklace"}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${THEME.line}`, background: "var(--surface-0)", color: THEME.ink }}
              />
            </Field>

            <Field label="Net Weight (Grams / Units) *">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.grams || ""}
                onChange={(e) => setForm({ ...form, grams: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${THEME.line}`, background: "var(--surface-0)", color: THEME.ink }}
              />
            </Field>

            {form.type === "physical" && (
              <>
                <Field label="Gold Purity">
                  <select
                    value={form.purity || "22K"}
                    onChange={(e) => setForm({ ...form, purity: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${THEME.line}`, background: "var(--surface-0)", color: THEME.ink }}
                  >
                    <option value="24K">24K (99.9% Fine Bullion / Coin)</option>
                    <option value="22K">22K (91.6% BIS Hallmark Jewelry)</option>
                    <option value="18K">18K (75.0% Diamond Studded Gold)</option>
                    <option value="14K">14K (58.3% Modern Jewelry)</option>
                  </select>
                </Field>

                <Field label="Gross Weight (Grams)">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Total weight including stones"
                    value={form.grossGrams || ""}
                    onChange={(e) => setForm({ ...form, grossGrams: Number(e.target.value) })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${THEME.line}`, background: "var(--surface-0)", color: THEME.ink }}
                  />
                </Field>

                <Field label="Storage / Vault Location">
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank Locker #104, Home Safe"
                    value={form.vaultLocation}
                    onChange={(e) => setForm({ ...form, vaultLocation: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${THEME.line}`, background: "var(--surface-0)", color: THEME.ink }}
                  />
                </Field>

                <Field label="Hallmark HUID / Certificate #">
                  <input
                    type="text"
                    placeholder="6-digit alphanumeric HUID"
                    value={form.hallmarkUid}
                    onChange={(e) => setForm({ ...form, hallmarkUid: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${THEME.line}`, background: "var(--surface-0)", color: THEME.ink }}
                  />
                </Field>
              </>
            )}

            <Field label="Purchase / Acquisition Cost (Total ₹)">
              <input
                type="number"
                min="0"
                placeholder="Total invested capital"
                value={form.purchasePrice || ""}
                onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${THEME.line}`, background: "var(--surface-0)", color: THEME.ink }}
              />
            </Field>

            <Field label="Purchase / Issue Date">
              <input
                type="date"
                value={form.purchaseDate || ""}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${THEME.line}`, background: "var(--surface-0)", color: THEME.ink }}
              />
            </Field>

            {form.type === "sgb" && (
              <>
                <Field label="Maturity Date (8 Years)">
                  <input
                    type="date"
                    value={form.maturityDate || ""}
                    onChange={(e) => setForm({ ...form, maturityDate: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${THEME.line}`, background: "var(--surface-0)", color: THEME.ink }}
                  />
                </Field>
                <Field label="RBI Coupon Rate (% p.a.)">
                  <input
                    type="number"
                    step="0.1"
                    value={form.interestRate || 2.5}
                    onChange={(e) => setForm({ ...form, interestRate: Number(e.target.value) })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${THEME.line}`, background: "var(--surface-0)", color: THEME.ink }}
                  />
                </Field>
              </>
            )}

            {/* Owner Profile */}
            {familyProfiles && familyProfiles.length > 0 && (
              <Field label="Family Member / Owner">
                <select
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${THEME.line}`, background: "var(--surface-0)", color: THEME.ink }}
                >
                  <option value="self">Self</option>
                  {familyProfiles.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.relationship || "Family"})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Notes / Invoice Reference">
                <textarea
                  rows={2}
                  placeholder="e.g. Purchased from Kalyan Jewellers, Invoice #9842"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${THEME.line}`, background: "var(--surface-0)", color: THEME.ink, resize: "vertical" }}
                />
              </Field>
            </div>
          </div>

          <ModalActions
            onClose={() => {
              setShowModal(false);
              setForm({ ...EMPTY_GOLD });
              setEditingId(null);
            }}
            onSave={handleSaveHolding}
            saveLabel="Save Holding"
            disabled={!(Number(form.grams) > 0)}
            loading={savingHolding}
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <ConfirmDialog
          message="Delete this gold holding from your portfolio? This action cannot be undone."
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
