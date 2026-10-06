import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center max-w-md mx-auto mt-24 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-bounce" />
          <h3 className="text-base font-bold text-zinc-950 mb-2 uppercase tracking-wide">Algo no ha salido como se esperaba</h3>
          <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
            Se ha producido un error inesperado al renderizar esta sección. Haz clic en reintentar para recargar la página.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4" /> Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
