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
  // 이미 DB 에 박제된 같은 날짜 pre_game predictions 수 (existingSet.size).
  // 미지정 시 0 가정 — predictionsGenerated 만으로 coverage 판단 (기존 동작 보존).
  // 사례: predict mode 가 아침에 5건 박제 → predict_final 시 existing=5, predictionsGenerated=0
  // 이어도 coverage 충분 → alert 미발화 (cycle 864 op-analysis 86% false positive fix).
  existingPredictionsCount?: number;
}

export function shouldAlertSilentDrift(meta: SilentDriftAlertMeta): boolean {
  if (meta.mode !== 'predict_final') return false;
  if (meta.gamesFound <= 0) return false;
  const covered = meta.predictionsGenerated + (meta.existingPredictionsCount ?? 0);
  return covered < meta.gamesFound;
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
