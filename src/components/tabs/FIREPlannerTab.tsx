// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
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
  AlertTriangle,
  Sparkles,
  Sliders,
  Coffee,
  Gem,
  Compass,
  CheckCircle2,
  PieChart,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, computeFireTarget } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";
import { usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

const SWR_DEFAULT = 4;
const FIRE_INPUTS_STORAGE_KEY = "finance_fire_planner_inputs_v1";

const yearsToFireForAssumptions = (
  annualExpense: number,
  swrPercent: number,
  inflationPercent: number,
  returnPercent: number,
  currentNW: number,
  monthlySavings: number
): { monthsToFIRE: number; reachedFIRE: boolean } => {
  const monthlyRet = returnPercent / 100 / 12;
  let corpus = currentNW;
  let monthsToFIRE = 0;
  const maxMonths = 600; // 50 years cap
  while (monthsToFIRE < maxMonths) {
    const dynamicFireTarget = computeFireTarget(annualExpense, monthsToFIRE / 12, swrPercent, inflationPercent);
    if (corpus >= dynamicFireTarget) break;
    corpus = corpus * (1 + monthlyRet) + monthlySavings;
    monthsToFIRE++;
  }
  const finalDynamicTarget = computeFireTarget(annualExpense, monthsToFIRE / 12, swrPercent, inflationPercent);
  return { monthsToFIRE, reachedFIRE: corpus >= finalDynamicTarget };
};

const loadSavedFireInputs = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(FIRE_INPUTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const FIREPlannerTab = ({ state, metrics }: any) => {
  const { privacyMode } = usePrivacy();
  const savedInputs = useMemo(() => loadSavedFireInputs(), []);

  const [archetype, setArchetype] = useState<"regular" | "lean" | "fat" | "coast" | "barista">("regular");
  const [monthlyExpense, setMonthlyExpense] = useState(
    savedInputs.monthlyExpense ?? Math.round(metrics.monthExpense || 50000)
  );
  const [inflationRate, setInflationRate] = useState(savedInputs.inflationRate ?? 6);
  const [returnRate, setReturnRate] = useState(savedInputs.returnRate ?? 12);
  const [postRetireReturn, setPostRetireReturn] = useState(savedInputs.postRetireReturn ?? 8);
  const [swr, setSwr] = useState(savedInputs.swr ?? SWR_DEFAULT);
  const [currentAge, setCurrentAge] = useState(savedInputs.currentAge ?? 30);
  const [targetAge, setTargetAge] = useState(savedInputs.targetAge ?? 45);
  const [lifeExpectancy, setLifeExpectancy] = useState(savedInputs.lifeExpectancy ?? 85);
  const [monthlySavings, setMonthlySavings] = useState(
    savedInputs.monthlySavings ??
      Math.max(0, Math.round((metrics.monthIncome || 0) - (metrics.monthExpense || 0)))
  );
  const [chartView, setChartView] = useState<"accumulation" | "drawdown">("accumulation");

  useEffect(() => {
    try {
      localStorage.setItem(
        FIRE_INPUTS_STORAGE_KEY,
        JSON.stringify({
          monthlyExpense,
          inflationRate,
          returnRate,
          postRetireReturn,
          swr,
          currentAge,
          targetAge,
          lifeExpectancy,
          monthlySavings,
        })
      );
    } catch {}
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
  ]);

  const ageWarning =
    targetAge <= currentAge
      ? "Target retirement age must be after your current age."
      : lifeExpectancy <= targetAge
        ? "Life expectancy must be after your target retirement age."
        : null;

  const fireCalc = useMemo(() => {
    const annualExpense = monthlyExpense * 12;
    const yearsToFIRE = Math.max(0, targetAge - currentAge);
    const retirementYears = Math.max(0, lifeExpectancy - targetAge);

    const expenseAtRetirement = annualExpense * Math.pow(1 + inflationRate / 100, yearsToFIRE);
    const regularFireNumber = computeFireTarget(annualExpense, yearsToFIRE, swr, inflationRate);
    const leanFireNumber = computeFireTarget(annualExpense * 0.6, yearsToFIRE, swr, inflationRate);
    const fatFireNumber = computeFireTarget(annualExpense * 1.5, yearsToFIRE, swr, inflationRate);
    const baristaFireNumber = regularFireNumber / 2;
    const coastFireNumber = regularFireNumber / Math.pow(1 + returnRate / 100, yearsToFIRE);

    let activeFireNumber = regularFireNumber;
    if (archetype === "lean") activeFireNumber = leanFireNumber;
    else if (archetype === "fat") activeFireNumber = fatFireNumber;
    else if (archetype === "barista") activeFireNumber = baristaFireNumber;
    else if (archetype === "coast") activeFireNumber = coastFireNumber;

    const currentNW = Math.max(0, metrics.netWorth || 0);
    const progress = activeFireNumber > 0 ? (currentNW / activeFireNumber) * 100 : 0;
    const coastProgress = coastFireNumber > 0 ? (currentNW / coastFireNumber) * 100 : 0;

    const annualSavings = monthlySavings * 12;
    const { monthsToFIRE, reachedFIRE } = yearsToFireForAssumptions(
      archetype === "lean" ? annualExpense * 0.6 : archetype === "fat" ? annualExpense * 1.5 : annualExpense,
      swr,
      inflationRate,
      returnRate,
      currentNW,
      monthlySavings
    );
    const yearsToFIREActual = monthsToFIRE / 12;
    const fireAge = currentAge + yearsToFIREActual;

    // Monthly Passive Freedom Dividend generated by current net worth today
    const monthlyFreedomDividend = (currentNW * (swr / 100)) / 12;

    // Drawdown path
    const drawdown = [];
    let drawCorpus = activeFireNumber;
    const monthlyInflAdj = inflationRate / 100 / 12;
    const monthlyPostReturn = postRetireReturn / 100 / 12;
    let monthlyWithdraw = expenseAtRetirement / 12;
    const drawdownMonths = Math.min(retirementYears, 60) * 12;
    for (let m = 0; m <= drawdownMonths && drawCorpus > 0; m++) {
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
    for (let y = 0; y <= Math.min(yearsToFIRE + 5, 45); y++) {
      accumulation.push({
        year: currentAge + y,
        corpus: Math.round(accCorpus),
        fireTarget: Math.round(activeFireNumber),
        label: `Age ${currentAge + y}`,
      });
      accCorpus = accCorpus * (1 + returnRate / 100) + annualSavings;
    }

    const milestones = [25, 50, 75, 100].map((pct) => ({
      pct,
      corpus: activeFireNumber * (pct / 100),
      reached: currentNW >= activeFireNumber * (pct / 100),
    }));

    return {
      fireNumber: activeFireNumber,
      regularFireNumber,
      leanFireNumber,
      fatFireNumber,
      baristaFireNumber,
      coastFireNumber,
      progress,
      coastProgress,
      currentNW,
      yearsToFIREActual,
      fireAge,
      monthsToFIRE,
      reachedFIRE,
      expenseAtRetirement,
      monthlyFreedomDividend,
      drawdown,
      accumulation,
      milestones,
    };
  }, [
    archetype,
    monthlyExpense,
    inflationRate,
    returnRate,
    postRetireReturn,
    swr,
    currentAge,
    targetAge,
    lifeExpectancy,
    monthlySavings,
    metrics.netWorth,
  ]);

  const animatedProgress = useAnimatedNumber(fireCalc.progress);

  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub="Plan your financial independence, safe withdrawal rate, and early retirement milestones"
      >
        FIRE & Financial Independence
      </SectionTitle>

      {/* Archetype Selector */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          { id: "regular", label: "🔥 Regular FIRE", desc: "25x Annual Expenses (100% lifestyle)", val: fireCalc.regularFireNumber },
          { id: "lean", label: "⚡ Lean FIRE", desc: "20x Core Essential Expenses (60% burn)", val: fireCalc.leanFireNumber },
          { id: "fat", label: "💎 Fat FIRE", desc: "35x+ Luxury Cushion (150% burn)", val: fireCalc.fatFireNumber },
          { id: "coast", label: "🏖️ Coast FIRE", desc: "Corpus compounds with ₹0 added", val: fireCalc.coastFireNumber },
          { id: "barista", label: "☕ Barista FIRE", desc: "50% passive + 50% part-time", val: fireCalc.baristaFireNumber },
        ].map((item) => {
          const active = archetype === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setArchetype(item.id as any)}
              className="card-lift"
              style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-lg)",
                background: active
                  ? `color-mix(in srgb, ${THEME.accent} 12%, var(--surface-0))`
                  : "var(--surface-0)",
                border: active ? `2px solid ${THEME.accent}` : `1px solid ${THEME.line}`,
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 800, color: active ? THEME.accent : THEME.ink }}>
                {item.label}
              </span>
              <span style={{ fontSize: 10, color: THEME.muted }}>{item.desc}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: THEME.ink, marginTop: 4 }}>
                <Money value={item.val} variant="full" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Hero FIRE Cockpit */}
      <Card
        variant="base"
        style={{
          marginBottom: 20,
          padding: "clamp(24px, 4vw, 36px)",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 94%, var(--t-accent) 6%), var(--surface-0))",
          border: `1px solid ${THEME.line}`,
          borderTop: `4px solid ${THEME.accent}`,
          borderRadius: "var(--radius-xl)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: THEME.muted,
                marginBottom: 6,
              }}
            >
              <Flame size={14} color={THEME.accent} /> Target FIRE Corpus ({archetype.toUpperCase()})
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(34px, 5vw, 52px)",
                fontWeight: 900,
                color: THEME.ink,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <Money value={fireCalc.fireNumber} variant="full" />
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, marginTop: 6, fontWeight: 600 }}>
              Current Net Worth: <strong style={{ color: THEME.ink }}><Money value={fireCalc.currentNW} variant="full" /></strong> (
              <span style={{ color: fireCalc.progress >= 100 ? THEME.sage : THEME.accent, fontWeight: 800 }}>
                {animatedProgress.toFixed(1)}% achieved
              </span>
              )
            </div>
          </div>

          {/* Freedom Status Pills */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
                color: THEME.sage,
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              <Sparkles size={13} /> Freedom Dividend: {fmtINR(fireCalc.monthlyFreedomDividend)}/mo
            </span>
            <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
              Projected FIRE Age: <strong style={{ color: THEME.ink }}>{fireCalc.fireAge.toFixed(1)}</strong> (
              {fireCalc.yearsToFIREActual <= 0 ? "Achieved!" : `in ${fireCalc.yearsToFIREActual.toFixed(1)} yrs`}
              )
            </span>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: THEME.muted, fontWeight: 700 }}>
            <span>Start</span>
            <span>25% (<Money value={fireCalc.fireNumber * 0.25} />)</span>
            <span>50% (<Money value={fireCalc.fireNumber * 0.5} />)</span>
            <span>75% (<Money value={fireCalc.fireNumber * 0.75} />)</span>
            <span>100% FIRE</span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: "var(--t-line)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, fireCalc.progress)}%`,
                background: `linear-gradient(90deg, ${THEME.accent}, ${THEME.sage})`,
                borderRadius: 5,
                transition: "width 0.8s var(--ease-premium)",
              }}
            />
          </div>
        </div>
      </Card>

      {/* Interactive Simulation Sliders */}
      <Card style={{ marginBottom: 24, padding: 22 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: THEME.muted,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Sliders size={14} color={THEME.accent} /> Live Scenario Assumptions & Parameters
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {/* Current Age */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              <span style={{ color: THEME.muted }}>Current Age</span>
              <span style={{ color: THEME.ink }}>{currentAge} yrs</span>
            </div>
            <input
              type="range"
              min="18"
              max="70"
              value={currentAge}
              onChange={(e) => setCurrentAge(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.accent }}
            />
          </div>

          {/* Target Retirement Age */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              <span style={{ color: THEME.muted }}>Target Retirement Age</span>
              <span style={{ color: THEME.accent }}>{targetAge} yrs</span>
            </div>
            <input
              type="range"
              min={currentAge + 1}
              max="80"
              value={targetAge}
              onChange={(e) => setTargetAge(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.accent }}
            />
          </div>

          {/* Monthly Living Expense */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              <span style={{ color: THEME.muted }}>Monthly Living Expense</span>
              <span style={{ color: THEME.ink }}>{fmtINR(monthlyExpense)}</span>
            </div>
            <input
              type="range"
              min="20000"
              max="500000"
              step="5000"
              value={monthlyExpense}
              onChange={(e) => setMonthlyExpense(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.accent }}
            />
          </div>

          {/* Monthly Savings Surplus */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              <span style={{ color: THEME.muted }}>Monthly Savings Addition</span>
              <span style={{ color: THEME.sage }}>{fmtINR(monthlySavings)}/mo</span>
            </div>
            <input
              type="range"
              min="0"
              max="500000"
              step="5000"
              value={monthlySavings}
              onChange={(e) => setMonthlySavings(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.sage }}
            />
          </div>

          {/* Pre-Retirement Return */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              <span style={{ color: THEME.muted }}>Pre-Retire Return (CAGR)</span>
              <span style={{ color: THEME.ink }}>{returnRate}% p.a.</span>
            </div>
            <input
              type="range"
              min="6"
              max="18"
              step="0.5"
              value={returnRate}
              onChange={(e) => setReturnRate(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.accent }}
            />
          </div>

          {/* Inflation Rate */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              <span style={{ color: THEME.muted }}>Expected Inflation</span>
              <span style={{ color: THEME.rust }}>{inflationRate}% p.a.</span>
            </div>
            <input
              type="range"
              min="3"
              max="12"
              step="0.5"
              value={inflationRate}
              onChange={(e) => setInflationRate(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.rust }}
            />
          </div>
        </div>
      </Card>

      {/* Dual-Phase Chart Projection */}
      <Card style={{ padding: 22, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: THEME.muted,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <TrendingUp size={14} color={THEME.accent} /> Growth & Longevity Trajectory
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setChartView("accumulation")}
              className={`demat-portfolio-pill ${chartView === "accumulation" ? "active" : ""}`}
              style={{ fontSize: 11, padding: "4px 10px" }}
            >
              Accumulation Growth Phase
            </button>
            <button
              onClick={() => setChartView("drawdown")}
              className={`demat-portfolio-pill ${chartView === "drawdown" ? "active" : ""}`}
              style={{ fontSize: 11, padding: "4px 10px" }}
            >
              Retirement Drawdown Phase
            </button>
          </div>
        </div>

        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartView === "accumulation" ? fireCalc.accumulation : fireCalc.drawdown}>
              <defs>
                <linearGradient id="corpusGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={THEME.accent} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={THEME.accent} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--t-line)" vertical={false} />
              <XAxis dataKey="label" stroke={THEME.muted} fontSize={11} />
              <YAxis
                stroke={THEME.muted}
                fontSize={11}
                tickFormatter={(v) => fmtINR(v)}
              />
              <Tooltip
                formatter={(val: any) => [fmtINRFull(val), "Corpus"]}
                labelStyle={{ color: THEME.ink, fontWeight: 700 }}
                contentStyle={{ background: "var(--surface-0)", borderColor: THEME.line, borderRadius: 8 }}
              />
              <Area
                type="monotone"
                dataKey="corpus"
                stroke={THEME.accent}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#corpusGrad)"
              />
              {chartView === "accumulation" && (
                <ReferenceLine
                  y={fireCalc.fireNumber}
                  label={{ value: "FIRE Target", fill: THEME.sage, fontSize: 11, position: "top" }}
                  stroke={THEME.sage}
                  strokeDasharray="4 4"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
