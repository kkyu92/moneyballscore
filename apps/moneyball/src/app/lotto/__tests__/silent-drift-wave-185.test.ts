import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LOTTO_PAGE = join(__dirname, '../page.tsx');
const METHODOLOGY_PAGE = join(__dirname, '../../lotto/methodology/page.tsx');
const ARCHIVE_LIB = join(__dirname, '../../../lib/lotto/archive.ts');

const lottoPageSrc = readFileSync(LOTTO_PAGE, 'utf8');
const methodologySrc = readFileSync(METHODOLOGY_PAGE, 'utf8');
const archiveSrc = readFileSync(ARCHIVE_LIB, 'utf8');

describe('silent drift wave 185 — lotto 50세트 hardcode → LOTTO_PICK_COUNT registry', () => {
  it('lotto/page.tsx does not hardcode "50세트" pick count', () => {
    expect(lottoPageSrc).not.toMatch(/남은 후보에서.+50세트를 확정/);
  });

  it('lotto/page.tsx imports LOTTO_PICK_COUNT from @moneyball/shared', () => {
    expect(lottoPageSrc).toMatch(/LOTTO_PICK_COUNT/);
    expect(lottoPageSrc).toMatch(/@moneyball\/shared/);
  });

  it('lotto/methodology/page.tsx does not hardcode "50세트 매칭 분포"', () => {
    expect(methodologySrc).not.toMatch(/50세트 매칭 분포/);
  });

  it('lotto/methodology/page.tsx does not hardcode "50세트 cutoff" literal', () => {
    expect(methodologySrc).not.toMatch(/— 50세트 cutoff/);
  });

  it('lotto/methodology/page.tsx does not hardcode "50세트 추천 모델 cutoff"', () => {
    expect(methodologySrc).not.toMatch(/분포\. 50세트 추천 모델/);
  });

  it('lotto/methodology/page.tsx imports LOTTO_PICK_COUNT from @moneyball/shared', () => {
    expect(methodologySrc).toMatch(/LOTTO_PICK_COUNT/);
  });

  it('lib/lotto/archive.ts does not hardcode "추첨 50세트" in fallback title', () => {
    expect(archiveSrc).not.toMatch(/추첨 50세트/);
  });

  it('lib/lotto/archive.ts uses LOTTO_PICK_COUNT in fallback title', () => {
    expect(archiveSrc).toMatch(/LOTTO_PICK_COUNT/);
  });
});
