// @ts-nocheck
import { useState, useMemo } from "react";
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

/** Returns an array of { year, month, label } for the next N months starting from today. */
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

/** Find which month index a date falls into. Returns -1 if not in range. */
function getMonthIndex(dateStr: string, months: { key: string }[]): number {
  if (!dateStr) return -1;
  const ym = dateStr.slice(0, 7);
  return months.findIndex((m) => m.key === ym);
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

// ── Component ────────────────────────────────────────────────────────────────

// ── Custom Tooltip for Chart ──────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--surface-0) 90%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1.5px solid var(--t-line)`,
        borderRadius: "12px",
        padding: "14px 16px",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minWidth: "220px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 700,
          color: "var(--t-muted)",
          borderBottom: `1px solid var(--t-line)`,
          paddingBottom: "6px",
        }}
      >
        {label} Projection
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {payload.map((entry: any, index: number) => {
          const color =
            entry.dataKey === "Inflow"
              ? "var(--t-sage)"
              : entry.dataKey === "Outflow"
                ? "var(--t-rust)"
                : "var(--t-accent)";
          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: color,
                    display: "inline-block",
                  }}
                />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--t-ink)" }}>
                  {entry.name}
                </span>
              </div>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: entry.dataKey === "Cumulative" ? "var(--t-accent)" : "var(--t-ink)",
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
      maxWidth={620}
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
        {/* Accounting rule banner */}
        <div
          style={{
            background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 12,
            lineHeight: 1.5,
            color: THEME.ink,
            display: "flex",
            gap: 10,
          }}
        >
          <Info size={18} style={{ color: THEME.accent, flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Senior Accountant Note:</strong> The cash flow forecast projects your recurring <em>net take-home salary</em> (in-hand pay after statutory deductions).
            By default, we evaluate <strong>Bank statement salary credits first</strong>, then <strong>official Salary Slips</strong>, and finally the <strong>Income Ledger</strong>. You can review detected amounts or pick any source below.
          </div>
        </div>

        {/* Current Active Source Indicator */}
        <div
          style={{
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            borderRadius: 10,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
              Active Forecast Value
            </span>
            <div style={{ fontSize: 18, fontWeight: 800, color: THEME.sage, marginTop: 2 }}>
              ₹{Math.round(effectiveSalaryInfo.amount).toLocaleString("en-IN")}{" "}
              <span style={{ fontSize: 12, fontWeight: 500, color: THEME.muted }}>/ month</span>
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
              Source: <strong>{effectiveSalaryInfo.label}</strong>
              {effectiveSalaryInfo.isOverridden && (
                <span style={{ marginLeft: 6, color: THEME.gold, fontWeight: 600 }}>• User Override</span>
              )}
            </div>
          </div>
          {effectiveSalaryInfo.isOverridden && (
            <Badge variant="gold">Custom Config</Badge>
          )}
        </div>

        {/* Option 1: Auto */}
        <div
          onClick={() => setSource("auto")}
          style={{
            border: `1.5px solid ${source === "auto" ? THEME.accent : THEME.line}`,
            background: source === "auto" ? `color-mix(in srgb, ${THEME.accent} 5%, transparent)` : "var(--surface-0)",
            borderRadius: 10,
            padding: "14px 16px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="radio"
                name="salarySource"
                checked={source === "auto"}
                onChange={() => setSource("auto")}
                style={{ cursor: "pointer", accentColor: THEME.accent }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                  Auto-Detect (Bank First, then Salary Slips)
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                  Evaluates recent bank credit transactions first; falls back to verified salary slips.
                </div>
              </div>
            </div>
            <Badge variant="neutral">Default</Badge>
          </div>
        </div>

        {/* Option 2: Bank Statement Credits (Priority 1) */}
        <div
          onClick={() => setSource("bank")}
          style={{
            border: `1.5px solid ${source === "bank" ? THEME.accent : THEME.line}`,
            background: source === "bank" ? `color-mix(in srgb, ${THEME.accent} 5%, transparent)` : "var(--surface-0)",
            borderRadius: 10,
            padding: "14px 16px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <input
                type="radio"
                name="salarySource"
                checked={source === "bank"}
                onChange={() => setSource("bank")}
                style={{ cursor: "pointer", accentColor: THEME.accent, marginTop: 3 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                  Bank Statement Credits (Priority 1)
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
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
                          fontSize: 10.5,
                          color: THEME.ink,
                          background: "var(--surface-1)",
                          padding: "4px 8px",
                          borderRadius: 4,
                          display: "flex",
                          justifyContent: "space-between",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <span style={{ color: THEME.muted }}>{t.date || "Date N/A"} • {t.description || t.category || "Salary"}</span>
                        <strong>₹{Number(t.amount || 0).toLocaleString("en-IN")}</strong>
                      </div>
                    ))}
                    {bank.txns.length > 3 && (
                      <span style={{ fontSize: 10, color: THEME.muted }}>+ {bank.txns.length - 3} more transactions</span>
                    )}
                  </div>
                )}
                {bank.monthly > 0 && slip.monthly > 0 && bank.monthly < slip.monthly * 0.5 && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, color: THEME.gold || "#f59e0b", fontSize: 11 }}>
                    <AlertCircle size={13} />
                    <span>Bank credit (₹{Math.round(bank.monthly).toLocaleString("en-IN")}) is substantially lower than Salary Slips (₹{Math.round(slip.monthly).toLocaleString("en-IN")}). May be an allowance or partial payment.</span>
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: bank.monthly > 0 ? THEME.sage : THEME.muted }}>
                ₹{Math.round(bank.monthly).toLocaleString("en-IN")}
              </div>
              <span style={{ fontSize: 10, color: THEME.muted }}>/mo avg</span>
            </div>
          </div>
        </div>

        {/* Option 3: Official Salary Slips (Priority 2) */}
        <div
          onClick={() => setSource("slip")}
          style={{
            border: `1.5px solid ${source === "slip" ? THEME.accent : THEME.line}`,
            background: source === "slip" ? `color-mix(in srgb, ${THEME.accent} 5%, transparent)` : "var(--surface-0)",
            borderRadius: 10,
            padding: "14px 16px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <input
                type="radio"
                name="salarySource"
                checked={source === "slip"}
                onChange={() => setSource("slip")}
                style={{ cursor: "pointer", accentColor: THEME.accent, marginTop: 3 }}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                    Official Salary Slips (Priority 2)
                  </span>
                  <Badge variant="sage">Audited Net Pay</Badge>
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
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
                          fontSize: 11,
                          color: THEME.ink,
                          background: "var(--surface-1)",
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: `1px solid ${THEME.line}`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                          <span>{s.employer || "Employer"} ({s.slipMonth || "Month N/A"})</span>
                          <span style={{ color: THEME.sage }}>Net: ₹{Number(s.netSalary || 0).toLocaleString("en-IN")}</span>
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                          Gross: ₹{Number(s.grossSalary || 0).toLocaleString("en-IN")} • Deductions (PF/TDS): ₹{Number(s.totalDeductions || 0).toLocaleString("en-IN")}
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
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: 0,
                      }}
                    >
                      <FileText size={12} />
                      <span>Manage slips in Salary Slip Tracker →</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: slip.monthly > 0 ? THEME.sage : THEME.muted }}>
                ₹{Math.round(slip.monthly).toLocaleString("en-IN")}
              </div>
              <span style={{ fontSize: 10, color: THEME.muted }}>/mo net</span>
            </div>
          </div>
        </div>

        {/* Option 4: Income Ledger */}
        <div
          onClick={() => setSource("ledger")}
          style={{
            border: `1.5px solid ${source === "ledger" ? THEME.accent : THEME.line}`,
            background: source === "ledger" ? `color-mix(in srgb, ${THEME.accent} 5%, transparent)` : "var(--surface-0)",
            borderRadius: 10,
            padding: "14px 16px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <input
                type="radio"
                name="salarySource"
                checked={source === "ledger"}
                onChange={() => setSource("ledger")}
                style={{ cursor: "pointer", accentColor: THEME.accent, marginTop: 3 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                  Income Ledger Entries (Priority 3)
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                  {ledger.entries.length > 0
                    ? `${ledger.entries.length} manual entry(ies) in income ledger`
                    : "No manual salary entries logged in income ledger"}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: ledger.monthly > 0 ? THEME.sage : THEME.muted }}>
                ₹{Math.round(ledger.monthly).toLocaleString("en-IN")}
              </div>
              <span style={{ fontSize: 10, color: THEME.muted }}>/mo avg</span>
            </div>
          </div>
        </div>

        {/* Option 5: Custom Amount */}
        <div
          onClick={() => setSource("custom")}
          style={{
            border: `1.5px solid ${source === "custom" ? THEME.accent : THEME.line}`,
            background: source === "custom" ? `color-mix(in srgb, ${THEME.accent} 5%, transparent)` : "var(--surface-0)",
            borderRadius: 10,
            padding: "14px 16px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="radio"
              name="salarySource"
              checked={source === "custom"}
              onChange={() => setSource("custom")}
              style={{ cursor: "pointer", accentColor: THEME.accent }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                Custom Monthly Take-Home Pay
              </div>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                Enter your exact expected recurring monthly net salary for this forecast.
              </div>
              {source === "custom" && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>₹</span>
                  <input
                    type="number"
                    value={customVal}
                    onChange={(e) => setCustomVal(e.target.value)}
                    placeholder="e.g. 161210"
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: `1px solid ${THEME.line}`,
                      background: "var(--surface-0)",
                      color: THEME.ink,
                      fontSize: 14,
                      fontWeight: 700,
                      width: 180,
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
  const isDark = state.settings?.darkMode ?? false;
  const [forecastMonths, setForecastMonths] = useState<3 | 6>(6);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    inflows: true,
    outflows: true,
    events: true,
  });
  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const months = useMemo(() => getFutureMonths(forecastMonths), [forecastMonths]);

  // User salary sourcing preference: "auto" | "bank" | "slip" | "ledger" | "custom"
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

  // ── SALARY CANDIDATE EVALUATION ───────────────────────────────────────────
  // Evaluates all available candidates:
  // 1. Bank transactions (Priority 1: checked first)
  // 2. Official Salary Slips (Priority 2: verified net pay)
  // 3. Income Ledger (Priority 3: manual entries)
  const salaryCandidates = useMemo(() => {
    // 1. Bank Credit Transactions (Priority 1 per accounting rule)
    const employerNames = (state.salarySlips || [])
      .map((s: any) => (s.employer || "").toLowerCase().trim())
      .filter((e: string) => e.length > 2);

    const salaryTxns = (state.transactions || []).filter((t: any) => {
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
    (state.salarySlips || []).forEach((sl: any) => {
      const ownerKey = sl.owner || "self";
      const current = ownerLatestSlip.get(ownerKey);
      if (!current || (sl.slipMonth || "").localeCompare(current.slipMonth || "") > 0) {
        ownerLatestSlip.set(ownerKey, sl);
      }
    });
    const slipDetails = Array.from(ownerLatestSlip.values());
    const slipMonthly = slipDetails.reduce((sum, sl) => sum + Number(sl.netSalary || 0), 0);

    // 3. Manual Income Ledger Entries (Priority 3)
    const salaryEntries = (state.income || []).filter(
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
  }, [state.transactions, state.salarySlips, state.income]);

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
      // "auto": Rule: first check from bank, then from salary slip, then income ledger
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

  // ── INCOME SOURCES ─────────────────────────────────────────────────────────

  const inflows = useMemo(() => {
    const sources: {
      name: string;
      monthly: number;
      icon: any;
      category: string;
      sourceLabel?: string;
      sourceType?: string;
      isOverridden?: boolean;
    }[] = [];

    // 1. Primary / Salary Income:
    if (effectiveSalaryInfo.amount > 0) {
      sources.push({
        name: "Salary",
        monthly: effectiveSalaryInfo.amount,
        icon: Wallet,
        category: "Salary",
        sourceLabel: effectiveSalaryInfo.label,
        sourceType: effectiveSalaryInfo.source,
        isOverridden: effectiveSalaryInfo.isOverridden,
      });
    }

    // 2. Rental Income (Active Landlord Properties)
    const rentalTotal = (state.rentalProperties || []).reduce(
      (sum: number, p: any) => sum + getEffectiveRent(p),
      0
    );
    if (rentalTotal > 0)
      sources.push({ name: "Rental Income", monthly: rentalTotal, icon: Home, category: "Rental" });

    // 3. Dividend Income
    const dividends = state.dividends || [];
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
    const fdInterest = (state.fixedDeposits || []).reduce((sum: number, fd: any) => {
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
    const rdInterest = (state.recurringDeposits || []).reduce((sum: number, rd: any) => {
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
    const ppfInterest = (state.ppf || []).reduce((sum: number, p: any) => {
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
    const nonSalaryIncome = (state.income || []).filter(
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
    state.salarySlips,
    state.income,
    state.transactions,
    state.rentalProperties,
    state.dividends,
    state.fixedDeposits,
    state.recurringDeposits,
    state.ppf,
  ]);

  // ── EXPENSE SOURCES ────────────────────────────────────────────────────────

  const outflows = useMemo(() => {
    const sources: { name: string; monthly: number; icon: any; category: string }[] = [];

    // 1. EMIs (active loans only)
    const emiTotal = (state.loansTaken || [])
      .filter((l: any) => Number(l.outstanding || 0) > 0 && Number(l.monthsRemaining ?? 1) > 0)
      .reduce((sum: number, l: any) => sum + Number(l.emi || 0), 0);
    if (emiTotal > 0)
      sources.push({ name: "Loan EMIs", monthly: emiTotal, icon: CreditCard, category: "EMI" });

    // 2. SIPs (active only)
    const sipTotal = (state.sips || []).reduce((sum: number, s: any) => {
      if ((s.status || "").toLowerCase() === "stopped") return sum;
      return sum + Number(s.amount || 0);
    }, 0);
    if (sipTotal > 0)
      sources.push({
        name: "SIP Investments",
        monthly: sipTotal,
        icon: TrendingUp,
        category: "SIP",
      });

    // 3. Subscriptions
    const subTotal = (state.subscriptions || []).reduce((sum: number, s: any) => {
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
    const recurringTotal = (state.recurringExpenses || []).reduce(
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
    const ccMinDue = (state.creditCards || [])
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
    const rentPaid = (state.rentedProperties || []).reduce(
      (sum: number, p: any) => sum + getEffectiveRent(p),
      0
    );
    if (rentPaid > 0)
      sources.push({ name: "Rent Paid", monthly: rentPaid, icon: Home, category: "Rent" });

    // 7. Insurance Premiums (LIC, Term, Investment, Health)
    const licPremium = (state.lic || []).reduce(
      (sum: number, l: any) =>
        sum + annualizePremium(l.premium, l.premiumFrequency, l.annualPremium) / 12,
      0
    );
    const termPremium = (state.termPlans || []).reduce(
      (sum: number, t: any) =>
        sum + annualizePremium(t.premium, t.premiumFrequency, t.annualPremium) / 12,
      0
    );
    const ulipPremium = (state.investmentPlans || []).reduce(
      (sum: number, ip: any) =>
        sum + annualizePremium(ip.premium, ip.premiumFrequency, ip.annualPremium) / 12,
      0
    );
    const healthPremium = (state.healthInsurance || []).reduce(
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

    // 8. Living / Day-to-Day Expenses from Budget or Bank Debit Transactions Ledger:
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

    const budgetTotal = (state.budgets || [])
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
      // If user hasn't set manual budget targets, compute actual average monthly discretionary living expense from debit transactions
      const livingTxns = (state.transactions || []).filter(
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
    state.loansTaken,
    state.sips,
    state.subscriptions,
    state.recurringExpenses,
    state.creditCards,
    state.rentedProperties,
    state.lic,
    state.termPlans,
    state.investmentPlans,
    state.healthInsurance,
    state.budgets,
    state.transactions,
  ]);

  // ── ONE-TIME EVENTS ────────────────────────────────────────────────────────

  const events = useMemo(() => {
    const items: {
      date: string;
      name: string;
      amount: number;
      category: string;
      type: "inflow" | "outflow";
    }[] = [];

    // FD Maturities
    (state.fixedDeposits || []).forEach((fd: any) => {
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
    (state.recurringDeposits || []).forEach((rd: any) => {
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

    // Insurance Premium Due (LIC, Term, Investment, Health)
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
    addPremiumDue(state.lic, "commencementDate", "maturityDate");
    addPremiumDue(state.termPlans, "startDate", "expiryDate");
    addPremiumDue(state.investmentPlans, "commencementDate", "maturityDate");

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
    addHealthPremiumDue(state.healthInsurance);

    // Loan Closures
    (state.loansTaken || []).forEach((loan: any) => {
      if (!loan.monthsRemaining || !loan.emi) return;
      const closureDate = addMonthsToDateStr(todayStr, Number(loan.monthsRemaining));
      if (isDateInRange(closureDate, months)) {
        items.push({
          date: closureDate,
          name: `Loan Closure — ${loan.lender || loan.lenderBorrower || loan.type || "Loan"}`,
          amount: Number(loan.outstanding || loan.balance || 0),
          category: "Loan Closure",
          type: "outflow",
        });
      }
    });

    // Subscription Renewals (yearly subs)
    (state.subscriptions || []).forEach((sub: any) => {
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

    return items.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [
    state.fixedDeposits,
    state.recurringDeposits,
    state.lic,
    state.termPlans,
    state.investmentPlans,
    state.healthInsurance,
    state.loansTaken,
    state.subscriptions,
    months,
  ]);

  // ── CHART DATA ─────────────────────────────────────────────────────────────

  const totalMonthlyInflow = inflows.reduce((s, i) => s + i.monthly, 0);
  const totalMonthlyOutflow = outflows.reduce((s, o) => s + o.monthly, 0);
  const netMonthly = totalMonthlyInflow - totalMonthlyOutflow;
  const totalInflow = totalMonthlyInflow * forecastMonths;
  const totalOutflow = totalMonthlyOutflow * forecastMonths;
  // Add one-time event amounts
  const eventInflow = events.filter((e) => e.type === "inflow").reduce((s, e) => s + e.amount, 0);
  const eventOutflow = events.filter((e) => e.type === "outflow").reduce((s, e) => s + e.amount, 0);
  const grandInflow = totalInflow + eventInflow;
  const grandOutflow = totalOutflow + eventOutflow;
  const netCashFlow = grandInflow - grandOutflow;

  // Count-up animation for the hero summary numbers below.
  const animatedGrandInflow = useAnimatedNumber(grandInflow);
  const animatedGrandOutflow = useAnimatedNumber(grandOutflow);
  const animatedNetCashFlow = useAnimatedNumber(netCashFlow);
  const animatedNetMonthly = useAnimatedNumber(netMonthly);

  const chartData = useMemo(() => {
    let cumulative = 0;
    return months.map((m) => {
      // Add one-time events for this month
      const monthEventInflow = events
        .filter((e) => e.type === "inflow" && e.date.startsWith(m.key))
        .reduce((s, e) => s + e.amount, 0);
      const monthEventOutflow = events
        .filter((e) => e.type === "outflow" && e.date.startsWith(m.key))
        .reduce((s, e) => s + e.amount, 0);

      const inflow = totalMonthlyInflow + monthEventInflow;
      const outflow = totalMonthlyOutflow + monthEventOutflow;
      cumulative += inflow - outflow;

      return {
        month: m.label,
        Inflow: Math.round(inflow),
        Outflow: Math.round(outflow),
        Cumulative: Math.round(cumulative),
      };
    });
  }, [months, totalMonthlyInflow, totalMonthlyOutflow, events]);

  // ── EMPTY STATE ────────────────────────────────────────────────────────────

  const hasData = inflows.length > 0 || outflows.length > 0;

  if (!hasData) {
    return (
      <div>
        <SectionTitle sub="Forward-looking projection of your income, expenses, and one-time events">
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

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <style>{`
        .cf-list-row {
          transition: background 0.2s var(--ease-premium), transform 0.2s var(--ease-premium);
        }
        .cf-list-row:hover {
          background: var(--surface-1);
          transform: translateX(4px);
        }
        .cf-event-row .cf-event-dot,
        .cf-event-row .cf-event-content {
          transition: transform 0.2s var(--ease-premium);
        }
        .cf-event-row:hover .cf-event-dot {
          transform: scale(1.25);
        }
        .cf-event-row:hover .cf-event-content {
          transform: translateX(6px);
        }
        .cf-segbtn {
          color: var(--t-muted);
        }
        .cf-segbtn:hover,
        .cf-segbtn.active {
          color: var(--t-ink);
        }
      `}</style>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <SectionTitle
        sub="Forward-looking projection of your income, expenses, and one-time events"
        rightElement={
          <div
            style={{
              display: "flex",
              background: "var(--surface-1)",
              padding: "4px",
              borderRadius: "var(--radius-md)",
              border: `1.5px solid ${THEME.line}`,
              position: "relative",
              gap: "2px",
            }}
          >
            <button
              onClick={() => setForecastMonths(3)}
              aria-pressed={forecastMonths === 3}
              className={`cf-segbtn ${forecastMonths === 3 ? "active" : ""}`}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: forecastMonths === 3 ? "var(--surface-0)" : "transparent",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
                boxShadow: forecastMonths === 3 ? "var(--shadow-sm)" : "none",
                transition: "all 0.2s var(--ease-premium)",
              }}
            >
              3 Months
            </button>
            <button
              onClick={() => setForecastMonths(6)}
              aria-pressed={forecastMonths === 6}
              className={`cf-segbtn ${forecastMonths === 6 ? "active" : ""}`}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: forecastMonths === 6 ? "var(--surface-0)" : "transparent",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
                boxShadow: forecastMonths === 6 ? "var(--shadow-sm)" : "none",
                transition: "all 0.2s var(--ease-premium)",
              }}
            >
              6 Months
            </button>
          </div>
        }
      >
        Cash Flow Forecast
      </SectionTitle>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Card 1: Total Projected Inflow */}
        <Card
          hover
          style={{
            padding: "18px 20px",
            border: "1px solid var(--t-line)",
            borderLeft: `2.5px solid ${THEME.sage}`,
            borderRadius: 10,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", color: THEME.sage }}>
                <ArrowUpRight size={24} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Total Projected Inflow
                </div>
                <div style={{ fontSize: 10, color: THEME.muted, opacity: 0.8, marginTop: 1 }}>
                  Next {forecastMonths} Months
                </div>
              </div>
            </div>
            <Badge variant="sage">
              {Math.round(grandInflow > 0 ? (totalInflow / grandInflow) * 100 : 100)}% Regular
            </Badge>
          </div>

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 27,
              fontWeight: 600,
              color: THEME.ink,
              letterSpacing: "-0.01em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Money value={animatedGrandInflow} variant="full" />
          </div>

          {/* Composition bar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: `color-mix(in srgb, ${THEME.sage} 15%, var(--t-line))`,
                overflow: "hidden",
                display: "flex",
              }}
            >
              <div
                style={{
                  width: `${(totalInflow / Math.max(1, grandInflow)) * 100}%`,
                  background: THEME.sage,
                  height: "100%",
                }}
              />
              <div
                style={{
                  width: `${(eventInflow / Math.max(1, grandInflow)) * 100}%`,
                  background: "var(--t-accent)",
                  height: "100%",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: THEME.muted,
                fontWeight: 600,
              }}
            >
              <span>
                Regular: <Money value={totalInflow} variant="full" />
              </span>
              <span>
                Events: <Money value={eventInflow} variant="full" />
              </span>
            </div>
          </div>
        </Card>

        {/* Card 2: Total Projected Outflow */}
        <Card
          hover
          style={{
            padding: "18px 20px",
            border: "1px solid var(--t-line)",
            borderLeft: `2.5px solid ${THEME.rust}`,
            borderRadius: 10,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", color: THEME.rust }}>
                <ArrowDownRight size={24} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Total Projected Outflow
                </div>
                <div style={{ fontSize: 10, color: THEME.muted, opacity: 0.8, marginTop: 1 }}>
                  Next {forecastMonths} Months
                </div>
              </div>
            </div>
            <Badge variant="rust">
              {Math.round(grandOutflow > 0 ? (totalOutflow / grandOutflow) * 100 : 100)}% Regular
            </Badge>
          </div>

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 27,
              fontWeight: 600,
              color: THEME.ink,
              letterSpacing: "-0.01em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Money value={animatedGrandOutflow} variant="full" />
          </div>

          {/* Composition bar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: `color-mix(in srgb, ${THEME.rust} 15%, var(--t-line))`,
                overflow: "hidden",
                display: "flex",
              }}
            >
              <div
                style={{
                  width: `${(totalOutflow / Math.max(1, grandOutflow)) * 100}%`,
                  background: THEME.rust,
                  height: "100%",
                }}
              />
              <div
                style={{
                  width: `${(eventOutflow / Math.max(1, grandOutflow)) * 100}%`,
                  background: "var(--t-gold)",
                  height: "100%",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: THEME.muted,
                fontWeight: 600,
              }}
            >
              <span>
                Regular: <Money value={totalOutflow} variant="full" />
              </span>
              <span>
                Events: <Money value={eventOutflow} variant="full" />
              </span>
            </div>
          </div>
        </Card>

        {/* Card 3: Net Cash Flow */}
        <Card
          hover
          style={{
            padding: "18px 20px",
            border: "1px solid var(--t-line)",
            borderLeft: `2.5px solid ${netCashFlow >= 0 ? THEME.sage : THEME.rust}`,
            borderRadius: 10,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: netCashFlow >= 0 ? THEME.sage : THEME.rust,
                }}
              >
                {netCashFlow >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Net Cash Flow
                </div>
                <div style={{ fontSize: 10, color: THEME.muted, opacity: 0.8, marginTop: 1 }}>
                  Maturities & Closures Included
                </div>
              </div>
            </div>
            <Badge variant={netCashFlow >= 0 ? "sage" : "rust"}>
              {netCashFlow >= 0 ? "Surplus" : "Deficit"}
            </Badge>
          </div>

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 27,
              fontWeight: 600,
              color: netCashFlow >= 0 ? THEME.sage : THEME.rust,
              letterSpacing: "-0.01em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {animatedNetCashFlow < 0 ? "-" : ""}
            <Money value={Math.abs(animatedNetCashFlow)} variant="full" />
          </div>

          {/* Cash Flow Ratio indicator */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: "var(--t-line)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, (grandInflow / Math.max(1, grandInflow + grandOutflow)) * 100))}%`,
                  background: netCashFlow >= 0 ? THEME.sage : THEME.rust,
                  height: "100%",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: THEME.muted,
                fontWeight: 600,
              }}
            >
              <span>Coverage Ratio: {(grandInflow / Math.max(1, grandOutflow)).toFixed(2)}x</span>
              <span>{netCashFlow >= 0 ? "Positive Savings" : "Capital Deficit"}</span>
            </div>
          </div>
        </Card>

        {/* Card 4: Monthly Surplus/Deficit */}
        <Card
          hover
          style={{
            padding: "18px 20px",
            border: "1px solid var(--t-line)",
            borderLeft: `2.5px solid ${netMonthly >= 0 ? THEME.sage : THEME.rust}`,
            borderRadius: 10,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: netMonthly >= 0 ? THEME.sage : THEME.rust,
                }}
              >
                {netMonthly >= 0 ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Monthly Surplus
                </div>
                <div style={{ fontSize: 10, color: THEME.muted, opacity: 0.8, marginTop: 1 }}>
                  Regular Income & Expenses
                </div>
              </div>
            </div>
            <Badge variant={netMonthly >= 0 ? "sage" : "rust"}>
              {netMonthly >= 0 ? "Stable" : "Tight"}
            </Badge>
          </div>

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 27,
              fontWeight: 600,
              color: netMonthly >= 0 ? THEME.sage : THEME.rust,
              letterSpacing: "-0.01em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {animatedNetMonthly < 0 ? "-" : ""}
            <Money value={Math.abs(animatedNetMonthly)} variant="full" />
          </div>

          {/* Monthly progress indicator */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: "var(--t-line)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, (totalMonthlyInflow / Math.max(1, totalMonthlyInflow + totalMonthlyOutflow)) * 100))}%`,
                  background: netMonthly >= 0 ? THEME.sage : THEME.rust,
                  height: "100%",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: THEME.muted,
                fontWeight: 600,
              }}
            >
              <span>
                In: <Money value={totalMonthlyInflow} variant="full" />
              </span>
              <span>
                Out: <Money value={totalMonthlyOutflow} variant="full" />
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────────── */}
      <Card style={{ padding: 24, marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <BarChart2 size={18} style={{ color: THEME.accent }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: THEME.ink }}>
            Monthly Cash Flow Projection
          </span>
        </div>
        <div style={{ width: "100%", height: 320, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            barGap={4}
            barCategoryGap="20%"
          >
            <defs>
              <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={THEME.sage} stopOpacity={isDark ? 1 : 0.85} />
                <stop offset="100%" stopColor={THEME.sage} stopOpacity={isDark ? 0.5 : 0.15} />
              </linearGradient>
              <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={THEME.rust} stopOpacity={isDark ? 1 : 0.85} />
                <stop offset="100%" stopColor={THEME.rust} stopOpacity={isDark ? 0.5 : 0.15} />
              </linearGradient>
              <filter id="cfGlowInflow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="4"
                  floodColor={THEME.sage}
                  floodOpacity={isDark ? "0.55" : "0.4"}
                />
              </filter>
              <filter id="cfGlowOutflow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="4"
                  floodColor={THEME.rust}
                  floodOpacity={isDark ? "0.55" : "0.4"}
                />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} opacity={0.3} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fontWeight: 600, fill: THEME.muted }}
              axisLine={{ stroke: THEME.line }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: THEME.muted }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINRFull(v))}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: THEME.line, opacity: 0.4 }} />
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
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              style={{ filter: "url(#cfGlowInflow)" }}
            />
            <Bar
              dataKey="Outflow"
              name="Projected Outflow"
              fill="url(#outflowGrad)"
              stroke={THEME.rust}
              strokeWidth={1}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              style={{ filter: "url(#cfGlowOutflow)" }}
            />
            <Line
              type="monotone"
              dataKey="Cumulative"
              stroke={THEME.accent}
              strokeWidth={3}
              dot={{ fill: THEME.accent, stroke: "var(--surface-0)", strokeWidth: 2, r: 5 }}
              activeDot={{ fill: THEME.accent, stroke: "var(--surface-0)", strokeWidth: 2, r: 7 }}
              name="Cumulative Surplus"
            />
          </ComposedChart>
        </ResponsiveContainer></div>
      </Card>

      {/* ── Inflows & Outflows Tables ──────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))",
          gap: 20,
          marginBottom: 28,
        }}
      >
        {/* Regular Inflows */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
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
              <ArrowUpRight size={16} style={{ color: THEME.sage }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                Regular Inflows
              </span>
              <Badge variant="sage">{inflows.length}</Badge>
            </div>
            {expandedSections.inflows ? (
              <ChevronDown size={16} style={{ color: THEME.muted }} />
            ) : (
              <ChevronRight size={16} style={{ color: THEME.muted }} />
            )}
          </div>
          {expandedSections.inflows && (
            <div style={{ padding: "8px 0" }}>
              {inflows.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                  No regular inflows detected
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
                          <div style={{ display: "flex", alignItems: "center", color: THEME.sage, flexShrink: 0 }}>
                            <Icon size={18} />
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
                                    fontWeight: 600,
                                    padding: "2px 7px",
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
                            <span style={{ fontSize: 10, color: THEME.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.sourceLabel ? `${item.sourceLabel} • ` : ""}{item.category} • {pctOfTotal.toFixed(0)}% of total
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: "right", paddingRight: 8 }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: THEME.sage,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            <Money value={item.monthly} variant="exact" />
                          </span>
                          <span style={{ display: "block", fontSize: 10, color: THEME.muted }}>
                            /mo
                          </span>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: THEME.ink,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
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
                                  Bank credit reflects <strong>₹{Math.round(effectiveSalaryInfo.amount).toLocaleString("en-IN")}</strong>/mo. Official Salary Slips have take-home of <strong>₹{Math.round(salaryCandidates.slip.monthly).toLocaleString("en-IN")}</strong>/mo.
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
                        Total Inflow
                      </span>
                    </div>
                    <div style={{ textAlign: "right", paddingRight: 8 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: THEME.sage,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={totalMonthlyInflow} variant="exact" />
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 10,
                          color: THEME.sage,
                          fontWeight: 600,
                        }}
                      >
                        /mo
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: THEME.sage,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={totalInflow} variant="exact" />
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 10,
                          color: THEME.sage,
                          fontWeight: 600,
                        }}
                      >
                        {forecastMonths}-mo Total
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Regular Outflows */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
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
              <ArrowDownRight size={16} style={{ color: THEME.rust }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                Regular Outflows
              </span>
              <Badge variant="rust">{outflows.length}</Badge>
            </div>
            {expandedSections.outflows ? (
              <ChevronDown size={16} style={{ color: THEME.muted }} />
            ) : (
              <ChevronRight size={16} style={{ color: THEME.muted }} />
            )}
          </div>
          {expandedSections.outflows && (
            <div style={{ padding: "8px 0" }}>
              {outflows.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                  No regular outflows detected
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
                          <div style={{ display: "flex", alignItems: "center", color: THEME.rust, flexShrink: 0 }}>
                            <Icon size={18} />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                              {item.name}
                            </span>
                            <span style={{ fontSize: 10, color: THEME.muted }}>
                              {item.category} • {pctOfTotal.toFixed(0)}% of total
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: "right", paddingRight: 8 }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: THEME.rust,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            <Money value={item.monthly} variant="exact" />
                          </span>
                          <span style={{ display: "block", fontSize: 10, color: THEME.muted }}>
                            /mo
                          </span>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: THEME.ink,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
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
                        Total Outflow
                      </span>
                    </div>
                    <div style={{ textAlign: "right", paddingRight: 8 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: THEME.rust,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={totalMonthlyOutflow} variant="exact" />
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 10,
                          color: THEME.rust,
                          fontWeight: 600,
                        }}
                      >
                        /mo
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: THEME.rust,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={totalOutflow} variant="exact" />
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 10,
                          color: THEME.rust,
                          fontWeight: 600,
                        }}
                      >
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

      {/* ── Upcoming Events Timeline ───────────────────────────────────────── */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
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
            <CalendarClock size={16} style={{ color: THEME.accent }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>Upcoming Events</span>
            <Badge variant="accent">{events.length}</Badge>
          </div>
          {expandedSections.events ? (
            <ChevronDown size={16} style={{ color: THEME.muted }} />
          ) : (
            <ChevronRight size={16} style={{ color: THEME.muted }} />
          )}
        </div>
        {expandedSections.events && (
          <div style={{ padding: "0" }}>
            {events.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                No one-time events in the next {forecastMonths} months
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
                        } else if (diffDays === -1) {
                          relativeLabel = "Yesterday";
                        } else if (diffDays > 1) {
                          if (diffDays > 30) {
                            const diffMonths = Math.round(diffDays / 30.4);
                            relativeLabel = `In ${diffMonths} month${diffMonths > 1 ? "s" : ""}`;
                          } else {
                            relativeLabel = `In ${diffDays} days`;
                          }
                        } else {
                          const absDays = Math.abs(diffDays);
                          if (absDays > 30) {
                            const diffMonths = Math.round(absDays / 30.4);
                            relativeLabel = `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
                          } else {
                            relativeLabel = `${absDays} day${absDays > 1 ? "s" : ""} ago`;
                          }
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
                          </div>

                          {/* Amount */}
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color: isInflow ? THEME.sage : THEME.rust,
                              minWidth: 110,
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
