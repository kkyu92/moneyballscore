import { describe, it, expect } from 'vitest';
import { parseScore } from '../scrapers/kbo-official';

describe('parseScore', () => {
  it('빈 문자열/공백/null/비정상 값은 undefined (0 으로 coerce 금지)', () => {
    for (const v of ['', '  ', null, undefined, 'abc', NaN]) expect(parseScore(v)).toBeUndefined();
  });
  it('정상 0 / 숫자 문자열은 유지', () => {
    expect(parseScore('0')).toBe(0);
    expect(parseScore(0)).toBe(0);
    expect(parseScore('7')).toBe(7);
  });
});
