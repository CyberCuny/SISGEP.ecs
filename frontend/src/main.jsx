import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './i18n';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

(function () {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    import('@sentry/react').then((Sentry) => {
      Sentry.init({
        dsn,
        environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
        tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.2'),
        integrations: [Sentry.browserTracingIntegration()],
      });
    });
  }
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
