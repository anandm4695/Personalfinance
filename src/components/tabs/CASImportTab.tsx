// @ts-nocheck
import React, { useState, useMemo, useCallback } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Briefcase,
  IndianRupee,
  Eye,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, uid } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Button } from "../ui/Button";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";
import { Prv } from "../../context/PrivacyContext";

const MF_CATEGORY_MAP = {
  equity: "Equity",
  debt: "Debt",
  hybrid: "Hybrid",
  "elss": "ELSS",
  "liquid": "Liquid",
  "gilt": "Debt",
  "index": "Equity",
  "small cap": "Equity",
  "mid cap": "Equity",
  "large cap": "Equity",
  "flexi cap": "Equity",
  "multi cap": "Equity",
  "balanced": "Hybrid",
  "arbitrage": "Hybrid",
  "overnight": "Liquid",
  "ultra short": "Debt",
  "low duration": "Debt",
  "corporate bond": "Debt",
  "money market": "Liquid",
  "dynamic bond": "Debt",
  "banking": "Debt",
  "sectoral": "Equity",
  "thematic": "Equity",
  "focused": "Equity",
  "value": "Equity",
  "contra": "Equity",
  "dividend yield": "Equity",
};

const guessCategory = (name: string): string => {
  const lower = name.toLowerCase();
  for (const [key, cat] of Object.entries(MF_CATEGORY_MAP)) {
    if (lower.includes(key)) return cat;
  }
  return "Equity";
};

const parseCASText = (text: string) => {
  const lines = text.split(/\r?\n/);
  const holdings = [];
  let currentFolio = "";
  let currentAMC = "";
  let currentScheme = "";
  let currentNav = 0;
  let currentUnits = 0;
  let currentValue = 0;
  let inScheme = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect AMC
    const amcMatch = line.match(/^(.*?)\s*\(Formerly.*?\)$|^([A-Z][\w\s&]+Mutual Fund)/);
    if (amcMatch) {
      currentAMC = (amcMatch[1] || amcMatch[2] || "").trim();
    }

    // Detect Folio
    const folioMatch = line.match(/Folio\s*(?:No)?[:.]?\s*(\S+)/i);
    if (folioMatch) {
      currentFolio = folioMatch[1].replace(/[^0-9/]/g, "");
    }

    // Detect scheme name + units/NAV lines
    // Pattern: scheme names typically end with "- Growth" or "- IDCW" etc.
    const schemeMatch = line.match(/^(.+?(?:Growth|IDCW|Dividend|Direct|Regular|Plan).*)$/i);
    if (schemeMatch && !line.match(/^\d/) && line.length > 20) {
      if (inScheme && currentScheme && currentUnits > 0) {
        holdings.push({
          id: uid(),
          scheme: currentScheme,
          amc: currentAMC,
          folio: currentFolio,
          units: currentUnits,
          nav: currentNav,
          value: currentValue,
          category: guessCategory(currentScheme),
          selected: true,
        });
      }
      currentScheme = schemeMatch[1].trim();
      currentUnits = 0;
      currentNav = 0;
      currentValue = 0;
      inScheme = true;
    }

    // Detect closing units line — pattern: "Closing Unit Balance: 123.456"
    const closingMatch = line.match(/Closing\s+Unit\s+Balance\s*[:.]?\s*([\d,.]+)/i);
    if (closingMatch) {
      currentUnits = parseFloat(closingMatch[1].replace(/,/g, "")) || 0;
    }

    // Detect NAV line — pattern: "NAV on ... : INR 123.4567"
    const navMatch = line.match(/NAV\s+on.*?:\s*(?:INR\s*)?([\d,.]+)/i);
    if (navMatch) {
      currentNav = parseFloat(navMatch[1].replace(/,/g, "")) || 0;
    }

    // Detect valuation — pattern: "Valuation on ... : INR 1,23,456.78"
    const valMatch = line.match(/Valuation\s+on.*?:\s*(?:INR\s*)?([\d,.]+)/i);
    if (valMatch) {
      currentValue = parseFloat(valMatch[1].replace(/,/g, "")) || 0;
    }
  }

  // Capture last scheme
  if (inScheme && currentScheme && currentUnits > 0) {
    holdings.push({
      id: uid(),
      scheme: currentScheme,
      amc: currentAMC,
      folio: currentFolio,
      units: currentUnits,
      nav: currentNav,
      value: currentValue || currentUnits * currentNav,
      category: guessCategory(currentScheme),
      selected: true,
    });
  }

  return holdings;
};

export const CASImportTab = ({ state, addItem, updateItem }) => {
  const [parsedFunds, setParsedFunds] = useState([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [parseMethod, setParseMethod] = useState("text"); // "text" or "csv"
  const [rawText, setRawText] = useState("");

  const handlePaste = useCallback(() => {
    if (!rawText.trim()) return;
    const holdings = parseCASText(rawText);
    setParsedFunds(holdings);
    setImported(0);
  }, [rawText]);

  const handleCSV = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;

      // Try CSV parsing: scheme, folio, units, nav, value columns
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
      const schemeIdx = headers.findIndex((h) => h.includes("scheme") || h.includes("fund"));
      const folioIdx = headers.findIndex((h) => h.includes("folio"));
      const unitsIdx = headers.findIndex((h) => h.includes("unit"));
      const navIdx = headers.findIndex((h) => h.includes("nav"));
      const valueIdx = headers.findIndex((h) => h.includes("value") || h.includes("amount"));

      const holdings = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const scheme = vals[schemeIdx] || "";
        const folio = folioIdx >= 0 ? vals[folioIdx] || "" : "";
        const units = parseFloat((vals[unitsIdx] || "0").replace(/,/g, "")) || 0;
        const nav = navIdx >= 0 ? parseFloat((vals[navIdx] || "0").replace(/,/g, "")) || 0 : 0;
        const value = valueIdx >= 0 ? parseFloat((vals[valueIdx] || "0").replace(/,/g, "")) || 0 : units * nav;
        if (!scheme || units <= 0) return null;
        return {
          id: uid(),
          scheme,
          amc: "",
          folio,
          units,
          nav,
          value,
          category: guessCategory(scheme),
          selected: true,
        };
      }).filter(Boolean);

      setParsedFunds(holdings);
      setImported(0);
    };
    reader.readAsText(file);
  }, []);

  const importSelected = async () => {
    setImporting(true);
    const toImport = parsedFunds.filter((f) => f.selected);
    const existingMFs = state.mutualFunds || [];

    for (const f of toImport) {
      // Check if scheme already exists by folio
      const existing = existingMFs.find((m) =>
        (m.folio && f.folio && m.folio === f.folio) ||
        (m.name || m.scheme || "").toLowerCase() === f.scheme.toLowerCase()
      );

      if (existing) {
        await updateItem("mutualFunds", existing.id, {
          units: f.units,
          currentNav: f.nav,
          name: f.scheme,
          category: f.category,
          folio: f.folio || existing.folio,
        });
      } else {
        await addItem("mutualFunds", {
          name: f.scheme,
          category: f.category,
          folio: f.folio,
          units: f.units,
          buyNav: f.costValue && f.units ? (f.costValue / f.units) : "",
          currentNav: f.nav,
          invested: f.costValue || "",
        });
      }
    }

    setImported(toImport.length);
    setImporting(false);
    setParsedFunds([]);
  };

  const stats = useMemo(() => {
    const selected = parsedFunds.filter((f) => f.selected);
    const totalValue = selected.reduce((s, f) => s + f.value, 0);
    const byCat = {};
    selected.forEach((f) => {
      byCat[f.category] = (byCat[f.category] || 0) + f.value;
    });
    return { count: selected.length, totalValue, byCat };
  }, [parsedFunds]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Import Mutual Fund holdings from CAMS/KFintech Consolidated Account Statement">CAS Import</SectionTitle>

      {imported > 0 && (
        <Card style={{ padding: 16, background: "#10B98115", border: "1px solid #10B98140" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle size={20} color="#10B981" />
            <span style={{ color: "#10B981", fontWeight: 600 }}>
              Successfully imported/updated {imported} mutual fund holdings!
            </span>
          </div>
        </Card>
      )}

      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          {["text", "csv"].map((m) => (
            <button key={m} onClick={() => setParseMethod(m)}
              style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: parseMethod === m ? 600 : 400,
                border: `1px solid ${parseMethod === m ? "var(--accent)" : THEME.border}`,
                background: parseMethod === m ? "var(--accent)" : THEME.card, color: parseMethod === m ? "#fff" : THEME.text, fontSize: 13 }}>
              {m === "text" ? "Paste CAS Text" : "Upload CSV"}
            </button>
          ))}
        </div>

        {parseMethod === "text" ? (
          <div>
            <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} rows={12}
              placeholder="Copy-paste the text content from your CAS PDF here. You can use a PDF-to-text tool or copy from the PDF viewer..."
              style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.bg,
                color: THEME.text, fontSize: 13, fontFamily: "monospace", resize: "vertical" }} />
            <Button variant="primary" size="sm" onClick={handlePaste} style={{ marginTop: 12 }}>
              Parse CAS Text
            </Button>
          </div>
        ) : (
          <div>
            <input type="file" accept=".csv,.txt" onChange={handleCSV}
              style={{ padding: "6px 0", fontSize: 14, color: THEME.text }} />
            <div style={{ marginTop: 8, fontSize: 12, color: THEME.textSecondary }}>
              Expected columns: Scheme/Fund Name, Folio (optional), Units, NAV (optional), Value/Amount
            </div>
          </div>
        )}
      </Card>

      {/* Preview */}
      {parsedFunds.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <StatCard label="Funds Found" value={parsedFunds.length} icon={<Briefcase />} color="var(--accent)" />
            <StatCard label="Selected" value={stats.count} icon={<CheckCircle />} color="#10B981" />
            <StatCard label="Total Value" value={fmtINRFull(stats.totalValue)} icon={<IndianRupee />} color="#3B82F6" />
          </div>

          {/* Category Breakdown */}
          <Card style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Category Breakdown</h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {Object.entries(stats.byCat).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                <div key={cat} style={{ padding: "8px 16px", borderRadius: 8, background: THEME.bg, border: `1px solid ${THEME.border}` }}>
                  <div style={{ fontSize: 12, color: THEME.textSecondary }}>{cat}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text }}>{fmtINRFull(val)}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Holdings Table */}
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: THEME.text }}>Parsed Holdings</h3>
              <Button variant="primary" size="sm" onClick={importSelected} disabled={importing || stats.count === 0}>
                {importing ? "Importing..." : `Import ${stats.count} Funds`}
              </Button>
            </div>

            <div style={{ overflowX: "auto", maxHeight: 500, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${THEME.border}`, position: "sticky", top: 0, background: THEME.card }}>
                    <th style={{ padding: 8, textAlign: "left", color: THEME.textSecondary }}>✓</th>
                    <th style={{ padding: 8, textAlign: "left", color: THEME.textSecondary }}>Scheme</th>
                    <th style={{ padding: 8, textAlign: "left", color: THEME.textSecondary }}>Folio</th>
                    <th style={{ padding: 8, textAlign: "left", color: THEME.textSecondary }}>Category</th>
                    <th style={{ padding: 8, textAlign: "right", color: THEME.textSecondary }}>Units</th>
                    <th style={{ padding: 8, textAlign: "right", color: THEME.textSecondary }}>NAV</th>
                    <th style={{ padding: 8, textAlign: "right", color: THEME.textSecondary }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedFunds.map((f, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                      <td style={{ padding: 8 }}>
                        <input type="checkbox" checked={f.selected}
                          onChange={() => setParsedFunds((p) => p.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))} />
                      </td>
                      <td style={{ padding: 8, color: THEME.text, maxWidth: 350, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.scheme}</td>
                      <td style={{ padding: 8, color: THEME.textSecondary }}>{f.folio}</td>
                      <td style={{ padding: 8 }}>
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, background: "var(--accent)15", color: "var(--accent)" }}>{f.category}</span>
                      </td>
                      <td style={{ padding: 8, textAlign: "right", fontFamily: "monospace" }}>{f.units.toFixed(3)}</td>
                      <td style={{ padding: 8, textAlign: "right", fontFamily: "monospace" }}>{f.nav.toFixed(4)}</td>
                      <td style={{ padding: 8, textAlign: "right", fontWeight: 600, color: THEME.text }}>{fmtINRFull(f.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {parsedFunds.length === 0 && imported === 0 && (
        <EmptyState icon={Upload} title="Import Your CAS"
          description="Paste the text from your CAMS/KFintech CAS PDF or upload a CSV export. Your mutual fund holdings will be parsed and can be imported in one click." />
      )}
    </div>
  );
};
