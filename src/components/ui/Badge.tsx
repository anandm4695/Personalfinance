import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | "accent"
    | "sage"
    | "rust"
    | "gold"
    | "muted"
    | "cyan"
    | "violet"
    | "neutral"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "outline"
    | "primary"
    | "secondary";
  /** "xs" is for tight inline tags, "sm" is compact, "md" is default. */
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
}

const SIZE_STYLE: Record<string, React.CSSProperties> = {
  xs: { fontSize: 8, padding: "1px 5px", borderRadius: 4, fontWeight: 800 },
  sm: { fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700 },
  md: {},
  lg: { fontSize: 13, padding: "4px 10px", borderRadius: 6 },
};

const VARIANT_MAP: Record<string, string> = {
  neutral: "badge-muted",
  success: "badge-sage",
  warning: "badge-gold",
  danger: "badge-rust",
  outline: "badge-muted",
  primary: "badge-accent",
  secondary: "badge-muted",
  info: "badge-cyan",
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "accent",
  size = "md",
  className = "",
  style,
  title,
  onClick,
}) => {
  const variantClass = VARIANT_MAP[variant] || `badge-${variant}`;
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
      title={title}
      onClick={onClick}
      {...(onClick ? { role: "button", tabIndex: 0, onKeyDown: handleKeyDown } : {})}
    >
      {children}
    </span>
  );
};
