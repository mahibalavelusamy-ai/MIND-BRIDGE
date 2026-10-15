import React from 'react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ message = 'Loading student telemetry...', size = 'md' }: LoadingStateProps) {
  const spinnerSizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div 
      className="p-8 flex flex-col items-center justify-center space-y-3"
      role="status"
      aria-live="polite"
    >
      <div 
        className={`${spinnerSizes[size]} border-accent border-t-transparent rounded-full animate-spin`} 
      />
      <p className="text-xs text-text-muted font-medium">{message}</p>
      <span className="sr-only">Loading content, please wait</span>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction
}: EmptyStateProps) {
  return (
    <div 
      className="p-10 bg-surface border border-border rounded-2xl text-center flex flex-col items-center justify-center space-y-3 max-w-md mx-auto"
      role="region"
      aria-label={title}
    >
      {icon && <div className="text-text-dim text-accent mb-1">{icon}</div>}
      <h3 className="text-base font-bold text-text-main">{title}</h3>
      <p className="text-xs text-text-muted leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-3 px-4 py-2 bg-accent text-bg text-xs font-semibold rounded-xl hover:bg-accent-hover transition-colors shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry
}: ErrorStateProps) {
  return (
    <div 
      className="p-6 bg-alert-500/10 border border-alert-500/30 rounded-2xl text-center space-y-3 max-w-md mx-auto"
      role="alert"
      aria-live="assertive"
    >
      <h3 className="text-sm font-bold text-alert-400">{title}</h3>
      <p className="text-xs text-text-muted leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-1.5 bg-surface border border-alert-500/40 text-alert-400 text-xs font-semibold rounded-lg hover:bg-alert-500/20 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
