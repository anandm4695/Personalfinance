// @ts-nocheck
import React from "react";
import { Loader2 } from "lucide-react";
import { THEME } from "../../utils/constants";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  /** Shows a spinner in place of the icon and disables the button while true. */
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  style,
  ...props
}) => {
  const getVariantStyle = (): React.CSSProperties => {
    switch (variant) {
      case "primary":
        return {
          background: "var(--t-accent)",
          color: "#fff",
          border: "none",
        };
      case "accent":
        // Flat accent fill, not a gradient — a solid CTA color reads as more
        // deliberate/premium than a glossy diagonal sheen, and stays legible
        // across all 10 accent-color presets. The subtle lift (box-shadow)
        // is what distinguishes this from the plain "primary" variant.
        return {
          background: "var(--t-accent)",
          color: "#fff",
          border: "none",
          boxShadow: `0 2px 8px color-mix(in srgb, ${THEME.accent} 30%, transparent)`,
        };
      case "secondary":
        return {
          background: "transparent",
          border: `1.5px solid ${THEME.line}`,
          color: THEME.ink,
        };
      case "ghost":
        return {
          background: "transparent",
          border: "none",
          color: THEME.muted,
        };
      case "danger":
        return {
          background: "transparent",
          border: `1.5px solid ${THEME.rust}`,
          color: THEME.rust,
        };
      default:
        return {};
    }
  };

  const getSizeStyle = (): React.CSSProperties => {
    switch (size) {
      case "sm":
        return { padding: "5px 10px", fontSize: "11px" };
      case "lg":
        return { padding: "12px 24px", fontSize: "16px" };
      default:
        return { padding: "8px 16px", fontSize: "14px" };
    }
  };

  const variantClass =
    (
      {
        primary: "btn-primary",
        accent: "btn-accent",
        secondary: "btn-secondary",
        ghost: "btn-ghost",
        danger: "btn-danger",
      } as Record<string, string>
    )[variant] || "";

  const isDisabled = !!props.disabled || loading;

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    borderRadius: "var(--radius-md)",
    fontWeight: 600,
    cursor: isDisabled ? "not-allowed" : "pointer",
    transition: "all 0.2s var(--ease-premium)",
    ...getSizeStyle(),
    ...getVariantStyle(),
    ...(isDisabled ? { opacity: 0.45, pointerEvents: "none" as const } : {}),
    ...style,
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[variantClass, props.className].filter(Boolean).join(" ")}
      style={baseStyle}
    >
      {loading ? (
        <Loader2 size={size === "sm" ? 12 : size === "lg" ? 18 : 14} className="animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};
