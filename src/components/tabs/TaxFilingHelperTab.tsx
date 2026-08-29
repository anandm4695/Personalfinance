// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  FileText,
  CheckCircle,
  Clock,
  IndianRupee,
  Calculator,
  Calendar,
  AlertTriangle,
  Info,
  Download,
  TrendingUp,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { getCurrentFY } from "../../utils/appConstants";
import {
  fmtINRFull,
  today,
  calcTaxNewByFY,
  calcTaxOldByFY,
  isHomeLoan,
  loanOutstanding,
  getEffectiveRent,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Money } from "../ui/Money";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

/** Card section header — icon + label, matching the convention used across
 * the app's other Card-based sections (e.g. NetWorthTimelineTab's "Net Worth
 * History"), so this tab's cards read as part of the same family instead of
 * plain unlabelled text headers. An optional `hint` renders a short muted
 * explainer line beneath the title — this tab exists to demystify filing for
 * a non-technical user, so jargon-heavy sections (TDS, 80C, advance tax)
 * get a one-line plain-English gloss instead of assuming prior knowledge. */
const CardHeading = ({ icon: Icon, children, hint }: any) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Icon size={18} style={{ color: THEME.accent }} />
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: THEME.text }}>{children}</h3>
    </div>
    {hint && (
      <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 4, marginLeft: 26 }}>
        {hint}
      </div>
    )}
  </div>
);

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

  const [selectedFY, setSelectedFY] = useState(state.profile?.fy || availableFYs[0] || getCurrentFY());

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

    // Salary income from bank/income ledger
    const salaryIncome = (state.income || [])
      .filter((i) => inFY(i.date) && (i.source || "").toLowerCase().includes("salary"))
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    // Bank interest & Other income (deduplicated)
    const interestIncomeLogged = (state.income || [])
      .filter((i) => inFY(i.date) && (i.source || i.category || "").toLowerCase().includes("interest"))
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    const otherIncome = (state.income || [])
      .filter(
        (i) =>
          inFY(i.date) &&
          !(i.source || "").toLowerCase().includes("salary") &&
          !(i.source || i.category || "").toLowerCase().includes("interest")
      )
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    const fdInterestEstimate = (state.fixedDeposits || []).reduce((s, fd) => {
      const rate = Number(fd.rate || 0);
      const principal = Number(fd.principal || 0);
      return s + (principal * rate) / 100;
    }, 0);

    const bankInterest = interestIncomeLogged > 0 ? interestIncomeLogged : fdInterestEstimate;

    // Rental income — Bug fix: this previously read `state.rentedProperties`,
    // which is the app's TENANT-side ledger (rent the user PAYS someone
    // else, used for HRA relief — see Section80TrackerTab.tsx/EmergencyFundTab.tsx
    // reading the same field for rent expense/HRA). It was therefore showing
    // the user's own rent payments as if they were taxable rental income
    // received, while silently ignoring `state.rentalProperties` — the
    // LANDLORD-side ledger (property_type "out" / "Rental Property (Given)"
    // in App.tsx) that actually represents rent the user earns. Ledger
    // receipts (this FY) take priority over the monthlyRent×12 estimate for
    // active properties, same actual-over-projected fallback pattern used
    // for PPF/EPF below and in RentalTab.tsx's own FY total.
    const rentalReceiptsLedger = (state.rentalProperties || []).reduce(
      (s, p) =>
        s +
        (p.receipts || [])
          .filter((r) => inFY(r.date))
          .reduce((ss, r) => ss + Number(r.amount || 0), 0),
      0
    );
    const rentalIncomeEstimate = (state.rentalProperties || [])
      .filter((p) => p.isActive !== false)
      .reduce((s, p) => s + getEffectiveRent(p) * 12, 0);
    const rentalIncome = rentalReceiptsLedger > 0 ? rentalReceiptsLedger : rentalIncomeEstimate;

    // Dividend income
    const dividendIncome = (state.dividends || [])
      .filter((d) => inFY(d.date))
      .reduce((s, d) => s + Number(d.amount || 0), 0);

    // Capital gains
    const stockSellsThisFY = (state.stockSells || []).filter((s) => inFY(s.sellDate || s.date));
    const mfSellsThisFY = (state.mfSells || []).filter((s) => inFY(s.sellDate || s.date));
    const stockGains = stockSellsThisFY.reduce((s, t) => s + Number(t.profit || 0), 0);
    const mfGains = mfSellsThisFY.reduce((s, t) => s + Number(t.profit || 0), 0);
    // Presence of any sale record (profit or loss) — not just a net-positive
    // gain — is what actually triggers the Schedule CG / ITR-2 requirement,
    // so this is tracked separately from the totalIncome figure below (which
    // reasonably floors capital gains at 0 rather than letting a net loss
    // reduce gross taxable income, since losses only carry forward/offset
    // under specific CG-vs-CG rules, not against salary/other heads).
    const hasCapitalGainRecords = stockSellsThisFY.length > 0 || mfSellsThisFY.length > 0;

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
      hasCapitalGainRecords,
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
    //
    // Bug fix: this previously read from state.termPlans, which is the "pure
    // protection term plans" table (TERM LIFE insurance cover — see
    // InsuranceSummaryTab.tsx), not health/mediclaim insurance. Term life
    // premiums are already 80C-eligible, not 80D-eligible, so this
    // double-dipped a life-insurance premium into the 80D bucket while
    // ignoring the app's actual health insurance data. Source from
    // state.healthInsurance instead, annualizing premium/premiumFrequency
    // the same way Section80TrackerTab.tsx / HealthInsuranceTab.tsx do, and
    // inferring self vs. parents from insured-member relations (same
    // heuristic as Section80TrackerTab.tsx, for consistency across tabs).
    const HEALTH_PREMIUM_MULT: Record<string, number> = {
      monthly: 12,
      quarterly: 4,
      semi_annual: 2,
      annual: 1,
    };
    const toAnnualHealthPremium = (amount: any, freq: string) =>
      Number(amount || 0) * (HEALTH_PREMIUM_MULT[freq] || 1);
    const PARENT_RELATION_RE = /parent|father|mother|dad|mom|papa|mummy|-in-law/i;
    const isParentsPolicy = (p: any) =>
      (p.insuredMembers || []).some((m: any) => PARENT_RELATION_RE.test(m?.relation || ""));
    const healthPolicies = state.healthInsurance || [];
    const selfHealthPremium = healthPolicies
      .filter((p: any) => !isParentsPolicy(p))
      .reduce(
        (s: number, p: any) => s + toAnnualHealthPremium(p.premium, p.premiumFrequency || "annual"),
        0
      );
    const parentsHealthPremium = healthPolicies
      .filter(isParentsPolicy)
      .reduce(
        (s: number, p: any) => s + toAnnualHealthPremium(p.premium, p.premiumFrequency || "annual"),
        0
      );
    const sec80D = Math.min(25000, selfHealthPremium) + Math.min(25000, parentsHealthPremium);

    // Home loan interest
    const homeLoanInterest = (state.loansTaken || [])
      .filter(isHomeLoan)
      .reduce((s, l) => s + loanOutstanding(l) * (Number(l.rate || 0) / 100), 0);
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

    const incomeTds = (state.income || [])
      .filter((i) => inFY(i.date))
      .reduce((s, i) => s + Number(i.tds || 0), 0);
    const salarySlipTds = (state.salarySlips || [])
      .filter(
        (s: any) =>
          s.slipMonth &&
          s.slipMonth >= fyStart.slice(0, 7) &&
          s.slipMonth <= fyEnd.slice(0, 7)
      )
      .reduce((s: number, slip: any) => s + Number(slip.tds || slip.incomeTax || 0), 0);
    const tds = incomeTds > 0 ? incomeTds : salarySlipTds;

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

    // Bug fix: this previously taxed (income − deductions) at a flat, made-up
    // 20% regardless of regime, slab, surcharge, cess or the Section 87A
    // rebate — so e.g. a user below the ₹12L (new regime) / ₹5L (old regime)
    // rebate threshold, who owes ZERO tax, was shown a non-zero "advance tax
    // due" schedule here while the sibling Tax Tools > Advance Tax Calculator
    // (which does use calcTaxNewByFY/calcTaxOldByFY) correctly showed ₹0 for
    // the same income and FY. Use the same FY-aware, regime-aware calculation
    // as TaxToolsTab.tsx so both tools agree for the same user/FY.
    const regime = state.profile?.regime || "new";
    const grossIncome = incomeSummary.totalIncome;
    const estimatedTax =
      regime === "new"
        ? calcTaxNewByFY(grossIncome, fy).total
        : calcTaxOldByFY(
            grossIncome,
            (startYear >= 2020 ? 50_000 : 40_000) + deductions.totalDeductions,
            fy
          ).total;

    return ADVANCE_TAX_DATES.map((d) => {
      const fullDate = `${d.date.startsWith("03") ? startYear + 1 : startYear}-${d.date}`;
      const isPast = fullDate < now;
      const due = Math.round((estimatedTax * d.pct) / 100);
      return { ...d, fullDate, isPast, due };
    });
  }, [selectedFY, incomeSummary, deductions, state.profile]);

  // ITR filing deadline — computed dynamically from the selected FY's
  // Assessment Year (AY = FY + 1) rather than a hardcoded calendar year, so
  // this never goes stale the way past "2025-26" hardcodes elsewhere in the
  // app did. Statutory default for individuals with no tax-audit requirement
  // is 31 July of the AY; CBDT sometimes extends this in practice, and it's
  // 31 October instead for anyone with an audit requirement (business/
  // professional income over the audit threshold) — this app doesn't track
  // business income, so both caveats are surfaced to the user rather than
  // silently assumed away.
  const filingDeadline = useMemo(() => {
    const [startYear] = selectedFY.split("-").map(Number);
    const ayStart = startYear + 1;
    const ay = `${ayStart}-${String(ayStart + 1).slice(-2)}`;
    const dueDate = `${ayStart}-07-31`;
    const belatedDate = `${ayStart}-12-31`;
    const now = today();
    const daysLeft = Math.round(
      (new Date(dueDate + "T00:00:00").getTime() - new Date(now + "T00:00:00").getTime()) /
        86400000
    );
    return {
      ay,
      dueDate,
      belatedDate,
      daysLeft,
      isPastDue: now > dueDate,
      isPastBelated: now > belatedDate,
    };
  }, [selectedFY]);

  // ITR form guide — a conservative heuristic built only from what this app
  // can actually observe in `state`, not a full determination. Real ITR-1
  // eligibility also depends on being a company director, holding unlisted
  // shares, or having foreign assets/income — none of which this app tracks
  // — and business/professional income (which routes to ITR-3, or ITR-4 for
  // presumptive 44AD/44ADA/44AE income) isn't recorded as a distinct income
  // type here either. Rather than guessing at those, every recommendation is
  // shown with its triggering reasons plus an explicit caveat, so it reads as
  // a helpful starting point and not an authoritative filing determination
  // (this is the "don't oversimplify to the point of being wrong" case the
  // ITR-1-despite-capital-gains failure mode would fall into).
  const itrGuide = useMemo(() => {
    const reasons: string[] = [];
    if (incomeSummary.totalIncome > 5000000) {
      reasons.push("Total income is above ₹50 lakh");
    }
    if (incomeSummary.hasCapitalGainRecords) {
      reasons.push("You have capital gains/losses from stocks or mutual funds this FY");
    }
    const ownedCount = (state.realEstateProperties || []).filter(
      (p) => p.status !== "sold"
    ).length;
    const letOutCount = (state.rentalProperties || []).filter((p) => p.isActive !== false).length;
    const housePropertyCount = Math.max(ownedCount, letOutCount);
    if (housePropertyCount > 1) {
      reasons.push(`You have ${housePropertyCount} house properties on record`);
    }
    const form = reasons.length > 0 ? "ITR-2" : "ITR-1 (Sahaj)";
    return { form, reasons, housePropertyCount };
  }, [incomeSummary.totalIncome, incomeSummary.hasCapitalGainRecords, state.realEstateProperties, state.rentalProperties]);

  const animatedTotalIncome = useAnimatedNumber(incomeSummary.totalIncome);
  const animatedTotalDeductions = useAnimatedNumber(deductions.totalDeductions);
  const animatedTotalTaxPaid = useAnimatedNumber(taxPaid.total);

  const checklistProgress = ITR_CHECKLIST.filter((item) => checkedItems[item.id]).length;
  const checklistPct = Math.round((checklistProgress / ITR_CHECKLIST.length) * 100);
  const categories = [...new Set(ITR_CHECKLIST.map((i) => i.category))];

  const fmtDateLong = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  };

  // Downloadable filing-readiness summary — a plain-text snapshot of
  // everything on this tab for the selected FY (income, deductions, tax
  // paid, advance-tax schedule, ITR guide, checklist state), useful to keep
  // on hand or hand off to a CA. Built client-side via a Blob download, same
  // pattern used for CSV exports elsewhere in the app (e.g. RentalTab.tsx).
  const downloadSummary = () => {
    const lines: string[] = [];
    lines.push(`INCOME TAX FILING SUMMARY — FY ${selectedFY} (AY ${filingDeadline.ay})`);
    lines.push(`Generated: ${fmtDateLong(today())}`);
    lines.push("");
    lines.push("-- INCOME SUMMARY --");
    lines.push(`Salary Income: ${fmtINRFull(incomeSummary.salaryIncome)}`);
    lines.push(`Rental Income: ${fmtINRFull(incomeSummary.rentalIncome)}`);
    lines.push(`Bank/FD Interest: ${fmtINRFull(incomeSummary.bankInterest)}`);
    lines.push(`Dividend Income: ${fmtINRFull(incomeSummary.dividendIncome)}`);
    lines.push(`Capital Gains (Stocks): ${fmtINRFull(incomeSummary.stockGains)}`);
    lines.push(`Capital Gains (MF): ${fmtINRFull(incomeSummary.mfGains)}`);
    lines.push(`Other Income: ${fmtINRFull(incomeSummary.otherIncome)}`);
    lines.push(`Gross Total Income: ${fmtINRFull(incomeSummary.totalIncome)}`);
    lines.push("");
    lines.push("-- DEDUCTIONS --");
    lines.push(`Section 80C (max 1.5L): ${fmtINRFull(deductions.sec80C)}`);
    lines.push(`Section 80CCD(1B) — NPS (max 50K): ${fmtINRFull(deductions.sec80CCD1B)}`);
    lines.push(`Section 80D — Health Insurance: ${fmtINRFull(deductions.sec80D)}`);
    lines.push(`Section 24 — Home Loan Interest (max 2L): ${fmtINRFull(deductions.sec24)}`);
    lines.push(`Total Deductions: ${fmtINRFull(deductions.totalDeductions)}`);
    lines.push("");
    lines.push("-- TAX PAID --");
    lines.push(`TDS Deducted: ${fmtINRFull(taxPaid.tds)}`);
    lines.push(`Advance Tax Paid: ${fmtINRFull(taxPaid.advanceTax)}`);
    lines.push(`Total Tax Paid: ${fmtINRFull(taxPaid.total)}`);
    lines.push("");
    lines.push("-- ADVANCE TAX SCHEDULE --");
    advanceTaxSchedule.forEach((d) => {
      lines.push(`${d.label} (${d.pct}% cumulative): ${fmtINRFull(d.due)}${d.isPast ? " [past]" : ""}`);
    });
    lines.push("");
    lines.push("-- ITR FORM GUIDE (indicative only) --");
    lines.push(`Suggested: ${itrGuide.form}`);
    if (itrGuide.reasons.length) lines.push(`Reasons: ${itrGuide.reasons.join("; ")}`);
    lines.push("Note: business/professional income, director status, unlisted shares and foreign");
    lines.push("assets are not tracked by this app — confirm your actual form independently.");
    lines.push("");
    lines.push("-- FILING DEADLINE --");
    lines.push(`Due date (no audit): ${fmtDateLong(filingDeadline.dueDate)}`);
    lines.push(`Belated return deadline: ${fmtDateLong(filingDeadline.belatedDate)}`);
    lines.push("");
    lines.push("-- CHECKLIST --");
    ITR_CHECKLIST.forEach((item) => {
      lines.push(`[${checkedItems[item.id] ? "x" : " "}] ${item.label} (${item.category})`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Tax_Filing_Summary_FY${selectedFY}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <SectionTitle sub="Pre-filled summary, checklist & advance tax tracker">
          Income Tax Filing Helper
        </SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <select
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            aria-label="Select financial year"
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
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            onClick={downloadSummary}
          >
            Download Summary
          </Button>
        </div>
      </div>

      {/* Filing Deadline */}
      <Card style={{ padding: 24 }}>
        <CardHeading
          icon={Calendar}
          hint="When your return is legally due for this FY, and what happens if you miss it."
        >
          Filing Deadline — AY {filingDeadline.ay}
        </CardHeading>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: "14px 16px",
            borderRadius: 12,
            background: filingDeadline.isPastDue
              ? "color-mix(in srgb, var(--t-rust) 10%, transparent)"
              : "color-mix(in srgb, var(--t-accent) 8%, transparent)",
            border: `1px solid ${
              filingDeadline.isPastDue
                ? "color-mix(in srgb, var(--t-rust) 30%, transparent)"
                : "color-mix(in srgb, var(--t-accent) 30%, transparent)"
            }`,
          }}
        >
          {filingDeadline.isPastDue ? (
            <AlertTriangle size={20} color={THEME.rust} style={{ flexShrink: 0 }} />
          ) : (
            <Clock size={20} color={THEME.accent} style={{ flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>
              {filingDeadline.isPastBelated
                ? `The original and belated filing windows for FY ${selectedFY} have both closed.`
                : filingDeadline.isPastDue
                  ? `The ${fmtDateLong(filingDeadline.dueDate)} deadline has passed.`
                  : `Due ${fmtDateLong(filingDeadline.dueDate)}${
                      filingDeadline.daysLeft >= 0 ? ` — ${filingDeadline.daysLeft} days left` : ""
                    }`}
            </div>
            <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 3 }}>
              {filingDeadline.isPastBelated
                ? "Filing now requires condoning the delay with the Assessing Officer — a CA can advise on next steps."
                : filingDeadline.isPastDue
                  ? `You can still file a belated return until ${fmtDateLong(filingDeadline.belatedDate)}, with a late fee under Section 234F (up to ₹5,000) and interest on any unpaid tax.`
                  : "This is the statutory due date for individuals without a tax-audit requirement — CBDT sometimes extends it, and it moves to 31 October if you have business/professional income requiring an audit."}
            </div>
          </div>
        </div>
      </Card>

      {/* ITR Summary */}
      <Card style={{ padding: 24 }}>
        <CardHeading
          icon={IndianRupee}
          hint="Estimated from income, rent, interest, dividends and capital gains already logged elsewhere in the app for this FY."
        >
          Income Summary — FY {selectedFY}
        </CardHeading>
        {incomeSummary.totalIncome === 0 ? (
          <div
            style={{
              padding: "20px 16px",
              borderRadius: 12,
              background: THEME.bg,
              border: `1px dashed ${THEME.border}`,
              textAlign: "center",
              fontSize: 13,
              color: THEME.textSecondary,
            }}
          >
            No income recorded for FY {selectedFY} yet — log salary, rent, interest, dividends or
            capital gains elsewhere in the app to see them summarized here.
          </div>
        ) : (
        <>
        {incomeSummary.hasCapitalGainRecords && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 10,
              marginBottom: 14,
              background: "color-mix(in srgb, var(--t-violet) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--t-violet) 25%, transparent)",
              fontSize: 12.5,
              color: THEME.textSecondary,
            }}
          >
            <TrendingUp size={15} color={THEME.violet} style={{ flexShrink: 0 }} />
            You have stock/mutual fund sales recorded this FY — these must be reported under
            Schedule CG. See the Capital Gains tab for the full LTCG/STCG breakdown and applicable
            exemptions.
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          {[
            { label: "Salary Income", value: incomeSummary.salaryIncome, color: THEME.accent },
            { label: "Rental Income", value: incomeSummary.rentalIncome, color: THEME.sage },
            { label: "Bank/FD Interest", value: incomeSummary.bankInterest, color: THEME.gold },
            {
              label: "Dividend Income",
              value: incomeSummary.dividendIncome,
              color: THEME.violet,
            },
            {
              label: "Capital Gains (Stocks)",
              value: incomeSummary.stockGains,
              color: incomeSummary.stockGains >= 0 ? THEME.sage : THEME.rust,
            },
            {
              label: "Capital Gains (MF)",
              value: incomeSummary.mfGains,
              color: incomeSummary.mfGains >= 0 ? THEME.sage : THEME.rust,
            },
            { label: "Other Income", value: incomeSummary.otherIncome, color: THEME.muted },
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
                <div className="tabular-nums" style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color }}>
                  <Money value={value} variant="full" />
                </div>
              </div>
            ))}
        </div>
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            borderRadius: 12,
            background: "color-mix(in srgb, var(--t-accent) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--t-accent) 30%, transparent)",
          }}
        >
          <div style={{ fontSize: 13, color: THEME.textSecondary }}>Gross Total Income</div>
          <div className="tabular-nums" style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: THEME.accent }}>
            <Money value={animatedTotalIncome} variant="full" />
          </div>
        </div>
        </>
        )}
      </Card>

      {/* Deductions */}
      <Card style={{ padding: 24 }}>
        <CardHeading
          icon={Calculator}
          hint="Investments and payments that reduce your taxable income — each has its own yearly cap."
        >
          Deductions
        </CardHeading>
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
            <div className="tabular-nums" style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: THEME.sage }}>
              <Money value={deductions.sec80C} variant="full" />
            </div>
            <div style={{ fontSize: 11, color: THEME.textSecondary, marginTop: 4 }}>
              PPF: <Money value={deductions.ppfContrib} variant="full" /> | ELSS:{" "}
              <Money value={deductions.elss} variant="full" /> | LIC:{" "}
              <Money value={deductions.licPremium} variant="full" /> | EPF:{" "}
              <Money value={deductions.epfContrib} variant="full" />
            </div>
            <div className="progress-track" style={{ height: 4, marginTop: 8 }}>
              <div
                className="progress-fill progress-fill-sage"
                style={{ width: `${Math.min(100, (deductions.sec80C / 150000) * 100)}%` }}
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
            <div
              className="tabular-nums"
              style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: THEME.violet }}
            >
              <Money value={deductions.sec80CCD1B} variant="full" />
            </div>
            <div className="progress-track" style={{ height: 4, marginTop: 8 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, (deductions.sec80CCD1B / 50000) * 100)}%`,
                  background: `linear-gradient(90deg, ${THEME.violet}, color-mix(in srgb, ${THEME.violet} 65%, white))`,
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
              Section 80D — Health Insurance (max ₹25K self + ₹25K parents)
            </div>
            <div className="tabular-nums" style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: THEME.accent }}>
              <Money value={deductions.sec80D} variant="full" />
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
              Section 24 — Home Loan Interest (max ₹2L)
            </div>
            <div className="tabular-nums" style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: THEME.gold }}>
              <Money value={deductions.sec24} variant="full" />
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
          <div className="tabular-nums" style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: THEME.sage }}>
            <Money value={animatedTotalDeductions} variant="full" />
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
          <CardHeading
            icon={CheckCircle}
            hint="TDS = tax your employer/bank already deducted and deposited on your behalf; Advance Tax = tax you paid directly during the year."
          >
            Tax Already Paid
          </CardHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: THEME.textSecondary }}>TDS Deducted</span>
              <span style={{ fontWeight: 600, color: THEME.text }}>
                <Money value={taxPaid.tds} variant="full" />
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: THEME.textSecondary }}>Advance Tax Paid</span>
              <span style={{ fontWeight: 600, color: THEME.text }}>
                <Money value={taxPaid.advanceTax} variant="full" />
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
              <span className="tabular-nums" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: THEME.accent }}>
                <Money value={animatedTotalTaxPaid} variant="full" />
              </span>
            </div>
          </div>
        </Card>

        <Card style={{ padding: 24 }}>
          <CardHeading
            icon={Calendar}
            hint="If your total tax due (after TDS) exceeds ₹10,000, it's payable in these 4 installments instead of at filing time."
          >
            Advance Tax Schedule
          </CardHeading>
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
                    : "color-mix(in srgb, var(--t-accent) 8%, transparent)",
                  border: `1px solid ${
                    d.isPast ? THEME.border : "color-mix(in srgb, var(--t-accent) 30%, transparent)"
                  }`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {d.isPast ? (
                    <CheckCircle size={16} color={THEME.sage} />
                  ) : (
                    <Clock size={16} color={THEME.accent} />
                  )}
                  <span style={{ fontSize: 13, color: THEME.text }}>
                    {d.label} ({d.pct}% due)
                  </span>
                </div>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: d.isPast ? THEME.sage : THEME.text,
                  }}
                >
                  <Money value={d.due} variant="full" />
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ITR Form Guide */}
      <Card style={{ padding: 24 }}>
        <CardHeading
          icon={FileText}
          hint="A starting point based on data already in the app — not a substitute for confirming with a CA or the official ITR utility."
        >
          Which ITR Form?
        </CardHeading>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "14px 16px",
            borderRadius: 12,
            background: "color-mix(in srgb, var(--t-accent) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--t-accent) 30%, transparent)",
          }}
        >
          <Badge variant="accent" style={{ flexShrink: 0, marginTop: 2 }}>
            {itrGuide.form}
          </Badge>
          <div style={{ flex: 1, minWidth: 200 }}>
            {itrGuide.reasons.length > 0 ? (
              <ul style={{ margin: "0 0 8px", paddingLeft: 18, fontSize: 13, color: THEME.text }}>
                {itrGuide.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: 13, color: THEME.text, marginBottom: 8 }}>
                Based on your data: salary/other income only, no capital gains, and at most one
                house property.
              </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <Info size={13} color={THEME.textSecondary} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: THEME.textSecondary, lineHeight: 1.5 }}>
                This app doesn't track business/professional income, company directorships,
                unlisted shares, or foreign assets — any of those would change your form (e.g. to
                ITR-3, or ITR-4 for presumptive income) regardless of the above.
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Filing Checklist */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={18} style={{ color: THEME.accent }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: THEME.text }}>
              ITR Filing Checklist
            </h3>
          </div>
          <span style={{ fontSize: 13, color: THEME.textSecondary }}>
            {checklistProgress} / {ITR_CHECKLIST.length} completed ({checklistPct}%)
          </span>
        </div>
        <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 16 }}>
          Tick items off as you gather them — your progress is saved automatically.
        </div>
        <div className="progress-track" style={{ marginBottom: 20 }}>
          <div className="progress-fill" style={{ width: `${checklistPct}%` }} />
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
                className="table-row-hover"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 6px",
                  borderRadius: 6,
                  cursor: "pointer",
                  borderBottom: `1px solid ${THEME.border}`,
                  color: checkedItems[item.id] ? THEME.sage : THEME.text,
                  transition: "color 0.15s ease",
                }}
              >
                <input
                  type="checkbox"
                  checked={!!checkedItems[item.id]}
                  onChange={() => toggleCheck(item.id)}
                  style={{ width: 18, height: 18, accentColor: THEME.accent, cursor: "pointer" }}
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
