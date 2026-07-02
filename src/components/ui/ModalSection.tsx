// @ts-nocheck
import React from "react";

export function ModalSection({ title, first }: { title: string; first?: boolean }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "var(--t-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        borderTop: first ? "none" : "1px solid var(--t-line)",
        paddingTop: first ? 0 : 16,
        marginTop: first ? 0 : 4,
        marginBottom: 4,
      }}
    >
      {title}
    </div>
  );
}
