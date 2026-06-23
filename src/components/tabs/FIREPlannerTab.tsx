// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Flame,
  TrendingUp,
  IndianRupee,
  Calendar,
  Target,
  Clock,
  Shield,
  Zap,
  CheckCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";

const SWR_DEFAULT = 4; // Safe Withdrawal Rate

export const FIREPlannerTab = ({ state, metrics }) => {
  const [monthlyExpense, setMonthlyExpense] = useState(
    Math.round(metrics.monthExpense || 50000)
  );
  const [inflationRate, setInflationRate] = useState(6);
  const [returnRate, setReturnRate] = useState(12);
  const [postRetireReturn, setPostRetireReturn] = useState(8);
  const [swr, setSwr] = useState(SWR_DEFAULT);
  const [currentAge, setCurrentAge] = useState(30);
  const [targetAge, setTargetAge] = useState(45);
  const [lifeExpectancy, setLifeExpectancy] = useState(85);
  const [monthlySavings, setMonthlySavings] = useState(
    Math.max(0, Math.round((metrics.monthIncome || 0) - (metrics.monthExpense || 0)))
  );

  const fireCalc = useMemo(() => {
    const annualExpense = monthlyExpense * 12;
    const yearsToFIRE = targetAge - currentAge;
    const retirementYears = lifeExpectancy - targetAge;

    // FIRE number = Annual expense at retirement / SWR
    const expenseAtRetirement = annualExpense * Math.pow(1 + inflationRate / 100, yearsToFIRE);
    const fireNumber = expenseAtRetirement / (swr / 100);

    // Coast FIRE: amount needed today that grows to FIRE number by target age with no further savings
    const coastFIRE = fireNumber / Math.pow(1 + returnRate / 100, yearsToFIRE);

    // Barista FIRE: half of expenses covered by part-time work, other half by investments
    const baristaNumber = fireNumber / 2;

    // Lean FIRE: 60% of current expenses
    const leanFIREExpense = annualExpense * 0.6;
    const leanFIRE = (leanFIREExpense * Math.pow(1 + inflationRate / 100, yearsToFIRE)) / (swr / 100);

    // Fat FIRE: 150% of current expenses
    const fatFIREExpense = annualExpense * 1.5;
    const fatFIRE = (fatFIREExpense * Math.pow(1 + inflationRate / 100, yearsToFIRE)) / (swr / 100);

    // Current progress
    const currentNW = metrics.netWorth || 0;
    const progress = fireNumber > 0 ? (currentNW / fireNumber) * 100 : 0;
    const coastProgress = coastFIRE > 0 ? (currentNW / coastFIRE) * 100 : 0;

    // Years to FIRE based on savings rate
    const annualSavings = monthlySavings * 12;
    const monthlyRet = returnRate / 100 / 12;
    let corpus = currentNW;
    let monthsToFIRE = 0;
    const maxMonths = 600; // 50 years cap
    while (corpus < fireNumber && monthsToFIRE < maxMonths) {
      corpus = corpus * (1 + monthlyRet) + monthlySavings;
      monthsToFIRE++;
    }
    const yearsToFIREActual = monthsToFIRE / 12;
    const fireAge = currentAge + yearsToFIREActual;

    // Drawdown simulation post-retirement
    const drawdown = [];
    let drawCorpus = fireNumber;
    const monthlyInflAdj = inflationRate / 100 / 12;
    const monthlyPostReturn = postRetireReturn / 100 / 12;
    let monthlyWithdraw = expenseAtRetirement / 12;
    for (let m = 0; m <= retirementYears * 12 && drawCorpus > 0; m++) {
      if (m % 12 === 0) {
        drawdown.push({
          year: targetAge + Math.floor(m / 12),
          corpus: Math.round(drawCorpus),
          label: `Age ${targetAge + Math.floor(m / 12)}`,
        });
      }
      drawCorpus = drawCorpus * (1 + monthlyPostReturn) - monthlyWithdraw;
      monthlyWithdraw *= (1 + monthlyInflAdj);
    }

    // Accumulation path
    const accumulation = [];
    let accCorpus = currentNW;
    for (let y = 0; y <= Math.min(yearsToFIRE, 50); y++) {
      accumulation.push({
        year: currentAge + y,
        corpus: Math.round(accCorpus),
        fireTarget: Math.round(fireNumber),
        label: `Age ${currentAge + y}`,
      });
      accCorpus = accCorpus * (1 + returnRate / 100) + annualSavings;
    }

    const savingsRate = metrics.monthIncome > 0 ? ((monthlySavings / metrics.monthIncome) * 100) : 0;

    // Monthly pension from EPF/NPS
    const epfCorpus = (state.epf || []).reduce((s, e) => s + Number(e.balance || 0), 0);
    const npsCorpus = (state.nps || []).reduce((s, n) => s + Number(n.balance || 0), 0);
    const pensionIncome = (epfCorpus * 0.4 * 0.06) / 12 + (npsCorpus * 0.4 * 0.06) / 12;

    return {
      fireNumber, coastFIRE, baristaNumber, leanFIRE, fatFIRE,
      progress, coastProgress, currentNW,
      yearsToFIREActual, fireAge, monthsToFIRE,
      expenseAtRetirement, savingsRate,
      drawdown, accumulation, pensionIncome, retirementYears,
    };
  }, [monthlyExpense, inflationRate, returnRate, postRetireReturn, swr, currentAge, targetAge, lifeExpectancy, monthlySavings, metrics, state.epf, state.nps]);

  const progressColor = fireCalc.progress >= 100 ? "#10B981" : fireCalc.progress >= 50 ? "#3B82F6" : fireCalc.progress >= 25 ? "#F59E0B" : "#EF4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle icon={Flame} title="FIRE Planner" subtitle="Financial Independence, Retire Early — detailed retirement planning" />

      {/* Input Panel */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Your Inputs</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
          {[
            { label: "Monthly Expense", value: monthlyExpense, set: setMonthlyExpense, prefix: "₹" },
            { label: "Monthly Savings", value: monthlySavings, set: setMonthlySavings, prefix: "₹" },
            { label: "Current Age", value: currentAge, set: setCurrentAge, suffix: "years" },
            { label: "Target Retire Age", value: targetAge, set: setTargetAge, suffix: "years" },
            { label: "Life Expectancy", value: lifeExpectancy, set: setLifeExpectancy, suffix: "years" },
            { label: "Pre-Retire Return", value: returnRate, set: setReturnRate, suffix: "% p.a." },
            { label: "Post-Retire Return", value: postRetireReturn, set: setPostRetireReturn, suffix: "% p.a." },
            { label: "Inflation Rate", value: inflationRate, set: setInflationRate, suffix: "% p.a." },
            { label: "Safe Withdrawal Rate", value: swr, set: setSwr, suffix: "%" },
          ].map(({ label, value, set, prefix, suffix }) => (
            <div key={label}>
              <label style={{ fontSize: 12, color: THEME.textSecondary, display: "block", marginBottom: 4 }}>{label}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {prefix && <span style={{ fontSize: 13, color: THEME.textSecondary }}>{prefix}</span>}
                <input type="number" value={value} onChange={(e) => set(Number(e.target.value))}
                  style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 14, width: "100%" }} />
                {suffix && <span style={{ fontSize: 12, color: THEME.textSecondary, whiteSpace: "nowrap" }}>{suffix}</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* FIRE Numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <StatCard label="FIRE Number" value={<Prv>{fmtINRFull(fireCalc.fireNumber)}</Prv>} icon={Flame} color="#EF4444" />
        <StatCard label="Coast FIRE" value={<Prv>{fmtINRFull(fireCalc.coastFIRE)}</Prv>} icon={Shield} color="#8B5CF6" />
        <StatCard label="Lean FIRE" value={<Prv>{fmtINRFull(fireCalc.leanFIRE)}</Prv>} icon={Target} color="#F59E0B" />
        <StatCard label="Fat FIRE" value={<Prv>{fmtINRFull(fireCalc.fatFIRE)}</Prv>} icon={Zap} color="#10B981" />
      </div>

      {/* Progress */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>FIRE Progress</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: THEME.textSecondary }}>To FIRE Number</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: progressColor }}>{Math.min(100, fireCalc.progress).toFixed(1)}%</span>
            </div>
            <div style={{ height: 12, borderRadius: 6, background: THEME.border, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, fireCalc.progress)}%`, borderRadius: 6, background: progressColor, transition: "width 0.5s" }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: THEME.textSecondary }}>
              <Prv>{fmtINRFull(fireCalc.currentNW)}</Prv> of <Prv>{fmtINRFull(fireCalc.fireNumber)}</Prv>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: THEME.textSecondary }}>To Coast FIRE</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: fireCalc.coastProgress >= 100 ? "#10B981" : "#3B82F6" }}>
                {Math.min(100, fireCalc.coastProgress).toFixed(1)}%
              </span>
            </div>
            <div style={{ height: 12, borderRadius: 6, background: THEME.border, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, fireCalc.coastProgress)}%`, borderRadius: 6, background: fireCalc.coastProgress >= 100 ? "#10B981" : "#3B82F6", transition: "width 0.5s" }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: THEME.textSecondary }}>
              {fireCalc.coastProgress >= 100
                ? "You've reached Coast FIRE! You can stop saving and still retire on time."
                : <><Prv>{fmtINRFull(fireCalc.currentNW)}</Prv> of <Prv>{fmtINRFull(fireCalc.coastFIRE)}</Prv></>}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div style={{ padding: "16px", borderRadius: 12, background: THEME.bg, border: `1px solid ${THEME.border}` }}>
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>Estimated FIRE Age</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: fireCalc.fireAge <= targetAge ? "#10B981" : "#F59E0B" }}>
              {fireCalc.fireAge <= 100 ? `${fireCalc.fireAge.toFixed(1)} years` : "50+ years"}
            </div>
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>
              {fireCalc.fireAge <= targetAge ? `${(targetAge - fireCalc.fireAge).toFixed(1)} years ahead of target!` : `${(fireCalc.fireAge - targetAge).toFixed(1)} years behind target`}
            </div>
          </div>
          <div style={{ padding: "16px", borderRadius: 12, background: THEME.bg, border: `1px solid ${THEME.border}` }}>
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>Savings Rate</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: fireCalc.savingsRate >= 50 ? "#10B981" : fireCalc.savingsRate >= 25 ? "#3B82F6" : "#F59E0B" }}>
              {fireCalc.savingsRate.toFixed(0)}%
            </div>
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>
              {fireCalc.savingsRate >= 50 ? "Excellent — aggressive FIRE path" : fireCalc.savingsRate >= 25 ? "Good savings rate" : "Consider increasing savings"}
            </div>
          </div>
          <div style={{ padding: "16px", borderRadius: 12, background: THEME.bg, border: `1px solid ${THEME.border}` }}>
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>Expense at Retirement</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: THEME.text }}>
              <Prv>{fmtINRFull(fireCalc.expenseAtRetirement / 12)}</Prv>/mo
            </div>
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>
              {fmtINRFull(fireCalc.expenseAtRetirement)}/year (inflation adjusted)
            </div>
          </div>
          {fireCalc.pensionIncome > 0 && (
            <div style={{ padding: "16px", borderRadius: 12, background: THEME.bg, border: `1px solid ${THEME.border}` }}>
              <div style={{ fontSize: 12, color: THEME.textSecondary }}>Est. Pension Income</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#10B981" }}>
                <Prv>{fmtINRFull(fireCalc.pensionIncome)}</Prv>/mo
              </div>
              <div style={{ fontSize: 12, color: THEME.textSecondary }}>From EPF + NPS annuity (estimated)</div>
            </div>
          )}
        </div>
      </Card>

      {/* Accumulation Chart */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Accumulation Path</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={fireCalc.accumulation}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: THEME.textSecondary }} />
            <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11, fill: THEME.textSecondary }} />
            <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12 }} />
            <Legend />
            <Area type="monotone" dataKey="corpus" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.15} strokeWidth={2} name="Your Corpus" />
            <ReferenceLine y={fireCalc.fireNumber} stroke="#EF4444" strokeDasharray="3 3" label={{ value: `FIRE: ${fmtINR(fireCalc.fireNumber)}`, fill: "#EF4444", fontSize: 11 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Drawdown Simulation */}
      {fireCalc.drawdown.length > 0 && (
        <Card style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>
            Post-Retirement Drawdown ({fireCalc.retirementYears} years)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={fireCalc.drawdown}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: THEME.textSecondary }} />
              <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11, fill: THEME.textSecondary }} />
              <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12 }} />
              <Area type="monotone" dataKey="corpus" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2} name="Remaining Corpus" />
              <ReferenceLine y={0} stroke="#EF4444" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 12, fontSize: 13, color: THEME.textSecondary }}>
            {fireCalc.drawdown[fireCalc.drawdown.length - 1]?.corpus > 0
              ? `Your corpus lasts through age ${lifeExpectancy} with ${fmtINRFull(fireCalc.drawdown[fireCalc.drawdown.length - 1].corpus)} remaining.`
              : "Warning: Your corpus runs out before life expectancy. Consider increasing savings or reducing SWR."}
          </div>
        </Card>
      )}
    </div>
  );
};
