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
  return (
    <span className={`badge ${variantClass} ${className}`} style={style} onClick={onClick}>
      {children}
    </span>
  );
};
