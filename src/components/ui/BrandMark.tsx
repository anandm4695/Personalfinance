import React from "react";

interface BrandMarkProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const GOLD = "#C5A152";
const GREEN = "#1F6E42";

/**
 * The app's emblem — same concept as the original mark (a money tree, gold
 * ring, rupee glyph nested in the canopy) redrawn as flat two-color vector
 * instead of a 1024px glow-halo/drop-shadow raster lockup. That raster was
 * legible at its native size but turned into a blurred gold smear at the
 * 30-110px sizes it was actually displayed at (sidebar, header, favicon).
 * This keeps the same design, just crisp at any size and without the glow.
 * Colors are fixed brand gold/green, not accent-preset-driven — a logo
 * shouldn't repaint itself when the user changes their UI accent color.
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
    <circle cx="20" cy="20" r="19" fill="none" stroke={GOLD} strokeWidth="1.1" />

    {/* Canopy — cluster of overlapping circles */}
    <g fill={GREEN}>
      <circle cx="16.6" cy="10.6" r="4.1" />
      <circle cx="23.4" cy="10.6" r="4.1" />
      <circle cx="20" cy="13" r="5.9" />
      <circle cx="14.6" cy="16" r="4.6" />
      <circle cx="25.4" cy="16" r="4.6" />
    </g>

    {/* Forked trunk */}
    <path
      d="M20 18 C19 21, 17.5 24, 15.5 28"
      stroke={GOLD}
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M20 18 C21 21, 22.5 24, 24.5 28"
      stroke={GOLD}
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />

    {/* Ground */}
    <ellipse cx="20" cy="29" rx="7.2" ry="1.9" fill={GREEN} />

    {/* Rupee, nested in the canopy — matches the original mark's motif */}
    <text
      x="20.1"
      y="14.3"
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="'Fraunces', Georgia, serif"
      fontWeight="600"
      fontSize="8.5"
      fill={GOLD}
      stroke="#FBF8F1"
      strokeWidth="1.6"
      paintOrder="stroke"
    >
      ₹
    </text>
  </svg>
);
