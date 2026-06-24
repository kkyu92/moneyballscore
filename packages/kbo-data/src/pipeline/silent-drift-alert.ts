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
//
// cycle 886 (2026-05-25) 확장 — verify mode 도 동일 패턴 (verified=0 + games_found>0)
// 감지. 사례 11 family 확장 — predict_final 외 verify silent drop 도 박제.
//
// cycle 1013 (2026-05-28) M-D 확장 — factor anomaly z-score>3 감지 Sentry warning
// 별도 채널. shadow factor (park_weather, umpire_sz) 활성 후 factor 분포가 비정상
// 흐름 (예: weather 결측 30%↑ → 모든 park_weather=0.5 stuck) 사전 감지. cohort wiring
// (M-V2) 의 evidence 누적 + 본 alert 가 함께 작동.
//
// cycle 1363 (2026-06-24) explore-idea (heavy) — postview cohort 확장 (spec
// docs/research/noise-filtering-pipeline-2026-06-24.md 후보 A Tier 1). postview-daily
// 의 eligibleGames>0 + processed=0 = silent postview drop 즉시 감지 Sentry warning.
// 이전엔 postview cron silent 시 사용자 가시 채널 부재 (console.log only). 사례 11
// family 확장 — predict_final / verify / mlb_* 외 postview 도 박제.

import type { PipelineMode } from './daily';
import { notifyError } from '../notify/telegram';

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
  // cycle 886 추가 — verify mode 의 검증 완료 count.
  // verify mode 가 games_found>0 단 verified=0 → silent verify drop (사례 11 family 확장).
  verifiedCount?: number;
}

// MLB modes that use rowsInserted=0 pattern (scrape/train/measure modes)
const MLB_SCRAPE_MODES = new Set<string>([
  'mlb_statsapi_scrape',
  'mlb_fancy_scrape',
  'mlb_savant_scrape',
  'mlb_shadow_train',
  'mlb_walk_forward_measure',
]);

export function shouldAlertSilentDrift(meta: SilentDriftAlertMeta): boolean {
  if (meta.gamesFound <= 0) return false;

  if (meta.mode === 'predict_final') {
    const covered = meta.predictionsGenerated + (meta.existingPredictionsCount ?? 0);
    return covered < meta.gamesFound;
  }

  // MLB predict_final — 동일 로직 (predictions coverage check)
  if (meta.mode === 'mlb_predict_final') {
    const covered = meta.predictionsGenerated + (meta.existingPredictionsCount ?? 0);
    return covered < meta.gamesFound;
  }

  // cycle 886 — verify mode silent drop detection.
  // verify mode 가 games_found > 0 인 day 의 verified=0 = silent verify drop.
  // verifiedCount undefined → 기존 동작 보존 (alert 미발화).
  if (meta.mode === 'verify') {
    if (meta.verifiedCount === undefined) return false;
    return meta.verifiedCount === 0;
  }

  // cycle 1363 — postview mode silent drop detection.
  // postview-daily 의 eligibleGames>0 (pre_game 존재 + post_game 부재) + processed=0
  // = silent postview drop. gamesFound = eligibleGames / predictionsGenerated = processed
  // (postview-daily 호출 측에서 매핑 의무).
  if (meta.mode === 'postview') {
    return meta.predictionsGenerated === 0;
  }

  // MLB scrape/train/measure modes — gamesFound>0 단 rowsInserted=0 → silent drop
  if (MLB_SCRAPE_MODES.has(meta.mode)) {
    return meta.predictionsGenerated === 0;
  }

  return false;
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

  const isVerify = meta.mode === 'verify';
  const isPostview = meta.mode === 'postview';
  const isMlb = meta.mode.startsWith('mlb_');
  const message = isVerify
    ? 'verify_silent_drift'
    : isPostview
      ? 'postview_silent_drift'
      : isMlb
        ? `mlb_${meta.mode}_silent_drift`
        : 'predict_final_silent_drift';
  const pattern = isVerify
    ? 'silent_drift_family_case11_verify_extension'
    : isPostview
      ? 'silent_drift_family_case11_postview_extension'
      : isMlb
        ? 'silent_drift_family_mlb'
        : 'silent_drift_family_case11';

  // Sentry warning channel (기존 — getClient 부재 시 silent skip).
  let Sentry: SentryModule | null = null;
  try {
    Sentry = (await import('@sentry/nextjs' as string)) as SentryModule;
  } catch {
    Sentry = null;
  }
  if (Sentry && typeof Sentry.captureMessage === 'function') {
    const hasClient = typeof Sentry.getClient === 'function' ? !!Sentry.getClient() : true;
    if (hasClient) {
      try {
        Sentry.captureMessage(message, {
          level: 'warning',
          tags: {
            pattern,
            pipeline_mode: meta.mode,
            date: meta.date,
          },
          extra: {
            games_found: meta.gamesFound,
            predictions_generated: meta.predictionsGenerated,
            verified_count: meta.verifiedCount,
            errors: meta.errors,
          },
        });
      } catch {
        // sentry capture fail silent — main path 보호
      }
    }
  }

  // cycle 1182 — Telegram fallback. Sentry warning 만 보면 사용자 가시 채널
  // 부재 (cycle 1173~1181 = wave 19 1주+ 미인지 root cause 2nd layer). 본
  // dispatcher 가 shouldAlert=true 도달했단 건 silent drop evidence 명확 → 사용자
  // 가시 알림 의무. silent drift family detection 단일 채널 (#34 fallback +
  // submit-lesson 패턴 정합).
  try {
    const verifiedText = meta.verifiedCount !== undefined
      ? ` verified=${meta.verifiedCount}` : '';
    const errCount = meta.errors?.length ?? 0;
    const errText = errCount > 0 ? ` errors=${errCount}` : '';
    await notifyError(
      `silent-drift ${meta.mode} ${meta.date}`,
      `games=${meta.gamesFound} predictions=${meta.predictionsGenerated}${verifiedText}${errText} pattern=${pattern}`,
    );
  } catch {
    // telegram fail silent — main path 보호
  }
}

// ============================================
// M-D cycle 1013 — factor anomaly z-score 감지
// ============================================
// 산정 helper (detectFactorAnomalies + threshold 상수) 는 packages/shared 안 위치
// (Sentry-free) — apps/moneyball vitest 가 @moneyball/kbo-data import 못하는 문제 회피.
// 본 모듈은 Sentry-dependent alert dispatcher 만 박제.

import {
  type FactorAnomaly,
} from '@moneyball/shared';

export interface FactorAnomalyAlertMeta {
  date: string;
  cohort: string; // scoring_rule (예: 'v1.8' | 'v2.1-B-shadow')
  anomalies: FactorAnomaly[];
}

/**
 * detectFactorAnomalies 결과 비어있지 않으면 Sentry warning. captureSilentDriftAlert 와
 * 별도 채널 (pattern='factor_anomaly_zscore'). cohort 별 분리 박제 — v1.8 vs shadow
 * 분포 비교 surface.
 */
export async function captureFactorAnomalyAlert(
  meta: FactorAnomalyAlertMeta,
): Promise<void> {
  if (meta.anomalies.length === 0) return;
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
    Sentry.captureMessage('factor_anomaly_zscore', {
      level: 'warning',
      tags: {
        pattern: 'factor_anomaly_zscore',
        cohort: meta.cohort,
        date: meta.date,
        anomaly_count: String(meta.anomalies.length),
      },
      extra: {
        anomalies: meta.anomalies.map((a) => ({
          factor: a.factorKey,
          value: a.value,
          mean: a.mean,
          stddev: a.stdDev,
          zscore: a.zScore,
        })),
      },
    });
  } catch {
    // silent — main path 보호
  }
}
