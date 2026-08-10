import React from "react";
import { usePrivacy } from "../../context/PrivacyContext";
import { fmtINR, fmtINRFull, fmtINRExact } from "../../utils/finance";

interface MoneyProps {
  value: number | string | null | undefined;
  /** compact: ₹1.2L/Cr (default, for stat tiles) · full: ₹1,20,000 · exact: keeps paise when present */
  variant?: "compact" | "full" | "exact";
  /** Tints positive values sage and negative values rust — for deltas, P&L, not absolute balances. */
  colorByValue?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Single entry point for rendering a rupee amount: picks the right fmtINR*
 * variant, applies tabular-nums, and masks under Privacy Mode automatically.
 * Replaces the pattern of wrapping every fmtINR() call in <Prv> by hand —
 * that pattern is what let past audits repeatedly find unmasked screens.
 */
export const Money: React.FC<MoneyProps> = ({
  value,
  variant = "compact",
  colorByValue = false,
  className,
  style,
}) => {
  const { privacyMode } = usePrivacy();
  const num = Number(value);
  const color =
    colorByValue && Number.isFinite(num) && num !== 0
      ? num < 0
        ? "var(--state-danger)"
        : "var(--state-success)"
      : undefined;

  if (privacyMode) {
    return (
      <span
        aria-label="Amount hidden — privacy mode is on"
        className={className}
        style={{
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.1em",
          userSelect: "none",
          color,
          ...style,
        }}
      >
        ••••
      </span>
    );
  }

  const formatted =
    variant === "full" ? fmtINRFull(value) : variant === "exact" ? fmtINRExact(value) : fmtINR(value);

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums", color, ...style }}>
      {formatted}
    </span>
  );
};
