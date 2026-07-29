import { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

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
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: "color-mix(in srgb, var(--t-rust) 12%, transparent)",
                border: "1.5px solid color-mix(in srgb, var(--t-rust) 25%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle size={28} strokeWidth={2} style={{ color: "var(--t-rust)" }} />
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "var(--t-ink)",
              }}
            >
              Something went wrong
            </h2>
            <p style={{ margin: 0, color: "var(--t-muted)", fontSize: 13, lineHeight: 1.6, maxWidth: 400 }}>
              {this.state.error?.message || "An unexpected error occurred. Please reload the page."}
            </p>
            <Button
              variant="accent"
              icon={<RefreshCw size={14} />}
              onClick={() => window.location.reload()}
              style={{ marginTop: 8 }}
            >
              Reload App
            </Button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
