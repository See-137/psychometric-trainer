import { useEffect } from 'react';
import { RTLProvider, ErrorBoundary } from './components/common';
import { AppRouter } from './router';
import { useExamStore } from './stores';
import { initSentry } from './services/sentry';
import { initAnalytics, trackPageView } from './services/analytics';
import './index.css';

// Initialize monitoring services
initSentry();
initAnalytics();

/**
 * Main App component
 * Sets up RTL context, error boundaries, and routing
 */
function App() {
  const { loadFromJSON, isLoaded, isLoading } = useExamStore();

  // Load exam data from JSON on app start
  useEffect(() => {
    if (!isLoaded && !isLoading) {
      loadFromJSON();
    }
  }, [loadFromJSON, isLoaded, isLoading]);

  // Track page views on route changes
  useEffect(() => {
    trackPageView(window.location.pathname);
  }, []);

  return (
    <ErrorBoundary>
      <RTLProvider>
        <AppRouter />
      </RTLProvider>
    </ErrorBoundary>
  );
}

export default App;
