// @ts-nocheck
import React from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";

interface DrawerProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * A right-side sliding detail panel — same interaction contract as Modal
 * (focus trap, Escape-to-close, body scroll lock, portal-rendered) but
 * anchored to the right edge with the list/page still visible behind it,
 * for "view detail without leaving the list" flows.
 */
export const Drawer: React.FC<DrawerProps> = ({ title, onClose, children, footer }) => {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

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

  const content = (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{title}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
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
