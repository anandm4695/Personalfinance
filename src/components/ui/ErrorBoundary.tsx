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
            <div style={{ display: "flex", alignItems: "center", color: "var(--t-rust)" }}>
              <AlertTriangle size={40} strokeWidth={1.5} />
            </div>
            <h2
              style={{
                fontFamily: "var(--t-font, var(--font-sans))",
                margin: 0,
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "-0.01em",
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
