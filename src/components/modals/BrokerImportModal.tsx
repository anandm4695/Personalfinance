import React, { useState, useRef, useMemo } from "react";
import { Upload, CheckCircle, AlertTriangle, FileText, ChevronRight, Loader2 } from "lucide-react";
import { Modal, ModalActions } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Field } from "../ui/Form";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";

/* ── Broker CSV column profiles ──────────────────────────────────── */
const BROKER_PROFILES = [
  {
    broker: "Zerodha",
    detect: ["order_id", "trade_type", "segment"],
    columns: {
      symbol: ["symbol"],
      isin: ["isin"],
      date: ["trade_date"],
      exchange: ["exchange"],
      tradeType: ["trade_type"],
      qty: ["quantity"],
      price: ["price"],
    },
  },
  {
    broker: "Groww",
    detect: ["stock name", "buy date", "buy price", "current price"],
    columns: {
      symbol: ["symbol/isin", "symbol", "isin"],
      date: ["buy date"],
      exchange: ["exchange"],
      qty: ["quantity"],
      price: ["buy price"],
      tradeType: [],
    },
  },
];

/* ── Column target definitions (for generic mapping) ─────────────── */
const MAPPING_TARGETS = [
  { key: "symbol", label: "Symbol", required: true },
  { key: "exchange", label: "Exchange", required: false },
  { key: "date", label: "Date", required: true },
  { key: "qty", label: "Quantity", required: true },
  { key: "price", label: "Price", required: true },
  { key: "tradeType", label: "Trade Type (Buy/Sell)", required: false },
] as const;

type MappingKey = (typeof MAPPING_TARGETS)[number]["key"];

/* ── Smart defaults: guess mapping from column name keywords ─────── */
const SMART_DEFAULTS: Record<MappingKey, string[]> = {
  symbol: ["symbol", "scrip", "stock", "ticker", "isin", "stock name", "symbol/isin"],
  exchange: ["exchange", "exch", "market"],
  date: ["date", "trade_date", "buy date", "trade date", "txn date", "transaction date"],
  qty: ["quantity", "qty", "shares", "volume"],
  price: ["price", "buy price", "avg price", "average price", "rate"],
  tradeType: ["trade_type", "trade type", "type", "side", "action", "buy/sell"],
};

/* ── Parse date from various formats ─────────────────────────────── */
const parseDate = (dateStr: string): string | null => {
  if (!dateStr) return null;
  const d = dateStr.trim().replace(/\//g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const dmy = d.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
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
  const parsed = new Date(dateStr.trim());
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
};

/* ── CSV parser that handles quoted fields with commas ────────────── */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

/* ── Parsed trade type ───────────────────────────────────────────── */
type ParsedTrade = {
  symbol: string;
  exchange: string;
  date: string;
  qty: number;
  price: number;
  tradeType: "BUY" | "SELL";
  isDuplicate: boolean;
  selected: boolean;
};

/* ── Styles ──────────────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--surface-0)",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: 10,
  color: THEME.ink,
  fontSize: 14,
};

const stepBadge = (active: boolean, done: boolean): React.CSSProperties => ({
  width: 28,
  height: 28,
  borderRadius: "50%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 800,
  background: done
    ? THEME.sage
    : active
      ? THEME.accent
      : `color-mix(in srgb, ${THEME.line} 38%, transparent)`,
  color: done || active ? THEME.darkInk : THEME.muted,
  flexShrink: 0,
});

interface BrokerImportModalProps {
  existingStocks: any[];
  demats: any[];
  onClose: () => void;
  onImport: (
    newStocks: any[],
    sells: any[],
    stockUpdates: { id: string; qty: string }[],
    stockRemovals: string[]
  ) => void;
}

export function BrokerImportModal({
  existingStocks,
  demats,
  onClose,
  onImport,
}: BrokerImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1 state
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [detectedBroker, setDetectedBroker] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  // Step 2 state: column mapping
  const [columnMap, setColumnMap] = useState<Record<MappingKey, number>>({
    symbol: -1,
    exchange: -1,
    date: -1,
    qty: -1,
    price: -1,
    tradeType: -1,
  });

  // Step 3 state: parsed trades
  const [trades, setTrades] = useState<ParsedTrade[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [defaultExchange, setDefaultExchange] = useState("NSE");
  const [dematId, setDematId] = useState(demats[0]?.id || "");

  /* ── Step 1: File upload & auto-detect ───────────────────────────── */
  const handleFileUpload = (file: File) => {
    setUploadError("");
    setFileName(file.name);
    setIsParsing(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setUploadError("Could not read the file. Please try again.");
      setIsParsing(false);
    };
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setUploadError("Could not read file contents.");
        setIsParsing(false);
        return;
      }
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        setUploadError("CSV must have a header row and at least one data row.");
        setIsParsing(false);
        return;
      }
      const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^"|"$/g, ""));
      const headersLower = headers.map((h) => h.toLowerCase().trim());
      const dataRows = lines
        .slice(1)
        .map((l) => parseCSVLine(l))
        .filter((r) => r.length >= headers.length * 0.5);

      if (dataRows.length === 0) {
        setUploadError("No valid data rows found in the file.");
        setIsParsing(false);
        return;
      }

      setRawHeaders(headers);
      setRawRows(dataRows);

      // Auto-detect broker
      let broker = "";
      let autoMap: Record<MappingKey, number> = {
        symbol: -1,
        exchange: -1,
        date: -1,
        qty: -1,
        price: -1,
        tradeType: -1,
      };

      for (const profile of BROKER_PROFILES) {
        const matchCount = profile.detect.filter((kw) =>
          headersLower.some((h) => h.includes(kw))
        ).length;
        if (matchCount >= 2) {
          broker = profile.broker;
          // Map columns based on profile
          for (const [key, keywords] of Object.entries(profile.columns)) {
            const idx = headersLower.findIndex((h) =>
              (keywords as string[]).some((kw) => h.includes(kw))
            );
            if (idx >= 0) autoMap[key as MappingKey] = idx;
          }
          break;
        }
      }

      // If no broker detected, use smart defaults
      if (!broker) {
        broker = "";
        for (const [key, keywords] of Object.entries(SMART_DEFAULTS)) {
          const idx = headersLower.findIndex((h) =>
            keywords.some((kw) => h === kw || h.includes(kw))
          );
          if (idx >= 0 && autoMap[key as MappingKey] === -1) {
            autoMap[key as MappingKey] = idx;
          }
        }
      }

      setDetectedBroker(broker);
      setColumnMap(autoMap);
      setIsParsing(false);
    };
    reader.readAsText(file);
  };

  const previewRows = rawRows.slice(0, 5);
  const canProceedStep1 = rawHeaders.length > 0 && rawRows.length > 0;

  /* ── Step 2: Validate mapping completeness ───────────────────────── */
  const mappingValid = useMemo(() => {
    return (
      columnMap.symbol >= 0 && columnMap.date >= 0 && columnMap.qty >= 0 && columnMap.price >= 0
    );
  }, [columnMap]);

  // A demat account must exist and be selected — otherwise imported stocks
  // would be saved with an empty dematId and become orphaned records.
  const dematSelected = demats.length > 0 && !!dematId;

  /* ── Step 2 -> 3: Parse trades from mapped columns ───────────────── */
  const parseTrades = () => {
    const parsed: ParsedTrade[] = [];
    for (const row of rawRows) {
      const rawSymbol = (row[columnMap.symbol] || "")
        .trim()
        .toUpperCase()
        .replace(/\.(NS|BO)$/i, "");
      const rawDate = row[columnMap.date] || "";
      const rawQty = row[columnMap.qty] || "";
      const rawPrice = row[columnMap.price] || "";
      const rawExchange =
        columnMap.exchange >= 0 ? (row[columnMap.exchange] || "").trim().toUpperCase() : "";
      const rawType =
        columnMap.tradeType >= 0 ? (row[columnMap.tradeType] || "").trim().toUpperCase() : "";

      if (!rawSymbol) continue;

      const date = parseDate(rawDate);
      if (!date) continue;

      const qty = Math.abs(parseFloat(rawQty.replace(/,/g, "")));
      const price = Math.abs(parseFloat(rawPrice.replace(/,/g, "")));
      if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) continue;

      const exchange =
        rawExchange === "BSE" ? "BSE" : rawExchange === "NSE" ? "NSE" : defaultExchange;
      const tradeType: "BUY" | "SELL" =
        rawType.includes("SELL") || rawType === "S" ? "SELL" : "BUY";

      // Check for duplicates against existing portfolio
      const isDuplicate = existingStocks.some((s: any) => {
        const sBase = (s.symbol || "").replace(/\.(NS|BO)$/i, "").toUpperCase();
        const sExch = (s.exchange || "NSE").toUpperCase();
        return (
          sBase === rawSymbol && sExch === exchange && Number(s.qty) === qty && s.buyDate === date
        );
      });

      parsed.push({
        symbol: rawSymbol,
        exchange,
        date,
        qty,
        price,
        tradeType,
        isDuplicate,
        selected: !isDuplicate,
      });
    }
    setTrades(parsed);
    setStep(3);
  };

  /* ── Step 3: Count selected trades ───────────────────────────────── */
  const selectedTrades = useMemo(() => trades.filter((t) => t.selected), [trades]);
  const buyTrades = useMemo(
    () => selectedTrades.filter((t) => t.tradeType === "BUY"),
    [selectedTrades]
  );
  const sellTrades = useMemo(
    () => selectedTrades.filter((t) => t.tradeType === "SELL"),
    [selectedTrades]
  );
  const duplicateCount = useMemo(() => trades.filter((t) => t.isDuplicate).length, [trades]);

  const toggleTrade = (idx: number) => {
    setTrades((prev) => prev.map((t, i) => (i === idx ? { ...t, selected: !t.selected } : t)));
  };

  const toggleSkipDuplicates = () => {
    const newSkip = !skipDuplicates;
    setSkipDuplicates(newSkip);
    setTrades((prev) => prev.map((t) => (t.isDuplicate ? { ...t, selected: !newSkip } : t)));
  };

  /* ── Final import ──────────────────────────────────────────────── */
  /* Nets SELL trades against BUY lots (both existing holdings and BUY
     rows in this same import) FIFO by buy date, so a stock that was
     bought and later fully sold never lingers in current holdings, and
     realized P&L is computed against the actual buy price instead of
     defaulting to zero. */
  const handleImport = () => {
    if (!dematId) return; // safety net — UI already blocks reaching this state
    const broker = demats.find((d: any) => d.id === dematId)?.broker || "";

    type Lot = {
      source: "existing" | "new";
      id?: string;
      qty: number;
      buyPrice: number;
      buyDate: string;
    };

    const groupKey = (symbol: string, exchange: string) => `${symbol}::${exchange}`;
    const lotsByGroup = new Map<string, Lot[]>();

    const addLot = (key: string, lot: Lot) => {
      if (!lotsByGroup.has(key)) lotsByGroup.set(key, []);
      lotsByGroup.get(key)!.push(lot);
    };

    existingStocks
      .filter((s: any) => (s.dematId || "") === dematId)
      .forEach((s: any) => {
        const key = groupKey(
          (s.symbol || "").toUpperCase(),
          (s.exchange || "NSE").toUpperCase()
        );
        addLot(key, {
          source: "existing",
          id: s.id,
          qty: Number(s.qty) || 0,
          buyPrice: Number(s.avgPrice) || 0,
          buyDate: s.buyDate || "",
        });
      });

    buyTrades.forEach((t) => {
      addLot(groupKey(t.symbol, t.exchange), {
        source: "new",
        qty: t.qty,
        buyPrice: t.price,
        buyDate: t.date,
      });
    });

    // Sort each group's lots chronologically (FIFO); undated lots last.
    lotsByGroup.forEach((lots) => {
      lots.sort((a, b) => {
        if (!a.buyDate && !b.buyDate) return 0;
        if (!a.buyDate) return 1;
        if (!b.buyDate) return -1;
        return new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime();
      });
    });

    const sells: any[] = [];
    const sortedSells = [...sellTrades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const t of sortedSells) {
      const key = groupKey(t.symbol, t.exchange);
      const lots = lotsByGroup.get(key) || [];
      let remaining = t.qty;

      for (const lot of lots) {
        if (remaining <= 0) break;
        if (lot.qty <= 0) continue;
        const consume = Math.min(lot.qty, remaining);
        sells.push({
          symbol: t.symbol,
          exchange: t.exchange,
          qty: consume,
          sellPrice: t.price,
          sellDate: t.date,
          buyPrice: lot.buyPrice,
          buyDate: lot.buyDate,
          profit: Number(((t.price - lot.buyPrice) * consume).toFixed(2)),
          broker,
          dematId,
          owner: "self",
        });
        lot.qty -= consume;
        remaining -= consume;
      }

      // No matching buy lot found (e.g. holding predates tracked history) —
      // still record the sell so it isn't silently dropped.
      if (remaining > 0) {
        sells.push({
          symbol: t.symbol,
          exchange: t.exchange,
          qty: remaining,
          sellPrice: t.price,
          sellDate: t.date,
          buyPrice: t.price,
          profit: 0,
          broker,
          dematId,
          owner: "self",
        });
      }
    }

    const newStocks: any[] = [];
    const stockUpdates: { id: string; qty: string }[] = [];
    const stockRemovals: string[] = [];

    lotsByGroup.forEach((lots, key) => {
      const [symbol, exchange] = key.split("::");
      lots.forEach((lot) => {
        if (lot.source === "existing") {
          if (lot.qty <= 0) stockRemovals.push(lot.id!);
          else stockUpdates.push({ id: lot.id!, qty: String(lot.qty) });
        } else if (lot.qty > 0) {
          newStocks.push({
            symbol,
            exchange,
            qty: String(lot.qty),
            avgPrice: String(lot.buyPrice),
            buyDate: lot.buyDate,
            currentPrice: String(lot.buyPrice),
            dematId,
            broker,
            owner: "self",
          });
        }
      });
    });

    onImport(newStocks, sells, stockUpdates, stockRemovals);
  };

  return (
    <Modal title="Import Trades from Broker CSV" onClose={onClose}>
      {/* ── Step indicator ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        {[
          { num: 1, label: "Upload" },
          { num: 2, label: "Map Columns" },
          { num: 3, label: "Review" },
        ].map((s, idx) => (
          <React.Fragment key={s.num}>
            {idx > 0 && <ChevronRight size={14} color={THEME.muted} style={{ flexShrink: 0 }} />}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={stepBadge(step === s.num, step > s.num)}>
                {step > s.num ? <CheckCircle size={14} /> : s.num}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: step === s.num ? 800 : 600,
                  color: step === s.num ? THEME.ink : THEME.muted,
                }}
              >
                {s.label}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1: Upload & Detect ───────────────────────────── */}
      {step === 1 && (
        <>
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
              Upload your broker trade statement
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
              Supports Zerodha (Kite), Groww, and generic CSV formats. Download your trade history
              CSV from your broker app and upload it here.
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <button
              style={{
                background: "transparent",
                border: `1.5px solid ${THEME.accent}`,
                color: THEME.accent,
                padding: "10px 18px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: isParsing ? "wait" : "pointer",
                opacity: isParsing ? 0.7 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "inherit",
              }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
            >
              <Upload size={14} />
              {fileName || "Choose CSV File"}
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
                Reading file…
              </span>
            )}
          </div>

          {uploadError && (
            <div className="info-box info-box-error animate-slide-down" style={{ marginBottom: 16 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{uploadError}</span>
            </div>
          )}

          {detectedBroker && (
            <div style={{ marginBottom: 14 }}>
              <Badge variant="sage" style={{ fontSize: 12, padding: "4px 12px" }}>
                Detected: {detectedBroker}
              </Badge>
            </div>
          )}

          {/* Preview table */}
          {rawHeaders.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, marginBottom: 8 }}>
                Preview ({Math.min(5, rawRows.length)} of {rawRows.length} rows)
              </div>
              <div
                style={{
                  maxHeight: 220,
                  overflowX: "auto",
                  overflowY: "auto",
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 10,
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}
                >
                  <thead>
                    <tr style={{ background: "var(--surface-0)" }}>
                      {rawHeaders.map((h, i) => (
                        <th
                          key={i}
                          style={{
                            padding: "8px 10px",
                            borderBottom: `1px solid ${THEME.line}`,
                            textAlign: "left",
                            fontSize: 10,
                            fontWeight: 800,
                            color: THEME.muted,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                        {rawHeaders.map((_, ci) => (
                          <td
                            key={ci}
                            style={{ padding: "6px 10px", color: THEME.ink, fontSize: 12 }}
                          >
                            {row[ci] || ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <ModalActions
            onSave={() => canProceedStep1 && setStep(2)}
            onClose={onClose}
            saveLabel="Next: Map Columns"
            disabled={!canProceedStep1}
          />
        </>
      )}

      {/* ── STEP 2: Column Mapping ─────────────────────────────── */}
      {step === 2 && (
        <>
          {detectedBroker && (
            <div className="info-box info-box-success" style={{ marginBottom: 16, fontWeight: 600 }}>
              <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Columns auto-mapped for {detectedBroker} format. Verify and adjust if needed.</span>
            </div>
          )}

          {!detectedBroker && (
            <div className="info-box info-box-warn" style={{ marginBottom: 16, fontWeight: 600 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Unknown format. Please map each column to its corresponding field below.</span>
            </div>
          )}

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}
          >
            {MAPPING_TARGETS.map((target) => (
              <Field key={target.key} label={`${target.label}${target.required ? " *" : ""}`}>
                <select
                  style={inputStyle}
                  value={columnMap[target.key]}
                  onChange={(e) =>
                    setColumnMap((prev) => ({
                      ...prev,
                      [target.key]: parseInt(e.target.value),
                    }))
                  }
                >
                  <option value={-1}>— Select column —</option>
                  {rawHeaders.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>

          <Field label="Default Exchange (if not in CSV)">
            <select
              style={{ ...inputStyle, width: 120 }}
              value={defaultExchange}
              onChange={(e) => setDefaultExchange(e.target.value)}
            >
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
            </select>
          </Field>

          <Field label="Import into Demat Account">
            <select style={inputStyle} value={dematId} onChange={(e) => setDematId(e.target.value)}>
              {demats.length === 0 && <option value="">Add demat account first</option>}
              {demats.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.broker || "Account"}
                </option>
              ))}
            </select>
          </Field>

          {!dematSelected && (
            <div className="info-box info-box-error" style={{ marginTop: 10, fontWeight: 600 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                {demats.length === 0
                  ? "You need to add a demat account before importing trades."
                  : "Select a demat account to import into."}
              </span>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="accent" onClick={parseTrades} disabled={!mappingValid || !dematSelected}>
              Next: Review Trades
            </Button>
          </div>
        </>
      )}

      {/* ── STEP 3: Review & Import ────────────────────────────── */}
      {step === 3 && (
        <>
          {/* Summary badges */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <Badge variant="accent" style={{ fontSize: 12, padding: "4px 12px" }}>
              {trades.length} trades parsed
            </Badge>
            <Badge variant="sage" style={{ fontSize: 12, padding: "4px 12px" }}>
              {buyTrades.length} buy
            </Badge>
            {sellTrades.length > 0 && (
              <Badge variant="rust" style={{ fontSize: 12, padding: "4px 12px" }}>
                {sellTrades.length} sell
              </Badge>
            )}
            {duplicateCount > 0 && (
              <Badge variant="gold" style={{ fontSize: 12, padding: "4px 12px" }}>
                {duplicateCount} duplicate{duplicateCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {/* Skip duplicates toggle */}
          {duplicateCount > 0 && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
                fontSize: 13,
                fontWeight: 600,
                color: THEME.ink,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={toggleSkipDuplicates}
                style={{ accentColor: THEME.accent }}
              />
              Skip {duplicateCount} duplicate{duplicateCount !== 1 ? "s" : ""} (already in
              portfolio)
            </label>
          )}

          {/* Trades table */}
          <div
            style={{
              maxHeight: 320,
              overflowY: "auto",
              border: `1px solid ${THEME.line}`,
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr
                  style={{ background: "var(--surface-0)", position: "sticky", top: 0, zIndex: 1 }}
                >
                  <th
                    style={{
                      padding: "8px 10px",
                      borderBottom: `1.5px solid ${THEME.line}`,
                      textAlign: "center",
                      fontSize: 10,
                      fontWeight: 800,
                      color: THEME.muted,
                      width: 36,
                    }}
                  >
                    <input
                      type="checkbox"
                      aria-label="Select all trades"
                      checked={selectedTrades.length === trades.length}
                      onChange={() => {
                        const allSelected = selectedTrades.length === trades.length;
                        setTrades((prev) => prev.map((t) => ({ ...t, selected: !allSelected })));
                      }}
                      style={{ accentColor: THEME.accent }}
                    />
                  </th>
                  {["Symbol", "Exchange", "Date", "Type", "Qty", "Price", "Value"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 10px",
                        borderBottom: `1.5px solid ${THEME.line}`,
                        textAlign: h === "Qty" || h === "Price" || h === "Value" ? "right" : "left",
                        fontSize: 10,
                        fontWeight: 800,
                        color: THEME.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map((t, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: `1px solid ${THEME.line}`,
                      background: t.isDuplicate
                        ? `color-mix(in srgb, ${THEME.gold} 4%, transparent)`
                        : !t.selected
                          ? `color-mix(in srgb, ${THEME.muted} 8%, transparent)`
                          : "transparent",
                      opacity: t.selected ? 1 : 0.5,
                    }}
                  >
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${t.tradeType.toLowerCase()} trade: ${t.symbol} ${t.qty} @ ${t.price} on ${t.date}`}
                        checked={t.selected}
                        onChange={() => toggleTrade(i)}
                        style={{ accentColor: THEME.accent }}
                      />
                    </td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: THEME.ink }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {t.symbol}
                        {t.isDuplicate && <AlertTriangle size={12} color={THEME.gold} />}
                      </div>
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span
                        style={{
                          fontSize: 9,
                          background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
                          color: THEME.muted,
                          padding: "1px 5px",
                          borderRadius: 4,
                          fontWeight: 800,
                        }}
                      >
                        {t.exchange}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap", color: THEME.muted }}>
                      {t.date}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background:
                            t.tradeType === "BUY"
                              ? `color-mix(in srgb, ${THEME.sage} 8%, transparent)`
                              : `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                          color: t.tradeType === "BUY" ? THEME.sage : THEME.rust,
                        }}
                      >
                        {t.tradeType}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>
                      {t.qty}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>
                      {fmtINRFull(t.price)}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        textAlign: "right",
                        fontWeight: 800,
                        color: THEME.ink,
                      }}
                    >
                      {fmtINRFull(t.qty * t.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary row */}
          <div
            style={{
              display: "flex",
              gap: 16,
              fontSize: 12,
              color: THEME.muted,
              marginBottom: 16,
            }}
          >
            {buyTrades.length > 0 && (
              <span>
                Buy value:{" "}
                <b style={{ color: THEME.sage }}>
                  {fmtINRFull(buyTrades.reduce((s, t) => s + t.qty * t.price, 0))}
                </b>
              </span>
            )}
            {sellTrades.length > 0 && (
              <span>
                Sell value:{" "}
                <b style={{ color: THEME.rust }}>
                  {fmtINRFull(sellTrades.reduce((s, t) => s + t.qty * t.price, 0))}
                </b>
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              variant="accent"
              onClick={handleImport}
              disabled={selectedTrades.length === 0 || !dematSelected}
              icon={<Upload size={13} />}
            >
              Import {selectedTrades.length} Trade{selectedTrades.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
