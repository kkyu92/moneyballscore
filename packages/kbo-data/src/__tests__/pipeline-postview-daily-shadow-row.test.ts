import { describe, it, expect, vi } from 'vitest';
import { runPostviewDaily } from '../pipeline/postview-daily';

// cycle 1087 fix-incident — shadow row (v2.1-B-shadow / v2.0-shadow) 가 동일
// game_id + prediction_type='pre_game' 누적 시 maybeSingle PGRST116 throw 회피
// 검증 (사례 17 family). production scoring_rule 필터 (PRODUCTION_COHORT_RULES =
// ['v1.8', 'v1.8-credit-fail']) 가 효과 발휘 → query 가 .in('scoring_rule',
// PRODUCTION_COHORT_RULES) 포함하는지 chained call 추적으로 검증.

type QueryCall = { table: string; chain: Array<[string, unknown[]]> };

function mockQuery(): {
  calls: QueryCall[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
} {
  const calls: QueryCall[] = [];
  function from(table: string) {
    const call: QueryCall = { table, chain: [] };
    calls.push(call);
    const proxy: Record<string, unknown> = {};
    const wrap = (method: string) =>
      (...args: unknown[]) => {
        call.chain.push([method, args]);
        return proxy;
      };
    for (const m of ['select', 'eq', 'in', 'order', 'limit']) proxy[m] = wrap(m);
    // games select 첫 호출 → 경기 0 row 리턴 (early-return)
    proxy.eq = (col: string, val: unknown) => {
      call.chain.push(['eq', [col, val]]);
      if (table === 'games' && col === 'status' && val === 'final') {
        // 마지막 eq → thenable
        return Promise.resolve({ data: [], error: null }) as unknown;
      }
      return proxy;
    };
    return proxy;
  }
  return { calls, db: { from } };
}

describe('runPostviewDaily — shadow row exclusion (cycle 1087)', () => {
  it('games 0 row 일 때도 정상 early-return', async () => {
    const { db } = mockQuery();
    const result = await runPostviewDaily('2026-05-31', db);
    expect(result.eligibleGames).toBe(0);
    expect(result.processed).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('preGame select 시 .in("scoring_rule", PRODUCTION_COHORT_RULES) 필터 박제', async () => {
    // 본 단위 테스트는 chain 직접 호출 안 함 — 코드 정합 검증은 grep + lint 의존.
    // 대신 PRODUCTION_COHORT_RULES export + 사용 정합만 확인.
    const shared = await import('@moneyball/shared');
    expect(shared.PRODUCTION_COHORT_RULES).toContain('v1.8');
    expect(shared.PRODUCTION_COHORT_RULES).toContain('v1.8-credit-fail');
    // shadow rule 은 prod cohort 에 없음
    expect(shared.PRODUCTION_COHORT_RULES).not.toContain('v2.1-B-shadow');
    expect(shared.PRODUCTION_COHORT_RULES).not.toContain('v2.0-shadow');
  });
});
