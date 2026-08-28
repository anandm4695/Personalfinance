// @ts-nocheck
import React, { useState, useMemo } from "react";
import { AlertCircle, Bot, CheckCircle, GitMerge, UploadCloud, X } from "lucide-react";
import { THEME } from "../../utils/constants";
import { uid } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { PdfPasswordPrompt } from "../ui/PdfPasswordPrompt";
import { Money } from "../ui/Money";
import { useCasPdfExtract } from "../../hooks/useCasPdfExtract";
import { useMasterData, formatProfileOption } from "../../utils/masterData";

interface MFCasPanelProps {
  onImport: (data: any[], onProgress?: (done: number, total: number) => void) => Promise<void> | void;
  onClose: () => void;
  existingFunds?: any[];
  activeProfile?: string;
}

/* ── Fuzzy match helper ────────────────────────────────────────────── */
const normalizeScheme = (name: string) =>
  (name || "")
    .toLowerCase()
    .replace(/\s*-\s*/g, " ")
    .replace(/\(.*?\)/g, "")
    .replace(/\b(direct|regular|plan|growth|dividend|idcw|option)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const fuzzyScore = (a: string, b: string): number => {
  const na = normalizeScheme(a);
  const nb = normalizeScheme(b);
  if (na === nb) return 1;
  // Token overlap ratio
  const ta = new Set(na.split(" ").filter(Boolean));
  const tb = new Set(nb.split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  ta.forEach((w) => {
    if (tb.has(w)) overlap++;
  });
  return (2 * overlap) / (ta.size + tb.size);
};

const FUZZY_THRESHOLD = 0.6;

/* ── AMFI code extractor ───────────────────────────────────────────── */
const extractAmfiCode = (line: string): string => {
  // AMFI codes are typically 6-digit numbers after scheme name or in parentheses
  const bracketMatch = line.match(/\((\d{5,6})\)/);
  if (bracketMatch) return bracketMatch[1];
  // Sometimes: "INF... - 123456" or "ISIN: INF..." followed by code
  const trailingMatch = line.match(/(?:AMFI|Code|ISIN)\s*[:\-]?\s*(\d{5,6})\b/i);
  if (trailingMatch) return trailingMatch[1];
  // Pattern: scheme name followed by standalone 5-6 digit number at end of line
  const endMatch = line.match(/\b(\d{5,6})\s*$/);
  if (endMatch) return endMatch[1];
  return "";
};

export const MFCasPanel: React.FC<MFCasPanelProps> = ({
  onImport,
  onClose,
  existingFunds = [],
  activeProfile = "all",
}) => {
  const { familyProfiles } = useMasterData();
  const [inputText, setInputText] = useState("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [importDone, setImportDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [mergeMode, setMergeMode] = useState(true);
  const [owner, setOwner] = useState(activeProfile !== "all" ? activeProfile : "self");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(
    null
  );

  /* ── Build match map from parsed rows to existing funds ────────── */
  const matchMap = useMemo(() => {
    const map = new Map<number, { fund: any; score: number }>();
    parsedRows.forEach((row, idx) => {
      let bestMatch: any = null;
      let bestScore = 0;
      existingFunds.forEach((ef) => {
        // Folio number disambiguates the same scheme name held under multiple folios
        // (e.g. different family members' accounts) — a fuzzy name match alone would
        // wrongly merge them and corrupt cost basis. Same folio-first rule CASImportTab
        // already applies; only skip this candidate when BOTH sides have a folio and
        // they disagree — fall back to pure name matching when either side lacks one.
        if (row.folioNumber && ef.folioNumber && row.folioNumber !== ef.folioNumber) return;
        const s = fuzzyScore(row.name, ef.name || ef.scheme || "");
        if (s > bestScore) {
          bestScore = s;
          bestMatch = ef;
        }
      });
      if (bestScore >= FUZZY_THRESHOLD && bestMatch) {
        map.set(idx, { fund: bestMatch, score: bestScore });
      }
    });
    return map;
  }, [parsedRows, existingFunds]);

  const parseCasText = (text: string) => {
    setError("");
    setParsedRows([]);
    setImportDone(false);

    if (!text.trim()) {
      setError("Please paste some text first.");
      return;
    }

    try {
      const lines = text.split("\n");
      const rows: any[] = [];

      let currentScheme = "";
      let currentFolio = "";
      let currentCategory = "Equity";
      let currentMfType = "Direct Growth";
      let currentAmfiCode = "";

      // Date pattern matching: e.g. 15-Apr-2025 or 15/04/2025
      const dateRegex =
        /(\d{1,2})[-/](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|0?\d)[-/](\d{2,4})/i;

      // Month name mapping to standard month indices
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

      const parseDate = (dStr: string) => {
        const m = dStr.match(dateRegex);
        if (!m) return null;
        let day = m[1].padStart(2, "0");
        let monthStr = m[2].toLowerCase();
        let year = m[3];

        if (year.length === 2) {
          year = "20" + year; // assume 20xx
        }

        let month = MONTHS[monthStr] || monthStr.padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 1. Detect Folio Number
        // e.g. Folio No: 12345678/90  or  Folio: 98765432
        // Regex alternation tries branches in order, not longest-match — with
        // (?:Folio|Folio\s+No|Folio\s+Number) the "Folio" branch always wins first against
        // "Folio No: 12345678/90", leaving "No" to satisfy the [:\-\s] separator and get
        // captured as the "folio number" itself. Making "No."/"Number" one optional group
        // after "Folio" (matching CASImportTab's already-correct pattern) avoids that trap.
        const folioMatch = line.match(/Folio\s*(?:No\.?|Number)?\s*[:\-]?\s*([\w\/\-]+)/i);
        if (folioMatch) {
          currentFolio = folioMatch[1].trim();
          continue;
        }

        // 2. Detect Scheme/Fund Name
        // Explicit scheme label: e.g. "Scheme: Axis Small Cap Fund - Direct Plan - Growth"
        const schemeLabelMatch = line.match(/(?:Scheme|Scheme\s+Name)\s*[:\-\s]\s*(.+)/i);
        if (schemeLabelMatch) {
          currentScheme = schemeLabelMatch[1].trim();
          // Extract AMFI code if present
          const amfi = extractAmfiCode(currentScheme);
          if (amfi) currentAmfiCode = amfi;
          // Auto-detect type from scheme name
          if (currentScheme.toLowerCase().includes("debt")) currentCategory = "Debt";
          else if (currentScheme.toLowerCase().includes("hybrid")) currentCategory = "Hybrid";
          else if (currentScheme.toLowerCase().includes("elss")) currentCategory = "ELSS";
          else if (currentScheme.toLowerCase().includes("gold")) currentCategory = "Gold";
          else currentCategory = "Equity";

          if (currentScheme.toLowerCase().includes("regular")) currentMfType = "Regular Growth";
          else currentMfType = "Direct Growth";
          continue;
        }

        // Implicit scheme label: line with words like "Fund", "Growth", "Direct", "Equity", "Plan" and no numbers or dates
        const dateMatch = line.match(dateRegex);
        const numbersMatch = line.match(/-?[\d,]+\.?\d*/g) || [];
        // Filter out dates / common years from numbers
        const cleanNumbers = numbersMatch.filter((numStr) => {
          const val = parseFloat(numStr.replace(/,/g, ""));
          return !isNaN(val) && val !== 2024 && val !== 2025 && val !== 2026;
        });

        if (
          !dateMatch &&
          cleanNumbers.length === 0 &&
          line.length > 10 &&
          (line.toLowerCase().includes("fund") ||
            line.toLowerCase().includes("growth") ||
            line.toLowerCase().includes("direct") ||
            line.toLowerCase().includes("equity") ||
            line.toLowerCase().includes("plan") ||
            line.toLowerCase().includes("dividend"))
        ) {
          // Exclude header rows or legal disclosures
          if (
            !line.toLowerCase().includes("statement") &&
            !line.toLowerCase().includes("consolidated") &&
            !line.toLowerCase().includes("cams") &&
            !line.toLowerCase().includes("transaction") &&
            !line.toLowerCase().includes("folio")
          ) {
            currentScheme = line.trim();
            // Extract AMFI code if present
            const amfi = extractAmfiCode(currentScheme);
            if (amfi) currentAmfiCode = amfi;
            if (currentScheme.toLowerCase().includes("debt")) currentCategory = "Debt";
            else if (currentScheme.toLowerCase().includes("hybrid")) currentCategory = "Hybrid";
            else if (currentScheme.toLowerCase().includes("elss")) currentCategory = "ELSS";
            else if (currentScheme.toLowerCase().includes("gold")) currentCategory = "Gold";
            else currentCategory = "Equity";

            if (currentScheme.toLowerCase().includes("regular")) currentMfType = "Regular Growth";
            else currentMfType = "Direct Growth";
            continue;
          }
        }

        // 3. Detect Transaction Row
        if (dateMatch) {
          const isoDate = parseDate(line);
          if (!isoDate) continue;

          // Strip the matched date from the line to find transaction description and numbers cleanly
          const lineWithoutDate = line.replace(dateRegex, "");

          // Find decimal numbers (allowing negative signs and commas)
          const allNumbers = lineWithoutDate.match(/-?[\d,]+\.?\d+/g) || [];
          const numbers = allNumbers
            .map((n) => parseFloat(n.replace(/,/g, "")))
            .filter((v) => !isNaN(v));

          if (numbers.length >= 2) {
            let amount = 0;
            let units = 0;
            let nav = 0;

            // Determine transaction type
            let type = "SIP";
            const lowerLine = lineWithoutDate.toLowerCase();
            if (lowerLine.includes("sip")) type = "SIP";
            else if (lowerLine.includes("purchase")) type = "Purchase";
            else if (
              lowerLine.includes("redemption") ||
              lowerLine.includes("sell") ||
              lowerLine.includes("switch-out")
            )
              type = "Redemption";
            else if (lowerLine.includes("dividend") || lowerLine.includes("reinvest"))
              type = "Dividend Reinvestment";
            else if (lowerLine.includes("switch-in")) type = "Switch-In";
            else type = "Purchase";

            // If we have 3 numbers: check if they fit Amount = Units * NAV
            if (numbers.length === 3) {
              const [n1, n2, n3] = numbers;
              // Test permutations of n1, n2, n3 to find relation: Amount = Units * NAV
              const diff1 = Math.abs(n1 - n2 * n3);
              const diff2 = Math.abs(n2 - n1 * n3);
              const diff3 = Math.abs(n3 - n1 * n2);

              if (diff1 < 2) {
                // n1 is Amount
                amount = n1;
                if (n2 > n3) {
                  units = n2;
                  nav = n3;
                } else {
                  units = n3;
                  nav = n2;
                }
              } else if (diff2 < 2) {
                // n2 is Amount
                amount = n2;
                if (n1 > n3) {
                  units = n1;
                  nav = n3;
                } else {
                  units = n3;
                  nav = n1;
                }
              } else if (diff3 < 2) {
                // n3 is Amount
                amount = n3;
                if (n1 > n2) {
                  units = n1;
                  nav = n2;
                } else {
                  units = n2;
                  nav = n1;
                }
              } else {
                // Fall back to typical CAMS column layout: Amount, Units, NAV
                amount = n1;
                units = n2;
                nav = n3;
              }
            } else if (numbers.length === 2) {
              // Only 2 numbers: we calculate the third mathematically
              const [val1, val2] = numbers;

              // Assume val1 is amount if it's larger (e.g. > 500) and val2 is units or NAV
              if (val1 > 500) {
                amount = val1;
                // If we don't have NAV, we might calculate it later, or assume val2 is units.
                // Let's assume units is val2, and calculate NAV = Amount / Units.
                units = val2;
                nav = amount / units;
              } else {
                // If both are small, maybe we have Units and NAV
                units = val1;
                nav = val2;
                amount = units * nav;
              }
            }

            // Exclude reversals or rows with zero units
            if (units > 0 && amount > 0 && currentScheme) {
              rows.push({
                name: currentScheme,
                category: currentCategory,
                mfType: currentMfType,
                folioNumber: currentFolio,
                mfCode: currentAmfiCode || "",
                buyDate: isoDate,
                buyNav: String(nav.toFixed(4)),
                units: String(units.toFixed(3)),
                currentNav: String(nav.toFixed(4)),
                invested: String(amount.toFixed(2)),
                id: uid(),
                type: type,
                selected: true,
              });
            }
          }
        }
      }

      if (rows.length === 0) {
        setError(
          "Could not parse any transaction rows. Please check if the pasted text format is correct."
        );
      } else {
        setParsedRows(rows);
      }
    } catch (e: any) {
      setError("Parsing error: " + e.message);
    }
  };

  const pdfExtract = useCasPdfExtract((text) => {
    setInputText(text);
    parseCasText(text);
  });

  const selectedCount = parsedRows.filter((r) => r.selected).length;
  const allSelected = parsedRows.length > 0 && selectedCount === parsedRows.length;
  const toggleAll = () =>
    setParsedRows((rows) => rows.map((r) => ({ ...r, selected: !allSelected })));
  const toggleRow = (idx: number) =>
    setParsedRows((rows) => rows.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r)));

  const handleImport = async () => {
    if (!parsedRows.length || importing) return;

    const mfHoldings: any[] = [];
    parsedRows.forEach((r, idx) => {
      if (!r.selected) return;
      const match = matchMap.get(idx);
      const isRedemption = r.type === "Redemption";
      const signedUnits = isRedemption ? -Math.abs(parseFloat(r.units || "0")) : parseFloat(r.units || "0");
      const signedInvested = isRedemption
        ? -Math.abs(parseFloat(r.invested || "0"))
        : parseFloat(r.invested || "0");

      if (mergeMode && match) {
        // Merge: update existing fund's units/invested amount from the
        // transaction, but keep the existing currentNav — r.currentNav is
        // just the historical buy-time NAV of this one transaction, not a
        // live price, and would silently regress an already-current value.
        const existing = match.fund;
        const existingUnits = parseFloat(existing.units || "0");
        const existingInvested = parseFloat(existing.invested || "0");
        // For a redemption, r.invested is the SALE PROCEEDS of the redeemed
        // units (units * sell NAV), not their cost basis — subtracting it
        // directly would understate/overstate the remaining cost basis.
        // Reduce cost basis proportionally to the units redeemed instead
        // (units_redeemed × existing avg cost per unit), same rule as the
        // in-app FIFO/partial-sell flows.
        const avgCostPerUnit = existingUnits > 0 ? existingInvested / existingUnits : 0;
        const investedDelta = isRedemption
          ? -Math.min(existingInvested, avgCostPerUnit * Math.abs(signedUnits))
          : signedInvested;
        const finalUnits = Math.max(0, existingUnits + signedUnits);
        mfHoldings.push({
          ...existing,
          units: String(finalUnits.toFixed(3)),
          currentNav: existing.currentNav || r.currentNav,
          invested: String(Math.max(0, existingInvested + investedDelta).toFixed(2)),
          mfCode: existing.mfCode || r.mfCode,
          // Tells the parent's handleImport to updateItem() or removeItem() this existing holding in place
          // rather than addItem() it as a brand-new row sharing the same id.
          _merge: true,
          _delete: finalUnits <= 0.0001,
        });
      } else if (isRedemption) {
        // Redemption row with no matching existing holding — nothing to subtract from, skip creating a new holding
        return;
      } else {
        mfHoldings.push({
          name: r.name,
          category: r.category,
          type: r.mfType,
          folioNumber: r.folioNumber,
          mfCode: r.mfCode,
          buyDate: r.buyDate,
          buyNav: r.buyNav,
          units: r.units,
          currentNav: r.currentNav,
          invested: r.invested,
          owner,
          id: r.id,
        });
      }
    });

    if (mfHoldings.length === 0) {
      // Selected redemption rows with no matching existing holding are silently
      // dropped above (nothing to reduce units/cost-basis from) — surface that
      // distinctly, otherwise the user sees "check at least one row" despite
      // having already checked rows, which is confusing and wrong.
      const hasSkippedRedemptions = parsedRows.some(
        (r, idx) => r.selected && r.type === "Redemption" && !(mergeMode && matchMap.get(idx))
      );
      setError(
        hasSkippedRedemptions
          ? "Selected redemption row(s) don't match any existing holding, so there's nothing to reduce — enable Merge Existing with a matching fund, or deselect them."
          : "No rows selected to import — check at least one row first."
      );
      return;
    }

    setImporting(true);
    setError("");
    setImportProgress({ done: 0, total: mfHoldings.length });
    try {
      await onImport(mfHoldings, (done, total) => setImportProgress({ done, total }));
      setImportedCount(mfHoldings.length);
      setImportDone(true);
      setParsedRows([]);
      setInputText("");
    } catch (e: any) {
      setError("Import failed: " + (e?.message || "please try again."));
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  return (
    <Card
      style={{ padding: 20, border: `1px solid ${THEME.line}`, background: "var(--surface-0)" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <Bot size={18} color={THEME.accent} style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: THEME.ink,
                letterSpacing: "0.02em",
              }}
            >
              Smart CAS Import — Merge into Mutual Funds
            </div>
            {/* This importer is deliberately distinct from the standalone "CAS Import" page: it
                fuzzy-matches parsed transactions against your existing MF holdings (by folio, then
                name) and can merge units/NAV straight into them instead of creating duplicates. */}
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2, lineHeight: 1.4 }}>
              Paste transaction-level CAS text here to update existing holdings in place. For a
              one-off snapshot import instead, use the "CAS Import" page from the sidebar.
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<X size={14} />}
          aria-label="Close CAS importer"
          onClick={onClose}
        >
          Close
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6, marginBottom: 12 }}>
          Upload your CAMS / KFintech CAS PDF directly — it's read entirely in your browser and
          never uploaded anywhere — or paste the transactions text below. The smart analyzer will
          automatically extract fund names, folio numbers, dates, units, and NAVs.
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <label
            className="card-lift"
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: THEME.accent,
              padding: "7px 14px",
              borderRadius: 8,
              border: `1.5px dashed color-mix(in srgb, ${THEME.accent} 45%, transparent)`,
              background: `color-mix(in srgb, ${THEME.accent} 6%, transparent)`,
              cursor: pdfExtract.busy ? "wait" : "pointer",
              opacity: pdfExtract.busy ? 0.7 : 1,
            }}
          >
            <UploadCloud size={14} />
            {pdfExtract.busy ? "Reading PDF…" : "Upload CAS PDF"}
            <input
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
          {pdfExtract.fileName && !pdfExtract.needsPassword && (
            <span style={{ fontSize: 11, color: THEME.muted }}>{pdfExtract.fileName}</span>
          )}
        </div>

        {pdfExtract.needsPassword && (
          <div style={{ marginBottom: 12 }}>
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
          <div className="info-box info-box-error animate-slide-down" style={{ marginBottom: 12 }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{pdfExtract.error}</span>
          </div>
        )}

        <textarea
          style={{
            width: "100%",
            height: 140,
            background: "var(--t-paper)",
            border: `1.5px solid ${THEME.line}`,
            borderRadius: 10,
            padding: "10px 14px",
            color: THEME.ink,
            fontSize: 12,
            outline: "none",
            fontFamily: "monospace",
            resize: "vertical",
            boxSizing: "border-box",
          }}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste text from CAS PDF here..."
          aria-label="Pasted CAS statement text"
        />
        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
          <Button variant="accent" size="sm" onClick={() => parseCasText(inputText)}>
            Analyze CAS Text
          </Button>
        </div>
      </div>

      {error && (
        <div
          className="info-box info-box-error animate-slide-down"
          role="alert"
          aria-live="assertive"
          style={{ marginBottom: 16 }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {parsedRows.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.sage }}>
              Detected {parsedRows.length} transactions in{" "}
              {new Set(parsedRows.map((r) => r.name)).size} funds
              {matchMap.size > 0 && (
                <span style={{ color: THEME.muted, fontWeight: 500 }}>
                  {" "}
                  ({matchMap.size} matched to existing)
                </span>
              )}
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  marginLeft: 10,
                  fontWeight: 500,
                  color: THEME.muted,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={importing}
                  style={{ accentColor: THEME.accent, cursor: "pointer" }}
                  aria-label={allSelected ? "Deselect all rows" : "Select all rows"}
                />
                {selectedCount} of {parsedRows.length} selected
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  color: THEME.muted,
                }}
              >
                Owner
                <select
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  disabled={importing}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                    color: THEME.ink,
                  }}
                >
                  {familyProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatProfileOption(p)}
                    </option>
                  ))}
                </select>
              </label>
              {matchMap.size > 0 && (
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: mergeMode ? THEME.accent : THEME.muted,
                    cursor: "pointer",
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: mergeMode
                      ? `color-mix(in srgb, ${THEME.accent} 10%, transparent)`
                      : "transparent",
                    border: `1px solid ${
                      mergeMode
                        ? `color-mix(in srgb, ${THEME.accent} 40%, transparent)`
                        : THEME.line
                    }`,
                  }}
                >
                  <GitMerge size={12} />
                  <span>Merge Existing</span>
                  <input
                    type="checkbox"
                    checked={mergeMode}
                    onChange={(e) => setMergeMode(e.target.checked)}
                    disabled={importing}
                    style={{ accentColor: THEME.accent, cursor: "pointer" }}
                  />
                </label>
              )}
              <Button
                variant="primary"
                size="sm"
                style={{ background: THEME.sage }}
                onClick={handleImport}
                loading={importing}
                disabled={selectedCount === 0}
              >
                {importing
                  ? importProgress
                    ? `Importing ${importProgress.done}/${importProgress.total}…`
                    : "Importing…"
                  : `Import ${selectedCount} Transaction${selectedCount !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>

          {mergeMode && matchMap.size > 0 && (
            <div
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                border: `1px solid color-mix(in srgb, ${THEME.accent} 18%, transparent)`,
                fontSize: 11,
                color: THEME.muted,
                marginBottom: 8,
              }}
            >
              <b style={{ color: THEME.ink }}>Merge mode:</b> Matched funds will update units and
              NAV on the existing holding instead of creating duplicates.
            </div>
          )}

          <div
            style={{
              maxHeight: 250,
              overflowY: "auto",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              border: `1px solid ${THEME.line}`,
              borderRadius: 8,
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: 640,
                borderCollapse: "collapse",
                fontSize: 11,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--surface-1) 50%, transparent)", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}`, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: THEME.muted }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={importing}
                      aria-label={allSelected ? "Deselect all rows" : "Select all rows"}
                      style={{ accentColor: THEME.accent, cursor: "pointer" }}
                    />
                  </th>
                  <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}`, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: THEME.muted }}>
                    Date
                  </th>
                  <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}`, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: THEME.muted }}>
                    Fund Scheme
                  </th>
                  <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}`, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: THEME.muted }}>
                    Folio
                  </th>
                  <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}`, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: THEME.muted }}>
                    AMFI
                  </th>
                  <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}`, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: THEME.muted }}>
                    Status
                  </th>
                  <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}`, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: THEME.muted }}>
                    Type
                  </th>
                  <th
                    style={{
                      padding: "8px 10px",
                      borderBottom: `1px solid ${THEME.line}`,
                      textAlign: "right",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: THEME.muted,
                    }}
                  >
                    NAV
                  </th>
                  <th
                    style={{
                      padding: "8px 10px",
                      borderBottom: `1px solid ${THEME.line}`,
                      textAlign: "right",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: THEME.muted,
                    }}
                  >
                    Units
                  </th>
                  <th
                    style={{
                      padding: "8px 10px",
                      borderBottom: `1px solid ${THEME.line}`,
                      textAlign: "right",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: THEME.muted,
                    }}
                  >
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((r, idx) => {
                  const match = matchMap.get(idx);
                  const isExisting = !!match;
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: `1px solid ${THEME.line}`,
                        background:
                          isExisting && mergeMode
                            ? `color-mix(in srgb, ${THEME.sage} 6%, transparent)`
                            : undefined,
                        opacity: r.selected ? 1 : 0.45,
                      }}
                    >
                      <td style={{ padding: "8px 10px" }}>
                        <input
                          type="checkbox"
                          checked={!!r.selected}
                          onChange={() => toggleRow(idx)}
                          disabled={importing}
                          aria-label={`Include ${r.name || "this transaction"} in import`}
                          style={{ accentColor: THEME.accent, cursor: "pointer" }}
                        />
                      </td>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{r.buyDate}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>
                        {r.name}
                        {isExisting && mergeMode && (
                          <div
                            style={{
                              fontSize: 9,
                              color: THEME.muted,
                              fontWeight: 400,
                              marginTop: 2,
                            }}
                          >
                            Merging into: {match.fund.name || match.fund.scheme}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px", color: THEME.muted }}>
                        {r.folioNumber || "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          color: THEME.muted,
                          fontFamily: "monospace",
                          fontSize: 10,
                        }}
                      >
                        {r.mfCode || "—"}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: 9,
                            fontWeight: 700,
                            background: isExisting
                              ? `color-mix(in srgb, ${THEME.sage} 16%, transparent)`
                              : `color-mix(in srgb, ${THEME.accent} 16%, transparent)`,
                            color: isExisting ? THEME.sage : THEME.accent,
                          }}
                        >
                          {isExisting ? "Existing" : "New"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: 9,
                            fontWeight: 700,
                            background:
                              r.type === "Redemption"
                                ? `color-mix(in srgb, ${THEME.rust} 12%, transparent)`
                                : `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                            color: r.type === "Redemption" ? THEME.rust : THEME.sage,
                          }}
                        >
                          {r.type}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{r.buyNav}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{r.units}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>
                        <Money value={Number(r.invested)} variant="full" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {importDone && (
        <div
          className="info-box info-box-success animate-scale-in"
          role="status"
          aria-live="polite"
          style={{ fontWeight: 600, justifyContent: "center" }}
        >
          <CheckCircle size={15} />
          <span>Import completed successfully! {importedCount} transactions applied.</span>
        </div>
      )}
    </Card>
  );
};
