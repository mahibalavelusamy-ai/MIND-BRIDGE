import React from 'react';
import { render, screen } from '@testing-library/react';
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
    // Suppress console.error output in test runner from React error boundary logs
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
});
