import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  onClose,
  children,
  footer,
  maxWidth = 560,
}) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth }}
      >
        <div className="modal-header">
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{title}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer" style={{ padding: "16px 28px", borderTop: "1px solid var(--t-line)", display: "flex", justifyContent: "flex-end", gap: 12 }}>{footer}</div>}
      </div>
    </div>
  );
};

export const ModalActions: React.FC<{
  onSave: () => void;
  onClose: () => void;
  saveLabel?: string;
  cancelLabel?: string;
}> = ({ onSave, onClose, saveLabel = "Save", cancelLabel = "Cancel" }) => (
  <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
    <button
      onClick={onClose}
      style={{
        padding: "10px 20px",
        borderRadius: "var(--radius-md)",
        background: "transparent",
        border: "1.5px solid var(--t-line)",
        color: "var(--t-muted)",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {cancelLabel}
    </button>
    <button
      onClick={onSave}
      style={{
        padding: "10px 24px",
        borderRadius: "var(--radius-md)",
        background: "var(--t-accent)",
        border: "none",
        color: "#fff",
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "0 4px 14px color-mix(in srgb, var(--t-accent) 40%, transparent)",
      }}
    >
      {saveLabel}
    </button>
  </div>
);
