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
        borderTop: `3px solid ${borderColor || color}`,
        borderRadius: 16,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "var(--shadow-card)",
        transition: "all 0.25s var(--ease-premium)",
      }}
    >
      <div className="spotlight-content" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background:
                iconBg ||
                `linear-gradient(135deg, color-mix(in srgb, ${color} 18%, transparent) 0%, color-mix(in srgb, ${color} 8%, transparent) 100%)`,
              border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
              boxShadow: `0 4px 12px color-mix(in srgb, ${color} 15%, transparent)`,
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
                color: "var(--t-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {label}
            </div>
            {sub && (
              <div
                style={{
                  fontSize: 11,
                  color: subColor || "var(--t-muted)",
                  fontWeight: subColor ? 700 : 500,
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
            fontWeight: 800,
            color: "var(--t-ink)",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <Prv>{displayValue}</Prv>
        </div>
      </div>
    </div>
  );
};
