// @ts-nocheck
import React, { useState, useMemo, useCallback } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Download,
  Filter,
  X,
  RefreshCw,
  Landmark,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, uid, today } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Button } from "../ui/Button";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";
import { Prv } from "../../context/PrivacyContext";

const BANK_FORMATS = [
  { id: "hdfc", name: "HDFC Bank", dateCol: "Date", descCol: "Narration", debitCol: "Withdrawal Amt.", creditCol: "Deposit Amt.", balCol: "Closing Balance", dateFormat: "DD/MM/YY", skipRows: 0 },
  { id: "sbi", name: "SBI", dateCol: "Txn Date", descCol: "Description", debitCol: "Debit", creditCol: "Credit", balCol: "Balance", dateFormat: "DD MMM YYYY", skipRows: 0 },
  { id: "icici", name: "ICICI Bank", dateCol: "Transaction Date", descCol: "Transaction Remarks", debitCol: "Withdrawal Amount (INR )", creditCol: "Deposit Amount (INR )", balCol: "Balance (INR )", dateFormat: "DD/MM/YYYY", skipRows: 0 },
  { id: "kotak", name: "Kotak Mahindra", dateCol: "Date", descCol: "Description", debitCol: "Debit", creditCol: "Credit", balCol: "Balance", dateFormat: "DD-MM-YYYY", skipRows: 0 },
  { id: "axis", name: "Axis Bank", dateCol: "Tran Date", descCol: "PARTICULARS", debitCol: "DR", creditCol: "CR", balCol: "BAL", dateFormat: "DD-MM-YYYY", skipRows: 0 },
  { id: "generic", name: "Generic CSV", dateCol: "Date", descCol: "Description", debitCol: "Debit", creditCol: "Credit", balCol: "Balance", dateFormat: "YYYY-MM-DD", skipRows: 0 },
];

const CATEGORY_PATTERNS = {
  "Salary": [/salary/i, /payroll/i, /neft.*salary/i],
  "Rent": [/rent/i, /house.*rent/i],
  "Groceries": [/bigbasket/i, /blinkit/i, /zepto/i, /swiggy.*instamart/i, /dmart/i, /reliance.*fresh/i],
  "Food & Dining": [/zomato/i, /swiggy/i, /uber.*eats/i, /restaurant/i, /cafe/i, /dominos/i, /mcdonalds/i],
  "Shopping": [/amazon/i, /flipkart/i, /myntra/i, /ajio/i, /meesho/i, /nykaa/i],
  "Fuel": [/petrol/i, /diesel/i, /fuel/i, /indian.*oil/i, /bharat.*petroleum/i, /hp.*fuel/i],
  "Travel": [/makemytrip/i, /goibibo/i, /irctc/i, /uber/i, /ola/i, /rapido/i, /cleartrip/i],
  "Bills & Utilities": [/electricity/i, /water.*bill/i, /gas.*bill/i, /broadband/i, /internet/i, /jio/i, /airtel/i, /vi\b/i, /bsnl/i],
  "Medical": [/hospital/i, /pharma/i, /medical/i, /apollo/i, /1mg/i, /netmeds/i, /practo/i],
  "Insurance": [/insurance/i, /lic/i, /premium/i],
  "EMI": [/emi/i, /loan.*repay/i],
  "Investment": [/mutual.*fund/i, /sip/i, /zerodha/i, /groww/i, /kuvera/i, /coin/i, /nps/i, /ppf/i],
  "Transfer": [/neft/i, /rtgs/i, /imps/i, /upi/i, /transfer/i],
  "ATM": [/atm/i, /cash.*withdrawal/i],
  "Entertainment": [/netflix/i, /hotstar/i, /spotify/i, /prime.*video/i, /bookmyshow/i],
  "Education": [/school/i, /college/i, /tuition/i, /education/i, /course/i, /udemy/i],
};

const autoCategory = (desc: string): string => {
  for (const [cat, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (patterns.some((p) => p.test(desc))) return cat;
  }
  return "Uncategorized";
};

const parseDate = (str: string, format: string): string => {
  if (!str) return today();
  const s = str.trim();
  try {
    if (format === "YYYY-MM-DD") return s.slice(0, 10);
    if (format === "DD/MM/YY") {
      const [d, m, y] = s.split("/");
      const yr = parseInt(y) > 50 ? `19${y}` : `20${y.padStart(2, "0")}`;
      return `${yr}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    if (format === "DD/MM/YYYY") {
      const [d, m, y] = s.split("/");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    if (format === "DD-MM-YYYY") {
      const [d, m, y] = s.split("-");
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    if (format === "DD MMM YYYY") {
      const parts = s.split(/\s+/);
      const d = parts[0].padStart(2, "0");
      const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
      const m = months[parts[1].toLowerCase().slice(0, 3)] || "01";
      return `${parts[2]}-${m}-${d}`;
    }
    return s.slice(0, 10);
  } catch {
    return today();
  }
};

const parseCSV = (text: string) => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const vals = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { vals.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    vals.push(current.trim());
    return vals;
  });
  return { headers, rows };
};

export const BankStatementParserTab = ({ state, addItem }) => {
  const [selectedBank, setSelectedBank] = useState("hdfc");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [parsedTxns, setParsedTxns] = useState([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [duplicates, setDuplicates] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const bankFormat = BANK_FORMATS.find((b) => b.id === selectedBank) || BANK_FORMATS[0];

  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const { headers, rows } = parseCSV(text);

      const dateIdx = headers.findIndex((h) => h.toLowerCase().includes(bankFormat.dateCol.toLowerCase()));
      const descIdx = headers.findIndex((h) => h.toLowerCase().includes(bankFormat.descCol.toLowerCase()));
      const debitIdx = headers.findIndex((h) => h.toLowerCase().includes(bankFormat.debitCol.toLowerCase()));
      const creditIdx = headers.findIndex((h) => h.toLowerCase().includes(bankFormat.creditCol.toLowerCase()));

      const txns = rows.slice(bankFormat.skipRows).map((row, i) => {
        const desc = row[descIdx] || "";
        const debit = parseFloat((row[debitIdx] || "0").replace(/,/g, "")) || 0;
        const credit = parseFloat((row[creditIdx] || "0").replace(/,/g, "")) || 0;
        const amount = debit > 0 ? debit : credit;
        const type = debit > 0 ? "debit" : "credit";
        const date = parseDate(row[dateIdx] || "", bankFormat.dateFormat);

        return {
          id: uid(),
          rowIdx: i,
          date,
          description: desc,
          amount,
          type,
          category: autoCategory(desc),
          selected: true,
          isDuplicate: false,
        };
      }).filter((t) => t.amount > 0);

      // Mark potential duplicates
      const existingTxns = state.transactions || [];
      txns.forEach((t) => {
        const dup = existingTxns.find((e) =>
          e.date === t.date && Math.abs(Number(e.amount) - t.amount) < 1 && e.type === t.type
        );
        if (dup) t.isDuplicate = true;
      });

      setParsedTxns(txns);
      setShowPreview(true);
      setImported(0);
      setDuplicates(txns.filter((t) => t.isDuplicate).length);
    };
    reader.readAsText(file);
  }, [bankFormat, state.transactions]);

  const toggleTxn = (idx) => {
    setParsedTxns((prev) => prev.map((t, i) => i === idx ? { ...t, selected: !t.selected } : t));
  };

  const updateCategory = (idx, cat) => {
    setParsedTxns((prev) => prev.map((t, i) => i === idx ? { ...t, category: cat } : t));
    setEditingCategory(null);
  };

  const importSelected = async () => {
    setImporting(true);
    const toImport = parsedTxns.filter((t) => t.selected && !t.isDuplicate);
    for (const t of toImport) {
      await addItem("transactions", {
        date: t.date,
        amount: t.amount,
        type: t.type,
        category: t.category,
        note: t.description,
        accountId: selectedAccount || undefined,
      });
    }
    setImported(toImport.length);
    setImporting(false);
    setParsedTxns([]);
    setShowPreview(false);
  };

  const previewStats = useMemo(() => {
    const selected = parsedTxns.filter((t) => t.selected && !t.isDuplicate);
    const totalDebit = selected.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
    const totalCredit = selected.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
    return { count: selected.length, totalDebit, totalCredit };
  }, [parsedTxns]);

  const categories = [...new Set(Object.keys(CATEGORY_PATTERNS))].sort();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Import transactions from your bank CSV statements">Bank Statement Parser</SectionTitle>

      {imported > 0 && (
        <Card style={{ padding: 16, background: "#10B98115", border: "1px solid #10B98140" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle size={20} color="#10B981" />
            <span style={{ color: "#10B981", fontWeight: 600 }}>Successfully imported {imported} transactions!</span>
          </div>
        </Card>
      )}

      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: 12, color: THEME.textSecondary, display: "block", marginBottom: 4 }}>Bank Format</label>
            <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 14 }}>
              {BANK_FORMATS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: THEME.textSecondary, display: "block", marginBottom: 4 }}>Link to Account</label>
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 14 }}>
              <option value="">No account</option>
              {(state.bankAccounts || []).map((a) => <option key={a.id} value={a.id}>{a.name || a.bank} (****{(a.accountNumber || "").slice(-4)})</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: THEME.textSecondary, display: "block", marginBottom: 4 }}>Upload CSV</label>
            <input type="file" accept=".csv" onChange={handleFile}
              style={{ padding: "6px 0", fontSize: 14, color: THEME.text }} />
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: THEME.bg, fontSize: 13, color: THEME.textSecondary }}>
          <strong>Tip:</strong> Download your bank statement as CSV from your bank's netbanking portal. Select the matching bank format above.
          Column mapping: Date="{bankFormat.dateCol}", Description="{bankFormat.descCol}", Debit="{bankFormat.debitCol}", Credit="{bankFormat.creditCol}"
        </div>
      </Card>

      {/* Preview & Edit */}
      {showPreview && parsedTxns.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <StatCard label="Total Parsed" value={parsedTxns.length} icon={<FileText />} color="var(--accent)" />
            <StatCard label="Selected for Import" value={previewStats.count} icon={<CheckCircle />} color="#10B981" />
            <StatCard label="Duplicates Detected" value={duplicates} icon={<AlertTriangle />} color="#F59E0B" />
            <StatCard label="Total Debits" value={fmtINRFull(previewStats.totalDebit)} icon={<Download />} color="#EF4444" />
          </div>

          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: THEME.text }}>
                Preview ({parsedTxns.length} transactions)
              </h3>
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="ghost" size="sm" onClick={() => setParsedTxns((p) => p.map((t) => ({ ...t, selected: true })))}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setParsedTxns((p) => p.map((t) => ({ ...t, selected: false })))}>
                  Deselect All
                </Button>
                <Button variant="primary" size="sm" onClick={importSelected} disabled={importing || previewStats.count === 0}>
                  {importing ? "Importing..." : `Import ${previewStats.count} Transactions`}
                </Button>
              </div>
            </div>

            <div style={{ overflowX: "auto", maxHeight: 500, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${THEME.border}`, position: "sticky", top: 0, background: THEME.card, zIndex: 1 }}>
                    <th style={{ padding: 8, textAlign: "left", color: THEME.textSecondary }}>✓</th>
                    <th style={{ padding: 8, textAlign: "left", color: THEME.textSecondary }}>Date</th>
                    <th style={{ padding: 8, textAlign: "left", color: THEME.textSecondary }}>Description</th>
                    <th style={{ padding: 8, textAlign: "left", color: THEME.textSecondary }}>Category</th>
                    <th style={{ padding: 8, textAlign: "right", color: THEME.textSecondary }}>Amount</th>
                    <th style={{ padding: 8, textAlign: "center", color: THEME.textSecondary }}>Type</th>
                    <th style={{ padding: 8, textAlign: "center", color: THEME.textSecondary }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedTxns.map((t, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${THEME.border}`, opacity: t.isDuplicate ? 0.5 : 1 }}>
                      <td style={{ padding: 8 }}>
                        <input type="checkbox" checked={t.selected && !t.isDuplicate} disabled={t.isDuplicate}
                          onChange={() => toggleTxn(i)} />
                      </td>
                      <td style={{ padding: 8, color: THEME.text }}>{t.date}</td>
                      <td style={{ padding: 8, color: THEME.text, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</td>
                      <td style={{ padding: 8 }}>
                        {editingCategory === i ? (
                          <select autoFocus value={t.category} onChange={(e) => updateCategory(i, e.target.value)} onBlur={() => setEditingCategory(null)}
                            style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 12 }}>
                            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                            <option value="Uncategorized">Uncategorized</option>
                          </select>
                        ) : (
                          <span onClick={() => setEditingCategory(i)} style={{ cursor: "pointer", padding: "2px 8px", borderRadius: 6,
                            background: t.category === "Uncategorized" ? "#EF444420" : "var(--accent)15", color: t.category === "Uncategorized" ? "#EF4444" : "var(--accent)", fontSize: 12 }}>
                            {t.category}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: 8, textAlign: "right", fontWeight: 600, color: t.type === "credit" ? "#10B981" : "#EF4444" }}>
                        {fmtINRFull(t.amount)}
                      </td>
                      <td style={{ padding: 8, textAlign: "center" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: t.type === "credit" ? "#10B98120" : "#EF444420", color: t.type === "credit" ? "#10B981" : "#EF4444" }}>
                          {t.type === "credit" ? "CR" : "DR"}
                        </span>
                      </td>
                      <td style={{ padding: 8, textAlign: "center" }}>
                        {t.isDuplicate && (
                          <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, background: "#F59E0B20", color: "#F59E0B" }}>
                            Duplicate
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {!showPreview && parsedTxns.length === 0 && imported === 0 && (
        <EmptyState icon={Landmark} title="No Statements Loaded"
          description="Upload a bank CSV statement above to start parsing. Transactions will be auto-categorized and you can review before importing." />
      )}
    </div>
  );
};
