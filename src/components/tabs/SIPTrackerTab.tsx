import React, { useState, useMemo } from "react";
import {
  Activity,
  Repeat,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  Clock,
  AlertCircle,
  IndianRupee,
  TrendingUp,
  Pause,
  PlayCircle,
  StopCircle,
  Sparkles,
  Search,
  LayoutGrid,
  CalendarDays,
  Table as TableIcon,
  Download,
  Sliders,
  Percent,
  Check,
  Building2,
  Wallet,
  Target,
  ArrowUpRight,
  ShieldCheck,
  PieChart as PieChartIcon,
  Copy,
  Printer,
  ChevronRight,
  Flame,
  Calendar,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  fmtINRFull,
  fmtINRExact,
  today,
  monthsBetween,
  getLocalDateString,
  uid,
} from "../../utils/finance";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { ModalSection } from "../ui/ModalSection";
import { SectionTitle } from "../ui/SectionTitle";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";
import { usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { ConfirmDialog } from "../ui/Feedback";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { MFLogo, BankLogo, BrokerLogo } from "../ui/BrandLogos";

const BROKERS = [
  "Zerodha (Coin)",
  "Groww",
  "Kuvera",
  "MF Central",
  "INDmoney",
  "ET Money",
  "Scripbox",
  "Paytm Money",
  "HDFC Securities",
  "ICICI Direct",
  "Axis Securities",
  "Kotak Cherry",
  "CAMS / KFintech Direct",
  "Other",
];

const MANDATE_TYPES = [
  "e-NACH (Bank Mandate)",
  "UPI AutoPay",
  "Biller / NetBanking Auto-Debit",
  "One-Time Mandate (OTM)",
  "Manual Debit",
];

const POPULAR_MF_PRESETS = [
  { name: "Parag Parikh Flexi Cap Fund - Direct Growth", type: "Flexi Cap", amc: "PPFAS" },
  { name: "Mirae Asset Large & Midcap Fund - Direct Growth", type: "Equity", amc: "Mirae Asset" },
  { name: "HDFC Mid-Cap Opportunities Fund - Direct Growth", type: "Equity", amc: "HDFC" },
  { name: "Nippon India Small Cap Fund - Direct Growth", type: "Equity", amc: "Nippon India" },
  { name: "Quant Small Cap Fund - Direct Growth", type: "Equity", amc: "Quant" },
  { name: "UTI Nifty 50 Index Fund - Direct Growth", type: "Index", amc: "UTI" },
  { name: "ICICI Prudential Bluechip Fund - Direct Growth", type: "Equity", amc: "ICICI Prudential" },
  { name: "SBI Contra Fund - Direct Growth", type: "Equity", amc: "SBI" },
  { name: "Axis ELSS Tax Saver Fund - Direct Growth", type: "ELSS", amc: "Axis" },
  { name: "Kotak Emerging Equity Fund - Direct Growth", type: "Equity", amc: "Kotak" },
  { name: "ICICI Prudential Equity & Debt Fund - Direct Growth", type: "Hybrid", amc: "ICICI Prudential" },
  { name: "HDFC Balanced Advantage Fund - Direct Growth", type: "Hybrid", amc: "HDFC" },
];

const FUND_COLORS: Record<string, string> = {
  Equity: THEME.accent,
  "Flexi Cap": THEME.violet,
  "Large Cap": THEME.accent,
  "Mid Cap": THEME.gold,
  "Small Cap": THEME.rust,
  Debt: THEME.muted,
  Hybrid: THEME.sage,
  ELSS: THEME.pink || "#ec4899",
  Index: THEME.cyan,
  Liquid: "#0ea5e9",
  International: "#8b5cf6",
  Other: THEME.muted,
};

// Helper to extract AMC brand name from fund title
function extractAmcName(schemeName: string): string {
  if (!schemeName) return "Other";
  const lower = schemeName.toLowerCase();
  if (lower.includes("parag parikh") || lower.includes("ppfas")) return "PPFAS Mutual Fund";
  if (lower.includes("hdfc")) return "HDFC Mutual Fund";
  if (lower.includes("icici") || lower.includes("prudential")) return "ICICI Prudential MF";
  if (lower.includes("sbi")) return "SBI Mutual Fund";
  if (lower.includes("nippon")) return "Nippon India MF";
  if (lower.includes("mirae")) return "Mirae Asset MF";
  if (lower.includes("quant")) return "Quant Mutual Fund";
  if (lower.includes("kotak")) return "Kotak Mahindra MF";
  if (lower.includes("axis")) return "Axis Mutual Fund";
  if (lower.includes("uti")) return "UTI Mutual Fund";
  if (lower.includes("motilal")) return "Motilal Oswal MF";
  if (lower.includes("tata")) return "Tata Mutual Fund";
  if (lower.includes("dsp")) return "DSP Mutual Fund";
  if (lower.includes("bandhan") || lower.includes("idfc")) return "Bandhan Mutual Fund";
  if (lower.includes("franklin")) return "Franklin Templeton";
  if (lower.includes("canara") || lower.includes("robeco")) return "Canara Robeco MF";
  if (lower.includes("invesco")) return "Invesco Mutual Fund";
  if (lower.includes("aditya birla") || lower.includes("sun life")) return "Aditya Birla Sun Life";
  return schemeName.split(" ")[0] + " MF";
}

export function SIPTrackerTab({ state, addItem, removeItem, updateItem, metrics, showToast }: any) {
  const { privacyMode } = usePrivacy();
  const { familyProfiles } = useMasterData();
  const [show, setShow] = useState(false);
  const [editSip, setEditSip] = useState<any>(null);
  const [sipProjRate, setSipProjRate] = useState("12");
  const [viewMode, setViewMode] = useState<"cards" | "calendar" | "table" | "simulator" | "health">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFundType, setFilterFundType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("amount");
  const [confirmDeleteSip, setConfirmDeleteSip] = useState<any>(null);
  const todayStr = today();

  const deleteSip = async (id: string) => {
    try {
      await removeItem("sips", id);
      showToast?.("SIP deleted successfully", "info");
    } catch (e: any) {
      showToast?.(`Failed to delete SIP: ${e?.message || "Unknown error"}`, "error");
    }
  };

  const changeSipStatus = async (id: string, newStatus: string) => {
    try {
      await updateItem("sips", id, { status: newStatus });
      showToast?.(`SIP status updated to ${newStatus}`, "info");
    } catch (e: any) {
      showToast?.(`Failed to update SIP status: ${e?.message || "Unknown error"}`, "error");
    }
  };

  const duplicateSip = async (sip: any) => {
    try {
      const { id, _id, ...rest } = sip;
      const dup = {
        ...rest,
        scheme: `${sip.scheme} (Copy)`,
        startDate: todayStr,
      };
      await addItem("sips", dup);
      showToast?.("SIP duplicated successfully", "success");
    } catch (e: any) {
      showToast?.(`Failed to duplicate SIP: ${e?.message || "Unknown error"}`, "error");
    }
  };

  const { run: saveNewSip, loading: savingNewSip } = useAsyncAction(
    async (v: any) => {
      await addItem("sips", v);
      showToast?.("SIP added successfully", "success");
    },
    {
      onSuccess: () => setShow(false),
      onError: (e: any) => showToast?.(`Failed to add SIP: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveSipEdit, loading: savingSipEdit } = useAsyncAction(
    async (v: any) => {
      await updateItem("sips", editSip.id, v);
      showToast?.("SIP updated successfully", "success");
    },
    {
      onSuccess: () => setEditSip(null),
      onError: (e: any) => showToast?.(`Failed to save SIP: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  // Memoized Calculation Engine
  const sipsWithCalc = useMemo(() => {
    return (state?.sips || []).map((sip: any) => {
      const status = sip.status || "active";
      const isStopped = status === "stopped";
      const isPaused = status === "paused";
      const stepUpPct = Math.max(0, Number(sip.stepUpPct || 0)) / 100;
      const baseAmount = Number(sip.amount || 0);

      const amc = sip.amc || extractAmcName(sip.scheme);
      const linkedBank = (state?.bankAccounts || []).find((b: any) => b.id === sip.bankAccountId);
      const linkedGoal = (state?.goals || []).find((g: any) => g.id === sip.goalId);

      if (!sip.startDate) {
        return {
          ...sip,
          status,
          amc,
          linkedBank,
          linkedGoal,
          paid: 0,
          totalInvested: 0,
          remaining: Number(sip.totalInstallments || 0),
          currentCorpus: 0,
          projectedCorpus: 0,
          estimatedGains: 0,
          gainPct: 0,
          progress: 0,
          isCompleted: false,
          isInactive: isStopped || isPaused,
          monthlyEquivalent: 0,
          currentInstallmentAmt: baseAmount,
          nextDueDateStr: null,
          daysUntilDue: null,
          debitDay: 1,
        };
      }

      const isQuarterly = sip.frequency === "quarterly";
      const periodMonths = isQuarterly ? 3 : 1;
      const periodsPerYear = isQuarterly ? 4 : 12;
      const annualRate = Number(sipProjRate) || 12;
      const r = annualRate / periodsPerYear / 100;
      const monthsElapsed = Math.max(0, monthsBetween(sip.startDate, todayStr));
      const totalInst = Number(sip.totalInstallments || 0);

      const paid =
        totalInst > 0
          ? Math.min(Math.floor(monthsElapsed / periodMonths), totalInst)
          : Math.floor(monthsElapsed / periodMonths);
      const remainingRaw = totalInst > 0 ? Math.max(0, totalInst - paid) : 0;
      const remaining = isStopped ? 0 : remainingRaw;

      let ordinaryFV = 0;
      let totalInvested = 0;
      for (let i = 0; i < paid; i++) {
        const yearIdx = Math.floor(i / periodsPerYear);
        const amt = baseAmount * Math.pow(1 + stepUpPct, yearIdx);
        ordinaryFV = ordinaryFV * (1 + r) + amt;
        totalInvested += amt;
      }
      const currentCorpus = paid === 0 ? 0 : ordinaryFV * (1 + r);

      let ordinaryFVProjected = ordinaryFV;
      for (let i = paid; i < paid + remaining; i++) {
        const yearIdx = Math.floor(i / periodsPerYear);
        const amt = baseAmount * Math.pow(1 + stepUpPct, yearIdx);
        ordinaryFVProjected = ordinaryFVProjected * (1 + r) + amt;
      }
      const projectedCorpus = remaining === 0 ? currentCorpus : ordinaryFVProjected * (1 + r);

      const currentInstallmentAmt = baseAmount * Math.pow(1 + stepUpPct, Math.floor(paid / periodsPerYear));
      const estimatedGains = Math.max(0, currentCorpus - totalInvested);
      const gainPct = totalInvested > 0 ? (estimatedGains / totalInvested) * 100 : 0;
      const progress = totalInst > 0 ? (paid / totalInst) * 100 : 0;
      const isCompleted = totalInst > 0 && remainingRaw === 0 && paid > 0;
      const isInactive = isCompleted || isStopped || isPaused;

      const monthlyEquivalent = isInactive
        ? 0
        : isQuarterly
          ? currentInstallmentAmt / 3
          : currentInstallmentAmt;

      let nextDueDateStr: string | null = null;
      let daysUntilDue: number | null = null;
      const startD = new Date(sip.startDate + "T00:00:00");
      const debitDay = Number(sip.debitDay) || startD.getDate() || 5;

      if (!isCompleted && !isStopped && !isPaused && (totalInst === 0 || remaining > 0) && sip.startDate) {
        const totalMonthsAdd = paid * periodMonths;
        const rawMonth = startD.getMonth() + totalMonthsAdd;
        const targetYear = startD.getFullYear() + Math.floor(rawMonth / 12);
        const targetMonth = ((rawMonth % 12) + 12) % 12;
        const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const nextD = new Date(targetYear, targetMonth, Math.min(debitDay, lastDayOfTargetMonth));
        nextDueDateStr = getLocalDateString(nextD);
        const todayD = new Date(todayStr + "T00:00:00");
        daysUntilDue = Math.ceil((nextD.getTime() - todayD.getTime()) / 86400000);
      }

      return {
        ...sip,
        status,
        amc,
        linkedBank,
        linkedGoal,
        debitDay,
        paid,
        totalInvested,
        remaining,
        currentCorpus,
        projectedCorpus,
        currentInstallmentAmt,
        estimatedGains,
        gainPct,
        progress,
        isCompleted,
        isInactive,
        monthlyEquivalent,
        nextDueDateStr,
        daysUntilDue,
      };
    });
  }, [state?.sips, state?.bankAccounts, state?.goals, todayStr, sipProjRate]);

  const activeSips = useMemo(() => sipsWithCalc.filter((s: any) => !s.isInactive), [sipsWithCalc]);
  const completedOrStoppedSips = useMemo(() => sipsWithCalc.filter((s: any) => s.isInactive), [sipsWithCalc]);

  const totalMonthlyCommitment = useMemo(
    () => activeSips.reduce((sum: number, sip: any) => sum + sip.monthlyEquivalent, 0),
    [activeSips]
  );
  const totalInvested = useMemo(
    () => sipsWithCalc.reduce((sum: number, sip: any) => sum + sip.totalInvested, 0),
    [sipsWithCalc]
  );
  const totalEstimatedValue = useMemo(
    () => sipsWithCalc.reduce((sum: number, sip: any) => sum + sip.currentCorpus, 0),
    [sipsWithCalc]
  );
  const totalGains = useMemo(
    () => Math.max(0, totalEstimatedValue - totalInvested),
    [totalEstimatedValue, totalInvested]
  );
  const overallGainPct = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0;
  const totalProjected = useMemo(
    () => sipsWithCalc.reduce((sum: number, sip: any) => sum + sip.projectedCorpus, 0),
    [sipsWithCalc]
  );

  // Auto-debit upcoming in the next 7 days
  const upcomingThisWeek = useMemo(() => {
    return activeSips.filter((s: any) => s.daysUntilDue !== null && s.daysUntilDue >= 0 && s.daysUntilDue <= 7);
  }, [activeSips]);

  const totalUpcomingThisWeek = useMemo(() => {
    return upcomingThisWeek.reduce((s: number, i: any) => s + (i.currentInstallmentAmt || i.amount || 0), 0);
  }, [upcomingThisWeek]);

  // Filtering & Searching
  const filteredSips = useMemo(() => {
    return sipsWithCalc.filter((s: any) => {
      if (filterStatus === "active" && s.isInactive) return false;
      if (filterStatus === "inactive" && !s.isInactive) return false;
      if (filterFundType !== "all" && s.fundType !== filterFundType) return false;
      if (filterOwner !== "all" && s.owner !== filterOwner) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchScheme = (s.scheme || "").toLowerCase().includes(q);
        const matchBroker = (s.broker || "").toLowerCase().includes(q);
        const matchAmc = (s.amc || "").toLowerCase().includes(q);
        const matchType = (s.fundType || "").toLowerCase().includes(q);
        const matchFolio = (s.folioNo || "").toLowerCase().includes(q);
        const matchGoal = (s.linkedGoal?.name || "").toLowerCase().includes(q);
        if (!matchScheme && !matchBroker && !matchAmc && !matchType && !matchFolio && !matchGoal) return false;
      }
      return true;
    });
  }, [sipsWithCalc, filterStatus, filterFundType, filterOwner, searchQuery]);

  // Sorting
  const sortedSips = useMemo(() => {
    const arr = [...filteredSips];
    if (sortBy === "progress") return arr.sort((a: any, b: any) => b.progress - a.progress);
    if (sortBy === "projected") return arr.sort((a: any, b: any) => b.projectedCorpus - a.projectedCorpus);
    if (sortBy === "value") return arr.sort((a: any, b: any) => b.currentCorpus - a.currentCorpus);
    if (sortBy === "nextDue") {
      return arr.sort((a: any, b: any) => {
        if (a.daysUntilDue === null) return 1;
        if (b.daysUntilDue === null) return -1;
        return a.daysUntilDue - b.daysUntilDue;
      });
    }
    if (sortBy === "start") return arr.sort((a: any, b: any) => (b.startDate || "").localeCompare(a.startDate || ""));
    return arr.sort((a: any, b: any) => Number(b.amount || 0) - Number(a.amount || 0));
  }, [filteredSips, sortBy]);

  const sortedActive = sortedSips.filter((s: any) => !s.isInactive);
  const sortedCompleted = sortedSips.filter((s: any) => s.isInactive);

  // Category Allocation Breakdown
  const fundTypeAlloc = useMemo(() => {
    const map: Record<string, number> = {};
    activeSips.forEach((s: any) => {
      const ft = s.fundType || "Other";
      map[ft] = (map[ft] || 0) + s.monthlyEquivalent;
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .map(([type, amt]) => ({ type, amt, pct: total > 0 ? (amt / total) * 100 : 0 }))
      .sort((a, b) => b.amt - a.amt);
  }, [activeSips]);

  // AMC Concentration Breakdown
  const amcAlloc = useMemo(() => {
    const map: Record<string, number> = {};
    activeSips.forEach((s: any) => {
      const amc = s.amc || "Other AMC";
      map[amc] = (map[amc] || 0) + s.monthlyEquivalent;
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .map(([name, amt]) => ({ name, amt, pct: total > 0 ? (amt / total) * 100 : 0 }))
      .sort((a, b) => b.amt - a.amt);
  }, [activeSips]);

  // 10-Year Compounding Chart Simulation
  const projectionChartData = useMemo(() => {
    if (sipsWithCalc.length === 0) return [];
    const r = (Number(sipProjRate) || 12) / 12 / 100;
    const nowYear = new Date().getFullYear();
    const chartPoints: any[] = [];

    let currentInvested = totalInvested;
    let currentWealth = totalEstimatedValue;

    chartPoints.push({
      label: "Now",
      invested: Math.round(currentInvested),
      wealth: Math.round(currentWealth),
    });

    for (let year = 1; year <= 10; year++) {
      for (let month = 1; month <= 12; month++) {
        for (const sip of sipsWithCalc) {
          if (sip.isCompleted || sip.status === "stopped") continue;
          const isQuarterly = sip.frequency === "quarterly";
          const periodsPerYear = isQuarterly ? 4 : 12;
          const stepUpPct = Math.max(0, Number(sip.stepUpPct || 0)) / 100;
          const baseAmount = Number(sip.amount || 0);
          const totalInst = Number(sip.totalInstallments || 0);
          const elapsed = monthsBetween(sip.startDate, todayStr);
          const totalMonthsAtPoint = elapsed + (year - 1) * 12 + month;

          if (isQuarterly) {
            const instNum = Math.floor(totalMonthsAtPoint / 3);
            if ((totalInst === 0 || instNum < totalInst) && totalMonthsAtPoint % 3 === 0) {
              const amt = baseAmount * Math.pow(1 + stepUpPct, Math.floor((instNum - 1) / periodsPerYear));
              currentInvested += amt;
              currentWealth += amt;
            }
          } else {
            if (totalInst === 0 || totalMonthsAtPoint <= totalInst) {
              const amt = baseAmount * Math.pow(1 + stepUpPct, Math.floor((totalMonthsAtPoint - 1) / periodsPerYear));
              currentInvested += amt;
              currentWealth += amt;
            }
          }
        }
        currentWealth *= 1 + r;
      }
      chartPoints.push({
        label: String(nowYear + year),
        invested: Math.round(currentInvested),
        wealth: Math.round(currentWealth),
      });
    }
    return chartPoints;
  }, [sipsWithCalc, sipProjRate, totalInvested, totalEstimatedValue, todayStr]);

  // Export SIP data to CSV
  const handleExportCSV = () => {
    if (sipsWithCalc.length === 0) {
      showToast?.("No SIP data to export", "info");
      return;
    }
    const headers = [
      "Scheme Name",
      "Fund Type",
      "AMC",
      "Monthly Installment (₹)",
      "Frequency",
      "Start Date",
      "Debit Day",
      "Step-Up (%)",
      "Total Invested (₹)",
      "Est. Current Value (₹)",
      "Est. Gains (₹)",
      "Gain %",
      "Broker",
      "Folio No",
      "Mandate Type",
      "Linked Bank",
      "Linked Goal",
      "Status",
    ];
    const rows = sipsWithCalc.map((s: any) => [
      `"${s.scheme || ""}"`,
      `"${s.fundType || ""}"`,
      `"${s.amc || ""}"`,
      s.currentInstallmentAmt || s.amount || 0,
      s.frequency || "monthly",
      s.startDate || "",
      s.debitDay || 5,
      s.stepUpPct || 0,
      s.totalInvested || 0,
      s.currentCorpus || 0,
      s.estimatedGains || 0,
      (s.gainPct || 0).toFixed(2),
      `"${s.broker || ""}"`,
      `"${s.folioNo || ""}"`,
      `"${s.mandateType || ""}"`,
      `"${s.linkedBank?.bankName || ""}"`,
      `"${s.linkedGoal?.name || ""}"`,
      s.status || "active",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any[]) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SIP_Tracker_Export_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast?.("SIP ledger exported to CSV", "success");
  };

  return (
    <div className="tab-content-enter">
      {/* Header with Title & Top Actions */}
      <SectionTitle
        sub="Monitor systematic investment plans, auto-debit calendars, compounding trajectories, and portfolio health"
        rightElement={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {sipsWithCalc.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Download size={13} />}
                  onClick={handleExportCSV}
                  title="Export SIPs to CSV"
                >
                  Export CSV
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Printer size={13} />}
                  onClick={() => window.print()}
                  title="Print SIP Summary"
                >
                  Print
                </Button>
              </>
            )}
            <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShow(true)}>
              Add SIP
            </Button>
          </div>
        }
      >
        SIP & Wealth Tracker
      </SectionTitle>

      {/* Hero Stats Cockpit */}
      {sipsWithCalc.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <StatCard
              label="Monthly SIP Commitment"
              value={fmtINRFull(totalMonthlyCommitment)}
              numericValue={totalMonthlyCommitment}
              formatValue={fmtINRFull}
              sub={
                metrics?.monthIncome > 0
                  ? `${((totalMonthlyCommitment / metrics.monthIncome) * 100).toFixed(1)}% of monthly income`
                  : `${activeSips.length} active plans`
              }
              icon={<Repeat />}
              color={THEME.accent}
            />
            <StatCard
              label="Total Invested"
              value={fmtINRFull(totalInvested)}
              numericValue={totalInvested}
              formatValue={fmtINRFull}
              sub="Principal capital deployed"
              icon={<IndianRupee />}
              color={THEME.sage}
            />
            <StatCard
              label="Est. Current Value"
              value={fmtINRFull(totalEstimatedValue)}
              numericValue={totalEstimatedValue}
              formatValue={fmtINRFull}
              sub={
                totalGains > 0
                  ? `+${privacyMode ? "••••" : fmtINRFull(totalGains)} (+${overallGainPct.toFixed(1)}%)`
                  : "Current wealth"
              }
              icon={<TrendingUp />}
              color={totalGains > 0 ? THEME.gold : THEME.accent}
            />
            <StatCard
              label="10-Yr Projected Corpus"
              value={fmtINRFull(totalProjected)}
              numericValue={totalProjected}
              formatValue={fmtINRFull}
              sub={`@${sipProjRate}% p.a. yield`}
              icon={<Activity />}
              color={THEME.violet || THEME.accent}
            />
          </div>

          {/* Upcoming Auto-Debit Alert Banner (if any due in next 7 days) */}
          {upcomingThisWeek.length > 0 && (
            <Card
              style={{
                marginBottom: 18,
                padding: "12px 18px",
                background: `color-mix(in srgb, ${THEME.gold} 8%, var(--surface-0))`,
                border: `1px solid color-mix(in srgb, ${THEME.gold} 25%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: `color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: THEME.gold,
                    flexShrink: 0,
                  }}
                >
                  <AlertCircle size={17} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                    {upcomingThisWeek.length} Auto-Debit{upcomingThisWeek.length > 1 ? "s" : ""} Due in the Next 7 Days
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted }}>
                    Ensure sufficient liquidity: <strong style={{ color: THEME.ink }}><Money value={totalUpcomingThisWeek} variant="exact" /></strong> total debit scheduled.
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={<CalendarDays size={13} />}
                onClick={() => setViewMode("calendar")}
              >
                View Debit Schedule
              </Button>
            </Card>
          )}

          {/* Main Controls Bar: View Modes, Search, and Multi-Level Filters */}
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
            {/* View Mode Buttons */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => setViewMode("cards")}
                className={`demat-portfolio-pill ${viewMode === "cards" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 12 }}
              >
                <LayoutGrid size={13} /> SIP Cards
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`demat-portfolio-pill ${viewMode === "calendar" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 12 }}
              >
                <CalendarDays size={13} /> Debit Schedule
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`demat-portfolio-pill ${viewMode === "table" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 12 }}
              >
                <TableIcon size={13} /> Table Ledger
              </button>
              <button
                onClick={() => setViewMode("simulator")}
                className={`demat-portfolio-pill ${viewMode === "simulator" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 12 }}
              >
                <Sparkles size={13} /> Step-Up Lab
              </button>
              <button
                onClick={() => setViewMode("health")}
                className={`demat-portfolio-pill ${viewMode === "health" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 12 }}
              >
                <PieChartIcon size={13} /> Health & AMC
              </button>
            </div>

            {/* Search, Status, Profile Filters, and Sorting */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {/* Search Bar */}
              <div style={{ position: "relative", minWidth: 180 }}>
                <Search
                  size={13}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: THEME.muted,
                  }}
                />
                <input
                  type="text"
                  placeholder="Search funds, AMC, broker, folio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px 6px 30px",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-1)",
                    color: THEME.ink,
                    fontSize: 12,
                    outline: "none",
                  }}
                />
              </div>

              {/* Status Filter */}
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "active", label: "Active" },
                    { id: "inactive", label: "Inactive" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterStatus(f.id)}
                    className={`demat-portfolio-pill ${filterStatus === f.id ? "active" : ""}`}
                    style={{ fontSize: 11, padding: "4px 10px" }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Family / Profile Filter (if multi-member configured) */}
              {familyProfiles && familyProfiles.length > 1 && (
                <select
                  value={filterOwner}
                  onChange={(e) => setFilterOwner(e.target.value)}
                  style={{
                    fontSize: 11,
                    padding: "4px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-1)",
                    color: THEME.ink,
                  }}
                >
                  <option value="all">All Family</option>
                  {familyProfiles.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${THEME.line}`,
                  background: "var(--surface-1)",
                  color: THEME.ink,
                }}
              >
                <option value="amount">Sort: Monthly Amount</option>
                <option value="value">Sort: Current Value</option>
                <option value="projected">Sort: Projected Corpus</option>
                <option value="nextDue">Sort: Next Debit Date</option>
                <option value="progress">Sort: Progress %</option>
                <option value="start">Sort: Start Date</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* Main View Area */}
      {sipsWithCalc.length === 0 ? (
        <EmptyState
          icon={Repeat}
          gradient={`linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, ${THEME.accent} 55%, white) 100%)`}
          dotColor={THEME.accent}
          title="No SIPs Tracked Yet"
          description="Track your mutual fund systematic investment plans, auto-debit calendars, annual step-up compounding, and linked financial goals."
          pills={[
            "Mutual Fund SIPs",
            "Auto-Debit Calendar",
            "Step-Up Simulator",
            "Bank & Goal Linking",
          ]}
          buttonLabel="Add First SIP"
          onAdd={() => setShow(true)}
        />
      ) : filteredSips.length === 0 ? (
        <Card style={{ padding: 48, textAlign: "center" }}>
          <div style={{ color: THEME.muted, fontSize: 13 }}>No SIPs match your filter criteria.</div>
          <Button
            variant="outline"
            size="sm"
            style={{ marginTop: 12 }}
            onClick={() => {
              setSearchQuery("");
              setFilterStatus("all");
              setFilterFundType("all");
              setFilterOwner("all");
            }}
          >
            Clear Filters
          </Button>
        </Card>
      ) : viewMode === "calendar" ? (
        /* DEBIT SCHEDULE & CALENDAR VIEW */
        <DebitScheduleView
          sips={activeSips}
          allSips={sipsWithCalc}
          onEdit={(sip: any) => setEditSip(sip)}
          onStatusChange={changeSipStatus}
        />
      ) : viewMode === "table" ? (
        /* TABLE LEDGER VIEW */
        <SIPTableView
          sips={sortedSips}
          onEdit={(sip: any) => setEditSip(sip)}
          onRemove={(sip: any) => setConfirmDeleteSip(sip)}
          onDuplicate={duplicateSip}
          onStatusChange={changeSipStatus}
        />
      ) : viewMode === "simulator" ? (
        /* STEP-UP & COMPOUNDING SIMULATOR */
        <StepUpSimulatorView
          sips={activeSips}
          totalMonthlyCommitment={totalMonthlyCommitment}
          sipProjRate={sipProjRate}
          setSipProjRate={setSipProjRate}
          projectionChartData={projectionChartData}
        />
      ) : viewMode === "health" ? (
        /* HEALTH & AMC CONCENTRATION SCORECARD */
        <PortfolioHealthView
          sips={activeSips}
          fundTypeAlloc={fundTypeAlloc}
          amcAlloc={amcAlloc}
          totalMonthlyCommitment={totalMonthlyCommitment}
          metrics={metrics}
        />
      ) : (
        /* CARDS VIEW */
        <div style={{ marginBottom: 28 }}>
          {/* Active SIPs Grid */}
          {sortedActive.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))",
                gap: 16,
                marginBottom: 28,
              }}
            >
              {sortedActive.map((sip: any) => (
                <SIPCard
                  key={sip.id}
                  sip={sip}
                  onEdit={() => setEditSip(sip)}
                  onRemove={() => setConfirmDeleteSip(sip)}
                  onDuplicate={() => duplicateSip(sip)}
                  onStatusChange={(newStatus: string) => changeSipStatus(sip.id, newStatus)}
                />
              ))}
            </div>
          )}

          {/* Inactive / Paused / Completed SIPs */}
          {sortedCompleted.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: THEME.muted,
                  fontWeight: 800,
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>Inactive & Completed SIPs</span>
                <span
                  style={{
                    background: "var(--surface-1)",
                    padding: "2px 8px",
                    borderRadius: 99,
                    fontSize: 10,
                  }}
                >
                  {sortedCompleted.length}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))",
                  gap: 16,
                  marginBottom: 28,
                }}
              >
                {sortedCompleted.map((sip: any) => (
                  <SIPCard
                    key={sip.id}
                    sip={sip}
                    onEdit={() => setEditSip(sip)}
                    onRemove={() => setConfirmDeleteSip(sip)}
                    onDuplicate={() => duplicateSip(sip)}
                    onStatusChange={(newStatus: string) => changeSipStatus(sip.id, newStatus)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Bottom Wealth Growth Projection Chart Card */}
          {sipsWithCalc.length > 0 && (
            <Card style={{ marginBottom: 28, padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: THEME.muted,
                      fontWeight: 800,
                      marginBottom: 4,
                    }}
                  >
                    10-Year Wealth Growth Projection
                  </div>
                  <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 600 }}>
                    Compounding trajectory with annual step-up commitments @{sipProjRate}% CAGR
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
                    padding: "6px 14px",
                    borderRadius: 10,
                    border: `1px solid color-mix(in srgb, ${THEME.accent} 13%, transparent)`,
                  }}
                >
                  <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>Expected Yield</span>
                  <input
                    style={{
                      width: 44,
                      fontSize: 14,
                      background: "transparent",
                      border: "none",
                      color: THEME.ink,
                      fontWeight: 800,
                      padding: 0,
                      textAlign: "center",
                    }}
                    type="number"
                    value={sipProjRate}
                    onChange={(e) => setSipProjRate(e.target.value)}
                  />
                  <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>% p.a.</span>
                </div>
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={projectionChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sipColorInvested" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={THEME.muted} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={THEME.muted} stopOpacity={0.01} />
                      </linearGradient>
                      <linearGradient id="sipColorWealth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={THEME.sage} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={THEME.sage} stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" stroke={THEME.muted} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke={THEME.muted}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => (privacyMode ? "••••" : fmtINRFull(v))}
                      width={72}
                    />
                    <Tooltip
                      formatter={(v: any) => (privacyMode ? "••••" : fmtINRFull(v))}
                      contentStyle={{
                        background: "var(--surface-0)",
                        borderColor: THEME.line,
                        borderRadius: 10,
                        color: THEME.ink,
                      }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Area
                      type="monotone"
                      dataKey="invested"
                      name="Cumulative Invested"
                      stroke={THEME.muted}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#sipColorInvested)"
                    />
                    <Area
                      type="monotone"
                      dataKey="wealth"
                      name="Projected Wealth"
                      stroke={THEME.sage}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#sipColorWealth)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      {show && (
        <SIPModal
          state={state}
          onClose={() => setShow(false)}
          onSave={saveNewSip}
          saving={savingNewSip}
        />
      )}
      {editSip && (
        <SIPModal
          state={state}
          initial={editSip}
          onClose={() => setEditSip(null)}
          onSave={saveSipEdit}
          saving={savingSipEdit}
        />
      )}
      {confirmDeleteSip && (
        <ConfirmDialog
          message={`Delete SIP for "${confirmDeleteSip.scheme || "this fund"}"? This cannot be undone.`}
          onConfirm={() => {
            deleteSip(confirmDeleteSip.id);
            setConfirmDeleteSip(null);
          }}
          onCancel={() => setConfirmDeleteSip(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DEBIT SCHEDULE / CALENDAR VIEW
// ─────────────────────────────────────────────────────────────────────────────
function DebitScheduleView({ sips, allSips, onEdit, onStatusChange }: any) {
  const { privacyMode } = usePrivacy();

  // Group active SIPs by debit day of the month (1 to 31)
  const dayBuckets = useMemo(() => {
    const buckets: Record<number, any[]> = {};
    for (let d = 1; d <= 31; d++) buckets[d] = [];
    sips.forEach((s: any) => {
      const day = s.debitDay || 5;
      if (buckets[day]) buckets[day].push(s);
      else buckets[5].push(s);
    });
    return buckets;
  }, [sips]);

  // Group chronological upcoming debits
  const sortedUpcoming = useMemo(() => {
    return [...sips].sort((a: any, b: any) => {
      if (a.daysUntilDue === null) return 1;
      if (b.daysUntilDue === null) return -1;
      return a.daysUntilDue - b.daysUntilDue;
    });
  }, [sips]);

  const totalMonthly = sips.reduce((s: number, i: any) => s + (i.monthlyEquivalent || 0), 0);

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <Card style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", color: THEME.muted, fontWeight: 800, marginBottom: 6 }}>
            Monthly Auto-Debit Schedule
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
            <Money value={totalMonthly} variant="exact" />
          </div>
          <div style={{ fontSize: 12, color: THEME.muted }}>
            Scheduled across {sips.length} systematic debits each month
          </div>
        </Card>

        <Card style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", color: THEME.muted, fontWeight: 800, marginBottom: 6 }}>
            Auto-Debit Readiness Checklist
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: THEME.sage }}>
              <CheckCircle2 size={14} /> Active Mandates
            </span>
            <span style={{ fontSize: 12, color: THEME.muted }}>· Ensure sufficient funds 2 days before debit date</span>
          </div>
          <div style={{ fontSize: 11, color: THEME.muted }}>
            Tip: Most AMCs process NACH debits at 10:00 AM on the scheduled date.
          </div>
        </Card>
      </div>

      {/* 31-Day Interactive Visual Cycle */}
      <Card style={{ padding: "20px 24px", marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: THEME.muted, marginBottom: 14 }}>
          Monthly Debit Calendar (Day 1 - 31)
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
            gap: 8,
          }}
        >
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
            const list = dayBuckets[day] || [];
            const hasSips = list.length > 0;
            const dayTotal = list.reduce((s, item) => s + (item.currentInstallmentAmt || item.amount || 0), 0);
            const isToday = new Date().getDate() === day;

            return (
              <div
                key={day}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: hasSips
                    ? `color-mix(in srgb, ${THEME.accent} 8%, var(--surface-0))`
                    : "var(--surface-1)",
                  border: isToday
                    ? `2px solid ${THEME.accent}`
                    : hasSips
                      ? `1px solid color-mix(in srgb, ${THEME.accent} 25%, transparent)`
                      : `1px solid ${THEME.line}`,
                  minHeight: 70,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: isToday ? THEME.accent : THEME.ink }}>
                    {day}
                  </span>
                  {hasSips && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: THEME.accent,
                      }}
                    />
                  )}
                </div>
                {hasSips ? (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: THEME.accent }}>
                      <Money value={dayTotal} variant="exact" />
                    </div>
                    <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 600 }}>
                      {list.length} SIP{list.length > 1 ? "s" : ""}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 9, color: THEME.muted, opacity: 0.5 }}>—</div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Chronological Debit Timeline */}
      <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: THEME.muted, marginBottom: 14 }}>
        Upcoming Auto-Debit Timeline
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {sortedUpcoming.map((sip: any) => {
          const isOverdue = sip.daysUntilDue !== null && sip.daysUntilDue < 0;
          const isDueSoon = sip.daysUntilDue !== null && sip.daysUntilDue >= 0 && sip.daysUntilDue <= 7;
          const alertColor = isOverdue ? THEME.rust : isDueSoon ? THEME.gold : THEME.sage;

          return (
            <Card
              key={sip.id}
              className="card-lift"
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 14,
                borderLeft: `4px solid ${alertColor}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <MFLogo fundName={sip.scheme || ""} size={38} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                    {sip.scheme}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                      Debit Day: <strong>{sip.debitDay || 5}th</strong> of every month
                    </span>
                    {sip.broker && (
                      <span style={{ fontSize: 10, color: THEME.muted, background: "var(--surface-1)", padding: "1px 6px", borderRadius: 4 }}>
                        {sip.broker}
                      </span>
                    )}
                    {sip.linkedBank && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: THEME.ink, background: "var(--surface-1)", padding: "1px 6px", borderRadius: 4 }}>
                        <Building2 size={10} /> {sip.linkedBank.bankName} (••{sip.linkedBank.accountNumber?.slice(-4) || "NA"})
                      </span>
                    )}
                    {sip.mandateType && (
                      <span style={{ fontSize: 10, color: THEME.muted }}>
                        via {sip.mandateType}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                    <Money value={sip.currentInstallmentAmt || sip.amount} variant="exact" />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: alertColor }}>
                    {isOverdue
                      ? `Overdue by ${Math.abs(sip.daysUntilDue)} day${Math.abs(sip.daysUntilDue) !== 1 ? "s" : ""}`
                      : isDueSoon
                        ? `Due in ${sip.daysUntilDue} day${sip.daysUntilDue !== 1 ? "s" : ""}`
                        : sip.daysUntilDue !== null
                          ? `In ${sip.daysUntilDue} days`
                          : "Scheduled"}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onEdit(sip)}>
                  <Pencil size={13} />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TABLE LEDGER VIEW
// ─────────────────────────────────────────────────────────────────────────────
function SIPTableView({ sips, onEdit, onRemove, onDuplicate, onStatusChange }: any) {
  return (
    <Card style={{ overflow: "hidden", marginBottom: 24 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--surface-1)", borderBottom: `1.5px solid ${THEME.line}` }}>
              <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Scheme & AMC</th>
              <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Category</th>
              <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Installment</th>
              <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Debit Day</th>
              <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Step-Up</th>
              <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Invested</th>
              <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Est. Value</th>
              <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Status</th>
              <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sips.map((sip: any) => {
              const fundColor = FUND_COLORS[sip.fundType] || THEME.muted;
              return (
                <tr
                  key={sip.id}
                  style={{
                    borderBottom: `1px solid ${THEME.line}`,
                    opacity: sip.isInactive ? 0.65 : 1,
                  }}
                >
                  <td style={{ padding: "14px 16px", fontWeight: 700, color: THEME.ink }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <MFLogo fundName={sip.scheme || ""} size={30} />
                      <div>
                        <div>{sip.scheme}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: THEME.muted, fontWeight: 500, marginTop: 2 }}>
                          <span>{sip.amc}</span>
                          {sip.broker && <span>· via {sip.broker}</span>}
                          {sip.folioNo && <span>· Folio: {sip.folioNo}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: fundColor,
                        background: `color-mix(in srgb, ${fundColor} 10%, transparent)`,
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      {sip.fundType || "Equity"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800 }}>
                    <Money value={sip.currentInstallmentAmt || sip.amount} variant="exact" />
                    <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 500 }}>
                      /{sip.frequency === "quarterly" ? "qtr" : "mo"}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                    {sip.debitDay || 5}th
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    {Number(sip.stepUpPct || 0) > 0 ? (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: THEME.violet,
                          background: `color-mix(in srgb, ${THEME.violet} 10%, transparent)`,
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        +{sip.stepUpPct}%/yr
                      </span>
                    ) : (
                      <span style={{ color: THEME.muted, fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800, color: THEME.sage }}>
                    <Money value={sip.totalInvested} variant="full" />
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 900, color: THEME.accent }}>
                    <Money value={sip.currentCorpus} variant="full" />
                    {sip.estimatedGains > 0 && (
                      <div style={{ fontSize: 10, color: THEME.sage, fontWeight: 700 }}>
                        +{sip.gainPct.toFixed(1)}%
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color:
                          sip.isCompleted
                            ? THEME.sage
                            : sip.status === "paused"
                              ? THEME.gold
                              : sip.status === "stopped"
                                ? THEME.rust
                                : THEME.accent,
                        background: "var(--surface-1)",
                        padding: "2px 8px",
                        borderRadius: 4,
                        textTransform: "uppercase",
                      }}
                    >
                      {sip.status || "Active"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <div style={{ display: "inline-flex", gap: 4 }}>
                      <button
                        onClick={() => onDuplicate(sip)}
                        className="icon-btn"
                        style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}
                        title="Duplicate SIP"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => onEdit(sip)}
                        className="icon-btn"
                        style={{ background: "none", border: "none", cursor: "pointer", color: THEME.accent, padding: 4 }}
                        title="Edit SIP"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => onRemove(sip)}
                        className="icon-btn danger"
                        style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}
                        title="Delete SIP"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. STEP-UP & COMPOUNDING SIMULATOR
// ─────────────────────────────────────────────────────────────────────────────
function StepUpSimulatorView({ sips, totalMonthlyCommitment, sipProjRate, setSipProjRate, projectionChartData }: any) {
  const { privacyMode } = usePrivacy();
  const [simMonthly, setSimMonthly] = useState(String(Math.round(totalMonthlyCommitment || 25000)));
  const [simYears, setSimYears] = useState("15");
  const [simRate, setSimRate] = useState(sipProjRate || "12");
  const [simStepUp, setSimStepUp] = useState("10");

  const p = Number(simMonthly) || 0;
  const nYears = Number(simYears) || 15;
  const rAnnual = Number(simRate) || 12;
  const stepUpPct = Number(simStepUp) || 0;
  const rMonthly = rAnnual / 12 / 100;

  // Comparison Calculator: Flat vs 5% vs 10% vs 15% Step-Up
  const calculateCorpus = (monthlyP: number, years: number, cagr: number, stepPct: number) => {
    const r = cagr / 12 / 100;
    const s = stepPct / 100;
    let totalInv = 0;
    let fv = 0;
    for (let yr = 0; yr < years; yr++) {
      const currentMonthly = monthlyP * Math.pow(1 + s, yr);
      for (let m = 0; m < 12; m++) {
        fv = (fv + currentMonthly) * (1 + r);
        totalInv += currentMonthly;
      }
    }
    return { invested: Math.round(totalInv), wealth: Math.round(fv), gains: Math.round(fv - totalInv) };
  };

  const flatResult = useMemo(() => calculateCorpus(p, nYears, rAnnual, 0), [p, nYears, rAnnual]);
  const step5Result = useMemo(() => calculateCorpus(p, nYears, rAnnual, 5), [p, nYears, rAnnual]);
  const step10Result = useMemo(() => calculateCorpus(p, nYears, rAnnual, 10), [p, nYears, rAnnual]);
  const step15Result = useMemo(() => calculateCorpus(p, nYears, rAnnual, 15), [p, nYears, rAnnual]);

  const activeSimResult = useMemo(() => calculateCorpus(p, nYears, rAnnual, stepUpPct), [p, nYears, rAnnual, stepUpPct]);

  // Cost of Delay (Delaying by 1, 3, 5 years)
  const delay1Yr = useMemo(() => calculateCorpus(p, Math.max(1, nYears - 1), rAnnual, stepUpPct), [p, nYears, rAnnual, stepUpPct]);
  const delay3Yr = useMemo(() => calculateCorpus(p, Math.max(1, nYears - 3), rAnnual, stepUpPct), [p, nYears, rAnnual, stepUpPct]);
  const delay5Yr = useMemo(() => calculateCorpus(p, Math.max(1, nYears - 5), rAnnual, stepUpPct), [p, nYears, rAnnual, stepUpPct]);

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Interactive Controls Bar */}
      <Card style={{ padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", color: THEME.muted, fontWeight: 800, marginBottom: 14 }}>
          Step-Up SIP Compounding Simulation Controls
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, display: "block", marginBottom: 4 }}>
              Monthly Base SIP (₹)
            </label>
            <input
              className="form-input"
              type="number"
              value={simMonthly}
              onChange={(e) => setSimMonthly(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, display: "block", marginBottom: 4 }}>
              Investment Horizon (Years)
            </label>
            <input
              className="form-input"
              type="number"
              min={1}
              max={40}
              value={simYears}
              onChange={(e) => setSimYears(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, display: "block", marginBottom: 4 }}>
              Expected CAGR (%)
            </label>
            <input
              className="form-input"
              type="number"
              value={simRate}
              onChange={(e) => {
                setSimRate(e.target.value);
                setSipProjRate(e.target.value);
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, display: "block", marginBottom: 4 }}>
              Annual Step-Up (%)
            </label>
            <input
              className="form-input"
              type="number"
              min={0}
              max={50}
              value={simStepUp}
              onChange={(e) => setSimStepUp(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Simulator Results Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <Card style={{ padding: "18px 20px", borderTop: `3px solid ${THEME.muted}` }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>Flat SIP (0% Step-Up)</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink, margin: "8px 0 4px" }}>
            <Money value={flatResult.wealth} variant="full" />
          </div>
          <div style={{ fontSize: 11, color: THEME.muted }}>
            Invested: <Money value={flatResult.invested} variant="full" />
          </div>
        </Card>

        <Card style={{ padding: "18px 20px", borderTop: `3px solid ${THEME.accent}` }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: THEME.accent, textTransform: "uppercase" }}>+5% Annual Step-Up</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink, margin: "8px 0 4px" }}>
            <Money value={step5Result.wealth} variant="full" />
          </div>
          <div style={{ fontSize: 11, color: THEME.sage, fontWeight: 700 }}>
            +<Money value={step5Result.wealth - flatResult.wealth} variant="full" /> extra corpus
          </div>
        </Card>

        <Card style={{ padding: "18px 20px", borderTop: `3px solid ${THEME.sage}` }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: THEME.sage, textTransform: "uppercase" }}>+10% Annual Step-Up</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink, margin: "8px 0 4px" }}>
            <Money value={step10Result.wealth} variant="full" />
          </div>
          <div style={{ fontSize: 11, color: THEME.sage, fontWeight: 700 }}>
            +<Money value={step10Result.wealth - flatResult.wealth} variant="full" /> extra corpus
          </div>
        </Card>

        <Card style={{ padding: "18px 20px", borderTop: `3px solid ${THEME.gold}` }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: THEME.gold, textTransform: "uppercase" }}>+15% Annual Step-Up</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink, margin: "8px 0 4px" }}>
            <Money value={step15Result.wealth} variant="full" />
          </div>
          <div style={{ fontSize: 11, color: THEME.sage, fontWeight: 700 }}>
            +<Money value={step15Result.wealth - flatResult.wealth} variant="full" /> extra corpus
          </div>
        </Card>
      </div>

      {/* Cost of Delay Analysis */}
      <Card style={{ padding: "20px 24px", marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: THEME.rust, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <Flame size={15} /> The Cost of Delaying Your Investments
        </div>
        <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 16 }}>
          Starting today vs delaying by even a few years significantly erodes compounding wealth:
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div style={{ padding: 14, background: "var(--surface-1)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>Delaying 1 Year</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: THEME.rust, margin: "4px 0" }}>
              -<Money value={activeSimResult.wealth - delay1Yr.wealth} variant="full" />
            </div>
            <div style={{ fontSize: 10, color: THEME.muted }}>Final wealth drops to <Money value={delay1Yr.wealth} variant="full" /></div>
          </div>
          <div style={{ padding: 14, background: "var(--surface-1)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>Delaying 3 Years</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: THEME.rust, margin: "4px 0" }}>
              -<Money value={activeSimResult.wealth - delay3Yr.wealth} variant="full" />
            </div>
            <div style={{ fontSize: 10, color: THEME.muted }}>Final wealth drops to <Money value={delay3Yr.wealth} variant="full" /></div>
          </div>
          <div style={{ padding: 14, background: "var(--surface-1)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>Delaying 5 Years</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: THEME.rust, margin: "4px 0" }}>
              -<Money value={activeSimResult.wealth - delay5Yr.wealth} variant="full" />
            </div>
            <div style={{ fontSize: 10, color: THEME.muted }}>Final wealth drops to <Money value={delay5Yr.wealth} variant="full" /></div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PORTFOLIO HEALTH & AMC DIVERSIFICATION SCORECARD
// ─────────────────────────────────────────────────────────────────────────────
function PortfolioHealthView({ sips, fundTypeAlloc, amcAlloc, totalMonthlyCommitment, metrics }: any) {
  const topAmc = amcAlloc[0];
  const isAmcConcentrated = topAmc && topAmc.pct > 45;

  const sipIncomeRatio = metrics?.monthIncome > 0 ? (totalMonthlyCommitment / metrics.monthIncome) * 100 : null;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Top Health Indicators */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <Card style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", color: THEME.muted, fontWeight: 800, marginBottom: 6 }}>
            SIP-to-Income Ratio
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
            {sipIncomeRatio !== null ? `${sipIncomeRatio.toFixed(1)}%` : "—"}
          </div>
          <div style={{ fontSize: 12, color: sipIncomeRatio !== null && sipIncomeRatio >= 20 ? THEME.sage : THEME.muted }}>
            {sipIncomeRatio !== null && sipIncomeRatio >= 20
              ? "✓ Excellent systematic savings rate (>20%)"
              : "Recommended: Allocate 20-30% of net monthly income to SIPs"}
          </div>
        </Card>

        <Card style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", color: THEME.muted, fontWeight: 800, marginBottom: 6 }}>
            Fund House (AMC) Diversification
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: isAmcConcentrated ? THEME.gold : THEME.sage, marginBottom: 4 }}>
            {amcAlloc.length} AMCs
          </div>
          <div style={{ fontSize: 12, color: isAmcConcentrated ? THEME.gold : THEME.sage }}>
            {isAmcConcentrated
              ? `Top AMC (${topAmc.name}) represents ${topAmc.pct.toFixed(0)}% of monthly commitment`
              : "✓ Well distributed across fund management houses"}
          </div>
        </Card>

        <Card style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", color: THEME.muted, fontWeight: 800, marginBottom: 6 }}>
            Category Breadth
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
            {fundTypeAlloc.length} Categories
          </div>
          <div style={{ fontSize: 12, color: THEME.muted }}>
            Equity, Debt, Hybrid & Index coverage
          </div>
        </Card>
      </div>

      {/* AMC Concentration Breakdown */}
      <Card style={{ padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>
          AMC Allocation & Exposure
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {amcAlloc.map(({ name, amt, pct }: any) => (
            <div key={name}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MFLogo fundName={name} size={24} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>{name}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>
                  <Money value={amt} variant="exact" />/mo ({pct.toFixed(1)}%)
                </div>
              </div>
              <div className="progress-track" style={{ height: 6 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${pct}%`,
                    background: pct > 40 ? THEME.gold : THEME.accent,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Fund Category Allocation */}
      <Card style={{ padding: "20px 24px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>
          Category Asset Allocation
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {fundTypeAlloc.map(({ type, amt, pct }: any) => {
            const col = FUND_COLORS[type] || THEME.muted;
            return (
              <div
                key={type}
                style={{
                  padding: 14,
                  borderRadius: 8,
                  background: `color-mix(in srgb, ${col} 6%, var(--surface-0))`,
                  border: `1px solid color-mix(in srgb, ${col} 18%, transparent)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: col }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>{type}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: col }}>
                  <Money value={amt} variant="exact" />
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                  {pct.toFixed(1)}% of total monthly outgo
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. INDIVIDUAL SIP CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function SIPCard({ sip, onEdit, onRemove, onDuplicate, onStatusChange }: any) {
  const { familyProfiles } = useMasterData();
  const { privacyMode } = usePrivacy();
  const [confirmStop, setConfirmStop] = useState(false);
  const isPaused = sip.status === "paused";
  const isStopped = sip.status === "stopped";
  const isOverdue = sip.daysUntilDue !== null && sip.daysUntilDue < 0;
  const isDueSoon = sip.daysUntilDue !== null && sip.daysUntilDue >= 0 && sip.daysUntilDue <= 7;
  const statusColor = sip.isCompleted
    ? THEME.muted
    : isStopped
      ? THEME.rust
      : isPaused
        ? THEME.gold
        : isOverdue
          ? THEME.rust
          : isDueSoon
            ? THEME.gold
            : THEME.sage;
  const fundColor = FUND_COLORS[sip.fundType] || THEME.muted;
  const alertColor = isOverdue ? THEME.rust : THEME.gold;

  const ownerProfile = familyProfiles?.find?.((p: any) => p.id === sip.owner);
  const ownerLabel =
    ownerProfile?.name ||
    (sip.owner ? sip.owner.charAt(0).toUpperCase() + sip.owner.slice(1) : null);

  const currentAmt = Number(sip.currentInstallmentAmt ?? sip.amount ?? 0);
  const annualAmt = sip.frequency === "quarterly" ? currentAmt * 4 : currentAmt * 12;
  const hasStepUpConfigured = Number(sip.stepUpPct || 0) > 0;

  let nextLabel: string | null = null;
  if (!sip.isCompleted && sip.nextDueDateStr) {
    const d = new Date(sip.nextDueDateStr + "T00:00:00");
    nextLabel = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  const startedLabel = sip.startDate
    ? new Date(sip.startDate + "T00:00:00").toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <>
      <Card
        className="card-lift"
        style={{
          padding: "18px 20px",
          borderTop: `3px solid ${statusColor}`,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          {/* Top Row: Logo, Scheme Name & Action Buttons */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
            <MFLogo fundName={sip.scheme || ""} size={42} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                  color: THEME.ink,
                  letterSpacing: "-0.01em",
                  marginBottom: 4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={sip.scheme}
              >
                {sip.scheme}
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                {sip.fundType && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: fundColor,
                      background: `color-mix(in srgb, ${fundColor} 7%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${fundColor} 15%, transparent)`,
                      borderRadius: 4,
                      padding: "2px 6px",
                      textTransform: "uppercase",
                    }}
                  >
                    {sip.fundType}
                  </span>
                )}
                {sip.frequency && sip.frequency !== "monthly" && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: THEME.accent,
                      background: `color-mix(in srgb, ${THEME.accent} 7%, transparent)`,
                      borderRadius: 4,
                      padding: "2px 6px",
                      textTransform: "uppercase",
                    }}
                  >
                    {sip.frequency}
                  </span>
                )}
                {sip.broker && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: THEME.muted,
                      background: "var(--surface-1)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 4,
                      padding: "2px 6px",
                    }}
                  >
                    {sip.broker}
                  </span>
                )}
                {ownerLabel && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: THEME.accent,
                      background: `color-mix(in srgb, ${THEME.accent} 6%, transparent)`,
                      borderRadius: 4,
                      padding: "2px 6px",
                    }}
                  >
                    {ownerLabel}
                  </span>
                )}
                {sip.isCompleted && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: THEME.sage, display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <CheckCircle2 size={10} /> Completed
                  </span>
                )}
                {!sip.isCompleted && isPaused && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: THEME.gold, display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Pause size={10} /> Paused
                  </span>
                )}
                {!sip.isCompleted && isStopped && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: THEME.rust, display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <StopCircle size={10} /> Stopped
                  </span>
                )}
                {hasStepUpConfigured && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 9,
                      fontWeight: 700,
                      color: THEME.violet,
                      background: `color-mix(in srgb, ${THEME.violet} 7%, transparent)`,
                      borderRadius: 4,
                      padding: "2px 6px",
                    }}
                  >
                    <Sparkles size={9} /> {sip.stepUpPct}% step-up
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
              {!sip.isCompleted && !isPaused && !isStopped && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStatusChange?.("paused")}
                  style={{ padding: 5, color: THEME.gold }}
                  title="Pause SIP"
                >
                  <Pause size={13} />
                </Button>
              )}
              {!sip.isCompleted && (isPaused || isStopped) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStatusChange?.("active")}
                  style={{ padding: 5, color: THEME.sage }}
                  title="Resume SIP"
                >
                  <PlayCircle size={13} />
                </Button>
              )}
              {!sip.isCompleted && !isStopped && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmStop(true)}
                  style={{ padding: 5, color: THEME.rust }}
                  title="Stop SIP"
                >
                  <StopCircle size={13} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onDuplicate}
                style={{ padding: 5, color: THEME.muted }}
                title="Duplicate SIP"
              >
                <Copy size={13} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                style={{ padding: 5, color: THEME.accent }}
                title="Edit SIP"
              >
                <Pencil size={13} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                style={{ padding: 5, color: THEME.rust }}
                title="Delete SIP"
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>

          {/* Due Soon or Overdue Badge */}
          {(isOverdue || isDueSoon) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 8,
                marginBottom: 12,
                background: `color-mix(in srgb, ${alertColor} 6%, transparent)`,
                border: `1px solid color-mix(in srgb, ${alertColor} 21%, transparent)`,
                color: alertColor,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <AlertCircle size={12} />
              {isOverdue
                ? `Overdue by ${Math.abs(sip.daysUntilDue)} day${Math.abs(sip.daysUntilDue) !== 1 ? "s" : ""} — ${nextLabel}`
                : `Due in ${sip.daysUntilDue} day${sip.daysUntilDue !== 1 ? "s" : ""} — ${nextLabel}`}
            </div>
          )}

          {/* Linked Bank & Goal Tag Bar */}
          {(sip.linkedBank || sip.linkedGoal || sip.folioNo) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 12,
                fontSize: 10,
                color: THEME.muted,
              }}
            >
              {sip.linkedBank && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    background: "var(--surface-1)",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  <Building2 size={10} /> {sip.linkedBank.bankName}
                </span>
              )}
              {sip.linkedGoal && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                    color: THEME.accent,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  <Target size={10} /> Goal: {sip.linkedGoal.name}
                </span>
              )}
              {sip.folioNo && (
                <span style={{ color: THEME.muted }}>
                  Folio: {sip.folioNo}
                </span>
              )}
            </div>
          )}

          {/* Amount + Installment Count */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: statusColor }}>
                <Money value={currentAmt} variant="exact" />
              </span>
              <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginLeft: 4 }}>
                /{sip.frequency === "quarterly" ? "qtr" : "mo"}
              </span>
              <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 500, marginLeft: 8 }}>
                · <Money value={annualAmt} variant="full" />/yr
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                {sip.paid} / {Number(sip.totalInstallments || 0) > 0 ? sip.totalInstallments : "∞"}
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>installments paid</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 9,
                color: THEME.muted,
                marginBottom: 4,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              <span>Horizon Progress</span>
              <span style={{ color: statusColor }}>
                {sip.progress.toFixed(0)}%{sip.remaining > 0 ? ` · ${sip.remaining} left` : ""}
              </span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.min(sip.progress, 100)}%`, background: statusColor }} />
            </div>
          </div>

          {/* Financial Value Cards */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {[
              { k: "Invested", v: <Money value={sip.totalInvested} variant="full" />, color: THEME.muted },
              { k: "Est. Value", v: <Money value={sip.currentCorpus} variant="full" />, color: THEME.sage },
              { k: sip.isCompleted || isStopped ? "Final" : "Projected", v: <Money value={sip.projectedCorpus} variant="full" />, color: THEME.accent },
            ].map(({ k, v, color }) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: `color-mix(in srgb, ${color} 5%, var(--surface-0))`,
                  border: `1px solid color-mix(in srgb, ${color} 15%, transparent)`,
                  flex: "1 1 80px",
                }}
              >
                <span style={{ fontSize: 9, textTransform: "uppercase", color: THEME.muted, fontWeight: 700 }}>{k}</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 800, color }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer: Gain % + Next Due Date */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 8,
            borderTop: `1px solid ${THEME.line}`,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: sip.estimatedGains > 0 ? THEME.sage : THEME.muted }}>
            {sip.estimatedGains > 0 ? `+${fmtINRFull(sip.estimatedGains)} (+${sip.gainPct.toFixed(1)}%)` : "—"}
          </div>
          {!sip.isCompleted && nextLabel && !isOverdue && !isDueSoon && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: THEME.muted }}>
              <Clock size={10} /> Next: {nextLabel}
            </div>
          )}
        </div>
      </Card>

      {confirmStop && (
        <ConfirmDialog
          message={`Stop "${sip.scheme || "this SIP"}"? It will no longer count toward your monthly SIP total. You can resume it anytime.`}
          confirmLabel="Yes, stop"
          onConfirm={() => {
            onStatusChange?.("stopped");
            setConfirmStop(false);
          }}
          onCancel={() => setConfirmStop(false)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ADD / EDIT SIP MODAL (WITH PRESETS, GOAL & BANK LINKING)
// ─────────────────────────────────────────────────────────────────────────────
function SIPModal({ state, onClose, onSave, initial, saving = false }: any) {
  const { mfCategories, familyProfiles } = useMasterData();
  const [f, setF] = useState(
    initial
      ? {
          owner: initial.owner || "self",
          scheme: initial.scheme || "",
          fundType: initial.fundType || mfCategories[0] || "Equity",
          amount: String(initial.amount || ""),
          frequency: initial.frequency || "monthly",
          startDate: initial.startDate || today(),
          debitDay: String(initial.debitDay || "5"),
          totalInstallments: String(initial.totalInstallments || "120"),
          broker: initial.broker || "",
          stepUpPct: String(initial.stepUpPct || "0"),
          status: initial.status || "active",
          bankAccountId: initial.bankAccountId || "",
          goalId: initial.goalId || "",
          mandateType: initial.mandateType || MANDATE_TYPES[0],
          folioNo: initial.folioNo || "",
          amc: initial.amc || "",
        }
      : {
          owner: "self",
          scheme: "",
          fundType: mfCategories[0] || "Equity",
          amount: "5000",
          frequency: "monthly",
          startDate: today(),
          debitDay: "5",
          totalInstallments: "120",
          broker: "Zerodha (Coin)",
          stepUpPct: "10",
          status: "active",
          bankAccountId: state?.bankAccounts?.[0]?.id || "",
          goalId: state?.goals?.[0]?.id || "",
          mandateType: MANDATE_TYPES[0],
          folioNo: "",
          amc: "",
        }
  );

  const applyPreset = (preset: any) => {
    setF({
      ...f,
      scheme: preset.name,
      fundType: preset.type,
      amc: preset.amc,
    });
  };

  const instNum = Number(f.totalInstallments) || 0;
  const amt = Number(f.amount) || 0;
  const stepUpPctNum = Math.max(0, Number(f.stepUpPct) || 0) / 100;
  const periodsPerYear = f.frequency === "quarterly" ? 4 : 12;

  let totalCommitment = 0;
  for (let i = 0; i < instNum; i++) {
    const yearIdx = Math.floor(i / periodsPerYear);
    totalCommitment += amt * Math.pow(1 + stepUpPctNum, yearIdx);
  }
  const durationYears =
    f.frequency === "quarterly" ? Math.floor(instNum / 4) : Math.floor(instNum / 12);
  const durationMonths = f.frequency === "quarterly" ? (instNum % 4) * 3 : instNum % 12;
  const isValid = f.scheme.trim().length > 0 && amt > 0;

  return (
    <Modal title={initial ? "Edit SIP Plan" : "Add New SIP"} onClose={onClose}>
      {/* Quick Presets (Only in Add mode) */}
      {!initial && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 6 }}>
            Quick Popular Fund Presets:
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {POPULAR_MF_PRESETS.slice(0, 4).map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(p)}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: `1px solid ${THEME.line}`,
                  background: "var(--surface-1)",
                  color: THEME.ink,
                  cursor: "pointer",
                }}
              >
                + {p.name.split(" - ")[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      <ModalSection title="SIP Details">
        <Field label="Owner / Family Profile">
          <select
            className="form-input"
            value={f.owner}
            onChange={(e) => setF({ ...f, owner: e.target.value })}
          >
            {familyProfiles.map((p: any) => (
              <option key={p.id} value={p.id}>
                {formatProfileOption(p)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Mutual Fund Scheme Name">
          <input
            className="form-input"
            value={f.scheme}
            onChange={(e) => setF({ ...f, scheme: e.target.value, amc: extractAmcName(e.target.value) })}
            placeholder="e.g. Parag Parikh Flexi Cap Direct Growth"
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Fund Category">
            <select
              className="form-input"
              value={f.fundType}
              onChange={(e) => setF({ ...f, fundType: e.target.value })}
            >
              {mfCategories.map((c: string) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Platform / Broker">
            <select
              className="form-input"
              value={f.broker}
              onChange={(e) => setF({ ...f, broker: e.target.value })}
            >
              <option value="">— Select Broker —</option>
              {BROKERS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </ModalSection>

      <ModalSection title="Installment & Schedule">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Installment Amount (₹)">
            <input
              className="form-input"
              type="number"
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })}
              placeholder="5000"
            />
          </Field>
          <Field label="Frequency">
            <select
              className="form-input"
              value={f.frequency}
              onChange={(e) => setF({ ...f, frequency: e.target.value })}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Start Date">
            <input
              className="form-input"
              type="date"
              value={f.startDate}
              onChange={(e) => setF({ ...f, startDate: e.target.value })}
            />
          </Field>
          <Field label="Debit Day (1-31)">
            <input
              className="form-input"
              type="number"
              min={1}
              max={31}
              value={f.debitDay}
              onChange={(e) => setF({ ...f, debitDay: e.target.value })}
              placeholder="5"
            />
          </Field>
          <Field label="Total Installments">
            <input
              className="form-input"
              type="number"
              value={f.totalInstallments}
              onChange={(e) => setF({ ...f, totalInstallments: e.target.value })}
              placeholder="120 (0 = infinite)"
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: initial ? "1fr 1fr" : "1fr", gap: 12 }}>
          <Field label="Annual Step-Up Rate (%)">
            <input
              className="form-input"
              type="number"
              min={0}
              max={100}
              value={f.stepUpPct}
              onChange={(e) => setF({ ...f, stepUpPct: e.target.value })}
              placeholder="10"
            />
          </Field>
          {initial && (
            <Field label="Status">
              <select
                className="form-input"
                value={f.status}
                onChange={(e) => setF({ ...f, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="stopped">Stopped</option>
              </select>
            </Field>
          )}
        </div>
      </ModalSection>

      <ModalSection title="Banking & Goal Mapping (Optional)">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Debited From Bank Account">
            <select
              className="form-input"
              value={f.bankAccountId}
              onChange={(e) => setF({ ...f, bankAccountId: e.target.value })}
            >
              <option value="">— Select Bank Account —</option>
              {(state?.bankAccounts || []).map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.bankName} (••{b.accountNumber?.slice(-4) || "NA"})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Linked Financial Goal">
            <select
              className="form-input"
              value={f.goalId}
              onChange={(e) => setF({ ...f, goalId: e.target.value })}
            >
              <option value="">— Select Goal —</option>
              {(state?.goals || []).map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.name} (Target: ₹{g.targetAmount})
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Mandate / Debit Mode">
            <select
              className="form-input"
              value={f.mandateType}
              onChange={(e) => setF({ ...f, mandateType: e.target.value })}
            >
              {MANDATE_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Folio Number">
            <input
              className="form-input"
              value={f.folioNo}
              onChange={(e) => setF({ ...f, folioNo: e.target.value })}
              placeholder="e.g. 12345678/90"
            />
          </Field>
        </div>
      </ModalSection>

      {/* Real-time Commitment Summary */}
      {instNum > 0 && amt > 0 && (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            borderRadius: 8,
            fontSize: 12,
            color: THEME.muted,
            lineHeight: 1.7,
            marginTop: 10,
          }}
        >
          <strong style={{ color: THEME.ink }}>Duration: </strong>
          {durationYears > 0 && `${durationYears} yr${durationYears !== 1 ? "s" : ""} `}
          {durationMonths > 0 && `${durationMonths} mo`}
          <span style={{ margin: "0 8px", opacity: 0.4 }}>·</span>
          <strong style={{ color: THEME.ink }}>Total Commitment: </strong>
          <Money value={totalCommitment} variant="full" />
        </div>
      )}

      <ModalActions
        onSave={() => isValid && onSave(f)}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Add SIP"}
        disabled={!isValid || saving}
        loading={saving}
      />
    </Modal>
  );
}
