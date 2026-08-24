// @ts-nocheck
import React, { useState, useMemo, useCallback } from "react";
import {
  Upload,
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Briefcase,
  IndianRupee,
  Eye,
  RefreshCw,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, uid } from "../../utils/finance";
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

const MF_CATEGORY_MAP = {
  equity: "Equity",
  debt: "Debt",
  hybrid: "Hybrid",
  elss: "ELSS",
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
  // Folio (and AMC) captured at the moment the *current* scheme heading was seen — real
  // CAS statements print "Folio No: X" once, followed by one or more scheme blocks under
  // it, so a new folio line legitimately precedes the next scheme. But this fund is only
  // pushed to `holdings` later, when the *following* scheme heading (or EOF) is reached —
  // by then `currentFolio`/`currentAMC` may have already moved on to that next fund's own
  // folio/AMC. Snapshotting at scheme-start and pushing the snapshot (not the live
  // variable) keeps each fund pinned to the folio/AMC that was actually active for it.
  let schemeFolio = "";
  let schemeAMC = "";
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
          amc: schemeAMC,
          folio: schemeFolio,
          units: currentUnits,
          nav: currentNav,
          value: currentValue,
          category: guessCategory(currentScheme),
          selected: true,
        });
      }
      currentScheme = schemeMatch[1].trim();
      schemeFolio = currentFolio;
      schemeAMC = currentAMC;
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
      amc: schemeAMC,
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

export const CASImportTab = ({ state, addItem, updateItem, activeProfile = "all" }) => {
  const { familyProfiles } = useMasterData();
  const [parsedFunds, setParsedFunds] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [imported, setImported] = useState(0);
  const [parseMethod, setParseMethod] = useState("pdf"); // "pdf" | "text" | "csv"
  const [rawText, setRawText] = useState("");
  const [csvInputFocused, setCsvInputFocused] = useState(false);
  const [csvParsing, setCsvParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [owner, setOwner] = useState(activeProfile !== "all" ? activeProfile : "self");

  const runParse = useCallback((text) => {
    setParseError("");
    const holdings = parseCASText(text);
    if (holdings.length === 0) {
      setParseError(
        "No fund holdings found in that text. Make sure it includes the \"Closing Unit Balance\" / NAV / Valuation lines from the CAS, not just the summary page."
      );
      setParsedFunds([]);
      return;
    }
    setParsedFunds(holdings);
    setImported(0);
  }, []);

  const handlePaste = useCallback(() => {
    if (!rawText.trim()) return;
    runParse(rawText);
  }, [rawText, runParse]);

  const pdfExtract = useCasPdfExtract((text) => {
    setRawText(text);
    runParse(text);
  });

  const handleCSV = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError("");
    setCsvParsing(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") {
        setCsvParsing(false);
        setParseError("Could not read that file as text. Please choose a CSV or TXT export.");
        return;
      }

      // Try CSV parsing: scheme, folio, units, nav, value columns
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setCsvParsing(false);
        setParseError("The file looks empty — it needs a header row plus at least one fund row.");
        return;
      }
      const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
      const schemeIdx = headers.findIndex((h) => h.includes("scheme") || h.includes("fund"));
      const folioIdx = headers.findIndex((h) => h.includes("folio"));
      const unitsIdx = headers.findIndex((h) => h.includes("unit"));
      const navIdx = headers.findIndex((h) => h.includes("nav"));
      const valueIdx = headers.findIndex((h) => h.includes("value") || h.includes("amount"));

      const holdings = lines
        .slice(1)
        .map((line) => {
          // A plain split(",") would misalign every column once a scheme name itself
          // contains a comma (e.g. "Axis Small Cap Fund, Direct - Growth") — parseCsvLine
          // understands quoted fields so embedded commas don't get treated as delimiters.
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
            amc: "",
            folio,
            units,
            nav,
            value,
            category: guessCategory(scheme),
            selected: true,
          };
        })
        .filter(Boolean);

      setCsvParsing(false);
      if (holdings.length === 0) {
        setParseError(
          schemeIdx === -1 || unitsIdx === -1
            ? "Couldn't find Scheme/Fund and Units columns in the header row — check the column names match the expected format below."
            : "No valid fund rows found — every row needs a scheme name and a positive units value."
        );
        setParsedFunds([]);
        return;
      }
      setParsedFunds(holdings);
      setImported(0);
    };
    reader.onerror = () => {
      setCsvParsing(false);
      setParseError("Failed to read the file. Please try again.");
    };
    reader.readAsText(file);
    // Allow re-selecting the same file later (e.g. after fixing it) — without this,
    // choosing the identical filename twice in a row wouldn't fire onChange again.
    e.target.value = "";
  }, []);

  const importSelected = async () => {
    setImporting(true);
    setParseError("");
    const rawToImport = parsedFunds.filter((f) => f.selected);

    // The same scheme can appear twice in one parse (CAS statements often repeat a scheme
    // across a "Transaction Details" section and a "Valuation"/summary section further down)
    // — matching each occurrence only against a snapshot of *existing saved* funds would let
    // both slip through as separate "new" holdings. Dedupe within this batch first, keeping
    // the last occurrence (later sections of a CAS are typically the more complete one).
    const dedupeKey = (f) => (f.folio ? `folio:${f.folio}` : `name:${(f.scheme || "").toLowerCase()}`);
    const deduped = new Map();
    rawToImport.forEach((f) => deduped.set(dedupeKey(f), f));
    const toImport = Array.from(deduped.values());

    const existingMFs = state.mutualFunds || [];
    setImportProgress({ done: 0, total: toImport.length });

    try {
      for (let i = 0; i < toImport.length; i++) {
        const f = toImport[i];
        // Match by folio when both sides have one recorded — the same scheme name
        // can legitimately exist under multiple folios, so name must never override
        // a folio mismatch. Only fall back to name matching when neither side has
        // folio info to compare.
        const existing = existingMFs.find((m) => {
          if (m.folioNumber && f.folio) return m.folioNumber === f.folio;
          return (
            !m.folioNumber &&
            !f.folio &&
            (m.name || m.scheme || "").toLowerCase() === f.scheme.toLowerCase()
          );
        });

        if (existing) {
          // A re-import overwrites `units` with the CAS closing balance but previously left
          // `invested` (cost basis) untouched — if units changed since the last import (new
          // SIP installments, or a partial redemption), that silently corrupts the average
          // cost per unit and any downstream P&L/LTCG math. Scale the cost basis by the same
          // units ratio instead, same "avg cost per unit x remaining/new units" convention
          // used for the redemption-cost-basis fix below in mergeMode. This snapshot format
          // has no per-transaction cost data, so it's a best-effort carry-forward of the
          // existing average cost, not a precise recomputation of newly purchased units.
          const existingUnits = parseFloat(existing.units || "0");
          const existingInvested = parseFloat(existing.invested || "0");
          const newUnits = parseFloat(f.units || "0");
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
          });
        } else {
          await addItem("mutualFunds", {
            name: f.scheme,
            category: f.category,
            folioNumber: f.folio,
            units: f.units,
            buyNav: f.value && f.units ? f.value / f.units : "",
            currentNav: f.nav,
            invested: f.value || "",
            owner,
          });
        }
        setImportProgress({ done: i + 1, total: toImport.length });
      }

      setImported(toImport.length);
      setParsedFunds([]);
    } catch (e) {
      setParseError(
        `Import failed partway through (${e?.message || "unknown error"}) — some holdings above may already be saved. Re-check your list before importing again.`
      );
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
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
      <SectionTitle sub="Upload your CAMS/KFintech Consolidated Account Statement PDF directly, or paste text/CSV">
        CAS Import
      </SectionTitle>

      {imported > 0 && (
        <Card
          style={{
            padding: 16,
            background: "color-mix(in srgb, var(--t-sage) 15%, transparent)",
            border: "1px solid color-mix(in srgb, var(--t-sage) 40%, transparent)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }} role="status" aria-live="polite">
            <CheckCircle size={20} color="var(--t-sage)" />
            <span style={{ color: "var(--t-sage)", fontWeight: 600 }}>
              Successfully imported/updated {imported} mutual fund holdings!
            </span>
          </div>
        </Card>
      )}

      {parseError && (
        <Card
          style={{
            padding: 16,
            background: "color-mix(in srgb, var(--t-rust) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--t-rust) 35%, transparent)",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
            role="alert"
            aria-live="assertive"
          >
            <AlertTriangle size={18} color="var(--t-rust)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ color: "var(--t-rust)", fontWeight: 600, fontSize: 13, lineHeight: 1.5 }}>
              {parseError}
            </span>
          </div>
        </Card>
      )}

      <Card style={{ padding: 24 }}>
        <div
          role="tablist"
          aria-label="Import method"
          style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}
        >
          {["pdf", "text", "csv"].map((m) => (
            <button
              key={m}
              onClick={() => {
                setParseMethod(m);
                setParseError("");
              }}
              className="card-lift"
              role="tab"
              aria-selected={parseMethod === m}
              style={{
                padding: "8px 18px",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: parseMethod === m ? 700 : 500,
                border: `1.5px solid ${parseMethod === m ? THEME.accent : THEME.border}`,
                background: parseMethod === m ? THEME.accent : "var(--surface-0)",
                color: parseMethod === m ? "#fff" : THEME.text,
                fontSize: 13,
                transition: "all 0.15s ease",
              }}
            >
              {m === "pdf" ? "Upload PDF" : m === "text" ? "Paste CAS Text" : "Upload CSV"}
            </button>
          ))}
        </div>

        {parseMethod === "pdf" ? (
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
                gap: 8,
                padding: "36px 20px",
                borderRadius: "var(--radius-lg)",
                border: `2px dashed ${pdfExtract.busy ? "var(--t-accent)" : THEME.border}`,
                background: "color-mix(in srgb, var(--surface-1) 40%, transparent)",
                cursor: pdfExtract.busy ? "wait" : "pointer",
                opacity: pdfExtract.busy ? 0.7 : 1,
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
            >
              {pdfExtract.busy ? (
                <RefreshCw size={26} color={THEME.accent} className="animate-spin" />
              ) : (
                <UploadCloud size={26} color={THEME.accent} />
              )}
              <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text }}>
                {pdfExtract.busy ? "Reading PDF…" : "Click to choose your CAS PDF"}
              </div>
              <div style={{ fontSize: 12, color: THEME.textSecondary }}>
                Works with password-protected CAMS/KFintech statements. Read entirely in your
                browser — the file is never uploaded anywhere.
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
              <div style={{ marginTop: 14 }}>
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
                style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: "var(--t-rust)" }}
              >
                {pdfExtract.error}
              </div>
            )}
          </div>
        ) : parseMethod === "text" ? (
          <div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={12}
              aria-label="CAS statement text"
              placeholder="Copy-paste the text content from your CAS PDF here. You can use a PDF-to-text tool or copy from the PDF viewer..."
              className="form-input"
              style={{
                fontFamily: "var(--font-mono)",
                resize: "vertical",
                lineHeight: 1.6,
              }}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handlePaste}
              disabled={!rawText.trim()}
              style={{ marginTop: 14 }}
            >
              Parse CAS Text
            </Button>
          </div>
        ) : (
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
                gap: 8,
                padding: "36px 20px",
                borderRadius: "var(--radius-lg)",
                border: `2px dashed ${csvInputFocused ? "var(--t-accent)" : THEME.border}`,
                background: "color-mix(in srgb, var(--surface-1) 40%, transparent)",
                boxShadow: csvInputFocused ? "var(--shadow-focus)" : "none",
                cursor: csvParsing ? "wait" : "pointer",
                opacity: csvParsing ? 0.7 : 1,
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
            >
              {csvParsing ? (
                <RefreshCw size={26} color={THEME.accent} className="animate-spin" />
              ) : (
                <Upload size={26} color={THEME.accent} />
              )}
              <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text }}>
                {csvParsing ? "Parsing file…" : "Click to choose a CSV or TXT file"}
              </div>
              <div style={{ fontSize: 12, color: THEME.textSecondary }}>
                Expected columns: Scheme/Fund Name, Folio (optional), Units, NAV (optional),
                Value/Amount
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
          </div>
        )}
      </Card>

      {/* Preview */}
      {parsedFunds.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
            }}
          >
            <StatCard
              label="Funds Found"
              value={parsedFunds.length.toLocaleString("en-IN")}
              numericValue={parsedFunds.length}
              formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
              icon={<Briefcase />}
              color={THEME.accent}
            />
            <StatCard
              label="Selected"
              value={stats.count.toLocaleString("en-IN")}
              numericValue={stats.count}
              formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
              icon={<CheckCircle />}
              color={THEME.sage}
            />
            <StatCard
              label="Total Value"
              value={fmtINRFull(stats.totalValue)}
              numericValue={stats.totalValue}
              formatValue={fmtINRFull}
              icon={<IndianRupee />}
              color={THEME.accent}
            />
          </div>

          {/* Category Breakdown */}
          <Card style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: THEME.text }}>
              Category Breakdown
            </h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {Object.entries(stats.byCat)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, val]) => (
                  <div
                    key={cat}
                    className="card-lift"
                    style={{
                      padding: "10px 18px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--surface-1)",
                      border: `1px solid ${THEME.border}`,
                    }}
                  >
                    <div style={{ fontSize: 12, color: THEME.textSecondary }}>{cat}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text }}>
                      <Money value={val} variant="full" />
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* Holdings Table */}
          <Card style={{ padding: 24 }}>
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
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: THEME.text }}>
                Parsed Holdings
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: THEME.textSecondary,
                  }}
                >
                  New funds owner
                  <select
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    disabled={importing}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 8px",
                      borderRadius: 6,
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
                  size="sm"
                  onClick={importSelected}
                  loading={importing}
                  disabled={stats.count === 0}
                >
                  {importing
                    ? importProgress
                      ? `Importing ${importProgress.done}/${importProgress.total}…`
                      : "Importing…"
                    : `Import ${stats.count} Funds`}
                </Button>
              </div>
            </div>

            <div style={{ overflowX: "auto", maxHeight: 500, overflowY: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: 620,
                  borderCollapse: "collapse",
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: `2px solid ${THEME.border}`,
                      position: "sticky",
                      top: 0,
                      background: THEME.card,
                    }}
                  >
                    <th style={{ padding: 8, textAlign: "left", color: THEME.textSecondary }}>
                      <input
                        type="checkbox"
                        checked={parsedFunds.length > 0 && parsedFunds.every((f) => f.selected)}
                        onChange={() => {
                          const allSelected = parsedFunds.every((f) => f.selected);
                          setParsedFunds((p) => p.map((x) => ({ ...x, selected: !allSelected })));
                        }}
                        disabled={importing}
                        aria-label={
                          parsedFunds.every((f) => f.selected)
                            ? "Deselect all funds"
                            : "Select all funds"
                        }
                      />
                    </th>
                    <th style={{ padding: 8, textAlign: "left", color: THEME.textSecondary }}>
                      Scheme
                    </th>
                    <th style={{ padding: 8, textAlign: "left", color: THEME.textSecondary }}>
                      Folio
                    </th>
                    <th style={{ padding: 8, textAlign: "left", color: THEME.textSecondary }}>
                      Category
                    </th>
                    <th style={{ padding: 8, textAlign: "right", color: THEME.textSecondary }}>
                      Units
                    </th>
                    <th style={{ padding: 8, textAlign: "right", color: THEME.textSecondary }}>
                      NAV
                    </th>
                    <th style={{ padding: 8, textAlign: "right", color: THEME.textSecondary }}>
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parsedFunds.map((f, i) => (
                    <tr
                      key={i}
                      className="table-row-hover"
                      style={{ borderBottom: `1px solid ${THEME.border}` }}
                    >
                      <td style={{ padding: 8 }}>
                        <input
                          type="checkbox"
                          checked={f.selected}
                          disabled={importing}
                          aria-label={`Include ${f.scheme || "this fund"} in import`}
                          onChange={() =>
                            setParsedFunds((p) =>
                              p.map((x, j) => (j === i ? { ...x, selected: !x.selected } : x))
                            )
                          }
                        />
                      </td>
                      <td
                        style={{
                          padding: 8,
                          color: THEME.text,
                          maxWidth: 350,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {f.scheme}
                      </td>
                      <td style={{ padding: 8, color: THEME.textSecondary }}>{f.folio}</td>
                      <td style={{ padding: 8 }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "var(--radius-xs)",
                            fontSize: 11,
                            background: "color-mix(in srgb, var(--t-accent) 15%, transparent)",
                            color: THEME.accent,
                          }}
                        >
                          {f.category}
                        </span>
                      </td>
                      <td style={{ padding: 8, textAlign: "right" }}>
                        {f.units.toFixed(3)}
                      </td>
                      <td style={{ padding: 8, textAlign: "right" }}>
                        {f.nav.toFixed(4)}
                      </td>
                      <td
                        style={{
                          padding: 8,
                          textAlign: "right",
                          fontWeight: 600,
                          color: THEME.text,
                        }}
                      >
                        <Money value={f.value} variant="full" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {parsedFunds.length === 0 && imported === 0 && (
        <EmptyState
          icon={Upload}
          title="Import Your CAS"
          pills={["CAMS", "KFintech", "Direct PDF upload"]}
          description="Upload your CAMS/KFintech CAS PDF directly (password-protected is fine), paste statement text, or upload a CSV export. Your mutual fund holdings will be parsed and can be imported in one click."
        />
      )}
    </div>
  );
};
