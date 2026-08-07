import { trackGoogleAnalyticsEvent } from '@/plugins/google-analytics.plugin';

export { createTrackerService, useTracker };

function createTrackerService({
  sendEvent = trackGoogleAnalyticsEvent,
}: {
  sendEvent?: (eventName: string) => void
} = {}) {
  return {
    trackEvent({ eventName }: { eventName: string }) {
      sendEvent(eventName);
    },
  };
}

function useTracker() {
  return {
    tracker: createTrackerService(),
  };
}
