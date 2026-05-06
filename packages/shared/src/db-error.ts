/**
 * supabase `.error` 미체크 silent drift 가드 helper.
 *
 * cycle 143 silent drift family cleanup — 기존 `const { data } = await db.from(...)`
 * 패턴이 DB 오류 시 data=null silent fallback → silent drift 누적 (existingSet 빈 →
 * 중복 insert 큐, count=null → false positive GAP, summary skip 위장).
 *
 * 본 helper 는 모든 supabase select / count 응답을 단일 검증 채널로 통과시켜
 * `.error` 미체크 silent drift 를 fail-loud 로 전환.
 *
 * 위치: cycle 147 review-code (heavy) 가 buildMatchupProfile.ts 의 동일 family
 * detection 위해 shared 로 이전. apps/moneyball 과 packages/kbo-data 양쪽에서
 * 단일 helper 통과 (cross-package 일관성).
 *
 * 사례 누적:
 *  - cycle 141 (#132) updateAccuracy write 측 N+1 + `.error` 미체크
 *  - cycle 142 (#133) buildDailySummary read 측 `.error` 미체크
 *  - cycle 143 (#134) daily.ts 잔존 3개 영역 `.error` 미체크
 *  - cycle 147 (이번) buildMatchupProfile.ts teamRows + games select `.error` 미체크
 */

export interface SelectResult<T> {
  data?: T | null;
  count?: number | null;
  error: { message: string } | null;
}

/**
 * supabase select / count 응답의 `.error` 검증.
 * error 존재 시 명시적 throw (호출 site 가 catch 또는 errors[] push 결정).
 *
 * `data` (또는 `count` head:true 모드) 그대로 반환. data null 은 정상 케이스
 * (예: maybeSingle 빈 row) 라 nullable.
 */
export function assertSelectOk<T>(
  result: SelectResult<T>,
  context: string,
): { data: T | null; count: number | null } {
  if (result.error) {
    throw new Error(`${context} select failed: ${result.error.message}`);
  }
  return {
    data: result.data ?? null,
    count: result.count ?? null,
  };
}
