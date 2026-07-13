// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  IndianRupee,
  Calculator,
  Download,
  Calendar,
  Shield,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, today } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Badge } from "../ui/Badge";
import { Prv } from "../../context/PrivacyContext";

const ADVANCE_TAX_DATES = [
  { date: "06-15", label: "15 Jun", pct: 15 },
  { date: "09-15", label: "15 Sep", pct: 45 },
  { date: "12-15", label: "15 Dec", pct: 75 },
  { date: "03-15", label: "15 Mar", pct: 100 },
];

const ITR_CHECKLIST = [
  { id: "form16", label: "Form 16 from employer", category: "Income" },
  { id: "form16a", label: "Form 16A (TDS on other income)", category: "Income" },
  { id: "form26as", label: "Form 26AS verification", category: "TDS" },
  { id: "ais", label: "AIS (Annual Information Statement) review", category: "TDS" },
  { id: "bank_interest", label: "Bank interest certificates", category: "Income" },
  { id: "fd_interest", label: "FD interest certificates", category: "Income" },
  { id: "rental_income", label: "Rental income details", category: "Income" },
  { id: "capital_gains", label: "Capital gains computation", category: "Income" },
  { id: "dividend_income", label: "Dividend income records", category: "Income" },
  { id: "80c", label: "Section 80C proof (PPF, ELSS, LIC, etc.)", category: "Deductions" },
  { id: "80d", label: "Section 80D (Health insurance premiums)", category: "Deductions" },
  { id: "hra", label: "HRA rent receipts", category: "Deductions" },
  { id: "80tta", label: "Section 80TTA/80TTB (Savings interest)", category: "Deductions" },
  { id: "80ccd", label: "Section 80CCD (NPS contribution)", category: "Deductions" },
  { id: "home_loan", label: "Home loan interest certificate (Sec 24)", category: "Deductions" },
  { id: "advance_tax", label: "Advance tax challans", category: "Tax Paid" },
  { id: "tds_credit", label: "TDS credit verification", category: "Tax Paid" },
  { id: "bank_details", label: "Bank account details for refund", category: "Filing" },
  { id: "aadhaar", label: "Aadhaar-PAN linking verified", category: "Filing" },
  { id: "itr_form", label: "Correct ITR form selected", category: "Filing" },
];

export const TaxFilingHelperTab = ({ state, metrics, updateMasterData }) => {
  const [checkedItems, setCheckedItems] = useState(() => {
    const saved = state.masterData?._taxChecklist || {};
    return saved;
  });

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
    const now = new Date();
    const currentFYStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    fySet.add(currentFYStart);
    return Array.from(fySet)
      .sort((a, b) => b - a)
      .map((y) => `${y}-${String(y + 1).slice(-2)}`);
  }, [state.income, state.transactions, state.stockSells, state.mfSells]);

  const [selectedFY, setSelectedFY] = useState(state.profile?.fy || availableFYs[0] || "2025-26");

  const toggleCheck = (id) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (typeof updateMasterData === "function") {
        updateMasterData("_taxChecklist", next);
      }
      return next;
    });
  };

  const incomeSummary = useMemo(() => {
    const fy = selectedFY;
    const [startYear] = fy.split("-").map(Number);
    const fyStart = `${startYear}-04-01`;
    const fyEnd = `${startYear + 1}-03-31`;
    const inFY = (date) => date && date >= fyStart && date <= fyEnd;

    // Salary income
    const salaryIncome = (state.income || [])
      .filter((i) => inFY(i.date) && (i.source || "").toLowerCase().includes("salary"))
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    // Other income
    const otherIncome = (state.income || [])
      .filter((i) => inFY(i.date) && !(i.source || "").toLowerCase().includes("salary"))
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    // Bank interest
    const bankInterest = (state.fixedDeposits || []).reduce((s, fd) => {
      const rate = Number(fd.rate || 0);
      const principal = Number(fd.principal || 0);
      return s + (principal * rate) / 100;
    }, 0);

    // Rental income
    const rentalIncome = (state.rentedProperties || []).reduce(
      (s, p) => s + Number(p.monthlyRent || 0) * 12,
      0
    );

    // Dividend income
    const dividendIncome = (state.dividends || [])
      .filter((d) => inFY(d.date))
      .reduce((s, d) => s + Number(d.amount || 0), 0);

    // Capital gains
    const stockGains = (state.stockSells || [])
      .filter((s) => inFY(s.sellDate || s.date))
      .reduce((s, t) => s + Number(t.profit || 0), 0);
    const mfGains = (state.mfSells || [])
      .filter((s) => inFY(s.sellDate || s.date))
      .reduce((s, t) => s + Number(t.profit || 0), 0);

    const totalIncome =
      salaryIncome +
      otherIncome +
      bankInterest +
      rentalIncome +
      dividendIncome +
      Math.max(0, stockGains + mfGains);

    return {
      salaryIncome,
      otherIncome,
      bankInterest,
      rentalIncome,
      dividendIncome,
      stockGains,
      mfGains,
      totalIncome,
    };
  }, [state, selectedFY]);

  const deductions = useMemo(() => {
    // Bug fix: this block previously had NO financial-year scoping at all —
    // it summed ELSS "invested" and EPF employee contributions across ALL
    // TIME, not just the selected FY, even though this tab has an FY
    // selector and the sibling incomeSummary/taxPaid blocks above are
    // correctly FY-scoped. That overstated 80C usage (and thus understated
    // remaining deduction room, and skewed the advance-tax estimate further
    // below which is derived from totalDeductions) for any user with
    // ELSS/EPF history from a prior year. Scope to the selected FY, matching
    // the pattern used in incomeSummary and in finance.ts's
    // getAutoDetectedDeductions.
    const fy = selectedFY;
    const [startYear] = fy.split("-").map(Number);
    const fyStart = `${startYear}-04-01`;
    const fyEnd = `${startYear + 1}-03-31`;
    const inFY = (date) => date && date >= fyStart && date <= fyEnd;

    // 80C — PPF ledger (FY-scoped) takes priority over the legacy
    // thisYearContribution field, same fallback pattern as
    // getAutoDetectedDeductions in utils/finance.ts.
    const ppfLedgerThisYear = (state.ppfLedger || [])
      .filter((t) => inFY(t.date) && t.type !== "withdrawal")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const ppfContrib =
      ppfLedgerThisYear > 0
        ? ppfLedgerThisYear
        : (state.ppf || []).reduce(
            (s, p) =>
              s +
              Number(p.thisYearContribution || p.yearlyContribution || p.annualContribution || 0),
            0
          );
    const elss = (state.mutualFunds || [])
      .filter(
        (m) => (m.category || m.type || "").toLowerCase().includes("elss") && inFY(m.buyDate)
      )
      .reduce((s, m) => s + Number(m.invested || 0), 0);
    const licPremium = (state.lic || []).reduce((s, l) => s + Number(l.annualPremium || 0), 0);
    const epfContrib = (state.epf || []).reduce((s, e) => {
      const txns = e.transactions || [];
      const empContrib = txns
        .filter(
          (t) =>
            (t.type === "employee_contribution" || t.type === "monthly_contribution") &&
            inFY(t.date)
        )
        .reduce((sum, t) => sum + Number(t.employeeShare || t.amount || 0), 0);
      return s + empContrib;
    }, 0);
    const sec80C = Math.min(150000, ppfContrib + elss + licPremium + epfContrib);

    // 80CCD(1B) — NPS
    const npsContrib = (state.nps || []).reduce(
      (s, n) => s + Number(n.thisYearContribution || n.yearContribution || 0),
      0
    );
    const sec80CCD1B = Math.min(50000, npsContrib);

    // 80D — Health insurance. Self/family and parents carry SEPARATE
    // ₹25,000 caps each (parents' cap only rises to ₹50,000 if they're
    // senior citizens, which isn't tracked in this app — see
    // Section80TrackerTab.tsx for the same reasoning) — they don't share one
    // combined ₹75,000 pool the way the previous code assumed, which let a
    // large self-only premium (with no parents plan at all) claim up to
    // 3x its real ₹25,000 entitlement.
    const selfHealthPremium = (state.termPlans || [])
      .filter((t) => (t.type || "").toLowerCase() !== "parents")
      .reduce((s, t) => s + Number(t.annualPremium || t.premium || 0), 0);
    const parentsHealthPremium = (state.termPlans || [])
      .filter((t) => (t.type || "").toLowerCase() === "parents")
      .reduce((s, t) => s + Number(t.annualPremium || t.premium || 0), 0);
    const sec80D = Math.min(25000, selfHealthPremium) + Math.min(25000, parentsHealthPremium);

    // Home loan interest
    const homeLoanInterest = (state.loansTaken || [])
      .filter(
        (l) =>
          (l.type || "").toLowerCase().includes("home") ||
          (l.type || "").toLowerCase().includes("housing")
      )
      .reduce(
        (s, l) =>
          s +
          Number(l.outstanding != null ? l.outstanding : l.principal || 0) *
            (Number(l.rate || 0) / 100),
        0
      );
    const sec24 = Math.min(200000, homeLoanInterest);

    // 80TTA
    const savingsInterest = (state.bankAccounts || []).reduce((s, a) => {
      if ((a.type || "").toLowerCase() === "savings") return s + Number(a.balance || 0) * 0.03;
      return s;
    }, 0);
    const sec80TTA = Math.min(10000, savingsInterest);

    const totalDeductions = sec80C + sec80CCD1B + sec80D + sec24 + sec80TTA;

    return {
      sec80C,
      ppfContrib,
      elss,
      licPremium,
      epfContrib,
      sec80CCD1B,
      npsContrib,
      sec80D,
      sec24,
      sec80TTA,
      totalDeductions,
    };
  }, [state, selectedFY]);

  const taxPaid = useMemo(() => {
    const fy = selectedFY;
    const [startYear] = fy.split("-").map(Number);
    const fyStart = `${startYear}-04-01`;
    const fyEnd = `${startYear + 1}-03-31`;
    const inFY = (date) => date && date >= fyStart && date <= fyEnd;

    const tds = (state.income || [])
      .filter((i) => inFY(i.date))
      .reduce((s, i) => s + Number(i.tds || 0), 0);
    const advanceTax = (state.taxPayments || [])
      .filter((t) => t.fy === fy)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    return { tds, advanceTax, total: tds + advanceTax };
  }, [state, selectedFY]);

  // Advance tax schedule
  const advanceTaxSchedule = useMemo(() => {
    const now = today();
    const fy = selectedFY;
    const [startYear] = fy.split("-").map(Number);
    const estimatedTax = Math.max(
      0,
      (incomeSummary.totalIncome - deductions.totalDeductions) * 0.2
    ); // rough estimate

    return ADVANCE_TAX_DATES.map((d) => {
      const fullDate = `${d.date.startsWith("03") ? startYear + 1 : startYear}-${d.date}`;
      const isPast = fullDate < now;
      const due = Math.round((estimatedTax * d.pct) / 100);
      return { ...d, fullDate, isPast, due };
    });
  }, [selectedFY, incomeSummary, deductions]);

  const checklistProgress = ITR_CHECKLIST.filter((item) => checkedItems[item.id]).length;
  const categories = [...new Set(ITR_CHECKLIST.map((i) => i.category))];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle sub="Pre-filled summary, checklist & advance tax tracker">
          Income Tax Filing Helper
        </SectionTitle>
        <select
          value={selectedFY}
          onChange={(e) => setSelectedFY(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: `1px solid ${THEME.border}`,
            background: THEME.card,
            color: THEME.text,
            fontSize: 14,
          }}
        >
          {availableFYs.map((fy) => (
            <option key={fy} value={fy}>
              FY {fy}
            </option>
          ))}
        </select>
      </div>

      {/* ITR Summary */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>
          Income Summary — FY {selectedFY}
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          {[
            { label: "Salary Income", value: incomeSummary.salaryIncome, color: THEME.accent },
            { label: "Rental Income", value: incomeSummary.rentalIncome, color: "#10B981" },
            { label: "Bank/FD Interest", value: incomeSummary.bankInterest, color: "#F59E0B" },
            { label: "Dividend Income", value: incomeSummary.dividendIncome, color: "#8B5CF6" },
            {
              label: "Capital Gains (Stocks)",
              value: incomeSummary.stockGains,
              color: incomeSummary.stockGains >= 0 ? "#10B981" : "#EF4444",
            },
            {
              label: "Capital Gains (MF)",
              value: incomeSummary.mfGains,
              color: incomeSummary.mfGains >= 0 ? "#10B981" : "#EF4444",
            },
            { label: "Other Income", value: incomeSummary.otherIncome, color: "#64748B" },
          ]
            .filter((i) => i.value !== 0)
            .map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: THEME.bg,
                  border: `1px solid ${THEME.border}`,
                }}
              >
                <div style={{ fontSize: 12, color: THEME.textSecondary }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color }}>
                  <Prv>{fmtINRFull(value)}</Prv>
                </div>
              </div>
            ))}
        </div>
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            borderRadius: 12,
            background: "color-mix(in srgb, var(--accent) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
          }}
        >
          <div style={{ fontSize: 13, color: THEME.textSecondary }}>Gross Total Income</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>
            <Prv>{fmtINRFull(incomeSummary.totalIncome)}</Prv>
          </div>
        </div>
      </Card>

      {/* Deductions */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>
          Deductions
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: THEME.bg,
              border: `1px solid ${THEME.border}`,
            }}
          >
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>Section 80C (max ₹1.5L)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#10B981" }}>
              <Prv>{fmtINRFull(deductions.sec80C)}</Prv>
            </div>
            <div style={{ fontSize: 11, color: THEME.textSecondary, marginTop: 4 }}>
              PPF: {fmtINRFull(deductions.ppfContrib)} | ELSS: {fmtINRFull(deductions.elss)} | LIC:{" "}
              {fmtINRFull(deductions.licPremium)} | EPF: {fmtINRFull(deductions.epfContrib)}
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: `color-mix(in srgb, ${THEME.muted} 25%, transparent)`,
                marginTop: 8,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, (deductions.sec80C / 150000) * 100)}%`,
                  borderRadius: 2,
                  background: "#10B981",
                }}
              />
            </div>
          </div>
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: THEME.bg,
              border: `1px solid ${THEME.border}`,
            }}
          >
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>
              Section 80CCD(1B) — NPS (max ₹50K)
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#8B5CF6" }}>
              <Prv>{fmtINRFull(deductions.sec80CCD1B)}</Prv>
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: `color-mix(in srgb, ${THEME.muted} 25%, transparent)`,
                marginTop: 8,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, (deductions.sec80CCD1B / 50000) * 100)}%`,
                  borderRadius: 2,
                  background: "#8B5CF6",
                }}
              />
            </div>
          </div>
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: THEME.bg,
              border: `1px solid ${THEME.border}`,
            }}
          >
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>
              Section 80D — Health Insurance
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: THEME.accent }}>
              <Prv>{fmtINRFull(deductions.sec80D)}</Prv>
            </div>
          </div>
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: THEME.bg,
              border: `1px solid ${THEME.border}`,
            }}
          >
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>
              Section 24 — Home Loan Interest
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#F59E0B" }}>
              <Prv>{fmtINRFull(deductions.sec24)}</Prv>
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            borderRadius: 12,
            background: "color-mix(in srgb, var(--t-sage) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--t-sage) 30%, transparent)",
          }}
        >
          <div style={{ fontSize: 13, color: THEME.textSecondary }}>Total Deductions</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#10B981" }}>
            <Prv>{fmtINRFull(deductions.totalDeductions)}</Prv>
          </div>
        </div>
      </Card>

      {/* Tax Paid & Advance Tax */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <Card style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>
            Tax Already Paid
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: THEME.textSecondary }}>TDS Deducted</span>
              <span style={{ fontWeight: 600, color: THEME.text }}>
                <Prv>{fmtINRFull(taxPaid.tds)}</Prv>
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: THEME.textSecondary }}>Advance Tax Paid</span>
              <span style={{ fontWeight: 600, color: THEME.text }}>
                <Prv>{fmtINRFull(taxPaid.advanceTax)}</Prv>
              </span>
            </div>
            <div
              style={{
                borderTop: `1px solid ${THEME.border}`,
                paddingTop: 8,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: 600, color: THEME.text }}>Total Tax Paid</span>
              <span style={{ fontWeight: 700, fontSize: 18, color: "var(--accent)" }}>
                <Prv>{fmtINRFull(taxPaid.total)}</Prv>
              </span>
            </div>
          </div>
        </Card>

        <Card style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>
            Advance Tax Schedule
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {advanceTaxSchedule.map((d) => (
              <div
                key={d.date}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: d.isPast
                    ? THEME.bg
                    : "color-mix(in srgb, var(--accent) 8%, transparent)",
                  border: `1px solid ${
                    d.isPast ? THEME.border : "color-mix(in srgb, var(--accent) 30%, transparent)"
                  }`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {d.isPast ? (
                    <CheckCircle size={16} color="#10B981" />
                  ) : (
                    <Clock size={16} color="var(--accent)" />
                  )}
                  <span style={{ fontSize: 13, color: THEME.text }}>
                    {d.label} ({d.pct}% due)
                  </span>
                </div>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: d.isPast ? "#10B981" : THEME.text,
                  }}
                >
                  <Prv>{fmtINRFull(d.due)}</Prv>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Filing Checklist */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: THEME.text }}>
            ITR Filing Checklist
          </h3>
          <span style={{ fontSize: 13, color: THEME.textSecondary }}>
            {checklistProgress} / {ITR_CHECKLIST.length} completed
          </span>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 3,
            background: `color-mix(in srgb, ${THEME.muted} 25%, transparent)`,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(checklistProgress / ITR_CHECKLIST.length) * 100}%`,
              borderRadius: 3,
              background: "var(--accent)",
              transition: "width 0.3s",
            }}
          />
        </div>

        {categories.map((cat) => (
          <div key={cat} style={{ marginBottom: 16 }}>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: THEME.textSecondary,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {cat}
            </h4>
            {ITR_CHECKLIST.filter((i) => i.category === cat).map((item) => (
              <label
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  cursor: "pointer",
                  borderBottom: `1px solid ${THEME.border}`,
                  color: checkedItems[item.id] ? "#10B981" : THEME.text,
                }}
              >
                <input
                  type="checkbox"
                  checked={!!checkedItems[item.id]}
                  onChange={() => toggleCheck(item.id)}
                  style={{ width: 18, height: 18, accentColor: "var(--accent)" }}
                />
                <span
                  style={{
                    fontSize: 14,
                    textDecoration: checkedItems[item.id] ? "line-through" : "none",
                  }}
                >
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        ))}
      </Card>
    </div>
  );
};
