// @ts-nocheck
import React from "react";
import { Plus } from "lucide-react";
import { THEME } from "../../utils/constants";
import { Card } from "./Card";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: React.ComponentType<any>;
  gradient: string;
  dotColor: string;
  title: string;
  description: string;
  pills: string[];
  buttonLabel: string;
  onAdd: () => void;
}

/**
 * Shared empty state component — matches the InvestmentsTab (Fixed Income) gold standard.
 * Simple dot-bullet pills, clean centered layout, no heavy borders or shadows.
 */
export function EmptyState({
  icon: Icon,
  gradient,
  dotColor,
  title,
  description,
  pills,
  buttonLabel,
  onAdd,
}: EmptyStateProps) {
  return (
    <Card style={{ padding: "48px 32px", textAlign: "center" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <Icon size={30} color="#fff" />
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: THEME.ink,
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: THEME.muted,
          maxWidth: 380,
          margin: "0 auto 12px",
          lineHeight: 1.6,
        }}
      >
        {description}
      </div>
      <div
        style={{
          fontSize: 12,
          color: THEME.muted,
          marginBottom: 24,
          display: "flex",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {pills.map((t) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: dotColor,
                display: "inline-block",
              }}
            />
            {t}
          </span>
        ))}
      </div>
      <Button variant="accent" icon={<Plus size={14} />} onClick={onAdd}>
        {buttonLabel}
      </Button>
    </Card>
  );
}
