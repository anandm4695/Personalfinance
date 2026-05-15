// @ts-nocheck
import React from "react";
import { THEME } from "../../utils/constants";
import { Prv } from "../../context/PrivacyContext";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  borderColor?: string;
  iconBg?: string;
}

export const StatCard = ({ label, value, sub, icon, color, borderColor, iconBg }: StatCardProps) => (
  <div
    style={{
      background: "var(--t-paper)",
      border: `1px solid ${THEME.line}`,
      borderTop: `3px solid ${borderColor || color}`,
      borderRadius: 14,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: iconBg || `color-mix(in srgb, ${color} 12%, transparent)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: color, flexShrink: 0,
      }}>
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {label}
        </div>
        {sub && <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 400, marginTop: 2, opacity: 0.8 }}>{sub}</div>}
      </div>
    </div>
    <div style={{ fontSize: 28, fontWeight: 900, color: color, letterSpacing: "-0.04em", lineHeight: 1 }}>
      <Prv>{value}</Prv>
    </div>
  </div>
);
