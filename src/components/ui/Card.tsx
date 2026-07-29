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
    height,
    maxHeight,
    ...outerStyle
  } = style || {};

  const contentStyle: React.CSSProperties = {
    flexGrow: 1,
    minHeight: "100%",
    width: "100%",
  };

  // Ensure spotlight-wrapper is a flex column container so spotlight-content flexGrow resolves properly
  outerStyle.display = "flex";
  outerStyle.flexDirection = "column";

  if (height !== undefined) {
    outerStyle.height = height;
  }
  if (maxHeight !== undefined) {
    outerStyle.maxHeight = maxHeight;
  }

  if (display !== undefined) contentStyle.display = display;
  if (flexDirection !== undefined) contentStyle.flexDirection = flexDirection;
  if (flexWrap !== undefined) contentStyle.flexWrap = flexWrap;
  if (gap !== undefined) contentStyle.gap = typeof gap === "number" ? `${gap}px` : gap;
  if (alignItems !== undefined) contentStyle.alignItems = alignItems;
  if (justifyContent !== undefined) contentStyle.justifyContent = justifyContent;
  if (gridTemplateColumns !== undefined) contentStyle.gridTemplateColumns = gridTemplateColumns;
  if (gridTemplateRows !== undefined) contentStyle.gridTemplateRows = gridTemplateRows;
  if (gridGap !== undefined)
    contentStyle.gridGap = typeof gridGap === "number" ? `${gridGap}px` : gridGap;
  if (rowGap !== undefined)
    contentStyle.rowGap = typeof rowGap === "number" ? `${rowGap}px` : rowGap;
  if (columnGap !== undefined)
    contentStyle.columnGap = typeof columnGap === "number" ? `${columnGap}px` : columnGap;

  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }
    : undefined;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div
      className={fullClassName}
      style={outerStyle}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      {...(onClick ? { role: "button", tabIndex: 0, onKeyDown: handleKeyDown } : {})}
    >
      {variant === "hero" && <div className="hero-card-mesh" />}
      <div className="spotlight-content" style={contentStyle}>
        {children}
      </div>
    </div>
  );
};
