/**
 * 공개 성과 지표의 모집단 기준.
 *
 * /dashboard와 /analysis가 공통으로 이 필터를 사용해 "현재 운영 중인 시스템"의
 * 성과만 보여준다. 버전 업 시 shared/model-version-labels.ts 의
 * DEBATE_VERSION_PREGAME 1줄만 바꾸면 본 상수 + kbo-data PERSONA_VERSION +
 * decideModelVersion 4곳 동시 박제. 과거 버전 데이터는 /archive 같은 별도
 * 페이지로 분리한다.
 *
 * 버전 전환 시 체크리스트:
 *   1. shared DEBATE_VERSION_PREGAME 값 변경 (예: 'v2-persona4' → 'v2-persona5')
 *   2. 이전 버전을 보존할 /archive/[version] 또는 블로그 포스트 작성
 *   3. CHANGELOG에 "성과 집계 모수 리셋" 명시
 *
 * cycle 479 review-code heavy — debate_version literal 단일 source 통합
 * (silent drift family streak 24 cycle 째).
 */
import { DEBATE_VERSION_PREGAME } from '@moneyball/shared';

export const CURRENT_DEBATE_VERSION = DEBATE_VERSION_PREGAME;

/**
 * Supabase 쿼리 필터로 바로 spread 가능한 형태.
 *   supabase.from('predictions').match(CURRENT_MODEL_FILTER)
 */
export const CURRENT_MODEL_FILTER = {
  debate_version: CURRENT_DEBATE_VERSION,
} as const;
