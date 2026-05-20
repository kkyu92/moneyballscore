'use client';

import { useReportWebVitals } from 'next/web-vitals';
import * as Sentry from '@sentry/nextjs';

type GtagFn = (
  command: 'event',
  name: string,
  params: Record<string, unknown>,
) => void;

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const rawValue = metric.name === 'CLS' ? metric.value * 1000 : metric.value;
    const intValue = Math.round(rawValue);

    try {
      Sentry.addBreadcrumb({
        category: 'web-vitals',
        message: metric.name,
        level: metric.rating === 'poor' ? 'warning' : 'info',
        data: {
          id: metric.id,
          name: metric.name,
          value: intValue,
          rating: metric.rating,
          delta: Math.round(metric.delta),
          navigationType: metric.navigationType,
        },
      });
    } catch {
      // Sentry not initialized (DSN absent / DNT opted-out) — skip
    }

    const gtag = (window as Window & { gtag?: GtagFn }).gtag;
    if (typeof gtag === 'function') {
      gtag('event', metric.name, {
        value: intValue,
        event_label: metric.id,
        event_category: 'web-vitals',
        metric_rating: metric.rating,
        non_interaction: true,
      });
    }
  });

  return null;
}
