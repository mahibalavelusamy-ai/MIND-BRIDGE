import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Global error telemetry safety nets
if (typeof window !== 'undefined') {
  window.onerror = (message, source, lineno, colno, error) => {
    const msgStr = typeof message === 'string' ? message : error?.message || '';
    if (msgStr.includes('WebSocket') || msgStr.includes('closed without opened')) {
      return true; // suppress benign Vite HMR drop
    }
    console.error('[Global window.onerror]', { message, source, lineno, colno, error });
    return false; // let default handlers/ErrorBoundary proceed
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reasonMsg = event.reason instanceof Error ? event.reason.message : String(event.reason || '');
    if (reasonMsg.includes('WebSocket') || reasonMsg.includes('closed without opened')) {
      event.preventDefault(); // suppress benign Vite HMR drop
      return;
    }
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
