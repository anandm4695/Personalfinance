// @ts-nocheck
import React from "react";
import { THEME } from "../../utils/constants";
import { Prv } from "../../context/PrivacyContext";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  icon: React.ReactNode;
  color: string;
  borderColor?: string;
  iconBg?: string;
  /** Optional: pass the raw number + a formatter to animate the value on change (count-up/down). */
  numericValue?: number;
  formatValue?: (n: number) => string;
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
  numericValue,
  formatValue,
}: StatCardProps) => {
  const hasAnimation = typeof numericValue === "number" && typeof formatValue === "function";
  const animated = useAnimatedNumber(hasAnimation ? numericValue : 0);
  const displayValue = hasAnimation ? formatValue(animated) : value;

  return (
  <div
    className="card-lift"
    style={{
      // Flat card-surface fill (not a gradient sheen) — the borderTop accent
      // carries the semantic color, matching every other stat/summary card
      // in the app instead of adding its own decorative diagonal blend.
      background: "var(--t-card-bg)",
      border: `1.5px solid ${THEME.line}`,
      borderTop: `3px solid ${borderColor || color}`,
      borderRadius: 16,
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      boxShadow: "var(--shadow-sm)",
      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          background:
            iconBg ||
            `linear-gradient(135deg, color-mix(in srgb, ${color} 15%, transparent) 0%, color-mix(in srgb, ${color} 8%, transparent) 100%)`,
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
      <Prv>{displayValue}</Prv>
    </div>
  </div>
  );
};
