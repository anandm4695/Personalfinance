// @ts-nocheck
import React, { useState } from "react";
import { Download } from "lucide-react";
import { Modal, ModalActions } from "../ui/Modal";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";

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
  "Other",
];

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ accounts, onClose, onImport }) => {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState("");

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
        if (isNaN(parsedAmount) || parsedAmount < 0)
          throw new Error(`Row ${i + 1}: amount must be a number (got "${amount}")`);
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

  return (
    <Modal title="Import Transactions (CSV)" onClose={onClose}>
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

      <ModalActions
        onSave={() => preview.length > 0 && onImport(preview)}
        onClose={onClose}
        saveLabel={`Import ${preview.length} Row${preview.length !== 1 ? "s" : ""}`}
      />
    </Modal>
  );
};
