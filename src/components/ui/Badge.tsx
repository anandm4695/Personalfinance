// @ts-nocheck
import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "accent" | "sage" | "rust" | "gold" | "muted";
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "accent",
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
      style={style}
      onClick={onClick}
      {...(onClick ? { role: "button", tabIndex: 0, onKeyDown: handleKeyDown } : {})}
    >
      {children}
    </span>
  );
};
