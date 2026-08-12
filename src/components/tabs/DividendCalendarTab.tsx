/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Coins,
  TrendingUp,
  Calendar,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Search,
  X,
  Download,
  List,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Landmark,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, fmtINRExact, today, getLocalDateString, exportArrayToCSV } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { Button } from "../ui/Button";
import { Prv } from "../../context/PrivacyContext";
import { StockLogo } from "./DematTab";
import { DataTable, Column } from "../design-system/DataTable";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const FULL_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

const getDaysUntil = (dateStr: string | null): number | null => {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  if (isNaN(target.getTime())) return null;
  const now = new Date(today() + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const urgencyColor = (days: number | null): string => {
  if (days === null) return THEME.muted;
  if (days < 0) return THEME.muted;
  if (days <= 3) return THEME.rust;
  if (days <= 14) return THEME.gold;
  return THEME.sage;
};

const urgencyLabel = (days: number | null): string => {
  if (days === null) return "—";
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return "Today!";
  if (days <= 7) return `${days}d`;
  if (days <= 30) return `${days}d`;
  return `${Math.ceil(days / 7)}w`;
};

// Convert Unix timestamp (seconds) → YYYY-MM-DD or null
const tsToDate = (ts: number | null | undefined): string | null => {
  if (!ts || ts <= 0) return null;
  return new Date(Number(ts) * 1000).toISOString().slice(0, 10);
};

export function DividendCalendarTab({ state, marketData }: any) {
  const todayStr = today();
  const [exData, setExData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("estDivIncome");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(todayStr + "T00:00:00");
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const matchesSearch = (text: string) =>
    !searchQuery || String(text || "").toLowerCase().includes(searchQuery.toLowerCase());

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  };

  // Group portfolio buy-lots into one entry per symbol+exchange, and derive
  // the correct Yahoo Finance ticker (base symbol + .NS/.BO exchange suffix —
  // without it, Yahoo resolves to the wrong/foreign security, e.g. bare
  // "INFY" returns the US-listed Infosys ADR instead of the NSE stock).
  const stockGroups = useMemo(() => {
    const map = new Map<string, any>();
    (state.stocks || []).forEach((s: any) => {
      if (!s.symbol || Number(s.qty || 0) <= 0) return;
      const base = String(s.symbol).replace(/\.(NS|BO)$/i, "");
      const exchange = s.exchange || "NSE";
      const yfSym = `${base}.${exchange === "BSE" ? "BO" : "NS"}`;
      const key = `${base}|${exchange}`;
      const qty = Number(s.qty || 0);
      // Same fallback chain used app-wide (see useMetrics.ts stockValue calc):
      // live market price first, then the stock's stored currentPrice, then
      // avgPrice — since currentPrice on a lot is only set once at buy-time
      // and isn't kept in sync, it's frequently 0/stale on its own.
      const livePrice = marketData?.[yfSym]?.price;
      const currentPrice =
        Number(livePrice ?? 0) || Number(s.currentPrice || 0) || Number(s.avgPrice || 0);
      if (!map.has(key)) {
        map.set(key, { symbol: base, exchange, yfSym, qty: 0, currentValue: 0 });
      }
      const g = map.get(key);
      g.qty += qty;
      g.currentValue += qty * currentPrice;
    });
    return Array.from(map.values());
  }, [state.stocks, marketData]);

  // Unique Yahoo Finance symbols to fetch ex-dividend/yield data for
  const symbols = useMemo<string[]>(
    () => Array.from(new Set(stockGroups.map((g: any) => g.yfSym))),
    [stockGroups]
  );

  const fetchExDates = async () => {
    // Guard against duplicate concurrent runs — `symbols` is rebuilt (new
    // array reference) whenever `marketData` refreshes in the background
    // (live-price polling elsewhere in the app), which re-fires the
    // auto-fetch effect below on every such tick until `fetched` flips true.
    // Without this guard, a slow first fetch could get raced by a second one,
    // burning through the endpoint's 30-req/60s rate limit for no benefit.
    if (fetchingRef.current || symbols.length === 0) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    const results: Record<string, any> = {};
    const failed: string[] = [];

    await Promise.allSettled(
      symbols.map(async (sym) => {
        try {
          const res = await fetch(`/api/stock-exdate?symbol=${encodeURIComponent(sym)}`);
          if (res.ok) {
            const data = await res.json();
            results[sym] = data;
          } else {
            failed.push(sym);
          }
        } catch {
          failed.push(sym);
        }
      })
    );

    setExData(results);
    setFetched(true);
    setLoading(false);
    fetchingRef.current = false;
    // Surface partial/total fetch failures instead of silently showing "—"
    // for every column, which was previously indistinguishable from "this
    // stock simply doesn't pay dividends."
    if (failed.length > 0) {
      setError(
        failed.length === symbols.length
          ? "Couldn't reach Yahoo Finance for live dividend data. Try refreshing in a minute."
          : `Couldn't fetch live data for ${failed.length} of ${symbols.length} symbols. Try refreshing again shortly.`
      );
    }
  };

  // Auto-fetch once on mount when stocks exist
  useEffect(() => {
    if (symbols.length > 0 && !fetched) {
      fetchExDates();
    }
  }, [symbols]);

  // Build enriched rows — one per distinct stock+exchange (not per buy-lot),
  // so a stock bought across multiple lots doesn't show up multiple times
  // with fragmented quantities/values, and a stock dual-listed on both NSE
  // and BSE still gets two distinct rows.
  const stockRows = useMemo(() => {
    return stockGroups.map((g: any) => {
      const info = exData[g.yfSym] || {};
      const exDate = tsToDate(info.exDividendDate);
      const divPayDate = tsToDate(info.dividendDate);
      // Yahoo's `dividendYield` is computed off `dividendRate` (the forward
      // indicated annual rate), not `trailingAnnualDividendRate` (actual
      // trailing 12mo payout). Prioritizing the trailing figure here made the
      // displayed "Div/Share" and "Yield %" reconcile to different numbers —
      // e.g. INFY.NS: dividendRate=50 (yield-consistent) vs a stale/bad
      // trailingAnnualDividendRate=0.52. Use dividendRate first so the two
      // figures agree.
      const divRate = Number(info.dividendRate || info.trailingAnnualDividendRate || 0);
      const divYield = Number(info.dividendYield || 0) * 100;
      const currentPrice = g.qty > 0 ? g.currentValue / g.qty : 0;
      const estDivIncome = divRate * g.qty;
      const daysToEx = getDaysUntil(exDate);

      // Past dividends received for this symbol
      const pastDivs = (state.dividends || [])
        .filter((d: any) => d.symbol === g.symbol || d.fundName === g.symbol)
        .sort((a: any, b: any) =>
          (b.recordDate || b.paymentDate || "").localeCompare(a.recordDate || a.paymentDate || "")
        );
      const lastDiv = pastDivs[0] || null;

      return {
        key: `${g.symbol}-${g.exchange}`,
        symbol: g.symbol,
        yfSym: g.yfSym,
        exchange: g.exchange,
        qty: g.qty,
        currentPrice,
        currentValue: g.currentValue,
        exDate,
        divPayDate,
        divRate,
        divYield,
        estDivIncome,
        daysToEx,
        lastDiv,
        hasLiveData: fetched && divRate > 0,
        isDivPayer: divRate > 0,
      };
    });
  }, [stockGroups, state.dividends, exData, fetched]);

  // Upcoming ex-dates within 90 days (or past 7 days)
  const upcomingExDates = useMemo(
    () =>
      stockRows
        .filter((r) => r.daysToEx !== null && r.daysToEx >= -7 && r.daysToEx <= 90)
        .filter((r) => matchesSearch(r.symbol))
        .sort((a, b) => (a.daysToEx ?? 999) - (b.daysToEx ?? 999)),
    [stockRows, searchQuery]
  );

  const dividendPayers = useMemo(
    () => stockRows.filter((r) => r.isDivPayer).sort((a, b) => b.divYield - a.divYield),
    [stockRows]
  );

  const totalEstIncome = dividendPayers.reduce((s, r) => s + r.estDivIncome, 0);
  const totalPortValue = stockRows.reduce((s, r) => s + r.currentValue, 0);
  const portfolioYield = totalPortValue > 0 ? (totalEstIncome / totalPortValue) * 100 : 0;

  // Sorted + search-filtered rows for the holdings table
  const tableRows = useMemo(() => {
    const filtered = stockRows.filter((r) => matchesSearch(r.symbol));
    const dir = sortDir === "asc" ? 1 : -1;
    const valueOf = (r: any) => {
      switch (sortKey) {
        case "symbol":
          return r.symbol;
        case "qty":
          return r.qty;
        case "currentValue":
          return r.currentValue;
        case "divRate":
          return r.divRate;
        case "divYield":
          return r.divYield;
        case "exDate":
          return r.exDate || "";
        case "divPayDate":
          return r.divPayDate || "";
        case "lastDiv":
          return r.lastDiv?.recordDate || r.lastDiv?.paymentDate || "";
        case "estDivIncome":
        default:
          return r.estDivIncome;
      }
    };
    return [...filtered].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (typeof av === "string" || typeof bv === "string") {
        return String(av).localeCompare(String(bv)) * dir;
      }
      return (Number(av) - Number(bv)) * dir;
    });
  }, [stockRows, searchQuery, sortKey, sortDir]);

  // Calendar month-grid data
  const calDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(getLocalDateString(new Date(year, month, d)));
    return cells;
  }, [calMonth]);

  const calEventsByDate = useMemo(() => {
    const map: Record<string, { ex: any[]; pay: any[] }> = {};
    stockRows
      .filter((r) => matchesSearch(r.symbol))
      .forEach((r) => {
        if (r.exDate) {
          if (!map[r.exDate]) map[r.exDate] = { ex: [], pay: [] };
          map[r.exDate].ex.push(r);
        }
        if (r.divPayDate) {
          if (!map[r.divPayDate]) map[r.divPayDate] = { ex: [], pay: [] };
          map[r.divPayDate].pay.push(r);
        }
      });
    return map;
  }, [stockRows, searchQuery]);

  const handleExportCSV = () => {
    const rows = tableRows.map((r) => ({
      symbol: r.symbol,
      exchange: r.exchange,
      qty: r.qty,
      currentValue: Math.round(r.currentValue),
      divPerShare: r.divRate ? r.divRate.toFixed(2) : "",
      yieldPct: r.divYield ? `${r.divYield.toFixed(2)}%` : "",
      exDate: r.exDate || "",
      payDate: r.divPayDate || "",
      estAnnual: r.estDivIncome ? Math.round(r.estDivIncome) : "",
      lastReceived: r.lastDiv ? r.lastDiv.recordDate || r.lastDiv.paymentDate || "" : "",
    }));
    exportArrayToCSV(
      rows,
      [
        { key: "symbol", label: "Symbol" },
        { key: "exchange", label: "Exchange" },
        { key: "qty", label: "Qty" },
        { key: "currentValue", label: "Current Value" },
        { key: "divPerShare", label: "Div / Share" },
        { key: "yieldPct", label: "Yield %" },
        { key: "exDate", label: "Ex-date" },
        { key: "payDate", label: "Pay Date" },
        { key: "estAnnual", label: "Est. Annual" },
        { key: "lastReceived", label: "Last Received" },
      ],
      `dividend-calendar_${todayStr}.csv`
    );
  };

  // Mutual fund dividend / IDCW payouts — MFs don't have predictable
  // ex-dates like stocks, so these come purely from the manually/auto
  // logged ledger (state.dividends), not a live feed.
  const mfDividends = useMemo(
    () =>
      (state.dividends || [])
        .filter((d: any) => d.type === "mf" || (!d.symbol && d.fundName))
        .filter((d: any) => matchesSearch(d.fundName))
        .sort((a: any, b: any) =>
          (b.recordDate || b.paymentDate || "").localeCompare(a.recordDate || a.paymentDate || "")
        ),
    [state.dividends, searchQuery]
  );
  const mfTotals = mfDividends.reduce(
    (acc: any, d: any) => {
      acc.gross += Number(d.amount || 0);
      acc.tds += Number(d.tds || 0);
      return acc;
    },
    { gross: 0, tds: 0 }
  );

  const handleExportMFCSV = () => {
    const rows = mfDividends.map((d: any) => ({
      fund: d.fundName || "",
      amount: Number(d.amount || 0),
      tds: Number(d.tds || 0),
      net: Number(d.amount || 0) - Number(d.tds || 0),
      recordDate: d.recordDate || "",
      paymentDate: d.paymentDate || "",
      fy: d.fy || "",
    }));
    exportArrayToCSV(
      rows,
      [
        { key: "fund", label: "Fund" },
        { key: "amount", label: "Amount" },
        { key: "tds", label: "TDS" },
        { key: "net", label: "Net" },
        { key: "recordDate", label: "Record Date" },
        { key: "paymentDate", label: "Payment Date" },
        { key: "fy", label: "FY" },
      ],
      `mf-dividends_${todayStr}.csv`
    );
  };

  if (symbols.length === 0 && mfDividends.length === 0 && (state.dividends || []).length === 0) {
    return (
      <div>
        <SectionTitle sub="Ex-dividend dates & income projections for your stock portfolio">
          Dividend Calendar
        </SectionTitle>
        <EmptyState
          icon={Coins}
          title="No Stocks in Portfolio"
          description="Add stocks to your Demat account to track dividend ex-dates and projected income"
        />
      </div>
    );
  }

  const holdingsColumns: Column<(typeof tableRows)[number]>[] = [
    {
      key: "symbol",
      header: "Symbol",
      sortable: true,
      align: "left",
      accessor: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StockLogo yfSym={r.yfSym} size={28} />
          <div>
            <div style={{ fontWeight: 800, color: THEME.ink }}>{r.symbol}</div>
            {r.exchange && (
              <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600, marginTop: 2 }}>
                {r.exchange}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "qty",
      header: "Qty",
      sortable: true,
      align: "right",
      accessor: (r) => r.qty.toLocaleString("en-IN"),
    },
    {
      key: "currentValue",
      header: "Current Value",
      sortable: true,
      align: "right",
      accessor: (r) => (
        <span style={{ fontWeight: 700 }}>
          <Prv>{fmtINRExact(r.currentValue)}</Prv>
        </span>
      ),
    },
    {
      key: "divRate",
      header: "Div / Share",
      sortable: true,
      align: "right",
      accessor: (r) => (
        <span
          style={{ color: r.divRate > 0 ? THEME.sage : THEME.muted, fontWeight: r.divRate > 0 ? 700 : 500 }}
        >
          {r.divRate > 0 ? <Prv>{`₹${r.divRate.toFixed(2)}`}</Prv> : loading ? "…" : "—"}
        </span>
      ),
    },
    {
      key: "divYield",
      header: "Yield %",
      sortable: true,
      align: "right",
      accessor: (r) => (
        <span
          style={{ color: r.divYield > 0 ? THEME.sage : THEME.muted, fontWeight: r.divYield > 0 ? 700 : 500 }}
        >
          {r.divYield > 0 ? `${r.divYield.toFixed(2)}%` : loading ? "…" : "—"}
        </span>
      ),
    },
    {
      key: "exDate",
      header: "Ex-date",
      sortable: true,
      align: "right",
      accessor: (r) => (
        <span style={{ color: r.exDate ? THEME.ink : THEME.muted, whiteSpace: "nowrap" }}>
          {r.exDate ? formatDate(r.exDate) : loading ? "…" : "—"}
        </span>
      ),
    },
    {
      key: "divPayDate",
      header: "Pay Date",
      sortable: true,
      align: "right",
      accessor: (r) => (
        <span style={{ color: r.divPayDate ? THEME.ink : THEME.muted, whiteSpace: "nowrap" }}>
          {r.divPayDate ? formatDate(r.divPayDate) : loading ? "…" : "—"}
        </span>
      ),
    },
    {
      key: "estDivIncome",
      header: "Est. Annual",
      sortable: true,
      align: "right",
      accessor: (r) => (
        <span
          style={{
            fontWeight: r.estDivIncome > 0 ? 700 : 500,
            color: r.estDivIncome > 0 ? THEME.sage : THEME.muted,
          }}
        >
          {r.estDivIncome > 0 ? <Prv>{fmtINRExact(r.estDivIncome)}</Prv> : "—"}
        </span>
      ),
    },
    {
      key: "lastDiv",
      header: "Last Received",
      sortable: true,
      align: "right",
      accessor: (r) => (
        <span style={{ color: THEME.muted, whiteSpace: "nowrap" }}>
          {r.lastDiv ? formatDate(r.lastDiv.recordDate || r.lastDiv.paymentDate) : "—"}
        </span>
      ),
    },
  ];

  const mfColumns: Column<(typeof mfDividends)[number]>[] = [
    {
      key: "fundName",
      header: "Fund",
      align: "left",
      accessor: (d) => (
        <span style={{ fontWeight: 700, color: THEME.ink }}>{d.fundName || "—"}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      accessor: (d) => (
        <span style={{ fontWeight: 700 }}>
          <Prv>{fmtINRExact(Number(d.amount || 0))}</Prv>
        </span>
      ),
    },
    {
      key: "tds",
      header: "TDS",
      align: "right",
      accessor: (d) => (
        <span style={{ color: THEME.rust }}>
          <Prv>{fmtINRExact(Number(d.tds || 0))}</Prv>
        </span>
      ),
    },
    {
      key: "net",
      header: "Net",
      align: "right",
      accessor: (d) => (
        <span style={{ fontWeight: 700, color: THEME.sage }}>
          <Prv>{fmtINRExact(Number(d.amount || 0) - Number(d.tds || 0))}</Prv>
        </span>
      ),
    },
    {
      key: "recordDate",
      header: "Record Date",
      align: "right",
      accessor: (d) => <span style={{ whiteSpace: "nowrap" }}>{formatDate(d.recordDate)}</span>,
    },
    {
      key: "paymentDate",
      header: "Payment Date",
      align: "right",
      accessor: (d) => <span style={{ whiteSpace: "nowrap" }}>{formatDate(d.paymentDate)}</span>,
    },
  ];

  return (
    <div
      className="tab-content-enter"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <SectionTitle sub="Ex-dividend dates, dividend yield & projected annual income from your stock holdings">
          Dividend Calendar
        </SectionTitle>

        {/* Refresh row */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: THEME.rust,
                fontWeight: 600,
                maxWidth: 260,
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}
          <button
            onClick={fetchExDates}
            disabled={loading}
            className="card-lift"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 12,
              border: `1.5px solid ${THEME.line}`,
              background: "var(--surface-0)",
              color: loading ? THEME.muted : THEME.ink,
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "all 0.2s ease",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            {loading ? `Fetching ${symbols.length} symbols…` : "Refresh Ex-dates"}
          </button>
        </div>
      </div>

      {/* Plain-English explainer — "ex-dividend date" is not obvious to a lay
          user, and it's the single most important date on this whole screen. */}
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
          border: `1px solid color-mix(in srgb, ${THEME.gold} 22%, transparent)`,
          fontSize: 12,
          color: THEME.muted,
        }}
      >
        <b style={{ color: THEME.ink }}>What's an ex-dividend date?</b> You must own the stock{" "}
        <i>before</i> this date to receive the upcoming dividend — buying on or after it means you
        miss that payout. The "Pay Date" is when the dividend actually lands in your account.
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 16,
        }}
      >
        <StatCard
          label="Est. Annual Dividend"
          value={fmtINRFull(totalEstIncome)}
          numericValue={totalEstIncome}
          formatValue={fmtINRFull}
          icon={<Coins />}
          color={THEME.sage}
        />
        <StatCard
          label="Portfolio Div. Yield"
          value={portfolioYield > 0 ? `${portfolioYield.toFixed(2)}%` : "—"}
          numericValue={portfolioYield}
          formatValue={(n) => (n > 0 ? `${n.toFixed(2)}%` : "—")}
          icon={<TrendingUp />}
          color={THEME.accent}
        />
        <StatCard
          label="Upcoming Ex-dates"
          value={String(upcomingExDates.length)}
          numericValue={upcomingExDates.length}
          formatValue={(n) => String(Math.round(n))}
          icon={<Calendar />}
          color={THEME.gold}
        />
        <StatCard
          label="Dividend Payers"
          value={`${dividendPayers.length} / ${stockRows.length}`}
          icon={<BarChart3 />}
          color={THEME.muted}
        />
      </div>

      {/* Search + view toggle */}
      {stockRows.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", position: "relative", alignItems: "center" }}>
            <Search
              size={16}
              color={THEME.muted}
              style={{ position: "absolute", left: 14, pointerEvents: "none" }}
            />
            <input
              type="text"
              aria-label="Search holdings"
              placeholder="Search by symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: 220,
                padding: `9px ${searchQuery ? 36 : 12}px 9px 38px`,
                borderRadius: 12,
                border: `1.5px solid ${THEME.line}`,
                background: "var(--surface-0)",
                color: THEME.ink,
                fontSize: 13,
                boxShadow: "var(--shadow-sm)",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: "none",
                  background: "var(--surface-2)",
                  color: THEME.muted,
                  cursor: "pointer",
                }}
              >
                <X size={11} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                display: "flex",
                border: `1.5px solid ${THEME.line}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setViewMode("list")}
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  border: "none",
                  background: viewMode === "list" ? "var(--t-accent)" : "var(--surface-0)",
                  color: viewMode === "list" ? "#fff" : THEME.muted,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <List size={14} /> List
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                aria-label="Calendar view"
                aria-pressed={viewMode === "calendar"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  border: "none",
                  borderLeft: `1.5px solid ${THEME.line}`,
                  background: viewMode === "calendar" ? "var(--t-accent)" : "var(--surface-0)",
                  color: viewMode === "calendar" ? "#fff" : THEME.muted,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <CalendarDays size={14} /> Calendar
              </button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              onClick={handleExportCSV}
            >
              CSV
            </Button>
          </div>
        </div>
      )}
      {searchQuery && stockRows.length > 0 && (
        <div style={{ fontSize: 12, color: THEME.muted, marginTop: -14 }}>
          Filtering by "{searchQuery}" — summary stats above are unaffected.
        </div>
      )}

      {/* Upcoming ex-dates — list or calendar view */}
      {viewMode === "list" && upcomingExDates.length > 0 && (
        <Card style={{ padding: 24, border: `1.5px solid ${THEME.line}` }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 15,
              marginBottom: 16,
              color: THEME.ink,
              letterSpacing: "-0.015em",
            }}
          >
            Upcoming Ex-dividend Dates
            <span
              style={{
                fontSize: 11,
                color: THEME.muted,
                marginLeft: 8,
                fontWeight: 600,
              }}
            >
              (±90 days)
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {upcomingExDates.map((r) => {
              const uc = urgencyColor(r.daysToEx);
              const isPast = (r.daysToEx ?? 0) < 0;
              return (
                <div
                  key={r.key}
                  className="card-lift"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 18px",
                    borderRadius: 14,
                    background: isPast
                      ? "transparent"
                      : r.daysToEx <= 3
                        ? "color-mix(in srgb, var(--t-rust) 5%, transparent)"
                        : "var(--surface-0)",
                    border: `1.5px solid ${
                      isPast
                        ? THEME.line
                        : r.daysToEx <= 3
                          ? "color-mix(in srgb, var(--t-rust) 25%, transparent)"
                          : THEME.line
                    }`,
                    opacity: isPast ? 0.65 : 1,
                    transition: "all 0.2s ease",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {/* Symbol logo */}
                  <StockLogo yfSym={r.yfSym} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 14,
                        color: THEME.ink,
                      }}
                    >
                      {r.symbol}
                      {r.exchange && (
                        <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 600, marginLeft: 6 }}>
                          {r.exchange}
                        </span>
                      )}
                    </div>
                    <div
                      style={{ fontSize: 12, color: THEME.muted, fontWeight: 500, marginTop: 3 }}
                    >
                      Ex-date: <b style={{ color: THEME.ink }}>{formatDate(r.exDate)}</b>
                      {r.divPayDate && (
                        <>
                          {" "}
                          • Pay: <b style={{ color: THEME.ink }}>{formatDate(r.divPayDate)}</b>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 13.5,
                        color: THEME.ink,
                      }}
                    >
                      <Prv>{r.divRate > 0 ? `₹${r.divRate.toFixed(2)}/share` : "—"}</Prv>
                    </div>
                    <div
                      style={{ fontSize: 12, color: THEME.muted, fontWeight: 500, marginTop: 2 }}
                    >
                      {r.estDivIncome > 0 ? (
                        <Prv>Est. {fmtINRExact(r.estDivIncome)}</Prv>
                      ) : (
                        `${r.qty.toLocaleString("en-IN")} shares`
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "4px 12px",
                      borderRadius: 8,
                      background: `color-mix(in srgb, ${uc} 12%, transparent)`,
                      color: uc,
                      fontSize: 11,
                      fontWeight: 800,
                      minWidth: 54,
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {urgencyLabel(r.daysToEx)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {viewMode === "list" && stockRows.length > 0 && upcomingExDates.length === 0 && (
        <Card style={{ padding: 24, border: `1.5px solid ${THEME.line}`, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 500 }}>
            No ex-dividend dates in the next 90 days
            {searchQuery ? ` matching "${searchQuery}"` : ""}.
          </div>
        </Card>
      )}

      {viewMode === "calendar" && (
        <Card style={{ padding: 24, border: `1.5px solid ${THEME.line}` }}>
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
            <div style={{ fontWeight: 800, fontSize: 15, color: THEME.ink, letterSpacing: "-0.015em" }}>
              {FULL_MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                aria-label="Previous month"
                onClick={() =>
                  setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                }
                style={navBtnStyle}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => {
                  const d = new Date(todayStr + "T00:00:00");
                  setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
                style={{ ...navBtnStyle, width: "auto", padding: "0 12px", fontSize: 12, fontWeight: 700 }}
              >
                Today
              </button>
              <button
                aria-label="Next month"
                onClick={() =>
                  setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                }
                style={navBtnStyle}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: THEME.rust, display: "inline-block" }} />
              Ex-dividend date
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: THEME.sage, display: "inline-block" }} />
              Pay date
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {WEEKDAY_NAMES.map((wd) => (
              <div
                key={wd}
                style={{
                  textAlign: "center",
                  fontSize: 10,
                  fontWeight: 800,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  padding: "4px 0",
                }}
              >
                {wd}
              </div>
            ))}
            {calDays.map((dateStr, i) => {
              if (!dateStr) return <div key={`pad-${i}`} />;
              const events = calEventsByDate[dateStr];
              const isToday = dateStr === todayStr;
              const dayNum = Number(dateStr.slice(8, 10));
              const chips = [
                ...(events?.ex || []).map((r) => ({ ...r, kind: "ex" })),
                ...(events?.pay || []).map((r) => ({ ...r, kind: "pay" })),
              ];
              return (
                <div
                  key={dateStr}
                  style={{
                    minHeight: 78,
                    borderRadius: 10,
                    border: `1.5px solid ${isToday ? THEME.accent : THEME.line}`,
                    background: isToday
                      ? "color-mix(in srgb, var(--t-accent) 6%, transparent)"
                      : "var(--surface-0)",
                    padding: "6px 6px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: isToday ? 800 : 600,
                      color: isToday ? THEME.accent : THEME.muted,
                    }}
                  >
                    {dayNum}
                  </div>
                  {chips.slice(0, 2).map((c, idx) => (
                    <div
                      key={`${c.key}-${c.kind}-${idx}`}
                      title={`${c.symbol} — ${c.kind === "ex" ? "Ex-date" : "Pay date"}`}
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        padding: "1.5px 5px",
                        borderRadius: 5,
                        color: c.kind === "ex" ? THEME.rust : THEME.sage,
                        background:
                          c.kind === "ex"
                            ? "color-mix(in srgb, var(--t-rust) 12%, transparent)"
                            : "color-mix(in srgb, var(--t-sage) 12%, transparent)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.symbol}
                    </div>
                  ))}
                  {chips.length > 2 && (
                    <div style={{ fontSize: 9.5, color: THEME.muted, fontWeight: 700, paddingLeft: 5 }}>
                      +{chips.length - 2} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* All holdings table */}
      {stockRows.length > 0 && (
        <Card style={{ border: `1.5px solid ${THEME.line}` }}>
          <div style={{ padding: 20 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 15,
                marginBottom: 16,
                color: THEME.ink,
                display: "flex",
                alignItems: "center",
                gap: 10,
                letterSpacing: "-0.015em",
              }}
            >
              All Holdings — Dividend Details
              {!fetched && !loading && (
                <span
                  style={{
                    fontSize: 11,
                    color: THEME.muted,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <AlertCircle size={13} />
                  Click Refresh to fetch live data
                </span>
              )}
              {loading && (
                <span
                  style={{
                    fontSize: 11,
                    color: THEME.accent,
                    fontWeight: 600,
                  }}
                >
                  Loading…
                </span>
              )}
            </div>
            <DataTable
              columns={holdingsColumns}
              data={tableRows}
              hideSearch
              keyExtractor={(r) => r.key}
              sortKey={sortKey}
              sortDirection={sortDir}
              onSortChange={handleSort}
              emptyState={
                <p style={{ fontSize: 13, color: THEME.muted, margin: 0 }}>
                  No holdings match "{searchQuery}".
                </p>
              }
            />

            {fetched && dividendPayers.length === 0 && (
              <div
                style={{
                  padding: "24px 0 8px",
                  textAlign: "center",
                  fontSize: 13,
                  color: THEME.muted,
                  fontWeight: 500,
                }}
              >
                No dividend-paying stocks found. Many Indian growth stocks don't pay dividends — check
                individual stock profiles for details.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Mutual fund dividend / IDCW payouts — separate from the live stock
          feed above since MFs don't have predictable ex-dates; this is a
          read-only summary of what's logged in the Dividend Tracker
          (Investments → Dividends). */}
      {mfDividends.length > 0 && (
        <Card style={{ border: `1.5px solid ${THEME.line}` }}>
          <div style={{ padding: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 15,
                  color: THEME.ink,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  letterSpacing: "-0.015em",
                }}
              >
                <Landmark size={16} color={THEME.accent} />
                Mutual Fund Dividends / IDCW
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={14} />}
                onClick={handleExportMFCSV}
              >
                CSV
              </Button>
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 14 }}>
              Mutual funds don't have predictable ex-dates like stocks — this is your logged
              dividend/IDCW payout history. Add or edit records from Investments → Dividends.
            </div>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Gross Received
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                  <Prv>{fmtINRExact(mfTotals.gross)}</Prv>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  TDS Deducted
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: THEME.rust }}>
                  <Prv>{fmtINRExact(mfTotals.tds)}</Prv>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Net Received
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: THEME.sage }}>
                  <Prv>{fmtINRExact(mfTotals.gross - mfTotals.tds)}</Prv>
                </div>
              </div>
            </div>

            <DataTable
              columns={mfColumns}
              data={mfDividends}
              hideSearch
              keyExtractor={(d, idx) => d.id || idx}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: 8,
  border: `1.5px solid ${THEME.line}`,
  background: "var(--surface-0)",
  color: THEME.ink,
  cursor: "pointer",
};
