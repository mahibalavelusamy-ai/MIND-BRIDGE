import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

// Component that intentionally throws an error
const ProblemChild = ({ shouldThrow, message }: { shouldThrow: boolean; message?: string }) => {
  if (shouldThrow) {
    throw new Error(message || 'Simulated child component failure');
  }
  return <div>Child content rendered safely</div>;
};

describe('ErrorBoundary Component', () => {
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    originalConsoleError = console.error;
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children normally when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Child content rendered safely')).toBeInTheDocument();
    expect(screen.queryByText('Oops! Something went wrong.')).not.toBeInTheDocument();
  });

  it('catches thrown error from child and displays fallback UI', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} message="Critical rendering crash" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong.')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument();
    expect(screen.getByText(/Critical rendering crash/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload Application/i })).toBeInTheDocument();
  });

  it('renders user-friendly message for permission errors', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} message="FirebaseError: Missing or insufficient permissions." />
      </ErrorBoundary>
    );

    expect(screen.getByText("You don't have permission to access this data.")).toBeInTheDocument();
  });

  it('renders user-friendly message for JSON-formatted permission errors', () => {
    const jsonError = JSON.stringify({ error: 'permission-denied', operationType: 'get' });
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} message={jsonError} />
      </ErrorBoundary>
    );

    expect(screen.getByText("You don't have permission to access this data.")).toBeInTheDocument();
  });

  it('renders user-friendly message for network or offline errors', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} message="Failed to fetch: the client is offline" />
      </ErrorBoundary>
    );

    expect(screen.getByText('You appear to be offline. Please check your internet connection.')).toBeInTheDocument();
  });

  it('renders user-friendly message for quota exceeded errors', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} message="Resource exhausted: quota exceeded" />
      </ErrorBoundary>
    );

    expect(screen.getByText('The application has reached its usage limit. Please try again later.')).toBeInTheDocument();
  });

  it('renders a custom fallback element when provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error Recovery View</div>}>
        <ProblemChild shouldThrow={true} message="Crash" />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom Error Recovery View')).toBeInTheDocument();
  });

  it('renders a custom fallback render-prop function and calls reset', () => {
    const onResetMock = vi.fn();
    render(
      <ErrorBoundary 
        onReset={onResetMock}
        fallback={(error, reset) => (
          <div>
            <span>Error: {error.message}</span>
            <button onClick={reset}>Try Reset</button>
          </div>
        )}
      >
        <ProblemChild shouldThrow={true} message="Render prop failure" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error: Render prop failure')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Try Reset'));
    expect(onResetMock).toHaveBeenCalledTimes(1);
  });

  it('handles window error events via handleWindowError', () => {
    render(
      <ErrorBoundary>
        <div>Passive Child</div>
      </ErrorBoundary>
    );

    act(() => {
      const errorEvent = new ErrorEvent('error', {
        error: new Error('Uncaught script runtime failure'),
        message: 'Uncaught script runtime failure'
      });
      window.dispatchEvent(errorEvent);
    });

    expect(screen.getByText('Oops! Something went wrong.')).toBeInTheDocument();
    expect(screen.getByText(/Uncaught script runtime failure/)).toBeInTheDocument();
  });

  it('handles unhandled promise rejections via handleUnhandledRejection', () => {
    render(
      <ErrorBoundary>
        <div>Passive Child</div>
      </ErrorBoundary>
    );

    act(() => {
      const rejectionEvent = new CustomEvent('unhandledrejection', {
        detail: { reason: new Error('Network async task rejected') }
      }) as any;
      rejectionEvent.reason = new Error('Network async task rejected');
      window.dispatchEvent(rejectionEvent);
    });

    expect(screen.getByText('Oops! Something went wrong.')).toBeInTheDocument();
    expect(screen.getByText(/Network async task rejected/)).toBeInTheDocument();
  });
});
