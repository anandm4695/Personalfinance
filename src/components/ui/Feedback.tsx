// @ts-nocheck
import React from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { THEME } from "../../utils/constants";

const CONFIRM_FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Yes, delete",
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  btnGhost?: any;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const onCancelRef = React.useRef(onCancel);
  onCancelRef.current = onCancel;

  // Escape-to-cancel, Tab focus-trap, body scroll lock, initial focus, and
  // focus-restore on close — same contract as Modal.tsx/Drawer.tsx, which
  // this dialog had never had despite sharing their .modal-backdrop/.modal-panel
  // CSS and being the app's most-used confirmation dialog.
  React.useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    if (panel) {
      const firstFocusable = panel.querySelector<HTMLElement>(CONFIRM_FOCUSABLE_SELECTOR);
      (firstFocusable || panel).focus();
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancelRef.current();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(CONFIRM_FOCUSABLE_SELECTOR)
        ).filter((el) => !el.hasAttribute("disabled"));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

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

  const mouseDownOnBackdropRef = React.useRef(false);

  return ReactDOM.createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        mouseDownOnBackdropRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (mouseDownOnBackdropRef.current && e.target === e.currentTarget) {
          onCancel();
        }
        mouseDownOnBackdropRef.current = false;
      }}
    >
      <div
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Confirm Action"
        tabIndex={-1}
        style={{ maxWidth: 420 }}
      >
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
          <p
            style={{
              fontSize: 14,
              color: "var(--t-ink)",
              lineHeight: 1.6,
              marginBottom: 24,
              whiteSpace: "pre-line",
            }}
          >
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
                background: THEME.rust,
                border: `1px solid ${THEME.rust}`,
                color: "#fff",
                fontWeight: 700,
              }}
            >
              {confirmLabel}
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
      role="status"
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: "fixed",
        bottom: 32,
        right: 20,
        zIndex: "var(--z-toast)",
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
            role={t.type === "error" ? "alert" : undefined}
            style={{
              background: "var(--surface-0)",
              border: `1px solid color-mix(in srgb, ${cfg.accent} 30%, transparent)`,
              color: "var(--t-ink)",
              padding: "12px 16px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "var(--shadow-xl)",
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
                background: `color-mix(in srgb, ${cfg.accent} 15%, transparent)`,
                border: `1.5px solid color-mix(in srgb, ${cfg.accent} 40%, transparent)`,
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
