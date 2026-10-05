import React from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
  width?: number;
  isOpen?: boolean;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  title,
  onClose,
  children,
  footer,
  maxWidth,
  width,
  isOpen = true,
}) => {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  const mouseDownOnBackdrop = React.useRef(false);

  // Escape-to-close, body scroll lock, and initial focus.
  React.useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
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
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;
  const effectiveMaxWidth = width || maxWidth || 560;

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
        aria-label={typeof title === "string" ? title : "Modal Dialog"}
        tabIndex={-1}
        style={{ maxWidth: `min(${effectiveMaxWidth}px, 95vw)` }}
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
              flexWrap: "wrap",
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
  onSave?: () => void;
  onClose?: () => void;
  saveLabel?: string;
  saveText?: string;
  cancelLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}> = ({
  onSave,
  onClose,
  saveLabel = "Save",
  saveText,
  cancelLabel = "Cancel",
  disabled = false,
  loading = false,
  children,
}) => {
  const actualSave = saveText || saveLabel;
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
      {children ? (
        children
      ) : (
        <>
          {onClose && (
            <Button variant="secondary" onClick={onClose} disabled={loading} type="button">
              {cancelLabel}
            </Button>
          )}
          {onSave && (
            <Button variant="accent" onClick={onSave} disabled={disabled} loading={loading} type="button">
              {actualSave}
            </Button>
          )}
        </>
      )}
    </div>
  );
};
