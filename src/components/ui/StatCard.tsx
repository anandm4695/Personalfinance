// @ts-nocheck
import React from "react";
import { THEME } from "../../utils/constants";
import { Prv } from "../../context/PrivacyContext";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  icon: React.ReactNode;
  color: string;
  borderColor?: string;
  iconBg?: string;
}

export const StatCard = ({
  label,
  value,
  sub,
  subColor,
  icon,
  color,
  borderColor,
  iconBg,
}: StatCardProps) => (
  <div
    className="card-lift"
    style={{
      background: "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 15%, var(--surface-0)) 100%)",
      border: `1.5px solid ${THEME.line}`,
      borderTop: `4px solid ${borderColor || color}`,
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
          width: 38,
          height: 38,
          borderRadius: 11,
          background: iconBg || `linear-gradient(135deg, color-mix(in srgb, ${color} 15%, transparent) 0%, color-mix(in srgb, ${color} 8%, transparent) 100%)`,
          border: `1.5px solid color-mix(in srgb, ${color} 25%, transparent)`,
          boxShadow: `0 2px 8px color-mix(in srgb, ${color} 8%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color,
          flexShrink: 0,
        }}
      >
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
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
        fontSize: 28,
        fontWeight: 900,
        color: THEME.ink,
        letterSpacing: "-0.04em",
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <Prv>{value}</Prv>
    </div>
  </div>
);

