import React from "react";

interface FieldProps {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  error?: string;
}

export const Field: React.FC<FieldProps> = ({ label, children, style, error }) => (
  <div style={{ marginBottom: 16, ...style }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--t-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </label>
    {children}
    {error && <div style={{ fontSize: 11, color: "var(--t-rust)", marginTop: 4 }}>{error}</div>}
  </div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    style={{
      width: "100%",
      padding: "10px 12px",
      fontSize: "14px",
      fontWeight: 500,
      ...props.style,
    }}
  />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, ...props }) => (
  <select
    {...props}
    style={{
      width: "100%",
      padding: "10px 12px",
      fontSize: "14px",
      fontWeight: 500,
      ...props.style,
    }}
  >
    {children}
  </select>
);
