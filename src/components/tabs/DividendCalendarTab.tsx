/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  Coins,
  TrendingUp,
  Calendar,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Clock,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, fmtINRExact, today } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Prv } from "../../context/PrivacyContext";

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

const th: React.CSSProperties = {
  padding: "14px 16px",
  textAlign: "right",
  color: THEME.muted,
  fontWeight: 800,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  borderBottom: `2px solid ${THEME.line}`,
};

const td: React.CSSProperties = {
  padding: "14px 16px",
  textAlign: "right",
  color: THEME.ink,
  fontSize: 13,
  fontWeight: 500,
  borderBottom: `1px solid ${THEME.line}`,
  fontVariantNumeric: "tabular-nums",
};

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
  if (days <= 14) return "#D97706";
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

/* ─── Premium Dividend Bento Card ─────────────────────────────────── */
const DividendStatCard = ({ label, value, icon: Icon, color }: any) => {
  return (
    <div
      className="card-lift"
      style={{
        background:
          "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 12%, var(--surface-0)) 100%)",
        border: `1.5px solid ${THEME.line}`,
        borderTop: `4px solid ${color || THEME.accent}`,
        borderRadius: 16,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `color-mix(in srgb, ${color || THEME.accent} 12%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color || THEME.accent,
            flexShrink: 0,
          }}
        >
          {Icon}
        </div>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: THEME.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </div>
      </div>
      <div>
        <span
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: THEME.ink,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
};

export function DividendCalendarTab({ state, marketData }: any) {
  const todayStr = today();
  const [exData, setExData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (symbols.length === 0) return;
    setLoading(true);
    setError(null);
    const results: Record<string, any> = {};

    await Promise.allSettled(
      symbols.map(async (sym) => {
        try {
          const res = await fetch(`/api/stock-exdate?symbol=${encodeURIComponent(sym)}`);
          if (res.ok) {
            const data = await res.json();
            results[sym] = data;
          }
        } catch {
          // skip per-symbol errors silently
        }
      })
    );

    setExData(results);
    setFetched(true);
    setLoading(false);
  };

  // Auto-fetch once on mount when stocks exist
  useEffect(() => {
    if (symbols.length > 0 && !fetched) {
      fetchExDates();
    }
  }, [symbols]);

  // Build enriched rows — one per distinct stock (not per buy-lot), so a
  // stock bought across multiple lots doesn't show up multiple times with
  // fragmented quantities/values.
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
        symbol: g.symbol,
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
        .sort((a, b) => (a.daysToEx ?? 999) - (b.daysToEx ?? 999)),
    [stockRows]
  );

  const dividendPayers = useMemo(
    () => stockRows.filter((r) => r.isDivPayer).sort((a, b) => b.divYield - a.divYield),
    [stockRows]
  );

  const totalEstIncome = dividendPayers.reduce((s, r) => s + r.estDivIncome, 0);
  const totalPortValue = stockRows.reduce((s, r) => s + r.currentValue, 0);
  const portfolioYield = totalPortValue > 0 ? (totalEstIncome / totalPortValue) * 100 : 0;

  if (symbols.length === 0) {
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
              }}
            >
              <AlertCircle size={14} />
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

      {/* Summary stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 16,
        }}
      >
        <DividendStatCard
          label="Est. Annual Dividend"
          value={fmtINRFull(totalEstIncome)}
          icon={<Coins size={16} />}
          color={THEME.sage}
        />
        <DividendStatCard
          label="Portfolio Div. Yield"
          value={portfolioYield > 0 ? `${portfolioYield.toFixed(2)}%` : "—"}
          icon={<TrendingUp size={16} />}
          color="var(--accent)"
        />
        <DividendStatCard
          label="Upcoming Ex-dates"
          value={String(upcomingExDates.length)}
          icon={<Calendar size={16} />}
          color="#D97706"
        />
        <DividendStatCard
          label="Dividend Payers"
          value={`${dividendPayers.length} / ${stockRows.length}`}
          icon={<BarChart3 size={16} />}
          color={THEME.muted}
        />
      </div>

      {/* Upcoming ex-dates timeline */}
      {upcomingExDates.length > 0 && (
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
                  key={r.symbol}
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
                  {/* Symbol badge */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontWeight: 800,
                      fontSize: 10,
                      color: THEME.sage,
                      textAlign: "center",
                      lineHeight: 1.2,
                    }}
                  >
                    {r.symbol.replace(".NS", "").replace(".BO", "").slice(0, 6)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 14,
                        color: THEME.ink,
                      }}
                    >
                      {r.symbol}
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

      {/* All holdings table */}
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
                  color: "var(--accent)",
                  fontWeight: 600,
                }}
              >
                Loading…
              </span>
            )}
          </div>
          <div style={{ overflowX: "auto", border: `1.5px solid ${THEME.line}`, borderRadius: 12 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: "var(--surface-1)" }}>
                  <th style={{ ...th, textAlign: "left" }}>Symbol</th>
                  <th style={th}>Qty</th>
                  <th style={th}>Current Value</th>
                  <th style={th}>Div / Share</th>
                  <th style={th}>Yield %</th>
                  <th style={th}>Ex-date</th>
                  <th style={th}>Pay Date</th>
                  <th style={th}>Est. Annual</th>
                  <th style={th}>Last Received</th>
                </tr>
              </thead>
              <tbody>
                {[...stockRows]
                  .sort((a, b) => b.estDivIncome - a.estDivIncome)
                  .map((r) => (
                    <tr
                      key={r.symbol}
                      style={{
                        borderBottom: `1px solid ${THEME.line}`,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 800, color: THEME.ink }}>{r.symbol}</div>
                        {r.exchange && (
                          <div
                            style={{
                              fontSize: 10,
                              color: THEME.muted,
                              fontWeight: 600,
                              marginTop: 2,
                            }}
                          >
                            {r.exchange}
                          </div>
                        )}
                      </td>
                      <td style={td}>{r.qty.toLocaleString("en-IN")}</td>
                      <td style={{ ...td, fontWeight: 700 }}>
                        <Prv>{fmtINRExact(r.currentValue)}</Prv>
                      </td>
                      <td
                        style={{
                          ...td,
                          color: r.divRate > 0 ? THEME.sage : THEME.muted,
                          fontWeight: r.divRate > 0 ? 700 : 500,
                        }}
                      >
                        {r.divRate > 0 ? `₹${r.divRate.toFixed(2)}` : loading ? "…" : "—"}
                      </td>
                      <td
                        style={{
                          ...td,
                          color: r.divYield > 0 ? THEME.sage : THEME.muted,
                          fontWeight: r.divYield > 0 ? 700 : 500,
                        }}
                      >
                        {r.divYield > 0 ? `${r.divYield.toFixed(2)}%` : loading ? "…" : "—"}
                      </td>
                      <td
                        style={{
                          ...td,
                          color: r.exDate ? THEME.ink : THEME.muted,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.exDate ? formatDate(r.exDate) : loading ? "…" : "—"}
                      </td>
                      <td
                        style={{
                          ...td,
                          color: r.divPayDate ? THEME.ink : THEME.muted,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.divPayDate ? formatDate(r.divPayDate) : loading ? "…" : "—"}
                      </td>
                      <td
                        style={{
                          ...td,
                          fontWeight: r.estDivIncome > 0 ? 700 : 500,
                          color: r.estDivIncome > 0 ? THEME.sage : THEME.muted,
                        }}
                      >
                        {r.estDivIncome > 0 ? <Prv>{fmtINRExact(r.estDivIncome)}</Prv> : "—"}
                      </td>
                      <td
                        style={{
                          ...td,
                          color: THEME.muted,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.lastDiv
                          ? formatDate(r.lastDiv.recordDate || r.lastDiv.paymentDate)
                          : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

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
    </div>
  );
}
