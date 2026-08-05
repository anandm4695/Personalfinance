/* eslint-disable */
// @ts-nocheck
import React, { useState, useMemo, useCallback } from "react";
import {
  Trash2,
  BarChart3,
  ArrowLeftRight,
  Layers,
  Coins,
  Download,
  Search,
  TrendingUp,
  TrendingDown,
  Package,
  X,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";
import { SectionTitle } from "../ui/SectionTitle";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";

const th = {
  textAlign: "left" as const,
  padding: "14px 16px",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: THEME.muted,
  fontWeight: 700,
  borderBottom: `1.5px solid ${THEME.line}`,
  whiteSpace: "nowrap" as const,
  background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
};

const td = {
  padding: "14px 16px",
  verticalAlign: "middle" as const,
  fontSize: 13,
  borderBottom: `1px solid ${THEME.line}`,
  fontVariantNumeric: "tabular-nums" as const,
};

function livePrice(s: any, marketData: any): number {
  const base = (s.symbol || "").replace(/\.(NS|BO)$/i, "");
  const yfSym = `${base}.${(s.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
  const md = marketData?.[yfSym];
  return md?.price !== undefined ? Number(md.price) : Number(s.currentPrice || 0);
}

/* ── Premium Drill-Down Card ──────────────────────────────────── */
const PremiumDrillDownCard = ({
  icon: Icon,
  label,
  value,
  sub,
  subColor,
  color,
  active,
  onClick,
}: any) => (
  <div
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={
      onClick
        ? (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          }
        : undefined
    }
    aria-pressed={onClick ? !!active : undefined}
    className={`card-base${onClick ? " card-lift" : ""}`}
    style={{
      background:
        "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 15%, var(--surface-0)) 100%)",
      border: `1.5px solid ${active ? THEME.accent : THEME.line}`,
      borderTop: `4px solid ${color}`,
      borderRadius: 16,
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      boxShadow: active ? "var(--shadow-card-hover)" : undefined,
      cursor: onClick ? "pointer" : "default",
      position: "relative",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `linear-gradient(135deg, color-mix(in srgb, ${color} 15%, transparent) 0%, color-mix(in srgb, ${color} 8%, transparent) 100%)`,
          border: `1.5px solid color-mix(in srgb, ${color} 25%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color,
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </div>
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: THEME.muted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 10,
              color: subColor || THEME.muted,
              fontWeight: subColor ? 700 : 400,
              marginTop: 2,
              opacity: subColor ? 1 : 0.8,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>

    <div
      style={{
        fontSize: 26,
        fontWeight: 900,
        color: THEME.ink,
        letterSpacing: "-0.04em",
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
        marginTop: 4,
      }}
    >
      <Prv>{value}</Prv>
    </div>
  </div>
);

// Hoisted to module scope (were previously defined inside TxnHistoryTab's render
// body) — components defined inline in a parent's render are recreated with a new
// identity on every render, forcing React to unmount/remount them instead of
// reconciling, which drops local state and re-triggers mount transitions/effects
// on every keystroke in the search box or FY selector above.
const SectionHeader = ({ icon: Icon, title, count, color = THEME.accent, subText }: any) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={16} color={color} />
      </div>
      <span style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, letterSpacing: "-0.015em" }}>
        {title}
      </span>
      {count > 0 && (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 20,
            fontSize: 10,
            fontWeight: 800,
            background: `color-mix(in srgb, ${color} 10%, transparent)`,
            color,
          }}
        >
          {count}
        </span>
      )}
    </div>
    {subText && (
      <div style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, paddingLeft: 42 }}>
        {subText}
      </div>
    )}
  </div>
);

const searchSuffix = (query: string) => (query ? ` matching "${query}"` : "");

const TxnHistoryEmptyState = ({ message }: { message: string }) => (
  <Card style={{ padding: 48, textAlign: "center" }}>
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
      <Package size={32} color={THEME.muted} style={{ opacity: 0.35 }} />
    </div>
    <div style={{ fontSize: 14, color: THEME.muted }}>{message}</div>
  </Card>
);

type SortDir = "asc" | "desc";

/* Clickable column header — toggles sort on the given key, shows an arrow when active.
   Keeps rows in date-desc order (the original default) until the user opts into a sort. */
const SortableTh = ({
  label,
  sortKey,
  activeKey,
  dir,
  onClick,
}: {
  label: string;
  sortKey: string;
  activeKey?: string;
  dir?: SortDir;
  onClick: (key: string) => void;
}) => {
  const active = activeKey === sortKey;
  return (
    <th
      style={{ ...th, textAlign: "right", cursor: "pointer", userSelect: "none" }}
      onClick={() => onClick(sortKey)}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(sortKey);
        }
      }}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      <span style={{ opacity: active ? 1 : 0.3, marginLeft: 4 }}>
        {active ? (dir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </th>
  );
};

const SoldTable = ({
  rows,
  type,
  removeItem,
  fmtDate,
  fyLabel,
  searchQuery,
  sortKey,
  sortDir,
  onSort,
}: {
  rows: any[];
  type: "stock" | "mf";
  removeItem: (collection: string, id: string) => void;
  fmtDate: (d: string) => string;
  fyLabel: string;
  searchQuery: string;
  sortKey?: string;
  sortDir?: SortDir;
  onSort: (key: string) => void;
}) => {
  const total = rows.reduce((s: number, r: any) => s + Number(r.profit || 0), 0);
  if (rows.length === 0)
    return (
      <TxnHistoryEmptyState
        message={`No ${type === "stock" ? "stock sales" : "MF redemptions"} recorded in ${fyLabel}${searchSuffix(searchQuery)}`}
      />
    );
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div className="mobile-table-wrap" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "transparent" }}>
              <th style={{ ...th, paddingLeft: 16 }}>{type === "stock" ? "Company" : "Scheme"}</th>
              <th style={{ ...th, textAlign: "right" }}>Buy Date</th>
              <th style={{ ...th, textAlign: "right" }}>
                {type === "stock" ? "Buy Price" : "Buy NAV"}
              </th>
              <th style={{ ...th, textAlign: "right" }}>{type === "stock" ? "Qty" : "Units"}</th>
              <SortableTh
                label="Sell Date"
                sortKey="date"
                activeKey={sortKey}
                dir={sortDir}
                onClick={onSort}
              />
              <th style={{ ...th, textAlign: "right" }}>
                {type === "stock" ? "Sell Price" : "Sell NAV"}
              </th>
              <SortableTh
                label="Profit / Loss"
                sortKey="amount"
                activeKey={sortKey}
                dir={sortDir}
                onClick={onSort}
              />
              <th style={{ ...th, textAlign: "right" }}>Broker</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s: any) => {
              const profit = Number(s.profit || 0);
              const buyP = type === "stock" ? Number(s.buyPrice) : Number(s.buyNav);
              const sellP = type === "stock" ? Number(s.sellPrice) : Number(s.sellNav);
              return (
                <tr
                  key={s.id}
                  className="table-row-hover"
                  style={{
                    borderBottom: `1px solid ${THEME.line}`,
                  }}
                >
                  <td style={{ ...td, paddingLeft: 16 }}>
                    <span style={{ fontWeight: 700, color: THEME.ink }}>
                      {type === "stock" ? s.symbol?.replace(/\.(NS|BO)$/i, "") : s.scheme}
                    </span>
                    {type === "stock" && (
                      <span
                        style={{
                          fontSize: 9,
                          marginLeft: 6,
                          color: THEME.muted,
                          background: "var(--surface-2)",
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        {s.exchange || "NSE"}
                      </span>
                    )}
                    {type === "mf" && s.type && (
                      <span
                        style={{
                          fontSize: 9,
                          marginLeft: 6,
                          color: THEME.muted,
                          background: "var(--surface-2)",
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        {s.type}
                      </span>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12 }}>
                    {fmtDate(s.buyDate)}
                  </td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                    <Prv>₹{buyP.toFixed(type === "mf" ? 4 : 2)}</Prv>
                  </td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>
                    {type === "stock" ? s.qty : Number(s.units).toFixed(3)}
                  </td>
                  <td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12 }}>
                    {fmtDate(s.sellDate)}
                  </td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                    <span style={{ color: sellP >= buyP ? THEME.sage : THEME.rust }}>
                      <Prv>
                        ₹{sellP.toFixed(type === "mf" ? 4 : 2)} {sellP >= buyP ? "↑" : "↓"}
                      </Prv>
                    </span>
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: "right",
                      color: profit >= 0 ? THEME.sage : THEME.rust,
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    <Prv>
                      {profit >= 0 ? "+" : ""}₹
                      {Math.abs(profit).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </Prv>
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: "right",
                      color: THEME.muted,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {s.broker || "—"}
                  </td>
                  <td style={{ ...td, paddingRight: 16 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(type === "stock" ? "stockSells" : "mfSells", s.id)}
                      title="Delete"
                      aria-label="Delete sale record"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: THEME.rust,
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: "var(--surface-1)" }}>
              <td colSpan={6} style={{ ...td, paddingLeft: 16, fontWeight: 800, color: THEME.ink }}>
                Total Realized P&L
              </td>
              <td
                style={{
                  ...td,
                  textAlign: "right",
                  fontWeight: 900,
                  color: total >= 0 ? THEME.sage : THEME.rust,
                  fontSize: 15,
                }}
              >
                <Prv>
                  {total >= 0 ? "+" : ""}₹
                  {Math.abs(total).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </Prv>
              </td>
              <td colSpan={2} style={td}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
};

export function TxnHistoryTab({ state, removeItem, marketData = {} }: any) {
  const currentFY = (() => {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 3 ? y : y - 1;
  })();
  const [selectedFY, setSelectedFY] = useState(currentFY);
  const [activeSection, setActiveSection] = useState<
    "all" | "stocks_bought" | "stocks_sold" | "mf_bought" | "mf_sold" | "cash_ledger"
  >("all");
  const [txnDematId, setTxnDematId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortState, setSortState] = useState<Record<string, { key: string; dir: SortDir }>>({});

  const toggleSort = useCallback((section: string, key: string) => {
    setSortState((prev) => {
      const cur = prev[section];
      const dir: SortDir = cur && cur.key === key && cur.dir === "desc" ? "asc" : "desc";
      return { ...prev, [section]: { key, dir } };
    });
  }, []);

  const sortRows = useCallback(
    <T,>(rows: T[], section: string, accessors: Record<string, (row: T) => number>): T[] => {
      const cfg = sortState[section];
      const getter = cfg && accessors[cfg.key];
      if (!cfg || !getter) return rows;
      const sign = cfg.dir === "asc" ? 1 : -1;
      return [...rows].sort((a, b) => (getter(a) - getter(b)) * sign);
    },
    [sortState]
  );

  // Plain "YYYY-MM-DD" string bounds — comparing ISO date strings lexicographically avoids the
  // Date-object timezone trap where a date-only string ("2026-04-01") parses as UTC midnight
  // while a date+time string ("...T23:59:59", no "Z") parses in the browser's local timezone.
  // Mixing those two parsing rules can shift the FY boundary by hours depending on the user's
  // timezone, occasionally letting a transaction slip into the wrong FY near midnight.
  const fyStart = (fy: number) => `${fy}-04-01`;
  const fyEnd = (fy: number) => `${fy + 1}-03-31`;

  const inFY = useCallback(
    (dateStr: string) => {
      if (!dateStr) return false;
      const d = dateStr.slice(0, 10);
      return d >= fyStart(selectedFY) && d <= fyEnd(selectedFY);
    },
    [selectedFY]
  );

  const matchesSearch = useCallback(
    (text: string) => {
      if (!searchQuery) return true;
      return (text || "").toLowerCase().includes(searchQuery.toLowerCase());
    },
    [searchQuery]
  );

  const allFYs = useMemo(() => {
    const fySet = new Set<number>();
    fySet.add(currentFY);
    // Same string-slice comparison as fyStart/fyEnd above — avoids parsing a
    // date-only "YYYY-MM-DD" string as UTC midnight and reading it back with
    // local getMonth()/getFullYear(), which can misclassify a date's FY by a
    // day near year/month boundaries depending on the user's timezone offset.
    const addFY = (dateStr: string) => {
      if (!dateStr) return;
      const d = dateStr.slice(0, 10);
      const y = Number(d.slice(0, 4));
      const m = Number(d.slice(5, 7)); // 1-indexed month
      if (!y || !m) return;
      fySet.add(m >= 4 ? y : y - 1);
    };
    (state.stocks || []).forEach((s: any) => addFY(s.buyDate));
    (state.stockSells || []).forEach((s: any) => addFY(s.sellDate));
    (state.mutualFunds || []).forEach((m: any) => addFY(m.buyDate));
    (state.mfSells || []).forEach((m: any) => addFY(m.sellDate));
    (state.transactions || []).forEach((t: any) => addFY(t.date));
    return Array.from(fySet).sort((a, b) => b - a);
  }, [
    state.stocks,
    state.stockSells,
    state.mutualFunds,
    state.mfSells,
    state.transactions,
    currentFY,
  ]);

  const stocksBoughtInFY = useMemo(
    () =>
      (state.stocks || [])
        .filter(
          (s: any) =>
            inFY(s.buyDate) &&
            (!txnDematId || s.dematId === txnDematId) &&
            matchesSearch(`${s.symbol} ${s.broker}`)
        )
        .sort((a: any, b: any) => new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()),
    [state.stocks, txnDematId, inFY, matchesSearch]
  );

  const stocksSoldInFY = useMemo(
    () =>
      (state.stockSells || [])
        .filter(
          (s: any) =>
            inFY(s.sellDate) &&
            (!txnDematId || s.dematId === txnDematId) &&
            matchesSearch(`${s.symbol} ${s.broker}`)
        )
        .sort((a: any, b: any) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()),
    [state.stockSells, txnDematId, inFY, matchesSearch]
  );

  const mfBoughtInFY = useMemo(
    () =>
      (state.mutualFunds || [])
        .filter(
          (m: any) =>
            inFY(m.buyDate) &&
            matchesSearch(`${m.name || m.scheme} ${m.category || m.mfType || m.type}`)
        )
        .sort((a: any, b: any) => new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()),
    [state.mutualFunds, inFY, matchesSearch]
  );

  const mfSoldInFY = useMemo(
    () =>
      (state.mfSells || [])
        .filter(
          (m: any) =>
            inFY(m.sellDate) &&
            matchesSearch(`${m.name || m.scheme} ${m.category || m.mfType || m.type}`)
        )
        .sort((a: any, b: any) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()),
    [state.mfSells, inFY, matchesSearch]
  );

  const cashTransactionsInFY = useMemo(
    () =>
      (state.transactions || [])
        .filter(
          (t: any) =>
            inFY(t.date) &&
            matchesSearch(`${t.note} ${t.category} ${t.description || ""} ${t.type}`)
        )
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [state.transactions, inFY, matchesSearch]
  );

  const stocksRealizedPnl = stocksSoldInFY.reduce(
    (s: number, sl: any) => s + Number(sl.profit || 0),
    0
  );
  const mfRealizedPnl = mfSoldInFY.reduce((s: number, sl: any) => s + Number(sl.profit || 0), 0);
  const totalRealizedPnl = stocksRealizedPnl + mfRealizedPnl;

  // Self-transfers between the user's own accounts aren't real income/spend — excluded
  // from these totals to match how Dashboard/BanksTab/AnnualReportTab treat them, so this
  // tab's "Cash Net Flow" doesn't double-count money moving between the user's own accounts.
  const isTransferCategory = (cat: string) =>
    cat === "Transfer" || cat === "Self Transfer" || cat === "Self-Transfer";
  const hasTransfers = cashTransactionsInFY.some((t: any) => isTransferCategory(t.category));
  const totalCredits = cashTransactionsInFY
    .filter((t: any) => t.type === "credit" && !isTransferCategory(t.category))
    .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const totalDebits = cashTransactionsInFY
    .filter((t: any) => t.type === "debit" && !isTransferCategory(t.category))
    .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const cashNetFlow = totalCredits - totalDebits;

  const stocksBoughtTotals = useMemo(() => {
    let invested = 0,
      pnl = 0,
      hasCurr = false,
      unpriced = 0;
    stocksBoughtInFY.forEach((s: any) => {
      const curr = livePrice(s, marketData);
      const inv = Number(s.qty) * Number(s.avgPrice);
      invested += inv;
      if (curr) {
        pnl += Number(s.qty) * curr - inv;
        hasCurr = true;
      } else {
        unpriced++;
      }
    });
    return { invested, pnl, hasCurr, unpriced };
  }, [stocksBoughtInFY, marketData]);

  const mfBoughtTotals = useMemo(() => {
    let invested = 0,
      pnl = 0,
      hasCurr = false,
      unpriced = 0;
    mfBoughtInFY.forEach((m: any) => {
      const buyNav = m.buyNav
        ? Number(m.buyNav)
        : m.invested && m.units
          ? Number(m.invested) / Number(m.units)
          : 0;
      const currNav = Number(m.currentNav || 0);
      const inv = Number(m.units) * buyNav;
      invested += inv;
      if (currNav) {
        pnl += Number(m.units) * currNav - inv;
        hasCurr = true;
      } else {
        unpriced++;
      }
    });
    return { invested, pnl, hasCurr, unpriced };
  }, [mfBoughtInFY]);

  const totalStocksInvested = stocksBoughtTotals.invested;
  const totalMFInvested = mfBoughtTotals.invested;

  // Display order — defaults to the date-desc order computed above; a column-header click
  // re-sorts via sortRows without touching the underlying filtered arrays (totals/CSV exports
  // that don't care about order keep reading the base *_InFY arrays).
  const stocksBoughtSorted = useMemo(
    () =>
      sortRows(stocksBoughtInFY, "stocks_bought", {
        date: (s: any) => new Date(s.buyDate).getTime(),
        amount: (s: any) => Number(s.qty) * Number(s.avgPrice),
      }),
    [stocksBoughtInFY, sortRows]
  );
  const stocksSoldSorted = useMemo(
    () =>
      sortRows(stocksSoldInFY, "stocks_sold", {
        date: (s: any) => new Date(s.sellDate).getTime(),
        amount: (s: any) => Number(s.profit || 0),
      }),
    [stocksSoldInFY, sortRows]
  );
  const mfBoughtSorted = useMemo(
    () =>
      sortRows(mfBoughtInFY, "mf_bought", {
        date: (m: any) => new Date(m.buyDate).getTime(),
        amount: (m: any) => Number(m.units) * Number(m.buyNav || 0),
      }),
    [mfBoughtInFY, sortRows]
  );
  const mfSoldSorted = useMemo(
    () =>
      sortRows(mfSoldInFY, "mf_sold", {
        date: (m: any) => new Date(m.sellDate).getTime(),
        amount: (m: any) => Number(m.profit || 0),
      }),
    [mfSoldInFY, sortRows]
  );
  const cashTransactionsSorted = useMemo(
    () =>
      sortRows(cashTransactionsInFY, "cash_ledger", {
        date: (t: any) => new Date(t.date).getTime(),
        amount: (t: any) => Number(t.amount || 0) * (t.type === "credit" ? 1 : -1),
      }),
    [cashTransactionsInFY, sortRows]
  );

  const fmtDate = (d: string) =>
    d
      ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";
  const fyLabel = `FY ${String(selectedFY).slice(2)}-${String(selectedFY + 1).slice(2)}`;
  const fyFileLabel = fyLabel.replace(/\s+/g, "");

  const sections = [
    { id: "all", label: "All Assets", icon: Layers },
    { id: "stocks_bought", label: "Stocks Bought", icon: TrendingUp },
    { id: "stocks_sold", label: "Stocks Sold", icon: TrendingDown },
    { id: "mf_bought", label: "MF Bought", icon: BarChart3 },
    { id: "mf_sold", label: "MF Sold", icon: ArrowLeftRight },
    { id: "cash_ledger", label: "Bank Ledger", icon: Coins },
  ] as const;

  const sectionCounts: Record<string, number> = {
    all:
      stocksBoughtInFY.length +
      stocksSoldInFY.length +
      mfBoughtInFY.length +
      mfSoldInFY.length +
      cashTransactionsInFY.length,
    stocks_bought: stocksBoughtInFY.length,
    stocks_sold: stocksSoldInFY.length,
    mf_bought: mfBoughtInFY.length,
    mf_sold: mfSoldInFY.length,
    cash_ledger: cashTransactionsInFY.length,
  };

  const show = (id: (typeof sections)[number]["id"]) =>
    activeSection === "all" || activeSection === id;

  const exportToCSV = (
    data: any[],
    filename: string,
    headers: string[],
    rowMapper: (row: any) => string[]
  ) => {
    if (!data || data.length === 0) return;
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        rowMapper(row)
          .map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="tab-content-enter">
      <SectionTitle sub="Unified transaction accounting for capital demat investments and liquidity bank accounts">
        Global Ledger
      </SectionTitle>

      {/* Premium Search & Period Selector bar */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 18,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{ display: "flex", flex: "1 1 280px", position: "relative", alignItems: "center" }}
        >
          <Search
            size={16}
            color={THEME.muted}
            style={{ position: "absolute", left: 14, pointerEvents: "none" }}
          />
          <input
            type="text"
            aria-label="Search transactions"
            placeholder="Search symbols, notes, categories, brokers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: `10px ${searchQuery ? 40 : 14}px 10px 40px`,
              borderRadius: 12,
              border: `1.5px solid ${THEME.line}`,
              background: "var(--surface-0)",
              color: THEME.ink,
              fontSize: 13.5,
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
                right: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: "none",
                background: "var(--surface-2)",
                color: THEME.muted,
                cursor: "pointer",
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--surface-0)",
            padding: "4px 14px",
            borderRadius: 12,
            border: `1px solid ${THEME.line}`,
            height: 42,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: THEME.muted,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Period
          </span>
          <select
            aria-label="Select period"
            style={{
              background: "transparent",
              border: "none",
              color: THEME.ink,
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              outline: "none",
              paddingRight: "20px",
            }}
            value={selectedFY}
            onChange={(e) => setSelectedFY(Number(e.target.value))}
          >
            {allFYs.map((fy) => (
              <option key={fy} value={fy}>
                FY {String(fy).slice(2)}-{String(fy + 1).slice(2)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Premium FY Summary strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Stocks Invested"
          value={`₹${totalStocksInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          color={THEME.accent}
          icon={<BarChart3 />}
        />
        <StatCard
          label="MF Invested"
          value={`₹${totalMFInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          color={THEME.violet}
          icon={<Layers />}
        />
        <StatCard
          label="Realized P&L"
          value={`${totalRealizedPnl >= 0 ? "+" : ""}₹${Math.abs(totalRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          color={totalRealizedPnl >= 0 ? THEME.sage : THEME.rust}
          icon={totalRealizedPnl >= 0 ? <TrendingUp /> : <TrendingDown />}
        />
        <StatCard
          label="Cash Net Flow"
          value={`${cashNetFlow >= 0 ? "+" : ""}₹${Math.abs(cashNetFlow).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          color={cashNetFlow >= 0 ? THEME.sage : THEME.rust}
          icon={<Coins />}
        />
      </div>

      {/* Premium Sticky Section Tab Pills */}
      <div
        className="no-print"
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "nowrap",
          overflowX: "auto",
          marginBottom: 24,
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "color-mix(in srgb, var(--surface-0) 70%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: "10px 8px",
          borderRadius: 16,
          border: `1px solid ${THEME.line}`,
          boxShadow: "var(--shadow-sm)",
          scrollbarWidth: "none",
        }}
      >
        {sections.map((s) => {
          const Icon = s.icon;
          const count = sectionCounts[s.id] || 0;
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              aria-pressed={active}
              className="card-lift"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 20,
                background: active ? THEME.accent : "var(--surface-0)",
                border: `1px solid ${active ? THEME.accent : THEME.line}`,
                color: active ? THEME.darkInk : THEME.ink,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                boxShadow: active
                  ? "0 4px 12px color-mix(in srgb, var(--t-accent) 25%, transparent)"
                  : "var(--shadow-card)",
              }}
            >
              <Icon size={14} style={{ color: active ? THEME.darkInk : THEME.accent }} />
              <span>{s.label}</span>
              {count > 0 && (
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 800,
                    background: active
                      ? "rgba(255, 255, 255, 0.2)"
                      : `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                    color: active ? THEME.darkInk : THEME.accent,
                    marginLeft: 4,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Demat Account selectors */}
      {(state.demat || []).length > 1 && activeSection !== "cash_ledger" && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 24,
            alignItems: "center",
            padding: "8px 12px",
            background: "var(--surface-1)",
            borderRadius: 12,
            border: `1px solid ${THEME.line}`,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: THEME.muted,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginRight: 6,
            }}
          >
            Account:
          </span>
          <Button
            size="sm"
            variant={txnDematId === null ? "accent" : "secondary"}
            onClick={() => setTxnDematId(null)}
            style={{ height: 26, padding: "0 12px", fontSize: 10.5, borderRadius: 16 }}
          >
            All Accounts
          </Button>
          {(state.demat || []).map((d: any) => (
            <Button
              key={d.id}
              size="sm"
              variant={txnDematId === d.id ? "accent" : "secondary"}
              onClick={() => setTxnDematId(d.id)}
              style={{ height: 26, padding: "0 12px", fontSize: 10.5, borderRadius: 16 }}
            >
              {d.broker || d.dpId || "Account"}
            </Button>
          ))}
        </div>
      )}

      {/* Premium Drill-Down Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <PremiumDrillDownCard
          icon={TrendingUp}
          label="Stocks Bought"
          value={String(stocksBoughtInFY.length)}
          sub={
            <>
              {fyLabel} ·{" "}
              <Prv>
                ₹{totalStocksInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </Prv>
            </>
          }
          color={THEME.accent}
          active={activeSection === "stocks_bought"}
          onClick={() => setActiveSection("stocks_bought")}
        />
        <PremiumDrillDownCard
          icon={ArrowLeftRight}
          label="Stocks Sold"
          value={String(stocksSoldInFY.length)}
          sub={
            <>
              Realized:{" "}
              <Prv>
                {stocksRealizedPnl >= 0 ? "+" : ""}₹
                {Math.abs(stocksRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </Prv>
            </>
          }
          subColor={stocksRealizedPnl >= 0 ? THEME.sage : THEME.rust}
          color={THEME.accent}
          active={activeSection === "stocks_sold"}
          onClick={() => setActiveSection("stocks_sold")}
        />
        <PremiumDrillDownCard
          icon={BarChart3}
          label="MF Bought"
          value={String(mfBoughtInFY.length)}
          sub={
            <>
              {fyLabel} ·{" "}
              <Prv>₹{totalMFInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Prv>
            </>
          }
          color={THEME.accent}
          active={activeSection === "mf_bought"}
          onClick={() => setActiveSection("mf_bought")}
        />
        <PremiumDrillDownCard
          icon={ArrowLeftRight}
          label="MF Redeemed"
          value={String(mfSoldInFY.length)}
          sub={
            <>
              Realized:{" "}
              <Prv>
                {mfRealizedPnl >= 0 ? "+" : ""}₹
                {Math.abs(mfRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </Prv>
            </>
          }
          subColor={mfRealizedPnl >= 0 ? THEME.sage : THEME.rust}
          color={THEME.accent}
          active={activeSection === "mf_sold"}
          onClick={() => setActiveSection("mf_sold")}
        />
        <PremiumDrillDownCard
          icon={Coins}
          label="Bank & Cash Ledger"
          value={String(cashTransactionsInFY.length)}
          sub={
            <Prv>
              In +₹{totalCredits.toLocaleString("en-IN", { maximumFractionDigits: 0 })} · Out -₹
              {totalDebits.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </Prv>
          }
          subColor={THEME.sage}
          color={THEME.cyan}
          active={activeSection === "cash_ledger"}
          onClick={() => setActiveSection("cash_ledger")}
        />
      </div>

      {/* ── STOCKS BOUGHT ── */}
      {show("stocks_bought") && (
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <SectionHeader
              icon={TrendingUp}
              title="Stocks Bought"
              count={stocksBoughtInFY.length}
              color={THEME.accent}
            />
            {stocksBoughtInFY.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={14} />}
                onClick={() =>
                  exportToCSV(
                    stocksBoughtSorted,
                    `Stocks_Bought_${fyFileLabel}.csv`,
                    [
                      "Company",
                      "Exchange",
                      "Qty",
                      "Buy Date",
                      "Buy Price",
                      "Invested Amount",
                      "Current Price",
                      "Unrealized P&L",
                    ],
                    (s) => {
                      const cp = livePrice(s, marketData);
                      const inv = Number(s.qty) * Number(s.avgPrice);
                      return [
                        s.symbol?.replace(/\.(NS|BO)$/i, ""),
                        s.exchange || "NSE",
                        s.qty,
                        s.buyDate,
                        s.avgPrice,
                        inv,
                        cp,
                        (cp - Number(s.avgPrice)) * Number(s.qty),
                      ];
                    }
                  )
                }
              >
                Export CSV
              </Button>
            )}
          </div>
          {stocksBoughtInFY.length === 0 ? (
            <TxnHistoryEmptyState
              message={`No stock purchases recorded in ${fyLabel}${searchSuffix(searchQuery)}`}
            />
          ) : (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div className="mobile-table-wrap" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "transparent" }}>
                      <th style={{ ...th, paddingLeft: 16 }}>Company</th>
                      <th style={{ ...th, textAlign: "right" }}>Qty</th>
                      <SortableTh
                        label="Buy Date"
                        sortKey="date"
                        activeKey={sortState.stocks_bought?.key}
                        dir={sortState.stocks_bought?.dir}
                        onClick={(key) => toggleSort("stocks_bought", key)}
                      />
                      <th style={{ ...th, textAlign: "right" }}>Buy Price</th>
                      <SortableTh
                        label="Amount"
                        sortKey="amount"
                        activeKey={sortState.stocks_bought?.key}
                        dir={sortState.stocks_bought?.dir}
                        onClick={(key) => toggleSort("stocks_bought", key)}
                      />
                      <th style={{ ...th, textAlign: "right" }}>Curr Price</th>
                      <th style={{ ...th, textAlign: "right" }}>Unrealized P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocksBoughtSorted.map((s: any) => {
                      const curr = livePrice(s, marketData);
                      const inv = Number(s.qty) * Number(s.avgPrice);
                      const val = Number(s.qty) * curr;
                      const pnl = val - inv;
                      return (
                        <tr
                          key={s.id}
                          className="table-row-hover"
                          style={{
                            borderBottom: `1px solid ${THEME.line}`,
                          }}
                        >
                          <td style={{ ...td, paddingLeft: 16 }}>
                            <span style={{ fontWeight: 700, color: THEME.ink }}>
                              {s.symbol?.replace(/\.(NS|BO)$/i, "")}
                            </span>
                            <span
                              style={{
                                fontSize: 9,
                                marginLeft: 6,
                                color: THEME.muted,
                                background: "var(--surface-2)",
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontWeight: 700,
                              }}
                            >
                              {s.exchange || "NSE"}
                            </span>
                          </td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{s.qty}</td>
                          <td style={{ ...td, textAlign: "right", color: THEME.muted }}>
                            {fmtDate(s.buyDate)}
                          </td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                            <Prv>₹{Number(s.avgPrice).toFixed(2)}</Prv>
                          </td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>
                            <Prv>₹{inv.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Prv>
                          </td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                            {curr ? <Prv>₹{curr.toFixed(2)}</Prv> : "—"}
                          </td>
                          <td
                            style={{
                              ...td,
                              textAlign: "right",
                              color: pnl >= 0 ? THEME.sage : THEME.rust,
                              fontWeight: 800,
                            }}
                          >
                            {curr ? (
                              <Prv>
                                {pnl >= 0 ? "+" : ""}₹
                                {Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                              </Prv>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "var(--surface-1)" }}>
                      <td
                        colSpan={4}
                        style={{ ...td, paddingLeft: 16, fontWeight: 800, color: THEME.ink }}
                      >
                        Total Invested
                      </td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 900, fontSize: 15 }}>
                        <Prv>
                          ₹
                          {stocksBoughtTotals.invested.toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}
                        </Prv>
                      </td>
                      <td style={td}></td>
                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                          fontWeight: 900,
                          color: stocksBoughtTotals.pnl >= 0 ? THEME.sage : THEME.rust,
                          fontSize: 15,
                        }}
                      >
                        {stocksBoughtTotals.hasCurr ? (
                          <Prv>
                            {stocksBoughtTotals.pnl >= 0 ? "+" : ""}₹
                            {Math.abs(stocksBoughtTotals.pnl).toLocaleString("en-IN", {
                              maximumFractionDigits: 0,
                            })}
                            {stocksBoughtTotals.unpriced > 0 ? "*" : ""}
                          </Prv>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                    {stocksBoughtTotals.hasCurr && stocksBoughtTotals.unpriced > 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            ...td,
                            paddingLeft: 16,
                            paddingTop: 6,
                            paddingBottom: 10,
                            fontSize: 10.5,
                            color: THEME.muted,
                            fontStyle: "italic",
                            borderBottom: "none",
                          }}
                        >
                          * Approximate — excludes {stocksBoughtTotals.unpriced} holding
                          {stocksBoughtTotals.unpriced > 1 ? "s" : ""} with no live price data
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── STOCKS SOLD ── */}
      {show("stocks_sold") && (
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <SectionHeader
              icon={TrendingDown}
              title="Stocks Sold"
              count={stocksSoldInFY.length}
              color={stocksRealizedPnl >= 0 ? THEME.sage : THEME.rust}
              subText={
                stocksSoldInFY.length > 0
                  ? `Net Realized: ${stocksRealizedPnl >= 0 ? "+" : ""}₹${Math.abs(stocksRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                  : undefined
              }
            />
            {stocksSoldInFY.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={14} />}
                onClick={() =>
                  exportToCSV(
                    stocksSoldSorted,
                    `Stocks_Sold_${fyFileLabel}.csv`,
                    [
                      "Company",
                      "Buy Date",
                      "Buy Price",
                      "Qty",
                      "Sell Date",
                      "Sell Price",
                      "Profit/Loss",
                      "Broker",
                    ],
                    (s) => [
                      s.symbol?.replace(/\.(NS|BO)$/i, ""),
                      s.buyDate,
                      s.buyPrice,
                      s.qty,
                      s.sellDate,
                      s.sellPrice,
                      s.profit,
                      s.broker,
                    ]
                  )
                }
              >
                Export CSV
              </Button>
            )}
          </div>
          <SoldTable
            rows={stocksSoldSorted}
            type="stock"
            removeItem={removeItem}
            fmtDate={fmtDate}
            fyLabel={fyLabel}
            searchQuery={searchQuery}
            sortKey={sortState.stocks_sold?.key}
            sortDir={sortState.stocks_sold?.dir}
            onSort={(key) => toggleSort("stocks_sold", key)}
          />
        </div>
      )}

      {/* ── MF BOUGHT ── */}
      {show("mf_bought") && (
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <SectionHeader
              icon={BarChart3}
              title="Mutual Funds Bought"
              count={mfBoughtInFY.length}
              color={THEME.violet}
            />
            {mfBoughtInFY.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={14} />}
                onClick={() =>
                  exportToCSV(
                    mfBoughtSorted,
                    `MF_Bought_${fyFileLabel}.csv`,
                    [
                      "Scheme",
                      "Category/Type",
                      "Units",
                      "Buy Date",
                      "Buy NAV",
                      "Invested Amount",
                      "Current NAV",
                      "Unrealized P&L",
                    ],
                    (m) => [
                      m.name || m.scheme,
                      m.category || m.mfType || m.type || "Equity",
                      m.units,
                      m.buyDate,
                      m.buyNav || 0,
                      Number(m.units) * Number(m.buyNav || 0),
                      m.currentNav || 0,
                      (Number(m.currentNav || 0) - Number(m.buyNav || 0)) * Number(m.units),
                    ]
                  )
                }
              >
                Export CSV
              </Button>
            )}
          </div>
          {mfBoughtInFY.length === 0 ? (
            <TxnHistoryEmptyState
              message={`No MF purchases recorded in ${fyLabel}${searchSuffix(searchQuery)}`}
            />
          ) : (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div className="mobile-table-wrap" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "transparent" }}>
                      <th style={{ ...th, paddingLeft: 16 }}>Scheme</th>
                      <th style={{ ...th, textAlign: "right" }}>Units</th>
                      <SortableTh
                        label="Buy Date"
                        sortKey="date"
                        activeKey={sortState.mf_bought?.key}
                        dir={sortState.mf_bought?.dir}
                        onClick={(key) => toggleSort("mf_bought", key)}
                      />
                      <th style={{ ...th, textAlign: "right" }}>Buy NAV</th>
                      <SortableTh
                        label="Amount"
                        sortKey="amount"
                        activeKey={sortState.mf_bought?.key}
                        dir={sortState.mf_bought?.dir}
                        onClick={(key) => toggleSort("mf_bought", key)}
                      />
                      <th style={{ ...th, textAlign: "right" }}>Curr NAV</th>
                      <th style={{ ...th, textAlign: "right" }}>Unrealized P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mfBoughtSorted.map((m: any) => {
                      const buyNav = m.buyNav
                        ? Number(m.buyNav)
                        : m.invested && m.units
                          ? Number(m.invested) / Number(m.units)
                          : 0;
                      const currNav = Number(m.currentNav || 0);
                      const inv = Number(m.units) * buyNav;
                      const val = Number(m.units) * currNav;
                      const pnl = val - inv;
                      return (
                        <tr
                          key={m.id}
                          className="table-row-hover"
                          style={{
                            borderBottom: `1px solid ${THEME.line}`,
                          }}
                        >
                          <td style={{ ...td, paddingLeft: 16 }}>
                            <span style={{ fontWeight: 700, color: THEME.ink }}>
                              {m.name || m.scheme}
                            </span>
                            {(m.category || m.mfType || m.type) && (
                              <span
                                style={{
                                  fontSize: 9,
                                  marginLeft: 6,
                                  color: THEME.muted,
                                  background: "var(--surface-2)",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  fontWeight: 700,
                                }}
                              >
                                {m.category || m.mfType || m.type}
                              </span>
                            )}
                          </td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>
                            {Number(m.units).toFixed(3)}
                          </td>
                          <td style={{ ...td, textAlign: "right", color: THEME.muted }}>
                            {fmtDate(m.buyDate)}
                          </td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                            {buyNav ? <Prv>₹{buyNav.toFixed(4)}</Prv> : "—"}
                          </td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>
                            <Prv>₹{inv.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Prv>
                          </td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                            {currNav ? <Prv>₹{currNav.toFixed(4)}</Prv> : "—"}
                          </td>
                          <td
                            style={{
                              ...td,
                              textAlign: "right",
                              color: pnl >= 0 ? THEME.sage : THEME.rust,
                              fontWeight: 800,
                            }}
                          >
                            {currNav ? (
                              <Prv>
                                {pnl >= 0 ? "+" : ""}₹
                                {Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                              </Prv>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "var(--surface-1)" }}>
                      <td
                        colSpan={4}
                        style={{ ...td, paddingLeft: 16, fontWeight: 800, color: THEME.ink }}
                      >
                        Total Invested
                      </td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 900, fontSize: 15 }}>
                        <Prv>
                          ₹
                          {mfBoughtTotals.invested.toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}
                        </Prv>
                      </td>
                      <td style={td}></td>
                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                          fontWeight: 900,
                          color: mfBoughtTotals.pnl >= 0 ? THEME.sage : THEME.rust,
                          fontSize: 15,
                        }}
                      >
                        {mfBoughtTotals.hasCurr ? (
                          <Prv>
                            {mfBoughtTotals.pnl >= 0 ? "+" : ""}₹
                            {Math.abs(mfBoughtTotals.pnl).toLocaleString("en-IN", {
                              maximumFractionDigits: 0,
                            })}
                            {mfBoughtTotals.unpriced > 0 ? "*" : ""}
                          </Prv>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                    {mfBoughtTotals.hasCurr && mfBoughtTotals.unpriced > 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            ...td,
                            paddingLeft: 16,
                            paddingTop: 6,
                            paddingBottom: 10,
                            fontSize: 10.5,
                            color: THEME.muted,
                            fontStyle: "italic",
                            borderBottom: "none",
                          }}
                        >
                          * Approximate — excludes {mfBoughtTotals.unpriced} holding
                          {mfBoughtTotals.unpriced > 1 ? "s" : ""} with no live NAV data
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── MF SOLD ── */}
      {show("mf_sold") && (
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <SectionHeader
              icon={ArrowLeftRight}
              title="Mutual Funds Redeemed"
              count={mfSoldInFY.length}
              color={mfRealizedPnl >= 0 ? THEME.sage : THEME.rust}
              subText={
                mfSoldInFY.length > 0
                  ? `Net Realized: ${mfRealizedPnl >= 0 ? "+" : ""}₹${Math.abs(mfRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                  : undefined
              }
            />
            {mfSoldInFY.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={14} />}
                onClick={() =>
                  exportToCSV(
                    mfSoldSorted,
                    `MF_Redeemed_${fyFileLabel}.csv`,
                    [
                      "Scheme",
                      "Buy Date",
                      "Buy NAV",
                      "Units",
                      "Sell Date",
                      "Sell NAV",
                      "Profit/Loss",
                      "Broker",
                    ],
                    (m) => [
                      m.name || m.scheme,
                      m.buyDate,
                      m.buyNav,
                      m.units,
                      m.sellDate,
                      m.sellNav,
                      m.profit,
                      m.broker,
                    ]
                  )
                }
              >
                Export CSV
              </Button>
            )}
          </div>
          <SoldTable
            rows={mfSoldSorted}
            type="mf"
            removeItem={removeItem}
            fmtDate={fmtDate}
            fyLabel={fyLabel}
            searchQuery={searchQuery}
            sortKey={sortState.mf_sold?.key}
            sortDir={sortState.mf_sold?.dir}
            onSort={(key) => toggleSort("mf_sold", key)}
          />
        </div>
      )}

      {/* ── CASH & BANK LEDGER ── */}
      {show("cash_ledger") && (
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <SectionHeader
              icon={Coins}
              title="Bank & Cash Ledger"
              count={cashTransactionsInFY.length}
              color={THEME.cyan}
              subText={
                cashTransactionsInFY.length > 0
                  ? `Inflow +${fmtINRFull(totalCredits)} · Outflow -${fmtINRFull(totalDebits)}${hasTransfers ? " (excl. self-transfers)" : ""}`
                  : undefined
              }
            />
            {cashTransactionsInFY.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={14} />}
                onClick={() =>
                  exportToCSV(
                    cashTransactionsSorted,
                    `Cash_Ledger_${fyFileLabel}.csv`,
                    ["Date", "Note", "Category", "Type", "Amount", "Description"],
                    (t) => [t.date, t.note, t.category, t.type, t.amount, t.description || ""]
                  )
                }
              >
                Export CSV
              </Button>
            )}
          </div>
          {cashTransactionsInFY.length === 0 ? (
            <TxnHistoryEmptyState
              message={`No bank/cash transactions recorded in ${fyLabel}${searchSuffix(searchQuery)}`}
            />
          ) : (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div className="mobile-table-wrap" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "transparent" }}>
                      <th style={{ ...th, paddingLeft: 16 }}>Note / Category</th>
                      <SortableTh
                        label="Date"
                        sortKey="date"
                        activeKey={sortState.cash_ledger?.key}
                        dir={sortState.cash_ledger?.dir}
                        onClick={(key) => toggleSort("cash_ledger", key)}
                      />
                      <th style={{ ...th, textAlign: "right" }}>Type</th>
                      <SortableTh
                        label="Amount"
                        sortKey="amount"
                        activeKey={sortState.cash_ledger?.key}
                        dir={sortState.cash_ledger?.dir}
                        onClick={(key) => toggleSort("cash_ledger", key)}
                      />
                      <th style={{ ...th, textAlign: "right" }}>Description</th>
                      <th style={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashTransactionsSorted.map((t: any) => {
                      const amount = Number(t.amount || 0);
                      const isCredit = t.type === "credit";
                      return (
                        <tr
                          key={t.id}
                          className="table-row-hover"
                          style={{
                            borderBottom: `1px solid ${THEME.line}`,
                          }}
                        >
                          <td style={{ ...td, paddingLeft: 16 }}>
                            <span style={{ fontWeight: 700, color: THEME.ink }}>
                              {t.note || "General Ledger"}
                            </span>
                            <span
                              style={{
                                fontSize: 9,
                                marginLeft: 6,
                                color: THEME.muted,
                                background: "var(--surface-2)",
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontWeight: 700,
                              }}
                            >
                              {t.category || "Other"}
                            </span>
                          </td>
                          <td
                            style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12 }}
                          >
                            {fmtDate(t.date)}
                          </td>
                          <td style={{ ...td, textAlign: "right" }}>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: 20,
                                fontSize: 10,
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                background: isCredit
                                  ? `color-mix(in srgb, ${THEME.sage} 10%, transparent)`
                                  : `color-mix(in srgb, ${THEME.rust} 10%, transparent)`,
                                color: isCredit ? THEME.sage : THEME.rust,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {isCredit ? "▲ Credit" : "▼ Debit"}
                            </span>
                          </td>
                          <td
                            style={{
                              ...td,
                              textAlign: "right",
                              color: isCredit ? THEME.sage : THEME.rust,
                              fontWeight: 800,
                              fontSize: 14,
                            }}
                          >
                            <Prv>
                              {isCredit ? "+" : "-"}
                              {fmtINRFull(amount)}
                            </Prv>
                          </td>
                          <td
                            style={{
                              ...td,
                              textAlign: "right",
                              color: THEME.muted,
                              fontSize: 12,
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={t.description || undefined}
                          >
                            {t.description || "—"}
                          </td>
                          <td style={{ ...td, paddingRight: 16 }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem("transactions", t.id)}
                              title="Delete"
                              aria-label="Delete transaction"
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: THEME.rust,
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "var(--surface-1)" }}>
                      <td colSpan={2} style={{ ...td, paddingLeft: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>
                          {
                            cashTransactionsInFY.filter(
                              (t: any) => t.type === "credit" && !isTransferCategory(t.category)
                            ).length
                          }{" "}
                          credits ·{" "}
                          {
                            cashTransactionsInFY.filter(
                              (t: any) => t.type === "debit" && !isTransferCategory(t.category)
                            ).length
                          }{" "}
                          debits
                          {hasTransfers && (
                            <span style={{ opacity: 0.7 }}>
                              {" "}
                              ·{" "}
                              {
                                cashTransactionsInFY.filter((t: any) =>
                                  isTransferCategory(t.category)
                                ).length
                              }{" "}
                              transfers (excluded)
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={td}></td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: THEME.sage }}>
                          <Prv>
                            +₹{totalCredits.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </Prv>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: THEME.rust }}>
                          <Prv>
                            -₹{totalDebits.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </Prv>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: cashNetFlow >= 0 ? THEME.sage : THEME.rust,
                            borderTop: `1px solid ${THEME.line}`,
                            paddingTop: 4,
                            marginTop: 4,
                          }}
                        >
                          <Prv>
                            Net {cashNetFlow >= 0 ? "+" : ""}₹
                            {Math.abs(cashNetFlow).toLocaleString("en-IN", {
                              maximumFractionDigits: 2,
                            })}
                          </Prv>
                        </div>
                      </td>
                      <td colSpan={2} style={td}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
