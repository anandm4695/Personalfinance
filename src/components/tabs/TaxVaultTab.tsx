// @ts-nocheck
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
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { getCurrentFY, getCurrentFYStartYear } from "../../utils/appConstants";
import {
  fmtINRFull,
  fmtINRExact,
  calcTaxNewByFY,
  calcTaxOldByFY,
  today,
  uid,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Field } from "../ui/Form";
import { SectionTitle } from "../ui/SectionTitle";
import { Prv } from "../../context/PrivacyContext";
import { Modal, ModalActions } from "../ui/Modal";

// The capital-gains report below is built with document.write() from raw HTML strings —
// without this, a security/fund name containing e.g. <img onerror=...> (typeable directly,
// or arriving via a CSV/CAS import) would execute in the popup window.
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════════ */

// FY-aware std deduction lookup (old regime fixed at ₹50K from FY 2020-21)
const getOldStdDed = (fyStart: number) => (fyStart >= 2020 ? 50_000 : 40_000);
// New regime std deduction by FY
const getNewStdDed = (fyStart: number) => {
  if (fyStart >= 2024) return 75_000;
  if (fyStart >= 2023) return 50_000;
  return 0;
};

/* ══════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════ */

const fmtL = (n: number) => `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;

/** Estimate marginal slab rate for old regime based on taxable income */
const oldMarginalRate = (taxable: number) => {
  if (taxable <= 250_000) return 0;
  if (taxable <= 500_000) return 0.05;
  if (taxable <= 1_000_000) return 0.2;
  return 0.3;
};

/**
 * Section 234C advance-tax shortfall interest. Interest on a quarter's
 * shortfall is a STATUTORILY FIXED period — 3 months for Q1/Q2/Q3, 1 month
 * for Q4 — not a function of how long it's been since the due date. An
 * earlier version of this derived "months late" from (now - dueDate) and
 * capped it at 3 for every quarter, which (a) undercharged Q1-Q3 shortfalls
 * checked soon after their due date (e.g. only 1 month instead of the fixed
 * 3) and (b) overcharged Q4 by up to 3x, since Q4's fixed period is 1 month,
 * not 3.
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

// Equity-oriented fund detection (mirrors CapitalGainsTab.tsx's isEquityMF) —
// a fund without any of these keywords is treated as debt/non-equity, which
// carries a different (36-month, not 12-month) LTCG holding threshold and,
// for purchases on/after 1 Apr 2023, is always taxed as short-term at slab
// rate regardless of holding period (Finance Act 2023).
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
 * Classify a mutual fund sale/holding's capital-gains bucket for a given
 * holding-period length in days. Single source of truth for the two call
 * sites below (realizedGainsData and harvestCandidates) that both used to
 * duplicate — and had each independently gotten wrong — this logic:
 *   - Equity-oriented funds: LTCG threshold is 12 months (~365 days).
 *   - Debt funds bought on/after 1 Apr 2023 (Finance Act 2023): ALWAYS
 *     short-term, taxed at slab rate, regardless of holding period.
 *   - Debt funds bought before 1 Apr 2023: LTCG threshold is 36 months
 *     (~1095 days), not 12 — using the equity threshold here silently
 *     reclassified 12-36 month debt-fund STCG (slab-taxed) as LTCG
 *     (exemption-eligible, 10-12.5% rate).
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

/* ══════════════════════════════════════════════════════════════════
   ADD PAYMENT MODAL
   ══════════════════════════════════════════════════════════════════ */

const AddTaxPaymentModal = ({ onClose, onSave }: any) => {
  const [f, setF] = useState({ date: today(), type: "TDS", amount: "", note: "" });
  const types = ["TDS", "Advance Tax", "Self-Assessment", "Professional Tax"];
  return (
    <Modal title="Record Tax Payment" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Payment Date">
          <input
            className="form-input"
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </Field>
        <Field label="Type">
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
      </div>
      <Field label="Amount (₹)">
        <input
          className="form-input"
          type="number"
          placeholder="0"
          value={f.amount}
          onChange={(e) => setF({ ...f, amount: e.target.value })}
        />
      </Field>
      <Field label="Note / Reference">
        <input
          className="form-input"
          placeholder="e.g. Q2 Advance Tax, Salary TDS"
          value={f.note}
          onChange={(e) => setF({ ...f, note: e.target.value })}
        />
      </Field>
      <ModalActions
        onSave={() => f.amount && onSave({ ...f, id: uid() })}
        onClose={onClose}
        saveLabel="Record Payment"
      />
    </Modal>
  );
};

/* ══════════════════════════════════════════════════════════════════
   FORM 26AS RECONCILER
   ══════════════════════════════════════════════════════════════════ */

const Reconciler26AS = ({
  income,
  taxPayments,
  fy,
  fyStartStr,
  fyEndStr,
}: {
  income: any[];
  taxPayments: any[];
  fy: string;
  fyStartStr: string;
  fyEndStr: string;
}) => {
  const [rawText, setRawText] = useState("");
  const [parsed26AS, setParsed26AS] = useState<any[]>([]);
  const [parseError, setParseError] = useState("");

  // Filter to current FY
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

      // Detect delimiter
      const delimiter = lines[0].includes("\t") ? "\t" : ",";
      const splitRow = (line: string) =>
        line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));

      // Check if first line is header
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

        // Expected columns: TAN, Name of Deductor, Section, Transaction Date, Amount Paid, TDS Deducted
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

  // Reconciliation logic
  const reconciled = useMemo(() => {
    if (parsed26AS.length === 0) return null;

    const matched: any[] = [];
    const unmatchedIn26AS: any[] = [];
    const usedIncomeIds = new Set<string>();
    const usedTDSIds = new Set<string>();

    // Try to match each 26AS row against income entries and TDS payments
    parsed26AS.forEach((row) => {
      let foundIncome: any = null;
      let foundTDS: any = null;

      // Match by amount (within 5% tolerance) — income entries
      for (const inc of fyIncome) {
        if (usedIncomeIds.has(inc.id)) continue;
        const incAmt = Number(inc.amount || 0);
        if (incAmt > 0 && Math.abs(incAmt - row.amountPaid) / Math.max(incAmt, 1) < 0.05) {
          foundIncome = inc;
          break;
        }
      }

      // Match TDS amount
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

    // Find income/TDS entries missing from 26AS
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

  const thStyle = {
    padding: "8px 10px",
    borderBottom: `1.5px solid ${THEME.line}`,
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    color: THEME.muted,
    textAlign: "left" as const,
    whiteSpace: "nowrap" as const,
  };
  const tdStyle = {
    padding: "10px 10px",
    borderBottom: `1px solid ${THEME.line}`,
    fontSize: 12,
    verticalAlign: "middle" as const,
  };

  return (
    <div>
      {/* Instructions */}
      <div
        style={{
          padding: "10px 16px",
          borderRadius: 10,
          background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
          border: `1px solid color-mix(in srgb, ${THEME.accent} 13%, transparent)`,
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          marginBottom: 20,
          fontSize: 12,
          color: THEME.muted,
        }}
      >
        <Info size={15} color={THEME.accent} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          <b style={{ color: THEME.ink }}>Form 26AS Reconciliation</b> — Download your 26AS from the
          TRACES portal (incometax.gov.in), copy the TDS section data, and paste it below. The
          reconciler will match entries against your recorded income and TDS payments for{" "}
          <b>FY {fy}</b>.
        </span>
      </div>

      {/* Paste area */}
      <Card style={{ padding: 16, marginBottom: 20 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: THEME.muted,
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Paste 26AS Data
        </div>
        <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 10, lineHeight: 1.5 }}>
          Expected columns (comma or tab separated): TAN, Name of Deductor, Section, Transaction
          Date, Amount Paid, TDS Deducted
        </div>
        <textarea
          style={{
            width: "100%",
            height: 120,
            background: "var(--t-paper)",
            border: `1.5px solid ${THEME.line}`,
            borderRadius: 10,
            padding: "10px 14px",
            color: THEME.ink,
            fontSize: 12,
            outline: "none",
            fontFamily: "monospace",
            resize: "vertical",
            boxSizing: "border-box",
          }}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={
            "TAN, Deductor Name, Section, Date, Amount Paid, TDS Deducted\nABCD12345E, Acme Corp Ltd, 192, 15-Jun-2025, 500000, 50000"
          }
        />
        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
          <Button size="sm" variant="accent" onClick={parse26AS}>
            <RefreshCw size={13} style={{ marginRight: 4 }} />
            Reconcile
          </Button>
        </div>
      </Card>

      {parseError && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: `color-mix(in srgb, ${THEME.rust} 7%, transparent)`,
            color: THEME.rust,
            fontSize: 12,
            marginBottom: 16,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{parseError}</span>
        </div>
      )}

      {reconciled && (
        <div>
          {/* Summary cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <Card style={{ padding: "12px 16px", borderLeft: `3px solid ${THEME.sage}` }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Matched
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: THEME.sage, marginTop: 4 }}>
                {reconciled.matched.length}
              </div>
            </Card>
            <Card style={{ padding: "12px 16px", borderLeft: `3px solid ${THEME.gold}` }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Unmatched in 26AS
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: THEME.gold, marginTop: 4 }}>
                {reconciled.unmatchedIn26AS.length}
              </div>
            </Card>
            <Card style={{ padding: "12px 16px", borderLeft: `3px solid ${THEME.rust}` }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Missing from 26AS
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: THEME.rust, marginTop: 4 }}>
                {reconciled.missingFrom26AS.length}
              </div>
            </Card>
          </div>

          {/* Matched entries */}
          {reconciled.matched.length > 0 && (
            <Card style={{ padding: 0, marginBottom: 16, overflow: "hidden", borderRadius: 12 }}>
              <div
                style={{
                  padding: "10px 16px",
                  background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
                  borderBottom: `1px solid ${THEME.line}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircle2 size={14} color={THEME.sage} />
                <span style={{ fontSize: 12, fontWeight: 800, color: THEME.sage }}>
                  Matched ({reconciled.matched.length})
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>TAN</th>
                      <th style={thStyle}>Deductor</th>
                      <th style={thStyle}>Section</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>TDS</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciled.matched.map((r: any, i: number) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>
                          {r.tan}
                        </td>
                        <td style={tdStyle}>{r.deductor}</td>
                        <td style={{ ...tdStyle, color: THEME.muted }}>{r.section}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                          {fmtINRExact(r.amountPaid)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                          {fmtINRFull(r.tdsDeducted)}
                        </td>
                        <td style={tdStyle}>
                          <Badge variant="sage">Matched</Badge>
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
            <Card style={{ padding: 0, marginBottom: 16, overflow: "hidden", borderRadius: 12 }}>
              <div
                style={{
                  padding: "10px 16px",
                  background: `color-mix(in srgb, ${THEME.gold} 6%, transparent)`,
                  borderBottom: `1px solid ${THEME.line}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={14} color={THEME.gold} />
                <span style={{ fontSize: 12, fontWeight: 800, color: THEME.gold }}>
                  Unmatched in 26AS ({reconciled.unmatchedIn26AS.length})
                </span>
                <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 400 }}>
                  — Present in 26AS but no matching record found in your data
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>TAN</th>
                      <th style={thStyle}>Deductor</th>
                      <th style={thStyle}>Section</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>TDS</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciled.unmatchedIn26AS.map((r: any, i: number) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>
                          {r.tan}
                        </td>
                        <td style={tdStyle}>{r.deductor}</td>
                        <td style={{ ...tdStyle, color: THEME.muted }}>{r.section}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                          {fmtINRExact(r.amountPaid)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                          {fmtINRFull(r.tdsDeducted)}
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
            <Card style={{ padding: 0, marginBottom: 16, overflow: "hidden", borderRadius: 12 }}>
              <div
                style={{
                  padding: "10px 16px",
                  background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
                  borderBottom: `1px solid ${THEME.line}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={14} color={THEME.rust} />
                <span style={{ fontSize: 12, fontWeight: 800, color: THEME.rust }}>
                  Missing from 26AS ({reconciled.missingFrom26AS.length})
                </span>
                <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 400 }}>
                  — TDS you recorded but not found in the pasted 26AS data
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Note</th>
                      <th style={thStyle}>Date</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciled.missingFrom26AS.map((r: any, i: number) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{r.type}</td>
                        <td style={tdStyle}>{r.note || "—"}</td>
                        <td style={{ ...tdStyle, color: THEME.muted }}>{r.item.date || "—"}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                          {fmtINRExact(r.amount)}
                        </td>
                        <td style={tdStyle}>
                          <Badge variant="rust">Missing</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* All clear message */}
          {reconciled.unmatchedIn26AS.length === 0 &&
            reconciled.missingFrom26AS.length === 0 &&
            reconciled.matched.length > 0 && (
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.sage} 13%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: THEME.sage,
                }}
              >
                <CheckCircle2 size={16} />
                All {reconciled.matched.length} entries are perfectly reconciled. No discrepancies
                found.
              </div>
            )}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   SLAB BREAKDOWN TABLE
   ══════════════════════════════════════════════════════════════════ */

const SlabBreakdownTable = ({ result, regime }: { result: any; regime: "new" | "old" }) => {
  const accentColor = regime === "new" ? THEME.accent : THEME.gold;
  return (
    <div>
      {/* Income → Taxable */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 4,
          marginBottom: 16,
          paddingBottom: 16,
          borderBottom: `1px dashed ${THEME.line}`,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>
          Gross Annual Income
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, textAlign: "right" }}>
          {fmtINRFull(result.grossIncome)}
        </span>

        <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>
          {`Standard Deduction${regime === "old" ? " (Sec 16(ia))" : ""}`}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: THEME.rust, textAlign: "right" }}>
          - {fmtINRFull(result.stdDed)}
        </span>

        {regime === "old" && result.extraDeds > 0 && (
          <>
            <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>
              Other Deductions (80C, 80D, HRA…)
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.rust, textAlign: "right" }}>
              - {fmtINRFull(result.extraDeds)}
            </span>
          </>
        )}

        <div style={{ gridColumn: "1/-1", height: 1, background: THEME.line, margin: "4px 0" }} />

        <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>Taxable Income</span>
        <span style={{ fontSize: 14, fontWeight: 900, color: accentColor, textAlign: "right" }}>
          {fmtINRFull(result.taxable)}
        </span>
      </div>

      {/* Slab rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {result.slabs
          .filter((s: any) => s.incomeInSlab > 0)
          .map((slab: any, i: number) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 110px 90px",
                gap: 8,
                alignItems: "center",
                padding: "8px 10px",
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
                {fmtINRFull(slab.incomeInSlab)}
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontSize: 13,
                  fontWeight: 800,
                  color: slab.rate === 0 ? THEME.sage : THEME.ink,
                }}
              >
                {slab.rate === 0 ? "Nil" : fmtINRFull(slab.taxInSlab)}
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
          padding: "12px 0",
          borderTop: `1px dashed ${THEME.line}`,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>
          Tax on Total Income
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, textAlign: "right" }}>
          {fmtINRFull(result.tax + (result.rebateApplied ? result.rebateAmount : 0))}
        </span>

        {result.rebateApplied && (
          <>
            <span style={{ fontSize: 13, fontWeight: 600, color: THEME.sage }}>
              Section 87A Rebate
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.sage, textAlign: "right" }}>
              - {fmtINRFull(result.rebateAmount || result.tax + result.rebateAmount)}
            </span>
          </>
        )}

        {result.surcharge > 0 && (
          <>
            <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>Surcharge</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.rust, textAlign: "right" }}>
              + {fmtINRFull(result.surcharge)}
            </span>
          </>
        )}

        <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>
          Health & Education Cess (4%)
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: THEME.muted, textAlign: "right" }}>
          + {fmtINRFull(result.cess)}
        </span>

        <div
          style={{
            gridColumn: "1/-1",
            height: 2,
            background: accentColor,
            borderRadius: 1,
            margin: "4px 0",
          }}
        />

        <span style={{ fontSize: 15, fontWeight: 900, color: THEME.ink }}>Net Tax Liability</span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 900,
            color: result.total === 0 ? THEME.sage : THEME.rust,
            textAlign: "right",
          }}
        >
          {result.total === 0 ? "₹0 (Nil)" : fmtINRFull(result.total)}
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
   MAIN COMPONENT
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
    padding: "8px 10px",
    borderRadius: 8,
    border: `1px solid ${THEME.line}`,
    fontSize: 13,
    background: "var(--surface-0)",
    color: THEME.ink,
    width: "100%",
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <Card style={{ padding: 24, borderTop: `4px solid ${THEME.accent}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Calculator size={16} color={THEME.accent} />
          <span style={{ fontSize: 14, fontWeight: 800 }}>HRA Exemption Calculator</span>
          <span style={{ fontSize: 11, color: THEME.muted }}>Section 10(13A)</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Field label="Basic Salary (Annual)">
            <input
              type="number"
              style={inputStyle}
              placeholder="e.g. 600000"
              value={hraBasic}
              onChange={(e) => setHraBasic(e.target.value)}
            />
          </Field>
          <Field label="DA (Annual)">
            <input
              type="number"
              style={inputStyle}
              placeholder="0"
              value={hraDa}
              onChange={(e) => setHraDa(e.target.value)}
            />
          </Field>
          <Field label="HRA Received (Annual)">
            <input
              type="number"
              style={inputStyle}
              placeholder="e.g. 240000"
              value={hraReceived}
              onChange={(e) => setHraReceived(e.target.value)}
            />
          </Field>
          <Field label="Rent Paid (Annual)">
            <input
              type="number"
              style={inputStyle}
              placeholder="e.g. 300000"
              value={hraRent}
              onChange={(e) => setHraRent(e.target.value)}
            />
          </Field>
          <Field label="City Type">
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                size="sm"
                variant={hraMetro ? "accent" : "ghost"}
                onClick={() => setHraMetro(true)}
                style={{ flex: 1, height: 34 }}
              >
                Metro
              </Button>
              <Button
                size="sm"
                variant={!hraMetro ? "accent" : "ghost"}
                onClick={() => setHraMetro(false)}
                style={{ flex: 1, height: 34 }}
              >
                Non-Metro
              </Button>
            </div>
          </Field>
        </div>
        {salary > 0 && received > 0 && (
          <div
            style={{
              background: `color-mix(in srgb, ${THEME.accent} 2%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.accent} 13%, transparent)`,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, fontSize: 13 }}>
              <span style={{ color: THEME.muted }}>A. Actual HRA Received</span>
              <span style={{ fontWeight: 600, textAlign: "right" }}>{fmtINRFull(c1)}</span>
              <span style={{ color: THEME.muted }}>B. Rent Paid − 10% of Salary</span>
              <span style={{ fontWeight: 600, textAlign: "right" }}>{fmtINRFull(c2)}</span>
              <span style={{ color: THEME.muted }}>
                C. {hraMetro ? "50%" : "40%"} of Salary ({hraMetro ? "Metro" : "Non-Metro"})
              </span>
              <span style={{ fontWeight: 600, textAlign: "right" }}>{fmtINRFull(c3)}</span>
            </div>
            <div
              style={{
                borderTop: `1px solid ${THEME.line}`,
                marginTop: 10,
                paddingTop: 10,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 8,
                fontSize: 14,
              }}
            >
              <span style={{ fontWeight: 800, color: THEME.sage }}>
                HRA Exempt (Minimum of A, B, C)
              </span>
              <span
                style={{ fontWeight: 900, fontSize: 18, color: THEME.sage, textAlign: "right" }}
              >
                {fmtINRFull(exempt)}
              </span>
              <span style={{ color: THEME.muted, fontSize: 12 }}>Taxable HRA</span>
              <span
                style={{ fontWeight: 600, fontSize: 13, color: THEME.rust, textAlign: "right" }}
              >
                {fmtINRFull(taxable)}
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

interface TaxVaultTabProps {
  state: any;
  metrics: any;
  addItem: any;
  removeItem: any;
  updateItem: any;
  updateProfile?: any;
  updateMasterData?: any;
}

export const TaxVaultTab: React.FC<TaxVaultTabProps> = ({
  state,
  metrics,
  addItem,
  removeItem,
  updateProfile,
  updateMasterData,
}) => {
  const [subTab, setSubTab] = useState<"income" | "capitalGains" | "reconciler">("income");
  const [showModal, setShowModal] = useState(false);
  const [incomeOverride, setIncomeOverride] = useState<string>("");
  const [simulatedHarvestIds, setSimulatedHarvestIds] = useState<string[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [expandedTipId, setExpandedTipId] = useState<string | null>(null);

  /* ── FY selection (local — independent of global profile.fy) ── */
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

  // New regime introduced in FY 2020-21; before that only old regime existed
  const hasNewRegime = fyStartYear >= 2020;
  // Default regime: new regime is default from FY 2023-24 onwards; old before
  const defaultRegime = fyStartYear >= 2023 ? "new" : "old";
  const [activeRegime, setActiveRegime] = useState<"new" | "old">(
    hasNewRegime ? state.profile?.regime || defaultRegime : "old"
  );

  useEffect(() => {
    if (hasNewRegime && state.profile?.regime) {
      setActiveRegime(state.profile.regime);
    }
  }, [state.profile?.regime, hasNewRegime]);

  const handleRegimeChange = (regime: "new" | "old") => {
    setActiveRegime(regime);
    if (updateProfile) {
      updateProfile({ regime });
    }
  };

  /* ── Deductions state (pre-filled from portfolio data) ────────── */
  const autoDetected = useMemo(() => {
    // 80C — ELSS purchases in FY
    const elss = (state.mutualFunds || [])
      .filter(
        (m: any) =>
          (m.type || m.category || "").toUpperCase().includes("ELSS") &&
          m.buyDate &&
          m.buyDate >= fyStartStr &&
          m.buyDate <= fyEndStr
      )
      .reduce((s: number, m: any) => s + Number(m.invested || m.investedAmount || 0), 0);
    // 80C — PPF deposits in FY (ledger first, else yearly contribution)
    const ppfThisYear = (state.ppfLedger || [])
      .filter(
        (t: any) => t.date && t.date >= fyStartStr && t.date <= fyEndStr && t.type !== "withdrawal"
      )
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const ppf =
      ppfThisYear > 0
        ? ppfThisYear
        : (state.ppf || []).reduce(
            (s: number, p: any) => s + Number(p.thisYearContribution || p.yearlyContribution || 0),
            0
          );
    // 80C — LIC annual premiums
    const lic = (state.lic || []).reduce(
      (s: number, l: any) => s + Number(l.annualPremium || 0),
      0
    );
    // 80C — EPF employee contributions in FY
    const epf = (state.epf || []).reduce((s: number, e: any) => {
      const txs = (e.transactions || []).filter(
        (t: any) => t.date >= fyStartStr && t.date <= fyEndStr
      );
      const simpleEmp = txs
        .filter((t: any) => t.type === "employee_contribution")
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const passbookEmp = txs
        .filter((t: any) => t.type === "monthly_contribution")
        .reduce((sum: number, t: any) => sum + Number(t.employeeShare || 0), 0);
      return s + simpleEmp + passbookEmp;
    }, 0);
    const d80C_raw = elss + ppf + lic + epf;
    const d80C_sources =
      [
        elss > 0 ? `ELSS ₹${Math.round(elss).toLocaleString("en-IN")}` : null,
        ppf > 0 ? `PPF ₹${Math.round(ppf).toLocaleString("en-IN")}` : null,
        lic > 0 ? `LIC ₹${Math.round(lic).toLocaleString("en-IN")}` : null,
        epf > 0 ? `EPF ₹${Math.round(epf).toLocaleString("en-IN")}` : null,
      ]
        .filter(Boolean)
        .join(" + ") || null;

    // HRA — rent paid in FY from rented properties (user is a tenant)
    const hraPayments = (state.rentedProperties || []).reduce((s: number, p: any) => {
      return (
        s +
        (p.payments || [])
          .filter((pay: any) => pay.date && pay.date >= fyStartStr && pay.date <= fyEndStr)
          .reduce((sum: number, pay: any) => sum + Number(pay.amount || 0), 0)
      );
    }, 0);
    // Monthly rent fallback — from rentedProperties monthlyRent × 12
    const hraMonthly = (state.rentedProperties || []).reduce(
      (s: number, p: any) => s + Number(p.monthlyRent || 0),
      0
    );
    const hra_raw = hraPayments > 0 ? hraPayments : hraMonthly > 0 ? hraMonthly * 12 : 0;
    const hra_source =
      hra_raw > 0
        ? hraPayments > 0
          ? `Rent payments logged in FY ${fyStartStr.slice(0, 4)}-${fyEndStr.slice(2, 4)}`
          : "Monthly rent × 12"
        : null;

    // Home Loan Interest — from loansTaken type "Home", approx annual interest = outstanding × rate / 100
    const homeLoanData = (state.loansTaken || [])
      .filter((l: any) => (l.type || "").toLowerCase() === "home")
      .map((l: any) => {
        const outstanding = Number(l.outstanding) || 0;
        const rate = Number(l.rate) || 0;
        const annualInterest = Math.round((outstanding * rate) / 100);
        return { lender: l.lender || "Home Loan", annualInterest };
      });
    const homeLoan_raw = homeLoanData.reduce((s: number, l: any) => s + l.annualInterest, 0);
    const homeLoan_source =
      homeLoan_raw > 0
        ? homeLoanData.map((l) => l.lender).join(", ") + " (approx. interest)"
        : null;

    return {
      d80C: Math.min(d80C_raw, 150_000),
      d80C_sources,
      hra: Math.round(hra_raw),
      hra_source,
      homeLoan: Math.min(homeLoan_raw, 200_000),
      homeLoan_source,
    };
  }, [
    state.mutualFunds,
    state.ppfLedger,
    state.ppf,
    state.lic,
    state.epf,
    state.rentedProperties,
    state.loansTaken,
    fyStartStr,
    fyEndStr,
  ]);

  // Load initial deductions state from masterData overrides or fall back to auto-detected
  const overrides = state.masterData?.taxDeductions?.[fy] || {};

  const [deductions, setDeductions] = useState(() => ({
    d80C: overrides.d80C !== undefined ? overrides.d80C : autoDetected.d80C,
    d80D: overrides.d80D !== undefined ? overrides.d80D : 0,
    hra: overrides.hra !== undefined ? overrides.hra : autoDetected.hra,
    homeLoan: overrides.homeLoan !== undefined ? overrides.homeLoan : autoDetected.homeLoan,
    nps: overrides.nps !== undefined ? overrides.nps : 0,
    d80CCD2: overrides.d80CCD2 !== undefined ? overrides.d80CCD2 : 0,
    d80G: overrides.d80G !== undefined ? overrides.d80G : 0,
    d80E: overrides.d80E !== undefined ? overrides.d80E : 0,
    d80TTA: overrides.d80TTA !== undefined ? overrides.d80TTA : 0,
  }));

  // Sync deductions state on external changes or FY change
  useEffect(() => {
    const ov = state.masterData?.taxDeductions?.[fy] || {};
    setDeductions({
      d80C: ov.d80C !== undefined ? ov.d80C : autoDetected.d80C,
      d80D: ov.d80D !== undefined ? ov.d80D : 0,
      hra: ov.hra !== undefined ? ov.hra : autoDetected.hra,
      homeLoan: ov.homeLoan !== undefined ? ov.homeLoan : autoDetected.homeLoan,
      nps: ov.nps !== undefined ? ov.nps : 0,
      d80CCD2: ov.d80CCD2 !== undefined ? ov.d80CCD2 : 0,
      d80G: ov.d80G !== undefined ? ov.d80G : 0,
      d80E: ov.d80E !== undefined ? ov.d80E : 0,
      d80TTA: ov.d80TTA !== undefined ? ov.d80TTA : 0,
    });
  }, [
    fy,
    state.masterData?.taxDeductions,
    autoDetected.d80C,
    autoDetected.hra,
    autoDetected.homeLoan,
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

  /* ── Income ─────────────────────────────────────────────────── */
  const detectedIncome = metrics.annualIncome || (metrics.monthIncome || 0) * 12;
  const annualIncome = incomeOverride !== "" ? Number(incomeOverride) || 0 : detectedIncome;

  /* ── Tax computation (FY-aware) ─────────────────────────────── */
  const stdDedOld = getOldStdDed(fyStartYear);
  const totalOldDeductions =
    stdDedOld +
    Math.min(deductions.d80C, 150_000) +
    Math.min(deductions.d80D, 25_000) +
    deductions.hra +
    Math.min(deductions.homeLoan, 200_000) +
    Math.min(deductions.nps, 50_000) +
    (deductions.d80CCD2 || 0) +
    (deductions.d80G || 0) +
    (deductions.d80E || 0) +
    Math.min(deductions.d80TTA || 0, 10_000);

  const taxNewResult = useMemo(() => calcTaxNewByFY(annualIncome, fy), [annualIncome, fy]);
  const taxOldResult = useMemo(
    () => calcTaxOldByFY(annualIncome, totalOldDeductions, fy),
    [annualIncome, totalOldDeductions, fy]
  );

  // Attach extraDeds for slab breakdown display
  const taxOldDisplay = { ...taxOldResult, extraDeds: totalOldDeductions - stdDedOld };

  const currentTax = activeRegime === "new" ? taxNewResult.total : taxOldResult.total;
  const currentResult = activeRegime === "new" ? taxNewResult : taxOldResult;

  /* ── Payment tracking ────────────────────────────────────────── */
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
  const isAdvanceTaxApplicable = netLiability > 10_000;
  const progressPct = currentTax > 0 ? Math.min(100, (totalPaidSoFar / currentTax) * 100) : 0;

  /* ── Advance tax instalments ─────────────────────────────────── */
  const installments = [
    { q: "Q1", due: "15 Jun", pct: 15, amt: netLiability * 0.15 },
    { q: "Q2", due: "15 Sep", pct: 45, amt: netLiability * 0.45 },
    { q: "Q3", due: "15 Dec", pct: 75, amt: netLiability * 0.75 },
    { q: "Q4", due: "15 Mar", pct: 100, amt: netLiability * 1.0 },
  ];

  /* ── Regime verdict ─────────────────────────────────────────── */
  const regimeVerdict = useMemo(() => {
    if (!hasNewRegime) return null;
    const diff = taxOldResult.total - taxNewResult.total;
    const better = diff > 0 ? "new" : diff < 0 ? "old" : "equal";
    const saving = Math.abs(diff);
    return { better, saving, newTotal: taxNewResult.total, oldTotal: taxOldResult.total };
  }, [taxNewResult.total, taxOldResult.total, hasNewRegime]);

  /* ── Tax Saving Tips ─────────────────────────────────────────── */
  const taxSavingTips = useMemo(() => {
    const tips: any[] = [];
    const margRate = oldMarginalRate(taxOldResult.taxable);

    // Only old-regime deduction tips make sense if old regime is better or user is on old
    const showOldTips = !regimeVerdict || regimeVerdict.better === "old" || activeRegime === "old";

    // 80C gap
    const used80C = Math.min(Number(deductions.d80C) || 0, 150_000);
    const gap80C = Math.max(0, 150_000 - used80C);
    if (gap80C > 0 && showOldTips) {
      const saving = Math.round(gap80C * margRate * 1.04);
      tips.push({
        id: "80c",
        section: "Section 80C",
        priority: "high",
        icon: "🏦",
        title: `Top up 80C — ${fmtL(gap80C)} room left`,
        shortDesc: `Invest ₹${gap80C.toLocaleString("en-IN")} more in PPF, ELSS, or EPF to max the ₹1.5L limit.`,
        fullDesc: `Section 80C allows deduction up to ₹1,50,000 per year on investments in PPF, ELSS Mutual Funds, EPF, LIC premiums, NSC, SCSS, tax-saving FDs (5yr), and tuition fees for 2 children. You've used ${fmtL(used80C)} of the ₹1.5L cap. Topping up can save approx. ${fmtINRFull(saving)} in taxes (at your ${(margRate * 100).toFixed(0)}% slab + 4% cess).`,
        saving,
        regime: "old",
        maxBenefit: Math.round(150_000 * margRate * 1.04),
        utilizedPct: (used80C / 150_000) * 100,
      });
    }

    // 80D — health insurance
    const used80D = Math.min(Number(deductions.d80D) || 0, 25_000);
    const gap80D = Math.max(0, 25_000 - used80D);
    if (gap80D > 0 && showOldTips) {
      const saving = Math.round(gap80D * margRate * 1.04);
      tips.push({
        id: "80d",
        section: "Section 80D",
        priority: "high",
        icon: "🏥",
        title: `Health Insurance premium deduction`,
        shortDesc: `Claim up to ₹25K for self/family health insurance premiums + ₹25K extra for parents (₹50K if senior citizens).`,
        fullDesc: `Section 80D allows deduction of health insurance premium paid for self, spouse, children (up to ₹25,000) and separately for parents (up to ₹25,000 or ₹50,000 if parents are senior citizens). Even preventive health check-up costs up to ₹5,000 within this limit are deductible. Not available in the new regime.`,
        saving,
        regime: "old",
        maxBenefit: Math.round(25_000 * margRate * 1.04),
        utilizedPct: (used80D / 25_000) * 100,
      });
    }

    // NPS 80CCD(1B) — additional ₹50K over 80C ceiling
    const usedNPS = Math.min(Number(deductions.nps) || 0, 50_000);
    const gapNPS = Math.max(0, 50_000 - usedNPS);
    if (gapNPS > 0 && showOldTips) {
      const saving = Math.round(gapNPS * margRate * 1.04);
      tips.push({
        id: "nps",
        section: "Section 80CCD(1B)",
        priority: "medium",
        icon: "📈",
        title: `NPS — additional ₹50K deduction beyond 80C`,
        shortDesc: `Invest in NPS for an extra ₹50K deduction that's ABOVE the ₹1.5L 80C ceiling. Exclusively old-regime benefit.`,
        fullDesc: `Section 80CCD(1B) allows an additional deduction of up to ₹50,000 in National Pension System (NPS) contributions, over and above the ₹1.5L ceiling under Section 80C. This is one of the most powerful and under-utilised deductions. For someone in the 30% slab, ₹50,000 in NPS saves ₹15,600 in tax (₹15,000 tax + ₹600 cess). Not available in the new tax regime.`,
        saving,
        regime: "old",
        maxBenefit: Math.round(50_000 * margRate * 1.04),
        utilizedPct: (usedNPS / 50_000) * 100,
      });
    }

    // NPS Employer 80CCD(2) — available in BOTH regimes (14% for new, 10% for old)
    const maxEmpNPS80CCD2 =
      annualIncome > 0 ? annualIncome * (activeRegime === "new" ? 0.14 : 0.1) : 0;
    const usedEmpNPS = Number(deductions.d80CCD2) || 0;
    if (usedEmpNPS < maxEmpNPS80CCD2 && maxEmpNPS80CCD2 > 0) {
      tips.push({
        id: "ccd2",
        section: "Section 80CCD(2)",
        priority: "medium",
        icon: "🏢",
        title: `NPS Employer Contribution — available in both regimes`,
        shortDesc: `If your employer routes salary into NPS, deduct up to ${activeRegime === "new" ? "14%" : "10%"} of salary under 80CCD(2). This works in the new regime too.`,
        fullDesc: `Section 80CCD(2) allows deduction on employer's contribution to your NPS account — up to 10% of basic salary + DA in the old regime, and up to 14% in the new regime (enhanced in Budget 2024). This is one of the few deductions available in the new regime. Ask your employer's payroll to route a portion of your CTC into NPS to benefit from this.`,
        saving: null,
        regime: "both",
        maxBenefit: null,
        utilizedPct: (usedEmpNPS / maxEmpNPS80CCD2) * 100,
      });
    }

    // HRA
    if (deductions.hra === 0 && showOldTips) {
      tips.push({
        id: "hra",
        section: "HRA Exemption",
        priority: "medium",
        icon: "🏠",
        title: `HRA Exemption — potentially large tax-free income`,
        shortDesc: `If you receive HRA and pay rent, you can exempt a portion of HRA from tax. Calculate and claim this u/s 10(13A).`,
        fullDesc: `HRA exemption under Section 10(13A) = Least of: (a) Actual HRA received, (b) 50% of basic salary if metro city / 40% if non-metro, (c) Actual rent paid minus 10% of basic salary. This can result in substantial tax savings. Maintain rent receipts and the landlord's PAN (if rent > ₹1L/year). Applicable only in the old regime.`,
        saving: null,
        regime: "old",
        maxBenefit: null,
        utilizedPct: 0,
      });
    }

    // Home Loan Sec 24(b)
    if (deductions.homeLoan === 0 && showOldTips) {
      tips.push({
        id: "homeloan",
        section: "Section 24(b)",
        priority: "medium",
        icon: "🏡",
        title: `Home Loan Interest — up to ₹2L deduction`,
        shortDesc: `Interest on home loan for self-occupied property is deductible up to ₹2 lakh per year under Sec 24(b).`,
        fullDesc: `Section 24(b) allows deduction of interest paid on home loan — up to ₹2,00,000 per year for self-occupied property. For let-out property, the entire interest is deductible (subject to overall house property loss set-off of ₹2L). Principal repayment is also deductible under Section 80C. Keep Form 16 and interest certificate from the bank. Applicable only in the old tax regime.`,
        saving: Math.round(200_000 * margRate * 1.04),
        regime: "old",
        maxBenefit: Math.round(200_000 * margRate * 1.04),
        utilizedPct: 0,
      });
    }

    // 80TTA — savings interest
    if ((deductions.d80TTA || 0) === 0 && showOldTips) {
      tips.push({
        id: "80tta",
        section: "Section 80TTA",
        priority: "low",
        icon: "🏧",
        title: `Savings Account Interest — ₹10K deduction (80TTA)`,
        shortDesc: `Interest earned on savings bank accounts (not FDs) is deductible up to ₹10,000 per year under Section 80TTA.`,
        fullDesc: `Section 80TTA allows deduction of interest income from savings bank accounts with banks, post offices, and cooperative societies — up to ₹10,000 per year. Note: This does not cover FD or RD interest. Senior citizens get ₹50,000 deduction under 80TTB (covering savings, FDs, and RDs). Only in old regime.`,
        saving: Math.round(10_000 * margRate * 1.04),
        regime: "old",
        maxBenefit: Math.round(10_000 * margRate * 1.04),
        utilizedPct: 0,
      });
    }

    // LTCG harvesting tip — if taxableNewLTCG approaching 1.25L
    if (taxNewResult.effectiveRate > 0 && taxNewResult.total > 0) {
      tips.push({
        id: "ltcg",
        section: "LTCG Strategy",
        priority: "low",
        icon: "📊",
        title: `Book up to ₹1.25L LTCG tax-free every year`,
        shortDesc: `Long-term capital gains from equity up to ₹1.25L per year are completely exempt. Book profits annually to reset cost basis.`,
        fullDesc: `Under Section 112A, Long-Term Capital Gains from listed equity shares and equity MFs exceeding 12 months are exempt up to ₹1,25,000 per year. If your equity portfolio has unrealised gains, consider booking ₹1.25L of LTCG annually (before March 31) and immediately repurchasing — this "grandfathering" resets your cost basis upward without any tax. This strategy works in BOTH old and new regimes.`,
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
    taxNewResult.effectiveRate,
    taxNewResult.total,
  ]);

  /* ── Capital Gains computations (unchanged logic) ────────────── */
  const realizedGainsData = useMemo(() => {
    const inFYLocal = (d: string) => d && d >= fyStartStr && d <= fyEndStr;
    const fyStockSells = (state.stockSells || []).filter((s: any) => inFYLocal(s.sellDate));
    const fyMfSells = (state.mfSells || []).filter((m: any) => inFYLocal(m.sellDate));
    const allSells: any[] = [];

    // Grandfathering: for listed equity bought before Feb 1, 2018, use higher of
    // actual buy price or FMV on Jan 31, 2018 as cost basis (capped at sell price)
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
      // Apply grandfathering for LTCG on listed equity bought before Feb 2018
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
      // Bug fix: this previously used the equity 12-month/365-day LTCG
      // threshold for every MF sale regardless of asset class. A debt fund
      // held e.g. 20 months was being misclassified as LTCG (exemption-
      // eligible, 12.5%/10% rate) when it's actually STCG. classifyMFHolding
      // applies the correct 36-month debt threshold and the Finance Act 2023
      // always-slab-taxed rule for debt funds bought on/after 1 Apr 2023.
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
        // Bug fix: `isDebt` previously matched only funds with "debt" literally
        // in their category/type string, missing common debt categories like
        // "Liquid", "Corporate Bond", "Gilt", "Money Market" (they'd fall
        // through to the equity 12-month LTCG threshold below). classifyMFHolding
        // uses the same positive equity-keyword match as realizedGainsData
        // above, and applies the correct 36-month (not 12-month) LTCG
        // threshold for debt funds bought before 1 Apr 2023.
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

  const marginalRate = useMemo(() => {
    const r = activeRegime === "new" ? taxNewResult : taxOldResult;
    const taxable = r.taxable || 0;
    if (activeRegime === "new") {
      if (taxable <= 400000) return 0;
      if (taxable <= 800000) return 0.05;
      if (taxable <= 1200000) return 0.1;
      if (taxable <= 1600000) return 0.15;
      if (taxable <= 2000000) return 0.2;
      if (taxable <= 2400000) return 0.25;
      return 0.3;
    } else {
      if (taxable <= 250000) return 0;
      if (taxable <= 500000) return 0.05;
      if (taxable <= 1000000) return 0.2;
      return 0.3;
    }
  }, [activeRegime, taxNewResult, taxOldResult]);

  const taxCalculations = useMemo(() => {
    const { stcgGains, stcgLosses, ltcgGains, ltcgLosses } = realizedGainsData;
    let actualNetSTCG = stcgGains - stcgLosses;
    let actualNetLTCG = ltcgGains - ltcgLosses;
    if (actualNetSTCG < 0) {
      actualNetLTCG = Math.max(0, actualNetLTCG + actualNetSTCG);
      actualNetSTCG = 0;
    }
    const stcgRate = fyStartYear >= 2024 ? 0.2 : 0.15;
    const ltcgRate = fyStartYear >= 2024 ? 0.125 : 0.1;
    const ltcgExemption = fyStartYear >= 2024 ? 125_000 : 100_000;
    const actualTaxSTCG = Math.max(0, actualNetSTCG) * stcgRate;
    const actualTaxLTCG =
      actualNetLTCG > ltcgExemption ? (actualNetLTCG - ltcgExemption) * ltcgRate : 0;
    const totalActualTax = actualTaxSTCG + actualTaxLTCG;

    let simulatedSTCLosses = 0,
      simulatedLTCLosses = 0;
    harvestCandidates.forEach((c) => {
      if (simulatedHarvestIds.includes(c.id)) {
        c.isLtcg ? (simulatedLTCLosses += c.loss) : (simulatedSTCLosses += c.loss);
      }
    });
    let simNetSTCG = stcgGains - (stcgLosses + simulatedSTCLosses);
    let simNetLTCG = ltcgGains - (ltcgLosses + simulatedLTCLosses);
    if (simNetSTCG < 0) {
      simNetLTCG = Math.max(0, simNetLTCG + simNetSTCG);
      simNetSTCG = 0;
    }
    const simTaxSTCG = Math.max(0, simNetSTCG) * stcgRate;
    const simTaxLTCG = simNetLTCG > ltcgExemption ? (simNetLTCG - ltcgExemption) * ltcgRate : 0;
    const totalSimTax = simTaxSTCG + simTaxLTCG;

    return {
      actual: {
        netSTCG: Math.max(0, actualNetSTCG),
        netLTCG: Math.max(0, actualNetLTCG),
        taxSTCG: actualTaxSTCG,
        taxLTCG: actualTaxLTCG,
        totalTax: totalActualTax,
      },
      simulated: {
        stcLossesAdded: simulatedSTCLosses,
        ltcLossesAdded: simulatedLTCLosses,
        netSTCG: Math.max(0, simNetSTCG),
        netLTCG: Math.max(0, simNetLTCG),
        taxSTCG: simTaxSTCG,
        taxLTCG: simTaxLTCG,
        totalTax: totalSimTax,
      },
      totalSaved: Math.max(0, totalActualTax - totalSimTax),
    };
  }, [realizedGainsData, harvestCandidates, simulatedHarvestIds]);

  /* ── Actions ─────────────────────────────────────────────────── */
  const printTaxSummary = () => {
    const r = activeRegime === "new" ? taxNewResult : taxOldResult;
    const lines = [
      `TAX SUMMARY — FY ${fy}`,
      `Regime: ${activeRegime === "new" ? "New Tax Regime (Default)" : "Old Tax Regime"}`,
      ``,
      `INCOME`,
      `  Gross Annual Income      : ${fmtINRFull(annualIncome)}`,
      `  Standard Deduction       : ${fmtINRFull(r.stdDed)}`,
      activeRegime === "old"
        ? `  Other Deductions (80C/D…): ${fmtINRFull(totalOldDeductions - stdDedOld)}`
        : "",
      `  Taxable Income           : ${fmtINRFull(r.taxable)}`,
      ``,
      `TAX COMPUTATION`,
      ...r.slabs
        .filter((s: any) => s.incomeInSlab > 0)
        .map((s: any) => {
          const pad = " ".repeat(Math.max(0, 30 - s.label.length));
          return `  ${s.label} (${s.range})${pad}: ${fmtINRFull(s.taxInSlab)}`;
        }),
      r.rebateApplied
        ? `  Section 87A Rebate        : - ${fmtINRExact(r.rebateAmount || r.tax)}`
        : "",
      r.surcharge > 0 ? `  Surcharge                 : ${fmtINRFull(r.surcharge)}` : "",
      `  Health & Education Cess  : ${fmtINRFull(r.cess)}`,
      `  NET TAX LIABILITY        : ${fmtINRFull(r.total)}`,
      `  Effective Tax Rate       : ${r.effectiveRate.toFixed(2)}%`,
      ``,
      `PAYMENTS`,
      `  TDS Deducted             : ${fmtINRFull(totalTDS)}`,
      `  Advance Tax Paid         : ${fmtINRFull(totalAdvancePaid)}`,
      `  Self-Assessment Paid     : ${fmtINRFull(totalSelfAssessment)}`,
      `  Remaining Liability      : ${fmtINRFull(remainingAdvance)}`,
      ``,
      hasNewRegime ? `REGIME COMPARISON` : ``,
      hasNewRegime ? `  New Regime Tax           : ${fmtINRFull(taxNewResult.total)}` : ``,
      hasNewRegime ? `  Old Regime Tax           : ${fmtINRFull(taxOldResult.total)}` : ``,
      hasNewRegime && regimeVerdict
        ? `  Recommended              : ${regimeVerdict.better === "equal" ? "Both equal" : regimeVerdict.better === "new" ? "New Regime" : "Old Regime"} (saves ${fmtINRFull(regimeVerdict.saving)})`
        : ``,
      ``,
      `ADVANCE TAX INSTALMENTS`,
      ...installments.map((i) => `  ${i.q} by ${i.due} (${i.pct}%) : ${fmtINRExact(i.amt)}`),
      ``,
      `Generated by Personal Finance by Anand Mohta`,
    ]
      .filter((l) => l !== "")
      .join("\n");

    const w = window.open("", "_blank", "width=580,height=720");
    if (w) {
      w.document.write(
        `<html><head><title>Tax Summary FY ${fy}</title>` +
          `<style>body{font-family:'Courier New',monospace;padding:40px;background:#0f172a;color:#e2e8f0;font-size:13px;line-height:1.9}` +
          `h2{color:#c5a152;margin-bottom:8px}pre{white-space:pre-wrap;margin:0}` +
          `@media print{body{background:#fff;color:#000}}</style></head>` +
          `<body><h2>Tax Summary — FY ${fy}</h2><pre>${lines}</pre>` +
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
    a.download = `capital_gains_FY${fy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */
  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub={
          subTab === "income"
            ? `FY ${fy} · ${hasNewRegime ? "Regime comparison, " : ""}advance tax tracking & ITR deadline`
            : subTab === "capitalGains"
              ? `FY ${fy} · Capital Gains (STCG/LTCG) & Loss Harvesting Simulator`
              : `FY ${fy} · Reconcile Form 26AS with your income & TDS records`
        }
        rightElement={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              className="form-input"
              value={fy}
              onChange={(e) => setFy(e.target.value)}
              aria-label="Select financial year"
              style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600, minWidth: 130 }}
            >
              {availableFYs.map((f) => (
                <option key={f} value={f}>
                  FY {f}
                </option>
              ))}
            </select>
            {subTab === "income" && hasNewRegime && (
              <>
                <Button
                  size="sm"
                  variant={activeRegime === "new" ? "accent" : "ghost"}
                  onClick={() => handleRegimeChange("new")}
                >
                  New Regime
                </Button>
                <Button
                  size="sm"
                  variant={activeRegime === "old" ? "accent" : "ghost"}
                  onClick={() => handleRegimeChange("old")}
                >
                  Old Regime
                </Button>
              </>
            )}
          </div>
        }
      >
        Tax Vault
      </SectionTitle>

      {/* ── Context tile strip ─────────────────────────────────────── */}
      {(() => {
        const tiles = [
          {
            label: "Financial Year",
            value: `FY ${fy}`,
            sub: "Active fiscal year",
            color: THEME.accent,
            Icon: Calendar,
          },
          hasNewRegime
            ? {
                label: "Active Regime",
                value: activeRegime === "new" ? "New Regime" : "Old Regime",
                sub:
                  activeRegime === "new"
                    ? `₹${getNewStdDed(fyStartYear) / 1000}K std deduction`
                    : "Full deductions allowed",
                color: THEME.gold,
                Icon: BookOpen,
              }
            : {
                label: "Tax Regime",
                value: "Old Regime",
                sub: "Single regime (pre FY 2020-21)",
                color: THEME.gold,
                Icon: BookOpen,
              },
          {
            label: "Gross Tax Liability",
            value: fmtINRFull(currentTax),
            sub: `${activeRegime === "new" ? "New" : "Old"} regime · ${currentResult.effectiveRate.toFixed(1)}% eff. rate`,
            color: THEME.rust,
            Icon: Calculator,
          },
          {
            label: "Paid So Far",
            value: fmtINRFull(totalPaidSoFar),
            sub: "TDS + Advance + Self-Assess",
            color: THEME.sage,
            Icon: CheckCircle2,
          },
          {
            label: "Balance Due",
            value: fmtINRFull(remainingAdvance),
            sub: remainingAdvance <= 0 ? "Fully settled" : "Still to pay",
            color: remainingAdvance > 0 ? THEME.gold : THEME.sage,
            Icon: AlertTriangle,
          },
        ];
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginBottom: 28,
            }}
          >
            {tiles.map(({ label, value, sub, color, Icon }) => (
              <div
                key={label}
                className="card-lift"
                style={{
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderTop: `4px solid ${color}`,
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${color} 12%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {label}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    color: THEME.ink,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {value}
                </div>
                {sub && <div style={{ fontSize: 10, color: THEME.muted }}>{sub}</div>}
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Sub-tab nav ────────────────────────────────────────────── */}
      <div className="demat-portfolio-bar no-scrollbar" style={{ marginBottom: 28 }}>
        {[
          { id: "income", label: "Income Tax & Planning", icon: Shield },
          { id: "capitalGains", label: "Capital Gains & Harvesting", icon: TrendingUp },
          { id: "reconciler", label: "26AS Reconciler", icon: RefreshCw },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`demat-portfolio-pill ${subTab === id ? "active" : ""}`}
            onClick={() => setSubTab(id as any)}
          >
            <Icon size={16} />
            <span style={{ fontSize: 13 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SUB-TAB 1 — INCOME TAX & PLANNING
         ══════════════════════════════════════════════════════════════ */}
      {subTab === "income" && (
        <div className="tab-content-enter">
          {/* ── 1. REGIME ADVISOR ──────────────────────────────────── */}
          {hasNewRegime && regimeVerdict && annualIncome > 0 && (
            <div style={{ marginBottom: 28 }}>
              <Card
                style={{
                  padding: 0,
                  overflow: "hidden",
                  borderRadius: 16,
                  border: `1.5px solid ${
                    regimeVerdict.better === "new"
                      ? `color-mix(in srgb, ${THEME.accent} 13%, transparent)`
                      : regimeVerdict.better === "old"
                        ? `color-mix(in srgb, ${THEME.gold} 13%, transparent)`
                        : THEME.line
                  }`,
                }}
              >
                <div
                  style={{
                    height: 3,
                    background:
                      regimeVerdict.better === "new"
                        ? `linear-gradient(90deg, ${THEME.accent}, color-mix(in srgb, var(--t-accent) 65%, white))`
                        : regimeVerdict.better === "old"
                          ? `linear-gradient(90deg, ${THEME.gold}, color-mix(in srgb, var(--t-gold) 65%, white))`
                          : THEME.line,
                  }}
                />
                <div style={{ padding: "20px 24px" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Award size={18} color={THEME.accent} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: THEME.ink }}>
                        CFO Regime Advisor
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted }}>
                        For FY {fy} · Based on your income & deduction profile
                      </div>
                    </div>
                    {regimeVerdict.better !== "equal" && (
                      <div
                        style={{
                          marginLeft: "auto",
                          padding: "6px 14px",
                          borderRadius: 99,
                          background:
                            regimeVerdict.better === "new"
                              ? `color-mix(in srgb, ${THEME.accent} 8%, transparent)`
                              : `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
                          color: regimeVerdict.better === "new" ? THEME.accent : THEME.gold,
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        Recommended: {regimeVerdict.better === "new" ? "New Regime" : "Old Regime"}
                      </div>
                    )}
                  </div>

                  {/* Side-by-side comparison */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto 1fr",
                      gap: 16,
                      alignItems: "center",
                    }}
                  >
                    {/* New Regime */}
                    <div
                      style={{
                        padding: "16px 20px",
                        borderRadius: 12,
                        background:
                          regimeVerdict.better === "new"
                            ? `color-mix(in srgb, ${THEME.accent} 6%, transparent)`
                            : "rgba(128,128,128,0.03)",
                        border: `1.5px solid ${
                          regimeVerdict.better === "new"
                            ? `color-mix(in srgb, ${THEME.accent} 20%, transparent)`
                            : THEME.line
                        }`,
                      }}
                    >
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}
                      >
                        {regimeVerdict.better === "new" && (
                          <CheckCircle2 size={14} color={THEME.accent} />
                        )}
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: regimeVerdict.better === "new" ? THEME.accent : THEME.muted,
                          }}
                        >
                          New Regime
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 900,
                          color: regimeVerdict.better === "new" ? THEME.accent : THEME.ink,
                          letterSpacing: "-0.03em",
                        }}
                      >
                        {fmtINRFull(taxNewResult.total)}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
                        ₹{getNewStdDed(fyStartYear).toLocaleString("en-IN")} std ded · No other
                        deductions
                        <br />
                        Taxable: {fmtINRFull(taxNewResult.taxable)} ·{" "}
                        {taxNewResult.effectiveRate.toFixed(1)}% eff. rate
                      </div>
                      {taxNewResult.rebateApplied && (
                        <div
                          style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: THEME.sage }}
                        >
                          ✓ 87A rebate applied
                        </div>
                      )}
                    </div>

                    {/* VS divider */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <div style={{ width: 1, height: 24, background: THEME.line }} />
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: THEME.muted,
                          padding: "4px 8px",
                          border: `1px solid ${THEME.line}`,
                          borderRadius: 6,
                        }}
                      >
                        VS
                      </div>
                      <div style={{ width: 1, height: 24, background: THEME.line }} />
                    </div>

                    {/* Old Regime */}
                    <div
                      style={{
                        padding: "16px 20px",
                        borderRadius: 12,
                        background:
                          regimeVerdict.better === "old"
                            ? `color-mix(in srgb, ${THEME.gold} 6%, transparent)`
                            : "rgba(128,128,128,0.03)",
                        border: `1.5px solid ${
                          regimeVerdict.better === "old"
                            ? `color-mix(in srgb, ${THEME.gold} 20%, transparent)`
                            : THEME.line
                        }`,
                      }}
                    >
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}
                      >
                        {regimeVerdict.better === "old" && (
                          <CheckCircle2 size={14} color={THEME.gold} />
                        )}
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: regimeVerdict.better === "old" ? THEME.gold : THEME.muted,
                          }}
                        >
                          Old Regime
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 900,
                          color: regimeVerdict.better === "old" ? THEME.gold : THEME.ink,
                          letterSpacing: "-0.03em",
                        }}
                      >
                        {fmtINRFull(taxOldResult.total)}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
                        Total deductions: {fmtINRFull(totalOldDeductions)}
                        <br />
                        Taxable: {fmtINRFull(taxOldResult.taxable)} ·{" "}
                        {taxOldResult.effectiveRate.toFixed(1)}% eff. rate
                      </div>
                      {taxOldResult.rebateApplied && (
                        <div
                          style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: THEME.sage }}
                        >
                          ✓ 87A rebate applied
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verdict banner */}
                  {regimeVerdict.saving > 0 && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: "12px 16px",
                        borderRadius: 10,
                        background:
                          regimeVerdict.better === "new"
                            ? `color-mix(in srgb, ${THEME.accent} 6%, transparent)`
                            : `color-mix(in srgb, ${THEME.gold} 6%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${regimeVerdict.better === "new" ? THEME.accent : THEME.gold} 13%, transparent)`,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Zap
                        size={16}
                        color={regimeVerdict.better === "new" ? THEME.accent : THEME.gold}
                      />
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                        {regimeVerdict.better === "new" ? "New Regime" : "Old Regime"} saves you{" "}
                        <span
                          style={{
                            color: regimeVerdict.better === "new" ? THEME.accent : THEME.gold,
                            fontWeight: 900,
                          }}
                        >
                          {fmtINRFull(regimeVerdict.saving)}
                        </span>{" "}
                        in tax this year.
                        {regimeVerdict.better === "old" && (
                          <span style={{ fontWeight: 500, color: THEME.muted }}>
                            {" "}
                            Maximize 80C, 80D, and NPS deductions to stay ahead.
                          </span>
                        )}
                        {regimeVerdict.better === "new" && (
                          <span style={{ fontWeight: 500, color: THEME.muted }}>
                            {" "}
                            Simplified filing, no paperwork for deduction proofs needed.
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRegimeChange(regimeVerdict.better as any)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          background: regimeVerdict.better === "new" ? THEME.accent : THEME.gold,
                          color: "#fff",
                          border: "none",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Switch to {regimeVerdict.better === "new" ? "New" : "Old"}
                      </button>
                    </div>
                  )}
                  {regimeVerdict.saving === 0 && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
                        border: `1px solid ${THEME.line}`,
                        fontSize: 13,
                        color: THEME.muted,
                      }}
                    >
                      Both regimes result in equal tax. You may choose either — new regime means
                      simpler filing (no deduction paperwork).
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ── 1b. DEDUCTION UTILISATION DASHBOARD ────────────────── */}
          {activeRegime === "old" && annualIncome > 0 && (
            <div style={{ marginBottom: 28 }}>
              <Card style={{ padding: 24, borderTop: `4px solid ${THEME.gold}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <Target size={16} color={THEME.gold} />
                  <span style={{ fontSize: 14, fontWeight: 800 }}>
                    Deduction Utilisation — FY {fy}
                  </span>
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  {[
                    {
                      label: "Sec 80C",
                      used: Math.min(Number(deductions.d80C) || 0, 150000),
                      limit: 150000,
                      desc: "ELSS, PPF, LIC, EPF, NSC",
                    },
                    {
                      label: "Sec 80D",
                      used: Number(deductions.d80D) || 0,
                      limit: 25000,
                      desc: "Health Insurance Premium",
                    },
                    {
                      label: "HRA",
                      used: Number(deductions.hra) || 0,
                      limit: null,
                      desc: "House Rent Allowance",
                    },
                    {
                      label: "Sec 80CCD(1B)",
                      used: Number(deductions.nps) || 0,
                      limit: 50000,
                      desc: "NPS Contribution",
                    },
                    {
                      label: "Sec 80CCD(2)",
                      used: Number(deductions.d80CCD2) || 0,
                      limit: null,
                      desc: "Employer NPS",
                    },
                    {
                      label: "Sec 24(b)",
                      used: Math.min(Number(deductions.homeLoan) || 0, 200000),
                      limit: 200000,
                      desc: "Home Loan Interest",
                    },
                    {
                      label: "Sec 80G",
                      used: Number(deductions.d80G) || 0,
                      limit: null,
                      desc: "Donations",
                    },
                    {
                      label: "Sec 80E",
                      used: Number(deductions.d80E) || 0,
                      limit: null,
                      desc: "Education Loan Interest",
                    },
                    {
                      label: "Sec 80TTA",
                      used: Math.min(Number(deductions.d80TTA) || 0, 10000),
                      limit: 10000,
                      desc: "Savings A/c Interest",
                    },
                  ]
                    .filter((d) => d.used > 0 || (d.limit && d.limit > 0))
                    .map((d) => {
                      const pct = d.limit ? Math.min(100, (d.used / d.limit) * 100) : 100;
                      const barColor = d.limit
                        ? pct >= 100
                          ? THEME.sage
                          : pct >= 50
                            ? THEME.gold
                            : THEME.muted
                        : THEME.accent;
                      const remaining = d.limit ? Math.max(0, d.limit - d.used) : 0;
                      return (
                        <div key={d.label}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 4,
                            }}
                          >
                            <div>
                              <span style={{ fontSize: 12, fontWeight: 700 }}>{d.label}</span>
                              <span style={{ fontSize: 11, color: THEME.muted, marginLeft: 6 }}>
                                {d.desc}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>
                              {fmtINRFull(d.used)}
                              {d.limit ? ` / ${fmtINRFull(d.limit)}` : ""}
                            </div>
                          </div>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 3,
                              background: `color-mix(in srgb, ${THEME.muted} 9%, transparent)`,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: 6,
                                borderRadius: 3,
                                width: `${pct}%`,
                                background: barColor,
                                transition: "width 0.3s",
                              }}
                            />
                          </div>
                          {d.limit && remaining > 0 && (
                            <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                              Room to invest: {fmtINRFull(remaining)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </Card>
            </div>
          )}

          {/* ── 1c. HRA EXEMPTION CALCULATOR ───────────────────────── */}
          {activeRegime === "old" && <HRACalculator />}

          {/* ── 2. ADVANCE TAX SUMMARY ─────────────────────────────── */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, marginBottom: 24 }}
          >
            <Card
              variant="hero"
              style={{
                padding: 32,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.6)",
                    marginBottom: 8,
                  }}
                >
                  Advance Tax Still to Pay
                </div>
                <div
                  style={{
                    fontSize: 52,
                    fontWeight: 900,
                    color: "#fff",
                    marginBottom: 4,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {fmtINRFull(remainingAdvance)}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <Shield size={14} /> Total tax: {fmtINRFull(currentTax)} · TDS credited:{" "}
                  {fmtINRFull(totalTDS)}
                </div>
              </div>
              <div style={{ marginTop: 32 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  <span>Progress Paid</span>
                  <span>{progressPct.toFixed(0)}%</span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progressPct}%`,
                      background: "#fff",
                      boxShadow: "0 0 15px rgba(255,255,255,0.3)",
                      borderRadius: 10,
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,0.5)",
                        textTransform: "uppercase",
                      }}
                    >
                      TDS Deducted
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                      {fmtINRFull(totalTDS)}
                    </div>
                  </div>
                  <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,0.5)",
                        textTransform: "uppercase",
                      }}
                    >
                      Advance Paid
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                      {fmtINRFull(totalAdvancePaid)}
                    </div>
                  </div>
                  {totalSelfAssessment > 0 && (
                    <>
                      <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
                      <div>
                        <div
                          style={{
                            fontSize: 9,
                            color: "rgba(255,255,255,0.5)",
                            textTransform: "uppercase",
                          }}
                        >
                          Self-Assessment
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                          {fmtINRFull(totalSelfAssessment)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>

            <Card style={{ padding: 24 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: THEME.muted,
                  marginBottom: 20,
                }}
              >
                Advance Tax Schedule
              </div>
              <div style={{ display: "grid", gap: 12 }}>
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
                        padding: "14px 16px",
                        borderRadius: 12,
                        background: "rgba(128,128,128,0.03)",
                        border: `1px solid ${THEME.line}`,
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
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
                          <CheckCircle2 size={18} color={THEME.sage} />
                        ) : (
                          <Calendar size={18} color={THEME.gold} />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>
                          {inst.q} · <span style={{ color: THEME.muted }}>By {inst.due}</span>
                        </div>
                        <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                          Cumulative {inst.pct}% · {fmtINRFull(inst.amt)}
                        </div>
                      </div>
                      {isPaid && (
                        <Badge variant="sage" style={{ fontSize: 9 }}>
                          Paid
                        </Badge>
                      )}
                      {!isPaid && isPartial && (
                        <Badge variant="gold" style={{ fontSize: 9 }}>
                          Shortfall
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              {!isAdvanceTaxApplicable && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    color: THEME.sage,
                  }}
                >
                  <Shield size={14} /> Advance Tax not applicable (Liability &lt; ₹10K)
                </div>
              )}
            </Card>
          </div>

          {/* ── 3. ADVANCE TAX COUNTDOWN ───────────────────────────── */}
          {isAdvanceTaxApplicable &&
            (() => {
              const fyEndYear = fyStartYear + 1;
              const now = new Date();
              const instDates = [
                {
                  q: "Q1",
                  label: "1st Instalment",
                  dueDate: new Date(fyStartYear, 5, 15),
                  pct: 15,
                  cumAmt: netLiability * 0.15,
                },
                {
                  q: "Q2",
                  label: "2nd Instalment",
                  dueDate: new Date(fyStartYear, 8, 15),
                  pct: 45,
                  cumAmt: netLiability * 0.45,
                },
                {
                  q: "Q3",
                  label: "3rd Instalment",
                  dueDate: new Date(fyStartYear, 11, 15),
                  pct: 75,
                  cumAmt: netLiability * 0.75,
                },
                {
                  q: "Q4",
                  label: "4th Instalment",
                  dueDate: new Date(fyEndYear, 2, 15),
                  pct: 100,
                  cumAmt: netLiability * 1.0,
                },
              ];
              const allPaid = instDates.every((i) => totalAdvancePaid >= i.cumAmt);
              if (allPaid) {
                return (
                  <Card
                    style={{
                      padding: 20,
                      marginBottom: 24,
                      background: `color-mix(in srgb, ${THEME.sage} 4%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <CheckCircle2 size={32} color={THEME.sage} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: THEME.sage }}>
                        All advance tax payments on track!
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                        FY {fy} — {fmtINRFull(totalAdvancePaid)} paid of {fmtINRFull(netLiability)}{" "}
                        net liability
                      </div>
                    </div>
                  </Card>
                );
              }
              const upcoming = instDates.find(
                (i) => totalAdvancePaid < i.cumAmt && i.dueDate >= now
              );
              const overdue = instDates.find((i) => totalAdvancePaid < i.cumAmt && i.dueDate < now);
              const target = upcoming || overdue;
              if (!target) return null;
              const daysLeft = Math.ceil((target.dueDate.getTime() - now.getTime()) / 86400000);
              const isOverdue = daysLeft < 0;
              const isUrgent = daysLeft >= 0 && daysLeft <= 15;
              const countColor = isOverdue ? THEME.rust : isUrgent ? THEME.gold : THEME.sage;
              const dueDateStr = target.dueDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <Card
                  style={{
                    padding: 24,
                    marginBottom: 24,
                    border: `1.5px solid color-mix(in srgb, ${countColor} 19%, transparent)`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.15em",
                          color: THEME.muted,
                          marginBottom: 4,
                        }}
                      >
                        Advance Tax Countdown
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink }}>
                        {target.label} — {target.q} · {target.pct}% cumulative
                      </div>
                      <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>
                        Due by {dueDateStr}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          fontSize: 48,
                          fontWeight: 900,
                          color: countColor,
                          letterSpacing: "-0.03em",
                          lineHeight: 1,
                        }}
                      >
                        {Math.abs(daysLeft)}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: countColor,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {isOverdue ? "days overdue" : "days left"}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    {[
                      {
                        label: "Amount Due Now",
                        value: fmtINRFull(Math.max(0, target.cumAmt - totalAdvancePaid)),
                        color: countColor,
                      },
                      {
                        label: "Already Paid",
                        value: fmtINRFull(totalAdvancePaid),
                        color: THEME.sage,
                      },
                      { label: "Net Liability", value: fmtINRFull(netLiability), color: THEME.ink },
                    ].map(({ label, value, color }) => (
                      <div
                        key={label}
                        style={{
                          textAlign: "center",
                          padding: "12px 8px",
                          background: "rgba(128,128,128,0.03)",
                          borderRadius: 10,
                          border: `1px solid ${THEME.line}`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: THEME.muted,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            marginBottom: 6,
                          }}
                        >
                          {label}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 900, color }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {instDates.map((i) => {
                      const paid = totalAdvancePaid >= i.cumAmt;
                      const isCurrent = i.q === target.q;
                      return (
                        <div
                          key={i.q}
                          style={{
                            flex: 1,
                            height: 8,
                            borderRadius: 4,
                            background: paid ? THEME.sage : isCurrent ? countColor : THEME.line,
                            transition: "background 0.3s",
                          }}
                          title={`${i.q}: ${i.pct}%`}
                        />
                      );
                    })}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 6,
                      fontSize: 10,
                      color: THEME.muted,
                    }}
                  >
                    {instDates.map((i) => (
                      <span key={i.q}>{i.q}</span>
                    ))}
                  </div>
                  {isOverdue && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${THEME.rust} 15%, transparent)`,
                        fontSize: 12,
                        color: THEME.rust,
                        fontWeight: 600,
                      }}
                    >
                      ⚠️ Overdue by {Math.abs(daysLeft)} days. Interest u/s 234B/234C may apply. Pay
                      immediately via Challan 280.
                    </div>
                  )}
                </Card>
              );
            })()}

          {/* ── 3b. ADVANCE TAX PROJECTOR & PENALTY CALCULATOR ──────── */}
          {netLiability >= 10000 && (
            <Card style={{ padding: 24, marginBottom: 24, borderTop: `4px solid ${THEME.gold}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Calculator size={16} color={THEME.gold} />
                <span style={{ fontSize: 14, fontWeight: 800 }}>Advance Tax Projector</span>
              </div>
              {(() => {
                const now = new Date();
                const fyStart = new Date(fyStartYear, 3, 1);
                const monthsElapsed = Math.max(
                  1,
                  Math.round((now.getTime() - fyStart.getTime()) / (30.44 * 86400000))
                );
                const incomeThisYear = (state.income || [])
                  .filter((i: any) => i.date && i.date >= fyStartStr && i.date <= fyEndStr)
                  .reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
                const projectedAnnualIncome =
                  monthsElapsed < 12
                    ? Math.round((incomeThisYear / monthsElapsed) * 12)
                    : incomeThisYear;
                const projectedTaxResult =
                  activeRegime === "new"
                    ? calcTaxNewByFY(projectedAnnualIncome, fy)
                    : calcTaxOldByFY(projectedAnnualIncome, totalOldDeductions, fy);
                const projectedTax = projectedTaxResult.total || 0;

                const totalPenalty234C = calcSection234CPenalty(
                  fyStartYear,
                  netLiability,
                  totalAdvancePaid,
                  now
                );

                return (
                  <div style={{ display: "grid", gap: 16 }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          padding: 14,
                          borderRadius: 10,
                          background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${THEME.accent} 13%, transparent)`,
                        }}
                      >
                        <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                          Income Recorded ({monthsElapsed}m)
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: THEME.accent }}>
                          {fmtINRFull(incomeThisYear)}
                        </div>
                      </div>
                      <div
                        style={{
                          padding: 14,
                          borderRadius: 10,
                          background: `color-mix(in srgb, ${THEME.sage} 3%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${THEME.sage} 13%, transparent)`,
                        }}
                      >
                        <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                          Projected Annual Income
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: THEME.sage }}>
                          {fmtINRFull(projectedAnnualIncome)}
                        </div>
                      </div>
                      <div
                        style={{
                          padding: 14,
                          borderRadius: 10,
                          background: `color-mix(in srgb, ${THEME.gold} 3%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${THEME.gold} 13%, transparent)`,
                        }}
                      >
                        <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                          Projected Tax ({activeRegime} regime)
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: THEME.gold }}>
                          {fmtINRFull(projectedTax)}
                        </div>
                      </div>
                      {totalPenalty234C > 0 && (
                        <div
                          style={{
                            padding: 14,
                            borderRadius: 10,
                            background: `color-mix(in srgb, ${THEME.rust} 3%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${THEME.rust} 13%, transparent)`,
                          }}
                        >
                          <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                            Sec 234C Interest
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: THEME.rust }}>
                            {fmtINRFull(totalPenalty234C)}
                          </div>
                          <div style={{ fontSize: 10, color: THEME.muted }}>
                            1% per month on quarterly shortfall
                          </div>
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        background: `color-mix(in srgb, ${THEME.muted} 2%, transparent)`,
                        borderRadius: 10,
                        padding: 14,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                        Recommended Quarterly Payments
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(70px, 1fr))",
                          gap: 8,
                        }}
                      >
                        {quarters.map((q) => {
                          const required = Math.round(projectedTax * (q.pct / 100));
                          const isPast = now > q.due;
                          return (
                            <div
                              key={q.q}
                              style={{
                                padding: "8px 10px",
                                borderRadius: 8,
                                background: "var(--surface-0)",
                                border: `1px solid ${THEME.line}`,
                                textAlign: "center",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: isPast ? THEME.muted : THEME.accent,
                                }}
                              >
                                {q.q} —{" "}
                                {q.due.toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>
                                {fmtINRFull(required)}
                              </div>
                              <div style={{ fontSize: 10, color: THEME.muted }}>
                                {q.pct}% cumulative
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Card>
          )}

          {/* ── 4. ITR FILING DEADLINE ─────────────────────────────── */}
          {(() => {
            const itrDeadline = new Date(fyStartYear + 1, 6, 31);
            const now = new Date();
            const daysToITR = Math.ceil((itrDeadline.getTime() - now.getTime()) / 86400000);
            if (daysToITR < -30) return null;
            const isOverdue = daysToITR < 0;
            const isUrgent = daysToITR >= 0 && daysToITR <= 30;
            const bannerColor = isOverdue ? THEME.rust : isUrgent ? THEME.gold : THEME.sage;
            return (
              <div
                style={{
                  padding: "14px 20px",
                  borderRadius: 12,
                  background: isOverdue
                    ? `color-mix(in srgb, ${THEME.rust} 4%, transparent)`
                    : isUrgent
                      ? `color-mix(in srgb, ${THEME.gold} 4%, transparent)`
                      : `color-mix(in srgb, ${THEME.sage} 4%, transparent)`,
                  border: `1.5px solid color-mix(in srgb, ${bannerColor} 19%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 28,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `color-mix(in srgb, ${bannerColor} 8%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Calendar size={22} color={bannerColor} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                    ITR Filing Deadline — AY {fyStartYear + 1}-{String(fyStartYear + 2).slice(-2)} ·
                    31 July {fyStartYear + 1}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3, fontWeight: 600 }}>
                    {isOverdue
                      ? `Filing was due ${Math.abs(daysToITR)} days ago. File immediately — penalty u/s 234F up to ₹5,000 applies on belated filing.`
                      : `${daysToITR} day${daysToITR === 1 ? "" : "s"} remaining. Keep Form 16, AIS, and capital gains statement ready. File on Income Tax portal (incometax.gov.in).`}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: bannerColor, lineHeight: 1 }}>
                    {Math.abs(daysToITR)}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: bannerColor,
                      textTransform: "uppercase",
                    }}
                  >
                    {isOverdue ? "days late" : "days left"}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── 5. TAX COMPUTATION BREAKDOWN ───────────────────────── */}
          <div style={{ marginBottom: 28 }}>
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
                marginBottom: showBreakdown ? 16 : 0,
              }}
            >
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Calculator size={18} color={THEME.accent} />
                Tax Computation — Line by Line
                <Badge variant="muted" style={{ fontSize: 10, fontWeight: 700, marginLeft: 4 }}>
                  {activeRegime === "new" ? "New Regime" : "Old Regime"}
                </Badge>
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Calculator size={14} />}
                  onClick={(e: any) => {
                    e.stopPropagation();
                    printTaxSummary();
                  }}
                >
                  Tax Report
                </Button>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: `1px solid ${THEME.line}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: THEME.muted,
                  }}
                >
                  {showBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </div>

            {showBreakdown && (
              <Card style={{ padding: 28 }}>
                {annualIncome === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      color: THEME.muted,
                      fontSize: 13,
                      padding: "20px 0",
                    }}
                  >
                    Enter your annual income in the deductions panel below to see the breakdown.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: hasNewRegime ? "1fr 1fr" : "1fr",
                      gap: 32,
                    }}
                  >
                    {/* New Regime breakdown */}
                    {hasNewRegime && (
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: THEME.accent,
                            marginBottom: 16,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 2,
                              background: THEME.accent,
                            }}
                          />
                          New Regime · FY {fy}
                        </div>
                        <SlabBreakdownTable result={taxNewResult} regime="new" />
                      </div>
                    )}

                    {/* Old Regime breakdown */}
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: THEME.gold,
                          marginBottom: 16,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{ width: 8, height: 8, borderRadius: 2, background: THEME.gold }}
                        />
                        Old Regime · FY {fy}
                      </div>
                      <SlabBreakdownTable result={taxOldDisplay} regime="old" />
                    </div>
                  </div>
                )}
                {currentResult.surcharge === 0 && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: `color-mix(in srgb, ${THEME.sage} 4%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${THEME.sage} 13%, transparent)`,
                      fontSize: 11,
                      color: THEME.muted,
                    }}
                  >
                    ℹ️ Surcharge (10%–37%) applies only for income above ₹50 lakh. Health &
                    Education Cess @ 4% is mandatory on tax + surcharge.
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* ── 6. DEDUCTIONS & INCOME PANEL ───────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>
              {activeRegime === "old"
                ? "Income & Deductions (Old Regime)"
                : "Income & Deductions Reference"}
            </h3>
          </div>
          <Card style={{ padding: 32, marginBottom: 28 }}>
            {/* Income row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 24,
                paddingBottom: 24,
                borderBottom: `1.5px solid ${THEME.line}`,
              }}
            >
              <Field label="Annual Income (for tax computation)">
                <input
                  className="form-input"
                  type="number"
                  placeholder={
                    detectedIncome > 0
                      ? `Auto: ${Math.round(detectedIncome).toLocaleString("en-IN")}`
                      : "Enter annual income"
                  }
                  value={incomeOverride}
                  onChange={(e) => setIncomeOverride(e.target.value)}
                />
              </Field>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  paddingBottom: 2,
                }}
              >
                <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, lineHeight: 1.6 }}>
                  {incomeOverride !== "" ? (
                    <span style={{ color: THEME.gold }}>
                      ⚡ Using manual override: {fmtINRFull(Number(incomeOverride) || 0)}/yr
                    </span>
                  ) : detectedIncome > 0 ? (
                    <span>
                      Auto-detected:{" "}
                      <b style={{ color: THEME.ink }}>{fmtINRFull(detectedIncome)}/yr</b>
                    </span>
                  ) : (
                    <span style={{ color: THEME.rust }}>
                      No income detected — enter annual income manually
                    </span>
                  )}
                  {incomeOverride !== "" && (
                    <button
                      onClick={() => setIncomeOverride("")}
                      style={{
                        marginLeft: 8,
                        background: "none",
                        border: "none",
                        color: THEME.muted,
                        cursor: "pointer",
                        fontSize: 11,
                        textDecoration: "underline",
                      }}
                    >
                      Reset to auto
                    </button>
                  )}
                </div>
                {annualIncome > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: THEME.sage }}>
                    {activeRegime === "new"
                      ? taxNewResult.rebateApplied && taxNewResult.total === 0
                        ? "✓ 87A rebate: ₹0 tax (income within threshold)"
                        : `New regime taxable: ${fmtINRFull(taxNewResult.taxable)}`
                      : taxOldResult.rebateApplied && taxOldResult.total === 0
                        ? "✓ 87A rebate: ₹0 tax after deductions"
                        : `Old regime taxable: ${fmtINRFull(taxOldResult.taxable)}`}
                  </div>
                )}
              </div>
            </div>

            {/* Deductions grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
                marginBottom: 8,
                alignItems: "center",
                gridColumn: "1/-1",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  gridColumn: "1/-1",
                  marginBottom: 10,
                  paddingBottom: 12,
                  borderBottom: `1px solid ${THEME.line}`,
                }}
              >
                <Target size={16} color={activeRegime === "old" ? THEME.gold : THEME.muted} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: activeRegime === "old" ? THEME.gold : THEME.muted,
                  }}
                >
                  Deductions — Old Regime Only
                </span>
                {activeRegime === "new" && (
                  <span style={{ fontSize: 11, color: THEME.muted, marginLeft: 4 }}>
                    (Reference only — deductions don't apply in new regime, except 80CCD(2))
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              {/* 80C */}
              <div style={{ gridColumn: "1 / -1" }}>
                <Field
                  label="80C — ELSS, PPF, LIC, EPF, NSC (max ₹1.5L)"
                  style={{ marginBottom: 0 }}
                >
                  <input
                    className="form-input"
                    type="number"
                    value={deductions.d80C}
                    onChange={(e) => setDed("d80C", e.target.value)}
                    onBlur={(e) =>
                      handleDeductionBlur(
                        "d80C",
                        Number(e.target.value) || 0,
                        e.target.value === ""
                      )
                    }
                  />
                </Field>
                {(() => {
                  const used = Math.min(Number(deductions.d80C) || 0, 150_000);
                  const pct = Math.min(100, (used / 150_000) * 100);
                  const remaining = Math.max(0, 150_000 - used);
                  const barColor = pct >= 100 ? THEME.sage : pct >= 60 ? THEME.gold : THEME.rust;
                  return (
                    <div style={{ marginTop: 8 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 10,
                          color: THEME.muted,
                          fontWeight: 700,
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ color: barColor }}>
                          {pct.toFixed(0)}% utilized · {fmtINRFull(used)} of ₹1.5L
                        </span>
                        <span>
                          {remaining > 0
                            ? `${fmtINRFull(remaining)} room left`
                            : "Fully utilized ✓"}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 5,
                          background: THEME.line,
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: barColor,
                            borderRadius: 4,
                            transition: "width 0.3s",
                          }}
                        />
                      </div>
                      {autoDetected.d80C_sources && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            color: THEME.accent,
                          }}
                        >
                          ⚡ Auto-detected: {autoDetected.d80C_sources}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <Field label="80D — Health Insurance (max ₹25K)" style={{ marginBottom: 0 }}>
                  <input
                    className="form-input"
                    type="number"
                    value={deductions.d80D}
                    onChange={(e) => setDed("d80D", e.target.value)}
                    onBlur={(e) =>
                      handleDeductionBlur(
                        "d80D",
                        Number(e.target.value) || 0,
                        e.target.value === ""
                      )
                    }
                  />
                </Field>
                <div style={{ marginTop: 5, fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
                  ✏️ Enter manually — health insurance not tracked in app
                </div>
              </div>
              <div>
                <Field label="HRA Exemption [u/s 10(13A)]" style={{ marginBottom: 0 }}>
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
                {autoDetected.hra_source ? (
                  <div style={{ marginTop: 5, fontSize: 10, fontWeight: 700, color: THEME.accent }}>
                    ⚡ Auto-detected: {autoDetected.hra_source} — verify actual HRA exemption
                  </div>
                ) : (
                  <div style={{ marginTop: 5, fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
                    ✏️ Enter manually — add rent payments in Rental Details to auto-detect
                  </div>
                )}
              </div>
              <div>
                <Field label="Home Loan Interest — Sec 24(b) (max ₹2L)" style={{ marginBottom: 0 }}>
                  <input
                    className="form-input"
                    type="number"
                    value={deductions.homeLoan}
                    onChange={(e) => setDed("homeLoan", e.target.value)}
                    onBlur={(e) =>
                      handleDeductionBlur(
                        "homeLoan",
                        Number(e.target.value) || 0,
                        e.target.value === ""
                      )
                    }
                  />
                </Field>
                {autoDetected.homeLoan_source ? (
                  <div style={{ marginTop: 5, fontSize: 10, fontWeight: 700, color: THEME.accent }}>
                    ⚡ Auto-detected from: {autoDetected.homeLoan_source}
                  </div>
                ) : (
                  <div style={{ marginTop: 5, fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
                    ✏️ Enter manually — add Home loan in Credit & Liabilities to auto-detect
                  </div>
                )}
              </div>
              <Field label="NPS Self — 80CCD(1B) (max ₹50K, old only)" style={{ marginBottom: 0 }}>
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
              <Field
                label={`NPS Employer — 80CCD(2) (${activeRegime === "new" ? "14%" : "10%"} of salary · both regimes)`}
                style={{ marginBottom: 0 }}
              >
                <input
                  className="form-input"
                  type="number"
                  value={deductions.d80CCD2 || 0}
                  onChange={(e) => setDed("d80CCD2", e.target.value)}
                  onBlur={(e) =>
                    handleDeductionBlur(
                      "d80CCD2",
                      Number(e.target.value) || 0,
                      e.target.value === ""
                    )
                  }
                />
              </Field>
              <Field label="80G — Donations to eligible institutions" style={{ marginBottom: 0 }}>
                <input
                  className="form-input"
                  type="number"
                  value={deductions.d80G || 0}
                  onChange={(e) => setDed("d80G", e.target.value)}
                  onBlur={(e) =>
                    handleDeductionBlur("d80G", Number(e.target.value) || 0, e.target.value === "")
                  }
                />
              </Field>
              <Field label="80E — Education Loan Interest (no cap)" style={{ marginBottom: 0 }}>
                <input
                  className="form-input"
                  type="number"
                  value={deductions.d80E || 0}
                  onChange={(e) => setDed("d80E", e.target.value)}
                  onBlur={(e) =>
                    handleDeductionBlur("d80E", Number(e.target.value) || 0, e.target.value === "")
                  }
                />
              </Field>
              <Field
                label="80TTA — Savings Interest (max ₹10K; 80TTB ₹50K for seniors)"
                style={{ marginBottom: 0 }}
              >
                <input
                  className="form-input"
                  type="number"
                  value={deductions.d80TTA || 0}
                  onChange={(e) => setDed("d80TTA", e.target.value)}
                  onBlur={(e) =>
                    handleDeductionBlur(
                      "d80TTA",
                      Number(e.target.value) || 0,
                      e.target.value === ""
                    )
                  }
                />
              </Field>
              <Field
                label={`Standard Deduction (Old Regime — ₹${stdDedOld.toLocaleString("en-IN")})`}
                style={{ marginBottom: 0 }}
              >
                <input className="form-input" type="number" value={stdDedOld} disabled />
              </Field>
            </div>

            {/* Summary bar */}
            <div
              style={{
                marginTop: 32,
                paddingTop: 24,
                borderTop: `2px solid ${THEME.line}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div>
                {hasNewRegime ? (
                  <>
                    <div
                      style={{
                        fontSize: 11,
                        color: THEME.muted,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: 4,
                      }}
                    >
                      {regimeVerdict && regimeVerdict.saving > 0
                        ? regimeVerdict.better === "old"
                          ? "Old Regime Saves You"
                          : "New Regime Saves You"
                        : "Both Regimes — Same Tax"}
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: THEME.sage }}>
                      {fmtINRFull(regimeVerdict ? regimeVerdict.saving : 0)}
                    </div>
                    <div
                      style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, marginTop: 4 }}
                    >
                      New: {fmtINRFull(taxNewResult.total)} · Old: {fmtINRFull(taxOldResult.total)}
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: 11,
                        color: THEME.muted,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: 4,
                      }}
                    >
                      Tax Liability (Old Regime)
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: THEME.rust }}>
                      {fmtINRFull(taxOldResult.total)}
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
                      Effective rate: {taxOldResult.effectiveRate.toFixed(2)}%
                    </div>
                  </>
                )}
              </div>
              <Button
                variant="accent"
                size="lg"
                icon={<Calculator size={20} />}
                style={{ padding: "12px 40px" }}
                onClick={printTaxSummary}
              >
                Generate Tax Report
              </Button>
            </div>
          </Card>

          {/* ── 7. TAX SAVING TIPS ─────────────────────────────────── */}
          {taxSavingTips.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <Lightbulb size={20} color={THEME.gold} />
                <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>
                  CFO Tax Saving Tips
                </h3>
                <Badge variant="gold" style={{ fontSize: 10, fontWeight: 800 }}>
                  {taxSavingTips.length} Opportunities
                </Badge>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {taxSavingTips.map((tip) => {
                  const priorityColor =
                    tip.priority === "high"
                      ? THEME.rust
                      : tip.priority === "medium"
                        ? THEME.gold
                        : THEME.muted;
                  const isExpanded = expandedTipId === tip.id;
                  return (
                    <div
                      key={tip.id}
                      style={{
                        borderRadius: 14,
                        background: "var(--surface-0)",
                        border: `1.5px solid color-mix(in srgb, ${isExpanded ? priorityColor : THEME.line} 13%, transparent)`,
                        overflow: "hidden",
                        transition: "border-color 0.2s",
                      }}
                    >
                      <div
                        onClick={() => setExpandedTipId(isExpanded ? null : tip.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedTipId(isExpanded ? null : tip.id);
                          }
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "16px 20px",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: 24, flexShrink: 0 }}>{tip.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                              marginBottom: 4,
                            }}
                          >
                            <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                              {tip.title}
                            </span>
                            <Badge
                              variant={
                                tip.priority === "high"
                                  ? "rust"
                                  : tip.priority === "medium"
                                    ? "gold"
                                    : "muted"
                              }
                              style={{ fontSize: 9 }}
                            >
                              {tip.priority} priority
                            </Badge>
                            <Badge variant="muted" style={{ fontSize: 9 }}>
                              {tip.regime === "both"
                                ? "Both Regimes"
                                : tip.regime === "old"
                                  ? "Old Regime Only"
                                  : "New Regime"}
                            </Badge>
                          </div>
                          <div style={{ fontSize: 12, color: THEME.muted }}>{tip.shortDesc}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          {tip.saving != null && tip.saving > 0 && (
                            <div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: THEME.muted,
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  marginBottom: 2,
                                }}
                              >
                                Potential Saving
                              </div>
                              <div style={{ fontSize: 16, fontWeight: 900, color: THEME.sage }}>
                                ~{fmtINRFull(tip.saving)}
                              </div>
                            </div>
                          )}
                          <div style={{ marginTop: 4, color: THEME.muted }}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div
                          style={{ padding: "0 20px 20px", borderTop: `1px solid ${THEME.line}` }}
                        >
                          <div
                            style={{
                              marginTop: 12,
                              padding: "14px 16px",
                              borderRadius: 10,
                              background: `color-mix(in srgb, ${priorityColor} 3%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${priorityColor} 9%, transparent)`,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: priorityColor,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                marginBottom: 8,
                              }}
                            >
                              {tip.section}
                            </div>
                            <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.7 }}>
                              {tip.fullDesc}
                            </div>
                            {tip.maxBenefit != null && tip.maxBenefit > 0 && (
                              <div
                                style={{
                                  marginTop: 12,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: THEME.sage,
                                }}
                              >
                                <Zap size={13} />
                                Maximum annual tax saving: {fmtINRFull(tip.maxBenefit)}
                              </div>
                            )}
                            {tip.utilizedPct > 0 && (
                              <div style={{ marginTop: 10 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: 10,
                                    color: THEME.muted,
                                    fontWeight: 700,
                                    marginBottom: 4,
                                  }}
                                >
                                  <span>Utilization</span>
                                  <span>{tip.utilizedPct.toFixed(0)}%</span>
                                </div>
                                <div
                                  style={{
                                    height: 4,
                                    background: THEME.line,
                                    borderRadius: 4,
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      height: "100%",
                                      width: `${Math.min(100, tip.utilizedPct)}%`,
                                      background: priorityColor,
                                      borderRadius: 4,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 8. PAYMENT LOG ─────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>
              Payment Log & TDS
            </h3>
            <Button
              size="sm"
              variant="secondary"
              icon={<Plus size={14} />}
              onClick={() => setShowModal(true)}
            >
              Record Payment
            </Button>
          </div>

          {taxPayments.length === 0 ? (
            <Card
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: THEME.muted,
                fontSize: 13,
                marginBottom: 40,
              }}
            >
              No tax payments or TDS entries recorded yet. Use 'Record Payment' to track advance tax
              and TDS credits.
            </Card>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))",
                gap: 14,
                marginBottom: 40,
              }}
            >
              {taxPayments.map((p: any) => (
                <Card
                  key={p.id}
                  style={{
                    padding: "16px 20px",
                    borderTop: `4px solid ${p.type === "TDS" ? THEME.gold : THEME.sage}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: "rgba(128,128,128,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <History size={18} color={THEME.muted} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}
                      >
                        <span style={{ fontWeight: 800, fontSize: 15, color: THEME.ink }}>
                          {fmtINRExact(p.amount)}
                        </span>
                        <Badge variant="muted" style={{ fontSize: 9 }}>
                          {p.type}
                        </Badge>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: THEME.muted,
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.date} · {p.note || "No note"}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem("taxPayments", p.id)}
                      style={{ padding: 6, color: THEME.rust }}
                      title="Delete"
                      aria-label="Delete tax payment"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SUB-TAB 2 — CAPITAL GAINS & LOSS HARVESTING
         ══════════════════════════════════════════════════════════════ */}
      {subTab === "capitalGains" && (
        <div className="tab-content-enter">
          {/* Note on rates — post-Budget 2024 */}
          <div
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.accent} 13%, transparent)`,
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginBottom: 20,
              fontSize: 12,
              color: THEME.muted,
            }}
          >
            <Info size={15} color={THEME.accent} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <b style={{ color: THEME.ink }}>Post-Budget 2024 rates (effective 23 Jul 2024):</b>{" "}
              STCG on listed equity / equity MF @ <b>20%</b> · LTCG @ <b>12.5%</b> with ₹1.25L
              annual exemption. <b>Debt MF</b> (purchased after 1 Apr 2023) — gains are taxed at
              slab rate regardless of holding period.
            </span>
          </div>

          {/* Simulated Dashboard */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, marginBottom: 32 }}
          >
            <Card
              variant="hero"
              style={{
                padding: 32,
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
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.7)",
                    marginBottom: 8,
                  }}
                >
                  <Sparkles size={12} /> Simulated Tax Saved
                </div>
                <div
                  style={{
                    fontSize: 52,
                    fontWeight: 900,
                    color: "#34D399",
                    marginBottom: 4,
                    letterSpacing: "-0.03em",
                    textShadow: "0 0 20px rgba(52,211,153,0.3)",
                  }}
                >
                  {fmtINRFull(taxCalculations.totalSaved)}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <Percent size={14} /> Actual: {fmtINRFull(taxCalculations.actual.totalTax)} ·
                  Simulated: {fmtINRFull(taxCalculations.simulated.totalTax)}
                </div>
              </div>
              <div style={{ marginTop: 32 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  <span>Offset Achieved</span>
                  <span>
                    {taxCalculations.actual.totalTax > 0
                      ? `${Math.min(100, (taxCalculations.totalSaved / taxCalculations.actual.totalTax) * 100).toFixed(0)}%`
                      : "0%"}
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width:
                        taxCalculations.actual.totalTax > 0
                          ? `${Math.min(100, (taxCalculations.totalSaved / taxCalculations.actual.totalTax) * 100)}%`
                          : "0%",
                      background: "#34D399",
                      boxShadow: "0 0 15px rgba(52,211,153,0.5)",
                      borderRadius: 10,
                      transition: "width 0.4s",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,0.5)",
                        textTransform: "uppercase",
                      }}
                    >
                      Net STCG (Actual)
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
                      {fmtINRFull(taxCalculations.actual.netSTCG)}{" "}
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                        (Tax: {fmtINRFull(taxCalculations.actual.taxSTCG)})
                      </span>
                    </div>
                  </div>
                  <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,0.5)",
                        textTransform: "uppercase",
                      }}
                    >
                      Net LTCG (Actual)
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
                      {fmtINRFull(taxCalculations.actual.netLTCG)}{" "}
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                        (Tax: {fmtINRFull(taxCalculations.actual.taxLTCG)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card
              style={{
                padding: 24,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: THEME.muted,
                    }}
                  >
                    Simulation Status
                  </div>
                  {simulatedHarvestIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSimulatedHarvestIds([])}
                      icon={<RefreshCw size={12} />}
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        color: THEME.rust,
                        background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
                <div style={{ display: "grid", gap: 14 }}>
                  {[
                    {
                      label: "Securities Harvested",
                      value: `${simulatedHarvestIds.length} Assets`,
                    },
                    {
                      label: "Simulated STCL Applied",
                      value: `-${fmtINRFull(taxCalculations.simulated.stcLossesAdded)}`,
                    },
                    {
                      label: "Simulated LTCL Applied",
                      value: `-${fmtINRFull(taxCalculations.simulated.ltcLossesAdded)}`,
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: 12,
                        borderBottom: `1px solid ${THEME.line}`,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>
                        {label}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                        {value}
                      </span>
                    </div>
                  ))}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                      Simulated Net Tax
                    </span>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 900,
                        color: taxCalculations.simulated.totalTax > 0 ? THEME.gold : THEME.sage,
                      }}
                    >
                      {fmtINRFull(taxCalculations.simulated.totalTax)}
                    </span>
                  </div>
                </div>
              </div>
              {taxCalculations.actual.totalTax === 0 && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: `color-mix(in srgb, ${THEME.accent} 6%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
                    fontSize: 11,
                    fontWeight: 600,
                    color: THEME.accent,
                    lineHeight: 1.5,
                  }}
                >
                  <Info size={14} style={{ float: "left", marginRight: 6, marginTop: 1 }} />
                  No realized capital gains this FY. Simulated losses can be carried forward for up
                  to 8 assessment years to offset future profits.
                </div>
              )}
            </Card>
          </div>

          {/* Loss Harvesting Candidates */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>
                Tax Loss Harvesting Optimizer
              </h3>
              <p style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                Select holdings trading at unrealized loss to simulate selling and offsetting
                realized gains.
              </p>
            </div>
            <Badge variant="muted" style={{ fontWeight: 800 }}>
              {harvestCandidates.length} Loss Candidates
            </Badge>
          </div>

          {harvestCandidates.length === 0 ? (
            <Card
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: THEME.muted,
                fontSize: 13,
                marginBottom: 32,
              }}
            >
              🎉 None of your current holdings are trading at a loss. No harvesting offset needed
              this FY!
            </Card>
          ) : (
            <div style={{ display: "grid", gap: 12, marginBottom: 32 }}>
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSimulatedHarvestIds((prev) =>
                          prev.includes(cand.id)
                            ? prev.filter((x) => x !== cand.id)
                            : [...prev, cand.id]
                        );
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "16px 20px",
                      borderRadius: 14,
                      background: isSelected
                        ? `color-mix(in srgb, ${THEME.sage} 4%, transparent)`
                        : "var(--surface-0)",
                      border: `1.5px solid ${isSelected ? THEME.sage : THEME.line}`,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      style={{
                        width: 18,
                        height: 18,
                        accentColor: "var(--t-sage)",
                        cursor: "pointer",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
                      >
                        <span style={{ fontWeight: 800, fontSize: 15, color: THEME.ink }}>
                          {cand.name}
                        </span>
                        <Badge variant="muted" style={{ fontSize: 9 }}>
                          {cand.type}
                        </Badge>
                        <Badge variant={cand.isLtcg ? "muted" : "gold"} style={{ fontSize: 9 }}>
                          {cand.isLtcg ? "LTCG (Long-Term)" : "STCG (Short-Term)"}
                        </Badge>
                      </div>
                      <div
                        style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, marginTop: 4 }}
                      >
                        Bought: {cand.buyDate || "—"} · Qty: {cand.qty.toFixed(2)} · Cost:{" "}
                        {fmtINRFull(cand.invested)} · Market Val: {fmtINRFull(cand.currentVal)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: THEME.muted,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.03em",
                        }}
                      >
                        Unrealized Loss
                      </div>
                      <div
                        style={{ fontSize: 16, fontWeight: 900, color: THEME.rust, marginTop: 2 }}
                      >
                        {fmtINRFull(cand.loss)}
                      </div>
                      <div
                        style={{ fontSize: 10, color: THEME.sage, fontWeight: 700, marginTop: 2 }}
                      >
                        Offsets ~{fmtINRFull(taxSavedEst)} tax
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Statutory Advisory */}
          <div style={{ marginBottom: 16 }}>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 900,
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <BookOpen size={20} color={THEME.accent} /> CFO Statutory Compliance Vault
            </h3>
          </div>
          <Card
            style={{
              padding: 24,
              background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
              border: `1.5px solid color-mix(in srgb, ${THEME.accent} 13%, transparent)`,
              marginBottom: 24,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: THEME.accent,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 8,
                  }}
                >
                  Indian Statutory Netting Rules
                </div>
                <ul
                  style={{
                    fontSize: 12,
                    color: THEME.muted,
                    margin: 0,
                    paddingLeft: 16,
                    lineHeight: 1.7,
                  }}
                >
                  <li>
                    <b>STCL</b> can offset both Short-Term and Long-Term Capital Gains (Sec 70).
                  </li>
                  <li style={{ marginTop: 4 }}>
                    <b>LTCL</b> can only offset Long-Term Capital Gains — cannot touch STCG (Sec
                    70).
                  </li>
                  <li style={{ marginTop: 4 }}>
                    <b>Carry Forward:</b> Unabsorbed CG losses can be carried forward for up to{" "}
                    <b>8 assessment years</b> (ITR must be filed before due date to preserve
                    carry-forward).
                  </li>
                  <li style={{ marginTop: 4 }}>
                    <b>LTCG exemption:</b> First ₹1.25L of LTCG on equity / equity MF per year is
                    exempt u/s 112A.
                  </li>
                </ul>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: THEME.gold,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <AlertTriangle size={13} /> CFO Advisory — Avoid Wash-Sales
                </div>
                <p style={{ fontSize: 12, color: THEME.muted, margin: 0, lineHeight: 1.7 }}>
                  Selling purely to book tax losses and repurchasing the same asset the same day can
                  invite audit scrutiny under GAAR (General Anti-Avoidance Rule, Sec 96-102). To
                  avoid tax evasion flags: wait at least 2-3 business days before re-entering, or
                  reinvest in a highly correlated alternative (different ETF / similar sector MF) to
                  lock in the tax saving safely.
                </p>
              </div>
            </div>
          </Card>

          {/* Realized Transactions Ledger */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>
              Realized Transactions Ledger
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Badge variant="muted" style={{ fontWeight: 800 }}>
                {realizedGainsData.allSells.length} Transactions
              </Badge>
              {realizedGainsData.allSells.length > 0 && (
                <>
                  <button
                    onClick={downloadCGCsv}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 8,
                      border: `1px solid color-mix(in srgb, ${THEME.sage} 33%, transparent)`,
                      background: "transparent",
                      color: THEME.sage,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Download size={13} /> Export CSV
                  </button>
                  <button
                    onClick={() => {
                      const { allSells, stcgGains, stcgLosses, ltcgGains, ltcgLosses } =
                        realizedGainsData;
                      const netSTCG = Math.max(0, stcgGains - stcgLosses);
                      const netLTCG = Math.max(0, ltcgGains - ltcgLosses);
                      const stcgRate = fyStartYear >= 2024 ? 0.2 : 0.15;
                      const ltcgExempt = fyStartYear >= 2024 ? 125000 : 100000;
                      const ltcgRate2 = fyStartYear >= 2024 ? 0.125 : 0.1;
                      const taxSTCG = netSTCG * stcgRate;
                      const taxLTCG = netLTCG > ltcgExempt ? (netLTCG - ltcgExempt) * ltcgRate2 : 0;
                      const stcgRows = allSells.filter((s: any) => !s.isLtcg);
                      const ltcgRows = allSells.filter((s: any) => s.isLtcg);
                      const rowHtml = (items: any[], label: string) =>
                        items
                          .map(
                            (s: any) =>
                              `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.type)}</td><td>${s.buyDate || "-"}</td><td>${s.sellDate || "-"}</td><td>${s.days}d</td><td style="text-align:right">${fmtINRFull(s.buyPrice * s.qty)}</td><td style="text-align:right">${fmtINRFull(s.sellPrice * s.qty)}</td><td style="text-align:right;color:${s.profit >= 0 ? "#22c55e" : "#ef4444"}">${fmtINRFull(s.profit)}</td>${s.grandfathered ? '<td style="font-size:10px;color:#f59e0b">GF</td>' : "<td></td>"}</tr>`
                          )
                          .join("");
                      const html = `<html><head><title>Capital Gains Report - FY ${fy}</title>
                        <style>body{font-family:Inter,sans-serif;padding:40px;max-width:1000px;margin:auto;font-size:13px}
                        h1{font-size:22px}h2{font-size:16px;margin-top:28px;border-bottom:2px solid #e5e7eb;padding-bottom:6px}
                        table{width:100%;border-collapse:collapse;margin:12px 0}
                        th,td{padding:8px 10px;border:1px solid #e5e7eb;text-align:left;font-size:12px}
                        th{background:#f3f4f6;font-weight:700}.summary{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}
                        .box{padding:16px;border-radius:10px;border:1px solid #e5e7eb}.label{font-size:11px;color:#6b7280}
                        .value{font-size:20px;font-weight:800}@media print{body{padding:20px}}</style></head><body>
                        <h1>ITR Capital Gains Report — FY ${fy}</h1>
                        <p style="color:#6b7280">Generated: ${new Date().toLocaleDateString("en-IN")} | Schedule CG Summary</p>
                        <div class="summary">
                          <div class="box"><div class="label">Net Short-Term CG</div><div class="value">${fmtINRFull(netSTCG)}</div><div class="label">Tax @ ${stcgRate * 100}%: ${fmtINRFull(taxSTCG)}</div></div>
                          <div class="box"><div class="label">Net Long-Term CG</div><div class="value">${fmtINRFull(netLTCG)}</div><div class="label">Exempt: ${fmtINRFull(ltcgExempt)} | Tax @ ${ltcgRate2 * 100}%: ${fmtINRFull(taxLTCG)}</div></div>
                          <div class="box"><div class="label">Total CG Tax Liability</div><div class="value" style="color:#ef4444">${fmtINRFull(taxSTCG + taxLTCG)}</div><div class="label">+ 4% Health & Education Cess</div></div>
                          <div class="box"><div class="label">Loss Set-off</div><div class="value">${fmtINRFull(stcgLosses + ltcgLosses)}</div><div class="label">STCL: ${fmtINRFull(stcgLosses)} | LTCL: ${fmtINRFull(ltcgLosses)}</div></div>
                        </div>
                        ${
                          stcgRows.length > 0
                            ? `<h2>Schedule CG — Part A: Short-Term Capital Gains (${stcgRows.length} transactions)</h2>
                        <table><tr><th>Security</th><th>Type</th><th>Buy Date</th><th>Sell Date</th><th>Holding</th><th>Cost</th><th>Sale Value</th><th>Gain/Loss</th><th>GF</th></tr>${rowHtml(stcgRows, "STCG")}</table>`
                            : ""
                        }
                        ${
                          ltcgRows.length > 0
                            ? `<h2>Schedule CG — Part B: Long-Term Capital Gains (${ltcgRows.length} transactions)</h2>
                        <table><tr><th>Security</th><th>Type</th><th>Buy Date</th><th>Sell Date</th><th>Holding</th><th>Cost</th><th>Sale Value</th><th>Gain/Loss</th><th>GF</th></tr>${rowHtml(ltcgRows, "LTCG")}</table>`
                            : ""
                        }
                        <h2>Notes</h2><ul>
                        <li>GF = Grandfathering applied (equity bought before 01-Feb-2018, FMV used as cost basis)</li>
                        <li>STCG: Listed equity sold within 12 months; LTCG: Listed equity sold after 12 months</li>
                        <li>FY ${fy}: STCG rate ${stcgRate * 100}%, LTCG rate ${ltcgRate2 * 100}% (above ₹${(ltcgExempt / 100000).toFixed(2)}L exemption)</li>
                        </ul></body></html>`;
                      const w = window.open("", "_blank");
                      if (w) {
                        w.document.write(html);
                        w.document.close();
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 8,
                      border: `1px solid color-mix(in srgb, ${THEME.accent} 33%, transparent)`,
                      background: "transparent",
                      color: THEME.accent,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Download size={13} /> ITR Report
                  </button>
                </>
              )}
            </div>
          </div>

          {realizedGainsData.allSells.length === 0 ? (
            <Card
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: THEME.muted,
                fontSize: 13,
                marginBottom: 40,
              }}
            >
              No realized stock or mutual fund sales in FY {fy} yet. Add sales in the Demat / Mutual
              Fund trackers.
            </Card>
          ) : (
            <div
              style={{
                background: "var(--surface-0)",
                borderRadius: 14,
                border: `1px solid ${THEME.line}`,
                overflow: "hidden",
                marginBottom: 40,
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "rgba(128,128,128,0.03)",
                      borderBottom: `1px solid ${THEME.line}`,
                    }}
                  >
                    {[
                      "Asset Name",
                      "Type",
                      "Holding Days",
                      "Buy Price",
                      "Sell Price",
                      "Gain / Loss",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "14px 20px",
                          fontWeight: 800,
                          color: THEME.muted,
                          textAlign: [
                            "Holding Days",
                            "Buy Price",
                            "Sell Price",
                            "Gain / Loss",
                          ].includes(h)
                            ? "right"
                            : "left",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {realizedGainsData.allSells.map((sell, idx) => {
                    const isProfit = sell.profit >= 0;
                    return (
                      <tr
                        key={sell.id || idx}
                        style={{
                          borderBottom:
                            idx < realizedGainsData.allSells.length - 1
                              ? `1px solid ${THEME.line}`
                              : "none",
                        }}
                        className="hover-row"
                      >
                        <td style={{ padding: "14px 20px", fontWeight: 800 }}>
                          <div>{sell.name}</div>
                          <div
                            style={{
                              fontSize: 10,
                              color: THEME.muted,
                              fontWeight: 500,
                              marginTop: 4,
                            }}
                          >
                            Sold {sell.sellDate} · Qty: {sell.qty}
                          </div>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <Badge variant={sell.isLtcg ? "muted" : "gold"}>
                            {sell.isLtcg ? "LTCG" : "STCG"}
                          </Badge>
                        </td>
                        <td
                          style={{
                            padding: "14px 20px",
                            textAlign: "right",
                            fontWeight: 600,
                            color: THEME.muted,
                          }}
                        >
                          {sell.days} Days
                        </td>
                        <td style={{ padding: "14px 20px", textAlign: "right", fontWeight: 600 }}>
                          {fmtINRFull(sell.buyPrice)}
                        </td>
                        <td style={{ padding: "14px 20px", textAlign: "right", fontWeight: 600 }}>
                          {fmtINRFull(sell.sellPrice)}
                        </td>
                        <td
                          style={{
                            padding: "14px 20px",
                            textAlign: "right",
                            fontWeight: 800,
                            color: isProfit ? THEME.sage : THEME.rust,
                          }}
                        >
                          {isProfit ? "+" : ""}
                          {fmtINRFull(sell.profit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SUB-TAB 3 — FORM 26AS RECONCILER
         ══════════════════════════════════════════════════════════════ */}
      {subTab === "reconciler" && (
        <div className="tab-content-enter">
          <Reconciler26AS
            income={state.income || []}
            taxPayments={state.taxPayments || []}
            fy={fy}
            fyStartStr={fyStartStr}
            fyEndStr={fyEndStr}
          />
        </div>
      )}

      {showModal && (
        <AddTaxPaymentModal
          onClose={() => setShowModal(false)}
          onSave={(data: any) => {
            addItem("taxPayments", data);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
};
