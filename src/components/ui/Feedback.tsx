// @ts-nocheck
import React from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { THEME } from "../../utils/constants";

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  btnGhost?: any;
}) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  const cancelBtnStyle: React.CSSProperties = {
    background: "transparent",
    border: `1.5px solid var(--t-line)`,
    color: "var(--t-ink)",
    padding: "8px 18px",
    fontFamily: "var(--t-font, 'Inter', sans-serif)",
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 10,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };

  return ReactDOM.createPortal(
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div
            style={{
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--t-ink)",
            }}
          >
            Confirm Action
          </div>
          <button className="modal-close-btn" onClick={onCancel} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: "var(--t-ink)", lineHeight: 1.6, marginBottom: 24 }}>
            {message}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={cancelBtnStyle} onClick={onCancel}>
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                ...cancelBtnStyle,
                background: "#DC2626",
                border: "1px solid #DC2626",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Yes, delete
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ToastStack({ toasts }: { toasts: { id: string; msg: string; type: string }[] }) {
  if (!toasts.length) return null;
  const configs: Record<string, { accent: string; icon: string; label: string }> = {
    success: { accent: THEME.sage, icon: "✓", label: "success" },
    error: { accent: THEME.rust, icon: "✕", label: "error" },
    warn: { accent: THEME.gold, icon: "!", label: "warning" },
    info: { accent: THEME.accent, icon: "i", label: "info" },
  };

  return ReactDOM.createPortal(
    <div
      style={{
        position: "fixed",
        bottom: 32,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const cfg = configs[t.type] || configs.success;
        return (
          <div
            key={t.id}
            style={{
              background: "var(--surface-0)",
              border: `1px solid ${cfg.accent}4d`,
              color: "var(--t-ink)",
              padding: "12px 16px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              maxWidth: 340,
              fontFamily: "var(--t-font, 'Inter', sans-serif)",
              animation: "toastIn 0.28s var(--ease-out) both",
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: `${cfg.accent}26`,
                border: `1.5px solid ${cfg.accent}66`,
                color: cfg.accent,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {cfg.icon}
            </span>
            {t.msg}
          </div>
        );
      })}
    </div>,
    document.body
  );
}
