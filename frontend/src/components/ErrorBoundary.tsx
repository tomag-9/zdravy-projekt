import { Component, type ErrorInfo, type ReactNode } from "react";

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

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100dvh",
            padding: "2rem",
            gap: "1rem",
            fontFamily: "sans-serif",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "2rem" }}>⚠️</p>
          <p style={{ fontWeight: 600 }}>Niečo sa pokazilo</p>
          <p style={{ color: "#666", fontSize: "0.9rem" }}>
            Skúste obnoviť stránku. Ak problém pretrváva, kontaktujte podporu.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "0.5rem",
              padding: "0.6rem 1.4rem",
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.95rem",
            }}
          >
            Obnoviť stránku
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
