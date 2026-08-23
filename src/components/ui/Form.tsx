// @ts-nocheck
import React from "react";

interface FieldProps {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  error?: string;
}

export const Field: React.FC<FieldProps> = ({ label, children, style, error }) => {
  const autoId = React.useId();
  const errorId = `${autoId}-error`;
  const onlyChild =
    React.Children.count(children) === 1 && React.isValidElement(children)
      ? (children as React.ReactElement<any>)
      : null;
  const fieldId = onlyChild?.props?.id || autoId;
  const content = onlyChild
    ? React.cloneElement(onlyChild, {
        id: onlyChild.props?.id || fieldId,
        "aria-invalid": error ? true : onlyChild.props?.["aria-invalid"],
        "aria-describedby": error
          ? [onlyChild.props?.["aria-describedby"], errorId].filter(Boolean).join(" ")
          : onlyChild.props?.["aria-describedby"],
      })
    : children;

  return (
    <div style={{ marginBottom: 16, ...style }}>
      <label
        htmlFor={onlyChild ? fieldId : undefined}
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--t-muted)",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </label>
      {content}
      {error && (
        <div id={errorId} role="alert" style={{ fontSize: 11, color: "var(--t-rust)", marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    style={{
      width: "100%",
      padding: "10px 14px",
      fontSize: "14px",
      fontWeight: 500,
      borderRadius: "var(--radius-md)",
      transition: "border-color 0.2s var(--ease-premium), box-shadow 0.2s var(--ease-premium)",
      ...props.style,
    }}
  />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  children,
  ...props
}) => (
  <select
    {...props}
    style={{
      width: "100%",
      padding: "10px 14px",
      fontSize: "14px",
      fontWeight: 500,
      borderRadius: "var(--radius-md)",
      transition: "border-color 0.2s var(--ease-premium), box-shadow 0.2s var(--ease-premium)",
      ...props.style,
    }}
  >
    {children}
  </select>
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    style={{
      width: "100%",
      padding: "10px 14px",
      fontSize: "14px",
      fontWeight: 500,
      borderRadius: "var(--radius-md)",
      minHeight: "80px",
      transition: "border-color 0.2s var(--ease-premium), box-shadow 0.2s var(--ease-premium)",
      ...props.style,
    }}
  />
);
