// @ts-nocheck
import React, { useState, useRef } from "react";
import { Download, Upload, Zap, FileText } from "lucide-react";
import { Modal, ModalActions } from "../ui/Modal";
import { THEME } from "../../utils/constants";
import { fmtINRFull, uid } from "../../utils/finance";

interface CsvImportModalProps {
  accounts: any[];
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
  if (/\b(SWIGGY|ZOMATO|FOOD|RESTAURANT|CAFE|DINING)/.test(n)) return "Food";
  if (/\b(AMAZON|FLIPKART|MYNTRA|AJIO|SHOPPING)/.test(n)) return "Shopping";
  if (/\b(MUTUAL FUND|SIP|MF PURCHASE|BSE|NSE)/.test(n)) return "Investment";
  if (/\b(ATM|CASH WITHDRAWAL|CASH WDL)/.test(n)) return "Cash";
  if (/\b(UPI|IMPS|NEFT|RTGS)/.test(n)) return "Transfer";
  if (/\b(ELECTRIC|WATER|GAS|BROADBAND|WIFI|INTERNET|MOBILE|RECHARGE|DTH)/.test(n)) return "Utilities";
  if (/\b(INSURANCE|LIC|PREMIUM)/.test(n)) return "Bills";
  if (/\b(HOSPITAL|MEDICAL|PHARMACY|DOCTOR|HEALTH)/.test(n)) return "Medical";
  if (/\b(NETFLIX|HOTSTAR|SPOTIFY|MOVIE|THEATRE)/.test(n)) return "Entertainment";
  if (/\b(UBER|OLA|METRO|PETROL|FUEL|DIESEL|PARKING|TOLL)/.test(n)) return "Transport";
  if (/\b(GROCER|BIGBASKET|BLINKIT|DMART|INSTAMART)/.test(n)) return "Groceries";
  if (/\b(TAX|TDS|GST|IT DEPT|INCOME TAX)/.test(n)) return "Tax";
  return "Other";
};

/* ── Parse date from various bank formats ────────────────────────── */
const parseSmartDate = (dateStr: string): string | null => {
  if (!dateStr) return null;
  const d = dateStr.trim().replace(/\//g, "-");

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = d.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  // DD-Mon-YYYY or DD/Mon/YYYY
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

  // Fallback: try native Date parse
  const parsed = new Date(dateStr.trim());
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
};

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ accounts, onClose, onImport }) => {
  const [mode, setMode] = useState<"template" | "smart">("template");
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
      // Skip header row if present
      const dataLines = lines[0].toLowerCase().startsWith("date") ? lines.slice(1) : lines;
      if (dataLines.length === 0) {
        setError("No data rows found — paste rows below the header.");
        return;
      }
      const rows = dataLines.map((line, i) => {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
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

  /* ── Smart Import: parse uploaded bank CSV ─────────────────────── */
  const parseSmartCSV = (text: string) => {
    setSmartError("");
    setSmartPreview([]);
    setDetectedBank("");

    try {
      const rawLines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      if (rawLines.length < 2) {
        setSmartError("CSV must have a header row and at least one data row.");
        return;
      }

      // Parse header — handle both comma and tab delimiters
      const delimiter = rawLines[0].includes("\t") ? "\t" : ",";
      const splitRow = (line: string) =>
        line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));

      const headers = splitRow(rawLines[0]).map((h) => h.toLowerCase().trim());

      // Try to match a bank profile
      let dateIdx = -1, descIdx = -1, debitIdx = -1, creditIdx = -1, balIdx = -1;
      let matchedBank = "";

      for (const profile of BANK_PROFILES) {
        const dI = headers.findIndex((h) => profile.date.includes(h));
        const nI = headers.findIndex((h) => profile.desc.includes(h));
        const drI = headers.findIndex((h) => profile.debit.includes(h));
        const crI = headers.findIndex((h) => profile.credit.includes(h));
        if (dI >= 0 && nI >= 0 && (drI >= 0 || crI >= 0)) {
          dateIdx = dI;
          descIdx = nI;
          debitIdx = drI;
          creditIdx = crI;
          balIdx = headers.findIndex((h) => profile.balance.includes(h));
          matchedBank = profile.bank;
          break;
        }
      }

      // Fallback to generic keyword matching
      if (dateIdx < 0) {
        dateIdx = headers.findIndex((h) => GENERIC_KEYWORDS.date.some((k) => h.includes(k)));
        descIdx = headers.findIndex((h) => GENERIC_KEYWORDS.desc.some((k) => h.includes(k)));
        debitIdx = headers.findIndex((h) => GENERIC_KEYWORDS.debit.some((k) => h.includes(k)));
        creditIdx = headers.findIndex((h) => GENERIC_KEYWORDS.credit.some((k) => h.includes(k)));
        balIdx = headers.findIndex((h) => GENERIC_KEYWORDS.balance.some((k) => h.includes(k)));
        matchedBank = "Auto-detected";
      }

      if (dateIdx < 0) {
        setSmartError("Could not detect a date column. Ensure your CSV has a header row with a date column (e.g. 'Date', 'Txn Date').");
        return;
      }
      if (descIdx < 0) {
        setSmartError("Could not detect a description/narration column.");
        return;
      }
      if (debitIdx < 0 && creditIdx < 0) {
        setSmartError("Could not detect debit or credit columns.");
        return;
      }

      setDetectedBank(matchedBank);

      const dataLines = rawLines.slice(1);
      const rows: any[] = [];
      for (let i = 0; i < dataLines.length; i++) {
        const cols = splitRow(dataLines[i]);
        const rawDate = cols[dateIdx] || "";
        const isoDate = parseSmartDate(rawDate);
        if (!isoDate) continue; // skip unparseable rows

        const narration = cols[descIdx] || "";
        const debitVal = debitIdx >= 0 ? parseFloat((cols[debitIdx] || "0").replace(/,/g, "")) : 0;
        const creditVal = creditIdx >= 0 ? parseFloat((cols[creditIdx] || "0").replace(/,/g, "")) : 0;

        // Skip rows with no amount
        if ((isNaN(debitVal) || debitVal === 0) && (isNaN(creditVal) || creditVal === 0)) continue;

        const isCredit = creditVal > 0 && (debitVal === 0 || isNaN(debitVal));
        const amount = isCredit ? creditVal : debitVal;

        const category = categorizeByNarration(narration);

        rows.push({
          date: isoDate,
          amount: String(Math.abs(amount)),
          type: isCredit ? "credit" : "debit",
          category,
          note: "",
          narration,
          referenceNumber: "",
          accountId: smartAccountId || firstAccountId,
        });
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

  const activePreview = mode === "smart" ? smartPreview : preview;
  const activeError = mode === "smart" ? smartError : error;

  return (
    <Modal title="Import Transactions (CSV)" onClose={onClose}>
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
              style={{ ...btnStyle, borderColor: "#6366f1", color: "#6366f1" }}
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
              Columns are auto-detected for SBI, HDFC, ICICI, Axis, and generic bank formats.
              Transactions are auto-categorized by narration keywords.
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
                // Re-assign account ID to all smart preview rows
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
              accept=".csv,.txt"
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
            <div
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                background: `${THEME.sage}10`,
                border: `1px solid ${THEME.sage}22`,
                fontSize: 11,
                fontWeight: 600,
                color: THEME.sage,
                marginBottom: 12,
                display: "inline-block",
              }}
            >
              Detected format: {detectedBank}
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
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: THEME.sage }}>
                {smartPreview.length} transactions detected — review categories before importing:
              </div>
              <div
                style={{
                  maxHeight: 280,
                  overflow: "auto",
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 10,
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "var(--surface-0)", textAlign: "left" }}>
                      <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}`, whiteSpace: "nowrap" }}>Date</th>
                      <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}` }}>Narration</th>
                      <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}` }}>Category</th>
                      <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}`, textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {smartPreview.map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap", color: THEME.muted }}>{r.date}</td>
                        <td style={{ padding: "8px 10px", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.narration}>
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
                    {fmtINRFull(smartPreview.filter((r) => r.type === "credit").reduce((s, r) => s + Number(r.amount), 0))}
                  </b>
                </span>
                <span>
                  Debits:{" "}
                  <b style={{ color: THEME.rust }}>
                    {fmtINRFull(smartPreview.filter((r) => r.type === "debit").reduce((s, r) => s + Number(r.amount), 0))}
                  </b>
                </span>
              </div>
            </div>
          )}
        </>
      )}

      <ModalActions
        onSave={() => activePreview.length > 0 && onImport(activePreview)}
        onClose={onClose}
        saveLabel={`Import ${activePreview.length} Row${activePreview.length !== 1 ? "s" : ""}`}
      />
    </Modal>
  );
};
