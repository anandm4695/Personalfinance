import React from "react";
import {
  Shield,
  Heart,
  Zap,
  TrendingUp,
  Calendar,
  Activity,
  Plus,
  Download,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Filter,
  User,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { InsuranceSubTab } from "./InsuranceTypes";
import { useMasterData, formatProfileOption } from "../../utils/masterData";

interface InsuranceHeaderProps {
  activeSubTab: InsuranceSubTab;
  onSubTabChange: (tab: InsuranceSubTab) => void;
  counts: {
    all: number;
    term: number;
    lic: number;
    invest: number;
    upcomingCount: number;
  };
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedOwner: string;
  onOwnerChange: (owner: string) => void;
  statusFilter: "all" | "due" | "active" | "paid" | "matured";
  onStatusFilterChange: (status: "all" | "due" | "active" | "paid" | "matured") => void;
  viewMode: "grid" | "table";
  onViewModeChange: (mode: "grid" | "table") => void;
  onAddPolicy: (type: "lic" | "term" | "invest") => void;
  onExportCSV: () => void;
  hasPolicies: boolean;
}

export const InsuranceHeader: React.FC<InsuranceHeaderProps> = ({
  activeSubTab,
  onSubTabChange,
  counts,
  searchQuery,
  onSearchChange,
  selectedOwner,
  onOwnerChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  onAddPolicy,
  onExportCSV,
  hasPolicies,
}) => {
  const { familyProfiles } = useMasterData();

  const subTabs = [
    { id: "all" as InsuranceSubTab, label: "All Policies", icon: Shield, count: counts.all },
    { id: "term" as InsuranceSubTab, label: "Term Life", icon: Zap, count: counts.term },
    { id: "lic" as InsuranceSubTab, label: "LIC Traditional", icon: Heart, count: counts.lic },
    { id: "invest" as InsuranceSubTab, label: "Investment & ULIP", icon: TrendingUp, count: counts.invest },
    { id: "calendar" as InsuranceSubTab, label: "Premium Calendar", icon: Calendar, badge: counts.upcomingCount > 0 ? `${counts.upcomingCount} Due` : undefined },
    { id: "analyzer" as InsuranceSubTab, label: "Protection & Tax Analyzer", icon: Activity },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Top Title & Primary Actions */}
      <SectionTitle
        sub="Comprehensive risk protection, endowment maturity tracking, and annual premium ledger"
        rightElement={
          <div className="ins-header-actions" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {hasPolicies && (
              <Button
                onClick={onExportCSV}
                size="sm"
                variant="secondary"
                icon={<Download size={14} />}
                title="Export insurance portfolio as CSV"
              >
                Export CSV
              </Button>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <Button
                onClick={() => onAddPolicy("term")}
                size="sm"
                variant="accent"
                icon={<Plus size={14} />}
              >
                + Term
              </Button>
              <Button
                onClick={() => onAddPolicy("lic")}
                size="sm"
                variant="secondary"
                icon={<Plus size={14} />}
              >
                + LIC
              </Button>
              <Button
                onClick={() => onAddPolicy("invest")}
                size="sm"
                variant="secondary"
                icon={<Plus size={14} />}
              >
                + Investment
              </Button>
            </div>
          </div>
        }
      >
        Insurance Command Center
      </SectionTitle>

      {/* Sub-Tabs Nav Bar */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 4,
          marginBottom: 18,
          borderBottom: `1px solid ${THEME.line}`,
        }}
      >
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSubTabChange(tab.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: "var(--radius-sm, 8px)",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                background: isActive
                  ? "color-mix(in srgb, var(--t-accent) 14%, transparent)"
                  : "transparent",
                color: isActive ? "var(--t-accent)" : "var(--t-muted)",
                border: isActive
                  ? "1px solid color-mix(in srgb, var(--t-accent) 30%, transparent)"
                  : "1px solid transparent",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={15} style={{ color: isActive ? "var(--t-accent)" : "inherit" }} />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 10,
                    background: isActive
                      ? "var(--t-accent)"
                      : "color-mix(in srgb, var(--t-muted) 16%, transparent)",
                    color: isActive ? "#ffffff" : "var(--t-muted)",
                  }}
                >
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 10,
                    background: "color-mix(in srgb, var(--t-rust) 18%, transparent)",
                    color: "var(--t-rust)",
                    border: "1px solid color-mix(in srgb, var(--t-rust) 35%, transparent)",
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Interactive Controls Bar: Search, Owner Filter, Status Filter & View Switcher */}
      {["all", "term", "lic", "invest"].includes(activeSubTab) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            padding: "12px 16px",
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            borderRadius: "var(--radius-md, 12px)",
          }}
        >
          {/* Left: Search input */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 220, maxWidth: 360 }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: 10,
                  color: "var(--t-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Search plan, insurer, policy #..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                  paddingLeft: 32,
                  paddingRight: 10,
                  paddingTop: 6,
                  paddingBottom: 6,
                  fontSize: 12.5,
                  borderRadius: 8,
                }}
              />
            </div>
          </div>

          {/* Center: Family Owner Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--t-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <User size={13} /> Member:
            </span>
            <select
              className="form-input"
              value={selectedOwner}
              onChange={(e) => onOwnerChange(e.target.value)}
              style={{
                fontSize: 12,
                padding: "4px 8px",
                height: 32,
                borderRadius: 8,
                fontWeight: 600,
                minWidth: 120,
              }}
            >
              <option value="all">All Members</option>
              {familyProfiles.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {formatProfileOption(p)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Quick Filter Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {(
              [
                { id: "all", label: "All" },
                { id: "due", label: "Due Soon" },
                { id: "active", label: "Active" },
                { id: "paid", label: "Fully Paid" },
                { id: "matured", label: "Matured" },
              ] as const
            ).map((st) => {
              const isSelected = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => onStatusFilterChange(st.id)}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: isSelected
                      ? "var(--t-accent)"
                      : "color-mix(in srgb, var(--t-muted) 8%, transparent)",
                    color: isSelected ? "#ffffff" : "var(--t-muted)",
                    border: "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {st.label}
                </button>
              );
            })}
          </div>

          {/* Right: Grid vs Table View Mode Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "color-mix(in srgb, var(--t-muted) 8%, transparent)",
              borderRadius: 8,
              padding: 2,
              border: `1px solid ${THEME.line}`,
            }}
          >
            <button
              onClick={() => onViewModeChange("grid")}
              aria-label="Grid card view"
              title="Card View"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "5px 8px",
                borderRadius: 6,
                background: viewMode === "grid" ? "var(--surface-0)" : "transparent",
                color: viewMode === "grid" ? "var(--t-accent)" : "var(--t-muted)",
                border: viewMode === "grid" ? `1px solid ${THEME.line}` : "1px solid transparent",
                cursor: "pointer",
                boxShadow: viewMode === "grid" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => onViewModeChange("table")}
              aria-label="Table view"
              title="Data Table View"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "5px 8px",
                borderRadius: 6,
                background: viewMode === "table" ? "var(--surface-0)" : "transparent",
                color: viewMode === "table" ? "var(--t-accent)" : "var(--t-muted)",
                border: viewMode === "table" ? `1px solid ${THEME.line}` : "1px solid transparent",
                cursor: "pointer",
                boxShadow: viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <TableIcon size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
