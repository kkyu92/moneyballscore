import { describe, it, expect } from 'vitest';
import { SITE_URL } from '../index';

describe('SITE_URL registry pin', () => {
  it('prod URL invariant — 변경 시 sitemap/robots/canonical/og/json-ld/telegram 전 surface 갱신 영향', () => {
    expect(SITE_URL).toBe('https://moneyballscore.vercel.app');
  });

  it('no trailing slash — `${SITE_URL}/path` 사용 안전', () => {
    expect(SITE_URL.endsWith('/')).toBe(false);
  });
});
