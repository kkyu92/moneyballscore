// silent drift family alert dispatcher
//
// cycle 813 (2026-05-20) silent drift family 사례 11 후속 carry-over —
// predict_final cron 의 predictions=0 + games_found>0 silent silent drop
// 즉시 감지 Sentry warning 채널. cycle 813 root cause fix (PR #1173
// allowLateWindow 박제) 와 별도. 다음 silent silent drop 발생 시
// 사용자 가시 metric loss 차단.
//
// packages/kbo-data 가 @sentry/nextjs 직접 의존 X — 동적 import +
// try/catch silent fallback 패턴 (validator.ts 와 동일).

import type { PipelineMode } from './daily';

export interface SilentDriftAlertMeta {
  mode: PipelineMode;
  date: string;
  gamesFound: number;
  predictionsGenerated: number;
  errors: string[];
}

export function shouldAlertSilentDrift(meta: SilentDriftAlertMeta): boolean {
  return (
    meta.mode === 'predict_final' &&
    meta.gamesFound > 0 &&
    meta.predictionsGenerated === 0
  );
}

type SentryModule = {
  captureMessage?: (msg: string, opts: unknown) => void;
  getClient?: () => unknown;
};

export async function captureSilentDriftAlert(
  meta: SilentDriftAlertMeta,
): Promise<void> {
  if (!shouldAlertSilentDrift(meta)) return;
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
    Sentry.captureMessage('predict_final_silent_drift', {
      level: 'warning',
      tags: {
        pattern: 'silent_drift_family_case11',
        pipeline_mode: meta.mode,
        date: meta.date,
      },
      extra: {
        games_found: meta.gamesFound,
        predictions_generated: meta.predictionsGenerated,
        errors: meta.errors,
      },
    });
  } catch {
    // sentry capture fail silent — main path 보호
  }
}
