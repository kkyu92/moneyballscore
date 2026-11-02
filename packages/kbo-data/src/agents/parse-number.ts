/**
 * LLM JSON 필드 → 유한 숫자. Number(null) === 0 / Number('') === 0 이라
 * null·빈 문자열이 유효 0 으로 오인되지 않게 NaN 반환 (호출부가 DEFAULT 처리).
 */
export function toFiniteNumber(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string' && raw.trim() !== '') return Number(raw);
  return NaN;
}
