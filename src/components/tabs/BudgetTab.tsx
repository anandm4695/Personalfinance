// @ts-nocheck
import React, { useState, useMemo } from "react";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import {
  AlertCircle,
  Plus,
  Wallet,
  Receipt,
  TrendingUp,
  Target,
  Pencil,
  Trash2,
  BarChart2,
  Check,
  Utensils,
  ShoppingBag,
  Car,
  Home,
  Zap,
  Stethoscope,
  Film,
  Landmark,
  ArrowRightLeft,
  Wrench,
  HelpCircle,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Play,
  Pause,
  Repeat,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, today, getEffectiveRent, getLocalDateString } from "../../utils/finance";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";
import { ConfirmDialog } from "../ui/Feedback";

const CATEGORY_ICONS: Record<string, any> = {
  Food: Utensils,
  Groceries: ShoppingBag,
  Transport: Car,
  Rent: Home,
  Bills: Zap,
  Salary: Wallet,
  Investment: TrendingUp,
  EMI: CreditCard,
  Shopping: ShoppingBag,
  Medical: Stethoscope,
  Entertainment: Film,
  Tax: Landmark,
  Transfer: ArrowRightLeft,
  Utilities: Wrench,
  Uncategorized: HelpCircle,
};

function getCatIcon(cat: string) {
  return CATEGORY_ICONS[cat] || HelpCircle;
}

const fmtDate = (dateStr: string) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export function BudgetTab({
  state,
  addItem,
  removeItem,
  updateItem,
  metrics: _metrics,
  activeProfile = "all",
  showToast,
}: any) {
  const { privacyMode } = usePrivacy();
  const { familyProfiles } = useMasterData();
  const [postingId, setPostingId] = useState<string | null>(null);
  const getOwnerName = (ownerId: string) =>
    familyProfiles.find((p: any) => p.id === ownerId)?.name || ownerId || "Self";
  const [activeSubTab, setActiveSubTab] = useState("budget"); // "budget" or "recurring"
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(
    null
  );
  const [selectedMonth, setSelectedMonth] = useState(() => today().slice(0, 7)); // YYYY-MM
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [editBudget, setEditBudget] = useState<any>(null);
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [editRecurring, setEditRecurring] = useState<any>(null);
  const [togglingRecurringId, setTogglingRecurringId] = useState<string | null>(null);
  const [removingRecurringId, setRemovingRecurringId] = useState<string | null>(null);

  const toggleRecurringActive = async (re: any) => {
    setTogglingRecurringId(re.id);
    try {
      await updateItem("recurringExpenses", re.id, { isActive: !re.isActive });
    } catch (e: any) {
      showToast?.(`Failed to update recurring expense: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setTogglingRecurringId(null);
    }
  };

  const removeRecurring = async (re: any) => {
    setRemovingRecurringId(re.id);
    try {
      await removeItem("recurringExpenses", re.id);
    } catch (e: any) {
      showToast?.(`Failed to delete recurring expense: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setRemovingRecurringId(null);
    }
  };

  const { run: saveNewBudget, loading: savingNewBudget } = useAsyncAction(
    async (v: any) => { await addItem("budgets", { ...v, budgetMonth: selectedMonth }); },
    { onSuccess: () => setShowAddBudget(false), onError: (e: any) => showToast?.(`Failed to add budget category: ${e?.message || "Unknown error"}`, "error") }
  );
  const { run: saveBudgetEdit, loading: savingBudgetEdit } = useAsyncAction(
    async (v: any) => {
      const isInheritedItem = editBudget.budgetMonth !== selectedMonth;
      if (isInheritedItem) {
        await addItem("budgets", { ...v, budgetMonth: selectedMonth });
      } else {
        await updateItem("budgets", editBudget.id, {
          ...v,
          budgetMonth: editBudget.budgetMonth || selectedMonth,
        });
      }
    },
    { onSuccess: () => setEditBudget(null), onError: (e: any) => showToast?.(`Failed to save budget category: ${e?.message || "Unknown error"}`, "error") }
  );
  const { run: saveNewRecurring, loading: savingNewRecurring } = useAsyncAction(
    async (v: any) => { await addItem("recurringExpenses", v); },
    { onSuccess: () => setShowAddRecurring(false), onError: (e: any) => showToast?.(`Failed to add recurring expense: ${e?.message || "Unknown error"}`, "error") }
  );
  const { run: saveRecurringEdit, loading: savingRecurringEdit } = useAsyncAction(
    async (v: any) => { await updateItem("recurringExpenses", editRecurring.id, v); },
    { onSuccess: () => setEditRecurring(null), onError: (e: any) => showToast?.(`Failed to save recurring expense: ${e?.message || "Unknown error"}`, "error") }
  );

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    let newM = m - 1;
    let newY = y;
    if (newM < 1) {
      newM = 12;
      newY = y - 1;
    }
    setSelectedMonth(`${newY}-${String(newM).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    let newM = m + 1;
    let newY = y;
    if (newM > 12) {
      newM = 1;
      newY = y + 1;
    }
    setSelectedMonth(`${newY}-${String(newM).padStart(2, "0")}`);
  };

  const selectedMonthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }, [selectedMonth]);

  // Compute month spending dynamically based on selected month
  const monthSpending = useMemo(() => {
    const spending = state.transactions
      .filter(
        (t: any) =>
          t.date &&
          t.date.startsWith(selectedMonth) &&
          t.type === "debit" &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer"
      )
      .reduce((acc: any, t: any) => {
        const cat = t.category || "Uncategorized";
        acc[cat] = (acc[cat] || 0) + Number(t.amount || 0);
        return acc;
      }, {});

    const rentPaidThisMonth = (state.rentedProperties || []).reduce((sum: number, p: any) => {
      const paymentsThisMonth = (p.payments || [])
        .filter((pay: any) => pay.date && pay.date.startsWith(selectedMonth))
        .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
      return sum + paymentsThisMonth;
    }, 0);

    if (rentPaidThisMonth > 0 && !spending["Rent"]) {
      spending["Rent"] = rentPaidThisMonth;
    }

    return spending;
  }, [state.transactions, state.rentedProperties, selectedMonth]);

  // Previous month spending — for MoM delta comparison (includes rent, same as monthSpending)
  const prevMonthSpending = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    let pm = m - 1,
      py = y;
    if (pm < 1) {
      pm = 12;
      py = y - 1;
    }
    const prevMonthStr = `${py}-${String(pm).padStart(2, "0")}`;
    const spending = state.transactions
      .filter(
        (t: any) =>
          t.date &&
          t.date.startsWith(prevMonthStr) &&
          t.type === "debit" &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer"
      )
      .reduce((acc: any, t: any) => {
        const cat = t.category || "Uncategorized";
        acc[cat] = (acc[cat] || 0) + Number(t.amount || 0);
        return acc;
      }, {});
    const prevRent = (state.rentedProperties || []).reduce((sum: number, p: any) => {
      return (
        sum +
        (p.payments || [])
          .filter((pay: any) => pay.date && pay.date.startsWith(prevMonthStr))
          .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0)
      );
    }, 0);
    if (prevRent > 0 && !spending["Rent"]) spending["Rent"] = prevRent;
    return spending;
  }, [state.transactions, state.rentedProperties, selectedMonth]);

  // Month-Wise Budget Selection & Inheritance Logic
  const { budgetsToUse, isInherited, inheritedFrom } = useMemo(() => {
    const specific = state.budgets.filter((b: any) => b.budgetMonth === selectedMonth);
    if (specific.length > 0) {
      return { budgetsToUse: specific, isInherited: false, inheritedFrom: null };
    }

    // Look for previous months with budgets to inherit
    const otherBudgets = state.budgets.filter(
      (b: any) => b.budgetMonth && b.budgetMonth < selectedMonth
    );
    if (otherBudgets.length > 0) {
      const months = Array.from(new Set(otherBudgets.map((b: any) => b.budgetMonth))).sort();
      const latestMonth = months[months.length - 1];
      const inherited = state.budgets.filter((b: any) => b.budgetMonth === latestMonth);
      return { budgetsToUse: inherited, isInherited: true, inheritedFrom: latestMonth };
    }

    // Fallback to legacy default templates (budgetMonth is null or empty)
    const legacy = state.budgets.filter((b: any) => !b.budgetMonth);
    if (legacy.length > 0) {
      return { budgetsToUse: legacy, isInherited: true, inheritedFrom: "Default Template" };
    }

    return { budgetsToUse: [], isInherited: false, inheritedFrom: null };
  }, [state.budgets, selectedMonth]);

  // Lock and duplicate inherited budgets to the selected month (idempotent — skips already-set categories)
  const { run: handleLockAndCustomize, loading: lockingBudgets } = useAsyncAction(
    async () => {
      if (!isInherited || budgetsToUse.length === 0) return;
      const alreadySet = new Set(
        state.budgets.filter((b: any) => b.budgetMonth === selectedMonth).map((b: any) => b.category)
      );
      for (const b of budgetsToUse) {
        if (alreadySet.has(b.category)) continue;
        await addItem("budgets", {
          owner: b.owner || "self",
          category: b.category,
          monthly: b.monthly || b.monthlyLimit || 0,
          budgetMonth: selectedMonth,
          rollover: !!b.rollover,
        });
      }
    },
    { onError: (e: any) => showToast?.(`Failed to lock budgets for this month: ${e?.message || "Unknown error"}`, "error") }
  );

  // Safe removal of budgets (handles inherited override, deduplication guard)
  const { run: handleRemoveBudget, loading: removingBudget } = useAsyncAction(
    async (b: any) => {
      const isInheritedItem = b.budgetMonth !== selectedMonth;
      if (isInheritedItem) {
        const alreadySet = new Set(
          state.budgets
            .filter((x: any) => x.budgetMonth === selectedMonth)
            .map((x: any) => x.category)
        );
        for (const otherB of budgetsToUse) {
          if (otherB.id !== b.id && !alreadySet.has(otherB.category)) {
            await addItem("budgets", {
              owner: otherB.owner || "self",
              category: otherB.category,
              monthly: otherB.monthly || otherB.monthlyLimit || 0,
              budgetMonth: selectedMonth,
              rollover: !!otherB.rollover,
            });
          }
        }
      } else {
        await removeItem("budgets", b.id);
      }
    },
    { onError: (e: any) => showToast?.(`Failed to remove budget category: ${e?.message || "Unknown error"}`, "error") }
  );

  // Rollover: when a category has `rollover` enabled, unused budget from the
  // immediately preceding month's explicit record carries forward into this
  // month's effective limit. Intentionally a single-month lookback (not a
  // compounding chain across many months) — keeps the math easy to audit from
  // the UI and avoids silently accumulating unbounded credit across a long gap
  // where the user forgot to set a budget.
  const getRolloverAmount = (b: any) => {
    if (!b.rollover) return 0;
    const [y, m] = selectedMonth.split("-").map(Number);
    let pm = m - 1,
      py = y;
    if (pm < 1) {
      pm = 12;
      py = y - 1;
    }
    const prevMonthStr = `${py}-${String(pm).padStart(2, "0")}`;
    const prevBudget = state.budgets.find(
      (x: any) =>
        x.budgetMonth === prevMonthStr &&
        x.category === b.category &&
        (x.owner || "self") === (b.owner || "self")
    );
    if (!prevBudget) return 0;
    const prevLimit = Number(prevBudget.monthly || 0);
    const prevSpent = prevMonthSpending[b.category] || 0;
    return Math.max(0, prevLimit - prevSpent);
  };
  const getEffectiveBudget = (b: any) => Number(b.monthly || 0) + getRolloverAmount(b);

  const totalBudget = budgetsToUse.reduce((s: number, b: any) => s + getEffectiveBudget(b), 0);
  const totalSpent = budgetsToUse.reduce(
    (s: number, b: any) => s + (monthSpending[b.category] || 0),
    0
  );

  const animatedSpentPct = useAnimatedNumber(totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0);

  const overBudgetCount = budgetsToUse.filter((b: any) => {
    const spent = monthSpending[b.category] || 0;
    return spent > getEffectiveBudget(b);
  }).length;

  const approachingBudgetCount = budgetsToUse.filter((b: any) => {
    const spent = monthSpending[b.category] || 0;
    const budget = getEffectiveBudget(b);
    if (budget <= 0) return false;
    const pct = (spent / budget) * 100;
    return pct > 80 && pct <= 100;
  }).length;

  // Refs for scrolling to category cards on banner click
  const categoryRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);

  const scrollToAlertCategories = () => {
    // Find the first over-budget or approaching-limit category and scroll to it
    const firstAlert = budgetsToUse.find((b: any) => {
      const spent = monthSpending[b.category] || 0;
      const budget = getEffectiveBudget(b);
      if (budget <= 0) return false;
      return (spent / budget) * 100 > 80;
    });
    if (firstAlert) {
      const ref = categoryRefs.current[firstAlert.category];
      if (ref) {
        ref.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedCategory(firstAlert.category);
        setTimeout(() => setHighlightedCategory(null), 2000);
      }
    }
  };

  // Unbudgeted spending — categories with real spend but no budget line
  const { unbudgetedSpending, totalUnbudgetedSpent } = useMemo(() => {
    const budgetedCats = new Set(budgetsToUse.map((b: any) => b.category));
    const result: Record<string, number> = {};
    Object.entries(monthSpending).forEach(([cat, amt]) => {
      if (!budgetedCats.has(cat) && (amt as number) > 0) result[cat] = amt as number;
    });
    const total = Object.values(result).reduce((s, v) => s + v, 0);
    return { unbudgetedSpending: result, totalUnbudgetedSpent: total };
  }, [monthSpending, budgetsToUse]);

  // Monthly income for selected month — used for savings rate
  const selectedMonthIncome = useMemo(() => {
    const fromIncome = (state.income || [])
      .filter((e: any) => e.date && e.date.startsWith(selectedMonth))
      .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    if (fromIncome > 0) return fromIncome;
    // Fallback: sum credit transactions for the month
    return state.transactions
      .filter((t: any) => t.date && t.date.startsWith(selectedMonth) && t.type === "credit")
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  }, [state.income, state.transactions, selectedMonth]);

  // Recurring expense active filter & matching transactions detection
  const activeRecurringExpenses = useMemo(() => {
    const items = state.recurringExpenses || [];
    return items.filter((re: any) => {
      // Check if SelectedMonth lies within active range [startDate, endDate]
      const selMonthStartStr = `${selectedMonth}-01`;
      const [y, m] = selectedMonth.split("-").map(Number);
      const daysInSelMonth = new Date(y, m, 0).getDate();
      const selMonthEndStr = `${selectedMonth}-${daysInSelMonth}`;

      if (re.startDate > selMonthEndStr) return false;
      if (re.endDate && re.endDate < selMonthStartStr) return false;
      return true;
    });
  }, [state.recurringExpenses, selectedMonth]);

  // Match actual transactions to recurring expenses for the selected month.
  // Computed once (memoized) and shared by both the stats tally and the per-card
  // status badge below — each transaction is consumed by at most one recurring
  // expense (tracked via `usedTxnIds`). Previously each card ran its own
  // independent `find()` over all transactions, so two recurring items sharing
  // a category and similar amount (e.g. two EMIs both categorized "EMI") could
  // both match — and both count as "Paid" against — the SAME single transaction,
  // double-counting `paidTotal` and showing a false "Paid" badge on an expense
  // that was never actually recorded.
  const recurringPaymentMatches = useMemo(() => {
    const usedTxnIds = new Set<string>();
    const map: Record<string, any> = {};
    activeRecurringExpenses.forEach((re: any) => {
      if (!re.isActive) return;
      const nameLower = (re.name || "").toLowerCase();
      const cat = re.category;
      const amount = Number(re.amount);
      if (amount <= 0) return; // guard: avoid division by zero in amtMatches

      const match = state.transactions.find((t: any) => {
        if (usedTxnIds.has(t.id)) return false;
        if (!t.date || !t.date.startsWith(selectedMonth) || t.type !== "debit") return false;
        const noteMatches = t.note && t.note.toLowerCase().includes(nameLower);
        const catMatches = t.category === cat;
        const tAmt = Number(t.amount);
        const amtMatches = Math.abs(tAmt - amount) / amount <= 0.05; // ±5% tolerance
        return (noteMatches || catMatches) && amtMatches;
      });
      if (match) {
        usedTxnIds.add(match.id);
        map[re.id] = match;
      }
    });
    return map;
  }, [activeRecurringExpenses, state.transactions, selectedMonth]);

  // Compute stats for recurring expenses
  const recurringStats = useMemo(() => {
    const list = activeRecurringExpenses;
    const monthlyCommitment = list
      .filter((x: any) => x.isActive)
      .reduce((acc: number, re: any) => {
        const amt = Number(re.amount) || 0;
        if (re.frequency === "weekly") return acc + amt * 4.33;
        if (re.frequency === "quarterly") return acc + amt / 3;
        if (re.frequency === "yearly") return acc + amt / 12;
        return acc + amt;
      }, 0);

    let paidCount = 0;
    let paidTotal = 0;
    let dueCount = 0;
    let dueTotal = 0;
    let overdueCount = 0;
    let overdueTotal = 0;

    const now = new Date();
    const curMonthStr = today().slice(0, 7);
    const todayDay = now.getDate();

    list.forEach((re: any) => {
      if (!re.isActive) return;
      const match = recurringPaymentMatches[re.id];
      if (match) {
        paidCount++;
        paidTotal += Number(match.amount || re.amount);
      } else {
        dueCount++;
        dueTotal += Number(re.amount);

        // Check if overdue
        if (selectedMonth === curMonthStr && todayDay > Number(re.dueDay)) {
          overdueCount++;
          overdueTotal += Number(re.amount);
        } else if (selectedMonth < curMonthStr) {
          overdueCount++;
          overdueTotal += Number(re.amount);
        }
      }
    });

    return {
      monthlyCommitment,
      annualCost: monthlyCommitment * 12,
      paidCount,
      paidTotal,
      dueCount,
      dueTotal,
      overdueCount,
      overdueTotal,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRecurringExpenses, state.transactions, selectedMonth, recurringPaymentMatches]);

  // One-click Record Payment (Quick Post)
  const handleQuickPostTransaction = async (expense: any) => {
    const now = new Date();
    const curMonthStr = today().slice(0, 7);

    // Clamp dueDay to actual days in the selected month (e.g. dueDay=31 in April → 30)
    const [selY, selM] = selectedMonth.split("-").map(Number);
    const daysInSelMonth = new Date(selY, selM, 0).getDate();
    const clampedDay = Math.min(Number(expense.dueDay), daysInSelMonth);

    let payDate = `${selectedMonth}-${String(clampedDay).padStart(2, "0")}`;
    if (selectedMonth === curMonthStr) {
      payDate = today(); // use today's local date for current month
    }

    const defaultAccId = expense.accountId || state.bankAccounts[0]?.id || "";

    setPostingId(expense.id);
    try {
      await addItem("transactions", {
        owner: expense.owner || "self",
        date: payDate,
        accountId: defaultAccId,
        amount: expense.amount,
        type: "debit",
        category: expense.category,
        note: `${expense.name} (Recurring)`,
      });
    } catch (e: any) {
      showToast?.(`Failed to record payment: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setPostingId(null);
    }
  };

  const downloadCSV = () => {
    const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      "Category,Owner,Budget (₹),Rolled Over (₹),Spent (₹),Remaining (₹),% Used,MoM Change (₹),Status",
    ];
    budgetsToUse.forEach((b: any) => {
      const spent = monthSpending[b.category] || 0;
      const rolledOver = getRolloverAmount(b);
      const budget = getEffectiveBudget(b);
      const remaining = budget - spent;
      const pctUsed = budget > 0 ? ((spent / budget) * 100).toFixed(1) : "0";
      const prev = prevMonthSpending[b.category] || 0;
      const delta = spent - prev;
      const deltaStr = prev > 0 ? (delta >= 0 ? `+${delta.toFixed(0)}` : delta.toFixed(0)) : "";
      const status =
        spent > budget ? "Over Budget" : spent > budget * 0.8 ? "Near Limit" : "On Track";
      rows.push(
        [
          q(b.category),
          q(getOwnerName(b.owner || "self")),
          q(budget),
          q(rolledOver ? rolledOver.toFixed(0) : ""),
          q(spent.toFixed(0)),
          q(remaining.toFixed(0)),
          q(pctUsed + "%"),
          q(deltaStr),
          q(status),
        ].join(",")
      );
    });
    if (totalUnbudgetedSpent > 0) {
      Object.entries(unbudgetedSpending).forEach(([cat, amt]) => {
        rows.push(
          [
            q(cat),
            q(""),
            q("No Budget"),
            q(""),
            q((amt as number).toFixed(0)),
            q("N/A"),
            q("N/A"),
            q(""),
            q("Unbudgeted"),
          ].join(",")
        );
      });
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tab-content-enter">
      {/* Dynamic Month Selection Header & Tabs Selector */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Chevron Navigation */}
          <div
            style={{
              display: "flex",
              background: "var(--t-line)",
              borderRadius: 10,
              padding: 3,
              border: "1px solid var(--t-line)",
              alignItems: "center",
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              style={{ padding: 6, borderRadius: 8, height: "auto" }}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </Button>
            <div
              style={{
                padding: "4px 14px",
                fontWeight: 800,
                fontSize: 13,
                minWidth: 120,
                textAlign: "center",
                color: THEME.ink,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Calendar size={13} color={THEME.accent} />
              {selectedMonthLabel}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              style={{ padding: 6, borderRadius: 8, height: "auto" }}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </Button>
          </div>

          {/* Today Shortcut Button */}
          {selectedMonth !== today().slice(0, 7) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMonth(today().slice(0, 7))}
              style={{
                border: "1px solid var(--t-line)",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Calendar size={13} />
              Go to Today
            </Button>
          )}
        </div>

        {/* Sub Navigation Segmented Control */}
        <div className="demat-portfolio-bar no-scrollbar" style={{ marginBottom: 0 }}>
          {(["budget", "recurring"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              aria-pressed={activeSubTab === tab}
              className={`demat-portfolio-pill ${activeSubTab === tab ? "active" : ""}`}
              style={{ padding: "6px 16px" }}
            >
              {tab === "budget" ? <BarChart2 size={13} /> : <Repeat size={13} />}
              {tab === "budget" ? "Budget Tracker" : "Fixed & Recurring"}
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/*                     1. BUDGET TRACKER TAB                */}
      {/* ======================================================== */}
      {activeSubTab === "budget" && (
        <>
          {/* Budget Alert Banner */}
          {(overBudgetCount > 0 || approachingBudgetCount > 0) && (
            <Card
              onClick={scrollToAlertCategories}
              style={{
                background:
                  overBudgetCount > 0
                    ? `color-mix(in srgb, ${THEME.rust} 4%, transparent)`
                    : `color-mix(in srgb, ${THEME.gold} 4%, transparent)`,
                border: `1px solid color-mix(in srgb, ${overBudgetCount > 0 ? THEME.rust : THEME.gold} 27%, transparent)`,
                padding: "14px 20px",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {overBudgetCount > 0 ? (
                <AlertCircle size={18} color={THEME.rust} />
              ) : (
                <AlertTriangle size={18} color={THEME.gold} />
              )}
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: overBudgetCount > 0 ? THEME.rust : THEME.gold,
                  }}
                >
                  {overBudgetCount > 0 && (
                    <span>
                      {overBudgetCount} {overBudgetCount === 1 ? "category" : "categories"} over
                      budget
                    </span>
                  )}
                  {overBudgetCount > 0 && approachingBudgetCount > 0 && (
                    <span style={{ color: THEME.muted }}>, </span>
                  )}
                  {approachingBudgetCount > 0 && (
                    <span style={{ color: THEME.gold }}>
                      {approachingBudgetCount} approaching limit
                    </span>
                  )}
                </span>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2, fontWeight: 500 }}>
                  Click to scroll to flagged categories
                </div>
              </div>
              <ArrowRight size={16} color={THEME.muted} />
            </Card>
          )}

          {/* Monthly Budget Summary Stats */}
          {budgetsToUse.length > 0 &&
            (() => {
              const utilizationPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
              const remaining = Math.max(0, totalBudget - totalSpent);
              const utilizationColor =
                utilizationPct > 100 ? THEME.rust : utilizationPct > 80 ? THEME.gold : THEME.sage;
              const utilizationFillClass =
                utilizationPct > 100
                  ? "progress-fill-rust"
                  : utilizationPct > 80
                    ? "progress-fill-gold"
                    : "progress-fill-sage";
              return (
                <Card
                  style={{
                    marginBottom: 24,
                    padding: "16px 24px",
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: THEME.muted,
                      marginBottom: 16,
                      fontWeight: 800,
                    }}
                  >
                    Monthly Budget Summary
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: 16,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: THEME.muted,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        Total Budget
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 20,
                          fontWeight: 600,
                          color: THEME.accent,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={totalBudget} variant="full" />
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: THEME.muted,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        Total Spent
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 20,
                          fontWeight: 600,
                          color: totalSpent > totalBudget ? THEME.rust : THEME.ink,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={totalSpent} variant="full" />
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: THEME.muted,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        Remaining
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 20,
                          fontWeight: 600,
                          color: remaining > 0 ? THEME.sage : THEME.rust,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {totalSpent > totalBudget ? (
                          <>
                            -<Money value={totalSpent - totalBudget} variant="full" />
                          </>
                        ) : (
                          <Money value={remaining} variant="full" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: THEME.muted,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        Utilization
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 20,
                            fontWeight: 600,
                            color: utilizationColor,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {utilizationPct.toFixed(0)}%
                        </div>
                        <div className="progress-track" style={{ width: 60 }}>
                          <div
                            className={`progress-fill ${utilizationFillClass}`}
                            style={{ width: `${Math.min(utilizationPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })()}

          {/* Budget Inheritance Notification Banner */}
          {isInherited && budgetsToUse.length > 0 && (
            <Card
              style={{
                background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
                border: `1px dashed color-mix(in srgb, ${THEME.accent} 33%, transparent)`,
                padding: "14px 20px",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                borderRadius: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Repeat
                  size={18}
                  color={THEME.accent}
                  style={{ animation: "spin 12s linear infinite" }}
                />
                <span style={{ fontWeight: 600, fontSize: 13.5, color: THEME.ink }}>
                  Showing inherited budget limits from{" "}
                  <strong>
                    {inheritedFrom === "Default Template"
                      ? "Legacy Baseline"
                      : new Date(inheritedFrom + "-01").toLocaleDateString("en-IN", {
                          month: "long",
                          year: "numeric",
                        })}
                  </strong>
                  .
                </span>
              </div>
              <Button
                onClick={handleLockAndCustomize}
                disabled={lockingBudgets}
                loading={lockingBudgets}
                size="sm"
                variant="ghost"
                style={{
                  border: `1px solid ${THEME.accent}`,
                  color: THEME.accent,
                  fontWeight: 700,
                  borderRadius: 8,
                }}
              >
                Lock & Customize this Month
              </Button>
            </Card>
          )}

          <SectionTitle
            sub={`Set monthly limits per category and track real spending for ${selectedMonthLabel}`}
            rightElement={
              budgetsToUse.length > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Button
                    onClick={downloadCSV}
                    variant="ghost"
                    icon={<Download size={14} />}
                    style={{ border: "1px solid var(--t-line)", borderRadius: 8 }}
                  >
                    Export CSV
                  </Button>
                  <Button
                    onClick={() => setShowAddBudget(true)}
                    variant="accent"
                    icon={<Plus size={14} />}
                  >
                    Add Budget Category
                  </Button>
                </div>
              )
            }
          >
            Budgeting
          </SectionTitle>

          {/* Summary Tiles */}
          {(() => {
            const allSpent = totalSpent + totalUnbudgetedSpent;
            const savingsAmt = selectedMonthIncome - allSpent;
            const savingsRate =
              selectedMonthIncome > 0 ? (savingsAmt / selectedMonthIncome) * 100 : null;
            const savingsColor =
              savingsRate === null
                ? THEME.muted
                : savingsRate >= 20
                  ? THEME.sage
                  : savingsRate >= 10
                    ? THEME.gold
                    : THEME.rust;
            return (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 14,
                  marginBottom: 28,
                }}
              >
                {[
                  {
                    label: "Total Budgeted",
                    value: fmtINRFull(totalBudget),
                    numericValue: totalBudget,
                    formatValue: fmtINRFull,
                    sub: `Target for ${selectedMonthLabel}`,
                    color: THEME.accent,
                    Icon: Target,
                  },
                  {
                    label: "Spent in Month",
                    value: fmtINRFull(allSpent),
                    numericValue: allSpent,
                    formatValue: fmtINRFull,
                    sub:
                      `${totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}% of budget used` +
                      (totalUnbudgetedSpent > 0
                        ? ` · ${privacyMode ? "••••" : fmtINRFull(totalUnbudgetedSpent)} unbudgeted`
                        : ""),
                    color: totalSpent > totalBudget ? THEME.rust : THEME.accent,
                    Icon: Receipt,
                  },
                  {
                    label: "Remaining Balance",
                    value: fmtINRFull(Math.max(0, totalBudget - totalSpent)),
                    numericValue: Math.max(0, totalBudget - totalSpent),
                    formatValue: fmtINRFull,
                    sub: totalBudget - totalSpent > 0 ? "Left to spend" : "Budget exceeded",
                    color: totalBudget - totalSpent > 0 ? THEME.sage : THEME.rust,
                    Icon: Wallet,
                  },
                  {
                    label: "Active Buckets",
                    value: String(budgetsToUse.length),
                    numericValue: budgetsToUse.length,
                    formatValue: (n: number) => Math.round(n).toString(),
                    sub:
                      totalUnbudgetedSpent > 0
                        ? `+${privacyMode ? "••••" : fmtINRFull(totalUnbudgetedSpent)} unbudgeted`
                        : "Budgeted categories",
                    color: THEME.muted,
                    Icon: BarChart2,
                  },
                  {
                    label: "Savings Rate",
                    value: savingsRate !== null ? `${savingsRate.toFixed(1)}%` : "—",
                    numericValue: savingsRate !== null ? savingsRate : undefined,
                    formatValue: (n: number) => `${n.toFixed(1)}%`,
                    sub:
                      selectedMonthIncome > 0
                        ? `Income: ${privacyMode ? "••••" : fmtINRFull(selectedMonthIncome)}`
                        : "Add income data",
                    color: savingsColor,
                    Icon: TrendingUp,
                  },
                ].map(({ label, value, numericValue, formatValue, sub, color, Icon }) => (
                  <StatCard
                    key={label}
                    label={label}
                    value={value}
                    numericValue={numericValue}
                    formatValue={formatValue}
                    sub={sub}
                    color={color}
                    icon={<Icon />}
                  />
                ))}
              </div>
            );
          })()}

          {/* Burn Rate Widget */}
          {totalBudget > 0 &&
            (() => {
              const now = new Date();
              const currentMonthStr = today().slice(0, 7);
              const isCurrentMonth = selectedMonth === currentMonthStr;

              const [selYear, selMonth] = selectedMonth.split("-").map(Number);
              const daysInMonth = new Date(selYear, selMonth, 0).getDate();
              const daysPassed = isCurrentMonth ? now.getDate() : daysInMonth;

              const monthElapsedPct = (daysPassed / daysInMonth) * 100;
              const spentPct = (totalSpent / totalBudget) * 100;
              const onTrack = spentPct <= monthElapsedPct + 5;
              const burnColor =
                spentPct > monthElapsedPct + 10
                  ? THEME.rust
                  : spentPct > monthElapsedPct - 5
                    ? THEME.gold
                    : THEME.sage;
              const r = 44,
                sz = 110,
                circ = 2 * Math.PI * r;

              return (
                <Card style={{ marginBottom: 32, padding: "28px 32px" }}>
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: THEME.muted,
                      marginBottom: 24,
                      fontWeight: 800,
                    }}
                  >
                    Budget Burn Rate — Day {daysPassed} of {daysInMonth} ({selectedMonthLabel})
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 48, flexWrap: "wrap" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <svg
                        width={sz}
                        height={sz}
                        style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.05))" }}
                      >
                        <circle
                          cx={sz / 2}
                          cy={sz / 2}
                          r={r}
                          fill="none"
                          stroke={THEME.line}
                          strokeWidth="10"
                        />
                        <circle
                          cx={sz / 2}
                          cy={sz / 2}
                          r={r}
                          fill="none"
                          stroke={THEME.muted}
                          strokeWidth="10"
                          opacity="0.15"
                          strokeDasharray={`${(monthElapsedPct / 100) * circ} ${circ}`}
                          strokeDashoffset={circ / 4}
                          strokeLinecap="round"
                        />
                        <circle
                          cx={sz / 2}
                          cy={sz / 2}
                          r={r}
                          fill="none"
                          stroke={burnColor}
                          strokeWidth="10"
                          strokeDasharray={`${Math.min(spentPct / 100, 1) * circ} ${circ}`}
                          strokeDashoffset={circ / 4}
                          strokeLinecap="round"
                          style={{
                            transition: "stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                        />
                        <text
                          x={sz / 2}
                          y={sz / 2 - 4}
                          textAnchor="middle"
                          fontSize="18"
                          fontWeight="900"
                          fill={THEME.ink}
                        >
                          {animatedSpentPct.toFixed(0)}%
                        </text>
                        <text
                          x={sz / 2}
                          y={sz / 2 + 14}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="700"
                          fill={THEME.muted}
                          style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                        >
                          spent
                        </text>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 280 }}>
                      <div style={{ display: "grid", gap: 14 }}>
                        {[
                          {
                            label: "Month progress",
                            val: monthElapsedPct.toFixed(0) + "%",
                            color: THEME.muted,
                            isCurrency: false,
                          },
                          {
                            label: "Budget spent",
                            val: spentPct.toFixed(0) + "%",
                            color: burnColor,
                            isCurrency: false,
                          },
                          {
                            label: "Spent so far",
                            val: <Money value={totalSpent} variant="full" />,
                            color: THEME.ink,
                          },
                          {
                            label: "Daily average",
                            val: (
                              <>
                                <Money value={daysPassed > 0 ? totalSpent / daysPassed : 0} variant="full" />{" "}
                                / day
                              </>
                            ),
                            color: THEME.muted,
                          },
                          {
                            label: "Projected month-end",
                            val: (
                              <Money
                                value={daysPassed > 0 ? (totalSpent / daysPassed) * daysInMonth : 0}
                                variant="full"
                              />
                            ),
                            color: burnColor,
                          },
                        ].map(({ label, val, color }) => (
                          <div
                            key={label}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: 14,
                            }}
                          >
                            <span style={{ color: THEME.muted, fontWeight: 600 }}>{label}</span>
                            <span
                              style={{ fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}
                            >
                              {val}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div
                        style={{
                          marginTop: 20,
                          fontSize: 13,
                          padding: "12px 16px",
                          borderRadius: 10,
                          background: onTrack
                            ? `color-mix(in srgb, ${THEME.sage} 6%, transparent)`
                            : `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
                          color: onTrack ? THEME.sage : THEME.rust,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {onTrack ? <Check size={16} /> : <AlertCircle size={16} />}
                        {onTrack
                          ? "Spending is perfectly in line with the month progress."
                          : "You are overpacing — spending faster than month progress."}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })()}

          {/* Empty State vs Budget List */}
          {budgetsToUse.length === 0 ? (
            <EmptyState
              icon={BarChart2}
              title={`No Budgets for ${selectedMonthLabel}`}
              description="Set monthly spending limits per category — Food, Rent, Entertainment, Transport — and get real-time alerts before you overspend."
              pills={["Category Budgets", "Monthly Limits", "Spend vs Budget", "Burn Rate Chart"]}
              buttonLabel="Create Budget"
              onAdd={() => setShowAddBudget(true)}
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(380px, 100%), 1fr))",
                gap: 16,
              }}
            >
              {budgetsToUse.map((b: any) => {
                const spent = monthSpending[b.category] || 0;
                const prevSpent = prevMonthSpending[b.category] || 0;
                const rolledOver = getRolloverAmount(b);
                const budget = getEffectiveBudget(b);
                const pct = budget > 0 ? (spent / budget) * 100 : 0;
                const over = pct > 100;
                const barColor = over ? THEME.rust : pct > 90 ? THEME.gold : THEME.sage;
                const Icon = getCatIcon(b.category);

                const now = new Date();
                const currentMonthStr = today().slice(0, 7);
                const isCurrentMonth = selectedMonth === currentMonthStr;

                const [selYear, selMonth] = selectedMonth.split("-").map(Number);
                const daysInMonth = new Date(selYear, selMonth, 0).getDate();
                const daysPassed = isCurrentMonth ? now.getDate() : daysInMonth;

                const projected = daysPassed > 0 ? (spent / daysPassed) * daysInMonth : 0;
                const projectedPct = budget > 0 ? (projected / budget) * 100 : 0;

                // Per-category status badge
                const statusBadge = (() => {
                  if (over) {
                    return {
                      label: `Over by ${privacyMode ? "••••" : fmtINRFull(spent - budget)}`,
                      color: THEME.rust,
                      icon: AlertCircle,
                      variant: "danger" as const,
                    };
                  } else if (pct >= 80) {
                    return {
                      label: `${pct.toFixed(0)}% used`,
                      color: THEME.gold,
                      icon: AlertTriangle,
                      variant: "warning" as const,
                    };
                  } else {
                    return {
                      label: "On track",
                      color: THEME.sage,
                      icon: CheckCircle2,
                      variant: "success" as const,
                    };
                  }
                })();

                const StatusIcon = statusBadge.icon;
                const isHighlighted = highlightedCategory === b.category;

                return (
                  // `Card` is a plain function component (no forwardRef), so a `ref` passed
                  // directly to it is silently dropped by React — that previously left
                  // `categoryRefs` permanently empty and made "click to scroll to flagged
                  // categories" (scrollToAlertCategories) a dead feature. Carrying the ref on
                  // this wrapper div instead fixes the scroll-into-view + highlight pulse.
                  <div
                    key={b.id}
                    ref={(el: HTMLDivElement | null) => {
                      categoryRefs.current[b.category] = el;
                    }}
                  >
                  <Card
                    style={{
                      padding: "18px 20px",
                      borderTop: `3px solid ${barColor}`,
                      position: "relative",
                      transition: "box-shadow 0.3s ease, transform 0.3s ease",
                      ...(isHighlighted
                        ? {
                            boxShadow: `0 0 0 2px ${barColor}, 0 4px 16px color-mix(in srgb, ${barColor} 20%, transparent)`,
                            transform: "scale(1.01)",
                          }
                        : {}),
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      {/* Icon */}
                      <div
                        style={{
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <Icon size={22} color={barColor} />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 2,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 800,
                                fontSize: 16,
                                color: THEME.ink,
                                letterSpacing: "-0.01em",
                              }}
                            >
                              {b.category}
                            </span>
                            {b.budgetMonth !== selectedMonth && (
                              <Badge variant="muted" style={{ fontSize: 9 }}>
                                INHERITED
                              </Badge>
                            )}
                            {/* Owner tag — only meaningful when viewing the combined "All"
                                family profile, where budgets from multiple members are mixed
                                together in the same category list. */}
                            {activeProfile === "all" && (
                              <Badge variant="muted" style={{ fontSize: 9 }}>
                                {getOwnerName(b.owner || "self")}
                              </Badge>
                            )}
                            {/* Per-Category Warning Badge */}
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                color: statusBadge.color,
                                background: `color-mix(in srgb, ${statusBadge.color} 7%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${statusBadge.color} 20%, transparent)`,
                                padding: "2px 8px",
                                borderRadius: "var(--radius-xs)",
                              }}
                            >
                              <StatusIcon size={10} />
                              {statusBadge.label}
                            </span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontWeight: 900,
                                color: over ? THEME.rust : THEME.ink,
                                fontSize: 16,
                              }}
                            >
                              {pct.toFixed(0)}%
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                          <Money value={spent} variant="full" />{" "}
                          <span style={{ fontWeight: 400, opacity: 0.7 }}>of</span>{" "}
                          <Money value={budget} variant="full" />
                          <span style={{ marginLeft: 8, color: over ? THEME.rust : THEME.sage }}>
                            {over ? (
                              <>
                                (<Money value={spent - budget} variant="full" /> over)
                              </>
                            ) : (
                              <>
                                (<Money value={budget - spent} variant="full" /> left)
                              </>
                            )}
                          </span>
                        </div>
                        {rolledOver > 0 && (
                          <div
                            style={{
                              fontSize: 10.5,
                              color: THEME.accent,
                              fontWeight: 700,
                              marginTop: 2,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Repeat size={10} />
                            <Money value={rolledOver} variant="full" /> rolled over from last month
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditBudget(b)}
                          style={{ padding: 6 }}
                          title="Edit"
                          aria-label={`Edit ${b.category} budget`}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={removingBudget}
                          onClick={() =>
                            setConfirmAction({
                              message: `Delete "${b.category}" budget? This cannot be undone.`,
                              onConfirm: () => handleRemoveBudget(b),
                            })
                          }
                          style={{ padding: 6, color: THEME.rust }}
                          title="Delete"
                          aria-label={`Delete ${b.category} budget`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="progress-track" style={{ marginTop: 16, marginBottom: 12 }}>
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
                      />
                    </div>

                    {spent > 0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                          color: THEME.muted,
                          fontWeight: 600,
                          opacity: 0.8,
                        }}
                      >
                        <span>
                          Day {daysPassed}/{daysInMonth} · Projected{" "}
                          <Money value={projected} variant="full" />
                        </span>
                        <span style={{ color: projectedPct > 105 ? THEME.rust : THEME.sage }}>
                          {projectedPct.toFixed(0)}% expected
                        </span>
                      </div>
                    )}

                    {/* Projected Month-End Spending Alert */}
                    {isCurrentMonth && spent > 0 && budget > 0 && projected > budget && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          marginTop: 8,
                          padding: "8px 12px",
                          borderRadius: 8,
                          background: `color-mix(in srgb, ${THEME.rust} 3%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${THEME.rust} 13%, transparent)`,
                          color: THEME.rust,
                          fontWeight: 600,
                        }}
                      >
                        <Target size={12} />
                        <span>
                          At this pace, you'll spend <Money value={projected} variant="full" />{" "}
                          <span style={{ fontWeight: 800 }}>
                            (<Money value={projected - budget} variant="full" /> over budget)
                          </span>
                        </span>
                      </div>
                    )}

                    {prevSpent > 0 &&
                      (() => {
                        const delta = spent - prevSpent;
                        const isUp = delta > 0;
                        return (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              marginTop: 6,
                              color: isUp ? THEME.rust : THEME.sage,
                              fontWeight: 700,
                            }}
                          >
                            {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            <span>
                              {isUp ? "+" : ""}
                              <Money value={Math.abs(delta)} variant="full" /> vs last month
                            </span>
                            <span style={{ color: THEME.muted, fontWeight: 400, marginLeft: 2 }}>
                              (<Money value={prevSpent} variant="full" /> last month)
                            </span>
                          </div>
                        );
                      })()}
                  </Card>
                  </div>
                );
              })}
            </div>
          )}

          {/* Unbudgeted Spending — categories with real spend but no budget line */}
          {totalUnbudgetedSpent > 0 && (
            <Card
              style={{
                marginTop: 24,
                padding: "18px 24px",
                border: `1px dashed color-mix(in srgb, ${THEME.gold} 33%, transparent)`,
                background: `color-mix(in srgb, ${THEME.gold} 3%, transparent)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle size={16} color={THEME.gold} />
                  <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                    Unbudgeted Spending — <Money value={totalUnbudgetedSpent} variant="full" />
                  </span>
                </div>
                <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                  {Object.keys(unbudgetedSpending).length}{" "}
                  {Object.keys(unbudgetedSpending).length === 1 ? "category" : "categories"} not
                  tracked
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.entries(unbudgetedSpending)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .map(([cat, amt]) => {
                    const Icon = getCatIcon(cat);
                    return (
                      <div
                        key={cat}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          borderRadius: 8,
                          background: "rgba(128,128,128,0.06)",
                          border: "1px solid var(--t-line)",
                          fontSize: 12,
                          fontWeight: 700,
                          color: THEME.ink,
                        }}
                      >
                        <Icon size={13} color={THEME.gold} />
                        <span>{cat}</span>
                        <span style={{ color: THEME.gold }}>
                          <Money value={amt as number} variant="full" />
                        </span>
                      </div>
                    );
                  })}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  color: THEME.muted,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <HelpCircle size={11} />
                Add budget categories for these to get a full spending picture.
              </div>
            </Card>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/*               2. FIXED & RECURRING EXPENSES TAB          */}
      {/* ======================================================== */}
      {activeSubTab === "recurring" && (
        <>
          <SectionTitle
            sub="Register EMIs, maid salaries, house rent, and utility bills that repeat over time"
            rightElement={
              <Button
                onClick={() => setShowAddRecurring(true)}
                variant="accent"
                icon={<Plus size={14} />}
              >
                Add Recurring Expense
              </Button>
            }
          >
            Fixed & Recurring Expenses
          </SectionTitle>

          {/* Stats Tiles */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 28,
            }}
          >
            {[
              {
                label: "Monthly Commitment",
                value: fmtINRFull(recurringStats.monthlyCommitment),
                numericValue: recurringStats.monthlyCommitment,
                formatValue: fmtINRFull,
                sub: "Sum of active recurring costs",
                color: THEME.accent,
                Icon: Repeat,
              },
              {
                label: "Annual Equivalent",
                value: fmtINRFull(recurringStats.annualCost),
                numericValue: recurringStats.annualCost,
                formatValue: fmtINRFull,
                sub: "Projected yearly outgo",
                color: THEME.gold,
                Icon: Calendar,
              },
              {
                label: "Paid This Month",
                value: `${recurringStats.paidCount} / ${activeRecurringExpenses.filter((x: any) => x.isActive).length}`,
                numericValue: undefined as number | undefined,
                formatValue: undefined as ((n: number) => string) | undefined,
                sub: `Recorded: ${privacyMode ? "••••" : fmtINRFull(recurringStats.paidTotal)}`,
                color: THEME.sage,
                Icon: CheckCircle2,
              },
              {
                label: "Overdue / Unpaid",
                value: String(recurringStats.overdueCount),
                numericValue: recurringStats.overdueCount,
                formatValue: (n: number) => Math.round(n).toString(),
                sub: `Pending: ${privacyMode ? "••••" : fmtINRFull(recurringStats.overdueTotal)}`,
                color: recurringStats.overdueCount > 0 ? THEME.rust : THEME.sage,
                Icon: AlertCircle,
              },
            ].map(({ label, value, numericValue, formatValue, sub, color, Icon }) => (
              <StatCard
                key={label}
                label={label}
                value={value}
                numericValue={numericValue}
                formatValue={formatValue}
                sub={sub}
                color={color}
                icon={<Icon />}
              />
            ))}
          </div>

          {activeRecurringExpenses.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="No Recurring Expenses Active"
              description="Define regular bills, rent, household wages, gym memberships or custom EMIs and quick-post them directly as ledger transactions."
              pills={["Fixed Expenses", "Custom Ranges", "Quick Record", "Ledger Auto-Match"]}
              buttonLabel="Add Recurring Expense"
              onAdd={() => setShowAddRecurring(true)}
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(380px, 100%), 1fr))",
                gap: 16,
              }}
            >
              {activeRecurringExpenses.map((re: any) => {
                const match = recurringPaymentMatches[re.id];
                const hasPaid = !!match;

                const now = new Date();
                const curMonthStr = today().slice(0, 7);
                const todayDay = now.getDate();

                let statusText = "Upcoming";
                let statusColor = THEME.gold;
                let statusBg = `color-mix(in srgb, ${THEME.gold} 8%, transparent)`;

                if (hasPaid) {
                  statusText = "Paid";
                  statusColor = THEME.sage;
                  statusBg = `color-mix(in srgb, ${THEME.sage} 8%, transparent)`;
                } else if (!re.isActive) {
                  statusText = "Paused";
                  statusColor = THEME.muted;
                  statusBg = `color-mix(in srgb, ${THEME.muted} 8%, transparent)`;
                } else {
                  // Active and Unpaid
                  if (selectedMonth < curMonthStr) {
                    statusText = "Unpaid";
                    statusColor = THEME.rust;
                    statusBg = `color-mix(in srgb, ${THEME.rust} 8%, transparent)`;
                  } else if (selectedMonth === curMonthStr) {
                    if (todayDay > Number(re.dueDay)) {
                      statusText = "Overdue";
                      statusColor = THEME.rust;
                      statusBg = `color-mix(in srgb, ${THEME.rust} 8%, transparent)`;
                    } else {
                      const daysLeft = Number(re.dueDay) - todayDay;
                      statusText =
                        daysLeft === 0
                          ? "Due Today"
                          : daysLeft === 1
                            ? "Due Tomorrow"
                            : `Due in ${daysLeft} days`;
                      statusColor = THEME.gold;
                      statusBg = `color-mix(in srgb, ${THEME.gold} 8%, transparent)`;
                    }
                  } else {
                    // Future month
                    statusText = "Scheduled";
                    statusColor = THEME.accent;
                    statusBg = `color-mix(in srgb, ${THEME.accent} 8%, transparent)`;
                  }
                }

                const bank = state.bankAccounts.find((b: any) => b.id === re.accountId);

                return (
                  <Card
                    key={re.id}
                    style={{
                      padding: "18px 20px",
                      borderTop: `3px solid ${re.isActive ? (hasPaid ? THEME.sage : statusColor) : THEME.line}`,
                      opacity: re.isActive ? 1 : 0.7,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      {/* Category icon */}
                      <div
                        style={{
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {(() => {
                          const CatIcon =
                            re.category === "Rent"
                              ? Home
                              : re.category === "EMI"
                                ? CreditCard
                                : re.category === "Bills"
                                  ? Zap
                                  : Wallet;
                          return (
                            <CatIcon size={20} color={hasPaid ? THEME.sage : statusColor} />
                          );
                        })()}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}
                        >
                          <span
                            title={re.name}
                            style={{
                              fontWeight: 800,
                              fontSize: 16,
                              color: THEME.ink,
                              letterSpacing: "-0.01em",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {re.name}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: statusColor,
                              background: statusBg,
                              padding: "2px 8px",
                              borderRadius: "var(--radius-xs)",
                              textTransform: "uppercase",
                              letterSpacing: "0.02em",
                            }}
                          >
                            {statusText}
                          </span>
                          {activeProfile === "all" && (
                            <Badge variant="muted" style={{ fontSize: 9 }}>
                              {getOwnerName(re.owner || "self")}
                            </Badge>
                          )}
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            color: THEME.muted,
                            fontWeight: 600,
                            display: "flex",
                            flexWrap: "wrap",
                            columnGap: 6,
                            rowGap: 2,
                            alignItems: "center",
                          }}
                        >
                          <span style={{ color: THEME.ink, fontWeight: 800 }}>
                            <Money value={re.amount} variant="full" />
                          </span>
                          <span style={{ opacity: 0.4 }}>·</span>
                          <span style={{ textTransform: "capitalize" }}>
                            {re.frequency} (Day {re.dueDay})
                          </span>
                          {bank && (
                            <>
                              <span style={{ opacity: 0.4 }}>·</span>
                              <span
                                style={{
                                  fontSize: 11,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                }}
                              >
                                <Landmark size={10} /> {bank.bankName}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Repeat Dates Range */}
                        <div
                          style={{
                            fontSize: 11,
                            color: THEME.muted,
                            marginTop: 4,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            opacity: 0.9,
                          }}
                        >
                          <Calendar size={10} />
                          <span>{fmtDate(re.startDate)}</span>
                          {re.endDate ? (
                            <>
                              <ArrowRight size={10} style={{ margin: "0 2px" }} />
                              <span>{fmtDate(re.endDate)}</span>
                            </>
                          ) : (
                            <span style={{ fontStyle: "italic", marginLeft: 4 }}>
                              (No end date)
                            </span>
                          )}
                        </div>

                        {/* Match details if paid */}
                        {hasPaid && (
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 11,
                              padding: "6px 10px",
                              borderRadius: 6,
                              background: `color-mix(in srgb, ${THEME.sage} 2%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${THEME.sage} 13%, transparent)`,
                              color: THEME.sage,
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <CheckCircle2 size={11} />
                            <span>Matched:</span>
                            <span
                              style={{ textDecoration: "underline", cursor: "pointer" }}
                              title={`Recorded on ${match.date}: ${match.note}`}
                            >
                              <Money value={match.amount} variant="full" /> on {fmtDate(match.date)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          flexShrink: 0,
                          alignItems: "flex-end",
                        }}
                      >
                        <div style={{ display: "flex", gap: 2 }}>
                          {/* Pause / Play */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRecurringActive(re)}
                            loading={togglingRecurringId === re.id}
                            disabled={togglingRecurringId === re.id || removingRecurringId === re.id}
                            style={{ padding: 6, color: re.isActive ? THEME.gold : THEME.sage }}
                            title={re.isActive ? "Pause" : "Resume"}
                            aria-label={
                              re.isActive ? `Pause ${re.name}` : `Resume ${re.name}`
                            }
                          >
                            {re.isActive ? <Pause size={14} /> : <Play size={14} />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditRecurring(re)}
                            style={{ padding: 6 }}
                            title="Edit"
                            aria-label={`Edit ${re.name}`}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfirmAction({
                                message: `Delete "${re.name}"? This cannot be undone.`,
                                onConfirm: () => removeRecurring(re),
                              })
                            }
                            loading={removingRecurringId === re.id}
                            disabled={togglingRecurringId === re.id || removingRecurringId === re.id}
                            style={{ padding: 6, color: THEME.rust }}
                            title="Delete"
                            aria-label={`Delete ${re.name}`}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>

                        {/* Quick Post Button */}
                        {re.isActive && !hasPaid && selectedMonth <= curMonthStr && (
                          <Button
                            variant="accent"
                            size="xs"
                            onClick={() => handleQuickPostTransaction(re)}
                            loading={postingId === re.id}
                            disabled={postingId === re.id}
                            style={{
                              padding: "4px 8px",
                              fontSize: 11,
                              borderRadius: 6,
                              background:
                                statusText === "Overdue" || statusText === "Unpaid"
                                  ? THEME.rust
                                  : THEME.accent,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <CreditCard size={11} /> Quick Pay
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ── Auto-derived Rental Commitments ── */}
          {(state.rentedProperties || []).filter((p: any) => p.isActive !== false).length > 0 && (
            <div style={{ marginTop: 36 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Home size={15} color={THEME.rust} />
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                  Rental Commitments · {selectedMonthLabel}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: THEME.muted,
                    background: "rgba(128,128,128,0.08)",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontWeight: 600,
                  }}
                >
                  Auto-derived from agreements
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))",
                  gap: 12,
                }}
              >
                {(state.rentedProperties || [])
                  .filter((p: any) => p.isActive !== false)
                  .map((p: any) => {
                    const effectiveRent = getEffectiveRent(p, selectedMonth);
                    const paidThisMonth = (p.payments || [])
                      .filter((pay: any) => pay.date && pay.date.startsWith(selectedMonth))
                      .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
                    const isPaid = paidThisMonth > 0;
                    const isOverpaid = isPaid && paidThisMonth > effectiveRent * 1.01;
                    const now = new Date();
                    const curMonthStr = today().slice(0, 7);
                    const dueDay = Number(p.dueDay || 5);
                    const isOverdue =
                      !isPaid &&
                      selectedMonth <= curMonthStr &&
                      (selectedMonth < curMonthStr || now.getDate() > dueDay);
                    const statusColor = isPaid ? THEME.sage : isOverdue ? THEME.rust : THEME.gold;
                    const rentDisplay = (n: number) => (privacyMode ? "••••" : fmtINRFull(n));
                    const statusText = isPaid
                      ? `Paid · ${rentDisplay(paidThisMonth)}`
                      : isOverdue
                        ? `Overdue · ${rentDisplay(effectiveRent)} due`
                        : `Due on ${dueDay}${dueDay % 10 === 1 && dueDay !== 11 ? "st" : dueDay % 10 === 2 && dueDay !== 12 ? "nd" : dueDay % 10 === 3 && dueDay !== 13 ? "rd" : "th"} · ${rentDisplay(effectiveRent)}`;

                    // Tier info
                    const tiers = p.escalationTiers;
                    const tierIdx =
                      tiers?.length > 1
                        ? ((): number => {
                            if (!p.agreementStart) return -1;
                            const [refY, refM] = selectedMonth.split("-").map(Number);
                            const [sY, sM] = p.agreementStart.slice(0, 7).split("-").map(Number);
                            const elapsed = (refY - sY) * 12 + (refM - sM);
                            let cum = 0;
                            for (let i = 0; i < tiers.length; i++) {
                              cum += Number(tiers[i].durationMonths || 12);
                              if (elapsed < cum) return i;
                            }
                            return tiers.length - 1;
                          })()
                        : -1;

                    return (
                      <div
                        key={p.id}
                        style={{
                          padding: "14px 16px",
                          borderRadius: 12,
                          background: `color-mix(in srgb, ${statusColor} 4%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${statusColor} 20%, transparent)`,
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", color: statusColor, flexShrink: 0 }}>
                          <Home size={22} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                            {p.propertyName}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: THEME.muted,
                              fontWeight: 600,
                              marginTop: 2,
                            }}
                          >
                            {p.landlordName || p.landlords?.[0]?.name || "Landlord"}
                            {tierIdx >= 0 && tiers && (
                              <span style={{ marginLeft: 6, color: THEME.accent, fontWeight: 700 }}>
                                · Y{tierIdx + 1}: <Money value={tiers[tierIdx].amount} variant="full" />/mo
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: statusColor,
                              marginTop: 4,
                            }}
                          >
                            {statusText}
                          </div>
                          {isOverpaid && (
                            <div
                              style={{
                                fontSize: 10,
                                color: THEME.gold,
                                fontWeight: 600,
                                marginTop: 2,
                              }}
                            >
                              Paid <Money value={paidThisMonth - effectiveRent} variant="full" /> extra this
                              month
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: statusColor }}>
                            <Money value={effectiveRent} variant="full" />
                          </div>
                          <div
                            style={{
                              fontSize: 9,
                              color: THEME.muted,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            per month
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              {/* Total commitment footer */}
              {(state.rentedProperties || []).filter((p: any) => p.isActive !== false).length > 1 &&
                (() => {
                  const total = (state.rentedProperties || [])
                    .filter((p: any) => p.isActive !== false)
                    .reduce((s: number, p: any) => s + getEffectiveRent(p, selectedMonth), 0);
                  return (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "rgba(128,128,128,0.04)",
                        border: `1px solid ${THEME.line}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>
                        Total rental commitment this month
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: THEME.rust }}>
                        <Money value={total} variant="full" />
                      </span>
                    </div>
                  );
                })()}
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/*                        MODALS                            */}
      {/* ======================================================== */}

      {/* 1. Add Budget Category Modal */}
      {showAddBudget && (
        <BudgetModal
          existing={budgetsToUse.map((b: any) => b.category)}
          activeProfile={activeProfile}
          onClose={() => setShowAddBudget(false)}
          onSave={saveNewBudget}
          saving={savingNewBudget}
        />
      )}

      {/* 2. Edit Budget Category Modal */}
      {editBudget && (
        <BudgetModal
          existing={budgetsToUse
            .filter((b: any) => b.id !== editBudget.id)
            .map((b: any) => b.category)}
          initialValues={editBudget}
          activeProfile={activeProfile}
          onClose={() => setEditBudget(null)}
          onSave={saveBudgetEdit}
          saving={savingBudgetEdit}
        />
      )}

      {/* 3. Add Recurring Expense Modal */}
      {showAddRecurring && (
        <RecurringModal
          accounts={state.bankAccounts}
          activeProfile={activeProfile}
          onClose={() => setShowAddRecurring(false)}
          onSave={saveNewRecurring}
          saving={savingNewRecurring}
        />
      )}

      {/* 4. Edit Recurring Expense Modal */}
      {editRecurring && (
        <RecurringModal
          accounts={state.bankAccounts}
          initialValues={editRecurring}
          activeProfile={activeProfile}
          onClose={() => setEditRecurring(null)}
          onSave={saveRecurringEdit}
          saving={savingRecurringEdit}
        />
      )}
      {confirmAction && (
        <ConfirmDialog
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

// ── BUDGET MODAL COMPONENT ──
export function BudgetModal({
  onClose,
  onSave,
  initialValues = null,
  existing = [],
  activeProfile = "all",
  saving = false,
}: any) {
  const { transactionCategories: allCats, familyProfiles } = useMasterData();
  const availableCats = allCats.filter((c: string) => !existing.includes(c));
  const defaultCat = initialValues?.category || availableCats[0] || allCats[0];
  // Default the owner to whichever family profile is currently active, so a budget
  // added while viewing e.g. "Wife" doesn't silently get owner="self" and vanish
  // from that member's filtered view (the per-profile filter in useMetrics.ts
  // matches on exact owner id).
  const defaultOwner = activeProfile !== "all" ? activeProfile : "self";
  const [f, setF] = useState(
    initialValues
      ? {
          owner: initialValues.owner || "self",
          category: initialValues.category,
          monthly: initialValues.monthly || "",
          rollover: !!initialValues.rollover,
        }
      : { owner: defaultOwner, category: defaultCat, monthly: "", rollover: false }
  );

  return (
    <Modal title={initialValues ? "Edit Budget Limit" : "Add Budget Category"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select
          className="form-input"
          value={f.owner || "self"}
          onChange={(e) => setF({ ...f, owner: e.target.value })}
        >
          {familyProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {formatProfileOption(p)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Category">
        <select
          className="form-input"
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
        >
          {initialValues && <option key={initialValues.category}>{initialValues.category}</option>}
          {availableCats
            .filter((c: string) => !initialValues || c !== initialValues.category)
            .map((c: string) => (
              <option key={c}>{c}</option>
            ))}
          {availableCats.length === 0 && !initialValues && (
            <option disabled>All categories budgeted</option>
          )}
        </select>
      </Field>
      <Field label="Monthly Limit (₹)">
        <input
          className="form-input"
          type="number"
          min="0"
          inputMode="decimal"
          value={f.monthly}
          onChange={(e) => setF({ ...f, monthly: e.target.value })}
          placeholder="e.g. 5000"
          autoFocus
        />
      </Field>
      <Field label="Rollover">
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={f.rollover}
            onChange={(e) => setF({ ...f, rollover: e.target.checked })}
          />
          <span style={{ fontSize: 13 }}>
            Carry over unused amount into next month's budget
          </span>
        </label>
      </Field>
      <ModalActions
        onSave={() => f.monthly && Number(f.monthly) > 0 && onSave(f)}
        onClose={onClose}
        disabled={!(Number(f.monthly) > 0) || saving}
        loading={saving}
        saveLabel={initialValues ? "Save Changes" : "Add Budget"}
      />
    </Modal>
  );
}

// ── RECURRING EXPENSES MODAL COMPONENT ──
export function RecurringModal({
  onClose,
  onSave,
  initialValues = null,
  accounts = [],
  activeProfile = "all",
  saving = false,
}: any) {
  const { transactionCategories: cats, familyProfiles } = useMasterData();
  // Default the owner to whichever family profile is currently active — matches
  // the fix in BudgetModal above (see comment there for why this matters).
  const defaultOwner = activeProfile !== "all" ? activeProfile : "self";
  const [f, setF] = useState(
    initialValues
      ? {
          name: initialValues.name,
          category: initialValues.category,
          amount: initialValues.amount,
          frequency: initialValues.frequency || "monthly",
          dueDay: initialValues.dueDay || 5,
          startDate: initialValues.startDate || today(),
          endDate: initialValues.endDate || "",
          accountId: initialValues.accountId || accounts[0]?.id || "",
          owner: initialValues.owner || "self",
          isActive: initialValues.isActive !== undefined ? initialValues.isActive : true,
        }
      : {
          name: "",
          category: cats[0] || "General",
          amount: "",
          frequency: "monthly",
          dueDay: 5,
          startDate: today(),
          endDate: "",
          accountId: accounts[0]?.id || "",
          owner: defaultOwner,
          isActive: true,
        }
  );

  return (
    <Modal
      title={initialValues ? "Edit Recurring Expense" : "Add Recurring Expense"}
      onClose={onClose}
    >
      <div className="form-grid-2">
        <Field label="Owner / Profile">
          <select
            className="form-input"
            value={f.owner}
            onChange={(e) => setF({ ...f, owner: e.target.value })}
          >
            {familyProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {formatProfileOption(p)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Paid From (Bank Account)">
          <select
            className="form-input"
            value={f.accountId}
            onChange={(e) => setF({ ...f, accountId: e.target.value })}
          >
            <option value="">No linked account</option>
            {accounts.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.bankName} (•••• {a.accountNumber?.slice(-4)})
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Expense Name">
        <input
          className="form-input"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="e.g. Maid Salary, Broadband Bill"
          autoFocus
        />
      </Field>

      <div className="form-grid-2">
        <Field label="Category">
          <select
            className="form-input"
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
          >
            {cats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Amount (₹)">
          <input
            className="form-input"
            type="number"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
            placeholder="e.g. 5000"
          />
        </Field>
      </div>

      <div className="form-grid-2">
        <Field label="Frequency">
          <select
            className="form-input"
            value={f.frequency}
            onChange={(e) => setF({ ...f, frequency: e.target.value })}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </Field>
        <Field label="Due Day of Month (1-31)">
          <input
            className="form-input"
            type="number"
            min={1}
            max={31}
            value={f.dueDay}
            onChange={(e) =>
              setF({ ...f, dueDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) })
            }
          />
        </Field>
      </div>

      <div className="form-grid-2">
        <Field label="Start Date">
          <input
            className="form-input"
            type="date"
            value={f.startDate}
            onChange={(e) => setF({ ...f, startDate: e.target.value })}
          />
        </Field>
        <Field label="End Date (Optional)">
          <input
            className="form-input"
            type="date"
            value={f.endDate}
            onChange={(e) => setF({ ...f, endDate: e.target.value })}
            placeholder="Repeat indefinitely if blank"
          />
        </Field>
      </div>

      <ModalActions
        onSave={() => f.name.trim() && Number(f.amount) > 0 && onSave(f)}
        onClose={onClose}
        disabled={!f.name.trim() || !(Number(f.amount) > 0) || saving}
        loading={saving}
        saveLabel={initialValues ? "Save Changes" : "Add Recurring Expense"}
      />
    </Modal>
  );
}
