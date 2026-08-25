import React from "react";

interface BrandMarkProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const GOLD = "#C5A152";
const GREEN = "#1F6E42";

/**
 * The ArthaDrishti emblem — a money tree, gold ring, rupee glyph nested in
 * the canopy, plus a small stacked-coin accent at the base — drawn as flat
 * two-color vector rather than a glow-halo/drop-shadow raster lockup. A
 * raster like that is legible at its native size but turns into a blurred
 * gold smear at the 16-110px sizes this mark is actually displayed at
 * (favicon, sidebar, header). This keeps every motif from the brand
 * reference crisp at any size and without the glow. Colors are fixed brand
 * gold/green, not accent-preset-driven — a logo shouldn't repaint itself
 * when the user changes their UI accent color.
 */
export const BrandMark: React.FC<BrandMarkProps> = ({ size = 40, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    className={className}
    style={style}
    role="img"
    aria-label="ArthaDrishti emblem"
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
      d="M20 18 C19.3 20.5, 18.3 22.5, 17.2 24.6"
      stroke={GOLD}
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M20 18 C20.7 20.5, 21.7 22.5, 22.8 24.6"
      stroke={GOLD}
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />

    {/* Ground */}
    <ellipse cx="20" cy="29.5" rx="7.6" ry="1.9" fill={GREEN} />

    {/* Coin stack — wealth accent at the base, sitting where the trunk meets the ground */}
    <g>
      <ellipse cx="24.1" cy="27.3" rx="2.9" ry="1.5" fill={GOLD} opacity="0.55" />
      <ellipse cx="24.1" cy="26.1" rx="2.9" ry="1.5" fill={GOLD} opacity="0.78" />
      <ellipse cx="24.1" cy="24.9" rx="2.9" ry="1.5" fill={GOLD} />
    </g>

    {/* Rupee, nested in the canopy — matches the brand mark's motif */}
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
