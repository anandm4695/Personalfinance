import React from "react";
import { BrandMark } from "../ui/BrandMark";

export function LoadingScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--t-paper, #0B0F1A)",
        gap: 20,
        padding: "24px 16px",
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      <BrandMark
        size={88}
        style={{ animation: "mark-enter 0.5s var(--ease-premium, ease-out) both" }}
      />
      <div
        style={{
          fontSize: "clamp(10px, 3vw, 12px)",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(197,161,82,0.7)",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Plan &bull; Grow &bull; Secure &bull; Prosper
      </div>
      <div
        style={{
          width: 160,
          height: 3,
          background: "rgba(128,128,128,0.15)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            background: "linear-gradient(90deg, #C5A152, #E8C97A, #C5A152)",
            backgroundSize: "200%",
            borderRadius: 2,
            animation: "shimmer 1.6s linear infinite",
          }}
        />
      </div>
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Loading your dashboard…
      </span>
      <style>{`
        @keyframes mark-enter { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
      `}</style>
    </div>
  );
}
