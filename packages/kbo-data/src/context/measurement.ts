/**
 * LLM Agent 회귀 가드 + 측정 — plan #23 Step 4 (cycle 1228, 2026-06-19).
 *
 * 도입 동기:
 *   - Step 1~3 (MetricRegistry / KBO_DOMAIN_KB / AgentContext) 박제 후, 본 layer 가
 *     LLM agent 7곳에 통합 될 때 회귀 측정 필요.
 *   - plan #23 Step 4 4가지 측정 중 본 cycle 박제 대상 = (1) hallucination 비율
 *     (validation 실패율) + (2) prompt token 추정 (budget guard) 두 측정 layer.
 *   - 나머지 2가지 (pre/post Brier delta / 실제 agent 통합 후 측정) = 실측 cohort
 *     데이터 wait — 후속 cycle / 별도 plan 분리.
 *
 * 책임 분리:
 *   - 본 모듈은 측정만 — LLM 호출 X / agent 통합 X / DB 기록 X.
 *   - 호출자가 LLM 응답 텍스트 + AgentContext 를 입력 → 본 모듈이 stat 반환.
 *   - validation 검증 source-of-truth = `isMetricValueValid` (MetricRegistry 단일).
 *   - token 추정 = 한/영 혼합 baseline (1.5 chars/token) 단순 추정 — 실측 API
 *     usage 와 ±20% 오차 가능. 정확도 보장 X, budget guard 용.
 */

import { isMetricValueValid, MetricRegistry, type MetricSlug } from './metrics';
import { renderContextForLLM, type AgentContext } from './agent-context';

/**
 * LLM hallucination 측정 결과.
 *
 *   - `total` = 텍스트에서 추출 성공한 (slug, value) pair 총 수
 *   - `invalid` = `isMetricValueValid` 가 false 반환한 pair 수
 *   - `rate` = invalid / total (total=0 시 0)
 *   - `samples` = 잘못된 pair 디버그용 — slug + 추출된 값 + 원문 발췌
 */
export interface HallucinationStats {
  total: number;
  invalid: number;
  rate: number;
  samples: ReadonlyArray<{ slug: string; value: number; context: string }>;
}

/** Prompt token 추정 결과 + budget 검증. */
export interface TokenBudgetStats {
  estimated_tokens: number;
  char_count: number;
  /** Budget 임계 (기본 1200 — plan #23 Step 4 명시). */
  budget: number;
  /** estimated_tokens / budget. 1.0 초과 시 budget 위반. */
  ratio: number;
  within_budget: boolean;
}

/**
 * LLM 응답 텍스트에서 metric (slug, value) pair 추출.
 *
 * 두 가지 패턴 cover:
 *   1. 영문 slug + 숫자: `FIP=3.40` / `sp_fip: 3.40` / `elo 1560`
 *   2. 한국어 ko_name + 숫자: `선발 FIP 3.40` / `Elo 레이팅: 1560`
 *
 * 같은 slug 가 여러 번 등장 시 모두 추출 — 호출자가 home/away 구분 필요 시 추가
 * context 파싱 (본 함수는 single-pair 추출만).
 */
export function extractMetricPairsFromText(text: string): Array<{ slug: MetricSlug; value: number; context: string }> {
  const results: Array<{ slug: MetricSlug; value: number; context: string }> = [];
  const slugs = Object.keys(MetricRegistry) as MetricSlug[];

  for (const slug of slugs) {
    const def = MetricRegistry[slug];

    const slugPattern = new RegExp(
      `\\b${slug.replace(/_/g, '[_\\s]?')}\\b[\\s:=]*?(-?\\d+(?:\\.\\d+)?)`,
      'gi',
    );
    let m: RegExpExecArray | null;
    while ((m = slugPattern.exec(text)) !== null) {
      const value = Number(m[1]);
      if (Number.isFinite(value)) {
        const start = Math.max(0, m.index - 10);
        const end = Math.min(text.length, m.index + m[0].length + 10);
        results.push({ slug, value, context: text.slice(start, end).trim() });
      }
    }

    const koName = def.ko_name;
    const koEscaped = koName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const koPattern = new RegExp(`${koEscaped}[\\s:=]*?(-?\\d+(?:\\.\\d+)?)`, 'g');
    let km: RegExpExecArray | null;
    while ((km = koPattern.exec(text)) !== null) {
      const value = Number(km[1]);
      if (Number.isFinite(value)) {
        const start = Math.max(0, km.index - 10);
        const end = Math.min(text.length, km.index + km[0].length + 10);
        results.push({ slug, value, context: text.slice(start, end).trim() });
      }
    }
  }

  return results;
}

/**
 * LLM 응답 텍스트의 metric hallucination 비율 측정.
 *
 * 추출 pair 각각 `isMetricValueValid` 통과 여부 확인 → invalid rate 반환.
 * plan #23 Step 4 명시 기대치 = invalid rate < 1% (실측 cohort 후 보정 가능).
 */
export function measureHallucinations(text: string): HallucinationStats {
  const pairs = extractMetricPairsFromText(text);
  const invalid = pairs.filter((p) => !isMetricValueValid(p.slug, p.value));
  return {
    total: pairs.length,
    invalid: invalid.length,
    rate: pairs.length > 0 ? invalid.length / pairs.length : 0,
    samples: invalid.slice(0, 10),
  };
}

/**
 * 한/영 혼합 prompt token 추정.
 *
 * baseline: 한국어 1 char ≈ 1.5 token (cl100k_base tokenizer 평균) /
 * 영문 + 공백 4 char ≈ 1 token. 본 함수는 단순화 — 전체 length / 2.5 추정.
 * 실측 API usage 와 ±20% 오차 가능 (budget guard 용).
 *
 * 정확한 측정 필요 시 @anthropic-ai/tokenizer / tiktoken 도입 — 본 plan scope 외.
 */
export function estimatePromptTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 2.5);
}

/**
 * AgentContext 가 LLM prompt 안 박제 시 budget 안인지 측정.
 *
 * plan #23 Step 4 명시 budget = 1200 tokens (max ±20%). 본 함수는 budget 기본값
 * 1200 + 호출자 override 가능. 1.0 초과 시 within_budget=false → 호출자가
 * AgentContext 축소 / 도메인 hint 제한 결정.
 */
export function measureContextTokenBudget(ac: AgentContext, budget: number = 1200): TokenBudgetStats {
  const rendered = renderContextForLLM(ac);
  const estimated = estimatePromptTokens(rendered);
  return {
    estimated_tokens: estimated,
    char_count: rendered.length,
    budget,
    ratio: estimated / budget,
    within_budget: estimated <= budget,
  };
}

/**
 * 단일 judge 판정 record — pre/post context layer Brier delta 측정 입력.
 *
 * `home_win_prob` 은 home 팀 승리 확률 (0~1). judge agent 가 away 팀 픽 시
 * 호출자가 `1 - confidence` 로 변환 후 입력 — 본 모듈은 normalized 입력 가정.
 * `actual_home_win` = 실제 home 승리 여부.
 */
export interface JudgmentRecord {
  home_win_prob: number;
  actual_home_win: boolean;
}

/** 단일 cohort Brier 통계. */
export interface BrierStats {
  n: number;
  brier_mean: number;
  accuracy: number;
}

/**
 * Context Layer 도입 전후 Brier delta 측정 결과.
 *
 *   - `delta_brier` = post - pre. **음수 = post (context layer) 가 더 정확**.
 *   - `delta_accuracy` = post - pre. **양수 = post 가 더 정확**.
 *   - `improvement` = delta_brier < 0 (Brier 기준 개선).
 *   - plan #23 Step 4 기대치 = delta_brier ≤ 0 (회귀 X). 양수면 회귀 — 후속 cycle
 *     에서 context payload 축소 / agent prompt 재검토 trigger.
 */
export interface ContextLayerBrierDelta {
  pre: BrierStats;
  post: BrierStats;
  delta_brier: number;
  delta_accuracy: number;
  improvement: boolean;
}

/**
 * judge agent 판정 cohort 의 Brier mean + accuracy 측정.
 *
 * Brier = mean((home_win_prob - actual_home_win)^2). 0 = 완벽, 0.25 = 50/50 random,
 * 1 = 완벽 반대. accuracy = (# (home_win_prob >= 0.5) == actual_home_win) / n.
 * 빈 cohort = {n:0, brier_mean:0, accuracy:0} 반환 (호출자가 분모 검증).
 */
export function measureBrierStats(records: ReadonlyArray<JudgmentRecord>): BrierStats {
  if (records.length === 0) return { n: 0, brier_mean: 0, accuracy: 0 };

  let sumSq = 0;
  let correct = 0;
  for (const r of records) {
    const outcome = r.actual_home_win ? 1 : 0;
    sumSq += (r.home_win_prob - outcome) ** 2;
    const picked = r.home_win_prob >= 0.5;
    if (picked === r.actual_home_win) correct += 1;
  }
  return {
    n: records.length,
    brier_mean: sumSq / records.length,
    accuracy: correct / records.length,
  };
}

/**
 * Context Layer 도입 전후 두 cohort 비교 — pre/post Brier + accuracy delta.
 *
 * 사용 예: pre = context layer 통합 전 cycle 1228 이전 judge 판정 cohort,
 * post = cycle 1232~1234 통합 후 judge 판정 cohort. 양쪽 동일 score 산출 방식
 * (home_win_prob normalized) 가정 — 호출자가 query 시 정합 보장.
 *
 * 표본 floor 권장: pre/post 각 n ≥ 30 — 미만 시 단건 noise dominant. 본 함수는
 * floor 검증 X (pure stat) — 호출자가 사후 검증.
 */
export function measureContextLayerBrierDelta(
  pre: ReadonlyArray<JudgmentRecord>,
  post: ReadonlyArray<JudgmentRecord>,
): ContextLayerBrierDelta {
  const preStats = measureBrierStats(pre);
  const postStats = measureBrierStats(post);
  const deltaBrier = postStats.brier_mean - preStats.brier_mean;
  const deltaAccuracy = postStats.accuracy - preStats.accuracy;
  return {
    pre: preStats,
    post: postStats,
    delta_brier: deltaBrier,
    delta_accuracy: deltaAccuracy,
    improvement: deltaBrier < 0,
  };
}
