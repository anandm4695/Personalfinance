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
  { key: "prepaidCards", label: "Prepaid Cards" },
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
  { key: "wishlists", label: "Watchlists" },
  { key: "wishlistItems", label: "Watchlist Items" },
  { key: "netWorthHistory", label: "Net Worth History" },
  { key: "reminders", label: "Reminders" },
  { key: "documents", label: "Documents" },
];

// Always wrap the value in quotes if it needs escaping (comma/quote/newline), doubling any
// internal quotes — an unquoted stringified object containing a comma otherwise shifts every
// subsequent CSV column for that row.
const csvCell = (val) => {
  if (val === null || val === undefined) return "";
  const str = typeof val === "object" ? JSON.stringify(val) : String(val);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const toCSV = (data, label) => {
  if (!Array.isArray(data) || data.length === 0) return null;
  const allKeys = new Set();
  data.forEach((row) => Object.keys(row).forEach((k) => allKeys.add(k)));
  const headers = [...allKeys].filter((k) => k !== "id" && k !== "userId" && k !== "user_id");
  const rows = data.map((row) => headers.map((h) => csvCell(row[h])).join(","));
  return [headers.join(","), ...rows].join("\n");
};

export const DataExportTab = ({ state, exportJSON, onRestoreBackup, showToast }) => {
  const [selectedSections, setSelectedSections] = useState(
    new Set(DATA_SECTIONS.map((s) => s.key))
  );
  const [exportFormat, setExportFormat] = useState("json");
  const [lastExport, setLastExport] = useState(null);

  const dataCounts = DATA_SECTIONS.map((s) => ({
    ...s,
    count: Array.isArray(state[s.key]) ? state[s.key].length : 0,
  }));

  const totalRecords = dataCounts.reduce((s, d) => s + d.count, 0);
  const selectedRecords = dataCounts
    .filter((d) => selectedSections.has(d.key))
    .reduce((s, d) => s + d.count, 0);

  const toggleSection = (key) => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExportJSON = useCallback(() => {
    // "JSON (Full Backup)" must mean *everything* — DATA_SECTIONS above only
    // lists a subset of collections (kept for the selective-CSV export below),
    // so route this through the app-level exportJSON(), which stringifies the
    // complete `state` object with every category. Only fall back to the
    // selective builder if exportJSON wasn't passed in for some reason.
    if (exportJSON) {
      exportJSON();
      setLastExport(new Date().toLocaleString());
      if (showToast) showToast("Full backup exported successfully!", "success");
      return;
    }
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
  }, [state, selectedSections, showToast, exportJSON]);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`
        .export-section-label:hover {
          border-color: color-mix(in srgb, var(--t-accent) 40%, var(--t-line)) !important;
        }
      `}</style>
      <SectionTitle sub="Download your financial data and restore from backups">
        Data Export & Backup
      </SectionTitle>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Total Records"
          value={totalRecords}
          icon={<Database />}
          color={THEME.accent}
        />
        <StatCard
          label="Selected for Export"
          value={selectedRecords}
          icon={<CheckCircle />}
          color={THEME.sage}
        />
        <StatCard
          label="Data Sections"
          value={dataCounts.filter((d) => d.count > 0).length}
          icon={<FileText />}
          color={THEME.accent}
        />
        {lastExport && (
          <StatCard label="Last Export" value={lastExport} icon={<Clock />} color={THEME.gold} />
        )}
      </div>

      {/* Export Panel */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>
          Export Data
        </h3>
        <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-end" }}>
          <div>
            <label
              style={{
                fontSize: 12,
                color: THEME.textSecondary,
                display: "block",
                marginBottom: 4,
              }}
            >
              Format
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: "json", label: "JSON (Full Backup)" },
                { id: "csv", label: "CSV (Spreadsheet)" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setExportFormat(f.id)}
                  aria-pressed={exportFormat === f.id}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    border: `1.5px solid ${exportFormat === f.id ? THEME.accent : THEME.border}`,
                    background: exportFormat === f.id ? THEME.accent : THEME.card,
                    color: exportFormat === f.id ? "#fff" : THEME.text,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (exportFormat !== f.id) e.currentTarget.style.borderColor = THEME.accent;
                  }}
                  onMouseLeave={(e) => {
                    if (exportFormat !== f.id) e.currentTarget.style.borderColor = THEME.border;
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <Button variant="primary" onClick={handleExport}>
            <Download size={16} />
            {exportFormat === "json"
              ? "Export Full Backup"
              : `Export ${selectedSections.size} Sections`}
          </Button>
        </div>

        {exportFormat === "json" && (
          <p style={{ fontSize: 12, color: THEME.textSecondary, marginTop: -12, marginBottom: 16 }}>
            JSON Full Backup always includes every data category, regardless of the section
            checkboxes below. Use CSV format to export only selected sections.
          </p>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setSelectedSections(new Set(DATA_SECTIONS.map((s) => s.key)))}
            style={{
              background: "none",
              border: `1px solid ${THEME.border}`,
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 12,
              cursor: "pointer",
              color: THEME.textSecondary,
            }}
          >
            Select All
          </button>
          <button
            onClick={() => setSelectedSections(new Set())}
            style={{
              background: "none",
              border: `1px solid ${THEME.border}`,
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 12,
              cursor: "pointer",
              color: THEME.textSecondary,
            }}
          >
            Deselect All
          </button>
          <button
            onClick={() =>
              setSelectedSections(new Set(dataCounts.filter((d) => d.count > 0).map((d) => d.key)))
            }
            style={{
              background: "none",
              border: `1px solid ${THEME.border}`,
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 12,
              cursor: "pointer",
              color: THEME.textSecondary,
            }}
          >
            Only Non-Empty
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 8,
          }}
        >
          {dataCounts.map((d) => (
            <label
              key={d.key}
              className="export-section-label"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 8,
                cursor: "pointer",
                background: selectedSections.has(d.key)
                  ? "color-mix(in srgb, var(--t-accent) 8%, transparent)"
                  : THEME.bg,
                border: `1px solid ${
                  selectedSections.has(d.key)
                    ? "color-mix(in srgb, var(--t-accent) 40%, transparent)"
                    : THEME.border
                }`,
                transition: "background 0.15s ease, border-color 0.15s ease",
              }}
            >
              <input
                type="checkbox"
                checked={selectedSections.has(d.key)}
                onChange={() => toggleSection(d.key)}
                style={{ accentColor: THEME.accent }}
              />
              <span style={{ fontSize: 13, color: THEME.text, flex: 1 }}>{d.label}</span>
              <span
                style={{
                  fontSize: 12,
                  color: d.count > 0 ? THEME.accent : THEME.textSecondary,
                  fontWeight: 600,
                }}
              >
                {d.count}
              </span>
            </label>
          ))}
        </div>
      </Card>

      {/* Restore Panel */}
      <Card style={{ padding: 24 }}>
        <h3
          style={{
            margin: "0 0 16px",
            fontSize: 16,
            fontWeight: 600,
            color: THEME.text,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Upload size={18} /> Restore from Backup
        </h3>
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: "color-mix(in srgb, var(--t-gold) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--t-gold) 30%, transparent)",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={16} color={THEME.gold} />
            <span style={{ fontSize: 13, fontWeight: 600, color: THEME.gold }}>Warning</span>
          </div>
          <span style={{ fontSize: 13, color: THEME.textSecondary }}>
            Restoring a backup will overwrite your current data. Make sure to export a backup first.
          </span>
        </div>
        <div style={{ position: "relative", display: "inline-block" }}>
          <Button variant="secondary" icon={<Upload size={15} />}>
            Choose Backup File (.json)
          </Button>
          <input
            type="file"
            accept=".json"
            aria-label="Choose backup file to restore"
            onChange={onRestoreBackup}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
          />
        </div>
      </Card>

      {/* Tips */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: THEME.text }}>
          Backup Tips
        </h3>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            fontSize: 13,
            color: THEME.textSecondary,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <Shield size={14} color={THEME.sage} /> Export a JSON backup regularly — it contains all
            your data
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Shield size={14} color={THEME.sage} /> CSV exports are great for sharing with your CA
            or financial advisor
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Shield size={14} color={THEME.sage} /> Store backups in a secure location (Google
            Drive, encrypted folder)
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Shield size={14} color={THEME.sage} /> Your data is also synced to Supabase if you're
            logged in
          </div>
        </div>
      </Card>
    </div>
  );
};
