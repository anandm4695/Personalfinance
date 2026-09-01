// @ts-nocheck
import React from "react";
import ReactDOM from "react-dom";
import { X, Check, AlertTriangle, Info } from "lucide-react";
import { THEME } from "../../utils/constants";
import { Button } from "./Button";

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
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Confirm Action</h2>
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
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ToastStack({ toasts }: { toasts: { id: string; msg: string; type: string }[] }) {
  if (!toasts.length) return null;
  const configs: Record<string, { accent: string; Icon: any; label: string }> = {
    success: { accent: THEME.sage, Icon: Check, label: "success" },
    error: { accent: THEME.rust, Icon: X, label: "error" },
    warn: { accent: THEME.gold, Icon: AlertTriangle, label: "warning" },
    info: { accent: THEME.accent, Icon: Info, label: "info" },
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
        const IconComponent = cfg.Icon;
        return (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : undefined}
            style={{
              background: "color-mix(in srgb, var(--surface-0) 90%, transparent)",
              backdropFilter: "blur(16px) saturate(180%)",
              WebkitBackdropFilter: "blur(16px) saturate(180%)",
              border: `1px solid color-mix(in srgb, ${cfg.accent} 25%, var(--t-line))`,
              borderLeft: `3.5px solid ${cfg.accent}`,
              color: "var(--t-ink)",
              padding: "12px 18px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "var(--shadow-xl)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              maxWidth: 360,
              fontFamily: "var(--t-font, var(--font-sans))",
              animation: "toastIn 0.28s var(--ease-out) both",
              lineHeight: 1.4,
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: `color-mix(in srgb, ${cfg.accent} 15%, transparent)`,
                border: `1.5px solid color-mix(in srgb, ${cfg.accent} 35%, transparent)`,
                color: cfg.accent,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconComponent size={12} strokeWidth={2.5} />
            </span>
            <span style={{ flex: 1 }}>{t.msg}</span>
          </div>
        );
      })}
    </div>,
    document.body
  );
}
