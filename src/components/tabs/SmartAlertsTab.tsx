import React, { useState, useMemo, useEffect } from "react";
import {
  Bell,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Filter,
  CheckCircle,
  XCircle,
  Info,
  Calendar,
  IndianRupee,
  Target,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  Shield,
  CreditCard,
  Wallet,
  Sparkles,
  FileSpreadsheet,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Percent,
  Activity,
  Layers,
  HelpCircle,
  ChevronRight,
  RotateCcw,
  Download,
  Flame,
  ShieldAlert,
  ArrowUpDown,
  Coins,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { today, monthsBetween, fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Badge } from "../ui/Badge";
import { Money } from "../ui/Money";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Modal } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Prv } from "../../context/PrivacyContext";

const DISMISSED_ALERTS_KEY = "finance-dismissed-alerts";
const PREFS_STORAGE_KEY = "finance-smart-alerts-preferences";

interface AlertPrefConfig {
  spendSpikePercent: number;
  goalNoticeDays: number;
  inactivityDays: number;
  subRatioPercent: number;
  emergencyFundMinMonths: number;
  creditUtilThreshold: number;
  enabledModules: Record<string, boolean>;
}

const DEFAULT_PREFS: AlertPrefConfig = {
  spendSpikePercent: 30,
  goalNoticeDays: 90,
  inactivityDays: 14,
  subRatioPercent: 15,
  emergencyFundMinMonths: 3,
  creditUtilThreshold: 30,
  enabledModules: {
    spending: true,
    investments: true,
    goals: true,
    credit: true,
    tax: true,
    security: true,
    data: true,
  },
};

export interface SmartAlertItem {
  id: string;
  level: "error" | "warn" | "opportunity" | "info";
  category: "spending" | "investments" | "goals" | "credit" | "tax" | "security" | "data";
  title: string;
  detail: React.ReactNode;
  plainDetail?: string;
  icon: any;
  action?: string;
  targetTab?: string;
  impactValue?: number;
  impactLabel?: string;
  daysRemaining?: number;
  tags?: string[];
}

interface SnoozeRecord {
  expiry: number;
  title: string;
  category: string;
  snoozedAt: number;
}

export const SmartAlertsTab = ({
  state,
  metrics,
  setTab,
  showToast,
}: {
  state: any;
  metrics: any;
  setTab?: (tab: string) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}) => {
  // State for search, filters, views
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"urgency" | "impact" | "category">("urgency");
  const [viewMode, setViewMode] = useState<"detailed" | "compact">("detailed");

  // Modals
  const [showSnoozedModal, setShowSnoozedModal] = useState(false);
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSnoozeMenuId, setActiveSnoozeMenuId] = useState<string | null>(null);

  // User preferences
  const [prefs, setPrefs] = useState<AlertPrefConfig>(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY);
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  const savePrefs = (newPrefs: AlertPrefConfig) => {
    setPrefs(newPrefs);
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(newPrefs));
      if (showToast) showToast("Alert preferences updated successfully", "success");
    } catch {}
  };

  // Snoozed alerts state
  const [dismissed, setDismissed] = useState<Record<string, SnoozeRecord>>(() => {
    try {
      const saved = localStorage.getItem(DISMISSED_ALERTS_KEY);
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      const now = Date.now();
      const result: Record<string, SnoozeRecord> = {};

      if (Array.isArray(parsed)) {
        parsed.forEach((id: string) => {
          result[id] = {
            expiry: now + 30 * 86400000,
            title: id,
            category: "general",
            snoozedAt: now,
          };
        });
        return result;
      }

      Object.entries(parsed).forEach(([id, val]: [string, any]) => {
        if (typeof val === "number") {
          if (val > now) {
            result[id] = {
              expiry: val,
              title: id,
              category: "general",
              snoozedAt: now,
            };
          }
        } else if (val && typeof val.expiry === "number" && val.expiry > now) {
          result[id] = val;
        }
      });
      return result;
    } catch {
      return {};
    }
  });

  const isSnoozed = (id: string) => {
    const record = dismissed[id];
    return !!(record && record.expiry > Date.now());
  };

  const snoozeAlert = (alert: SmartAlertItem, days: number = 30) => {
    const now = Date.now();
    const expiry = now + days * 86400000;
    const next = {
      ...dismissed,
      [alert.id]: {
        expiry,
        title: alert.title,
        category: alert.category,
        snoozedAt: now,
      },
    };
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(next));
    } catch {}
    setActiveSnoozeMenuId(null);
    if (showToast) {
      showToast(`Alert snoozed for ${days} days`, "info");
    }
  };

  const unsnoozeAlert = (id: string) => {
    const next = { ...dismissed };
    delete next[id];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(next));
    } catch {}
    if (showToast) {
      showToast("Alert restored to active list", "success");
    }
  };

  const clearAllSnoozed = () => {
    setDismissed({});
    try {
      localStorage.removeItem(DISMISSED_ALERTS_KEY);
    } catch {}
    if (showToast) {
      showToast("All snoozed alerts restored", "success");
    }
  };

  const copyAlertDetails = (alert: SmartAlertItem) => {
    const text = `[${alert.level.toUpperCase()}] ${alert.title}\nCategory: ${alert.category}\nSuggested Action: ${alert.action || "None"}`;
    navigator.clipboard.writeText(text);
    setCopiedId(alert.id);
    if (showToast) showToast("Alert copied to clipboard", "info");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNavigate = (targetTab?: string) => {
    if (!targetTab) return;
    if (setTab) {
      setTab(targetTab);
    } else if (showToast) {
      showToast(`Navigate to "${targetTab}" tab to review this alert.`, "info");
    }
  };

  // ── Core Anomaly Detection & Intelligence Engine ──
  const smartAlerts = useMemo(() => {
    const alerts: SmartAlertItem[] = [];
    const now = new Date();
    const todayStr = today();

    const daysUntil = (dateStr: string) => {
      if (!dateStr) return Infinity;
      const target = new Date(dateStr + "T00:00:00");
      const nowMidnight = new Date(todayStr + "T00:00:00");
      return Math.round((target.getTime() - nowMidnight.getTime()) / 86400000);
    };

    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // 1. Spending pacing anomaly
    if (prefs.enabledModules.spending) {
      const monthlySpend: Record<string, number> = {};
      (state?.transactions || [])
        .filter(
          (t: any) =>
            t.type === "debit" &&
            t.date &&
            t.category !== "Transfer" &&
            t.category !== "Self Transfer" &&
            t.category !== "Self-Transfer"
        )
        .forEach((t: any) => {
          const ym = t.date.slice(0, 7);
          monthlySpend[ym] = (monthlySpend[ym] || 0) + Number(t.amount || 0);
        });

      const spendValues = Object.entries(monthlySpend)
        .filter(([ym]) => ym < currentMonth)
        .map(([, v]) => v);

      if (spendValues.length >= 3) {
        const avg = spendValues.reduce((s, v) => s + v, 0) / spendValues.length;
        const thisMonthSpend = monthlySpend[currentMonth] || 0;
        const dayOfMonth = now.getDate();
        const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const expectedToDate = avg * (dayOfMonth / daysInCurrentMonth);
        const spikeMultiplier = 1 + prefs.spendSpikePercent / 100;

        if (expectedToDate > 0 && thisMonthSpend > expectedToDate * spikeMultiplier && thisMonthSpend > 0) {
          const overrun = thisMonthSpend - expectedToDate;
          alerts.push({
            id: "spend_anomaly",
            level: "warn",
            category: "spending",
            title: "Spending is higher than usual",
            detail: (
              <>
                {"So far this month: "}
                <Money value={thisMonthSpend} variant="exact" />
                {" vs typical pace: "}
                <Money value={expectedToDate} variant="exact" />
                {` (${((thisMonthSpend / expectedToDate - 1) * 100).toFixed(0)}% higher, avg full month: `}
                <Money value={avg} variant="exact" />
                {")"}
              </>
            ),
            plainDetail: `So far this month ₹${Math.round(thisMonthSpend).toLocaleString("en-IN")} vs expected ₹${Math.round(expectedToDate).toLocaleString("en-IN")}`,
            icon: TrendingUp,
            action: "Review your expenses",
            targetTab: "expenses",
            impactValue: overrun,
            impactLabel: `+${((thisMonthSpend / expectedToDate - 1) * 100).toFixed(0)}% pace overrun`,
            tags: ["Pacing", "Budget Risk"],
          });
        }

        if (dayOfMonth >= 7 && thisMonthSpend > 0 && thisMonthSpend < expectedToDate * 0.5) {
          alerts.push({
            id: "spend_low",
            level: "info",
            category: "spending",
            title: "Spending is unusually low",
            detail: (
              <>
                {"So far this month: "}
                <Money value={thisMonthSpend} variant="exact" />
                {" vs typical pace: "}
                <Money value={expectedToDate} variant="exact" />
                {" — are all expenses logged?"}
              </>
            ),
            plainDetail: `So far this month ₹${Math.round(thisMonthSpend).toLocaleString("en-IN")} vs expected ₹${Math.round(expectedToDate).toLocaleString("en-IN")}`,
            icon: TrendingDown,
            action: "Check if transactions are missing",
            targetTab: "expenses",
            tags: ["Audit", "Data Hygiene"],
          });
        }
      }

      // 2. Category-specific anomalies
      const catSpend: Record<string, Record<string, number>> = {};
      (state?.transactions || [])
        .filter(
          (t: any) =>
            t.type === "debit" &&
            t.date &&
            t.category !== "Transfer" &&
            t.category !== "Self Transfer" &&
            t.category !== "Self-Transfer"
        )
        .forEach((t: any) => {
          const ym = t.date.slice(0, 7);
          const cat = t.category || "Uncategorized";
          if (!catSpend[cat]) catSpend[cat] = {};
          catSpend[cat][ym] = (catSpend[cat][ym] || 0) + Number(t.amount || 0);
        });

      Object.entries(catSpend).forEach(([cat, months]) => {
        const vals = Object.entries(months)
          .filter(([ym]) => ym < currentMonth)
          .map(([, v]) => v);
        if (vals.length >= 3) {
          const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
          const thisMonth = months[currentMonth] || 0;
          if (thisMonth > avg * 2 && thisMonth > 5000) {
            alerts.push({
              id: `cat_spike_${cat}`,
              level: "warn",
              category: "spending",
              title: `${cat} spending spiked`,
              detail: (
                <>
                  <Money value={thisMonth} variant="exact" />
                  {" this month vs avg "}
                  <Money value={avg} variant="exact" />
                  {` — ${((thisMonth / avg - 1) * 100).toFixed(0)}% higher`}
                </>
              ),
              plainDetail: `${cat} spend ₹${Math.round(thisMonth).toLocaleString("en-IN")} vs avg ₹${Math.round(avg).toLocaleString("en-IN")}`,
              icon: AlertTriangle,
              action: `Review ${cat} transactions`,
              targetTab: "expenses",
              impactValue: thisMonth - avg,
              impactLabel: `+${((thisMonth / avg - 1) * 100).toFixed(0)}% Surge`,
              tags: [cat, "Category Spike"],
            });
          }
        }
      });

      // 3. Subscription review
      const monthlyExpense = Number(metrics?.monthExpense || 0);
      const monthlySubs = (state?.subscriptions || [])
        .filter((s: any) => !s.paused)
        .reduce((s: number, sub: any) => {
          const amt = Number(sub.amount || 0);
          if (sub.cycle === "yearly") return s + amt / 12;
          if (sub.cycle === "half-yearly" || sub.cycle === "semi-annual") return s + amt / 6;
          if (sub.cycle === "quarterly") return s + amt / 3;
          return s + amt;
        }, 0);

      const subThreshold = prefs.subRatioPercent / 100;
      if (monthlySubs > monthlyExpense * subThreshold && monthlySubs > 5000) {
        alerts.push({
          id: "subs_high",
          level: "opportunity",
          category: "spending",
          title: `Subscriptions are ${prefs.subRatioPercent}%+ of expenses`,
          detail: (
            <>
              <Money value={monthlySubs} variant="exact" />
              {"/month on subscriptions. Review for unused or duplicate active services."}
            </>
          ),
          plainDetail: `₹${Math.round(monthlySubs).toLocaleString("en-IN")}/month on subscriptions`,
          icon: Zap,
          action: "Review subscriptions",
          targetTab: "recurring",
          impactValue: monthlySubs * 12,
          impactLabel: `₹${Math.round(monthlySubs * 12).toLocaleString("en-IN")}/yr Outflow`,
          tags: ["Subscriptions", "Cost Optimization"],
        });
      }

      // 4. Duplicate transaction detector
      const dateAmtMap: Record<string, any[]> = {};
      (state?.transactions || [])
        .filter((t: any) => t.type === "debit" && t.date && t.date.startsWith(currentMonth))
        .forEach((t: any) => {
          const key = `${t.date}_${Number(t.amount || 0)}`;
          if (!dateAmtMap[key]) dateAmtMap[key] = [];
          dateAmtMap[key].push(t);
        });

      Object.entries(dateAmtMap).forEach(([key, txns]) => {
        if (txns.length > 1 && Number(txns[0].amount || 0) >= 1000) {
          alerts.push({
            id: `duplicate_txn_${key}`,
            level: "warn",
            category: "spending",
            title: `Potential duplicate charge (${txns.length}x ₹${Math.round(txns[0].amount)})`,
            detail: `${txns.length} identical debits of ₹${Math.round(txns[0].amount).toLocaleString("en-IN")} logged on ${txns[0].date}. Verify if this was charged twice.`,
            plainDetail: `${txns.length} charges of ₹${txns[0].amount} on ${txns[0].date}`,
            icon: AlertTriangle,
            action: "Check transaction history",
            targetTab: "expenses",
            impactValue: Number(txns[0].amount) * (txns.length - 1),
            impactLabel: "Duplicate Risk",
            tags: ["Audit", "Duplicate"],
          });
        }
      });
    }

    // 5. Investments & Fixed Deposits / Bonds / SIPs
    if (prefs.enabledModules.investments) {
      (state?.bonds || []).forEach((b: any) => {
        if (b.maturityDate) {
          const days = daysUntil(b.maturityDate);
          if (days >= 0 && days <= 30) {
            alerts.push({
              id: `bond_mature_${b.id}`,
              level: days <= 7 ? "error" : "warn",
              category: "investments",
              title: `Bond maturing in ${days} days`,
              detail: (
                <>
                  {`${b.name || "Bond"} — Face Value: `}
                  <Money value={b.faceValue || b.totalInvestmentAmount} variant="exact" />
                </>
              ),
              plainDetail: `${b.name || "Bond"} maturing in ${days} days`,
              icon: Clock,
              action: "Decide: reinvest or withdraw",
              targetTab: "bonds",
              daysRemaining: days,
              impactValue: Number(b.faceValue || b.totalInvestmentAmount || 0),
              impactLabel: `Maturity in ${days}d`,
              tags: ["Maturity", "Reinvestment"],
            });
          }
        }
      });

      // SIP monitoring
      (state?.sips || []).forEach((sip: any) => {
        if (sip.status === "stopped" || sip.status === "paused") return;
        const totalInst = Number(sip.totalInstallments || 0);
        if (totalInst <= 0 || !sip.startDate) return;
        const isQuarterly = sip.frequency === "quarterly";
        const monthsElapsed = Math.max(0, monthsBetween(sip.startDate, todayStr));
        const installmentsElapsed = isQuarterly ? Math.floor(monthsElapsed / 3) : monthsElapsed;
        if (installmentsElapsed >= totalInst) {
          alerts.push({
            id: `sip_ended_${sip.id}`,
            level: "opportunity",
            category: "investments",
            title: "SIP completed",
            detail: `${sip.scheme || "SIP"} has completed its ${totalInst}-installment run. Consider renewing or starting a new one.`,
            plainDetail: `${sip.scheme || "SIP"} completed tenure`,
            icon: CheckCircle,
            action: "Review SIP tracker",
            targetTab: "sip",
            tags: ["SIP", "Tenure Completed"],
          });
        }
      });
    }

    // 6. Goals & Milestones
    if (prefs.enabledModules.goals) {
      const noticeWindow = prefs.goalNoticeDays;

      (state?.goals || []).forEach((g: any) => {
        if (!g.targetDate) return;
        const days = daysUntil(g.targetDate);
        const targetAmt = Number(g.targetAmount || 0);
        const currAmt = Number(g.currentAmount || 0);
        const progress = targetAmt ? (currAmt / targetAmt) * 100 : 0;
        const shortfall = Math.max(0, targetAmt - currAmt);

        if (days >= 0 && days <= noticeWindow && progress < 80) {
          alerts.push({
            id: `goal_deadline_${g.id}`,
            level: days <= 30 ? "error" : "warn",
            category: "goals",
            title: `Goal "${g.name}" deadline in ${days} days`,
            detail: (
              <>
                {`Progress: ${progress.toFixed(0)}% — Need `}
                <Money value={shortfall} variant="exact" />
                {" more"}
              </>
            ),
            plainDetail: `Progress ${progress.toFixed(0)}%, Need ₹${Math.round(shortfall).toLocaleString("en-IN")}`,
            icon: Target,
            action: "Accelerate savings",
            targetTab: "goals",
            daysRemaining: days,
            impactValue: shortfall,
            impactLabel: `₹${Math.round(shortfall).toLocaleString("en-IN")} Shortfall`,
            tags: ["Milestone", "Target Date"],
          });
        }
      });

      // Life events
      (state?.lifeEvents || []).forEach((e: any) => {
        if (!e.targetDate) return;
        const days = daysUntil(e.targetDate);
        const estCost = Number(e.estimatedCost || 0);
        const currSaved = Number(e.currentSaved || 0);
        const progress = estCost ? (currSaved / estCost) * 100 : 0;
        const shortfall = Math.max(0, estCost - currSaved);

        if (days >= 0 && days <= noticeWindow && progress < 80) {
          alerts.push({
            id: `life_event_deadline_${e.id}`,
            level: days <= 30 ? "error" : "warn",
            category: "goals",
            title: `Life event "${e.name}" in ${days} days`,
            detail: (
              <>
                {`Progress: ${progress.toFixed(0)}% — Need `}
                <Money value={shortfall} variant="exact" />
                {" more"}
              </>
            ),
            plainDetail: `Progress ${progress.toFixed(0)}%, Need ₹${Math.round(shortfall).toLocaleString("en-IN")}`,
            icon: Calendar,
            action: "Review Life Event Planner",
            targetTab: "lifeevents",
            daysRemaining: days,
            impactValue: shortfall,
            impactLabel: `₹${Math.round(shortfall).toLocaleString("en-IN")} Gap`,
            tags: ["Life Event", "Funding Gap"],
          });
        }
      });
    }

    // 7. Credit Cards & Debt Risk
    if (prefs.enabledModules.credit) {
      (state?.creditCards || []).forEach((c: any) => {
        const outstanding = Number(c.outstanding || 0);
        const limit = Number(c.limit || c.creditLimit || 0);
        if (limit > 0) {
          const util = (outstanding / limit) * 100;
          if (util > prefs.creditUtilThreshold && outstanding > 10000) {
            alerts.push({
              id: `credit_util_high_${c.id || c.issuer}`,
              level: util > 70 ? "error" : "warn",
              category: "credit",
              title: `High credit utilization on ${c.issuer || "Card"} (${util.toFixed(0)}%)`,
              detail: `Outstanding balance is ₹${Math.round(outstanding).toLocaleString("en-IN")} against a limit of ₹${Math.round(limit).toLocaleString("en-IN")}. High utilization (>30%) negatively impacts your CIBIL score.`,
              plainDetail: `Utilization is ${util.toFixed(0)}% on limit ₹${Math.round(limit).toLocaleString("en-IN")}`,
              icon: CreditCard,
              action: "Pay down credit card bill",
              targetTab: "creditcards",
              impactValue: outstanding,
              impactLabel: `${util.toFixed(0)}% Utilized`,
              tags: ["Credit Score", "CIBIL Risk"],
            });
          }
        }
      });
    }

    // 8. Emergency Runway & Idle Cash Drag
    if (prefs.enabledModules.security) {
      const monthlyExp = Number(metrics?.monthExpense || 0);
      const liquidCash = (state?.bankAccounts || []).reduce(
        (sum: number, b: any) => sum + Number(b.balance || 0),
        0
      );

      if (monthlyExp > 0) {
        const runwayMonths = liquidCash / monthlyExp;
        if (runwayMonths < prefs.emergencyFundMinMonths && monthlyExp > 10000) {
          const shortfall = (prefs.emergencyFundMinMonths - runwayMonths) * monthlyExp;
          alerts.push({
            id: "emergency_runway_low",
            level: "error",
            category: "security",
            title: `Low Emergency Runway (${runwayMonths.toFixed(1)} Months)`,
            detail: `Liquid bank balances (₹${Math.round(liquidCash).toLocaleString("en-IN")}) cover less than ${prefs.emergencyFundMinMonths} months of monthly burn (₹${Math.round(monthlyExp).toLocaleString("en-IN")}/mo). Aim for at least 6 months safety reserve.`,
            plainDetail: `Runway is only ${runwayMonths.toFixed(1)} months vs recommended 6 months`,
            icon: ShieldAlert,
            action: "Bolster emergency reserves",
            targetTab: "emergencyfund",
            impactValue: shortfall,
            impactLabel: `₹${Math.round(shortfall).toLocaleString("en-IN")} Buffer Shortfall`,
            tags: ["Emergency Fund", "Safety Net"],
          });
        } else if (runwayMonths > 12 && liquidCash > 300000) {
          // Idle cash drag
          const surplus = liquidCash - monthlyExp * 6;
          alerts.push({
            id: "idle_cash_drag",
            level: "opportunity",
            category: "investments",
            title: `Idle Cash Drag (₹${Math.round(surplus).toLocaleString("en-IN")} surplus)`,
            detail: `You have ${runwayMonths.toFixed(1)} months of cash in regular savings accounts. Deploying surplus cash beyond 6 months into Arbitrage / Liquid funds could earn an extra 3–4% p.a.`,
            plainDetail: `Surplus idle cash of ₹${Math.round(surplus).toLocaleString("en-IN")}`,
            icon: Wallet,
            action: "Explore liquid & debt investments",
            targetTab: "mf",
            impactValue: surplus * 0.04,
            impactLabel: `~₹${Math.round((surplus * 0.04) / 12).toLocaleString("en-IN")}/mo Yield Opportunity`,
            tags: ["Yield Drag", "Cash Optimization"],
          });
        }
      }
    }

    // 9. Data Quality & Inactivity
    if (prefs.enabledModules.data) {
      const latestTxn = (state?.transactions || []).reduce((latest: string, t: any) => {
        if (!t.date) return latest;
        return t.date > latest ? t.date : latest;
      }, "");

      if (latestTxn && todayStr) {
        const daysSince = Math.ceil(
          (new Date(todayStr).getTime() - new Date(latestTxn).getTime()) / 86400000
        );
        if (daysSince > prefs.inactivityDays) {
          alerts.push({
            id: "no_recent_txns",
            level: "info",
            category: "data",
            title: `No transactions logged in ${daysSince} days`,
            detail:
              "Your records may be out of date. Import a bank statement or add transactions manually to keep reports accurate.",
            plainDetail: `No transactions logged in ${daysSince} days`,
            icon: Info,
            action: "Add transactions",
            targetTab: "expenses",
            daysRemaining: daysSince,
            tags: ["Data Freshness", "Import"],
          });
        }
      }
    }

    // Sort order
    return alerts.sort((a, b) => {
      const order: Record<string, number> = { error: 0, warn: 1, opportunity: 2, info: 3 };
      return (order[a.level] ?? 99) - (order[b.level] ?? 99);
    });
  }, [state, metrics, prefs]);

  // Active alerts (excluding snoozed)
  const activeAlerts = useMemo(
    () => smartAlerts.filter((a) => !isSnoozed(a.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [smartAlerts, dismissed]
  );

  // Financial Health Score calculation (0 to 100)
  const healthScore = useMemo(() => {
    let score = 100;
    activeAlerts.forEach((a) => {
      if (a.level === "error") score -= 18;
      else if (a.level === "warn") score -= 8;
      else if (a.level === "opportunity") score -= 3;
    });
    return Math.max(15, Math.min(100, Math.round(score)));
  }, [activeAlerts]);

  const healthStatus = useMemo(() => {
    if (healthScore >= 85) return { label: "Optimal Health", color: THEME.sage || "#10b981" };
    if (healthScore >= 70) return { label: "Good Standing", color: THEME.accent || "#6366f1" };
    if (healthScore >= 50) return { label: "Caution Advised", color: THEME.gold || "#f59e0b" };
    return { label: "Action Required", color: THEME.rust || "#ef4444" };
  }, [healthScore]);

  // Filtered & Sorted Alerts
  const filteredAlerts = useMemo(() => {
    let result = activeAlerts;

    // Severity filter
    if (selectedSeverity !== "all") {
      result = result.filter((a) => a.level === selectedSeverity);
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((a) => a.category === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          (a.action && a.action.toLowerCase().includes(q)) ||
          (a.plainDetail && a.plainDetail.toLowerCase().includes(q)) ||
          (a.tags && a.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }

    // Sorting
    return [...result].sort((a, b) => {
      if (sortBy === "urgency") {
        const order: Record<string, number> = { error: 0, warn: 1, opportunity: 2, info: 3 };
        return (order[a.level] ?? 99) - (order[b.level] ?? 99);
      }
      if (sortBy === "impact") {
        return (b.impactValue || 0) - (a.impactValue || 0);
      }
      if (sortBy === "category") {
        return a.category.localeCompare(b.category);
      }
      return 0;
    });
  }, [activeAlerts, selectedSeverity, selectedCategory, searchQuery, sortBy]);

  const categories = useMemo(() => {
    const list = [...new Set(activeAlerts.map((a) => a.category))];
    return list;
  }, [activeAlerts]);

  const errorCount = activeAlerts.filter((a) => a.level === "error").length;
  const warnCount = activeAlerts.filter((a) => a.level === "warn").length;
  const oppCount = activeAlerts.filter((a) => a.level === "opportunity").length;
  const snoozedList = Object.entries(dismissed).filter(([, val]) => val.expiry > Date.now());
  const snoozedCount = snoozedList.length;

  const levelConfig: Record<string, { color: string; label: string; bg: string; border: string }> = {
    error: {
      color: THEME.rust || "#ef4444",
      label: "Critical",
      bg: "rgba(239, 68, 68, 0.08)",
      border: "rgba(239, 68, 68, 0.25)",
    },
    warn: {
      color: THEME.gold || "#f59e0b",
      label: "Warning",
      bg: "rgba(245, 158, 11, 0.08)",
      border: "rgba(245, 158, 11, 0.25)",
    },
    opportunity: {
      color: THEME.sage || "#10b981",
      label: "Optimization",
      bg: "rgba(16, 185, 129, 0.08)",
      border: "rgba(16, 185, 129, 0.25)",
    },
    info: {
      color: THEME.accent || "#6366f1",
      label: "Info",
      bg: "rgba(99, 102, 241, 0.08)",
      border: "rgba(99, 102, 241, 0.25)",
    },
  };

  const exportDigest = () => {
    const digest = {
      generatedAt: new Date().toISOString(),
      healthScore,
      healthStatus: healthStatus.label,
      totalActiveAlerts: activeAlerts.length,
      alerts: activeAlerts.map((a) => ({
        id: a.id,
        level: a.level,
        category: a.category,
        title: a.title,
        action: a.action,
        impactValue: a.impactValue,
      })),
    };
    const blob = new Blob([JSON.stringify(digest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smart-alerts-digest-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    if (showToast) showToast("Alerts digest exported as JSON", "success");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header & Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <SectionTitle sub="AI-powered financial health monitoring & predictive anomaly detection">
          Smart Alerts
        </SectionTitle>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {snoozedCount > 0 && (
            <Button
              variant="secondary"
              onClick={() => setShowSnoozedModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
            >
              <RotateCcw size={14} />
              Snoozed ({snoozedCount})
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => setShowPrefsModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
            title="Configure Alert Thresholds & Rules"
          >
            <SlidersHorizontal size={14} />
            Preferences
          </Button>

          <Button
            variant="secondary"
            onClick={exportDigest}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
            title="Export Alerts Digest"
          >
            <Download size={14} />
            Export
          </Button>
        </div>
      </div>

      {/* Financial Health Index Hero Card */}
      <Card
        style={{
          background: "linear-gradient(135deg, var(--t-card-bg) 0%, rgba(99, 102, 241, 0.05) 100%)",
          border: `1px solid ${THEME.line}`,
          padding: 20,
          borderRadius: 16,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 24,
            alignItems: "center",
          }}
          className="responsive-grid-health"
        >
          {/* Radial Score Gauge */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 20px",
              background: `color-mix(in srgb, ${healthStatus.color} 8%, transparent)`,
              border: `1.5px solid ${healthStatus.color}40`,
              borderRadius: 16,
              minWidth: 140,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: THEME.textSecondary, letterSpacing: 0.5 }}>
              Health Index
            </div>
            <div
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: healthStatus.color,
                lineHeight: 1.1,
                marginTop: 4,
              }}
            >
              {healthScore}
              <span style={{ fontSize: 18, fontWeight: 500, opacity: 0.7 }}>/100</span>
            </div>
            <div
              style={{
                marginTop: 6,
                padding: "2px 8px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                background: healthStatus.color,
                color: "#fff",
              }}
            >
              {healthStatus.label}
            </div>
          </div>

          {/* AI Executive Assessment */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Sparkles size={16} color={THEME.accent} />
              <span style={{ fontSize: 13, fontWeight: 700, color: THEME.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>
                AI Diagnostic Briefing
              </span>
            </div>
            <div style={{ fontSize: 14, color: THEME.text, lineHeight: 1.5, marginBottom: 8 }}>
              {activeAlerts.length === 0 ? (
                "Your financial ecosystem is running at peak efficiency with zero active anomalies or pending risk triggers."
              ) : (
                <>
                  {errorCount > 0 && (
                    <span style={{ color: THEME.rust, fontWeight: 600 }}>
                      {errorCount} critical item{errorCount > 1 ? "s require" : " requires"} immediate attention.{" "}
                    </span>
                  )}
                  {warnCount > 0 && (
                    <span>
                      {warnCount} warning{warnCount > 1 ? "s" : ""} flagged across spending and milestones.{" "}
                    </span>
                  )}
                  {oppCount > 0 && (
                    <span style={{ color: THEME.sage }}>
                      {oppCount} optimization opportunit{oppCount > 1 ? "ies" : "y"} identified to maximize yield.
                    </span>
                  )}
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: THEME.textSecondary }}>
              <span>• Evaluated {state?.transactions?.length || 0} transactions</span>
              <span>• {state?.goals?.length || 0} active goals</span>
              <span>• {state?.subscriptions?.length || 0} subscriptions</span>
              <span>• {state?.bonds?.length || 0} bonds</span>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Stats Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Critical Actions"
          value={errorCount.toLocaleString("en-IN")}
          numericValue={errorCount}
          formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
          icon={<XCircle />}
          color={THEME.rust || "#ef4444"}
          sub={errorCount > 0 ? "Requires urgent review" : "All clean"}
          subColor={errorCount > 0 ? THEME.rust : THEME.sage}
          onClick={() => setSelectedSeverity(selectedSeverity === "error" ? "all" : "error")}
        />
        <StatCard
          label="Warnings & Anomalies"
          value={warnCount.toLocaleString("en-IN")}
          numericValue={warnCount}
          formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
          icon={<AlertTriangle />}
          color={THEME.gold || "#f59e0b"}
          sub={warnCount > 0 ? "Pacing & milestone alerts" : "No warnings"}
          subColor={warnCount > 0 ? THEME.gold : THEME.textSecondary}
          onClick={() => setSelectedSeverity(selectedSeverity === "warn" ? "all" : "warn")}
        />
        <StatCard
          label="Optimization Leads"
          value={oppCount.toLocaleString("en-IN")}
          numericValue={oppCount}
          formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
          icon={<Zap />}
          color={THEME.sage || "#10b981"}
          sub={oppCount > 0 ? "Cash drag & sub audits" : "Optimal"}
          subColor={THEME.sage}
          onClick={() => setSelectedSeverity(selectedSeverity === "opportunity" ? "all" : "opportunity")}
        />
        <StatCard
          label="Total Active"
          value={activeAlerts.length.toLocaleString("en-IN")}
          numericValue={activeAlerts.length}
          formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
          icon={<Bell />}
          color={THEME.accent}
          sub={`${snoozedCount} snoozed`}
          onClick={() => {
            setSelectedSeverity("all");
            setSelectedCategory("all");
          }}
        />
      </div>

      {/* Filter & Search Bar */}
      <Card style={{ padding: "14px 16px", background: "var(--t-card-bg)", border: `1px solid ${THEME.line}` }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Top Row: Search + Sort + Layout */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {/* Search Input */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--t-input-bg, rgba(255,255,255,0.05))",
                border: `1px solid ${THEME.border}`,
                borderRadius: 8,
                padding: "6px 12px",
                flex: "1 1 260px",
                maxWidth: 400,
              }}
            >
              <Search size={16} color={THEME.textSecondary} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts, categories, tags..."
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: THEME.text,
                  fontSize: 13,
                  width: "100%",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ background: "none", border: "none", color: THEME.textSecondary, cursor: "pointer" }}
                >
                  <XCircle size={14} />
                </button>
              )}
            </div>

            {/* Sort Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: THEME.textSecondary }}>
                <ArrowUpDown size={14} />
                <span>Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{
                    background: "var(--t-card-bg)",
                    color: THEME.text,
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 6,
                    padding: "4px 8px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  <option value="urgency">Urgency (Critical First)</option>
                  <option value="impact">Financial Impact (₹ Value)</option>
                  <option value="category">Category</option>
                </select>
              </div>

              {/* View mode toggle */}
              <div
                style={{
                  display: "flex",
                  borderRadius: 6,
                  border: `1px solid ${THEME.border}`,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setViewMode("detailed")}
                  style={{
                    padding: "4px 10px",
                    fontSize: 12,
                    border: "none",
                    background: viewMode === "detailed" ? THEME.accent : "transparent",
                    color: viewMode === "detailed" ? "#fff" : THEME.textSecondary,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode("compact")}
                  style={{
                    padding: "4px 10px",
                    fontSize: 12,
                    border: "none",
                    background: viewMode === "compact" ? THEME.accent : "transparent",
                    color: viewMode === "compact" ? "#fff" : THEME.textSecondary,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Compact
                </button>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              borderTop: `1px solid ${THEME.line}`,
              paddingTop: 10,
            }}
          >
            {/* Severity Pills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={() => setSelectedSeverity("all")}
                style={{
                  padding: "4px 12px",
                  borderRadius: 16,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: `1px solid ${selectedSeverity === "all" ? THEME.accent : THEME.border}`,
                  background: selectedSeverity === "all" ? THEME.accent : "transparent",
                  color: selectedSeverity === "all" ? "#fff" : THEME.text,
                }}
              >
                All Severities ({activeAlerts.length})
              </button>
              <button
                onClick={() => setSelectedSeverity("error")}
                style={{
                  padding: "4px 12px",
                  borderRadius: 16,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: `1px solid ${selectedSeverity === "error" ? THEME.rust : THEME.border}`,
                  background: selectedSeverity === "error" ? levelConfig.error.bg : "transparent",
                  color: selectedSeverity === "error" ? THEME.rust : THEME.text,
                }}
              >
                Critical ({errorCount})
              </button>
              <button
                onClick={() => setSelectedSeverity("warn")}
                style={{
                  padding: "4px 12px",
                  borderRadius: 16,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: `1px solid ${selectedSeverity === "warn" ? THEME.gold : THEME.border}`,
                  background: selectedSeverity === "warn" ? levelConfig.warn.bg : "transparent",
                  color: selectedSeverity === "warn" ? THEME.gold : THEME.text,
                }}
              >
                Warnings ({warnCount})
              </button>
              <button
                onClick={() => setSelectedSeverity("opportunity")}
                style={{
                  padding: "4px 12px",
                  borderRadius: 16,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: `1px solid ${selectedSeverity === "opportunity" ? THEME.sage : THEME.border}`,
                  background: selectedSeverity === "opportunity" ? levelConfig.opportunity.bg : "transparent",
                  color: selectedSeverity === "opportunity" ? THEME.sage : THEME.text,
                }}
              >
                Optimization ({oppCount})
              </button>
            </div>

            {/* Category Pills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={() => setSelectedCategory("all")}
                style={{
                  padding: "4px 10px",
                  borderRadius: 14,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: `1px solid ${selectedCategory === "all" ? THEME.accent : THEME.border}`,
                  background: selectedCategory === "all" ? `${THEME.accent}20` : "transparent",
                  color: selectedCategory === "all" ? THEME.accent : THEME.textSecondary,
                }}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 14,
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "capitalize",
                    cursor: "pointer",
                    border: `1px solid ${selectedCategory === cat ? THEME.accent : THEME.border}`,
                    background: selectedCategory === cat ? `${THEME.accent}20` : "transparent",
                    color: selectedCategory === cat ? THEME.accent : THEME.textSecondary,
                  }}
                >
                  {cat} ({activeAlerts.filter((a) => a.category === cat).length})
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Alerts Feed */}
      {filteredAlerts.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredAlerts.map((alert) => {
            const Icon = alert.icon || Bell;
            const cfg = levelConfig[alert.level] || levelConfig.info;

            if (viewMode === "compact") {
              return (
                <Card
                  key={alert.id}
                  style={{
                    padding: "12px 16px",
                    background: "var(--t-card-bg)",
                    border: `1px solid ${THEME.line}`,
                    borderLeft: `4px solid ${cfg.color}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                    <Icon size={18} color={cfg.color} style={{ flexShrink: 0 }} />
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: THEME.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {alert.title}
                        </span>
                        <span
                          style={{
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                          }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {alert.plainDetail || alert.detail}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {alert.targetTab && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleNavigate(alert.targetTab)}
                        style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        Action <ArrowUpRight size={13} />
                      </Button>
                    )}
                    <button
                      onClick={() => snoozeAlert(alert, 30)}
                      title="Snooze for 30 days"
                      style={{
                        background: "none",
                        border: "none",
                        color: THEME.textSecondary,
                        cursor: "pointer",
                        padding: 4,
                      }}
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                </Card>
              );
            }

            return (
              <Card
                key={alert.id}
                style={{
                  padding: 18,
                  background: "var(--t-card-bg)",
                  border: `1px solid ${THEME.line}`,
                  borderLeft: `4px solid ${cfg.color}`,
                  borderRadius: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                  }}
                >
                  {/* Left Icon & Details */}
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <Icon size={20} color={cfg.color} />
                    </div>

                    <div style={{ flex: 1 }}>
                      {/* Badge header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                            letterSpacing: 0.5,
                          }}
                        >
                          {cfg.label}
                        </span>

                        <span
                          style={{
                            fontSize: 11,
                            color: THEME.textSecondary,
                            textTransform: "capitalize",
                            fontWeight: 500,
                          }}
                        >
                          {alert.category}
                        </span>

                        {alert.impactLabel && (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              background: "var(--t-card-hover, rgba(255,255,255,0.06))",
                              color: THEME.text,
                              border: `1px solid ${THEME.border}`,
                            }}
                          >
                            {alert.impactLabel}
                          </span>
                        )}

                        {alert.tags?.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              fontSize: 10,
                              color: THEME.textSecondary,
                              opacity: 0.8,
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Title */}
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: THEME.text,
                          marginBottom: 6,
                          lineHeight: 1.3,
                        }}
                      >
                        {alert.title}
                      </div>

                      {/* Detail */}
                      <div style={{ fontSize: 13.5, color: THEME.textSecondary, lineHeight: 1.5, marginBottom: 12 }}>
                        {alert.detail}
                      </div>

                      {/* Action Bar & Deep Link */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 12,
                          borderTop: `1px solid ${THEME.line}`,
                          paddingTop: 10,
                        }}
                      >
                        {alert.action && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: THEME.accent, fontWeight: 600 }}>
                            <span>Suggested:</span>
                            <span>{alert.action}</span>
                          </div>
                        )}

                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                          {/* Copy Alert Button */}
                          <button
                            onClick={() => copyAlertDetails(alert)}
                            style={{
                              background: "transparent",
                              border: `1px solid ${THEME.border}`,
                              borderRadius: 6,
                              padding: "4px 8px",
                              fontSize: 12,
                              color: THEME.textSecondary,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                            title="Copy alert text"
                          >
                            {copiedId === alert.id ? <Check size={13} color={THEME.sage} /> : <Copy size={13} />}
                            {copiedId === alert.id ? "Copied" : "Copy"}
                          </button>

                          {/* Direct Navigation Action CTA */}
                          {alert.targetTab && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleNavigate(alert.targetTab)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 12.5,
                                fontWeight: 600,
                                padding: "5px 12px",
                              }}
                            >
                              <span>Take Action</span>
                              <ArrowUpRight size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Snooze & Dismiss Menu */}
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() =>
                        setActiveSnoozeMenuId(activeSnoozeMenuId === alert.id ? null : alert.id)
                      }
                      title="Snooze alert options"
                      aria-label="Snooze options"
                      style={{
                        background: "transparent",
                        border: `1px solid ${THEME.border}`,
                        borderRadius: 6,
                        cursor: "pointer",
                        color: THEME.textSecondary,
                        padding: "5px 8px",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      <Clock size={13} />
                      <span>Snooze</span>
                    </button>

                    {/* Popover Menu */}
                    {activeSnoozeMenuId === alert.id && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          right: 0,
                          marginTop: 4,
                          background: "var(--t-card-bg)",
                          border: `1px solid ${THEME.border}`,
                          borderRadius: 8,
                          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                          zIndex: 50,
                          minWidth: 150,
                          overflow: "hidden",
                        }}
                      >
                        <button
                          onClick={() => snoozeAlert(alert, 7)}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "8px 12px",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            fontSize: 12,
                            color: THEME.text,
                            cursor: "pointer",
                            borderBottom: `1px solid ${THEME.line}`,
                          }}
                        >
                          Snooze for 7 days
                        </button>
                        <button
                          onClick={() => snoozeAlert(alert, 30)}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "8px 12px",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            fontSize: 12,
                            color: THEME.text,
                            cursor: "pointer",
                            borderBottom: `1px solid ${THEME.line}`,
                          }}
                        >
                          Snooze for 30 days
                        </button>
                        <button
                          onClick={() => snoozeAlert(alert, 90)}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "8px 12px",
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            fontSize: 12,
                            color: THEME.text,
                            cursor: "pointer",
                          }}
                        >
                          Snooze for 90 days
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle}
          title="All Clear & Healthy!"
          description={
            searchQuery || selectedSeverity !== "all" || selectedCategory !== "all"
              ? "No alerts match your current search or filter criteria. Try resetting the filters."
              : snoozedCount > 0
              ? `No active alerts. ${snoozedCount} alert${snoozedCount === 1 ? " is" : "s are"} currently snoozed.`
              : "No anomalies detected. Your finances, cash flow, and savings goals look well optimized."
          }
          action={
            (searchQuery || selectedSeverity !== "all" || selectedCategory !== "all") && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSeverity("all");
                  setSelectedCategory("all");
                }}
              >
                Reset Filters
              </Button>
            )
          }
        />
      )}

      {/* ── Snoozed Alerts Management Modal ── */}
      {showSnoozedModal && (
        <Modal
          title={`Snoozed Alerts Management (${snoozedList.length})`}
          isOpen={showSnoozedModal}
          onClose={() => setShowSnoozedModal(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 13, color: THEME.textSecondary, lineHeight: 1.4 }}>
              Snoozed alerts are temporarily silenced and will automatically resurface after their
              timer expires. You can wake them up individually or restore all below.
            </div>

            {snoozedList.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflowY: "auto" }}>
                {snoozedList.map(([id, item]) => {
                  const daysLeft = Math.max(1, Math.ceil((item.expiry - Date.now()) / 86400000));
                  return (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: "var(--t-input-bg, rgba(255,255,255,0.03))",
                        border: `1px solid ${THEME.border}`,
                        borderRadius: 8,
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: THEME.text }}>
                          {item.title || id}
                        </div>
                        <div style={{ fontSize: 11.5, color: THEME.textSecondary, marginTop: 2 }}>
                          Resurfaces in {daysLeft} day{daysLeft > 1 ? "s" : ""}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => unsnoozeAlert(id)}
                        style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <RotateCcw size={12} />
                        Wake Up
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: 20, textAlign: "center", color: THEME.textSecondary, fontSize: 13 }}>
                No alerts are currently snoozed.
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${THEME.line}`, paddingTop: 14 }}>
              {snoozedList.length > 0 && (
                <Button variant="danger" size="sm" onClick={clearAllSnoozed}>
                  Restore All Snoozed
                </Button>
              )}
              <Button variant="secondary" onClick={() => setShowSnoozedModal(false)} style={{ marginLeft: "auto" }}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Alert Thresholds & Rules Preference Modal ── */}
      {showPrefsModal && (
        <Modal
          title="Alert Engine Preferences & Rules"
          isOpen={showPrefsModal}
          onClose={() => setShowPrefsModal(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 13, color: THEME.textSecondary }}>
              Customize anomaly sensitivity and detection thresholds for Smart Alerts.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Spend Spike Threshold (%)">
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={prefs.spendSpikePercent}
                  onChange={(e) =>
                    setPrefs({ ...prefs, spendSpikePercent: Number(e.target.value) || 30 })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: `1px solid ${THEME.border}`,
                    background: "var(--t-input-bg)",
                    color: THEME.text,
                  }}
                />
              </Field>

              <Field label="Goal Notice Window (Days)">
                <input
                  type="number"
                  min={15}
                  max={180}
                  value={prefs.goalNoticeDays}
                  onChange={(e) =>
                    setPrefs({ ...prefs, goalNoticeDays: Number(e.target.value) || 90 })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: `1px solid ${THEME.border}`,
                    background: "var(--t-input-bg)",
                    color: THEME.text,
                  }}
                />
              </Field>

              <Field label="Inactivity Grace Days">
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={prefs.inactivityDays}
                  onChange={(e) =>
                    setPrefs({ ...prefs, inactivityDays: Number(e.target.value) || 14 })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: `1px solid ${THEME.border}`,
                    background: "var(--t-input-bg)",
                    color: THEME.text,
                  }}
                />
              </Field>

              <Field label="Credit Util Warning (%)">
                <input
                  type="number"
                  min={10}
                  max={80}
                  value={prefs.creditUtilThreshold}
                  onChange={(e) =>
                    setPrefs({ ...prefs, creditUtilThreshold: Number(e.target.value) || 30 })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: `1px solid ${THEME.border}`,
                    background: "var(--t-input-bg)",
                    color: THEME.text,
                  }}
                />
              </Field>
            </div>

            {/* Active Modules Toggles */}
            <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text, marginBottom: 8 }}>
                Active Anomaly Modules
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.entries(prefs.enabledModules).map(([mod, enabled]) => (
                  <label
                    key={mod}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: THEME.text,
                      textTransform: "capitalize",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) =>
                        setPrefs({
                          ...prefs,
                          enabledModules: {
                            ...prefs.enabledModules,
                            [mod]: e.target.checked,
                          },
                        })
                      }
                    />
                    {mod} Detection
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: `1px solid ${THEME.line}`, paddingTop: 14 }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setPrefs(DEFAULT_PREFS);
                  savePrefs(DEFAULT_PREFS);
                }}
              >
                Reset to Defaults
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  savePrefs(prefs);
                  setShowPrefsModal(false);
                }}
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
