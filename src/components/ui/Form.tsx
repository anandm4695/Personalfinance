import React from "react";

interface FieldProps {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Field: React.FC<FieldProps> = ({
  label,
  children,
  style,
  labelStyle,
  error,
  hint,
  required,
}) => {
  const autoId = React.useId();
  const errorId = `${autoId}-error`;
  const hintId = `${autoId}-hint`;
  const isRequired = Boolean(required || (typeof label === "string" && label.trim().endsWith("*")));
  const displayLabel =
    typeof label === "string" && label.trim().endsWith("*")
      ? label.trim().slice(0, -1).trim()
      : label;

  const onlyChild =
    React.Children.count(children) === 1 && React.isValidElement(children)
      ? (children as React.ReactElement<any>)
      : null;
  const fieldId = onlyChild?.props?.id || autoId;
  const describedBy = [
    onlyChild?.props?.["aria-describedby"],
    error ? errorId : null,
    !error && hint ? hintId : null,
  ]
    .filter(Boolean)
    .join(" ");

  const content = onlyChild
    ? React.cloneElement(onlyChild, {
        id: onlyChild.props?.id || fieldId,
        "aria-invalid": error ? true : onlyChild.props?.["aria-invalid"],
        "aria-describedby": describedBy || undefined,
        ...(isRequired ? { "aria-required": true } : {}),
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
          ...labelStyle,
        }}
      >
        {displayLabel}
        {isRequired && (
          <span
            style={{ color: "var(--t-rust)", marginLeft: 4, fontWeight: 700 }}
            aria-hidden="true"
          >
            *
          </span>
        )}
      </label>
      {content}
      {error && (
        <div id={errorId} role="alert" style={{ fontSize: 11, color: "var(--t-rust)", marginTop: 4 }}>
          {error}
        </div>
      )}
      {!error && hint && (
        <div id={hintId} style={{ fontSize: 11, color: "var(--t-muted)", marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
};

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, style, ...props }, ref) => (
    <input
      ref={ref}
      className={["form-input", className].filter(Boolean).join(" ")}
      style={{
        width: "100%",
        padding: "10px 14px",
        fontSize: "14px",
        fontWeight: 500,
        borderRadius: "var(--radius-md)",
        transition: "border-color 0.2s var(--ease-premium), box-shadow 0.2s var(--ease-premium)",
        ...style,
      }}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, style, children, ...props }, ref) => (
    <select
      ref={ref}
      className={["form-input", className].filter(Boolean).join(" ")}
      style={{
        width: "100%",
        padding: "10px 14px",
        fontSize: "14px",
        fontWeight: 500,
        borderRadius: "var(--radius-md)",
        transition: "border-color 0.2s var(--ease-premium), box-shadow 0.2s var(--ease-premium)",
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, style, ...props }, ref) => (
    <textarea
      ref={ref}
      className={["form-input", className].filter(Boolean).join(" ")}
      style={{
        width: "100%",
        padding: "10px 14px",
        fontSize: "14px",
        fontWeight: 500,
        borderRadius: "var(--radius-md)",
        minHeight: "80px",
        transition: "border-color 0.2s var(--ease-premium), box-shadow 0.2s var(--ease-premium)",
        ...style,
      }}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
