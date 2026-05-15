/**
 * 예측 row 의 model_version / debate_version 결정 헬퍼.
 *
 * cycle 127 review-code (heavy) silent drift fix — daily.ts 가
 * `process.env.ANTHROPIC_API_KEY` 만 보고 LLM_DEBATE_VERSION 박제하면, runDebate
 * 호출이 try/catch 에서 throw 받아 정량 fallback 으로 되돌아간 경우에도
 * model_version=LLM_DEBATE_VERSION / debate_version='v2-persona4' 박제됨.
 * `/debug/model-comparison` 의 v1.6-pure vs LLM_DEBATE_VERSION Brier 대조에서 debate
 * 실패 row 가 LLM_DEBATE_VERSION 라벨에 묻혀 분류 오류.
 *
 * 본 헬퍼는 "API key 존재 + debate 호출 성공 (throw X)" 두 조건 모두 충족
 * 시에만 v2.0-debate 박제. 하나라도 X 면 QUANT_PREGAME_VERSION (정량 모델
 * fallback, cycle 335). 과거 v1.7-revert row 는 DB 에 그대로 유지됨.
 *
 * cycle 448 review-code heavy — model_version / scoring_rule 라벨 단일 source 를
 * @moneyball/shared 로 이동. apps/moneyball 의 buildAccuracyData 도 동일 source
 * 참조. CURRENT_SCORING_RULE 1줄 변경 = 4곳 (kbo-data pre_game / postview / live
 *  + apps/moneyball accuracy FALLBACK_VERSIONS) 동시 박제.
 */

import {
  CURRENT_SCORING_RULE,
  QUANT_PREGAME_VERSION,
  QUANT_POSTVIEW_VERSION,
  LLM_DEBATE_VERSION,
  LLM_POSTVIEW_VERSION,
  type ModelVersion,
  type DebateVersion,
  type ScoringRule,
} from '@moneyball/shared';

export {
  CURRENT_SCORING_RULE,
  QUANT_PREGAME_VERSION,
  QUANT_POSTVIEW_VERSION,
  QUANT_LIVE_VERSION,
  LLM_DEBATE_VERSION,
  LLM_POSTVIEW_VERSION,
  LLM_ACTIVE_VERSIONS,
} from '@moneyball/shared';
export type { ModelVersion, DebateVersion, ScoringRule } from '@moneyball/shared';

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
      model_version: LLM_DEBATE_VERSION,
      debate_version: 'v2-persona4',
      scoring_rule: CURRENT_SCORING_RULE,
    };
  }
  return {
    model_version: QUANT_PREGAME_VERSION,
    debate_version: null,
    scoring_rule: CURRENT_SCORING_RULE,
  };
}

/**
 * cycle 384 fix-incident heavy — postview path model_version 결정.
 *
 * pre_game path 의 decideModelVersion 카운터파트. ANTHROPIC credit 소진 시
 * postview 의 모든 에이전트가 fallback → 그럼에도 mv=LLM_POSTVIEW_VERSION 라벨
 * 박제되던 silent drift 차단. agentsFailed=true 면 QUANT_POSTVIEW_VERSION 강등.
 *
 * /accuracy + /debug/model-comparison 의 mv 별 Brier 분석에서 LLM 토론
 * 실패 row 가 LLM_POSTVIEW_VERSION 라벨에 묻혀 분류 오류 차단.
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
      model_version: LLM_POSTVIEW_VERSION,
      debate_version: 'v2-postview',
      scoring_rule: CURRENT_SCORING_RULE,
    };
  }
  return {
    model_version: QUANT_POSTVIEW_VERSION,
    debate_version: null,
    scoring_rule: CURRENT_SCORING_RULE,
  };
}
