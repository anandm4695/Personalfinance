// @ts-nocheck
import React, { useState } from "react";
import { Lock, Eye, EyeOff, X } from "lucide-react";
import { THEME } from "../../utils/constants";
import { Button } from "./Button";

interface PdfPasswordPromptProps {
  fileName?: string;
  incorrect?: boolean;
  busy?: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export const PdfPasswordPrompt: React.FC<PdfPasswordPromptProps> = ({
  fileName,
  incorrect,
  busy,
  onSubmit,
  onCancel,
}) => {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const submit = () => {
    if (!password) return;
    onSubmit(password);
  };

  return (
    <div
      className="animate-slide-down"
      style={{
        padding: 16,
        borderRadius: "var(--radius-md)",
        background: "color-mix(in srgb, var(--t-accent) 6%, transparent)",
        border: `1.5px solid color-mix(in srgb, var(--t-accent) 30%, transparent)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Lock size={18} color={THEME.accent} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text }}>
            {fileName ? `"${fileName}" is password-protected` : "This PDF is password-protected"}
          </div>
          <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 2, lineHeight: 1.5 }}>
            CAMS/KFintech CAS statements are usually locked with a PAN-based password (e.g. your
            PAN in uppercase, or PAN + date of birth — check the email that sent you the
            statement). Nothing is uploaded anywhere; the PDF is decrypted in your browser only.
          </div>
          {incorrect && (
            <div style={{ fontSize: 12, color: THEME.rust, marginTop: 6, fontWeight: 600 }}>
              That password didn't work — please try again.
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 260 }}>
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="PDF password"
                aria-label="PDF password"
                autoFocus
                className="form-input"
                style={{ paddingRight: 34, fontSize: 13 }}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  color: THEME.textSecondary,
                }}
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <Button variant="primary" size="sm" onClick={submit} loading={busy} disabled={!password}>
              Unlock
            </Button>
            <Button variant="ghost" size="sm" icon={<X size={13} />} onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
