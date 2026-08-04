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
import { fmtINRFull, computeFireTarget } from "../../utils/finance";
import { Card } from "../ui/Card";
import { StatCard } from "../ui/StatCard";
import { Prv, usePrivacy } from "../../context/PrivacyContext";

const SWR_DEFAULT = 4; // Safe Withdrawal Rate

// FIRE Planner inputs are personal "what-if" assumptions (age, target retirement
// age, expected returns, etc) rather than ledger data, so they don't belong in
// the synced masterData/Supabase state. Previously they lived only in useState
// and silently reset to hardcoded defaults (age 30, retire 45, 12%/8%/6%
// returns) every time the tab unmounted — losing anything the user customized
// with zero feedback that nothing was saved. Persisting to localStorage (the
// same pattern used by DematTab/InvestmentsTab for tab-local preferences)
// keeps the user's actual plan across visits without touching shared sync state.
const FIRE_INPUTS_STORAGE_KEY = "finance_fire_planner_inputs_v1";

// Shared iterative "years to FIRE" solver — used by the main projection and
// re-run with tweaked assumptions for the What-If sensitivity table below, so
// both stay derived from the exact same logic instead of two copies drifting.
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

export const FIREPlannerTab = ({ state, metrics }) => {
  const { privacyMode } = usePrivacy();
  const savedInputs = useMemo(() => loadSavedFireInputs(), []);

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
  const [justSaved, setJustSaved] = useState(false);

  // Persist every input change so the plan survives navigation/refresh, and
  // surface a brief "Saved" confirmation so the persistence isn't silent.
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
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), 1500);
      return () => clearTimeout(t);
    } catch {
      // localStorage unavailable (private mode / quota) — inputs just won't
      // persist across visits; the live calculation still works fine.
    }
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

  // Edge-case guard: if ages are set inconsistently (retire at/before current
  // age, or life expectancy at/before retirement age) the math below still
  // resolves to safe non-crashing numbers, but the accumulation/drawdown
  // charts would render empty and the FIRE number would be nonsensical
  // (negative-exponent inflation shrinking expenses). Surface it plainly
  // instead of silently showing a broken chart.
  const ageWarning =
    targetAge <= currentAge
      ? "Target retirement age must be after your current age."
      : lifeExpectancy <= targetAge
        ? "Life expectancy must be after your target retirement age."
        : null;

  const fireCalc = useMemo(() => {
    const annualExpense = monthlyExpense * 12;
    // Clamp to >=0: if the age inputs are temporarily inconsistent (e.g. while
    // the user is mid-edit of the Target Retire Age field), a negative
    // exponent here would shrink "future" expenses instead of growing them
    // and produce an undersized, misleading FIRE number. `ageWarning` above
    // tells the user to fix the inputs; this just keeps the math sane meanwhile.
    const yearsToFIRE = Math.max(0, targetAge - currentAge);
    const retirementYears = Math.max(0, lifeExpectancy - targetAge);

    // FIRE number = Annual expense at retirement / SWR
    const expenseAtRetirement = annualExpense * Math.pow(1 + inflationRate / 100, yearsToFIRE);
    const fireNumber = computeFireTarget(annualExpense, yearsToFIRE, swr, inflationRate);

    // Coast FIRE: amount needed today that grows to FIRE number by target age with no further savings
    const coastFIRE = fireNumber / Math.pow(1 + returnRate / 100, yearsToFIRE);

    // Barista FIRE: half of expenses covered by part-time work, other half by investments
    const baristaNumber = fireNumber / 2;

    // Lean FIRE: 60% of current expenses
    const leanFIRE = computeFireTarget(annualExpense * 0.6, yearsToFIRE, swr, inflationRate);

    // Fat FIRE: 150% of current expenses
    const fatFIRE = computeFireTarget(annualExpense * 1.5, yearsToFIRE, swr, inflationRate);

    // Current progress. Clamped to >=0 — net worth can be negative (debts
    // exceeding assets), which previously produced a negative progress % that
    // rendered as an invalid negative-width progress bar.
    const currentNW = metrics.netWorth || 0;
    const progress = fireNumber > 0 ? Math.max(0, (currentNW / fireNumber) * 100) : 0;
    const coastProgress = coastFIRE > 0 ? Math.max(0, (currentNW / coastFIRE) * 100) : 0;

    // Years to FIRE based on savings rate
    const annualSavings = monthlySavings * 12;
    const { monthsToFIRE, reachedFIRE } = yearsToFireForAssumptions(
      annualExpense,
      swr,
      inflationRate,
      returnRate,
      currentNW,
      monthlySavings
    );
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

    // Monthly pension: NPS mandates annuitizing 40% of the corpus on exit, which
    // pays out as a monthly pension (~6% annuity rate assumed). EPF, by
    // contrast, is fully withdrawable as a lump sum with no forced annuity, so
    // it never converts into "pension income" here — it's already counted
    // inside currentNW/fireNumber like any other asset instead.
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

    // Milestones: 25/50/75/100% checkpoints toward the FIRE number, each
    // showing the corpus needed and whether it's already been crossed —
    // gives the "one big progress bar" a sense of concrete, celebratable steps.
    const milestones = [25, 50, 75, 100].map((pct) => ({
      pct,
      corpus: fireNumber * (pct / 100),
      reached: currentNW >= fireNumber * (pct / 100),
    }));

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
      reachedFIRE,
      expenseAtRetirement,
      savingsRate,
      drawdown,
      accumulation,
      pensionIncome,
      retirementYears,
      milestones,
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
    // Note: EPF is intentionally excluded from this dependency list — it
    // isn't read anywhere in this calculation (see pensionIncome comment
    // above), only NPS is.
    state.nps,
  ]);

  // What-if sensitivity: re-solves "years to FIRE" while nudging one
  // assumption at a time (return rate, inflation, monthly savings) so the
  // user can see which lever actually moves their FIRE date the most,
  // instead of only being able to explore this by manually dragging sliders
  // one at a time and re-reading the headline number.
  const sensitivity = useMemo(() => {
    const annualExpense = monthlyExpense * 12;
    const baseFireAge = fireCalc.fireAge;
    const run = (returnDelta = 0, inflationDelta = 0, savingsMultiplier = 1) => {
      const { monthsToFIRE, reachedFIRE } = yearsToFireForAssumptions(
        annualExpense,
        swr,
        Math.max(0, inflationRate + inflationDelta),
        Math.max(0.1, returnRate + returnDelta),
        fireCalc.currentNW,
        monthlySavings * savingsMultiplier
      );
      return reachedFIRE ? currentAge + monthsToFIRE / 12 : null;
    };
    return [
      {
        label: "Returns 2% lower",
        icon: "return",
        fireAge: run(-2, 0, 1),
      },
      {
        label: "Returns 2% higher",
        icon: "return",
        fireAge: run(2, 0, 1),
      },
      {
        label: "Inflation 2% higher",
        icon: "inflation",
        fireAge: run(0, 2, 1),
      },
      {
        label: "Save 20% more/mo",
        icon: "savings",
        fireAge: run(0, 0, 1.2),
      },
      {
        label: "Save 20% less/mo",
        icon: "savings",
        fireAge: run(0, 0, 0.8),
      },
    ].map((row) => ({
      ...row,
      baseFireAge,
      deltaYears: row.fireAge == null ? null : row.fireAge - baseFireAge,
    }));
  }, [monthlyExpense, swr, inflationRate, returnRate, monthlySavings, currentAge, fireCalc.fireAge, fireCalc.currentNW]);

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div className="section-label" style={{ marginBottom: 0 }}>
            Your Inputs
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: THEME.sage,
              opacity: justSaved ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
            aria-live="polite"
          >
            <CheckCircle size={13} /> Saved
          </div>
        </div>
        {ageWarning && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              marginBottom: 18,
              borderRadius: "var(--radius-md)",
              background: `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.rust} 30%, transparent)`,
              color: THEME.rust,
              fontSize: 13,
              fontWeight: 600,
            }}
            role="alert"
          >
            <AlertTriangle size={15} /> {ageWarning}
          </div>
        )}
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
        <h3
          style={{
            margin: "0 0 16px",
            fontSize: 16,
            fontWeight: 600,
            color: THEME.text,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Target size={16} color={progressColor} /> FIRE Progress
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: THEME.textSecondary,
              }}
            >
              <Clock size={12} /> Estimated FIRE Age
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: !fireCalc.reachedFIRE
                  ? THEME.rust
                  : fireCalc.fireAge <= targetAge
                    ? THEME.sage
                    : THEME.gold,
              }}
            >
              {fireCalc.reachedFIRE ? `${fireCalc.fireAge.toFixed(1)} years` : "50+ years"}
            </div>
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>
              {!fireCalc.reachedFIRE
                ? "Not reached within 50 years at current savings rate — increase savings or returns"
                : fireCalc.fireAge <= targetAge
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: THEME.textSecondary,
              }}
            >
              <TrendingUp size={12} /> Savings Rate
            </div>
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: THEME.textSecondary,
              }}
            >
              <IndianRupee size={12} /> Expense at Retirement
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: THEME.text }}>
              <Prv>{fmtINRFull(fireCalc.expenseAtRetirement / 12)}</Prv>/mo
            </div>
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>
              <Prv>{fmtINRFull(fireCalc.expenseAtRetirement)}</Prv>/year (inflation adjusted)
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
                From NPS&apos;s mandatory 40% annuity (estimated). EPF is fully
                withdrawable and already counted in your net worth above.
              </div>
            </div>
          )}
        </div>

        {/* Milestones — concrete checkpoints on the way to the FIRE number */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 10, fontWeight: 600 }}>
            Milestones
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 10,
            }}
          >
            {fireCalc.milestones.map((m) => (
              <div
                key={m.pct}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  background: m.reached
                    ? `color-mix(in srgb, ${THEME.sage} 10%, transparent)`
                    : "var(--surface-1)",
                  border: `1px solid ${m.reached ? `color-mix(in srgb, ${THEME.sage} 30%, transparent)` : THEME.border}`,
                }}
              >
                <CheckCircle
                  size={18}
                  color={m.reached ? THEME.sage : THEME.textSecondary}
                  style={{ opacity: m.reached ? 1 : 0.35, flexShrink: 0 }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: m.reached ? THEME.sage : THEME.text,
                    }}
                  >
                    {m.pct}% {m.pct === 100 ? "— FIRE!" : ""}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.textSecondary }}>
                    <Prv>{fmtINRFull(m.corpus)}</Prv>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* What-If Sensitivity */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Sparkles size={16} color={THEME.accent} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: THEME.text }}>
            What-If Sensitivity
          </h3>
        </div>
        <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 16 }}>
          How your estimated FIRE age (currently{" "}
          {fireCalc.reachedFIRE ? fireCalc.fireAge.toFixed(1) : "50+ years out"}) shifts if one
          assumption changes and everything else stays the same.
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 12,
          }}
        >
          {sensitivity.map((row) => {
            const improved = row.deltaYears != null && row.deltaYears < -0.05;
            const worsened = row.deltaYears == null || row.deltaYears > 0.05;
            const color = row.deltaYears == null ? THEME.rust : improved ? THEME.sage : worsened ? THEME.gold : THEME.textSecondary;
            return (
              <div
                key={row.label}
                className="card-lift"
                style={{
                  padding: "14px 16px",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.border}`,
                }}
              >
                <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 6 }}>
                  {row.label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color }}>
                  {row.deltaYears == null
                    ? "Not reached"
                    : row.fireAge != null && Math.abs(row.deltaYears) < 0.05
                      ? "No change"
                      : `${row.deltaYears > 0 ? "+" : ""}${row.deltaYears.toFixed(1)} yrs`}
                </div>
                <div style={{ fontSize: 11, color: THEME.textSecondary }}>
                  {row.fireAge != null
                    ? `FIRE at age ${row.fireAge.toFixed(1)}`
                    : "Not within 50 years"}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Accumulation Chart */}
      <Card style={{ padding: 24 }}>
        <h3
          style={{
            margin: "0 0 16px",
            fontSize: 16,
            fontWeight: 600,
            color: THEME.text,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <TrendingUp size={16} color={THEME.accent} /> Accumulation Path
        </h3>
        <div style={{ width: "100%", height: 350, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={fireCalc.accumulation}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: THEME.textSecondary }} />
            <YAxis
              tickFormatter={(v) => (privacyMode ? "••••" : fmtINRFull(v))}
              tick={{ fontSize: 11, fill: THEME.textSecondary }}
              width={85}
            />
            <Tooltip
              formatter={(v) => <Prv>{fmtINRFull(v)}</Prv>}
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
                value: `FIRE: ${privacyMode ? "••••" : fmtINRFull(fireCalc.fireNumber)}`,
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
          <h3
            style={{
              margin: "0 0 16px",
              fontSize: 16,
              fontWeight: 600,
              color: THEME.text,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Calendar size={16} color={THEME.gold} /> Post-Retirement Drawdown (
            {fireCalc.retirementYears} years)
          </h3>
          <div style={{ width: "100%", height: 300, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={fireCalc.drawdown}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: THEME.textSecondary }} />
              <YAxis
                tickFormatter={(v) => (privacyMode ? "••••" : fmtINRFull(v))}
                tick={{ fontSize: 11, fill: THEME.textSecondary }}
                width={85}
              />
              <Tooltip
                formatter={(v) => <Prv>{fmtINRFull(v)}</Prv>}
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
            {fireCalc.drawdown[fireCalc.drawdown.length - 1]?.corpus > 0 ? (
              <>
                Your corpus lasts through age {lifeExpectancy} with{" "}
                <Prv>
                  {fmtINRFull(fireCalc.drawdown[fireCalc.drawdown.length - 1].corpus)}
                </Prv>{" "}
                remaining.
              </>
            ) : (
              "Warning: Your corpus runs out before life expectancy. Consider increasing savings or reducing SWR."
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
