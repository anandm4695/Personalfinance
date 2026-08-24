import React from "react";

interface BrandMarkProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const INK = "#0B1220";
const BRASS = "#C5A152";

/**
 * The app's emblem — a flat two-tone medallion, drawn as vector, no raster
 * asset. Replaces the old /logo.png (a glow-halo lockup with a baked-in
 * tagline, legible only at its native 1024px and reduced to a blurred blob
 * at the 32-110px sizes it was actually displayed at). Colors are fixed
 * brand ink/brass, not accent-preset-driven — a mark shouldn't repaint
 * itself when the user changes their UI accent color.
 */
export const BrandMark: React.FC<BrandMarkProps> = ({ size = 40, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    className={className}
    style={style}
    role="img"
    aria-label="Personal Finance emblem"
  >
    <circle cx="20" cy="20" r="19" fill={INK} />
    <circle cx="20" cy="20" r="18" fill="none" stroke={BRASS} strokeWidth="0.8" />
    <circle cx="20" cy="20" r="14.5" fill="none" stroke={BRASS} strokeWidth="0.5" opacity="0.5" />
    <text
      x="20.2"
      y="21"
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="'Fraunces', Georgia, serif"
      fontWeight="600"
      fontSize="19"
      fill={BRASS}
    >
      ₹
    </text>
    <circle cx="20" cy="3.6" r="1.1" fill={BRASS} />
  </svg>
);
