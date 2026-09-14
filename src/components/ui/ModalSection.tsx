import React from "react";

export function ModalSection({
  title,
  first,
  children,
}: {
  title: string;
  first?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: first ? 0 : 4, marginBottom: 8 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--t-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          borderTop: first ? "none" : "1px solid var(--t-line)",
          paddingTop: first ? 0 : 16,
          marginBottom: children ? 8 : 4,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
