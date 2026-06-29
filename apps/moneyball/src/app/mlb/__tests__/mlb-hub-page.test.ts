import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MLB_FACTOR_COUNTS } from '@moneyball/kbo-data';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function src(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}

// silent drift family wave 72 — hub page (ko + en) "KBO 10 + Statcast 4" / "14팩터"
// hardcoded → MLB_FACTOR_COUNTS. shape 변경 시 텍스트 mismatch 차단.
describe('/mlb (ko) hub — MLB_FACTOR_COUNTS registry usage', () => {
  const PAGE = src('page.tsx');

  it('imports MLB_FACTOR_COUNTS from @moneyball/kbo-data', () => {
    expect(PAGE).toMatch(/MLB_FACTOR_COUNTS/);
    expect(PAGE).toMatch(/@moneyball\/kbo-data/);
  });

  it('TOTAL/KBO_N/STAT_N const derived from registry', () => {
    expect(PAGE).toMatch(/TOTAL\s*=\s*MLB_FACTOR_COUNTS\.total/);
    expect(PAGE).toMatch(/KBO_N\s*=\s*MLB_FACTOR_COUNTS\.kbo/);
    expect(PAGE).toMatch(/STAT_N\s*=\s*MLB_FACTOR_COUNTS\.statcast/);
  });

  it('no hardcoded "14팩터" / "KBO 10 + Statcast 4" outside template literals', () => {
    // hardcoded "14팩터" 형태 (template literal ${...}팩터 는 OK)
    expect(PAGE).not.toMatch(/[^{]14팩터/);
    expect(PAGE).not.toMatch(/KBO 10 \+ Statcast 4/);
  });
});

describe('/mlb/opengraph-image + twitter-image — MLB_FACTOR_COUNTS', () => {
  const OG = src('opengraph-image.tsx');
  const TW = src('twitter-image.tsx');

  it('opengraph imports MLB_FACTOR_COUNTS', () => {
    expect(OG).toMatch(/MLB_FACTOR_COUNTS/);
    expect(OG).toMatch(/@moneyball\/kbo-data/);
    expect(OG).not.toMatch(/14-factor model/);
  });

  it('twitter imports MLB_FACTOR_COUNTS', () => {
    expect(TW).toMatch(/MLB_FACTOR_COUNTS/);
    expect(TW).toMatch(/@moneyball\/kbo-data/);
    expect(TW).not.toMatch(/14-factor model/);
  });
});

describe('mlb/page.tsx ISR literal (wave 165 guard)', () => {
  const PAGE = src('page.tsx');

  it('revalidate = 1800 literal (MLB_LIVE_ISR_SECONDS, Turbopack static eval)', () => {
    expect(PAGE).toMatch(/export const revalidate = 1800\b/);
    expect(PAGE).not.toMatch(/export const revalidate = MLB_LIVE_ISR_SECONDS/);
  });

  it('ISR comment MLB_LIVE_ISR_SECONDS present', () => {
    expect(PAGE).toMatch(/revalidate = 1800.*MLB_LIVE_ISR_SECONDS/);
  });
});

describe('MLB_FACTOR_COUNTS invariant (shape lock)', () => {
  it('current shape = KBO 10 + Statcast 4 = 14 total (v1.8)', () => {
    // wave 72 시점 shape 확정. 변경 시 본 테스트 + 모든 hardcoded 텍스트 동기 확인.
    expect(MLB_FACTOR_COUNTS.kbo).toBe(10);
    expect(MLB_FACTOR_COUNTS.statcast).toBe(4);
    expect(MLB_FACTOR_COUNTS.total).toBe(14);
  });
});
