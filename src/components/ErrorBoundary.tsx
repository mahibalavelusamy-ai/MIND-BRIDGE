import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Try to parse Firestore error if it's JSON
      let errorMessage = "An unexpected error occurred.";
      let errorDetails = this.state.error?.message || "";
      
      try {
        if (errorDetails.startsWith('{')) {
          const parsed = JSON.parse(errorDetails);
          if (parsed.error) {
            errorDetails = parsed.error;
          }
        }
      } catch (e) {
        // Not JSON, keep original message
      }

      // Make it user friendly based on common Firebase errors
      if (errorDetails.includes('Missing or insufficient permissions') || errorDetails.includes('permission-denied')) {
        errorMessage = "You don't have permission to access this data.";
      } else if (errorDetails.includes('offline') || errorDetails.includes('network')) {
        errorMessage = "You appear to be offline. Please check your internet connection.";
      } else if (errorDetails.includes('quota')) {
        errorMessage = "The application has reached its usage limit. Please try again later.";
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-4">
          <div className="max-w-md w-full bg-white rounded-[2rem] shadow-xl p-8 text-center border border-red-100">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-3">Oops! Something went wrong.</h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            
            <div className="bg-gray-50 p-4 rounded-xl text-left mb-8 overflow-auto max-h-32">
              <p className="text-xs text-gray-500 font-mono break-words">
                {errorDetails}
              </p>
            </div>

            <button 
              onClick={this.handleReset}
              className="w-full py-4 bg-accent text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors"
            >
              <RefreshCw size={20} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
