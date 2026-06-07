// @ts-nocheck
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

  const fullClassName = `spotlight-wrapper ${getVariantClass()} ${hover ? "card-hover" : ""} ${onClick ? "card-interactive" : ""} ${className}`;

  const {
    display,
    flexDirection,
    flexWrap,
    gap,
    alignItems,
    justifyContent,
    gridTemplateColumns,
    gridTemplateRows,
    gridGap,
    rowGap,
    columnGap,
    ...outerStyle
  } = style || {};

  const contentStyle = {
    display,
    flexDirection,
    flexWrap,
    gap,
    alignItems,
    justifyContent,
    gridTemplateColumns,
    gridTemplateRows,
    gridGap,
    rowGap,
    columnGap,
    height: "100%",
    width: "100%",
  };

  return (
    <div className={fullClassName} style={outerStyle} onClick={onClick}>
      {variant === "hero" && <div className="hero-card-mesh" />}
      <div className="spotlight-content" style={contentStyle}>{children}</div>
    </div>
  );
};
