import type { Router } from 'vue-router';
import { config } from '@/config';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

export function shouldEnableGoogleAnalytics({
  enabled,
  measurementId,
  hostname,
}: {
  enabled: boolean
  measurementId: string
  hostname: string
}) {
  return enabled && measurementId.length > 0 && !LOCAL_HOSTNAMES.has(hostname);
}

export function normalizeGoogleAnalyticsEventName(eventName: string) {
  const normalized = eventName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!normalized) {
    return 'custom_event';
  }

  const withValidPrefix = /^[a-z]/.test(normalized) ? normalized : `event_${normalized}`;
  return withValidPrefix.slice(0, 40);
}

export function trackGoogleAnalyticsEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.gtag?.('event', normalizeGoogleAnalyticsEventName(eventName), params);
}

export function installGoogleAnalytics({ router }: { router: Router }) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const measurementId = config.googleAnalytics.measurementId;
  if (!shouldEnableGoogleAnalytics({
    enabled: config.googleAnalytics.enabled,
    measurementId,
    hostname: window.location.hostname,
  })) {
    return;
  }

  const dataLayer: unknown[][] = [];
  window.dataLayer = window.dataLayer ?? dataLayer;
  window.gtag = window.gtag ?? ((...args: unknown[]) => {
    window.dataLayer?.push(args);
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.googleAnalytics = measurementId;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });

  router.afterEach((to) => {
    window.gtag?.('event', 'page_view', {
      page_location: window.location.href,
      page_path: to.fullPath,
      page_title: document.title,
    });
  });
}

declare global {
  interface Window {
    dataLayer?: unknown[][]
    gtag?: (...args: unknown[]) => void
  }
}
