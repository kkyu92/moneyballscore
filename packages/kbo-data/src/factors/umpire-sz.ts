/**
 * M-F2 umpire_sz factor (factor 12, cycle 1013).
 *
 * 주심 strike zone bias → 양팀 점수 multiplicative adj.
 * umpire_stats DB lookup — sample_n<30 시 league-avg fallback (sz_widen_pct=0).
 *
 * production 가중치 = 0 (DEFAULT_WEIGHTS), shadow cohort (v2.1-B-shadow) 에서만 weight>0.
 *
 * 스코어링:
 *   - sz_widen_pct > 0 (넓음, 타자 친화)   → 양팀 점수 +5%
 *   - sz_widen_pct < 0 (좁음, 투수 친화)   → 양팀 점수 -5%
 *   - sz_widen_pct = 0 OR sample_n < 30   → noop (league-avg fallback)
 *
 * 비대칭 미적용 — 좌우타선 SZ 차이 / 타선 K% 별도 input 도입 시 비대칭 분기 reserve.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface UmpireSZScore {
  /** 홈팀 공격 offence multiplicative adj */
  homeAdj: number;
  /** 원정팀 공격 offence multiplicative adj */
  awayAdj: number;
  /** 사람용 reason (UI / 디버그) */
  reason: string;
}

/** 누적 표본 임계 — 미만 시 league-avg fallback (sz_widen_pct=0 noop). */
export const UMPIRE_SAMPLE_THRESHOLD = 30;

/** SZ 넓음 / 좁음 단위 adj — 양팀 동일 (대칭). */
const SZ_OFFENSE_BOOST = 0.05;
const SZ_OFFENSE_SUPPRESS = -0.05;

interface UmpireStatsRow {
  name: string;
  sz_widen_pct: number;
  sample_n: number;
}

/**
 * 주심 1인 → 양팀 점수 adj.
 *
 * @param mainUmpireName  주심 이름 (한글). 빈 / null / undefined → league-avg fallback
 * @param db              Supabase client — umpire_stats SELECT only
 */
export async function scoreUmpireSZ(
  mainUmpireName: string | null | undefined,
  db: SupabaseClient,
): Promise<UmpireSZScore> {
  if (!mainUmpireName) {
    return { homeAdj: 0, awayAdj: 0, reason: '주심 정보 결측 (league avg)' };
  }

  // umpire_stats DB lookup — 결측 시 silent fallback (sample_n=0 league avg)
  const { data, error } = await db
    .from('umpire_stats')
    .select('name, sz_widen_pct, sample_n')
    .eq('name', mainUmpireName)
    .maybeSingle<UmpireStatsRow>();

  if (error) {
    // DB error 는 silent skip 금지 — 호출자가 catch → silent-drift-alert wiring 의무
    throw new Error(`umpire_stats lookup error: ${error.message}`);
  }

  if (!data || data.sample_n < UMPIRE_SAMPLE_THRESHOLD) {
    const n = data?.sample_n ?? 0;
    return {
      homeAdj: 0,
      awayAdj: 0,
      reason: `주심 ${mainUmpireName} 표본 ${n}/${UMPIRE_SAMPLE_THRESHOLD} (league avg)`,
    };
  }

  return scoreUmpireSZFromRow(data);
}

/**
 * DB row 직접 → adj. 테스트 + 외부 caching pipeline 재사용 path.
 * production weight 0 이라 effect 0. shadow cohort 에서 weight>0 시 발현.
 */
export function scoreUmpireSZFromRow(row: UmpireStatsRow): UmpireSZScore {
  const widen = row.sz_widen_pct;
  if (widen === 0) {
    return {
      homeAdj: 0,
      awayAdj: 0,
      reason: `주심 ${row.name} SZ 중립 (n=${row.sample_n})`,
    };
  }

  const adj = widen > 0 ? SZ_OFFENSE_BOOST : SZ_OFFENSE_SUPPRESS;
  const direction = widen > 0 ? '넓음 (타자 친화)' : '좁음 (투수 친화)';
  return {
    homeAdj: adj,
    awayAdj: adj,
    reason: `주심 ${row.name} SZ ${direction} ${widen}% (n=${row.sample_n})`,
  };
}

/**
 * scoreUmpireSZ → predictor factor [0, 1] 변환.
 *
 * 현 buildouts 양팀 adj 가 동일 (symmetric) → factor = 0.5 (neutral).
 * 좌우타 SZ 차이 / 라인업 K% 도입 시 (homeAdj - awayAdj) 기반 분기.
 */
export function umpireSZFactor(score: UmpireSZScore): number {
  const diff = score.homeAdj - score.awayAdj;
  return Math.max(0, Math.min(1, 0.5 + diff));
}
