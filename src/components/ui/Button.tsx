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
        // across all 10 accent-color presets.
        return {
          background: "var(--t-accent)",
          color: "#fff",
          border: "none",
        };
      case "secondary":
        return {
          background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
          border: `1.5px solid var(--t-line)`,
          color: "var(--t-ink)",
        };
      case "ghost":
        return {
          background: "transparent",
          border: "none",
          color: "var(--t-muted)",
        };
      case "danger":
        return {
          background: "color-mix(in srgb, var(--t-rust) 8%, transparent)",
          border: `1.5px solid color-mix(in srgb, var(--t-rust) 35%, transparent)`,
          color: "var(--t-rust)",
        };
      default:
        return {};
    }
  };

  const getSizeStyle = (): React.CSSProperties => {
    switch (size) {
      case "sm":
        return { padding: "6px 12px", fontSize: "12px", minHeight: "28px" };
      case "lg":
        return { padding: "12px 24px", fontSize: "15px", minHeight: "44px" };
      default:
        return { padding: "8px 18px", fontSize: "13.5px", minHeight: "36px" };
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
    letterSpacing: "-0.01em",
    userSelect: "none",
    transition:
      "transform 0.15s var(--ease-premium), box-shadow 0.15s var(--ease-premium), background 0.15s var(--ease-premium), border-color 0.15s var(--ease-premium), opacity 0.15s ease",
    boxShadow:
      variant === "primary" || variant === "accent"
        ? "var(--shadow-sm)"
        : variant === "secondary"
        ? "var(--shadow-xs)"
        : "none",
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
      className={[variantClass, "btn-interactive", props.className].filter(Boolean).join(" ")}
      style={baseStyle}
    >
      {loading ? (
        <Loader2 size={size === "sm" ? 13 : size === "lg" ? 18 : 15} className="animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};
