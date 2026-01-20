/**
 * Analytics Service
 * 
 * Lightweight analytics tracking for user behavior and app usage.
 * Supports Google Analytics 4 and custom event tracking.
 */

// Configuration
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';
const ANALYTICS_ENABLED = import.meta.env.PROD && GA_MEASUREMENT_ID;

// Track initialization state
let isInitialized = false;

// Event queue for events fired before initialization
const eventQueue: Array<{ name: string; params: Record<string, any> }> = [];

/**
 * Initialize Google Analytics 4
 */
export function initAnalytics(): void {
  if (isInitialized || !ANALYTICS_ENABLED) {
    if (!GA_MEASUREMENT_ID && import.meta.env.PROD) {
      console.warn('[Analytics] No GA4 Measurement ID configured.');
    }
    return;
  }

  try {
    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize gtag
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false, // We'll track manually for SPA
      cookie_flags: 'SameSite=None;Secure',
    });

    isInitialized = true;
    console.log('[Analytics] Initialized');

    // Process queued events
    eventQueue.forEach(({ name, params }) => {
      trackEvent(name, params);
    });
    eventQueue.length = 0;
  } catch (error) {
    console.error('[Analytics] Failed to initialize:', error);
  }
}

/**
 * Track a page view
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (!isInitialized) return;

  (window as any).gtag?.('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle || document.title,
  });
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  params: Record<string, any> = {}
): void {
  // Queue events if not initialized yet
  if (!isInitialized && ANALYTICS_ENABLED) {
    eventQueue.push({ name: eventName, params });
    return;
  }

  if (!isInitialized) return;

  (window as any).gtag?.('event', eventName, params);
}

/**
 * Track user engagement events
 */
export const Analytics = {
  // Session events
  sessionStarted: (sectionType: string, questionCount: number) => {
    trackEvent('session_started', {
      section_type: sectionType,
      question_count: questionCount,
    });
  },

  sessionCompleted: (sectionType: string, score: number, duration: number) => {
    trackEvent('session_completed', {
      section_type: sectionType,
      score_percent: score,
      duration_seconds: duration,
    });
  },

  // Question events
  questionAnswered: (questionType: string, isCorrect: boolean, timeSpent: number) => {
    trackEvent('question_answered', {
      question_type: questionType,
      is_correct: isCorrect,
      time_spent_seconds: timeSpent,
    });
  },

  questionFlagged: (questionId: string) => {
    trackEvent('question_flagged', {
      question_id: questionId,
    });
  },

  questionBookmarked: (questionId: string) => {
    trackEvent('question_bookmarked', {
      question_id: questionId,
    });
  },

  // Navigation events
  sectionSelected: (sectionType: string) => {
    trackEvent('section_selected', {
      section_type: sectionType,
    });
  },

  simulationStarted: () => {
    trackEvent('simulation_started');
  },

  // Error events
  errorOccurred: (errorType: string, errorMessage: string) => {
    trackEvent('error_occurred', {
      error_type: errorType,
      error_message: errorMessage.substring(0, 100),
    });
  },

  // Engagement events
  streakAchieved: (streakDays: number) => {
    trackEvent('streak_achieved', {
      streak_days: streakDays,
    });
  },

  milestoneReached: (milestoneName: string, value: number) => {
    trackEvent('milestone_reached', {
      milestone_name: milestoneName,
      milestone_value: value,
    });
  },
};

export default Analytics;
