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
          background: "linear-gradient(135deg, var(--t-accent), color-mix(in srgb, var(--t-accent) 80%, #C4B5FD))",
          color: "#fff",
          border: "none",
          boxShadow: "0 4px 12px color-mix(in srgb, var(--t-accent) 35%, transparent)",
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
        return { padding: "4px 10px", fontSize: "11px" };
      case "lg":
        return { padding: "12px 24px", fontSize: "16px" };
      default:
        return { padding: "8px 16px", fontSize: "14px" };
    }
  };

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    borderRadius: "var(--radius-md)",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s var(--ease-premium)",
    ...getSizeStyle(),
    ...getVariantStyle(),
    ...style,
  };

  return (
    <button style={baseStyle} {...props}>
      {icon}
      {children}
    </button>
  );
};
