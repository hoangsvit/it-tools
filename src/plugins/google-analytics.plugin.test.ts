import { describe, expect, it } from 'vitest';
import { normalizeGoogleAnalyticsEventName, shouldEnableGoogleAnalytics } from './google-analytics.plugin';

describe('google analytics', () => {
  it('enables tracking for a configured public hostname', () => {
    expect(shouldEnableGoogleAnalytics({
      enabled: true,
      measurementId: 'G-RHM16CGF0T',
      hostname: 'tools.eplus.dev',
    })).toBe(true);
  });

  it.each(['localhost', '127.0.0.1', '::1'])('disables tracking on local hostname %s', (hostname) => {
    expect(shouldEnableGoogleAnalytics({
      enabled: true,
      measurementId: 'G-RHM16CGF0T',
      hostname,
    })).toBe(false);
  });

  it('disables tracking when configured off or the measurement ID is empty', () => {
    expect(shouldEnableGoogleAnalytics({
      enabled: false,
      measurementId: 'G-RHM16CGF0T',
      hostname: 'tools.eplus.dev',
    })).toBe(false);

    expect(shouldEnableGoogleAnalytics({
      enabled: true,
      measurementId: '',
      hostname: 'tools.eplus.dev',
    })).toBe(false);
  });

  it('normalizes legacy tracker event names into valid GA4 event names', () => {
    expect(normalizeGoogleAnalyticsEventName('Fork star button clicked')).toBe('fork_star_button_clicked');
    expect(normalizeGoogleAnalyticsEventName('123 event')).toBe('event_123_event');
    expect(normalizeGoogleAnalyticsEventName('   ')).toBe('custom_event');
  });
});
