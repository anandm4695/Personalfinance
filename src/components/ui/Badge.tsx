// @ts-nocheck
import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "accent" | "sage" | "rust" | "gold" | "muted";
  /** "xs" is for tight inline tags (e.g. a TRANSFER/LINKED marker next to a table cell). */
  size?: "xs" | "md";
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

const SIZE_STYLE: Record<string, React.CSSProperties> = {
  xs: { fontSize: 8, padding: "1px 5px", borderRadius: 4, fontWeight: 800 },
  md: {},
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "accent",
  size = "md",
  className = "",
  style,
  onClick,
}) => {
  const variantClass = `badge-${variant}`;
  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent<HTMLSpanElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(e as unknown as React.MouseEvent);
        }
      }
    : undefined;

  return (
    <span
      className={`badge ${variantClass} ${className}`}
      style={{ ...SIZE_STYLE[size], ...(onClick ? { cursor: "pointer" } : {}), ...style }}
      onClick={onClick}
      {...(onClick ? { role: "button", tabIndex: 0, onKeyDown: handleKeyDown } : {})}
    >
      {children}
    </span>
  );
};
