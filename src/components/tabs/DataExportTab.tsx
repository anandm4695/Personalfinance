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
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { today } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Button } from "../ui/Button";
import { StatCard } from "../ui/StatCard";

// ─── Domain Groupings & Categorized Collections ─────────────────────────────

export interface DataCategory {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  items: {
    key: string;
    label: string;
    description?: string;
  }[];
}

export const DOMAIN_CATEGORIES: DataCategory[] = [
  {
    id: "banking",
    name: "Banking, Cash & Cards",
    description: "Liquid bank accounts, cards, and day-to-day cashflow records",
    icon: PiggyBank,
    color: "#3b82f6",
    items: [
      { key: "bankAccounts", label: "Bank Accounts", description: "Savings, current & checking ledgers" },
      { key: "transactions", label: "Account Transactions", description: "Inflows, outflows & transfers" },
      { key: "creditCards", label: "Credit Cards", description: "Cards, limits & statements" },
      { key: "prepaidCards", label: "Prepaid & Forex Cards", description: "Wallets & prepaid cards" },
      { key: "billPayments", label: "Bills & Subscriptions", description: "Utility bills & scheduled dues" },
      { key: "billPaymentHistory", label: "Bill Payment History", description: "Historical payment receipts" },
      { key: "recurringExpenses", label: "Recurring Expenses", description: "Standing orders & repetitive costs" },
    ],
  },
  {
    id: "investments",
    name: "Wealth, Stocks & Markets",
    description: "Equities, mutual funds, fixed income, gold, and retirement deposits",
    icon: TrendingUp,
    color: "#10b981",
    items: [
      { key: "mutualFunds", label: "Mutual Funds", description: "Active folios, units & NAVs" },
      { key: "stocks", label: "Stocks Portfolio", description: "Equities, demat holdings & avg price" },
      { key: "demat", label: "Demat Accounts", description: "Depository accounts & broker IDs" },
      { key: "fixedDeposits", label: "Fixed Deposits (FD)", description: "Bank term deposits & maturities" },
      { key: "recurringDeposits", label: "Recurring Deposits (RD)", description: "Monthly recurring deposit accounts" },
      { key: "bonds", label: "Bonds & SGBs", description: "Corporate bonds & Sovereign Gold Bonds" },
      { key: "goldHoldings", label: "Physical & Digital Gold", description: "Gold jewelry, bars & digital gold" },
      { key: "ppf", label: "Public Provident Fund (PPF)", description: "PPF accounts & balances" },
      { key: "ppfLedger", label: "PPF Contribution Ledger", description: "Yearly PPF deposit history" },
      { key: "nps", label: "National Pension Scheme (NPS)", description: "Tier 1 & Tier 2 retirement pots" },
      { key: "epf", label: "Employee Provident Fund (EPF)", description: "UAN balances & passbook records" },
      { key: "sips", label: "Systematic Investment Plans", description: "Active monthly SIP schedules" },
      { key: "dividends", label: "Dividend Income Logs", description: "Equities & MF dividend payouts" },
      { key: "stockSells", label: "Stock Realized Sells", description: "Historical equity sell trades" },
      { key: "mfSells", label: "MF Realized Redemptions", description: "Historical mutual fund sell trades" },
      { key: "corporateActions", label: "Corporate Actions", description: "Bonus, splits & rights logs" },
      { key: "govtSchemes", label: "Government Schemes", description: "SSY, SCSS, NSC, KVP & others" },
    ],
  },
  {
    id: "realEstate",
    name: "Real Estate & Physical Assets",
    description: "Property holdings, construction payments, rentals, and automobiles",
    icon: Building,
    color: "#f59e0b",
    items: [
      { key: "realEstateProperties", label: "Real Estate Properties", description: "Land, residential & commercial units" },
      { key: "realEstateDemands", label: "Real Estate Demands", description: "Builder milestone payment notices" },
      { key: "realEstatePayments", label: "Real Estate Payments", description: "Disbursements & receipts paid" },
      { key: "rentalProperties", label: "Rental Properties (Income)", description: "Tenants & monthly rental inflows" },
      { key: "rentedProperties", label: "Rented Properties (Expense)", description: "Landlord agreements & rent paid" },
      { key: "vehicles", label: "Vehicles & Automobiles", description: "Cars, bikes & valuation logs" },
    ],
  },
  {
    id: "insuranceTax",
    name: "Insurance, Tax & Income",
    description: "Life/Health protection policies, tax filings, and income declarations",
    icon: Shield,
    color: "#8b5cf6",
    items: [
      { key: "lic", label: "Life Insurance (LIC)", description: "Traditional life insurance policies" },
      { key: "termPlans", label: "Term Life Insurance", description: "Pure risk term cover & sum assured" },
      { key: "healthInsurance", label: "Health & Mediclaim", description: "Family floater & individual health covers" },
      { key: "investmentPlans", label: "ULIPs & Endowments", description: "Investment-linked insurance plans" },
      { key: "income", label: "Income Entries", description: "Salary, business, consulting & bonus" },
      { key: "salarySlips", label: "Salary Slips & CTC", description: "Payslip breakdowns & deductions" },
      { key: "taxPayments", label: "Advance Tax & Self-Assessment", description: "Challan payments & direct taxes" },
      { key: "form26as", label: "Form 26AS Tax Credits", description: "TDS deductions & tax credit logs" },
    ],
  },
  {
    id: "liabilities",
    name: "Liabilities & Loans",
    description: "Formal bank borrowings, mortgages, and informal loan tracking",
    icon: CreditCard,
    color: "#ef4444",
    items: [
      { key: "loansTaken", label: "Formal Loans Taken", description: "Home, vehicle, education & personal loans" },
      { key: "loansGiven", label: "Loans Given (Formal)", description: "Lending to businesses or entities" },
      { key: "informalLent", label: "Informal Loans (Given)", description: "Lent to friends, family & relatives" },
      { key: "informalBorrowed", label: "Informal Loans (Borrowed)", description: "Borrowed from friends & family" },
    ],
  },
  {
    id: "planningVault",
    name: "Goals, Vault & Planning",
    description: "Financial goals, budgets, documents, nominees, and audit metrics",
    icon: FolderOpen,
    color: "#06b6d4",
    items: [
      { key: "goals", label: "Financial Goals", description: "Milestones, targets & target dates" },
      { key: "budgets", label: "Category Budgets", description: "Monthly & annual budget limits" },
      { key: "subscriptions", label: "Active Subscriptions", description: "Recurring digital services" },
      { key: "documents", label: "Document Vault Meta", description: "Vault document records & index" },
      { key: "nominees", label: "Will & Nominees", description: "Asset beneficiaries & allocations" },
      { key: "reminders", label: "Reminders & Alerts", description: "Custom calendar notifications" },
      { key: "lifeEvents", label: "Life Events & Milestones", description: "Major career and personal events" },
      { key: "wishlists", label: "Watchlists", description: "Stock & fund tracking watchlists" },
      { key: "wishlistItems", label: "Watchlist Items", description: "Tracked tickers & instruments" },
      { key: "netWorthHistory", label: "Net Worth History", description: "Historical valuation time-series" },
      { key: "creditScores", label: "Credit Score History", description: "CIBIL / Experian score snapshots" },
    ],
  },
];

// Flat lookup of all items
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
    description: "All collections across banking, investments, real estate, taxes, liabilities & goals",
    tagline: "100% Full System Export",
    icon: Sparkles,
    color: THEME.accent,
    keys: ALL_DATA_SECTIONS.map((s) => s.key),
  },
  {
    id: "tax",
    label: "CA & Tax Prep Pack",
    description: "Income, 26AS, TDS, Tax Payments, Capital Gains, Dividends & Sec 80 items",
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
    description: "Stocks, Mutual Funds, Demat, FDs, Gold, Bonds, EPF/PPF & Real Estate",
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
    description: "Bank accounts, statements, credit cards, bills & recurring expenses",
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
    description: "LIC, Health/Term policies, documents, nominees & life events",
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

// ─── CSV Sanitization & Generation Utilities ────────────────────────────────

const csvCell = (val: any) => {
  if (val === null || val === undefined) return "";
  const str = typeof val === "object" ? JSON.stringify(val) : String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toCleanCSV = (data: any[]) => {
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
  // Navigation View State: 'export' | 'restore' | 'security'
  const [activeTab, setActiveTab] = useState<"export" | "restore" | "security">("export");

  // Selection, Preset & Search State
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    () => new Set(ALL_DATA_SECTIONS.map((s) => s.key))
  );
  const [activePresetId, setActivePresetId] = useState<string>("all");
  const [exportFormat, setExportFormat] = useState<"json-full" | "json-selective" | "csv">("json-full");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Restore Drag & Drop & Inspector State
  const [dragOver, setDragOver] = useState(false);
  const [parsedRestoreFile, setParsedRestoreFile] = useState<{
    fileName: string;
    fileSizeKb: number;
    rawJson: any;
    exportedAt?: string;
    recordCounts: { key: string; label: string; count: number }[];
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
      // Check if current selection matches preset keys exactly
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

        const counts: { key: string; label: string; count: number }[] = [];
        let total = 0;

        ALL_DATA_SECTIONS.forEach((s) => {
          if (Array.isArray(parsed[s.key]) && parsed[s.key].length > 0) {
            counts.push({
              key: s.key,
              label: s.label,
              count: parsed[s.key].length,
            });
            total += parsed[s.key].length;
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

  // ─── Filtered Categories based on search query ────────────────────────────

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categoryCounts;
    const q = searchQuery.toLowerCase().trim();
    return categoryCounts
      .map((cat) => {
        const matchesCat = cat.name.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q);
        const filteredItems = cat.items.filter(
          (it) =>
            matchesCat ||
            it.label.toLowerCase().includes(q) ||
            (it.description && it.description.toLowerCase().includes(q)) ||
            it.key.toLowerCase().includes(q)
        );
        return {
          ...cat,
          items: filteredItems,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [categoryCounts, searchQuery]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Styles for interactive micro-animations */}
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
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <SectionTitle sub="Enterprise-grade local backup snapshots, Excel CSV exports, and safe disaster recovery">
            Data Export & Backup Hub
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
          background: "linear-gradient(135deg, color-mix(in srgb, var(--t-accent) 7%, var(--t-card)) 0%, var(--t-card) 100%)",
          border: "1px solid color-mix(in srgb, var(--t-accent) 25%, var(--t-line, rgba(255,255,255,0.08)))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
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
              onClick={() => setActiveTab("security")}
              icon={<Shield size={14} />}
            >
              Privacy &amp; Safety
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
          sub={`Across ${activeDomainsCount} active categories`}
        />
        <StatCard
          label="Selected for Export"
          value={selectedRecordsCount.toLocaleString("en-IN")}
          numericValue={selectedRecordsCount}
          formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
          icon={<CheckCircle />}
          color="var(--t-sage, #10b981)"
          sub={`${selectedSections.size} of ${ALL_DATA_SECTIONS.length} sections`}
        />
        <StatCard
          label="Estimated Data Size"
          value={`${estimatedStorageKb} KB`}
          icon={<Layers />}
          color="#8b5cf6"
          sub="Local JSON memory footprint"
        />
        <StatCard
          label="Last Verified Backup"
          value={backupDateLabel ? backupDateLabel.split(",")[0] : "None Recorded"}
          icon={<Clock />}
          color={backupStatus.color}
          sub={backupDateLabel ? backupDateLabel.split(",")[1] || "" : "Take your first backup"}
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
        }}
      >
        {[
          { id: "export", label: "Export Hub & Spreadsheets", icon: Download },
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
                      ledgers, settings, and histories) with sanitization of private API keys. Ideal for
                      periodic offline safety.
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
                      tables with standard headers for direct import into Microsoft Excel, Google Sheets, or Apple Numbers.
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
                maxWidth: 420,
              }}
            >
              <Search size={15} color={THEME.textSecondary} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search collections (e.g. mutual, tax, demat)..."
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
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: `color-mix(in srgb, ${cat.color} 15%, transparent)`,
                          color: cat.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                    </div>
                  </div>

                  {/* Category Items Grid */}
                  {!isCollapsed && (
                    <div
                      style={{
                        padding: 16,
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
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
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 14px",
                              borderRadius: 10,
                              background: isChecked
                                ? "color-mix(in srgb, var(--t-accent) 7%, var(--t-card))"
                                : "var(--surface-0, var(--t-card))",
                              border: `1px solid ${
                                isChecked
                                  ? "color-mix(in srgb, var(--t-accent) 35%, transparent)"
                                  : "var(--t-line, rgba(255,255,255,0.06))"
                              }`,
                            }}
                          >
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
                                    fontWeight: isChecked ? 700 : 500,
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
      {/* VIEW 2: RESTORE & DISASTER RECOVERY                                 */}
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

              {/* Records Breakdown Diff */}
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
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
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
                      <span
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
      {/* VIEW 3: SECURITY, PRIVACY & STORAGE INSIGHTS                        */}
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
