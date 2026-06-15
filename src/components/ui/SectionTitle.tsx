import React from "react";
import { THEME } from "../../utils/constants";

interface SectionTitleProps {
  children: React.ReactNode;
  sub?: string;
  rightElement?: React.ReactNode;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ children, sub, rightElement }) => {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              margin: 0,
              color: "var(--t-ink)",
            }}
          >
            {children}
          </h2>
          {sub && (
            <p
              style={{
                color: THEME.muted,
                fontSize: 14,
                marginTop: 6,
                fontWeight: 500,
                maxWidth: 600,
                lineHeight: 1.5,
              }}
            >
              {sub}
            </p>
          )}
        </div>
        {rightElement && <div style={{ display: "flex", gap: 12 }}>{rightElement}</div>}
      </div>
    </div>
  );
};
