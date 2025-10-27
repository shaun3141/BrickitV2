import posthog from 'posthog-js';

/**
 * Initialize PostHog analytics
 */
export function initPostHog() {
  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!posthogKey) {
    console.warn('PostHog key not found. Analytics will not be initialized.');
    return;
  }

  posthog.init(posthogKey, {
    api_host: posthogHost,
    person_profiles: 'always', // Create profiles for all users (anonymous + identified)
    capture_pageview: true, // Automatically capture pageviews
    capture_pageleave: true, // Track when users leave pages
    session_recording: {
      recordCrossOriginIframes: false, // Don't record cross-origin iframes
      maskAllInputs: true, // Mask sensitive input fields by default
      maskTextSelector: '[data-private]', // Mask elements with data-private attribute
    },
    autocapture: false, // Disable automatic capture for performance
    capture_performance: false, // Disable performance monitoring (already handled by other tools)
    loaded: (posthog) => {
      if (import.meta.env.DEV) {
        console.log('PostHog initialized with session recording');
        // posthog.debug(); // Disabled to reduce console noise
        // Force flush events immediately in dev
        posthog.capture('$pageview');
      }
    },
  });
}

/**
 * Track a custom event
 * @param eventName - Name of the event
 * @param properties - Additional properties to include with the event
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  posthog.capture(eventName, properties);
}

export { posthog };

