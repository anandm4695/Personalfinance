// @ts-nocheck
import React, { useState, useCallback } from "react";
import {
  Download,
  Upload,
  FileText,
  Shield,
  CheckCircle,
  AlertTriangle,
  Database,
  Clock,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, today } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Button } from "../ui/Button";
import { StatCard } from "../ui/StatCard";

const DATA_SECTIONS = [
  { key: "bankAccounts", label: "Bank Accounts" },
  { key: "transactions", label: "Transactions" },
  { key: "fixedDeposits", label: "Fixed Deposits" },
  { key: "recurringDeposits", label: "Recurring Deposits" },
  { key: "bonds", label: "Bonds" },
  { key: "ppf", label: "PPF" },
  { key: "nps", label: "NPS" },
  { key: "epf", label: "EPF" },
  { key: "mutualFunds", label: "Mutual Funds" },
  { key: "stocks", label: "Stocks" },
  { key: "demat", label: "Demat Accounts" },
  { key: "creditCards", label: "Credit Cards" },
  { key: "loansTaken", label: "Loans Taken" },
  { key: "loansGiven", label: "Loans Given" },
  { key: "goals", label: "Goals" },
  { key: "budgets", label: "Budgets" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "income", label: "Income Entries" },
  { key: "taxPayments", label: "Tax Payments" },
  { key: "lic", label: "LIC Policies" },
  { key: "termPlans", label: "Term Plans" },
  { key: "investmentPlans", label: "Investment Plans" },
  { key: "rentalProperties", label: "Rental Properties" },
  { key: "realEstateProperties", label: "Real Estate" },
  { key: "vehicles", label: "Vehicles" },
  { key: "dividends", label: "Dividends" },
  { key: "sips", label: "SIPs" },
  { key: "stockSells", label: "Stock Sells" },
  { key: "mfSells", label: "MF Sells" },
  { key: "goldHoldings", label: "Gold Holdings" },
  { key: "lifeEvents", label: "Life Events" },
  { key: "netWorthHistory", label: "Net Worth History" },
  { key: "reminders", label: "Reminders" },
  { key: "documents", label: "Documents" },
];

const toCSV = (data, label) => {
  if (!Array.isArray(data) || data.length === 0) return null;
  const allKeys = new Set();
  data.forEach((row) => Object.keys(row).forEach((k) => allKeys.add(k)));
  const headers = [...allKeys].filter((k) => k !== "id" && k !== "userId" && k !== "user_id");
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      if (typeof val === "object") return JSON.stringify(val).replace(/"/g, '""');
      return String(val).includes(",") ? `"${val}"` : val;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
};

export const DataExportTab = ({ state, exportJSON, onRestoreBackup, showToast }) => {
  const [selectedSections, setSelectedSections] = useState(new Set(DATA_SECTIONS.map((s) => s.key)));
  const [exportFormat, setExportFormat] = useState("json");
  const [lastExport, setLastExport] = useState(null);

  const dataCounts = DATA_SECTIONS.map((s) => ({
    ...s,
    count: Array.isArray(state[s.key]) ? state[s.key].length : 0,
  }));

  const totalRecords = dataCounts.reduce((s, d) => s + d.count, 0);
  const selectedRecords = dataCounts.filter((d) => selectedSections.has(d.key)).reduce((s, d) => s + d.count, 0);

  const toggleSection = (key) => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleExportJSON = useCallback(() => {
    const exportData = { _exportDate: today(), _version: "2.0" };
    DATA_SECTIONS.forEach((s) => {
      if (selectedSections.has(s.key) && state[s.key]) {
        exportData[s.key] = state[s.key];
      }
    });
    exportData.profile = state.profile;
    exportData.settings = state.settings;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `personal-finance-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLastExport(new Date().toLocaleString());
    if (showToast) showToast("Data exported successfully!", "success");
  }, [state, selectedSections, showToast]);

  const handleExportCSV = useCallback(() => {
    const csvFiles = [];
    DATA_SECTIONS.forEach((s) => {
      if (!selectedSections.has(s.key) || !state[s.key] || !state[s.key].length) return;
      const csv = toCSV(state[s.key], s.label);
      if (csv) csvFiles.push({ name: s.key, csv });
    });

    if (csvFiles.length === 0) {
      if (showToast) showToast("No data to export", "warn");
      return;
    }

    // If single section, download directly
    if (csvFiles.length === 1) {
      const blob = new Blob([csvFiles[0].csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${csvFiles[0].name}-${today()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Multiple: combine into one big CSV with section headers
      let combined = "";
      csvFiles.forEach((f) => {
        combined += `\n=== ${f.name.toUpperCase()} ===\n${f.csv}\n`;
      });
      const blob = new Blob([combined], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `personal-finance-export-${today()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setLastExport(new Date().toLocaleString());
    if (showToast) showToast(`Exported ${csvFiles.length} sections as CSV!`, "success");
  }, [state, selectedSections, showToast]);

  const handleExport = () => {
    if (exportFormat === "json") handleExportJSON();
    else handleExportCSV();
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result);
        if (onRestoreBackup) onRestoreBackup(data);
        if (showToast) showToast("Backup restored successfully!", "success");
      } catch {
        if (showToast) showToast("Invalid backup file", "error");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Download your financial data and restore from backups">Data Export & Backup</SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <StatCard label="Total Records" value={totalRecords} icon={<Database />} color="var(--accent)" />
        <StatCard label="Selected for Export" value={selectedRecords} icon={<CheckCircle />} color="#10B981" />
        <StatCard label="Data Sections" value={dataCounts.filter((d) => d.count > 0).length} icon={<FileText />} color="#3B82F6" />
        {lastExport && <StatCard label="Last Export" value={lastExport} icon={<Clock />} color="#F59E0B" />}
      </div>

      {/* Export Panel */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Export Data</h3>
        <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: 12, color: THEME.textSecondary, display: "block", marginBottom: 4 }}>Format</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ id: "json", label: "JSON (Full Backup)" }, { id: "csv", label: "CSV (Spreadsheet)" }].map((f) => (
                <button key={f.id} onClick={() => setExportFormat(f.id)}
                  style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                    border: `1px solid ${exportFormat === f.id ? "var(--accent)" : THEME.border}`,
                    background: exportFormat === f.id ? "var(--accent)" : THEME.card, color: exportFormat === f.id ? "#fff" : THEME.text }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <Button variant="primary" onClick={handleExport}>
            <Download size={16} /> Export {selectedSections.size} Sections
          </Button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => setSelectedSections(new Set(DATA_SECTIONS.map((s) => s.key)))}
            style={{ background: "none", border: `1px solid ${THEME.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: THEME.textSecondary }}>
            Select All
          </button>
          <button onClick={() => setSelectedSections(new Set())}
            style={{ background: "none", border: `1px solid ${THEME.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: THEME.textSecondary }}>
            Deselect All
          </button>
          <button onClick={() => setSelectedSections(new Set(dataCounts.filter((d) => d.count > 0).map((d) => d.key)))}
            style={{ background: "none", border: `1px solid ${THEME.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: THEME.textSecondary }}>
            Only Non-Empty
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
          {dataCounts.map((d) => (
            <label key={d.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, cursor: "pointer",
              background: selectedSections.has(d.key) ? "var(--accent)08" : THEME.bg, border: `1px solid ${selectedSections.has(d.key) ? "var(--accent)40" : THEME.border}` }}>
              <input type="checkbox" checked={selectedSections.has(d.key)} onChange={() => toggleSection(d.key)}
                style={{ accentColor: "var(--accent)" }} />
              <span style={{ fontSize: 13, color: THEME.text, flex: 1 }}>{d.label}</span>
              <span style={{ fontSize: 12, color: d.count > 0 ? "var(--accent)" : THEME.textSecondary, fontWeight: 600 }}>{d.count}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Restore Panel */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text, display: "flex", alignItems: "center", gap: 8 }}>
          <Upload size={18} /> Restore from Backup
        </h3>
        <div style={{ padding: 16, borderRadius: 12, background: "#F59E0B10", border: "1px solid #F59E0B30", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={16} color="#F59E0B" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#F59E0B" }}>Warning</span>
          </div>
          <span style={{ fontSize: 13, color: THEME.textSecondary }}>
            Restoring a backup will overwrite your current data. Make sure to export a backup first.
          </span>
        </div>
        <input type="file" accept=".json" onChange={handleImport}
          style={{ fontSize: 14, color: THEME.text }} />
      </Card>

      {/* Tips */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Backup Tips</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: THEME.textSecondary }}>
          <div style={{ display: "flex", gap: 8 }}><Shield size={14} color="#10B981" /> Export a JSON backup regularly — it contains all your data</div>
          <div style={{ display: "flex", gap: 8 }}><Shield size={14} color="#10B981" /> CSV exports are great for sharing with your CA or financial advisor</div>
          <div style={{ display: "flex", gap: 8 }}><Shield size={14} color="#10B981" /> Store backups in a secure location (Google Drive, encrypted folder)</div>
          <div style={{ display: "flex", gap: 8 }}><Shield size={14} color="#10B981" /> Your data is also synced to Supabase if you're logged in</div>
        </div>
      </Card>
    </div>
  );
};
