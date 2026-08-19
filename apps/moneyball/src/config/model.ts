/**
 * 공개 성과 지표의 모집단 기준.
 *
 * /dashboard와 /analysis가 공통으로 이 필터를 사용해 "현재 운영 중인 시스템"의
 * 성과만 보여준다. 과거 버전 데이터는 /archive 같은 별도 페이지로 분리한다.
 *
 * wave-656: `debate_version` 기준 → `scoring_rule` 기준으로 정정. CE
 * (CREDIT_EXHAUSTED) fallback row 는 `debate_version=null`(decideModelVersion,
 * model-version.ts) 이라 구 필터가 실측으로 143/316건만 통과시키고 최신
 * verified_at 이 2026-07-01 에 고정 — CE 100% 지속(2026-06-06~) 이후 7주+
 * 누적된 실제 신규 검증 결과가 /accuracy·/dashboard·/analysis 등 CURRENT_MODEL_FILTER
 * 사용처 전체(14개 파일)에서 조용히 빠져 있었음(silent drift, DB 실측 확인).
 * `scoring_rule`(decideModelVersion 이 성공/실패 양쪽 분기 모두 CURRENT_SCORING_RULE
 * 박제)은 CE row 도 포함해 실측 291/316건 + 최신 verified_at 2026-08-18 로 회복.
 * shared/model-version-labels.ts 의 "baseline 분석은 CURRENT_SCORING_RULE 만
 * 사용" 문서화된 의도(line ~56)와도 일치 — 본 fix 는 신규 설계가 아니라 기존
 * 문서 스펙에 구현을 정합. buildEloTrend.ts(wave-241)가 동일 클래스 버그를
 * 이미 한 곳에서 고쳤으나 CURRENT_MODEL_FILTER 자체엔 전파되지 않았던 사례.
 *
 * 버전 전환 시 체크리스트:
 *   1. shared CURRENT_SCORING_RULE 값 변경 (예: 'v1.8' → 'v1.9')
 *   2. 이전 버전을 보존할 /archive/[version] 또는 블로그 포스트 작성
 *   3. CHANGELOG에 "성과 집계 모수 리셋" 명시
 *
 */
import { DEBATE_VERSION_PREGAME, CURRENT_SCORING_RULE } from '@moneyball/shared';

export const CURRENT_DEBATE_VERSION = DEBATE_VERSION_PREGAME;

/**
 * Supabase 쿼리 필터로 바로 spread 가능한 형태.
 *   supabase.from('predictions').match(CURRENT_MODEL_FILTER)
 */
export const CURRENT_MODEL_FILTER = {
  scoring_rule: CURRENT_SCORING_RULE,
} as const;
