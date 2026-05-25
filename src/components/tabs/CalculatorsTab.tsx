// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Calculator,
  TrendingUp,
  Clock,
  Briefcase,
  BarChart2,
  Flame,
  Shield,
  HelpCircle,
  ArrowRightLeft,
  Coins,
  Repeat,
  FileText,
  Wallet,
  Sparkles,
  PieChart as PieIcon,
  CheckCircle2,
  AlertTriangle,
  Info
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, fdMaturity, rdMaturity } from "../../utils/finance";
import { Card } from "../ui/Card";
import { StatCard } from "../ui/StatCard";

interface CalculatorsTabProps {
  metrics: any;
}

export const CalculatorsTab: React.FC<CalculatorsTabProps> = ({ metrics }) => {
  const [calcTab, setCalcTab] = useState<"emi" | "sip" | "cagr" | "fire" | "fdrd" | "loan-invest" | "projection">("emi");

  // ── 1. EMI CALCULATOR STATE & LOGIC ──
  const [emiP, setEmiP] = useState("1000000");
  const [emiR, setEmiR] = useState("8.5");
  const [emiN, setEmiN] = useState("240");

  const emiResult = useMemo(() => {
    const p = Math.max(0, Number(emiP) || 0);
    const r = Math.max(0, (Number(emiR) || 0) / 12 / 100);
    const n = Math.max(1, Number(emiN) || 1);
    
    if (r === 0) return { emi: p / n, total: p, interest: 0 };
    const emi = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    return { 
      emi: isNaN(emi) ? 0 : emi, 
      total: isNaN(emi) ? p : emi * n, 
      interest: isNaN(emi) ? 0 : emi * n - p 
    };
  }, [emiP, emiR, emiN]);

  const emiPieData = useMemo(() => {
    return [
      { name: "Principal Amount", value: Math.max(0, Number(emiP) || 0), color: THEME.accent },
      { name: "Total Interest", value: Math.max(0, emiResult.interest), color: THEME.gold }
    ];
  }, [emiP, emiResult.interest]);


  // ── 2. SIP RETURNS STATE & LOGIC ──
  const [sipAmt, setSipAmt] = useState("10000");
  const [sipYrs, setSipYrs] = useState("10");
  const [sipRate, setSipRate] = useState("12");

  const sipResult = useMemo(() => {
    const m = Math.max(0, Number(sipAmt) || 0);
    const y = Math.max(0.1, Number(sipYrs) || 1);
    const r = Math.max(0, (Number(sipRate) || 0) / 12 / 100);
    const n = Math.round(y * 12);
    
    const corpus = r === 0 ? m * n : m * (Math.pow(1 + r, n) - 1) / r * (1 + r);
    return { 
      corpus: isNaN(corpus) ? m * n : corpus, 
      invested: m * n, 
      gains: isNaN(corpus) ? 0 : Math.max(0, corpus - m * n) 
    };
  }, [sipAmt, sipYrs, sipRate]);

  const sipPieData = useMemo(() => {
    return [
      { name: "Total Invested", value: sipResult.invested, color: THEME.muted },
      { name: "Compounded Gains", value: sipResult.gains, color: THEME.sage }
    ];
  }, [sipResult]);


  // ── 3. CAGR CALCULATOR STATE & LOGIC ──
  const [cagrInvested, setCagrInvested] = useState("100000");
  const [cagrCurrent, setCagrCurrent] = useState("200000");
  const [cagrYears, setCagrYears] = useState("5");

  const cagrResult = useMemo(() => {
    const inv = Math.max(0, Number(cagrInvested) || 0);
    const curr = Math.max(0, Number(cagrCurrent) || 0);
    const yrs = Math.max(0.01, Number(cagrYears) || 0);
    if (inv <= 0 || curr <= 0 || yrs <= 0) return { cagr: null, absoluteReturn: 0, absolutePct: 0 };
    const cagr = (Math.pow(curr / inv, 1 / yrs) - 1) * 100;
    return { 
      cagr: isNaN(cagr) ? null : cagr, 
      absoluteReturn: curr - inv, 
      absolutePct: ((curr - inv) / inv) * 100 
    };
  }, [cagrInvested, cagrCurrent, cagrYears]);


  // ── 4. FIRE RETIREMENT STATE & LOGIC ──
  const [fireAge, setFireAge] = useState("30");
  const [fireRetireAge, setFireRetireAge] = useState("55");
  const [fireExpense, setFireExpense] = useState("50000");
  const [firePortfolio, setFirePortfolio] = useState(() => String(metrics?.netWorth || 1000000));
  const [fireSavings, setFireSavings] = useState("30000");
  const [fireInflation, setFireInflation] = useState("6");
  const [firePreReturn, setFirePreReturn] = useState("12");
  const [firePostReturn, setFirePostReturn] = useState("8");
  const [fireLifeExp, setFireLifeExp] = useState("85");

  const fireResult = useMemo(() => {
    const curAge = Math.max(1, Number(fireAge) || 30);
    const retAge = Math.max(curAge + 1, Number(fireRetireAge) || 55);
    const monthlyExp = Math.max(0, Number(fireExpense) || 0);
    const curPort = Math.max(0, Number(firePortfolio) || 0);
    const mSavings = Math.max(0, Number(fireSavings) || 0);
    const infl = Math.max(0, Number(fireInflation) || 6) / 100;
    const preRet = Math.max(0, Number(firePreReturn) || 12) / 100;
    const postRet = Math.max(0, Number(firePostReturn) || 8) / 100;
    const lifeExp = Math.max(retAge + 1, Number(fireLifeExp) || 85);

    const yrsToRet = retAge - curAge;
    const yrsInRet = lifeExp - retAge;

    // Inflation adjusted monthly/annual expenses at retirement
    const retMonthlyExp = monthlyExp * Math.pow(1 + infl, yrsToRet);
    const retAnnualExp = retMonthlyExp * 12;

    // Post-retirement inflation-adjusted return rate (Real Return Rate)
    const realPostReturn = (1 + postRet) / (1 + infl) - 1;

    // Calculate required retirement corpus using inflation-adjusted annuity formula
    let reqCorpus = 0;
    if (realPostReturn === 0) {
      reqCorpus = retAnnualExp * yrsInRet;
    } else {
      reqCorpus = retAnnualExp * ((1 - Math.pow(1 + realPostReturn, -yrsInRet)) / realPostReturn);
    }

    // Future value of current savings at retirement
    const fvCurrent = curPort * Math.pow(1 + preRet, yrsToRet);

    // Future value of monthly savings at retirement (compounded monthly)
    const monthlyPreRate = preRet / 12;
    const monthsToRet = yrsToRet * 12;
    let fvSavings = 0;
    if (monthlyPreRate === 0) {
      fvSavings = mSavings * monthsToRet;
    } else {
      fvSavings = mSavings * ((Math.pow(1 + monthlyPreRate, monthsToRet) - 1) / monthlyPreRate) * (1 + monthlyPreRate);
    }

    const projectedCorpus = fvCurrent + fvSavings;
    const gap = reqCorpus - projectedCorpus;
    const percentOnTrack = reqCorpus > 0 ? Math.min(100, Math.round((projectedCorpus / reqCorpus) * 100)) : 0;
    const safeWithdrawalRate = reqCorpus > 0 ? (retAnnualExp / reqCorpus) * 100 : 4;

    return {
      retMonthlyExp,
      retAnnualExp,
      reqCorpus,
      projectedCorpus,
      gap,
      percentOnTrack,
      safeWithdrawalRate,
      yrsToRet,
      yrsInRet
    };
  }, [fireAge, fireRetireAge, fireExpense, firePortfolio, fireSavings, fireInflation, firePreReturn, firePostReturn, fireLifeExp]);


  // ── 5. FD & RD MATURITY STATE & LOGIC ──
  const [fdrdType, setFdrdType] = useState<"fd" | "rd">("fd");
  const [fdAmt, setFdAmt] = useState("100000");
  const [fdRate, setFdRate] = useState("7.1");
  const [fdYrs, setFdYrs] = useState("5");
  const [fdComp, setFdComp] = useState("4"); // Quarterly default

  const [rdAmt, setRdAmt] = useState("5000");
  const [rdRate, setRdRate] = useState("6.8");
  const [rdMonths, setRdMonths] = useState("36");

  const fdrdResult = useMemo(() => {
    if (fdrdType === "fd") {
      const p = Math.max(0, Number(fdAmt) || 0);
      const r = Math.max(0, Number(fdRate) || 0);
      const y = Math.max(0, Number(fdYrs) || 0);
      const freq = Number(fdComp) || 4;
      const maturity = fdMaturity(p, r, y, freq);
      return {
        invested: p,
        maturity,
        interest: Math.max(0, maturity - p)
      };
    } else {
      const m = Math.max(0, Number(rdAmt) || 0);
      const r = Math.max(0, Number(rdRate) || 0);
      const mos = Math.max(0, Number(rdMonths) || 0);
      const maturity = rdMaturity(m, r, mos);
      return {
        invested: m * mos,
        maturity,
        interest: Math.max(0, maturity - m * mos)
      };
    }
  }, [fdrdType, fdAmt, fdRate, fdYrs, fdComp, rdAmt, rdRate, rdMonths]);

  const fdrdPieData = useMemo(() => {
    return [
      { name: "Principal Invested", value: fdrdResult.invested, color: THEME.accent },
      { name: "Interest Earned", value: fdrdResult.interest, color: THEME.sage }
    ];
  }, [fdrdResult]);


  // ── 6. LOAN VS INVEST ADVISOR STATE & LOGIC ──
  const [lviSurplus, setLviSurplus] = useState("10000");
  const [lviMode, setLviMode] = useState<"sip" | "lumpsum">("sip");
  const [lviLoanBal, setLviLoanBal] = useState("500000");
  const [lviLoanRate, setLviLoanRate] = useState("8.5");
  const [lviLoanTenure, setLviLoanTenure] = useState("120");
  const [lviInvestReturn, setLviInvestReturn] = useState("12");

  const lviResult = useMemo(() => {
    const surplus = Math.max(0, Number(lviSurplus) || 0);
    const loanBal = Math.max(0, Number(lviLoanBal) || 0);
    const loanRate = Math.max(0, Number(lviLoanRate) || 0);
    const N = Math.max(1, Number(lviLoanTenure) || 120);
    const invReturn = Math.max(0, Number(lviInvestReturn) || 0);

    const rLoan = loanRate / 12 / 100;
    const rInv = invReturn / 12 / 100;

    // EMI for the outstanding loan balance
    const emi = rLoan === 0 ? loanBal / N : (loanBal * rLoan * Math.pow(1 + rLoan, N)) / (Math.pow(1 + rLoan, N) - 1);
    const totalPaymentsNormal = emi * N;
    const totalInterestNormal = Math.max(0, totalPaymentsNormal - loanBal);

    if (lviMode === "sip") {
      // PATH A: Prepay Loan u/s prepaying "surplus" monthly
      let balance = loanBal;
      let monthsTaken = 0;
      let cumulativeInterestPrepay = 0;

      for (let m = 1; m <= N; m++) {
        if (balance <= 0) break;
        const interest = balance * rLoan;
        cumulativeInterestPrepay += interest;
        const principalRepaid = Math.min(balance, emi - interest);
        const extraPrepay = Math.min(balance - principalRepaid, surplus);
        balance = balance - (principalRepaid + extraPrepay);
        monthsTaken = m;
      }

      const interestSaved = Math.max(0, totalInterestNormal - cumulativeInterestPrepay);
      const monthsFreed = N - monthsTaken;

      // Compounding what they can invest AFTER loan is fully paid off early:
      // They can invest both (EMI + monthly surplus) for the remaining freed months!
      let wealthPrepayPath = 0;
      if (monthsFreed > 0) {
        const monthlyInvest = emi + surplus;
        wealthPrepayPath = rInv === 0 
          ? monthlyInvest * monthsFreed 
          : monthlyInvest * ((Math.pow(1 + rInv, monthsFreed) - 1) / rInv) * (1 + rInv);
      }

      // PATH B: Keep loan normal, invest surplus monthly for entire N months
      const wealthInvestPath = rInv === 0
        ? surplus * N
        : surplus * ((Math.pow(1 + rInv, N) - 1) / rInv) * (1 + rInv);

      const isInvestBetter = wealthInvestPath > wealthPrepayPath;
      const netBenefit = Math.abs(wealthInvestPath - wealthPrepayPath);

      return {
        emi,
        normalInterest: totalInterestNormal,
        monthsTaken,
        interestSaved,
        wealthPrepay: wealthPrepayPath,
        wealthInvest: wealthInvestPath,
        isInvestBetter,
        netBenefit,
        recommendation: isInvestBetter 
          ? `Invest your surplus ₹${fmtINR(surplus)}/mo. The compounding return of ${invReturn}% outweighs the ${loanRate}% loan interest rate.` 
          : `Prepay your loan with the surplus ₹${fmtINR(surplus)}/mo. Paying off the debt saves interest and frees up ₹${fmtINR(Math.round(emi + surplus))}/mo earlier to reinvest.`,
        tip: isInvestBetter 
          ? "Ensure your investment vehicle matches your target risk profile, as equity returns are variable compared to guaranteed debt savings."
          : "Prepaying a loan acts as a risk-free investment offering a guaranteed post-tax yield equal to the loan interest rate."
      };
    } else {
      // LUMPSUM MODE: prepay lumpsum immediately vs invest lumpsum immediately
      const lumpsum = surplus;

      // Path A: prepay lumpsum immediately (reduces principal)
      const balanceAfterLumpsum = Math.max(0, loanBal - lumpsum);
      let balance = balanceAfterLumpsum;
      let monthsTaken = 0;
      let cumulativeInterestPrepay = 0;

      for (let m = 1; m <= N; m++) {
        if (balance <= 0) break;
        const interest = balance * rLoan;
        cumulativeInterestPrepay += interest;
        const principalRepaid = Math.min(balance, emi - interest);
        balance = balance - principalRepaid;
        monthsTaken = m;
      }

      const interestSaved = Math.max(0, totalInterestNormal - cumulativeInterestPrepay);
      const monthsFreed = N - monthsTaken;

      // After loan ends early, invest the freed EMI amount for remaining months
      let wealthPrepayPath = 0;
      if (monthsFreed > 0) {
        wealthPrepayPath = rInv === 0
          ? emi * monthsFreed
          : emi * ((Math.pow(1 + rInv, monthsFreed) - 1) / rInv) * (1 + rInv);
      }

      // Path B: Keep loan, invest lumpsum immediately for N months
      const wealthInvestPath = lumpsum * Math.pow(1 + rInv, N);

      const isInvestBetter = wealthInvestPath > wealthPrepayPath;
      const netBenefit = Math.abs(wealthInvestPath - wealthPrepayPath);

      return {
        emi,
        normalInterest: totalInterestNormal,
        monthsTaken,
        interestSaved,
        wealthPrepay: wealthPrepayPath,
        wealthInvest: wealthInvestPath,
        isInvestBetter,
        netBenefit,
        recommendation: isInvestBetter
          ? `Invest the lump sum ₹${fmtINR(lumpsum)}. Growth at ${invReturn}% CAGR beats prepaying the ${loanRate}% loan.`
          : `Prepay the loan by ₹${fmtINR(lumpsum)} immediately. Eliminating debt early at ${loanRate}% guaranteed return is safer and yields higher value.`,
        tip: isInvestBetter
          ? "Ideal if surplus is placed in long-term index funds or high-yielding mutual funds."
          : "Prepaying saves interest immediately and provides secure, risk-free compounding value."
      };
    }
  }, [lviSurplus, lviMode, lviLoanBal, lviLoanRate, lviLoanTenure, lviInvestReturn]);


  // ── 7. NET WORTH PROJECTION LOGIC ──
  const [nwpSavings, setNwpSavings] = useState("30000");
  const [nwpReturn, setNwpReturn] = useState("10");
  const [nwpYears, setNwpYears] = useState("15");
  
  const nwpData = useMemo(() => {
    const current = Math.max(0, metrics?.netWorth || 0);
    const monthly = Math.max(0, Number(nwpSavings) || 0);
    const annualR = Math.max(0, Number(nwpReturn) || 0) / 100;
    const years = Math.max(1, Math.min(Number(nwpYears) || 15, 40));
    const startYear = new Date().getFullYear();
    const points: any[] = [];
    let corpus = current;
    for (let y = 0; y <= years; y++) {
      points.push({ year: startYear + y, value: Math.round(corpus) });
      const r = annualR / 12;
      corpus = r === 0
        ? corpus + monthly * 12
        : corpus * (1 + annualR) + monthly * (Math.pow(1 + r, 12) - 1) / r * (1 + r);
    }
    return points;
  }, [metrics?.netWorth, nwpSavings, nwpReturn, nwpYears]);


  // ── INPUT ROW HELPERS ──
  const inpRow = (lbl: string, val: string, set: (v: string) => void, placeholder = "") => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 600 }}>{lbl}</div>
      <input
        style={{
          width: "100%",
          padding: "10px 12px",
          background: "var(--t-card-bg)",
          border: `1.5px solid ${THEME.line}`,
          borderRadius: 10,
          color: THEME.ink,
          fontSize: 14,
        }}
        type="number"
        value={val}
        placeholder={placeholder}
        onChange={(e) => set(e.target.value)}
      />
    </div>
  );

  const sliderRow = (lbl: string, val: string, set: (v: string) => void, min: number, max: number, step = 1, unit = "") => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 600 }}>
        <span>{lbl}</span>
        <span style={{ color: THEME.accent, fontWeight: 800 }}>{val}{unit}</span>
      </div>
      <input
        style={{
          width: "100%",
          accentColor: THEME.accent,
          cursor: "pointer",
        }}
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={(e) => set(e.target.value)}
      />
    </div>
  );

  const resultRow = (lbl: string, val: number, highlight?: boolean, color?: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px dashed ${THEME.line}`, fontSize: 14 }}>
      <span style={{ color: THEME.muted, fontWeight: 500 }}>{lbl}</span>
      <span style={{ 
        fontWeight: highlight ? 900 : 700, 
        color: color || (highlight ? THEME.sage : THEME.ink),
        fontVariantNumeric: "tabular-nums"
      }}>
        {fmtINRFull(val)}
      </span>
    </div>
  );

  return (
    <div className="tab-content-enter">
      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: THEME.line, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.accent }}>
          <Calculator size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Wealth Calculators</h2>
          <p style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>Interactive planning suite for growth projection, liabilities, and retirement targeting</p>
        </div>
      </div>

      {/* ── PILL SELECTION BAR ── */}
      <div className="demat-portfolio-bar no-scrollbar" style={{ marginBottom: 24, padding: "4px" }}>
        {[
          { id: "emi", label: "EMI Calculator", icon: Clock },
          { id: "sip", label: "SIP Returns", icon: TrendingUp },
          { id: "cagr", label: "CAGR Calculator", icon: BarChart2 },
          { id: "fire", label: "FIRE Planner", icon: Flame },
          { id: "fdrd", label: "FD & RD Maturity", icon: Coins },
          { id: "loan-invest", label: "Loan vs Invest", icon: ArrowRightLeft },
          { id: "projection", label: "Wealth Projection", icon: Briefcase }
        ].map((t) => {
          const active = calcTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setCalcTab(t.id as any)}
              className={`demat-portfolio-pill ${active ? "active" : ""}`}
              style={active ? {
                background: "color-mix(in srgb, var(--t-accent) 10%, transparent)",
                color: THEME.accent,
                fontWeight: 700,
                border: `1.5px solid color-mix(in srgb, var(--t-accent) 25%, transparent)`
              } : {}}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── ACTIVE CALCULATOR CONTAINER ── */}
      <div className="bento-grid">
        
        {/* ── 1. EMI CALCULATOR ── */}
        {calcTab === "emi" && (
          <>
            <div className="bento-col-4">
              <Card style={{ padding: 24, height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Clock size={18} color={THEME.accent} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>EMI Calculator Parameters</div>
                </div>
                {inpRow("Loan Principal (₹)", emiP, setEmiP)}
                {sliderRow("Interest Rate", emiR, setEmiR, 1, 20, 0.1, "%")}
                {sliderRow("Tenure", emiN, setEmiN, 12, 360, 12, " months")}
              </Card>
            </div>
            <div className="bento-col-8">
              <Card style={{ padding: 24, height: "100%" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.muted, marginBottom: 20 }}>Principal vs Interest Breakdown</div>
                <div className="bento-grid" style={{ gap: 24 }}>
                  <div className="bento-col-6" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ padding: 18, background: "rgba(128,128,128,0.03)", borderRadius: 12, border: `1px solid ${THEME.line}` }}>
                      {resultRow("Monthly EMI Due", emiResult.emi, true, THEME.accent)}
                      {resultRow("Principal Amount", Number(emiP) || 0)}
                      {resultRow("Total Interest Paid", emiResult.interest, false, THEME.gold)}
                      {resultRow("Total Payments", emiResult.total)}
                    </div>
                  </div>
                  <div className="bento-col-6" style={{ height: 220, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={emiPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {emiPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmtINRFull(v)} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── 2. SIP RETURNS ── */}
        {calcTab === "sip" && (
          <>
            <div className="bento-col-4">
              <Card style={{ padding: 24, height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <TrendingUp size={18} color={THEME.sage} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>SIP Calculator Parameters</div>
                </div>
                {inpRow("Monthly Investment (₹)", sipAmt, setSipAmt)}
                {sliderRow("Expected Annual Return", sipRate, setSipRate, 1, 30, 0.5, "%")}
                {sliderRow("Period", sipYrs, setSipYrs, 1, 40, 1, " years")}
              </Card>
            </div>
            <div className="bento-col-8">
              <Card style={{ padding: 24, height: "100%" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.muted, marginBottom: 20 }}>Compounded Returns Projection</div>
                <div className="bento-grid" style={{ gap: 24 }}>
                  <div className="bento-col-6" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ padding: 18, background: "rgba(128,128,128,0.03)", borderRadius: 12, border: `1px solid ${THEME.line}` }}>
                      {resultRow("Estimated Future Value", sipResult.corpus, true, THEME.sage)}
                      {resultRow("Invested Amount", sipResult.invested)}
                      {resultRow("Wealth Gain", sipResult.gains, false, THEME.sage)}
                    </div>
                  </div>
                  <div className="bento-col-6" style={{ height: 220, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sipPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {sipPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmtINRFull(v)} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── 3. CAGR CALCULATOR ── */}
        {calcTab === "cagr" && (
          <>
            <div className="bento-col-4">
              <Card style={{ padding: 24, height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <BarChart2 size={18} color={THEME.rust} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>CAGR Parameters</div>
                </div>
                {inpRow("Initial Value / Invested (₹)", cagrInvested, setCagrInvested)}
                {inpRow("Final Value / Current (₹)", cagrCurrent, setCagrCurrent)}
                {sliderRow("Holding Period", cagrYears, setCagrYears, 0.5, 20, 0.5, " years")}
              </Card>
            </div>
            <div className="bento-col-8">
              <Card style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.muted, marginBottom: 20 }}>Annualized Compounded Growth Rate</div>
                <div style={{ padding: 24, background: "rgba(128,128,128,0.03)", borderRadius: 12, border: `1px solid ${THEME.line}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px dashed ${THEME.line}`, fontSize: 15 }}>
                    <span style={{ color: THEME.muted, fontWeight: 600 }}>CAGR Yield (Annualized)</span>
                    <span style={{ fontWeight: 900, fontSize: 26, color: cagrResult.cagr !== null && cagrResult.cagr >= 0 ? THEME.sage : THEME.rust }}>
                      {cagrResult.cagr !== null ? `${cagrResult.cagr.toFixed(2)}%` : "—"}
                    </span>
                  </div>
                  {resultRow("Absolute Wealth Gain", cagrResult.absoluteReturn, false, cagrResult.absoluteReturn >= 0 ? THEME.sage : THEME.rust)}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: 14 }}>
                    <span style={{ color: THEME.muted, fontWeight: 500 }}>Absolute Return %</span>
                    <span style={{ fontWeight: 700, color: cagrResult.absolutePct >= 0 ? THEME.sage : THEME.rust }}>
                      {cagrResult.absolutePct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── 4. FIRE RETIREMENT PLANNER ── */}
        {calcTab === "fire" && (
          <>
            <div className="bento-col-5">
              <Card style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Flame size={18} color={THEME.gold} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Retirement Parameters</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {inpRow("Current Age", fireAge, setFireAge)}
                  {inpRow("Retirement Age", fireRetireAge, setFireRetireAge)}
                </div>
                {inpRow("Current Monthly Expenses (₹)", fireExpense, setFireExpense)}
                {inpRow("Current Net Worth / Corpus (₹)", firePortfolio, setFirePortfolio)}
                {inpRow("Expected Monthly Savings (₹)", fireSavings, setFireSavings)}
                
                <div className="divider" style={{ margin: "20px 0 16px" }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, marginBottom: 12 }}>Economic & Yield Assumptions</div>
                
                {sliderRow("Inflation Rate", fireInflation, setFireInflation, 1, 15, 0.5, "%")}
                {sliderRow("Pre-Retirement Yield", firePreReturn, setFirePreReturn, 4, 25, 0.5, "%")}
                {sliderRow("Post-Retirement Yield", firePostReturn, setFirePostReturn, 4, 18, 0.5, "%")}
                {sliderRow("Life Expectancy", fireLifeExp, setFireLifeExp, 60, 100, 1, " yrs")}
              </Card>
            </div>
            
            <div className="bento-col-7" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Tracker Card */}
              <Card style={{ padding: 24, borderLeft: `4px solid ${fireResult.percentOnTrack >= 80 ? THEME.sage : fireResult.percentOnTrack >= 45 ? THEME.gold : THEME.rust}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: THEME.muted, letterSpacing: "0.08em" }}>Retirement Savings Status</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: THEME.ink, marginTop: 4 }}>
                      {fireResult.percentOnTrack}% Target Achieved
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: THEME.muted }}>Safe Withdrawal Rate</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: THEME.accent }}>{fireResult.safeWithdrawalRate.toFixed(2)}%</div>
                  </div>
                </div>

                {/* Progress fill bar */}
                <div style={{ height: 8, background: "rgba(128,128,128,0.06)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                  <div style={{ 
                    height: "100%", 
                    width: `${fireResult.percentOnTrack}%`, 
                    background: fireResult.percentOnTrack >= 80 ? THEME.sage : fireResult.percentOnTrack >= 45 ? THEME.gold : THEME.rust,
                    borderRadius: 10, 
                    transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)" 
                  }} />
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                  <span style={{ background: "rgba(128,128,128,0.04)", padding: "4px 8px", borderRadius: 6 }}>
                    ⏱️ Years to Retire: {fireResult.yrsToRet}
                  </span>
                  <span style={{ background: "rgba(128,128,128,0.04)", padding: "4px 8px", borderRadius: 6 }}>
                    🗓️ Years in Retirement: {fireResult.yrsInRet}
                  </span>
                </div>
              </Card>

              {/* Corpus Breakdown */}
              <Card style={{ padding: 24, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: THEME.muted, letterSpacing: "0.08em", marginBottom: 16 }}>Corpus & Safe Withdrawal Projection</div>
                <div style={{ padding: 18, background: "rgba(128,128,128,0.03)", borderRadius: 12, border: `1px solid ${THEME.line}` }}>
                  {resultRow("Monthly Expense at Retirement", fireResult.retMonthlyExp, false, THEME.gold)}
                  {resultRow("Target Corpus Required", fireResult.reqCorpus, true, THEME.accent)}
                  {resultRow("Projected Corpus Available", fireResult.projectedCorpus, false, THEME.sage)}
                  
                  <div className="divider" style={{ margin: "14px 0" }} />
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                    <span style={{ color: THEME.muted, fontWeight: 700 }}>
                      {fireResult.gap > 0 ? "Retirement Shortfall" : "Financial Surplus"}
                    </span>
                    <span style={{ 
                      fontWeight: 900, 
                      fontSize: 18, 
                      color: fireResult.gap > 0 ? THEME.rust : THEME.sage 
                    }}>
                      {fmtINRFull(Math.abs(fireResult.gap))}
                    </span>
                  </div>
                </div>

                <div style={{ 
                  marginTop: 18, 
                  padding: "12px 14px", 
                  borderRadius: 10, 
                  background: fireResult.gap <= 0 ? "rgba(5,150,105,0.05)" : "rgba(220,38,38,0.05)", 
                  border: `1.5px solid ${fireResult.gap <= 0 ? THEME.sage : THEME.rust}22`,
                  fontSize: 12.5, 
                  lineHeight: 1.5,
                  fontWeight: 600,
                  color: fireResult.gap <= 0 ? THEME.sage : THEME.rust,
                  display: "flex",
                  gap: 10,
                  alignItems: "center"
                }}>
                  {fireResult.gap <= 0 ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Congratulations! Your projected retirement corpus fully covers your target expense with a secure safe withdrawal profile. You are fully on track to achieve financial independence early.</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} />
                      <span>To close the shortfall gap of {fmtINRFull(fireResult.gap)}, consider increasing your monthly savings by {fmtINRFull(Math.round(fireResult.gap / (fireResult.yrsToRet * 12)))}/mo or pushing retirement age out by 2-3 years.</span>
                    </>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── 5. FD & RD MATURITY CALCULATOR ── */}
        {calcTab === "fdrd" && (
          <>
            <div className="bento-col-4">
              <Card style={{ padding: 24, height: "100%" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 20, background: "rgba(128,128,128,0.03)", padding: 4, borderRadius: 10 }}>
                  <button 
                    onClick={() => setFdrdType("fd")} 
                    style={{ 
                      flex: 1, padding: "8px 12px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      background: fdrdType === "fd" ? "var(--surface-0)" : "transparent",
                      color: fdrdType === "fd" ? THEME.accent : THEME.muted,
                      boxShadow: fdrdType === "fd" ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
                    }}
                  >
                    Fixed Deposit (FD)
                  </button>
                  <button 
                    onClick={() => setFdrdType("rd")} 
                    style={{ 
                      flex: 1, padding: "8px 12px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      background: fdrdType === "rd" ? "var(--surface-0)" : "transparent",
                      color: fdrdType === "rd" ? THEME.accent : THEME.muted,
                      boxShadow: fdrdType === "rd" ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
                    }}
                  >
                    Recurring Deposit (RD)
                  </button>
                </div>

                {fdrdType === "fd" ? (
                  <>
                    {inpRow("Lump Sum Deposit (₹)", fdAmt, setFdAmt)}
                    {sliderRow("Annual Interest Rate", fdRate, setFdRate, 2, 12, 0.05, "%")}
                    {sliderRow("Tenure", fdYrs, setFdYrs, 1, 15, 1, " years")}
                    
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 600 }}>Compounding Interval</div>
                      <select 
                        value={fdComp} 
                        onChange={(e) => setFdComp(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "var(--t-card-bg)",
                          border: `1.5px solid ${THEME.line}`,
                          borderRadius: 10,
                          color: THEME.ink,
                          fontSize: 14,
                        }}
                      >
                        <option value="4">Quarterly (Standard)</option>
                        <option value="12">Monthly</option>
                        <option value="2">Half-Yearly</option>
                        <option value="1">Yearly</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    {inpRow("Monthly Deposit Amount (₹)", rdAmt, setRdAmt)}
                    {sliderRow("Annual Interest Rate", rdRate, setRdRate, 2, 12, 0.05, "%")}
                    {sliderRow("Tenure", rdMonths, setRdMonths, 6, 120, 6, " months")}
                  </>
                )}
              </Card>
            </div>
            
            <div className="bento-col-8">
              <Card style={{ padding: 24, height: "100%" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.muted, marginBottom: 20 }}>Maturity Proceeds Breakdown</div>
                <div className="bento-grid" style={{ gap: 24 }}>
                  <div className="bento-col-6" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ padding: 18, background: "rgba(128,128,128,0.03)", borderRadius: 12, border: `1px solid ${THEME.line}` }}>
                      {resultRow("Estimated Maturity proceeds", fdrdResult.maturity, true, THEME.sage)}
                      {resultRow("Total Invested Principal", fdrdResult.invested)}
                      {resultRow("Compounded Interest Earned", fdrdResult.interest, false, THEME.sage)}
                    </div>
                  </div>
                  <div className="bento-col-6" style={{ height: 220, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={fdrdPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {fdrdPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmtINRFull(v)} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── 6. LOAN VS INVEST ADVISOR ── */}
        {calcTab === "loan-invest" && (
          <>
            <div className="bento-col-4">
              <Card style={{ padding: 24, height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <ArrowRightLeft size={18} color={THEME.accent} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Comparison Inputs</div>
                </div>
                
                <div style={{ display: "flex", gap: 8, marginBottom: 16, background: "rgba(128,128,128,0.03)", padding: 4, borderRadius: 10 }}>
                  <button 
                    onClick={() => setLviMode("sip")} 
                    style={{ 
                      flex: 1, padding: "8px 12px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      background: lviMode === "sip" ? "var(--surface-0)" : "transparent",
                      color: lviMode === "sip" ? THEME.accent : THEME.muted,
                      boxShadow: lviMode === "sip" ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
                    }}
                  >
                    Monthly Surplus
                  </button>
                  <button 
                    onClick={() => setLviMode("lumpsum")} 
                    style={{ 
                      flex: 1, padding: "8px 12px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      background: lviMode === "lumpsum" ? "var(--surface-0)" : "transparent",
                      color: lviMode === "lumpsum" ? THEME.accent : THEME.muted,
                      boxShadow: lviMode === "lumpsum" ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
                    }}
                  >
                    Lump Sum cash
                  </button>
                </div>

                {inpRow(lviMode === "sip" ? "Monthly Surplus (₹)" : "Lump Sum Available (₹)", lviSurplus, setLviSurplus)}
                {inpRow("Loan Outstanding balance (₹)", lviLoanBal, setLviLoanBal)}
                {sliderRow("Loan Interest Rate", lviLoanRate, setLviLoanRate, 3, 20, 0.1, "%")}
                {sliderRow("Remaining Tenure", lviLoanTenure, setLviLoanTenure, 12, 360, 12, " months")}
                {sliderRow("Expected Invest Return", lviInvestReturn, setLviInvestReturn, 4, 25, 0.5, "%")}
              </Card>
            </div>
            
            <div className="bento-col-8" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Recommendation Advisory Card */}
              <Card style={{ padding: 24, borderLeft: `4px solid ${lviResult.isInvestBetter ? THEME.sage : THEME.gold}` }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ 
                    width: 44, height: 44, borderRadius: 12, 
                    background: lviResult.isInvestBetter ? "rgba(5,150,105,0.08)" : "rgba(217,119,6,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: lviResult.isInvestBetter ? THEME.sage : THEME.gold,
                    flexShrink: 0
                  }}>
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: THEME.muted, letterSpacing: "0.08em" }}>Advisory Verdict</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, marginTop: 4, lineHeight: 1.5 }}>
                      {lviResult.recommendation}
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 10, fontStyle: "italic", borderTop: `1px solid ${THEME.line}`, paddingTop: 8 }}>
                      💡 <b>CTO/CFO Tip:</b> {lviResult.tip}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Wealth Projection Comparison */}
              <Card style={{ padding: 24, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: THEME.muted, letterSpacing: "0.08em", marginBottom: 16 }}>Financial Breakdown</div>
                <div className="bento-grid" style={{ gap: 20 }}>
                  <div className="bento-col-6">
                    <div style={{ padding: 16, background: "rgba(128,128,128,0.02)", borderRadius: 12, border: `1.5px solid ${lviResult.isInvestBetter ? THEME.line : THEME.gold}44` }}>
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: THEME.muted, marginBottom: 8 }}>Path A: Prepay Loan</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink }}>{fmtINRFull(lviResult.wealthPrepay)}</div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>Net wealth at month {lviLoanTenure}</div>
                      
                      <div className="divider" style={{ margin: "10px 0" }} />
                      <div style={{ fontSize: 12, color: THEME.sage, fontWeight: 700 }}>
                        ✓ Paid off in {lviResult.monthsTaken} months
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>
                        Saved {fmtINRFull(lviResult.interestSaved)} in interest
                      </div>
                    </div>
                  </div>
                  
                  <div className="bento-col-6">
                    <div style={{ padding: 16, background: "rgba(128,128,128,0.02)", borderRadius: 12, border: `1.5px solid ${lviResult.isInvestBetter ? THEME.sage : THEME.line}44` }}>
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: THEME.muted, marginBottom: 8 }}>Path B: Invest Surplus</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink }}>{fmtINRFull(lviResult.wealthInvest)}</div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>Net wealth at month {lviLoanTenure}</div>
                      
                      <div className="divider" style={{ margin: "10px 0" }} />
                      <div style={{ fontSize: 12, color: THEME.accent, fontWeight: 700 }}>
                        ✓ Standard EMI remains
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>
                        Compound return at {lviInvestReturn}%
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(128,128,128,0.03)", padding: "14px 18px", borderRadius: 12, border: `1px solid ${THEME.line}`, marginTop: 20 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: THEME.muted }}>Net Benefit Difference</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: THEME.sage }}>
                    {fmtINRFull(lviResult.netBenefit)}
                  </span>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── 7. NET WORTH PROJECTION ── */}
        {calcTab === "projection" && (
          <div className="bento-col-12">
            <Card style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <Briefcase size={18} color={THEME.gold} />
                <div style={{ fontSize: 16, fontWeight: 700 }}>Compound Net Worth Projection</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                {inpRow("Monthly Future Savings (₹)", nwpSavings, setNwpSavings)}
                {sliderRow("Expected Annual Return", nwpReturn, setNwpReturn, 2, 25, 0.5, "%")}
                {sliderRow("Projection Range", nwpYears, setNwpYears, 5, 40, 1, " years")}
              </div>

              <div className="bento-grid" style={{ gap: 32 }}>
                <div className="bento-col-8" style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={nwpData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gNwp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={THEME.accent} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={THEME.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: "var(--t-muted)" }} />
                      <YAxis tickFormatter={fmtINR} tick={{ fontSize: 11, fill: "var(--t-muted)" }} />
                      <Tooltip formatter={(v: any) => fmtINRFull(v)} contentStyle={{ background: "var(--t-card-bg)", borderColor: THEME.line }} />
                      <Area type="monotone" dataKey="value" stroke={THEME.accent} strokeWidth={3} fill="url(#gNwp)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="bento-col-4" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
                  <div style={{ padding: 16, background: "rgba(128,128,128,0.03)", borderRadius: 12, border: `1px solid ${THEME.line}` }}>
                    <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 600 }}>Starting Net Worth Today</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink }}>{fmtINRFull(nwpData[0]?.value)}</div>
                  </div>
                  <div style={{ padding: 16, background: "color-mix(in srgb, var(--t-sage) 8%, transparent)", borderRadius: 12, border: `1px solid ${THEME.sage}22` }}>
                    <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 600 }}>Projected Value in {nwpYears} Years</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: THEME.sage }}>{fmtINRFull(nwpData[nwpData.length - 1]?.value)}</div>
                  </div>
                  <div style={{ padding: 16, border: `1.5px dashed ${THEME.line}`, borderRadius: 12 }}>
                    <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 600 }}>Total Growth Multiple</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: THEME.gold }}>
                      {nwpData[0]?.value > 0 
                        ? `${((nwpData[nwpData.length - 1]?.value || 0) / nwpData[0].value).toFixed(1)}x Capital`
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
};
