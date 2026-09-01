// @ts-nocheck
import React from "react";
import { THEME } from "../../utils/constants";
import { Prv } from "../../context/PrivacyContext";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

// Small trend-line SVG used by the optional sparklineData prop below —
// intentionally dependency-free (no Recharts) since it only ever needs to
// draw one polyline at a fixed small size inside a stat card.
const Sparkline = ({
  data,
  color,
  width = 56,
  height = 24,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${points} ${width},${height} 0,${height}`;
  const gradientId = `sparkline-grad-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg width={width} height={height} style={{ overflow: "visible", flexShrink: 0 }} className="no-print">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#${gradientId})`} points={areaPoints} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

interface StatCardProps {
  label: string;
  value: string;
  /** Usually a short string; also accepts a node (e.g. a Badge) for a categorical assessment instead of plain text. */
  sub?: React.ReactNode;
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
  /** Optional trend history — renders a small sparkline to the right of the label. */
  sparklineData?: number[];
  /** Optional override for the big value's color (defaults to ink) — e.g. sage/rust for a gain-or-loss figure whose sign is independent of the card's own category accent color. */
  valueColor?: string;
  /** Makes the card a selectable filter/drill-down control instead of a plain display tile — adds button semantics, keyboard support, and an accent outer border when `active`. */
  onClick?: () => void;
  active?: boolean;
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
  sparklineData,
  valueColor,
  onClick,
  active,
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
      style={{
        background: "var(--t-card-bg)",
        border: `1px solid ${active ? borderColor || color : "var(--t-line)"}`,
        borderLeft: `2.5px solid ${borderColor || color}`,
        borderRadius: 10,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        cursor: onClick ? "pointer" : undefined,
        transition: "border-color 0.25s var(--ease-premium)",
      }}
    >
      <div className="spotlight-content" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
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
          {sparklineData && sparklineData.length >= 2 && (
            <Sparkline data={sparklineData} color={borderColor || color} />
          )}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 27,
            fontWeight: 600,
            color: valueColor || "var(--t-ink)",
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
