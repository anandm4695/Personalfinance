// @ts-nocheck
import React from "react";
import { THEME } from "../../utils/constants";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  icon,
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
        return {
          background: `linear-gradient(135deg, ${THEME.accent} 0%, #818cf8 100%)`,
          color: "#fff",
          border: "none",
          boxShadow: `0 4px 12px ${THEME.accent}59`,
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

  const isDisabled = !!props.disabled;

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
      className={[variantClass, props.className].filter(Boolean).join(" ")}
      style={baseStyle}
    >
      {icon}
      {children}
    </button>
  );
};
