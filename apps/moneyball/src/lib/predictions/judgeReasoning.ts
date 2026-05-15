// cycle 450 fix-incident heavy — 사용자 가시 카드/패널에서 dev 용어 leak 차단.
// debate.ts pre_game fallback ("에이전트 토론 불가. 정량 모델 v1.8 결과 사용.") +
// postview.ts ("사후 분석 LLM 실패. factor 편향 기반 자동 fallback.") 사용자 카드 노출 시
// "v1.8" / "factor 편향" dev 용어 leak. UI 문구 사용자 언어 룰 (memory feedback_ui_copy_no_dev_jargon).
// DB 원본 reasoning 변경 X — observability/debug 안전. 사용자 가시 path 만 swap.

const FALLBACK_PREFIXES = ['에이전트 토론 불가', '사후 분석 LLM 실패'] as const;
export const FALLBACK_USER_TEXT =
  'AI 분석이 일시 중단되어 정량 모델 예측만 표시됩니다.';

export function isFallbackReasoning(text: string | undefined | null): boolean {
  if (!text) return false;
  const trim = text.trim();
  return FALLBACK_PREFIXES.some((p) => trim.startsWith(p));
}

export function presentJudgeReasoning(
  text: string | undefined | null,
  options: { maxLength?: number } = {},
): string | undefined {
  if (!text) return undefined;
  const trim = text.trim();
  if (!trim) return undefined;
  if (isFallbackReasoning(trim)) return FALLBACK_USER_TEXT;
  const max = options.maxLength;
  if (max && trim.length > max) return trim.slice(0, max) + '...';
  return trim;
}
