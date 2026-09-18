/* eslint-disable */
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
  Link2,
  Calendar,
  Building2,
  FileSpreadsheet,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";
import { SectionTitle } from "../ui/SectionTitle";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { StatCard } from "../ui/StatCard";
import { Badge } from "../ui/Badge";
import { Drawer } from "../ui/Drawer";
import { Money } from "../ui/Money";
import { ConfirmDialog } from "../ui/Feedback";
import { Prv } from "../../context/PrivacyContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { DataTable } from "../design-system/DataTable";
import { StockLogo, MFLogo, BankLogo } from "../ui/BrandLogos";

const cashTxnAccountLabel = (a: any): string => {
  if (!a) return "";
  const last4 = a.accountNumber ? `····${String(a.accountNumber).slice(-4)}` : "";
  const suffix = [a.type, last4].filter(Boolean).join(" ");
  return suffix ? `${a.bankName} – ${suffix}` : a.bankName;
};

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

const SectionHeader = ({
  icon: Icon,
  title,
  count,
  color = THEME.accent,
  subText,
}: {
  icon: any;
  title: string;
  count?: number;
  color?: string;
  subText?: React.ReactNode;
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          color,
          flexShrink: 0,
        }}
      >
        <Icon size={17} />
      </div>
      <span style={{ fontSize: 17, fontWeight: 800, color: THEME.ink, letterSpacing: "-0.015em" }}>
        {title}
      </span>
      {count !== undefined && count > 0 && (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "var(--radius-xs, 6px)",
            fontSize: 11,
            fontWeight: 800,
            background: `color-mix(in srgb, ${color} 10%, transparent)`,
            color,
            fontVariantNumeric: "tabular-nums",
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
  <Card style={{ padding: 48, textAlign: "center", background: "var(--surface-0)" }}>
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
      <Package size={32} color={THEME.muted} style={{ opacity: 0.35 }} />
    </div>
    <div style={{ fontSize: 14, color: THEME.muted, fontWeight: 500 }}>{message}</div>
  </Card>
);

type SortDir = "asc" | "desc";

const SoldTable = ({
  rows,
  type,
  removeItem,
  showToast,
  fmtDate,
  fyLabel,
  searchQuery,
  sortKey,
  sortDir,
  onSort,
  onInspect,
}: {
  rows: any[];
  type: "stock" | "mf";
  removeItem: (collection: string, id: string) => void;
  showToast?: (message: string, type?: string) => void;
  fmtDate: (d: string) => string;
  fyLabel: string;
  searchQuery: string;
  sortKey?: string;
  sortDir?: SortDir;
  onSort: (key: string) => void;
  onInspect?: (item: any, type: "stock_sold" | "mf_sold") => void;
}) => {
  const { run: deleteSaleRecord } = useAsyncAction(
    async (collection: string, id: string) => {
      await removeItem(collection, id);
    },
    {
      onError: (e: any) =>
        showToast?.(`Failed to delete sale record: ${e?.message || "Unknown error"}`, "error"),
    }
  );
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => void } | null>(
    null
  );
  const total = rows.reduce((s: number, r: any) => s + Number(r.profit || 0), 0);

  if (rows.length === 0)
    return (
      <TxnHistoryEmptyState
        message={`No ${type === "stock" ? "stock sales" : "MF redemptions"} recorded in ${fyLabel}${searchSuffix(searchQuery)}`}
      />
    );

  return (
    <>
      <DataTable
        columns={[
          {
            key: "company",
            header: type === "stock" ? "Company" : "Scheme",
            accessor: (s: any) => (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {type === "stock" ? (
                  <StockLogo yfSym={s.symbol} symbol={s.symbol} exchange={s.exchange} size={28} />
                ) : (
                  <MFLogo fundName={s.scheme} size={28} />
                )}
                <div>
                  <div style={{ fontWeight: 700, color: THEME.ink }}>
                    {type === "stock" ? s.symbol?.replace(/\.(NS|BO)$/i, "") : s.scheme}
                  </div>
                  {(type === "stock" || (type === "mf" && s.type)) && (
                    <span
                      style={{
                        fontSize: 9.5,
                        color: THEME.muted,
                        background: "var(--surface-2)",
                        padding: "1px 5px",
                        borderRadius: 4,
                        fontWeight: 700,
                      }}
                    >
                      {type === "stock" ? s.exchange || "NSE" : s.type}
                    </span>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "buyDate",
            header: "Buy Date",
            align: "right",
            accessor: (s: any) => (
              <span style={{ color: THEME.muted, fontSize: 12 }}>{fmtDate(s.buyDate)}</span>
            ),
          },
          {
            key: "buyPrice",
            header: type === "stock" ? "Buy Price" : "Buy NAV",
            align: "right",
            accessor: (s: any) => {
              const buyP = type === "stock" ? Number(s.buyPrice) : Number(s.buyNav);
              return (
                <span style={{ fontWeight: 600 }}>
                  <Prv>₹{buyP.toFixed(type === "mf" ? 4 : 2)}</Prv>
                </span>
              );
            },
          },
          {
            key: "qty",
            header: type === "stock" ? "Qty" : "Units",
            align: "right",
            accessor: (s: any) => (
              <span style={{ fontWeight: 700 }}>
                {type === "stock" ? s.qty : Number(s.units).toFixed(3)}
              </span>
            ),
          },
          {
            key: "date",
            header: "Sell Date",
            align: "right",
            sortable: true,
            accessor: (s: any) => (
              <span style={{ color: THEME.muted, fontSize: 12 }}>{fmtDate(s.sellDate)}</span>
            ),
          },
          {
            key: "sellPrice",
            header: type === "stock" ? "Sell Price" : "Sell NAV",
            align: "right",
            accessor: (s: any) => {
              const buyP = type === "stock" ? Number(s.buyPrice) : Number(s.buyNav);
              const sellP = type === "stock" ? Number(s.sellPrice) : Number(s.sellNav);
              return (
                <span style={{ fontWeight: 600, color: sellP >= buyP ? THEME.sage : THEME.rust }}>
                  <Prv>
                    ₹{sellP.toFixed(type === "mf" ? 4 : 2)} {sellP >= buyP ? "▲" : "▼"}
                  </Prv>
                </span>
              );
            },
          },
          {
            key: "amount",
            header: "Profit / Loss",
            align: "right",
            sortable: true,
            accessor: (s: any) => {
              const profit = Number(s.profit || 0);
              return (
                <span
                  style={{
                    color: profit >= 0 ? THEME.sage : THEME.rust,
                    fontWeight: 800,
                    fontSize: 13.5,
                  }}
                >
                  <Prv>
                    {profit >= 0 ? "+" : ""}₹
                    {Math.abs(profit).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </Prv>
                </span>
              );
            },
          },
          {
            key: "broker",
            header: "Broker",
            align: "right",
            accessor: (s: any) => (
              <span style={{ color: THEME.muted, fontSize: 12, fontWeight: 600 }}>
                {s.broker || "—"}
              </span>
            ),
          },
        ]}
        data={rows}
        hideSearch
        keyExtractor={(s: any) => s.id}
        sortKey={sortKey || null}
        sortDirection={sortDir || "asc"}
        onSortChange={(key: any) => onSort(key)}
        onRowClick={onInspect ? (s: any) => onInspect(s, type === "stock" ? "stock_sold" : "mf_sold") : undefined}
        rowAriaLabel={(s: any) =>
          `View details for ${type === "stock" ? s.symbol : s.scheme} sale`
        }
        actions={(s: any) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e: any) => {
              e.stopPropagation();
              const name =
                type === "stock"
                  ? s.symbol?.replace(/\.(NS|BO)$/i, "") || "this stock"
                  : s.scheme || "this fund";
              setConfirmDelete({
                message: `Delete this sale record for "${name}"? This cannot be undone.`,
                onConfirm: () => deleteSaleRecord(type === "stock" ? "stockSells" : "mfSells", s.id),
              });
            }}
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
        )}
        footer={
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
                fontSize: 14.5,
              }}
            >
              <Prv>
                {total >= 0 ? "+" : ""}₹
                {Math.abs(total).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </Prv>
            </td>
            <td colSpan={2} style={td}></td>
          </tr>
        }
      />
      {confirmDelete && (
        <ConfirmDialog
          message={confirmDelete.message}
          onConfirm={() => {
            confirmDelete.onConfirm();
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
};

export function TxnHistoryTab({ state, removeItem, marketData = {}, showToast }: any) {
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
  const [viewCashTxnId, setViewCashTxnId] = useState<string | null>(null);
  const [inspectedStock, setInspectedStock] = useState<any | null>(null);
  const [inspectedMF, setInspectedMF] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortState, setSortState] = useState<Record<string, { key: string; dir: SortDir }>>({});
  const [confirmDeleteTxn, setConfirmDeleteTxn] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const { run: deleteCashTxn } = useAsyncAction(
    async (id: string) => {
      await removeItem("transactions", id);
    },
    {
      onError: (e: any) =>
        showToast?.(`Failed to delete transaction: ${e?.message || "Unknown error"}`, "error"),
    }
  );

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
    const addFY = (dateStr: string) => {
      if (!dateStr) return;
      const d = dateStr.slice(0, 10);
      const y = Number(d.slice(0, 4));
      const m = Number(d.slice(5, 7));
      if (!y || !m) return;
      fySet.add(m >= 4 ? y : y - 1);
    };
    (state.stocks || []).forEach((s: any) => addFY(s.buyDate));
    (state.stockSells || []).forEach((s: any) => {
      addFY(s.sellDate);
      addFY(s.buyDate);
    });
    (state.mutualFunds || []).forEach((m: any) => addFY(m.buyDate));
    (state.mfSells || []).forEach((m: any) => {
      addFY(m.sellDate);
      addFY(m.buyDate);
    });
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

  const stocksBoughtInFY = useMemo(() => {
    const activeBuys = (state.stocks || [])
      .filter(
        (s: any) =>
          inFY(s.buyDate) &&
          (!txnDematId || s.dematId === txnDematId) &&
          matchesSearch(`${s.symbol} ${s.broker || ""}`)
      )
      .map((s: any) => ({
        ...s,
        avgPrice: s.avgPrice !== undefined ? Number(s.avgPrice) : Number(s.buyPrice || 0),
        isSold: false,
      }));

    const soldBuys = (state.stockSells || [])
      .filter(
        (s: any) =>
          inFY(s.buyDate) &&
          (!txnDematId || s.dematId === txnDematId) &&
          matchesSearch(`${s.symbol} ${s.broker || ""}`)
      )
      .map((s: any) => ({
        ...s,
        id: s.id ? `sold-buy-${s.id}` : `sold-buy-${Math.random()}`,
        avgPrice: s.buyPrice !== undefined ? Number(s.buyPrice) : Number(s.avgPrice || 0),
        isSold: true,
      }));

    return [...activeBuys, ...soldBuys].sort(
      (a: any, b: any) => new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()
    );
  }, [state.stocks, state.stockSells, txnDematId, inFY, matchesSearch]);

  const stocksSoldInFY = useMemo(
    () =>
      (state.stockSells || [])
        .filter(
          (s: any) =>
            inFY(s.sellDate) &&
            (!txnDematId || s.dematId === txnDematId) &&
            matchesSearch(`${s.symbol} ${s.broker || ""}`)
        )
        .sort((a: any, b: any) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()),
    [state.stockSells, txnDematId, inFY, matchesSearch]
  );

  const mfBoughtInFY = useMemo(() => {
    const activeBuys = (state.mutualFunds || [])
      .filter(
        (m: any) =>
          inFY(m.buyDate) &&
          matchesSearch(`${m.name || m.scheme} ${m.category || m.mfType || m.type || ""}`)
      )
      .map((m: any) => ({
        ...m,
        isSold: false,
      }));

    const soldBuys = (state.mfSells || [])
      .filter(
        (m: any) =>
          inFY(m.buyDate) &&
          matchesSearch(`${m.name || m.scheme} ${m.category || m.mfType || m.type || ""}`)
      )
      .map((m: any) => ({
        ...m,
        id: m.id ? `sold-buy-${m.id}` : `sold-buy-${Math.random()}`,
        name: m.scheme || m.name,
        scheme: m.scheme || m.name,
        category: m.category || m.mfType || m.type || "Equity",
        isSold: true,
      }));

    return [...activeBuys, ...soldBuys].sort(
      (a: any, b: any) => new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()
    );
  }, [state.mutualFunds, state.mfSells, inFY, matchesSearch]);

  const mfSoldInFY = useMemo(
    () =>
      (state.mfSells || [])
        .filter(
          (m: any) =>
            inFY(m.sellDate) &&
            matchesSearch(`${m.name || m.scheme} ${m.category || m.mfType || m.type || ""}`)
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
            matchesSearch(`${t.note || ""} ${t.category || ""} ${t.description || ""} ${t.type || ""}`)
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
      const inv = Number(s.qty) * Number(s.avgPrice);
      invested += inv;
      if (!s.isSold) {
        const curr = livePrice(s, marketData);
        if (curr) {
          pnl += Number(s.qty) * curr - inv;
          hasCurr = true;
        } else {
          unpriced++;
        }
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
      const inv = Number(m.units) * buyNav;
      invested += inv;
      if (!m.isSold) {
        const currNav = Number(m.currentNav || 0);
        if (currNav) {
          pnl += Number(m.units) * currNav - inv;
          hasCurr = true;
        } else {
          unpriced++;
        }
      }
    });
    return { invested, pnl, hasCurr, unpriced };
  }, [mfBoughtInFY]);

  const totalStocksInvested = stocksBoughtTotals.invested;
  const totalMFInvested = mfBoughtTotals.invested;

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
        amount: (m: any) =>
          Number(m.units) *
          (m.buyNav ? Number(m.buyNav) : m.invested && m.units ? Number(m.invested) / Number(m.units) : 0),
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

  // Consolidated Master Journal Stream (All assets chronologically interleaved)
  const unifiedJournalEntries = useMemo(() => {
    const list: any[] = [];

    // Stocks Bought
    stocksBoughtInFY.forEach((s: any) => {
      const amount = Number(s.qty) * Number(s.avgPrice);
      list.push({
        id: `uj-sb-${s.id}`,
        rawId: s.id,
        date: s.buyDate,
        assetClass: "stock",
        actionType: "Stock Buy",
        title: s.symbol?.replace(/\.(NS|BO)$/i, ""),
        subtitle: `${s.qty} shares @ ₹${Number(s.avgPrice).toFixed(2)} (${s.exchange || "NSE"})`,
        amount: amount,
        flowType: "outflow",
        accountLabel: s.broker || "Demat",
        status: s.isSold ? "Liquidated" : "Active Holding",
        sourceItem: s,
      });
    });

    // Stocks Sold
    stocksSoldInFY.forEach((s: any) => {
      const profit = Number(s.profit || 0);
      list.push({
        id: `uj-ss-${s.id}`,
        rawId: s.id,
        date: s.sellDate,
        assetClass: "stock",
        actionType: "Stock Sell",
        title: s.symbol?.replace(/\.(NS|BO)$/i, ""),
        subtitle: `${s.qty} shares sold @ ₹${Number(s.sellPrice).toFixed(2)} (Bought @ ₹${Number(s.buyPrice).toFixed(2)})`,
        amount: Number(s.qty) * Number(s.sellPrice || 0),
        pnl: profit,
        flowType: "inflow",
        accountLabel: s.broker || "Demat",
        status: "Realized",
        sourceItem: s,
      });
    });

    // Mutual Funds Bought
    mfBoughtInFY.forEach((m: any) => {
      const buyNav = m.buyNav
        ? Number(m.buyNav)
        : m.invested && m.units
          ? Number(m.invested) / Number(m.units)
          : 0;
      const amount = Number(m.units) * buyNav;
      list.push({
        id: `uj-mb-${m.id}`,
        rawId: m.id,
        date: m.buyDate,
        assetClass: "mf",
        actionType: "MF Buy",
        title: m.name || m.scheme,
        subtitle: `${Number(m.units).toFixed(3)} units @ NAV ₹${buyNav.toFixed(4)}`,
        amount: amount,
        flowType: "outflow",
        accountLabel: m.category || m.mfType || m.type || "Mutual Fund",
        status: m.isSold ? "Redeemed" : "Active Holding",
        sourceItem: m,
      });
    });

    // Mutual Funds Sold
    mfSoldInFY.forEach((m: any) => {
      const profit = Number(m.profit || 0);
      const units = Number(m.units || 0);
      const sellNav = Number(m.sellNav || 0);
      list.push({
        id: `uj-ms-${m.id}`,
        rawId: m.id,
        date: m.sellDate,
        assetClass: "mf",
        actionType: "MF Redeem",
        title: m.name || m.scheme,
        subtitle: `${units.toFixed(3)} units redeemed @ NAV ₹${sellNav.toFixed(4)}`,
        amount: units * sellNav,
        pnl: profit,
        flowType: "inflow",
        accountLabel: m.category || m.mfType || m.type || "Mutual Fund",
        status: "Realized",
        sourceItem: m,
      });
    });

    // Bank & Cash Transactions
    cashTransactionsInFY.forEach((t: any) => {
      const bank = state.bankAccounts?.find((b: any) => b.id === t.accountId);
      const isCredit = t.type === "credit";
      const isTransfer = isTransferCategory(t.category);
      list.push({
        id: `uj-ct-${t.id}`,
        rawId: t.id,
        date: t.date,
        assetClass: "cash",
        actionType: isTransfer ? "Transfer" : isCredit ? "Bank Credit" : "Bank Debit",
        title: t.note || (bank ? bank.bankName : "General Ledger"),
        subtitle: [t.category, t.description].filter(Boolean).join(" · "),
        amount: Number(t.amount || 0),
        flowType: isTransfer ? "transfer" : isCredit ? "inflow" : "outflow",
        accountLabel: bank ? cashTxnAccountLabel(bank) : "Cash/Bank",
        status: isTransfer ? "Internal Transfer" : isCredit ? "Inflow" : "Outflow",
        sourceItem: t,
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stocksBoughtInFY, stocksSoldInFY, mfBoughtInFY, mfSoldInFY, cashTransactionsInFY, state.bankAccounts]);

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
    all: unifiedJournalEntries.length,
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

  const exportUnifiedMasterLedger = () => {
    exportToCSV(
      unifiedJournalEntries,
      `Global_Ledger_Master_${fyFileLabel}.csv`,
      ["Date", "Asset Class", "Action Type", "Entity / Note", "Details", "Amount", "Flow Direction", "Account / Broker", "Status"],
      (row) => [
        row.date,
        row.assetClass,
        row.actionType,
        row.title,
        row.subtitle,
        row.amount,
        row.flowType,
        row.accountLabel,
        row.status,
      ]
    );
  };

  const handleInspect = (item: any, type: string) => {
    if (!item) return;
    if (type === "cash") {
      setViewCashTxnId(item.id || item.rawId);
    } else if (type === "stock" || type === "stock_sold") {
      setInspectedStock(item);
    } else if (type === "mf" || type === "mf_sold") {
      setInspectedMF(item);
    }
  };

  return (
    <div className="tab-content-enter">
      {/* Header & Title */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <SectionTitle sub="Unified multi-asset transaction accounting across capital equities, mutual funds, and liquidity bank accounts">
          Global Ledger
        </SectionTitle>

        {/* Global Export Hub */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 4 }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            onClick={exportUnifiedMasterLedger}
            title="Export complete master ledger for the selected period"
          >
            Export Master CSV
          </Button>
        </div>
      </div>

      {/* Control Bar: Search & FY Selector */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: "1 1 300px",
            position: "relative",
            alignItems: "center",
          }}
        >
          <Search
            size={16}
            color={THEME.muted}
            style={{ position: "absolute", left: 14, pointerEvents: "none" }}
          />
          <input
            type="text"
            aria-label="Search transactions"
            placeholder="Search symbols, notes, categories, schemes, brokers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: `10px ${searchQuery ? 38 : 14}px 10px 38px`,
              borderRadius: 12,
              border: `1.5px solid ${THEME.line}`,
              background: "var(--surface-0)",
              color: THEME.ink,
              fontSize: 13.5,
              boxShadow: "var(--shadow-sm)",
              outline: "none",
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

        {/* Period Selector */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--surface-0)",
            padding: "4px 14px",
            borderRadius: 12,
            border: `1px solid ${THEME.line}`,
            height: 42,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <Calendar size={14} color={THEME.muted} />
          <span
            style={{
              fontSize: 11,
              color: THEME.muted,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Period:
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

      {/* Hero Financial KPI Telemetry Dashboard */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Stocks Invested"
          value={`₹${totalStocksInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          numericValue={totalStocksInvested}
          formatValue={fmtINRFull}
          color={THEME.accent}
          icon={<BarChart3 />}
          sub={`${stocksBoughtInFY.length} purchase${stocksBoughtInFY.length === 1 ? "" : "s"} · ${fyLabel}`}
        />
        <StatCard
          label="MF Invested"
          value={`₹${totalMFInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          numericValue={totalMFInvested}
          formatValue={fmtINRFull}
          color={THEME.violet}
          icon={<Layers />}
          sub={`${mfBoughtInFY.length} SIP/lumpsum${mfBoughtInFY.length === 1 ? "" : "s"} · ${fyLabel}`}
        />
        <StatCard
          label="Realized P&L"
          value={`${totalRealizedPnl >= 0 ? "+" : ""}₹${Math.abs(totalRealizedPnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          numericValue={totalRealizedPnl}
          formatValue={(n) => `${n >= 0 ? "+" : ""}${fmtINRFull(Math.abs(n))}`}
          color={totalRealizedPnl >= 0 ? THEME.sage : THEME.rust}
          icon={totalRealizedPnl >= 0 ? <TrendingUp /> : <TrendingDown />}
          sub={`${stocksSoldInFY.length + mfSoldInFY.length} exits closed`}
          subColor={totalRealizedPnl >= 0 ? THEME.sage : THEME.rust}
        />
        <StatCard
          label="Cash Net Flow"
          value={`${cashNetFlow >= 0 ? "+" : ""}₹${Math.abs(cashNetFlow).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          numericValue={cashNetFlow}
          formatValue={(n) => `${n >= 0 ? "+" : ""}${fmtINRFull(Math.abs(n))}`}
          color={cashNetFlow >= 0 ? THEME.sage : THEME.rust}
          icon={<Coins />}
          sub={`+₹${(totalCredits / 1000).toFixed(0)}k in · -₹${(totalDebits / 1000).toFixed(0)}k out`}
          subColor={cashNetFlow >= 0 ? THEME.sage : THEME.rust}
        />
      </div>

      {/* Modern Asset Segment Navigation Tabs (Clean Lucide Icons, No Emojis) */}
      <div
        className="no-print"
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "nowrap",
          overflowX: "auto",
          marginBottom: 22,
          background: "var(--surface-0)",
          padding: "8px",
          borderRadius: 14,
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
              className={`demat-portfolio-pill ${active ? "active" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 10,
                border: "none",
                background: active
                  ? `color-mix(in srgb, ${THEME.accent} 15%, var(--surface-1))`
                  : "transparent",
                color: active ? THEME.accent : THEME.muted,
                fontWeight: active ? 800 : 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={15} style={{ color: active ? THEME.accent : "inherit" }} />
              <span>{s.label}</span>
              {count > 0 && (
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: "var(--radius-xs, 4px)",
                    fontSize: 10.5,
                    fontWeight: 800,
                    background: active
                      ? `color-mix(in srgb, ${THEME.accent} 25%, transparent)`
                      : "var(--surface-2)",
                    color: active ? THEME.accent : THEME.muted,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Demat Account Selector Filters */}
      {(state.demat || []).length > 1 &&
        activeSection !== "cash_ledger" &&
        activeSection !== "mf_bought" &&
        activeSection !== "mf_sold" && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 22,
              alignItems: "center",
              padding: "8px 14px",
              background: "var(--surface-1)",
              borderRadius: 12,
              border: `1px solid ${THEME.line}`,
            }}
          >
            <Building2 size={14} color={THEME.muted} />
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
              Demat Account:
            </span>
            <Button
              size="sm"
              variant={txnDematId === null ? "accent" : "secondary"}
              onClick={() => setTxnDematId(null)}
              style={{ height: 26, padding: "0 12px", fontSize: 11, borderRadius: 16 }}
            >
              All Demat Accounts
            </Button>
            {(state.demat || []).map((d: any) => (
              <Button
                key={d.id}
                size="sm"
                variant={txnDematId === d.id ? "accent" : "secondary"}
                onClick={() => setTxnDematId(d.id)}
                style={{ height: 26, padding: "0 12px", fontSize: 11, borderRadius: 16 }}
              >
                {d.broker || d.dpId || "Account"}
              </Button>
            ))}
          </div>
        )}

      {/* ── UNIFIED MASTER JOURNAL (Shown in "All Assets" Mode) ── */}
      {activeSection === "all" && (
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 14,
            }}
          >
            <SectionHeader
              icon={FileSpreadsheet}
              title="Unified Financial Journal"
              count={unifiedJournalEntries.length}
              color={THEME.accent}
              subText="Chronological multi-asset ledger uniting equity investments, mutual funds, and bank movements"
            />
          </div>

          {unifiedJournalEntries.length === 0 ? (
            <TxnHistoryEmptyState
              message={`No financial activity recorded in ${fyLabel}${searchSuffix(searchQuery)}`}
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: "date",
                  header: "Date",
                  sortable: true,
                  width: "115px",
                  accessor: (row: any) => (
                    <span style={{ color: THEME.muted, fontSize: 12, fontWeight: 600 }}>
                      {fmtDate(row.date)}
                    </span>
                  ),
                },
                {
                  key: "title",
                  header: "Entity / Narrative",
                  accessor: (row: any) => (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {row.assetClass === "stock" ? (
                        <StockLogo
                          yfSym={row.sourceItem?.symbol || row.title}
                          symbol={row.sourceItem?.symbol || row.title}
                          exchange={row.sourceItem?.exchange || "NSE"}
                          size={28}
                        />
                      ) : row.assetClass === "mf" ? (
                        <MFLogo fundName={row.title} size={28} />
                      ) : (
                        <BankLogo bankName={row.title} size={28} />
                      )}
                      <div>
                        <div style={{ fontWeight: 700, color: THEME.ink, fontSize: 13 }}>
                          {row.title}
                        </div>
                        {row.subtitle && (
                          <div
                            style={{
                              fontSize: 11,
                              color: THEME.muted,
                              fontWeight: 500,
                              maxWidth: 320,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "actionType",
                  header: "Type",
                  accessor: (row: any) => {
                    const isCredit = row.flowType === "inflow";
                    const isTransfer = row.flowType === "transfer";
                    const color = isTransfer
                      ? THEME.cyan
                      : isCredit
                        ? THEME.sage
                        : row.assetClass === "stock"
                          ? THEME.accent
                          : row.assetClass === "mf"
                            ? THEME.violet
                            : THEME.rust;
                    return (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 800,
                          background: `color-mix(in srgb, ${color} 12%, transparent)`,
                          color: color,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {isTransfer ? "Transfer" : isCredit ? "Credit / Inflow" : row.actionType}
                      </span>
                    );
                  },
                },
                {
                  key: "accountLabel",
                  header: "Account / Channel",
                  align: "right",
                  accessor: (row: any) => (
                    <span style={{ fontSize: 11.5, color: THEME.muted, fontWeight: 600 }}>
                      {row.accountLabel}
                    </span>
                  ),
                },
                {
                  key: "amount",
                  header: "Amount",
                  align: "right",
                  sortable: true,
                  accessor: (row: any) => {
                    const isCredit = row.flowType === "inflow";
                    const isTransfer = row.flowType === "transfer";
                    return (
                      <div style={{ textAlign: "right" }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: 13.5,
                            color: isTransfer
                              ? THEME.ink
                              : isCredit
                                ? THEME.sage
                                : THEME.ink,
                          }}
                        >
                          <Prv>
                            {isTransfer ? "" : isCredit ? "+" : "-"}₹
                            {Number(row.amount || 0).toLocaleString("en-IN", {
                              maximumFractionDigits: 0,
                            })}
                          </Prv>
                        </span>
                        {row.pnl !== undefined && (
                          <div
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              color: row.pnl >= 0 ? THEME.sage : THEME.rust,
                            }}
                          >
                            <Prv>
                              P&L {row.pnl >= 0 ? "+" : ""}₹
                              {Math.abs(row.pnl).toLocaleString("en-IN", {
                                maximumFractionDigits: 0,
                              })}
                            </Prv>
                          </div>
                        )}
                      </div>
                    );
                  },
                },
              ]}
              data={unifiedJournalEntries}
              hideSearch
              keyExtractor={(row: any) => row.id}
              onRowClick={(row: any) => handleInspect(row.sourceItem, row.assetClass)}
              rowAriaLabel={(row: any) => `Inspect ${row.title} transaction`}
            />
          )}
        </div>
      )}

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
                      const inv = Number(s.qty) * Number(s.avgPrice);
                      if (s.isSold) {
                        return [
                          s.symbol?.replace(/\.(NS|BO)$/i, ""),
                          s.exchange || "NSE",
                          s.qty,
                          s.buyDate,
                          s.avgPrice,
                          inv,
                          s.sellPrice ? `Sold @ ₹${Number(s.sellPrice).toFixed(2)}` : "Sold",
                          "Realized",
                        ];
                      }
                      const cp = livePrice(s, marketData);
                      return [
                        s.symbol?.replace(/\.(NS|BO)$/i, ""),
                        s.exchange || "NSE",
                        s.qty,
                        s.buyDate,
                        s.avgPrice,
                        inv,
                        cp || "",
                        cp ? (cp - Number(s.avgPrice)) * Number(s.qty) : "",
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
            <DataTable
              columns={[
                {
                  key: "company",
                  header: "Company",
                  accessor: (s: any) => (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <StockLogo yfSym={s.symbol} symbol={s.symbol} exchange={s.exchange} size={28} />
                      <div>
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
                        {s.isSold && (
                          <span
                            style={{
                              fontSize: 9,
                              marginLeft: 6,
                              color: THEME.muted,
                              background: "color-mix(in srgb, var(--surface-2) 80%, transparent)",
                              border: `1px solid ${THEME.line}`,
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontWeight: 700,
                            }}
                          >
                            Sold
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "qty",
                  header: "Qty",
                  align: "right",
                  accessor: (s: any) => <span style={{ fontWeight: 700 }}>{s.qty}</span>,
                },
                {
                  key: "date",
                  header: "Buy Date",
                  align: "right",
                  sortable: true,
                  accessor: (s: any) => (
                    <span style={{ color: THEME.muted, fontSize: 12 }}>{fmtDate(s.buyDate)}</span>
                  ),
                },
                {
                  key: "buyPrice",
                  header: "Buy Price",
                  align: "right",
                  accessor: (s: any) => (
                    <span style={{ fontWeight: 600 }}>
                      <Prv>₹{Number(s.avgPrice).toFixed(2)}</Prv>
                    </span>
                  ),
                },
                {
                  key: "amount",
                  header: "Amount",
                  align: "right",
                  sortable: true,
                  accessor: (s: any) => {
                    const inv = Number(s.qty) * Number(s.avgPrice);
                    return (
                      <span style={{ fontWeight: 800 }}>
                        <Prv>₹{inv.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Prv>
                      </span>
                    );
                  },
                },
                {
                  key: "currPrice",
                  header: "Curr Price",
                  align: "right",
                  accessor: (s: any) => {
                    if (s.isSold) {
                      return (
                        <span style={{ color: THEME.muted, fontSize: 12 }}>
                          {s.sellPrice ? <Prv>Sold @ ₹${Number(s.sellPrice).toFixed(2)}</Prv> : "Sold"}
                        </span>
                      );
                    }
                    const curr = livePrice(s, marketData);
                    return curr ? (
                      <span style={{ fontWeight: 600 }}>
                        <Prv>₹{curr.toFixed(2)}</Prv>
                      </span>
                    ) : (
                      "—"
                    );
                  },
                },
                {
                  key: "pnl",
                  header: "Unrealized P&L",
                  align: "right",
                  accessor: (s: any) => {
                    if (s.isSold) {
                      return <span style={{ color: THEME.muted, fontSize: 12 }}>Realized</span>;
                    }
                    const curr = livePrice(s, marketData);
                    const inv = Number(s.qty) * Number(s.avgPrice);
                    const val = Number(s.qty) * curr;
                    const pnl = val - inv;
                    return curr ? (
                      <span
                        style={{
                          color: pnl >= 0 ? THEME.sage : THEME.rust,
                          fontWeight: 800,
                        }}
                      >
                        <Prv>
                          {pnl >= 0 ? "+" : ""}₹
                          {Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </Prv>
                      </span>
                    ) : (
                      "—"
                    );
                  },
                },
              ]}
              data={stocksBoughtSorted}
              hideSearch
              keyExtractor={(s: any) => s.id}
              sortKey={sortState.stocks_bought?.key || null}
              sortDirection={sortState.stocks_bought?.dir || "asc"}
              onSortChange={(key: any) => toggleSort("stocks_bought", key)}
              onRowClick={(s: any) => handleInspect(s, "stock")}
              rowAriaLabel={(s: any) => `Inspect ${s.symbol} purchase details`}
              footer={
                <>
                  <tr style={{ background: "var(--surface-1)" }}>
                    <td
                      colSpan={4}
                      style={{ ...td, paddingLeft: 16, fontWeight: 800, color: THEME.ink }}
                    >
                      Total Invested
                    </td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 900, fontSize: 14.5 }}>
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
                        fontSize: 14.5,
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
                </>
              }
            />
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
                stocksSoldInFY.length > 0 ? (
                  <>
                    Net Realized:{" "}
                    <Prv>
                      {stocksRealizedPnl >= 0 ? "+" : ""}₹
                      {Math.abs(stocksRealizedPnl).toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </Prv>
                  </>
                ) : undefined
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
            showToast={showToast}
            fmtDate={fmtDate}
            fyLabel={fyLabel}
            searchQuery={searchQuery}
            sortKey={sortState.stocks_sold?.key}
            sortDir={sortState.stocks_sold?.dir}
            onSort={(key) => toggleSort("stocks_sold", key)}
            onInspect={(item) => handleInspect(item, "stock_sold")}
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
                    (m) => {
                      const buyNav = m.buyNav
                        ? Number(m.buyNav)
                        : m.invested && m.units
                          ? Number(m.invested) / Number(m.units)
                          : 0;
                      const inv = Number(m.units) * buyNav;
                      if (m.isSold) {
                        return [
                          m.name || m.scheme,
                          m.category || m.mfType || m.type || "Equity",
                          m.units,
                          m.buyDate,
                          buyNav,
                          inv,
                          m.sellNav ? `Redeemed @ ₹${Number(m.sellNav).toFixed(4)}` : "Redeemed",
                          "Realized",
                        ];
                      }
                      const currNav = Number(m.currentNav || 0);
                      return [
                        m.name || m.scheme,
                        m.category || m.mfType || m.type || "Equity",
                        m.units,
                        m.buyDate,
                        buyNav,
                        inv,
                        currNav || "",
                        currNav ? (currNav - buyNav) * Number(m.units) : "",
                      ];
                    }
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
            <DataTable
              columns={[
                {
                  key: "scheme",
                  header: "Scheme",
                  accessor: (m: any) => (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <MFLogo fundName={m.name || m.scheme} size={28} />
                      <div>
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
                        {m.isSold && (
                          <span
                            style={{
                              fontSize: 9,
                              marginLeft: 6,
                              color: THEME.muted,
                              background: "color-mix(in srgb, var(--surface-2) 80%, transparent)",
                              border: `1px solid ${THEME.line}`,
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontWeight: 700,
                            }}
                          >
                            Redeemed
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "units",
                  header: "Units",
                  align: "right",
                  accessor: (m: any) => (
                    <span style={{ fontWeight: 700 }}>{Number(m.units).toFixed(3)}</span>
                  ),
                },
                {
                  key: "date",
                  header: "Buy Date",
                  align: "right",
                  sortable: true,
                  accessor: (m: any) => (
                    <span style={{ color: THEME.muted, fontSize: 12 }}>{fmtDate(m.buyDate)}</span>
                  ),
                },
                {
                  key: "buyNav",
                  header: "Buy NAV",
                  align: "right",
                  accessor: (m: any) => {
                    const buyNav = m.buyNav
                      ? Number(m.buyNav)
                      : m.invested && m.units
                        ? Number(m.invested) / Number(m.units)
                        : 0;
                    return (
                      <span style={{ fontWeight: 600 }}>
                        {buyNav ? <Prv>₹{buyNav.toFixed(4)}</Prv> : "—"}
                      </span>
                    );
                  },
                },
                {
                  key: "amount",
                  header: "Amount",
                  align: "right",
                  sortable: true,
                  accessor: (m: any) => {
                    const buyNav = m.buyNav
                      ? Number(m.buyNav)
                      : m.invested && m.units
                        ? Number(m.invested) / Number(m.units)
                        : 0;
                    const inv = Number(m.units) * buyNav;
                    return (
                      <span style={{ fontWeight: 800 }}>
                        <Prv>₹{inv.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Prv>
                      </span>
                    );
                  },
                },
                {
                  key: "currNav",
                  header: "Curr NAV",
                  align: "right",
                  accessor: (m: any) => {
                    if (m.isSold) {
                      return (
                        <span style={{ color: THEME.muted, fontSize: 12 }}>
                          {m.sellNav ? (
                            <Prv>Redeemed @ ₹{Number(m.sellNav).toFixed(4)}</Prv>
                          ) : (
                            "Redeemed"
                          )}
                        </span>
                      );
                    }
                    const currNav = Number(m.currentNav || 0);
                    return (
                      <span style={{ fontWeight: 600 }}>
                        {currNav ? <Prv>₹{currNav.toFixed(4)}</Prv> : "—"}
                      </span>
                    );
                  },
                },
                {
                  key: "pnl",
                  header: "Unrealized P&L",
                  align: "right",
                  accessor: (m: any) => {
                    if (m.isSold) {
                      return <span style={{ color: THEME.muted, fontSize: 12 }}>Realized</span>;
                    }
                    const buyNav = m.buyNav
                      ? Number(m.buyNav)
                      : m.invested && m.units
                        ? Number(m.invested) / Number(m.units)
                        : 0;
                    const currNav = Number(m.currentNav || 0);
                    const inv = Number(m.units) * buyNav;
                    const val = Number(m.units) * currNav;
                    const pnl = val - inv;
                    return currNav ? (
                      <span
                        style={{
                          color: pnl >= 0 ? THEME.sage : THEME.rust,
                          fontWeight: 800,
                        }}
                      >
                        <Prv>
                          {pnl >= 0 ? "+" : ""}₹
                          {Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </Prv>
                      </span>
                    ) : (
                      "—"
                    );
                  },
                },
              ]}
              data={mfBoughtSorted}
              hideSearch
              keyExtractor={(m: any) => m.id}
              sortKey={sortState.mf_bought?.key || null}
              sortDirection={sortState.mf_bought?.dir || "asc"}
              onSortChange={(key: any) => toggleSort("mf_bought", key)}
              onRowClick={(m: any) => handleInspect(m, "mf")}
              rowAriaLabel={(m: any) => `Inspect ${m.name || m.scheme} investment details`}
              footer={
                <>
                  <tr style={{ background: "var(--surface-1)" }}>
                    <td
                      colSpan={4}
                      style={{ ...td, paddingLeft: 16, fontWeight: 800, color: THEME.ink }}
                    >
                      Total Invested
                    </td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 900, fontSize: 14.5 }}>
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
                        fontSize: 14.5,
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
                </>
              }
            />
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
                mfSoldInFY.length > 0 ? (
                  <>
                    Net Realized:{" "}
                    <Prv>
                      {mfRealizedPnl >= 0 ? "+" : ""}₹
                      {Math.abs(mfRealizedPnl).toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </Prv>
                  </>
                ) : undefined
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
            showToast={showToast}
            fmtDate={fmtDate}
            fyLabel={fyLabel}
            searchQuery={searchQuery}
            sortKey={sortState.mf_sold?.key}
            sortDir={sortState.mf_sold?.dir}
            onSort={(key) => toggleSort("mf_sold", key)}
            onInspect={(item) => handleInspect(item, "mf_sold")}
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
                cashTransactionsInFY.length > 0 ? (
                  <>
                    Inflow +<Money value={totalCredits} variant="full" /> · Outflow{" "}
                    -<Money value={totalDebits} variant="full" />
                    {hasTransfers ? " (excl. self-transfers)" : ""}
                  </>
                ) : undefined
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
            <DataTable
              columns={[
                {
                  key: "note",
                  header: "Note / Category",
                  accessor: (t: any) => {
                    const bank = state.bankAccounts?.find((b: any) => b.id === t.accountId);
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <BankLogo bankName={bank?.bankName || t.note || "Cash"} size={26} />
                        <div>
                          <div>
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
                          </div>
                          {bank && (
                            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>
                              {cashTxnAccountLabel(bank)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  },
                },
                {
                  key: "date",
                  header: "Date",
                  align: "right",
                  sortable: true,
                  accessor: (t: any) => (
                    <span style={{ color: THEME.muted, fontSize: 12 }}>{fmtDate(t.date)}</span>
                  ),
                },
                {
                  key: "type",
                  header: "Type",
                  align: "right",
                  accessor: (t: any) => {
                    const isCredit = t.type === "credit";
                    return (
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "var(--radius-xs, 6px)",
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
                    );
                  },
                },
                {
                  key: "amount",
                  header: "Amount",
                  align: "right",
                  sortable: true,
                  accessor: (t: any) => {
                    const amount = Number(t.amount || 0);
                    const isCredit = t.type === "credit";
                    return (
                      <span
                        style={{
                          color: isCredit ? THEME.sage : THEME.rust,
                          fontWeight: 800,
                          fontSize: 14,
                        }}
                      >
                        {isCredit ? "+" : "-"}
                        <Money value={amount} variant="full" />
                      </span>
                    );
                  },
                },
                {
                  key: "description",
                  header: "Description",
                  align: "right",
                  accessor: (t: any) => (
                    <span
                      style={{
                        color: THEME.muted,
                        fontSize: 12,
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "inline-block",
                      }}
                      title={t.description || undefined}
                    >
                      {t.description || "—"}
                    </span>
                  ),
                },
              ]}
              data={cashTransactionsSorted}
              hideSearch
              keyExtractor={(t: any) => t.id}
              onRowClick={(t: any) => setViewCashTxnId(t.id)}
              rowAriaLabel={(t: any) =>
                `View details for ${t.note || "transaction"} on ${fmtDate(t.date)}`
              }
              sortKey={sortState.cash_ledger?.key || null}
              sortDirection={sortState.cash_ledger?.dir || "asc"}
              onSortChange={(key: any) => toggleSort("cash_ledger", key)}
              actions={(t: any) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e: any) => {
                    e.stopPropagation();
                    setConfirmDeleteTxn({
                      message: `Delete this transaction${t.note ? ` ("${t.note}")` : ""}? This cannot be undone.`,
                      onConfirm: () => deleteCashTxn(t.id),
                    });
                  }}
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
              )}
              footer={
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
                            cashTransactionsInFY.filter((t: any) => isTransferCategory(t.category))
                              .length
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
              }
            />
          )}
        </div>
      )}

      {/* ── DETAIL DRAWER: CASH & BANK TRANSACTION ── */}
      {viewCashTxnId &&
        (() => {
          const t = cashTransactionsInFY.find((tx: any) => tx.id === viewCashTxnId);
          if (!t) return null;
          const bank = (state.bankAccounts || []).find((b: any) => b.id === t.accountId);
          const isCredit = t.type === "credit";
          const row = (label: string, value: React.ReactNode) =>
            value ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "12px 0",
                  borderBottom: `1px solid ${THEME.line}`,
                }}
              >
                <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>{label}</span>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, textAlign: "right" }}
                >
                  {value}
                </span>
              </div>
            ) : null;
          return (
            <Drawer title="Bank Transaction Details" onClose={() => setViewCashTxnId(null)}>
              <div
                style={{
                  textAlign: "center",
                  padding: "8px 0 20px",
                  borderBottom: `1px solid ${THEME.line}`,
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 30,
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    fontVariantNumeric: "tabular-nums",
                    color: isCredit ? THEME.sage : THEME.rust,
                  }}
                >
                  {isCredit ? "+" : "-"}
                  <Money value={t.amount} variant="exact" />
                </div>
                {(t.category === "Transfer" || t.linkedType) && (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      justifyContent: "center",
                      marginTop: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    {t.category === "Transfer" && <Badge variant="accent">Internal Transfer</Badge>}
                    {t.linkedType && (
                      <Badge
                        variant="accent"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <Link2 size={10} /> Linked
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              {row("Note / Label", t.note)}
              {row("Date", fmtDate(t.date))}
              {row("Category", t.category)}
              {row(
                "Account",
                bank ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <BankLogo bankName={bank.bankName} size={18} />
                    {cashTxnAccountLabel(bank)}
                  </span>
                ) : null
              )}
              {row("Narration", t.narration)}
              {row("Description", t.description)}
              {row("Reference No.", t.referenceNumber)}
              <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                <Button
                  variant="secondary"
                  style={{ flex: 1, color: THEME.rust }}
                  onClick={() => {
                    setConfirmDeleteTxn({
                      message: `Delete this transaction${t.note ? ` ("${t.note}")` : ""}? This cannot be undone.`,
                      onConfirm: () => {
                        deleteCashTxn(t.id);
                        setViewCashTxnId(null);
                      },
                    });
                  }}
                >
                  Delete Transaction
                </Button>
              </div>
            </Drawer>
          );
        })()}

      {/* ── DETAIL DRAWER: STOCK TRANSACTION ── */}
      {inspectedStock &&
        (() => {
          const s = inspectedStock;
          const isSold = Boolean(s.sellDate || s.isSold);
          const cp = livePrice(s, marketData);
          const buyPrice = Number(s.buyPrice || s.avgPrice || 0);
          const sellPrice = Number(s.sellPrice || 0);
          const qty = Number(s.qty || 0);
          const invested = qty * buyPrice;
          const currentOrRealizedVal = isSold ? qty * sellPrice : cp ? qty * cp : 0;
          const profit = isSold ? Number(s.profit || currentOrRealizedVal - invested) : currentOrRealizedVal - invested;
          const profitPct = invested > 0 ? (profit / invested) * 100 : 0;

          const row = (label: string, value: React.ReactNode) =>
            value ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "12px 0",
                  borderBottom: `1px solid ${THEME.line}`,
                }}
              >
                <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>{label}</span>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, textAlign: "right" }}
                >
                  {value}
                </span>
              </div>
            ) : null;

          return (
            <Drawer title="Stock Holding Details" onClose={() => setInspectedStock(null)}>
              <div
                style={{
                  textAlign: "center",
                  padding: "8px 0 20px",
                  borderBottom: `1px solid ${THEME.line}`,
                  marginBottom: 4,
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <StockLogo yfSym={s.symbol} symbol={s.symbol} exchange={s.exchange} size={44} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: THEME.ink }}>
                  {s.symbol?.replace(/\.(NS|BO)$/i, "")}
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  {s.exchange || "NSE"} · {isSold ? "Realized Sale" : "Active Holding"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 26,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                    color: profit >= 0 ? THEME.sage : THEME.rust,
                    marginTop: 10,
                  }}
                >
                  <Prv>
                    {profit >= 0 ? "+" : ""}₹
                    {Math.abs(profit).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    {" "}
                    <span style={{ fontSize: 15, fontWeight: 600 }}>
                      ({profit >= 0 ? "+" : ""}{profitPct.toFixed(2)}%)
                    </span>
                  </Prv>
                </div>
              </div>
              {row("Quantity", `${qty} shares`)}
              {row("Buy Date", fmtDate(s.buyDate))}
              {row("Buy Price", `₹${buyPrice.toFixed(2)}`)}
              {row("Total Invested", `₹${invested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`)}
              {isSold && row("Sell Date", fmtDate(s.sellDate))}
              {isSold && row("Sell Price", `₹${sellPrice.toFixed(2)}`)}
              {!isSold && cp > 0 && row("Current Live Price", `₹${cp.toFixed(2)}`)}
              {row("Broker / Demat", s.broker || "Demat")}
              {row(
                "Tax Classification",
                s.buyDate ? (
                  <Badge variant="accent">
                    {(() => {
                      const endD = isSold && s.sellDate ? new Date(s.sellDate) : new Date();
                      const startD = new Date(s.buyDate);
                      const diffDays = Math.floor((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
                      return diffDays >= 365 ? `LTCG (${diffDays} days)` : `STCG (${diffDays} days)`;
                    })()}
                  </Badge>
                ) : null
              )}
            </Drawer>
          );
        })()}

      {/* ── DETAIL DRAWER: MUTUAL FUND TRANSACTION ── */}
      {inspectedMF &&
        (() => {
          const m = inspectedMF;
          const isSold = Boolean(m.sellDate || m.isSold);
          const buyNav = m.buyNav
            ? Number(m.buyNav)
            : m.invested && m.units
              ? Number(m.invested) / Number(m.units)
              : 0;
          const sellNav = Number(m.sellNav || 0);
          const currNav = Number(m.currentNav || 0);
          const units = Number(m.units || 0);
          const invested = units * buyNav;
          const currentOrRealizedVal = isSold ? units * sellNav : currNav ? units * currNav : 0;
          const profit = isSold ? Number(m.profit || currentOrRealizedVal - invested) : currentOrRealizedVal - invested;
          const profitPct = invested > 0 ? (profit / invested) * 100 : 0;

          const row = (label: string, value: React.ReactNode) =>
            value ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "12px 0",
                  borderBottom: `1px solid ${THEME.line}`,
                }}
              >
                <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>{label}</span>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, textAlign: "right" }}
                >
                  {value}
                </span>
              </div>
            ) : null;

          return (
            <Drawer title="Mutual Fund Holding Details" onClose={() => setInspectedMF(null)}>
              <div
                style={{
                  textAlign: "center",
                  padding: "8px 0 20px",
                  borderBottom: `1px solid ${THEME.line}`,
                  marginBottom: 4,
                }}
              >
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <MFLogo fundName={m.name || m.scheme} size={44} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink }}>
                  {m.name || m.scheme}
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  {m.category || m.mfType || m.type || "Equity"} · {isSold ? "Redeemed" : "Active Holding"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 26,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                    color: profit >= 0 ? THEME.sage : THEME.rust,
                    marginTop: 10,
                  }}
                >
                  <Prv>
                    {profit >= 0 ? "+" : ""}₹
                    {Math.abs(profit).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    {" "}
                    <span style={{ fontSize: 15, fontWeight: 600 }}>
                      ({profit >= 0 ? "+" : ""}{profitPct.toFixed(2)}%)
                    </span>
                  </Prv>
                </div>
              </div>
              {row("Units", `${units.toFixed(3)} units`)}
              {row("Buy Date", fmtDate(m.buyDate))}
              {row("Buy NAV", `₹${buyNav.toFixed(4)}`)}
              {row("Total Invested", `₹${invested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`)}
              {isSold && row("Redemption Date", fmtDate(m.sellDate))}
              {isSold && row("Redemption NAV", `₹${sellNav.toFixed(4)}`)}
              {!isSold && currNav > 0 && row("Current NAV", `₹${currNav.toFixed(4)}`)}
              {row("Category / Type", m.category || m.mfType || m.type || "Mutual Fund")}
              {row("Folio / Broker", m.folioNumber || m.broker || "Direct")}
            </Drawer>
          );
        })()}

      {/* Confirmation Dialog */}
      {confirmDeleteTxn && (
        <ConfirmDialog
          message={confirmDeleteTxn.message}
          onConfirm={() => {
            confirmDeleteTxn.onConfirm();
            setConfirmDeleteTxn(null);
          }}
          onCancel={() => setConfirmDeleteTxn(null)}
        />
      )}
    </div>
  );
}
