/**
 * Sentry Error Monitoring Configuration
 * 
 * This module initializes Sentry for error tracking in production.
 * Features:
 * - Automatic error capturing
 * - Performance monitoring
 * - Session replay for debugging
 * - User context tracking
 */

// Sentry configuration
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';
const ENVIRONMENT = import.meta.env.MODE || 'development';
const RELEASE = import.meta.env.VITE_APP_VERSION || '1.0.0';

// Track if Sentry is initialized
let isInitialized = false;

/**
 * Initialize Sentry SDK
 * Only initializes in production with valid DSN
 */
export async function initSentry(): Promise<void> {
  // Skip if already initialized or no DSN
  if (isInitialized || !SENTRY_DSN) {
    if (!SENTRY_DSN && import.meta.env.PROD) {
      console.warn('[Sentry] No DSN configured. Error monitoring disabled.');
    }
    return;
  }

  try {
    // Dynamically import Sentry to reduce initial bundle size
    const Sentry = await import('@sentry/react');
    
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: ENVIRONMENT,
      release: `psychometric-trainer@${RELEASE}`,
      
      // Performance monitoring
      tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
      
      // Session replay for debugging user issues
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      
      // Integrations
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      
      // Filter out non-critical errors
      beforeSend(event, hint) {
        const error = hint.originalException;
        
        // Ignore network errors that are often transient
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          return null;
        }
        
        // Ignore cancelled requests
        if (error instanceof DOMException && error.name === 'AbortError') {
          return null;
        }
        
        return event;
      },
      
      // Don't send in development unless explicitly enabled
      enabled: import.meta.env.PROD || import.meta.env.VITE_SENTRY_DEBUG === 'true',
    });

    // Expose Sentry globally for ErrorBoundary
    (window as any).Sentry = Sentry;
    
    isInitialized = true;
    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
  }
}

/**
 * Set user context for error tracking
 */
export function setUser(userId: string | null): void {
  if (!isInitialized) return;
  
  import('@sentry/react').then(Sentry => {
    if (userId) {
      Sentry.setUser({ id: userId });
    } else {
      Sentry.setUser(null);
    }
  });
}

/**
 * Capture a custom exception
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  console.error('[Error]', error);
  
  if (!isInitialized) return;
  
  import('@sentry/react').then(Sentry => {
    Sentry.captureException(error, {
      extra: context,
    });
  });
}

/**
 * Capture a custom message
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (!isInitialized) return;
  
  import('@sentry/react').then(Sentry => {
    Sentry.captureMessage(message, level);
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string = 'app',
  data?: Record<string, any>
): void {
  if (!isInitialized) return;
  
  import('@sentry/react').then(Sentry => {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    });
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(_name: string, _op: string = 'navigation') {
  if (!isInitialized) return null;
  
  // Note: Transactions are auto-created by browserTracingIntegration
  // This is for manual spans
  return null;
}

export default {
  init: initSentry,
  setUser,
  captureException,
  captureMessage,
  addBreadcrumb,
};
