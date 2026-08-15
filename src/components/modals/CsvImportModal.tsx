// @ts-nocheck
import React, { useState, useRef } from "react";
import { Download, Upload, Zap, FileText, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Modal, ModalActions } from "../ui/Modal";
import { SkeletonTableRows } from "../ui/Skeleton";
import { THEME } from "../../utils/constants";
import { fmtINRFull, uid } from "../../utils/finance";
import { Prv, usePrivacy } from "../../context/PrivacyContext";

interface CsvImportModalProps {
  accounts: any[];
  existingTransactions?: any[];
  onClose: () => void;
  onImport: (data: any[]) => void;
  /** Called with { id, statementBalance } pairs for rows the user chose to
      "backfill" — an already-imported transaction that matched this CSV row
      but was missing its bank-stated balance (e.g. imported before that field
      existed). Patches the existing transaction instead of inserting a new one. */
  onBackfillBalance?: (updates: { id: string; statementBalance: string }[]) => void;
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
  if (/\b(MUTUAL FUND|SIP|MF PURCHASE|BSE|NSE|ZERODHA|GROWW|KUVERA|NPS|PPF)/.test(n))
    return "Investment";
  if (/\b(ATM|CASH WITHDRAWAL|CASH WDL)/.test(n)) return "Cash";
  if (/\b(UPI|IMPS|NEFT|RTGS)/.test(n)) return "Transfer";
  if (/\b(ELECTRIC|WATER|GAS|BROADBAND|WIFI|INTERNET|MOBILE|RECHARGE|DTH|JIO|AIRTEL|BSNL)/.test(n))
    return "Utilities";
  if (/\b(INSURANCE|LIC|PREMIUM)/.test(n)) return "Bills";
  if (/\b(HOSPITAL|MEDICAL|PHARMACY|DOCTOR|HEALTH|APOLLO|1MG|NETMEDS|PRACTO)/.test(n))
    return "Medical";
  if (/\b(NETFLIX|HOTSTAR|SPOTIFY|MOVIE|THEATRE|BOOKMYSHOW)/.test(n)) return "Entertainment";
  if (/\b(UBER|OLA|METRO|PETROL|FUEL|DIESEL|PARKING|TOLL|RAPIDO)/.test(n)) return "Transport";
  if (/\b(GROCER|BIGBASKET|BLINKIT|DMART|INSTAMART|ZEPTO|RELIANCE.*FRESH)/.test(n))
    return "Groceries";
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
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      vals.push(current.trim());
      current = "";
      continue;
    }
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

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  accounts,
  existingTransactions = [],
  onClose,
  onImport,
  onBackfillBalance,
}) => {
  const { privacyMode } = usePrivacy();
  const [mode, setMode] = useState<"template" | "smart">("smart");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState("");

  /* ── Smart Import state ──────────────────────────────────────────── */
  const [smartFile, setSmartFile] = useState<File | null>(null);
  const [smartPreview, setSmartPreview] = useState<any[]>([]);
  const [smartError, setSmartError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
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
        let explicitAccountId = "";

        if (parts.length >= 8) {
          referenceNumber = parts[6] || "";
          explicitAccountId = parts[7] || "";
        } else {
          explicitAccountId = parts[6] || "";
        }

        const accountId = explicitAccountId || firstAccountId;

        // Guard against the "account-id-here" placeholder — it's only ever
        // used when no real bank account exists (see firstAccountId above,
        // and the downloaded template which embeds it the same way), so a
        // row that resolves to it would import a transaction tagged with a
        // non-existent account.
        if (accountId === "account-id-here") {
          throw new Error(
            `Row ${i + 1}: no bank account found — add a bank account first, or include a valid accountId column.`
          );
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
      (e) =>
        e.date === row.date &&
        Math.abs(Number(e.amount) - Number(row.amount)) < 1 &&
        e.type === row.type
    );
  };

  /* ── Backfill detection ──────────────────────────────────────────────
     A duplicate row that also carries a bank-stated balance can "backfill"
     an already-imported transaction that's missing one (e.g. it was
     imported before Smart Import captured this field) — patching the
     existing row instead of skipping it outright. Only offered when the
     match is unambiguous (exactly one candidate); with several same-day,
     same-amount transactions there's no reliable way to tell which one the
     balance actually belongs to, so those fall back to a plain skip. */
  const findBackfillCandidate = (row: any): any | null => {
    if (!row.statementBalance) return null;
    const candidates = existingTransactions.filter(
      (e) =>
        e.date === row.date &&
        Math.abs(Number(e.amount) - Number(row.amount)) < 1 &&
        e.type === row.type &&
        (e.statementBalance === undefined || e.statementBalance === null || e.statementBalance === "")
    );
    return candidates.length === 1 ? candidates[0] : null;
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
          'This is a real Excel (.xlsx/.xls) file, which can\'t be read as text. In Excel/Sheets, use "Save As" or "Download" → CSV, or use the CSV option on your bank\'s statement page, then upload that file instead.'
        );
        return;
      }

      // Many bank "Excel" downloads are actually an HTML table with a .xls
      // extension — convert it to CSV-style lines before parsing.
      const workingText = isHtmlTable(cleanText)
        ? htmlTableToCsvLines(cleanText).join("\n")
        : cleanText;

      const rawLines = workingText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
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
      let dateIdx = -1,
        descIdx = -1,
        debitIdx = -1,
        creditIdx = -1,
        balIdx = -1,
        amountIdx = -1,
        typeIdx = -1,
        categoryIdx = -1,
        noteIdx = -1;
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

        let dI = -1,
          nI = -1,
          drI = -1,
          crI = -1,
          bI = -1,
          amtI = -1,
          tI = -1,
          catI = -1,
          ntI = -1,
          bank = "";

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
            catI = headers.findIndex((h) =>
              ["category", "cat", "transaction category"].some((k) => h === k || h.includes(k))
            );
            ntI = headers.findIndex((h) =>
              ["note", "notes", "remark", "remarks", "comment"].some(
                (k) => h === k || h.includes(k)
              )
            );
            break;
          }
        }

        if (dI < 0) {
          const gdI = headers.findIndex((h) => GENERIC_KEYWORDS.date.some((k) => h.includes(k)));
          const gnI = headers.findIndex((h) => GENERIC_KEYWORDS.desc.some((k) => h.includes(k)));
          const gdrI = headers.findIndex((h) => GENERIC_KEYWORDS.debit.some((k) => h.includes(k)));
          const gcrI = headers.findIndex((h) => GENERIC_KEYWORDS.credit.some((k) => h.includes(k)));
          const gamtI = headers.findIndex((h) =>
            ["amount", "amt", "transaction amount", "txn amount", "net amount"].some((k) =>
              h.includes(k)
            )
          );
          const gtypeI = headers.findIndex((h) =>
            ["type", "cr/dr", "dr/cr", "cr_dr", "transaction type", "txntype", "db/cr"].some((k) =>
              h.includes(k)
            )
          );
          const gcatI = headers.findIndex((h) =>
            ["category", "cat", "transaction category"].some((k) => h === k || h.includes(k))
          );
          const gnoteI = headers.findIndex((h) =>
            ["note", "notes", "remark", "remarks", "comment"].some((k) => h === k || h.includes(k))
          );

          if (gdI >= 0 && gnI >= 0 && (gdrI >= 0 || gcrI >= 0 || gamtI >= 0)) {
            dI = gdI;
            nI = gnI;
            drI = gdrI;
            crI = gcrI;
            amtI = gamtI;
            tI = gtypeI;
            catI = gcatI;
            ntI = gnoteI;
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
          categoryIdx = catI;
          noteIdx = ntI;
          balIdx = bI;
          matchedBank = bank;
          break;
        }
      }

      if (headerIdx < 0) {
        setSmartError(
          "Could not detect a header row with date, description, and debit/credit columns. Ensure your CSV includes the column headers exported by your bank (e.g. 'Date', 'Narration', 'Withdrawal Amt', 'Deposit Amt')."
        );
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
            isCredit =
              rawType.includes("credit") ||
              rawType.includes("cr") ||
              rawType === "c" ||
              rawType.includes("dep") ||
              rawType.includes("in");
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

        let category = "";
        if (categoryIdx >= 0 && cols[categoryIdx]) {
          const rawCat = cols[categoryIdx].trim();
          const matchedCat = CATEGORIES.find((c) => c.toLowerCase() === rawCat.toLowerCase());
          category = matchedCat || "Other";
        } else {
          category = categorizeByNarration(narration);
        }

        const note = noteIdx >= 0 ? cols[noteIdx] || "" : "";

        const row: any = {
          date: isoDate,
          amount: String(Math.abs(amount)),
          type: isCredit ? "credit" : "debit",
          category,
          note,
          narration,
          referenceNumber: "",
          accountId: smartAccountId || firstAccountId,
          selected: true,
          isDuplicate: false,
          backfillId: null as string | null,
        };
        // Real bank statement exports carry their own per-row closing balance —
        // ground truth from the bank, not something the app should re-derive.
        // BanksTab's running-balance column prefers this over reconstructing
        // backward from today's balance, which breaks down when the imported
        // rows only cover a slice of the account's real history.
        //
        // Only set this key at all when the CSV's header actually had a detected
        // balance column (balIdx >= 0) — every row in a batch needs the same
        // shape for Supabase's bulk upsert, and `transactions.statement_balance`
        // is a new column (migration 93) that may not exist in the DB yet. A CSV
        // with no balance column at all should keep working immediately; only a
        // CSV that DOES carry one needs that migration applied first.
        if (balIdx >= 0) {
          row.statementBalance = cols[balIdx] ? String(cleanNumeric(cols[balIdx])) : "";
        }

        row.isDuplicate = isDuplicate(row);
        if (row.isDuplicate) {
          const candidate = findBackfillCandidate(row);
          row.backfillId = candidate ? candidate.id : null;
          // A plain duplicate stays unselected (skipped); a backfill candidate is
          // selected by default since it's purely additive — it only fills in a
          // balance that was previously missing, it never changes an amount/date.
          row.selected = !!row.backfillId;
        }

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
    setIsParsing(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setSmartError("Could not read the file. Please try again.");
      setIsParsing(false);
    };
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) parseSmartCSV(text);
      setIsParsing(false);
    };
    reader.readAsText(file);
  };

  const updateSmartCategory = (idx: number, cat: string) => {
    setSmartPreview((prev) => prev.map((r, i) => (i === idx ? { ...r, category: cat } : r)));
  };

  const updateSmartNote = (idx: number, note: string) => {
    setSmartPreview((prev) => prev.map((r, i) => (i === idx ? { ...r, note } : r)));
  };

  // A row is "actionable" (togglable) if it's a genuinely new transaction, or a
  // duplicate that can safely backfill an existing transaction's missing balance.
  // A plain duplicate (no unambiguous backfill match) stays a locked skip.
  const isActionable = (r: any) => !r.isDuplicate || !!r.backfillId;

  const toggleRow = (idx: number) => {
    setSmartPreview((prev) =>
      prev.map((r, i) => (i === idx && isActionable(r) ? { ...r, selected: !r.selected } : r))
    );
  };

  const selectAll = () => {
    setSmartPreview((prev) => prev.map((r) => ({ ...r, selected: isActionable(r) })));
  };

  const deselectAll = () => {
    setSmartPreview((prev) => prev.map((r) => ({ ...r, selected: false })));
  };

  const selectedForImport = smartPreview.filter((r) => r.selected && !r.isDuplicate);
  const selectedForBackfill = smartPreview.filter((r) => r.selected && r.isDuplicate && r.backfillId);
  const selectedCount = selectedForImport.length;
  const plainDuplicateCount = smartPreview.filter((r) => r.isDuplicate && !r.backfillId).length;
  const backfillCount = smartPreview.filter((r) => r.isDuplicate && r.backfillId).length;
  const totalCredits = selectedForImport
    .filter((r) => r.type === "credit")
    .reduce((s, r) => s + Number(r.amount), 0);
  const totalDebits = selectedForImport
    .filter((r) => r.type === "debit")
    .reduce((s, r) => s + Number(r.amount), 0);

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
      const rows = selectedForImport.map(({ selected, isDuplicate, backfillId, ...rest }) => rest);
      if (rows.length > 0) onImport(rows);
      if (selectedForBackfill.length > 0 && onBackfillBalance) {
        onBackfillBalance(
          selectedForBackfill.map((r) => ({ id: r.backfillId, statementBalance: r.statementBalance }))
        );
      }
    } else {
      // Safety net: parseCSV already rejects rows that resolve to the
      // "account-id-here" placeholder, but never write it even if preview
      // was somehow populated without going through that validation.
      if (preview.some((r) => r.accountId === "account-id-here")) {
        setError("No bank account found — add a bank account first, then re-import.");
        return;
      }
      if (preview.length > 0) onImport(preview);
    }
  };

  const activePreview = mode === "smart" ? smartPreview : preview;
  const activeError = mode === "smart" ? smartError : error;
  const importCount =
    mode === "smart" ? selectedForImport.length + selectedForBackfill.length : preview.length;

  return (
    <Modal title="Import Transactions (CSV)" onClose={onClose} maxWidth={720}>
      {/* ── Mode toggle ──────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 16,
          padding: 4,
          background: "color-mix(in srgb, var(--t-muted) 8%, transparent)",
          borderRadius: 24,
          width: "fit-content",
        }}
      >
        <button
          style={pillStyle(mode === "template")}
          onClick={() => setMode("template")}
          aria-pressed={mode === "template"}
        >
          <FileText size={13} /> Template Import
        </button>
        <button
          style={pillStyle(mode === "smart")}
          onClick={() => setMode("smart")}
          aria-pressed={mode === "smart"}
        >
          <Zap size={13} /> Smart Import
        </button>
      </div>

      {mode === "template" && (
        <>
          {/* Step 1: Download template */}
          <div
            style={{
              background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.accent} 13%, transparent)`,
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
              Step 1 — Download the template
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 10 }}>
              Fill it in Excel / Google Sheets, then paste the rows below. Account IDs are
              pre-filled in the template.
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
                background: "color-mix(in srgb, var(--t-muted) 6%, transparent)",
                borderRadius: 8,
              }}
            >
              <span style={{ fontWeight: 700 }}>Your account IDs:</span>{" "}
              {accounts.map((a, i) => (
                <span key={a.id}>
                  <code className="code-chip" style={{ fontSize: 11 }}>
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
              <code className="code-chip" style={{ fontWeight: 400 }}>
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
            <div className="info-box info-box-error" style={{ marginBottom: 16, fontSize: 12 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
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
                      <Prv>{fmtINRFull(r.amount)}</Prv>
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
              background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.accent} 13%, transparent)`,
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
              Upload your bank statement CSV
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
              Download a CSV from your bank's net banking portal, then upload it here. Columns are
              auto-detected for SBI, HDFC, ICICI, Axis, Kotak, and generic bank formats.
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
              style={{
                ...btnStyle,
                borderColor: THEME.accent,
                color: THEME.accent,
                opacity: isParsing ? 0.7 : 1,
                cursor: isParsing ? "wait" : "pointer",
              }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
            >
              <Upload size={13} /> {smartFile ? smartFile.name : "Choose CSV File"}
            </button>
            {isParsing && (
              <span
                style={{
                  marginLeft: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: THEME.accent,
                }}
              >
                <Loader2 size={13} className="spin" />
                Reading & detecting format…
              </span>
            )}
          </div>
          {isParsing && (
            <div style={{ marginTop: 16 }}>
              <SkeletonTableRows rows={5} columns={5} />
            </div>
          )}

          {detectedBank && (
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.sage} 13%, transparent)`,
                  fontSize: 11,
                  fontWeight: 600,
                  color: THEME.sage,
                  display: "inline-block",
                }}
              >
                Detected format: {detectedBank}
              </span>
              {plainDuplicateCount > 0 && (
                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: `color-mix(in srgb, ${THEME.gold} 6%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.gold} 15%, transparent)`,
                    fontSize: 11,
                    fontWeight: 600,
                    color: THEME.gold,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <AlertTriangle size={12} /> {plainDuplicateCount} duplicate
                  {plainDuplicateCount !== 1 ? "s" : ""} detected
                </span>
              )}
              {backfillCount > 0 && (
                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: `color-mix(in srgb, ${THEME.accent} 6%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
                    fontSize: 11,
                    fontWeight: 600,
                    color: THEME.accent,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <AlertTriangle size={12} /> {backfillCount} already-imported row
                  {backfillCount !== 1 ? "s" : ""} can have their bank balance backfilled
                </span>
              )}
            </div>
          )}

          {smartError && (
            <div className="info-box info-box-error" style={{ marginBottom: 16, fontSize: 12 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{smartError}</span>
            </div>
          )}

          {smartPreview.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: THEME.sage }}>
                  {smartPreview.length} transactions detected — {selectedCount} selected for import
                  {selectedForBackfill.length > 0 &&
                    `, ${selectedForBackfill.length} balance backfill${selectedForBackfill.length !== 1 ? "s" : ""}`}
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
                <table
                  style={{ width: "100%", minWidth: 700, borderCollapse: "collapse", fontSize: 11 }}
                >
                  <thead>
                    <tr style={{ background: "var(--surface-0)", textAlign: "left" }}>
                      <th
                        style={{
                          padding: "8px 6px",
                          borderBottom: `1px solid ${THEME.line}`,
                          width: 40,
                          minWidth: 40,
                        }}
                      >
                        ✓
                      </th>
                      <th
                        style={{
                          padding: "8px 10px",
                          borderBottom: `1px solid ${THEME.line}`,
                          width: 90,
                          minWidth: 90,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Date
                      </th>
                      <th
                        style={{
                          padding: "8px 10px",
                          borderBottom: `1px solid ${THEME.line}`,
                          minWidth: 120,
                        }}
                      >
                        Narration
                      </th>
                      <th
                        style={{
                          padding: "8px 10px",
                          borderBottom: `1px solid ${THEME.line}`,
                          minWidth: 120,
                        }}
                      >
                        Note
                      </th>
                      <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}` }}>
                        Category
                      </th>
                      <th
                        style={{
                          padding: "8px 10px",
                          borderBottom: `1px solid ${THEME.line}`,
                          textAlign: "right",
                        }}
                      >
                        Amount
                      </th>
                      <th
                        style={{
                          padding: "8px 10px",
                          borderBottom: `1px solid ${THEME.line}`,
                          textAlign: "center",
                        }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {smartPreview.map((r, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: `1px solid ${THEME.line}`,
                          opacity: r.isDuplicate && !r.backfillId ? 0.45 : 1,
                        }}
                      >
                        <td style={{ padding: "8px 6px", width: 40, minWidth: 40 }}>
                          <input
                            type="checkbox"
                            checked={r.selected && isActionable(r)}
                            disabled={r.isDuplicate && !r.backfillId}
                            onChange={() => toggleRow(i)}
                            aria-label={`Include row: ${r.narration || r.date} for ${
                              privacyMode ? "hidden amount" : fmtINRFull(r.amount)
                            }`}
                          />
                        </td>
                        <td
                          style={{
                            padding: "8px 10px",
                            width: 90,
                            minWidth: 90,
                            whiteSpace: "nowrap",
                            color: THEME.muted,
                          }}
                        >
                          {r.date}
                        </td>
                        <td
                          style={{
                            padding: "8px 10px",
                            minWidth: 120,
                            maxWidth: 180,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={r.narration}
                        >
                          {r.narration || "—"}
                        </td>
                        <td style={{ padding: "8px 10px", minWidth: 120 }}>
                          <input
                            type="text"
                            style={{
                              padding: "2px 6px",
                              fontSize: 11,
                              borderRadius: 4,
                              border: `1px solid ${THEME.line}`,
                              background: "var(--surface-0)",
                              color: THEME.ink,
                              fontFamily: "inherit",
                              width: "100%",
                            }}
                            value={r.note || ""}
                            onChange={(e) => updateSmartNote(i, e.target.value)}
                            placeholder="Add note..."
                          />
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
                              <option key={c} value={c}>
                                {c}
                              </option>
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
                          <Prv>{fmtINRFull(r.amount)}</Prv>
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          {r.isDuplicate && r.backfillId ? (
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 6,
                                fontSize: 10,
                                fontWeight: 600,
                                background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                                color: THEME.accent,
                              }}
                              title="Already imported — will add the bank-stated balance to that existing transaction"
                            >
                              Backfill Balance
                            </span>
                          ) : r.isDuplicate ? (
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 6,
                                fontSize: 10,
                                fontWeight: 600,
                                background: `color-mix(in srgb, ${THEME.gold} 10%, transparent)`,
                                color: THEME.gold,
                              }}
                            >
                              Duplicate
                            </span>
                          ) : r.type === "credit" ? (
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 6,
                                fontSize: 10,
                                fontWeight: 600,
                                background: `color-mix(in srgb, ${THEME.sage} 10%, transparent)`,
                                color: THEME.sage,
                              }}
                            >
                              CR
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 6,
                                fontSize: 10,
                                fontWeight: 600,
                                background: `color-mix(in srgb, ${THEME.rust} 10%, transparent)`,
                                color: THEME.rust,
                              }}
                            >
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
                  Credits: <b style={{ color: THEME.sage }}><Prv>{fmtINRFull(totalCredits)}</Prv></b>
                </span>
                <span>
                  Debits: <b style={{ color: THEME.rust }}><Prv>{fmtINRFull(totalDebits)}</Prv></b>
                </span>
                {plainDuplicateCount > 0 && (
                  <span>
                    Skipping:{" "}
                    <b style={{ color: THEME.gold }}>
                      {plainDuplicateCount} duplicate{plainDuplicateCount !== 1 ? "s" : ""}
                    </b>
                  </span>
                )}
                {selectedForBackfill.length > 0 && (
                  <span>
                    Backfilling balance on:{" "}
                    <b style={{ color: THEME.accent }}>
                      {selectedForBackfill.length} transaction{selectedForBackfill.length !== 1 ? "s" : ""}
                    </b>
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
