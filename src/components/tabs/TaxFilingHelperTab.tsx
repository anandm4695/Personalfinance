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
  Shield,
  Layers,
  Sparkles,
  Printer,
  Copy,
  Plus,
  Trash2,
  PieChart as PieChartIcon,
  Search,
  CheckCircle2,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { THEME } from "../../utils/constants";
import { getCurrentFY, getCurrentFYStartYear } from "../../utils/appConstants";
import {
  fmtINR,
  fmtINRFull,
  today,
  calcTaxNewByFY,
  calcTaxOldByFY,
  isHomeLoan,
  loanOutstanding,
  getEffectiveRent,
} from "../../utils/finance";
import { useMasterData, isSeniorCitizen } from "../../utils/masterData";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Money } from "../ui/Money";
import { Modal, ModalActions } from "../ui/Modal";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { TaxSuiteHeader } from "../tax/TaxSuiteHeader";

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS & CHECKLIST CONFIGURATION
   ══════════════════════════════════════════════════════════════════ */

const ADVANCE_TAX_DATES = [
  { date: "06-15", label: "15 Jun", shortLabel: "Q1 - 15 Jun", pct: 15, quarter: "Q1" },
  { date: "09-15", label: "15 Sep", shortLabel: "Q2 - 15 Sep", pct: 45, quarter: "Q2" },
  { date: "12-15", label: "15 Dec", shortLabel: "Q3 - 15 Dec", pct: 75, quarter: "Q3" },
  { date: "03-15", label: "15 Mar", shortLabel: "Q4 - 15 Mar", pct: 100, quarter: "Q4" },
];

interface ChecklistItem {
  id: string;
  label: string;
  category: "Income" | "TDS" | "Deductions" | "Tax Paid" | "Filing";
  description: string;
  isCustom?: boolean;
}

const DEFAULT_ITR_CHECKLIST: ChecklistItem[] = [
  {
    id: "form16",
    label: "Form 16 from employer",
    category: "Income",
    description: "Salary certificate detailing gross salary, exemptions (HRA/LTA), and TDS deducted by employer.",
  },
  {
    id: "form16a",
    label: "Form 16A (TDS on other income)",
    category: "Income",
    description: "TDS certificates from banks (FD interest), clients (contracting), or property transactions.",
  },
  {
    id: "form26as",
    label: "Form 26AS verification",
    category: "TDS",
    description: "Consolidated tax statement from TRACES verifying TDS/TCS deposited against your PAN.",
  },
  {
    id: "ais",
    label: "AIS (Annual Information Statement) review",
    category: "TDS",
    description: "Comprehensive financial activity record including high-value transactions, stock trades, and dividends.",
  },
  {
    id: "bank_interest",
    label: "Bank interest certificates",
    category: "Income",
    description: "Annual interest summary across all active savings accounts for reporting under Other Sources.",
  },
  {
    id: "fd_interest",
    label: "FD interest certificates",
    category: "Income",
    description: "Interest accrued on fixed & recurring deposits (taxable on accrual basis).",
  },
  {
    id: "rental_income",
    label: "Rental income details",
    category: "Income",
    description: "Rent agreements, receipts received, and property tax paid for standard 30% statutory deduction.",
  },
  {
    id: "capital_gains",
    label: "Capital gains computation",
    category: "Income",
    description: "Realized equity/MF trading statements with LTCG, STCG, and grandfathering details for Schedule CG.",
  },
  {
    id: "dividend_income",
    label: "Dividend income records",
    category: "Income",
    description: "Dividend statements received from Indian companies (taxable at normal slab rates).",
  },
  {
    id: "80c",
    label: "Section 80C proof (PPF, ELSS, LIC, etc.)",
    category: "Deductions",
    description: "Deposit receipts, ELSS statement, EPF passbook, and life insurance premium receipts (up to ₹1.5L).",
  },
  {
    id: "80d",
    label: "Section 80D (Health insurance premiums)",
    category: "Deductions",
    description: "Medical insurance premium receipts for self, spouse, children (₹25K/₹50K) and parents (₹25K/₹50K).",
  },
  {
    id: "hra",
    label: "HRA rent receipts",
    category: "Deductions",
    description: "Rent receipts with landlord PAN (mandatory if annual rent exceeds ₹1,00,000) for Old Regime.",
  },
  {
    id: "80tta",
    label: "Section 80TTA/80TTB (Savings interest)",
    category: "Deductions",
    description: "Exemption for savings bank interest (up to ₹10K for non-seniors, ₹50K for senior citizens on all deposits).",
  },
  {
    id: "80ccd",
    label: "Section 80CCD (NPS contribution)",
    category: "Deductions",
    description: "Voluntary Tier-1 National Pension System contribution statement (additional deduction up to ₹50K).",
  },
  {
    id: "home_loan",
    label: "Home loan interest certificate (Sec 24)",
    category: "Deductions",
    description: "Annual provisional/final certificate from lending bank for Sec 24(b) interest (up to ₹2L) and 80C principal.",
  },
  {
    id: "advance_tax",
    label: "Advance tax challans",
    category: "Tax Paid",
    description: "Challan counterfoils with BSR code, challan serial number, and deposit date.",
  },
  {
    id: "tds_credit",
    label: "TDS credit verification",
    category: "Tax Paid",
    description: "Ensure all TDS claimed in ITR strictly matches with credits appearing in Form 26AS.",
  },
  {
    id: "bank_details",
    label: "Bank account details for refund",
    category: "Filing",
    description: "Ensure at least one active bank account is pre-validated and EVC-enabled on the e-filing portal.",
  },
  {
    id: "aadhaar",
    label: "Aadhaar-PAN linking verified",
    category: "Filing",
    description: "Verified linking status to avoid inoperative PAN and ensure seamless Aadhaar OTP e-verification.",
  },
  {
    id: "itr_form",
    label: "Correct ITR form selected",
    category: "Filing",
    description: "Confirmed eligibility criteria (e.g. Schedule CG for capital gains, multiple properties, foreign assets).",
  },
];

const ITR_FORM_DETAILS = [
  {
    form: "ITR-1 (Sahaj)",
    forWhom: "Salaried individuals, one house property, interest/dividend, total income up to ₹50 Lakhs",
    ineligibleIf: "Capital gains from shares/MFs, >1 house property, income > ₹50L, foreign assets, director in company, unlisted shares.",
    complexity: "Simple",
  },
  {
    form: "ITR-2",
    forWhom: "Individuals & HUFs having capital gains (stocks/MFs/property), multiple house properties, income > ₹50L, foreign income/assets.",
    ineligibleIf: "Profits and gains from business or profession (PGBP).",
    complexity: "Moderate",
  },
  {
    form: "ITR-3",
    forWhom: "Individuals and HUFs having income from business, profession, freelancing (non-presumptive), or partner in a firm.",
    ineligibleIf: "Pure salaried/passive income without any business or professional activity.",
    complexity: "Comprehensive",
  },
  {
    form: "ITR-4 (Sugam)",
    forWhom: "Resident individuals, HUFs & firms opting for Presumptive Taxation under Section 44AD, 44ADA, or 44AE with total income up to ₹50 Lakhs.",
    ineligibleIf: "Capital gains, foreign assets, total income > ₹50L, or company directorship.",
    complexity: "Simplified Business",
  },
];

/* ══════════════════════════════════════════════════════════════════
   HEADER SUB-COMPONENT
   ══════════════════════════════════════════════════════════════════ */

const CardHeading = ({
  icon: Icon,
  children,
  hint,
  badge,
}: {
  icon: any;
  children: React.ReactNode;
  hint?: string;
  badge?: React.ReactNode;
}) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={18} style={{ color: THEME.accent }} />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: THEME.text }}>{children}</h3>
      </div>
      {badge && <div>{badge}</div>}
    </div>
    {hint && (
      <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 4, marginLeft: 26, lineHeight: 1.4 }}>
        {hint}
      </div>
    )}
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export const TaxFilingHelperTab = ({
  state,
  metrics: _metrics,
  updateMasterData,
  setTab,
}: {
  state: any;
  metrics?: any;
  updateMasterData?: (key: string, val: any) => void;
  setTab?: (tab: string) => void;
}) => {
  const { familyProfiles } = useMasterData();

  // Checklist state management
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    return state.masterData?._taxChecklist || {};
  });
  const [customItems, setCustomItems] = useState<ChecklistItem[]>(() => {
    return state.masterData?._customTaxChecklist || [];
  });
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [checklistFilter, setChecklistFilter] = useState<"all" | "pending" | "completed">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [checklistSearch, setChecklistSearch] = useState("");

  // Modals & UI helpers
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [isAddChallanModalOpen, setIsAddChallanModalOpen] = useState(false);
  const [challanForm, setChallanForm] = useState({
    amount: "",
    date: today(),
    bsrCode: "",
    challanNo: "",
    type: "Advance Tax",
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Available Financial Years
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
  const [selectedRegime, setSelectedRegime] = useState<"new" | "old">(() => {
    return state.profile?.regime === "old" ? "old" : "new";
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Toggle checklist item
  const toggleCheck = (id: string) => {
    setCheckedItems((prev: Record<string, boolean>) => {
      const next = { ...prev, [id]: !prev[id] };
      if (typeof updateMasterData === "function") {
        updateMasterData("_taxChecklist", next);
      }
      return next;
    });
  };

  // Add custom checklist item
  const addCustomChecklistItem = () => {
    if (!newCustomLabel.trim()) return;
    const newItem: ChecklistItem = {
      id: `custom_${Date.now()}`,
      label: newCustomLabel.trim(),
      category: "Filing",
      description: "Custom user-added verification document",
      isCustom: true,
    };
    const updated = [...customItems, newItem];
    setCustomItems(updated);
    setNewCustomLabel("");
    if (typeof updateMasterData === "function") {
      updateMasterData("_customTaxChecklist", updated);
    }
    showToast("Custom checklist item added");
  };

  const removeCustomChecklistItem = (id: string) => {
    const updated = customItems.filter((i) => i.id !== id);
    setCustomItems(updated);
    setCheckedItems((prev) => {
      const next = { ...prev };
      delete next[id];
      if (typeof updateMasterData === "function") {
        updateMasterData("_taxChecklist", next);
        updateMasterData("_customTaxChecklist", updated);
      }
      return next;
    });
    showToast("Checklist item removed");
  };

  /* ══════════════════════════════════════════════════════════════════
     INCOME COMPUTATION (SCOPED TO SELECTED FY)
     ══════════════════════════════════════════════════════════════════ */
  const incomeSummary = useMemo(() => {
    const fy = selectedFY;
    const [startYear] = fy.split("-").map(Number);
    const fyStart = `${startYear}-04-01`;
    const fyEnd = `${startYear + 1}-03-31`;
    const inFY = (date: string) => Boolean(date && date >= fyStart && date <= fyEnd);

    // Salary income from bank/income ledger
    const salaryIncome = (state.income || [])
      .filter((i: any) => inFY(i.date) && (i.source || "").toLowerCase().includes("salary"))
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

    // Bank interest & Other income (deduplicated)
    const interestIncomeLogged = (state.income || [])
      .filter((i: any) => inFY(i.date) && (i.source || i.category || "").toLowerCase().includes("interest"))
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

    const fdInterestEstimate = (state.fixedDeposits || []).reduce((s: number, fd: any) => {
      const rate = Number(fd.rate || fd.interestRate || 0);
      const principal = Number(fd.principal || 0);
      return s + (principal * rate) / 100;
    }, 0);

    const bankInterest = interestIncomeLogged > 0 ? interestIncomeLogged : fdInterestEstimate;

    const otherIncome = (state.income || [])
      .filter(
        (i: any) =>
          inFY(i.date) &&
          !(i.source || "").toLowerCase().includes("salary") &&
          !(i.source || i.category || "").toLowerCase().includes("interest")
      )
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

    // Rental income (landlord-side)
    const rentalReceiptsLedger = (state.rentalProperties || []).reduce(
      (s: number, p: any) =>
        s +
        (p.receipts || [])
          .filter((r: any) => inFY(r.date))
          .reduce((ss: number, r: any) => ss + Number(r.amount || 0), 0),
      0
    );
    const rentalIncomeEstimate = (state.rentalProperties || [])
      .filter((p: any) => p.isActive !== false)
      .reduce((s: number, p: any) => s + getEffectiveRent(p) * 12, 0);
    const rentalIncome = rentalReceiptsLedger > 0 ? rentalReceiptsLedger : rentalIncomeEstimate;

    // Dividend income
    const dividendIncome = (state.dividends || [])
      .filter((d: any) => inFY(d.date))
      .reduce((s: number, d: any) => s + Number(d.amount || 0), 0);

    // Capital gains
    const stockSellsThisFY = (state.stockSells || []).filter((s: any) => inFY(s.sellDate || s.date));
    const mfSellsThisFY = (state.mfSells || []).filter((s: any) => inFY(s.sellDate || s.date));
    const stockGains = stockSellsThisFY.reduce((s: number, t: any) => s + Number(t.profit || 0), 0);
    const mfGains = mfSellsThisFY.reduce((s: number, t: any) => s + Number(t.profit || 0), 0);
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

  /* ══════════════════════════════════════════════════════════════════
     DEDUCTIONS COMPUTATION (SCOPED TO SELECTED FY)
     ══════════════════════════════════════════════════════════════════ */
  const deductions = useMemo(() => {
    const fy = selectedFY;
    const [startYear] = fy.split("-").map(Number);
    const fyStart = `${startYear}-04-01`;
    const fyEnd = `${startYear + 1}-03-31`;
    const inFY = (date: string) => Boolean(date && date >= fyStart && date <= fyEnd);

    // 80C
    const ppfFromTxns = (state.ppf || []).reduce(
      (sum: number, p: any) =>
        sum +
        (p.transactions || [])
          .filter((t: any) => inFY(t.date) && t.type !== "withdrawal")
          .reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
      0
    );
    const ppfLedgerThisYear = (state.ppfLedger || [])
      .filter((t: any) => inFY(t.date) && t.type !== "withdrawal")
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const ppfContrib =
      ppfFromTxns > 0
        ? ppfFromTxns
        : ppfLedgerThisYear > 0
        ? ppfLedgerThisYear
        : (state.ppf || []).reduce(
            (s: number, p: any) =>
              s + Number(p.thisYearContribution || p.yearlyContribution || p.annualContribution || 0),
            0
          );

    const elss = (state.mutualFunds || [])
      .filter(
        (m: any) => (m.category || m.type || "").toLowerCase().includes("elss") && inFY(m.buyDate)
      )
      .reduce((s: number, m: any) => s + Number(m.invested || 0), 0);

    const licPremium = (state.lic || []).reduce(
      (s: number, l: any) => s + Number(l.annualPremium || 0),
      0
    );

    const epfContrib = (state.epf || []).reduce((s: number, e: any) => {
      const txns = e.transactions || [];
      const empContrib = txns
        .filter(
          (t: any) =>
            (t.type === "employee_contribution" || t.type === "monthly_contribution") &&
            inFY(t.date)
        )
        .reduce((sum: number, t: any) => sum + Number(t.employeeShare || t.amount || 0), 0);
      return s + empContrib;
    }, 0);

    const sec80C = Math.min(150000, ppfContrib + elss + licPremium + epfContrib);

    // 80CCD(1B) — NPS
    const npsTxnSelf = (state.nps || []).reduce((s: number, n: any) => {
      return (
        s +
        (n.transactions || [])
          .filter((t: any) => inFY(t.date))
          .reduce((sum: number, t: any) => sum + Number(t.employeeAmount ?? t.amount ?? 0), 0)
      );
    }, 0);
    const npsAccountSelf = (state.nps || []).reduce(
      (s: number, n: any) => s + Number(n.thisYearContribution || n.yearContribution || 0),
      0
    );
    const npsContrib = npsTxnSelf > 0 ? npsTxnSelf : npsAccountSelf;
    const sec80CCD1B = Math.min(50000, npsContrib);

    // 80D — Health Insurance
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
    const selfProfile = (familyProfiles || []).find((p: any) => p.id === "self");
    const spouseProfile = (familyProfiles || []).find(
      (p: any) => p.id === "wife" || /spouse|wife|husband/i.test(p?.relation || "")
    );
    const isSelfSenior = isSeniorCitizen(selfProfile?.dob);
    const isSelfOrSpouseSenior = isSelfSenior || isSeniorCitizen(spouseProfile?.dob);
    const sec80D_self_limit = isSelfOrSpouseSenior ? 50000 : 25000;

    const isAnyParentSenior =
      (familyProfiles || []).some(
        (p: any) => PARENT_RELATION_RE.test(p?.relation || "") && isSeniorCitizen(p?.dob)
      ) ||
      healthPolicies.some((p: any) =>
        (p.insuredMembers || []).some(
          (m: any) => PARENT_RELATION_RE.test(m?.relation || "") && isSeniorCitizen(m?.dob)
        )
      );
    const sec80D_parents_limit = isAnyParentSenior ? 50000 : 25000;
    const sec80D =
      Math.min(sec80D_self_limit, selfHealthPremium) +
      Math.min(sec80D_parents_limit, parentsHealthPremium);

    // Section 24 — Home loan interest
    const homeLoanInterest = (state.loansTaken || [])
      .filter(isHomeLoan)
      .reduce((s: number, l: any) => s + loanOutstanding(l) * (Number(l.rate || 0) / 100), 0);
    const sec24 = Math.min(200000, homeLoanInterest);

    // Section 80TTA / 80TTB
    const savingsInterest = (state.bankAccounts || []).reduce((s: number, a: any) => {
      if ((a.type || "").toLowerCase() === "savings")
        return s + Number(a.balance || 0) * (Number(a.interestRate || 3.0) / 100);
      return s;
    }, 0);
    const depositInterest = isSelfSenior
      ? (state.fixedDeposits || []).reduce(
          (s: number, d: any) => s + Number(d.principal || 0) * (Number(d.interestRate || 6.5) / 100),
          0
        ) +
        (state.recurringDeposits || []).reduce(
          (s: number, r: any) =>
            s + Number(r.monthlyDeposit || 0) * 12 * (Number(r.interestRate || 6.5) / 100),
          0
        )
      : 0;
    const sec80TTA_limit = isSelfSenior ? 50000 : 10000;
    const sec80TTA = Math.min(sec80TTA_limit, savingsInterest + depositInterest);

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
      sec80D_self_limit,
      sec80D_parents_limit,
      isSelfSenior,
      is80TTB: isSelfSenior,
      sec24,
      sec80TTA,
      totalDeductions,
    };
  }, [state, selectedFY, familyProfiles]);

  /* ══════════════════════════════════════════════════════════════════
     TAX COMPUTATION (NEW REGIME VS OLD REGIME)
     ══════════════════════════════════════════════════════════════════ */
  const taxCalculations = useMemo(() => {
    const fy = selectedFY;
    const [startYear] = fy.split("-").map(Number);
    const gross = incomeSummary.totalIncome;

    const oldStdDed = startYear >= 2020 ? 50_000 : 40_000;
    const newTax = calcTaxNewByFY(gross, fy);
    const oldTax = calcTaxOldByFY(gross, oldStdDed + deductions.totalDeductions, fy);

    const activeTax = selectedRegime === "new" ? newTax : oldTax;
    const taxSavingsByNew = oldTax.total - newTax.total;
    const recommendedRegime = newTax.total <= oldTax.total ? "new" : "old";

    return {
      newTax,
      oldTax,
      activeTax,
      taxSavingsByNew,
      recommendedRegime,
    };
  }, [incomeSummary.totalIncome, selectedFY, deductions.totalDeductions, selectedRegime]);

  /* ══════════════════════════════════════════════════════════════════
     TAXES PAID (TDS + ADVANCE TAX)
     ══════════════════════════════════════════════════════════════════ */
  const taxPaid = useMemo(() => {
    const fy = selectedFY;
    const [startYear] = fy.split("-").map(Number);
    const fyStart = `${startYear}-04-01`;
    const fyEnd = `${startYear + 1}-03-31`;
    const inFY = (date: string) => Boolean(date && date >= fyStart && date <= fyEnd);

    const incomeTds = (state.income || [])
      .filter((i: any) => inFY(i.date))
      .reduce((s: number, i: any) => s + Number(i.tds || 0), 0);

    const salarySlipTds = (state.salarySlips || [])
      .filter(
        (s: any) =>
          s.slipMonth &&
          s.slipMonth >= fyStart.slice(0, 7) &&
          s.slipMonth <= fyEnd.slice(0, 7)
      )
      .reduce(
        (s: number, slip: any) => s + Number(slip.tds || 0) + Number(slip.incomeTax || 0),
        0
      );
    const tds = incomeTds > 0 ? incomeTds : salarySlipTds;

    const advanceTax = (state.taxPayments || [])
      .filter((t: any) => t.fy === fy)
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

    const total = tds + advanceTax;
    const netPosition = total - taxCalculations.activeTax.total;
    const isRefund = netPosition > 0;
    const isPayable = netPosition < 0;
    const balanceAmount = Math.abs(netPosition);

    return {
      tds,
      advanceTax,
      total,
      netPosition,
      isRefund,
      isPayable,
      balanceAmount,
    };
  }, [state, selectedFY, taxCalculations.activeTax.total]);

  /* ══════════════════════════════════════════════════════════════════
     ADVANCE TAX 4-QUARTER SCHEDULE
     ══════════════════════════════════════════════════════════════════ */
  const advanceTaxSchedule = useMemo(() => {
    const now = today();
    const fy = selectedFY;
    const [startYear] = fy.split("-").map(Number);
    const regime = state.profile?.regime || selectedRegime;
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
  }, [selectedFY, incomeSummary, deductions, state.profile, selectedRegime]);

  /* ══════════════════════════════════════════════════════════════════
     FILING DEADLINE LOGIC
     ══════════════════════════════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════════════════════════════
     ITR FORM DETERMINATION GUIDE
     ══════════════════════════════════════════════════════════════════ */
  const itrGuide = useMemo(() => {
    const reasons: string[] = [];
    if (incomeSummary.totalIncome > 5000000) {
      reasons.push("Total income is above ₹50 lakh");
    }
    if (incomeSummary.hasCapitalGainRecords) {
      reasons.push("You have capital gains/losses from stocks or mutual funds this FY");
    }
    const ownedCount = (state.realEstateProperties || []).filter(
      (p: any) => p.status !== "sold"
    ).length;
    const letOutCount = (state.rentalProperties || []).filter((p: any) => p.isActive !== false).length;
    const housePropertyCount = Math.max(ownedCount, letOutCount);
    if (housePropertyCount > 1) {
      reasons.push(`You have ${housePropertyCount} house properties on record`);
    }
    const form = reasons.length > 0 ? "ITR-2" : "ITR-1 (Sahaj)";
    return { form, reasons, housePropertyCount };
  }, [
    incomeSummary.totalIncome,
    incomeSummary.hasCapitalGainRecords,
    state.realEstateProperties,
    state.rentalProperties,
  ]);

  /* ══════════════════════════════════════════════════════════════════
     CHECKLIST & READINESS SCORE
     ══════════════════════════════════════════════════════════════════ */
  const allChecklistItems = useMemo(() => {
    return [...DEFAULT_ITR_CHECKLIST, ...customItems];
  }, [customItems]);

  const checklistProgress = allChecklistItems.filter((item) => checkedItems[item.id]).length;
  const checklistPct = Math.round((checklistProgress / allChecklistItems.length) * 100);
  const categories = [...new Set(allChecklistItems.map((i) => i.category))];

  const filteredChecklist = useMemo(() => {
    return allChecklistItems.filter((item) => {
      const matchesSearch =
        item.label.toLowerCase().includes(checklistSearch.toLowerCase()) ||
        item.description.toLowerCase().includes(checklistSearch.toLowerCase()) ||
        item.category.toLowerCase().includes(checklistSearch.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const isChecked = Boolean(checkedItems[item.id]);
      const matchesStatus =
        checklistFilter === "all" ||
        (checklistFilter === "completed" && isChecked) ||
        (checklistFilter === "pending" && !isChecked);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [allChecklistItems, checklistSearch, selectedCategory, checklistFilter, checkedItems]);

  const overallReadinessScore = useMemo(() => {
    let score = 0;
    score += Math.round(checklistPct * 0.5);
    if (incomeSummary.totalIncome > 0) score += 20;
    if (deductions.totalDeductions > 0 || selectedRegime === "new") score += 15;
    if (taxPaid.total > 0 || taxCalculations.activeTax.total === 0) score += 15;
    return Math.min(100, score);
  }, [
    checklistPct,
    incomeSummary.totalIncome,
    deductions.totalDeductions,
    selectedRegime,
    taxPaid.total,
    taxCalculations.activeTax.total,
  ]);

  // Animated values
  const animatedTotalIncome = useAnimatedNumber(incomeSummary.totalIncome);
  const animatedTotalDeductions = useAnimatedNumber(deductions.totalDeductions);
  const animatedTotalTaxPaid = useAnimatedNumber(taxPaid.total);

  const fmtDateLong = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  };

  /* ══════════════════════════════════════════════════════════════════
     EXPORT & PRINT HANDLERS
     ══════════════════════════════════════════════════════════════════ */
  const downloadSummary = () => {
    const lines: string[] = [];
    lines.push(`INCOME TAX FILING SUMMARY — FY ${selectedFY} (AY ${filingDeadline.ay})`);
    lines.push(`Generated: ${fmtDateLong(today())}`);
    lines.push(`Selected Regime: ${selectedRegime.toUpperCase()}`);
    lines.push(`Readiness Score: ${overallReadinessScore}%`);
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
    allChecklistItems.forEach((item) => {
      lines.push(`[${checkedItems[item.id] ? "x" : " "}] ${item.label} (${item.category})`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Tax_Filing_Summary_FY${selectedFY}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Summary downloaded successfully");
  };

  const recordChallan = () => {
    if (!challanForm.amount || Number(challanForm.amount) <= 0) {
      showToast("Please enter a valid amount");
      return;
    }
    const newPayment = {
      id: `taxpay_${Date.now()}`,
      fy: selectedFY,
      amount: Number(challanForm.amount),
      date: challanForm.date,
      bsrCode: challanForm.bsrCode,
      challanNo: challanForm.challanNo,
      type: challanForm.type,
    };
    const updated = [...(state.taxPayments || []), newPayment];
    if (typeof updateMasterData === "function") {
      updateMasterData("taxPayments", updated);
    }
    setIsAddChallanModalOpen(false);
    setChallanForm({
      amount: "",
      date: today(),
      bsrCode: "",
      challanNo: "",
      type: "Advance Tax",
    });
    showToast("Tax payment recorded successfully");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Unified Tax Suite Header ─────────────────────────────── */}
      <TaxSuiteHeader activeTab="taxfiling" setTab={setTab} />
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: THEME.accent,
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 500,
          }}
        >
          <CheckCircle size={18} />
          {toastMessage}
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════════
         FILING DEADLINE CARD
         ══════════════════════════════════════════════════════════════════ */}
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
                ? `You can still file a belated return until ${fmtDateLong(
                    filingDeadline.belatedDate
                  )}, with a late fee under Section 234F (up to ₹5,000) and interest on any unpaid tax.`
                : "This is the statutory due date for individuals without a tax-audit requirement — CBDT sometimes extends it, and it moves to 31 October if you have business/professional income requiring an audit."}
            </div>
          </div>
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
         TAX REGIME COMPARISON & OPTIMIZATION
         ══════════════════════════════════════════════════════════════════ */}
      <Card style={{ padding: 24 }}>
        <CardHeading
          icon={Sparkles}
          hint="Compare taxable income, slab rates, standard deductions and net tax liability between New and Old Tax Regimes."
          badge={
            <Badge variant={taxCalculations.recommendedRegime === "new" ? "accent" : "sage"}>
              Recommended: {taxCalculations.recommendedRegime === "new" ? "New Tax Regime" : "Old Tax Regime"}
            </Badge>
          }
        >
          Tax Regime Comparison & Optimization (FY {selectedFY})
        </CardHeading>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {/* New Regime Card */}
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background:
                selectedRegime === "new"
                  ? "color-mix(in srgb, var(--t-accent) 10%, var(--t-bg))"
                  : THEME.bg,
              border: `2px solid ${
                selectedRegime === "new" ? THEME.accent : THEME.border
              }`,
              position: "relative",
            }}
          >
            {selectedRegime === "new" && (
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  fontSize: 10,
                  fontWeight: 700,
                  background: THEME.accent,
                  color: "#fff",
                  padding: "2px 6px",
                  borderRadius: 8,
                }}
              >
                ACTIVE
              </div>
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text }}>
              New Tax Regime (Section 115BAC)
            </div>
            <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 4 }}>
              Lower slab rates, ₹75,000 std deduction & zero tax up to ₹12 Lakhs (FY 2025-26+)
            </div>

            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ color: THEME.textSecondary }}>Gross Income:</span>
                <span style={{ fontWeight: 600, color: THEME.text }}>
                  <Money value={incomeSummary.totalIncome} variant="full" />
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ color: THEME.textSecondary }}>Standard Deduction:</span>
                <span style={{ fontWeight: 600, color: THEME.sage }}>- ₹75,000</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ color: THEME.textSecondary }}>Effective Tax Rate:</span>
                <span style={{ fontWeight: 600, color: THEME.text }}>
                  {taxCalculations.newTax.effectiveRate?.toFixed(1) || 0}%
                </span>
              </div>
              <div
                style={{
                  borderTop: `1px solid ${THEME.border}`,
                  paddingTop: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 700, color: THEME.text }}>Total Net Tax:</span>
                <span
                  className="tabular-nums"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 800,
                    color: THEME.accent,
                  }}
                >
                  <Money value={taxCalculations.newTax.total} variant="full" />
                </span>
              </div>
            </div>

            <Button
              variant={selectedRegime === "new" ? "secondary" : "primary"}
              size="sm"
              style={{ width: "100%", marginTop: 14 }}
              onClick={() => setSelectedRegime("new")}
            >
              {selectedRegime === "new" ? "Currently Selected" : "Switch to New Regime"}
            </Button>
          </div>

          {/* Old Regime Card */}
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background:
                selectedRegime === "old"
                  ? "color-mix(in srgb, var(--t-accent) 10%, var(--t-bg))"
                  : THEME.bg,
              border: `2px solid ${
                selectedRegime === "old" ? THEME.accent : THEME.border
              }`,
              position: "relative",
            }}
          >
            {selectedRegime === "old" && (
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  fontSize: 10,
                  fontWeight: 700,
                  background: THEME.accent,
                  color: "#fff",
                  padding: "2px 6px",
                  borderRadius: 8,
                }}
              >
                ACTIVE
              </div>
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text }}>
              Old Tax Regime
            </div>
            <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 4 }}>
              Full deductions for 80C, 80D, HRA, Home Loan Interest (Sec 24) & NPS
            </div>

            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ color: THEME.textSecondary }}>Gross Income:</span>
                <span style={{ fontWeight: 600, color: THEME.text }}>
                  <Money value={incomeSummary.totalIncome} variant="full" />
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ color: THEME.textSecondary }}>Std Ded + Chapter VI-A:</span>
                <span style={{ fontWeight: 600, color: THEME.sage }}>
                  - <Money value={50000 + deductions.totalDeductions} variant="full" />
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ color: THEME.textSecondary }}>Effective Tax Rate:</span>
                <span style={{ fontWeight: 600, color: THEME.text }}>
                  {taxCalculations.oldTax.effectiveRate?.toFixed(1) || 0}%
                </span>
              </div>
              <div
                style={{
                  borderTop: `1px solid ${THEME.border}`,
                  paddingTop: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 700, color: THEME.text }}>Total Net Tax:</span>
                <span
                  className="tabular-nums"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 800,
                    color: THEME.sage,
                  }}
                >
                  <Money value={taxCalculations.oldTax.total} variant="full" />
                </span>
              </div>
            </div>

            <Button
              variant={selectedRegime === "old" ? "secondary" : "primary"}
              size="sm"
              style={{ width: "100%", marginTop: 14 }}
              onClick={() => setSelectedRegime("old")}
            >
              {selectedRegime === "old" ? "Currently Selected" : "Switch to Old Regime"}
            </Button>
          </div>
        </div>

        {/* Tax Savings Delta Banner */}
        <div
          style={{
            marginTop: 14,
            padding: "12px 16px",
            borderRadius: 10,
            background: "color-mix(in srgb, var(--t-accent) 8%, var(--t-bg))",
            border: "1px solid color-mix(in srgb, var(--t-accent) 25%, transparent)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Zap size={18} color={THEME.accent} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>
              {taxCalculations.taxSavingsByNew >= 0
                ? `You save ${fmtINRFull(taxCalculations.taxSavingsByNew)} with the New Tax Regime!`
                : `You save ${fmtINRFull(Math.abs(taxCalculations.taxSavingsByNew))} with the Old Tax Regime due to high Chapter VI-A deductions!`}
            </span>
          </div>
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
         INCOME SUMMARY CARD
         ══════════════════════════════════════════════════════════════════ */}
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
                    <div
                      className="tabular-nums"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 18,
                        fontWeight: 700,
                        color,
                      }}
                    >
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
              <div
                className="tabular-nums"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  fontWeight: 700,
                  color: THEME.accent,
                }}
              >
                <Money value={animatedTotalIncome} variant="full" />
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
         DEDUCTIONS CARD
         ══════════════════════════════════════════════════════════════════ */}
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
          {/* Section 80C */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: THEME.bg,
              border: `1px solid ${THEME.border}`,
            }}
          >
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>
              Section 80C (max ₹1.5L)
            </div>
            <div
              className="tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 700,
                color: THEME.sage,
              }}
            >
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

          {/* Section 80CCD(1B) */}
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
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 700,
                color: THEME.violet,
              }}
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

          {/* Section 80D */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: THEME.bg,
              border: `1px solid ${THEME.border}`,
            }}
          >
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>
              Section 80D — Health Insurance (max ₹{Math.round(deductions.sec80D_self_limit / 1000)}K self + ₹{Math.round(deductions.sec80D_parents_limit / 1000)}K parents)
            </div>
            <div
              className="tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 700,
                color: THEME.accent,
              }}
            >
              <Money value={deductions.sec80D} variant="full" />
            </div>
          </div>

          {/* Section 24 */}
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
            <div
              className="tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 700,
                color: THEME.gold,
              }}
            >
              <Money value={deductions.sec24} variant="full" />
            </div>
          </div>
        </div>

        {/* Total Deductions Footer */}
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
          <div
            className="tabular-nums"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 700,
              color: THEME.sage,
            }}
          >
            <Money value={animatedTotalDeductions} variant="full" />
          </div>
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
         TAX PAID & ADVANCE TAX
         ══════════════════════════════════════════════════════════════════ */}
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
              <span
                className="tabular-nums"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 18,
                  color: THEME.accent,
                }}
              >
                <Money value={animatedTotalTaxPaid} variant="full" />
              </span>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={14} />}
            style={{ width: "100%", marginTop: 14 }}
            onClick={() => setIsAddChallanModalOpen(true)}
          >
            Record Advance Tax Challan
          </Button>
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
                    d.isPast
                      ? THEME.border
                      : "color-mix(in srgb, var(--t-accent) 30%, transparent)"
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

      {/* ══════════════════════════════════════════════════════════════════
         WHICH ITR FORM?
         ══════════════════════════════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════════════════════════════
         ITR FILING CHECKLIST
         ══════════════════════════════════════════════════════════════════ */}
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
            {checklistProgress} / {allChecklistItems.length} completed ({checklistPct}%)
          </span>
        </div>

        <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 16 }}>
          Tick items off as you gather them — your progress is saved automatically.
        </div>

        <div className="progress-track" style={{ marginBottom: 20 }}>
          <div className="progress-fill" style={{ width: `${checklistPct}%` }} />
        </div>

        {/* Filter & Search Strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["all", "Income", "TDS", "Deductions", "Tax Paid", "Filing"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 16,
                  border: `1px solid ${
                    selectedCategory === cat ? THEME.accent : THEME.border
                  }`,
                  background:
                    selectedCategory === cat
                      ? "color-mix(in srgb, var(--t-accent) 15%, transparent)"
                      : "transparent",
                  color: selectedCategory === cat ? THEME.accent : THEME.textSecondary,
                  fontSize: 12,
                  fontWeight: selectedCategory === cat ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                {cat === "all" ? "All Categories" : cat}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={checklistFilter}
              onChange={(e: any) => setChecklistFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: `1px solid ${THEME.border}`,
                background: THEME.card,
                color: THEME.text,
                fontSize: 12.5,
              }}
            >
              <option value="all">All Items</option>
              <option value="pending">Pending Only</option>
              <option value="completed">Completed Only</option>
            </select>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 8,
                border: `1px solid ${THEME.border}`,
                background: THEME.card,
              }}
            >
              <Search size={14} color={THEME.textSecondary} />
              <input
                type="text"
                placeholder="Search checklist..."
                value={checklistSearch}
                onChange={(e) => setChecklistSearch(e.target.value)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: THEME.text,
                  fontSize: 12.5,
                  outline: "none",
                  width: 120,
                }}
              />
            </div>
          </div>
        </div>

        {/* Grouped Checklist Categories */}
        {categories
          .filter((cat) => selectedCategory === "all" || selectedCategory === cat)
          .map((cat) => {
            const categoryItems = filteredChecklist.filter((i) => i.category === cat);
            if (categoryItems.length === 0) return null;
            return (
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
                {categoryItems.map((item) => (
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
                      style={{
                        width: 18,
                        height: 18,
                        accentColor: THEME.accent,
                        cursor: "pointer",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        textDecoration: checkedItems[item.id] ? "line-through" : "none",
                        flex: 1,
                      }}
                    >
                      {item.label}
                    </span>
                    {item.isCustom && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeCustomChecklistItem(item.id);
                        }}
                        title="Delete custom item"
                        style={{
                          border: "none",
                          background: "transparent",
                          color: THEME.rust,
                          cursor: "pointer",
                          padding: 4,
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </label>
                ))}
              </div>
            );
          })}

        {/* Add Custom Item Row */}
        <div
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: `1px solid ${THEME.border}`,
            display: "flex",
            gap: 10,
          }}
        >
          <input
            type="text"
            placeholder="Add custom CA requirement (e.g., Form 10BA for rent without HRA)..."
            value={newCustomLabel}
            onChange={(e) => setNewCustomLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomChecklistItem()}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${THEME.border}`,
              background: THEME.bg,
              color: THEME.text,
              fontSize: 13,
              outline: "none",
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={addCustomChecklistItem}
          >
            Add Custom Item
          </Button>
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
         MODAL 1: PRINTABLE CA DOSSIER / PREVIEW
         ══════════════════════════════════════════════════════════════════ */}
      {isDossierModalOpen && (
        <Modal
          onClose={() => setIsDossierModalOpen(false)}
          title={`CA Tax Filing Dossier — FY ${selectedFY} (AY ${filingDeadline.ay})`}
          maxWidth={760}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
            <div
              style={{
                padding: 16,
                borderRadius: 10,
                background: THEME.bg,
                border: `1px solid ${THEME.border}`,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 10,
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: THEME.textSecondary }}>Assessee Name:</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text }}>{state.profile?.name || "Taxpayer"}</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: THEME.textSecondary }}>Financial Year:</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text }}>FY {selectedFY} (AY {filingDeadline.ay})</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: THEME.textSecondary }}>Selected Regime:</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.accent }}>{selectedRegime.toUpperCase()} REGIME</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: THEME.textSecondary }}>Recommended ITR:</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.sage }}>{itrGuide.form}</div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: THEME.text, marginBottom: 8 }}>
                1. Gross Total Income Computation
              </h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: THEME.bg, borderBottom: `2px solid ${THEME.border}` }}>
                    <th style={{ textAlign: "left", padding: 8 }}>Income Head</th>
                    <th style={{ textAlign: "right", padding: 8 }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <td style={{ padding: 8 }}>Income from Salary (Sec 17)</td>
                    <td style={{ textAlign: "right", padding: 8, fontWeight: 600 }}><Money value={incomeSummary.salaryIncome} variant="full" /></td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <td style={{ padding: 8 }}>Income from House Property (Gross Rent)</td>
                    <td style={{ textAlign: "right", padding: 8, fontWeight: 600 }}><Money value={incomeSummary.rentalIncome} variant="full" /></td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <td style={{ padding: 8 }}>Income from Other Sources (Bank/FD Interest & Dividends)</td>
                    <td style={{ textAlign: "right", padding: 8, fontWeight: 600 }}><Money value={incomeSummary.bankInterest + incomeSummary.dividendIncome + incomeSummary.otherIncome} variant="full" /></td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <td style={{ padding: 8 }}>Capital Gains (Stocks & Mutual Funds)</td>
                    <td style={{ textAlign: "right", padding: 8, fontWeight: 600 }}><Money value={Math.max(0, incomeSummary.stockGains + incomeSummary.mfGains)} variant="full" /></td>
                  </tr>
                  <tr style={{ background: "color-mix(in srgb, var(--t-accent) 8%, transparent)", fontWeight: 700 }}>
                    <td style={{ padding: 10 }}>GROSS TOTAL INCOME</td>
                    <td style={{ textAlign: "right", padding: 10, color: THEME.accent }}><Money value={incomeSummary.totalIncome} variant="full" /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: THEME.text, marginBottom: 8 }}>
                2. Deductions & Net Tax Liability
              </h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <td style={{ padding: 8 }}>Chapter VI-A Deductions (80C, 80D, 80CCD, Sec 24)</td>
                    <td style={{ textAlign: "right", padding: 8, fontWeight: 600, color: THEME.sage }}>- <Money value={deductions.totalDeductions} variant="full" /></td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <td style={{ padding: 8 }}>Net Tax Liability ({selectedRegime.toUpperCase()})</td>
                    <td style={{ textAlign: "right", padding: 8, fontWeight: 700 }}><Money value={taxCalculations.activeTax.total} variant="full" /></td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <td style={{ padding: 8 }}>TDS Deducted & Advance Tax Paid</td>
                    <td style={{ textAlign: "right", padding: 8, fontWeight: 600, color: THEME.accent }}>- <Money value={taxPaid.total} variant="full" /></td>
                  </tr>
                  <tr
                    style={{
                      background: taxPaid.isRefund
                        ? "color-mix(in srgb, var(--t-sage) 12%, transparent)"
                        : "color-mix(in srgb, var(--t-rust) 12%, transparent)",
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    <td style={{ padding: 10 }}>{taxPaid.isRefund ? "NET REFUND DUE" : "NET TAX PAYABLE"}</td>
                    <td
                      style={{
                        textAlign: "right",
                        padding: 10,
                        color: taxPaid.isRefund ? THEME.sage : THEME.rust,
                      }}
                    >
                      <Money value={taxPaid.balanceAmount} variant="full" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <ModalActions
              onClose={() => setIsDossierModalOpen(false)}
              saveLabel="Download TXT File"
              onSave={downloadSummary}
            />
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════════
         MODAL 2: LOG ADVANCE TAX CHALLAN
         ══════════════════════════════════════════════════════════════════ */}
      {isAddChallanModalOpen && (
        <Modal
          onClose={() => setIsAddChallanModalOpen(false)}
          title="Record Tax Payment Challan"
          maxWidth={480}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: THEME.textSecondary, marginBottom: 4, display: "block" }}>
                Payment Type
              </label>
              <select
                value={challanForm.type}
                onChange={(e) => setChallanForm({ ...challanForm, type: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  background: THEME.bg,
                  color: THEME.text,
                  fontSize: 13,
                }}
              >
                <option value="Advance Tax">Advance Tax (Code 100)</option>
                <option value="Self-Assessment Tax">Self-Assessment Tax (Code 300)</option>
                <option value="Regular Assessment Tax">Regular Assessment Tax (Code 400)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: THEME.textSecondary, marginBottom: 4, display: "block" }}>
                Amount Paid (₹) *
              </label>
              <input
                type="number"
                placeholder="e.g. 25000"
                value={challanForm.amount}
                onChange={(e) => setChallanForm({ ...challanForm, amount: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  background: THEME.bg,
                  color: THEME.text,
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: THEME.textSecondary, marginBottom: 4, display: "block" }}>
                Date of Deposit
              </label>
              <input
                type="date"
                value={challanForm.date}
                onChange={(e) => setChallanForm({ ...challanForm, date: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  background: THEME.bg,
                  color: THEME.text,
                  fontSize: 13,
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: THEME.textSecondary, marginBottom: 4, display: "block" }}>
                  BSR Code (7 Digits)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0510304"
                  maxLength={7}
                  value={challanForm.bsrCode}
                  onChange={(e) => setChallanForm({ ...challanForm, bsrCode: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    background: THEME.bg,
                    color: THEME.text,
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: THEME.textSecondary, marginBottom: 4, display: "block" }}>
                  Challan Serial No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. 01245"
                  maxLength={10}
                  value={challanForm.challanNo}
                  onChange={(e) => setChallanForm({ ...challanForm, challanNo: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    background: THEME.bg,
                    color: THEME.text,
                    fontSize: 13,
                  }}
                />
              </div>
            </div>

            <ModalActions
              onClose={() => setIsAddChallanModalOpen(false)}
              saveLabel="Save Challan"
              onSave={recordChallan}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};
