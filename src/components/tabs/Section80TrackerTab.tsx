import React, { useState, useMemo, useEffect } from "react";
import {
  Shield,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Heart,
  Home,
  Briefcase,
  Coins,
  TrendingUp,
  Landmark,
  Star,
  Plus,
  Trash2,
  Calendar,
  Zap,
  PieChart as PieChartIcon,
  Sliders,
  FileText,
  Layers,
  Award,
  HelpCircle,
  Clock,
  HeartPulse,
  GraduationCap,
  Gift,
  Building2,
  Percent,
  Activity,
  UserCheck,
  Printer,
  Sparkles,
  Copy,
  Check,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { THEME } from "../../utils/constants";
import {
  fmtINR,
  fmtINRFull,
  isHomeLoan,
  loanOutstanding,
  getEffectiveRent,
  annualizePremium,
} from "../../utils/finance";
import { useMasterData, isSeniorCitizen } from "../../utils/masterData";
import { getCurrentFY, getCurrentFYStartYear } from "../../utils/appConstants";
import { annualizeContribution } from "../../utils/govtSchemes";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";
import { Money } from "../ui/Money";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal, ModalActions } from "../ui/Modal";
import { ConfirmDialog } from "../ui/Feedback";

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS, TYPES & COLOR TOKENS
   ══════════════════════════════════════════════════════════════════ */

const COLORS = [
  THEME.accent,
  THEME.sage,
  THEME.gold,
  THEME.violet,
  THEME.rose || "#f43f5e",
  THEME.cyan || "#06b6d4",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
];

export interface CustomDeduction {
  id: string;
  fy: string;
  section:
    | "80C"
    | "80CCD1B"
    | "80CCD2"
    | "80D_SELF"
    | "80D_PARENTS"
    | "80D_CHECKUP_SELF"
    | "80D_CHECKUP_PARENTS"
    | "80E"
    | "80G_100"
    | "80G_50"
    | "80GG"
    | "80TTA"
    | "80TTB"
    | "80U"
    | "80DD"
    | "80DDB"
    | "80EEA"
    | "80EEB"
    | "SEC24"
    | "OTHER";
  category: string;
  amount: number;
  notes?: string;
  createdAt: string;
}

const STORAGE_KEY = "PF_SECTION_80_CUSTOM_DEDUCTIONS_V2";

export const PRESET_CUSTOM_DEDUCTIONS = [
  {
    category: "Children Tuition Fees (Max 2 Children)",
    section: "80C" as const,
    description: "Tuition fees paid for full-time education in India (under ₹1.5L 80C cap)",
  },
  {
    category: "Stamp Duty & Registration on House Purchase",
    section: "80C" as const,
    description: "Paid in the year of property purchase (under ₹1.5L 80C cap)",
  },
  {
    category: "5-Year Tax Saver Bank Fixed Deposit",
    section: "80C" as const,
    description: "FD with 5-year lock-in with scheduled bank (under ₹1.5L 80C cap)",
  },
  {
    category: "Senior Citizen Savings Scheme (SCSS)",
    section: "80C" as const,
    description: "Govt-backed 5-year scheme for age 60+ (under ₹1.5L 80C cap)",
  },
  {
    category: "Preventive Health Checkup (Self / Family)",
    section: "80D_CHECKUP_SELF" as const,
    description: "Up to ₹5,000 sub-limit within the ₹25k / ₹50k overall 80D limit",
  },
  {
    category: "Preventive Health Checkup (Parents)",
    section: "80D_CHECKUP_PARENTS" as const,
    description: "Up to ₹5,000 sub-limit within parents' ₹25k / ₹50k 80D limit",
  },
  {
    category: "Medical Expenditure for Senior Citizen Parents (No Insurance)",
    section: "80D_PARENTS" as const,
    description: "Medical expenses for parents aged 60+ who have no mediclaim policy (up to ₹50k)",
  },
  {
    category: "Higher Education Loan Interest (Section 80E)",
    section: "80E" as const,
    description: "Interest paid on higher education loan for self/spouse/children (No upper limit for 8 years)",
  },
  {
    category: "100% Tax Relief Donation (PM CARES / PMNRF / NDF)",
    section: "80G_100" as const,
    description: "Donations with 100% deduction without qualifying limit",
  },
  {
    category: "50% Tax Relief Donation (Approved NGOs / Charitable Trusts)",
    section: "80G_50" as const,
    description: "Donations to eligible trusts (50% deduction subject to 10% adjusted gross income cap)",
  },
  {
    category: "Rent Paid Without HRA (Section 80GG)",
    section: "80GG" as const,
    description: "For self-employed or salaried employees not receiving HRA (Up to ₹60,000/year)",
  },
  {
    category: "Medical Treatment for Specified Diseases (Section 80DDB)",
    section: "80DDB" as const,
    description: "Treatment of specified ailments (₹40,000 for regular / ₹1,00,000 for senior citizens)",
  },
  {
    category: "Electric Vehicle (EV) Loan Interest (Section 80EEB)",
    section: "80EEB" as const,
    description: "Interest on loan sanctioned for EV purchase (Up to ₹1,50,000)",
  },
  {
    category: "Self Disability Relief (Section 80U)",
    section: "80U" as const,
    description: "Flat ₹75,000 (40%-80% disability) or ₹1,25,000 (severe 80%+ disability)",
  },
  {
    category: "Dependent Disability Maintenance (Section 80DD)",
    section: "80DD" as const,
    description: "Flat ₹75,000 (40%-80% disability) or ₹1,25,000 (severe 80%+ disability)",
  },
];

// 80C Instrument Comparison Matrix
const SEC_80C_INSTRUMENTS = [
  {
    name: "ELSS Mutual Funds",
    lockIn: "3 Years",
    returns: "12 - 15% p.a.",
    taxability: "LTCG > ₹1.25L taxed at 12.5%",
    risk: "High (Equity)",
    badge: "Highest Potential",
    color: THEME.accent,
  },
  {
    name: "Public Provident Fund (PPF)",
    lockIn: "15 Years",
    returns: "7.1% p.a. (Govt fixed)",
    taxability: "Exempt - Exempt - Exempt (EEE)",
    risk: "Zero (Sovereign)",
    badge: "100% Tax Free",
    color: THEME.sage,
  },
  {
    name: "National Pension Scheme (NPS Tier 1)",
    lockIn: "Till Age 60",
    returns: "9 - 12% p.a.",
    taxability: "60% Tax Free lump sum, 40% Annuity",
    risk: "Moderate (Market linked)",
    badge: "+ ₹50k Extra 80CCD",
    color: THEME.violet,
  },
  {
    name: "Employee Provident Fund (EPF)",
    lockIn: "Till Retirement / Job exit",
    returns: "8.25% p.a.",
    taxability: "Tax-free interest up to ₹2.5L contrib/yr",
    risk: "Zero (Govt backed)",
    badge: "Salary Deducted",
    color: THEME.gold,
  },
  {
    name: "Sukanya Samriddhi Yojana (SSY)",
    lockIn: "21 Years (Girl child)",
    returns: "8.2% p.a.",
    taxability: "Exempt - Exempt - Exempt (EEE)",
    risk: "Zero (Sovereign)",
    badge: "Girl Child EEE",
    color: THEME.rose || "#f43f5e",
  },
  {
    name: "National Savings Certificate (NSC)",
    lockIn: "5 Years",
    returns: "7.7% p.a. (Compounded)",
    taxability: "Interest taxable (Deemed reinvested Y1-Y4)",
    risk: "Zero (Sovereign)",
    badge: "Fixed Return",
    color: THEME.cyan || "#06b6d4",
  },
  {
    name: "5-Year Tax Saver Bank FD",
    lockIn: "5 Years",
    returns: "6.5 - 7.5% p.a.",
    taxability: "Interest fully taxable per slab",
    risk: "Zero (DICGC insured ₹5L)",
    badge: "Guaranteed",
    color: "#f59e0b",
  },
];

/* ══════════════════════════════════════════════════════════════
   PROGRESS BAR & GAUGE COMPONENT
   ══════════════════════════════════════════════════════════════ */

const CustomProgressBar: React.FC<{
  used: number;
  limit: number;
  color: string;
  showLabels?: boolean;
  unitLabel?: string;
}> = ({ used, limit, color, showLabels = true, unitLabel = "remaining" }) => {
  const pct = Math.min(100, Math.max(0, limit > 0 ? (used / limit) * 100 : 0));
  const remaining = Math.max(0, limit - used);

  return (
    <div style={{ marginTop: 8 }}>
      {showLabels && (
        <div
          className="tabular-nums"
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11.5,
            color: THEME.textSecondary,
            marginBottom: 5,
          }}
        >
          <span>
            <strong style={{ color: THEME.text }}>
              <Money value={used} variant="full" />
            </strong>{" "}
            claimed ({pct.toFixed(0)}%)
          </span>
          <span>
            {limit > 0 ? (
              remaining === 0 ? (
                <span style={{ color: THEME.sage, fontWeight: 600 }}>Limit Exhausted</span>
              ) : (
                <>
                  <Money value={remaining} variant="full" /> {unitLabel}
                </>
              )
            ) : (
              "No statutory cap"
            )}
          </span>
        </div>
      )}
      <div
        className="progress-track"
        style={{
          height: 8,
          borderRadius: 6,
          background: "var(--surface-2, rgba(255, 255, 255, 0.08))",
          overflow: "hidden",
        }}
      >
        <div
          className="progress-fill"
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 6,
            transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */

interface Section80TrackerTabProps {
  state: any;
  metrics?: any;
}

export const Section80TrackerTab: React.FC<Section80TrackerTabProps> = ({ state }) => {
  const { familyProfiles } = useMasterData();

  // Active Fiscal Year
  const currentFY = getCurrentFY();
  const [selectedFY, setSelectedFY] = useState<string>(currentFY);

  // Available Fiscal Years
  const fyList = useMemo(() => {
    const currentStart = getCurrentFYStartYear();
    return [
      `${currentStart}-${String(currentStart + 1).slice(2)}`,
      `${currentStart - 1}-${String(currentStart).slice(2)}`,
      `${currentStart - 2}-${String(currentStart - 1).slice(2)}`,
    ];
  }, []);

  // Sub-Navigation Active Tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "sec80c" | "sec80d" | "nps_housing" | "other_via" | "simulator" | "declaration"
  >("overview");

  // Selected Marginal Tax Bracket
  const [taxSlabPct, setTaxSlabPct] = useState<number>(30);
  const [includeCess, setIncludeCess] = useState<boolean>(true);
  const effectiveTaxRate = useMemo(() => {
    return (taxSlabPct / 100) * (includeCess ? 1.04 : 1.0);
  }, [taxSlabPct, includeCess]);

  // Custom / Manual Deductions Stored in LocalStorage
  const [customDeductions, setCustomDeductions] = useState<CustomDeduction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customDeductions));
    } catch (e) {
      console.error("Failed to save custom deductions to localStorage", e);
    }
  }, [customDeductions]);

  // Modal State for Custom Deductions
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDeductionId, setEditingDeductionId] = useState<string | null>(null);
  const [modalForm, setModalForm] = useState<{
    section: CustomDeduction["section"];
    category: string;
    amount: string;
    notes: string;
  }>({
    section: "80C",
    category: PRESET_CUSTOM_DEDUCTIONS[0].category,
    amount: "",
    notes: "",
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // What-If Simulator States
  const [simELSS, setSimELSS] = useState<number>(0);
  const [simPPF, setSimPPF] = useState<number>(0);
  const [simNPS1B, setSimNPS1B] = useState<number>(0);
  const [simHealthSelf, setSimHealthSelf] = useState<number>(0);
  const [simHealthParents, setSimHealthParents] = useState<number>(0);
  const [simCheckup, setSimCheckup] = useState<number>(0);

  // March 31 Deadline Countdown
  const daysLeftInFY = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = Jan, 2 = Mar
    const fyEndYear = currentMonth >= 3 ? currentYear + 1 : currentYear;
    const march31 = new Date(fyEndYear, 2, 31, 23, 59, 59);
    const diffTime = march31.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, []);

  // Copy Declaration Notification
  const [copiedDeclaration, setCopiedDeclaration] = useState(false);

  /* ══════════════════════════════════════════════════════════════
     CORE COMPUTATION ENGINE FOR SELECTED FY
     ══════════════════════════════════════════════════════════════ */
  const data = useMemo(() => {
    const fyParts = selectedFY.split("-");
    const fyStartYear = Number(fyParts[0]) || getCurrentFYStartYear();
    const fyStartStr = `${fyStartYear}-04-01`;
    const fyEndStr = `${fyStartYear + 1}-03-31`;
    const inFY = (date: string | undefined | null) =>
      !!date && date >= fyStartStr && date <= fyEndStr;

    // Filter Custom Deductions for the selected FY
    const fyCustom = customDeductions.filter((d) => d.fy === selectedFY);

    // ──────────────── 1. SECTION 80C ────────────────
    // PPF (from transactions in FY, ppfLedger in FY, or legacy fallback)
    const ppfFromTxns = (state?.ppf || []).reduce(
      (sum: number, p: any) =>
        sum +
        (p.transactions || [])
          .filter(
            (t: any) =>
              t.date && t.date >= fyStartStr && t.date <= fyEndStr && t.type !== "withdrawal"
          )
          .reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
      0
    );
    const ppfLedgerThisYear = (state?.ppfLedger || [])
      .filter(
        (t: any) =>
          t.date && t.date >= fyStartStr && t.date <= fyEndStr && t.type !== "withdrawal"
      )
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

    const ppfContrib =
      ppfFromTxns > 0
        ? ppfFromTxns
        : ppfLedgerThisYear > 0
        ? ppfLedgerThisYear
        : (state?.ppf || []).reduce(
            (s: number, p: any) =>
              s +
              Number(
                p.thisYearContribution || p.yearlyContribution || p.annualContribution || 0
              ),
            0
          );

    // ELSS Mutual Funds in FY
    const elss = (state?.mutualFunds || [])
      .filter(
        (m: any) =>
          (m.category || m.type || "").toLowerCase().includes("elss") && inFY(m.buyDate)
      )
      .reduce((s: number, m: any) => s + Number(m.invested || m.investedAmount || 0), 0);

    // LIC Premiums
    const licPremium = (state?.lic || []).reduce(
      (s: number, l: any) => s + Number(l.annualPremium || 0),
      0
    );

    // EPF Employee Share in FY (Passbook + Salary Slips)
    const epfPassbookContrib = (state?.epf || []).reduce((s: number, e: any) => {
      const txns = e.transactions || [];
      return (
        s +
        txns
          .filter(
            (t: any) =>
              (t.type === "employee_contribution" ||
                t.type === "monthly_contribution") &&
              inFY(t.date)
          )
          .reduce(
            (sum: number, t: any) => sum + Number(t.employeeShare || t.amount || 0),
            0
          )
      );
    }, 0);

    const salarySlipEpf = (state?.salarySlips || [])
      .filter(
        (s: any) =>
          s.slipMonth &&
          s.slipMonth >= fyStartStr.slice(0, 7) &&
          s.slipMonth <= fyEndStr.slice(0, 7)
      )
      .reduce(
        (sum: number, s: any) =>
          sum + Number(s.pfEmployee || s.epf || s.providentFund || 0),
        0
      );
    const epfContrib = epfPassbookContrib > 0 ? epfPassbookContrib : salarySlipEpf;

    // NSC & Sukanya Samriddhi (SSY)
    const nscInvestment = (state?.govtSchemes || [])
      .filter((sc: any) => (sc.schemeType || "").toUpperCase() === "NSC")
      .reduce(
        (s: number, sc: any) =>
          s +
          annualizeContribution(
            Number(sc.contributionAmount || 0),
            sc.frequency || "annual"
          ),
        0
      );
    const sukanyaSamriddhi = (state?.govtSchemes || [])
      .filter((sc: any) => (sc.schemeType || "").toUpperCase() === "SSY")
      .reduce(
        (s: number, sc: any) =>
          s +
          annualizeContribution(
            Number(sc.contributionAmount || 0),
            sc.frequency || "annual"
          ),
        0
      );

    // Home Loan Principal Repayment
    const homeLoans = (state?.loansTaken || []).filter(isHomeLoan);
    const homeLoanInterest = homeLoans.reduce(
      (s: number, l: any) => s + loanOutstanding(l) * (Number(l.rate || 0) / 100),
      0
    );
    const homeLoanAnnualEMI = homeLoans.reduce(
      (s: number, l: any) => s + Number(l.emi || 0) * 12,
      0
    );
    const homeLoanPrincipal = Math.max(0, homeLoanAnnualEMI - homeLoanInterest);

    // 80CCC Pension Plans
    const pensionContrib = (state?.investmentPlans || [])
      .filter((p: any) => (p.name || "").toLowerCase().includes("pension"))
      .reduce((s: number, p: any) => s + Number(p.annualPremium || 0), 0);

    // Custom 80C entries (Tuition, Stamp Duty, 5Y FDs, etc.)
    const custom80CItems = fyCustom.filter((d) => d.section === "80C");
    const custom80CTotal = custom80CItems.reduce((s, i) => s + Number(i.amount || 0), 0);

    const sec80C_items = [
      { id: "epf", label: "EPF (Employee Contribution)", amount: epfContrib, icon: Briefcase, source: "EPF Passbook / Salary Slips", auto: true },
      { id: "ppf", label: "Public Provident Fund (PPF)", amount: ppfContrib, icon: Shield, source: "PPF Account / Ledger", auto: true },
      { id: "elss", label: "ELSS Mutual Funds", amount: elss, icon: TrendingUp, source: "Mutual Funds (ELSS in FY)", auto: true },
      { id: "lic", label: "Life Insurance (LIC / Term)", amount: licPremium, icon: Heart, source: "LIC / Life Policies", auto: true },
      { id: "hl_principal", label: "Home Loan Principal", amount: homeLoanPrincipal, icon: Home, source: "Home Loan EMI Schedule", auto: true },
      { id: "pension", label: "Pension Plans (80CCC)", amount: pensionContrib, icon: Coins, source: "Investment Plans", auto: true },
      { id: "nsc", label: "National Savings Certificate (NSC)", amount: nscInvestment, icon: Landmark, source: "Govt Schemes", auto: true },
      { id: "ssy", label: "Sukanya Samriddhi Yojana (SSY)", amount: sukanyaSamriddhi, icon: Star, source: "Govt Schemes", auto: true },
      ...custom80CItems.map((c) => ({
        id: c.id,
        label: c.category,
        amount: Number(c.amount || 0),
        icon: Award,
        source: c.notes || "Manual Entry",
        auto: false,
      })),
    ].filter((i) => i.amount > 0);

    const sec80C_total = sec80C_items.reduce((s, i) => s + i.amount, 0);
    const sec80C_limit = 150000;
    const sec80C_used = Math.min(sec80C_total, sec80C_limit);
    const sec80C_remaining = Math.max(0, sec80C_limit - sec80C_total);

    // ──────────────── 2. SECTION 80CCD(1B) & 80CCD(2) NPS ────────────────
    const npsTxnSelf = (state?.nps || []).reduce((s: number, n: any) => {
      return (
        s +
        (n.transactions || [])
          .filter((t: any) => inFY(t.date))
          .reduce(
            (sum: number, t: any) =>
              sum + Number(t.employeeAmount ?? t.amount ?? 0),
            0
          )
      );
    }, 0);
    const npsAccountSelf = (state?.nps || []).reduce(
      (s: number, n: any) =>
        s + Number(n.thisYearContribution || n.yearContribution || 0),
      0
    );
    const custom80CCD1B = fyCustom
      .filter((d) => d.section === "80CCD1B")
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const npsSelfTotal = (npsTxnSelf > 0 ? npsTxnSelf : npsAccountSelf) + custom80CCD1B;
    const sec80CCD1B_limit = 50000;
    const sec80CCD1B_used = Math.min(npsSelfTotal, sec80CCD1B_limit);
    const sec80CCD1B_remaining = Math.max(0, sec80CCD1B_limit - npsSelfTotal);

    // NPS Employer Contribution 80CCD(2)
    const npsTxnEmployer = (state?.nps || []).reduce((s: number, n: any) => {
      return (
        s +
        (n.transactions || [])
          .filter((t: any) => inFY(t.date))
          .reduce((sum: number, t: any) => sum + Number(t.employerAmount || 0), 0)
      );
    }, 0);
    const npsAccountEmployer = (state?.nps || []).reduce(
      (s: number, n: any) => s + Number(n.employerContribution || 0),
      0
    );
    const custom80CCD2 = fyCustom
      .filter((d) => d.section === "80CCD2")
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const sec80CCD2_total =
      (npsTxnEmployer > 0 ? npsTxnEmployer : npsAccountEmployer) + custom80CCD2;

    // ──────────────── 3. SECTION 80D HEALTH INSURANCE & PREVENTIVE CHECKUP ────────────────
    const PARENT_RELATION_RE = /parent|father|mother|dad|mom|papa|mummy|-in-law/i;
    const isParentsPolicy = (p: any) =>
      (p.insuredMembers || []).some((m: any) =>
        PARENT_RELATION_RE.test(m?.relation || "")
      );
    const healthPolicies = state?.healthInsurance || [];
    const selfHealthPremiumAuto = healthPolicies
      .filter((p: any) => !isParentsPolicy(p))
      .reduce(
        (s: number, p: any) =>
          s + annualizePremium(p.premium, p.premiumFrequency, p.annualPremium),
        0
      );
    const parentsHealthPremiumAuto = healthPolicies
      .filter(isParentsPolicy)
      .reduce(
        (s: number, p: any) =>
          s + annualizePremium(p.premium, p.premiumFrequency, p.annualPremium),
        0
      );

    const customSelfHealth = fyCustom
      .filter((d) => d.section === "80D_SELF")
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const customParentsHealth = fyCustom
      .filter((d) => d.section === "80D_PARENTS")
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const customSelfCheckup = fyCustom
      .filter((d) => d.section === "80D_CHECKUP_SELF")
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const customParentsCheckup = fyCustom
      .filter((d) => d.section === "80D_CHECKUP_PARENTS")
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    const selfProfile = (familyProfiles || []).find((p: any) => p.id === "self");
    const spouseProfile = (familyProfiles || []).find(
      (p: any) => p.id === "wife" || /spouse|wife|husband/i.test(p.relation || "")
    );
    const isSelfSenior = isSeniorCitizen(selfProfile?.dob);
    const isSelfOrSpouseSenior = isSelfSenior || isSeniorCitizen(spouseProfile?.dob);

    const isAnyParentSenior =
      (familyProfiles || []).some(
        (p: any) =>
          PARENT_RELATION_RE.test(p.relation || "") && isSeniorCitizen(p.dob)
      ) ||
      healthPolicies.some((p: any) =>
        (p.insuredMembers || []).some(
          (m: any) =>
            PARENT_RELATION_RE.test(m?.relation || "") && isSeniorCitizen(m?.dob)
        )
      );

    const sec80D_self_limit = isSelfOrSpouseSenior ? 50000 : 25000;
    const sec80D_parents_limit = isAnyParentSenior ? 50000 : 25000;

    const selfCheckupClaimed = Math.min(customSelfCheckup, 5000);
    const parentsCheckupClaimed = Math.min(customParentsCheckup, 5000 - selfCheckupClaimed);

    const rawSelf80D = selfHealthPremiumAuto + customSelfHealth + selfCheckupClaimed;
    const rawParents80D =
      parentsHealthPremiumAuto + customParentsHealth + parentsCheckupClaimed;

    const sec80D_self_used = Math.min(rawSelf80D, sec80D_self_limit);
    const sec80D_parents_used = Math.min(rawParents80D, sec80D_parents_limit);
    const sec80D_total = sec80D_self_used + sec80D_parents_used;
    const sec80D_max_possible = sec80D_self_limit + sec80D_parents_limit;
    const sec80D_remaining = Math.max(0, sec80D_max_possible - sec80D_total);

    // ──────────────── 4. SECTION 80TTA / 80TTB ────────────────
    const savingsInterest = (state?.bankAccounts || [])
      .filter((a: any) => (a.type || "").toLowerCase() === "savings")
      .reduce(
        (s: number, a: any) =>
          s + Number(a.balance || 0) * (Number(a.interestRate || 3.0) / 100),
        0
      );
    const depositInterest = isSelfSenior
      ? (state?.fixedDeposits || []).reduce(
          (s: number, d: any) =>
            s + Number(d.principal || 0) * (Number(d.interestRate || 6.5) / 100),
          0
        ) +
        (state?.recurringDeposits || []).reduce(
          (s: number, r: any) =>
            s +
            Number(r.monthlyDeposit || 0) *
              12 *
              (Number(r.interestRate || 6.5) / 100),
          0
        )
      : 0;

    const custom80TTA = fyCustom
      .filter((d) => d.section === "80TTA" || d.section === "80TTB")
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    const totalInterestEligible = savingsInterest + depositInterest + custom80TTA;
    const sec80TTA_limit = isSelfSenior ? 50000 : 10000;
    const sec80TTA_used = Math.min(totalInterestEligible, sec80TTA_limit);

    // ──────────────── 5. SECTION 24(B) & 80EEA HOME LOAN INTEREST ────────────────
    const customSec24 = fyCustom
      .filter((d) => d.section === "SEC24")
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalHomeLoanInterest = homeLoanInterest + customSec24;
    const sec24_limit = 200000;
    const sec24_used = Math.min(totalHomeLoanInterest, sec24_limit);
    const sec24_remaining = Math.max(0, sec24_limit - totalHomeLoanInterest);

    const custom80EEA = fyCustom
      .filter((d) => d.section === "80EEA")
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const sec80EEA_used = Math.min(custom80EEA, 150000);

    // ──────────────── 6. OTHER CHAPTER VI-A ────────────────
    const sec80E_used = fyCustom
      .filter((d) => d.section === "80E")
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    const sec80G_100 = fyCustom
      .filter((d) => d.section === "80G_100")
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const sec80G_50 = fyCustom
      .filter((d) => d.section === "80G_50")
      .reduce((s, i) => s + Number(i.amount || 0) * 0.5, 0);
    const sec80G_used = sec80G_100 + sec80G_50;

    const custom80GG = fyCustom
      .filter((d) => d.section === "80GG")
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const sec80GG_used = Math.min(custom80GG, 60000);

    const sec80U_used = fyCustom
      .filter((d) => d.section === "80U")
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const sec80DD_used = fyCustom
      .filter((d) => d.section === "80DD")
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    const custom80DDB = fyCustom
      .filter((d) => d.section === "80DDB")
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const sec80DDB_limit = isSelfOrSpouseSenior || isAnyParentSenior ? 100000 : 40000;
    const sec80DDB_used = Math.min(custom80DDB, sec80DDB_limit);

    const custom80EEB = fyCustom
      .filter((d) => d.section === "80EEB")
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const sec80EEB_used = Math.min(custom80EEB, 150000);

    const customOther = fyCustom
      .filter((d) => d.section === "OTHER")
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    // HRA Exemption Estimate
    const monthlyRent = (state?.rentedProperties || [])
      .filter((p: any) => p.isActive !== false)
      .reduce((s: number, p: any) => s + getEffectiveRent(p), 0);
    const annualRent = monthlyRent * 12;

    const totalOtherVIA =
      sec80E_used +
      sec80G_used +
      sec80GG_used +
      sec80U_used +
      sec80DD_used +
      sec80DDB_used +
      sec80EEA_used +
      sec80EEB_used +
      customOther;

    const totalDeductions =
      sec80C_used +
      sec80CCD1B_used +
      sec80CCD2_total +
      sec80D_total +
      sec80TTA_used +
      sec24_used +
      totalOtherVIA;

    const taxSaved = totalDeductions * effectiveTaxRate;

    const totalPotentialHeadroom =
      sec80C_remaining +
      sec80CCD1B_remaining +
      sec80D_remaining +
      sec24_remaining;

    return {
      fy: selectedFY,
      sec80C: {
        items: sec80C_items,
        total: sec80C_total,
        used: sec80C_used,
        remaining: sec80C_remaining,
        limit: sec80C_limit,
        customTotal: custom80CTotal,
      },
      sec80CCD1B: {
        total: npsSelfTotal,
        used: sec80CCD1B_used,
        remaining: sec80CCD1B_remaining,
        limit: sec80CCD1B_limit,
      },
      sec80CCD2: { total: sec80CCD2_total },
      sec80D: {
        self: sec80D_self_used,
        parents: sec80D_parents_used,
        total: sec80D_total,
        selfLimit: sec80D_self_limit,
        parentsLimit: sec80D_parents_limit,
        maxPossible: sec80D_max_possible,
        remaining: sec80D_remaining,
        isSelfSenior: isSelfOrSpouseSenior,
        isParentsSenior: isAnyParentSenior,
        selfHealthAuto: selfHealthPremiumAuto,
        parentsHealthAuto: parentsHealthPremiumAuto,
        selfCheckupClaimed,
        parentsCheckupClaimed,
      },
      sec80TTA: {
        total: sec80TTA_used,
        limit: sec80TTA_limit,
        is80TTB: isSelfSenior,
        rawInterest: totalInterestEligible,
      },
      sec24: {
        total: sec24_used,
        remaining: sec24_remaining,
        limit: sec24_limit,
        rawInterest: totalHomeLoanInterest,
      },
      otherVIA: {
        sec80E: sec80E_used,
        sec80G: sec80G_used,
        sec80GG: sec80GG_used,
        sec80U: sec80U_used,
        sec80DD: sec80DD_used,
        sec80DDB: sec80DDB_used,
        sec80EEA: sec80EEA_used,
        sec80EEB: sec80EEB_used,
        customOther,
        total: totalOtherVIA,
      },
      hra: { annualRent },
      totalDeductions,
      taxSaved,
      totalPotentialHeadroom,
      customList: fyCustom,
    };
  }, [state, familyProfiles, selectedFY, customDeductions, effectiveTaxRate]);

  // Donut Pie Chart Data
  const pieData = useMemo(() => {
    return [
      { name: "80C", value: data.sec80C.used, color: THEME.accent },
      { name: "80CCD(1B) NPS", value: data.sec80CCD1B.used, color: THEME.violet },
      { name: "80CCD(2) Employer", value: data.sec80CCD2.total, color: THEME.gold },
      { name: "80D Health", value: data.sec80D.total, color: THEME.rose || "#f43f5e" },
      { name: "Sec 24 Home Loan", value: data.sec24.total, color: THEME.sage },
      { name: "80TTA/TTB Interest", value: data.sec80TTA.total, color: THEME.cyan || "#06b6d4" },
      { name: "Other Chapter VI-A", value: data.otherVIA.total, color: "#f59e0b" },
    ].filter((d) => d.value > 0);
  }, [data]);

  // Handle Add/Edit Custom Deduction
  const handleSaveCustomDeduction = () => {
    const amt = parseFloat(modalForm.amount);
    if (isNaN(amt) || amt <= 0) return;

    if (editingDeductionId) {
      setCustomDeductions((prev) =>
        prev.map((d) =>
          d.id === editingDeductionId
            ? {
                ...d,
                section: modalForm.section,
                category: modalForm.category,
                amount: amt,
                notes: modalForm.notes,
              }
            : d
        )
      );
    } else {
      const newItem: CustomDeduction = {
        id: `custom_ded_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        fy: selectedFY,
        section: modalForm.section,
        category: modalForm.category,
        amount: amt,
        notes: modalForm.notes,
        createdAt: new Date().toISOString(),
      };
      setCustomDeductions((prev) => [newItem, ...prev]);
    }

    setIsAddModalOpen(false);
    setEditingDeductionId(null);
    setModalForm({
      section: "80C",
      category: PRESET_CUSTOM_DEDUCTIONS[0].category,
      amount: "",
      notes: "",
    });
  };

  const handleEditClick = (d: CustomDeduction) => {
    setEditingDeductionId(d.id);
    setModalForm({
      section: d.section,
      category: d.category,
      amount: String(d.amount),
      notes: d.notes || "",
    });
    setIsAddModalOpen(true);
  };

  const handleDeleteCustom = (id: string) => {
    setCustomDeductions((prev) => prev.filter((d) => d.id !== id));
    setDeleteConfirmId(null);
  };

  // What-If Simulation Calculations
  const simulatedTotal80C = Math.min(data.sec80C.total + simELSS + simPPF, data.sec80C.limit);
  const sim80CAdded = Math.max(0, simulatedTotal80C - data.sec80C.used);

  const simulatedTotalNPS1B = Math.min(
    data.sec80CCD1B.total + simNPS1B,
    data.sec80CCD1B.limit
  );
  const simNPSAdded = Math.max(0, simulatedTotalNPS1B - data.sec80CCD1B.used);

  const simHealthSelfClaimed = Math.min(
    data.sec80D.self + simHealthSelf + simCheckup,
    data.sec80D.selfLimit
  );
  const simHealthParentsClaimed = Math.min(
    data.sec80D.parents + simHealthParents,
    data.sec80D.parentsLimit
  );
  const simHealthTotal = simHealthSelfClaimed + simHealthParentsClaimed;
  const simHealthAdded = Math.max(0, simHealthTotal - data.sec80D.total);

  const totalSimulatedDeductions =
    data.totalDeductions + sim80CAdded + simNPSAdded + simHealthAdded;
  const extraTaxSavedFromSimulation =
    (sim80CAdded + simNPSAdded + simHealthAdded) * effectiveTaxRate;

  // Copy Declaration Text for CA / HR
  const copyDeclarationSummary = () => {
    const text = `
TAX DEDUCTION DECLARATION / SUMMARY (CHAPTER VI-A & SEC 24)
Financial Year: ${selectedFY}
Tax Regime: Old Tax Regime

1. SECTION 80C INVESTMENTS:
   - EPF (Employee Contribution): ${fmtINRFull(data.sec80C.items.find((i) => i.id === "epf")?.amount || 0)}
   - PPF Deposits: ${fmtINRFull(data.sec80C.items.find((i) => i.id === "ppf")?.amount || 0)}
   - ELSS Mutual Funds: ${fmtINRFull(data.sec80C.items.find((i) => i.id === "elss")?.amount || 0)}
   - LIC / Life Insurance: ${fmtINRFull(data.sec80C.items.find((i) => i.id === "lic")?.amount || 0)}
   - Home Loan Principal: ${fmtINRFull(data.sec80C.items.find((i) => i.id === "hl_principal")?.amount || 0)}
   - NSC / SSY / Govt Schemes: ${fmtINRFull((data.sec80C.items.find((i) => i.id === "nsc")?.amount || 0) + (data.sec80C.items.find((i) => i.id === "ssy")?.amount || 0))}
   - Other / Tuition / Stamp Duty: ${fmtINRFull(data.sec80C.customTotal)}
   -> Total 80C Claimed (Max ₹1.5L): ${fmtINRFull(data.sec80C.used)}

2. SECTION 80CCD(1B) NPS SELF:
   -> Claimed (Max ₹50,000): ${fmtINRFull(data.sec80CCD1B.used)}

3. SECTION 80CCD(2) EMPLOYER NPS:
   -> Claimed (Allowed in Old & New Regime): ${fmtINRFull(data.sec80CCD2.total)}

4. SECTION 80D HEALTH INSURANCE & CHECKUP:
   - Self & Family: ${fmtINRFull(data.sec80D.self)} (Cap: ${fmtINRFull(data.sec80D.selfLimit)})
   - Parents: ${fmtINRFull(data.sec80D.parents)} (Cap: ${fmtINRFull(data.sec80D.parentsLimit)})
   -> Total 80D Claimed: ${fmtINRFull(data.sec80D.total)}

5. SECTION 24(B) HOME LOAN INTEREST:
   -> Claimed (Max ₹2,00,000): ${fmtINRFull(data.sec24.total)}

6. SECTION 80TTA / 80TTB (SAVINGS/DEPOSIT INTEREST):
   -> Claimed: ${fmtINRFull(data.sec80TTA.total)}

7. OTHER CHAPTER VI-A DEDUCTIONS:
   - Higher Education Loan (80E): ${fmtINRFull(data.otherVIA.sec80E)}
   - Donations (80G): ${fmtINRFull(data.otherVIA.sec80G)}
   - Rent without HRA (80GG): ${fmtINRFull(data.otherVIA.sec80GG)}
   - Disability Relief (80U / 80DD): ${fmtINRFull(data.otherVIA.sec80U + data.otherVIA.sec80DD)}
   - Medical Treatment (80DDB): ${fmtINRFull(data.otherVIA.sec80DDB)}
   - EV Loan Interest (80EEB): ${fmtINRFull(data.otherVIA.sec80EEB)}

--------------------------------------------------
TOTAL CHAPTER VI-A & SEC 24 DEDUCTIONS: ${fmtINRFull(data.totalDeductions)}
ESTIMATED TAX SAVINGS (@ ${(effectiveTaxRate * 100).toFixed(1)}%): ${fmtINRFull(data.taxSaved)}
--------------------------------------------------
Generated via Personal Finance by Anand Mohta on ${new Date().toLocaleDateString("en-IN")}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedDeclaration(true);
    setTimeout(() => setCopiedDeclaration(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* ══════════════════════════════════════════════════════════════
          1. HEADER & INTERACTIVE CONTROLS BAR
          ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <SectionTitle sub="Comprehensive Chapter VI-A & Section 24 deduction tracker with auto-detection, manual gap filling, and tax savings optimizer">
            Section 80C / 80D &amp; Tax Deductions Tracker
          </SectionTitle>
        </div>

        {/* Global Controls: FY Selector & Quick Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {/* FY Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--surface-1, rgba(255, 255, 255, 0.05))",
              padding: "4px 8px",
              borderRadius: 8,
              border: `1px solid ${THEME.line}`,
            }}
          >
            <Calendar size={14} color={THEME.accent} />
            <span style={{ fontSize: 12, color: THEME.textSecondary, fontWeight: 500 }}>FY:</span>
            <select
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: THEME.text,
                fontSize: 13,
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
              }}
            >
              {fyList.map((fy) => (
                <option key={fy} value={fy} style={{ background: "var(--surface-0)", color: THEME.text }}>
                  FY {fy} {fy === currentFY ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Tax Bracket Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--surface-1, rgba(255, 255, 255, 0.05))",
              padding: "4px 8px",
              borderRadius: 8,
              border: `1px solid ${THEME.line}`,
            }}
          >
            <Percent size={14} color={THEME.gold} />
            <span style={{ fontSize: 12, color: THEME.textSecondary, fontWeight: 500 }}>Slab:</span>
            <select
              value={taxSlabPct}
              onChange={(e) => setTaxSlabPct(Number(e.target.value))}
              style={{
                background: "transparent",
                border: "none",
                color: THEME.text,
                fontSize: 13,
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value={5} style={{ background: "var(--surface-0)", color: THEME.text }}>
                5% Bracket
              </option>
              <option value={10} style={{ background: "var(--surface-0)", color: THEME.text }}>
                10% Bracket
              </option>
              <option value={15} style={{ background: "var(--surface-0)", color: THEME.text }}>
                15% Bracket
              </option>
              <option value={20} style={{ background: "var(--surface-0)", color: THEME.text }}>
                20% Bracket
              </option>
              <option value={30} style={{ background: "var(--surface-0)", color: THEME.text }}>
                30% Bracket
              </option>
            </select>
            <label
              style={{
                fontSize: 11,
                color: THEME.textSecondary,
                display: "flex",
                alignItems: "center",
                gap: 3,
                cursor: "pointer",
                marginLeft: 4,
              }}
              title="4% Health & Education Cess"
            >
              <input
                type="checkbox"
                checked={includeCess}
                onChange={(e) => setIncludeCess(e.target.checked)}
                style={{ cursor: "pointer", accentColor: THEME.accent }}
              />
              +4% Cess
            </label>
          </div>

          {/* Quick Action Button: Add Custom Deduction */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditingDeductionId(null);
              setModalForm({
                section: "80C",
                category: PRESET_CUSTOM_DEDUCTIONS[0].category,
                amount: "",
                notes: "",
              });
              setIsAddModalOpen(true);
            }}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <Plus size={14} /> Add Deduction
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          2. TAX DEADLINE & REGIME ADVISORY BANNER
          ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 18px",
          borderRadius: 12,
          background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.gold} 10%, transparent) 0%, color-mix(in srgb, ${THEME.accent} 8%, transparent) 100%)`,
          border: `1px solid color-mix(in srgb, ${THEME.gold} 25%, transparent)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1 }}>
          <AlertTriangle size={17} color={THEME.gold} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12.5, color: THEME.text, lineHeight: 1.5 }}>
            <strong>Old Tax Regime Optimization:</strong> Most Chapter VI-A deductions (80C, 80D,
            80CCD(1B), 80TTA, Sec 24) are eligible <em>only under the Old Regime</em>. Section 80CCD(2)
            Employer NPS is allowed in <strong>both Old and New Regimes</strong>.
          </div>
        </div>

        {selectedFY === currentFY && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: `color-mix(in srgb, ${daysLeftInFY <= 45 ? THEME.rust || "#ef4444" : THEME.gold} 15%, transparent)`,
              color: daysLeftInFY <= 45 ? THEME.rust || "#ef4444" : THEME.gold,
              padding: "4px 10px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            <Clock size={13} />
            {daysLeftInFY > 0 ? `${daysLeftInFY} days until March 31 Tax Deadline` : "FY Closed (March 31)"}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          3. EXECUTIVE KPI CARDS RIBBON
          ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Total Eligible Deductions"
          value={fmtINRFull(data.totalDeductions)}
          numericValue={data.totalDeductions}
          formatValue={fmtINRFull}
          icon={<CheckCircle2 />}
          color={THEME.sage}
          sub={`Includes Chapter VI-A & Sec 24`}
        />

        <StatCard
          label="Estimated Tax Saved"
          value={fmtINRFull(data.taxSaved)}
          numericValue={data.taxSaved}
          formatValue={fmtINRFull}
          icon={<IndianRupee />}
          color={THEME.accent}
          sub={`At ${(effectiveTaxRate * 100).toFixed(1)}% effective bracket`}
        />

        <StatCard
          label="Section 80C Claimed"
          value={`${fmtINR(data.sec80C.used)} / ₹1.5L`}
          numericValue={data.sec80C.used}
          formatValue={(v) => `${fmtINR(v)} / ₹1.5L`}
          icon={<Shield />}
          color={data.sec80C.remaining === 0 ? THEME.sage : THEME.gold}
          sub={
            data.sec80C.remaining > 0
              ? `${fmtINR(data.sec80C.remaining)} unutilized headroom`
              : "100% Limit Exhausted!"
          }
        />

        <StatCard
          label="Section 80D Mediclaim"
          value={fmtINRFull(data.sec80D.total)}
          numericValue={data.sec80D.total}
          formatValue={fmtINRFull}
          icon={<HeartPulse />}
          color={THEME.rose || "#f43f5e"}
          sub={`Self + Parents (${fmtINR(data.sec80D.maxPossible)} max)`}
        />

        <StatCard
          label="NPS & Sec 24 Additional"
          value={fmtINRFull(data.sec80CCD1B.used + data.sec80CCD2.total + data.sec24.total)}
          numericValue={data.sec80CCD1B.used + data.sec80CCD2.total + data.sec24.total}
          formatValue={fmtINRFull}
          icon={<Building2 />}
          color={THEME.violet}
          sub={`NPS 1B + NPS 2 + Home Loan Int.`}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          4. SUB-NAVIGATION TABS
          ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${THEME.line}`,
          gap: 8,
          overflowX: "auto",
          paddingBottom: 2,
        }}
      >
        {[
          { id: "overview", label: "Overview & Analytics", icon: PieChartIcon },
          { id: "sec80c", label: "Section 80C Hub (₹1.5L)", icon: Shield, badge: data.sec80C.remaining === 0 ? "Exhausted" : `${fmtINR(data.sec80C.remaining)} left` },
          { id: "sec80d", label: "80D Health & Checkup", icon: HeartPulse },
          { id: "nps_housing", label: "NPS & Housing (Sec 24)", icon: Landmark },
          { id: "other_via", label: "Other Chapter VI-A", icon: Layers, badge: data.otherVIA.total > 0 ? fmtINR(data.otherVIA.total) : undefined },
          { id: "simulator", label: "What-If Simulator", icon: Sliders },
          { id: "declaration", label: "CA / HR Declaration", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 14px",
                border: "none",
                background: isActive
                  ? "var(--surface-2, rgba(255, 255, 255, 0.08))"
                  : "transparent",
                color: isActive ? THEME.text : THEME.textSecondary,
                fontWeight: isActive ? 600 : 500,
                fontSize: 13,
                borderRadius: "8px 8px 0 0",
                borderBottom: isActive ? `2px solid ${THEME.accent}` : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
            >
              <Icon size={14} color={isActive ? THEME.accent : THEME.muted} />
              {tab.label}
              {tab.badge && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 10,
                    background:
                      tab.badge === "Exhausted"
                        ? `color-mix(in srgb, ${THEME.sage} 20%, transparent)`
                        : `color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
                    color: tab.badge === "Exhausted" ? THEME.sage : THEME.gold,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          5. TAB CONTENT PANELS
          ══════════════════════════════════════════════════════════════ */}

      {/* ─── TAB 1: OVERVIEW & COCKPIT ─── */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 18,
            }}
          >
            {/* Donut Chart of Deduction Breakdown */}
            <Card style={{ padding: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: THEME.text }}>
                    Deduction Mix &amp; Composition
                  </h3>
                  <div style={{ fontSize: 12, color: THEME.textSecondary }}>
                    Total Claimable: {fmtINRFull(data.totalDeductions)}
                  </div>
                </div>
                <Badge variant="outline">Old Regime</Badge>
              </div>

              {pieData.length > 0 ? (
                <div style={{ width: "100%", height: 260, position: "relative" }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: any) => <Money value={v} variant="full" />}
                        contentStyle={{
                          background: "var(--surface-0)",
                          border: `1px solid ${THEME.line}`,
                          borderRadius: 8,
                          color: THEME.ink,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div
                  style={{
                    height: 220,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: THEME.textSecondary,
                    fontSize: 13,
                  }}
                >
                  No deduction items logged yet for FY {selectedFY}
                </div>
              )}

              {/* Legend Chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {pieData.map((d) => (
                  <div
                    key={d.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11.5,
                      color: THEME.textSecondary,
                      background: "var(--surface-1, rgba(255,255,255,0.03))",
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: d.color,
                        display: "inline-block",
                      }}
                    />
                    <span>{d.name}:</span>
                    <strong style={{ color: THEME.text }}>{fmtINR(d.value)}</strong>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Limit Utilization Gauges */}
            <Card style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: THEME.text }}>
                  Statutory Limit Utilization
                </h3>
                <div style={{ fontSize: 12, color: THEME.textSecondary }}>
                  Caps &amp; remaining headroom across key tax sections
                </div>
              </div>

              {/* 80C Utilization */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: THEME.text, display: "flex", alignItems: "center", gap: 6 }}>
                    <Shield size={14} color={THEME.accent} /> Section 80C (PPF, ELSS, EPF, etc.)
                  </span>
                  <span style={{ fontWeight: 600, color: data.sec80C.remaining === 0 ? THEME.sage : THEME.gold }}>
                    {fmtINR(data.sec80C.used)} / ₹1.5L
                  </span>
                </div>
                <CustomProgressBar used={data.sec80C.used} limit={data.sec80C.limit} color={THEME.accent} />
              </div>

              {/* 80CCD(1B) NPS */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: THEME.text, display: "flex", alignItems: "center", gap: 6 }}>
                    <Coins size={14} color={THEME.violet} /> 80CCD(1B) NPS Self Contribution
                  </span>
                  <span style={{ fontWeight: 600, color: data.sec80CCD1B.remaining === 0 ? THEME.sage : THEME.violet }}>
                    {fmtINR(data.sec80CCD1B.used)} / ₹50K
                  </span>
                </div>
                <CustomProgressBar
                  used={data.sec80CCD1B.used}
                  limit={data.sec80CCD1B.limit}
                  color={THEME.violet}
                />
              </div>

              {/* 80D Health Insurance */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: THEME.text, display: "flex", alignItems: "center", gap: 6 }}>
                    <HeartPulse size={14} color={THEME.rose || "#f43f5e"} /> Section 80D (Self &amp; Parents)
                  </span>
                  <span style={{ fontWeight: 600, color: THEME.text }}>
                    {fmtINR(data.sec80D.total)} / {fmtINR(data.sec80D.maxPossible)}
                  </span>
                </div>
                <CustomProgressBar
                  used={data.sec80D.total}
                  limit={data.sec80D.maxPossible}
                  color={THEME.rose || "#f43f5e"}
                />
              </div>

              {/* Section 24 Home Loan Interest */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: THEME.text, display: "flex", alignItems: "center", gap: 6 }}>
                    <Home size={14} color={THEME.sage} /> Section 24(b) Home Loan Interest
                  </span>
                  <span style={{ fontWeight: 600, color: data.sec24.remaining === 0 ? THEME.sage : THEME.gold }}>
                    {fmtINR(data.sec24.total)} / ₹2.0L
                  </span>
                </div>
                <CustomProgressBar used={data.sec24.total} limit={data.sec24.limit} color={THEME.sage} />
              </div>

              {/* Headroom Action Prompt */}
              {data.totalPotentialHeadroom > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: `color-mix(in srgb, ${THEME.gold} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 12, color: THEME.text }}>
                    💡 You have <strong>{fmtINRFull(data.totalPotentialHeadroom)}</strong> unfilled
                    room. Investing this saves up to{" "}
                    <strong>{fmtINRFull(data.totalPotentialHeadroom * effectiveTaxRate)}</strong> in taxes!
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab("simulator")}
                    style={{ fontSize: 11, whiteSpace: "nowrap" }}
                  >
                    Simulate &rarr;
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Top Tax Optimization Recommendations */}
          <Card style={{ padding: 22 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: THEME.text }}>
                  Smart Tax Optimization Recommendations
                </h3>
                <div style={{ fontSize: 12, color: THEME.textSecondary }}>
                  Actionable steps to maximize tax savings for FY {selectedFY}
                </div>
              </div>
              <Sparkles size={16} color={THEME.gold} />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {/* 80C Gap Card */}
              {data.sec80C.remaining > 0 ? (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: "var(--surface-1, rgba(255,255,255,0.03))",
                    border: `1px solid ${THEME.line}`,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13, color: THEME.accent }}>
                      <Shield size={14} /> Exhaust 80C Headroom ({fmtINR(data.sec80C.remaining)} left)
                    </div>
                    <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 4 }}>
                      Deploy in ELSS (lowest 3Y lock-in) or PPF/SSY (tax-free EEE). Saves{" "}
                      <strong>{fmtINRFull(data.sec80C.remaining * effectiveTaxRate)}</strong> in direct taxes.
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSimELSS(data.sec80C.remaining);
                      setActiveTab("simulator");
                    }}
                    style={{ width: "fit-content", fontSize: 11 }}
                  >
                    Simulate ELSS Investment
                  </Button>
                </div>
              ) : (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <CheckCircle size={18} color={THEME.sage} />
                  <div style={{ fontSize: 12.5, color: THEME.text }}>
                    <strong>Section 80C Fully Utilized!</strong> You have claimed the maximum ₹1,50,000 ceiling.
                  </div>
                </div>
              )}

              {/* 80CCD(1B) NPS Gap Card */}
              {data.sec80CCD1B.remaining > 0 ? (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: "var(--surface-1, rgba(255,255,255,0.03))",
                    border: `1px solid ${THEME.line}`,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13, color: THEME.violet }}>
                      <Coins size={14} /> Claim Extra ₹50,000 via NPS 80CCD(1B)
                    </div>
                    <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 4 }}>
                      Exclusive deduction over and above the ₹1.5L 80C limit. Claim up to{" "}
                      {fmtINR(data.sec80CCD1B.remaining)} more to save{" "}
                      <strong>{fmtINRFull(data.sec80CCD1B.remaining * effectiveTaxRate)}</strong>.
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSimNPS1B(data.sec80CCD1B.remaining);
                      setActiveTab("simulator");
                    }}
                    style={{ width: "fit-content", fontSize: 11 }}
                  >
                    Simulate NPS Deposit
                  </Button>
                </div>
              ) : (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <CheckCircle size={18} color={THEME.sage} />
                  <div style={{ fontSize: 12.5, color: THEME.text }}>
                    <strong>NPS 80CCD(1B) Maxed Out!</strong> Extra ₹50,000 deduction claimed in full.
                  </div>
                </div>
              )}

              {/* Preventive Health Checkup Card */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "var(--surface-1, rgba(255,255,255,0.03))",
                  border: `1px solid ${THEME.line}`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13, color: THEME.rose || "#f43f5e" }}>
                    <HeartPulse size={14} /> Claim Preventive Health Checkup (₹5,000)
                  </div>
                  <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 4 }}>
                    Cash or digital receipts for routine blood tests &amp; annual checkups are eligible
                    under Section 80D (Self &amp; Parents combined up to ₹5k).
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setModalForm({
                      section: "80D_CHECKUP_SELF",
                      category: "Preventive Health Checkup (Self / Family)",
                      amount: "5000",
                      notes: "Annual routine checkup & lab tests",
                    });
                    setIsAddModalOpen(true);
                  }}
                  style={{ width: "fit-content", fontSize: 11 }}
                >
                  + Add Checkup Receipt
                </Button>
              </div>

              {/* Employer NPS 80CCD(2) Advisory */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "var(--surface-1, rgba(255,255,255,0.03))",
                  border: `1px solid ${THEME.line}`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13, color: THEME.gold }}>
                    <Building2 size={14} /> Employer NPS 80CCD(2) (Dual Regime Benefit)
                  </div>
                  <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 4 }}>
                    Ask your employer to restructure up to 10% of basic pay into Corporate NPS. This deduction
                    reduces taxable income in <strong>both Old &amp; New Tax Regimes</strong>!
                  </div>
                </div>
                <div style={{ fontSize: 11, color: THEME.textSecondary }}>
                  Current Claimed: <strong>{fmtINRFull(data.sec80CCD2.total)}</strong>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB 2: SECTION 80C DEEP DIVE ─── */}
      {activeTab === "sec80c" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 80C Status Card */}
          <Card style={{ padding: 22 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: THEME.text }}>
                  Section 80C Breakdown &amp; Investment Portfolio
                </h3>
                <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 3 }}>
                  Statutory ceiling: ₹1,50,000 per financial year across all eligible instruments
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingDeductionId(null);
                    setModalForm({
                      section: "80C",
                      category: "Children Tuition Fees (Max 2 Children)",
                      amount: "",
                      notes: "",
                    });
                    setIsAddModalOpen(true);
                  }}
                  style={{ fontSize: 12 }}
                >
                  <Plus size={13} /> Add Manual 80C Item
                </Button>
              </div>
            </div>

            <CustomProgressBar used={data.sec80C.used} limit={data.sec80C.limit} color={THEME.accent} />

            {/* List of 80C Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
              {data.sec80C.items.length === 0 ? (
                <div
                  style={{
                    padding: "16px 20px",
                    borderRadius: 8,
                    background: "var(--surface-1, rgba(255,255,255,0.03))",
                    border: `1px dashed ${THEME.line}`,
                    fontSize: 12.5,
                    color: THEME.textSecondary,
                    textAlign: "center",
                  }}
                >
                  No Section 80C investments detected or added for FY {selectedFY}. Log EPF, PPF, ELSS,
                  LIC, or add tuition fees above.
                </div>
              ) : (
                data.sec80C.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="table-row-hover"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "var(--surface-1, rgba(255,255,255,0.03))",
                        border: `1px solid ${THEME.line}`,
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon size={16} color={THEME.accent} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: THEME.text }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: 11.5, color: THEME.textSecondary }}>
                            {item.source} {item.auto ? "· Auto-detected" : "· Manual entry"}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          className="tabular-nums"
                          style={{ fontSize: 14, fontWeight: 700, color: THEME.accent }}
                        >
                          <Money value={item.amount} variant="full" />
                        </div>
                        {!item.auto && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <button
                              onClick={() => {
                                const customObj = customDeductions.find((d) => d.id === item.id);
                                if (customObj) handleEditClick(customObj);
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: THEME.textSecondary,
                                cursor: "pointer",
                                padding: 4,
                              }}
                              title="Edit deduction"
                            >
                              <Sparkles size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(item.id)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: THEME.rust || "#ef4444",
                                cursor: "pointer",
                                padding: 4,
                              }}
                              title="Delete deduction"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Total 80C Summary Bar */}
            <div
              style={{
                marginTop: 14,
                padding: "12px 16px",
                borderRadius: 8,
                background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <span>
                Total 80C Inflow: <strong>{fmtINRFull(data.sec80C.total)}</strong>
                {data.sec80C.total > data.sec80C.limit && (
                  <span style={{ color: THEME.textSecondary, fontSize: 11, marginLeft: 6 }}>
                    (Exceeds limit by {fmtINRFull(data.sec80C.total - data.sec80C.limit)})
                  </span>
                )}
              </span>
              <span>
                Eligible Tax Deduction:{" "}
                <strong style={{ color: THEME.accent, fontSize: 14 }}>
                  {fmtINRFull(data.sec80C.used)}
                </strong>
              </span>
            </div>
          </Card>

          {/* 80C Instrument Comparison Guide Matrix */}
          <Card style={{ padding: 22 }}>
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: THEME.text }}>
                Section 80C Investment Options Comparison Matrix
              </h3>
              <div style={{ fontSize: 12, color: THEME.textSecondary }}>
                Compare lock-in periods, expected returns, tax on maturity (EEE vs EET), and risk profile
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${THEME.line}`, color: THEME.textSecondary, textAlign: "left" }}>
                    <th style={{ padding: "8px 10px" }}>Instrument</th>
                    <th style={{ padding: "8px 10px" }}>Lock-In</th>
                    <th style={{ padding: "8px 10px" }}>Expected Returns</th>
                    <th style={{ padding: "8px 10px" }}>Maturity Tax Status</th>
                    <th style={{ padding: "8px 10px" }}>Risk</th>
                    <th style={{ padding: "8px 10px" }}>Key Feature</th>
                  </tr>
                </thead>
                <tbody>
                  {SEC_80C_INSTRUMENTS.map((inst) => (
                    <tr
                      key={inst.name}
                      className="table-row-hover"
                      style={{ borderBottom: `1px solid color-mix(in srgb, ${THEME.line} 50%, transparent)` }}
                    >
                      <td style={{ padding: "10px", fontWeight: 600, color: THEME.text }}>
                        {inst.name}
                      </td>
                      <td style={{ padding: "10px", color: THEME.textSecondary }}>
                        {inst.lockIn}
                      </td>
                      <td style={{ padding: "10px", color: THEME.accent, fontWeight: 600 }}>
                        {inst.returns}
                      </td>
                      <td style={{ padding: "10px", color: THEME.text }}>
                        {inst.taxability}
                      </td>
                      <td style={{ padding: "10px", color: THEME.textSecondary }}>
                        {inst.risk}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: 6,
                            background: `color-mix(in srgb, ${inst.color} 15%, transparent)`,
                            color: inst.color,
                          }}
                        >
                          {inst.badge}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB 3: SECTION 80D & MEDICLAIM ─── */}
      {activeTab === "sec80d" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 18,
            }}
          >
            {/* Self, Spouse & Dependent Children */}
            <Card style={{ padding: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 14,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: THEME.text }}>
                      Self, Spouse &amp; Children
                    </h3>
                    {data.sec80D.isSelfSenior && (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 6,
                          background: `color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
                          color: THEME.gold,
                        }}
                      >
                        Senior 60+ (₹50K Cap)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 2 }}>
                    Eligible Limit: {fmtINRFull(data.sec80D.selfLimit)}
                  </div>
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: 16, fontWeight: 700, color: THEME.rose || "#f43f5e" }}
                >
                  <Money value={data.sec80D.self} variant="full" />
                </div>
              </div>

              <CustomProgressBar
                used={data.sec80D.self}
                limit={data.sec80D.selfLimit}
                color={THEME.rose || "#f43f5e"}
              />

              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: THEME.textSecondary }}>
                  <span>Mediclaim Policies (Auto-detected):</span>
                  <strong style={{ color: THEME.text }}>
                    {fmtINRFull(data.sec80D.selfHealthAuto)}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: THEME.textSecondary }}>
                  <span>Preventive Checkup Claimed:</span>
                  <strong style={{ color: THEME.text }}>
                    {fmtINRFull(data.sec80D.selfCheckupClaimed)} / ₹5,000
                  </strong>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setModalForm({
                    section: "80D_CHECKUP_SELF",
                    category: "Preventive Health Checkup (Self / Family)",
                    amount: "5000",
                    notes: "",
                  });
                  setIsAddModalOpen(true);
                }}
                style={{ marginTop: 14, width: "100%", fontSize: 12 }}
              >
                + Add Self / Family Health Bill
              </Button>
            </Card>

            {/* Parents Health Insurance */}
            <Card style={{ padding: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 14,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: THEME.text }}>
                      Parents (Separate Ceiling)
                    </h3>
                    {data.sec80D.isParentsSenior && (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 6,
                          background: `color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
                          color: THEME.gold,
                        }}
                      >
                        Senior 60+ (₹50K Cap)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 2 }}>
                    Eligible Limit: {fmtINRFull(data.sec80D.parentsLimit)}
                  </div>
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: 16, fontWeight: 700, color: THEME.gold }}
                >
                  <Money value={data.sec80D.parents} variant="full" />
                </div>
              </div>

              <CustomProgressBar
                used={data.sec80D.parents}
                limit={data.sec80D.parentsLimit}
                color={THEME.gold}
              />

              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: THEME.textSecondary }}>
                  <span>Parents Mediclaim Policies:</span>
                  <strong style={{ color: THEME.text }}>
                    {fmtINRFull(data.sec80D.parentsHealthAuto)}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: THEME.textSecondary }}>
                  <span>Preventive Checkup Claimed:</span>
                  <strong style={{ color: THEME.text }}>
                    {fmtINRFull(data.sec80D.parentsCheckupClaimed)} / ₹5,000
                  </strong>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setModalForm({
                    section: "80D_PARENTS",
                    category: "Medical Expenditure for Senior Citizen Parents (No Insurance)",
                    amount: "25000",
                    notes: "Doctor consultations & pharmacy bills",
                  });
                  setIsAddModalOpen(true);
                }}
                style={{ marginTop: 14, width: "100%", fontSize: 12 }}
              >
                + Add Parents Health / Medical Bill
              </Button>
            </Card>
          </div>

          {/* Section 80D Statutory Rules Summary */}
          <Card style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Info size={16} color={THEME.accent} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12.5, color: THEME.textSecondary, lineHeight: 1.5 }}>
                <strong style={{ color: THEME.text }}>Section 80D Statutory Rules:</strong>
                <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                  <li>
                    <strong>Self, Spouse &amp; Kids:</strong> ₹25,000 limit (elevates to ₹50,000 if Self
                    or Spouse is age 60+).
                  </li>
                  <li>
                    <strong>Parents:</strong> Separate ₹25,000 limit (elevates to ₹50,000 if either
                    parent is age 60+).
                  </li>
                  <li>
                    <strong>Preventive Health Check-up:</strong> Up to ₹5,000 (included within overall
                    ceiling, cash payment allowed).
                  </li>
                  <li>
                    <strong>Direct Medical Expenditure:</strong> Up to ₹50,000 for senior citizen parents
                    who do NOT have a health insurance policy.
                  </li>
                  <li>
                    <strong>Total Max 80D Deduction:</strong> Up to <strong>₹1,00,000</strong> if both
                    self/spouse and parents are senior citizens.
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB 4: NPS & HOUSING (SEC 24) ─── */}
      {activeTab === "nps_housing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 18,
            }}
          >
            {/* 80CCD(1B) NPS Self */}
            <Card style={{ padding: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: THEME.text }}>
                    80CCD(1B) — NPS Self Contribution
                  </h3>
                  <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 2 }}>
                    Exclusive additional deduction up to ₹50,000 over 80C
                  </div>
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: 16, fontWeight: 700, color: THEME.violet }}
                >
                  <Money value={data.sec80CCD1B.used} variant="full" />
                </div>
              </div>

              <CustomProgressBar
                used={data.sec80CCD1B.used}
                limit={data.sec80CCD1B.limit}
                color={THEME.violet}
              />

              <div style={{ marginTop: 14, fontSize: 12, color: THEME.textSecondary }}>
                {data.sec80CCD1B.remaining === 0 ? (
                  <span style={{ color: THEME.sage, fontWeight: 600 }}>
                    ✓ Full ₹50,000 deduction claimed for FY {selectedFY}
                  </span>
                ) : (
                  <span>
                    Remaining room: <strong>{fmtINRFull(data.sec80CCD1B.remaining)}</strong> (Saves{" "}
                    {fmtINRFull(data.sec80CCD1B.remaining * effectiveTaxRate)})
                  </span>
                )}
              </div>
            </Card>

            {/* 80CCD(2) Employer NPS */}
            <Card style={{ padding: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: THEME.text }}>
                    80CCD(2) — Employer NPS Contribution
                  </h3>
                  <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 2 }}>
                    Eligible in both Old AND New Tax Regimes (Up to 10% basic salary)
                  </div>
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: 16, fontWeight: 700, color: THEME.accent }}
                >
                  <Money value={data.sec80CCD2.total} variant="full" />
                </div>
              </div>

              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                  fontSize: 12,
                  color: THEME.text,
                }}
              >
                ⭐ <strong>No Upper Rupee Limit:</strong> Tax deduction is allowed up to 10% of (Basic +
                DA) for private sector employees and 14% for Central/State Govt employees.
              </div>
            </Card>

            {/* Section 24(b) Home Loan Interest */}
            <Card style={{ padding: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: THEME.text }}>
                    Section 24(b) — Home Loan Interest
                  </h3>
                  <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 2 }}>
                    Up to ₹2,00,000 for self-occupied residential property
                  </div>
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: 16, fontWeight: 700, color: THEME.sage }}
                >
                  <Money value={data.sec24.total} variant="full" />
                </div>
              </div>

              <CustomProgressBar
                used={data.sec24.total}
                limit={data.sec24.limit}
                color={THEME.sage}
              />

              <div style={{ marginTop: 14, fontSize: 12, color: THEME.textSecondary }}>
                Total Annual Interest: {fmtINRFull(data.sec24.rawInterest)}
                {data.sec24.rawInterest > data.sec24.limit && (
                  <span style={{ color: THEME.gold, marginLeft: 6 }}>
                    (Capped at statutory ₹2,00,000 ceiling)
                  </span>
                )}
              </div>
            </Card>

            {/* Section 80EEA Affordable Housing */}
            <Card style={{ padding: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: THEME.text }}>
                    Section 80EEA — First-Time Home Buyer
                  </h3>
                  <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 2 }}>
                    Additional interest deduction up to ₹1,50,000 for affordable housing loans
                  </div>
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: 16, fontWeight: 700, color: THEME.gold }}
                >
                  <Money value={data.otherVIA.sec80EEA} variant="full" />
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setModalForm({
                    section: "80EEA",
                    category: "Section 80EEA Affordable Housing Loan Interest",
                    amount: "150000",
                    notes: "First-time buyer stamp value < ₹45L",
                  });
                  setIsAddModalOpen(true);
                }}
                style={{ marginTop: 10, width: "100%", fontSize: 12 }}
              >
                + Add 80EEA Interest
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 5: OTHER CHAPTER VI-A DEDUCTIONS ─── */}
      {activeTab === "other_via" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card style={{ padding: 22 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: THEME.text }}>
                  Additional Chapter VI-A Deductions
                </h3>
                <div style={{ fontSize: 12, color: THEME.textSecondary }}>
                  Higher education loans, donations, disability relief, medical treatments, and EV loans
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingDeductionId(null);
                  setModalForm({
                    section: "80E",
                    category: "Higher Education Loan Interest (Section 80E)",
                    amount: "",
                    notes: "",
                  });
                  setIsAddModalOpen(true);
                }}
                style={{ fontSize: 12 }}
              >
                <Plus size={13} /> Add Other Section
              </Button>
            </div>

            {/* Cards Grid for Other Sections */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              {/* Section 80E */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "var(--surface-1, rgba(255,255,255,0.03))",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <GraduationCap size={16} color={THEME.accent} />
                    <strong style={{ fontSize: 13.5, color: THEME.text }}>
                      80E — Education Loan Interest
                    </strong>
                  </div>
                  <strong style={{ fontSize: 14, color: THEME.accent }}>
                    {fmtINRFull(data.otherVIA.sec80E)}
                  </strong>
                </div>
                <div style={{ fontSize: 11.5, color: THEME.textSecondary, marginTop: 6 }}>
                  No upper limit! Deduction for interest on higher education loan for 8 consecutive years.
                </div>
              </div>

              {/* Section 80G */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "var(--surface-1, rgba(255,255,255,0.03))",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Gift size={16} color={THEME.gold} />
                    <strong style={{ fontSize: 13.5, color: THEME.text }}>
                      80G — Charitable Donations
                    </strong>
                  </div>
                  <strong style={{ fontSize: 14, color: THEME.gold }}>
                    {fmtINRFull(data.otherVIA.sec80G)}
                  </strong>
                </div>
                <div style={{ fontSize: 11.5, color: THEME.textSecondary, marginTop: 6 }}>
                  50% or 100% deduction for donations to approved funds &amp; charitable institutions.
                </div>
              </div>

              {/* Section 80TTA / 80TTB */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "var(--surface-1, rgba(255,255,255,0.03))",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Landmark size={16} color={THEME.sage} />
                    <strong style={{ fontSize: 13.5, color: THEME.text }}>
                      {data.sec80TTA.is80TTB ? "80TTB — Senior Citizen Interest" : "80TTA — Savings Interest"}
                    </strong>
                  </div>
                  <strong style={{ fontSize: 14, color: THEME.sage }}>
                    {fmtINRFull(data.sec80TTA.total)}
                  </strong>
                </div>
                <div style={{ fontSize: 11.5, color: THEME.textSecondary, marginTop: 6 }}>
                  {data.sec80TTA.is80TTB
                    ? "Up to ₹50,000 deduction on savings, FD & RD interest (Age 60+)"
                    : "Up to ₹10,000 deduction on savings bank interest"}
                </div>
              </div>

              {/* Section 80GG */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "var(--surface-1, rgba(255,255,255,0.03))",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Home size={16} color={THEME.violet} />
                    <strong style={{ fontSize: 13.5, color: THEME.text }}>
                      80GG — Rent Without HRA
                    </strong>
                  </div>
                  <strong style={{ fontSize: 14, color: THEME.violet }}>
                    {fmtINRFull(data.otherVIA.sec80GG)}
                  </strong>
                </div>
                <div style={{ fontSize: 11.5, color: THEME.textSecondary, marginTop: 6 }}>
                  Up to ₹60,000/year (₹5,000/mo) for individuals not receiving HRA from an employer.
                </div>
              </div>

              {/* Section 80U / 80DD */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "var(--surface-1, rgba(255,255,255,0.03))",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <UserCheck size={16} color={THEME.rose || "#f43f5e"} />
                    <strong style={{ fontSize: 13.5, color: THEME.text }}>
                      80U / 80DD — Disability Relief
                    </strong>
                  </div>
                  <strong style={{ fontSize: 14, color: THEME.rose || "#f43f5e" }}>
                    {fmtINRFull(data.otherVIA.sec80U + data.otherVIA.sec80DD)}
                  </strong>
                </div>
                <div style={{ fontSize: 11.5, color: THEME.textSecondary, marginTop: 6 }}>
                  Flat ₹75,000 (40%-80% disability) or ₹1,25,000 (severe 80%+ disability).
                </div>
              </div>

              {/* Section 80DDB */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "var(--surface-1, rgba(255,255,255,0.03))",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Activity size={16} color="#f59e0b" />
                    <strong style={{ fontSize: 13.5, color: THEME.text }}>
                      80DDB — Specified Medical Treatment
                    </strong>
                  </div>
                  <strong style={{ fontSize: 14, color: "#f59e0b" }}>
                    {fmtINRFull(data.otherVIA.sec80DDB)}
                  </strong>
                </div>
                <div style={{ fontSize: 11.5, color: THEME.textSecondary, marginTop: 6 }}>
                  Treatment for critical illnesses (₹40,000 normal / ₹1,00,000 for senior citizens).
                </div>
              </div>

              {/* Section 80EEB */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "var(--surface-1, rgba(255,255,255,0.03))",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Zap size={16} color={THEME.cyan || "#06b6d4"} />
                    <strong style={{ fontSize: 13.5, color: THEME.text }}>
                      80EEB — Electric Vehicle Loan Interest
                    </strong>
                  </div>
                  <strong style={{ fontSize: 14, color: THEME.cyan || "#06b6d4" }}>
                    {fmtINRFull(data.otherVIA.sec80EEB)}
                  </strong>
                </div>
                <div style={{ fontSize: 11.5, color: THEME.textSecondary, marginTop: 6 }}>
                  Up to ₹1,50,000 interest deduction on loan taken for EV purchase.
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB 6: WHAT-IF SIMULATOR ─── */}
      {activeTab === "simulator" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card style={{ padding: 22 }}>
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sliders size={18} color={THEME.accent} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: THEME.text }}>
                  Interactive Tax Savings &amp; Gap-Filler Simulator
                </h3>
              </div>
              <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 4 }}>
                Simulate investing into ELSS, PPF, NPS, or Health Insurance before March 31 to see instant tax savings
              </div>
            </div>

            {/* Simulation Controls Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {/* ELSS Mutual Fund Simulator Slider */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "var(--surface-1, rgba(255,255,255,0.03))",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: THEME.text }}>ELSS Mutual Fund (80C)</span>
                  <strong style={{ color: THEME.accent }}>{fmtINRFull(simELSS)}</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(150000, data.sec80C.remaining)}
                  step="5000"
                  value={simELSS}
                  onChange={(e) => setSimELSS(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.accent }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.textSecondary, marginTop: 4 }}>
                  <span>₹0</span>
                  <span>Unfilled 80C: {fmtINR(data.sec80C.remaining)}</span>
                </div>
              </div>

              {/* NPS 80CCD(1B) Simulator Slider */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "var(--surface-1, rgba(255,255,255,0.03))",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: THEME.text }}>NPS Tier-1 Self (80CCD 1B)</span>
                  <strong style={{ color: THEME.violet }}>{fmtINRFull(simNPS1B)}</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50000"
                  step="5000"
                  value={simNPS1B}
                  onChange={(e) => setSimNPS1B(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.violet }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.textSecondary, marginTop: 4 }}>
                  <span>₹0</span>
                  <span>Unfilled 1B: {fmtINR(data.sec80CCD1B.remaining)}</span>
                </div>
              </div>

              {/* Health Insurance Self */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "var(--surface-1, rgba(255,255,255,0.03))",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: THEME.text }}>Self / Family Health (80D)</span>
                  <strong style={{ color: THEME.rose || "#f43f5e" }}>{fmtINRFull(simHealthSelf)}</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max={data.sec80D.selfLimit}
                  step="2500"
                  value={simHealthSelf}
                  onChange={(e) => setSimHealthSelf(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.rose || "#f43f5e" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.textSecondary, marginTop: 4 }}>
                  <span>₹0</span>
                  <span>Max: {fmtINR(data.sec80D.selfLimit)}</span>
                </div>
              </div>

              {/* Parents Health Insurance */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "var(--surface-1, rgba(255,255,255,0.03))",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: THEME.text }}>Parents Health (80D)</span>
                  <strong style={{ color: THEME.gold }}>{fmtINRFull(simHealthParents)}</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max={data.sec80D.parentsLimit}
                  step="5000"
                  value={simHealthParents}
                  onChange={(e) => setSimHealthParents(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.gold }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.textSecondary, marginTop: 4 }}>
                  <span>₹0</span>
                  <span>Max: {fmtINR(data.sec80D.parentsLimit)}</span>
                </div>
              </div>
            </div>

            {/* Simulation Impact Banner */}
            <div
              style={{
                marginTop: 20,
                padding: "16px 20px",
                borderRadius: 12,
                background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.sage} 15%, transparent) 0%, color-mix(in srgb, ${THEME.accent} 12%, transparent) 100%)`,
                border: `1px solid color-mix(in srgb, ${THEME.sage} 30%, transparent)`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: THEME.textSecondary }}>
                  Simulated Additional Inflow:{" "}
                  <strong>{fmtINRFull(simELSS + simPPF + simNPS1B + simHealthSelf + simHealthParents + simCheckup)}</strong>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text, marginTop: 2 }}>
                  Total Projected Deductions: {fmtINRFull(totalSimulatedDeductions)}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: THEME.textSecondary }}>
                  Extra In-Hand Tax Saved:
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: 22, fontWeight: 800, color: THEME.sage }}
                >
                  + {fmtINRFull(extraTaxSavedFromSimulation)}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB 7: CA / HR DECLARATION EXPORT ─── */}
      {activeTab === "declaration" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card style={{ padding: 22 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: THEME.text }}>
                  Form 12BB / CA Tax Deduction Declaration Summary
                </h3>
                <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 2 }}>
                  Official summary formatted for employee tax proof submissions and Chartered Accountant filing
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyDeclarationSummary}
                  style={{ display: "flex", alignItems: "center", gap: 5 }}
                >
                  {copiedDeclaration ? <Check size={14} color={THEME.sage} /> : <Copy size={14} />}
                  {copiedDeclaration ? "Copied to Clipboard!" : "Copy Summary"}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePrint}
                  style={{ display: "flex", alignItems: "center", gap: 5 }}
                >
                  <Printer size={14} /> Print / Save PDF
                </Button>
              </div>
            </div>

            {/* Formatted Declaration Preview Box */}
            <div
              style={{
                padding: 20,
                borderRadius: 8,
                background: "var(--surface-1, rgba(255,255,255,0.02))",
                border: `1px solid ${THEME.line}`,
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 12,
                lineHeight: 1.6,
                color: THEME.text,
              }}
            >
              <div style={{ borderBottom: `1px dashed ${THEME.line}`, paddingBottom: 10, marginBottom: 12 }}>
                <strong>FORM 12BB STATEMENT OF DEDUCTIONS CLAIMED (OLD REGIME)</strong>
                <br />
                Financial Year: {selectedFY} | Assessment Year:{" "}
                {Number(selectedFY.split("-")[0]) + 1}-{Number(selectedFY.split("-")[0]) + 2}
              </div>

              {/* 80C */}
              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: THEME.accent }}>1. SECTION 80C INVESTMENTS &amp; EXPENSES:</strong>
                <div style={{ paddingLeft: 16 }}>
                  {data.sec80C.items.map((i) => (
                    <div key={i.id} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>• {i.label}</span>
                      <span>{fmtINRFull(i.amount)}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 700,
                      borderTop: `1px solid color-mix(in srgb, ${THEME.line} 50%, transparent)`,
                      marginTop: 4,
                      paddingTop: 4,
                    }}
                  >
                    <span>Total Section 80C (Subject to ₹1.5L cap):</span>
                    <span>{fmtINRFull(data.sec80C.used)}</span>
                  </div>
                </div>
              </div>

              {/* 80CCD */}
              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: THEME.violet }}>2. SECTION 80CCD NATIONAL PENSION SYSTEM:</strong>
                <div style={{ paddingLeft: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>• 80CCD(1B) NPS Tier-1 Individual Contribution:</span>
                    <span>{fmtINRFull(data.sec80CCD1B.used)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>• 80CCD(2) Employer NPS Contribution:</span>
                    <span>{fmtINRFull(data.sec80CCD2.total)}</span>
                  </div>
                </div>
              </div>

              {/* 80D */}
              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: THEME.rose || "#f43f5e" }}>3. SECTION 80D MEDICLAIM &amp; HEALTH CHECKUP:</strong>
                <div style={{ paddingLeft: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>• Self, Spouse &amp; Children:</span>
                    <span>{fmtINRFull(data.sec80D.self)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>• Parents:</span>
                    <span>{fmtINRFull(data.sec80D.parents)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 700,
                      borderTop: `1px solid color-mix(in srgb, ${THEME.line} 50%, transparent)`,
                      marginTop: 4,
                      paddingTop: 4,
                    }}
                  >
                    <span>Total Section 80D Claimed:</span>
                    <span>{fmtINRFull(data.sec80D.total)}</span>
                  </div>
                </div>
              </div>

              {/* Section 24 */}
              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: THEME.sage }}>4. SECTION 24(B) HOME LOAN INTEREST:</strong>
                <div style={{ paddingLeft: 16, display: "flex", justifyContent: "space-between" }}>
                  <span>• Interest on Housing Loan for Self-Occupied Property:</span>
                  <span>{fmtINRFull(data.sec24.total)}</span>
                </div>
              </div>

              {/* Section 80TTA */}
              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: THEME.cyan || "#06b6d4" }}>5. SECTION 80TTA / 80TTB INTEREST:</strong>
                <div style={{ paddingLeft: 16, display: "flex", justifyContent: "space-between" }}>
                  <span>• Interest on Deposits:</span>
                  <span>{fmtINRFull(data.sec80TTA.total)}</span>
                </div>
              </div>

              {/* Other Chapter VI-A */}
              {data.otherVIA.total > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ color: "#f59e0b" }}>6. OTHER CHAPTER VI-A DEDUCTIONS:</strong>
                  <div style={{ paddingLeft: 16 }}>
                    {data.otherVIA.sec80E > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>• 80E Higher Education Loan Interest:</span>
                        <span>{fmtINRFull(data.otherVIA.sec80E)}</span>
                      </div>
                    )}
                    {data.otherVIA.sec80G > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>• 80G Charitable Donations:</span>
                        <span>{fmtINRFull(data.otherVIA.sec80G)}</span>
                      </div>
                    )}
                    {data.otherVIA.sec80GG > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>• 80GG Rent Paid (No HRA):</span>
                        <span>{fmtINRFull(data.otherVIA.sec80GG)}</span>
                      </div>
                    )}
                    {data.otherVIA.sec80U + data.otherVIA.sec80DD > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>• 80U / 80DD Disability Maintenance:</span>
                        <span>{fmtINRFull(data.otherVIA.sec80U + data.otherVIA.sec80DD)}</span>
                      </div>
                    )}
                    {data.otherVIA.sec80DDB > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>• 80DDB Medical Treatment:</span>
                        <span>{fmtINRFull(data.otherVIA.sec80DDB)}</span>
                      </div>
                    )}
                    {data.otherVIA.sec80EEB > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>• 80EEB Electric Vehicle Loan Interest:</span>
                        <span>{fmtINRFull(data.otherVIA.sec80EEB)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Grand Total */}
              <div
                style={{
                  borderTop: `2px solid ${THEME.line}`,
                  paddingTop: 10,
                  marginTop: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                <span>TOTAL CHAPTER VI-A &amp; SEC 24 DEDUCTIONS:</span>
                <span style={{ color: THEME.sage }}>{fmtINRFull(data.totalDeductions)}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          6. ADD / EDIT DEDUCTION MODAL
          ══════════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <Modal
          title={editingDeductionId ? "Edit Custom Deduction" : "Add Custom Deduction / Bill"}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingDeductionId(null);
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Presets Picker */}
            {!editingDeductionId && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: THEME.text, marginBottom: 4, display: "block" }}>
                  Quick Preset Category
                </label>
                <select
                  value={modalForm.category}
                  onChange={(e) => {
                    const preset = PRESET_CUSTOM_DEDUCTIONS.find((p) => p.category === e.target.value);
                    if (preset) {
                      setModalForm((prev) => ({
                        ...prev,
                        category: preset.category,
                        section: preset.section,
                        notes: preset.description,
                      }));
                    } else {
                      setModalForm((prev) => ({ ...prev, category: e.target.value }));
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                    color: THEME.text,
                    fontSize: 13,
                  }}
                >
                  {PRESET_CUSTOM_DEDUCTIONS.map((p) => (
                    <option key={p.category} value={p.category}>
                      [{p.section}] {p.category}
                    </option>
                  ))}
                  <option value="Custom Other">Custom Other Deduction</option>
                </select>
              </div>
            )}

            {/* Section Picker */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: THEME.text, marginBottom: 4, display: "block" }}>
                Target Section
              </label>
              <select
                value={modalForm.section}
                onChange={(e) =>
                  setModalForm((prev) => ({
                    ...prev,
                    section: e.target.value as CustomDeduction["section"],
                  }))
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                  color: THEME.text,
                  fontSize: 13,
                }}
              >
                <option value="80C">Section 80C (PPF, ELSS, Tuition, Stamp Duty, 5Y FD)</option>
                <option value="80CCD1B">80CCD(1B) — NPS Self (Up to ₹50,000)</option>
                <option value="80CCD2">80CCD(2) — Employer NPS</option>
                <option value="80D_SELF">80D — Self &amp; Family Health Premium</option>
                <option value="80D_PARENTS">80D — Parents Health Premium / Senior Medical</option>
                <option value="80D_CHECKUP_SELF">80D — Preventive Health Checkup Self (₹5K max)</option>
                <option value="80D_CHECKUP_PARENTS">80D — Preventive Health Checkup Parents (₹5K max)</option>
                <option value="80E">80E — Higher Education Loan Interest (No Cap)</option>
                <option value="80G_100">80G — 100% Tax Relief Donation (PM CARES, etc.)</option>
                <option value="80G_50">80G — 50% Tax Relief Donation (Charitable NGOs)</option>
                <option value="80GG">80GG — Rent Paid without HRA (Up to ₹60K/yr)</option>
                <option value="80TTA">80TTA — Savings Interest (Up to ₹10K)</option>
                <option value="80TTB">80TTB — Senior Citizen Interest (Up to ₹50K)</option>
                <option value="80U">80U — Self Disability</option>
                <option value="80DD">80DD — Dependent Disability</option>
                <option value="80DDB">80DDB — Specified Medical Treatment</option>
                <option value="80EEA">80EEA — Affordable Housing Loan Interest</option>
                <option value="80EEB">80EEB — EV Loan Interest</option>
                <option value="SEC24">Section 24(b) — Home Loan Interest</option>
                <option value="OTHER">Other Custom Deduction</option>
              </select>
            </div>

            {/* Custom Label / Category Name */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: THEME.text, marginBottom: 4, display: "block" }}>
                Description / Item Name
              </label>
              <input
                type="text"
                value={modalForm.category}
                onChange={(e) => setModalForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="e.g. Children School Tuition Fees"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                  color: THEME.text,
                  fontSize: 13,
                }}
              />
            </div>

            {/* Amount */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: THEME.text, marginBottom: 4, display: "block" }}>
                Amount (₹)
              </label>
              <input
                type="number"
                value={modalForm.amount}
                onChange={(e) => setModalForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="e.g. 45000"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                  color: THEME.text,
                  fontSize: 13,
                }}
              />
            </div>

            {/* Notes */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: THEME.text, marginBottom: 4, display: "block" }}>
                Notes / Reference / Policy Number (Optional)
              </label>
              <input
                type="text"
                value={modalForm.notes}
                onChange={(e) => setModalForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g. DPS School Q1-Q4 fees receipt"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                  color: THEME.text,
                  fontSize: 13,
                }}
              />
            </div>

            <ModalActions>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingDeductionId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveCustomDeduction}
                disabled={!modalForm.amount || parseFloat(modalForm.amount) <= 0}
              >
                {editingDeductionId ? "Save Changes" : "Add Deduction"}
              </Button>
            </ModalActions>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Custom Deduction"
          message="Are you sure you want to remove this custom deduction line item?"
          confirmLabel="Delete"
          onConfirm={() => handleDeleteCustom(deleteConfirmId)}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
};
