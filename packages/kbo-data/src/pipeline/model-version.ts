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
  | 'v1.7-revert';
export type DebateVersion = 'v2-persona4' | 'v2-postview' | null;

export interface ModelVersionDecision {
  model_version: ModelVersion;
  debate_version: DebateVersion;
}

export function decideModelVersion({
  hasApiKey,
  debateSucceeded,
}: {
  hasApiKey: boolean;
  debateSucceeded: boolean;
}): ModelVersionDecision {
  if (hasApiKey && debateSucceeded) {
    return { model_version: 'v2.0-debate', debate_version: 'v2-persona4' };
  }
  return { model_version: 'v1.8', debate_version: null };
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
    return { model_version: 'v2.0-postview', debate_version: 'v2-postview' };
  }
  return { model_version: 'v1.8-postview', debate_version: null };
}
