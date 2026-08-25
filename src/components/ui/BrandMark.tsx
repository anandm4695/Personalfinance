import React from "react";

interface BrandMarkProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The ArthaDrishti emblem, rendered from the official brand asset package
 * (public/ArthaDrishti_logo_asset_package/png/icon/arthadrishti-icon-512.png,
 * tracked at public/logo.png) at every size — including the small in-app
 * sidebar/header/favicon contexts where this detailed artwork reads softer
 * than a purpose-drawn flat-vector mark would. That tradeoff (literal source
 * artwork everywhere vs. crispness at small sizes) was a deliberate choice.
 */
export const BrandMark: React.FC<BrandMarkProps> = ({ size = 40, className, style }) => (
  <img
    src="/logo.png"
    alt="ArthaDrishti emblem"
    width={size}
    height={size}
    className={className}
    style={{ objectFit: "contain", ...style }}
  />
);
