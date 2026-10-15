import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Mind Bridge Global Application Error Boundary
 *
 * Catches unhandled render-phase exceptions in React child component trees,
 * unhandled window errors, and unhandled promise rejections.
 *
 * Invariant: Prevents entire application white-screen crashes and renders
 * an emotionally calm, futuristic fallback view with recovery actions.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidMount() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleWindowError);
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    }
  }

  public componentWillUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.handleWindowError);
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    }
  }

  private handleWindowError = (event: ErrorEvent) => {
    const errorMsg = event.error?.message || event.message || '';
    if (typeof errorMsg === 'string' && (errorMsg.includes('WebSocket') || errorMsg.includes('closed without opened'))) {
      return; // Ignore Vite HMR WebSocket closed in preview container
    }
    // Only capture genuine error instances
    if (event.error instanceof Error) {
      this.setState({ hasError: true, error: event.error });
    } else if (event.message) {
      this.setState({ hasError: true, error: new Error(event.message) });
    }
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : (typeof reason === 'string' ? reason : '');
    if (msg.includes('WebSocket') || msg.includes('closed without opened')) {
      return; // Ignore Vite HMR WebSocket closed in preview container
    }
    const error = reason instanceof Error ? reason : new Error(typeof reason === 'string' ? reason : 'Unhandled Promise Rejection');
    this.setState({ hasError: true, error });
  };

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MindBridge ErrorBoundary caught exception]:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error || new Error('Unknown error'), this.handleReset);
        }
        return this.props.fallback;
      }

      let errorMessage = 'An unexpected error occurred.';
      let errorDetails = this.state.error?.message || '';

      try {
        if (errorDetails.startsWith('{')) {
          const parsed = JSON.parse(errorDetails);
          if (parsed.error) {
            errorDetails = parsed.error;
          }
        }
      } catch {
        // Not JSON, keep original message
      }

      if (errorDetails.includes('Missing or insufficient permissions') || errorDetails.includes('permission-denied')) {
        errorMessage = "You don't have permission to access this data.";
      } else if (errorDetails.includes('offline') || errorDetails.includes('network')) {
        errorMessage = 'You appear to be offline. Please check your internet connection.';
      } else if (errorDetails.includes('quota')) {
        errorMessage = 'The application has reached its usage limit. Please try again later.';
      }

      return (
        <div 
          className="min-h-screen flex items-center justify-center bg-bg p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full bg-surface-2 rounded-[2rem] shadow-xl p-8 text-center border border-alert-500/20">
            <div className="w-20 h-20 bg-alert-500/10 text-alert-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-2xl font-bold text-text-main mb-3">Oops! Something went wrong.</h2>
            <p className="text-text-muted mb-6 text-sm">{errorMessage}</p>

            <div className="bg-surface p-4 rounded-xl text-left mb-8 overflow-auto max-h-32 border border-border">
              <p className="text-xs text-text-dim font-mono break-words">
                {errorDetails}
              </p>
            </div>

            <button 
              onClick={this.handleReset}
              className="w-full py-4 bg-accent text-bg rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors text-sm shadow-md"
            >
              <RefreshCw size={18} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
