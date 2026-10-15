import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Global error telemetry safety nets
if (typeof window !== 'undefined') {
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('[Global window.onerror]', { message, source, lineno, colno, error });
    return false; // let default handlers/ErrorBoundary proceed
  };

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Global unhandledrejection]', event.reason);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
