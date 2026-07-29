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
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";

const SWR_DEFAULT = 4; // Safe Withdrawal Rate

export const FIREPlannerTab = ({ state, metrics }) => {
  const [monthlyExpense, setMonthlyExpense] = useState(Math.round(metrics.monthExpense || 50000));
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
    const leanFIRE =
      (leanFIREExpense * Math.pow(1 + inflationRate / 100, yearsToFIRE)) / (swr / 100);

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
      monthlyWithdraw *= 1 + monthlyInflAdj;
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

    const savingsRate = metrics.monthIncome > 0 ? (monthlySavings / metrics.monthIncome) * 100 : 0;

    // Monthly pension: NPS has 40% mandatory annuity; EPF is fully withdrawable (no annuity)
    const npsCorpus = (state.nps || []).reduce((s: number, n: any) => {
      const bal = Number(n.balance) || 0;
      if (bal > 0) return s + bal;
      return (
        s +
        (n.transactions || []).reduce(
          (ss: number, t: any) =>
            ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
          0
        )
      );
    }, 0);
    const pensionIncome = (npsCorpus * 0.4 * 0.06) / 12;

    return {
      fireNumber,
      coastFIRE,
      baristaNumber,
      leanFIRE,
      fatFIRE,
      progress,
      coastProgress,
      currentNW,
      yearsToFIREActual,
      fireAge,
      monthsToFIRE,
      expenseAtRetirement,
      savingsRate,
      drawdown,
      accumulation,
      pensionIncome,
      retirementYears,
    };
  }, [
    monthlyExpense,
    inflationRate,
    returnRate,
    postRetireReturn,
    swr,
    currentAge,
    targetAge,
    lifeExpectancy,
    monthlySavings,
    metrics,
    state.epf,
    state.nps,
  ]);

  const progressColor =
    fireCalc.progress >= 100
      ? THEME.sage
      : fireCalc.progress >= 50
        ? THEME.accent
        : fireCalc.progress >= 25
          ? THEME.gold
          : THEME.rust;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="sub-tab-hero animate-fade-in-up">
        <div className="sub-tab-hero-icon">🔥</div>
        <div className="sub-tab-hero-body">
          <div className="sub-tab-hero-title">FIRE Planner</div>
          <div className="sub-tab-hero-desc">
            Financial Independence, Retire Early — model your path across Lean, Coast, Fat and
            Barista FIRE scenarios
          </div>
        </div>
        <div
          className="sub-tab-hero-badge"
          style={{
            background: `color-mix(in srgb, ${progressColor} 14%, transparent)`,
            color: progressColor,
            borderColor: `color-mix(in srgb, ${progressColor} 25%, transparent)`,
          }}
        >
          <Flame size={13} /> {Math.min(100, fireCalc.progress).toFixed(0)}% to FIRE
        </div>
      </div>

      {/* Input Panel */}
      <Card style={{ padding: 24 }}>
        <div className="section-label" style={{ marginBottom: 18 }}>
          Your Inputs
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 20,
          }}
        >
          {[
            {
              label: "Monthly Expense",
              value: monthlyExpense,
              set: setMonthlyExpense,
              prefix: "₹",
            },
            {
              label: "Monthly Savings",
              value: monthlySavings,
              set: setMonthlySavings,
              prefix: "₹",
            },
            {
              label: "Current Age",
              value: currentAge,
              set: setCurrentAge,
              suffix: "years",
              min: 18,
              max: 70,
            },
            {
              label: "Target Retire Age",
              value: targetAge,
              set: setTargetAge,
              suffix: "years",
              min: 25,
              max: 75,
            },
            {
              label: "Life Expectancy",
              value: lifeExpectancy,
              set: setLifeExpectancy,
              suffix: "years",
              min: 60,
              max: 100,
            },
            {
              label: "Pre-Retire Return",
              value: returnRate,
              set: setReturnRate,
              suffix: "% p.a.",
              min: 4,
              max: 20,
              step: 0.5,
            },
            {
              label: "Post-Retire Return",
              value: postRetireReturn,
              set: setPostRetireReturn,
              suffix: "% p.a.",
              min: 2,
              max: 15,
              step: 0.5,
            },
            {
              label: "Inflation Rate",
              value: inflationRate,
              set: setInflationRate,
              suffix: "% p.a.",
              min: 2,
              max: 12,
              step: 0.5,
            },
            {
              label: "Safe Withdrawal Rate",
              value: swr,
              set: setSwr,
              suffix: "%",
              min: 2,
              max: 6,
              step: 0.25,
            },
          ].map(({ label, value, set, prefix, suffix, min, max, step }) => (
            <div key={label}>
              <label
                style={{
                  fontSize: 12,
                  color: THEME.textSecondary,
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                {label}
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {prefix && (
                  <span style={{ fontSize: 13, color: THEME.textSecondary }}>{prefix}</span>
                )}
                <input
                  type="number"
                  value={value}
                  aria-label={label}
                  step={step}
                  onChange={(e) => set(Number(e.target.value))}
                  className="form-input"
                  style={{
                    padding: "8px 10px",
                    fontSize: 14,
                    fontWeight: 700,
                    color: THEME.text,
                  }}
                />
                {suffix && (
                  <span style={{ fontSize: 12, color: THEME.textSecondary, whiteSpace: "nowrap" }}>
                    {suffix}
                  </span>
                )}
              </div>
              {typeof min === "number" && typeof max === "number" && (
                <input
                  type="range"
                  className="cxo-slider"
                  min={min}
                  max={max}
                  step={step || 1}
                  value={value}
                  aria-label={`${label} slider`}
                  onChange={(e) => set(Number(e.target.value))}
                  style={{ marginTop: 10 }}
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* FIRE Number — the target this whole tool is built around, so it gets top billing */}
      <Card
        variant="hero"
        style={{
          padding: "clamp(24px, 4vw, 36px)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <Flame size={13} /> Your FIRE Number
        </div>
        <div
          style={{
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}
        >
          <Prv>{fmtINRFull(fireCalc.fireNumber)}</Prv>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
          Needed at age {targetAge} to sustain{" "}
          <Prv>{fmtINRFull(fireCalc.expenseAtRetirement / 12)}</Prv>/mo of expenses at a{" "}
          {swr}% withdrawal rate
        </div>
      </Card>

      {/* Alternate FIRE scenarios — secondary to the main number above */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Coast FIRE"
          value={<Prv>{fmtINRFull(fireCalc.coastFIRE)}</Prv>}
          icon={<Shield />}
          color={THEME.violet}
        />
        <StatCard
          label="Lean FIRE"
          value={<Prv>{fmtINRFull(fireCalc.leanFIRE)}</Prv>}
          icon={<Target />}
          color={THEME.gold}
        />
        <StatCard
          label="Fat FIRE"
          value={<Prv>{fmtINRFull(fireCalc.fatFIRE)}</Prv>}
          icon={<Zap />}
          color={THEME.sage}
        />
        <StatCard
          label="Barista FIRE"
          value={<Prv>{fmtINRFull(fireCalc.baristaNumber)}</Prv>}
          icon={<TrendingUp />}
          color={THEME.accent}
        />
      </div>

      {/* Progress */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>
          FIRE Progress
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: THEME.textSecondary }}>To FIRE Number</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: progressColor }}>
                {Math.min(100, fireCalc.progress).toFixed(1)}%
              </span>
            </div>
            <div className="progress-track" style={{ height: 10 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, fireCalc.progress)}%`,
                  background: progressColor,
                }}
              />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: THEME.textSecondary }}>
              <Prv>{fmtINRFull(fireCalc.currentNW)}</Prv> of{" "}
              <Prv>{fmtINRFull(fireCalc.fireNumber)}</Prv>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: THEME.textSecondary }}>To Coast FIRE</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: fireCalc.coastProgress >= 100 ? THEME.sage : THEME.accent,
                }}
              >
                {Math.min(100, fireCalc.coastProgress).toFixed(1)}%
              </span>
            </div>
            <div className="progress-track" style={{ height: 10 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, fireCalc.coastProgress)}%`,
                  background: fireCalc.coastProgress >= 100 ? THEME.sage : THEME.accent,
                }}
              />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: THEME.textSecondary }}>
              {fireCalc.coastProgress >= 100 ? (
                "You've reached Coast FIRE! You can stop saving and still retire on time."
              ) : (
                <>
                  <Prv>{fmtINRFull(fireCalc.currentNW)}</Prv> of{" "}
                  <Prv>{fmtINRFull(fireCalc.coastFIRE)}</Prv>
                </>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          <div
            className="card-lift"
            style={{
              padding: "18px",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-1)",
              border: `1px solid ${THEME.border}`,
            }}
          >
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>Estimated FIRE Age</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: fireCalc.fireAge <= targetAge ? THEME.sage : THEME.gold,
              }}
            >
              {fireCalc.fireAge <= 100 ? `${fireCalc.fireAge.toFixed(1)} years` : "50+ years"}
            </div>
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>
              {fireCalc.fireAge <= targetAge
                ? `${(targetAge - fireCalc.fireAge).toFixed(1)} years ahead of target!`
                : `${(fireCalc.fireAge - targetAge).toFixed(1)} years behind target`}
            </div>
          </div>
          <div
            className="card-lift"
            style={{
              padding: "18px",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-1)",
              border: `1px solid ${THEME.border}`,
            }}
          >
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>Savings Rate</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color:
                  fireCalc.savingsRate >= 50
                    ? THEME.sage
                    : fireCalc.savingsRate >= 25
                      ? THEME.accent
                      : THEME.gold,
              }}
            >
              {fireCalc.savingsRate.toFixed(0)}%
            </div>
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>
              {fireCalc.savingsRate >= 50
                ? "Excellent — aggressive FIRE path"
                : fireCalc.savingsRate >= 25
                  ? "Good savings rate"
                  : "Consider increasing savings"}
            </div>
          </div>
          <div
            className="card-lift"
            style={{
              padding: "18px",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-1)",
              border: `1px solid ${THEME.border}`,
            }}
          >
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>Expense at Retirement</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: THEME.text }}>
              <Prv>{fmtINRFull(fireCalc.expenseAtRetirement / 12)}</Prv>/mo
            </div>
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>
              {fmtINRFull(fireCalc.expenseAtRetirement)}/year (inflation adjusted)
            </div>
          </div>
          {fireCalc.pensionIncome > 0 && (
            <div
              className="card-lift"
              style={{
                padding: "18px",
                borderRadius: "var(--radius-lg)",
                background: "var(--surface-1)",
                border: `1px solid ${THEME.border}`,
              }}
            >
              <div style={{ fontSize: 12, color: THEME.textSecondary }}>Est. Pension Income</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: THEME.sage }}>
                <Prv>{fmtINRFull(fireCalc.pensionIncome)}</Prv>/mo
              </div>
              <div style={{ fontSize: 12, color: THEME.textSecondary }}>
                From EPF + NPS annuity (estimated)
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Accumulation Chart */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>
          Accumulation Path
        </h3>
        <div style={{ width: "100%", height: 350, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={fireCalc.accumulation}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: THEME.textSecondary }} />
            <YAxis
              tickFormatter={(v) => fmtINRFull(v)}
              tick={{ fontSize: 11, fill: THEME.textSecondary }}
              width={85}
            />
            <Tooltip
              formatter={(v) => fmtINRFull(v)}
              cursor={{ stroke: THEME.line }}
              contentStyle={{
                background: THEME.card,
                border: `1px solid ${THEME.border}`,
                borderRadius: 12,
                color: THEME.ink,
              }}
              labelStyle={{ color: THEME.ink }}
              itemStyle={{ color: THEME.ink }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              formatter={(value: string) => (
                <span style={{ color: THEME.ink, fontWeight: 500 }}>{value}</span>
              )}
            />
            <Area
              type="monotone"
              dataKey="corpus"
              stroke="var(--accent)"
              fill="var(--accent)"
              fillOpacity={0.15}
              strokeWidth={2}
              name="Your Corpus"
            />
            <ReferenceLine
              y={fireCalc.fireNumber}
              stroke={THEME.rust}
              strokeDasharray="3 3"
              label={{
                value: `FIRE: ${fmtINRFull(fireCalc.fireNumber)}`,
                fill: THEME.rust,
                fontSize: 11,
              }}
            />
          </AreaChart>
        </ResponsiveContainer></div>
      </Card>

      {/* Drawdown Simulation */}
      {fireCalc.drawdown.length > 0 && (
        <Card style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>
            Post-Retirement Drawdown ({fireCalc.retirementYears} years)
          </h3>
          <div style={{ width: "100%", height: 300, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={fireCalc.drawdown}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: THEME.textSecondary }} />
              <YAxis
                tickFormatter={(v) => fmtINRFull(v)}
                tick={{ fontSize: 11, fill: THEME.textSecondary }}
                width={85}
              />
              <Tooltip
                formatter={(v) => fmtINRFull(v)}
                cursor={{ stroke: THEME.line }}
                contentStyle={{
                  background: THEME.card,
                  border: `1px solid ${THEME.border}`,
                  borderRadius: 12,
                  color: THEME.ink,
                }}
                labelStyle={{ color: THEME.ink }}
                itemStyle={{ color: THEME.ink }}
              />
              <Area
                type="monotone"
                dataKey="corpus"
                stroke={THEME.gold}
                fill={THEME.gold}
                fillOpacity={0.15}
                strokeWidth={2}
                name="Remaining Corpus"
              />
              <ReferenceLine y={0} stroke={THEME.rust} />
            </AreaChart>
          </ResponsiveContainer></div>
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
