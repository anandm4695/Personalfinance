import { useMemo } from "react";
import {
  fmtINRFull,
  today,
  monthsBetween,
  getCCDueDate,
  getLocalDateString,
  calcTaxNewByFY,
  calcTaxOldByFY,
  nextAnnualOccurrence,
} from "../utils/finance";
import { getCurrentFY } from "../utils/appConstants";
import { SCHEME_RULES } from "../utils/govtSchemes";

export type Alert = {
  level: "error" | "warn" | "info";
  title: string;
  detail: string;
  tab: string;
};

export function useAlerts(state: any, metrics: any, marketData?: Record<string, any>): Alert[] {
  const alerts = useMemo(() => {
    const list: { level: "error" | "warn" | "info"; title: string; detail: string; tab: string }[] =
      [];
    const now = new Date();
    // Over-budget categories (uses budget inheritance: current month → latest prior month → legacy)
    const ym = today().slice(0, 7);
    const monthSpend: Record<string, number> = {};
    state.transactions
      .filter((t: any) => t.date && t.date.startsWith(ym) && t.type === "debit")
      .forEach((t: any) => {
        const cat = t.category || "Uncategorized";
        monthSpend[cat] = (monthSpend[cat] || 0) + Number(t.amount || 0);
      });
    const rentPaid = (state.rentedProperties || []).reduce((sum: number, p: any) => {
      return (
        sum +
        (p.payments || [])
          .filter((pay: any) => pay.date && pay.date.startsWith(ym))
          .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0)
      );
    }, 0);
    if (rentPaid > 0 && !monthSpend["Rent"]) monthSpend["Rent"] = rentPaid;

    const specificBudgets = state.budgets.filter((b: any) => b.budgetMonth === ym);
    let budgetsForAlerts: any[];
    if (specificBudgets.length > 0) {
      budgetsForAlerts = specificBudgets;
    } else {
      const priorBudgets = state.budgets.filter((b: any) => b.budgetMonth && b.budgetMonth < ym);
      if (priorBudgets.length > 0) {
        const months = Array.from(
          new Set(priorBudgets.map((b: any) => b.budgetMonth))
        ).sort() as string[];
        budgetsForAlerts = state.budgets.filter(
          (b: any) => b.budgetMonth === months[months.length - 1]
        );
      } else {
        budgetsForAlerts = state.budgets.filter((b: any) => !b.budgetMonth);
      }
    }
    budgetsForAlerts.forEach((b: any) => {
      const spent = monthSpend[b.category] || 0;
      if (spent > Number(b.monthly || 0)) {
        list.push({
          level: "error",
          title: `${b.category} over budget`,
          detail: `Spent ${fmtINRFull(spent)} vs budget ${fmtINRFull(b.monthly)}`,
          tab: "budget",
        });
      }
    });
    // CC due in ≤10 days — anchor both ends to local midnight to avoid IST timezone off-by-one
    const todayMidnight = new Date(today() + "T00:00:00").getTime();
    state.creditCards
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .forEach((c: any) => {
        const dueDate = getCCDueDate(c);
        if (dueDate) {
          const days = Math.ceil(
            (new Date(dueDate + "T00:00:00").getTime() - todayMidnight) / 86400000
          );
          if (days >= 0 && days <= 5)
            list.push({
              level: "error",
              title: `${c.issuer} CC due in ${days}d`,
              detail: `Outstanding: ${fmtINRFull(c.outstanding)}`,
              tab: "credit",
            });
          else if (days > 5 && days <= 10)
            list.push({
              level: "warn",
              title: `${c.issuer} CC due in ${days}d`,
              detail: `Outstanding: ${fmtINRFull(c.outstanding)}`,
              tab: "credit",
            });
        }
      });
    // Goals behind schedule
    state.goals.forEach((g: any) => {
      const progress = Number(g.targetAmount)
        ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100
        : 0;
      if (g.targetDate) {
        const totalM = monthsBetween(today(), g.targetDate);
        if (totalM <= 0) {
          // Goal is past its target date
          if (progress < 100)
            list.push({
              level: "warn",
              title: `Goal "${g.name}" is overdue`,
              detail: `Target date passed — ${progress.toFixed(0)}% funded`,
              tab: "goals",
            });
        } else {
          const elapsed = g.startDate ? monthsBetween(g.startDate, today()) : 0;
          const totalDuration = elapsed + totalM;
          const expectedPct = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
          if (progress < expectedPct - 10)
            list.push({
              level: "warn",
              title: `Goal "${g.name}" behind schedule`,
              detail: `${progress.toFixed(0)}% saved, expected ${expectedPct.toFixed(0)}%`,
              tab: "goals",
            });
        }
      }
    });
    // Advance tax upcoming (within 30 days)
    // FY runs Apr–Mar, so Q4 (15 Mar) is always in fyStart+1 year
    const advFyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const advDates = [
      `${advFyStart}-06-15`,
      `${advFyStart}-09-15`,
      `${advFyStart}-12-15`,
      `${advFyStart + 1}-03-15`,
    ];
    advDates.forEach((d) => {
      const days = Math.ceil((new Date(d + "T00:00:00").getTime() - todayMidnight) / 86400000);
      if (days >= 0 && days <= 30)
        list.push({
          level: "info",
          title: `Advance tax due on ${d}`,
          detail: "Log payment in Tax Vault",
          tab: "tax",
        });
    });
    // Low emergency fund
    if (metrics.monthExpense > 0 && metrics.cashInBanks / metrics.monthExpense < 3) {
      list.push({
        level: "warn",
        title: "Low emergency fund",
        detail: `Only ${(metrics.cashInBanks / metrics.monthExpense).toFixed(1)} months of expenses in bank`,
        tab: "banks",
      });
    }
    // Subscription renewals in ≤7 days — compare midnight-to-midnight to avoid IST off-by-one
    const todayMidnightMs = new Date(today() + "T00:00:00").getTime();
    state.subscriptions
      .filter((s: any) => s.renewalDate && !s.paused)
      .forEach((s: any) => {
        const days = Math.ceil(
          (new Date(s.renewalDate + "T00:00:00").getTime() - todayMidnightMs) / 86400000
        );
        if (days >= 0 && days <= 7)
          list.push({
            level: "info",
            title: `${s.name} renews in ${days}d`,
            detail: fmtINRFull(s.amount),
            tab: "subs",
          });
      });
    // Credit card annual fee due in ≤30 days
    state.creditCards
      .filter(
        (c: any) =>
          (c.status || "").toLowerCase() !== "closed" && Number(c.annualFee) > 0 && c.feeMonth
      )
      .forEach((c: any) => {
        const month = Number(c.feeMonth) - 1;
        const day = Number(c.feeDay) || 1;
        let candidate = new Date(now.getFullYear(), month, day);
        if (candidate.getTime() < new Date(today() + "T00:00:00").getTime())
          candidate = new Date(now.getFullYear() + 1, month, day);
        const days = Math.ceil(
          (candidate.getTime() - new Date(today() + "T00:00:00").getTime()) / 86400000
        );
        if (days >= 0 && days <= 30) {
          const lvl = days <= 7 ? "warn" : "info";
          list.push({
            level: lvl,
            title: `${c.issuer} annual fee in ${days}d`,
            detail: fmtINRFull(c.annualFee),
            tab: "credit",
          });
        }
      });
    // Credit card utilization — compute from state (unfiltered) for consistent alert coverage
    const totalCCLimitForAlert = state.creditCards
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .reduce((s: number, c: any) => s + Number((c as any).limit || (c as any).cardLimit || 0), 0);
    const ccOutstandingForAlert = state.creditCards
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .reduce((s: number, c: any) => s + Number(c.outstanding || 0), 0);
    if (totalCCLimitForAlert > 0 && ccOutstandingForAlert > 0) {
      const util = (ccOutstandingForAlert / totalCCLimitForAlert) * 100;
      if (util > 75)
        list.push({
          level: "error",
          title: `Credit utilization at ${util.toFixed(0)}%`,
          detail: `${fmtINRFull(ccOutstandingForAlert)} used of ${fmtINRFull(totalCCLimitForAlert)} limit — may hurt credit score`,
          tab: "credit",
        });
      else if (util > 40)
        list.push({
          level: "warn",
          title: `Credit utilization ${util.toFixed(0)}%`,
          detail: "Keep utilization below 30% to protect your credit score",
          tab: "credit",
        });
    }
    // FOIR: use unfiltered household income + unfiltered loans for a consistent household metric.
    // Excludes internal transfers — a self-transfer between the user's own accounts isn't real
    // income, and counting it would understate FOIR%, masking a genuinely risky EMI burden.
    const unfilteredMonthlyIncome = state.transactions
      .filter(
        (t: any) =>
          t.date &&
          t.date.startsWith(ym) &&
          t.type === "credit" &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer"
      )
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const totalEMIForAlert = state.loansTaken
      .filter((l: any) => Number(l.monthsRemaining || 1) > 0)
      .reduce((s: number, l: any) => s + Number(l.emi || 0), 0);
    if (unfilteredMonthlyIncome > 0 && totalEMIForAlert > 0) {
      const foirPct = (totalEMIForAlert / unfilteredMonthlyIncome) * 100;
      if (foirPct > 50)
        list.push({
          level: "error",
          title: `EMI burden ${foirPct.toFixed(0)}% of income`,
          detail: `${fmtINRFull(totalEMIForAlert)}/mo EMIs is very high — severe cash flow risk`,
          tab: "credit",
        });
      else if (foirPct > 40)
        list.push({
          level: "warn",
          title: `High FOIR: ${foirPct.toFixed(0)}%`,
          detail: "EMI payments exceed 40% of monthly income — reduce debt",
          tab: "credit",
        });
    }
    // Net worth MoM drop alert
    const nwHistory = state.netWorthHistory || [];
    if (nwHistory.length >= 2) {
      const sorted = [...nwHistory].sort((a, b) => (a.month < b.month ? -1 : 1));
      const prev = sorted[sorted.length - 2];
      const curr = sorted[sorted.length - 1];
      if (prev.netWorth > 0 && curr.netWorth < prev.netWorth) {
        const drop = prev.netWorth - curr.netWorth;
        const dropPct = (drop / prev.netWorth) * 100;
        if (dropPct > 5)
          list.push({
            level: "warn",
            title: `Net worth dropped ${dropPct.toFixed(0)}% MoM`,
            detail: `Down ${fmtINRFull(drop)} vs last month`,
            tab: "analytics",
          });
      }
    }
    // Tax regime switch alert — if switching saves >₹5,000 suggest it.
    // Was pinned to the legacy calcTaxNew()/calcTaxOld() helpers, which hardcode FY 2025-26
    // slabs regardless of the actual current year — the exact "stale FY fallback" bug class
    // already fixed elsewhere (see hardcoded-values audit); switched to the FY-aware
    // calcTaxNewByFY/calcTaxOldByFY so this alert keeps using correct slabs after FY rollover.
    if (metrics.annualIncome > 0) {
      const fy = state.profile?.fy || getCurrentFY();
      const taxNewAmt = calcTaxNewByFY(metrics.annualIncome, fy).total;
      const taxOldAmt = calcTaxOldByFY(metrics.annualIncome, 50000, fy).total;
      const saving = Math.abs(taxNewAmt - taxOldAmt);
      const betterRegime = taxOldAmt < taxNewAmt ? "Old" : "New";
      const currentRegime = state.profile?.regime === "old" ? "Old" : "New";
      if (saving > 5000 && betterRegime !== currentRegime) {
        list.push({
          level: "info",
          title: `Switch to ${betterRegime} Regime — save ${fmtINRFull(saving)}`,
          detail: `${betterRegime} regime saves more for your income level. Check Tax Vault for details.`,
          tab: "tax",
        });
      }
    }
    // Insurance adequacy — recommend 10× annual income life cover
    const totalLifeCover = [...(state.termPlans || []), ...(state.lic || [])].reduce(
      (s, p) => s + Number((p as any).coverAmount || (p as any).sumAssured || 0),
      0
    );
    if (
      metrics.annualIncome > 0 &&
      totalLifeCover > 0 &&
      totalLifeCover < metrics.annualIncome * 10
    ) {
      const shortfall = metrics.annualIncome * 10 - totalLifeCover;
      list.push({
        level: "warn",
        title: "Under-insured: life cover below 10× income",
        detail: `Cover ${fmtINRFull(totalLifeCover)} vs recommended ${fmtINRFull(metrics.annualIncome * 10)}. Shortfall: ${fmtINRFull(shortfall)}`,
        tab: "insurance",
      });
    }
    // Low savings rate alert
    if (metrics.monthIncome > 0 && metrics.monthExpense > 0 && metrics.savingsRate < 10) {
      list.push({
        level: "warn",
        title: `Low savings rate: ${metrics.savingsRate.toFixed(0)}%`,
        detail: `Saving only ${metrics.savingsRate.toFixed(0)}% of monthly income. Target 20%+ for long-term financial security.`,
        tab: "analytics",
      });
    }
    // Insurance premium due within 30 days
    // Compute next annual due date from the policy start date's anniversary
    const getNextAnniversary = (startDateStr: string): string | null => {
      if (!startDateStr) return null;
      const start = new Date(startDateStr);
      if (isNaN(start.getTime())) return null;
      const thisYear = new Date(now.getFullYear(), start.getMonth(), start.getDate());
      const candidate =
        thisYear <= now
          ? new Date(now.getFullYear() + 1, start.getMonth(), start.getDate())
          : thisYear;
      return getLocalDateString(candidate);
    };
    const allPolicies = [
      ...(state.lic || []).map((p: any) => ({
        name: p.planName || "LIC Policy",
        start: p.commencementDate,
        premium: p.annualPremium,
        expiry: p.maturityDate,
      })),
      ...(state.termPlans || []).map((p: any) => ({
        name: p.planName || "Term Plan",
        start: p.startDate,
        premium: p.annualPremium,
        expiry: p.expiryDate,
      })),
      ...(state.investmentPlans || []).map((p: any) => ({
        name: p.planName || "Investment Plan",
        start: p.commencementDate,
        premium: p.annualPremium,
        expiry: p.maturityDate,
      })),
    ];
    allPolicies.forEach((pol) => {
      if (!pol.premium || Number(pol.premium) <= 0) return;
      if (pol.expiry && new Date(pol.expiry) < now) return; // expired policy
      const nextDue = getNextAnniversary(pol.start);
      if (!nextDue) return;
      const daysToRenew = Math.ceil((new Date(nextDue).getTime() - now.getTime()) / 86400000);
      if (daysToRenew >= 0 && daysToRenew <= 30) {
        const lvl = daysToRenew <= 7 ? "error" : "warn";
        list.push({
          level: lvl,
          title: `${pol.name} premium due in ${daysToRenew}d`,
          detail: `Annual premium: ${fmtINRFull(pol.premium)} — due on ${nextDue}`,
          tab: "insurance",
        });
      }
    });
    // Low bank balance alert — flag accounts below ₹5,000
    state.bankAccounts.forEach((acc: any) => {
      const bal = Number(acc.balance || 0);
      if (bal > 0 && bal < 5000) {
        list.push({
          level: "warn",
          title: `Low balance: ${acc.bankName || "Bank account"}`,
          detail: `${fmtINRFull(bal)} remaining — consider topping up`,
          tab: "banks",
        });
      }
    });
    // ── Feature 15: Smart Alert Extensions ──
    // FD maturity alerts (within 30 days)
    (state.fixedDeposits || []).forEach((fd: any) => {
      if (!fd.maturityDate) return;
      const days = Math.ceil(
        (new Date(fd.maturityDate + "T00:00:00").getTime() - todayMidnight) / 86400000
      );
      if (days >= 0 && days <= 30) {
        list.push({
          level: days <= 7 ? "error" : "warn",
          title: `FD maturing in ${days}d`,
          detail: `${fd.bank || "FD"} — Principal: ${fmtINRFull(fd.principal)}. Decide: reinvest or withdraw.`,
          tab: "investments",
        });
      }
    });
    // Govt Scheme maturity alerts (within 30 days) — these never surfaced
    // anywhere before, so a matured SSY/NSC/KVP/SCSS/POMIS/RBI Bond could sit
    // unnoticed indefinitely once it stops earning at the matured rate.
    (state.govtSchemes || []).forEach((sc: any) => {
      if (!sc.maturityDate) return;
      const rule = SCHEME_RULES[sc.schemeType];
      if (!rule || rule.growth === "none") return;
      const days = Math.ceil(
        (new Date(sc.maturityDate + "T00:00:00").getTime() - todayMidnight) / 86400000
      );
      if (days >= 0 && days <= 30) {
        list.push({
          level: days <= 7 ? "error" : "warn",
          title: `${sc.schemeName || sc.schemeType} maturing in ${days}d`,
          detail: `Balance: ${fmtINRFull(sc.currentBalance)}. Decide: renew, withdraw, or reinvest.`,
          tab: "govtschemes",
        });
      }
    });
    // Govt Scheme insurance premium due (PMJJBY/PMSBY annual renewal)
    (state.govtSchemes || []).forEach((sc: any) => {
      const rule = SCHEME_RULES[sc.schemeType];
      if (!rule || rule.growth !== "none") return;
      const premium = Number(sc.premium || 0);
      if (!premium || !sc.startDate) return;
      const nextDueStr = nextAnnualOccurrence(sc.startDate, today());
      const days = Math.ceil(
        (new Date(nextDueStr + "T00:00:00").getTime() - todayMidnight) / 86400000
      );
      if (days >= 0 && days <= 15) {
        list.push({
          level: days <= 3 ? "error" : "warn",
          title: `${sc.schemeName || sc.schemeType} premium due in ${days}d`,
          detail: `Annual premium of ${fmtINRFull(premium)} due — renew to keep the cover active.`,
          tab: "govtschemes",
        });
      }
    });
    // SIP bounce detection: SIP exists but no MF buy in current month
    const currentMonth = ym;
    const mfBuyMonths = new Set(
      (state.mutualFunds || []).map((m: any) => (m.buyDate || "").slice(0, 7))
    );
    (state.sips || []).forEach((sip: any) => {
      if (!sip.startDate || sip.startDate > today()) return;
      if (!mfBuyMonths.has(currentMonth)) {
        const schemeName = sip.scheme || sip.name || "SIP";
        list.push({
          level: "warn",
          title: `Possible missed SIP: ${schemeName}`,
          detail: `No MF purchase recorded for ${currentMonth}. Verify if SIP was executed.`,
          tab: "sip",
        });
      }
    });
    // Dividend tracker reminder (quarterly check)
    const dividendStocks = (state.stocks || []).length;
    const dividendsRecorded = (state.dividends || []).length;
    if (dividendStocks > 5 && dividendsRecorded === 0) {
      list.push({
        level: "info",
        title: "No dividends tracked yet",
        detail: `You hold ${dividendStocks} stocks. Track dividends for accurate tax reporting.`,
        tab: "investments",
      });
    }

    // Watchlist price target alerts
    if (marketData && state.wishlistItems?.length) {
      state.wishlistItems.forEach((it: any) => {
        if (!it.targetPrice || !it.symbol) return;
        const exch = it.exchange || "NSE";
        const yfSym = `${it.symbol.replace(/\.(NS|BO)$/i, "")}.${exch === "BSE" ? "BO" : "NS"}`;
        const md = marketData[yfSym];
        if (!md?.price) return;
        const price = Number(md.price);
        const targetPx = Number(it.targetPrice);
        if (price <= targetPx) {
          list.push({
            level: "info",
            title: `${it.symbol} hit target price`,
            detail: `Current ₹${price.toLocaleString("en-IN", { minimumFractionDigits: 2 })} ≤ target ₹${targetPx.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
            tab: "demat",
          });
        }
      });
    }

    // Health insurance renewal alerts (30 days)
    (state.healthInsurance || []).forEach((p: any) => {
      if (!p.renewalDate) return;
      const days = Math.ceil(
        (new Date(p.renewalDate).getTime() - new Date(today() + "T00:00:00").getTime()) / 86400000
      );
      if (days >= 0 && days <= 30) {
        list.push({
          level: days <= 7 ? "error" : "warn",
          title: `Health insurance renews in ${days}d`,
          detail: `${p.insurer}${p.policyName ? ` (${p.policyName})` : ""} — cover ₹${Number(p.sumInsured || 0).toLocaleString("en-IN")}`,
          tab: "healthinsurance",
        });
      }
    });

    // Bill payment due alerts (5 days, skip auto-pay)
    (state.billPayments || []).forEach((b: any) => {
      if (!b.dueDay || b.autoPay) return;
      const dueDay = Number(b.dueDay);
      const n = new Date();
      let billDue = new Date(n.getFullYear(), n.getMonth(), dueDay);
      if (billDue.getTime() < n.getTime())
        billDue = new Date(n.getFullYear(), n.getMonth() + 1, dueDay);
      const days = Math.ceil((billDue.getTime() - n.getTime()) / 86400000);
      if (days >= 0 && days <= 5) {
        list.push({
          level: days <= 2 ? "error" : "warn",
          title: `${b.nickname || b.provider} bill due in ${days}d`,
          detail: `${(b.category || "").replace(/_/g, " ")} · ₹${Number(b.amount || 0).toLocaleString("en-IN")}`,
          tab: "bills",
        });
      }
    });

    // Real Estate builder demand alerts (overdue or due within 10 days) — these are
    // one-off milestone payments with real consequences for missing them (interest
    // penalty, risk of booking cancellation under the builder-buyer agreement), but
    // previously surfaced nowhere outside manually opening the Real Estate tab.
    {
      const ucPropertyIds = new Set(
        (state.realEstateProperties || [])
          .filter((p: any) => p.status === "under-construction")
          .map((p: any) => p.id)
      );
      (state.realEstateDemands || []).forEach((d: any) => {
        if (!ucPropertyIds.has(d.propertyId) || d.status === "paid" || !d.dueDate) return;
        const totalAmt = Number(d.totalAmount || d.amount || 0);
        const paidForDemand = (state.realEstatePayments || [])
          .filter((p: any) => p.demandId === d.id)
          .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
        const remaining = Math.max(0, totalAmt - paidForDemand);
        if (remaining <= 0) return;
        const days = Math.ceil(
          (new Date(d.dueDate + "T00:00:00").getTime() -
            new Date(today() + "T00:00:00").getTime()) /
            86400000
        );
        if (days > 10) return;
        const property = (state.realEstateProperties || []).find(
          (p: any) => p.id === d.propertyId
        );
        list.push({
          level: days < 0 || days <= 3 ? "error" : "warn",
          title:
            days < 0
              ? `Builder demand overdue by ${Math.abs(days)}d`
              : `Builder demand due in ${days}d`,
          detail: `${property?.name || "Property"} — ${d.milestone || "Demand"} · ₹${remaining.toLocaleString("en-IN")} pending`,
          tab: "realestate",
        });
      });
    }

    const ORDER = { error: 0, warn: 1, info: 2 };
    return list
      .filter((a) => {
        const dismissUntil = state.dismissedAlerts?.[a.title];
        return !(dismissUntil && dismissUntil > Date.now());
      })
      .sort((a, b) => (ORDER[a.level] ?? 2) - (ORDER[b.level] ?? 2));
  }, [
    state.transactions,
    state.budgets,
    state.creditCards,
    state.goals,
    state.subscriptions,
    state.loansTaken,
    state.rentedProperties,
    state.netWorthHistory,
    state.termPlans,
    state.lic,
    state.investmentPlans,
    state.bankAccounts,
    metrics.monthExpense,
    metrics.cashInBanks,
    metrics.monthIncome,
    metrics.annualIncome,
    metrics.savingsRate,
    state.dismissedAlerts,
    state.profile?.regime,
    state.fixedDeposits,
    state.sips,
    state.mutualFunds,
    state.stocks,
    state.dividends,
    state.wishlistItems,
    state.healthInsurance,
    state.billPayments,
    state.realEstateProperties,
    state.realEstateDemands,
    state.realEstatePayments,
    state.govtSchemes,
    marketData,
  ]);

  return alerts;
}
