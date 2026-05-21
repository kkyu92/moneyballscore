// KBO scraper HTML 응답 silent drop 사전 알람
//
// cycle 769 silent drift family 사례 8 후속 carry-over —
// KBO `/ws/Main.asmx` POST endpoint 가 봇 차단 정책 변경 시 정상 JSON
// 대신 HTML (IE conditional comment 또는 KBO 메인 페이지) 응답.
// JSON.parse fail → `KBO API parse error` throw → cron silent error
// (사용자 가시 X). cycle 769 fix 가 Referer 헤더 박제로 일시 해소했으나
// 향후 다른 검증 요구 (Origin / CSRF token / rate limit) 추가 시
// 동일 패턴 재발 가능.
//
// Layer 1 (cycle 769 PR #1101) = Referer 헤더 박제로 즉시 해소.
// Layer 2 (본 helper) = HTML 응답 감지 즉시 Sentry warning + 사용자 가시
// metric loss 차단. parse error 발생 시 silent silent skip 차단.
//
// packages/kbo-data 가 @sentry/nextjs 직접 의존 X — 동적 import +
// try/catch silent fallback 패턴 (silent-drift-alert.ts 와 동일).

export interface KboScraperHtmlAlertMeta {
  endpoint: string;
  date: string;
  status: number;
  contentType: string | null;
  bodySample: string;
}

export function shouldAlertKboScraperHtml(
  meta: Pick<KboScraperHtmlAlertMeta, 'contentType' | 'bodySample'>,
): boolean {
  const ct = meta.contentType?.toLowerCase() ?? '';
  if (ct.includes('text/html')) return true;
  const trimmed = meta.bodySample.trimStart();
  if (trimmed.length === 0) return false;
  if (trimmed.startsWith('<?xml')) return false;
  return trimmed.startsWith('<');
}

type SentryModule = {
  captureMessage?: (msg: string, opts: unknown) => void;
  getClient?: () => unknown;
};

export async function captureKboScraperHtmlAlert(
  meta: KboScraperHtmlAlertMeta,
): Promise<void> {
  if (!shouldAlertKboScraperHtml(meta)) return;
  if (process.env.NODE_ENV === 'test') return;

  let Sentry: SentryModule | null = null;
  try {
    Sentry = (await import('@sentry/nextjs' as string)) as SentryModule;
  } catch {
    return;
  }
  if (!Sentry || typeof Sentry.captureMessage !== 'function') return;
  if (typeof Sentry.getClient === 'function' && !Sentry.getClient()) return;

  try {
    Sentry.captureMessage('kbo_scraper_html_response', {
      level: 'warning',
      tags: {
        pattern: 'silent_drift_family_case8',
        endpoint: meta.endpoint,
        date: meta.date,
      },
      extra: {
        status: meta.status,
        content_type: meta.contentType,
        body_sample: meta.bodySample.slice(0, 200),
      },
    });
  } catch {
    // sentry capture fail silent — main path 보호
  }
}
