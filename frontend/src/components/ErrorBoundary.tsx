import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional custom fallback. Receives the caught error so callers can display details. */
  fallback?: ((error: Error) => ReactNode) | ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const RELOAD_STORAGE_KEY = "eb_reload_attempts";
const MAX_AUTO_RELOADS = 2;

function safeReload() {
  try {
    const attempts = parseInt(
      sessionStorage.getItem(RELOAD_STORAGE_KEY) ?? "0",
      10,
    );
    if (attempts >= MAX_AUTO_RELOADS) {
      // Looping — navigate to root instead so the user gets a clean state
      sessionStorage.removeItem(RELOAD_STORAGE_KEY);
      window.location.href = "/";
      return;
    }
    sessionStorage.setItem(RELOAD_STORAGE_KEY, String(attempts + 1));
  } catch {
    // sessionStorage unavailable — fall through to plain reload
  }
  window.location.reload();
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
    // Clear the reload counter when a boundary successfully catches an error
    // so future independent errors don't hit the cap prematurely.
    try {
      sessionStorage.removeItem(RELOAD_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      const error = this.state.error ?? new Error("Unknown error");

      if (fallback) {
        return typeof fallback === "function" ? fallback(error) : fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[50dvh] p-8 gap-4 text-center">
          <p className="text-3xl">⚠️</p>
          <p className="font-semibold text-gray-900">Niečo sa pokazilo</p>
          <p className="text-sm text-gray-500">
            Skúste obnoviť stránku. Ak problém pretrváva, kontaktujte podporu.
          </p>
          <button
            onClick={safeReload}
            className="mt-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm cursor-pointer hover:bg-green-700 transition-colors"
          >
            Obnoviť stránku
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
