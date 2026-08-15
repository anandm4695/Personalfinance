// @ts-nocheck
import React from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { THEME } from "../../utils/constants";
import { Button } from "./Button";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  title,
  onClose,
  children,
  footer,
  maxWidth = 560,
}) => {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  // Escape-to-close, body scroll lock, and initial focus.
  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the panel (or its first focusable element) once mounted.
    const panel = panelRef.current;
    if (panel) {
      const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (firstFocusable || panel).focus();
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
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
    };
  }, []);

  // Only close on a genuine click on the backdrop itself: both mousedown and
  // mouseup/click must start and end on the backdrop. This prevents the
  // common case of a user clicking/drag-selecting text inside the form and
  // the pointer drifting past the panel edge before release, which would
  // otherwise register as a backdrop click and silently discard the form.
  const mouseDownOnBackdrop = React.useRef(false);

  const content = (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        mouseDownOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (mouseDownOnBackdrop.current && e.target === e.currentTarget) {
          onClose();
        }
        mouseDownOnBackdrop.current = false;
      }}
    >
      <div
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ maxWidth: `min(${maxWidth}px, 95vw)` }}
      >
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{title}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && (
          <div
            className="modal-footer"
            style={{
              padding: "16px 28px",
              borderTop: "1px solid var(--t-line)",
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};

export const ModalActions: React.FC<{
  onSave: () => void;
  onClose: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
  loading?: boolean;
}> = ({ onSave, onClose, saveLabel = "Save", cancelLabel = "Cancel", disabled = false, loading = false }) => (
  <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
    <Button variant="secondary" onClick={onClose} disabled={disabled || loading}>
      {cancelLabel}
    </Button>
    <Button variant="accent" onClick={onSave} disabled={disabled} loading={loading}>
      {saveLabel}
    </Button>
  </div>
);
