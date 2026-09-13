import React from "react";
import {
  Home,
  TrendingUp,
  Clock,
  CheckCircle,
  IndianRupee,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Milestone,
  PieChart as PieChartIcon,
  Building,
  Layers,
  Sparkles,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { StatCard } from "../ui/StatCard";
import { Money } from "../ui/Money";

interface RealEstateOverviewProps {
  stats: {
    portfolioValue: number;
    totalInvested: number;
    totalPaid: number;
    outstanding: number;
    appreciation: number;
    appreciationPct: number;
    totalAreaSqft: number;
    avgRatePerSqft: number;
    activeCount: number;
    ucCount: number;
    soldCount: number;
  };
  valueView: "share" | "full";
  setValueView: (v: "share" | "full") => void;
  viewMode: "cards" | "table" | "timeline" | "analytics";
  setViewMode: (v: "cards" | "table" | "timeline" | "analytics") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  typeFilter: string;
  setTypeFilter: (t: string) => void;
  totalProperties: number;
}

export const RealEstateOverview: React.FC<RealEstateOverviewProps> = ({
  stats,
  valueView,
  setValueView,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  totalProperties,
}) => {
  return (
    <div style={{ marginBottom: 24 }}>
      {/* ── Top Share Toggle Bar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: THEME.muted,
            }}
          >
            Portfolio Scope:
          </span>
          <div className="demat-portfolio-bar no-scrollbar" style={{ marginBottom: 0 }}>
            {(
              [
                { key: "share", label: "My Net Share" },
                { key: "full", label: "Full Property Value" },
              ] as const
            ).map((opt) => {
              const active = valueView === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setValueView(opt.key)}
                  className={`demat-portfolio-pill ${active ? "active" : ""}`}
                  aria-pressed={active}
                  title={
                    opt.key === "share"
                      ? "Shows only your ownership % stake in each property (matches Net Worth & Dashboard)"
                      : "Shows each property's 100% total value regardless of co-ownership split"
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {stats.totalAreaSqft > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 12,
              fontWeight: 600,
              color: THEME.muted,
              background: "var(--surface-0)",
              padding: "4px 12px",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Layers size={13} color={THEME.accent} />
              {stats.totalAreaSqft.toLocaleString("en-IN")} sq.ft.
            </span>
            {stats.avgRatePerSqft > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, color: THEME.sage }}>
                <Sparkles size={13} />
                Avg ₹{Math.round(stats.avgRatePerSqft).toLocaleString("en-IN")}/sq.ft
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Hero Portfolio Value Card ── */}
      <Card
        variant="base"
        style={{
          marginBottom: 20,
          padding: "clamp(22px, 3.5vw, 32px)",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 94%, var(--t-accent) 6%), var(--surface-0))",
          border: `1px solid ${THEME.line}`,
          borderTop: `4px solid ${THEME.accent}`,
          borderRadius: "var(--radius-xl)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: THEME.muted,
                marginBottom: 6,
              }}
            >
              <Home size={15} color={THEME.accent} />
              Real Estate Asset Valuation {valueView === "share" ? "(Tracked Stake)" : "(100% Basis)"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(34px, 4.5vw, 52px)",
                fontWeight: 900,
                color: THEME.ink,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <Money value={stats.portfolioValue} variant="full" />
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, marginTop: 6, fontWeight: 600 }}>
              <span
                style={{
                  color: stats.appreciation >= 0 ? THEME.sage : THEME.rust,
                  fontWeight: 800,
                }}
              >
                {stats.appreciation >= 0 ? "▲ Up " : "▼ Down "}
                <Money value={Math.abs(stats.appreciation)} variant="full" /> (
                {stats.appreciation >= 0 ? "+" : "−"}
                {Math.abs(stats.appreciationPct).toFixed(1)}%)
              </span>{" "}
              overall return against <Money value={stats.totalInvested} variant="full" /> invested cost
            </div>
          </div>

          {/* Quick status pill counters */}
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div
              style={{
                padding: "8px 14px",
                borderRadius: "var(--radius-md)",
                background: `color-mix(in srgb, ${THEME.sage} 10%, var(--surface-0))`,
                border: `1px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                Owned
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: THEME.sage }}>{stats.activeCount}</div>
            </div>
            <div
              style={{
                padding: "8px 14px",
                borderRadius: "var(--radius-md)",
                background: `color-mix(in srgb, ${THEME.gold} 10%, var(--surface-0))`,
                border: `1px solid color-mix(in srgb, ${THEME.gold} 25%, transparent)`,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                Under Const.
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: THEME.gold }}>{stats.ucCount}</div>
            </div>
            {stats.soldCount > 0 && (
              <div
                style={{
                  padding: "8px 14px",
                  borderRadius: "var(--radius-md)",
                  background: `color-mix(in srgb, ${THEME.rust} 10%, var(--surface-0))`,
                  border: `1px solid color-mix(in srgb, ${THEME.rust} 25%, transparent)`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                  Sold
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: THEME.rust }}>{stats.soldCount}</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Four Stat Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Total Invested Cost"
          value={fmtINRFull(stats.totalInvested)}
          numericValue={stats.totalInvested}
          formatValue={fmtINRFull}
          sub="Agreement + Stamp Duty + TDS"
          icon={<IndianRupee />}
          color={THEME.accent}
        />
        <StatCard
          label="Total Paid Outflow"
          value={fmtINRFull(stats.totalPaid)}
          numericValue={stats.totalPaid}
          formatValue={fmtINRFull}
          sub="Recorded payment disbursements"
          icon={<CheckCircle />}
          color={THEME.cyan}
        />
        <StatCard
          label="Demands Outstanding"
          value={fmtINRFull(stats.outstanding)}
          numericValue={stats.outstanding}
          formatValue={fmtINRFull}
          sub={stats.outstanding > 0 ? "Builder milestone dues pending" : "All demands settled"}
          icon={<Clock />}
          color={stats.outstanding > 0 ? THEME.rust : THEME.sage}
        />
        <StatCard
          label="Capital Appreciation"
          value={`${stats.appreciation >= 0 ? "+" : "−"}${fmtINRFull(Math.abs(stats.appreciation))}`}
          numericValue={stats.appreciation}
          formatValue={(n) => `${n >= 0 ? "+" : "−"}${fmtINRFull(Math.abs(n))}`}
          sub={`${stats.appreciation >= 0 ? "+" : "−"}${Math.abs(stats.appreciationPct).toFixed(1)}% portfolio gain`}
          icon={<TrendingUp />}
          color={stats.appreciation >= 0 ? THEME.sage : THEME.rust}
        />
      </div>

      {/* ── View Switcher & Filter Controls Toolbar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 16px",
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: "var(--radius-lg)",
        }}
      >
        {/* View Mode Switcher */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setViewMode("cards")}
            className={`demat-portfolio-pill ${viewMode === "cards" ? "active" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
          >
            <LayoutGrid size={13} /> Showcase Cards
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`demat-portfolio-pill ${viewMode === "table" ? "active" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
          >
            <TableIcon size={13} /> Portfolio Table
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            className={`demat-portfolio-pill ${viewMode === "timeline" ? "active" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
          >
            <Milestone size={13} /> Demands Roadmap
          </button>
          <button
            onClick={() => setViewMode("analytics")}
            className={`demat-portfolio-pill ${viewMode === "analytics" ? "active" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
          >
            <PieChartIcon size={13} /> Analytics & Allocation
          </button>
        </div>

        {/* Search and Status / Type Filters */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", minWidth: 160 }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: THEME.muted,
              }}
            />
            <input
              type="text"
              placeholder="Search properties, builders, area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px 6px 30px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-1)",
                color: THEME.ink,
                fontSize: 12,
                outline: "none",
              }}
            />
          </div>

          {/* Status filter */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {(
              [
                { id: "all", label: "All" },
                { id: "owned", label: "Owned" },
                { id: "under-construction", label: "Under Const." },
                { id: "sold", label: "Sold" },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`demat-portfolio-pill ${statusFilter === s.id ? "active" : ""}`}
                style={{ fontSize: 11, padding: "4px 10px" }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${THEME.line}`,
              background: "var(--surface-1)",
              color: THEME.ink,
              fontSize: 11,
              fontWeight: 600,
              outline: "none",
            }}
          >
            <option value="all">All Types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="land">Land / Plot</option>
            <option value="villa">Villa</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );
};
