import { Component, ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60vh",
              gap: 16,
              padding: 32,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48 }}>⚠️</div>
            <h2 style={{ margin: 0, fontWeight: 700 }}>Something went wrong</h2>
            <p style={{ margin: 0, opacity: 0.6, maxWidth: 400 }}>
              {this.state.error?.message || "An unexpected error occurred. Please reload the page."}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 8,
                padding: "10px 24px",
                borderRadius: 8,
                border: "none",
                background: "var(--accent)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Reload App
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
