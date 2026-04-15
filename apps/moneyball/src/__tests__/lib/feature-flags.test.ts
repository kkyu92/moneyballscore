import { describe, it, expect } from 'vitest';
import { isBigMatchEnabled } from '@/lib/feature-flags';

describe('isBigMatchEnabled', () => {
  it('env=true → true', () => {
    expect(isBigMatchEnabled({ BIGMATCH_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it('env=false → false', () => {
    expect(isBigMatchEnabled({ BIGMATCH_ENABLED: 'false' } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('env 미설정 → false (안전 기본)', () => {
    expect(isBigMatchEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('env=1 (잘못된 값) → false (string 비교)', () => {
    expect(isBigMatchEnabled({ BIGMATCH_ENABLED: '1' } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});
