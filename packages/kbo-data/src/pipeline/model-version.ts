/**
 * 예측 row 의 model_version / debate_version 결정 헬퍼.
 *
 * cycle 127 review-code (heavy) silent drift fix — daily.ts 가
 * `process.env.ANTHROPIC_API_KEY` 만 보고 'v2.0-debate' 박제하면, runDebate
 * 호출이 try/catch 에서 throw 받아 정량 fallback 으로 되돌아간 경우에도
 * model_version='v2.0-debate' / debate_version='v2-persona4' 박제됨.
 * `/debug/model-comparison` 의 v1.6-pure vs v2.0-debate Brier 대조에서 debate
 * 실패 row 가 v2.0-debate 라벨에 묻혀 분류 오류.
 *
 * 본 헬퍼는 "API key 존재 + debate 호출 성공 (throw X)" 두 조건 모두 충족
 * 시에만 v2.0-debate 박제. 하나라도 X 면 v1.8 (정량 모델 fallback, cycle 335).
 * 과거 v1.7-revert row 는 DB 에 그대로 유지됨 — cycle 335 이전 데이터.
 */

export type ModelVersion =
  | 'v2.0-debate'
  | 'v2.0-postview'
  | 'v1.8'
  | 'v1.8-postview'
  | 'v1.8-live'
  | 'v1.7-revert'
  | 'v1.7-revert-live';
export type DebateVersion = 'v2-persona4' | 'v2-postview' | null;
export type ScoringRule = 'v1.5' | 'v1.6' | 'v1.7-revert' | 'v1.8';

/**
 * 현 가중치 버전. scoring_rule 단일 source — daily / live / postview 3-path 가
 * 본 상수를 import 하여 박제 (cycle 445 review-code heavy 통합).
 *
 * cycle 443 까지 3-path 모두 `'v1.8'` 하드코드 → v2.0 가중치 upgrade 시 동시
 * 수정 누락 위험 (cycle 420 family — pre_game v1.8 전환 시 live 누락 패턴).
 * 본 상수 통합으로 향후 가중치 변경은 1곳만 수정 → /accuracy + /debug 의
 * scoring_rule 별 Brier 분석 분류 안정.
 */
export const CURRENT_SCORING_RULE: ScoringRule = 'v1.8';

export interface ModelVersionDecision {
  model_version: ModelVersion;
  debate_version: DebateVersion;
  scoring_rule: ScoringRule;
}

export function decideModelVersion({
  hasApiKey,
  debateSucceeded,
}: {
  hasApiKey: boolean;
  debateSucceeded: boolean;
}): ModelVersionDecision {
  if (hasApiKey && debateSucceeded) {
    return {
      model_version: 'v2.0-debate',
      debate_version: 'v2-persona4',
      scoring_rule: CURRENT_SCORING_RULE,
    };
  }
  return {
    model_version: 'v1.8',
    debate_version: null,
    scoring_rule: CURRENT_SCORING_RULE,
  };
}

/**
 * cycle 384 fix-incident heavy — postview path model_version 결정.
 *
 * pre_game path 의 decideModelVersion 카운터파트. ANTHROPIC credit 소진 시
 * postview 의 모든 에이전트가 fallback → 그럼에도 mv='v2.0-postview' 라벨
 * 박제되던 silent drift 차단. agentsFailed=true 면 'v1.8-postview' 강등.
 *
 * /accuracy + /debug/model-comparison 의 mv 별 Brier 분석에서 LLM 토론
 * 실패 row 가 v2.0-postview 라벨에 묻혀 분류 오류 차단.
 */
export function decidePostviewModelVersion({
  hasApiKey,
  agentsSucceeded,
}: {
  hasApiKey: boolean;
  agentsSucceeded: boolean;
}): ModelVersionDecision {
  if (hasApiKey && agentsSucceeded) {
    return {
      model_version: 'v2.0-postview',
      debate_version: 'v2-postview',
      scoring_rule: CURRENT_SCORING_RULE,
    };
  }
  return {
    model_version: 'v1.8-postview',
    debate_version: null,
    scoring_rule: CURRENT_SCORING_RULE,
  };
}
