import React from "react";

interface CardProps {
  children: React.ReactNode;
  variant?: "base" | "tile" | "insight" | "hero";
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "base",
  className = "",
  style,
  onClick,
  hover = true,
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case "tile":
        return "tile-card";
      case "insight":
        return "insight-card";
      case "hero":
        return "hero-card";
      default:
        return "card-base";
    }
  };

  const fullClassName = `${getVariantClass()} ${hover ? "card-hover" : ""} ${onClick ? "card-interactive" : ""} ${className}`;

  return (
    <div className={fullClassName} style={style} onClick={onClick}>
      {variant === "hero" && <div className="hero-card-mesh" />}
      {children}
    </div>
  );
};
