import React from "react";

export function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--t-paper, #0B0F1A)",
        gap: 20,
      }}
    >
      <img
        src="/logo.png"
        alt="Personal Finance by Anand Mohta"
        style={{
          width: 110,
          height: 110,
          objectFit: "contain",
          filter: "drop-shadow(0 0 24px rgba(197,161,82,0.45))",
          animation: "pulse-logo 2.4s ease-in-out infinite",
        }}
      />
      <div
        style={{
          fontSize: 12,
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
      <style>{`
        @keyframes pulse-logo { 0%,100%{transform:scale(1);filter:drop-shadow(0 0 20px rgba(197,161,82,0.35))} 50%{transform:scale(1.04);filter:drop-shadow(0 0 36px rgba(197,161,82,0.55))} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
      `}</style>
    </div>
  );
}
