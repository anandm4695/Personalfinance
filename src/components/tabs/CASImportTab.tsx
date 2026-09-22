import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  Upload,
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Briefcase,
  IndianRupee,
  RefreshCw,
  Search,
  ShieldCheck,
  Download,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowUpRight,
  Check,
  X,
  Edit3,
  HelpCircle,
  ExternalLink,
  PieChart,
  ChevronDown,
  ChevronUp,
  Copy,
  SlidersHorizontal,
  Building2,
  Calendar,
  CheckSquare,
  Square,
  Lightbulb,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, uid } from "../../utils/finance";
import { parseCsvLine } from "../../utils/csv";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Button } from "../ui/Button";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";
import { PdfPasswordPrompt } from "../ui/PdfPasswordPrompt";
import { Money } from "../ui/Money";
import { useCasPdfExtract } from "../../hooks/useCasPdfExtract";
import { useMasterData, formatProfileOption } from "../../utils/masterData";

// ── Category Normalizer ──────────────────────────────────────────────
const MF_CATEGORY_MAP: Record<string, string> = {
  equity: "Equity",
  debt: "Debt",
  hybrid: "Hybrid",
  elss: "ELSS",
  "tax saver": "ELSS",
  liquid: "Liquid",
  gilt: "Debt",
  index: "Equity",
  "small cap": "Equity",
  "mid cap": "Equity",
  "large cap": "Equity",
  "flexi cap": "Equity",
  "multi cap": "Equity",
  balanced: "Hybrid",
  arbitrage: "Hybrid",
  overnight: "Liquid",
  "ultra short": "Debt",
  "low duration": "Debt",
  "short duration": "Debt",
  "corporate bond": "Debt",
  "money market": "Liquid",
  "dynamic bond": "Debt",
  banking: "Debt",
  sectoral: "Equity",
  thematic: "Equity",
  focused: "Equity",
  value: "Equity",
  contra: "Equity",
  "dividend yield": "Equity",
  gold: "Gold/Commodity",
  silver: "Gold/Commodity",
  commodity: "Gold/Commodity",
  fo: "Hybrid",
  "fund of funds": "Hybrid",
};

const CATEGORY_COLORS: Record<string, string> = {
  Equity: "var(--t-accent)",
  Debt: "var(--t-sage)",
  Hybrid: "var(--t-gold)",
  ELSS: "var(--t-violet, #8b5cf6)",
  Liquid: "var(--t-cyan, #06b6d4)",
  "Gold/Commodity": "var(--t-amber, #f59e0b)",
  Other: "var(--t-muted)",
};

const guessCategory = (name: string): string => {
  const lower = name.toLowerCase();
  for (const [key, cat] of Object.entries(MF_CATEGORY_MAP)) {
    if (lower.includes(key)) return cat;
  }
  return "Equity";
};

// ── AMC Name Detection ──────────────────────────────────────────────
const KNOWN_AMCS = [
  "HDFC Mutual Fund",
  "ICICI Prudential Mutual Fund",
  "SBI Mutual Fund",
  "Nippon India Mutual Fund",
  "Axis Mutual Fund",
  "Mirae Asset Mutual Fund",
  "Kotak Mahindra Mutual Fund",
  "Parag Parikh Mutual Fund",
  "UTI Mutual Fund",
  "Aditya Birla Sun Life Mutual Fund",
  "DSP Mutual Fund",
  "Quant Mutual Fund",
  "Motilal Oswal Mutual Fund",
  "Tata Mutual Fund",
  "Edelweiss Mutual Fund",
  "Bandhan Mutual Fund",
  "Invesco Mutual Fund",
  "WhiteOak Capital Mutual Fund",
  "Navi Mutual Fund",
  "Canara Robeco Mutual Fund",
  "Franklin Templeton Mutual Fund",
  "Sundaram Mutual Fund",
  "HSBC Mutual Fund",
  "PGIM India Mutual Fund",
  "Mahindra Manulife Mutual Fund",
  "Baroda BNP Paribas Mutual Fund",
  "Union Mutual Fund",
  "ITI Mutual Fund",
  "Trust Mutual Fund",
  "Samco Mutual Fund",
  "Quantum Mutual Fund",
  "Groww Mutual Fund",
  "Zerodha Mutual Fund",
  "Taurus Mutual Fund",
  "Helios Mutual Fund",
  "JM Financial Mutual Fund",
  "360 ONE Mutual Fund",
];

const detectAmcFromScheme = (schemeName: string): string => {
  const lower = schemeName.toLowerCase();
  for (const amc of KNOWN_AMCS) {
    const rootName = amc.toLowerCase().replace(" mutual fund", "").trim();
    if (lower.includes(rootName)) return amc;
  }
  return "";
};

// ── Normalized Scheme Similarity ────────────────────────────────────
const normalizeScheme = (name: string) =>
  (name || "")
    .toLowerCase()
    .replace(/\s*-\s*/g, " ")
    .replace(/\(.*?\)/g, "")
    .replace(/\b(direct|regular|plan|growth|dividend|idcw|option|reinvestment|payout)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const fuzzyScore = (a: string, b: string): number => {
  const na = normalizeScheme(a);
  const nb = normalizeScheme(b);
  if (na === nb) return 1;
  const ta = new Set(na.split(" ").filter(Boolean));
  const tb = new Set(nb.split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  ta.forEach((w) => {
    if (tb.has(w)) overlap++;
  });
  return (2 * overlap) / (ta.size + tb.size);
};

// ── Sample Statement Text for Instant Demo / Testing ────────────────
const SAMPLE_CAS_TEXT = `Consolidated Account Statement (CAS)
CAMS & KFintech Consolidated Portfolio
Period: 01-Apr-2025 to 31-Mar-2026

HDFC Mutual Fund
Folio No: 10845623/91
HDFC Flexi Cap Fund - Direct Plan - Growth
ISIN: INF179K01BE2
Closing Unit Balance: 485.620
NAV on 12-Mar-2026: INR 1845.3200
Valuation on 12-Mar-2026: INR 896124.30

Parag Parikh Mutual Fund
Folio No: 2948105/00
Parag Parikh Flexi Cap Fund - Direct Plan - Growth
Closing Unit Balance: 820.450
NAV on 12-Mar-2026: INR 78.4500
Valuation on 12-Mar-2026: INR 64364.30

ICICI Prudential Mutual Fund
Folio No: 9140283/44
ICICI Prudential Bluechip Fund - Direct Plan - Growth
Closing Unit Balance: 650.000
NAV on 12-Mar-2026: INR 112.8000
Valuation on 12-Mar-2026: INR 73320.00

SBI Mutual Fund
Folio No: 3381920/12
SBI Small Cap Fund - Direct Plan - Growth
Closing Unit Balance: 310.250
NAV on 12-Mar-2026: INR 168.4000
Valuation on 12-Mar-2026: INR 52246.10

Mirae Asset Mutual Fund
Folio No: 5049281/88
Mirae Asset ELSS Tax Saver Fund - Direct Plan - Growth
Closing Unit Balance: 740.120
NAV on 12-Mar-2026: INR 44.5000
Valuation on 12-Mar-2026: INR 32935.34

Nippon India Mutual Fund
Folio No: 8847120/01
Nippon India Liquid Fund - Direct Plan - Growth
Closing Unit Balance: 15.420
NAV on 12-Mar-2026: INR 5940.2000
Valuation on 12-Mar-2026: INR 91597.88
`;

// ── CAS Text Parser ──────────────────────────────────────────────────
export interface ParsedHolding {
  id: string;
  scheme: string;
  amc: string;
  folio: string;
  units: number;
  nav: number;
  value: number;
  category: string;
  selected: boolean;
  owner?: string;
  matchedHoldingId?: string;
  matchType?: "folio" | "name" | "none";
  existingHolding?: any;
}

const parseCASText = (text: string): ParsedHolding[] => {
  const lines = text.split(/\r?\n/);
  const holdings: ParsedHolding[] = [];
  let currentFolio = "";
  let currentAMC = "";
  let currentScheme = "";
  let schemeFolio = "";
  let schemeAMC = "";
  let currentNav = 0;
  let currentUnits = 0;
  let currentValue = 0;
  let inScheme = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect AMC
    const amcMatch = line.match(/^(.*?)\s*\(Formerly.*?\)$|^([A-Z][\w\s&]+Mutual Fund)/i);
    if (amcMatch) {
      currentAMC = (amcMatch[1] || amcMatch[2] || "").trim();
    } else {
      for (const amc of KNOWN_AMCS) {
        if (line.toLowerCase().startsWith(amc.toLowerCase())) {
          currentAMC = amc;
          break;
        }
      }
    }

    // Detect Folio
    const folioMatch = line.match(/Folio\s*(?:No)?[:.]?\s*(\S+)/i);
    if (folioMatch) {
      currentFolio = folioMatch[1].replace(/[^0-9/A-Za-z-]/g, "");
    }

    // Detect scheme name + units/NAV lines
    const schemeMatch = line.match(/^(.+?(?:Growth|IDCW|Dividend|Direct|Regular|Plan).*)$/i);
    if (schemeMatch && !line.match(/^\d/) && line.length > 15) {
      if (inScheme && currentScheme && currentUnits > 0) {
        const detectedAMC = schemeAMC || detectAmcFromScheme(currentScheme);
        holdings.push({
          id: uid(),
          scheme: currentScheme,
          amc: detectedAMC,
          folio: schemeFolio,
          units: currentUnits,
          nav: currentNav,
          value: currentValue || currentUnits * currentNav,
          category: guessCategory(currentScheme),
          selected: true,
        });
      }
      currentScheme = schemeMatch[1].trim();
      schemeFolio = currentFolio;
      schemeAMC = currentAMC || detectAmcFromScheme(currentScheme);
      currentUnits = 0;
      currentNav = 0;
      currentValue = 0;
      inScheme = true;
    }

    // Detect closing units line — e.g. "Closing Unit Balance: 123.456" or "Total Units: 123.456"
    const closingMatch = line.match(/(?:Closing\s+Unit\s+Balance|Total\s+Units|Units\s+Held|Balance\s+Units)\s*[:.]?\s*([\d,.]+)/i);
    if (closingMatch) {
      currentUnits = parseFloat(closingMatch[1].replace(/,/g, "")) || 0;
    }

    // Detect NAV line — e.g. "NAV on 12-Mar-2026 : INR 123.4567"
    const navMatch = line.match(/NAV\s+(?:on|as\s+on).*?:\s*(?:INR\s*)?([\d,.]+)/i);
    if (navMatch) {
      currentNav = parseFloat(navMatch[1].replace(/,/g, "")) || 0;
    }

    // Detect valuation — e.g. "Valuation on 12-Mar-2026 : INR 1,23,456.78"
    const valMatch = line.match(/(?:Valuation|Current\s+Value|Market\s+Value)\s+(?:on|as\s+on).*?:\s*(?:INR\s*)?([\d,.]+)/i);
    if (valMatch) {
      currentValue = parseFloat(valMatch[1].replace(/,/g, "")) || 0;
    }
  }

  // Capture last scheme
  if (inScheme && currentScheme && currentUnits > 0) {
    const detectedAMC = schemeAMC || detectAmcFromScheme(currentScheme);
    holdings.push({
      id: uid(),
      scheme: currentScheme,
      amc: detectedAMC,
      folio: schemeFolio,
      units: currentUnits,
      nav: currentNav,
      value: currentValue || currentUnits * currentNav,
      category: guessCategory(currentScheme),
      selected: true,
    });
  }

  return holdings;
};

// ── Main CAS Import Component ─────────────────────────────────────────
export const CASImportTab: React.FC<{
  state: any;
  addItem?: any;
  updateItem?: any;
  activeProfile?: string;
}> = ({ state, addItem, updateItem, activeProfile = "all" }) => {
  const { familyProfiles } = useMasterData();
  const [parsedFunds, setParsedFunds] = useState<ParsedHolding[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [importedSummary, setImportedSummary] = useState<{ newCount: number; updatedCount: number; totalValue: number } | null>(null);
  const [parseMethod, setParseMethod] = useState<"pdf" | "text" | "csv">("pdf");
  const [rawText, setRawText] = useState("");
  const [csvInputFocused, setCsvInputFocused] = useState(false);
  const [csvParsing, setCsvParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [owner, setOwner] = useState(activeProfile !== "all" ? activeProfile : "self");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedMatchFilter, setSelectedMatchFilter] = useState<"all" | "new" | "update">("all");
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<"cams" | "kfintech" | "mfcentral" | "cdsl">("cams");
  const [copiedSample, setCopiedSample] = useState(false);

  const existingMFs = useMemo(() => state.mutualFunds || [], [state.mutualFunds]);

  // Total existing mutual fund portfolio value
  const existingPortfolioValue = useMemo(() => {
    return existingMFs.reduce((sum: number, m: any) => {
      const units = parseFloat(m.units || "0");
      const nav = parseFloat(m.currentNav || m.buyNav || "0");
      const val = parseFloat(m.currentValue || "0") || units * nav;
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [existingMFs]);

  // Match parsed holdings against existing mutual funds
  const reconciledFunds = useMemo(() => {
    return parsedFunds.map((holding) => {
      // 1. Match by folio if available
      if (holding.folio) {
        const matchByFolio = existingMFs.find(
          (m: any) => m.folioNumber && m.folioNumber.trim().toLowerCase() === holding.folio.trim().toLowerCase()
        );
        if (matchByFolio) {
          return {
            ...holding,
            matchedHoldingId: matchByFolio.id,
            matchType: "folio" as const,
            existingHolding: matchByFolio,
          };
        }
      }

      // 2. Fallback to fuzzy name match
      let bestMatch: any = null;
      let bestScore = 0;
      existingMFs.forEach((m: any) => {
        // If candidate has a folio and current fund has a different folio, do not match
        if (holding.folio && m.folioNumber && holding.folio !== m.folioNumber) return;
        const score = fuzzyScore(holding.scheme, m.name || m.scheme || "");
        if (score > bestScore) {
          bestScore = score;
          bestMatch = m;
        }
      });

      if (bestScore >= 0.65 && bestMatch) {
        return {
          ...holding,
          matchedHoldingId: bestMatch.id,
          matchType: "name" as const,
          existingHolding: bestMatch,
        };
      }

      return {
        ...holding,
        matchedHoldingId: undefined,
        matchType: "none" as const,
        existingHolding: undefined,
      };
    });
  }, [parsedFunds, existingMFs]);

  // Run parser and populate holdings
  const runParse = useCallback((text: string) => {
    setParseError("");
    setImportedSummary(null);
    const holdings = parseCASText(text);
    if (holdings.length === 0) {
      setParseError(
        'No mutual fund holdings found in that text. Ensure the statement includes "Closing Unit Balance", NAV, and scheme valuation details.'
      );
      setParsedFunds([]);
      return;
    }
    setParsedFunds(holdings);
  }, []);

  const handlePaste = useCallback(() => {
    if (!rawText.trim()) return;
    runParse(rawText);
  }, [rawText, runParse]);

  const handleLoadSample = useCallback(() => {
    setRawText(SAMPLE_CAS_TEXT);
    runParse(SAMPLE_CAS_TEXT);
    setParseMethod("text");
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2500);
  }, [runParse]);

  const pdfExtract = useCasPdfExtract((text: string) => {
    setRawText(text);
    runParse(text);
  });

  // CSV file handler
  const handleCSV = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError("");
    setCsvParsing(true);
    setImportedSummary(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") {
        setCsvParsing(false);
        setParseError("Could not read that file as text. Please choose a valid CSV or TXT export.");
        return;
      }

      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setCsvParsing(false);
        setParseError("The CSV file is empty or missing data rows.");
        return;
      }
      const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
      const schemeIdx = headers.findIndex((h) => h.includes("scheme") || h.includes("fund"));
      const folioIdx = headers.findIndex((h) => h.includes("folio"));
      const unitsIdx = headers.findIndex((h) => h.includes("unit") || h.includes("qty"));
      const navIdx = headers.findIndex((h) => h.includes("nav") || h.includes("price"));
      const valueIdx = headers.findIndex((h) => h.includes("value") || h.includes("amount") || h.includes("valuation"));

      const holdings = lines
        .slice(1)
        .map((line) => {
          const vals = parseCsvLine(line);
          const scheme = vals[schemeIdx] || "";
          const folio = folioIdx >= 0 ? vals[folioIdx] || "" : "";
          const units = parseFloat((vals[unitsIdx] || "0").replace(/,/g, "")) || 0;
          const nav = navIdx >= 0 ? parseFloat((vals[navIdx] || "0").replace(/,/g, "")) || 0 : 0;
          const value =
            valueIdx >= 0
              ? parseFloat((vals[valueIdx] || "0").replace(/,/g, "")) || 0
              : units * nav;
          if (!scheme || units <= 0) return null;
          return {
            id: uid(),
            scheme,
            amc: detectAmcFromScheme(scheme),
            folio,
            units,
            nav,
            value,
            category: guessCategory(scheme),
            selected: true,
          };
        })
        .filter(Boolean) as ParsedHolding[];

      setCsvParsing(false);
      if (holdings.length === 0) {
        setParseError(
          schemeIdx === -1 || unitsIdx === -1
            ? "Could not find Scheme and Units columns in the header row."
            : "No valid fund rows found. Each row must have a scheme name and positive units."
        );
        setParsedFunds([]);
        return;
      }
      setParsedFunds(holdings);
    };
    reader.onerror = () => {
      setCsvParsing(false);
      setParseError("Failed to read the file. Please try again.");
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  // Download Sample CSV template
  const downloadSampleCsv = useCallback(() => {
    const csvContent =
      "Scheme Name,Folio Number,Units,NAV,Current Value\n" +
      '"HDFC Flexi Cap Fund - Direct Plan - Growth",10845623/91,485.620,1845.32,896124.30\n' +
      '"Parag Parikh Flexi Cap Fund - Direct Plan - Growth",2948105/00,820.450,78.45,64364.30\n' +
      '"ICICI Prudential Bluechip Fund - Direct Plan - Growth",9140283/44,650.000,112.80,73320.00\n' +
      '"SBI Small Cap Fund - Direct Plan - Growth",3381920/12,310.250,168.40,52246.10\n' +
      '"Mirae Asset ELSS Tax Saver Fund - Direct Plan - Growth",5049281/88,740.120,44.50,32935.34\n';
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_cas_mutual_funds.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Filtered list for display
  const filteredFunds = useMemo(() => {
    return reconciledFunds.filter((item) => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchScheme = item.scheme.toLowerCase().includes(q);
        const matchFolio = item.folio.toLowerCase().includes(q);
        const matchAmc = item.amc.toLowerCase().includes(q);
        if (!matchScheme && !matchFolio && !matchAmc) return false;
      }
      // Category filter
      if (selectedCategoryFilter !== "all" && item.category !== selectedCategoryFilter) {
        return false;
      }
      // Match status filter
      if (selectedMatchFilter === "new" && item.matchType !== "none") return false;
      if (selectedMatchFilter === "update" && item.matchType === "none") return false;

      return true;
    });
  }, [reconciledFunds, searchQuery, selectedCategoryFilter, selectedMatchFilter]);

  // Aggregated analytics & stats
  const stats = useMemo(() => {
    const selected = reconciledFunds.filter((f) => f.selected);
    const totalValue = selected.reduce((s, f) => s + Number(f.value || 0), 0);
    const newCount = selected.filter((f) => f.matchType === "none").length;
    const updateCount = selected.filter((f) => f.matchType !== "none").length;

    const byCat: Record<string, { value: number; count: number }> = {};
    const byAmc: Record<string, { value: number; count: number }> = {};

    selected.forEach((f) => {
      const cat = f.category || "Other";
      if (!byCat[cat]) byCat[cat] = { value: 0, count: 0 };
      byCat[cat].value += Number(f.value || 0);
      byCat[cat].count += 1;

      const amc = f.amc || "Other AMC";
      if (!byAmc[amc]) byAmc[amc] = { value: 0, count: 0 };
      byAmc[amc].value += Number(f.value || 0);
      byAmc[amc].count += 1;
    });

    return {
      totalParsed: reconciledFunds.length,
      selectedCount: selected.length,
      totalValue,
      newCount,
      updateCount,
      byCat,
      byAmc,
    };
  }, [reconciledFunds]);

  // Bulk selection actions
  const setAllSelected = (val: boolean) => {
    setParsedFunds((prev) => prev.map((f) => ({ ...f, selected: val })));
  };

  const selectOnlyNew = () => {
    setParsedFunds((prev) =>
      prev.map((f) => {
        const isNew = !existingMFs.some(
          (m: any) =>
            (f.folio && m.folioNumber === f.folio) ||
            fuzzyScore(f.scheme, m.name || m.scheme || "") >= 0.65
        );
        return { ...f, selected: isNew };
      })
    );
  };

  const selectOnlyUpdates = () => {
    setParsedFunds((prev) =>
      prev.map((f) => {
        const isUpdate = existingMFs.some(
          (m: any) =>
            (f.folio && m.folioNumber === f.folio) ||
            fuzzyScore(f.scheme, m.name || m.scheme || "") >= 0.65
        );
        return { ...f, selected: isUpdate };
      })
    );
  };

  // Toggle single item selection
  const toggleSelection = (id: string) => {
    setParsedFunds((prev) =>
      prev.map((f) => (f.id === id ? { ...f, selected: !f.selected } : f))
    );
  };

  // Inline update item property
  const updateParsedHolding = (id: string, updates: Partial<ParsedHolding>) => {
    setParsedFunds((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const next = { ...f, ...updates };
          if (updates.units !== undefined || updates.nav !== undefined) {
            const u = updates.units !== undefined ? updates.units : f.units;
            const n = updates.nav !== undefined ? updates.nav : f.nav;
            next.value = u * n;
          }
          return next;
        }
        return f;
      })
    );
  };

  // Execute import of selected holdings
  const handleImportSelected = async () => {
    setImporting(true);
    setParseError("");
    const toImport = reconciledFunds.filter((f) => f.selected);

    if (toImport.length === 0) {
      setImporting(false);
      return;
    }

    setImportProgress({ done: 0, total: toImport.length });
    let newImported = 0;
    let updatedImported = 0;
    let importedValSum = 0;

    try {
      for (let i = 0; i < toImport.length; i++) {
        const f = toImport[i];
        importedValSum += f.value;

        if (f.matchedHoldingId && f.existingHolding && updateItem) {
          // Re-import / Update existing holding:
          const existing = f.existingHolding;
          const existingUnits = parseFloat(existing.units || "0");
          const existingInvested = parseFloat(existing.invested || "0");
          const newUnits = parseFloat(String(f.units) || "0");
          const avgCostPerUnit = existingUnits > 0 ? existingInvested / existingUnits : 0;
          const newInvested =
            avgCostPerUnit > 0 && newUnits !== existingUnits
              ? avgCostPerUnit * newUnits
              : existingInvested;

          await updateItem("mutualFunds", existing.id, {
            units: f.units,
            currentNav: f.nav,
            name: f.scheme,
            category: f.category,
            folioNumber: f.folio || existing.folioNumber,
            invested: String(newInvested.toFixed(2)),
            owner: f.owner || existing.owner || owner,
          });
          updatedImported++;
        } else if (addItem) {
          // New holding addition
          await addItem("mutualFunds", {
            name: f.scheme,
            category: f.category,
            folioNumber: f.folio,
            units: f.units,
            buyNav: f.value && f.units ? f.value / f.units : f.nav,
            currentNav: f.nav,
            invested: f.value || "",
            owner: f.owner || owner,
          });
          newImported++;
        }
        setImportProgress({ done: i + 1, total: toImport.length });
      }

      setImportedSummary({
        newCount: newImported,
        updatedCount: updatedImported,
        totalValue: importedValSum,
      });
      setParsedFunds([]);
    } catch (e: any) {
      setParseError(
        `Import halted midway: ${e?.message || "Unknown error"}. Check mutual fund holdings before re-importing.`
      );
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Executive Header ────────────────────────────────────────── */}
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
          <SectionTitle sub="Institutional-grade CAMS, KFintech & CDSL/NSDL eCAS statement ingestion with live folio diff reconciliation">
            CAS Import Tracker
          </SectionTitle>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 6,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                background: "color-mix(in srgb, var(--t-sage) 12%, transparent)",
                color: "var(--t-sage)",
                border: "1px solid color-mix(in srgb, var(--t-sage) 30%, transparent)",
              }}
            >
              <ShieldCheck size={13} />
              100% Client-Side Privacy (Zero Server Uploads)
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                background: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
                color: THEME.accent,
                border: `1px solid color-mix(in srgb, ${THEME.accent} 30%, transparent)`,
              }}
            >
              <CheckCircle size={13} />
              CAMS • KFintech • CDSL • NSDL Ready
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGuide((prev) => !prev)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <HelpCircle size={14} />
            {showGuide ? "Hide CAS Guide" : "How to get CAS PDF"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadSample}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: copiedSample
                ? "color-mix(in srgb, var(--t-sage) 15%, transparent)"
                : undefined,
              borderColor: copiedSample ? "var(--t-sage)" : undefined,
              color: copiedSample ? "var(--t-sage)" : undefined,
            }}
          >
            <Sparkles size={14} color={copiedSample ? "var(--t-sage)" : THEME.accent} />
            {copiedSample ? "Sample Data Loaded!" : "Load Sample CAS"}
          </Button>
        </div>
      </div>

      {/* ── Visual Workflow Pipeline Indicator ───────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            background:
              parsedFunds.length === 0 && !importedSummary
                ? "color-mix(in srgb, var(--t-accent) 15%, transparent)"
                : "var(--surface-1)",
            border: `1px solid ${
              parsedFunds.length === 0 && !importedSummary
                ? THEME.accent
                : "var(--t-line)"
            }`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background:
                parsedFunds.length > 0 || importedSummary
                  ? "var(--t-sage)"
                  : THEME.accent,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {parsedFunds.length > 0 || importedSummary ? <Check size={16} /> : "1"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text }}>
              1. Source & Ingest
            </div>
            <div style={{ fontSize: 11, color: THEME.textSecondary }}>
              PDF, Paste Text, or CSV File
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            background:
              parsedFunds.length > 0
                ? "color-mix(in srgb, var(--t-accent) 15%, transparent)"
                : "var(--surface-1)",
            border: `1px solid ${
              parsedFunds.length > 0 ? THEME.accent : "var(--t-line)"
            }`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background:
                importedSummary
                  ? "var(--t-sage)"
                  : parsedFunds.length > 0
                  ? THEME.accent
                  : "var(--surface-2)",
              color: parsedFunds.length > 0 || importedSummary ? "#fff" : THEME.textSecondary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {importedSummary ? <Check size={16} /> : "2"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text }}>
              2. Reconcile & Diff
            </div>
            <div style={{ fontSize: 11, color: THEME.textSecondary }}>
              Auto-match Folio & Scheme Delta
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            background: importedSummary
              ? "color-mix(in srgb, var(--t-sage) 15%, transparent)"
              : "var(--surface-1)",
            border: `1px solid ${importedSummary ? "var(--t-sage)" : "var(--t-line)"}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: importedSummary ? "var(--t-sage)" : "var(--surface-2)",
              color: importedSummary ? "#fff" : THEME.textSecondary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {importedSummary ? <Check size={16} /> : "3"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text }}>
              3. Portfolio Sync
            </div>
            <div style={{ fontSize: 11, color: THEME.textSecondary }}>
              Commit to Mutual Funds
            </div>
          </div>
        </div>
      </div>

      {/* ── Expandable CAS Retrieval Knowledge Guide ─────────────────── */}
      {showGuide && (
        <Card
          style={{
            padding: 20,
            background: "color-mix(in srgb, var(--surface-1) 85%, transparent)",
            border: "1px solid var(--t-line)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Building2 size={18} color={THEME.accent} />
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: THEME.text }}>
                How to Download Official CAS Statements
              </h4>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: THEME.textSecondary,
              }}
              aria-label="Close guide"
            >
              <X size={18} />
            </button>
          </div>

          <div
            role="tablist"
            style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}
          >
            {[
              { id: "cams", label: "CAMS Online (Recommended)" },
              { id: "kfintech", label: "KFintech (Karvy)" },
              { id: "mfcentral", label: "MF Central" },
              { id: "cdsl", label: "NSDL / CDSL eCAS" },
            ].map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={activeGuideTab === t.id}
                onClick={() => setActiveGuideTab(t.id as any)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                  fontWeight: activeGuideTab === t.id ? 700 : 500,
                  border: `1px solid ${
                    activeGuideTab === t.id ? THEME.accent : "var(--t-line)"
                  }`,
                  background:
                    activeGuideTab === t.id
                      ? "color-mix(in srgb, var(--t-accent) 15%, transparent)"
                      : "var(--surface-0)",
                  color: activeGuideTab === t.id ? THEME.accent : THEME.textSecondary,
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: "var(--radius-md)",
              background: "var(--surface-0)",
              fontSize: 13,
              lineHeight: 1.6,
              color: THEME.text,
            }}
          >
            {activeGuideTab === "cams" && (
              <div>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong>CAMS Consolidated Account Statement:</strong>
                </p>
                <ol style={{ margin: "0 0 10px 20px", padding: 0 }}>
                  <li>
                    Visit{" "}
                    <a
                      href="https://www.camsonline.com/Investors/Statements/Consolidated-Account-Statement"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: THEME.accent, textDecoration: "underline" }}
                    >
                      CAMS Online Investor Portal <ArrowUpRight size={12} style={{ display: "inline" }} />
                    </a>
                  </li>
                  <li>Select Statement Type: <strong>Detailed</strong> (or Summary) with Zero Balance Folios excluded.</li>
                  <li>Enter your registered Email ID and PAN. Provide a custom statement password (or your PAN).</li>
                  <li>Check your email for the password-protected CAS PDF file and upload it above.</li>
                </ol>
                <div
                  style={{
                    fontSize: 12,
                    color: THEME.textSecondary,
                    background: "var(--surface-1)",
                    padding: "8px 12px",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Lightbulb size={13} color={THEME.accent} style={{ flexShrink: 0 }} />
                  <span><strong>Password format:</strong> Usually the custom password you entered on CAMS, or your PAN in UPPERCASE.</span>
                </div>
              </div>
            )}

            {activeGuideTab === "kfintech" && (
              <div>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong>KFintech (formerly Karvy) Statement:</strong>
                </p>
                <ol style={{ margin: "0 0 10px 20px", padding: 0 }}>
                  <li>
                    Visit{" "}
                    <a
                      href="https://mfs.kfintech.com/investor/General/CASBalances"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: THEME.accent, textDecoration: "underline" }}
                    >
                      KFintech Investor Portal <ArrowUpRight size={12} style={{ display: "inline" }} />
                    </a>
                  </li>
                  <li>Choose <strong>Consolidated Account Statement (CAS)</strong>.</li>
                  <li>Enter your registered Email ID and PAN to receive the statement via email.</li>
                </ol>
                <div
                  style={{
                    fontSize: 12,
                    color: THEME.textSecondary,
                    background: "var(--surface-1)",
                    padding: "8px 12px",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Lightbulb size={13} color={THEME.accent} style={{ flexShrink: 0 }} />
                  <span><strong>Password format:</strong> Often your PAN in uppercase or PAN in lowercase with DOB (DDMMYYYY).</span>
                </div>
              </div>
            )}

            {activeGuideTab === "mfcentral" && (
              <div>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong>MF Central (Joint CAMS + KFintech Platform):</strong>
                </p>
                <ol style={{ margin: "0 0 10px 20px", padding: 0 }}>
                  <li>
                    Log in to{" "}
                    <a
                      href="https://www.mfcentral.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: THEME.accent, textDecoration: "underline" }}
                    >
                      MF Central Portal <ArrowUpRight size={12} style={{ display: "inline" }} />
                    </a>
                  </li>
                  <li>Navigate to <strong>CAS Generation / Portfolio</strong>.</li>
                  <li>Request a Consolidated Account Statement PDF or CSV export directly.</li>
                </ol>
              </div>
            )}

            {activeGuideTab === "cdsl" && (
              <div>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong>NSDL / CDSL Consolidated Statement (eCAS):</strong>
                </p>
                <ol style={{ margin: "0 0 10px 20px", padding: 0 }}>
                  <li>
                    Visit{" "}
                    <a
                      href="https://cas.cdslindia.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: THEME.accent, textDecoration: "underline" }}
                    >
                      CDSL eCAS Portal <ArrowUpRight size={12} style={{ display: "inline" }} />
                    </a>{" "}
                    or NSDL CAS portal.
                  </li>
                  <li>Enter your 16-digit BO ID / Demat Account No. and PAN.</li>
                  <li>Download monthly eCAS containing mutual funds and demat equities.</li>
                </ol>
                <div
                  style={{
                    fontSize: 12,
                    color: THEME.textSecondary,
                    background: "var(--surface-1)",
                    padding: "8px 12px",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Lightbulb size={13} color={THEME.accent} style={{ flexShrink: 0 }} />
                  <span><strong>Password format:</strong> CDSL password is your 10-character PAN in UPPERCASE or DOB in DDMMYYYY.</span>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Success Alert Banner ─────────────────────────────────────── */}
      {importedSummary && (
        <Card
          style={{
            padding: 20,
            background: "color-mix(in srgb, var(--t-sage) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--t-sage) 35%, transparent)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "var(--t-sage)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CheckCircle size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--t-sage)",
                  marginBottom: 4,
                }}
              >
                Portfolio Successfully Synchronized!
              </div>
              <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.5 }}>
                Processed <strong>{importedSummary.newCount + importedSummary.updatedCount} funds</strong>{" "}
                totalling <strong>{fmtINRFull(importedSummary.totalValue)}</strong> in mutual fund assets.
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    marginTop: 8,
                    fontSize: 12,
                    color: THEME.textSecondary,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Sparkles size={12} color={THEME.accent} style={{ flexShrink: 0 }} />
                    <span><strong>{importedSummary.newCount}</strong> New holdings added</span>
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <RefreshCw size={12} color={THEME.accent} style={{ flexShrink: 0 }} />
                    <span><strong>{importedSummary.updatedCount}</strong> Existing holdings updated with latest NAV & units</span>
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setImportedSummary(null)}
                >
                  Import Another Statement
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Error Banner ────────────────────────────────────────────── */}
      {parseError && (
        <Card
          style={{
            padding: 16,
            background: "color-mix(in srgb, var(--t-rust) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--t-rust) 35%, transparent)",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
            role="alert"
            aria-live="assertive"
          >
            <AlertTriangle size={20} color="var(--t-rust)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t-rust)", marginBottom: 2 }}>
                Statement Parsing Note
              </div>
              <div style={{ color: "var(--t-rust)", fontSize: 13, lineHeight: 1.5 }}>
                {parseError}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Ingestion Station ────────────────────────────────────────── */}
      <Card style={{ padding: 24 }}>
        <div
          role="tablist"
          aria-label="Import method"
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 20,
            flexWrap: "wrap",
            borderBottom: "1px solid var(--t-line)",
            paddingBottom: 12,
          }}
        >
          {(
            [
              { id: "pdf", label: "Upload CAS PDF", icon: FileText },
              { id: "text", label: "Paste Statement Text", icon: Copy },
              { id: "csv", label: "Upload CSV / TXT", icon: Upload },
            ] as const
          ).map((m) => {
            const Icon = m.icon;
            const isSelected = parseMethod === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setParseMethod(m.id);
                  setParseError("");
                }}
                className="card-lift"
                role="tab"
                aria-selected={isSelected}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 18px",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  fontWeight: isSelected ? 700 : 500,
                  border: `1.5px solid ${isSelected ? THEME.accent : "var(--t-line)"}`,
                  background: isSelected
                    ? "color-mix(in srgb, var(--t-accent) 15%, transparent)"
                    : "var(--surface-0)",
                  color: isSelected ? THEME.accent : THEME.text,
                  fontSize: 13,
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={16} />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* ── Mode 1: PDF Drop Zone ── */}
        {parseMethod === "pdf" && (
          <div>
            <label
              htmlFor="cas-pdf-upload"
              className="card-lift"
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: "40px 24px",
                borderRadius: "var(--radius-lg)",
                border: `2px dashed ${pdfExtract.busy ? "var(--t-accent)" : "var(--t-line)"}`,
                background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
                cursor: pdfExtract.busy ? "wait" : "pointer",
                opacity: pdfExtract.busy ? 0.75 : 1,
                textAlign: "center",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {pdfExtract.busy ? (
                  <RefreshCw size={28} color={THEME.accent} className="animate-spin" />
                ) : (
                  <UploadCloud size={28} color={THEME.accent} />
                )}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text, marginBottom: 4 }}>
                  {pdfExtract.busy ? "Reading & Decoding PDF In-Memory…" : "Drop your CAMS or KFintech CAS PDF here"}
                </div>
                <div style={{ fontSize: 13, color: THEME.textSecondary, maxWidth: 500, margin: "0 auto" }}>
                  Supports password-protected CAS statements. Decrypted purely inside your browser memory using PDF.js WebAssembly — no data is transmitted over the internet.
                </div>
              </div>
              <div
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  background: "var(--surface-2)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: THEME.text,
                }}
              >
                Browse PDF File
              </div>
              <input
                id="cas-pdf-upload"
                type="file"
                accept=".pdf"
                disabled={pdfExtract.busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) pdfExtract.selectFile(file);
                  e.target.value = "";
                }}
                aria-label="Upload CAS PDF file"
                style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
              />
            </label>

            {pdfExtract.needsPassword && (
              <div style={{ marginTop: 16 }}>
                <PdfPasswordPrompt
                  fileName={pdfExtract.fileName}
                  incorrect={pdfExtract.passwordIncorrect}
                  busy={pdfExtract.busy}
                  onSubmit={pdfExtract.submitPassword}
                  onCancel={pdfExtract.cancelPassword}
                />
              </div>
            )}
            {pdfExtract.error && (
              <div
                role="alert"
                aria-live="assertive"
                style={{
                  marginTop: 14,
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "color-mix(in srgb, var(--t-rust) 12%, transparent)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--t-rust)",
                }}
              >
                {pdfExtract.error}
              </div>
            )}
          </div>
        )}

        {/* ── Mode 2: Raw Text Paste ── */}
        {parseMethod === "text" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: THEME.textSecondary }}>
                Paste the text content from your CAS PDF or TXT export:
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRawText("")}
                  disabled={!rawText}
                  style={{ fontSize: 11 }}
                >
                  Clear Text
                </Button>
              </div>
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={10}
              aria-label="CAS statement text"
              placeholder="Paste CAS statement text here... (e.g. Folio No: 123456, HDFC Flexi Cap Fund - Direct Growth, Closing Unit Balance: 485.62, NAV on ... INR 1845.32)"
              className="form-input"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                resize: "vertical",
                lineHeight: 1.6,
                background: "var(--surface-0)",
                border: "1px solid var(--t-line)",
                borderRadius: "var(--radius-md)",
                padding: 12,
                width: "100%",
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePaste}
                disabled={!rawText.trim()}
              >
                Parse CAS Text
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadSample}
              >
                Insert Sample Data
              </Button>
              <span style={{ fontSize: 11, color: THEME.textSecondary }}>
                {rawText ? `${rawText.split("\n").length} lines loaded` : "No text loaded"}
              </span>
            </div>
          </div>
        )}

        {/* ── Mode 3: CSV Spreadsheet Drop ── */}
        {parseMethod === "csv" && (
          <div>
            <label
              htmlFor="cas-csv-upload"
              className="card-lift"
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: "36px 20px",
                borderRadius: "var(--radius-lg)",
                border: `2px dashed ${csvInputFocused ? "var(--t-accent)" : "var(--t-line)"}`,
                background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
                boxShadow: csvInputFocused ? "var(--shadow-focus)" : "none",
                cursor: csvParsing ? "wait" : "pointer",
                opacity: csvParsing ? 0.7 : 1,
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {csvParsing ? (
                  <RefreshCw size={26} color={THEME.accent} className="animate-spin" />
                ) : (
                  <Upload size={26} color={THEME.accent} />
                )}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text, marginBottom: 4 }}>
                  {csvParsing ? "Parsing CSV Rows…" : "Upload CSV or TXT Spreadsheet"}
                </div>
                <div style={{ fontSize: 12, color: THEME.textSecondary, maxWidth: 460, margin: "0 auto" }}>
                  Expected columns: Scheme / Fund Name, Folio No (optional), Units, NAV (optional), Current Value
                </div>
              </div>
              <input
                id="cas-csv-upload"
                type="file"
                accept=".csv,.txt"
                onChange={handleCSV}
                onFocus={() => setCsvInputFocused(true)}
                onBlur={() => setCsvInputFocused(false)}
                disabled={csvParsing}
                aria-label="Upload CAS CSV file"
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  opacity: 0,
                }}
              />
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 14,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 12, color: THEME.textSecondary }}>
                Need a starting point? Download our pre-formatted template:
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSampleCsv}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
              >
                <Download size={13} />
                Download Sample CSV Template
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Reconciled Preview & Analytics ────────────────────────────── */}
      {parsedFunds.length > 0 && (
        <>
          {/* ── Summary StatCards ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            <StatCard
              label="Funds Ingested"
              value={reconciledFunds.length.toLocaleString("en-IN")}
              numericValue={reconciledFunds.length}
              formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
              icon={<Briefcase />}
              color={THEME.accent}
              subtext={`${stats.newCount} New • ${stats.updateCount} Updates`}
            />
            <StatCard
              label="Selected for Import"
              value={stats.selectedCount.toLocaleString("en-IN")}
              numericValue={stats.selectedCount}
              formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
              icon={<CheckSquare />}
              color="var(--t-sage)"
              subtext={`Total ${reconciledFunds.length} parsed`}
            />
            <StatCard
              label="CAS Statement Value"
              value={fmtINRFull(stats.totalValue)}
              numericValue={stats.totalValue}
              formatValue={fmtINRFull}
              icon={<IndianRupee />}
              color={THEME.accent}
              subtext="Combined valuation"
            />
            <StatCard
              label="Projected Portfolio Value"
              value={fmtINRFull(existingPortfolioValue + stats.totalValue)}
              numericValue={existingPortfolioValue + stats.totalValue}
              formatValue={fmtINRFull}
              icon={<TrendingUp />}
              color="var(--t-gold)"
              subtext={`Current: ${fmtINR(existingPortfolioValue)}`}
            />
          </div>

          {/* ── Asset Allocation Bar & AMC Distribution ── */}
          <Card style={{ padding: 22 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PieChart size={18} color={THEME.accent} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: THEME.text }}>
                  Asset Allocation & Fund House Footprint
                </h3>
              </div>
              <span style={{ fontSize: 12, color: THEME.textSecondary }}>
                Based on selected holdings ({fmtINRFull(stats.totalValue)})
              </span>
            </div>

            {/* Visual Asset Allocation Progress Bar */}
            {stats.totalValue > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div
                  style={{
                    display: "flex",
                    height: 12,
                    borderRadius: 999,
                    overflow: "hidden",
                    background: "var(--surface-2)",
                    marginBottom: 10,
                  }}
                >
                  {Object.entries(stats.byCat).map(([cat, info]) => {
                    const pct = (info.value / stats.totalValue) * 100;
                    if (pct <= 0) return null;
                    const color = CATEGORY_COLORS[cat] || "var(--t-muted)";
                    return (
                      <div
                        key={cat}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: color,
                          transition: "width 0.3s ease",
                        }}
                        title={`${cat}: ${pct.toFixed(1)}% (${fmtINRFull(info.value)})`}
                      />
                    );
                  })}
                </div>

                {/* Category Chips */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {Object.entries(stats.byCat)
                    .sort((a, b) => b[1].value - a[1].value)
                    .map(([cat, info]) => {
                      const pct = stats.totalValue > 0 ? (info.value / stats.totalValue) * 100 : 0;
                      const color = CATEGORY_COLORS[cat] || "var(--t-muted)";
                      return (
                        <div
                          key={cat}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 12px",
                            borderRadius: "var(--radius-md)",
                            background: "var(--surface-1)",
                            border: "1px solid var(--t-line)",
                            fontSize: 12,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              backgroundColor: color,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontWeight: 600, color: THEME.text }}>{cat}</span>
                          <span style={{ color: THEME.textSecondary }}>{pct.toFixed(1)}%</span>
                          <span style={{ fontWeight: 700, color: THEME.text }}>
                            <Money value={info.value} variant="full" />
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* AMC Footprint Chips */}
            {Object.keys(stats.byAmc).length > 0 && (
              <div
                style={{
                  borderTop: "1px solid var(--t-line)",
                  paddingTop: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: THEME.textSecondary,
                  }}
                >
                  Fund Houses Identified:
                </span>
                {Object.entries(stats.byAmc)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([amc, info]) => (
                    <span
                      key={amc}
                      style={{
                        padding: "3px 10px",
                        borderRadius: "var(--radius-sm)",
                        background: "color-mix(in srgb, var(--surface-2) 70%, transparent)",
                        border: "1px solid var(--t-line)",
                        fontSize: 11,
                        fontWeight: 600,
                        color: THEME.text,
                      }}
                    >
                      {amc} <span style={{ color: THEME.textSecondary }}>({info.count})</span>
                    </span>
                  ))}
              </div>
            )}
          </Card>

          {/* ── Holdings Table & Batch Control Station ─────────────────── */}
          <Card style={{ padding: 22 }}>
            {/* Action Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 14,
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 700, color: THEME.text }}>
                  Statement Holdings Reconciler
                </h3>
                <div style={{ fontSize: 12, color: THEME.textSecondary }}>
                  Review scheme classifications, folios, and match statuses before importing.
                </div>
              </div>

              {/* Owner Select & Main Commit Button */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: THEME.textSecondary,
                  }}
                >
                  Default Profile Owner:
                  <select
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    disabled={importing}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "5px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: `1px solid ${THEME.border}`,
                      background: "var(--surface-0)",
                      color: THEME.text,
                    }}
                  >
                    {familyProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {formatProfileOption(p)}
                      </option>
                    ))}
                  </select>
                </label>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleImportSelected}
                  loading={importing}
                  disabled={stats.selectedCount === 0}
                  style={{ minWidth: 170 }}
                >
                  {importing
                    ? importProgress
                      ? `Syncing ${importProgress.done}/${importProgress.total}…`
                      : "Syncing…"
                    : `Sync ${stats.selectedCount} Holdings`}
                </Button>
              </div>
            </div>

            {/* Filter, Search & Bulk Actions Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
                flexWrap: "wrap",
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-1)",
                border: "1px solid var(--t-line)",
              }}
            >
              {/* Search Box */}
              <div style={{ position: "relative", minWidth: 240, flex: "1 1 240px" }}>
                <Search
                  size={14}
                  color={THEME.textSecondary}
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  placeholder="Search scheme, folio, or AMC…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "6px 10px 6px 32px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--t-line)",
                    background: "var(--surface-0)",
                    color: THEME.text,
                    fontSize: 12,
                  }}
                />
              </div>

              {/* Match Status Filters */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: THEME.textSecondary }}>Status:</span>
                {[
                  { id: "all", label: `All (${reconciledFunds.length})` },
                  { id: "new", label: `New Only (${reconciledFunds.filter((f) => f.matchType === "none").length})` },
                  { id: "update", label: `Updates Only (${reconciledFunds.filter((f) => f.matchType !== "none").length})` },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedMatchFilter(s.id as any)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 11,
                      fontWeight: selectedMatchFilter === s.id ? 700 : 500,
                      border: `1px solid ${
                        selectedMatchFilter === s.id ? THEME.accent : "var(--t-line)"
                      }`,
                      background:
                        selectedMatchFilter === s.id
                          ? "color-mix(in srgb, var(--t-accent) 15%, transparent)"
                          : "var(--surface-0)",
                      color: selectedMatchFilter === s.id ? THEME.accent : THEME.textSecondary,
                      cursor: "pointer",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Bulk Select Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAllSelected(true)}
                  style={{ fontSize: 11, padding: "4px 8px" }}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAllSelected(false)}
                  style={{ fontSize: 11, padding: "4px 8px" }}
                >
                  Deselect All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectOnlyNew}
                  style={{ fontSize: 11, padding: "4px 8px" }}
                >
                  Select New
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectOnlyUpdates}
                  style={{ fontSize: 11, padding: "4px 8px" }}
                >
                  Select Updates
                </Button>
              </div>
            </div>

            {/* Reconciled Table */}
            <div style={{ overflowX: "auto", maxHeight: 520, overflowY: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: 800,
                  borderCollapse: "collapse",
                  fontSize: 12.5,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: `2px solid var(--t-line)`,
                      position: "sticky",
                      top: 0,
                      background: "var(--t-card-bg)",
                      zIndex: 2,
                    }}
                  >
                    <th style={{ padding: "10px 8px", textAlign: "left", width: 36 }}>
                      <input
                        type="checkbox"
                        checked={
                          filteredFunds.length > 0 && filteredFunds.every((f) => f.selected)
                        }
                        onChange={() => {
                          const allSelected = filteredFunds.every((f) => f.selected);
                          setParsedFunds((prev) =>
                            prev.map((f) =>
                              filteredFunds.some((ff) => ff.id === f.id)
                                ? { ...f, selected: !allSelected }
                                : f
                            )
                          );
                        }}
                        disabled={importing}
                        aria-label="Select or deselect all visible funds"
                      />
                    </th>
                    <th style={{ padding: "10px 8px", textAlign: "left", color: THEME.textSecondary }}>
                      Scheme & AMC
                    </th>
                    <th style={{ padding: "10px 8px", textAlign: "left", color: THEME.textSecondary, width: 120 }}>
                      Folio No.
                    </th>
                    <th style={{ padding: "10px 8px", textAlign: "left", color: THEME.textSecondary, width: 110 }}>
                      Category
                    </th>
                    <th style={{ padding: "10px 8px", textAlign: "left", color: THEME.textSecondary, width: 140 }}>
                      Match Status
                    </th>
                    <th style={{ padding: "10px 8px", textAlign: "right", color: THEME.textSecondary, width: 90 }}>
                      Units
                    </th>
                    <th style={{ padding: "10px 8px", textAlign: "right", color: THEME.textSecondary, width: 90 }}>
                      NAV (₹)
                    </th>
                    <th style={{ padding: "10px 8px", textAlign: "right", color: THEME.textSecondary, width: 110 }}>
                      Valuation (₹)
                    </th>
                    <th style={{ padding: "10px 8px", textAlign: "center", color: THEME.textSecondary, width: 50 }}>
                      Edit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFunds.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: 32, color: THEME.textSecondary }}>
                        No holdings match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredFunds.map((f) => {
                      const isEditing = editingHoldingId === f.id;
                      const isNew = f.matchType === "none";
                      const hasFolioMatch = f.matchType === "folio";
                      const existingUnits = f.existingHolding ? parseFloat(f.existingHolding.units || "0") : 0;
                      const unitsDelta = f.existingHolding ? f.units - existingUnits : 0;

                      return (
                        <tr
                          key={f.id}
                          className="table-row-hover"
                          style={{
                            borderBottom: `1px solid var(--t-line)`,
                            background: f.selected
                              ? undefined
                              : "color-mix(in srgb, var(--surface-1) 40%, transparent)",
                            opacity: f.selected ? 1 : 0.65,
                          }}
                        >
                          {/* Checkbox */}
                          <td style={{ padding: "10px 8px" }}>
                            <input
                              type="checkbox"
                              checked={f.selected}
                              disabled={importing}
                              aria-label={`Select ${f.scheme}`}
                              onChange={() => toggleSelection(f.id)}
                            />
                          </td>

                          {/* Scheme Name & AMC */}
                          <td style={{ padding: "10px 8px", maxWidth: 320 }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={f.scheme}
                                onChange={(e) => updateParsedHolding(f.id, { scheme: e.target.value })}
                                style={{
                                  width: "100%",
                                  fontSize: 12,
                                  padding: "4px 8px",
                                  borderRadius: 4,
                                  border: "1px solid var(--t-line)",
                                  background: "var(--surface-0)",
                                  color: THEME.text,
                                }}
                              />
                            ) : (
                              <div>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    color: THEME.text,
                                    lineHeight: 1.3,
                                  }}
                                  title={f.scheme}
                                >
                                  {f.scheme}
                                </div>
                                {f.amc && (
                                  <div style={{ fontSize: 11, color: THEME.textSecondary, marginTop: 2 }}>
                                    {f.amc}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Folio */}
                          <td style={{ padding: "10px 8px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={f.folio}
                                onChange={(e) => updateParsedHolding(f.id, { folio: e.target.value })}
                                style={{
                                  width: "100%",
                                  fontSize: 12,
                                  padding: "4px 8px",
                                  borderRadius: 4,
                                  border: "1px solid var(--t-line)",
                                  background: "var(--surface-0)",
                                  color: THEME.text,
                                }}
                              />
                            ) : (
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: THEME.textSecondary }}>
                                {f.folio || "—"}
                              </span>
                            )}
                          </td>

                          {/* Category Tag */}
                          <td style={{ padding: "10px 8px" }}>
                            {isEditing ? (
                              <select
                                value={f.category}
                                onChange={(e) => updateParsedHolding(f.id, { category: e.target.value })}
                                style={{
                                  fontSize: 11,
                                  padding: "4px 6px",
                                  borderRadius: 4,
                                  border: "1px solid var(--t-line)",
                                  background: "var(--surface-0)",
                                  color: THEME.text,
                                }}
                              >
                                {["Equity", "Debt", "Hybrid", "ELSS", "Liquid", "Gold/Commodity", "Other"].map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: "var(--radius-xs)",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: `color-mix(in srgb, ${CATEGORY_COLORS[f.category] || "var(--t-muted)"} 15%, transparent)`,
                                  color: CATEGORY_COLORS[f.category] || THEME.text,
                                }}
                              >
                                {f.category}
                              </span>
                            )}
                          </td>

                          {/* Match Status Badge */}
                          <td style={{ padding: "10px 8px" }}>
                            {isNew ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "3px 8px",
                                  borderRadius: 999,
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  background: "color-mix(in srgb, var(--t-sage) 15%, transparent)",
                                  color: "var(--t-sage)",
                                }}
                              >
                                <Sparkles size={11} />
                                New Fund
                              </span>
                            ) : hasFolioMatch ? (
                              <div>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "2px 8px",
                                    borderRadius: 999,
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    background: "color-mix(in srgb, var(--t-gold) 15%, transparent)",
                                    color: "var(--t-gold)",
                                  }}
                                >
                                  <RefreshCw size={10} />
                                  Folio Match
                                </span>
                                {Math.abs(unitsDelta) > 0.001 && (
                                  <div
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      color: unitsDelta > 0 ? "var(--t-sage)" : "var(--t-rust)",
                                      marginTop: 2,
                                    }}
                                  >
                                    {unitsDelta > 0 ? `+${unitsDelta.toFixed(3)}` : unitsDelta.toFixed(3)} units
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  background: "color-mix(in srgb, var(--t-accent) 15%, transparent)",
                                  color: THEME.accent,
                                }}
                              >
                                Name Match
                              </span>
                            )}
                          </td>

                          {/* Units */}
                          <td style={{ padding: "10px 8px", textAlign: "right" }}>
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.001"
                                value={f.units}
                                onChange={(e) =>
                                  updateParsedHolding(f.id, { units: parseFloat(e.target.value) || 0 })
                                }
                                style={{
                                  width: 70,
                                  fontSize: 12,
                                  padding: "4px 6px",
                                  textAlign: "right",
                                  borderRadius: 4,
                                  border: "1px solid var(--t-line)",
                                  background: "var(--surface-0)",
                                  color: THEME.text,
                                }}
                              />
                            ) : (
                              <span style={{ fontWeight: 600 }}>{f.units.toFixed(3)}</span>
                            )}
                          </td>

                          {/* NAV */}
                          <td style={{ padding: "10px 8px", textAlign: "right" }}>
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={f.nav}
                                onChange={(e) =>
                                  updateParsedHolding(f.id, { nav: parseFloat(e.target.value) || 0 })
                                }
                                style={{
                                  width: 70,
                                  fontSize: 12,
                                  padding: "4px 6px",
                                  textAlign: "right",
                                  borderRadius: 4,
                                  border: "1px solid var(--t-line)",
                                  background: "var(--surface-0)",
                                  color: THEME.text,
                                }}
                              />
                            ) : (
                              <span>₹{f.nav.toFixed(2)}</span>
                            )}
                          </td>

                          {/* Valuation */}
                          <td
                            style={{
                              padding: "10px 8px",
                              textAlign: "right",
                              fontWeight: 700,
                              color: THEME.text,
                            }}
                          >
                            <Money value={f.value} variant="full" />
                          </td>

                          {/* Quick Inline Edit Button */}
                          <td style={{ padding: "10px 8px", textAlign: "center" }}>
                            <button
                              onClick={() => setEditingHoldingId(isEditing ? null : f.id)}
                              style={{
                                border: "none",
                                background: isEditing ? THEME.accent : "transparent",
                                color: isEditing ? "#fff" : THEME.textSecondary,
                                padding: "4px 6px",
                                borderRadius: 4,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              aria-label={isEditing ? "Save inline edits" : "Edit holding"}
                            >
                              {isEditing ? <Check size={13} /> : <Edit3 size={13} />}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ── Empty State ──────────────────────────────────────────────── */}
      {parsedFunds.length === 0 && !importedSummary && (
        <EmptyState
          icon={Upload}
          title="Import Consolidated Mutual Fund Statement"
          pills={["CAMS CAS", "KFintech CAS", "MF Central", "PDF Decryption"]}
          description="Upload your official Consolidated Account Statement (CAS) PDF, paste statement text, or import a CSV file. The smart engine automatically decodes folios, closing units, NAVs, and categories with zero server-side exposure."
        />
      )}
    </div>
  );
};
