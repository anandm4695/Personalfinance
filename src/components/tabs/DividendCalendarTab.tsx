// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  Coins,
  TrendingUp,
  Calendar,
  RefreshCw,
  AlertCircle,
  Clock,
  BarChart3,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, fmtINRExact, today } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
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

export function DividendCalendarTab({ state }: any) {
  const todayStr = today();
  const [exData, setExData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unique stock symbols from portfolio
  const symbols = useMemo<string[]>(() => {
    const s = new Set<string>();
    (state.stocks || []).forEach((st: any) => {
      if (st.symbol) s.add(st.symbol);
    });
    return Array.from(s);
  }, [state.stocks]);

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

  // Build enriched rows per stock
  const stockRows = useMemo(() => {
    return (state.stocks || [])
      .filter((s: any) => s.symbol && Number(s.qty || 0) > 0)
      .map((s: any) => {
        const info = exData[s.symbol] || {};
        const exDate = tsToDate(info.exDividendDate);
        const divPayDate = tsToDate(info.dividendDate);
        const divRate = Number(info.trailingAnnualDividendRate || info.dividendRate || 0);
        const divYield = Number(info.dividendYield || 0) * 100;
        const qty = Number(s.qty || 0);
        const currentPrice = Number(s.currentPrice || 0);
        const currentValue = currentPrice * qty;
        const estDivIncome = divRate * qty;
        const daysToEx = getDaysUntil(exDate);

        // Past dividends received for this symbol
        const pastDivs = (state.dividends || [])
          .filter((d: any) => d.symbol === s.symbol || d.fundName === s.symbol)
          .sort((a: any, b: any) =>
            (b.recordDate || b.paymentDate || "").localeCompare(a.recordDate || a.paymentDate || "")
          );
        const lastDiv = pastDivs[0] || null;

        return {
          symbol: s.symbol,
          exchange: s.exchange,
          qty,
          currentPrice,
          currentValue,
          exDate,
          divPayDate,
          divRate,
          divYield,
          estDivIncome,
          daysToEx,
          lastDiv,
          hasLiveData: fetched && !!info.trailingAnnualDividendRate,
          isDivPayer: divRate > 0,
        };
      });
  }, [state.stocks, state.dividends, exData, fetched]);

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
          subtitle="Add stocks to your Demat account to track dividend ex-dates and projected income"
        />
      </div>
    );
  }

  return (
    <div className="tab-content-enter">
      <SectionTitle sub="Ex-dividend dates, dividend yield & projected annual income from your stock holdings">
        Dividend Calendar
      </SectionTitle>

      {/* Refresh row */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
          gap: 10,
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
            }}
          >
            <AlertCircle size={13} />
            {error}
          </div>
        )}
        <button
          onClick={fetchExDates}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 8,
            border: `1.5px solid ${THEME.line}`,
            background: "transparent",
            color: loading ? THEME.muted : THEME.ink,
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} />
          {loading ? `Fetching ${symbols.length} symbols…` : "Refresh Ex-dates"}
        </button>
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Est. Annual Dividend"
          value={fmtINRFull(totalEstIncome)}
          icon={<Coins />}
          color={THEME.sage}
        />
        <StatCard
          label="Portfolio Div. Yield"
          value={portfolioYield > 0 ? `${portfolioYield.toFixed(2)}%` : "—"}
          icon={<TrendingUp />}
          color={THEME.accent}
        />
        <StatCard
          label="Upcoming Ex-dates"
          value={String(upcomingExDates.length)}
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

      {/* Upcoming ex-dates timeline */}
      {upcomingExDates.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ padding: 20 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                marginBottom: 14,
                color: THEME.ink,
              }}
            >
              Upcoming Ex-dividend Dates
              <span
                style={{
                  fontSize: 11,
                  color: THEME.muted,
                  marginLeft: 8,
                  fontWeight: 500,
                }}
              >
                (±90 days)
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {upcomingExDates.map((r) => {
                const uc = urgencyColor(r.daysToEx);
                const isPast = (r.daysToEx ?? 0) < 0;
                return (
                  <div
                    key={r.symbol}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: isPast
                        ? "transparent"
                        : r.daysToEx <= 3
                          ? "rgba(249,115,22,0.05)"
                          : "rgba(99,102,241,0.04)",
                      border: `1px solid ${
                        isPast ? THEME.line : r.daysToEx <= 3 ? "rgba(249,115,22,0.2)" : THEME.line
                      }`,
                      opacity: isPast ? 0.65 : 1,
                    }}
                  >
                    {/* Symbol badge */}
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: `${THEME.sage}15`,
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
                          fontWeight: 700,
                          fontSize: 14,
                          color: THEME.ink,
                        }}
                      >
                        {r.symbol}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>
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
                          fontWeight: 700,
                          fontSize: 14,
                          color: THEME.ink,
                        }}
                      >
                        <Prv>{r.divRate > 0 ? `₹${r.divRate.toFixed(2)}/share` : "—"}</Prv>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>
                        {r.estDivIncome > 0 ? (
                          <Prv>Est. {fmtINRExact(r.estDivIncome)}</Prv>
                        ) : (
                          `${r.qty.toLocaleString("en-IN")} shares`
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        background: `${uc}18`,
                        color: uc,
                        fontSize: 11,
                        fontWeight: 700,
                        minWidth: 44,
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
          </div>
        </Card>
      )}

      {/* All holdings table */}
      <Card>
        <div style={{ padding: 20 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              marginBottom: 14,
              color: THEME.ink,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            All Holdings — Dividend Details
            {!fetched && !loading && (
              <span
                style={{
                  fontSize: 11,
                  color: THEME.muted,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <AlertCircle size={11} />
                Click Refresh to fetch live data
              </span>
            )}
            {loading && (
              <span
                style={{
                  fontSize: 11,
                  color: THEME.accent,
                  fontWeight: 500,
                }}
              >
                Loading…
              </span>
            )}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: `1.5px solid ${THEME.line}`,
                  }}
                >
                  {[
                    "Symbol",
                    "Qty",
                    "Current Value",
                    "Div / Share",
                    "Yield %",
                    "Ex-date",
                    "Pay Date",
                    "Est. Annual",
                    "Last Received",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 12px",
                        textAlign: h === "Symbol" ? "left" : "right",
                        color: THEME.muted,
                        fontWeight: 600,
                        fontSize: 12,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
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
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "rgba(99,102,241,0.04)")
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 700, color: THEME.ink }}>{r.symbol}</div>
                        {r.exchange && (
                          <div
                            style={{
                              fontSize: 10,
                              color: THEME.muted,
                            }}
                          >
                            {r.exchange}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          color: THEME.muted,
                        }}
                      >
                        {r.qty.toLocaleString("en-IN")}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: THEME.ink,
                        }}
                      >
                        <Prv>{fmtINRExact(r.currentValue)}</Prv>
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          color: r.divRate > 0 ? THEME.sage : THEME.muted,
                          fontWeight: r.divRate > 0 ? 600 : 400,
                        }}
                      >
                        {r.divRate > 0 ? `₹${r.divRate.toFixed(2)}` : loading ? "…" : "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          color: r.divYield > 0 ? THEME.sage : THEME.muted,
                          fontWeight: r.divYield > 0 ? 600 : 400,
                        }}
                      >
                        {r.divYield > 0 ? `${r.divYield.toFixed(2)}%` : loading ? "…" : "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          color: r.exDate ? THEME.ink : THEME.muted,
                          whiteSpace: "nowrap",
                          fontSize: 12,
                        }}
                      >
                        {r.exDate ? formatDate(r.exDate) : loading ? "…" : "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          color: r.divPayDate ? THEME.muted : THEME.muted,
                          whiteSpace: "nowrap",
                          fontSize: 12,
                        }}
                      >
                        {r.divPayDate ? formatDate(r.divPayDate) : loading ? "…" : "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          fontWeight: r.estDivIncome > 0 ? 700 : 400,
                          color: r.estDivIncome > 0 ? THEME.sage : THEME.muted,
                        }}
                      >
                        {r.estDivIncome > 0 ? <Prv>{fmtINRExact(r.estDivIncome)}</Prv> : "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          color: THEME.muted,
                          fontSize: 12,
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
                padding: "16px 0",
                textAlign: "center",
                fontSize: 13,
                color: THEME.muted,
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
