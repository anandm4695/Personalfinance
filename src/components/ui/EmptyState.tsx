// @ts-nocheck
import React from "react";
import { Plus } from "lucide-react";
import { THEME } from "../../utils/constants";
import { Card } from "./Card";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: React.ComponentType<any>;
  gradient?: string;
  dotColor?: string;
  title?: string;
  description?: string;
  message?: string;
  subtitle?: string;
  pills?: string[];
  buttonLabel?: string;
  onAdd?: () => void;
}

/**
 * Shared empty state component used across ~45 tabs. Simple dot-bullet
 * pills, clean centered layout, plain (not boxed) icon in the tab's own
 * accent color, no heavy borders or shadows.
 */
export function EmptyState({
  icon: Icon,
  dotColor,
  title,
  description,
  message,
  subtitle,
  pills,
  buttonLabel,
  onAdd,
}: EmptyStateProps) {
  const displayTitle = title || message || "Nothing here yet";
  const displayDescription = description || subtitle || "";
  const accentColor = dotColor || "var(--t-accent)";
  return (
    <Card style={{ padding: "48px 32px", textAlign: "center" }}>
      {Icon && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
            border: `1.5px solid color-mix(in srgb, ${accentColor} 20%, transparent)`,
            margin: "0 auto 20px",
            color: accentColor,
            boxShadow: `0 0 24px -4px color-mix(in srgb, ${accentColor} 20%, transparent)`,
          }}
        >
          <Icon size={30} strokeWidth={1.75} />
        </div>
      )}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 20,
          fontWeight: 700,
          color: "var(--t-ink)",
          marginBottom: 8,
          letterSpacing: "-0.01em",
        }}
      >
        {displayTitle}
      </div>
      {displayDescription && (
        <div
          style={{
            fontSize: 13,
            color: THEME.muted,
            maxWidth: 380,
            margin: "0 auto 12px",
            lineHeight: 1.6,
          }}
        >
          {displayDescription}
        </div>
      )}
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
        {(pills || []).map((t) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: dotColor || "var(--t-accent)",
                display: "inline-block",
              }}
            />
            {t}
          </span>
        ))}
      </div>
      {buttonLabel && onAdd && (
        <Button variant="accent" icon={<Plus size={14} />} onClick={onAdd}>
          {buttonLabel}
        </Button>
      )}
    </Card>
  );
}
