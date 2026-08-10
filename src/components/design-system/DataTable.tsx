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
  emptyState?: React.ReactNode;
  actions?: (row: T) => React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = "Search records...",
  hideSearch = false,
  keyExtractor,
  onRowClick,
  emptyState,
  actions,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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

  // Sorting
  const sortedData = React.useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const res = aVal < bVal ? -1 : 1;
      return sortDirection === "asc" ? res : -res;
    });
  }, [filteredData, sortKey, sortDirection]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortKey(null);
        setSortDirection("asc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
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
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
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
                      <span style={{ color: sortKey === col.key ? "var(--t-accent)" : "inherit", opacity: 0.7 }}>
                        {sortKey === col.key ? (
                          sortDirection === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        ) : (
                          <ArrowUpDown size={11} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th style={{ padding: "10px 16px", fontSize: "11px", textTransform: "uppercase", textAlign: "right", color: "var(--t-muted)" }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
              <tr
                key={keyExtractor(row, index)}
                onClick={() => onRowClick && onRowClick(row)}
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
                      fontFamily: col.isNumeric ? "var(--font-mono, monospace)" : "inherit",
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
            ))}
          </tbody>
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
