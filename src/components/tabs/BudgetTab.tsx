// @ts-nocheck
import React, { useState, useMemo } from "react";
import { 
  AlertCircle, Plus, Wallet, Receipt, TrendingUp, Target, Pencil, Trash2, 
  BarChart2, Check, Utensils, ShoppingBag, Car, Home, Zap, Stethoscope, 
  Film, Landmark, ArrowRightLeft, Wrench, HelpCircle, CreditCard,
  ChevronLeft, ChevronRight, Calendar, Play, Pause, Repeat, CheckCircle2,
  AlertTriangle, PlayCircle, ToggleLeft, ArrowRight
} from "lucide-react";
import { THEME, PROFILES } from "../../utils/constants";
import { fmtINR, fmtINRFull, today } from "../../utils/finance";
import { useMasterData } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";

const CATEGORY_ICONS: Record<string, any> = {
  "Food": Utensils,
  "Groceries": ShoppingBag,
  "Transport": Car,
  "Rent": Home,
  "Bills": Zap,
  "Salary": Wallet,
  "Investment": TrendingUp,
  "EMI": CreditCard,
  "Shopping": ShoppingBag,
  "Medical": Stethoscope,
  "Entertainment": Film,
  "Tax": Landmark,
  "Transfer": ArrowRightLeft,
  "Utilities": Wrench,
  "Uncategorized": HelpCircle
};

function getCatIcon(cat: string) {
  return CATEGORY_ICONS[cat] || HelpCircle;
}

export function BudgetTab({ state, addItem, removeItem, updateItem, metrics }: any) {
  const [activeSubTab, setActiveSubTab] = useState("budget"); // "budget" or "recurring"
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [editBudget, setEditBudget] = useState<any>(null);
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [editRecurring, setEditRecurring] = useState<any>(null);

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
      .filter((t: any) => t.date && t.date.startsWith(selectedMonth) && t.type === "debit")
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

    if (rentPaidThisMonth > 0) {
      spending["Rent"] = (spending["Rent"] || 0) + rentPaidThisMonth;
    }

    return spending;
  }, [state.transactions, state.rentedProperties, selectedMonth]);

  // Month-Wise Budget Selection & Inheritance Logic
  const { budgetsToUse, isInherited, inheritedFrom } = useMemo(() => {
    const specific = state.budgets.filter((b: any) => b.budgetMonth === selectedMonth);
    if (specific.length > 0) {
      return { budgetsToUse: specific, isInherited: false, inheritedFrom: null };
    }

    // Look for previous months with budgets to inherit
    const otherBudgets = state.budgets.filter((b: any) => b.budgetMonth && b.budgetMonth < selectedMonth);
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

  // Lock and duplicate inherited budgets to the selected month
  const handleLockAndCustomize = () => {
    if (!isInherited || budgetsToUse.length === 0) return;
    budgetsToUse.forEach((b: any) => {
      addItem("budgets", {
        owner: b.owner || "self",
        category: b.category,
        monthly: b.monthly || b.monthlyLimit || 0,
        budgetMonth: selectedMonth
      });
    });
  };

  // Safe removal of budgets (handles inherited override)
  const handleRemoveBudget = (b: any) => {
    const isInheritedItem = b.budgetMonth !== selectedMonth;
    if (isInheritedItem) {
      // Duplicate all other inherited items for selectedMonth, except this deleted one
      budgetsToUse.forEach((otherB: any) => {
        if (otherB.id !== b.id) {
          addItem("budgets", {
            owner: otherB.owner || "self",
            category: otherB.category,
            monthly: otherB.monthly || otherB.monthlyLimit || 0,
            budgetMonth: selectedMonth
          });
        }
      });
    } else {
      removeItem("budgets", b.id);
    }
  };

  const totalBudget = budgetsToUse.reduce((s: number, b: any) => s + Number(b.monthly || 0), 0);
  const totalSpent = budgetsToUse.reduce((s: number, b: any) => s + (monthSpending[b.category] || 0), 0);

  const overBudgetCount = budgetsToUse.filter((b: any) => {
    const spent = monthSpending[b.category] || 0;
    return spent > Number(b.monthly || 0);
  }).length;

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

  // Match actual transaction to detect if a recurring expense was paid in the selected month
  const detectPaymentTransaction = (expense: any) => {
    const nameLower = expense.name.toLowerCase();
    const cat = expense.category;
    const amount = Number(expense.amount);

    return state.transactions.find((t: any) => {
      if (!t.date || !t.date.startsWith(selectedMonth) || t.type !== "debit") return false;
      
      const noteMatches = t.note && t.note.toLowerCase().includes(nameLower);
      const catMatches = t.category === cat;
      
      const tAmt = Number(t.amount);
      const amtMatches = Math.abs(tAmt - amount) / amount <= 0.05; // ±5% tolerance

      return (noteMatches || catMatches) && amtMatches;
    });
  };

  // Compute stats for recurring expenses
  const recurringStats = useMemo(() => {
    const list = activeRecurringExpenses;
    const monthlyCommitment = list.filter((x: any) => x.isActive).reduce((acc: number, re: any) => {
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
    const curMonthStr = now.toISOString().slice(0, 7);
    const todayDay = now.getDate();

    list.forEach((re: any) => {
      if (!re.isActive) return;
      const match = detectPaymentTransaction(re);
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
  }, [activeRecurringExpenses, state.transactions, selectedMonth]);

  // One-click Record Payment (Quick Post)
  const handleQuickPostTransaction = async (expense: any) => {
    const now = new Date();
    const curMonthStr = now.toISOString().slice(0, 7);
    
    // Compute transaction date
    let payDate = `${selectedMonth}-${String(expense.dueDay).padStart(2, "0")}`;
    if (selectedMonth === curMonthStr) {
      payDate = now.toISOString().slice(0, 10); // use actual date if paying current month today
    }

    const defaultAccId = expense.accountId || (state.bankAccounts[0]?.id || "");

    await addItem("transactions", {
      owner: expense.owner || "self",
      date: payDate,
      accountId: defaultAccId,
      amount: expense.amount,
      type: "debit",
      category: expense.category,
      note: `${expense.name} (Recurring)`
    });
  };

  return (
    <div className="tab-content-enter">
      {/* Dynamic Month Selection Header & Tabs Selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Chevron Navigation */}
          <div style={{ display: "flex", background: "var(--t-line)", borderRadius: 10, padding: 3, border: "1px solid var(--t-line)" }}>
            <Button variant="ghost" size="sm" onClick={handlePrevMonth} style={{ padding: 6, borderRadius: 8, height: "auto" }}>
              <ChevronLeft size={16} />
            </Button>
            <div style={{ padding: "4px 14px", fontWeight: 800, fontSize: 13, minWidth: 120, textAlign: "center", color: THEME.ink, display: "flex", alignItems: "center", justifyCenter: "center", gap: 6 }}>
              <Calendar size={13} color={THEME.accent} />
              {selectedMonthLabel}
            </div>
            <Button variant="ghost" size="sm" onClick={handleNextMonth} style={{ padding: 6, borderRadius: 8, height: "auto" }}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        {/* Sub Navigation Segmented Control */}
        <div style={{ display: "flex", background: "rgba(128,128,128,0.06)", padding: 4, borderRadius: 10, border: "1px solid var(--t-line)" }}>
          <button 
            onClick={() => setActiveSubTab("budget")} 
            style={{ 
              border: "none", background: activeSubTab === "budget" ? "var(--t-darkInk)" : "transparent",
              color: activeSubTab === "budget" ? THEME.ink : THEME.muted,
              padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
              boxShadow: activeSubTab === "budget" ? "0 2px 5px rgba(0,0,0,0.05)" : "none",
              transition: "all 0.2s"
            }}
          >
            📊 Budget Tracker
          </button>
          <button 
            onClick={() => setActiveSubTab("recurring")} 
            style={{ 
              border: "none", background: activeSubTab === "recurring" ? "var(--t-darkInk)" : "transparent",
              color: activeSubTab === "recurring" ? THEME.ink : THEME.muted,
              padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
              boxShadow: activeSubTab === "recurring" ? "0 2px 5px rgba(0,0,0,0.05)" : "none",
              transition: "all 0.2s"
            }}
          >
            🔁 Fixed & Recurring
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/*                     1. BUDGET TRACKER TAB                */}
      {/* ======================================================== */}
      {activeSubTab === "budget" && (
        <>
          {overBudgetCount > 0 && (
            <Card style={{ background: "rgba(217,48,37,0.04)", border: `1px solid ${THEME.rust}44`, padding: "12px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12, color: THEME.rust }}>
              <AlertCircle size={18} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>{overBudgetCount} {overBudgetCount === 1 ? "category" : "categories"} over budget in {selectedMonthLabel}</span>
            </Card>
          )}

          {/* Budget Inheritance Notification Banner */}
          {isInherited && budgetsToUse.length > 0 && (
            <Card style={{ 
              background: "rgba(99,102,241,0.03)", 
              border: `1px dashed ${THEME.accent}55`, 
              padding: "14px 20px", 
              marginBottom: 24, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between", 
              gap: 16, 
              flexWrap: "wrap",
              borderRadius: 12
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Repeat size={18} color={THEME.accent} style={{ animation: "spin 12s linear infinite" }} />
                <span style={{ fontWeight: 600, fontSize: 13.5, color: THEME.ink }}>
                  Showing inherited budget limits from <strong>{inheritedFrom === "Default Template" ? "Legacy Baseline" : new Date(inheritedFrom + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</strong>.
                </span>
              </div>
              <Button onClick={handleLockAndCustomize} size="sm" variant="ghost" style={{ border: `1px solid ${THEME.accent}`, color: THEME.accent, fontWeight: 700, borderRadius: 8 }}>
                Lock & Customize this Month
              </Button>
            </Card>
          )}

          <SectionTitle 
            sub={`Set monthly limits per category and track real spending for ${selectedMonthLabel}`}
            rightElement={
              budgetsToUse.length > 0 && (
                <Button onClick={() => setShowAddBudget(true)} variant="accent" icon={<Plus size={14} />}>
                  Add Budget Category
                </Button>
              )
            }
          >
            Budget Planner
          </SectionTitle>

          {/* Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 28 }}>
            <StatCard 
              icon={<Wallet />} 
              label="Total Budgeted" 
              value={fmtINRFull(totalBudget)} 
              color={THEME.accent}
              sub={`Target for ${selectedMonthLabel}`}
            />
            <StatCard 
              icon={<Receipt />} 
              label="Spent in Month" 
              value={fmtINRFull(totalSpent)} 
              color={totalSpent > totalBudget ? THEME.rust : THEME.accent}
              sub={`Used ${totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}% of budget`}
            />
            <StatCard 
              icon={<TrendingUp />} 
              label="Remaining Balance" 
              value={fmtINRFull(Math.max(0, totalBudget - totalSpent))} 
              color={totalBudget - totalSpent > 0 ? THEME.sage : THEME.rust}
              sub={totalBudget - totalSpent > 0 ? "Left to spend" : "Budget exceeded"}
            />
            <StatCard
              icon={<Target />}
              label="Active Buckets"
              value={String(budgetsToUse.length)}
              color={THEME.muted}
              sub="Budgeted categories"
            />
          </div>

          {/* Burn Rate Widget */}
          {totalBudget > 0 && (() => {
            const now = new Date();
            const currentMonthStr = now.toISOString().slice(0, 7);
            const isCurrentMonth = selectedMonth === currentMonthStr;

            const [selYear, selMonth] = selectedMonth.split("-").map(Number);
            const daysInMonth = new Date(selYear, selMonth, 0).getDate();
            const daysPassed = isCurrentMonth ? now.getDate() : daysInMonth;

            const monthElapsedPct = (daysPassed / daysInMonth) * 100;
            const spentPct = (totalSpent / totalBudget) * 100;
            const onTrack = spentPct <= monthElapsedPct + 5;
            const burnColor = spentPct > monthElapsedPct + 10 ? THEME.rust : spentPct > monthElapsedPct - 5 ? THEME.gold : THEME.sage;
            const r = 44, sz = 110, circ = 2 * Math.PI * r;

            return (
              <Card style={{ marginBottom: 32, padding: "28px 32px" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: THEME.muted, marginBottom: 24, fontWeight: 800 }}>
                  Budget Burn Rate — Day {daysPassed} of {daysInMonth} ({selectedMonthLabel})
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 48, flexWrap: "wrap" }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <svg width={sz} height={sz} style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.05))" }}>
                      <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={THEME.line} strokeWidth="10" />
                      <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={THEME.muted} strokeWidth="10" opacity="0.15"
                        strokeDasharray={`${(monthElapsedPct/100)*circ} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round" />
                      <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={burnColor} strokeWidth="10"
                        strokeDasharray={`${Math.min(spentPct/100,1)*circ} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round"
                        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }} />
                      <text x={sz/2} y={sz/2-4} textAnchor="middle" fontSize="18" fontWeight="900" fill={THEME.ink}>{spentPct.toFixed(0)}%</text>
                      <text x={sz/2} y={sz/2+14} textAnchor="middle" fontSize="10" fontWeight="700" fill={THEME.muted} style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>spent</text>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: "grid", gap: 14 }}>
                      {[
                        { label: "Month progress", val: monthElapsedPct.toFixed(0) + "%", color: THEME.muted },
                        { label: "Budget spent", val: spentPct.toFixed(0) + "%", color: burnColor },
                        { label: "Spent so far", val: fmtINRFull(totalSpent), color: THEME.ink },
                        { label: "Daily average", val: fmtINR(daysPassed > 0 ? totalSpent / daysPassed : 0) + " / day", color: THEME.muted },
                        { label: "Projected month-end", val: fmtINRFull(daysPassed > 0 ? (totalSpent / daysPassed) * daysInMonth : 0), color: burnColor },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                          <span style={{ color: THEME.muted, fontWeight: 600 }}>{label}</span>
                          <span style={{ fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{val}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 20, fontSize: 13, padding: "12px 16px", borderRadius: 10, background: onTrack ? "rgba(30,142,62,0.06)" : "rgba(217,48,37,0.06)", color: onTrack ? THEME.sage : THEME.rust, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                      {onTrack ? <Check size={16} /> : <AlertCircle size={16} />}
                      {onTrack ? "Spending is perfectly in line with the month progress." : "You are overpacing — spending faster than month progress."}
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
              gradient="linear-gradient(135deg,#db2777 0%,#f472b6 100%)"
              dotColor="#db2777"
              title={`No Budgets for ${selectedMonthLabel}`}
              description="Set monthly spending limits per category — Food, Rent, Entertainment, Transport — and get real-time alerts before you overspend."
              pills={["Category Budgets", "Monthly Limits", "Spend vs Budget", "Burn Rate Chart"]}
              buttonLabel="Create Budget"
              onAdd={() => setShowAddBudget(true)}
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
              {budgetsToUse.map((b: any) => {
                const spent = monthSpending[b.category] || 0;
                const budget = Number(b.monthly || 0);
                const pct = budget > 0 ? (spent / budget) * 100 : 0;
                const over = pct > 100;
                const barColor = over ? THEME.rust : pct > 90 ? THEME.gold : THEME.sage;
                const Icon = getCatIcon(b.category);

                const now = new Date();
                const currentMonthStr = now.toISOString().slice(0, 7);
                const isCurrentMonth = selectedMonth === currentMonthStr;

                const [selYear, selMonth] = selectedMonth.split("-").map(Number);
                const daysInMonth = new Date(selYear, selMonth, 0).getDate();
                const daysPassed = isCurrentMonth ? now.getDate() : daysInMonth;

                const projected = daysPassed > 0 ? (spent / daysPassed) * daysInMonth : 0;
                const projectedPct = budget > 0 ? (projected / budget) * 100 : 0;

                return (
                  <Card key={b.id} style={{ padding: "18px 20px", borderLeft: `3px solid ${barColor}`, position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      {/* Icon Box */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: `color-mix(in srgb, ${barColor} 12%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${barColor} 25%, transparent)`,
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        <Icon size={22} color={barColor} />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: 16, color: THEME.ink, letterSpacing: "-0.01em" }}>{b.category}</span>
                            {b.budgetMonth !== selectedMonth && <Badge variant="muted" style={{ fontSize: 9 }}>INHERITED</Badge>}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 900, color: over ? THEME.rust : THEME.ink, fontSize: 16 }}>{pct.toFixed(0)}%</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                          {fmtINRFull(spent)} <span style={{ fontWeight: 400, opacity: 0.7 }}>of</span> {fmtINRFull(budget)}
                          <span style={{ marginLeft: 8, color: over ? THEME.rust : THEME.sage }}>
                            {over ? `(${fmtINR(spent - budget)} over)` : `(${fmtINR(budget - spent)} left)`}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        <Button variant="ghost" size="sm" onClick={() => setEditBudget(b)} style={{ padding: 6 }}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveBudget(b)} style={{ padding: 6, color: THEME.rust }}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ height: 6, background: "rgba(128,128,128,0.06)", borderRadius: 3, overflow: "hidden", marginTop: 16, marginBottom: 12 }}>
                      <div style={{ 
                        height: "100%", 
                        width: Math.min(pct, 100) + "%", 
                        background: barColor, 
                        borderRadius: 3, 
                        transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)" 
                      }} />
                    </div>

                    {spent > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted, fontWeight: 600, opacity: 0.8 }}>
                        <span>Day {daysPassed}/{daysInMonth} · Projected {fmtINR(projected)}</span>
                        <span style={{ color: projectedPct > 105 ? THEME.rust : THEME.sage }}>
                          {projectedPct.toFixed(0)}% expected
                        </span>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
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
              <Button onClick={() => setShowAddRecurring(true)} variant="accent" icon={<Plus size={14} />}>
                Add Recurring Expense
              </Button>
            }
          >
            Fixed & Recurring Expenses
          </SectionTitle>

          {/* Stats Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
            <StatCard 
              icon={<Repeat />} 
              label="Monthly Commitment" 
              value={fmtINRFull(recurringStats.monthlyCommitment)} 
              color={THEME.accent}
              sub="Sum of active recurring costs"
            />
            <StatCard 
              icon={<Wallet />} 
              label="Annual Equivalent" 
              value={fmtINRFull(recurringStats.annualCost)} 
              color={THEME.gold}
              sub="Projected yearly outgo"
            />
            <StatCard 
              icon={<CheckCircle2 />} 
              label="Paid This Month" 
              value={`${recurringStats.paidCount} / ${activeRecurringExpenses.filter((x: any) => x.isActive).length}`} 
              color={THEME.sage}
              sub={`Recorded total: ${fmtINRFull(recurringStats.paidTotal)}`}
            />
            <StatCard 
              icon={<AlertCircle />} 
              label="Overdue / Unpaid" 
              value={String(recurringStats.overdueCount)} 
              color={recurringStats.overdueCount > 0 ? THEME.rust : THEME.sage}
              sub={`Pending outgo: ${fmtINRFull(recurringStats.overdueTotal)}`}
            />
          </div>

          {activeRecurringExpenses.length === 0 ? (
            <EmptyState
              icon={Repeat}
              gradient="linear-gradient(135deg,#0284c7 0%,#38bdf8 100%)"
              dotColor="#0284c7"
              title="No Recurring Expenses Active"
              description="Define regular bills, rent, household wages, gym memberships or custom EMIs and quick-post them directly as ledger transactions."
              pills={["Fixed Expenses", "Custom Ranges", "Quick Record", "Ledger Auto-Match"]}
              buttonLabel="Add Recurring Expense"
              onAdd={() => setShowAddRecurring(true)}
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
              {activeRecurringExpenses.map((re: any) => {
                const match = detectPaymentTransaction(re);
                const hasPaid = !!match;
                
                const now = new Date();
                const curMonthStr = now.toISOString().slice(0, 7);
                const todayDay = now.getDate();

                let statusText = "Upcoming";
                let statusColor = THEME.gold;
                let statusBg = "rgba(217,119,6,0.08)";

                if (hasPaid) {
                  statusText = "Paid";
                  statusColor = THEME.sage;
                  statusBg = "rgba(5,150,105,0.08)";
                } else if (!re.isActive) {
                  statusText = "Paused";
                  statusColor = THEME.muted;
                  statusBg = "rgba(128,128,128,0.08)";
                } else {
                  // Active and Unpaid
                  if (selectedMonth < curMonthStr) {
                    statusText = "Unpaid";
                    statusColor = THEME.rust;
                    statusBg = "rgba(220,38,38,0.08)";
                  } else if (selectedMonth === curMonthStr) {
                    if (todayDay > Number(re.dueDay)) {
                      statusText = "Overdue";
                      statusColor = THEME.rust;
                      statusBg = "rgba(220,38,38,0.08)";
                    } else {
                      const daysLeft = Number(re.dueDay) - todayDay;
                      statusText = daysLeft === 0 ? "Due Today" : daysLeft === 1 ? "Due Tomorrow" : `Due in ${daysLeft} days`;
                      statusColor = THEME.gold;
                      statusBg = "rgba(217,119,6,0.08)";
                    }
                  } else {
                    // Future month
                    statusText = "Scheduled";
                    statusColor = THEME.accent;
                    statusBg = "rgba(99,102,241,0.08)";
                  }
                }

                const bank = state.bankAccounts.find((b: any) => b.id === re.accountId);

                return (
                  <Card key={re.id} style={{ padding: "18px 20px", borderLeft: `3px solid ${re.isActive ? (hasPaid ? THEME.sage : THEME.gold) : THEME.line}`, opacity: re.isActive ? 1 : 0.7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      {/* Logo Box / Circle */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: hasPaid ? "rgba(5,150,105,0.06)" : "rgba(128,128,128,0.04)",
                        border: `1px solid ${hasPaid ? THEME.sage + "33" : THEME.line}`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
                      }}>
                        {re.category === "Rent" ? "🏠" : re.category === "EMI" ? "💸" : re.category === "Bills" ? "⚡" : "💼"}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontWeight: 800, fontSize: 16, color: THEME.ink, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {re.name}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: statusColor, background: statusBg,
                            padding: "2px 8px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.02em"
                          }}>
                            {statusText}
                          </span>
                        </div>

                        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, display: "flex", flexWrap: "wrap", columnGap: 6, rowGap: 2, alignItems: "center" }}>
                          <span style={{ color: THEME.ink, fontWeight: 800 }}>{fmtINRFull(re.amount)}</span>
                          <span style={{ opacity: 0.4 }}>·</span>
                          <span style={{ textTransform: "capitalize" }}>{re.frequency} (Day {re.dueDay})</span>
                          {bank && (
                            <>
                              <span style={{ opacity: 0.4 }}>·</span>
                              <span style={{ fontSize: 11 }}>🏦 {bank.bankName}</span>
                            </>
                          )}
                        </div>

                        {/* Repeat Dates Range */}
                        <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4, display: "flex", alignItems: "center", gap: 4, opacity: 0.9 }}>
                          <span>📅 {re.startDate}</span>
                          {re.endDate ? (
                            <>
                              <ArrowRight size={10} style={{ margin: "0 2px" }} />
                              <span>{re.endDate}</span>
                            </>
                          ) : (
                            <span style={{ fontStyle: "italic", marginLeft: 4 }}>(Indefinite)</span>
                          )}
                        </div>

                        {/* Match details if paid */}
                        {hasPaid && (
                          <div style={{ marginTop: 8, fontSize: 11, padding: "6px 10px", borderRadius: 6, background: "rgba(5,150,105,0.04)", color: THEME.sage, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                            <span>✓ Matched ledger transaction:</span>
                            <span style={{ textDecoration: "underline", cursor: "pointer" }} title={`Recorded on ${match.date} to account: ${match.note}`}>
                              {fmtINR(match.amount)} on {match.date}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, alignItems: "flex-end" }}>
                        <div style={{ display: "flex", gap: 2 }}>
                          {/* Pause / Play */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateItem("recurringExpenses", re.id, { isActive: !re.isActive })}
                            style={{ padding: 6, color: re.isActive ? THEME.gold : THEME.sage }}
                            title={re.isActive ? "Pause" : "Resume"}
                          >
                            {re.isActive ? <Pause size={14} /> : <Play size={14} />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditRecurring(re)} style={{ padding: 6 }}>
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeItem("recurringExpenses", re.id)} style={{ padding: 6, color: THEME.rust }}>
                            <Trash2 size={14} />
                          </Button>
                        </div>

                        {/* Quick Post Button */}
                        {re.isActive && !hasPaid && (selectedMonth <= curMonthStr) && (
                          <Button 
                            variant="accent" 
                            size="xs" 
                            onClick={() => handleQuickPostTransaction(re)} 
                            style={{ 
                              padding: "4px 8px", fontSize: 11, borderRadius: 6,
                              background: statusText === "Overdue" || statusText === "Unpaid" ? THEME.rust : THEME.accent,
                              fontWeight: 700, display: "flex", alignItems: "center", gap: 4
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
        </>
      )}

      {/* ======================================================== */}
      {/*                        MODALS                            */}
      {/* ======================================================== */}

      {/* 1. Add Budget Category Modal */}
      {showAddBudget && (
        <BudgetModal
          existing={budgetsToUse.map((b: any) => b.category)}
          onClose={() => setShowAddBudget(false)}
          onSave={(v: any) => { 
            addItem("budgets", { ...v, budgetMonth: selectedMonth }); 
            setShowAddBudget(false); 
          }}
        />
      )}

      {/* 2. Edit Budget Category Modal */}
      {editBudget && (
        <BudgetModal
          existing={budgetsToUse.filter((b: any) => b.id !== editBudget.id).map((b: any) => b.category)}
          initialValues={editBudget}
          onClose={() => setEditBudget(null)}
          onSave={(v: any) => { 
            const isInheritedItem = editBudget.budgetMonth !== selectedMonth;
            if (isInheritedItem) {
              // Create an override for the currently selected month
              addItem("budgets", { ...v, budgetMonth: selectedMonth });
            } else {
              // Update existing month specific record
              updateItem("budgets", editBudget.id, v);
            }
            setEditBudget(null); 
          }}
        />
      )}

      {/* 3. Add Recurring Expense Modal */}
      {showAddRecurring && (
        <RecurringModal
          accounts={state.bankAccounts}
          onClose={() => setShowAddRecurring(false)}
          onSave={(v: any) => {
            addItem("recurringExpenses", v);
            setShowAddRecurring(false);
          }}
        />
      )}

      {/* 4. Edit Recurring Expense Modal */}
      {editRecurring && (
        <RecurringModal
          accounts={state.bankAccounts}
          initialValues={editRecurring}
          onClose={() => setEditRecurring(null)}
          onSave={(v: any) => {
            updateItem("recurringExpenses", editRecurring.id, v);
            setEditRecurring(null);
          }}
        />
      )}
    </div>
  );
}

// ── BUDGET MODAL COMPONENT ──
export function BudgetModal({ onClose, onSave, initialValues = null, existing = [] }: any) {
  const { transactionCategories: allCats } = useMasterData();
  const availableCats = allCats.filter((c: string) => !existing.includes(c));
  const defaultCat = initialValues?.category || availableCats[0] || allCats[0];
  const [f, setF] = useState(
    initialValues 
      ? { owner: initialValues.owner || "self", category: initialValues.category, monthly: initialValues.monthly || "" } 
      : { owner: "self", category: defaultCat, monthly: "" }
  );

  return (
    <Modal title={initialValues ? "Edit Budget Limit" : "Add Budget Category"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select className="form-input" value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Category">
        <select className="form-input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {initialValues && <option key={initialValues.category}>{initialValues.category}</option>}
          {availableCats.filter((c: string) => !initialValues || c !== initialValues.category).map((c: string) => <option key={c}>{c}</option>)}
          {availableCats.length === 0 && !initialValues && <option disabled>All categories budgeted</option>}
        </select>
      </Field>
      <Field label="Monthly Limit (₹)">
        <input className="form-input" type="number" value={f.monthly} onChange={(e) => setF({ ...f, monthly: e.target.value })} placeholder="e.g. 5000" />
      </Field>
      <ModalActions onSave={() => f.monthly && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

// ── RECURRING EXPENSES MODAL COMPONENT ──
export function RecurringModal({ onClose, onSave, initialValues = null, accounts = [] }: any) {
  const { transactionCategories: cats } = useMasterData();
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
          isActive: initialValues.isActive !== undefined ? initialValues.isActive : true
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
          owner: "self",
          isActive: true
        }
  );

  return (
    <Modal title={initialValues ? "Edit Recurring Expense" : "Add Recurring Expense"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Owner / Profile">
          <select className="form-input" value={f.owner} onChange={e => setF({...f, owner: e.target.value})}>
            {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Paid From (Bank Account)">
          <select className="form-input" value={f.accountId} onChange={e => setF({...f, accountId: e.target.value})}>
            <option value="">No linked account</option>
            {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.bankName} (•••• {a.accountNumber?.slice(-4)})</option>)}
          </select>
        </Field>
      </div>

      <Field label="Expense Name">
        <input className="form-input" value={f.name} onChange={e => setF({...f, name: e.target.value})} placeholder="e.g. Maid Salary, Broadband Bill" />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Category">
          <select className="form-input" value={f.category} onChange={e => setF({...f, category: e.target.value})}>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Amount (₹)">
          <input className="form-input" type="number" value={f.amount} onChange={e => setF({...f, amount: e.target.value})} placeholder="e.g. 5000" />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Frequency">
          <select className="form-input" value={f.frequency} onChange={e => setF({...f, frequency: e.target.value})}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </Field>
        <Field label="Due Day of Month (1-31)">
          <input className="form-input" type="number" min={1} max={31} value={f.dueDay} onChange={e => setF({...f, dueDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1))})} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Start Date">
          <input className="form-input" type="date" value={f.startDate} onChange={e => setF({...f, startDate: e.target.value})} />
        </Field>
        <Field label="End Date (Optional)">
          <input className="form-input" type="date" value={f.endDate} onChange={e => setF({...f, endDate: e.target.value})} placeholder="Repeat indefinitely if blank" />
        </Field>
      </div>

      <ModalActions onSave={() => f.name && f.amount && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
