import { useMemo } from "react";
import {
  fmtINRFull,
  today,
  monthsBetween,
  getCCDueDate,
  calcTaxNewByFY,
  calcTaxOldByFY,
  alertDismissKey,
} from "../utils/finance";
import { getCurrentFY } from "../utils/appConstants";
import { dueStatus } from "../components/tabs/BillPaymentTab";
import { useMilestoneEvents } from "./useFinancialEvents";

export type Alert = {
  level: "error" | "warn" | "info";
  title: string;
  detail: string;
  tab: string;
};

// Far-future cutoff so useMilestoneEvents returns every upcoming event
// unfiltered by horizon — this hook applies its own, tighter per-category
// day-windows (5/7/10/15/30 days) below instead of the Calendar's
// 3/6/12-month selector.
const FAR_FUTURE_CUTOFF = "2099-12-31";

export function useAlerts(state: any, metrics: any, marketData?: Record<string, any>): Alert[] {
  // Called at the hook's top level (not inside the useMemo below) since this
  // is itself a hook. Several categories below — FD/govt-scheme maturity,
  // insurance premiums, health insurance renewal, CC annual fee, real estate
  // demands, prepaid card expiry — used to independently re-walk `state` and
  // recompute the same dates useMilestoneEvents already computes (correctly,
  // with fixes made earlier this session: annualizePremium, leap-day-safe
  // nextAnnualOccurrence, matured-policy/closed-card guards). Sourcing from
  // the shared hook here means those fixes can't drift out of sync with this
  // file again. Title/detail text and day-windows are kept byte-identical to
  // before so existing alert dismissals (keyed by exact title text) still match.
  const milestoneEvents = useMilestoneEvents(state, FAR_FUTURE_CUTOFF);

  const alerts = useMemo(() => {
    const list: { level: "error" | "warn" | "info"; title: string; detail: string; tab: string }[] =
      [];
    const milestoneByType = (type: string) => milestoneEvents.filter((e: any) => e.type === type);
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
      // Autopay cards settle themselves — mirrors the same suppression already applied to
      // recurring bills (`!b.dueDay || b.autoPay` below) so this alert doesn't nag about a
      // payment the user has no manual action to take on.
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed" && !c.autoPay)
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
    // Low emergency fund — uses the same liquid-assets figure (bank + near-term
    // FDs + liquid MF + prepaid) as the dedicated Emergency Fund tab, instead of
    // bank cash alone, so this alert doesn't fire (or stay silent) on a number
    // the tab it links to would disagree with.
    if (
      metrics.emergencyFund.monthlyExpense > 0 &&
      metrics.emergencyFund.monthsCovered < 3
    ) {
      list.push({
        level: "warn",
        title: "Low emergency fund",
        detail: `Only ${metrics.emergencyFund.monthsCovered.toFixed(1)} months of expenses covered`,
        tab: "emergencyfund",
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
    milestoneByType("cc_fee").forEach((e: any) => {
      const c = e.source;
      const days = e.days;
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
    // Credit card utilization — compute from state (unfiltered) for consistent alert coverage.
    // Shared-pool cards (sharedGroup) must count the pool limit once (max across the group),
    // not the sum of each card's sub-limit — same dedup as useMetrics.ts/CreditTab.tsx, otherwise
    // this alert's utilization comes out artificially low for anyone using a shared pool and can
    // fail to fire when it should.
    const activeCCForAlert = state.creditCards.filter(
      (c: any) => (c.status || "").toLowerCase() !== "closed"
    );
    const ccGroupPoolsForAlert: Record<string, number> = {};
    activeCCForAlert.forEach((c: any) => {
      if (c.sharedGroup) {
        ccGroupPoolsForAlert[c.sharedGroup] = Math.max(
          ccGroupPoolsForAlert[c.sharedGroup] || 0,
          Number(c.sharedGroupLimit) || 0
        );
      }
    });
    const totalCCLimitForAlert =
      activeCCForAlert
        .filter((c: any) => !c.sharedGroup)
        .reduce((s: number, c: any) => s + Number((c as any).limit || (c as any).cardLimit || 0), 0) +
      (Object.values(ccGroupPoolsForAlert) as number[]).reduce((s: number, v: number) => s + v, 0);
    const ccOutstandingForAlert = activeCCForAlert.reduce(
      (s: number, c: any) => s + Number(c.outstanding || 0),
      0
    );
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
    // Credit score staleness + score-drop — grouped per family member + bureau so a drop
    // in one person's CIBIL doesn't get diluted/hidden by another member's steady score,
    // and a stale check for one person doesn't get masked by another's recent one.
    {
      const scoreGroups: Record<string, any[]> = {};
      (state.creditScores || []).forEach((s: any) => {
        const key = `${s.owner || "self"}|${s.bureau || "CIBIL"}`;
        (scoreGroups[key] = scoreGroups[key] || []).push(s);
      });
      const distinctScoreOwners = new Set((state.creditScores || []).map((s: any) => s.owner || "self"));
      const showOwnerLabel = distinctScoreOwners.size > 1;
      Object.entries(scoreGroups).forEach(([key, entries]) => {
        const [owner, bureauName] = key.split("|");
        const ownerLabel = showOwnerLabel ? `${owner.charAt(0).toUpperCase()}${owner.slice(1)} ` : "";
        const sortedEntries = [...entries].sort((a: any, b: any) =>
          (a.checkDate || "").localeCompare(b.checkDate || "")
        );
        const latestEntry = sortedEntries[sortedEntries.length - 1];
        const prevEntry = sortedEntries[sortedEntries.length - 2];
        if (!latestEntry?.checkDate) return;
        const daysSince = Math.ceil(
          (todayMidnight - new Date(latestEntry.checkDate + "T00:00:00").getTime()) / 86400000
        );
        if (daysSince >= 180) {
          list.push({
            level: "info",
            title: `${ownerLabel}${bureauName} score check is ${daysSince}d old`,
            detail: "Log a fresh check to keep your credit history up to date.",
            tab: "creditscore",
          });
        }
        if (prevEntry) {
          const drop = Number(prevEntry.score) - Number(latestEntry.score);
          if (drop >= 15) {
            list.push({
              level: drop >= 40 ? "error" : "warn",
              title: `${ownerLabel}${bureauName} score dropped ${drop} pts`,
              detail: `${prevEntry.score} → ${latestEntry.score} since your last check — review recent credit activity.`,
              tab: "creditscore",
            });
          }
        }
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
      .filter((l: any) => Number(l.outstanding || 0) > 0 && Number(l.monthsRemaining ?? 1) > 0)
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
    // Insurance premium due within 30 days — next-due date, matured-policy
    // guard, and true annualized premium all come from useMilestoneEvents now.
    milestoneByType("insurance_premium").forEach((e: any) => {
      const p = e.source;
      const days = e.days;
      if (days >= 0 && days <= 30) {
        // Matches the original per-collection fallback text exactly (LIC's
        // fallback was "LIC Policy", not the shared hook's "LIC" label) so
        // existing dismissals — keyed by this exact title — still match.
        const fallback = e.sourceLabel === "LIC" ? "LIC Policy" : e.sourceLabel;
        const name = p.planName || fallback;
        const lvl = days <= 7 ? "error" : "warn";
        list.push({
          level: lvl,
          title: `${name} premium due in ${days}d`,
          detail: `Annual premium: ${fmtINRFull(e.amount)} — due on ${e.date}`,
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
    milestoneByType("fd_maturity").forEach((e: any) => {
      const fd = e.source;
      const days = e.days;
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
    milestoneByType("govt_scheme_maturity").forEach((e: any) => {
      const sc = e.source;
      const days = e.days;
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
    milestoneByType("govt_scheme_premium").forEach((e: any) => {
      const sc = e.source;
      const days = e.days;
      if (days >= 0 && days <= 15) {
        list.push({
          level: days <= 3 ? "error" : "warn",
          title: `${sc.schemeName || sc.schemeType} premium due in ${days}d`,
          detail: `Annual premium of ${fmtINRFull(e.amount)} due — renew to keep the cover active.`,
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

    // Upcoming ex-dividend date alerts (7 days) — reuses the exDividendDate field
    // piggybacked onto the app-wide stock-price poll (api/stock-price.js) so this
    // doesn't cost an extra Yahoo round-trip. Miss the ex-date and you miss that
    // payout entirely, so this is worth a heads-up alongside the other date-driven
    // alerts (CC due, insurance renewal, etc.) rather than only surfacing inside
    // the Dividend Calendar tab itself.
    if (marketData && state.stocks?.length) {
      const seenExDate = new Set<string>();
      state.stocks.forEach((s: any) => {
        if (!s.symbol || Number(s.qty || 0) <= 0) return;
        const base = String(s.symbol).replace(/\.(NS|BO)$/i, "");
        const exch = s.exchange || "NSE";
        const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
        if (seenExDate.has(yfSym)) return;
        seenExDate.add(yfSym);
        const exTs = marketData[yfSym]?.exDividendDate;
        if (!exTs) return;
        const exDate = new Date(Number(exTs) * 1000).toISOString().slice(0, 10);
        const days = Math.ceil(
          (new Date(exDate + "T00:00:00").getTime() - new Date(today() + "T00:00:00").getTime()) /
            86400000
        );
        if (days >= 0 && days <= 7) {
          list.push({
            level: days <= 1 ? "warn" : "info",
            title: `${base} goes ex-dividend in ${days}d`,
            detail:
              days === 0
                ? "Must own before market close today to receive this dividend."
                : `Buy/hold before ${exDate} to qualify for the upcoming payout.`,
            tab: "dividendcal",
          });
        }
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
    milestoneByType("health_insurance").forEach((e: any) => {
      const p = e.source;
      const days = e.days;
      if (days >= 0 && days <= 30) {
        list.push({
          level: days <= 7 ? "error" : "warn",
          title: `Health insurance renews in ${days}d`,
          detail: `${p.insurer}${p.policyName ? ` (${p.policyName})` : ""} — cover ₹${Number(p.sumInsured || 0).toLocaleString("en-IN")}`,
          tab: "healthinsurance",
        });
      }
    });

    // Bill payment due alerts (5 days, skip auto-pay, skip if already paid this cycle).
    // Reuses BillPaymentTab's dueStatus() instead of a second hand-rolled date calc —
    // the previous inline version compared a midnight due-date against a full "now"
    // timestamp (`billDue.getTime() < n.getTime()`), which is true for essentially any
    // time after 00:00:00 on the due day itself, so a bill due *today* always looked
    // "already passed" and silently got pushed a whole month out — it never alerted.
    // It also didn't clamp dueDay to the last day of shorter months (Feb, 30-day months).
    (state.billPayments || []).forEach((b: any) => {
      if (!b.dueDay || b.autoPay) return;
      const billHist = (state.billPaymentHistory || [])
        .filter((h: any) => h.billId === b.id)
        .sort((a: any, c: any) => (c.paidDate || "").localeCompare(a.paidDate || ""));
      const status = dueStatus(Number(b.dueDay), billHist[0]?.paidDate);
      if (status.paid) return;
      const days = status.daysLeft;
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
    milestoneByType("realestate_demand").forEach((e: any) => {
      const days = e.days;
      if (days > 10) return;
      const d = e.source;
      const property = e.sourceProperty;
      const remaining = e.sourceRemaining;
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

    // Prepaid card expiring soon (within 30 days) — cards that have an expiry date
    // set and are still active.
    milestoneByType("prepaid_card_expiry").forEach((e: any) => {
      const pc = e.source;
      const days = e.days;
      if (days >= 0 && days <= 30) {
        list.push({
          level: days <= 7 ? "error" : "warn",
          title: `${pc.cardName || "Prepaid card"} expires in ${days}d`,
          detail: `${pc.cardType || "Prepaid Card"}${pc.last4 ? ` •••• ${pc.last4}` : ""} — use or transfer any remaining balance before it expires.`,
          tab: "credit",
        });
      }
    });
    // Prepaid card low balance — flags active cards below the user-set threshold
    // (or a ₹100 default), computed the same load/spend way as useMetrics.
    (state.prepaidCards || []).forEach((pc: any) => {
      if ((pc.status || "").toLowerCase() === "closed") return;
      const threshold = Number(pc.lowBalanceThreshold || 0) || 100;
      const txns = pc.transactions || [];
      const loaded = txns
        .filter((t: any) => t.type === "load")
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const spent = txns
        .filter((t: any) => t.type === "spend")
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const balance = loaded - spent;
      if (balance > 0 && balance < threshold) {
        list.push({
          level: "warn",
          title: `Low balance: ${pc.cardName || "Prepaid card"}`,
          detail: `${fmtINRFull(balance)} remaining — consider topping up`,
          tab: "credit",
        });
      }
    });

    const ORDER = { error: 0, warn: 1, info: 2 };
    return list
      .filter((a) => {
        const dismissUntil = state.dismissedAlerts?.[alertDismissKey(a.title)];
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
    state.billPaymentHistory,
    state.realEstateProperties,
    state.realEstateDemands,
    state.realEstatePayments,
    state.govtSchemes,
    state.prepaidCards,
    state.creditScores,
    marketData,
    milestoneEvents,
  ]);

  return alerts;
}
