/**
 * /accuracy/shadow pair prob 추출 — silent drift fix (cycle 1013).
 *
 * 직전 path: page.tsx 가 모든 row 의 reasoning 텍스트에서 regex `/(\d{2,3})%/` 로
 * NN% 매칭 → shadow row 의 reasoning 이 `[v2.1-B-shadow quant only] ${v1.8 reasoning}`
 * 형식이라 첫 NN% 매칭이 v1.8 의 prob 이 됨 → **shadowProb === v18Prob** 으로 silent.
 * Brier delta 항상 0, accuracy delta 항상 0 으로 노출됨 (의도 == shadow vs v1.8 비교).
 *
 * 본 helper: scoring_rule 분기 — shadow row 는 stored factors JSONB 로
 * computeShadowPrediction() 재계산 (SHADOW_WEIGHTS 적용). v1.8 row 는 기존 reasoning
 * 안 regex path 유지.
 */

// kbo-data barrel 우회 — 본 barrel 안 scrapers/kbo-scraper-alert.ts 가 dynamic
// import('@sentry/nextjs') 호출. vitest static scanner 가 kbo-data package
// boundary 안에서 sentry resolve 실패 → 직접 path 로 pure 모듈 import.
import { computeShadowPrediction } from '../../../../../packages/kbo-data/src/pipeline/shadow-cohort';
import { SHADOW_SCORING_RULE } from '@moneyball/shared';

export function extractProbText(reasoning: unknown): string {
  if (typeof reasoning === 'string') return reasoning;
  if (reasoning && typeof reasoning === 'object') {
    const r = reasoning as {
      reasoning?: unknown;
      debate?: { verdict?: { reasoning?: unknown; homeWinProb?: number } };
    };
    if (typeof r.reasoning === 'string') return r.reasoning;
    const verdict = r.debate?.verdict;
    if (verdict?.homeWinProb != null && Number.isFinite(verdict.homeWinProb)) {
      const pct = Math.round(verdict.homeWinProb * 100);
      return `${pct}%`;
    }
    if (typeof verdict?.reasoning === 'string') return verdict.reasoning;
  }
  return '';
}

function probFromV18Reasoning(reasoning: unknown): number | null {
  const text = extractProbText(reasoning);
  if (!text) return null;
  const m = text.match(/(\d{2,3})%/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n < 0 || n > 100) return null;
  return n / 100;
}

/**
 * shadow / v1.8 양쪽 row 의 homeWinProb 추출.
 *
 * @param scoringRule row.scoring_rule — SHADOW_SCORING_RULE 이면 SHADOW_WEIGHTS 가중합
 * @param reasoning   row.reasoning — v1.8 path 의 regex fallback
 * @param factors     row.factors JSONB — shadow path 의 가중합 input
 */
export function pairProbForRow(
  scoringRule: string,
  reasoning: unknown,
  factors: Record<string, number> | null,
): number | null {
  if (scoringRule === SHADOW_SCORING_RULE) {
    if (!factors) return null;
    const computed = computeShadowPrediction(factors);
    return computed?.homeWinProb ?? null;
  }
  return probFromV18Reasoning(reasoning);
}
