import React from "react";
import {
  Shield,
  Wrench,
  TrendingUp,
  Award,
  FileCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { THEME } from "../../utils/constants";

export type TaxHubTab = "tax" | "taxtools" | "capitalgains" | "sec80" | "taxfiling";

export interface TaxSuiteHeaderProps {
  activeTab: TaxHubTab;
  setTab?: (tab: string) => void;
  title?: string;
  subtitle?: string;
  badgeText?: string;
}

export const TAX_HUBS: {
  id: TaxHubTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
  description: string;
  badge?: string;
}[] = [
  {
    id: "tax",
    label: "Tax Vault",
    shortLabel: "Vault",
    icon: Shield,
    description: "Master income cockpit, 5 heads of income, old vs new regime comparison & tax ledger",
    badge: "Master Hub",
  },
  {
    id: "taxtools",
    label: "Tax Tools & Lab",
    shortLabel: "Tools",
    icon: Wrench,
    description: "Advance tax 234B/C engine, HRA optimizer & receipts, 26AS reconciler, GST/TDS matrix",
    badge: "Advance Tax",
  },
  {
    id: "capitalgains",
    label: "Capital Gains",
    shortLabel: "Cap Gains",
    icon: TrendingUp,
    description: "Equity/debt realized & unrealized gains, §112A grandfathering, tax loss harvesting & Schedule CG",
    badge: "FY 24-25+",
  },
  {
    id: "sec80",
    label: "80C / 80D & Crossover Lab",
    shortLabel: "80C/80D & Crossover",
    icon: Award,
    description: "Chapter VI-A deduction tracker, Old vs New regime breakeven optimizer, 80CCD(2) dual-regime benefit & Form 12BB",
    badge: "Old vs New Optimizer",
  },
  {
    id: "taxfiling",
    label: "ITR Filing Helper",
    shortLabel: "ITR Helper",
    icon: FileCheck,
    description: "ITR-1/2/3 form advisor, pre-filing document checklist, JSON/Schedule generator & dossier",
    badge: "Ready to File",
  },
];

export const TaxSuiteHeader: React.FC<TaxSuiteHeaderProps> = ({
  activeTab,
  setTab,
  title,
  subtitle,
  badgeText,
}) => {
  return (
    <div
      className="tax-suite-header tab-content-enter"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        marginBottom: 8,
      }}
    >
      {/* ── Tax Suite Breadcrumb & Cross-Navigation Bar ─────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "10px 16px",
          borderRadius: 14,
          background: "color-mix(in srgb, var(--surface-0) 88%, var(--t-accent) 6%)",
          border: `1px solid color-mix(in srgb, var(--t-accent) 18%, transparent)`,
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.sage})`,
              color: "#fff",
            }}
          >
            <Sparkles size={16} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: THEME.accent,
              }}
            >
              Unified Tax Suite
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>
              5 Integrated Tax & Compliance Hubs
            </span>
          </div>
        </div>

        {/* Navigation Pills */}
        <div
          className="no-scrollbar"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            overflowX: "auto",
            maxWidth: "100%",
            paddingBottom: 2,
          }}
        >
          {TAX_HUBS.map((hub) => {
            const Icon = hub.icon;
            const isActive = activeTab === hub.id;
            return (
              <button
                key={hub.id}
                onClick={() => setTab?.(hub.id)}
                disabled={!setTab || isActive}
                title={hub.description}
                aria-pressed={isActive}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  border: isActive
                    ? `1.5px solid ${THEME.accent}`
                    : `1px solid color-mix(in srgb, ${THEME.line} 80%, transparent)`,
                  background: isActive
                    ? `linear-gradient(135deg, ${THEME.accent}, color-mix(in srgb, ${THEME.accent} 85%, #000))`
                    : "color-mix(in srgb, var(--surface-1) 80%, transparent)",
                  color: isActive ? "#ffffff" : THEME.ink,
                  cursor: setTab && !isActive ? "pointer" : "default",
                  transition: "all 0.18s ease-in-out",
                  whiteSpace: "nowrap",
                  boxShadow: isActive ? `0 2px 8px color-mix(in srgb, ${THEME.accent} 35%, transparent)` : "none",
                }}
              >
                <Icon size={14} color={isActive ? "#ffffff" : THEME.muted} />
                <span>{hub.label}</span>
                {isActive && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#a7f3d0",
                      marginLeft: 2,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Optional Context Header */}
      {(title || subtitle || badgeText) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {title && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: THEME.ink }}>
                {title}
              </h2>
              {subtitle && (
                <p style={{ fontSize: 13, color: THEME.muted, margin: "2px 0 0" }}>
                  {subtitle}
                </p>
              )}
            </div>
          )}
          {badgeText && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 700,
                background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                color: THEME.accent,
                border: `1px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
              }}
            >
              <Sparkles size={12} /> {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
