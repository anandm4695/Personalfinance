// @ts-nocheck
import React, { useState, useRef } from "react";
import { Download, Upload, Zap, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { Modal, ModalActions } from "../ui/Modal";
import { THEME } from "../../utils/constants";
import { fmtINRFull, uid } from "../../utils/finance";

interface CsvImportModalProps {
  accounts: any[];
  existingTransactions?: any[];
  onClose: () => void;
  onImport: (data: any[]) => void;
}

const CATEGORIES = [
  "Salary",
  "Food",
  "Rent",
  "Transport",
  "Shopping",
  "Bills",
  "Investment",
  "Tax",
  "Medical",
  "Entertainment",
  "EMI",
  "Groceries",
  "Utilities",
  "Transfer",
  "Cash",
  "Other",
];

/* ── Smart Import: Bank-specific column profiles ─────────────────── */
const BANK_PROFILES = [
  {
    bank: "SBI",
    date: ["txn date", "transaction date", "value date"],
    desc: ["description", "narration"],
    debit: ["debit", "debit amount"],
    credit: ["credit", "credit amount"],
    balance: ["balance", "closing balance"],
  },
  {
    bank: "HDFC",
    date: ["date", "value date"],
    desc: ["narration", "description"],
    debit: ["withdrawal amt", "withdrawal amount", "debit"],
    credit: ["deposit amt", "deposit amount", "credit"],
    balance: ["closing balance", "balance"],
  },
  {
    bank: "ICICI",
    date: ["transaction date", "date", "value date"],
    desc: ["transaction remarks", "remarks", "narration"],
    debit: ["withdrawal amount", "withdrawal amt", "debit"],
    credit: ["deposit amount", "deposit amt", "credit"],
    balance: ["balance"],
  },
  {
    bank: "Axis",
    date: ["tran date", "date", "transaction date"],
    desc: ["particulars", "narration", "description"],
    debit: ["dr", "debit", "withdrawal"],
    credit: ["cr", "credit", "deposit"],
    balance: ["bal", "balance"],
  },
  {
    bank: "Kotak",
    date: ["date", "transaction date", "value date"],
    desc: ["description", "narration", "particulars"],
    debit: ["debit", "withdrawal", "dr"],
    credit: ["credit", "deposit", "cr"],
    balance: ["balance", "closing balance"],
  },
];

/* Generic fallback keywords */
const GENERIC_KEYWORDS = {
  date: ["date", "txn date", "tran date", "transaction date", "value date"],
  desc: ["narration", "description", "particulars", "remarks", "desc"],
  debit: ["debit", "withdrawal", "dr", "withdrawal amt", "withdrawal amount"],
  credit: ["credit", "deposit", "cr", "deposit amt", "deposit amount"],
  balance: ["balance", "bal", "closing balance"],
};

/* ── Auto-categorize by narration keywords ───────────────────────── */
const categorizeByNarration = (narration: string): string => {
  const n = (narration || "").toUpperCase();
  if (/\b(SALARY|SAL\b|PAYROLL)/.test(n)) return "Salary";
  if (/\b(RENT)\b/.test(n)) return "Rent";
  if (/\b(EMI|LOAN)\b/.test(n)) return "EMI";
  if (/\b(SWIGGY|ZOMATO|FOOD|RESTAURANT|CAFE|DINING|DOMINOS|MCDONALDS)/.test(n)) return "Food";
  if (/\b(AMAZON|FLIPKART|MYNTRA|AJIO|MEESHO|NYKAA|SHOPPING)/.test(n)) return "Shopping";
  if (/\b(MUTUAL FUND|SIP|MF PURCHASE|BSE|NSE|ZERODHA|GROWW|KUVERA|NPS|PPF)/.test(n)) return "Investment";
  if (/\b(ATM|CASH WITHDRAWAL|CASH WDL)/.test(n)) return "Cash";
  if (/\b(UPI|IMPS|NEFT|RTGS)/.test(n)) return "Transfer";
  if (/\b(ELECTRIC|WATER|GAS|BROADBAND|WIFI|INTERNET|MOBILE|RECHARGE|DTH|JIO|AIRTEL|BSNL)/.test(n)) return "Utilities";
  if (/\b(INSURANCE|LIC|PREMIUM)/.test(n)) return "Bills";
  if (/\b(HOSPITAL|MEDICAL|PHARMACY|DOCTOR|HEALTH|APOLLO|1MG|NETMEDS|PRACTO)/.test(n)) return "Medical";
  if (/\b(NETFLIX|HOTSTAR|SPOTIFY|MOVIE|THEATRE|BOOKMYSHOW)/.test(n)) return "Entertainment";
  if (/\b(UBER|OLA|METRO|PETROL|FUEL|DIESEL|PARKING|TOLL|RAPIDO)/.test(n)) return "Transport";
  if (/\b(GROCER|BIGBASKET|BLINKIT|DMART|INSTAMART|ZEPTO|RELIANCE.*FRESH)/.test(n)) return "Groceries";
  if (/\b(TAX|TDS|GST|IT DEPT|INCOME TAX)/.test(n)) return "Tax";
  return "Other";
};

/* ── Parse date from various bank formats ────────────────────────── */
const parseSmartDate = (dateStr: string): string | null => {
  if (!dateStr) return null;
  let d = dateStr.trim();

  // Extract date part if it has a time suffix (e.g., "02/07/2026 23:59:07" or "2026-07-02T12:00:00Z")
  const spaceIdx = d.indexOf(" ");
  if (spaceIdx > 0) {
    d = d.slice(0, spaceIdx);
  } else {
    const tIdx = d.indexOf("T");
    if (tIdx > 0 && d.length > 10) {
      d = d.slice(0, tIdx);
    }
  }

  d = d.replace(/\//g, "-");

  // YYYY-MM-DD or YYYY-M-D
  const ymd = d.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;

  // DD-MM-YYYY or DD-M-YYYY or D-M-YYYY
  const dmy = d.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  // DD-MM-YY (two-digit year)
  const dmy2 = d.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
  if (dmy2) {
    const yr = parseInt(dmy2[3]) > 50 ? `19${dmy2[3]}` : `20${dmy2[3].padStart(2, "0")}`;
    return `${yr}-${dmy2[2].padStart(2, "0")}-${dmy2[1].padStart(2, "0")}`;
  }

  // DD-Mon-YYYY or DD/Mon/YYYY or DD Mon YYYY
  const MONTHS: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const dMonY = d.match(/^(\d{1,2})-?(\w{3})-?(\d{2,4})$/i);
  if (dMonY) {
    const month = MONTHS[dMonY[2].toLowerCase()];
    if (month) {
      const year = dMonY[3].length === 2 ? "20" + dMonY[3] : dMonY[3];
      return `${year}-${month}-${dMonY[1].padStart(2, "0")}`;
    }
  }

  // DD MMM YYYY (space-separated)
  const dMonYSpace = dateStr.trim().match(/^(\d{1,2})\s+(\w{3})\s+(\d{2,4})$/i);
  if (dMonYSpace) {
    const month = MONTHS[dMonYSpace[2].toLowerCase()];
    if (month) {
      const year = dMonYSpace[3].length === 2 ? "20" + dMonYSpace[3] : dMonYSpace[3];
      return `${year}-${month}-${dMonYSpace[1].padStart(2, "0")}`;
    }
  }

  // Fallback: try native Date parse
  const parsed = new Date(dateStr.trim());
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
};

/* ── Proper CSV row parser (handles quoted commas) ────────────────── */
const splitCSVRow = (line: string, delimiter = ","): string[] => {
  const vals: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === delimiter && !inQuotes) { vals.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  vals.push(current.trim());
  return vals;
};

/* Many Indian banks' "Excel" statement download (HDFC, SBI, etc.) is actually
   an HTML table saved with a .xls extension, not a real spreadsheet — detect
   and convert it to CSV-style lines so it parses like any other export. */
const isHtmlTable = (text: string): boolean => /<table[\s>]/i.test(text.slice(0, 5000));

const htmlTableToCsvLines = (html: string): string[] => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll("tr"))
    .map((tr) =>
      Array.from(tr.querySelectorAll("td,th"))
        .map((cell) => (cell.textContent || "").replace(/\s+/g, " ").trim().replace(/,/g, ""))
        .join(",")
    )
    .filter((line) => line.replace(/,/g, "").trim().length > 0);
};

/* Real binary spreadsheets (.xlsx/.xls) are ZIP/OLE containers, not text —
   FileReader.readAsText garbles them. Catch this before it produces a
   confusing "no rows found" error. */
const isBinarySpreadsheet = (text: string): boolean =>
  text.startsWith("PK\x03\x04") || text.startsWith("\xD0\xCF\x11\xE0");

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ accounts, existingTransactions = [], onClose, onImport }) => {
  const [mode, setMode] = useState<"template" | "smart">("smart");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState("");

  /* ── Smart Import state ──────────────────────────────────────────── */
  const [smartFile, setSmartFile] = useState<File | null>(null);
  const [smartPreview, setSmartPreview] = useState<any[]>([]);
  const [smartError, setSmartError] = useState("");
  const [detectedBank, setDetectedBank] = useState("");
  const [smartAccountId, setSmartAccountId] = useState(accounts[0]?.id || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const firstAccountId = accounts[0]?.id || "account-id-here";

  const downloadTemplate = () => {
    const accountRef =
      accounts.length > 0
        ? accounts
            .map((a) =>
              `#   ${a.id}  →  ${a.bankName || a.name || "Account"} (${a.accountNumber || ""})`.trimEnd()
            )
            .join("\n")
        : "#   (no accounts found — add a bank account first)";

    const lines = [
      "# Bank Transaction Import Template",
      "# Columns: date, amount, type, category, note, narration, referenceNumber, accountId",
      "#",
      "# date            → YYYY-MM-DD format",
      "# amount          → number only, no ₹ symbol or commas  (e.g. 120000)",
      "# type            → credit  OR  debit",
      `# category        → one of: ${CATEGORIES.join(", ")}`,
      "# note            → optional description",
      "# narration       → optional bank description (e.g. UPI/HDFC/REF123)",
      "# referenceNumber → optional cheque or reference number",
      "# accountId       → copy the ID for the account from the list below:",
      "#",
      accountRef,
      "#",
      "date,amount,type,category,note,narration,referenceNumber,accountId",
      `2025-04-01,120000,credit,Salary,April 2025 salary,,,${firstAccountId}`,
      `2025-04-05,15000,debit,Rent,House rent April,,,${firstAccountId}`,
      `2025-04-10,3500,debit,Groceries,Monthly groceries,,,${firstAccountId}`,
      `2025-04-15,500,debit,Food,Lunch with team,,,${firstAccountId}`,
      `2025-04-20,50000,debit,Investment,SIP mutual fund,,,${firstAccountId}`,
      `2025-04-25,2000,debit,Transport,Fuel & cab,,,${firstAccountId}`,
    ].join("\n");

    const blob = new Blob([lines], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bank_transactions_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = () => {
    setError("");
    try {
      const lines = csvText
        .trim()
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#"));
      if (lines.length === 0) {
        setError("Paste at least one row.");
        return;
      }
      const dataLines = lines[0].toLowerCase().startsWith("date") ? lines.slice(1) : lines;
      if (dataLines.length === 0) {
        setError("No data rows found — paste rows below the header.");
        return;
      }
      const rows = dataLines.map((line, i) => {
        const parts = splitCSVRow(line);
        if (parts.length < 4)
          throw new Error(`Row ${i + 1}: need at least date, amount, type, category`);
        const date = parts[0];
        const amount = parts[1];
        const type = parts[2];
        const category = parts[3];
        const note = parts[4];
        const narration = parts[5];
        let referenceNumber = "";
        let accountId = "";

        if (parts.length >= 8) {
          referenceNumber = parts[6] || "";
          accountId = parts[7] || firstAccountId;
        } else {
          accountId = parts[6] || firstAccountId;
        }

        if (!date.match(/^\d{4}-\d{2}-\d{2}$/))
          throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD (got "${date}")`);
        const d = new Date(date);
        if (isNaN(d.getTime())) throw new Error(`Row ${i + 1}: invalid date "${date}"`);
        if (!["credit", "debit"].includes(type.toLowerCase()))
          throw new Error(`Row ${i + 1}: type must be "credit" or "debit" (got "${type}")`);
        const parsedAmount = Number(amount.replace(/,/g, ""));
        if (isNaN(parsedAmount) || parsedAmount <= 0)
          throw new Error(`Row ${i + 1}: amount must be a positive number (got "${amount}")`);
        return {
          date,
          amount: String(parsedAmount),
          type: type.toLowerCase(),
          category: category || "Other",
          note: note || "",
          narration: narration || "",
          referenceNumber,
          accountId,
        };
      });
      setPreview(rows);
    } catch (e: any) {
      setError(e.message);
      setPreview([]);
    }
  };

  /* ── Duplicate detection ─────────────────────────────────────────── */
  const isDuplicate = (row: any): boolean => {
    return existingTransactions.some(
      (e) => e.date === row.date && Math.abs(Number(e.amount) - Number(row.amount)) < 1 && e.type === row.type
    );
  };

  /* ── Smart Import: parse uploaded bank CSV ─────────────────────── */
  const parseSmartCSV = (text: string) => {
    setSmartError("");
    setSmartPreview([]);
    setDetectedBank("");

    try {
      // Strip UTF-8 BOM if present
      const cleanText = text.replace(/^\uFEFF/, "");

      if (isBinarySpreadsheet(cleanText)) {
        setSmartError(
          "This is a real Excel (.xlsx/.xls) file, which can't be read as text. In Excel/Sheets, use \"Save As\" or \"Download\" → CSV, or use the CSV option on your bank's statement page, then upload that file instead."
        );
        return;
      }

      // Many bank "Excel" downloads are actually an HTML table with a .xls
      // extension — convert it to CSV-style lines before parsing.
      const workingText = isHtmlTable(cleanText) ? htmlTableToCsvLines(cleanText).join("\n") : cleanText;

      const rawLines = workingText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (rawLines.length < 2) {
        setSmartError("CSV must have a header row and at least one data row.");
        return;
      }

      // Real bank exports (HDFC/ICICI/SBI/Axis/Kotak) prepend several lines of
      // account/statement metadata before the actual column header row, so scan
      // for the header instead of assuming it's line 1.
      const scanLimit = Math.min(rawLines.length - 1, 20);
      let headerIdx = -1;
      let delimiter = ",";
      let dateIdx = -1, descIdx = -1, debitIdx = -1, creditIdx = -1, balIdx = -1, amountIdx = -1, typeIdx = -1;
      let matchedBank = "";

      for (let li = 0; li <= scanLimit; li++) {
        const line = rawLines[li];
        // Count frequencies of potential delimiters
        const commaCount = (line.match(/,/g) || []).length;
        const semiCount = (line.match(/;/g) || []).length;
        const tabCount = (line.match(/\t/g) || []).length;

        let candidateDelimiter = ",";
        if (tabCount > commaCount && tabCount > semiCount) {
          candidateDelimiter = "\t";
        } else if (semiCount > commaCount && semiCount > tabCount) {
          candidateDelimiter = ";";
        }

        const headers = splitCSVRow(line, candidateDelimiter).map((h) => h.toLowerCase().trim());

        let dI = -1, nI = -1, drI = -1, crI = -1, bI = -1, amtI = -1, tI = -1, bank = "";

        for (const profile of BANK_PROFILES) {
          const pdI = headers.findIndex((h) => profile.date.includes(h));
          const pnI = headers.findIndex((h) => profile.desc.includes(h));
          const pdrI = headers.findIndex((h) => profile.debit.includes(h));
          const pcrI = headers.findIndex((h) => profile.credit.includes(h));
          if (pdI >= 0 && pnI >= 0 && (pdrI >= 0 || pcrI >= 0)) {
            dI = pdI;
            nI = pnI;
            drI = pdrI;
            crI = pcrI;
            bI = headers.findIndex((h) => profile.balance.includes(h));
            bank = profile.bank;
            break;
          }
        }

        if (dI < 0) {
          const gdI = headers.findIndex((h) => GENERIC_KEYWORDS.date.some((k) => h.includes(k)));
          const gnI = headers.findIndex((h) => GENERIC_KEYWORDS.desc.some((k) => h.includes(k)));
          const gdrI = headers.findIndex((h) => GENERIC_KEYWORDS.debit.some((k) => h.includes(k)));
          const gcrI = headers.findIndex((h) => GENERIC_KEYWORDS.credit.some((k) => h.includes(k)));
          const gamtI = headers.findIndex((h) => ["amount", "amt", "transaction amount", "txn amount", "net amount"].some((k) => h.includes(k)));
          const gtypeI = headers.findIndex((h) => ["type", "cr/dr", "dr/cr", "cr_dr", "transaction type", "txntype", "db/cr"].some((k) => h.includes(k)));

          if (gdI >= 0 && gnI >= 0 && (gdrI >= 0 || gcrI >= 0 || gamtI >= 0)) {
            dI = gdI;
            nI = gnI;
            drI = gdrI;
            crI = gcrI;
            amtI = gamtI;
            tI = gtypeI;
            bI = headers.findIndex((h) => GENERIC_KEYWORDS.balance.some((k) => h.includes(k)));
            bank = "Auto-detected";
          }
        }

        if (dI >= 0 && nI >= 0 && (drI >= 0 || crI >= 0 || amtI >= 0)) {
          headerIdx = li;
          delimiter = candidateDelimiter;
          dateIdx = dI;
          descIdx = nI;
          debitIdx = drI;
          creditIdx = crI;
          amountIdx = amtI;
          typeIdx = tI;
          balIdx = bI;
          matchedBank = bank;
          break;
        }
      }

      if (headerIdx < 0) {
        setSmartError("Could not detect a header row with date, description, and debit/credit columns. Ensure your CSV includes the column headers exported by your bank (e.g. 'Date', 'Narration', 'Withdrawal Amt', 'Deposit Amt').");
        return;
      }

      setDetectedBank(matchedBank);

      const dataLines = rawLines.slice(headerIdx + 1);
      const rows: any[] = [];

      const cleanNumeric = (valStr: string): number => {
        if (!valStr) return 0;
        const cleaned = valStr.replace(/[₹$€£\s,]/g, "").trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };

      for (let i = 0; i < dataLines.length; i++) {
        const cols = splitCSVRow(dataLines[i], delimiter);
        const rawDate = cols[dateIdx] || "";
        const isoDate = parseSmartDate(rawDate);
        if (!isoDate) continue;

        const narration = cols[descIdx] || "";
        let amount = 0;
        let isCredit = false;

        if (amountIdx >= 0) {
          const rawAmt = cleanNumeric(cols[amountIdx] || "0");
          if (rawAmt === 0) continue;
          amount = Math.abs(rawAmt);
          if (typeIdx >= 0) {
            const rawType = (cols[typeIdx] || "").toLowerCase().trim();
            isCredit = rawType.includes("credit") || rawType.includes("cr") || rawType === "c" || rawType.includes("dep") || rawType.includes("in");
          } else {
            isCredit = rawAmt > 0;
          }
        } else {
          const debitVal = debitIdx >= 0 ? cleanNumeric(cols[debitIdx] || "0") : 0;
          const creditVal = creditIdx >= 0 ? cleanNumeric(cols[creditIdx] || "0") : 0;

          if (debitVal === 0 && creditVal === 0) continue;

          isCredit = creditVal > 0 && debitVal === 0;
          amount = isCredit ? creditVal : debitVal;
        }

        const category = categorizeByNarration(narration);

        const row = {
          date: isoDate,
          amount: String(Math.abs(amount)),
          type: isCredit ? "credit" : "debit",
          category,
          note: "",
          narration,
          referenceNumber: "",
          accountId: smartAccountId || firstAccountId,
          selected: true,
          isDuplicate: false,
        };

        row.isDuplicate = isDuplicate(row);
        if (row.isDuplicate) row.selected = false;

        rows.push(row);
      }

      if (rows.length === 0) {
        setSmartError("No valid transaction rows found in the file.");
        return;
      }
      setSmartPreview(rows);
    } catch (e: any) {
      setSmartError("Error parsing CSV: " + e.message);
    }
  };

  const handleSmartFileUpload = (file: File) => {
    setSmartFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) parseSmartCSV(text);
    };
    reader.readAsText(file);
  };

  const updateSmartCategory = (idx: number, cat: string) => {
    setSmartPreview((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, category: cat } : r))
    );
  };

  const toggleRow = (idx: number) => {
    setSmartPreview((prev) =>
      prev.map((r, i) => (i === idx && !r.isDuplicate ? { ...r, selected: !r.selected } : r))
    );
  };

  const selectAll = () => {
    setSmartPreview((prev) => prev.map((r) => ({ ...r, selected: !r.isDuplicate })));
  };

  const deselectAll = () => {
    setSmartPreview((prev) => prev.map((r) => ({ ...r, selected: false })));
  };

  const selectedCount = smartPreview.filter((r) => r.selected && !r.isDuplicate).length;
  const duplicateCount = smartPreview.filter((r) => r.isDuplicate).length;
  const selectedForImport = smartPreview.filter((r) => r.selected && !r.isDuplicate);
  const totalCredits = selectedForImport.filter((r) => r.type === "credit").reduce((s, r) => s + Number(r.amount), 0);
  const totalDebits = selectedForImport.filter((r) => r.type === "debit").reduce((s, r) => s + Number(r.amount), 0);

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: THEME.muted,
    marginBottom: 6,
  };
  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    background: "var(--t-paper)",
    border: `1.5px solid ${THEME.line}`,
    borderRadius: 10,
    color: THEME.ink,
    fontSize: 14,
  };
  const btnStyle = {
    background: "transparent",
    border: `1px solid ${THEME.line}`,
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };

  const pillStyle = (active: boolean) => ({
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    border: "none",
    background: active ? THEME.accent : "transparent",
    color: active ? "#fff" : THEME.muted,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "inherit",
  });

  const handleImport = () => {
    if (mode === "smart") {
      const rows = smartPreview
        .filter((r) => r.selected && !r.isDuplicate)
        .map(({ selected, isDuplicate, ...rest }) => rest);
      if (rows.length > 0) onImport(rows);
    } else {
      if (preview.length > 0) onImport(preview);
    }
  };

  const activePreview = mode === "smart" ? smartPreview : preview;
  const activeError = mode === "smart" ? smartError : error;
  const importCount = mode === "smart" ? selectedCount : preview.length;

  return (
    <Modal title="Import Transactions (CSV)" onClose={onClose} maxWidth={720}>
      {/* ── Mode toggle ──────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 16,
          padding: 4,
          background: "rgba(128,128,128,0.06)",
          borderRadius: 24,
          width: "fit-content",
        }}
      >
        <button style={pillStyle(mode === "template")} onClick={() => setMode("template")}>
          <FileText size={13} /> Template Import
        </button>
        <button style={pillStyle(mode === "smart")} onClick={() => setMode("smart")}>
          <Zap size={13} /> Smart Import
        </button>
      </div>

      {mode === "template" && (
        <>
          {/* Step 1: Download template */}
          <div
            style={{
              background: "rgba(99,102,241,0.06)",
              border: `1px solid rgba(99,102,241,0.2)`,
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
              Step 1 — Download the template
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 10 }}>
              Fill it in Excel / Google Sheets, then paste the rows below. Account IDs are pre-filled in
              the template.
            </div>
            <button
              style={{ ...btnStyle, borderColor: "var(--t-accent)", color: "var(--t-accent)" }}
              onClick={downloadTemplate}
            >
              <Download size={13} /> Download Template CSV
            </button>
          </div>

          {/* Accounts reference */}
          {accounts.length > 0 && (
            <div
              style={{
                fontSize: 11,
                color: THEME.muted,
                marginBottom: 14,
                padding: "8px 12px",
                background: "rgba(128,128,128,0.05)",
                borderRadius: 8,
              }}
            >
              <span style={{ fontWeight: 700 }}>Your account IDs:</span>{" "}
              {accounts.map((a, i) => (
                <span key={a.id}>
                  <code
                    style={{
                      background: "rgba(128,128,128,0.12)",
                      padding: "1px 5px",
                      borderRadius: 4,
                      fontSize: 11,
                    }}
                  >
                    {a.id}
                  </code>{" "}
                  = {a.bankName || a.name || "Account"}
                  {i < accounts.length - 1 ? "  •  " : ""}
                </span>
              ))}
            </div>
          )}

          {/* Step 2: Paste */}
          <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 8 }}>
            Step 2 — Paste your rows
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Format:{" "}
              <code
                style={{ background: "rgba(128,128,128,0.1)", padding: "1px 4px", fontWeight: 400 }}
              >
                date, amount, type, category, note, narration, [referenceNumber], accountId
              </code>
            </label>
            <textarea
              style={{
                ...inputStyle,
                height: 130,
                resize: "vertical",
                fontFamily: "monospace",
                fontSize: 12,
              }}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setPreview([]);
                setError("");
              }}
              placeholder={
                "Paste CSV rows here (header row and # comment lines are ignored)\n\n2025-04-01, 120000, credit, Salary, April salary\n2025-04-05, 15000, debit, Rent, House rent"
              }
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <button style={btnStyle} onClick={parseCSV}>
              Preview Data
            </button>
          </div>

          {error && (
            <div
              style={{
                color: THEME.rust,
                fontSize: 12,
                marginBottom: 16,
                padding: 10,
                background: "rgba(220,38,38,0.05)",
                borderRadius: 8,
              }}
            >
              {error}
            </div>
          )}

          {preview.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: THEME.sage }}>
                {preview.length} rows ready — review before importing:
              </div>
              <div
                style={{
                  maxHeight: 200,
                  overflow: "auto",
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 10,
                  padding: 8,
                }}
              >
                {preview.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "8px 0",
                      borderBottom: i === preview.length - 1 ? "none" : `1px dashed ${THEME.line}`,
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: THEME.muted, minWidth: 70 }}>{r.date}</span>
                    <span
                      style={{
                        color: r.type === "credit" ? THEME.sage : THEME.rust,
                        fontWeight: 700,
                        minWidth: 80,
                      }}
                    >
                      {r.type === "credit" ? "+" : "−"}
                      {fmtINRFull(r.amount)}
                    </span>
                    <span style={{ color: THEME.muted, minWidth: 80 }}>{r.category}</span>
                    <span style={{ flex: 1, color: THEME.muted }}>
                      {r.note}
                      {r.narration ? ` · ${r.narration}` : ""}
                      {r.referenceNumber ? ` · Ref: ${r.referenceNumber}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {mode === "smart" && (
        <>
          {/* Smart Import instructions */}
          <div
            style={{
              background: `${THEME.accent}08`,
              border: `1px solid ${THEME.accent}22`,
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
              Upload your bank statement CSV
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
              Download a CSV from your bank's net banking portal, then upload it here.
              Columns are auto-detected for SBI, HDFC, ICICI, Axis, Kotak, and generic bank formats.
              Transactions are auto-categorized by narration keywords. Duplicates are auto-flagged.
            </div>
          </div>

          {/* Account selector */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Import into account:</label>
            <select
              style={{ ...inputStyle, fontSize: 13 }}
              value={smartAccountId}
              onChange={(e) => {
                setSmartAccountId(e.target.value);
                setSmartPreview((prev) => prev.map((r) => ({ ...r, accountId: e.target.value })));
              }}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bankName || a.name || "Account"} ({a.accountNumber || a.id})
                </option>
              ))}
            </select>
          </div>

          {/* File upload */}
          <div style={{ marginBottom: 16 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.xls,.xlsx"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleSmartFileUpload(file);
              }}
            />
            <button
              style={{ ...btnStyle, borderColor: THEME.accent, color: THEME.accent }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={13} /> {smartFile ? smartFile.name : "Choose CSV File"}
            </button>
          </div>

          {detectedBank && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  background: `${THEME.sage}10`,
                  border: `1px solid ${THEME.sage}22`,
                  fontSize: 11,
                  fontWeight: 600,
                  color: THEME.sage,
                  display: "inline-block",
                }}
              >
                Detected format: {detectedBank}
              </span>
              {duplicateCount > 0 && (
                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.15)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#F59E0B",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <AlertTriangle size={12} /> {duplicateCount} duplicate{duplicateCount !== 1 ? "s" : ""} detected
                </span>
              )}
            </div>
          )}

          {smartError && (
            <div
              style={{
                color: THEME.rust,
                fontSize: 12,
                marginBottom: 16,
                padding: 10,
                background: "rgba(220,38,38,0.05)",
                borderRadius: 8,
              }}
            >
              {smartError}
            </div>
          )}

          {smartPreview.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: THEME.sage }}>
                  {smartPreview.length} transactions detected — {selectedCount} selected for import
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    style={{ ...btnStyle, padding: "4px 10px", fontSize: 11 }}
                    onClick={selectAll}
                  >
                    Select All
                  </button>
                  <button
                    style={{ ...btnStyle, padding: "4px 10px", fontSize: 11 }}
                    onClick={deselectAll}
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div
                style={{
                  maxHeight: 280,
                  overflow: "auto",
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 10,
                }}
              >
                <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "var(--surface-0)", textAlign: "left" }}>
                      <th style={{ padding: "8px 6px", borderBottom: `1px solid ${THEME.line}`, width: 40, minWidth: 40 }}>✓</th>
                      <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}`, width: 90, minWidth: 90, whiteSpace: "nowrap" }}>Date</th>
                      <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}`, minWidth: 150 }}>Narration</th>
                      <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}` }}>Category</th>
                      <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}`, textAlign: "right" }}>Amount</th>
                      <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}`, textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {smartPreview.map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${THEME.line}`, opacity: r.isDuplicate ? 0.45 : 1 }}>
                        <td style={{ padding: "8px 6px", width: 40, minWidth: 40 }}>
                          <input
                            type="checkbox"
                            checked={r.selected && !r.isDuplicate}
                            disabled={r.isDuplicate}
                            onChange={() => toggleRow(i)}
                          />
                        </td>
                        <td style={{ padding: "8px 10px", width: 90, minWidth: 90, whiteSpace: "nowrap", color: THEME.muted }}>{r.date}</td>
                        <td style={{ padding: "8px 10px", minWidth: 150, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.narration}>
                          {r.narration || "—"}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <select
                            style={{
                              padding: "2px 6px",
                              fontSize: 11,
                              borderRadius: 4,
                              border: `1px solid ${THEME.line}`,
                              background: "var(--surface-0)",
                              color: THEME.ink,
                              fontFamily: "inherit",
                              cursor: "pointer",
                            }}
                            value={r.category}
                            onChange={(e) => updateSmartCategory(i, e.target.value)}
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td
                          style={{
                            padding: "8px 10px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: r.type === "credit" ? THEME.sage : THEME.rust,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.type === "credit" ? "+" : "-"}
                          {fmtINRFull(r.amount)}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          {r.isDuplicate ? (
                            <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
                              Duplicate
                            </span>
                          ) : r.type === "credit" ? (
                            <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "rgba(16,185,129,0.1)", color: "#10B981" }}>
                              CR
                            </span>
                          ) : (
                            <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
                              DR
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 10,
                  fontSize: 11,
                  color: THEME.muted,
                }}
              >
                <span>
                  Credits:{" "}
                  <b style={{ color: THEME.sage }}>
                    {fmtINRFull(totalCredits)}
                  </b>
                </span>
                <span>
                  Debits:{" "}
                  <b style={{ color: THEME.rust }}>
                    {fmtINRFull(totalDebits)}
                  </b>
                </span>
                {duplicateCount > 0 && (
                  <span>
                    Skipping:{" "}
                    <b style={{ color: "#F59E0B" }}>{duplicateCount} duplicate{duplicateCount !== 1 ? "s" : ""}</b>
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <ModalActions
        onSave={handleImport}
        onClose={onClose}
        saveLabel={`Import ${importCount} Row${importCount !== 1 ? "s" : ""}`}
      />
    </Modal>
  );
};
