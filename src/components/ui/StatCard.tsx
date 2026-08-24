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
  /** Set false for non-financial/non-sensitive values (e.g. a theme name) that shouldn't blur in Privacy Mode. Defaults to true. */
  maskInPrivacyMode?: boolean;
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
  maskInPrivacyMode = true,
}: StatCardProps) => {
  const hasAnimation = typeof numericValue === "number" && typeof formatValue === "function";
  const animated = useAnimatedNumber(hasAnimation ? numericValue : 0);
  const displayValue = hasAnimation ? formatValue(animated) : value;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div
      className="spotlight-wrapper card-lift"
      onMouseMove={handleMouseMove}
      style={{
        background: "var(--t-card-bg)",
        border: "1px solid var(--t-line)",
        borderLeft: `2.5px solid ${borderColor || color}`,
        borderRadius: 10,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color 0.25s var(--ease-premium)",
      }}
    >
      <div className="spotlight-content" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            color: "var(--t-muted)",
            // Reserves space for a 2-line label so the value below stays at the
            // same Y position whether or not THIS card's label happens to wrap —
            // otherwise a row of cards with mixed label lengths gets ragged,
            // misaligned big numbers (short-label cards sit higher than
            // long-label ones).
            minHeight: 28,
          }}
        >
          {React.cloneElement(icon as React.ReactElement, { size: 13, strokeWidth: 2.25 })}
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              lineHeight: 1.3,
            }}
          >
            {label}
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 27,
            fontWeight: 600,
            color: "var(--t-ink)",
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {maskInPrivacyMode ? <Prv>{displayValue}</Prv> : displayValue}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 11.5,
              color: subColor || "var(--t-muted)",
              fontWeight: subColor ? 700 : 500,
              opacity: subColor ? 1 : 0.85,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
};
