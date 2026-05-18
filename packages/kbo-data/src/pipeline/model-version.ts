/**
 * 예측 row 의 model_version / debate_version 결정 헬퍼.
 *
 * "API key 존재 + debate 호출 성공 (throw X)" 두 조건 모두 충족 시에만
 * LLM_DEBATE_VERSION 박제. 하나라도 X 면 QUANT_PREGAME_VERSION 정량 모델
 * fallback. debate 실패 row 가 LLM_DEBATE_VERSION 라벨에 묻혀
 * `/debug/model-comparison` Brier 분류 오류 일으키는 silent drift 차단.
 *
 * model_version / scoring_rule 라벨 단일 source = @moneyball/shared.
 * CURRENT_SCORING_RULE 1줄 변경 = 4곳 (kbo-data pre_game / postview / live +
 * apps/moneyball accuracy FALLBACK_VERSIONS) 동시 박제.
 */

import {
  CURRENT_SCORING_RULE,
  QUANT_PREGAME_VERSION,
  QUANT_POSTVIEW_VERSION,
  LLM_DEBATE_VERSION,
  LLM_POSTVIEW_VERSION,
  DEBATE_VERSION_PREGAME,
  DEBATE_VERSION_POSTVIEW,
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
  DEBATE_VERSION_PREGAME,
  DEBATE_VERSION_POSTVIEW,
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
      debate_version: DEBATE_VERSION_PREGAME,
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
 * postview path model_version 결정. decideModelVersion 의 카운터파트.
 *
 * ANTHROPIC credit 소진 시 postview 의 모든 에이전트가 fallback →
 * agentsFailed=true 면 QUANT_POSTVIEW_VERSION 강등. LLM 토론 실패 row 가
 * LLM_POSTVIEW_VERSION 라벨에 묻혀 `/accuracy` + `/debug/model-comparison` 의
 * mv 별 Brier 분류 오류 일으키는 silent drift 차단.
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
      debate_version: DEBATE_VERSION_POSTVIEW,
      scoring_rule: CURRENT_SCORING_RULE,
    };
  }
  return {
    model_version: QUANT_POSTVIEW_VERSION,
    debate_version: null,
    scoring_rule: CURRENT_SCORING_RULE,
  };
}
