import { useMemo } from "react";
import {
  fmtINRFull,
  today,
  monthsBetween,
  calculateEpfBalance,
  rdMaturity,
  getCCDueDate,
  calcTaxNew,
  calcTaxOld,
  getTaxDueForDashboard,
} from "../utils/finance";

export function useMetrics(
  state: any,
  activeProfile: string,
  marketData: any
): {
  filteredState: any;
  metrics: any;
  assetBreakdown: any[];
  trendData: any[];
  greeting: { title: string; subtitle: string };
} {
  const filteredState = useMemo(() => {
    if (activeProfile === "all") return state;
    const filterByOwner = (arr: any[]) =>
      (Array.isArray(arr) ? arr : []).filter((item) => item.owner === activeProfile);
    return {
      ...state,
      bankAccounts: filterByOwner(state.bankAccounts),
      transactions: filterByOwner(state.transactions),
      fixedDeposits: filterByOwner(state.fixedDeposits),
      recurringDeposits: filterByOwner(state.recurringDeposits),
      bonds: filterByOwner(state.bonds),
      ppf: filterByOwner(state.ppf),
      nps: filterByOwner(state.nps),
      epf: filterByOwner(state.epf),
      lic: filterByOwner(state.lic),
      termPlans: filterByOwner(state.termPlans),
      investmentPlans: filterByOwner(state.investmentPlans),
      mutualFunds: filterByOwner(state.mutualFunds),
      stocks: filterByOwner(state.stocks),
      demat: filterByOwner(state.demat),
      creditCards: filterByOwner(state.creditCards),
      prepaidCards: filterByOwner(state.prepaidCards),
      loansTaken: filterByOwner(state.loansTaken),
      loansGiven: filterByOwner(state.loansGiven),
      informalBorrowed: filterByOwner(state.informalBorrowed || []),
      informalLent: filterByOwner(state.informalLent || []),
      rentalProperties: filterByOwner(state.rentalProperties || []),
      rentedProperties: filterByOwner(state.rentedProperties || []),
      realEstateProperties: filterByOwner(state.realEstateProperties || []),
      realEstateDemands: filterByOwner(state.realEstateDemands || []),
      realEstatePayments: filterByOwner(state.realEstatePayments || []),
      vehicles: filterByOwner(state.vehicles || []),
      dividends: filterByOwner(state.dividends || []),
      documents: filterByOwner(state.documents || []),
      subscriptions: filterByOwner(state.subscriptions),
      goals: filterByOwner(state.goals),
      income: filterByOwner(state.income),
      taxPayments: filterByOwner(state.taxPayments),
      budgets: filterByOwner(state.budgets),
      recurringExpenses: filterByOwner(state.recurringExpenses || []),
      sips: filterByOwner(state.sips),
      stockSells: filterByOwner(state.stockSells || []),
      mfSells: filterByOwner(state.mfSells || []),
      corporateActions: filterByOwner(state.corporateActions || []),
      goldHoldings: filterByOwner(state.goldHoldings || []),
      lifeEvents: filterByOwner(state.lifeEvents || []),
    };
  }, [state, activeProfile]);

  // ================== COMPUTED FINANCIAL METRICS ==================
  const metrics = useMemo(() => {
    const sState = filteredState;
    const cashInBanks = (sState.bankAccounts || []).reduce((s: number, a: any) => s + Number(a.balance || 0), 0);
    const fdValue = sState.fixedDeposits.reduce((s: number, f: any) => s + Number(f.principal || 0), 0);
    const rdValue = sState.recurringDeposits.reduce((s: number, r: any) => {
      const elapsed = r.startDate
        ? Math.min(Number(r.tenureMonths || 0), Math.max(0, monthsBetween(r.startDate, today())))
        : Number(r.tenureMonths || 0);
      return s + rdMaturity(Number(r.monthly || 0), Number(r.rate || 0), elapsed);
    }, 0);
    const bondValue = sState.bonds.reduce(
      (s: number, b: any) => s + Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || 0),
      0
    );
    const ppfValue = sState.ppf.reduce((s: number, p: any) => s + Number(p.balance || 0), 0);
    const npsValue = sState.nps.reduce((s: number, n: any) => s + Number(n.balance || 0), 0);
    const epfValue = (sState.epf || []).reduce((s: number, e: any) => s + calculateEpfBalance(e), 0);
    const licValue = sState.lic.reduce((s: number, l: any) => {
      const txTotal = (l.transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      return s + (txTotal > 0 ? txTotal : Number(l.premiumPaid || 0));
    }, 0);
    const investmentValue = sState.investmentPlans.reduce((s: number, ip: any) => {
      const txTotal = (ip.transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      return s + (txTotal > 0 ? txTotal : Number(ip.premiumPaid || 0));
    }, 0);
    const mfValue = sState.mutualFunds.reduce((s: number, m: any) => {
      const liveNav = Number(m.currentNav || 0);
      const fallbackNav =
        liveNav ||
        Number(m.buyNav || 0) ||
        (Number(m.units || 1) > 0 ? Number(m.invested || 0) / Number(m.units || 1) : 0);
      return s + Number(m.units || 0) * fallbackNav;
    }, 0);
    const mfInvested = sState.mutualFunds.reduce(
      (s: number, m: any) =>
        s + (m.buyNav ? Number(m.units || 0) * Number(m.buyNav || 0) : Number(m.invested || 0)),
      0
    );
    const stockValue = sState.stocks.reduce((s: number, st: any) => {
      const yfSym = `${st.symbol.replace(/\.(NS|BO)$/i, "")}.${(st.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
      const md = marketData[yfSym];
      const livePrice = md?.price ?? Number(st.currentPrice || 0);
      const fallbackPrice = livePrice || Number(st.avgPrice || 0);
      return s + Number(st.qty || 0) * fallbackPrice;
    }, 0);
    const stockInvested = sState.stocks.reduce(
      (s: number, st: any) => s + Number(st.qty || 0) * Number(st.avgPrice || 0),
      0
    );

    const loansGivenValue = sState.loansGiven.reduce((s: number, l: any) => s + Number(l.outstanding || 0), 0);
    const prepaidValue = sState.prepaidCards
      .filter((p: any) => (p.status || "").toLowerCase() !== "closed")
      .reduce((s: number, p: any) => {
        const txns = p.transactions || [];
        const loaded = txns
          .filter((t: any) => t.type === "load")
          .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const spent = txns
          .filter((t: any) => t.type === "spend")
          .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        return s + (loaded - spent);
      }, 0);

    const ccOutstanding = sState.creditCards
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .reduce((s: number, c: any) => s + Number(c.outstanding || 0), 0);
    const loansTakenValue = sState.loansTaken.reduce((s: number, l: any) => s + Number(l.outstanding || 0), 0);
    const rentalDepositLiability = (sState.rentalProperties || []).reduce((s: number, p: any) => {
      const actualDeposit =
        p.depositTransactions && p.depositTransactions.length > 0
          ? p.depositTransactions.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0)
          : Number(p.securityDeposit || 0);
      const deducted = (p.depositDeductions || []).reduce((a: number, d: any) => a + Number(d.amount || 0), 0);
      const returned = Number(p.depositReturned || 0);
      return s + Math.max(0, actualDeposit - deducted - returned);
    }, 0);
    const rentedDepositAsset = (sState.rentedProperties || []).reduce((s: number, p: any) => {
      const actualDeposit =
        p.depositTransactions && p.depositTransactions.length > 0
          ? p.depositTransactions.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0)
          : Number(p.securityDeposit || 0);
      const returned = Number(p.depositReturned || 0);
      return s + Math.max(0, actualDeposit - returned);
    }, 0);

    const informalLentValue = (sState.informalLent || []).reduce((s: number, person: any) => {
      const tranches = person.tranches || [];
      const payments = person.payments || [];
      const totalT = tranches.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const totalP = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      return s + Math.max(0, totalT - totalP);
    }, 0);

    const informalBorrowedValue = (sState.informalBorrowed || []).reduce((s: number, person: any) => {
      const tranches = person.tranches || [];
      const payments = person.payments || [];
      const totalT = tranches.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const totalP = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      return s + Math.max(0, totalT - totalP);
    }, 0);

    const rentalPropertiesAsset = (sState.rentalProperties || []).reduce(
      (s: number, r: any) => s + Number(r.propertyValue || 0),
      0
    );

    // Vehicles: counted at current market value (user-maintained estimate), fallback to purchase price
    const vehicleAsset = (sState.vehicles || []).reduce(
      (s: number, v: any) => s + Number(v.currentValue || v.purchasePrice || 0),
      0
    );

    // Real estate: owned + under-construction properties counted at market value (or agreement value)
    const realEstateAsset = (sState.realEstateProperties || [])
      .filter((p: any) => p.status !== "sold")
      .reduce((s: number, p: any) => s + Number(p.marketValue || p.agreementValue || 0), 0);

    // Outstanding builder demands for under-construction properties = contractual cash obligations
    const realEstateOutstanding = (() => {
      const ucIds = new Set(
        (sState.realEstateProperties || [])
          .filter((p: any) => p.status === "under-construction")
          .map((p: any) => p.id)
      );
      const demanded = (sState.realEstateDemands || [])
        .filter((d: any) => ucIds.has(d.propertyId))
        .reduce((s: number, d: any) => s + Number(d.totalAmount || d.amount || 0), 0);
      const paid = (sState.realEstatePayments || [])
        .filter((p: any) => ucIds.has(p.propertyId))
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      return Math.max(0, demanded - paid);
    })();

    const totalAssets =
      cashInBanks +
      fdValue +
      rdValue +
      bondValue +
      ppfValue +
      npsValue +
      epfValue +
      licValue +
      investmentValue +
      mfValue +
      stockValue +
      loansGivenValue +
      prepaidValue +
      rentedDepositAsset +
      informalLentValue +
      rentalPropertiesAsset +
      realEstateAsset +
      vehicleAsset;
    const totalLiabilities =
      ccOutstanding + loansTakenValue + rentalDepositLiability + informalBorrowedValue + realEstateOutstanding;
    const netWorth = totalAssets - totalLiabilities;

    // Income/Expense current month
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthTxns = sState.transactions.filter((t: any) => t.date && t.date.startsWith(ym));

    // Prefer current month's manual/explicit income ledger entries if present, fallback to credit transactions
    const explicitIncomeMonth = (sState.income || [])
      .filter((i: any) => i.date && i.date.startsWith(ym))
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    const txnIncomeMonth = monthTxns
      .filter((t: any) => t.type === "credit")
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const monthIncome = explicitIncomeMonth > 0 ? explicitIncomeMonth : txnIncomeMonth;

    const rentPaidThisMonth = (sState.rentedProperties || []).reduce((sum: number, p: any) => {
      const paymentsThisMonth = (p.payments || [])
        .filter((pay: any) => pay.date && pay.date.startsWith(ym))
        .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
      return sum + paymentsThisMonth;
    }, 0);

    const monthExpense =
      monthTxns.filter((t: any) => t.type === "debit").reduce((s: number, t: any) => s + Number(t.amount || 0), 0) +
      rentPaidThisMonth;

    // Annual income from income ledger
    const fyStart = new Date(`${sState.profile.fy.split("-")[0]}-04-01`);
    const explicitIncome = sState.income
      .filter((i: any) => new Date(i.date) >= fyStart)
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    const txnIncome = sState.transactions
      .filter((t: any) => t.type === "credit" && t.date && new Date(t.date) >= fyStart)
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const annualizedCurrentMonth = (monthIncome || 0) * 12;
    // Prefer explicit ledger -> FY-to-date credit txns -> annualised single month (least accurate)
    const annualIncome = explicitIncome || txnIncome || annualizedCurrentMonth || 0;

    const subTotal = sState.subscriptions
      .filter((sub: any) => !sub.paused)
      .reduce((s: number, sub: any) => {
        const m =
          sub.cycle === "yearly"
            ? Number(sub.amount || 0) / 12
            : sub.cycle === "quarterly"
              ? Number(sub.amount || 0) / 3
              : Number(sub.amount || 0);
        return s + m;
      }, 0);

    const liquidAssets = cashInBanks + mfValue + stockValue;
    const lockedAssets =
      fdValue + rdValue + bondValue + ppfValue + npsValue + epfValue + licValue + investmentValue + realEstateAsset + vehicleAsset;
    const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0;
    const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

    // FOIR: total monthly EMI / monthly income -- safe lending threshold is <40%
    // Only include active loans (monthsRemaining unset OR > 0; explicitly 0 means fully paid)
    const totalMonthlyEMI = (sState.loansTaken || [])
      .filter((l: any) => Number(l.monthsRemaining || 1) > 0)
      .reduce((s: number, l: any) => s + Number(l.emi || 0), 0);
    const foir = monthIncome > 0 ? (totalMonthlyEMI / monthIncome) * 100 : 0;

    // Credit utilization: cc outstanding / cc total limit
    const totalCCLimit = (sState.creditCards || [])
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .reduce((s: number, c: any) => s + Number((c as any).limit || (c as any).cardLimit || 0), 0);
    const creditUtilization = totalCCLimit > 0 ? (ccOutstanding / totalCCLimit) * 100 : 0;

    // Compute FY-aware tax liability with auto-detected deductions and manual overrides
    const taxDue = getTaxDueForDashboard(sState, annualIncome);

    const expenseBreakdownMap: Record<string, number> = monthTxns
      .filter((t: any) => t.type === "debit")
      .reduce((acc: Record<string, number>, t: any) => {
        const cat = t.category || "Uncategorized";
        acc[cat] = (acc[cat] || 0) + Number(t.amount || 0);
        return acc;
      }, {} as Record<string, number>);

    // Add rental-ledger rent only when there are no "Rent"-categorised debit transactions
    // for the month. If the user already logged rent in the bank transactions tab, adding
    // rentPaidThisMonth on top would double-count the same outflow.
    if (rentPaidThisMonth > 0 && !expenseBreakdownMap["Rent"]) {
      expenseBreakdownMap["Rent"] = rentPaidThisMonth;
    }

    const expenseBreakdown = Object.keys(expenseBreakdownMap)
      .map((k) => ({
        name: k,
        value: expenseBreakdownMap[k],
      }))
      .sort((a, b) => b.value - a.value);

    const portfolioPerformance = [
      { name: "Mutual Funds", Invested: mfInvested, Current: mfValue },
      { name: "Stocks", Invested: stockInvested, Current: stockValue },
    ].filter((x) => x.Invested > 0 || x.Current > 0);

    const totalGoalTarget = sState.goals.reduce((s: number, g: any) => s + Number(g.targetAmount || 0), 0);
    const totalGoalSaved = sState.goals.reduce((s: number, g: any) => s + Number(g.currentAmount || 0), 0);
    const totalGoalRemaining = Math.max(0, totalGoalTarget - totalGoalSaved);
    const overallGoalPct = totalGoalTarget > 0 ? (totalGoalSaved / totalGoalTarget) * 100 : 0;
    const goalsCompleted = sState.goals.filter(
      (g: any) => Number(g.targetAmount) > 0 && Number(g.currentAmount) >= Number(g.targetAmount)
    ).length;
    return {
      cashInBanks,
      fdValue,
      rdValue,
      bondValue,
      ppfValue,
      npsValue,
      epfValue,
      licValue,
      investmentValue,
      mfValue,
      mfInvested,
      stockValue,
      stockInvested,
      ccOutstanding,
      loansTakenValue,
      loansGivenValue,
      prepaidValue,
      rentalDepositLiability,
      rentedDepositAsset,
      totalAssets,
      totalLiabilities,
      netWorth,
      monthIncome,
      monthExpense,
      annualIncome,
      subTotal,
      mfPnL: mfValue - mfInvested,
      stockPnL: stockValue - stockInvested,
      liquidAssets,
      lockedAssets,
      realEstateAsset,
      realEstateOutstanding,
      vehicleAsset,
      informalLentValue,
      informalBorrowedValue,
      rentalPropertiesAsset,
      savingsRate,
      debtToAssetRatio,
      taxDue,
      expenseBreakdown,
      portfolioPerformance,
      totalGoalTarget,
      totalGoalSaved,
      totalGoalRemaining,
      overallGoalPct,
      goalsCompleted,
      totalMonthlyEMI,
      foir,
      totalCCLimit,
      creditUtilization,
      stockSectorBreakdown: (() => {
        const sectors: Record<string, number> = {};
        sState.stocks.forEach((s: any) => {
          const yfSym = `${s.symbol.replace(/\.(NS|BO)$/i, "")}.${(s.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
          const md = marketData[yfSym];
          const sector = md?.sector || "Others";
          const price = md?.price ?? Number(s.currentPrice || 0);
          const value = Number(s.qty || 0) * price;
          sectors[sector] = (sectors[sector] || 0) + value;
        });
        return Object.entries(sectors)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
      })(),
      stockCapBreakdown: (() => {
        const caps: Record<string, number> = {
          "Large Cap": 0,
          "Mid Cap": 0,
          "Small Cap": 0,
          "Micro Cap": 0,
        };
        sState.stocks.forEach((s: any) => {
          const yfSym = `${s.symbol.replace(/\.(NS|BO)$/i, "")}.${(s.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
          const md = marketData[yfSym];
          const mCap = Number(md?.marketCap || 0);
          const price = md?.price ?? Number(s.currentPrice || 0);
          const value = Number(s.qty || 0) * price;

          // Cap Definitions (INR)
          // 1 Cr = 10,000,000
          // Large Cap: > 20,000 Cr = 200,000,000,000
          // Mid Cap: 5,000 Cr - 20,000 Cr
          // Small Cap: 500 Cr - 5,000 Cr
          // Micro Cap: < 500 Cr
          if (mCap >= 200000000000) caps["Large Cap"] += value;
          else if (mCap >= 50000000000) caps["Mid Cap"] += value;
          else if (mCap >= 5000000000) caps["Small Cap"] += value;
          else caps["Micro Cap"] += value;
        });
        return Object.entries(caps)
          .map(([name, value]) => ({ name, value }))
          .filter((c) => c.value > 0);
      })(),
    };
  }, [filteredState, marketData]);

  const assetBreakdown = useMemo(
    () =>
      [
        { name: "Bank Cash", value: metrics.cashInBanks },
        { name: "Fixed Deposits", value: metrics.fdValue },
        { name: "Recurring Deposits", value: metrics.rdValue },
        { name: "Mutual Funds", value: metrics.mfValue },
        { name: "Stocks", value: metrics.stockValue },
        { name: "PPF", value: metrics.ppfValue },
        { name: "NPS", value: metrics.npsValue },
        { name: "EPF", value: metrics.epfValue },
        { name: "Bonds", value: metrics.bondValue },
        { name: "LIC", value: metrics.licValue },
        { name: "Investment Plans", value: metrics.investmentValue },
        { name: "Loans Given", value: metrics.loansGivenValue },
        { name: "Informal Loans Given", value: metrics.informalLentValue },
        { name: "Rental Properties", value: metrics.rentalPropertiesAsset },
        { name: "Security Deposit", value: metrics.rentedDepositAsset },
        { name: "Prepaid Cards", value: metrics.prepaidValue },
        { name: "Real Estate", value: metrics.realEstateAsset },
        { name: "Vehicles", value: metrics.vehicleAsset },
      ].filter((x) => x.value > 0),
    [metrics]
  );

  // Monthly trend for last 12 months -- mirrors monthExpense by including rental payments
  const trendData = useMemo(() => {
    const arr = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-IN", { month: "short" });
      const txns = filteredState.transactions.filter((t: any) => t.date && t.date.startsWith(ym));
      // Mirror metrics.monthIncome: prefer explicit income ledger for this month,
      // fall back to credit transactions -- exactly the same priority as the dashboard.
      const explicitInc = (filteredState.income || [])
        .filter((inc: any) => inc.date && inc.date.startsWith(ym))
        .reduce((s: number, inc: any) => s + Number(inc.amount || 0), 0);
      const txnInc = txns
        .filter((t: any) => t.type === "credit")
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const inc = explicitInc > 0 ? explicitInc : txnInc;
      const txnExp = txns
        .filter((t: any) => t.type === "debit")
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      // Include rent paid via rental ledger (rentedProperties.payments) so the
      // trend chart stays consistent with the monthExpense metric on the dashboard.
      const rentExp = (filteredState.rentedProperties || []).reduce((sum: number, p: any) => {
        return (
          sum +
          (p.payments || [])
            .filter((pay: any) => pay.date && pay.date.startsWith(ym))
            .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0)
        );
      }, 0);
      const exp = txnExp + rentExp;
      arr.push({ month: label, income: inc, expense: exp, net: inc - exp });
    }
    return arr;
  }, [filteredState.transactions, filteredState.rentedProperties, filteredState.income]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
    const name = state.profile?.name || "there";

    const todayMidnight = new Date(today() + "T00:00:00").getTime();
    const day = 86400000;
    let currentWeek = 0;
    let prevWeek = 0;
    filteredState.transactions
      .filter((t: any) => t.type === "debit" && t.date)
      .forEach((t: any) => {
        const txMidnight = new Date(t.date + "T00:00:00").getTime();
        const diff = todayMidnight - txMidnight;
        if (diff >= 0 && diff < 7 * day) currentWeek += Number(t.amount);
        else if (diff >= 7 * day && diff < 14 * day) prevWeek += Number(t.amount);
      });

    let spendInsight = "";
    if (prevWeek > 0) {
      const pct = Math.abs((currentWeek - prevWeek) / prevWeek) * 100;
      if (currentWeek < prevWeek)
        spendInsight = `Your spending is down ${pct.toFixed(0)}% this week.`;
      else if (currentWeek > prevWeek + 500)
        spendInsight = `Your spending is up ${pct.toFixed(0)}% this week.`;
    } else if (currentWeek > 0) {
      spendInsight = `You've spent ${fmtINRFull(currentWeek)} this week.`;
    }

    return { title: `Good ${timeOfDay}, ${name}.`, subtitle: spendInsight };
  }, [filteredState.transactions, state.profile]);

  return { filteredState, metrics, assetBreakdown, trendData, greeting };
}
