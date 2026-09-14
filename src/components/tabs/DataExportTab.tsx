import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  Download,
  Upload,
  FileText,
  Shield,
  CheckCircle,
  AlertTriangle,
  Database,
  Clock,
  CloudOff,
  CloudCheck,
  Search,
  Check,
  Copy,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Building,
  CreditCard,
  PiggyBank,
  FolderOpen,
  Lock,
  Info,
  Layers,
  FileCheck,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Code,
  Eye,
  CheckSquare,
  Square,
  ArrowRight,
  Filter,
  FileCode,
  CheckCircle2,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { today } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Button } from "../ui/Button";
import { StatCard } from "../ui/StatCard";

// ─── Domain Groupings & Categorized Collections (with Sub-Objects & Fields) ───

export interface SubObjectMeta {
  name: string;
  key: string;
  description: string;
  fields: string[];
}

export interface DataItemMeta {
  key: string;
  label: string;
  description?: string;
  fields?: string[];
  subObjects?: SubObjectMeta[];
}

export interface DataCategory {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  items: DataItemMeta[];
}

export const DOMAIN_CATEGORIES: DataCategory[] = [
  {
    id: "banking",
    name: "Banking, Cash & Cards",
    description: "Liquid bank accounts, credit/prepaid cards, card companion variants, bills & transactions",
    icon: PiggyBank,
    color: "#3b82f6",
    items: [
      {
        key: "bankAccounts",
        label: "Bank Accounts",
        description: "Savings, current, salary & checking ledgers with branch & IFSC info",
        fields: ["id", "bankName", "accountNumber", "accountType", "balance", "ifsc", "minBalance", "notes"],
      },
      {
        key: "transactions",
        label: "Account Transactions",
        description: "Inflows, outflows, category tags, ledger transfers & reference IDs",
        fields: ["id", "date", "accountId", "type", "category", "amount", "description", "tags", "refNo"],
      },
      {
        key: "creditCards",
        label: "Credit Cards & Variants",
        description: "Cards, limits, billing dates, reward points, companion cards & sub-card ledgers",
        fields: ["id", "issuer", "network", "last4", "limit", "outstanding", "billDate", "dueDay", "annualFee", "rewardPointsBalance"],
        subObjects: [
          {
            name: "Card Variants",
            key: "variants",
            description: "Multi-card linked companion cards (RuPay UPI, Virtual, Add-on, Companion Amex)",
            fields: ["id", "name", "network", "last4", "cardType", "status"],
          },
          {
            name: "Card Transactions",
            key: "transactions",
            description: "Card-level transaction history and merchant entries",
            fields: ["id", "date", "merchant", "amount", "category", "variantId", "variantName"],
          },
        ],
      },
      {
        key: "prepaidCards",
        label: "Prepaid & Forex Wallets",
        description: "Travel cards, digital prepaid balances & multi-currency wallets",
        fields: ["id", "issuer", "cardName", "last4", "balance", "currency", "expiry"],
      },
      {
        key: "billPayments",
        label: "Bills & Subscriptions",
        description: "Utility bills, scheduled dues, auto-pay setups & frequency",
        fields: ["id", "biller", "category", "amount", "dueDate", "autoPay", "status", "notes"],
      },
      {
        key: "billPaymentHistory",
        label: "Bill Payment History",
        description: "Historical payment receipts, transaction reference IDs & audit timestamps",
        fields: ["id", "biller", "amount", "datePaid", "paymentRef", "paymentMode"],
      },
      {
        key: "recurringExpenses",
        label: "Recurring Expenses",
        description: "Standing orders, rent agreements & scheduled recurring costs",
        fields: ["id", "title", "category", "amount", "frequency", "nextDueDate", "accountId"],
      },
    ],
  },
  {
    id: "investments",
    name: "Wealth, Stocks & Markets",
    description: "Equities, mutual funds, demat accounts, fixed income, gold, PF & retirement deposits",
    icon: TrendingUp,
    color: "#10b981",
    items: [
      {
        key: "mutualFunds",
        label: "Mutual Funds Portfolio",
        description: "Active folios, AMC schemes, units, purchase NAV, current NAV & category",
        fields: ["id", "schemeName", "folioNo", "amc", "category", "units", "nav", "invested", "currentValue", "sipId"],
      },
      {
        key: "stocks",
        label: "Stocks & Equities",
        description: "Demat equity holdings, ticker symbols, average price, CMP & sector classification",
        fields: ["id", "symbol", "companyName", "dematId", "qty", "avgPrice", "cmp", "invested", "currentValue", "sector", "marketCap"],
      },
      {
        key: "demat",
        label: "Demat & Broker Accounts",
        description: "Depository accounts (NSDL/CDSL), broker IDs & holding valuations",
        fields: ["id", "brokerName", "boId", "depository", "linkedBank", "holdingValue"],
      },
      {
        key: "fixedDeposits",
        label: "Fixed Deposits (FD)",
        description: "Bank term deposits, principal, tenure, compounding, interest rate & maturity amount",
        fields: ["id", "bank", "fdNumber", "principal", "interestRate", "startDate", "tenureMonths", "maturityDate", "maturityAmount", "compounding"],
      },
      {
        key: "recurringDeposits",
        label: "Recurring Deposits (RD)",
        description: "Monthly recurring deposit accounts, tenure & cumulative maturity estimates",
        fields: ["id", "bank", "monthlyDeposit", "rate", "startDate", "tenureMonths", "maturityAmount"],
      },
      {
        key: "bonds",
        label: "Bonds & SGBs",
        description: "Corporate bonds, Government Securities & Sovereign Gold Bonds",
        fields: ["id", "issuer", "isin", "units", "buyPrice", "couponRate", "maturityDate", "frequency"],
      },
      {
        key: "goldHoldings",
        label: "Physical & Digital Gold",
        description: "Gold jewelry, 24K bars, coins, digital gold & storage locker locations",
        fields: ["id", "type", "weightGrams", "purityKarat", "buyPrice", "buyDate", "currentValuation", "lockerLocation"],
      },
      {
        key: "ppf",
        label: "Public Provident Fund (PPF)",
        description: "PPF accounts, bank branches, maturity years & accumulated balances",
        fields: ["id", "accountNumber", "bank", "openYear", "balance", "maturityYear"],
      },
      {
        key: "ppfLedger",
        label: "PPF Contribution Ledger",
        description: "Yearly PPF deposit history, financial year breakdowns & transaction receipts",
        fields: ["id", "date", "amount", "financialYear", "depositRef"],
      },
      {
        key: "nps",
        label: "National Pension Scheme (NPS)",
        description: "Tier 1 & Tier 2 retirement pots, PRAN & asset allocation ratios (E/C/G)",
        fields: ["id", "pran", "tier", "equityRatio", "corpRatio", "govtRatio", "balance", "monthlyContribution"],
      },
      {
        key: "epf",
        label: "Employee Provident Fund (EPF)",
        description: "UAN balances, employee share, employer share & pension fund passbook",
        fields: ["id", "uan", "employer", "employeeShare", "employerShare", "pensionShare", "totalBalance"],
      },
      {
        key: "sips",
        label: "Systematic Investment Plans",
        description: "Active monthly SIP schedules, deduction dates, mandate banks & auto-debit status",
        fields: ["id", "schemeName", "type", "amount", "dayOfMonth", "frequency", "linkedAccount", "status"],
      },
      {
        key: "dividends",
        label: "Dividend Income Logs",
        description: "Equities & Mutual Fund dividend payouts, credit dates & tax deduction logs",
        fields: ["id", "symbol", "date", "amount", "perShare", "accountId", "creditDate"],
      },
      {
        key: "stockSells",
        label: "Stock Realized Sells",
        description: "Historical equity sell trades, buy/sell dates, STCG/LTCG capital gains",
        fields: ["id", "symbol", "buyDate", "sellDate", "qty", "buyPrice", "sellPrice", "pnl", "gainType"],
      },
      {
        key: "mfSells",
        label: "MF Realized Redemptions",
        description: "Historical mutual fund sell trades, NAV differences & tax classifications",
        fields: ["id", "schemeName", "folioNo", "buyDate", "sellDate", "units", "navBuy", "navSell", "pnl", "stcgLtcg"],
      },
      {
        key: "corporateActions",
        label: "Corporate Actions",
        description: "Bonus shares, stock splits, rights issues & merger logs",
        fields: ["id", "symbol", "actionType", "ratio", "recordDate", "remarks"],
      },
      {
        key: "govtSchemes",
        label: "Government Schemes",
        description: "Sukanya Samriddhi (SSY), SCSS, NSC, KVP, PMVVY & other sovereign schemes",
        fields: ["id", "schemeType", "accountNo", "balance", "interestRate", "maturityDate", "holder"],
      },
    ],
  },
  {
    id: "realEstate",
    name: "Real Estate & Physical Assets",
    description: "Property holdings, builder demands, construction disbursements, rental agreements & vehicles",
    icon: Building,
    color: "#f59e0b",
    items: [
      {
        key: "realEstateProperties",
        label: "Real Estate Properties",
        description: "Land, residential apartments, commercial units, registry & valuation data",
        fields: ["id", "name", "type", "location", "purchasePrice", "currentValue", "loanId", "registrationDate", "areaSqFt"],
      },
      {
        key: "realEstateDemands",
        label: "Real Estate Demands",
        description: "Builder milestone payment notices, architectural stages & due dates",
        fields: ["id", "propertyId", "demandStage", "demandDate", "amountDue", "dueDate", "status"],
      },
      {
        key: "realEstatePayments",
        label: "Real Estate Payments",
        description: "Disbursements, receipts, builder challans & payment modes",
        fields: ["id", "propertyId", "demandId", "datePaid", "amountPaid", "paymentMode", "receiptNo"],
      },
      {
        key: "rentalProperties",
        label: "Rental Properties (Income)",
        description: "Tenants, lease agreements, monthly rental inflows & security deposits received",
        fields: ["id", "propertyId", "tenantName", "monthlyRent", "depositReceived", "leaseStart", "leaseEnd", "status"],
      },
      {
        key: "rentedProperties",
        label: "Rented Properties (Expense)",
        description: "Landlord agreements, monthly rent obligations & security deposits paid",
        fields: ["id", "propertyName", "landlordName", "rentAmount", "depositPaid", "agreementEnd"],
      },
      {
        key: "vehicles",
        label: "Vehicles & Automobiles",
        description: "Cars, motorcycles, registration, purchase price, current valuation & insurance/PUCC dates",
        fields: ["id", "vehicleName", "registrationNo", "makeModel", "purchaseYear", "purchasePrice", "currentValue", "insuranceExpiry", "puccExpiry", "loanId"],
      },
    ],
  },
  {
    id: "insuranceTax",
    name: "Insurance, Tax & Income",
    description: "Life/Health protection policies, salary slips, advance tax challans & Form 26AS TDS",
    icon: Shield,
    color: "#8b5cf6",
    items: [
      {
        key: "lic",
        label: "Life Insurance (Traditional)",
        description: "Endowment policies, money-back plans, sum assured & premium schedules",
        fields: ["id", "policyNo", "company", "planName", "sumAssured", "premium", "premiumFrequency", "premiumDueDate", "maturityDate", "nominee"],
      },
      {
        key: "termPlans",
        label: "Term Life Insurance",
        description: "Pure risk term protection, critical illness riders, cover amounts & expiry",
        fields: ["id", "policyNo", "insurer", "sumAssured", "premium", "termYears", "riderCover", "expiryDate"],
      },
      {
        key: "healthInsurance",
        label: "Health & Mediclaim",
        description: "Family floater, individual health covers, TPA contact & No-Claim Bonus",
        fields: ["id", "policyNo", "insurer", "planType", "sumInsured", "membersCovered", "premium", "renewalDate", "tpaContact", "noClaimBonus"],
      },
      {
        key: "investmentPlans",
        label: "ULIPs & Endowments",
        description: "Investment-linked insurance plans, fund values & lock-in periods",
        fields: ["id", "policyNo", "insurer", "planName", "fundValue", "annualizedPremium", "lockInEnd"],
      },
      {
        key: "income",
        label: "Income Entries",
        description: "Salary, business revenues, consulting retainers, interest & capital gains",
        fields: ["id", "source", "category", "amount", "frequency", "grossAmount", "deductions", "date"],
      },
      {
        key: "salarySlips",
        label: "Salary Slips & CTC Structure",
        description: "Monthly payslips with Basic, HRA, allowances, EPF/PT/TDS deductions & net pay",
        fields: ["id", "month", "year", "basic", "hra", "specialAllowance", "epfEmployee", "epfEmployer", "pt", "tds", "netPay", "ctc"],
      },
      {
        key: "taxPayments",
        label: "Advance Tax & Self-Assessment",
        description: "Tax challans, BSR codes, minor heads (100/300/400) & tender dates",
        fields: ["id", "fy", "ay", "bsrCode", "challanNo", "tenderDate", "amount", "taxHead"],
      },
      {
        key: "form26as",
        label: "Form 26AS Tax Credits",
        description: "TDS deductions, deductor TAN, sections (194A/C/J/I), quarterly credits & FY logs",
        fields: ["id", "deductor", "tan", "section", "amountPaid", "tdsDeducted", "quarter", "fy"],
      },
    ],
  },
  {
    id: "liabilities",
    name: "Liabilities & Loans",
    description: "Formal mortgages, bank borrowings, vehicle loans, and informal lending/borrowing",
    icon: CreditCard,
    color: "#ef4444",
    items: [
      {
        key: "loansTaken",
        label: "Formal Loans Taken",
        description: "Home loans, vehicle loans, personal loans, EMI, principal & interest rates",
        fields: ["id", "loanName", "lender", "loanType", "principal", "outstandingPrincipal", "interestRate", "emiAmount", "tenureMonths", "startDate", "endDate"],
      },
      {
        key: "loansGiven",
        label: "Loans Given (Formal)",
        description: "Lending to businesses, corporate notes or legally documented loan agreements",
        fields: ["id", "borrower", "principal", "interestRate", "dueDate", "status"],
      },
      {
        key: "informalLent",
        label: "Informal Loans (Lent)",
        description: "Money lent to friends, relatives, colleagues & tracking repayment status",
        fields: ["id", "personName", "amount", "dateLent", "expectedReturnDate", "status", "notes"],
      },
      {
        key: "informalBorrowed",
        label: "Informal Loans (Borrowed)",
        description: "Money borrowed from friends & family with settlement reminders",
        fields: ["id", "personName", "amount", "dateBorrowed", "expectedReturnDate", "notes"],
      },
    ],
  },
  {
    id: "planningVault",
    name: "Goals, Vault & Planning",
    description: "Financial goals, budgets, vault document indexes, nominees, watchlists & credit history",
    icon: FolderOpen,
    color: "#06b6d4",
    items: [
      {
        key: "goals",
        label: "Financial Goals",
        description: "Retirement, child education, house down payment, target amounts & timelines",
        fields: ["id", "title", "targetAmount", "currentAmount", "targetDate", "category", "priority"],
      },
      {
        key: "budgets",
        label: "Category Budgets",
        description: "Monthly expense caps, category limits, alerts & fiscal year budget lines",
        fields: ["id", "category", "monthlyLimit", "fy", "alertThreshold"],
      },
      {
        key: "subscriptions",
        label: "Active Subscriptions",
        description: "Digital SaaS subscriptions, streaming services, billing intervals & payment cards",
        fields: ["id", "serviceName", "cost", "billingCycle", "nextBillingDate", "paymentMethod", "category"],
      },
      {
        key: "documents",
        label: "Document Vault Meta",
        description: "Vault document records, physical locker tags, issue/expiry dates & certificate numbers",
        fields: ["id", "title", "category", "documentType", "issueDate", "expiryDate", "documentNumber", "tags", "storageLocation"],
      },
      {
        key: "nominees",
        label: "Will & Nominees",
        description: "Asset allocations, nominee percentages, relationships, contact & guardian data",
        fields: ["id", "name", "relation", "dob", "contact", "allocatedAssets", "guardianName"],
      },
      {
        key: "reminders",
        label: "Reminders & Alerts",
        description: "Custom calendar notifications, policy renewals, maturity alerts & due dates",
        fields: ["id", "title", "dueDate", "category", "priority", "recurrence", "isCompleted"],
      },
      {
        key: "lifeEvents",
        label: "Life Events & Milestones",
        description: "Career promotions, relocations, marriages, childbirths & estimated capital impact",
        fields: ["id", "eventTitle", "eventDate", "estimatedCost", "notes", "status"],
      },
      {
        key: "wishlists",
        label: "Watchlists",
        description: "Stock & mutual fund watchlists, themes & target allocations",
        fields: ["id", "name", "description", "targetAllocation"],
      },
      {
        key: "wishlistItems",
        label: "Watchlist Items",
        description: "Tracked tickers, target entry prices, buy notes & alerts",
        fields: ["id", "wishlistId", "symbol", "targetPrice", "notes"],
      },
      {
        key: "netWorthHistory",
        label: "Net Worth History",
        description: "Historical asset/liability timeline points & balance sheet evolution",
        fields: ["id", "date", "totalAssets", "totalLiabilities", "netWorth", "breakdown"],
      },
      {
        key: "creditScores",
        label: "Credit Score History",
        description: "CIBIL, Experian, CRIF & Equifax monthly score snapshots",
        fields: ["id", "score", "bureau", "date", "remarks"],
      },
    ],
  },
];

// Flat lookup of all 44 data items
export const ALL_DATA_SECTIONS = DOMAIN_CATEGORIES.flatMap((c) => c.items);

// ─── Quick Preset Bundles ───────────────────────────────────────────────────

export interface PresetBundle {
  id: string;
  label: string;
  description: string;
  tagline: string;
  icon: any;
  color: string;
  keys: string[];
}

export const EXPORT_PRESETS: PresetBundle[] = [
  {
    id: "all",
    label: "Complete Archive",
    description: "All 44 collections across banking, investments, real estate, taxes, liabilities & goals",
    tagline: "100% Full System Export",
    icon: Sparkles,
    color: THEME.accent,
    keys: ALL_DATA_SECTIONS.map((s) => s.key),
  },
  {
    id: "tax",
    label: "CA & Tax Prep Pack",
    description: "Income, Salary Slips, 26AS, TDS, Tax Payments, Capital Gains, Dividends & Sec 80 items",
    tagline: "Ready for Tax Filing / CA Audit",
    icon: FileSpreadsheet,
    color: "#8b5cf6",
    keys: [
      "income",
      "salarySlips",
      "form26as",
      "taxPayments",
      "dividends",
      "stockSells",
      "mfSells",
      "bankAccounts",
      "fixedDeposits",
      "ppf",
      "ppfLedger",
      "nps",
      "healthInsurance",
      "lic",
      "termPlans",
      "loansTaken",
    ],
  },
  {
    id: "wealth",
    label: "Portfolio & Wealth Snapshot",
    description: "Stocks, Mutual Funds, Demat, FDs, Gold, Bonds, EPF/PPF, Real Estate & Net Worth History",
    tagline: "Net Worth & Investment Review",
    icon: TrendingUp,
    color: "#10b981",
    keys: [
      "mutualFunds",
      "stocks",
      "demat",
      "fixedDeposits",
      "recurringDeposits",
      "bonds",
      "goldHoldings",
      "ppf",
      "ppfLedger",
      "nps",
      "epf",
      "realEstateProperties",
      "vehicles",
      "netWorthHistory",
    ],
  },
  {
    id: "banking",
    label: "Cashflow & Banking Ledger",
    description: "Bank accounts, statements, credit cards, bills, subscriptions & recurring expenses",
    tagline: "Monthly Cash Flow & Expenses",
    icon: PiggyBank,
    color: "#3b82f6",
    keys: [
      "bankAccounts",
      "transactions",
      "creditCards",
      "prepaidCards",
      "billPayments",
      "billPaymentHistory",
      "recurringExpenses",
      "subscriptions",
    ],
  },
  {
    id: "vault",
    label: "Insurance & Estate Vault",
    description: "LIC, Health/Term policies, documents, nominees, life events & reminders",
    tagline: "Family Protection & Estate Records",
    icon: Shield,
    color: "#06b6d4",
    keys: [
      "lic",
      "termPlans",
      "healthInsurance",
      "investmentPlans",
      "documents",
      "nominees",
      "reminders",
      "lifeEvents",
    ],
  },
];

// ─── Smart CSV Sanitization & Generation Utilities ──────────────────────────

const csvCell = (val: any): string => {
  if (val === null || val === undefined) return "";
  if (Array.isArray(val)) {
    // If array of primitives, join by semicolon
    if (val.length === 0) return "";
    if (typeof val[0] !== "object") return `"${val.join("; ").replace(/"/g, '""')}"`;
    // If array of objects, summarize count or concise description
    return `"${val.length} items (${JSON.stringify(val).replace(/"/g, '""')})"`;
  }
  if (typeof val === "object") {
    return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
  }
  const str = String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toCleanCSV = (data: any[]): string | null => {
  if (!Array.isArray(data) || data.length === 0) return null;
  const allKeys = new Set<string>();
  data.forEach((row) => {
    if (row && typeof row === "object") {
      Object.keys(row).forEach((k) => allKeys.add(k));
    }
  });
  const headers = [...allKeys].filter(
    (k) => k !== "id" && k !== "userId" && k !== "user_id" && k !== "_id"
  );
  if (headers.length === 0) return null;
  const rows = data.map((row) => headers.map((h) => csvCell(row?.[h])).join(","));
  return [headers.join(","), ...rows].join("\r\n");
};

const triggerDownload = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Main Component ─────────────────────────────────────────────────────────

export const DataExportTab: React.FC<{
  state: any;
  exportJSON?: () => void;
  onRestoreBackup?: (e: any) => void;
  showToast?: (msg: string, type?: string) => void;
  lastBackupTs?: string | number | null;
  isCloudSynced?: boolean;
}> = ({
  state = {},
  exportJSON,
  onRestoreBackup,
  showToast,
  lastBackupTs,
  isCloudSynced = false,
}) => {
  // Navigation View State: 'export' | 'restore' | 'schema' | 'security'
  const [activeTab, setActiveTab] = useState<"export" | "restore" | "schema" | "security">("export");

  // Selection, Preset & Search State
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    () => new Set(ALL_DATA_SECTIONS.map((s) => s.key))
  );
  const [activePresetId, setActivePresetId] = useState<string>("all");
  const [exportFormat, setExportFormat] = useState<"json-full" | "json-selective" | "csv">("json-full");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [inspectedObjectKey, setInspectedObjectKey] = useState<string | null>(null);

  // Restore Drag & Drop & Inspector State
  const [dragOver, setDragOver] = useState(false);
  const [parsedRestoreFile, setParsedRestoreFile] = useState<{
    fileName: string;
    fileSizeKb: number;
    rawJson: any;
    exportedAt?: string;
    recordCounts: { key: string; label: string; count: number; currentCount: number }[];
    totalRecords: number;
    profileName?: string;
    version?: string;
  } | null>(null);
  const [autoSafetyBackup, setAutoSafetyBackup] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backup Freshness & Metrics
  const daysSinceBackup =
    lastBackupTs != null
      ? Math.floor((Date.now() - new Date(lastBackupTs).getTime()) / DAY_MS)
      : null;

  const backupDateLabel =
    lastBackupTs != null
      ? new Date(lastBackupTs).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  const backupStatus = useMemo(() => {
    if (daysSinceBackup === null || !backupDateLabel) {
      return {
        label: "Never Backed Up",
        status: "critical",
        color: "var(--t-rust, #ef4444)",
        badgeBg: "color-mix(in srgb, var(--t-rust, #ef4444) 12%, transparent)",
        badgeBorder: "color-mix(in srgb, var(--t-rust, #ef4444) 25%, transparent)",
        description: "Your financial ledger is currently stored only in this browser session. Export a backup now to prevent data loss.",
      };
    }
    if (daysSinceBackup < 7) {
      return {
        label: `Fresh · ${daysSinceBackup === 0 ? "Today" : `${daysSinceBackup}d ago`}`,
        status: "optimal",
        color: "var(--t-sage, #10b981)",
        badgeBg: "color-mix(in srgb, var(--t-sage, #10b981) 12%, transparent)",
        badgeBorder: "color-mix(in srgb, var(--t-sage, #10b981) 25%, transparent)",
        description: `Last full backup saved on ${backupDateLabel}. Your ledger is up to date.`,
      };
    }
    if (daysSinceBackup <= 30) {
      return {
        label: `Due Soon · ${daysSinceBackup}d ago`,
        status: "warning",
        color: "var(--t-gold, #f59e0b)",
        badgeBg: "color-mix(in srgb, var(--t-gold, #f59e0b) 12%, transparent)",
        badgeBorder: "color-mix(in srgb, var(--t-gold, #f59e0b) 25%, transparent)",
        description: `Last backup was ${daysSinceBackup} days ago (${backupDateLabel}). We recommend a monthly refresh.`,
      };
    }
    return {
      label: `Stale · ${daysSinceBackup}d ago`,
      status: "critical",
      color: "var(--t-rust, #ef4444)",
      badgeBg: "color-mix(in srgb, var(--t-rust, #ef4444) 12%, transparent)",
      badgeBorder: "color-mix(in srgb, var(--t-rust, #ef4444) 25%, transparent)",
      description: `Over a month since last backup (${backupDateLabel}). Recent transactions and investments are unprotected.`,
    };
  }, [daysSinceBackup, backupDateLabel]);

  // Record Counts Calculation
  const categoryCounts = useMemo(() => {
    return DOMAIN_CATEGORIES.map((cat) => {
      const itemsWithCount = cat.items.map((item) => ({
        ...item,
        count: Array.isArray(state[item.key]) ? state[item.key].length : 0,
      }));
      const totalCatRecords = itemsWithCount.reduce((sum, it) => sum + it.count, 0);
      const activeCatItems = itemsWithCount.filter((it) => it.count > 0).length;
      return {
        ...cat,
        items: itemsWithCount,
        totalRecords: totalCatRecords,
        activeItemsCount: activeCatItems,
      };
    });
  }, [state]);

  const allCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    categoryCounts.forEach((cat) => {
      cat.items.forEach((it) => {
        map[it.key] = it.count;
      });
    });
    return map;
  }, [categoryCounts]);

  const totalRecordsCount = useMemo(() => {
    return Object.values(allCountMap).reduce((sum, c) => sum + c, 0);
  }, [allCountMap]);

  const selectedRecordsCount = useMemo(() => {
    return ALL_DATA_SECTIONS.filter((s) => selectedSections.has(s.key)).reduce(
      (sum, s) => sum + (allCountMap[s.key] || 0),
      0
    );
  }, [selectedSections, allCountMap]);

  const activeDomainsCount = useMemo(() => {
    return Object.values(allCountMap).filter((c) => c > 0).length;
  }, [allCountMap]);

  const estimatedStorageKb = useMemo(() => {
    try {
      const jsonStr = JSON.stringify(state);
      return Math.round((jsonStr.length * 2) / 1024);
    } catch {
      return 0;
    }
  }, [state]);

  // Derive current active preset details or custom state
  const activePresetDetails = useMemo(() => {
    if (activePresetId === "custom") {
      return {
        isCustom: true,
        label: "Custom Selection",
        description: "Custom subset of data collections manually selected",
        color: "var(--t-accent)",
        tagline: "Manual Selection",
        icon: SlidersHorizontal,
      };
    }
    const found = EXPORT_PRESETS.find((p) => p.id === activePresetId);
    if (found) {
      const matchesExactly =
        found.id === "all"
          ? selectedSections.size === ALL_DATA_SECTIONS.length
          : selectedSections.size === found.keys.length &&
            found.keys.every((k) => selectedSections.has(k));

      return {
        ...found,
        isCustom: !matchesExactly,
        label: matchesExactly ? found.label : `${found.label} (Modified)`,
      };
    }
    return null;
  }, [activePresetId, selectedSections]);

  // ─── Toggles & Preset Handlers ──────────────────────────────────────────

  const toggleSection = (key: string) => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setActivePresetId("custom");
  };

  const toggleCategory = (cat: DataCategory) => {
    const catKeys = cat.items.map((i) => i.key);
    const allSelected = catKeys.every((k) => selectedSections.has(k));
    setSelectedSections((prev) => {
      const next = new Set(prev);
      catKeys.forEach((k) => {
        if (allSelected) next.delete(k);
        else next.add(k);
      });
      return next;
    });
    setActivePresetId("custom");
  };

  const applyPreset = (presetId: string) => {
    const preset = EXPORT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    if (preset.id === "all") {
      setSelectedSections(new Set(ALL_DATA_SECTIONS.map((s) => s.key)));
    } else {
      setSelectedSections(new Set(preset.keys));
    }
    setActivePresetId(presetId);
    if (showToast) {
      showToast(`Selected preset: ${preset.label} (${preset.keys.length} collections)`, "info");
    }
  };

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // ─── Single Item Direct CSV Download ────────────────────────────────────

  const downloadSingleCSV = (key: string, label: string) => {
    const data = state[key];
    if (!Array.isArray(data) || data.length === 0) {
      if (showToast) showToast(`No records found for ${label}`, "warn");
      return;
    }
    const csvContent = toCleanCSV(data);
    if (!csvContent) {
      if (showToast) showToast(`Could not format CSV for ${label}`, "error");
      return;
    }
    const filename = `arthadrishti-${key}-${today()}.csv`;
    triggerDownload(csvContent, filename, "text/csv;charset=utf-8;");
    if (showToast) showToast(`Exported ${data.length} records to ${filename}`, "success");
  };

  // ─── Export Executors ───────────────────────────────────────────────────

  const handleExportFullJSON = useCallback(() => {
    if (exportJSON) {
      exportJSON();
      if (showToast) showToast("Complete system backup exported successfully.", "success");
      return;
    }
    const exportedAt = new Date().toISOString();
    const exportData = {
      ...state,
      settings: { ...(state.settings || {}), geminiApiKey: "" },
      _exportedAt: exportedAt,
      _version: "2.1",
      _app: "ArthaDrishti Personal Finance",
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    triggerDownload(jsonStr, `finance-backup-${today()}.json`, "application/json;charset=utf-8;");
    try {
      localStorage.setItem("pf_last_backup_ts", exportedAt);
    } catch {
      // Storage unavailable
    }
    if (showToast) showToast("Full backup (.json) saved to device.", "success");
  }, [exportJSON, state, showToast]);

  const handleExportSelectiveJSON = useCallback(() => {
    const exportData: Record<string, any> = {
      _exportedAt: new Date().toISOString(),
      _version: "2.1",
      _type: "selective-export",
      profile: state.profile,
    };
    let count = 0;
    ALL_DATA_SECTIONS.forEach((s) => {
      if (selectedSections.has(s.key) && state[s.key]) {
        exportData[s.key] = state[s.key];
        if (Array.isArray(state[s.key])) count += state[s.key].length;
      }
    });

    if (count === 0 && selectedSections.size === 0) {
      if (showToast) showToast("Please select at least one data section to export.", "warn");
      return;
    }

    const jsonStr = JSON.stringify(exportData, null, 2);
    const filename = `finance-selective-${selectedSections.size}-sections-${today()}.json`;
    triggerDownload(jsonStr, filename, "application/json;charset=utf-8;");
    if (showToast) showToast(`Exported ${selectedSections.size} sections (${count} records) as JSON.`, "success");
  }, [state, selectedSections, showToast]);

  const handleExportCSVPackage = useCallback(() => {
    const activeExports: { name: string; label: string; csv: string; count: number }[] = [];
    ALL_DATA_SECTIONS.forEach((s) => {
      if (!selectedSections.has(s.key) || !state[s.key] || !state[s.key].length) return;
      const csv = toCleanCSV(state[s.key]);
      if (csv) {
        activeExports.push({
          name: s.key,
          label: s.label,
          csv,
          count: state[s.key].length,
        });
      }
    });

    if (activeExports.length === 0) {
      if (showToast) showToast("No records found in selected sections to export.", "warn");
      return;
    }

    if (activeExports.length === 1) {
      const single = activeExports[0];
      triggerDownload(single.csv, `arthadrishti-${single.name}-${today()}.csv`, "text/csv;charset=utf-8;");
      if (showToast) showToast(`Exported ${single.label} (${single.count} rows) as CSV.`, "success");
      return;
    }

    let consolidated = `sep=,\r\n`;
    consolidated += `# ArthaDrishti Multi-Domain Export\r\n`;
    consolidated += `# Exported: ${new Date().toLocaleString()}\r\n`;
    consolidated += `# Total Sections: ${activeExports.length}\r\n\r\n`;

    activeExports.forEach((item, idx) => {
      consolidated += `\r\n# ------------------------------------------------------------\r\n`;
      consolidated += `# TABLE [${idx + 1}/${activeExports.length}]: ${item.label.toUpperCase()} (${item.count} records)\r\n`;
      consolidated += `# ------------------------------------------------------------\r\n`;
      consolidated += `${item.csv}\r\n`;
    });

    const filename = `finance-multi-table-export-${today()}.csv`;
    triggerDownload(consolidated, filename, "text/csv;charset=utf-8;");
    if (showToast) {
      showToast(`Exported ${activeExports.length} tables as structured spreadsheet package.`, "success");
    }
  }, [state, selectedSections, showToast]);

  const executeMainExport = () => {
    if (exportFormat === "json-full") {
      handleExportFullJSON();
    } else if (exportFormat === "json-selective") {
      handleExportSelectiveJSON();
    } else {
      handleExportCSVPackage();
    }
  };

  // ─── Restore File Parser & Safety Inspector ───────────────────────────────

  const inspectBackupFile = (file: File) => {
    if (!file) return;
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      if (showToast) showToast("Please choose a valid .json backup file", "error");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      if (showToast) showToast("Could not read backup file from disk", "error");
    };
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== "object") {
          if (showToast) showToast("Invalid JSON file format", "error");
          return;
        }

        const counts: { key: string; label: string; count: number; currentCount: number }[] = [];
        let total = 0;

        ALL_DATA_SECTIONS.forEach((s) => {
          const incomingCount = Array.isArray(parsed[s.key]) ? parsed[s.key].length : 0;
          const currCount = Array.isArray(state[s.key]) ? state[s.key].length : 0;
          if (incomingCount > 0 || currCount > 0) {
            counts.push({
              key: s.key,
              label: s.label,
              count: incomingCount,
              currentCount: currCount,
            });
            total += incomingCount;
          }
        });

        const profileName = parsed.profile?.name || parsed.profile?.userName || "Default User";
        const exportedAt = parsed._exportedAt || parsed._exportDate || "Unknown date";
        const version = parsed._version || "1.0";

        setParsedRestoreFile({
          fileName: file.name,
          fileSizeKb: Math.round(file.size / 1024),
          rawJson: parsed,
          exportedAt,
          recordCounts: counts,
          totalRecords: total,
          profileName,
          version,
        });

        if (showToast) {
          showToast(`Inspected backup: ${total} records found. Review details below.`, "info");
        }
      } catch (err: any) {
        if (showToast) showToast(`Backup parsing error: ${err.message}`, "error");
      }
    };
    reader.readAsText(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      inspectBackupFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      inspectBackupFile(e.target.files[0]);
    }
  };

  const applyRestoration = () => {
    if (!parsedRestoreFile) return;

    if (autoSafetyBackup) {
      handleExportFullJSON();
    }

    setIsRestoring(true);

    try {
      if (onRestoreBackup) {
        const syntheticEvent = {
          target: {
            files: [
              new File(
                [JSON.stringify(parsedRestoreFile.rawJson)],
                parsedRestoreFile.fileName,
                { type: "application/json" }
              ),
            ],
            value: "",
          },
        };
        onRestoreBackup(syntheticEvent);
      }
      if (showToast) {
        showToast("Database restoration initialized successfully.", "success");
      }
    } catch (err: any) {
      if (showToast) showToast(`Restoration failed: ${err.message}`, "error");
    } finally {
      setIsRestoring(false);
    }
  };

  // ─── Filtered Categories based on search query & category filter ─────────

  const filteredCategories = useMemo(() => {
    let cats = categoryCounts;
    if (activeCategoryFilter !== "all") {
      cats = cats.filter((c) => c.id === activeCategoryFilter);
    }
    if (!searchQuery.trim()) return cats;

    const q = searchQuery.toLowerCase().trim();
    return cats
      .map((cat) => {
        const matchesCat = cat.name.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q);
        const filteredItems = cat.items.filter(
          (it) =>
            matchesCat ||
            it.label.toLowerCase().includes(q) ||
            (it.description && it.description.toLowerCase().includes(q)) ||
            it.key.toLowerCase().includes(q) ||
            (it.subObjects && it.subObjects.some((so) => so.name.toLowerCase().includes(q) || so.description.toLowerCase().includes(q))) ||
            (it.fields && it.fields.some((f) => f.toLowerCase().includes(q)))
        );
        return {
          ...cat,
          items: filteredItems,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [categoryCounts, searchQuery, activeCategoryFilter]);

  // Selected object for Schema Inspector
  const currentInspectedItem = useMemo(() => {
    if (!inspectedObjectKey) return null;
    return ALL_DATA_SECTIONS.find((s) => s.key === inspectedObjectKey) || null;
  }, [inspectedObjectKey]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Styles for interactive micro-animations & layout */}
      <style>{`
        .export-tab-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .export-tab-btn:hover {
          transform: translateY(-1px);
        }
        .domain-row-item {
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
        }
        .domain-row-item:hover {
          border-color: color-mix(in srgb, var(--t-accent) 45%, var(--t-line, rgba(255,255,255,0.1))) !important;
          transform: translateY(-1px);
        }
        .preset-badge-btn {
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .preset-badge-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(0,0,0,0.09);
        }
        .preset-badge-btn.is-active {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px color-mix(in srgb, var(--preset-col, var(--t-accent)) 30%, transparent);
        }
        .dropzone-pulse {
          animation: dropPulse 2s infinite ease-in-out;
        }
        @keyframes dropPulse {
          0%, 100% { border-color: color-mix(in srgb, var(--t-accent) 40%, transparent); }
          50% { border-color: var(--t-accent); }
        }
        .schema-card-row {
          transition: all 0.15s ease;
        }
        .schema-card-row:hover {
          background: color-mix(in srgb, var(--t-accent) 5%, var(--surface-0)) !important;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <SectionTitle sub="Enterprise-grade local backup snapshots, structured Excel exports, and complete 44-collection schema architecture">
            Data Export &amp; Backup Hub
          </SectionTitle>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Button
            variant="primary"
            size="md"
            onClick={handleExportFullJSON}
            icon={<Download size={16} />}
            style={{ fontWeight: 700 }}
          >
            1-Click Full Backup
          </Button>
        </div>
      </div>

      {/* ─── Hero Backup Health Center ───────────────────────────────────── */}
      <Card
        variant="hero"
        style={{
          padding: "20px 24px",
          background: "linear-gradient(135deg, color-mix(in srgb, var(--t-accent) 8%, var(--t-card)) 0%, var(--t-card) 100%)",
          border: "1px solid color-mix(in srgb, var(--t-accent) 25%, var(--t-line, rgba(255,255,255,0.08)))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 14,
                background: backupStatus.badgeBg,
                border: `1.5px solid ${backupStatus.badgeBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: backupStatus.color,
                flexShrink: 0,
              }}
            >
              <Database size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: THEME.text }}>
                  Backup Health Status
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "3px 9px",
                    borderRadius: 20,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: backupStatus.color,
                    background: backupStatus.badgeBg,
                    border: `1px solid ${backupStatus.badgeBorder}`,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: backupStatus.color,
                      display: "inline-block",
                    }}
                  />
                  {backupStatus.label}
                </span>
                {isCloudSynced ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--t-sage, #10b981)",
                      background: "color-mix(in srgb, var(--t-sage, #10b981) 12%, transparent)",
                    }}
                  >
                    <CloudCheck size={13} /> Cloud Synced
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--t-muted, #94a3b8)",
                      background: "color-mix(in srgb, var(--t-muted, #94a3b8) 12%, transparent)",
                    }}
                  >
                    <CloudOff size={13} /> Local Only
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: THEME.textSecondary, maxWidth: 620 }}>
                {backupStatus.description}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab("restore")}
              icon={<Upload size={14} />}
            >
              Restore Snapshot
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab("schema")}
              icon={<Code size={14} />}
            >
              Schema Explorer
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab("security")}
              icon={<Shield size={14} />}
            >
              Privacy &amp; Audit
            </Button>
          </div>
        </div>
      </Card>

      {/* ─── Metric Stat Cards ───────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Total Database Records"
          value={totalRecordsCount.toLocaleString("en-IN")}
          numericValue={totalRecordsCount}
          formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
          icon={<Database />}
          color={THEME.accent}
          sub={`Across ${activeDomainsCount} populated categories`}
        />
        <StatCard
          label="Selected for Export"
          value={selectedRecordsCount.toLocaleString("en-IN")}
          numericValue={selectedRecordsCount}
          formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
          icon={<CheckCircle />}
          color="var(--t-sage, #10b981)"
          sub={`${selectedSections.size} of ${ALL_DATA_SECTIONS.length} collections`}
        />
        <StatCard
          label="Schema Collections"
          value={`${ALL_DATA_SECTIONS.length} Primary`}
          icon={<Layers />}
          color="#8b5cf6"
          sub="6 Core Domains + Sub-Objects"
        />
        <StatCard
          label="Estimated Data Footprint"
          value={`${estimatedStorageKb} KB`}
          icon={<FileCode />}
          color="#06b6d4"
          sub="Client-side JSON buffer"
        />
      </div>

      {/* ─── Main View Switcher Tabs ─────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: 4,
          background: "var(--surface-1, rgba(255,255,255,0.04))",
          borderRadius: 12,
          border: "1px solid var(--t-line, rgba(255,255,255,0.08))",
          width: "fit-content",
          flexWrap: "wrap",
        }}
      >
        {[
          { id: "export", label: "Export Hub & Spreadsheets", icon: Download },
          { id: "schema", label: "Object & Sub-Object Schemas", icon: Code },
          { id: "restore", label: "Restore & Disaster Recovery", icon: Upload },
          { id: "security", label: "Privacy & Storage Insights", icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="export-tab-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#fff" : THEME.textSecondary,
                background: isActive ? "var(--t-accent)" : "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VIEW 1: EXPORT HUB                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "export" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Format Selector & Presets Banner */}
          <Card style={{ padding: 22 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Top Row: Format Selector & CTA */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: THEME.textSecondary,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    1. Select Export Format
                  </label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      {
                        id: "json-full",
                        label: "Full Backup (.json)",
                        sub: "Disaster recovery archive",
                        icon: Database,
                      },
                      {
                        id: "json-selective",
                        label: "Selective JSON (.json)",
                        sub: "Chosen datasets only",
                        icon: FileText,
                      },
                      {
                        id: "csv",
                        label: "Spreadsheets (.csv)",
                        sub: "Excel & Sheets ready",
                        icon: FileSpreadsheet,
                      },
                    ].map((f) => {
                      const isSelected = exportFormat === f.id;
                      const Icon = f.icon;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setExportFormat(f.id as any)}
                          aria-pressed={isSelected}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 16px",
                            borderRadius: 10,
                            cursor: "pointer",
                            textAlign: "left",
                            border: `1.5px solid ${
                              isSelected ? "var(--t-accent)" : "var(--t-line, rgba(255,255,255,0.1))"
                            }`,
                            background: isSelected
                              ? "color-mix(in srgb, var(--t-accent) 12%, var(--t-card))"
                              : "var(--surface-0, var(--t-card))",
                            color: THEME.text,
                            transition: "all 0.15s ease",
                          }}
                        >
                          <Icon
                            size={18}
                            color={isSelected ? "var(--t-accent)" : THEME.textSecondary}
                          />
                          <div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: isSelected ? 700 : 600,
                                color: isSelected ? "var(--t-accent)" : THEME.text,
                              }}
                            >
                              {f.label}
                            </div>
                            <div style={{ fontSize: 11, color: THEME.textSecondary }}>{f.sub}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={executeMainExport}
                  icon={<Download size={16} />}
                  style={{ fontWeight: 700, padding: "12px 22px" }}
                >
                  {exportFormat === "json-full"
                    ? `Export Full Snapshot (${totalRecordsCount} Records)`
                    : exportFormat === "json-selective"
                    ? `Export Selected JSON (${selectedRecordsCount} Records)`
                    : `Export Selected CSVs (${selectedSections.size} Tables)`}
                </Button>
              </div>

              {/* Format Explanatory Note */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "var(--surface-1, rgba(255,255,255,0.03))",
                  border: "1px solid var(--t-line, rgba(255,255,255,0.07))",
                  fontSize: 12.5,
                  color: THEME.textSecondary,
                }}
              >
                <Info size={15} color={THEME.accent} style={{ flexShrink: 0 }} />
                <span>
                  {exportFormat === "json-full" && (
                    <>
                      <strong>Full Backup Snapshot:</strong> Captures complete state (all profile data,
                      ledgers, sub-objects, settings, and histories) with sanitization of private API keys. Ideal for
                      periodic offline safety and 100% data restoration.
                    </>
                  )}
                  {exportFormat === "json-selective" && (
                    <>
                      <strong>Selective JSON Export:</strong> Exports only the checked domains below as a
                      clean, lightweight structured JSON payload with metadata.
                    </>
                  )}
                  {exportFormat === "csv" && (
                    <>
                      <strong>Domain Spreadsheets (.csv):</strong> Generates clean, RFC-4180 compliant CSV
                      tables with standard headers and flattened sub-objects for direct import into Microsoft Excel, Google Sheets, or Apple Numbers.
                    </>
                  )}
                </span>
              </div>

              {/* ─── Quick Presets Bar with Prominent Active Selection States ─── */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: THEME.textSecondary,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      display: "block",
                    }}
                  >
                    2. Quick Domain Presets
                  </label>
                  <span style={{ fontSize: 11.5, color: THEME.textSecondary }}>
                    Click any bundle to auto-select relevant collections
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {EXPORT_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    const isSelected = activePresetId === preset.id;
                    const presetColor = preset.color;

                    return (
                      <button
                        key={preset.id}
                        onClick={() => applyPreset(preset.id)}
                        className={`preset-badge-btn ${isSelected ? "is-active" : ""}`}
                        style={
                          {
                            "--preset-col": presetColor,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 14px",
                            borderRadius: 10,
                            fontSize: 12.5,
                            fontWeight: isSelected ? 700 : 600,
                            cursor: "pointer",
                            background: isSelected
                              ? `color-mix(in srgb, ${presetColor} 14%, var(--t-card))`
                              : "var(--surface-0, var(--t-card))",
                            border: `2px solid ${
                              isSelected
                                ? presetColor
                                : "var(--t-line, rgba(255,255,255,0.1))"
                            }`,
                            color: isSelected ? THEME.text : THEME.textSecondary,
                            position: "relative",
                          } as React.CSSProperties
                        }
                      >
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            background: isSelected
                              ? presetColor
                              : `color-mix(in srgb, ${presetColor} 16%, transparent)`,
                            color: isSelected ? "#fff" : presetColor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={13} />
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: isSelected ? THEME.text : THEME.text }}>
                              {preset.label}
                            </span>
                            {isSelected && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 2,
                                  fontSize: 10,
                                  fontWeight: 800,
                                  textTransform: "uppercase",
                                  padding: "1px 6px",
                                  borderRadius: 10,
                                  background: presetColor,
                                  color: "#fff",
                                  lineHeight: "1.4",
                                }}
                              >
                                <Check size={10} strokeWidth={3} /> Selected
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Active Preset Highlights Banner */}
                {activePresetDetails && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "12px 16px",
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${activePresetDetails.color || "var(--t-accent)"} 10%, var(--surface-1))`,
                      border: `1px solid color-mix(in srgb, ${activePresetDetails.color || "var(--t-accent)"} 30%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          background: activePresetDetails.color || "var(--t-accent)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {activePresetDetails.icon ? (
                          <activePresetDetails.icon size={15} />
                        ) : (
                          <Sparkles size={15} />
                        )}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text }}>
                            Active Preset: {activePresetDetails.label}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: activePresetDetails.color || "var(--t-accent)",
                              background: "var(--surface-0)",
                              padding: "2px 8px",
                              borderRadius: 6,
                              border: `1px solid color-mix(in srgb, ${activePresetDetails.color || "var(--t-accent)"} 30%, transparent)`,
                            }}
                          >
                            {selectedSections.size} Collections Selected ({selectedRecordsCount} Records)
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 2 }}>
                          {activePresetDetails.description}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        onClick={() => applyPreset("all")}
                        style={{
                          background: "var(--surface-0)",
                          border: "1px solid var(--t-line)",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          color: THEME.text,
                        }}
                      >
                        Reset to Complete Archive
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Search, Filter Toolbar & Category Bulk Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {/* Search Filter */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 10,
                background: "var(--surface-0, var(--t-card))",
                border: "1px solid var(--t-line, rgba(255,255,255,0.1))",
                minWidth: 260,
                flex: 1,
                maxWidth: 400,
              }}
            >
              <Search size={15} color={THEME.textSecondary} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 44 collections (e.g. variants, tax, demat, ppf)..."
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 13,
                  color: THEME.text,
                  width: "100%",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: THEME.textSecondary,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => setActiveCategoryFilter("all")}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: activeCategoryFilter === "all" ? 700 : 500,
                  background: activeCategoryFilter === "all" ? "var(--t-accent)" : "var(--surface-1)",
                  color: activeCategoryFilter === "all" ? "#fff" : THEME.textSecondary,
                  border: "1px solid var(--t-line)",
                  cursor: "pointer",
                }}
              >
                All ({ALL_DATA_SECTIONS.length})
              </button>
              {DOMAIN_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryFilter(cat.id)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: activeCategoryFilter === cat.id ? 700 : 500,
                    background: activeCategoryFilter === cat.id ? `color-mix(in srgb, ${cat.color} 25%, var(--surface-1))` : "var(--surface-1)",
                    color: activeCategoryFilter === cat.id ? cat.color : THEME.textSecondary,
                    border: `1px solid ${activeCategoryFilter === cat.id ? cat.color : "var(--t-line)"}`,
                    cursor: "pointer",
                  }}
                >
                  {cat.name.split(",")[0]} ({cat.items.length})
                </button>
              ))}
            </div>

            {/* Bulk Selection Actions */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setSelectedSections(new Set(ALL_DATA_SECTIONS.map((s) => s.key)));
                  setActivePresetId("all");
                }}
                style={{
                  background: "var(--surface-0)",
                  border: "1px solid var(--t-line)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: THEME.text,
                }}
              >
                Select All ({ALL_DATA_SECTIONS.length})
              </button>
              <button
                onClick={() => {
                  setSelectedSections(new Set());
                  setActivePresetId("custom");
                }}
                style={{
                  background: "var(--surface-0)",
                  border: "1px solid var(--t-line)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: THEME.textSecondary,
                }}
              >
                Deselect All
              </button>
              <button
                onClick={() => {
                  setSelectedSections(
                    new Set(
                      ALL_DATA_SECTIONS.filter((s) => (allCountMap[s.key] || 0) > 0).map(
                        (s) => s.key
                      )
                    )
                  );
                  setActivePresetId("custom");
                }}
                style={{
                  background: "var(--surface-0)",
                  border: "1px solid var(--t-line)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: THEME.accent,
                }}
              >
                Only Non-Empty ({activeDomainsCount})
              </button>
            </div>
          </div>

          {/* ─── Domain Categories Accordions & Lists ───────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {filteredCategories.map((cat) => {
              const Icon = cat.icon;
              const catKeys = cat.items.map((i) => i.key);
              const selectedInCat = catKeys.filter((k) => selectedSections.has(k)).length;
              const isAllSelected = selectedInCat === catKeys.length;
              const isCollapsed = collapsedCategories[cat.id];

              return (
                <Card
                  key={cat.id}
                  style={{
                    padding: 0,
                    overflow: "hidden",
                    border: "1px solid var(--t-line, rgba(255,255,255,0.08))",
                  }}
                >
                  {/* Category Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 20px",
                      background: "var(--surface-1, rgba(255,255,255,0.02))",
                      borderBottom: isCollapsed
                        ? "none"
                        : "1px solid var(--t-line, rgba(255,255,255,0.06))",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => toggleCategoryCollapse(cat.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 9,
                          background: `color-mix(in srgb, ${cat.color} 15%, transparent)`,
                          color: cat.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={19} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14.5, fontWeight: 700, color: THEME.text }}>
                            {cat.name}
                          </span>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 12,
                              background: `color-mix(in srgb, ${cat.color} 15%, transparent)`,
                              color: cat.color,
                            }}
                          >
                            {cat.totalRecords} Records
                          </span>
                          {selectedInCat > 0 && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: 12,
                                background: "color-mix(in srgb, var(--t-accent) 15%, transparent)",
                                color: "var(--t-accent)",
                              }}
                            >
                              {selectedInCat}/{cat.items.length} selected
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 2 }}>
                          {cat.description}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => toggleCategory(cat)}
                        style={{
                          background: "var(--surface-0)",
                          border: "1px solid var(--t-line)",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          color: isAllSelected ? "var(--t-accent)" : THEME.textSecondary,
                        }}
                      >
                        {isAllSelected ? "Deselect Group" : `Select All (${cat.items.length})`}
                      </button>
                      <div style={{ color: THEME.textSecondary, cursor: "pointer", padding: 4 }} onClick={() => toggleCategoryCollapse(cat.id)}>
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Category Items Grid */}
                  {!isCollapsed && (
                    <div
                      style={{
                        padding: 16,
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                        gap: 10,
                      }}
                    >
                      {cat.items.map((item) => {
                        const count = allCountMap[item.key] || 0;
                        const isChecked = selectedSections.has(item.key);

                        return (
                          <div
                            key={item.key}
                            className="domain-row-item"
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              padding: "12px 14px",
                              borderRadius: 10,
                              background: isChecked
                                ? "color-mix(in srgb, var(--t-accent) 7%, var(--t-card))"
                                : "var(--surface-0, var(--t-card))",
                              border: `1px solid ${
                                isChecked
                                  ? "color-mix(in srgb, var(--t-accent) 35%, transparent)"
                                  : "var(--t-line, rgba(255,255,255,0.06))"
                              }`,
                              gap: 8,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 10,
                                  cursor: "pointer",
                                  flex: 1,
                                  marginRight: 8,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSection(item.key)}
                                  style={{
                                    accentColor: "var(--t-accent)",
                                    width: 16,
                                    height: 16,
                                    marginTop: 2,
                                    cursor: "pointer",
                                  }}
                                />
                                <div>
                                  <div
                                    style={{
                                      fontSize: 13,
                                      fontWeight: isChecked ? 700 : 600,
                                      color: THEME.text,
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    {item.label}
                                  </div>
                                  {item.description && (
                                    <div
                                      style={{
                                        fontSize: 11,
                                        color: THEME.textSecondary,
                                        marginTop: 2,
                                      }}
                                    >
                                      {item.description}
                                    </div>
                                  )}
                                </div>
                              </label>

                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                <span
                                  style={{
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    padding: "2px 7px",
                                    borderRadius: 6,
                                    background:
                                      count > 0
                                        ? "color-mix(in srgb, var(--t-accent) 15%, transparent)"
                                        : "var(--surface-1)",
                                    color: count > 0 ? "var(--t-accent)" : THEME.textSecondary,
                                  }}
                                >
                                  {count}
                                </span>

                                {/* Single CSV Download Action */}
                                <button
                                  title={`Download clean CSV for ${item.label}`}
                                  disabled={count === 0}
                                  onClick={() => downloadSingleCSV(item.key, item.label)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: count > 0 ? THEME.textSecondary : "transparent",
                                    cursor: count > 0 ? "pointer" : "default",
                                    padding: 4,
                                    borderRadius: 4,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: count > 0 ? 0.8 : 0.2,
                                  }}
                                  onMouseEnter={(e) => {
                                    if (count > 0) e.currentTarget.style.color = "var(--t-accent)";
                                  }}
                                  onMouseLeave={(e) => {
                                    if (count > 0) e.currentTarget.style.color = THEME.textSecondary;
                                  }}
                                >
                                  <Download size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Sub-Objects and Field Tags */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 6, borderTop: "1px dashed var(--t-line)", marginTop: 2 }}>
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {item.subObjects?.map((so) => (
                                  <span
                                    key={so.key}
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: "1px 5px",
                                      borderRadius: 4,
                                      background: `color-mix(in srgb, ${cat.color} 15%, transparent)`,
                                      color: cat.color,
                                    }}
                                  >
                                    +{so.name}
                                  </span>
                                ))}
                                {item.fields && (
                                  <span style={{ fontSize: 10.5, color: THEME.textSecondary }}>
                                    {item.fields.length} schema fields
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  setInspectedObjectKey(item.key);
                                  setActiveTab("schema");
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: "var(--t-accent)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 2,
                                  padding: 0,
                                }}
                              >
                                View Schema <ArrowRight size={11} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VIEW 2: OBJECT & SUB-OBJECT SCHEMAS EXPLORER                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "schema" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Code size={20} color={THEME.accent} />
                  <span style={{ fontSize: 16, fontWeight: 800, color: THEME.text }}>
                    Financial Domain Object &amp; Sub-Object Architecture
                  </span>
                </div>
                <div style={{ fontSize: 13, color: THEME.textSecondary }}>
                  Explore comprehensive schema definitions, sub-objects, child relationships, and fields across all 44 data collections.
                </div>
              </div>

              {inspectedObjectKey && (
                <button
                  onClick={() => setInspectedObjectKey(null)}
                  style={{
                    background: "var(--surface-1)",
                    border: "1px solid var(--t-line)",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: THEME.text,
                  }}
                >
                  Show All Collections
                </button>
              )}
            </div>
          </Card>

          {/* Inspected Object Detail Focus Modal/Banner */}
          {currentInspectedItem && (
            <Card style={{ padding: 22, border: "1.5px solid var(--t-accent)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: THEME.text }}>
                      {currentInspectedItem.label}
                    </span>
                    <code style={{ fontSize: 12, padding: "2px 6px", borderRadius: 4, background: "var(--surface-1)", color: "var(--t-accent)" }}>
                      state.{currentInspectedItem.key}
                    </code>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "var(--surface-1)", color: THEME.text }}>
                      {allCountMap[currentInspectedItem.key] || 0} active records
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: THEME.textSecondary, marginTop: 4 }}>
                    {currentInspectedItem.description}
                  </div>
                </div>
                <button
                  onClick={() => setInspectedObjectKey(null)}
                  style={{ background: "none", border: "none", color: THEME.textSecondary, cursor: "pointer", padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Primary Fields */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: THEME.textSecondary, textTransform: "uppercase", marginBottom: 8 }}>
                  Core Schema Fields ({currentInspectedItem.fields?.length || 0})
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {currentInspectedItem.fields?.map((f) => (
                    <span
                      key={f}
                      style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        borderRadius: 6,
                        background: "var(--surface-1)",
                        border: "1px solid var(--t-line)",
                        fontFamily: "monospace",
                        color: THEME.text,
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sub-Objects if any */}
              {currentInspectedItem.subObjects && currentInspectedItem.subObjects.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--t-line)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t-accent)", textTransform: "uppercase", marginBottom: 10 }}>
                    Nested Child Sub-Objects ({currentInspectedItem.subObjects.length})
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                    {currentInspectedItem.subObjects.map((so) => (
                      <div
                        key={so.key}
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          background: "var(--surface-1)",
                          border: "1px solid var(--t-line)",
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text, marginBottom: 2 }}>
                          {so.name} (<code style={{ color: "var(--t-accent)" }}>.{so.key}[]</code>)
                        </div>
                        <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>
                          {so.description}
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {so.fields.map((sf) => (
                            <span
                              key={sf}
                              style={{
                                fontSize: 11,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: "var(--surface-0)",
                                border: "1px solid var(--t-line)",
                                fontFamily: "monospace",
                                color: THEME.textSecondary,
                              }}
                            >
                              {sf}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Live State JSON Peek */}
              {Array.isArray(state[currentInspectedItem.key]) && state[currentInspectedItem.key].length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--t-line)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: THEME.textSecondary, textTransform: "uppercase", marginBottom: 8 }}>
                    Sample Record Live Preview
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: 12,
                      borderRadius: 8,
                      background: "var(--surface-0)",
                      border: "1px solid var(--t-line)",
                      fontSize: 12,
                      fontFamily: "monospace",
                      color: THEME.text,
                      maxHeight: 200,
                      overflowY: "auto",
                    }}
                  >
                    {JSON.stringify(state[currentInspectedItem.key][0], null, 2)}
                  </pre>
                </div>
              )}
            </Card>
          )}

          {/* All 6 Domain Categories & 44 Collections Catalog */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {DOMAIN_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Card key={cat.id} style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: `color-mix(in srgb, ${cat.color} 15%, transparent)`,
                        color: cat.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: THEME.text }}>
                        {cat.name} ({cat.items.length} collections)
                      </div>
                      <div style={{ fontSize: 12, color: THEME.textSecondary }}>{cat.description}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 10 }}>
                    {cat.items.map((item) => {
                      const count = allCountMap[item.key] || 0;
                      return (
                        <div
                          key={item.key}
                          className="schema-card-row"
                          onClick={() => setInspectedObjectKey(item.key)}
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            background: "var(--surface-0)",
                            border: "1px solid var(--t-line)",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text }}>
                                {item.label}
                              </div>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  background: count > 0 ? "color-mix(in srgb, var(--t-accent) 15%, transparent)" : "var(--surface-1)",
                                  color: count > 0 ? "var(--t-accent)" : THEME.textSecondary,
                                }}
                              >
                                {count} records
                              </span>
                            </div>
                            <div style={{ fontSize: 11.5, color: THEME.textSecondary, marginTop: 4 }}>
                              {item.description}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 6, borderTop: "1px dashed var(--t-line)" }}>
                            <code style={{ fontSize: 11, color: "var(--t-accent)" }}>state.{item.key}</code>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: THEME.textSecondary }}>
                              {item.subObjects ? `+${item.subObjects.length} sub-objects` : `${item.fields?.length || 0} fields`}
                              <ArrowRight size={12} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VIEW 3: RESTORE & DISASTER RECOVERY                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "restore" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Safety Warning Banner */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: 12,
              background: "color-mix(in srgb, var(--t-gold, #f59e0b) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--t-gold, #f59e0b) 30%, transparent)",
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
            }}
          >
            <AlertTriangle
              size={20}
              color="var(--t-gold, #f59e0b)"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t-gold, #f59e0b)", marginBottom: 4 }}>
                Safe Restoration &amp; Pre-Commit Verification
              </div>
              <div style={{ fontSize: 13, color: THEME.textSecondary, lineHeight: 1.5 }}>
                Restoring a snapshot will replace ledger records on this device. Our safety inspector
                previews all data in the file before committing, and can automatically generate a
                backup of your current data before applying changes.
              </div>
            </div>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            className={dragOver ? "dropzone-pulse" : ""}
            style={{
              padding: "36px 24px",
              borderRadius: 14,
              border: `2px dashed ${
                dragOver
                  ? "var(--t-accent)"
                  : "var(--t-line, rgba(255,255,255,0.15))"
              }`,
              background: dragOver
                ? "color-mix(in srgb, var(--t-accent) 8%, var(--t-card))"
                : "var(--surface-0, var(--t-card))",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileInputChange}
              style={{ display: "none" }}
            />
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "color-mix(in srgb, var(--t-accent) 15%, transparent)",
                color: "var(--t-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Upload size={26} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text, marginBottom: 6 }}>
              Drop your `.json` backup file here, or click to browse
            </div>
            <div style={{ fontSize: 13, color: THEME.textSecondary, maxWidth: 460, margin: "0 auto" }}>
              Supports all ArthaDrishti / Personal Finance JSON exports. The file is validated locally
              in your browser without uploading to external servers.
            </div>
          </div>

          {/* Backup File Pre-Restore Inspector Card */}
          {parsedRestoreFile && (
            <Card style={{ padding: 24, border: "1.5px solid var(--t-accent)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <FileCheck size={20} color="var(--t-sage, #10b981)" />
                    <span style={{ fontSize: 16, fontWeight: 800, color: THEME.text }}>
                      Backup File Validated: {parsedRestoreFile.fileName}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: THEME.textSecondary }}>
                    Profile: <strong>{parsedRestoreFile.profileName}</strong> · Exported:{" "}
                    <strong>{parsedRestoreFile.exportedAt}</strong> · Size:{" "}
                    <strong>{parsedRestoreFile.fileSizeKb} KB</strong> · Version:{" "}
                    <strong>{parsedRestoreFile.version}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    onClick={() => setParsedRestoreFile(null)}
                    style={{
                      background: "none",
                      border: "none",
                      color: THEME.textSecondary,
                      cursor: "pointer",
                      fontSize: 13,
                      padding: "6px 10px",
                    }}
                  >
                    Clear File
                  </button>
                </div>
              </div>

              {/* Records Breakdown Diff (Incoming vs Current) */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: THEME.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 10,
                  }}
                >
                  Detected Collections in Snapshot ({parsedRestoreFile.totalRecords} total records)
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: 8,
                    maxHeight: 240,
                    overflowY: "auto",
                    padding: 4,
                  }}
                >
                  {parsedRestoreFile.recordCounts.map((rec) => (
                    <div
                      key={rec.key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "var(--surface-1)",
                        border: "1px solid var(--t-line)",
                        fontSize: 12.5,
                      }}
                    >
                      <span style={{ color: THEME.text }}>{rec.label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          title="Incoming backup count"
                          style={{
                            fontWeight: 700,
                            color: "var(--t-accent)",
                            background: "color-mix(in srgb, var(--t-accent) 15%, transparent)",
                            padding: "1px 6px",
                            borderRadius: 4,
                          }}
                        >
                          {rec.count}
                        </span>
                        <span style={{ fontSize: 11, color: THEME.textSecondary }}>
                          (curr: {rec.currentCount})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety Auto-Backup Toggle & Action Button */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                  paddingTop: 16,
                  borderTop: "1px solid var(--t-line)",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    fontSize: 13,
                    color: THEME.text,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={autoSafetyBackup}
                    onChange={(e) => setAutoSafetyBackup(e.target.checked)}
                    style={{ accentColor: "var(--t-accent)", width: 16, height: 16 }}
                  />
                  <span>
                    Auto-download safety backup of active data before restoring
                  </span>
                </label>

                <Button
                  variant="primary"
                  size="md"
                  onClick={applyRestoration}
                  loading={isRestoring}
                  icon={<RefreshCw size={15} />}
                  style={{ fontWeight: 700 }}
                >
                  Confirm &amp; Restore Snapshot
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VIEW 4: SECURITY, PRIVACY & STORAGE INSIGHTS                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "security" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            {/* Privacy Architecture Card */}
            <Card style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <Lock size={20} color="var(--t-sage, #10b981)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: THEME.text }}>
                  100% Client-Side Privacy Guarantee
                </h3>
              </div>
              <p style={{ fontSize: 13, color: THEME.textSecondary, lineHeight: 1.6, margin: "0 0 16px" }}>
                ArthaDrishti is designed on offline-first, client-side encryption principles.
                When you click export, your financial data is structured directly inside your browser’s
                local JavaScript sandbox and written straight to your personal disk.
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  fontSize: 12.5,
                  color: THEME.text,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle size={15} color="var(--t-sage, #10b981)" />
                  <span>Zero telemetry or third-party tracking</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle size={15} color="var(--t-sage, #10b981)" />
                  <span>AI API keys and secrets are automatically scrubbed from exports</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle size={15} color="var(--t-sage, #10b981)" />
                  <span>Standard open formats (JSON &amp; CSV) with no proprietary lock-in</span>
                </div>
              </div>
            </Card>

            {/* Recommended Routine Card */}
            <Card style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <Shield size={20} color={THEME.accent} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: THEME.text }}>
                  Recommended Backup Protocol
                </h3>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  fontSize: 13,
                  color: THEME.textSecondary,
                  lineHeight: 1.5,
                }}
              >
                <div>
                  <strong style={{ color: THEME.text }}>1. Weekly JSON Snapshot:</strong>
                  <div>Store in an encrypted folder (e.g. Google Drive, ProtonDrive, or iCloud).</div>
                </div>
                <div>
                  <strong style={{ color: THEME.text }}>2. Monthly CSV for Financial Advisor / CA:</strong>
                  <div>Use our <em>CA &amp; Tax Prep Pack</em> preset to share ready-to-file sheets.</div>
                </div>
                <div>
                  <strong style={{ color: THEME.text }}>3. Before Clearing Browser Cache:</strong>
                  <div>Always perform a 1-click full backup before wiping browser data.</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Raw JSON Developer Export Quick Action */}
          <Card style={{ padding: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text, marginBottom: 2 }}>
                  Copy Sanitized JSON to Clipboard
                </div>
                <div style={{ fontSize: 12.5, color: THEME.textSecondary }}>
                  Quickly copy the entire local state snapshot to your clipboard for inspection or migration.
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<Copy size={14} />}
                onClick={() => {
                  try {
                    const sanitized = {
                      ...state,
                      settings: { ...(state.settings || {}), geminiApiKey: "" },
                    };
                    navigator.clipboard.writeText(JSON.stringify(sanitized, null, 2));
                    if (showToast) showToast("Sanitized JSON copied to clipboard!", "success");
                  } catch {
                    if (showToast) showToast("Clipboard access denied by browser.", "error");
                  }
                }}
              >
                Copy Raw JSON
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

