import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CE_DETECT_THRESHOLD, CE_MIN_SAMPLES } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 307 — CE detection constants (cycle 1638)', () => {
  it('CE_DETECT_THRESHOLD is 0.32', () => {
    expect(CE_DETECT_THRESHOLD).toBe(0.32);
  });

  it('CE_MIN_SAMPLES is 3', () => {
    expect(CE_MIN_SAMPLES).toBe(3);
  });

  // cycle 2534: analysis/page.tsx 자체 todayData.games 평균 계산 → analysis-data.ts
  // detectSimplifiedMode() (about/predictions 와 동일 "날짜 무관 최근 예측 10건" 기준) 로 이전.
  // CE_DETECT_THRESHOLD/CE_MIN_SAMPLES 는 이제 analysis-data.ts 가 source — page.tsx 는
  // detectSimplifiedMode import + simplifiedMode 배너 렌더만 담당.
  it('analysis/page.tsx는 detectSimplifiedMode를 통해 simplifiedMode를 사용 (no hardcoded 0.32, no todayData.games 자체 평균)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/analysis/page.tsx'),
      'utf8',
    );
    expect(src).toContain('detectSimplifiedMode');
    expect(src).toContain('simplifiedMode');
    expect(src).not.toMatch(/<=\s*0\.32/);
    expect(src).not.toMatch(/>=\s*3\s*&&\s*\n.*reduce.*confidence/s);
  });

  it('analysis-data.ts의 detectSimplifiedMode가 CE_DETECT_THRESHOLD/CE_MIN_SAMPLES를 shared에서 import (no hardcoded 0.32)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/analysis/analysis-data.ts'),
      'utf8',
    );
    expect(src).toContain('CE_DETECT_THRESHOLD');
    expect(src).toContain('CE_MIN_SAMPLES');
    expect(src).toContain('@moneyball/shared');
    expect(src).toContain('export async function detectSimplifiedMode');
    expect(src).not.toMatch(/<=\s*0\.32/);
  });

  it('predictions/page.tsx imports CE_DETECT_THRESHOLD/CE_MIN_SAMPLES from shared (no hardcoded 0.32)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/predictions/page.tsx'),
      'utf8',
    );
    expect(src).toContain('CE_DETECT_THRESHOLD');
    expect(src).toContain('CE_MIN_SAMPLES');
    expect(src).toContain('@moneyball/shared');
    expect(src).not.toMatch(/<=\s*0\.32/);
  });

  it('predictions/[date]/page.tsx imports CE_DETECT_THRESHOLD/CE_MIN_SAMPLES from shared (no hardcoded 0.32)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/predictions/[date]/page.tsx'),
      'utf8',
    );
    expect(src).toContain('CE_DETECT_THRESHOLD');
    expect(src).toContain('CE_MIN_SAMPLES');
    expect(src).toContain('@moneyball/shared');
    expect(src).not.toMatch(/<=\s*0\.32/);
  });

  // cycle 2533: about/page.tsx FAQ 는 AI 에이전트 토론이 상시 가동 중이라 설명하지만
  // CREDIT_EXHAUSTED 시 100% quant fallback — analysis/predictions 계열과 동일 배너 부재였음.
  it('about/page.tsx imports CE_DETECT_THRESHOLD/CE_MIN_SAMPLES from shared + renders simplifiedMode banner (no hardcoded 0.32)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/about/page.tsx'),
      'utf8',
    );
    expect(src).toContain('CE_DETECT_THRESHOLD');
    expect(src).toContain('CE_MIN_SAMPLES');
    expect(src).toContain('@moneyball/shared');
    expect(src).toContain('simplifiedMode');
    expect(src).not.toMatch(/<=\s*0\.32/);
  });
});
