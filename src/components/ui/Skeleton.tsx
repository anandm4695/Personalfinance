import React from "react";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: React.CSSProperties;
  className?: string;
}

/** A single shimmering placeholder block. Uses the existing `.skeleton` CSS
 * (shimmer-wave animation) that was defined in styles.css but never adopted
 * by any component. */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 14,
  radius,
  style,
  className,
}) => (
  <div
    className={["skeleton", className].filter(Boolean).join(" ")}
    style={{ width, height, borderRadius: radius, ...style }}
    aria-hidden="true"
  />
);

/** A row of skeleton cells, sized to loosely match a data table row. */
export const SkeletonTableRows: React.FC<{
  rows?: number;
  columns?: number;
  rowHeight?: number;
}> = ({ rows = 4, columns = 4, rowHeight = 16 }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-hidden="true">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} style={{ display: "flex", gap: 12 }}>
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton
            key={c}
            height={rowHeight}
            width={c === 0 ? "22%" : `${Math.max(12, 100 / columns - 6)}%`}
          />
        ))}
      </div>
    ))}
  </div>
);

/** Matches StatCard's layout (icon badge + label + big value) so swapping
 * between this and a real StatCard doesn't shift layout. */
export const SkeletonStatCard: React.FC = () => (
  <div
    style={{
      border: "1.5px solid var(--t-line)",
      borderRadius: 16,
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}
    aria-hidden="true"
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Skeleton width={38} height={38} radius={11} />
      <Skeleton width={90} height={11} />
    </div>
    <Skeleton width="70%" height={28} radius={6} />
  </div>
);
