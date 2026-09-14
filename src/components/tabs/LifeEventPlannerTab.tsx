import React, { useState, useMemo } from "react";
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  GraduationCap,
  Home,
  Car,
  Heart,
  Plane,
  Baby,
  Briefcase,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Sparkles,
  Layers,
  LayoutGrid,
  Milestone,
  BarChart3,
  Sliders,
  Table as TableIcon,
  Download,
  Copy,
  Check,
  Search,
  Filter,
  ArrowUpDown,
  Clock,
  Zap,
  Shield,
  Coins,
  Compass,
  Award,
  ChevronRight,
  Info,
  DollarSign,
  User,
  PieChart as PieChartIcon,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  Cell,
  Line,
  ComposedChart,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, today, uid } from "../../utils/finance";
import {
  useMasterData,
  formatProfileOptionWithAge,
  calculateAge,
} from "../../utils/masterData";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { ConfirmDialog } from "../ui/Feedback";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

export interface LifeEventType {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  defaultInflation: number;
  description: string;
}

export const EVENT_TYPES: LifeEventType[] = [
  {
    id: "education",
    label: "Child's Education",
    icon: GraduationCap,
    color: "var(--t-accent)",
    defaultInflation: 10,
    description: "Schooling, coaching, undergraduate or university fees",
  },
  {
    id: "higher_ed_abroad",
    label: "Higher Studies Abroad",
    icon: Plane,
    color: "#6366f1",
    defaultInflation: 12,
    description: "Foreign master's/MBA degree with forex buffer",
  },
  {
    id: "home",
    label: "Home Acquisition",
    icon: Home,
    color: "var(--t-sage)",
    defaultInflation: 7,
    description: "Down payment, stamp duty, interiors & registry",
  },
  {
    id: "wedding",
    label: "Family Wedding",
    icon: Heart,
    color: "var(--t-rust)",
    defaultInflation: 8,
    description: "Celebrations, jewelry, venue & hospitality",
  },
  {
    id: "car",
    label: "Vehicle / EV Purchase",
    icon: Car,
    color: "var(--t-gold)",
    defaultInflation: 5,
    description: "Down payment or full purchase for vehicle upgrade",
  },
  {
    id: "baby",
    label: "New Baby & Early Years",
    icon: Baby,
    color: "var(--t-pink)",
    defaultInflation: 8,
    description: "Maternity, healthcare, nursery & early setup",
  },
  {
    id: "vacation",
    label: "Dream Trip / Sabbatical",
    icon: Plane,
    color: "var(--t-violet)",
    defaultInflation: 7,
    description: "International travel, sabbatical or leisure expedition",
  },
  {
    id: "healthcare",
    label: "Parents Healthcare Buffer",
    icon: Shield,
    color: "#e11d48",
    defaultInflation: 10,
    description: "Medical buffer, elder care & critical treatment fund",
  },
  {
    id: "business",
    label: "Business Seed Capital",
    icon: Briefcase,
    color: "#0284c7",
    defaultInflation: 6,
    description: "Seed capital for venture, clinic or career transition",
  },
  {
    id: "retirement",
    label: "Retirement / Freedom",
    icon: Award,
    color: "#059669",
    defaultInflation: 6,
    description: "Independence corpus and lifestyle transition",
  },
  {
    id: "other",
    label: "Custom Milestone",
    icon: Calendar,
    color: "var(--t-muted)",
    defaultInflation: 6,
    description: "Any bespoke financial goal or milestone",
  },
];

export interface IndianPreset {
  title: string;
  type: string;
  cost: number;
  yearsFromNow: number;
  inflation: number;
  priority: "high" | "medium" | "low";
  notes: string;
  tag: string;
}

export const INDIAN_PRESETS: IndianPreset[] = [
  {
    title: "Undergraduate Degree (India)",
    type: "education",
    cost: 2500000,
    yearsFromNow: 4,
    inflation: 10,
    priority: "high",
    notes: "Top-tier engineering / commerce 4-year tuition & boarding in India",
    tag: "Higher Ed",
  },
  {
    title: "Master's / MBA Abroad (US/EU)",
    type: "higher_ed_abroad",
    cost: 6000000,
    yearsFromNow: 3,
    inflation: 12,
    priority: "high",
    notes: "2-year overseas tuition, living expenses and currency buffer",
    tag: "Overseas",
  },
  {
    title: "First Home Down Payment & Registry",
    type: "home",
    cost: 3000000,
    yearsFromNow: 5,
    inflation: 7,
    priority: "high",
    notes: "20-25% down payment + 7% stamp duty & initial interior setup",
    tag: "Real Estate",
  },
  {
    title: "Grand Family Wedding",
    type: "wedding",
    cost: 2500000,
    yearsFromNow: 3,
    inflation: 8,
    priority: "high",
    notes: "Venue booking, catering, jewelry, ceremonies & travel",
    tag: "Family",
  },
  {
    title: "EV / SUV Upgrade",
    type: "car",
    cost: 1600000,
    yearsFromNow: 2,
    inflation: 5,
    priority: "medium",
    notes: "Next generation electric / premium family vehicle",
    tag: "Mobility",
  },
  {
    title: "Parents Healthcare & Care Fund",
    type: "healthcare",
    cost: 1500000,
    yearsFromNow: 3,
    inflation: 10,
    priority: "high",
    notes: "Dedicated emergency health buffer beyond basic mediclaim",
    tag: "Security",
  },
  {
    title: "World Tour & Sabbatical",
    type: "vacation",
    cost: 800000,
    yearsFromNow: 2,
    inflation: 7,
    priority: "low",
    notes: "3-4 week family Europe/Japan journey & leisure bucket list",
    tag: "Lifestyle",
  },
  {
    title: "Startup Seed & Venture Fund",
    type: "business",
    cost: 2000000,
    yearsFromNow: 4,
    inflation: 6,
    priority: "medium",
    notes: "6-12 month runway for consulting or new business launch",
    tag: "Career",
  },
];

const tooltipStyle = () => ({
  background: "var(--t-card-bg)",
  border: `1px solid var(--t-line)`,
  borderRadius: 12,
  color: "var(--t-ink)",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
  padding: "10px 14px",
});

const EMPTY_EVENT = {
  name: "",
  type: "education",
  targetDate: "",
  estimatedCost: 0,
  currentSaved: 0,
  notes: "",
  priority: "high",
  owner: "self",
  inflationRate: 10,
  expectedReturn: 12,
};

const PRIORITY_BADGE_CONFIG: Record<string, { variant: "rust" | "gold" | "sage" | "accent"; label: string }> = {
  high: { variant: "rust", label: "HIGH" },
  medium: { variant: "gold", label: "MEDIUM" },
  low: { variant: "sage", label: "LOW" },
};

const formatTimeAway = (targetDate: Date, now: Date) => {
  const diffMs = targetDate.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  if (diffDays <= 0) return "Due Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 60) return `${diffDays} days away`;
  const diffMonths = Math.round(diffDays / 30.44);
  if (diffMonths < 24) return `${diffMonths} months away`;
  return `${(diffDays / 365.25).toFixed(1)} yrs away`;
};

// De-risking Glide Path logic for life milestones
export const getGlidePathAllocation = (monthsLeft: number) => {
  if (monthsLeft <= 0) {
    return {
      label: "Immediate Outlay (100% Cash / Liquid)",
      equity: 0,
      debt: 100,
      gold: 0,
      color: "var(--t-rust)",
      advice: "Keep entirely in liquid/savings to avoid market volatility.",
    };
  }
  if (monthsLeft <= 12) {
    return {
      label: "Capital Preservation (100% Liquid / Ultra-Short Debt)",
      equity: 0,
      debt: 100,
      gold: 0,
      color: "var(--t-gold)",
      advice: "Event is within 12 months. Shift 100% to liquid/short debt to lock in target.",
    };
  }
  if (monthsLeft <= 36) {
    return {
      label: "Conservative Glide (70% Debt / 20% Equity / 10% Gold)",
      equity: 20,
      debt: 70,
      gold: 10,
      color: "var(--t-sage)",
      advice: "De-risk equities into fixed income / arbitrage as the milestone nears.",
    };
  }
  if (monthsLeft <= 60) {
    return {
      label: "Balanced Growth (50% Equity / 40% Debt / 10% Gold)",
      equity: 50,
      debt: 40,
      gold: 10,
      color: "var(--t-accent)",
      advice: "Balanced hybrid structure to beat inflation while containing downside.",
    };
  }
  return {
    label: "Aggressive Growth (75% Equity / 15% Debt / 10% Gold)",
    equity: 75,
    debt: 15,
    gold: 10,
    color: "#8b5cf6",
    advice: "Long-term horizon (>5 yrs). Compound aggressively through diversified equity SIPs.",
  };
};

// Calculates required initial monthly Step-Up SIP (with annual step-up rate s)
export const calculateStepUpSIP = (
  residualGap: number,
  nMonths: number,
  annualReturn: number,
  annualStepUpPct: number = 10
) => {
  if (residualGap <= 0) return 0;
  if (nMonths <= 0) return residualGap;
  const i = annualReturn / 100 / 12;
  const s = annualStepUpPct / 100;

  let totalFactor = 0;
  for (let m = 1; m <= nMonths; m++) {
    const yearIdx = Math.floor((m - 1) / 12);
    const stepUpFactor = Math.pow(1 + s, yearIdx);
    const compFactor = Math.pow(1 + i, nMonths - m + 1);
    totalFactor += stepUpFactor * compFactor;
  }

  return totalFactor > 0 ? residualGap / totalFactor : residualGap / nMonths;
};

// Calculates lumpsum needed today to fund the residual gap
export const calculateLumpsumNeeded = (residualGap: number, nMonths: number, annualReturn: number) => {
  if (residualGap <= 0) return 0;
  if (nMonths <= 0) return residualGap;
  const i = annualReturn / 100 / 12;
  return residualGap / Math.pow(1 + i, nMonths);
};

export const LifeEventPlannerTab: React.FC<{
  state: any;
  metrics?: any;
  addItem?: any;
  removeItem?: any;
  updateItem?: any;
  showToast?: (msg: string, type?: string) => void;
}> = ({ state, metrics, addItem, removeItem, updateItem, showToast }) => {
  const { privacyMode } = usePrivacy();
  const { familyProfiles } = useMasterData();

  // Active View Switcher
  const [activeView, setActiveView] = useState<"roadmap" | "studio" | "cashflow" | "simulator" | "grid">("roadmap");

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortField, setSortField] = useState<"targetDate" | "inflatedCost" | "gap" | "progress" | "name">("targetDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Stress Simulation Parameters
  const [simInflationShock, setSimInflationShock] = useState(0); // in % e.g. +2%
  const [simReturnRate, setSimReturnRate] = useState(12); // e.g. 10%
  const [simHorizonShiftYears, setSimHorizonShiftYears] = useState(0); // e.g. -1 yr or +1 yr

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_EVENT });
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [quickAddModal, setQuickAddModal] = useState<{ event: any; amount: number } | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Raw life events from state
  const rawEvents = useMemo(() => {
    return [...(state?.lifeEvents || [])];
  }, [state?.lifeEvents]);

  // Master family map for lookup
  const familyMap = useMemo(() => {
    const map = new Map<string, any>();
    (familyProfiles || []).forEach((p: any) => {
      map.set(p.id, p);
    });
    return map;
  }, [familyProfiles]);

  // Enriched events with financial engineering calculations
  const enrichedEvents = useMemo(() => {
    const now = new Date(today() + "T00:00:00");

    return rawEvents.map((e) => {
      const evType = EVENT_TYPES.find((t) => t.id === e.type) || EVENT_TYPES[EVENT_TYPES.length - 1];
      const baseInflation = Number(e.inflationRate ?? evType.defaultInflation ?? 7);
      const effectiveInflation = Math.max(0, baseInflation + simInflationShock);
      const effectiveReturn = Math.max(1, (e.expectedReturn ?? simReturnRate ?? 12));

      // Target Date & Horizon with simulation shift
      const originalTargetDate = new Date((e.targetDate || today()) + "T00:00:00");
      let simulatedTargetDate = new Date(originalTargetDate.getTime());
      if (simHorizonShiftYears !== 0) {
        simulatedTargetDate = new Date(
          simulatedTargetDate.getFullYear() + simHorizonShiftYears,
          simulatedTargetDate.getMonth(),
          simulatedTargetDate.getDate()
        );
      }

      const rawYearsAway = (simulatedTargetDate.getTime() - now.getTime()) / (365.25 * 86400000);
      const yearsAway = Math.max(0, rawYearsAway);
      const nMonths = Math.max(0, Math.round(yearsAway * 12));

      const nominalCost = Number(e.estimatedCost || 0);
      const inflatedCost = nominalCost * Math.pow(1 + effectiveInflation / 100, yearsAway);
      const saved = Number(e.currentSaved || 0);
      const nominalGap = Math.max(0, inflatedCost - saved);

      // Compounded growth of existing saved capital
      const monthlyRet = (effectiveReturn / 100) / 12;
      const futureValueOfSaved = nMonths > 0 ? saved * Math.pow(1 + monthlyRet, nMonths) : saved;
      const sipGap = Math.max(0, inflatedCost - futureValueOfSaved);

      // Monthly SIP (Flat)
      const monthlySIP =
        nMonths > 0 && monthlyRet > 0
          ? (sipGap * monthlyRet) / (Math.pow(1 + monthlyRet, nMonths) - 1)
          : sipGap;

      // 10% Annual Step-Up SIP
      const stepUpSIP = calculateStepUpSIP(sipGap, nMonths, effectiveReturn, 10);

      // Lumpsum needed today
      const lumpsumNeeded = calculateLumpsumNeeded(sipGap, nMonths, effectiveReturn);

      const progress = inflatedCost > 0 ? (saved / inflatedCost) * 100 : 0;
      const isPast = originalTargetDate < now && simHorizonShiftYears === 0;
      const isFunded = progress >= 99.5;
      const isUrgent = !isPast && !isFunded && nMonths <= 12;
      const timeAway = isPast ? "Completed / Past" : formatTimeAway(simulatedTargetDate, now);

      // Beneficiary & Age
      const ownerProfile = familyMap.get(e.owner || "self");
      const beneficiaryName = ownerProfile?.name || (e.owner === "self" ? "Self" : e.owner || "Self");
      const beneficiaryAgeNow = ownerProfile?.dob ? calculateAge(ownerProfile.dob) : null;
      const beneficiaryAgeAtTarget =
        ownerProfile?.dob && e.targetDate ? calculateAge(ownerProfile.dob, e.targetDate) : null;

      // De-risking Glide Path Recommendation
      const glidePath = getGlidePathAllocation(nMonths);

      // Urgency / Health Classification
      let healthStatus: "funded" | "on_track" | "behind" | "critical" = "on_track";
      if (isFunded) healthStatus = "funded";
      else if (isUrgent || (progress < 25 && nMonths <= 24)) healthStatus = "critical";
      else if (progress < 50 && nMonths <= 36) healthStatus = "behind";

      return {
        ...e,
        evType,
        baseInflation,
        effectiveInflation,
        effectiveReturn,
        yearsAway,
        nMonths,
        nominalCost,
        inflatedCost,
        saved,
        nominalGap,
        sipGap,
        monthlySIP,
        stepUpSIP,
        lumpsumNeeded,
        progress,
        isPast,
        isFunded,
        isUrgent,
        timeAway,
        beneficiaryName,
        beneficiaryAgeNow,
        beneficiaryAgeAtTarget,
        glidePath,
        healthStatus,
        targetYear: e.targetDate ? e.targetDate.slice(0, 4) : "TBD",
      };
    });
  }, [rawEvents, familyMap, simInflationShock, simReturnRate, simHorizonShiftYears]);

  // Filtered & Sorted Events
  const filteredEvents = useMemo(() => {
    return enrichedEvents
      .filter((e) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = e.name?.toLowerCase().includes(q);
          const matchOwner = e.beneficiaryName?.toLowerCase().includes(q);
          const matchNotes = e.notes?.toLowerCase().includes(q);
          const matchType = e.evType.label.toLowerCase().includes(q);
          if (!matchName && !matchOwner && !matchNotes && !matchType) return false;
        }
        if (filterOwner !== "all" && (e.owner || "self") !== filterOwner) return false;
        if (filterPriority !== "all" && (e.priority || "medium") !== filterPriority) return false;
        if (filterCategory !== "all" && e.type !== filterCategory) return false;
        if (filterStatus !== "all") {
          if (filterStatus === "funded" && !e.isFunded) return false;
          if (filterStatus === "critical" && e.healthStatus !== "critical") return false;
          if (filterStatus === "active" && e.isPast) return false;
          if (filterStatus === "past" && !e.isPast) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        if (sortField === "targetDate") {
          valA = a.targetDate || "9999-99-99";
          valB = b.targetDate || "9999-99-99";
        }
        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [enrichedEvents, searchQuery, filterOwner, filterPriority, filterCategory, filterStatus, sortField, sortOrder]);

  // Aggregate Metrics
  const activeEvents = useMemo(() => enrichedEvents.filter((e) => !e.isPast), [enrichedEvents]);

  const totalNominalCost = activeEvents.reduce((s, e) => s + e.nominalCost, 0);
  const totalInflatedCost = activeEvents.reduce((s, e) => s + e.inflatedCost, 0);
  const totalSaved = activeEvents.reduce((s, e) => s + e.saved, 0);
  const totalGap = Math.max(0, totalInflatedCost - totalSaved);
  const totalMonthlySIP = activeEvents.reduce((s, e) => s + e.monthlySIP, 0);
  const totalStepUpSIP = activeEvents.reduce((s, e) => s + e.stepUpSIP, 0);
  const overallFundedRatio = totalInflatedCost > 0 ? (totalSaved / totalInflatedCost) * 100 : 0;

  const monthlyIncome = Number(metrics?.monthIncome || metrics?.monthlyIncome || 0);
  const monthlyExpense = Number(metrics?.monthExpense || metrics?.monthlyExpense || 0);
  const monthlySurplus = Math.max(0, monthlyIncome - monthlyExpense);
  const surplusUtilizationPct = monthlySurplus > 0 ? (totalMonthlySIP / monthlySurplus) * 100 : 0;

  // Timeline / Annual Cash Flow Outflow Aggregator
  const timelineCashflow = useMemo(() => {
    const yearMap: Record<
      string,
      {
        year: string;
        saved: number;
        gap: number;
        total: number;
        count: number;
        events: any[];
      }
    > = {};

    activeEvents.forEach((e) => {
      const year = e.targetDate?.slice(0, 4) || "Unknown";
      if (!yearMap[year]) {
        yearMap[year] = { year, saved: 0, gap: 0, total: 0, count: 0, events: [] };
      }
      const savedShare = Math.min(e.inflatedCost, e.saved);
      yearMap[year].saved += savedShare;
      yearMap[year].gap += Math.max(0, e.inflatedCost - savedShare);
      yearMap[year].total += e.inflatedCost;
      yearMap[year].count += 1;
      yearMap[year].events.push(e);
    });

    return Object.values(yearMap).sort((a, b) => a.year.localeCompare(b.year));
  }, [activeEvents]);

  // Identify Peak Outflow Year
  const peakYear = useMemo(() => {
    if (timelineCashflow.length === 0) return null;
    return [...timelineCashflow].sort((a, b) => b.total - a.total)[0];
  }, [timelineCashflow]);

  // Family Members Milestone Overlap
  const familyMilestoneMap = useMemo(() => {
    const map: Record<string, { profile: any; events: any[]; totalCost: number; totalSIP: number }> = {};
    (familyProfiles || []).forEach((p: any) => {
      map[p.id] = { profile: p, events: [], totalCost: 0, totalSIP: 0 };
    });
    if (!map["self"]) {
      map["self"] = { profile: { id: "self", name: "Self", relation: "Self" }, events: [], totalCost: 0, totalSIP: 0 };
    }

    activeEvents.forEach((e) => {
      const ownerId = e.owner || "self";
      if (!map[ownerId]) {
        map[ownerId] = {
          profile: familyMap.get(ownerId) || { id: ownerId, name: ownerId },
          events: [],
          totalCost: 0,
          totalSIP: 0,
        };
      }
      map[ownerId].events.push(e);
      map[ownerId].totalCost += e.inflatedCost;
      map[ownerId].totalSIP += e.monthlySIP;
    });

    return Object.values(map).filter((item) => item.events.length > 0);
  }, [familyProfiles, familyMap, activeEvents]);

  // Async Actions
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { run: deleteEvent } = useAsyncAction(
    async (id: string) => {
      await removeItem("lifeEvents", id);
      showToast?.("Life event removed successfully", "success");
    },
    { onError: (e: any) => showToast?.(`Failed to delete event: ${e?.message || "Unknown error"}`, "error") }
  );

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (editingId) {
        await updateItem("lifeEvents", editingId, form);
        showToast?.("Milestone updated successfully", "success");
      } else {
        await addItem("lifeEvents", { ...form, id: uid() });
        showToast?.("New milestone scheduled", "success");
      }
      setShowModal(false);
      setForm({ ...EMPTY_EVENT });
      setEditingId(null);
    } catch (err: any) {
      console.error("[LifeEvent] Save failed:", err);
      setSaveError(err?.message || "Couldn't save this event. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAddSavings = async () => {
    if (!quickAddModal) return;
    const { event, amount } = quickAddModal;
    if (amount <= 0) return;
    try {
      const updatedSaved = Number(event.currentSaved || 0) + amount;
      await updateItem("lifeEvents", event.id, {
        ...event,
        currentSaved: updatedSaved,
      });
      showToast?.(`Added ₹${fmtINR(amount)} to ${event.name}`, "success");
      setQuickAddModal(null);
    } catch (err: any) {
      showToast?.(`Error updating savings: ${err.message}`, "error");
    }
  };

  const handleDuplicate = async (event: any) => {
    try {
      const duplicated = {
        ...event,
        id: uid(),
        name: `${event.name} (Copy)`,
        currentSaved: 0,
      };
      await addItem("lifeEvents", duplicated);
      showToast?.(`Duplicated "${event.name}"`, "success");
    } catch (err: any) {
      showToast?.(`Failed to duplicate: ${err.message}`, "error");
    }
  };

  const handleMarkFunded = async (event: any) => {
    try {
      await updateItem("lifeEvents", event.id, {
        ...event,
        currentSaved: event.inflatedCost || event.estimatedCost,
      });
      showToast?.(`Marked "${event.name}" as 100% funded!`, "success");
    } catch (err: any) {
      showToast?.(`Update failed: ${err.message}`, "error");
    }
  };

  const handleEdit = (e: any) => {
    setSaveError(null);
    setForm({
      name: e.name,
      type: e.type,
      targetDate: e.targetDate,
      estimatedCost: e.estimatedCost,
      currentSaved: e.currentSaved,
      notes: e.notes || "",
      priority: e.priority || "high",
      owner: e.owner || "self",
      inflationRate: e.inflationRate ?? (EVENT_TYPES.find((t) => t.id === e.type)?.defaultInflation ?? 10),
      expectedReturn: e.expectedReturn ?? 12,
    });
    setEditingId(e.id);
    setShowModal(true);
  };

  const applyPreset = (preset: IndianPreset) => {
    const targetYr = new Date().getFullYear() + preset.yearsFromNow;
    const targetMonth = String(new Date().getMonth() + 1).padStart(2, "0");
    const targetDay = "01";
    const targetDate = `${targetYr}-${targetMonth}-${targetDay}`;

    setForm({
      name: preset.title,
      type: preset.type,
      targetDate,
      estimatedCost: preset.cost,
      currentSaved: 0,
      notes: preset.notes,
      priority: preset.priority,
      owner: form.owner || "self",
      inflationRate: preset.inflation,
      expectedReturn: 12,
    });
  };

  const exportToCSV = () => {
    if (enrichedEvents.length === 0) {
      showToast?.("No events to export", "info");
      return;
    }
    const headers = [
      "Milestone Name",
      "Category",
      "Owner / Beneficiary",
      "Target Date",
      "Target Age",
      "Priority",
      "Today Cost (INR)",
      "Inflation Rate (%)",
      "Inflated Target Cost (INR)",
      "Current Saved (INR)",
      "Funding Gap (INR)",
      "Monthly SIP Required (INR)",
      "10% Step-Up SIP (INR)",
      "Lumpsum Needed Today (INR)",
      "Funding Progress (%)",
      "Status",
      "Notes",
    ];

    const rows = enrichedEvents.map((e) => [
      `"${e.name.replace(/"/g, '""')}"`,
      `"${e.evType.label}"`,
      `"${e.beneficiaryName}"`,
      e.targetDate,
      e.beneficiaryAgeAtTarget ?? "N/A",
      e.priority.toUpperCase(),
      e.nominalCost,
      `${e.effectiveInflation}%`,
      Math.round(e.inflatedCost),
      e.saved,
      Math.round(e.nominalGap),
      Math.round(e.monthlySIP),
      Math.round(e.stepUpSIP),
      Math.round(e.lumpsumNeeded),
      `${e.progress.toFixed(1)}%`,
      e.isFunded ? "Funded" : e.isPast ? "Past" : e.isUrgent ? "Urgent" : "Active",
      `"${(e.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Life_Event_Plan_${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast?.("Exported life event plan to CSV", "success");
  };

  const copyExecutiveSummary = () => {
    const summaryText = `🎯 LIFE EVENT PLANNER EXECUTIVE SUMMARY
==========================================
• Total Milestones: ${activeEvents.length} active (${enrichedEvents.filter((e) => e.isFunded).length} fully funded)
• Total Future Inflated Liability: ₹${fmtINRFull(totalInflatedCost)}
• Total Capital Dedicated: ₹${fmtINRFull(totalSaved)} (${overallFundedRatio.toFixed(1)}% funded)
• Net Capital Shortfall: ₹${fmtINRFull(totalGap)}
• Required Monthly SIP (Flat): ₹${fmtINRFull(totalMonthlySIP)}/month
• Required 10% Step-Up SIP: ₹${fmtINRFull(totalStepUpSIP)}/month (initial)
• Monthly Surplus Consumption: ${monthlySurplus > 0 ? `${surplusUtilizationPct.toFixed(0)}% of ₹${fmtINRFull(monthlySurplus)}` : "Surplus unavailable"}
${peakYear ? `• Peak Cash Demand Year: ${peakYear.year} (₹${fmtINRFull(peakYear.total)} needed)` : ""}

Generated from Personal Finance OS on ${today()}`;

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
    showToast?.("Summary copied to clipboard", "success");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header & Main Controls */}
      <SectionTitle
        sub="Orchestrate major family milestones — higher education, home acquisition, weddings, and sabbaticals with inflation-adjusted targets & de-risking glide paths"
        rightElement={
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={copyExecutiveSummary}
              title="Copy executive milestone summary to clipboard"
            >
              {copiedSummary ? <Check size={14} color={THEME.sage} /> : <Copy size={14} />}
              <span>{copiedSummary ? "Copied" : "Copy Summary"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              title="Export complete plan to CSV"
            >
              <Download size={14} /> Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSaveError(null);
                setForm({ ...EMPTY_EVENT });
                setEditingId(null);
                setShowModal(true);
              }}
            >
              <Plus size={16} /> Schedule Milestone
            </Button>
          </div>
        }
      >
        Life Event Planner & Orchestrator
      </SectionTitle>

      {/* Executive KPI Ribbon */}
      {rawEvents.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          <StatCard
            label="Total Future Outflow"
            value={fmtINRFull(totalInflatedCost)}
            numericValue={totalInflatedCost}
            formatValue={fmtINRFull}
            icon={<IndianRupee />}
            color={THEME.rust}
            sub={
              <span style={{ fontSize: 11, color: THEME.muted }}>
                Today's nominal: <Money value={totalNominalCost} variant="full" />
              </span>
            }
          />
          <StatCard
            label="Dedicated Capital"
            value={fmtINRFull(totalSaved)}
            numericValue={totalSaved}
            formatValue={fmtINRFull}
            icon={<CheckCircle2 />}
            color={THEME.sage}
            sub={
              <span style={{ fontSize: 11, fontWeight: 600, color: THEME.sage }}>
                {overallFundedRatio.toFixed(1)}% Funded Overall
              </span>
            }
          />
          <StatCard
            label="Net Capital Gap"
            value={fmtINRFull(totalGap)}
            numericValue={totalGap}
            formatValue={fmtINRFull}
            icon={<AlertTriangle />}
            color={THEME.gold}
            sub={
              <span style={{ fontSize: 11, color: THEME.muted }}>
                Across {activeEvents.length} active milestones
              </span>
            }
          />
          <StatCard
            label="Required Monthly SIP"
            value={fmtINRFull(totalMonthlySIP)}
            numericValue={totalMonthlySIP}
            formatValue={fmtINRFull}
            icon={<TrendingUp />}
            color={THEME.accent}
            sub={
              <span style={{ fontSize: 11, color: THEME.accent }}>
                Step-up SIP: <Money value={totalStepUpSIP} variant="full" />/mo
              </span>
            }
          />
        </div>
      )}

      {/* Financial Health & Cashflow Collision Intelligence Banner */}
      {totalMonthlySIP > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "16px 20px",
            borderRadius: 14,
            background:
              surplusUtilizationPct > 100
                ? `color-mix(in srgb, ${THEME.rust} 12%, transparent)`
                : surplusUtilizationPct > 60
                ? `color-mix(in srgb, ${THEME.gold} 12%, transparent)`
                : `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
            border: `1px solid ${
              surplusUtilizationPct > 100
                ? `color-mix(in srgb, ${THEME.rust} 30%, transparent)`
                : surplusUtilizationPct > 60
                ? `color-mix(in srgb, ${THEME.gold} 30%, transparent)`
                : `color-mix(in srgb, ${THEME.sage} 30%, transparent)`
            }`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {surplusUtilizationPct > 100 ? (
                <AlertTriangle size={20} color={THEME.rust} />
              ) : surplusUtilizationPct > 60 ? (
                <Info size={20} color={THEME.gold} />
              ) : (
                <Sparkles size={20} color={THEME.sage} />
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                  {surplusUtilizationPct > 100
                    ? "Cashflow Strain Alert: Required SIP exceeds monthly surplus"
                    : surplusUtilizationPct > 60
                    ? "Moderate Cashflow Commitment: Over 60% of surplus required"
                    : "Plan On Track: Comfortable Cashflow Surplus Buffer"}
                </div>
                <div style={{ fontSize: 12.5, color: THEME.muted, marginTop: 2 }}>
                  Funding all scheduled milestones needs{" "}
                  <strong>
                    <Money value={totalMonthlySIP} variant="full" />/month
                  </strong>{" "}
                  (or <strong><Money value={totalStepUpSIP} variant="full" /></strong> with 10% annual step-up).
                  {monthlySurplus > 0 && (
                    <>
                      {" "}This consumes <strong>{surplusUtilizationPct.toFixed(0)}%</strong> of your current monthly
                      savings capacity (<Money value={monthlySurplus} variant="full" />).
                    </>
                  )}
                </div>
              </div>
            </div>

            {peakYear && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: "var(--t-card-bg)",
                  border: "1px solid var(--t-line)",
                  fontSize: 12,
                }}
              >
                <Calendar size={14} color={THEME.accent} />
                <span>
                  Peak Outflow: <strong>{peakYear.year}</strong> (
                  <Money value={peakYear.total} variant="full" /> across {peakYear.count} milestones)
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Switcher Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          borderBottom: `1px solid var(--t-line)`,
          paddingBottom: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "roadmap", label: "Milestone Journey", icon: Milestone },
            { id: "studio", label: "Studio Grid", icon: LayoutGrid },
            { id: "cashflow", label: "Peak Outflow & Collision", icon: BarChart3 },
            { id: "simulator", label: "Stress Simulator", icon: SlidersHorizontal },
            { id: "grid", label: "Data Matrix", icon: TableIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 600,
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  border: isActive ? `1.5px solid var(--t-accent)` : "1px solid var(--t-line)",
                  background: isActive
                    ? `color-mix(in srgb, var(--t-accent) 14%, var(--t-card-bg))`
                    : "var(--t-card-bg)",
                  color: isActive ? "var(--t-accent)" : "var(--t-ink)",
                  boxShadow: isActive ? "0 2px 8px -2px rgba(0, 0, 0, 0.1)" : "none",
                }}
              >
                <Icon size={16} color={isActive ? "var(--t-accent)" : "var(--t-muted)"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Search and Filter Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative", minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: THEME.muted }} />
            <input
              type="text"
              placeholder="Search milestone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px 7px 30px",
                borderRadius: 8,
                border: "1px solid var(--t-line)",
                background: "var(--t-card-bg)",
                color: THEME.ink,
                fontSize: 12.5,
              }}
            />
          </div>

          <select
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px solid var(--t-line)",
              background: "var(--t-card-bg)",
              color: THEME.ink,
              fontSize: 12,
            }}
          >
            <option value="all">All Family Members</option>
            {familyProfiles.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name || p.relation || p.id}
              </option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px solid var(--t-line)",
              background: "var(--t-card-bg)",
              color: THEME.ink,
              fontSize: 12,
            }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {enrichedEvents.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <EmptyState
            icon={Calendar}
            title="No Life Events Scheduled Yet"
            description="Anticipate, forecast and fund life's most momentous milestones. Choose a preset template below or create your custom milestone."
            pills={["Child Education", "Home Down Payment", "Family Wedding", "Higher Studies Abroad", "EV Upgrade"]}
            buttonLabel="Schedule First Milestone"
            onAdd={() => {
              setSaveError(null);
              setForm({ ...EMPTY_EVENT });
              setEditingId(null);
              setShowModal(true);
            }}
          />

          {/* Preset Starter Cards */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: THEME.ink, marginBottom: 12 }}>
              Popular Indian Milestone Starter Templates
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              {INDIAN_PRESETS.map((preset, idx) => (
                <Card
                  key={idx}
                  style={{
                    padding: 16,
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                  onClick={() => {
                    applyPreset(preset);
                    setEditingId(null);
                    setShowModal(true);
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <Badge variant="accent" size="xs">
                        {preset.tag}
                      </Badge>
                      <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                        {preset.yearsFromNow} yrs horizon
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>{preset.title}</div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>{preset.notes}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${THEME.line}`, paddingTop: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: THEME.accent }}>
                      <Money value={preset.cost} variant="full" />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: THEME.accent, fontWeight: 600 }}>
                      <span>Use Template</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* VIEW 1: ROADMAP / MILESTONE JOURNEY */}
          {activeView === "roadmap" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Family Beneficiary Milestone Map Cards */}
              {familyMilestoneMap.length > 1 && (
                <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
                  {familyMilestoneMap.map((fm, idx) => (
                    <div
                      key={idx}
                      onClick={() => setFilterOwner(filterOwner === fm.profile.id ? "all" : fm.profile.id)}
                      style={{
                        minWidth: 200,
                        padding: "12px 16px",
                        borderRadius: 12,
                        background: filterOwner === fm.profile.id ? `color-mix(in srgb, ${THEME.accent} 15%, var(--t-card-bg))` : "var(--t-card-bg)",
                        border: filterOwner === fm.profile.id ? `1.5px solid ${THEME.accent}` : "1px solid var(--t-line)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <User size={14} color={THEME.accent} />
                        <span style={{ fontWeight: 700, fontSize: 13, color: THEME.ink }}>
                          {fm.profile.name || fm.profile.relation || fm.profile.id}
                        </span>
                        {fm.profile.dob && (
                          <span style={{ fontSize: 11, color: THEME.muted }}>
                            (Age {calculateAge(fm.profile.dob)})
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>
                        {fm.events.length} milestone{fm.events.length > 1 ? "s" : ""} •{" "}
                        <Money value={fm.totalCost} variant="full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Vertical Chronological Roadmap */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {filteredEvents.map((e, index) => {
                  const Icon = e.evType.icon;
                  const priorityCfg = PRIORITY_BADGE_CONFIG[e.priority] || PRIORITY_BADGE_CONFIG.medium;

                  return (
                    <Card
                      key={e.id}
                      style={{
                        padding: 20,
                        position: "relative",
                        opacity: e.isPast ? 0.65 : 1,
                        borderLeft: `4px solid ${e.isFunded ? THEME.sage : e.isUrgent ? THEME.rust : e.evType.color}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                        {/* Left Info */}
                        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flex: 1, minWidth: 280 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              background: `color-mix(in srgb, ${e.evType.color} 15%, transparent)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={22} color={e.evType.color} />
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 16, fontWeight: 700, color: THEME.ink }}>{e.name}</span>
                              <Badge variant={priorityCfg.variant} size="xs">
                                {priorityCfg.label}
                              </Badge>
                              {e.isFunded && (
                                <Badge variant="sage" size="xs">
                                  <CheckCircle size={10} style={{ marginRight: 3 }} /> 100% FUNDED
                                </Badge>
                              )}
                              {e.isUrgent && !e.isFunded && (
                                <Badge variant="rust" size="xs">
                                  URGENT (&lt;12M)
                                </Badge>
                              )}
                            </div>

                            {/* Beneficiary, Date & Horizon details */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: THEME.muted, flexWrap: "wrap" }}>
                              <span>{e.evType.label}</span>
                              <span>•</span>
                              <span style={{ fontWeight: 600, color: THEME.ink }}>Target: {e.targetDate}</span>
                              <span>({e.timeAway})</span>
                              {e.beneficiaryName && (
                                <>
                                  <span>•</span>
                                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <User size={12} />
                                    <strong>{e.beneficiaryName}</strong>
                                    {e.beneficiaryAgeAtTarget !== null && (
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 700,
                                          padding: "1px 6px",
                                          borderRadius: 4,
                                          background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                                          color: THEME.accent,
                                        }}
                                      >
                                        Age {e.beneficiaryAgeAtTarget} at target
                                      </span>
                                    )}
                                  </span>
                                </>
                              )}
                            </div>

                            {e.notes && (
                              <div style={{ fontSize: 12, color: THEME.muted, fontStyle: "italic", marginTop: 2 }}>
                                “{e.notes}”
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Quick Actions */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickAddModal({ event: e, amount: Math.min(100000, Math.round(e.nominalGap || 50000)) })}
                            title="Quickly credit savings towards this milestone"
                          >
                            <Plus size={14} /> Add Savings
                          </Button>
                          <button
                            onClick={() => handleEdit(e)}
                            aria-label={`Edit ${e.name}`}
                            title="Edit Milestone"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: THEME.muted,
                              padding: 6,
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(e)}
                            aria-label={`Duplicate ${e.name}`}
                            title="Duplicate Milestone"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: THEME.muted,
                              padding: 6,
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Copy size={15} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ id: e.id, name: e.name })}
                            aria-label={`Delete ${e.name}`}
                            title="Delete Milestone"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: THEME.rust,
                              padding: 6,
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Progress Track & Funding Metrics */}
                      <div style={{ marginTop: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: THEME.muted, marginBottom: 6 }}>
                          <span>
                            Funded: <strong><Money value={e.saved} variant="full" /></strong> of{" "}
                            <strong><Money value={e.inflatedCost} variant="full" /></strong>
                          </span>
                          <span style={{ fontWeight: 700, color: e.isFunded ? THEME.sage : THEME.ink }}>
                            {e.progress.toFixed(1)}%
                          </span>
                        </div>
                        <div className="progress-track" style={{ height: 8, borderRadius: 4 }}>
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(100, e.progress)}%`,
                              background: e.isFunded ? THEME.sage : e.evType.color,
                              borderRadius: 4,
                            }}
                          />
                        </div>
                      </div>

                      {/* Detailed Financial Breakdown Grid */}
                      <div
                        style={{
                          marginTop: 14,
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                          gap: 12,
                          padding: "12px 16px",
                          borderRadius: 10,
                          background: "var(--t-line)",
                          opacity: 0.9,
                        }}
                      >
                        <div>
                          <div style={{ color: THEME.muted, fontSize: 11 }}>Today's Cost</div>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: THEME.ink }}>
                            <Money value={e.nominalCost} variant="full" />
                          </div>
                        </div>
                        <div>
                          <div style={{ color: THEME.muted, fontSize: 11 }}>
                            Inflated Target ({e.effectiveInflation}% p.a.)
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: THEME.rust }}>
                            <Money value={e.inflatedCost} variant="full" />
                          </div>
                        </div>
                        <div>
                          <div style={{ color: THEME.muted, fontSize: 11 }}>Capital Shortfall</div>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: THEME.gold }}>
                            <Money value={e.nominalGap} variant="full" />
                          </div>
                        </div>
                        <div>
                          <div style={{ color: THEME.muted, fontSize: 11 }}>Monthly SIP Needed</div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: THEME.accent }}>
                            <Money value={e.monthlySIP} variant="full" />
                          </div>
                        </div>
                        <div>
                          <div style={{ color: THEME.muted, fontSize: 11 }}>10% Step-Up SIP</div>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: THEME.ink }}>
                            <Money value={e.stepUpSIP} variant="full" />
                          </div>
                        </div>
                        <div>
                          <div style={{ color: THEME.muted, fontSize: 11 }}>Lumpsum Needed Today</div>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: THEME.ink }}>
                            <Money value={e.lumpsumNeeded} variant="full" />
                          </div>
                        </div>
                      </div>

                      {/* Asset Allocation Glide Path Pill */}
                      {!e.isPast && !e.isFunded && (
                        <div
                          style={{
                            marginTop: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 8,
                            fontSize: 11.5,
                            color: THEME.muted,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Shield size={13} color={e.glidePath.color} />
                            <span style={{ fontWeight: 600, color: THEME.ink }}>Recommended De-Risking Strategy:</span>
                            <span style={{ color: e.glidePath.color, fontWeight: 700 }}>{e.glidePath.label}</span>
                          </div>
                          <div>{e.glidePath.advice}</div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 2: STUDIO / CARD MATRIX */}
          {activeView === "studio" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 16,
              }}
            >
              {filteredEvents.map((e) => {
                const Icon = e.evType.icon;
                const priorityCfg = PRIORITY_BADGE_CONFIG[e.priority] || PRIORITY_BADGE_CONFIG.medium;

                return (
                  <Card
                    key={e.id}
                    style={{
                      padding: 20,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      opacity: e.isPast ? 0.65 : 1,
                    }}
                  >
                    <div>
                      {/* Top Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              background: `color-mix(in srgb, ${e.evType.color} 15%, transparent)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Icon size={20} color={e.evType.color} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14.5, color: THEME.ink }}>{e.name}</div>
                            <div style={{ fontSize: 11.5, color: THEME.muted }}>
                              {e.evType.label} • {e.targetDate}
                            </div>
                          </div>
                        </div>

                        <Badge variant={priorityCfg.variant} size="xs">
                          {priorityCfg.label}
                        </Badge>
                      </div>

                      {/* Beneficiary Tag */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: THEME.muted, marginBottom: 12 }}>
                        <User size={12} />
                        <span>{e.beneficiaryName}</span>
                        {e.beneficiaryAgeAtTarget !== null && (
                          <span style={{ fontSize: 11, color: THEME.accent, fontWeight: 600 }}>
                            (Age {e.beneficiaryAgeAtTarget})
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: THEME.muted, marginBottom: 4 }}>
                          <span>Funding Progress</span>
                          <span style={{ fontWeight: 700, color: e.isFunded ? THEME.sage : THEME.ink }}>
                            {e.progress.toFixed(0)}%
                          </span>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(100, e.progress)}%`,
                              background: e.isFunded ? THEME.sage : e.evType.color,
                            }}
                          />
                        </div>
                      </div>

                      {/* Cost & SIP Numbers */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 8,
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: "var(--t-line)",
                          fontSize: 12,
                          marginBottom: 12,
                        }}
                      >
                        <div>
                          <div style={{ color: THEME.muted, fontSize: 10.5 }}>Inflated Target</div>
                          <div style={{ fontWeight: 700, color: THEME.rust }}>
                            <Money value={e.inflatedCost} variant="full" />
                          </div>
                        </div>
                        <div>
                          <div style={{ color: THEME.muted, fontSize: 10.5 }}>Saved So Far</div>
                          <div style={{ fontWeight: 700, color: THEME.sage }}>
                            <Money value={e.saved} variant="full" />
                          </div>
                        </div>
                        <div>
                          <div style={{ color: THEME.muted, fontSize: 10.5 }}>Monthly SIP</div>
                          <div style={{ fontWeight: 700, color: THEME.accent }}>
                            <Money value={e.monthlySIP} variant="full" />
                          </div>
                        </div>
                        <div>
                          <div style={{ color: THEME.muted, fontSize: 10.5 }}>Step-Up SIP (10%)</div>
                          <div style={{ fontWeight: 600, color: THEME.ink }}>
                            <Money value={e.stepUpSIP} variant="full" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${THEME.line}`, paddingTop: 10 }}>
                      <button
                        onClick={() => setQuickAddModal({ event: e, amount: Math.min(50000, Math.round(e.nominalGap || 25000)) })}
                        style={{
                          background: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--t-accent) 25%, transparent)",
                          borderRadius: 6,
                          color: "var(--t-accent)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "5px 10px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Plus size={13} /> Add Funds
                      </button>

                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button
                          onClick={() => handleEdit(e)}
                          className="icon-btn"
                          title="Edit"
                          style={{
                            background: "var(--t-card-bg)",
                            border: "1px solid var(--t-line)",
                            borderRadius: 6,
                            cursor: "pointer",
                            color: "var(--t-ink)",
                            padding: "5px 7px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDuplicate(e)}
                          className="icon-btn"
                          title="Duplicate"
                          style={{
                            background: "var(--t-card-bg)",
                            border: "1px solid var(--t-line)",
                            borderRadius: 6,
                            cursor: "pointer",
                            color: "var(--t-ink)",
                            padding: "5px 7px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: e.id, name: e.name })}
                          className="icon-btn danger"
                          title="Delete"
                          style={{
                            background: "color-mix(in srgb, var(--t-rust) 10%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--t-rust) 25%, transparent)",
                            borderRadius: 6,
                            cursor: "pointer",
                            color: "var(--t-rust)",
                            padding: "5px 7px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* VIEW 3: CASHFLOW & COLLISION ENGINE */}
          {activeView === "cashflow" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: THEME.ink }}>
                      Annual Outflow & Capital Demand Timeline
                    </h3>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: THEME.muted }}>
                      Forecasted capital demands grouped by calendar year to detect potential liquidity bottlenecks
                    </p>
                  </div>
                  {peakYear && (
                    <div
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        background: `color-mix(in srgb, ${THEME.rust} 15%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${THEME.rust} 30%, transparent)`,
                        fontSize: 12,
                        color: THEME.rust,
                        fontWeight: 600,
                      }}
                    >
                      Highest Outflow: {peakYear.year} (₹{fmtINRFull(peakYear.total)})
                    </div>
                  )}
                </div>

                <div style={{ width: "100%", height: 320, position: "relative" }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={timelineCashflow}>
                      <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} />
                      <XAxis dataKey="year" tick={{ fontSize: 12, fill: THEME.muted }} />
                      <YAxis
                        tickFormatter={(v) => (privacyMode ? "••••" : fmtINRFull(v))}
                        tick={{ fontSize: 11, fill: THEME.muted }}
                      />
                      <Tooltip
                        formatter={(v: any) => <Money value={Number(v || 0)} variant="full" />}
                        cursor={{ fill: "var(--t-line)", opacity: 0.4 }}
                        contentStyle={tooltipStyle()}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: THEME.muted }} />
                      <Bar dataKey="saved" name="Already Saved" stackId="a" fill={THEME.sage} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="gap" name="Still to Fund" stackId="a" fill={THEME.rust} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Year Breakdown Collision Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {timelineCashflow.map((tc, idx) => (
                  <Card key={idx} style={{ padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: THEME.ink }}>Year {tc.year}</span>
                      <Badge variant={tc.count > 1 ? "rust" : "accent"} size="xs">
                        {tc.count} Milestone{tc.count > 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: THEME.ink, marginBottom: 8 }}>
                      Total Outflow: <Money value={tc.total} variant="full" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: `1px solid ${THEME.line}`, paddingTop: 8 }}>
                      {tc.events.map((ev, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: THEME.muted }}>
                          <span>{ev.name}</span>
                          <span style={{ fontWeight: 600, color: THEME.ink }}>
                            <Money value={ev.inflatedCost} variant="full" />
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 4: SCENARIO STRESS SIMULATOR */}
          {activeView === "simulator" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: THEME.ink }}>
                      Interactive Stress Test & Scenario Studio
                    </h3>
                    <p style={{ margin: "4px 0 0", fontSize: 12.5, color: THEME.muted }}>
                      Stress test your plan against macroeconomic inflation shocks, market return drops, and milestone timeline shifts
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSimInflationShock(0);
                      setSimReturnRate(12);
                      setSimHorizonShiftYears(0);
                    }}
                  >
                    <RefreshCw size={14} /> Reset Simulation
                  </Button>
                </div>

                {/* Interactive Sliders */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 24 }}>
                  {/* Inflation Shock Slider */}
                  <div style={{ padding: 16, borderRadius: 12, background: "var(--t-line)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                      <span>Inflation Shock</span>
                      <span style={{ color: simInflationShock > 0 ? THEME.rust : THEME.ink }}>
                        +{simInflationShock}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={simInflationShock}
                      onChange={(e) => setSimInflationShock(Number(e.target.value))}
                      style={{ width: "100%", accentColor: THEME.rust }}
                    />
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
                      Simulates inflation surging above baseline (e.g. college fees at +3%)
                    </div>
                  </div>

                  {/* Portfolio Return Slider */}
                  <div style={{ padding: 16, borderRadius: 12, background: "var(--t-line)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                      <span>Expected Portfolio CAGR</span>
                      <span style={{ color: THEME.accent }}>{simReturnRate}%</span>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="15"
                      step="0.5"
                      value={simReturnRate}
                      onChange={(e) => setSimReturnRate(Number(e.target.value))}
                      style={{ width: "100%", accentColor: THEME.accent }}
                    />
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
                      Assumed annualized return on investments funding these goals
                    </div>
                  </div>

                  {/* Timeline Horizon Shift Slider */}
                  <div style={{ padding: 16, borderRadius: 12, background: "var(--t-line)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                      <span>Horizon Shift</span>
                      <span style={{ color: simHorizonShiftYears < 0 ? THEME.rust : THEME.sage }}>
                        {simHorizonShiftYears === 0 ? "Normal" : `${simHorizonShiftYears > 0 ? "+" : ""}${simHorizonShiftYears} yrs`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-2"
                      max="3"
                      step="1"
                      value={simHorizonShiftYears}
                      onChange={(e) => setSimHorizonShiftYears(Number(e.target.value))}
                      style={{ width: "100%", accentColor: THEME.gold }}
                    />
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
                      Pre-pone (-1 to -2 yrs) or postpone (+1 to +3 yrs) all milestones
                    </div>
                  </div>
                </div>

                {/* Simulation Delta Impact Results */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 14,
                    padding: 16,
                    borderRadius: 12,
                    background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>Simulated Outflow</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: THEME.rust }}>
                      <Money value={totalInflatedCost} variant="full" />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>Simulated Gap</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: THEME.gold }}>
                      <Money value={totalGap} variant="full" />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>Simulated Monthly SIP Needed</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: THEME.accent }}>
                      <Money value={totalMonthlySIP} variant="full" />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>10% Step-Up Alternative</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: THEME.ink }}>
                      <Money value={totalStepUpSIP} variant="full" />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* VIEW 5: HIGH-DENSITY DATA GRID / TABLE */}
          {activeView === "grid" && (
            <Card style={{ padding: 20 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${THEME.line}`, color: THEME.muted }}>
                      <th style={{ padding: "10px 8px" }}>Milestone</th>
                      <th style={{ padding: "10px 8px" }}>Beneficiary</th>
                      <th style={{ padding: "10px 8px" }}>Target Date</th>
                      <th style={{ padding: "10px 8px" }}>Target Age</th>
                      <th style={{ padding: "10px 8px" }}>Priority</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Today Cost</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Inflated Cost</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Saved</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Gap</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Monthly SIP</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Step-Up SIP</th>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>Progress</th>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((e) => {
                      const priorityCfg = PRIORITY_BADGE_CONFIG[e.priority] || PRIORITY_BADGE_CONFIG.medium;
                      return (
                        <tr
                          key={e.id}
                          style={{
                            borderBottom: `1px solid ${THEME.line}`,
                            opacity: e.isPast ? 0.6 : 1,
                          }}
                        >
                          <td style={{ padding: "12px 8px", fontWeight: 600, color: THEME.ink }}>
                            <div>{e.name}</div>
                            <div style={{ fontSize: 11, color: THEME.muted }}>{e.evType.label}</div>
                          </td>
                          <td style={{ padding: "12px 8px", color: THEME.ink }}>{e.beneficiaryName}</td>
                          <td style={{ padding: "12px 8px", color: THEME.muted }}>{e.targetDate}</td>
                          <td style={{ padding: "12px 8px", color: THEME.accent, fontWeight: 600 }}>
                            {e.beneficiaryAgeAtTarget !== null ? `Age ${e.beneficiaryAgeAtTarget}` : "—"}
                          </td>
                          <td style={{ padding: "12px 8px" }}>
                            <Badge variant={priorityCfg.variant} size="xs">
                              {priorityCfg.label}
                            </Badge>
                          </td>
                          <td style={{ padding: "12px 8px", textAlign: "right", color: THEME.muted }}>
                            <Money value={e.nominalCost} variant="full" />
                          </td>
                          <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600, color: THEME.rust }}>
                            <Money value={e.inflatedCost} variant="full" />
                          </td>
                          <td style={{ padding: "12px 8px", textAlign: "right", color: THEME.sage, fontWeight: 600 }}>
                            <Money value={e.saved} variant="full" />
                          </td>
                          <td style={{ padding: "12px 8px", textAlign: "right", color: THEME.gold, fontWeight: 600 }}>
                            <Money value={e.nominalGap} variant="full" />
                          </td>
                          <td style={{ padding: "12px 8px", textAlign: "right", color: THEME.accent, fontWeight: 700 }}>
                            <Money value={e.monthlySIP} variant="full" />
                          </td>
                          <td style={{ padding: "12px 8px", textAlign: "right", color: THEME.ink }}>
                            <Money value={e.stepUpSIP} variant="full" />
                          </td>
                          <td style={{ padding: "12px 8px", textAlign: "center" }}>
                            <span style={{ fontWeight: 700, color: e.isFunded ? THEME.sage : THEME.ink }}>
                              {e.progress.toFixed(0)}%
                            </span>
                          </td>
                          <td style={{ padding: "12px 8px", textAlign: "center" }}>
                            <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                              <button
                                onClick={() => handleEdit(e)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted }}
                                title="Edit"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => setConfirmDelete({ id: e.id, name: e.name })}
                                style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust }}
                                title="Delete"
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
          )}
        </>
      )}

      {/* MODAL: ADD / EDIT LIFE EVENT WITH DYNAMIC PREVIEW & INDIAN PRESETS */}
      {showModal && (
        <Modal
          title={editingId ? "Edit Life Event Milestone" : "Schedule New Life Event Milestone"}
          onClose={() => setShowModal(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Quick Presets Picker in Modal */}
            {!editingId && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t-muted)", marginBottom: 8 }}>
                  Quick Indian Milestone Templates
                </div>
                <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
                  {INDIAN_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 11.5,
                        fontWeight: 600,
                        background: "var(--t-card-bg)",
                        border: "1px solid var(--t-line)",
                        color: "var(--t-ink)",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Field label="Milestone Name">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Daughter's College Tuition or 3BHK Apartment Down Payment"
                className="form-input"
              />
            </Field>

            <div className="form-grid-2">
              <Field label="Milestone Category">
                <select
                  value={form.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const matched = EVENT_TYPES.find((t) => t.id === newType);
                    setForm({
                      ...form,
                      type: newType,
                      inflationRate: matched ? matched.defaultInflation : form.inflationRate,
                    });
                  }}
                  className="form-input"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Target Date">
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                  className="form-input"
                />
              </Field>
            </div>

            <div className="form-grid-2">
              <Field label="Estimated Cost in Today's INR (₹)">
                <input
                  type="number"
                  value={form.estimatedCost || ""}
                  onChange={(e) => setForm({ ...form, estimatedCost: Number(e.target.value) })}
                  placeholder="e.g. 2500000"
                  className="form-input"
                />
              </Field>

              <Field label="Amount Already Saved (₹)">
                <input
                  type="number"
                  value={form.currentSaved || ""}
                  onChange={(e) => setForm({ ...form, currentSaved: Number(e.target.value) })}
                  placeholder="0"
                  className="form-input"
                />
              </Field>
            </div>

            <div className="form-grid-2">
              <Field label="Inflation Rate (% p.a.)">
                <input
                  type="number"
                  step="0.5"
                  value={form.inflationRate}
                  onChange={(e) => setForm({ ...form, inflationRate: Number(e.target.value) })}
                  className="form-input"
                />
              </Field>

              <Field label="Expected Investment CAGR (% p.a.)">
                <input
                  type="number"
                  step="0.5"
                  value={form.expectedReturn}
                  onChange={(e) => setForm({ ...form, expectedReturn: Number(e.target.value) })}
                  className="form-input"
                />
              </Field>
            </div>

            <div className="form-grid-2">
              <Field label="Priority Level">
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                  className="form-input"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </Field>

              <Field label="Beneficiary / Family Member">
                <select
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  className="form-input"
                >
                  {familyProfiles.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {formatProfileOptionWithAge(p, form.targetDate)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Notes / Action Steps (Optional)">
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="e.g. Start 70-30 Flexi-cap and Short-term debt SIP in Jan"
                className="form-input"
              />
            </Field>

            {/* Real-time Dynamic Calculation Preview Inside Modal */}
            {form.estimatedCost > 0 && form.targetDate && (() => {
              const now = new Date(today() + "T00:00:00");
              const targetDate = new Date(form.targetDate + "T00:00:00");
              const years = Math.max(0, (targetDate.getTime() - now.getTime()) / (365.25 * 86400000));
              const nMonths = Math.max(0, Math.round(years * 12));
              const inflated = Number(form.estimatedCost) * Math.pow(1 + (form.inflationRate || 8) / 100, years);
              const saved = Number(form.currentSaved || 0);
              const r = (form.expectedReturn || 12) / 100 / 12;
              const fvSaved = nMonths > 0 ? saved * Math.pow(1 + r, nMonths) : saved;
              const sipGap = Math.max(0, inflated - fvSaved);
              const monthlySIP = nMonths > 0 && r > 0 ? (sipGap * r) / (Math.pow(1 + r, nMonths) - 1) : sipGap;
              const stepUp = calculateStepUpSIP(sipGap, nMonths, form.expectedReturn || 12, 10);
              const glide = getGlidePathAllocation(nMonths);

              return (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: "var(--t-line)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                    <span style={{ color: THEME.muted }}>Years to Milestone: {years.toFixed(1)} yrs ({nMonths} months)</span>
                    <span style={{ color: THEME.rust }}>Future Value: ₹{fmtINR(Math.round(inflated))}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: THEME.accent }}>
                    <span>Monthly SIP Required: ₹{fmtINR(Math.round(monthlySIP))}/mo</span>
                    <span style={{ color: THEME.ink }}>10% Step-Up SIP: ₹{fmtINR(Math.round(stepUp))}/mo</span>
                  </div>
                  <div style={{ fontSize: 11, color: glide.color, fontWeight: 600 }}>
                    🛡️ {glide.label}
                  </div>
                </div>
              );
            })()}

            {saveError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: THEME.rust,
                }}
              >
                <AlertTriangle size={14} />
                {saveError}
              </div>
            )}
          </div>

          <ModalActions
            onSave={handleSave}
            onClose={() => setShowModal(false)}
            saveLabel={saving ? "Saving…" : editingId ? "Update Milestone" : "Schedule Milestone"}
            disabled={!form.name || !form.targetDate || saving}
          />
        </Modal>
      )}

      {/* QUICK ADD SAVINGS MODAL */}
      {quickAddModal && (
        <Modal
          title={`Credit Savings to "${quickAddModal.event.name}"`}
          onClose={() => setQuickAddModal(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13, color: THEME.muted, margin: 0 }}>
              Add a one-time lump sum or milestone savings contribution to this event.
            </p>
            <Field label="Amount to Add (₹)">
              <input
                type="number"
                value={quickAddModal.amount || ""}
                onChange={(e) => setQuickAddModal({ ...quickAddModal, amount: Number(e.target.value) })}
                className="form-input"
              />
            </Field>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[25000, 50000, 100000, 250000].map((amt) => {
                const isSelected = quickAddModal.amount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setQuickAddModal({ ...quickAddModal, amount: amt })}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: isSelected ? 700 : 600,
                      background: isSelected
                        ? "var(--t-accent)"
                        : "var(--t-card-bg)",
                      border: isSelected
                        ? "1px solid var(--t-accent)"
                        : "1px solid var(--t-line)",
                      color: isSelected ? "#fff" : "var(--t-ink)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? "0 2px 8px -2px rgba(0, 0, 0, 0.15)" : "none",
                    }}
                  >
                    +₹{fmtINR(amt)}
                  </button>
                );
              })}
            </div>
          </div>
          <ModalActions
            onSave={handleQuickAddSavings}
            onClose={() => setQuickAddModal(null)}
            saveLabel="Confirm Credit"
            disabled={!quickAddModal.amount || quickAddModal.amount <= 0}
          />
        </Modal>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete "${confirmDelete.name}" milestone? This will permanently remove this goal from your life plan.`}
          onConfirm={() => {
            deleteEvent(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};
