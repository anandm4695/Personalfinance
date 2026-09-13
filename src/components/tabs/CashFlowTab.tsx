import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  Home,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Landmark,
  Receipt,
  Shield,
  Target,
  Activity,
  BarChart2,
  DollarSign,
  PiggyBank,
  Sliders,
  Info,
  Check,
  ExternalLink,
  AlertCircle,
  FileText,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Calendar,
  Filter,
  Search,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  SlidersVertical,
} from "lucide-react";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import { THEME } from "../../utils/constants";
import {
  fmtINRFull,
  fmtINRExact,
  getEffectiveRent,
  nextAnnualOccurrence,
  annualizePremium,
  addMonthsToDateStr,
  fdMaturity,
  rdMaturity,
  today,
  loanOutstanding,
  loanGivenOutstanding,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { SectionTitle } from "../ui/SectionTitle";
import { usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export type HorizonMonths = 1 | 3 | 6 | 12;

/** Returns an array of { year, month, label, key } for the next N months starting from today. */
function getFutureMonths(
  count: number
): { year: number; month: number; label: string; key: string }[] {
  const d = new Date();
  const months: { year: number; month: number; label: string; key: string }[] = [];
  for (let i = 1; i <= count; i++) {
    const future = new Date(d.getFullYear(), d.getMonth() + i, 1);
    months.push({
      year: future.getFullYear(),
      month: future.getMonth(),
      label: `${MONTH_NAMES[future.getMonth()]} '${String(future.getFullYear()).slice(-2)}`,
      key: `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  return months;
}

/** Parse a YYYY-MM-DD string into a Date (local timezone). */
function parseDate(s: string): Date | null {
  if (!s) return null;
  try {
    return new Date(s + "T00:00:00");
  } catch {
    return null;
  }
}

/** Check if a date string falls within a range of future months. */
function isDateInRange(dateStr: string, months: { key: string }[]): boolean {
  if (!dateStr) return false;
  const ym = dateStr.slice(0, 7);
  return months.some((m) => m.key === ym);
}

/** Convert frequency to monthly multiplier. */
function freqToMonthly(freq: string, amount: number): number {
  const f = (freq || "monthly").toLowerCase();
  if (f === "yearly" || f === "annual" || f === "annually") return amount / 12;
  if (f === "quarterly") return amount / 3;
  if (f === "half-yearly" || f === "semi-annual" || f === "semi-annually") return amount / 6;
  if (f === "weekly") return amount * 4.33;
  if (f === "daily") return amount * 30;
  return amount; // monthly
}

const fmtDate = (dateStr: string) => {
  if (!dateStr) return "--";
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

// ── Custom Tooltip for Recharts ──────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--surface-0) 94%, transparent)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1.5px solid var(--t-line)`,
        borderRadius: "14px",
        padding: "14px 18px",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minWidth: "240px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 800,
          color: "var(--t-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          borderBottom: `1px solid var(--t-line)`,
          paddingBottom: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{label}</span>
        <span style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--t-accent)" }}>Forecast</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {payload.map((entry: any, index: number) => {
          let color = entry.color || "var(--t-accent)";
          if (entry.dataKey === "Inflow") color = "var(--t-sage)";
          else if (entry.dataKey === "Outflow") color = "var(--t-rust)";
          else if (entry.dataKey === "Cumulative") color = "var(--t-accent)";
          else if (entry.dataKey === "EndingBalance") color = "var(--t-gold)";
          else if (entry.dataKey === "NetDelta") color = entry.value >= 0 ? "var(--t-sage)" : "var(--t-rust)";

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: color,
                    display: "inline-block",
                    boxShadow: `0 0 6px ${color}`,
                  }}
                />
                <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--t-ink)" }}>
                  {entry.name}
                </span>
              </div>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color:
                    entry.dataKey === "Inflow"
                      ? "var(--t-sage)"
                      : entry.dataKey === "Outflow"
                        ? "var(--t-rust)"
                        : "var(--t-ink)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <Money value={entry.value} variant="full" />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Salary Sourcing Modal ──────────────────────────────────────────────────
function SalarySourcingModal({
  isOpen,
  onClose,
  salaryCandidates,
  effectiveSalaryInfo,
  salaryPref,
  onSavePref,
  onNavigateToTab,
}: {
  isOpen: boolean;
  onClose: () => void;
  salaryCandidates: any;
  effectiveSalaryInfo: any;
  salaryPref: any;
  onSavePref: (pref: any) => void;
  onNavigateToTab?: (tab: string) => void;
}) {
  const [source, setSource] = useState(salaryPref?.source || "auto");
  const [customVal, setCustomVal] = useState(
    salaryPref?.customAmount != null ? String(salaryPref.customAmount) : ""
  );

  if (!isOpen) return null;

  const { bank, slip, ledger } = salaryCandidates;

  const handleApply = () => {
    onSavePref({
      source,
      customAmount: source === "custom" ? Number(customVal) || 0 : undefined,
    });
    onClose();
  };

  const handleResetAuto = () => {
    setSource("auto");
    onSavePref({ source: "auto" });
    onClose();
  };

  return (
    <Modal
      title="Salary Forecast Sourcing"
      onClose={onClose}
      maxWidth={640}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <Button variant="secondary" size="sm" onClick={handleResetAuto}>
            Reset to Auto
          </Button>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleApply}>
              Apply to Forecast
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Accounting Rule Banner */}
        <div
          style={{
            background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
            borderRadius: 12,
            padding: "14px 16px",
            fontSize: 12.5,
            lineHeight: 1.5,
            color: THEME.ink,
            display: "flex",
            gap: 12,
          }}
        >
          <Info size={19} style={{ color: THEME.accent, flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Senior Accountant Note:</strong> The cash flow forecast projects recurring <em>net take-home pay</em> (in-hand post statutory deductions).
            By default, we evaluate <strong>Bank statement credits (Priority 1)</strong> first, then <strong>official Salary Slips (Priority 2)</strong>, and finally the <strong>Income Ledger (Priority 3)</strong>.
          </div>
        </div>

        {/* Current Active Source Indicator */}
        <div
          style={{
            background: "var(--surface-1)",
            border: `1.5px solid ${THEME.line}`,
            borderRadius: 12,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>
              Active Forecast Net Salary
            </span>
            <div style={{ fontSize: 22, fontWeight: 800, color: THEME.sage, marginTop: 3 }}>
              ₹{Math.round(effectiveSalaryInfo.amount).toLocaleString("en-IN")}{" "}
              <span style={{ fontSize: 13, fontWeight: 500, color: THEME.muted }}>/ month</span>
            </div>
            <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 3 }}>
              Source: <strong>{effectiveSalaryInfo.label}</strong>
              {effectiveSalaryInfo.isOverridden && (
                <span style={{ marginLeft: 6, color: THEME.gold, fontWeight: 700 }}>• User Override</span>
              )}
            </div>
          </div>
          {effectiveSalaryInfo.isOverridden ? (
            <Badge variant="gold">Custom Override</Badge>
          ) : (
            <Badge variant="sage">Auto-Linked</Badge>
          )}
        </div>

        {/* Option 1: Auto */}
        <div
          onClick={() => setSource("auto")}
          style={{
            border: `1.5px solid ${source === "auto" ? THEME.accent : THEME.line}`,
            background: source === "auto" ? `color-mix(in srgb, ${THEME.accent} 6%, var(--surface-0))` : "var(--surface-0)",
            borderRadius: 12,
            padding: "14px 16px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="radio"
                name="salarySource"
                checked={source === "auto"}
                onChange={() => setSource("auto")}
                style={{ cursor: "pointer", accentColor: THEME.accent }}
              />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: THEME.ink }}>
                  Auto-Detect (Bank First → Salary Slips → Ledger)
                </div>
                <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                  Evaluates recent bank credit transactions first; falls back to verified salary slips.
                </div>
              </div>
            </div>
            <Badge variant="muted">Default Priority</Badge>
          </div>
        </div>

        {/* Option 2: Bank Statement Credits (Priority 1) */}
        <div
          onClick={() => setSource("bank")}
          style={{
            border: `1.5px solid ${source === "bank" ? THEME.accent : THEME.line}`,
            background: source === "bank" ? `color-mix(in srgb, ${THEME.accent} 6%, var(--surface-0))` : "var(--surface-0)",
            borderRadius: 12,
            padding: "14px 16px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <input
                type="radio"
                name="salarySource"
                checked={source === "bank"}
                onChange={() => setSource("bank")}
                style={{ cursor: "pointer", accentColor: THEME.accent, marginTop: 3 }}
              />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: THEME.ink }}>
                  Bank Statement Credits (Priority 1)
                </div>
                <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                  {bank.txns.length > 0
                    ? `${bank.txns.length} credit transaction(s) categorized as Salary`
                    : "No salary credits detected in bank accounts"}
                </div>
                {bank.txns.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {bank.txns.slice(0, 3).map((t: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 11,
                          color: THEME.ink,
                          background: "var(--surface-1)",
                          padding: "5px 10px",
                          borderRadius: 6,
                          display: "flex",
                          justifyContent: "space-between",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <span style={{ color: THEME.muted }}>{t.date || "Date N/A"} • {t.description || t.category || "Salary"}</span>
                        <strong>₹{Number(t.amount || 0).toLocaleString("en-IN")}</strong>
                      </div>
                    ))}
                  </div>
                )}
                {bank.monthly > 0 && slip.monthly > 0 && bank.monthly < slip.monthly * 0.5 && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, color: THEME.gold || "#f59e0b", fontSize: 11.5 }}>
                    <AlertCircle size={14} />
                    <span>Bank credit (₹{Math.round(bank.monthly).toLocaleString("en-IN")}) is lower than Salary Slip net (₹{Math.round(slip.monthly).toLocaleString("en-IN")}).</span>
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: bank.monthly > 0 ? THEME.sage : THEME.muted }}>
                ₹{Math.round(bank.monthly).toLocaleString("en-IN")}
              </div>
              <span style={{ fontSize: 10.5, color: THEME.muted }}>/mo avg</span>
            </div>
          </div>
        </div>

        {/* Option 3: Official Salary Slips (Priority 2) */}
        <div
          onClick={() => setSource("slip")}
          style={{
            border: `1.5px solid ${source === "slip" ? THEME.accent : THEME.line}`,
            background: source === "slip" ? `color-mix(in srgb, ${THEME.accent} 6%, var(--surface-0))` : "var(--surface-0)",
            borderRadius: 12,
            padding: "14px 16px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <input
                type="radio"
                name="salarySource"
                checked={source === "slip"}
                onChange={() => setSource("slip")}
                style={{ cursor: "pointer", accentColor: THEME.accent, marginTop: 3 }}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: THEME.ink }}>
                    Official Salary Slips (Priority 2)
                  </span>
                  <Badge variant="sage">Audited In-Hand Pay</Badge>
                </div>
                <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                  {slip.slips.length > 0
                    ? `Latest net take-home pay from Salary Slip Tracker`
                    : "No salary slips uploaded yet in Salary Tracker"}
                </div>
                {slip.slips.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {slip.slips.map((s: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 11.5,
                          color: THEME.ink,
                          background: "var(--surface-1)",
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: `1px solid ${THEME.line}`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                          <span>{s.employer || "Employer"} ({s.slipMonth || "Month N/A"})</span>
                          <span style={{ color: THEME.sage }}>Net: ₹{Number(s.netSalary || 0).toLocaleString("en-IN")}</span>
                        </div>
                        <div style={{ fontSize: 10.5, color: THEME.muted, marginTop: 2 }}>
                          Gross: ₹{Number(s.grossSalary || 0).toLocaleString("en-IN")} • Deductions: ₹{Number(s.totalDeductions || 0).toLocaleString("en-IN")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {onNavigateToTab && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        onNavigateToTab("salaryslips");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: THEME.accent,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: 0,
                      }}
                    >
                      <FileText size={13} />
                      <span>Manage slips in Salary Tracker →</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: slip.monthly > 0 ? THEME.sage : THEME.muted }}>
                ₹{Math.round(slip.monthly).toLocaleString("en-IN")}
              </div>
              <span style={{ fontSize: 10.5, color: THEME.muted }}>/mo net</span>
            </div>
          </div>
        </div>

        {/* Option 4: Income Ledger */}
        <div
          onClick={() => setSource("ledger")}
          style={{
            border: `1.5px solid ${source === "ledger" ? THEME.accent : THEME.line}`,
            background: source === "ledger" ? `color-mix(in srgb, ${THEME.accent} 6%, var(--surface-0))` : "var(--surface-0)",
            borderRadius: 12,
            padding: "14px 16px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <input
                type="radio"
                name="salarySource"
                checked={source === "ledger"}
                onChange={() => setSource("ledger")}
                style={{ cursor: "pointer", accentColor: THEME.accent, marginTop: 3 }}
              />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: THEME.ink }}>
                  Income Ledger Entries (Priority 3)
                </div>
                <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                  {ledger.entries.length > 0
                    ? `${ledger.entries.length} manual entry(ies) in income ledger`
                    : "No manual salary entries logged in income ledger"}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: ledger.monthly > 0 ? THEME.sage : THEME.muted }}>
                ₹{Math.round(ledger.monthly).toLocaleString("en-IN")}
              </div>
              <span style={{ fontSize: 10.5, color: THEME.muted }}>/mo avg</span>
            </div>
          </div>
        </div>

        {/* Option 5: Custom Amount */}
        <div
          onClick={() => setSource("custom")}
          style={{
            border: `1.5px solid ${source === "custom" ? THEME.accent : THEME.line}`,
            background: source === "custom" ? `color-mix(in srgb, ${THEME.accent} 6%, var(--surface-0))` : "var(--surface-0)",
            borderRadius: 12,
            padding: "14px 16px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="radio"
              name="salarySource"
              checked={source === "custom"}
              onChange={() => setSource("custom")}
              style={{ cursor: "pointer", accentColor: THEME.accent }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: THEME.ink }}>
                Custom Monthly Take-Home Pay Override
              </div>
              <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                Enter your exact expected recurring monthly net salary for this forecast.
              </div>
              {source === "custom" && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>₹</span>
                  <input
                    type="number"
                    value={customVal}
                    onChange={(e) => setCustomVal(e.target.value)}
                    placeholder="e.g. 161210"
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${THEME.line}`,
                      background: "var(--surface-0)",
                      color: THEME.ink,
                      fontSize: 14,
                      fontWeight: 700,
                      width: 190,
                    }}
                    autoFocus
                  />
                  <span style={{ fontSize: 12, color: THEME.muted }}>/ month in-hand</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── MAIN CASH FLOW TAB COMPONENT ───────────────────────────────────────────

export const CashFlowTab = ({
  state,
  metrics,
  onNavigateToTab,
}: {
  state: any;
  metrics: any;
  onNavigateToTab?: (tab: string) => void;
}) => {
  const { privacyMode } = usePrivacy();
  const isDark = state?.settings?.darkMode ?? false;

  // Horizon: 1, 3, 6, 12 Months
  const [forecastMonths, setForecastMonths] = useState<HorizonMonths>(6);

  // Visualization Mode: "flow" (In/Out Bars + Line), "balance" (Bank balance Area), "delta" (Net bars)
  const [chartViewMode, setChartViewMode] = useState<"flow" | "balance" | "delta">("flow");

  // Filter for inflows & outflows
  const [inflowFilter, setInflowFilter] = useState<string>("all");
  const [outflowFilter, setOutflowFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Section collapse states
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    simulator: false,
    matrix: true,
    inflows: true,
    outflows: true,
    events: true,
  });
  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Selected Month for Drill-down Inspector modal
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

  // ── WHAT-IF SIMULATOR STATE ──────────────────────────────────────────────
  const [simSalaryHikePct, setSimSalaryHikePct] = useState<number>(0);
  const [simBonusAmount, setSimBonusAmount] = useState<number>(0);
  const [simBonusMonth, setSimBonusMonth] = useState<string>("");
  const [simExpenseAmount, setSimExpenseAmount] = useState<number>(0);
  const [simExpenseMonth, setSimExpenseMonth] = useState<string>("");
  const [simSipDelta, setSimSipDelta] = useState<number>(0);

  const isSimulationActive =
    simSalaryHikePct !== 0 ||
    simBonusAmount > 0 ||
    simExpenseAmount > 0 ||
    simSipDelta !== 0;

  const resetSimulation = () => {
    setSimSalaryHikePct(0);
    setSimBonusAmount(0);
    setSimBonusMonth("");
    setSimExpenseAmount(0);
    setSimExpenseMonth("");
    setSimSipDelta(0);
  };

  const months = useMemo(() => getFutureMonths(forecastMonths), [forecastMonths]);

  // Set default simulation months when months change
  React.useEffect(() => {
    if (months.length > 0 && !simBonusMonth) {
      setSimBonusMonth(months[0].key);
    }
    if (months.length > 0 && !simExpenseMonth) {
      setSimExpenseMonth(months[0].key);
    }
  }, [months, simBonusMonth, simExpenseMonth]);

  // ── SALARY SOURCING PREFERENCE ───────────────────────────────────────────
  const [salaryPref, setSalaryPref] = useState<{
    source: "auto" | "bank" | "slip" | "ledger" | "custom";
    customAmount?: number;
  }>(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("arthadrishti_cf_salary_pref") : null;
      if (saved) return JSON.parse(saved);
    } catch {}
    return { source: "auto" };
  });

  const [salaryModalOpen, setSalaryModalOpen] = useState(false);

  const handleSaveSalaryPref = (pref: any) => {
    setSalaryPref(pref);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("arthadrishti_cf_salary_pref", JSON.stringify(pref));
      }
    } catch {}
  };

  // ── STARTING LIQUID CASH (from Bank Accounts) ────────────────────────────
  const startingLiquidCash = useMemo(() => {
    return (state?.bankAccounts || []).reduce(
      (sum: number, b: any) => sum + Number(b.balance || 0),
      0
    );
  }, [state?.bankAccounts]);

  // ── SALARY CANDIDATE EVALUATION ───────────────────────────────────────────
  // Evaluates all available candidates:
  // 1. Bank transactions (Priority 1: checked first)
  // 2. Official Salary Slips (Priority 2: verified net pay)
  // 3. Income Ledger (Priority 3: manual entries)
  const salaryCandidates = useMemo(() => {
    const employerNames = (state?.salarySlips || [])
      .map((s: any) => (s.employer || "").toLowerCase().trim())
      .filter((e: string) => e.length > 2);

    const salaryTxns = (state?.transactions || []).filter((t: any) => {
      if (t.type !== "credit") return false;
      const cat = (t.category || "").toLowerCase();
      const desc = (t.description || "").toLowerCase();
      if (cat.includes("salary") || desc.includes("salary") || desc.includes("payroll")) return true;
      if (employerNames.some((emp: string) => desc.includes(emp))) return true;
      return false;
    });

    const bankMonthlyMap: Record<string, number> = {};
    salaryTxns.forEach((t: any) => {
      if (t.date) {
        const ym = t.date.slice(0, 7);
        bankMonthlyMap[ym] = (bankMonthlyMap[ym] || 0) + Number(t.amount || 0);
      }
    });
    const sortedBankYMs = Object.keys(bankMonthlyMap).sort();
    let bankMonthly = 0;
    if (sortedBankYMs.length > 0) {
      const recentYMs = sortedBankYMs.slice(-3);
      const sum = recentYMs.reduce((s, ym) => s + bankMonthlyMap[ym], 0);
      bankMonthly = sum / recentYMs.length;
    }

    // 2. Official Salary Slips from Salary Tracker (Priority 2)
    const ownerLatestSlip = new Map<string, any>();
    (state?.salarySlips || []).forEach((sl: any) => {
      const ownerKey = sl.owner || "self";
      const current = ownerLatestSlip.get(ownerKey);
      if (!current || (sl.slipMonth || "").localeCompare(current.slipMonth || "") > 0) {
        ownerLatestSlip.set(ownerKey, sl);
      }
    });
    const slipDetails = Array.from(ownerLatestSlip.values());
    const slipMonthly = slipDetails.reduce((sum, sl) => sum + Number(sl.netSalary || 0), 0);

    // 3. Manual Income Ledger Entries (Priority 3)
    const salaryEntries = (state?.income || []).filter(
      (i: any) =>
        (i.source || i.category || "").toLowerCase().includes("salary") ||
        (i.note || "").toLowerCase().includes("salary")
    );
    const ledgerMonthlyMap: Record<string, number> = {};
    salaryEntries.forEach((i: any) => {
      if (i.date) {
        const ym = i.date.slice(0, 7);
        ledgerMonthlyMap[ym] = (ledgerMonthlyMap[ym] || 0) + Number(i.amount || 0);
      }
    });
    const sortedLedgerYMs = Object.keys(ledgerMonthlyMap).sort();
    let ledgerMonthly = 0;
    if (sortedLedgerYMs.length > 0) {
      const recentYMs = sortedLedgerYMs.slice(-3);
      const sum = recentYMs.reduce((s, ym) => s + ledgerMonthlyMap[ym], 0);
      ledgerMonthly = sum / recentYMs.length;
    }

    return {
      bank: {
        monthly: bankMonthly,
        txns: salaryTxns,
        recentMonths: sortedBankYMs.slice(-3),
      },
      slip: {
        monthly: slipMonthly,
        slips: slipDetails,
      },
      ledger: {
        monthly: ledgerMonthly,
        entries: salaryEntries,
        recentMonths: sortedLedgerYMs.slice(-3),
      },
    };
  }, [state?.transactions, state?.salarySlips, state?.income]);

  // Determine active effective salary based on priority:
  // Priority 1: Bank Transactions -> Priority 2: Salary Slips -> Priority 3: Income Ledger
  const effectiveSalaryInfo = useMemo(() => {
    const { bank, slip, ledger } = salaryCandidates;
    const pref = salaryPref.source;

    let activeSource: "bank" | "slip" | "ledger" | "custom" = "bank";
    let activeAmount = 0;
    let label = "";

    if (pref === "custom") {
      activeSource = "custom";
      activeAmount = Number(salaryPref.customAmount || 0);
      label = "Custom Monthly Override";
    } else if (pref === "bank") {
      activeSource = "bank";
      activeAmount = bank.monthly;
      label = "From Bank Transactions";
    } else if (pref === "slip") {
      activeSource = "slip";
      activeAmount = slip.monthly;
      const emp = slip.slips[0]?.employer;
      label = `From Salary Slips${emp ? ` (${emp})` : ""}`;
    } else if (pref === "ledger") {
      activeSource = "ledger";
      activeAmount = ledger.monthly;
      label = "From Income Ledger";
    } else {
      // "auto": Rule: check bank first, then salary slip, then income ledger
      if (bank.monthly > 0) {
        activeSource = "bank";
        activeAmount = bank.monthly;
        label = "From Bank Transactions";
      } else if (slip.monthly > 0) {
        activeSource = "slip";
        activeAmount = slip.monthly;
        const emp = slip.slips[0]?.employer;
        label = `From Salary Slips${emp ? ` (${emp})` : ""}`;
      } else if (ledger.monthly > 0) {
        activeSource = "ledger";
        activeAmount = ledger.monthly;
        label = "From Income Ledger";
      }
    }

    return {
      amount: activeAmount,
      source: activeSource,
      label,
      isOverridden: pref !== "auto",
    };
  }, [salaryCandidates, salaryPref]);

  // ── INCOME SOURCES (INFLOWS) ─────────────────────────────────────────────
  const rawInflows = useMemo(() => {
    const sources: {
      name: string;
      monthly: number;
      icon: any;
      category: string;
      sourceLabel?: string;
      sourceType?: string;
      isOverridden?: boolean;
    }[] = [];

    // 1. Primary / Salary Income (with simulation adjustment if active)
    const baseSalary = effectiveSalaryInfo.amount;
    const simulatedSalary = baseSalary * (1 + (simSalaryHikePct || 0) / 100);

    if (simulatedSalary > 0) {
      sources.push({
        name: "Salary",
        monthly: simulatedSalary,
        icon: Wallet,
        category: "Salary",
        sourceLabel: effectiveSalaryInfo.label,
        sourceType: effectiveSalaryInfo.source,
        isOverridden: effectiveSalaryInfo.isOverridden || simSalaryHikePct !== 0,
      });
    }

    // 2. Rental Income (Active Landlord Properties)
    const rentalTotal = (state?.rentalProperties || []).reduce(
      (sum: number, p: any) => sum + getEffectiveRent(p),
      0
    );
    if (rentalTotal > 0)
      sources.push({ name: "Rental Income", monthly: rentalTotal, icon: Home, category: "Rental" });

    // 3. Dividend Income
    const dividends = state?.dividends || [];
    if (dividends.length > 0) {
      const amounts = dividends.map((d: any) => Number(d.amount || d.totalAmount || 0));
      const totalDiv = amounts.reduce((s: number, a: number) => s + a, 0);
      const dates = dividends
        .map((d: any) => d.date || d.exDate || "")
        .filter(Boolean)
        .sort();
      let monthlyDiv = 0;
      if (dates.length >= 2) {
        const first = new Date(dates[0] + "T00:00:00");
        const last = new Date(dates[dates.length - 1] + "T00:00:00");
        const spanMonths = Math.max(
          1,
          (last.getFullYear() - first.getFullYear()) * 12 + (last.getMonth() - first.getMonth())
        );
        monthlyDiv = totalDiv / spanMonths;
      } else {
        monthlyDiv = totalDiv / 12;
      }
      if (monthlyDiv > 0)
        sources.push({
          name: "Dividends",
          monthly: monthlyDiv,
          icon: TrendingUp,
          category: "Dividends",
        });
    }

    // 4. Interest Income — FDs
    const fdInterest = (state?.fixedDeposits || []).reduce((sum: number, fd: any) => {
      const principal = Number(fd.principal || fd.amount || 0);
      const rate = Number(fd.rate || fd.interestRate || 0);
      return sum + (principal * rate) / 100 / 12;
    }, 0);
    if (fdInterest > 0)
      sources.push({
        name: "FD Interest",
        monthly: fdInterest,
        icon: Landmark,
        category: "Interest",
      });

    // Interest Income — RDs
    const rdInterest = (state?.recurringDeposits || []).reduce((sum: number, rd: any) => {
      const monthly = Number(rd.monthly || 0);
      const rate = Number(rd.rate || rd.interestRate || 0);
      const tenure = Number(rd.tenureMonths || 12);
      const avgBalance = (monthly * tenure) / 2;
      return sum + (avgBalance * rate) / 100 / 12;
    }, 0);
    if (rdInterest > 0)
      sources.push({
        name: "RD Interest",
        monthly: rdInterest,
        icon: Landmark,
        category: "Interest",
      });

    // Interest Income — PPF
    const ppfInterest = (state?.ppf || []).reduce((sum: number, p: any) => {
      const balance = Number(p.currentBalance || p.balance || 0);
      const rate = Number(p.interestRate || 7.1);
      return sum + (balance * rate) / 100 / 12;
    }, 0);
    if (ppfInterest > 0)
      sources.push({
        name: "PPF Interest",
        monthly: ppfInterest,
        icon: PiggyBank,
        category: "Interest",
      });

    // 5. Other Income from Bank & Income Ledger (Freelance, Consulting, Business, etc.)
    const nonSalaryIncome = (state?.income || []).filter(
      (i: any) => !(i.source || i.category || "").toLowerCase().includes("salary")
    );
    if (nonSalaryIncome.length > 0) {
      const sourceMap: Record<string, { total: number; months: Set<string> }> = {};
      nonSalaryIncome.forEach((i: any) => {
        const src = i.source || i.category || "Other Income";
        if (!sourceMap[src]) sourceMap[src] = { total: 0, months: new Set() };
        sourceMap[src].total += Number(i.amount || 0);
        if (i.date) sourceMap[src].months.add(i.date.slice(0, 7));
      });

      Object.entries(sourceMap).forEach(([src, data]) => {
        const span = Math.max(data.months.size, 1);
        const monthlyAvg = data.total / span;
        if (monthlyAvg > 0) {
          sources.push({
            name: src,
            monthly: monthlyAvg,
            icon: DollarSign,
            category: "Other",
          });
        }
      });
    }

    return sources;
  }, [
    effectiveSalaryInfo,
    simSalaryHikePct,
    state?.rentalProperties,
    state?.dividends,
    state?.fixedDeposits,
    state?.recurringDeposits,
    state?.ppf,
    state?.income,
  ]);

  const inflows = useMemo(() => {
    return rawInflows.filter((item) => {
      if (inflowFilter !== "all" && item.category.toLowerCase() !== inflowFilter.toLowerCase()) {
        return false;
      }
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase()) && !item.category.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [rawInflows, inflowFilter, searchTerm]);

  // ── EXPENSE SOURCES (OUTFLOWS) ───────────────────────────────────────────
  const rawOutflows = useMemo(() => {
    const sources: { name: string; monthly: number; icon: any; category: string; isSimulated?: boolean }[] = [];

    // 1. EMIs (active loans only)
    const emiTotal = (state?.loansTaken || [])
      .filter((l: any) => loanOutstanding(l) > 0 && Number(l.monthsRemaining ?? 1) > 0)
      .reduce((sum: number, l: any) => sum + Number(l.emi || 0), 0);
    if (emiTotal > 0)
      sources.push({ name: "Loan EMIs", monthly: emiTotal, icon: CreditCard, category: "EMI" });

    // 2. SIPs (active only, with simulation adjustment)
    const baseSipTotal = (state?.sips || []).reduce((sum: number, s: any) => {
      if ((s.status || "").toLowerCase() === "stopped") return sum;
      return sum + Number(s.amount || 0);
    }, 0);
    const effectiveSipTotal = Math.max(0, baseSipTotal + (simSipDelta || 0));

    if (effectiveSipTotal > 0)
      sources.push({
        name: "SIP Investments",
        monthly: effectiveSipTotal,
        icon: TrendingUp,
        category: "SIP",
        isSimulated: simSipDelta !== 0,
      });

    // 3. Subscriptions
    const subTotal = (state?.subscriptions || []).reduce((sum: number, s: any) => {
      if (
        s.paused ||
        (s.status || "").toLowerCase() === "cancelled" ||
        (s.status || "").toLowerCase() === "inactive"
      )
        return sum;
      const amt = Number(s.amount || s.price || 0);
      return sum + freqToMonthly(s.frequency || s.billing || "monthly", amt);
    }, 0);
    if (subTotal > 0)
      sources.push({
        name: "Subscriptions",
        monthly: subTotal,
        icon: Receipt,
        category: "Subscriptions",
      });

    // 4. Recurring Expenses
    const recurringTotal = (state?.recurringExpenses || []).reduce(
      (sum: number, e: any) => sum + Number(e.amount || 0),
      0
    );
    if (recurringTotal > 0)
      sources.push({
        name: "Recurring Expenses",
        monthly: recurringTotal,
        icon: Activity,
        category: "Recurring",
      });

    // 5. Credit Card Minimum Dues
    const ccMinDue = (state?.creditCards || [])
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .reduce((sum: number, c: any) => sum + Number(c.minimumDue || c.lastBill || 0), 0);
    if (ccMinDue > 0)
      sources.push({
        name: "Credit Card Dues",
        monthly: ccMinDue,
        icon: CreditCard,
        category: "Credit Cards",
      });

    // 6. Rent Paid
    const rentPaid = (state?.rentedProperties || []).reduce(
      (sum: number, p: any) => sum + getEffectiveRent(p),
      0
    );
    if (rentPaid > 0)
      sources.push({ name: "Rent Paid", monthly: rentPaid, icon: Home, category: "Rent" });

    // 7. Insurance Premiums (LIC, Term, Investment, Health)
    const licPremium = (state?.lic || []).reduce(
      (sum: number, l: any) =>
        sum + annualizePremium(l.premium, l.premiumFrequency, l.annualPremium) / 12,
      0
    );
    const termPremium = (state?.termPlans || []).reduce(
      (sum: number, t: any) =>
        sum + annualizePremium(t.premium, t.premiumFrequency, t.annualPremium) / 12,
      0
    );
    const ulipPremium = (state?.investmentPlans || []).reduce(
      (sum: number, ip: any) =>
        sum + annualizePremium(ip.premium, ip.premiumFrequency, ip.annualPremium) / 12,
      0
    );
    const healthPremium = (state?.healthInsurance || []).reduce(
      (sum: number, h: any) => {
        const mult: Record<string, number> = { monthly: 12, quarterly: 4, semi_annual: 2, annual: 1 };
        const annualAmt = Number(h.premium || 0) * (mult[h.premiumFrequency || "annual"] || 1);
        return sum + annualAmt / 12;
      },
      0
    );
    const totalInsurance = licPremium + termPremium + ulipPremium + healthPremium;
    if (totalInsurance > 0)
      sources.push({
        name: "Insurance Premiums",
        monthly: totalInsurance,
        icon: Shield,
        category: "Insurance",
      });

    // 8. Living / Day-to-Day Expenses
    const DEDICATED_CATEGORIES = new Set([
      "emi",
      "loan",
      "rent",
      "insurance",
      "subscription",
      "credit card",
      "transfer",
      "self transfer",
      "self-transfer",
      "investment",
    ]);

    const isDedicatedCategory = (cat: string) => {
      const c = (cat || "").toLowerCase().trim();
      return DEDICATED_CATEGORIES.has(c);
    };

    const budgetTotal = (state?.budgets || [])
      .filter((b: any) => !isDedicatedCategory(b.category))
      .reduce((sum: number, b: any) => sum + Number(b.monthly || b.monthlyLimit || b.limit || 0), 0);

    if (budgetTotal > 0) {
      sources.push({
        name: "Budget / Living Expenses",
        monthly: budgetTotal,
        icon: Target,
        category: "Budget",
      });
    } else {
      const livingTxns = (state?.transactions || []).filter(
        (t: any) => t.type === "debit" && !isDedicatedCategory(t.category)
      );
      if (livingTxns.length > 0) {
        const monthlySpending: Record<string, number> = {};
        livingTxns.forEach((t: any) => {
          if (t.date) {
            const ym = t.date.slice(0, 7);
            monthlySpending[ym] = (monthlySpending[ym] || 0) + Number(t.amount || 0);
          }
        });
        const sortedYMs = Object.keys(monthlySpending).sort();
        if (sortedYMs.length > 0) {
          const recentYMs = sortedYMs.slice(-3);
          const sum = recentYMs.reduce((s, ym) => s + monthlySpending[ym], 0);
          const avgLivingExpense = sum / recentYMs.length;
          if (avgLivingExpense > 0) {
            sources.push({
              name: "Living Expenses (Ledger)",
              monthly: avgLivingExpense,
              icon: Target,
              category: "Living Expenses",
            });
          }
        }
      }
    }

    return sources;
  }, [
    state?.loansTaken,
    state?.sips,
    simSipDelta,
    state?.subscriptions,
    state?.recurringExpenses,
    state?.creditCards,
    state?.rentedProperties,
    state?.lic,
    state?.termPlans,
    state?.investmentPlans,
    state?.healthInsurance,
    state?.budgets,
    state?.transactions,
  ]);

  const outflows = useMemo(() => {
    return rawOutflows.filter((item) => {
      if (outflowFilter !== "all" && item.category.toLowerCase() !== outflowFilter.toLowerCase()) {
        return false;
      }
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase()) && !item.category.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [rawOutflows, outflowFilter, searchTerm]);

  // ── ONE-TIME EVENTS ───────────────────────────────────────────────────────
  const events = useMemo(() => {
    const items: {
      date: string;
      name: string;
      amount: number;
      category: string;
      type: "inflow" | "outflow";
      isSimulated?: boolean;
    }[] = [];

    // FD Maturities
    (state?.fixedDeposits || []).forEach((fd: any) => {
      const matDate = fd.maturityDate || "";
      if (isDateInRange(matDate, months)) {
        const principal = Number(fd.principal || 0);
        const years = Number(fd.years || 0);
        const maturityAmount =
          principal > 0 && years > 0
            ? fdMaturity(principal, Number(fd.rate || 0), years)
            : principal;
        items.push({
          date: matDate,
          name: `FD Maturity${fd.bank ? ` — ${fd.bank}` : ""}`,
          amount: maturityAmount,
          category: "FD Maturity",
          type: "inflow",
        });
      }
    });

    // RD Maturities
    (state?.recurringDeposits || []).forEach((rd: any) => {
      if (!rd.startDate || !rd.monthly || !rd.tenureMonths) return;
      const matDate = addMonthsToDateStr(rd.startDate, Number(rd.tenureMonths));
      if (isDateInRange(matDate, months)) {
        const maturityAmount = rdMaturity(
          Number(rd.monthly || 0),
          Number(rd.rate || 0),
          Number(rd.tenureMonths || 0)
        );
        items.push({
          date: matDate,
          name: `RD Maturity${rd.bank ? ` — ${rd.bank}` : ""}`,
          amount: maturityAmount,
          category: "RD Maturity",
          type: "inflow",
        });
      }
    });

    // Bond Maturities
    (state?.bonds || []).forEach((b: any) => {
      const matDate = b.maturityDate || "";
      if (isDateInRange(matDate, months)) {
        const amount =
          Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
          Number(b.faceValue || b.totalPrincipalAmount || b.totalInvestmentAmount || 0);
        if (amount > 0) {
          items.push({
            date: matDate,
            name: `Bond Maturity — ${b.name || "Bond"}`,
            amount,
            category: "Bond Maturity",
            type: "inflow",
          });
        }
      }
    });

    // Loans Given Repayments
    (state?.loansGiven || []).forEach((l: any) => {
      const outstanding = loanGivenOutstanding(l);
      if (outstanding <= 0 || !l.dueDate) return;
      if (isDateInRange(l.dueDate, months)) {
        items.push({
          date: l.dueDate,
          name: `Loan Repayment — ${l.borrower || "Borrower"}`,
          amount: outstanding,
          category: "Loan Repayment",
          type: "inflow",
        });
      }
    });

    // Insurance Premium Due
    const todayStr = today();
    const addPremiumDue = (policies: any[], startField: string, expiryField: string) => {
      (policies || []).forEach((policy: any) => {
        const premium = annualizePremium(policy.premium, policy.premiumFrequency, policy.annualPremium);
        if (!premium) return;
        const startDate = policy[startField];
        if (!startDate) return;
        const expiry = policy[expiryField];
        if (expiry && expiry < todayStr) return;
        const dueDate = nextAnnualOccurrence(startDate, todayStr);
        if (isDateInRange(dueDate, months)) {
          items.push({
            date: dueDate,
            name: `Premium — ${policy.planName || policy.name || policy.provider || "Insurance"}`,
            amount: premium,
            category: "Insurance Premium",
            type: "outflow",
          });
        }
      });
    };
    addPremiumDue(state?.lic, "commencementDate", "maturityDate");
    addPremiumDue(state?.termPlans, "startDate", "expiryDate");
    addPremiumDue(state?.investmentPlans, "commencementDate", "maturityDate");

    const addHealthPremiumDue = (policies: any[]) => {
      (policies || []).forEach((policy: any) => {
        const mult: Record<string, number> = { monthly: 12, quarterly: 4, semi_annual: 2, annual: 1 };
        const premium = Number(policy.premium || 0) * (mult[policy.premiumFrequency || "annual"] || 1);
        if (!premium) return;
        const startDate = policy.startDate || policy.renewalDate;
        if (!startDate) return;
        const expiry = policy.expiryDate || policy.renewalDate;
        if (expiry && expiry < todayStr) return;
        const dueDate = nextAnnualOccurrence(startDate, todayStr);
        if (isDateInRange(dueDate, months)) {
          items.push({
            date: dueDate,
            name: `Health Premium — ${policy.planName || policy.insurer || policy.provider || "Health Insurance"}`,
            amount: premium,
            category: "Insurance Premium",
            type: "outflow",
          });
        }
      });
    };
    addHealthPremiumDue(state?.healthInsurance);

    // Loan Closures
    (state?.loansTaken || []).forEach((loan: any) => {
      if ((loan.status || "").toLowerCase() === "closed") return;
      if (!loan.monthsRemaining || !loan.emi) return;
      const outstanding = loanOutstanding(loan);
      if (outstanding <= 0) return;
      const closureDate = addMonthsToDateStr(todayStr, Number(loan.monthsRemaining));
      if (isDateInRange(closureDate, months)) {
        items.push({
          date: closureDate,
          name: `Loan Closure — ${loan.lender || loan.lenderBorrower || loan.type || "Loan"}`,
          amount: outstanding,
          category: "Loan Closure",
          type: "outflow",
        });
      }
    });

    // Subscriptions Renewal
    (state?.subscriptions || []).forEach((sub: any) => {
      const freq = (sub.frequency || sub.billing || "monthly").toLowerCase();
      if (freq !== "yearly" && freq !== "annual" && freq !== "annually") return;
      if ((sub.status || "").toLowerCase() === "cancelled") return;
      const renewDate = sub.renewalDate || sub.nextBillingDate || "";
      if (renewDate && isDateInRange(renewDate, months)) {
        items.push({
          date: renewDate,
          name: `Renewal — ${sub.name || sub.service || "Subscription"}`,
          amount: Number(sub.amount || sub.price || 0),
          category: "Subscription Renewal",
          type: "outflow",
        });
      }
    });

    // Simulated Bonus / Inflow
    if (simBonusAmount > 0 && simBonusMonth) {
      items.push({
        date: `${simBonusMonth}-15`,
        name: "Simulated Bonus / Lump Sum",
        amount: simBonusAmount,
        category: "Simulated Inflow",
        type: "inflow",
        isSimulated: true,
      });
    }

    // Simulated Expense / Purchase
    if (simExpenseAmount > 0 && simExpenseMonth) {
      items.push({
        date: `${simExpenseMonth}-15`,
        name: "Simulated Major Expense / Purchase",
        amount: simExpenseAmount,
        category: "Simulated Outflow",
        type: "outflow",
        isSimulated: true,
      });
    }

    return items.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [
    state?.fixedDeposits,
    state?.recurringDeposits,
    state?.bonds,
    state?.loansGiven,
    state?.lic,
    state?.termPlans,
    state?.investmentPlans,
    state?.healthInsurance,
    state?.loansTaken,
    state?.subscriptions,
    months,
    simBonusAmount,
    simBonusMonth,
    simExpenseAmount,
    simExpenseMonth,
  ]);

  // ── TOTALS & SUMMARY CALCULATIONS ─────────────────────────────────────────
  const totalMonthlyInflow = rawInflows.reduce((s, i) => s + i.monthly, 0);
  const totalMonthlyOutflow = rawOutflows.reduce((s, o) => s + o.monthly, 0);
  const netMonthly = totalMonthlyInflow - totalMonthlyOutflow;
  const totalRegularInflow = totalMonthlyInflow * forecastMonths;
  const totalRegularOutflow = totalMonthlyOutflow * forecastMonths;

  const eventInflow = events.filter((e) => e.type === "inflow").reduce((s, e) => s + e.amount, 0);
  const eventOutflow = events.filter((e) => e.type === "outflow").reduce((s, e) => s + e.amount, 0);
  const grandInflow = totalRegularInflow + eventInflow;
  const grandOutflow = totalRegularOutflow + eventOutflow;
  const netCashFlow = grandInflow - grandOutflow;
  const projectedEndingBalance = startingLiquidCash + netCashFlow;

  // Monthly Runway
  const monthlyMandatoryOutflow = Math.max(1, totalMonthlyOutflow);
  const liquidRunwayMonths = startingLiquidCash / monthlyMandatoryOutflow;

  // Savings / Retention rate
  const retentionRate = grandInflow > 0 ? ((grandInflow - grandOutflow) / grandInflow) * 100 : 0;

  // ── MONTH-BY-MONTH MATRIX DATA ────────────────────────────────────────────
  const monthMatrix = useMemo(() => {
    let currentBalance = startingLiquidCash;
    let cumulativeSurplus = 0;

    return months.map((m) => {
      const monthEventInflow = events
        .filter((e) => e.type === "inflow" && e.date.startsWith(m.key))
        .reduce((s, e) => s + e.amount, 0);
      const monthEventOutflow = events
        .filter((e) => e.type === "outflow" && e.date.startsWith(m.key))
        .reduce((s, e) => s + e.amount, 0);

      const mInflow = totalMonthlyInflow + monthEventInflow;
      const mOutflow = totalMonthlyOutflow + monthEventOutflow;
      const mNet = mInflow - mOutflow;

      const startBal = currentBalance;
      currentBalance += mNet;
      cumulativeSurplus += mNet;

      const monthEvents = events.filter((e) => e.date.startsWith(m.key));

      return {
        key: m.key,
        label: m.label,
        year: m.year,
        month: m.month,
        regularInflow: totalMonthlyInflow,
        eventInflow: monthEventInflow,
        totalInflow: Math.round(mInflow),
        regularOutflow: totalMonthlyOutflow,
        eventOutflow: monthEventOutflow,
        totalOutflow: Math.round(mOutflow),
        netDelta: Math.round(mNet),
        startingBalance: Math.round(startBal),
        endingBalance: Math.round(currentBalance),
        cumulativeSurplus: Math.round(cumulativeSurplus),
        eventsCount: monthEvents.length,
        events: monthEvents,
      };
    });
  }, [months, events, totalMonthlyInflow, totalMonthlyOutflow, startingLiquidCash]);

  // Chart data formatting
  const chartData = useMemo(() => {
    return monthMatrix.map((m) => ({
      month: m.label,
      Inflow: m.totalInflow,
      Outflow: m.totalOutflow,
      Cumulative: m.cumulativeSurplus,
      EndingBalance: m.endingBalance,
      NetDelta: m.netDelta,
    }));
  }, [monthMatrix]);

  // Animated Numbers for summary cards
  const animatedStartingCash = useAnimatedNumber(startingLiquidCash);
  const animatedGrandInflow = useAnimatedNumber(grandInflow);
  const animatedGrandOutflow = useAnimatedNumber(grandOutflow);
  const animatedNetCashFlow = useAnimatedNumber(netCashFlow);
  const animatedEndingBalance = useAnimatedNumber(projectedEndingBalance);
  const animatedNetMonthly = useAnimatedNumber(netMonthly);

  // Selected Month Drilldown Data
  const selectedMonthData = useMemo(() => {
    if (!selectedMonthKey) return null;
    return monthMatrix.find((m) => m.key === selectedMonthKey) || null;
  }, [selectedMonthKey, monthMatrix]);

  // ── EMPTY STATE ──────────────────────────────────────────────────────────
  const hasData = rawInflows.length > 0 || rawOutflows.length > 0 || startingLiquidCash > 0;

  if (!hasData) {
    return (
      <div>
        <SectionTitle sub="Forward-looking projection of your income, expenses, liquid balance, and one-time events">
          Cash Flow Forecast
        </SectionTitle>
        <EmptyState
          icon={Activity}
          gradient={`linear-gradient(135deg, ${THEME.accent}, ${THEME.sage})`}
          dotColor={THEME.accent}
          title="No Cash Flow Data Yet"
          description={`Add income entries, loans, SIPs, subscriptions, or budgets to see your projected cash flow over the next ${forecastMonths} months.`}
          pills={["Income", "Loans", "SIPs", "Subscriptions", "Budgets"]}
        />
      </div>
    );
  }

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`
        .cf-segbtn {
          color: var(--t-muted);
          transition: all 0.2s var(--ease-premium);
        }
        .cf-segbtn:hover {
          color: var(--t-ink);
        }
        .cf-segbtn.active {
          color: var(--t-ink);
          background: var(--surface-0) !important;
          box-shadow: var(--shadow-sm);
        }
        .cf-matrix-card {
          transition: all 0.22s var(--ease-premium);
          cursor: pointer;
        }
        .cf-matrix-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-md);
          border-color: var(--t-accent) !important;
        }
        .cf-list-row {
          transition: background 0.18s var(--ease-premium), transform 0.18s var(--ease-premium);
        }
        .cf-list-row:hover {
          background: var(--surface-1);
          transform: translateX(4px);
        }
        .cf-event-row .cf-event-dot {
          transition: transform 0.2s var(--ease-premium), box-shadow 0.2s var(--ease-premium);
        }
        .cf-event-row:hover .cf-event-dot {
          transform: scale(1.3);
          box-shadow: 0 0 0 6px color-mix(in srgb, var(--t-accent) 25%, transparent) !important;
        }
      `}</style>

      {/* ── Header with Horizon & Simulator Controls ───────────────────────── */}
      <SectionTitle
        sub="Comprehensive forward-looking liquidity projection, recurring cash flows, and one-time capital events"
        rightElement={
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* What-If Simulator Toggle */}
            <button
              onClick={() => toggleSection("simulator")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: "var(--radius-md)",
                border: `1.5px solid ${isSimulationActive ? THEME.accent : THEME.line}`,
                background: isSimulationActive
                  ? `color-mix(in srgb, ${THEME.accent} 12%, var(--surface-0))`
                  : "var(--surface-0)",
                color: isSimulationActive ? THEME.accent : THEME.ink,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: isSimulationActive ? `0 0 12px color-mix(in srgb, ${THEME.accent} 25%, transparent)` : "none",
                transition: "all 0.2s ease",
              }}
            >
              <Sparkles size={14} style={{ color: isSimulationActive ? THEME.accent : THEME.muted }} />
              <span>What-If Sandbox</span>
              {isSimulationActive && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: THEME.accent,
                    display: "inline-block",
                  }}
                />
              )}
            </button>

            {/* Horizon Selector (1, 3, 6, 12 Months) */}
            <div
              style={{
                display: "flex",
                background: "var(--surface-1)",
                padding: "3px",
                borderRadius: "var(--radius-md)",
                border: `1.5px solid ${THEME.line}`,
                gap: "2px",
              }}
            >
              {([1, 3, 6, 12] as HorizonMonths[]).map((h) => (
                <button
                  key={h}
                  onClick={() => setForecastMonths(h)}
                  aria-pressed={forecastMonths === h}
                  className={`cf-segbtn ${forecastMonths === h ? "active" : ""}`}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    background: forecastMonths === h ? "var(--surface-0)" : "transparent",
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {h === 1 ? "1 Mo" : h === 12 ? "1 Year" : `${h} Mos`}
                </button>
              ))}
            </div>
          </div>
        }
      >
        Cash Flow Forecast
      </SectionTitle>

      {/* ── WHAT-IF SCENARIO SIMULATOR DRAWER ──────────────────────────────── */}
      {expandedSections.simulator && (
        <Card
          style={{
            padding: 20,
            background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.accent} 5%, var(--surface-0)), var(--surface-0))`,
            border: `1.5px solid color-mix(in srgb, ${THEME.accent} 30%, var(--t-line))`,
            borderRadius: 14,
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: `color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: THEME.accent,
                }}
              >
                <SlidersHorizontal size={17} />
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: THEME.ink, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>Interactive Scenario Simulator</span>
                  {isSimulationActive ? (
                    <Badge variant="gold">Simulation Active</Badge>
                  ) : (
                    <Badge variant="muted">Live Model</Badge>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 1 }}>
                  Test hypothetical income bumps, bonuses, large purchases, or SIP changes across the {forecastMonths}-month horizon.
                </div>
              </div>
            </div>

            {isSimulationActive && (
              <Button variant="secondary" size="sm" onClick={resetSimulation} icon={<RotateCcw size={14} />}>
                Reset Sandbox
              </Button>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              background: "var(--surface-0)",
              padding: 16,
              borderRadius: 12,
              border: `1px solid ${THEME.line}`,
            }}
          >
            {/* Control 1: Salary Hike / Adjustment */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                <span style={{ color: THEME.ink }}>Salary Hike / Change</span>
                <span style={{ color: simSalaryHikePct >= 0 ? THEME.sage : THEME.rust }}>
                  {simSalaryHikePct > 0 ? `+${simSalaryHikePct}%` : `${simSalaryHikePct}%`}
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="50"
                step="5"
                value={simSalaryHikePct}
                onChange={(e) => setSimSalaryHikePct(Number(e.target.value))}
                style={{ accentColor: THEME.accent, cursor: "pointer" }}
              />
              <span style={{ fontSize: 10.5, color: THEME.muted }}>
                Adjust recurring take-home salary by ±%
              </span>
            </div>

            {/* Control 2: Expected Bonus */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                <span style={{ color: THEME.ink }}>Expected Bonus / Inflow</span>
                <span style={{ color: THEME.sage }}>₹{simBonusAmount.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="number"
                  placeholder="Amount (₹)"
                  value={simBonusAmount || ""}
                  onChange={(e) => setSimBonusAmount(Math.max(0, Number(e.target.value)))}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-1)",
                    color: THEME.ink,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <select
                  value={simBonusMonth}
                  onChange={(e) => setSimBonusMonth(e.target.value)}
                  style={{
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-1)",
                    color: THEME.ink,
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  {months.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <span style={{ fontSize: 10.5, color: THEME.muted }}>One-time lump sum receipt</span>
            </div>

            {/* Control 3: Major Expense / Purchase */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                <span style={{ color: THEME.ink }}>Planned Major Expense</span>
                <span style={{ color: THEME.rust }}>₹{simExpenseAmount.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="number"
                  placeholder="Amount (₹)"
                  value={simExpenseAmount || ""}
                  onChange={(e) => setSimExpenseAmount(Math.max(0, Number(e.target.value)))}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-1)",
                    color: THEME.ink,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <select
                  value={simExpenseMonth}
                  onChange={(e) => setSimExpenseMonth(e.target.value)}
                  style={{
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-1)",
                    color: THEME.ink,
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  {months.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <span style={{ fontSize: 10.5, color: THEME.muted }}>e.g. Travel, Electronics, Renovation</span>
            </div>

            {/* Control 4: SIP Delta */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                <span style={{ color: THEME.ink }}>SIP Investment Delta</span>
                <span style={{ color: simSipDelta >= 0 ? THEME.sage : THEME.rust }}>
                  {simSipDelta > 0 ? `+₹${simSipDelta.toLocaleString("en-IN")}` : `₹${simSipDelta.toLocaleString("en-IN")}`}/mo
                </span>
              </div>
              <input
                type="range"
                min="-50000"
                max="100000"
                step="5000"
                value={simSipDelta}
                onChange={(e) => setSimSipDelta(Number(e.target.value))}
                style={{ accentColor: THEME.accent, cursor: "pointer" }}
              />
              <span style={{ fontSize: 10.5, color: THEME.muted }}>
                Increase (+) or pause/reduce (-) monthly SIPs
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* ── EXECUTIVE KPI HERO MATRIX (5-Card Command Center) ──────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 16,
        }}
      >
        {/* Card 1: Starting Liquid Cash */}
        <Card
          hover
          style={{
            padding: "16px 18px",
            border: "1px solid var(--t-line)",
            borderLeft: `3px solid ${THEME.gold}`,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Landmark size={20} style={{ color: THEME.gold }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Current Liquid Cash
                </div>
                <div style={{ fontSize: 10, color: THEME.muted }}>Bank Balances</div>
              </div>
            </div>
            <Badge variant="gold">Starting</Badge>
          </div>

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 700,
              color: THEME.ink,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Money value={animatedStartingCash} variant="full" />
          </div>

          <div style={{ fontSize: 11, color: THEME.muted, display: "flex", justifyContent: "space-between" }}>
            <span>Runway Buffer:</span>
            <strong style={{ color: liquidRunwayMonths >= 6 ? THEME.sage : liquidRunwayMonths >= 3 ? THEME.gold : THEME.rust }}>
              {liquidRunwayMonths.toFixed(1)} Months
            </strong>
          </div>
        </Card>

        {/* Card 2: Total Projected Inflow */}
        <Card
          hover
          style={{
            padding: "16px 18px",
            border: "1px solid var(--t-line)",
            borderLeft: `3px solid ${THEME.sage}`,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ArrowUpRight size={20} style={{ color: THEME.sage }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Projected Inflow
                </div>
                <div style={{ fontSize: 10, color: THEME.muted }}>Next {forecastMonths} Months</div>
              </div>
            </div>
            <Badge variant="sage">
              {Math.round(grandInflow > 0 ? (totalRegularInflow / grandInflow) * 100 : 100)}% Regular
            </Badge>
          </div>

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 700,
              color: THEME.ink,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Money value={animatedGrandInflow} variant="full" />
          </div>

          {/* Progress bar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ height: 5, borderRadius: 3, background: `color-mix(in srgb, ${THEME.sage} 15%, var(--t-line))`, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${(totalRegularInflow / Math.max(1, grandInflow)) * 100}%`, background: THEME.sage, height: "100%" }} />
              <div style={{ width: `${(eventInflow / Math.max(1, grandInflow)) * 100}%`, background: "var(--t-accent)", height: "100%" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
              <span>Monthly: <Money value={totalMonthlyInflow} variant="full" /></span>
              <span>Events: <Money value={eventInflow} variant="full" /></span>
            </div>
          </div>
        </Card>

        {/* Card 3: Total Projected Outflow */}
        <Card
          hover
          style={{
            padding: "16px 18px",
            border: "1px solid var(--t-line)",
            borderLeft: `3px solid ${THEME.rust}`,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ArrowDownRight size={20} style={{ color: THEME.rust }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Projected Outflow
                </div>
                <div style={{ fontSize: 10, color: THEME.muted }}>Next {forecastMonths} Months</div>
              </div>
            </div>
            <Badge variant="rust">
              {Math.round(grandOutflow > 0 ? (totalRegularOutflow / grandOutflow) * 100 : 100)}% Fixed
            </Badge>
          </div>

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 700,
              color: THEME.ink,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Money value={animatedGrandOutflow} variant="full" />
          </div>

          {/* Progress bar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ height: 5, borderRadius: 3, background: `color-mix(in srgb, ${THEME.rust} 15%, var(--t-line))`, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${(totalRegularOutflow / Math.max(1, grandOutflow)) * 100}%`, background: THEME.rust, height: "100%" }} />
              <div style={{ width: `${(eventOutflow / Math.max(1, grandOutflow)) * 100}%`, background: "var(--t-gold)", height: "100%" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
              <span>Monthly: <Money value={totalMonthlyOutflow} variant="full" /></span>
              <span>Events: <Money value={eventOutflow} variant="full" /></span>
            </div>
          </div>
        </Card>

        {/* Card 4: Net Cash Flow Surplus/Deficit */}
        <Card
          hover
          style={{
            padding: "16px 18px",
            border: "1px solid var(--t-line)",
            borderLeft: `3px solid ${netCashFlow >= 0 ? THEME.sage : THEME.rust}`,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {netCashFlow >= 0 ? <TrendingUp size={20} style={{ color: THEME.sage }} /> : <TrendingDown size={20} style={{ color: THEME.rust }} />}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Net Cash Delta
                </div>
                <div style={{ fontSize: 10, color: THEME.muted }}>Total Period Flow</div>
              </div>
            </div>
            <Badge variant={netCashFlow >= 0 ? "sage" : "rust"}>
              {netCashFlow >= 0 ? `+${retentionRate.toFixed(0)}% Saved` : "Deficit"}
            </Badge>
          </div>

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 700,
              color: netCashFlow >= 0 ? THEME.sage : THEME.rust,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {animatedNetCashFlow < 0 ? "-" : "+"}
            <Money value={Math.abs(animatedNetCashFlow)} variant="full" />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted }}>
            <span>Coverage Ratio:</span>
            <strong>{(grandInflow / Math.max(1, grandOutflow)).toFixed(2)}x</strong>
          </div>
        </Card>

        {/* Card 5: Projected Ending Liquid Balance */}
        <Card
          hover
          style={{
            padding: "16px 18px",
            border: "1px solid var(--t-line)",
            borderLeft: `3px solid ${projectedEndingBalance >= startingLiquidCash ? THEME.sage : THEME.accent}`,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 10,
            background: `color-mix(in srgb, var(--t-accent) 3%, var(--surface-0))`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Wallet size={20} style={{ color: THEME.accent }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Ending Bank Cash
                </div>
                <div style={{ fontSize: 10, color: THEME.muted }}>After {forecastMonths} Months</div>
              </div>
            </div>
            <Badge variant="accent">Projected</Badge>
          </div>

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 700,
              color: projectedEndingBalance >= 0 ? THEME.ink : THEME.rust,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Money value={animatedEndingBalance} variant="full" />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted }}>
            <span>Buffer Change:</span>
            <strong style={{ color: netCashFlow >= 0 ? THEME.sage : THEME.rust }}>
              {netCashFlow >= 0 ? "+" : ""}{((netCashFlow / Math.max(1, startingLiquidCash)) * 100).toFixed(1)}%
            </strong>
          </div>
        </Card>
      </div>

      {/* ── INTERACTIVE CHART & VISUALIZATION ──────────────────────────────── */}
      <Card style={{ padding: 24, borderRadius: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: `color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: THEME.accent,
              }}
            >
              <BarChart2 size={17} />
            </div>
            <div>
              <span style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                {chartViewMode === "flow"
                  ? "Monthly Inflow vs Outflow & Cumulative Flow"
                  : chartViewMode === "balance"
                    ? "Liquid Bank Balance Trajectory"
                    : "Monthly Net Cash Delta"}
              </span>
              <div style={{ fontSize: 11, color: THEME.muted }}>
                Projected trajectory over the next {forecastMonths} months ({months[0]?.label} - {months[months.length - 1]?.label})
              </div>
            </div>
          </div>

          {/* Chart Mode Switcher */}
          <div
            style={{
              display: "flex",
              background: "var(--surface-1)",
              padding: "3px",
              borderRadius: "var(--radius-md)",
              border: `1.5px solid ${THEME.line}`,
              gap: "2px",
            }}
          >
            <button
              onClick={() => setChartViewMode("flow")}
              className={`cf-segbtn ${chartViewMode === "flow" ? "active" : ""}`}
              style={{
                padding: "5px 12px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: chartViewMode === "flow" ? "var(--surface-0)" : "transparent",
                fontWeight: 700,
                fontSize: "11.5px",
                cursor: "pointer",
              }}
            >
              Flow & Cumulative
            </button>
            <button
              onClick={() => setChartViewMode("balance")}
              className={`cf-segbtn ${chartViewMode === "balance" ? "active" : ""}`}
              style={{
                padding: "5px 12px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: chartViewMode === "balance" ? "var(--surface-0)" : "transparent",
                fontWeight: 700,
                fontSize: "11.5px",
                cursor: "pointer",
              }}
            >
              Bank Balance Curve
            </button>
            <button
              onClick={() => setChartViewMode("delta")}
              className={`cf-segbtn ${chartViewMode === "delta" ? "active" : ""}`}
              style={{
                padding: "5px 12px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: chartViewMode === "delta" ? "var(--surface-0)" : "transparent",
                fontWeight: 700,
                fontSize: "11.5px",
                cursor: "pointer",
              }}
            >
              Net Delta
            </button>
          </div>
        </div>

        <div style={{ width: "100%", height: 320, position: "relative" }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            {chartViewMode === "flow" ? (
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                barGap={4}
                barCategoryGap="22%"
              >
                <defs>
                  <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={THEME.sage} stopOpacity={isDark ? 1 : 0.9} />
                    <stop offset="100%" stopColor={THEME.sage} stopOpacity={isDark ? 0.45 : 0.15} />
                  </linearGradient>
                  <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={THEME.rust} stopOpacity={isDark ? 1 : 0.9} />
                    <stop offset="100%" stopColor={THEME.rust} stopOpacity={isDark ? 0.45 : 0.15} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} opacity={0.3} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11.5, fontWeight: 600, fill: THEME.muted }}
                  axisLine={{ stroke: THEME.line }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: THEME.muted }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINRFull(v))}
                  width={72}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: THEME.line, opacity: 0.3 }} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingBottom: 10 }}
                />
                <Bar
                  dataKey="Inflow"
                  name="Projected Inflow"
                  fill="url(#inflowGrad)"
                  stroke={THEME.sage}
                  strokeWidth={1}
                  radius={[5, 5, 0, 0]}
                  maxBarSize={38}
                />
                <Bar
                  dataKey="Outflow"
                  name="Projected Outflow"
                  fill="url(#outflowGrad)"
                  stroke={THEME.rust}
                  strokeWidth={1}
                  radius={[5, 5, 0, 0]}
                  maxBarSize={38}
                />
                <Line
                  type="monotone"
                  dataKey="Cumulative"
                  stroke={THEME.accent}
                  strokeWidth={3}
                  dot={{ fill: THEME.accent, stroke: "var(--surface-0)", strokeWidth: 2, r: 4 }}
                  activeDot={{ fill: THEME.accent, stroke: "var(--surface-0)", strokeWidth: 2, r: 6 }}
                  name="Cumulative Surplus"
                />
              </ComposedChart>
            ) : chartViewMode === "balance" ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={THEME.accent} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={THEME.accent} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} opacity={0.3} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11.5, fontWeight: 600, fill: THEME.muted }}
                  axisLine={{ stroke: THEME.line }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: THEME.muted }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINRFull(v))}
                  width={72}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={startingLiquidCash}
                  stroke={THEME.gold}
                  strokeDasharray="3 3"
                  label={{ value: "Starting Cash", fill: THEME.gold, fontSize: 10.5, position: "insideTopRight" }}
                />
                <Area
                  type="monotone"
                  dataKey="EndingBalance"
                  stroke={THEME.accent}
                  strokeWidth={3}
                  fill="url(#balanceGrad)"
                  name="Projected Bank Balance"
                />
              </AreaChart>
            ) : (
              <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} opacity={0.3} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11.5, fontWeight: 600, fill: THEME.muted }}
                  axisLine={{ stroke: THEME.line }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: THEME.muted }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINRFull(v))}
                  width={72}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke={THEME.line} strokeWidth={1.5} />
                <Bar
                  dataKey="NetDelta"
                  name="Net Cash Delta"
                  fill={THEME.sage}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── MONTH-BY-MONTH FINANCIAL MATRIX ───────────────────────────────── */}
      <Card style={{ padding: 0, overflow: "hidden", borderRadius: 14 }}>
        <div
          onClick={() => toggleSection("matrix")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleSection("matrix");
            }
          }}
          aria-expanded={expandedSections.matrix}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            cursor: "pointer",
            borderBottom: expandedSections.matrix ? `1px solid ${THEME.line}` : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar size={17} style={{ color: THEME.accent }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>
              Month-by-Month Cash Flow Matrix
            </span>
            <Badge variant="muted">{months.length} Months</Badge>
          </div>
          {expandedSections.matrix ? (
            <ChevronDown size={17} style={{ color: THEME.muted }} />
          ) : (
            <ChevronRight size={17} style={{ color: THEME.muted }} />
          )}
        </div>

        {expandedSections.matrix && (
          <div style={{ padding: 18 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`,
                gap: 12,
              }}
            >
              {monthMatrix.map((m) => {
                const isPositive = m.netDelta >= 0;
                return (
                  <div
                    key={m.key}
                    className="cf-matrix-card"
                    onClick={() => setSelectedMonthKey(m.key)}
                    style={{
                      background: "var(--surface-0)",
                      border: `1.5px solid ${THEME.line}`,
                      borderRadius: 12,
                      padding: "14px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: THEME.ink }}>
                        {m.label}
                      </span>
                      <Badge variant={isPositive ? "sage" : "rust"}>
                        {isPositive ? "Surplus" : "Deficit"}
                      </Badge>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: THEME.muted }}>
                        <span>Inflow:</span>
                        <strong style={{ color: THEME.sage }}>+<Money value={m.totalInflow} variant="exact" /></strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: THEME.muted }}>
                        <span>Outflow:</span>
                        <strong style={{ color: THEME.rust }}>-<Money value={m.totalOutflow} variant="exact" /></strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          paddingTop: 4,
                          borderTop: `1px solid ${THEME.line}`,
                          fontWeight: 700,
                        }}
                      >
                        <span style={{ color: THEME.ink }}>Net Flow:</span>
                        <span style={{ color: isPositive ? THEME.sage : THEME.rust }}>
                          {isPositive ? "+" : ""}<Money value={m.netDelta} variant="exact" />
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: THEME.muted, fontSize: 11 }}>
                        <span>Ending Cash:</span>
                        <strong style={{ color: THEME.accent }}><Money value={m.endingBalance} variant="exact" /></strong>
                      </div>
                    </div>

                    {m.eventsCount > 0 && (
                      <div
                        style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: THEME.accent,
                          background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                          padding: "3px 8px",
                          borderRadius: 6,
                          textAlign: "center",
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <Zap size={10} /> {m.eventsCount} one-time event{m.eventsCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* ── INFLOWS & OUTFLOWS COMMAND CENTER ──────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(380px, 100%), 1fr))",
          gap: 20,
        }}
      >
        {/* ── REGULAR INFLOWS ── */}
        <Card style={{ padding: 0, overflow: "hidden", borderRadius: 14 }}>
          <div
            onClick={() => toggleSection("inflows")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleSection("inflows");
              }
            }}
            aria-expanded={expandedSections.inflows}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              cursor: "pointer",
              borderBottom: expandedSections.inflows ? `1px solid ${THEME.line}` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ArrowUpRight size={17} style={{ color: THEME.sage }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                Regular Inflows
              </span>
              <Badge variant="sage">{inflows.length}</Badge>
            </div>
            {expandedSections.inflows ? (
              <ChevronDown size={17} style={{ color: THEME.muted }} />
            ) : (
              <ChevronRight size={17} style={{ color: THEME.muted }} />
            )}
          </div>

          {expandedSections.inflows && (
            <div style={{ padding: "8px 0" }}>
              {inflows.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                  No regular inflows match filters
                </div>
              ) : (
                <div>
                  {/* Table Header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1fr 1fr",
                      alignItems: "center",
                      padding: "10px 20px",
                      borderBottom: `1px solid ${THEME.line}`,
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <div>Source</div>
                    <div style={{ textAlign: "right", paddingRight: 8 }}>Monthly</div>
                    <div style={{ textAlign: "right" }}>{forecastMonths}-Mo Total</div>
                  </div>

                  {inflows.map((item, idx) => {
                    const Icon = item.icon;
                    const pctOfTotal =
                      totalMonthlyInflow > 0 ? (item.monthly / totalMonthlyInflow) * 100 : 0;
                    const isSalaryItem = item.category === "Salary";

                    return (
                      <div
                        key={idx}
                        className="cf-list-row"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.5fr 1fr 1fr",
                          alignItems: "center",
                          padding: "12px 20px",
                          borderBottom:
                            idx < inflows.length - 1 ? `1px solid ${THEME.line}` : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: THEME.sage,
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={16} />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                                {item.name}
                              </span>
                              {isSalaryItem && (
                                <button
                                  type="button"
                                  onClick={() => setSalaryModalOpen(true)}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "2px 8px",
                                    borderRadius: 12,
                                    background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                                    color: THEME.sage,
                                    border: `1px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
                                    cursor: "pointer",
                                  }}
                                  title="Configure salary source"
                                >
                                  <Sliders size={10} />
                                  <span>Adjust Source</span>
                                </button>
                              )}
                            </div>
                            <span style={{ fontSize: 10.5, color: THEME.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.sourceLabel ? `${item.sourceLabel} • ` : ""}{item.category} • {pctOfTotal.toFixed(0)}% of total
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: "right", paddingRight: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.sage, fontVariantNumeric: "tabular-nums" }}>
                            <Money value={item.monthly} variant="exact" />
                          </span>
                          <span style={{ display: "block", fontSize: 10, color: THEME.muted }}>
                            /mo
                          </span>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>
                            <Money value={item.monthly * forecastMonths} variant="exact" />
                          </span>
                          <span style={{ display: "block", fontSize: 10, color: THEME.muted }}>
                            {forecastMonths}-mo Total
                          </span>
                        </div>

                        {/* Quick switch banner if Bank is active with low amount but Salary Slips exist */}
                        {isSalaryItem &&
                          salaryCandidates.slip.monthly > 0 &&
                          effectiveSalaryInfo.source === "bank" &&
                          effectiveSalaryInfo.amount < salaryCandidates.slip.monthly && (
                            <div
                              onClick={() => setSalaryModalOpen(true)}
                              style={{
                                gridColumn: "1 / -1",
                                marginTop: 8,
                                padding: "7px 12px",
                                borderRadius: 8,
                                background: `color-mix(in srgb, ${THEME.gold || "#f59e0b"} 10%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${THEME.gold || "#f59e0b"} 25%, transparent)`,
                                fontSize: 11,
                                color: THEME.ink,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                cursor: "pointer",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <Info size={13} style={{ color: THEME.gold || "#f59e0b", flexShrink: 0 }} />
                                <span>
                                  Bank reflects <strong>₹{Math.round(effectiveSalaryInfo.amount).toLocaleString("en-IN")}</strong>/mo. Salary Slips reflect <strong>₹{Math.round(salaryCandidates.slip.monthly).toLocaleString("en-IN")}</strong>/mo.
                                </span>
                              </div>
                              <span style={{ color: THEME.accent, fontWeight: 700, fontSize: 11, textDecoration: "underline" }}>
                                Switch to Salary Slips
                              </span>
                            </div>
                          )}
                      </div>
                    );
                  })}

                  {/* Total Row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1fr 1fr",
                      alignItems: "center",
                      padding: "14px 20px",
                      borderTop: `2px solid ${THEME.line}`,
                      background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                        Total Regular Inflow
                      </span>
                    </div>
                    <div style={{ textAlign: "right", paddingRight: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: THEME.sage, fontVariantNumeric: "tabular-nums" }}>
                        <Money value={totalMonthlyInflow} variant="exact" />
                      </span>
                      <span style={{ display: "block", fontSize: 10, color: THEME.sage, fontWeight: 600 }}>
                        /mo
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: THEME.sage, fontVariantNumeric: "tabular-nums" }}>
                        <Money value={totalRegularInflow} variant="exact" />
                      </span>
                      <span style={{ display: "block", fontSize: 10, color: THEME.sage, fontWeight: 600 }}>
                        {forecastMonths}-mo Total
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ── REGULAR OUTFLOWS ── */}
        <Card style={{ padding: 0, overflow: "hidden", borderRadius: 14 }}>
          <div
            onClick={() => toggleSection("outflows")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleSection("outflows");
              }
            }}
            aria-expanded={expandedSections.outflows}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              cursor: "pointer",
              borderBottom: expandedSections.outflows ? `1px solid ${THEME.line}` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ArrowDownRight size={17} style={{ color: THEME.rust }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                Regular Outflows
              </span>
              <Badge variant="rust">{outflows.length}</Badge>
            </div>
            {expandedSections.outflows ? (
              <ChevronDown size={17} style={{ color: THEME.muted }} />
            ) : (
              <ChevronRight size={17} style={{ color: THEME.muted }} />
            )}
          </div>

          {expandedSections.outflows && (
            <div style={{ padding: "8px 0" }}>
              {outflows.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                  No regular outflows match filters
                </div>
              ) : (
                <div>
                  {/* Table Header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1fr 1fr",
                      alignItems: "center",
                      padding: "10px 20px",
                      borderBottom: `1px solid ${THEME.line}`,
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <div>Source</div>
                    <div style={{ textAlign: "right", paddingRight: 8 }}>Monthly</div>
                    <div style={{ textAlign: "right" }}>{forecastMonths}-Mo Total</div>
                  </div>

                  {outflows.map((item, idx) => {
                    const Icon = item.icon;
                    const pctOfTotal =
                      totalMonthlyOutflow > 0 ? (item.monthly / totalMonthlyOutflow) * 100 : 0;

                    return (
                      <div
                        key={idx}
                        className="cf-list-row"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.5fr 1fr 1fr",
                          alignItems: "center",
                          padding: "12px 20px",
                          borderBottom:
                            idx < outflows.length - 1 ? `1px solid ${THEME.line}` : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background: `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: THEME.rust,
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={16} />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                              {item.name}
                            </span>
                            <span style={{ fontSize: 10.5, color: THEME.muted }}>
                              {item.category} • {pctOfTotal.toFixed(0)}% of total
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: "right", paddingRight: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                            <Money value={item.monthly} variant="exact" />
                          </span>
                          <span style={{ display: "block", fontSize: 10, color: THEME.muted }}>
                            /mo
                          </span>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>
                            <Money value={item.monthly * forecastMonths} variant="exact" />
                          </span>
                          <span style={{ display: "block", fontSize: 10, color: THEME.muted }}>
                            {forecastMonths}-mo Total
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Total Row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1fr 1fr",
                      alignItems: "center",
                      padding: "14px 20px",
                      borderTop: `2px solid ${THEME.line}`,
                      background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                        Total Regular Outflow
                      </span>
                    </div>
                    <div style={{ textAlign: "right", paddingRight: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                        <Money value={totalMonthlyOutflow} variant="exact" />
                      </span>
                      <span style={{ display: "block", fontSize: 10, color: THEME.rust, fontWeight: 600 }}>
                        /mo
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                        <Money value={totalRegularOutflow} variant="exact" />
                      </span>
                      <span style={{ display: "block", fontSize: 10, color: THEME.rust, fontWeight: 600 }}>
                        {forecastMonths}-mo Total
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── UPCOMING EVENTS TIMELINE ───────────────────────────────────────── */}
      <Card style={{ padding: 0, overflow: "hidden", borderRadius: 14 }}>
        <div
          onClick={() => toggleSection("events")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleSection("events");
            }
          }}
          aria-expanded={expandedSections.events}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            cursor: "pointer",
            borderBottom: expandedSections.events ? `1px solid ${THEME.line}` : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarClock size={17} style={{ color: THEME.accent }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>
              Upcoming One-Time Capital Events & Maturities
            </span>
            <Badge variant="accent">{events.length}</Badge>
          </div>
          {expandedSections.events ? (
            <ChevronDown size={17} style={{ color: THEME.muted }} />
          ) : (
            <ChevronRight size={17} style={{ color: THEME.muted }} />
          )}
        </div>

        {expandedSections.events && (
          <div>
            {events.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                No one-time events scheduled in the next {forecastMonths} months.
              </div>
            ) : (
              <div style={{ padding: "16px 20px", position: "relative" }}>
                {/* Vertical Timeline Thread */}
                <div
                  style={{
                    position: "absolute",
                    top: "32px",
                    bottom: "32px",
                    left: "35px",
                    width: "2px",
                    background: `linear-gradient(to bottom, var(--t-line) 0%, var(--t-line) 80%, transparent 100%)`,
                    zIndex: 0,
                  }}
                />

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {events.map((event, idx) => {
                    const isInflow = event.type === "inflow";

                    // Calculate countdown
                    let relativeLabel = "";
                    if (event.date) {
                      try {
                        const todayTime = new Date().setHours(0, 0, 0, 0);
                        const eventTime = new Date(event.date + "T00:00:00").getTime();
                        const diffTime = eventTime - todayTime;
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays === 0) {
                          relativeLabel = "Today";
                        } else if (diffDays === 1) {
                          relativeLabel = "Tomorrow";
                        } else if (diffDays > 1) {
                          if (diffDays > 30) {
                            const diffMonths = Math.round(diffDays / 30.4);
                            relativeLabel = `In ${diffMonths} month${diffMonths > 1 ? "s" : ""}`;
                          } else {
                            relativeLabel = `In ${diffDays} days`;
                          }
                        } else {
                          const absDays = Math.abs(diffDays);
                          relativeLabel = `${absDays}d ago`;
                        }
                      } catch (e) {
                        // ignore
                      }
                    }

                    return (
                      <div
                        key={idx}
                        className="cf-event-row"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          padding: "10px 0",
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        {/* Timeline Dot container */}
                        <div
                          style={{
                            width: 32,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          <div
                            className="cf-event-dot"
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              background: isInflow ? THEME.sage : THEME.rust,
                              border: `2.5px solid var(--surface-0)`,
                              boxShadow: `0 0 0 4px color-mix(in srgb, ${isInflow ? THEME.sage : THEME.rust} 20%, transparent)`,
                              zIndex: 3,
                            }}
                          />
                        </div>

                        {/* Content block */}
                        <div
                          className="cf-event-content"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            flex: 1,
                          }}
                        >
                          {/* Date & Countdown */}
                          <div
                            style={{
                              minWidth: 110,
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                          >
                            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                              {fmtDate(event.date)}
                            </span>
                            {relativeLabel && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color:
                                    relativeLabel === "Today" || relativeLabel === "Tomorrow"
                                      ? isInflow
                                        ? THEME.sage
                                        : THEME.rust
                                      : THEME.muted,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                {relativeLabel}
                              </span>
                            )}
                          </div>

                          {/* Name & Badge */}
                          <div
                            style={{
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                              {event.name}
                            </span>
                            <Badge
                              variant={isInflow ? "sage" : "rust"}
                              style={{ fontSize: "10px", padding: "2px 6px" }}
                            >
                              {event.category}
                            </Badge>
                            {event.isSimulated && (
                              <Badge variant="gold" style={{ fontSize: "10px", padding: "2px 6px" }}>
                                Simulated
                              </Badge>
                            )}
                          </div>

                          {/* Amount */}
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color: isInflow ? THEME.sage : THEME.rust,
                              minWidth: 120,
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {isInflow ? "+" : "-"}
                            <Money value={event.amount} variant="exact" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── MONTH INSPECTOR MODAL ──────────────────────────────────────────── */}
      {selectedMonthData && (
        <Modal
          title={`${selectedMonthData.label} Detailed Financial Breakdown`}
          onClose={() => setSelectedMonthKey(null)}
          maxWidth={600}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Quick Metrics Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                background: "var(--surface-1)",
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${THEME.line}`,
              }}
            >
              <div>
                <span style={{ fontSize: 10.5, color: THEME.muted, textTransform: "uppercase", fontWeight: 700 }}>
                  Starting Cash
                </span>
                <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, marginTop: 2 }}>
                  <Money value={selectedMonthData.startingBalance} variant="exact" />
                </div>
              </div>
              <div>
                <span style={{ fontSize: 10.5, color: THEME.muted, textTransform: "uppercase", fontWeight: 700 }}>
                  Net Month Flow
                </span>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: selectedMonthData.netDelta >= 0 ? THEME.sage : THEME.rust,
                    marginTop: 2,
                  }}
                >
                  {selectedMonthData.netDelta >= 0 ? "+" : ""}<Money value={selectedMonthData.netDelta} variant="exact" />
                </div>
              </div>
              <div>
                <span style={{ fontSize: 10.5, color: THEME.muted, textTransform: "uppercase", fontWeight: 700 }}>
                  Closing Cash
                </span>
                <div style={{ fontSize: 15, fontWeight: 800, color: THEME.accent, marginTop: 2 }}>
                  <Money value={selectedMonthData.endingBalance} variant="exact" />
                </div>
              </div>
            </div>

            {/* Income & Expense Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                Cash Flow Summary for {selectedMonthData.label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "var(--surface-0)", borderRadius: 6 }}>
                  <span>Recurring Inflows (Salary, Rent, Divs, Interest)</span>
                  <strong style={{ color: THEME.sage }}>+<Money value={selectedMonthData.regularInflow} variant="exact" /></strong>
                </div>
                {selectedMonthData.eventInflow > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "var(--surface-0)", borderRadius: 6 }}>
                    <span>One-Time Inflows (Maturities / Repayments)</span>
                    <strong style={{ color: THEME.sage }}>+<Money value={selectedMonthData.eventInflow} variant="exact" /></strong>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "var(--surface-0)", borderRadius: 6 }}>
                  <span>Recurring Outflows (EMIs, SIPs, Rent, Subs, Budget)</span>
                  <strong style={{ color: THEME.rust }}>-<Money value={selectedMonthData.regularOutflow} variant="exact" /></strong>
                </div>
                {selectedMonthData.eventOutflow > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "var(--surface-0)", borderRadius: 6 }}>
                    <span>One-Time Outflows (Insurance, Closures)</span>
                    <strong style={{ color: THEME.rust }}>-<Money value={selectedMonthData.eventOutflow} variant="exact" /></strong>
                  </div>
                )}
              </div>
            </div>

            {/* Specific Events in this month */}
            {selectedMonthData.events.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.ink }}>
                  One-Time Events Occurring in {selectedMonthData.label}
                </div>
                {selectedMonthData.events.map((ev: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "var(--surface-1)",
                      borderRadius: 8,
                      border: `1px solid ${THEME.line}`,
                      fontSize: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: THEME.ink }}>{ev.name}</div>
                      <div style={{ fontSize: 10.5, color: THEME.muted }}>{fmtDate(ev.date)} • {ev.category}</div>
                    </div>
                    <strong style={{ color: ev.type === "inflow" ? THEME.sage : THEME.rust }}>
                      {ev.type === "inflow" ? "+" : "-"}<Money value={ev.amount} variant="exact" />
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Salary Sourcing & Breakdown Modal */}
      <SalarySourcingModal
        isOpen={salaryModalOpen}
        onClose={() => setSalaryModalOpen(false)}
        salaryCandidates={salaryCandidates}
        effectiveSalaryInfo={effectiveSalaryInfo}
        salaryPref={salaryPref}
        onSavePref={handleSaveSalaryPref}
        onNavigateToTab={onNavigateToTab}
      />
    </div>
  );
};
