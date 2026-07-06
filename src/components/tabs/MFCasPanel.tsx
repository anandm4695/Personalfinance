// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Upload, AlertCircle, FileText, Bot, CheckCircle, GitMerge } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, uid } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { useMasterData, formatProfileOption } from "../../utils/masterData";

interface MFCasPanelProps {
  onImport: (data: any[]) => void;
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
  const [mergeMode, setMergeMode] = useState(true);
  const [owner, setOwner] = useState(activeProfile !== "all" ? activeProfile : "self");

  /* ── Build match map from parsed rows to existing funds ────────── */
  const matchMap = useMemo(() => {
    const map = new Map<number, { fund: any; score: number }>();
    parsedRows.forEach((row, idx) => {
      let bestMatch: any = null;
      let bestScore = 0;
      existingFunds.forEach((ef) => {
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
        const folioMatch = line.match(
          /(?:Folio|Folio\s+No|Folio\s+Number)\s*[:\-\s]\s*([\w\/\-]+)/i
        );
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

  const handleImport = () => {
    if (!parsedRows.length) return;

    const mfHoldings: any[] = [];
    parsedRows.forEach((r, idx) => {
      const match = matchMap.get(idx);
      if (mergeMode && match) {
        // Merge: update existing fund's units/NAV instead of creating a new entry
        const existing = match.fund;
        mfHoldings.push({
          ...existing,
          units: String(
            (parseFloat(existing.units || "0") + parseFloat(r.units || "0")).toFixed(3)
          ),
          currentNav: r.currentNav,
          invested: String(
            (parseFloat(existing.invested || "0") + parseFloat(r.invested || "0")).toFixed(2)
          ),
          mfCode: existing.mfCode || r.mfCode,
          _merge: true, // signal to parent that this is an update
        });
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
    onImport(mfHoldings);
    setImportDone(true);
    setParsedRows([]);
    setInputText("");
  };

  const btnStyle = {
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "none",
  };

  return (
    <Card
      style={{ padding: 20, border: `1px solid ${THEME.line}`, background: "var(--surface-0)" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Bot size={18} color={THEME.accent} />
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: THEME.muted,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Smart CAS Statement Importer (Text Paste)
          </div>
        </div>
        <button
          style={{
            ...btnStyle,
            background: "transparent",
            color: THEME.muted,
            border: `1px solid ${THEME.line}`,
          }}
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6, marginBottom: 12 }}>
          Open your password-protected CAMS / Karvy CAS PDF, select all transactions text (Ctrl+A /
          Cmd+A, then Copy), and paste it below. The smart analyzer will automatically extract fund
          names, folio numbers, dates, units, and NAVs.
        </div>
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
        />
        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
          <button
            style={{ ...btnStyle, background: THEME.accent, color: "#fff" }}
            onClick={() => parseCasText(inputText)}
          >
            Analyze CAS Text
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: `${THEME.rust}12`,
            color: THEME.rust,
            fontSize: 12,
            marginBottom: 16,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
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
                    background: mergeMode ? `${THEME.accent}10` : "transparent",
                    border: `1px solid ${mergeMode ? THEME.accent + "40" : THEME.line}`,
                  }}
                >
                  <GitMerge size={12} />
                  <span>Merge Existing</span>
                  <input
                    type="checkbox"
                    checked={mergeMode}
                    onChange={(e) => setMergeMode(e.target.checked)}
                    style={{ accentColor: THEME.accent, cursor: "pointer" }}
                  />
                </label>
              )}
              <button
                style={{ ...btnStyle, background: THEME.sage, color: "#fff" }}
                onClick={handleImport}
              >
                Import {parsedRows.length} Transaction{parsedRows.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>

          {mergeMode && matchMap.size > 0 && (
            <div
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                background: `${THEME.accent}08`,
                border: `1px solid ${THEME.accent}18`,
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
              border: `1px solid ${THEME.line}`,
              borderRadius: 8,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "var(--surface-0)", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}` }}>
                    Date
                  </th>
                  <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}` }}>
                    Fund Scheme
                  </th>
                  <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}` }}>
                    Folio
                  </th>
                  <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}` }}>
                    AMFI
                  </th>
                  <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}` }}>
                    Status
                  </th>
                  <th style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.line}` }}>
                    Type
                  </th>
                  <th
                    style={{
                      padding: "8px 10px",
                      borderBottom: `1px solid ${THEME.line}`,
                      textAlign: "right",
                    }}
                  >
                    NAV
                  </th>
                  <th
                    style={{
                      padding: "8px 10px",
                      borderBottom: `1px solid ${THEME.line}`,
                      textAlign: "right",
                    }}
                  >
                    Units
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
                        background: isExisting && mergeMode ? `${THEME.sage}06` : undefined,
                      }}
                    >
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
                            background: isExisting ? `${THEME.sage}16` : `${THEME.accent}16`,
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
                              r.type === "Redemption" ? `${THEME.rust}12` : `${THEME.sage}12`,
                            color: r.type === "Redemption" ? THEME.rust : THEME.sage,
                          }}
                        >
                          {r.type}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{r.buyNav}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{r.units}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>
                        {fmtINRFull(Number(r.invested))}
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
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: `${THEME.sage}12`,
            color: THEME.sage,
            fontSize: 12,
            fontWeight: 600,
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <CheckCircle size={15} />
          <span>Import completed successfully! {parsedRows.length} holdings created.</span>
        </div>
      )}
    </Card>
  );
};
