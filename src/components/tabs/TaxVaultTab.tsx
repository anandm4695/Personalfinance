import React, { useState, useMemo, useEffect } from "react";
import {
  Calculator,
  Shield,
  History,
  Plus,
  Trash2,
  Calendar,
  Target,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  Percent,
  RefreshCw,
  Info,
  AlertTriangle,
  Download,
  Lightbulb,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Zap,
  PiggyBank,
  HeartPulse,
  Briefcase,
  Home,
  Building2,
  Landmark,
  BarChart3,
  Pencil,
  PartyPopper,
  Save,
  FileText,
  Clock,
  ArrowRight,
  ExternalLink,
  Layers,
  Scale,
  CheckSquare,
  Square,
  DollarSign,
  PieChart,
  HelpCircle,
  FileCheck,
  Search,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { THEME } from "../../utils/constants";
import { getCurrentFY, getCurrentFYStartYear } from "../../utils/appConstants";
import {
  fmtINR,
  fmtINRFull,
  maskCurrencyInText,
  fmtINRExact,
  calcTaxNewByFY,
  calcTaxOldByFY,
  today,
  uid,
  isHomeLoan,
  loanOutstanding,
  getEffectiveRent,
  annualizePremium,
  getAutoDetectedDeductions,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { StatCard } from "../ui/StatCard";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Field } from "../ui/Form";
import { SectionTitle } from "../ui/SectionTitle";
import { usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { Modal, ModalActions } from "../ui/Modal";
import { EmptyState } from "../ui/EmptyState";
import { ConfirmDialog } from "../ui/Feedback";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { TaxSuiteHeader } from "../tax/TaxSuiteHeader";

/* ══════════════════════════════════════════════════════════════════
   SECURITY & STRING HELPERS
   ══════════════════════════════════════════════════════════════════ */

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ══════════════════════════════════════════════════════════════════
   STATUTORY CONSTANTS & LOOKUPS
   ══════════════════════════════════════════════════════════════════ */

// FY-aware std deduction lookup (old regime fixed at ₹50K from FY 2020-21)
export const getOldStdDed = (fyStart: number) => (fyStart >= 2020 ? 50_000 : 40_000);

// New regime std deduction by FY (Finance Act 2024 raised it to ₹75,000 for FY 2024-25+)
export const getNewStdDed = (fyStart: number) => {
  if (fyStart >= 2024) return 75_000;
  if (fyStart >= 2023) return 50_000;
  return 0;
};

const fmtL = (n: number) => `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;

/** Estimate marginal slab rate for old regime based on taxable income */
export const oldMarginalRate = (taxable: number) => {
  if (taxable <= 250_000) return 0;
  if (taxable <= 500_000) return 0.05;
  if (taxable <= 1_000_000) return 0.2;
  return 0.3;
};

/**
 * Section 234C advance-tax shortfall interest. Interest on a quarter's
 * shortfall is a STATUTORILY FIXED period — 3 months for Q1/Q2/Q3, 1 month
 * for Q4 — not a function of how long it's been since the due date.
 */
export const calcSection234CPenalty = (
  fyStartYear: number,
  netLiability: number,
  totalAdvancePaid: number,
  now: Date
): number => {
  const quarters = [
    { due: new Date(fyStartYear, 5, 15), pct: 15, months: 3 },
    { due: new Date(fyStartYear, 8, 15), pct: 45, months: 3 },
    { due: new Date(fyStartYear, 11, 15), pct: 75, months: 3 },
    { due: new Date(fyStartYear + 1, 2, 15), pct: 100, months: 1 },
  ];
  let total = 0;
  quarters.forEach((q) => {
    if (now > q.due) {
      const required = netLiability * (q.pct / 100);
      const shortfall = Math.max(0, required - totalAdvancePaid);
      if (shortfall > 0) {
        total += Math.round(shortfall * 0.01 * q.months);
      }
    }
  });
  return total;
};

// Equity-oriented fund detection
const EQUITY_MF_KEYWORDS = [
  "equity",
  "elss",
  "flexi",
  "large cap",
  "mid cap",
  "small cap",
  "multi cap",
  "focused",
  "sectoral",
  "thematic",
  "index",
  "hybrid",
  "balanced advantage",
  "aggressive hybrid",
  "nifty",
  "sensex",
];

const isEquityMF = (m: any): boolean => {
  const cat = (m.category || m.type || m.scheme || m.name || "").toLowerCase();
  return EQUITY_MF_KEYWORDS.some((k) => cat.includes(k));
};

/**
 * Classify a mutual fund sale/holding's capital-gains bucket for a given holding period in days.
 */
export const classifyMFHolding = (
  m: any,
  days: number
): { isEquity: boolean; isSlabTaxed: boolean; isLtcg: boolean } => {
  const isEquity = isEquityMF(m);
  const isPostApr2023 = !!m.buyDate && m.buyDate >= "2023-04-01";
  const isSlabTaxed = !isEquity && isPostApr2023;
  const ltcgDayThreshold = isEquity ? 365 : 1095; // ~12mo equity vs ~36mo debt
  const isLtcg = isSlabTaxed ? false : days > ltcgDayThreshold;
  return { isEquity, isSlabTaxed, isLtcg };
};

// Union Budget 2024 rate change date
const CG_RATE_CHANGE_DATE = "2024-07-23";

export const computeEquityCGTax = (
  sells: { isLtcg: boolean; profit: number; sellDate?: string }[],
  ltcgExemption: number
) => {
  let stcgGainsPre = 0,
    stcgLossesPre = 0,
    stcgGainsPost = 0,
    stcgLossesPost = 0;
  let ltcgGainsPre = 0,
    ltcgLossesPre = 0,
    ltcgGainsPost = 0,
    ltcgLossesPost = 0;

  (sells || []).forEach((s) => {
    const isPost = !s.sellDate || s.sellDate >= CG_RATE_CHANGE_DATE;
    const p = Number(s.profit) || 0;
    if (s.isLtcg) {
      if (isPost) p > 0 ? (ltcgGainsPost += p) : (ltcgLossesPost += Math.abs(p));
      else p > 0 ? (ltcgGainsPre += p) : (ltcgLossesPre += Math.abs(p));
    } else {
      if (isPost) p > 0 ? (stcgGainsPost += p) : (stcgLossesPost += Math.abs(p));
      else p > 0 ? (stcgGainsPre += p) : (stcgLossesPre += Math.abs(p));
    }
  });

  let netSTCGpre = stcgGainsPre - stcgLossesPre;
  let netSTCGpost = stcgGainsPost - stcgLossesPost;
  if (netSTCGpre < 0 && netSTCGpost > 0) {
    netSTCGpost += netSTCGpre;
    netSTCGpre = 0;
  } else if (netSTCGpost < 0 && netSTCGpre > 0) {
    netSTCGpre += netSTCGpost;
    netSTCGpost = 0;
  }
  const residualSTCGLoss = Math.min(0, netSTCGpre) + Math.min(0, netSTCGpost);
  netSTCGpre = Math.max(0, netSTCGpre);
  netSTCGpost = Math.max(0, netSTCGpost);

  let netLTCGpre = ltcgGainsPre - ltcgLossesPre;
  let netLTCGpost = ltcgGainsPost - ltcgLossesPost;
  if (netLTCGpre < 0 && netLTCGpost > 0) {
    netLTCGpost += netLTCGpre;
    netLTCGpre = 0;
  } else if (netLTCGpost < 0 && netLTCGpre > 0) {
    netLTCGpre += netLTCGpost;
    netLTCGpost = 0;
  }
  netLTCGpre = Math.max(0, netLTCGpre);
  netLTCGpost = Math.max(0, netLTCGpost);

  // STCG loss offset against LTCG gains
  let remainingSTCGLoss = -residualSTCGLoss;
  if (remainingSTCGLoss > 0) {
    const usePost = Math.min(remainingSTCGLoss, netLTCGpost);
    netLTCGpost -= usePost;
    remainingSTCGLoss -= usePost;
    const usePre = Math.min(remainingSTCGLoss, netLTCGpre);
    netLTCGpre -= usePre;
  }

  // Combined LTCG exemption
  const exemptUsedPost = Math.min(ltcgExemption, netLTCGpost);
  const exemptUsedPre = Math.min(ltcgExemption - exemptUsedPost, netLTCGpre);
  const taxableLTCGpost = netLTCGpost - exemptUsedPost;
  const taxableLTCGpre = netLTCGpre - exemptUsedPre;

  return {
    netSTCG: netSTCGpre + netSTCGpost,
    netLTCG: netLTCGpre + netLTCGpost,
    taxSTCG: netSTCGpre * 0.15 + netSTCGpost * 0.2,
    taxLTCG: taxableLTCGpre * 0.1 + taxableLTCGpost * 0.125,
  };
};

/* ══════════════════════════════════════════════════════════════════
   DATE NORMALIZATION FOR 26AS
   ══════════════════════════════════════════════════════════════════ */

const MONTH_ABBR: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

const normalize26ASDate = (raw: string): string | null => {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmyMatch = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const mStr = dmyMatch[2].toLowerCase();
    const month = MONTH_ABBR[mStr];
    if (month) {
      let year = dmyMatch[3];
      if (year.length === 2) year = (Number(year) < 70 ? "20" : "19") + year;
      return `${year}-${month}-${day}`;
    }
  }
  const numericMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (numericMatch) {
    const day = numericMatch[1].padStart(2, "0");
    const month = numericMatch[2].padStart(2, "0");
    let year = numericMatch[3];
    if (year.length === 2) year = (Number(year) < 70 ? "20" : "19") + year;
    return `${year}-${month}-${day}`;
  }
  return null;
};

/* ══════════════════════════════════════════════════════════════════
   ADD TAX PAYMENT MODAL
   ══════════════════════════════════════════════════════════════════ */

const AddTaxPaymentModal = ({
  onClose,
  onSave,
  saving = false,
  fy,
}: {
  onClose: () => void;
  onSave: (data: any) => void;
  saving?: boolean;
  fy: string;
}) => {
  const [f, setF] = useState({
    date: today(),
    type: "Advance Tax",
    amount: "",
    challanNo: "",
    bsrCode: "",
    bank: "",
    note: "",
    fy,
  });

  const types = [
    "Advance Tax",
    "TDS",
    "Self-Assessment",
    "TCS",
    "Professional Tax",
    "Regular Assessment",
  ];

  return (
    <Modal title="Record Tax Payment / TDS" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Payment Date">
          <input
            className="form-input"
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </Field>
        <Field label="Tax Payment Type">
          <select
            className="form-input"
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Amount Paid (₹)">
          <input
            className="form-input"
            type="number"
            placeholder="e.g. 25000"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
          />
        </Field>
        <Field label="Financial Year">
          <input className="form-input" type="text" value={f.fy} disabled />
        </Field>
        <Field label="Challan / Acknowledgement No.">
          <input
            className="form-input"
            type="text"
            placeholder="e.g. ITNS 280 / 123456"
            value={f.challanNo}
            onChange={(e) => setF({ ...f, challanNo: e.target.value })}
          />
        </Field>
        <Field label="BSR Code / Bank Name">
          <input
            className="form-input"
            type="text"
            placeholder="e.g. HDFC Bank (0510012)"
            value={f.bank}
            onChange={(e) => setF({ ...f, bank: e.target.value })}
          />
        </Field>
        <div style={{ gridColumn: "1/-1" }}>
          <Field label="Notes / Section / Deductor">
            <input
              className="form-input"
              type="text"
              placeholder="e.g. Q2 Advance Tax via NetBanking or Employer TDS"
              value={f.note}
              onChange={(e) => setF({ ...f, note: e.target.value })}
            />
          </Field>
        </div>
      </div>
      <ModalActions>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="accent"
          loading={saving}
          disabled={!f.amount || Number(f.amount) <= 0}
          onClick={() => {
            onSave({
              ...f,
              amount: Number(f.amount) || 0,
            });
          }}
        >
          Save Tax Record
        </Button>
      </ModalActions>
    </Modal>
  );
};

/* ══════════════════════════════════════════════════════════════════
   SLAB BREAKDOWN TABLE COMPONENT
   ══════════════════════════════════════════════════════════════════ */

const SlabBreakdownTable = ({ result, regime }: { result: any; regime: "new" | "old" }) => {
  const accentColor = regime === "new" ? THEME.accent : THEME.gold;
  return (
    <div style={{ background: "var(--surface-0)", borderRadius: 14, padding: 18, border: `1px solid ${THEME.line}` }}>
      {/* Income → Taxable Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 6,
          marginBottom: 16,
          paddingBottom: 14,
          borderBottom: `1px dashed ${THEME.line}`,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>
          Gross Annual Income
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, textAlign: "right" }}>
          <Money value={result.grossIncome} variant="full" />
        </span>

        <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>
          {`Standard Deduction${regime === "old" ? " (Sec 16(ia))" : " (FA 2024)"}`}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: THEME.rust, textAlign: "right" }}>
          - <Money value={result.stdDed} variant="full" />
        </span>

        {regime === "old" && result.extraDeds > 0 && (
          <>
            <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>
              Chapter VI-A Deductions (80C, 80D, HRA, 24b…)
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.rust, textAlign: "right" }}>
              - <Money value={result.extraDeds} variant="full" />
            </span>
          </>
        )}

        <div style={{ gridColumn: "1/-1", height: 1, background: THEME.line, margin: "4px 0" }} />

        <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>Taxable Income</span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 15,
            fontWeight: 900,
            color: accentColor,
            textAlign: "right",
          }}
        >
          <Money value={result.taxable} variant="full" />
        </span>
      </div>

      {/* Slab rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {result.slabs
          .filter((s: any) => s.incomeInSlab > 0 || s.rate === 0)
          .map((slab: any, i: number) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 110px 90px",
                gap: 8,
                alignItems: "center",
                padding: "8px 12px",
                borderRadius: 8,
                background:
                  slab.rate === 0
                    ? `color-mix(in srgb, ${THEME.sage} 4%, transparent)`
                    : `color-mix(in srgb, ${accentColor} 3%, transparent)`,
                border: `1px solid color-mix(in srgb, ${slab.rate === 0 ? THEME.sage : accentColor} 9%, transparent)`,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: slab.rate === 0 ? THEME.sage : accentColor,
                  }}
                >
                  {slab.label}
                </div>
                <div style={{ fontSize: 10, color: THEME.muted }}>{slab.range}</div>
              </div>
              <div
                style={{ textAlign: "right", fontSize: 12, color: THEME.muted, fontWeight: 600 }}
              >
                <Money value={slab.incomeInSlab} variant="full" />
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontSize: 13,
                  fontWeight: 800,
                  color: slab.rate === 0 ? THEME.sage : THEME.ink,
                }}
              >
                {slab.rate === 0 ? "Nil" : <Money value={slab.taxInSlab} variant="full" />}
              </div>
            </div>
          ))}
      </div>

      {/* Tax totals */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 6,
          paddingTop: 12,
          borderTop: `1px dashed ${THEME.line}`,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>
          Tax on Slab Income
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, textAlign: "right" }}>
          <Money
            value={result.tax + (result.rebateApplied ? result.rebateAmount : 0)}
            variant="full"
          />
        </span>

        {result.rebateApplied && (
          <>
            <span style={{ fontSize: 13, fontWeight: 600, color: THEME.sage }}>
              Section 87A Rebate
            </span>
            <span
              style={{ fontSize: 13, fontWeight: 700, color: THEME.sage, textAlign: "right" }}
            >
              - <Money value={result.rebateAmount} variant="full" />
            </span>
          </>
        )}

        {result.surcharge > 0 && (
          <>
            <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>Surcharge</span>
            <span
              style={{ fontSize: 13, fontWeight: 700, color: THEME.rust, textAlign: "right" }}
            >
              + <Money value={result.surcharge} variant="full" />
            </span>
          </>
        )}

        <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>
          Health & Education Cess (4%)
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: THEME.muted, textAlign: "right" }}>
          + <Money value={result.cess} variant="full" />
        </span>

        <div
          style={{
            gridColumn: "1/-1",
            height: 2,
            background: accentColor,
            borderRadius: 1,
            margin: "6px 0",
          }}
        />

        <span style={{ fontSize: 15, fontWeight: 900, color: THEME.ink }}>Net Tax Liability</span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            fontWeight: 900,
            color: result.total === 0 ? THEME.sage : THEME.rust,
            textAlign: "right",
          }}
        >
          {result.total === 0 ? "₹0 (Nil)" : <Money value={result.total} variant="full" />}
        </span>

        <span style={{ fontSize: 12, fontWeight: 600, color: THEME.muted }}>
          Effective Tax Rate
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textAlign: "right" }}>
          {result.effectiveRate.toFixed(2)}%
        </span>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   HRA CALCULATOR COMPONENT
   ══════════════════════════════════════════════════════════════════ */

const HRACalculator = () => {
  const [hraBasic, setHraBasic] = useState("");
  const [hraDa, setHraDa] = useState("");
  const [hraReceived, setHraReceived] = useState("");
  const [hraRent, setHraRent] = useState("");
  const [hraMetro, setHraMetro] = useState(true);

  const basic = Number(hraBasic) || 0;
  const da = Number(hraDa) || 0;
  const received = Number(hraReceived) || 0;
  const rent = Number(hraRent) || 0;
  const salary = basic + da;

  const c1 = received;
  const c2 = Math.max(0, rent - 0.1 * salary);
  const c3 = (hraMetro ? 0.5 : 0.4) * salary;
  const exempt = salary > 0 && received > 0 ? Math.min(c1, c2, c3) : 0;
  const taxable = Math.max(0, received - exempt);

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: "var(--radius-md)",
    border: `1.5px solid ${THEME.line}`,
    fontSize: 13,
    color: THEME.ink,
    width: "100%",
  };

  return (
    <Card style={{ padding: 24, borderTop: `4px solid ${THEME.accent}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Calculator size={18} color={THEME.accent} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>HRA Exemption Calculator</div>
          <div style={{ fontSize: 11, color: THEME.muted }}>Section 10(13A) · Rule 2A</div>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <Field label="Annual Basic Salary (₹)">
          <input
            type="number"
            style={inputStyle}
            placeholder="e.g. 600000"
            value={hraBasic}
            onChange={(e) => setHraBasic(e.target.value)}
          />
        </Field>
        <Field label="Annual DA (₹)">
          <input
            type="number"
            style={inputStyle}
            placeholder="0"
            value={hraDa}
            onChange={(e) => setHraDa(e.target.value)}
          />
        </Field>
        <Field label="HRA Received (₹/yr)">
          <input
            type="number"
            style={inputStyle}
            placeholder="e.g. 240000"
            value={hraReceived}
            onChange={(e) => setHraReceived(e.target.value)}
          />
        </Field>
        <Field label="Total Rent Paid (₹/yr)">
          <input
            type="number"
            style={inputStyle}
            placeholder="e.g. 300000"
            value={hraRent}
            onChange={(e) => setHraRent(e.target.value)}
          />
        </Field>
        <Field label="City Category">
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              size="sm"
              variant={hraMetro ? "accent" : "ghost"}
              onClick={() => setHraMetro(true)}
              style={{ flex: 1, height: 36 }}
            >
              Metro (50%)
            </Button>
            <Button
              size="sm"
              variant={!hraMetro ? "accent" : "ghost"}
              onClick={() => setHraMetro(false)}
              style={{ flex: 1, height: 36 }}
            >
              Non-Metro (40%)
            </Button>
          </div>
        </Field>
      </div>
      {salary > 0 && received > 0 ? (
        <div
          style={{
            background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
            border: `1px solid color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
            borderRadius: 12,
            padding: 18,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, fontSize: 13 }}>
            <span style={{ color: THEME.muted }}>1. Actual HRA Received from Employer</span>
            <span style={{ fontWeight: 700, textAlign: "right" }}>
              <Money value={c1} variant="full" />
            </span>
            <span style={{ color: THEME.muted }}>2. Rent Paid − 10% of Basic Salary</span>
            <span style={{ fontWeight: 700, textAlign: "right" }}>
              <Money value={c2} variant="full" />
            </span>
            <span style={{ color: THEME.muted }}>
              3. {hraMetro ? "50%" : "40%"} of Salary ({hraMetro ? "Mumbai, Delhi, Kolkata, Chennai" : "Other Cities"})
            </span>
            <span style={{ fontWeight: 700, textAlign: "right" }}>
              <Money value={c3} variant="full" />
            </span>
          </div>
          <div
            style={{
              borderTop: `1px solid ${THEME.line}`,
              marginTop: 12,
              paddingTop: 12,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 800, color: THEME.sage, fontSize: 14 }}>
              HRA Exempt u/s 10(13A) (Least of 1, 2, 3)
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                fontSize: 20,
                color: THEME.sage,
                textAlign: "right",
              }}
            >
              <Money value={exempt} variant="full" />
            </span>
            <span style={{ color: THEME.muted, fontSize: 12 }}>Taxable HRA Portion</span>
            <span
              style={{ fontWeight: 700, fontSize: 14, color: THEME.rust, textAlign: "right" }}
            >
              <Money value={taxable} variant="full" />
            </span>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: THEME.muted, textAlign: "center", padding: "12px 0" }}>
          Enter Basic Salary and HRA Received to calculate your statutory exemption.
        </div>
      )}
    </Card>
  );
};

/* ══════════════════════════════════════════════════════════════════
   26AS RECONCILER COMPONENT
   ══════════════════════════════════════════════════════════════════ */

const Reconciler26AS = ({
  income,
  taxPayments,
  fy,
  fyStartStr,
  fyEndStr,
  existingLedger,
  addItem,
  showToast,
}: {
  income: any[];
  taxPayments: any[];
  fy: string;
  fyStartStr: string;
  fyEndStr: string;
  existingLedger?: any[];
  addItem?: any;
  showToast?: any;
}) => {
  const [rawText, setRawText] = useState("");
  const [savingToLedger, setSavingToLedger] = useState(false);
  const [savedRowKeys, setSavedRowKeys] = useState<Set<string>>(new Set());
  const rowKey = (row: any) =>
    `${(row.deductor || "").trim().toLowerCase()}|${Math.round(Number(row.tdsDeducted || 0))}`;
  const [parsed26AS, setParsed26AS] = useState<any[]>([]);
  const [parseError, setParseError] = useState("");

  const fyIncome = income.filter((i: any) => i.date && i.date >= fyStartStr && i.date <= fyEndStr);
  const fyTDS = taxPayments.filter(
    (p: any) => p.type === "TDS" && p.date && p.date >= fyStartStr && p.date <= fyEndStr
  );

  const parse26AS = () => {
    setParseError("");
    setParsed26AS([]);

    if (!rawText.trim()) {
      setParseError("Please paste the 26AS data first.");
      return;
    }

    try {
      const lines = rawText
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"));

      if (lines.length === 0) {
        setParseError("No data rows found.");
        return;
      }

      const delimiter = lines[0].includes("\t") ? "\t" : ",";
      const splitRow = (line: string) =>
        line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));

      const firstLower = lines[0].toLowerCase();
      const hasHeader =
        firstLower.includes("tan") ||
        firstLower.includes("deductor") ||
        firstLower.includes("section") ||
        firstLower.includes("amount");

      const dataLines = hasHeader ? lines.slice(1) : lines;
      const rows: any[] = [];

      for (let i = 0; i < dataLines.length; i++) {
        const cols = splitRow(dataLines[i]);
        if (cols.length < 4) continue;

        const tan = (cols[0] || "").trim();
        const deductor = (cols[1] || "").trim();
        const section = (cols[2] || "").trim();
        const dateRaw = (cols[3] || "").trim();
        const amountPaid = parseFloat((cols[4] || "0").replace(/,/g, "")) || 0;
        const tdsDeducted = parseFloat((cols[5] || "0").replace(/,/g, "")) || 0;

        if (!tan && !deductor) continue;

        rows.push({
          tan,
          deductor,
          section,
          date: dateRaw,
          amountPaid,
          tdsDeducted,
        });
      }

      if (rows.length === 0) {
        setParseError(
          "Could not parse any rows. Expected columns: TAN, Deductor Name, Section, Date, Amount Paid, TDS Deducted"
        );
        return;
      }

      setParsed26AS(rows);
    } catch (e: any) {
      setParseError("Parse error: " + e.message);
    }
  };

  const reconciled = useMemo(() => {
    if (parsed26AS.length === 0) return null;

    const matched: any[] = [];
    const unmatchedIn26AS: any[] = [];
    const usedIncomeIds = new Set<string>();
    const usedTDSIds = new Set<string>();

    parsed26AS.forEach((row) => {
      let foundIncome: any = null;
      let foundTDS: any = null;

      for (const inc of fyIncome) {
        if (usedIncomeIds.has(inc.id)) continue;
        const incAmt = Number(inc.amount || 0);
        if (incAmt > 0 && Math.abs(incAmt - row.amountPaid) / Math.max(incAmt, 1) < 0.05) {
          foundIncome = inc;
          break;
        }
      }

      for (const tds of fyTDS) {
        if (usedTDSIds.has(tds.id)) continue;
        const tdsAmt = Number(tds.amount || 0);
        if (tdsAmt > 0 && Math.abs(tdsAmt - row.tdsDeducted) / Math.max(tdsAmt, 1) < 0.05) {
          foundTDS = tds;
          break;
        }
      }

      if (foundIncome || foundTDS) {
        if (foundIncome) usedIncomeIds.add(foundIncome.id);
        if (foundTDS) usedTDSIds.add(foundTDS.id);
        matched.push({ ...row, matchedIncome: foundIncome, matchedTDS: foundTDS });
      } else {
        unmatchedIn26AS.push(row);
      }
    });

    const missingFrom26AS: any[] = [];
    fyTDS.forEach((tds) => {
      if (!usedTDSIds.has(tds.id)) {
        missingFrom26AS.push({
          type: "TDS",
          item: tds,
          amount: Number(tds.amount || 0),
          note: tds.note || "",
        });
      }
    });

    return { matched, unmatchedIn26AS, missingFrom26AS };
  }, [parsed26AS, fyIncome, fyTDS]);

  const existingForFY = useMemo(
    () => (existingLedger || []).filter((e: any) => e.fy === fy),
    [existingLedger, fy]
  );

  const isAlreadyInLedger = (row: any) =>
    savedRowKeys.has(rowKey(row)) ||
    existingForFY.some(
      (e: any) =>
        (e.deductor || "").trim().toLowerCase() === (row.deductor || "").trim().toLowerCase() &&
        Math.abs(Number(e.amount || 0) - Number(row.tdsDeducted || 0)) < 1
    );

  const saveToLedger = async () => {
    if (!addItem || savingToLedger || parsed26AS.length === 0) return;
    const toSave = parsed26AS.filter(
      (row) => Number(row.tdsDeducted) > 0 && !isAlreadyInLedger(row)
    );
    if (toSave.length === 0) {
      showToast?.("Nothing new to save — every parsed row is already in your 26AS ledger.", "info");
      return;
    }
    setSavingToLedger(true);
    try {
      await Promise.all(
        toSave.map((row) =>
          addItem("form26as", {
            deductor: row.deductor,
            tan: row.tan || null,
            amount: Number(row.tdsDeducted),
            dateOfPayment: normalize26ASDate(row.date),
            section: row.section || "Other",
            fy,
          })
        )
      );
      setSavedRowKeys((prev) => {
        const next = new Set(prev);
        toSave.forEach((row) => next.add(rowKey(row)));
        return next;
      });
      const skipped = parsed26AS.length - toSave.length;
      showToast?.(
        `Saved ${toSave.length} entr${toSave.length === 1 ? "y" : "ies"} to your 26AS ledger${
          skipped > 0 ? ` (${skipped} already there)` : ""
        } — visible in Tax Tools → 26AS Reconciliation.`,
        "success"
      );
    } catch (e: any) {
      showToast?.(`Failed to save to 26AS ledger: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingToLedger(false);
    }
  };

  const thStyle = {
    padding: "10px 14px",
    borderBottom: `1.5px solid ${THEME.line}`,
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: THEME.muted,
    textAlign: "left" as const,
    whiteSpace: "nowrap" as const,
    background: "rgba(128,128,128,0.03)",
  };

  const tdStyle = {
    padding: "12px 14px",
    borderBottom: `1px solid ${THEME.line}`,
    fontSize: 13,
    verticalAlign: "middle" as const,
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Information Banner */}
      <div
        style={{
          padding: "14px 18px",
          borderRadius: 12,
          background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
          border: `1px solid color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <RefreshCw size={18} color={THEME.accent} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: THEME.ink, lineHeight: 1.6 }}>
          <b>Smart TRACES 26AS & AIS Reconciler:</b> Download your Form 26AS text / CSV from the Income Tax portal (TRACES), paste it below, and click <b>Reconcile</b>. The engine matches deductors, sections, and TDS amounts against your recorded income and tax payments for <b>FY {fy}</b>.
        </div>
      </div>

      {/* Paste Box */}
      <Card style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: THEME.ink }}>
            Paste Form 26AS / AIS Data
          </div>
          <span style={{ fontSize: 11, color: THEME.muted }}>
            TAN, Deductor, Section, Date, Amount Paid, TDS Deducted
          </span>
        </div>
        <textarea
          style={{
            width: "100%",
            height: 120,
            background: "var(--surface-0)",
            border: `1.5px solid ${THEME.line}`,
            borderRadius: 10,
            padding: "12px 14px",
            color: THEME.ink,
            fontSize: 12,
            outline: "none",
            fontFamily: "monospace",
            resize: "vertical",
            boxSizing: "border-box",
          }}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`TAN, Name of Deductor, Section, Transaction Date, Amount Paid, TDS Deducted\nABCD12345E, ACME TECHNOLOGIES PVT LTD, 192, 30-Jun-2024, 600000, 60000\nMUMA00123F, HDFC BANK LTD, 194A, 31-Mar-2025, 45000, 4500`}
        />
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, color: THEME.muted }}>
            Supports comma or tab-separated text directly copied from TRACES.
          </div>
          <Button size="sm" variant="accent" onClick={parse26AS} icon={<RefreshCw size={14} />}>
            Reconcile Records
          </Button>
        </div>
      </Card>

      {parseError && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
            color: THEME.rust,
            fontSize: 13,
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <AlertTriangle size={16} />
          <span>{parseError}</span>
        </div>
      )}

      {reconciled && (
        <div style={{ display: "grid", gap: 20 }}>
          {/* Summary Stat Tiles */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
            }}
          >
            <Card style={{ padding: 18, borderLeft: `4px solid ${THEME.sage}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                Fully Matched Records
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: THEME.sage, marginTop: 4 }}>
                {reconciled.matched.length}
              </div>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                Present in 26AS & logged in app
              </div>
            </Card>
            <Card style={{ padding: 18, borderLeft: `4px solid ${THEME.gold}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                Unmatched in 26AS
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: THEME.gold, marginTop: 4 }}>
                {reconciled.unmatchedIn26AS.length}
              </div>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                In 26AS but not logged in app
              </div>
            </Card>
            <Card style={{ padding: 18, borderLeft: `4px solid ${THEME.rust}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                Missing from 26AS
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: THEME.rust, marginTop: 4 }}>
                {reconciled.missingFrom26AS.length}
              </div>
              <div style={{ fontSize: 11, color: THEME.rust, marginTop: 4 }}>
                Logged TDS missing on TRACES!
              </div>
            </Card>
          </div>

          {/* 1-Click Sync Card */}
          {addItem && (
            <Card
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                border: `1.5px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
                background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                  Save to Persistent 26AS Ledger
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  {existingForFY.length > 0
                    ? `${existingForFY.length} entries already saved for FY ${fy}. New entries will be deduplicated.`
                    : "Save parsed entries to the shared ledger used by Tax Tools & Audit checks."}
                </div>
              </div>
              <Button size="sm" variant="accent" loading={savingToLedger} onClick={saveToLedger} icon={<Save size={14} />}>
                Save to 26AS Ledger
              </Button>
            </Card>
          )}

          {/* Matched Table */}
          {reconciled.matched.length > 0 && (
            <Card style={{ padding: 0, overflow: "hidden", borderRadius: 14 }}>
              <div
                style={{
                  padding: "12px 18px",
                  background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
                  borderBottom: `1px solid ${THEME.line}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} color={THEME.sage} />
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>
                  Matched TDS Records ({reconciled.matched.length})
                </span>
              </div>
              <div className="mobile-table-wrap">
                <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>TAN</th>
                      <th style={thStyle}>Deductor</th>
                      <th style={thStyle}>Section</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Gross Paid</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>TDS Deducted</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciled.matched.map((r: any, i: number) => (
                      <tr key={i} className="table-row-hover">
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{r.tan}</td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{r.deductor}</td>
                        <td style={{ ...tdStyle, color: THEME.muted }}>Sec {r.section}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                          <Money value={r.amountPaid} variant="exact" />
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: THEME.sage }}>
                          <Money value={r.tdsDeducted} variant="full" />
                        </td>
                        <td style={tdStyle}>
                          <Badge variant="sage">Matched ✓</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Unmatched in 26AS */}
          {reconciled.unmatchedIn26AS.length > 0 && (
            <Card style={{ padding: 0, overflow: "hidden", borderRadius: 14 }}>
              <div
                style={{
                  padding: "12px 18px",
                  background: `color-mix(in srgb, ${THEME.gold} 6%, transparent)`,
                  borderBottom: `1px solid ${THEME.line}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={16} color={THEME.gold} />
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.gold }}>
                  Unmatched in 26AS ({reconciled.unmatchedIn26AS.length})
                </span>
                <span style={{ fontSize: 11, color: THEME.muted }}>
                  — TDS credited on TRACES but not logged in your app
                </span>
              </div>
              <div className="mobile-table-wrap">
                <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>TAN</th>
                      <th style={thStyle}>Deductor</th>
                      <th style={thStyle}>Section</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Gross Paid</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>TDS Deducted</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciled.unmatchedIn26AS.map((r: any, i: number) => (
                      <tr key={i} className="table-row-hover">
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{r.tan}</td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{r.deductor}</td>
                        <td style={{ ...tdStyle, color: THEME.muted }}>Sec {r.section}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                          <Money value={r.amountPaid} variant="exact" />
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: THEME.gold }}>
                          <Money value={r.tdsDeducted} variant="full" />
                        </td>
                        <td style={tdStyle}>
                          <Badge variant="gold">Unmatched</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Missing from 26AS */}
          {reconciled.missingFrom26AS.length > 0 && (
            <Card style={{ padding: 0, overflow: "hidden", borderRadius: 14 }}>
              <div
                style={{
                  padding: "12px 18px",
                  background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
                  borderBottom: `1px solid ${THEME.line}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={16} color={THEME.rust} />
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.rust }}>
                  Missing from 26AS ({reconciled.missingFrom26AS.length})
                </span>
                <span style={{ fontSize: 11, color: THEME.muted }}>
                  — TDS recorded in your app that did NOT appear in TRACES!
                </span>
              </div>
              <div className="mobile-table-wrap">
                <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Payment Type</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Notes / Deductor</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                      <th style={thStyle}>Audit Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciled.missingFrom26AS.map((r: any, i: number) => (
                      <tr key={i} className="table-row-hover">
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{r.type}</td>
                        <td style={{ ...tdStyle, color: THEME.muted }}>{r.item.date || "—"}</td>
                        <td style={tdStyle}>{r.note || "—"}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: THEME.rust }}>
                          <Money value={r.amount} variant="exact" />
                        </td>
                        <td style={tdStyle}>
                          <Badge variant="rust">Missing on TRACES</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   PROPS INTERFACE
   ══════════════════════════════════════════════════════════════════ */

interface TaxVaultTabProps {
  state: any;
  metrics: any;
  addItem: any;
  removeItem: any;
  updateItem: any;
  updateProfile?: any;
  updateMasterData?: any;
  showToast?: any;
  setTab?: (tab: string) => void;
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT: TAX VAULT TAB
   ══════════════════════════════════════════════════════════════════ */

export const TaxVaultTab: React.FC<TaxVaultTabProps> = ({
  state,
  metrics,
  addItem,
  removeItem,
  updateProfile,
  updateMasterData,
  showToast,
  setTab,
}) => {
  const [subTab, setSubTab] = useState<
    "overview" | "heads" | "capitalGains" | "advanceTax" | "reconciler" | "toolkit"
  >("overview");
  const [showModal, setShowModal] = useState(false);
  const [incomeOverride, setIncomeOverride] = useState<string>("");
  const [simulatedHarvestIds, setSimulatedHarvestIds] = useState<string[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [expandedTipId, setExpandedTipId] = useState<string | null>(null);
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<any>(null);
  const [activeToolkitTab, setActiveToolkitTab] = useState<"hra" | "crossover" | "surcharge" | "checklist">("hra");
  const [checklistCompleted, setChecklistCompleted] = useState<Record<string, boolean>>({});

  const { privacyMode } = usePrivacy();

  const { run: saveNewTaxPayment, loading: savingTaxPayment } = useAsyncAction(
    async (data: any) => {
      await addItem("taxPayments", data);
    },
    {
      onSuccess: () => setShowModal(false),
      onError: (e: any) =>
        showToast?.(`Failed to save tax payment: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: deleteTaxPayment } = useAsyncAction(
    async (id: string) => {
      await removeItem("taxPayments", id);
    },
    {
      onError: (e: any) =>
        showToast?.(`Failed to delete tax payment: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  /* ── FY Selection ────────────────────────────────────────── */
  const availableFYs = useMemo(() => {
    const fySet = new Set<number>();
    const addDate = (d: string) => {
      if (!d) return;
      const dt = new Date(d + "T00:00:00");
      fySet.add(dt.getMonth() >= 3 ? dt.getFullYear() : dt.getFullYear() - 1);
    };
    (state.income || []).forEach((i: any) => addDate(i.date));
    (state.transactions || []).forEach((t: any) => addDate(t.date));
    (state.stockSells || []).forEach((s: any) => addDate(s.sellDate));
    (state.mfSells || []).forEach((m: any) => addDate(m.sellDate));
    (state.taxPayments || []).forEach((t: any) => {
      if (t.fy) {
        const y = Number(t.fy.split("-")[0]);
        if (y) fySet.add(y);
      }
    });
    const now = new Date();
    const cur = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    fySet.add(cur);
    return Array.from(fySet)
      .sort((a, b) => b - a)
      .map((y) => `${y}-${String(y + 1).slice(-2)}`);
  }, [state.income, state.transactions, state.stockSells, state.mfSells, state.taxPayments]);

  const [fy, setFy] = useState(state.profile?.fy || availableFYs[0] || getCurrentFY());
  const fyParts = fy.split("-");
  const fyStartYear = Number(fyParts[0]) || getCurrentFYStartYear();
  const fyStartStr = `${fyStartYear}-04-01`;
  const fyEndStr = `${fyStartYear + 1}-03-31`;

  const hasNewRegime = fyStartYear >= 2020;
  const defaultRegime = fyStartYear >= 2023 ? "new" : "old";
  const [activeRegime, setActiveRegime] = useState<"new" | "old">(
    hasNewRegime ? state.profile?.regime || defaultRegime : "old"
  );

  useEffect(() => {
    if (hasNewRegime && state.profile?.regime) {
      setActiveRegime(state.profile.regime);
    }
  }, [state.profile?.regime, hasNewRegime]);

  useEffect(() => {
    if (!hasNewRegime && activeRegime !== "old") {
      setActiveRegime("old");
    }
  }, [hasNewRegime, activeRegime]);

  const handleRegimeChange = (regime: "new" | "old") => {
    setActiveRegime(regime);
    if (updateProfile) {
      updateProfile({ regime });
    }
  };

  /* ── Deductions State & Auto-Detection ─────────────────────── */
  const autoDetected = useMemo(() => {
    return getAutoDetectedDeductions(state, fy);
  }, [state, fy]);

  const overrides = state.masterData?.taxDeductions?.[fy] || {};

  const [deductions, setDeductions] = useState(() => ({
    d80C: overrides.d80C !== undefined ? overrides.d80C : autoDetected.d80C,
    d80D: overrides.d80D !== undefined ? overrides.d80D : autoDetected.d80D,
    d80DSenior: overrides.d80DSenior !== undefined ? !!overrides.d80DSenior : false,
    hra: overrides.hra !== undefined ? overrides.hra : autoDetected.hra,
    homeLoan: overrides.homeLoan !== undefined ? overrides.homeLoan : autoDetected.homeLoan,
    nps: overrides.nps !== undefined ? overrides.nps : autoDetected.nps,
    d80CCD2: overrides.d80CCD2 !== undefined ? overrides.d80CCD2 : autoDetected.d80CCD2,
    d80G: overrides.d80G !== undefined ? overrides.d80G : 0,
    d80E: overrides.d80E !== undefined ? overrides.d80E : 0,
    d80TTA: overrides.d80TTA !== undefined ? overrides.d80TTA : 0,
  }));

  useEffect(() => {
    const ov = state.masterData?.taxDeductions?.[fy] || {};
    setDeductions({
      d80C: ov.d80C !== undefined ? ov.d80C : autoDetected.d80C,
      d80D: ov.d80D !== undefined ? ov.d80D : autoDetected.d80D,
      d80DSenior: ov.d80DSenior !== undefined ? !!ov.d80DSenior : false,
      hra: ov.hra !== undefined ? ov.hra : autoDetected.hra,
      homeLoan: ov.homeLoan !== undefined ? ov.homeLoan : autoDetected.homeLoan,
      nps: ov.nps !== undefined ? ov.nps : autoDetected.nps,
      d80CCD2: ov.d80CCD2 !== undefined ? ov.d80CCD2 : autoDetected.d80CCD2,
      d80G: ov.d80G !== undefined ? ov.d80G : 0,
      d80E: ov.d80E !== undefined ? ov.d80E : 0,
      d80TTA: ov.d80TTA !== undefined ? ov.d80TTA : 0,
    });
  }, [
    fy,
    state.masterData?.taxDeductions,
    autoDetected.d80C,
    autoDetected.d80D,
    autoDetected.hra,
    autoDetected.homeLoan,
    autoDetected.nps,
    autoDetected.d80CCD2,
  ]);

  const setDed = (key: string, val: string) =>
    setDeductions((prev) => ({ ...prev, [key]: val === "" ? "" : Number(val) || 0 }));

  const handleDeductionBlur = (key: string, value: number, isRawEmpty: boolean) => {
    if (updateMasterData) {
      const currentOverrides = state.masterData?.taxDeductions?.[fy] || {};
      const updatedOverrides = { ...currentOverrides };
      if (isRawEmpty) {
        delete updatedOverrides[key];
      } else {
        updatedOverrides[key] = value;
      }
      updateMasterData("taxDeductions", {
        ...(state.masterData?.taxDeductions || {}),
        [fy]: updatedOverrides,
      });
    }
  };

  const toggleD80DSenior = () => {
    const newVal = !deductions.d80DSenior;
    setDeductions((prev) => ({ ...prev, d80DSenior: newVal }));
    if (updateMasterData) {
      const currentOverrides = state.masterData?.taxDeductions?.[fy] || {};
      updateMasterData("taxDeductions", {
        ...(state.masterData?.taxDeductions || {}),
        [fy]: { ...currentOverrides, d80DSenior: newVal },
      });
    }
  };

  /* ── 5 Heads of Income Decomposition ────────────────────────── */
  const detectedIncome = metrics.annualIncome || (metrics.monthIncome || 0) * 12;
  const annualIncome = incomeOverride !== "" ? Number(incomeOverride) || 0 : detectedIncome;

  // Rental Income (House Property)
  const rentalProperties = state.rentalProperties || [];
  const grossRent = rentalProperties.reduce(
    (sum: number, r: any) => sum + (Number(r.monthlyRent || 0) * 12),
    0
  );
  const housePropertyNet = Math.max(0, grossRent * 0.7 - Math.min(Number(deductions.homeLoan) || 0, 200_000));

  /* ── Capital Gains Realized Data ────────────────────────────── */
  const realizedGainsData = useMemo(() => {
    const inFYLocal = (d: string) => d && d >= fyStartStr && d <= fyEndStr;
    const fyStockSells = (state.stockSells || []).filter((s: any) => inFYLocal(s.sellDate));
    const fyMfSells = (state.mfSells || []).filter((m: any) => inFYLocal(m.sellDate));
    const allSells: any[] = [];
    const GRANDFATHER_DATE = "2018-02-01";

    fyStockSells.forEach((s: any) => {
      const rawBuyPrice = Number(s.buyPrice) || 0;
      const sellPrice = Number(s.sellPrice) || 0;
      const qty = Number(s.qty) || 0;
      const days =
        s.buyDate && s.sellDate
          ? Math.max(
              0,
              Math.ceil((new Date(s.sellDate).getTime() - new Date(s.buyDate).getTime()) / 86400000)
            )
          : 0;
      const isLtcg = days > 365;
      const fmv = Number(s.fmvJan2018 || s.grandfatherPrice || 0);
      let buyPrice = rawBuyPrice;
      let grandfathered = false;
      if (isLtcg && s.buyDate && s.buyDate < GRANDFATHER_DATE && fmv > 0) {
        buyPrice = Math.min(sellPrice, Math.max(rawBuyPrice, fmv));
        grandfathered = true;
      }
      const profit =
        !grandfathered && s.profit != null && s.profit !== ""
          ? Number(s.profit)
          : (sellPrice - buyPrice) * qty;
      allSells.push({
        id: s.id,
        name: s.symbol,
        type: "Stock",
        qty,
        buyPrice,
        sellPrice,
        buyDate: s.buyDate,
        sellDate: s.sellDate,
        profit,
        isLtcg,
        days,
        grandfathered,
        originalBuyPrice: rawBuyPrice,
      });
    });

    fyMfSells.forEach((m: any) => {
      const buyNav = Number(m.buyNav) || Number(m.avgPrice) || 0;
      const sellNav = Number(m.sellNav) || Number(m.sellPrice) || 0;
      const qty = Number(m.qty) || Number(m.units) || 0;
      const profit =
        m.profit != null && m.profit !== "" ? Number(m.profit) : (sellNav - buyNav) * qty;
      const days =
        m.buyDate && m.sellDate
          ? Math.max(
              0,
              Math.ceil((new Date(m.sellDate).getTime() - new Date(m.buyDate).getTime()) / 86400000)
            )
          : 0;
      const { isSlabTaxed, isLtcg } = classifyMFHolding(m, days);
      allSells.push({
        id: m.id,
        name: m.scheme || m.name || m.symbol,
        type: isSlabTaxed ? "Debt Fund (Slab)" : "Mutual Fund",
        qty,
        buyPrice: buyNav,
        sellPrice: sellNav,
        buyDate: m.buyDate,
        sellDate: m.sellDate,
        profit,
        isLtcg,
        days,
      });
    });

    allSells.sort((a, b) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime());
    let stcgGains = 0,
      stcgLosses = 0,
      ltcgGains = 0,
      ltcgLosses = 0;
    allSells.forEach((s) => {
      if (s.isLtcg) {
        s.profit > 0 ? (ltcgGains += s.profit) : (ltcgLosses += Math.abs(s.profit));
      } else {
        s.profit > 0 ? (stcgGains += s.profit) : (stcgLosses += Math.abs(s.profit));
      }
    });
    return { allSells, stcgGains, stcgLosses, ltcgGains, ltcgLosses };
  }, [state.stockSells, state.mfSells, fyStartStr, fyEndStr]);

  const harvestCandidates = useMemo(() => {
    const candidates: any[] = [];
    (state.stocks || []).forEach((s: any) => {
      const qty = Number(s.qty) || 0;
      const avgPrice = Number(s.avgPrice) || 0;
      const currentPrice = Number(s.currentPrice) || avgPrice;
      const invested = qty * avgPrice;
      const currentVal = qty * currentPrice;
      const loss = invested - currentVal;
      if (loss > 0 && qty > 0) {
        const days = s.buyDate
          ? Math.max(0, Math.ceil((Date.now() - new Date(s.buyDate).getTime()) / 86400000))
          : 0;
        candidates.push({
          id: s.id,
          name: s.symbol || s.name,
          type: "Stock",
          qty,
          buyPrice: avgPrice,
          currentPrice,
          invested,
          currentVal,
          loss,
          buyDate: s.buyDate,
          isLtcg: days > 365,
          days,
        });
      }
    });
    (state.mutualFunds || []).forEach((m: any) => {
      const units = Number(m.units) || 0;
      const invested = Number(m.invested) || Number(m.investedValue) || 0;
      const currentNav = Number(m.currentNav) || 0;
      const currentVal = units * currentNav || invested;
      const loss = invested - currentVal;
      if (loss > 0 && units > 0) {
        const days = m.buyDate
          ? Math.max(0, Math.ceil((Date.now() - new Date(m.buyDate).getTime()) / 86400000))
          : 0;
        const { isSlabTaxed, isLtcg } = classifyMFHolding(m, days);
        candidates.push({
          id: m.id,
          name: m.name || m.symbol,
          type: isSlabTaxed ? "Debt Fund (Slab)" : "Mutual Fund",
          qty: units,
          buyPrice: units > 0 ? invested / units : 0,
          currentPrice: currentNav,
          invested,
          currentVal,
          loss,
          buyDate: m.buyDate,
          isLtcg,
          isSlabTaxed,
          days,
        });
      }
    });
    return candidates.sort((a, b) => b.loss - a.loss);
  }, [state.stocks, state.mutualFunds]);

  /* ── Tax Computations (FY-Aware) ────────────────────────────── */
  const stdDedOld = getOldStdDed(fyStartYear);
  const d80DCap = deductions.d80DSenior ? 50_000 : 25_000;
  const totalOldDeductions =
    stdDedOld +
    Math.min(Number(deductions.d80C) || 0, 150_000) +
    Math.min(Number(deductions.d80D) || 0, d80DCap) +
    (Number(deductions.hra) || 0) +
    Math.min(Number(deductions.homeLoan) || 0, 200_000) +
    Math.min(Number(deductions.nps) || 0, 50_000) +
    (Number(deductions.d80CCD2) || 0) +
    (Number(deductions.d80G) || 0) +
    (Number(deductions.d80E) || 0) +
    Math.min(Number(deductions.d80TTA) || 0, 10_000);

  const taxNewResult = useMemo(() => calcTaxNewByFY(annualIncome, fy), [annualIncome, fy]);
  const taxOldResult = useMemo(
    () => calcTaxOldByFY(annualIncome, totalOldDeductions, fy),
    [annualIncome, totalOldDeductions, fy]
  );

  const taxOldDisplay = { ...taxOldResult, extraDeds: totalOldDeductions - stdDedOld };
  const currentTax = activeRegime === "new" ? taxNewResult.total : taxOldResult.total;
  const currentResult = activeRegime === "new" ? taxNewResult : taxOldResult;

  /* ── Payment Tracking ────────────────────────────────────────── */
  const taxPayments = state.taxPayments || [];
  const totalTDS = taxPayments
    .filter((p: any) => p.type === "TDS")
    .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const totalAdvancePaid = taxPayments
    .filter((p: any) => p.type === "Advance Tax")
    .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const totalSelfAssessment = taxPayments
    .filter((p: any) => p.type === "Self-Assessment")
    .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const totalPaidSoFar = totalTDS + totalAdvancePaid + totalSelfAssessment;
  const netLiability = Math.max(0, currentTax - totalTDS);
  const remainingAdvance = Math.max(0, netLiability - totalAdvancePaid - totalSelfAssessment);
  const animatedRemainingAdvance = useAnimatedNumber(remainingAdvance);
  const isAdvanceTaxApplicable = netLiability > 10_000;
  const progressPct = currentTax > 0 ? Math.min(100, (totalPaidSoFar / currentTax) * 100) : 0;

  /* ── Advance Tax Instalments ─────────────────────────────────── */
  const installments = [
    { q: "Q1", due: "15 Jun", pct: 15, amt: netLiability * 0.15 },
    { q: "Q2", due: "15 Sep", pct: 45, amt: netLiability * 0.45 },
    { q: "Q3", due: "15 Dec", pct: 75, amt: netLiability * 0.75 },
    { q: "Q4", due: "15 Mar", pct: 100, amt: netLiability * 1.0 },
  ];

  /* ── Regime Verdict ─────────────────────────────────────────── */
  const regimeVerdict = useMemo(() => {
    if (!hasNewRegime) return null;
    const diff = taxOldResult.total - taxNewResult.total;
    const better = diff > 0 ? "new" : diff < 0 ? "old" : "equal";
    const saving = Math.abs(diff);
    return { better, saving, newTotal: taxNewResult.total, oldTotal: taxOldResult.total };
  }, [taxNewResult.total, taxOldResult.total, hasNewRegime]);

  /* ── Indifference / Crossover Curve Data ─────────────────────── */
  const crossoverData = useMemo(() => {
    if (annualIncome <= 0) return [];
    const points: any[] = [];
    const step = 50_000;
    const maxDeds = 700_000;
    for (let d = 0; d <= maxDeds; d += step) {
      const oldRes = calcTaxOldByFY(annualIncome, stdDedOld + d, fy);
      const newRes = calcTaxNewByFY(annualIncome, fy);
      points.push({
        deductions: d,
        label: `₹${d / 1000}k`,
        oldTax: oldRes.total,
        newTax: newRes.total,
      });
    }
    return points;
  }, [annualIncome, stdDedOld, fy]);

  /* ── Capital Gains Tax Calculations ─────────────────────────── */
  const marginalRate = useMemo(() => {
    const r = activeRegime === "new" ? taxNewResult : taxOldResult;
    const applicableSlabs = (r.slabs || []).filter((s: any) => s.incomeInSlab > 0);
    if (applicableSlabs.length === 0) return 0;
    return applicableSlabs[applicableSlabs.length - 1].rate;
  }, [activeRegime, taxNewResult, taxOldResult]);

  const taxCalculations = useMemo(() => {
    const { allSells } = realizedGainsData;
    const ltcgExemption = fyStartYear >= 2024 ? 125_000 : 100_000;
    const actualCalc = computeEquityCGTax(allSells, ltcgExemption);
    const totalActualTax = actualCalc.taxSTCG + actualCalc.taxLTCG;

    let simulatedSTCLosses = 0,
      simulatedLTCLosses = 0;
    const simulatedSells = [...allSells];
    harvestCandidates.forEach((c) => {
      if (simulatedHarvestIds.includes(c.id)) {
        c.isLtcg ? (simulatedLTCLosses += c.loss) : (simulatedSTCLosses += c.loss);
        simulatedSells.push({ isLtcg: c.isLtcg, profit: -c.loss, sellDate: today() });
      }
    });
    const simCalc = computeEquityCGTax(simulatedSells, ltcgExemption);
    const totalSimTax = simCalc.taxSTCG + simCalc.taxLTCG;

    return {
      actual: {
        netSTCG: actualCalc.netSTCG,
        netLTCG: actualCalc.netLTCG,
        taxSTCG: actualCalc.taxSTCG,
        taxLTCG: actualCalc.taxLTCG,
        totalTax: totalActualTax,
      },
      simulated: {
        stcLossesAdded: simulatedSTCLosses,
        ltcLossesAdded: simulatedLTCLosses,
        netSTCG: simCalc.netSTCG,
        netLTCG: simCalc.netLTCG,
        taxSTCG: simCalc.taxSTCG,
        taxLTCG: simCalc.taxLTCG,
        totalTax: totalSimTax,
      },
      totalSaved: Math.max(0, totalActualTax - totalSimTax),
    };
  }, [realizedGainsData, harvestCandidates, simulatedHarvestIds, fyStartYear]);

  const animatedTotalSaved = useAnimatedNumber(taxCalculations.totalSaved);

  /* ── CFO Tax Saving Tips ─────────────────────────────────────── */
  const taxSavingTips = useMemo(() => {
    const tips: any[] = [];
    const margRate = oldMarginalRate(taxOldResult.taxable);
    const showOldTips = !regimeVerdict || regimeVerdict.better === "old" || activeRegime === "old";

    // 80C
    const used80C = Math.min(Number(deductions.d80C) || 0, 150_000);
    const gap80C = Math.max(0, 150_000 - used80C);
    if (gap80C > 0 && showOldTips) {
      const saving = Math.round(gap80C * margRate * 1.04);
      tips.push({
        id: "80c",
        section: "Section 80C",
        priority: "high",
        icon: PiggyBank,
        title: `Top up 80C — ${fmtL(gap80C)} headroom remaining`,
        shortDesc: `Invest ${fmtINRFull(gap80C)} more in PPF, ELSS, or EPF to max out the ₹1.5L statutory limit.`,
        fullDesc: `Section 80C allows deduction up to ₹1,50,000/yr on investments in PPF, ELSS, EPF, LIC premiums, NSC, SCSS, 5-year tax-saving FDs, and children tuition fees. You've utilized ${fmtL(used80C)}. Topping up can save approx. ${fmtINRFull(saving)} in taxes at your ${(margRate * 100).toFixed(0)}% slab.`,
        saving,
        regime: "old",
        maxBenefit: Math.round(150_000 * margRate * 1.04),
        utilizedPct: (used80C / 150_000) * 100,
      });
    }

    // 80D
    const used80D = Math.min(Number(deductions.d80D) || 0, d80DCap);
    const gap80D = Math.max(0, d80DCap - used80D);
    if (gap80D > 0 && showOldTips) {
      const saving = Math.round(gap80D * margRate * 1.04);
      tips.push({
        id: "80d",
        section: "Section 80D",
        priority: "high",
        icon: HeartPulse,
        title: `Health Insurance Premium Deduction (80D)`,
        shortDesc: `Claim up to ₹25K for self/family + ₹25K/₹50K extra for parents (up to ₹1L total for senior parents).`,
        fullDesc: `Section 80D allows deduction of health insurance premium paid for self, spouse, children (up to ₹25,000) and parents (up to ₹25,000, or ₹50,000 for senior citizens). Preventive health checkups up to ₹5,000 are deductible within this limit.`,
        saving,
        regime: "old",
        maxBenefit: Math.round(d80DCap * margRate * 1.04),
        utilizedPct: (used80D / d80DCap) * 100,
      });
    }

    // NPS 80CCD(1B)
    const usedNPS = Math.min(Number(deductions.nps) || 0, 50_000);
    const gapNPS = Math.max(0, 50_000 - usedNPS);
    if (gapNPS > 0 && showOldTips) {
      const saving = Math.round(gapNPS * margRate * 1.04);
      tips.push({
        id: "nps",
        section: "Section 80CCD(1B)",
        priority: "medium",
        icon: TrendingUp,
        title: `NPS Extra ₹50,000 Deduction Over 80C`,
        shortDesc: `Invest in NPS Tier 1 for an additional ₹50K deduction that is completely ABOVE the ₹1.5L 80C ceiling.`,
        fullDesc: `Section 80CCD(1B) allows an exclusive deduction of up to ₹50,000 in National Pension System contributions. In the 30% slab, ₹50,000 in NPS saves ₹15,600 in tax (₹15,000 tax + ₹600 cess).`,
        saving,
        regime: "old",
        maxBenefit: Math.round(50_000 * margRate * 1.04),
        utilizedPct: (usedNPS / 50_000) * 100,
      });
    }

    // NPS Employer 80CCD(2)
    const maxEmpNPS80CCD2 =
      annualIncome > 0 ? annualIncome * (activeRegime === "new" ? 0.14 : 0.1) : 0;
    const usedEmpNPS = Number(deductions.d80CCD2) || 0;
    if (usedEmpNPS < maxEmpNPS80CCD2 && maxEmpNPS80CCD2 > 0) {
      tips.push({
        id: "ccd2",
        section: "Section 80CCD(2)",
        priority: "medium",
        icon: Briefcase,
        title: `NPS Employer Contribution (14% in New / 10% in Old)`,
        shortDesc: `Route a portion of your CTC into NPS to claim corporate deduction in BOTH tax regimes.`,
        fullDesc: `Section 80CCD(2) allows deduction on employer's contribution to your NPS account — enhanced to 14% of basic salary in the new regime by Budget 2024. Ask your employer's payroll to enable this corporate tax shield.`,
        saving: null,
        regime: "both",
        maxBenefit: null,
        utilizedPct: (usedEmpNPS / maxEmpNPS80CCD2) * 100,
      });
    }

    // LTCG Harvesting
    if (currentTax > 0) {
      tips.push({
        id: "ltcg",
        section: "LTCG Tax-Loss Harvesting",
        priority: "low",
        icon: BarChart3,
        title: `Harvest ₹1.25L LTCG Tax-Free Every Fiscal Year`,
        shortDesc: `Long-term capital gains up to ₹1.25L on listed equity / equity MFs are exempt u/s 112A.`,
        fullDesc: `Under Section 112A, LTCG is exempt up to ₹1,25,000 per financial year. Booking up to ₹1.25L in gains and re-investing resets your cost basis upwards completely tax-free.`,
        saving: Math.round(125_000 * 0.125),
        regime: "both",
        maxBenefit: Math.round(125_000 * 0.125),
        utilizedPct: 0,
      });
    }

    return tips.sort((a, b) => (b.saving || 0) - (a.saving || 0));
  }, [
    deductions,
    annualIncome,
    taxOldResult.taxable,
    regimeVerdict,
    activeRegime,
    currentTax,
    d80DCap,
  ]);

  /* ── Export Actions ─────────────────────────────────────────── */
  const printTaxSummary = () => {
    const r = activeRegime === "new" ? taxNewResult : taxOldResult;
    const lines = [
      `=============================================================`,
      `              ITR TAX COMPUTATION SUMMARY — FY ${fy}`,
      `=============================================================`,
      `Active Tax Regime   : ${activeRegime === "new" ? "New Tax Regime (Section 115BAC - Default)" : "Old Tax Regime (With Full Chapter VI-A)"}`,
      `Gross Annual Income : ${fmtINRFull(annualIncome)}`,
      `Standard Deduction  : - ${fmtINRFull(r.stdDed)}`,
      activeRegime === "old"
        ? `Other Deductions    : - ${fmtINRFull(totalOldDeductions - stdDedOld)}`
        : "",
      `-------------------------------------------------------------`,
      `TAXABLE TOTAL INCOME: ${fmtINRFull(r.taxable)}`,
      `-------------------------------------------------------------`,
      `SLAB-WISE TAX BREAKDOWN:`,
      ...r.slabs
        .filter((s: any) => s.incomeInSlab > 0 || s.rate === 0)
        .map((s: any) => {
          const pad = " ".repeat(Math.max(0, 26 - s.label.length));
          return `  ${s.label}${pad}: ${fmtINRFull(s.taxInSlab)}`;
        }),
      `-------------------------------------------------------------`,
      `Tax on Slab Income  : ${fmtINRFull(r.tax + (r.rebateApplied ? r.rebateAmount : 0))}`,
      r.rebateApplied ? `Section 87A Rebate  : - ${fmtINRExact(r.rebateAmount)}` : "",
      r.surcharge > 0 ? `Surcharge           : + ${fmtINRFull(r.surcharge)}` : "",
      `Health & Edu. Cess  : + ${fmtINRFull(r.cess)} (4%)`,
      `-------------------------------------------------------------`,
      `NET TAX LIABILITY   : ${fmtINRFull(r.total)} (Eff. Rate: ${r.effectiveRate.toFixed(2)}%)`,
      `-------------------------------------------------------------`,
      `TAXES PAID & ADVANCE TAX:`,
      `  TDS Deducted      : ${fmtINRFull(totalTDS)}`,
      `  Advance Tax Paid  : ${fmtINRFull(totalAdvancePaid)}`,
      `  Self-Assessment   : ${fmtINRFull(totalSelfAssessment)}`,
      `  Total Paid to Date: ${fmtINRFull(totalPaidSoFar)}`,
      `  NET BALANCE DUE   : ${fmtINRFull(remainingAdvance)}`,
      `=============================================================`,
      `Generated via ArthaDrishti by Anand Mohta · ${new Date().toLocaleDateString("en-IN")}`,
    ]
      .filter((l) => l !== "")
      .join("\n");

    const w = window.open("", "_blank", "width=650,height=750");
    if (w) {
      w.document.write(
        `<html><head><title>Tax Summary FY ${fy}</title>` +
          `<style>body{font-family:'Courier New',monospace;padding:32px;background:#090d16;color:#e2e8f0;font-size:13px;line-height:1.7}` +
          `h2{color:#d4af37;margin-bottom:8px}pre{white-space:pre-wrap;margin:0}` +
          `@media print{body{background:#fff;color:#000}}</style></head>` +
          `<body><h2>Income Tax Statement — FY ${fy}</h2><pre>${lines}</pre>` +
          `<script>setTimeout(()=>window.print(),300);</script></body></html>`
      );
      w.document.close();
    }
  };

  const downloadCGCsv = () => {
    const header =
      "name,type,buy_date,sell_date,holding_days,buy_price,sell_price,qty,profit,gain_type";
    const rows = realizedGainsData.allSells.map(
      (s: any) =>
        `"${String(s.name || "").replace(/"/g, '""')}","${s.type}",${s.buyDate || ""},${s.sellDate || ""},${s.days},${s.buyPrice},${s.sellPrice},${s.qty},${s.profit},${s.isLtcg ? "LTCG" : "STCG"}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capital_gains_schedule_FY${fy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER: EXECUTIVE HEADER & MASTER COCKPIT
     ══════════════════════════════════════════════════════════════ */

  return (
    <div className="tab-content-enter">
      {/* ── Unified Tax Suite Navigation Header ─────────────────── */}
      <TaxSuiteHeader activeTab="tax" setTab={setTab} />

      {/* ── Section Title & Global Toolbar ──────────────────────── */}
      <SectionTitle
        sub={
          subTab === "overview"
            ? `FY ${fy} · Executive overview, New vs Old Regime optimizer & Advance Tax radar`
            : subTab === "heads"
              ? `FY ${fy} · 5 Heads of Income & Chapter VI-A statutory deductions hub`
              : subTab === "capitalGains"
                ? `FY ${fy} · Post-Budget 2024 Capital Gains (STCG/LTCG) & Tax-Loss Harvesting Lab`
                : subTab === "advanceTax"
                  ? `FY ${fy} · Advance tax instalments schedule, Section 234 penalty radar & payment ledger`
                  : subTab === "reconciler"
                    ? `FY ${fy} · Reconcile Form 26AS & AIS records with internal ledgers`
                    : `FY ${fy} · Tax planning calculators & ITR filing readiness checklist`
        }
        rightElement={
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select
              className="form-input"
              value={fy}
              onChange={(e) => setFy(e.target.value)}
              aria-label="Select financial year"
              style={{
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 700,
                minWidth: 130,
                borderRadius: "var(--radius-md)",
              }}
            >
              {availableFYs.map((f) => (
                <option key={f} value={f}>
                  FY {f}
                </option>
              ))}
            </select>

            {hasNewRegime && (
              <div
                style={{
                  display: "flex",
                  background: "var(--surface-0)",
                  padding: 3,
                  borderRadius: "var(--radius-md)",
                  border: `1.5px solid ${THEME.line}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleRegimeChange("new")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: activeRegime === "new" ? THEME.accent : "transparent",
                    color: activeRegime === "new" ? "#fff" : THEME.muted,
                    transition: "all 0.2s ease",
                  }}
                >
                  New Regime
                </button>
                <button
                  type="button"
                  onClick={() => handleRegimeChange("old")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: activeRegime === "old" ? THEME.gold : "transparent",
                    color: activeRegime === "old" ? "#fff" : THEME.muted,
                    transition: "all 0.2s ease",
                  }}
                >
                  Old Regime
                </button>
              </div>
            )}

            <Button
              size="sm"
              variant="secondary"
              icon={<FileText size={14} />}
              onClick={printTaxSummary}
              title="Print Tax Computation Sheet"
            >
              ITR Sheet
            </Button>

            <Button
              size="sm"
              variant="accent"
              icon={<Plus size={14} />}
              onClick={() => setShowModal(true)}
            >
              Record Payment
            </Button>
          </div>
        }
      >
        Tax Vault
      </SectionTitle>

      {/* ── 5 Master Executive KPI StatCards ──────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Gross Income (5 Heads)"
          value={fmtINRFull(annualIncome)}
          numericValue={annualIncome}
          formatValue={fmtINRFull}
          icon={<Briefcase />}
          color={THEME.accent}
          sub={incomeOverride ? "Manual override active" : "Auto-computed from salary & rentals"}
        />
        <StatCard
          label="Total Deductions & Exemptions"
          value={fmtINRFull(activeRegime === "new" ? getNewStdDed(fyStartYear) : totalOldDeductions)}
          numericValue={activeRegime === "new" ? getNewStdDed(fyStartYear) : totalOldDeductions}
          formatValue={fmtINRFull}
          icon={<Shield />}
          color={THEME.gold}
          sub={
            activeRegime === "new"
              ? `₹${getNewStdDed(fyStartYear) / 1000}K std deduction (New Regime)`
              : `80C + 80D + HRA + NPS + Std Ded`
          }
        />
        <StatCard
          label="Net Tax Liability"
          value={fmtINRFull(currentTax)}
          numericValue={currentTax}
          formatValue={fmtINRFull}
          icon={<Calculator />}
          color={currentTax === 0 ? THEME.sage : THEME.rust}
          sub={`${currentResult.effectiveRate.toFixed(1)}% eff. rate · ${activeRegime === "new" ? "New" : "Old"} regime`}
        />
        <StatCard
          label="TDS & Advance Paid"
          value={fmtINRFull(totalPaidSoFar)}
          numericValue={totalPaidSoFar}
          formatValue={fmtINRFull}
          icon={<CheckCircle2 />}
          color={THEME.sage}
          sub={`${progressPct.toFixed(0)}% paid · TDS: ${fmtINR(totalTDS)}`}
        />
        <StatCard
          label={remainingAdvance <= 0 ? "Tax Position" : "Balance Due u/s 234"}
          value={remainingAdvance <= 0 ? "Fully Settled ✓" : fmtINRFull(remainingAdvance)}
          numericValue={remainingAdvance}
          formatValue={typeof remainingAdvance === "number" ? fmtINRFull : undefined}
          icon={<AlertTriangle />}
          color={remainingAdvance > 0 ? THEME.rust : THEME.sage}
          sub={remainingAdvance > 0 ? "Pay via Challan 280 / e-Pay" : "Zero pending liability"}
        />
      </div>

      {/* ── Sub-Tab Navigation Bar ───────────────────────────────── */}
      <div className="demat-portfolio-bar no-scrollbar" style={{ marginBottom: 24 }}>
        {[
          { id: "overview", label: "Overview & Regime Matrix", icon: Shield },
          { id: "heads", label: "5-Heads & Deductions", icon: Layers },
          { id: "capitalGains", label: "Capital Gains & Harvesting", icon: TrendingUp },
          { id: "advanceTax", label: "Advance Tax & Payments", icon: Calendar },
          { id: "reconciler", label: "26AS & AIS Reconciler", icon: RefreshCw },
          { id: "toolkit", label: "Tax Planning Toolkit", icon: Lightbulb },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`demat-portfolio-pill ${subTab === id ? "active" : ""}`}
            onClick={() => setSubTab(id as any)}
          >
            <Icon size={15} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          VIEW 1: EXECUTIVE OVERVIEW & REGIME MATRIX
         ══════════════════════════════════════════════════════════════ */}
      {subTab === "overview" && (
        <div className="tab-content-enter" style={{ display: "grid", gap: 24 }}>
          {/* 1. Regime Advisor Banner */}
          {hasNewRegime && regimeVerdict && annualIncome > 0 && (
            <Card
              style={{
                padding: 0,
                overflow: "hidden",
                borderRadius: 16,
                border: `1.5px solid ${
                  regimeVerdict.better === "new"
                    ? `color-mix(in srgb, ${THEME.accent} 20%, transparent)`
                    : `color-mix(in srgb, ${THEME.gold} 20%, transparent)`
                }`,
              }}
            >
              <div
                style={{
                  height: 4,
                  background:
                    regimeVerdict.better === "new"
                      ? `linear-gradient(90deg, ${THEME.accent}, ${THEME.sage})`
                      : `linear-gradient(90deg, ${THEME.gold}, ${THEME.accent})`,
                }}
              />
              <div style={{ padding: "24px 28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Award size={24} color={THEME.accent} />
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink }}>
                        CFO Tax Regime Recommendation Engine
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>
                        Statutory analysis for FY {fy} · Incorporates Finance Act 2024 slab adjustments
                      </div>
                    </div>
                  </div>
                  {regimeVerdict.better !== "equal" && (
                    <Badge
                      variant={regimeVerdict.better === "new" ? "accent" : "gold"}
                      style={{ fontSize: 13, padding: "6px 16px", fontWeight: 800 }}
                    >
                      ★ {regimeVerdict.better === "new" ? "New Regime" : "Old Regime"} Saves More
                    </Badge>
                  )}
                </div>

                {/* Side-by-Side Regime Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
                  {/* New Regime Card */}
                  <div
                    style={{
                      padding: 22,
                      borderRadius: 14,
                      background:
                        regimeVerdict.better === "new"
                          ? `color-mix(in srgb, ${THEME.accent} 6%, transparent)`
                          : "var(--surface-0)",
                      border: `1.5px solid ${
                        regimeVerdict.better === "new"
                          ? `color-mix(in srgb, ${THEME.accent} 25%, transparent)`
                          : THEME.line
                      }`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: THEME.accent }}>
                        New Tax Regime (Section 115BAC)
                      </span>
                      {regimeVerdict.better === "new" && <Badge variant="accent">Recommended</Badge>}
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: THEME.accent }}>
                      <Money value={taxNewResult.total} variant="full" />
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 8, lineHeight: 1.6 }}>
                      Standard Deduction: <Money value={getNewStdDed(fyStartYear)} variant="full" /> · Taxable Income: <Money value={taxNewResult.taxable} variant="full" />
                      <br />
                      Effective Tax Rate: <b>{taxNewResult.effectiveRate.toFixed(2)}%</b>
                    </div>
                    {taxNewResult.rebateApplied && (
                      <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: THEME.sage }}>
                        ✓ Full Section 87A rebate applied (₹0 net tax up to threshold)
                      </div>
                    )}
                  </div>

                  {/* Old Regime Card */}
                  <div
                    style={{
                      padding: 22,
                      borderRadius: 14,
                      background:
                        regimeVerdict.better === "old"
                          ? `color-mix(in srgb, ${THEME.gold} 6%, transparent)`
                          : "var(--surface-0)",
                      border: `1.5px solid ${
                        regimeVerdict.better === "old"
                          ? `color-mix(in srgb, ${THEME.gold} 25%, transparent)`
                          : THEME.line
                      }`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: THEME.gold }}>
                        Old Tax Regime (With Deductions)
                      </span>
                      {regimeVerdict.better === "old" && <Badge variant="gold">Recommended</Badge>}
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: THEME.gold }}>
                      <Money value={taxOldResult.total} variant="full" />
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 8, lineHeight: 1.6 }}>
                      Total Deductions: <Money value={totalOldDeductions} variant="full" /> · Taxable Income: <Money value={taxOldResult.taxable} variant="full" />
                      <br />
                      Effective Tax Rate: <b>{taxOldResult.effectiveRate.toFixed(2)}%</b>
                    </div>
                    {taxOldResult.rebateApplied && (
                      <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: THEME.sage }}>
                        ✓ Full Section 87A rebate applied
                      </div>
                    )}
                  </div>
                </div>

                {/* Savings Callout */}
                {regimeVerdict.saving > 0 && (
                  <div
                    style={{
                      marginTop: 18,
                      padding: "14px 18px",
                      borderRadius: 12,
                      background:
                        regimeVerdict.better === "new"
                          ? `color-mix(in srgb, ${THEME.accent} 8%, transparent)`
                          : `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${regimeVerdict.better === "new" ? THEME.accent : THEME.gold} 20%, transparent)`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Zap size={20} color={regimeVerdict.better === "new" ? THEME.accent : THEME.gold} />
                      <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                        {regimeVerdict.better === "new" ? "New Regime" : "Old Regime"} saves you{" "}
                        <span style={{ color: regimeVerdict.better === "new" ? THEME.accent : THEME.gold }}>
                          <Money value={regimeVerdict.saving} variant="full" />
                        </span>{" "}
                        in tax for FY {fy}.
                      </div>
                    </div>
                    {activeRegime !== regimeVerdict.better && (
                      <Button
                        size="sm"
                        variant={regimeVerdict.better === "new" ? "accent" : "gold"}
                        onClick={() => handleRegimeChange(regimeVerdict.better as any)}
                      >
                        Switch to {regimeVerdict.better === "new" ? "New Regime" : "Old Regime"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* 2. Indifference & Crossover Curve Visualizer */}
          {hasNewRegime && annualIncome > 0 && (
            <Card style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink }}>
                    Regime Crossover & Indifference Curve
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted }}>
                    Shows how tax liability changes as you increase Chapter VI-A deductions (Old vs New Regime)
                  </div>
                </div>
                <Badge variant="muted">Income: {fmtL(annualIncome)}</Badge>
              </div>
              <div style={{ height: 260, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={crossoverData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                    <XAxis dataKey="label" stroke={THEME.muted} fontSize={11} />
                    <YAxis
                      stroke={THEME.muted}
                      fontSize={11}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface-0)",
                        borderColor: THEME.line,
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(val: any) => [fmtINRFull(Number(val)), "Tax Liability"]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="newTax"
                      name="New Regime Tax"
                      stroke={THEME.accent}
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="oldTax"
                      name="Old Regime Tax"
                      stroke={THEME.gold}
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* 3. Hero Advance Tax Progress Radar */}
          <div className="tv-hero-grid-2">
            <Card
              variant="base"
              style={{
                padding: 28,
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 95%, var(--t-accent) 5%), var(--surface-0))",
                border: `1px solid ${THEME.line}`,
                borderTop: `4px solid ${THEME.accent}`,
                borderRadius: "var(--radius-xl)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: THEME.muted,
                    marginBottom: 8,
                  }}
                >
                  Net Advance Tax Remaining
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(36px, 4.5vw, 52px)",
                    fontWeight: 900,
                    color: remainingAdvance > 0 ? THEME.rust : THEME.sage,
                    marginBottom: 4,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.05,
                  }}
                >
                  <Money value={animatedRemainingAdvance} variant="full" />
                </div>
                <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <Shield size={14} color={THEME.accent} /> Gross Tax: <Money value={currentTax} variant="full" /> · TDS Credited: <Money value={totalTDS} variant="full" />
                </div>
              </div>
              <div style={{ marginTop: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted, fontWeight: 800, textTransform: "uppercase", marginBottom: 8 }}>
                  <span>Payment Fulfillment</span>
                  <span>{progressPct.toFixed(0)}%</span>
                </div>
                <div style={{ height: 8, background: THEME.line, borderRadius: 10, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(0, progressPct))}%`,
                      background: `linear-gradient(90deg, ${THEME.accent}, ${THEME.sage})`,
                      borderRadius: 10,
                      transition: "width 0.8s var(--ease-premium)",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", fontWeight: 700 }}>
                      TDS Deducted
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                      <Money value={totalTDS} variant="full" />
                    </div>
                  </div>
                  <div style={{ width: 1, background: THEME.line }} />
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", fontWeight: 700 }}>
                      Advance Paid
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                      <Money value={totalAdvancePaid} variant="full" />
                    </div>
                  </div>
                  {totalSelfAssessment > 0 && (
                    <>
                      <div style={{ width: 1, background: THEME.line }} />
                      <div>
                        <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", fontWeight: 700 }}>
                          Self-Assessment
                        </div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                          <Money value={totalSelfAssessment} variant="full" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>

            {/* Advance Tax Schedule Timeline */}
            <Card style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>
                  Advance Tax Statutory Schedule
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {installments.map((inst) => {
                    const isPaid = totalAdvancePaid >= inst.amt;
                    const isPartial = totalAdvancePaid > 0 && totalAdvancePaid < inst.amt;
                    return (
                      <div
                        key={inst.q}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          borderRadius: 10,
                          background: "rgba(128,128,128,0.03)",
                          border: `1px solid ${THEME.line}`,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: isPaid
                              ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)`
                              : `color-mix(in srgb, ${THEME.gold} 12%, transparent)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {isPaid ? (
                            <CheckCircle2 size={16} color={THEME.sage} />
                          ) : (
                            <Calendar size={16} color={THEME.gold} />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: 13 }}>
                            {inst.q} · <span style={{ color: THEME.muted }}>By {inst.due}</span>
                          </div>
                          <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                            Cumulative {inst.pct}% · <Money value={inst.amt} variant="full" />
                          </div>
                        </div>
                        {isPaid && <Badge variant="sage">Paid ✓</Badge>}
                        {!isPaid && isPartial && <Badge variant="gold">Shortfall</Badge>}
                      </div>
                    );
                  })}
                </div>
              </div>
              {!isAdvanceTaxApplicable && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                    color: THEME.sage,
                    fontSize: 11,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Shield size={14} /> Advance Tax not mandatory (Net Liability &lt; ₹10,000)
                </div>
              )}
            </Card>
          </div>

          {/* 4. Tax Computation Line-by-Line Breakdown */}
          <div>
            <div
              onClick={() => setShowBreakdown((b) => !b)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowBreakdown((b) => !b);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                padding: "16px 20px",
                background: "var(--surface-0)",
                borderRadius: 14,
                border: `1px solid ${THEME.line}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Calculator size={20} color={THEME.accent} />
                <span style={{ fontSize: 15, fontWeight: 900, color: THEME.ink }}>
                  Tax Computation Waterfall — Line by Line Breakdown
                </span>
                <Badge variant="muted">
                  {activeRegime === "new" ? "New Regime Slabs" : "Old Regime Slabs"}
                </Badge>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {showBreakdown ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>

            {showBreakdown && (
              <div style={{ marginTop: 14 }}>
                <Card style={{ padding: 24 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: hasNewRegime ? "repeat(auto-fit, minmax(280px, 1fr))" : "1fr",
                      gap: 24,
                    }}
                  >
                    {hasNewRegime && (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: THEME.accent, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: THEME.accent }} />
                          New Tax Regime · FY {fy}
                        </div>
                        <SlabBreakdownTable result={taxNewResult} regime="new" />
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.gold, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: THEME.gold }} />
                        Old Tax Regime · FY {fy}
                      </div>
                      <SlabBreakdownTable result={taxOldDisplay} regime="old" />
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW 2: 5-HEADS INCOME & CHAPTER VI-A DEDUCTIONS
         ══════════════════════════════════════════════════════════════ */}
      {subTab === "heads" && (
        <div className="tab-content-enter" style={{ display: "grid", gap: 24 }}>
          {/* Income Source Decomposition */}
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink }}>
                  5 Heads of Income Decomposition
                </div>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  Indian Income Tax statutory heads (Salary, House Property, Capital Gains, Business, Other)
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Field label="Annual Income Override" style={{ marginBottom: 0 }}>
                  <input
                    className="form-input"
                    type="number"
                    placeholder={detectedIncome > 0 ? `Auto: ${fmtINR(detectedIncome)}` : "e.g. 1500000"}
                    value={incomeOverride}
                    onChange={(e) => setIncomeOverride(e.target.value)}
                    style={{ padding: "6px 12px", width: 160 }}
                  />
                </Field>
                {incomeOverride && (
                  <Button size="sm" variant="ghost" onClick={() => setIncomeOverride("")}>
                    Reset
                  </Button>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              {[
                {
                  head: "1. Income from Salary",
                  amt: annualIncome,
                  sub: "Gross salary & perks",
                  icon: Briefcase,
                  color: THEME.accent,
                },
                {
                  head: "2. House Property",
                  amt: housePropertyNet,
                  sub: "Net of 30% std ded & interest",
                  icon: Home,
                  color: THEME.gold,
                },
                {
                  head: "3. Capital Gains",
                  amt: realizedGainsData.stcgGains + realizedGainsData.ltcgGains,
                  sub: `STCG: ${fmtINR(realizedGainsData.stcgGains)} · LTCG: ${fmtINR(realizedGainsData.ltcgGains)}`,
                  icon: TrendingUp,
                  color: THEME.sage,
                },
                {
                  head: "4. Business / Profession",
                  amt: 0,
                  sub: "Presumptive 44AD/44ADA",
                  icon: Building2,
                  color: THEME.muted,
                },
                {
                  head: "5. Other Sources",
                  amt: Number(deductions.d80TTA) || 0,
                  sub: "Savings interest & dividends",
                  icon: Landmark,
                  color: THEME.muted,
                },
              ].map((h) => (
                <div
                  key={h.head}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: "rgba(128,128,128,0.03)",
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <h.icon size={16} color={h.color} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>{h.head}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 900, color: THEME.ink }}>
                    <Money value={h.amt} variant="full" />
                  </div>
                  <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>{h.sub}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Chapter VI-A Deduction Tracker */}
          <Card style={{ padding: 24, borderTop: `4px solid ${THEME.gold}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink }}>
                  Chapter VI-A Statutory Deductions (Old Regime)
                </div>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  Auto-detected from your portfolio holdings, insurance policies, loans & rent receipts
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {setTab && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Award size={14} />}
                    onClick={() => setTab("sec80")}
                  >
                    Open 80C / 80D Tracker →
                  </Button>
                )}
                <Badge variant={activeRegime === "old" ? "gold" : "muted"}>
                  {activeRegime === "old" ? "Active Tax Shield" : "Reference Only (New Regime Active)"}
                </Badge>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
              {/* 80C */}
              <div style={{ gridColumn: "1/-1" }}>
                <Field label="Section 80C — EPF, PPF, ELSS, Life Insurance, SCSS (Max ₹1.50 Lakh)">
                  <input
                    className="form-input"
                    type="number"
                    value={deductions.d80C}
                    onChange={(e) => setDed("d80C", e.target.value)}
                    onBlur={(e) =>
                      handleDeductionBlur("d80C", Number(e.target.value) || 0, e.target.value === "")
                    }
                  />
                </Field>
                {(() => {
                  const used = Math.min(Number(deductions.d80C) || 0, 150_000);
                  const pct = Math.min(100, (used / 150_000) * 100);
                  const remaining = Math.max(0, 150_000 - used);
                  return (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                        <span style={{ color: pct >= 100 ? THEME.sage : THEME.gold }}>
                          {pct.toFixed(0)}% utilized · <Money value={used} variant="full" /> of ₹1.50L
                        </span>
                        <span style={{ color: THEME.muted }}>
                          {remaining > 0 ? (
                            <>
                              <Money value={remaining} variant="full" /> room left
                            </>
                          ) : (
                            "Fully utilized ✓"
                          )}
                        </span>
                      </div>
                      <div className="progress-track" style={{ height: 6 }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: pct >= 100 ? THEME.sage : THEME.gold,
                          }}
                        />
                      </div>
                      {autoDetected.d80C_sources && (
                        <div style={{ fontSize: 11, color: THEME.accent, fontWeight: 700, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                          <Zap size={11} /> Auto-detected: {maskCurrencyInText(autoDetected.d80C_sources, privacyMode)}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* 80D */}
              <div>
                <Field label={`Section 80D — Health Insurance (Max ₹${d80DCap / 1000}K)`}>
                  <input
                    className="form-input"
                    type="number"
                    value={deductions.d80D}
                    onChange={(e) => setDed("d80D", e.target.value)}
                    onBlur={(e) =>
                      handleDeductionBlur("d80D", Number(e.target.value) || 0, e.target.value === "")
                    }
                  />
                </Field>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: THEME.muted, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={!!deductions.d80DSenior}
                    onChange={toggleD80DSenior}
                    style={{ width: 14, height: 14, accentColor: THEME.accent }}
                  />
                  Self or parents is senior citizen (60+) — cap raised to ₹50K
                </label>
              </div>

              {/* HRA */}
              <div>
                <Field label="HRA Exemption u/s 10(13A)">
                  <input
                    className="form-input"
                    type="number"
                    value={deductions.hra}
                    onChange={(e) => setDed("hra", e.target.value)}
                    onBlur={(e) =>
                      handleDeductionBlur("hra", Number(e.target.value) || 0, e.target.value === "")
                    }
                  />
                </Field>
                {autoDetected.hra_source && (
                  <div style={{ fontSize: 10, color: THEME.accent, fontWeight: 700, marginTop: 2 }}>
                    <Zap size={10} style={{ verticalAlign: -1 }} /> Auto: {autoDetected.hra_source}
                  </div>
                )}
              </div>

              {/* Home Loan 24b */}
              <div>
                <Field label="Section 24(b) — Home Loan Interest (Max ₹2.00L)">
                  <input
                    className="form-input"
                    type="number"
                    value={deductions.homeLoan}
                    onChange={(e) => setDed("homeLoan", e.target.value)}
                    onBlur={(e) =>
                      handleDeductionBlur("homeLoan", Number(e.target.value) || 0, e.target.value === "")
                    }
                  />
                </Field>
                {autoDetected.homeLoan_source && (
                  <div style={{ fontSize: 10, color: THEME.accent, fontWeight: 700, marginTop: 2 }}>
                    <Zap size={10} style={{ verticalAlign: -1 }} /> Auto: {autoDetected.homeLoan_source}
                  </div>
                )}
              </div>

              {/* NPS 80CCD(1B) */}
              <div>
                <Field label="NPS Individual — 80CCD(1B) (Max ₹50,000)">
                  <input
                    className="form-input"
                    type="number"
                    value={deductions.nps}
                    onChange={(e) => setDed("nps", e.target.value)}
                    onBlur={(e) =>
                      handleDeductionBlur("nps", Number(e.target.value) || 0, e.target.value === "")
                    }
                  />
                </Field>
              </div>

              {/* NPS Employer 80CCD(2) */}
              <div>
                <Field label={`NPS Employer — 80CCD(2) (${activeRegime === "new" ? "14%" : "10%"} of Basic)`}>
                  <input
                    className="form-input"
                    type="number"
                    value={deductions.d80CCD2 || 0}
                    onChange={(e) => setDed("d80CCD2", e.target.value)}
                    onBlur={(e) =>
                      handleDeductionBlur("d80CCD2", Number(e.target.value) || 0, e.target.value === "")
                    }
                  />
                </Field>
                <div style={{ fontSize: 10, color: THEME.sage, fontWeight: 700, marginTop: 2 }}>
                  ✓ Permissible in both New and Old regimes
                </div>
              </div>

              {/* 80TTA */}
              <div>
                <Field label="Section 80TTA — Savings Bank Interest (Max ₹10,000)">
                  <input
                    className="form-input"
                    type="number"
                    value={deductions.d80TTA || 0}
                    onChange={(e) => setDed("d80TTA", e.target.value)}
                    onBlur={(e) =>
                      handleDeductionBlur("d80TTA", Number(e.target.value) || 0, e.target.value === "")
                    }
                  />
                </Field>
              </div>
            </div>
          </Card>

          {/* CFO Tax Saving Tips Opportunities */}
          {taxSavingTips.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <Lightbulb size={20} color={THEME.gold} />
                <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>
                  CFO Tax Optimization Opportunities ({taxSavingTips.length})
                </h3>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {taxSavingTips.map((tip) => {
                  const isExpanded = expandedTipId === tip.id;
                  return (
                    <div
                      key={tip.id}
                      style={{
                        borderRadius: 14,
                        background: "var(--surface-0)",
                        border: `1.5px solid ${isExpanded ? THEME.gold : THEME.line}`,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        onClick={() => setExpandedTipId(isExpanded ? null : tip.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "16px 20px",
                          cursor: "pointer",
                        }}
                      >
                        <tip.icon size={22} color={THEME.gold} style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                            <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                              {tip.title}
                            </span>
                            <Badge variant={tip.priority === "high" ? "rust" : "gold"}>
                              {tip.priority} priority
                            </Badge>
                            <Badge variant="muted">
                              {tip.regime === "both" ? "Both Regimes" : tip.regime === "old" ? "Old Regime" : "New Regime"}
                            </Badge>
                          </div>
                          <div style={{ fontSize: 12, color: THEME.muted }}>
                            {maskCurrencyInText(tip.shortDesc, privacyMode)}
                          </div>
                        </div>
                        {tip.saving && (
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                              Potential Saving
                            </div>
                            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 900, color: THEME.sage }}>
                              ~<Money value={tip.saving} variant="full" />
                            </div>
                          </div>
                        )}
                        <div style={{ color: THEME.muted }}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: "0 20px 18px", borderTop: `1px solid ${THEME.line}` }}>
                          <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.7, marginTop: 12 }}>
                            {tip.fullDesc}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW 3: CAPITAL GAINS & TAX-LOSS HARVESTING LAB
         ══════════════════════════════════════════════════════════════ */}
      {subTab === "capitalGains" && (
        <div className="tab-content-enter" style={{ display: "grid", gap: 24 }}>
          {/* Post-Budget 2024 Notice */}
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 12,
              background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1 }}>
              <Info size={18} color={THEME.accent} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 13, color: THEME.ink, lineHeight: 1.6 }}>
                <b>Finance Act 2024 Capital Gains Rates (Effective 23-Jul-2024):</b> Listed equity STCG is taxed at <b>20%</b> (15% pre-23 Jul 2024). LTCG is taxed at <b>12.5%</b> (10% pre-23 Jul 2024) with an enhanced <b>₹1.25 Lakh annual exemption</b> u/s 112A. Debt mutual funds bought post-1 Apr 2023 are taxed at slab rates.
              </div>
            </div>
            {setTab && (
              <Button
                size="sm"
                variant="accent"
                icon={<TrendingUp size={14} />}
                onClick={() => setTab("capitalgains")}
              >
                Launch Capital Gains Hub →
              </Button>
            )}
          </div>

          {/* Hero Simulation Cockpit */}
          <div className="tv-hero-grid-2">
            <Card
              variant="base"
              style={{
                padding: 28,
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 95%, var(--t-sage) 5%), var(--surface-0))",
                border: `1px solid ${THEME.line}`,
                borderTop: `4px solid ${THEME.sage}`,
                borderRadius: "var(--radius-xl)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: THEME.muted,
                    marginBottom: 8,
                  }}
                >
                  <Sparkles size={14} color={THEME.sage} /> Simulated Tax Saved via Harvesting
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(36px, 4.5vw, 52px)",
                    fontWeight: 900,
                    color: THEME.sage,
                    marginBottom: 4,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.05,
                  }}
                >
                  <Money value={animatedTotalSaved} variant="full" />
                </div>
                <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 600 }}>
                  Actual Tax: <Money value={taxCalculations.actual.totalTax} variant="full" /> → Simulated: <Money value={taxCalculations.simulated.totalTax} variant="full" />
                </div>
              </div>
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted, fontWeight: 800, textTransform: "uppercase", marginBottom: 8 }}>
                  <span>Loss Offset Realized</span>
                  <span>
                    {taxCalculations.actual.totalTax > 0
                      ? `${Math.min(100, (taxCalculations.totalSaved / taxCalculations.actual.totalTax) * 100).toFixed(0)}%`
                      : "0%"}
                  </span>
                </div>
                <div style={{ height: 8, background: THEME.line, borderRadius: 10, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width:
                        taxCalculations.actual.totalTax > 0
                          ? `${Math.min(100, (taxCalculations.totalSaved / taxCalculations.actual.totalTax) * 100)}%`
                          : "0%",
                      background: `linear-gradient(90deg, ${THEME.sage}, ${THEME.accent})`,
                      borderRadius: 10,
                      transition: "width 0.8s var(--ease-premium)",
                    }}
                  />
                </div>
              </div>
            </Card>

            <Card style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: THEME.muted }}>
                    Simulation Summary
                  </span>
                  {simulatedHarvestIds.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setSimulatedHarvestIds([])}>
                      Reset
                    </Button>
                  )}
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: THEME.muted }}>Securities Selected</span>
                    <span style={{ fontWeight: 800 }}>{simulatedHarvestIds.length} Assets</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: THEME.muted }}>Simulated STCL Applied</span>
                    <span style={{ fontWeight: 800, color: THEME.rust }}>
                      -<Money value={taxCalculations.simulated.stcLossesAdded} variant="full" />
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: THEME.muted }}>Simulated LTCL Applied</span>
                    <span style={{ fontWeight: 800, color: THEME.rust }}>
                      -<Money value={taxCalculations.simulated.ltcLossesAdded} variant="full" />
                    </span>
                  </div>
                  <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800 }}>
                    <span>Simulated Net Tax</span>
                    <span style={{ color: THEME.sage }}>
                      <Money value={taxCalculations.simulated.totalTax} variant="full" />
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Loss Harvesting Candidates */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>
                  Tax-Loss Harvesting Optimizer
                </h3>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  Click on unrealized loss holdings to simulate selling and offsetting capital gains
                </div>
              </div>
              <Badge variant="muted">{harvestCandidates.length} Loss Candidates</Badge>
            </div>

            {harvestCandidates.length === 0 ? (
              <Card style={{ padding: "36px 0", textAlign: "center", color: THEME.muted }}>
                <PartyPopper size={28} style={{ marginBottom: 8, color: THEME.sage }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                  All portfolio holdings are profitable!
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  No loss harvesting offset required for FY {fy}.
                </div>
              </Card>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {harvestCandidates.map((cand) => {
                  const isSelected = simulatedHarvestIds.includes(cand.id);
                  const taxSavedEst = cand.isSlabTaxed
                    ? cand.loss * marginalRate
                    : cand.isLtcg
                      ? cand.loss * 0.125
                      : cand.loss * 0.2;
                  return (
                    <div
                      key={cand.id}
                      onClick={() =>
                        setSimulatedHarvestIds((prev) =>
                          prev.includes(cand.id)
                            ? prev.filter((x) => x !== cand.id)
                            : [...prev, cand.id]
                        )
                      }
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "14px 18px",
                        borderRadius: 12,
                        background: isSelected
                          ? `color-mix(in srgb, ${THEME.sage} 6%, transparent)`
                          : "var(--surface-0)",
                        border: `1.5px solid ${isSelected ? THEME.sage : THEME.line}`,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ width: 16, height: 16, accentColor: THEME.sage }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                            {cand.name}
                          </span>
                          <Badge variant="muted">{cand.type}</Badge>
                          <Badge variant={cand.isLtcg ? "muted" : "gold"}>
                            {cand.isLtcg ? "LTCG" : "STCG"}
                          </Badge>
                        </div>
                        <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                          Invested: <Money value={cand.invested} variant="full" /> · Current Value:{" "}
                          <Money value={cand.currentVal} variant="full" />
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", fontWeight: 700 }}>
                          Unrealized Loss
                        </div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 900, color: THEME.rust }}>
                          <Money value={cand.loss} variant="full" />
                        </div>
                        <div style={{ fontSize: 10, color: THEME.sage, fontWeight: 700 }}>
                          Saves ~<Money value={taxSavedEst} variant="full" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Realized Ledger Table */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>
                  Realized Capital Gains Ledger
                </h3>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  {realizedGainsData.allSells.length} sell transactions recorded for FY {fy}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={downloadCGCsv}>
                  Export CSV
                </Button>
              </div>
            </div>

            {realizedGainsData.allSells.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title={`No Realized Gains in FY ${fy}`}
                description="Sell transactions from Demat and Mutual Funds will appear here automatically."
              />
            ) : (
              <Card style={{ padding: 0, overflow: "hidden", borderRadius: 14 }}>
                <div className="mobile-table-wrap">
                  <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(128,128,128,0.03)", borderBottom: `1px solid ${THEME.line}` }}>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: THEME.muted }}>Asset Name</th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: THEME.muted }}>Classification</th>
                        <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 800, color: THEME.muted }}>Holding Days</th>
                        <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 800, color: THEME.muted }}>Buy Cost</th>
                        <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 800, color: THEME.muted }}>Sale Value</th>
                        <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 800, color: THEME.muted }}>Gain / Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {realizedGainsData.allSells.map((s: any, idx: number) => {
                        const isProfit = s.profit >= 0;
                        return (
                          <tr key={s.id || idx} className="table-row-hover" style={{ borderBottom: `1px solid ${THEME.line}` }}>
                            <td style={{ padding: "12px 16px", fontWeight: 800 }}>
                              <div>{s.name}</div>
                              <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 500 }}>
                                Sold {s.sellDate} · Qty: {s.qty}
                              </div>
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <Badge variant={s.isLtcg ? "muted" : "gold"}>
                                {s.isLtcg ? "LTCG" : "STCG"}
                              </Badge>
                            </td>
                            <td style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontWeight: 600 }}>
                              {s.days}d
                            </td>
                            <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>
                              <Money value={s.buyPrice * s.qty} variant="full" />
                            </td>
                            <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>
                              <Money value={s.sellPrice * s.qty} variant="full" />
                            </td>
                            <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, color: isProfit ? THEME.sage : THEME.rust }}>
                              {isProfit ? "+" : ""}
                              <Money value={s.profit} variant="full" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW 4: ADVANCE TAX & PAYMENTS LEDGER
         ══════════════════════════════════════════════════════════════ */}
      {subTab === "advanceTax" && (
        <div className="tab-content-enter" style={{ display: "grid", gap: 24 }}>
          {/* Section 234 Penalty Projector */}
          {netLiability >= 10000 && (
            <Card style={{ padding: 24, borderTop: `4px solid ${THEME.gold}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Scale size={20} color={THEME.gold} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>
                      Section 234A / 234B / 234C Statutory Penalty Radar
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted }}>
                      Statutory interest calculated for FY {fy} quarterly advance tax shortfalls
                    </div>
                  </div>
                </div>
              </div>
              {(() => {
                const now = new Date();
                const totalPenalty234C = calcSection234CPenalty(
                  fyStartYear,
                  netLiability,
                  totalAdvancePaid,
                  now
                );
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                    <div style={{ padding: 16, borderRadius: 12, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                      <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                        Net Tax Liability
                      </div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: THEME.ink, marginTop: 4 }}>
                        <Money value={netLiability} variant="full" />
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                        Gross tax minus TDS
                      </div>
                    </div>

                    <div style={{ padding: 16, borderRadius: 12, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                      <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                        Advance Tax Paid
                      </div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: THEME.sage, marginTop: 4 }}>
                        <Money value={totalAdvancePaid} variant="full" />
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                        Credited against liability
                      </div>
                    </div>

                    <div style={{ padding: 16, borderRadius: 12, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                      <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                        Section 234C Penalty
                      </div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: totalPenalty234C > 0 ? THEME.rust : THEME.sage, marginTop: 4 }}>
                        <Money value={totalPenalty234C} variant="full" />
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                        {totalPenalty234C > 0 ? "1% per month on shortfall" : "Zero penalty (on track)"}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Card>
          )}

          {/* Payment Log Ledger */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>
                  Tax Payments & TDS History
                </h3>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  {taxPayments.length} tax payments recorded for FY {fy}
                </div>
              </div>
              <Button size="sm" variant="accent" icon={<Plus size={14} />} onClick={() => setShowModal(true)}>
                Record Payment
              </Button>
            </div>

            {taxPayments.length === 0 ? (
              <EmptyState
                icon={History}
                title="No Tax Payments Logged Yet"
                description="Record your quarterly advance tax challans and TDS deductions here."
                buttonLabel="Record First Payment"
                onAdd={() => setShowModal(true)}
              />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))", gap: 14 }}>
                {taxPayments.map((p: any) => (
                  <Card
                    key={p.id}
                    style={{
                      padding: "16px 20px",
                      borderLeft: `4px solid ${p.type === "TDS" ? THEME.gold : THEME.sage}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 17, color: THEME.ink }}>
                            <Money value={p.amount} variant="exact" />
                          </span>
                          <Badge variant={p.type === "TDS" ? "gold" : "sage"}>
                            {p.type}
                          </Badge>
                        </div>
                        <div style={{ fontSize: 12, color: THEME.muted }}>
                          {p.date} · {p.note || p.bank || "Recorded Payment"}
                        </div>
                        {p.challanNo && (
                          <div style={{ fontSize: 11, color: THEME.accent, marginTop: 2 }}>
                            Challan: {p.challanNo}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDeletePayment(p)}
                        style={{ color: THEME.rust, padding: 6 }}
                        title="Delete record"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW 5: 26AS & AIS RECONCILER
         ══════════════════════════════════════════════════════════════ */}
      {subTab === "reconciler" && (
        <div className="tab-content-enter">
          <Reconciler26AS
            income={state.income || []}
            taxPayments={state.taxPayments || []}
            fy={fy}
            fyStartStr={fyStartStr}
            fyEndStr={fyEndStr}
            existingLedger={state.form26as || []}
            addItem={addItem}
            showToast={showToast}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW 6: TAX PLANNING TOOLKIT & ITR READINESS VAULT
         ══════════════════════════════════════════════════════════════ */}
      {subTab === "toolkit" && (
        <div className="tab-content-enter" style={{ display: "grid", gap: 24 }}>
          {/* Toolkit Tabs */}
          <div style={{ display: "flex", gap: 10, borderBottom: `1px solid ${THEME.line}`, paddingBottom: 12, flexWrap: "wrap" }}>
            {[
              { id: "hra", label: "HRA Calculator u/s 10(13A)", icon: Home },
              { id: "checklist", label: "ITR Filing Document Checklist", icon: FileCheck },
              { id: "surcharge", label: "Surcharge & Marginal Relief", icon: Scale },
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                size="sm"
                variant={activeToolkitTab === id ? "accent" : "ghost"}
                icon={<Icon size={14} />}
                onClick={() => setActiveToolkitTab(id as any)}
              >
                {label}
              </Button>
            ))}
          </div>

          {activeToolkitTab === "hra" && <HRACalculator />}

          {activeToolkitTab === "checklist" && (
            <Card style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink }}>
                    ITR Filing Document Vault & Readiness Checklist
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted }}>
                    Ensure you have all statutory certificates before filing your income tax return
                  </div>
                </div>
                {setTab && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<FileCheck size={14} />}
                    onClick={() => setTab("taxfiling")}
                  >
                    Open Full ITR Filing Helper →
                  </Button>
                )}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { id: "f16", title: "Form 16 (Part A & Part B)", desc: "Issued by employer showing total TDS deducted and salary breakup" },
                  { id: "ais", title: "AIS / TIS Statement", desc: "Annual Information Statement downloaded from the Income Tax portal" },
                  { id: "26as", title: "Form 26AS Tax Credit Statement", desc: "TRACES tax credit ledger showing all TDS, TCS, and Advance Tax paid" },
                  { id: "cg", title: "Capital Gains Statement", desc: "Realized P&L statement from Zerodha, Groww, CAMS, or KFintech" },
                  { id: "80d", title: "Health Insurance 80D Tax Certificate", desc: "Premium paid receipts for self, family, and senior citizen parents" },
                  { id: "hl", title: "Home Loan Provisional / Final Certificate", desc: "Principal (80C) and Interest (24b) breakup from the lending bank" },
                  { id: "rent", title: "Rent Receipts & Landlord PAN", desc: "Required for HRA claims exceeding ₹1.00 Lakh per annum" },
                  { id: "80g", title: "Form 10BE Donation Receipts (80G)", desc: "Certificates for eligible charitable donations made during the fiscal year" },
                ].map((item) => {
                  const isDone = !!checklistCompleted[item.id];
                  return (
                    <div
                      key={item.id}
                      onClick={() =>
                        setChecklistCompleted((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "12px 16px",
                        borderRadius: 10,
                        background: isDone
                          ? `color-mix(in srgb, ${THEME.sage} 6%, transparent)`
                          : "rgba(128,128,128,0.03)",
                        border: `1px solid ${isDone ? THEME.sage : THEME.line}`,
                        cursor: "pointer",
                      }}
                    >
                      {isDone ? (
                        <CheckSquare size={18} color={THEME.sage} />
                      ) : (
                        <Square size={18} color={THEME.muted} />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                          {item.desc}
                        </div>
                      </div>
                      <Badge variant={isDone ? "sage" : "muted"}>
                        {isDone ? "Ready ✓" : "Pending"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {activeToolkitTab === "surcharge" && (
            <Card style={{ padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 12 }}>
                High Net Worth Surcharge & Marginal Relief Rules
              </div>
              <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.7 }}>
                Under the Indian Income Tax Act, surcharges apply to individuals with high taxable income:
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  <li><b>₹50 Lakh to ₹1 Crore:</b> 10% surcharge on basic tax</li>
                  <li><b>₹1 Crore to ₹2 Crore:</b> 15% surcharge on basic tax</li>
                  <li><b>₹2 Crore to ₹5 Crore:</b> 25% surcharge on basic tax</li>
                  <li><b>Above ₹5 Crore:</b> 37% in Old Regime, capped at <b>25%</b> in New Regime (Finance Act 2023)</li>
                </ul>
                <b>Marginal Relief:</b> Tax + Surcharge cannot exceed the total tax payable on ₹50L/₹1Cr/₹2Cr plus the incremental income above the threshold.
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Modals & Dialogs ─────────────────────────────────────── */}
      {showModal && (
        <AddTaxPaymentModal
          onClose={() => setShowModal(false)}
          onSave={saveNewTaxPayment}
          saving={savingTaxPayment}
          fy={fy}
        />
      )}

      {confirmDeletePayment && (
        <ConfirmDialog
          message={`Delete tax payment of ${fmtINRFull(confirmDeletePayment.amount)} dated ${confirmDeletePayment.date}?`}
          onConfirm={() => {
            deleteTaxPayment(confirmDeletePayment.id);
            setConfirmDeletePayment(null);
          }}
          onCancel={() => setConfirmDeletePayment(null)}
        />
      )}
    </div>
  );
};
