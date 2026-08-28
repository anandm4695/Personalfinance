import React, { useState } from "react";
import { Search, ArrowUpDown, ChevronUp, ChevronDown, Filter } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  accessor?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  isNumeric?: boolean;
  /** Groups this column under a different sort identity than `key` — for two
      display columns (e.g. Debit/Credit) that both sort by one underlying
      field and should show the sort indicator together. Defaults to `key`. */
  sortGroup?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  /** Hide the built-in search bar — use when the page already has its own search
      driving `data` (e.g. a shared search box that also filters a calendar or
      grouped view), so the table doesn't grow a second, redundant search input. */
  hideSearch?: boolean;
  keyExtractor: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
  /** Accessible name for a clickable row — announced by screen readers and
      shown as the row's title. Only meaningful alongside onRowClick. */
  rowAriaLabel?: (row: T) => string;
  emptyState?: React.ReactNode;
  actions?: (row: T) => React.ReactNode;
  /** Escape hatch for a row that needs a structurally different layout than
      the normal one-<td>-per-column rendering — e.g. an inline-edit form
      merging columns with colSpan. Return a complete `<tr key=...>` element
      to replace the normal row, or null/undefined to render normally. */
  renderRow?: (row: T, index: number) => React.ReactNode | null | undefined;
  /** Rendered inside a <tfoot> below the body — e.g. column totals. */
  footer?: React.ReactNode;
  /** Controlled sort: when both are provided, the table displays this sort
      state instead of managing its own, and a sortable header click calls
      onSortChange(col.sortGroup ?? col.key) instead of sorting internally.
      Use when sorting has to happen outside the table — most commonly
      because the caller paginates its own already-sorted data, and sorting
      only the current page (what internal sort would do) would be wrong. */
  sortKey?: string | null;
  sortDirection?: "asc" | "desc";
  onSortChange?: (key: string) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = "Search records...",
  hideSearch = false,
  keyExtractor,
  onRowClick,
  onRowDoubleClick,
  rowAriaLabel,
  emptyState,
  actions,
  renderRow,
  footer,
  sortKey: controlledSortKey,
  sortDirection: controlledSortDirection,
  onSortChange,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [internalSortKey, setInternalSortKey] = useState<string | null>(null);
  const [internalSortDirection, setInternalSortDirection] = useState<"asc" | "desc">("asc");

  const isControlledSort = onSortChange !== undefined;
  const effectiveSortKey = isControlledSort ? (controlledSortKey ?? null) : internalSortKey;
  const effectiveSortDirection = isControlledSort ? (controlledSortDirection ?? "asc") : internalSortDirection;

  // Filtering — a no-op when hideSearch is set, since `data` is assumed
  // pre-filtered by the caller's own search in that case.
  const filteredData = React.useMemo(() => {
    if (hideSearch || !searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some(
        (val) => val !== null && val !== undefined && String(val).toLowerCase().includes(q)
      )
    );
  }, [data, searchQuery, hideSearch]);

  // Sorting — skipped entirely under controlled sort, since the caller has
  // already sorted `data` (typically before its own pagination slice, which
  // sorting only the current page here would silently break).
  const sortedData = React.useMemo(() => {
    if (isControlledSort || !internalSortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[internalSortKey];
      const bVal = b[internalSortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const res = aVal < bVal ? -1 : 1;
      return internalSortDirection === "asc" ? res : -res;
    });
  }, [filteredData, internalSortKey, internalSortDirection, isControlledSort]);

  const handleSort = (col: Column<T>) => {
    if (!col.sortable) return;
    const groupKey = col.sortGroup || col.key;
    if (isControlledSort) {
      onSortChange!(groupKey);
      return;
    }
    if (internalSortKey === groupKey) {
      if (internalSortDirection === "asc") {
        setInternalSortDirection("desc");
      } else {
        setInternalSortKey(null);
        setInternalSortDirection("asc");
      }
    } else {
      setInternalSortKey(groupKey);
      setInternalSortDirection("asc");
    }
  };

  return (
    <div
      style={{
        background: "var(--surface-0, #121215)",
        border: "1px solid var(--t-line, rgba(255, 255, 255, 0.08))",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "var(--shadow-card, 0 4px 20px rgba(0, 0, 0, 0.4))",
      }}
    >
      {/* Table Filter & Search Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--t-line, rgba(255, 255, 255, 0.08))",
          display: "flex",
          alignItems: "center",
          justifyContent: hideSearch ? "flex-end" : "space-between",
          gap: "12px",
        }}
      >
        {!hideSearch && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--t-line, rgba(255, 255, 255, 0.08))",
              borderRadius: "8px",
              padding: "6px 12px",
              maxWidth: "320px",
              width: "100%",
            }}
          >
            <Search size={14} style={{ color: "var(--t-muted, #71717a)" }} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "13px",
                color: "var(--t-ink, #f4f4f5)",
                width: "100%",
              }}
            />
          </div>
        )}

        <div style={{ fontSize: "12px", color: "var(--t-muted, #71717a)", fontWeight: 500, flexShrink: 0 }}>
          {sortedData.length} {sortedData.length === 1 ? "entry" : "entries"}
        </div>
      </div>

      {/* Responsive Table Container */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                borderBottom: "1px solid var(--t-line, rgba(255, 255, 255, 0.08))",
              }}
            >
              {columns.map((col) => {
                const groupKey = col.sortGroup || col.key;
                const isActiveSort = col.sortable && effectiveSortKey === groupKey;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col)}
                    tabIndex={col.sortable ? 0 : undefined}
                    onKeyDown={
                      col.sortable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSort(col);
                            }
                          }
                        : undefined
                    }
                    aria-sort={
                      col.sortable
                        ? isActiveSort
                          ? effectiveSortDirection === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                        : undefined
                    }
                    style={{
                      padding: "10px 16px",
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--t-muted, #94a3b8)",
                      textAlign: col.align || (col.isNumeric ? "right" : "left"),
                      width: col.width,
                      cursor: col.sortable ? "pointer" : "default",
                      userSelect: "none",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        justifyContent: col.align === "right" || col.isNumeric ? "flex-end" : "flex-start",
                      }}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span style={{ color: isActiveSort ? "var(--t-accent)" : "inherit", opacity: 0.7 }}>
                          {isActiveSort ? (
                            effectiveSortDirection === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          ) : (
                            <ArrowUpDown size={11} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
              {actions && (
                <th style={{ padding: "10px 16px", fontSize: "11px", textTransform: "uppercase", textAlign: "right", color: "var(--t-muted)" }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => {
              const custom = renderRow?.(row, index);
              if (custom) return custom;
              return (
                <tr
                  key={keyExtractor(row, index)}
                  onClick={() => onRowClick && onRowClick(row)}
                  onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  aria-label={rowAriaLabel ? rowAriaLabel(row) : undefined}
                  style={{
                    borderBottom: "1px solid var(--t-line, rgba(255, 255, 255, 0.04))",
                    cursor: onRowClick ? "pointer" : "default",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                        color: "var(--t-ink, #f4f4f5)",
                        textAlign: col.align || (col.isNumeric ? "right" : "left"),
                        fontVariantNumeric: col.isNumeric ? "tabular-nums" : "normal",
                        fontFamily: "inherit",
                      }}
                    >
                      {col.accessor ? col.accessor(row) : row[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      {actions(row)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {footer && <tfoot>{footer}</tfoot>}
        </table>

        {sortedData.length === 0 && (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--t-muted, #71717a)" }}>
            {emptyState || <p style={{ fontSize: "14px", margin: 0 }}>No records matching your search.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
