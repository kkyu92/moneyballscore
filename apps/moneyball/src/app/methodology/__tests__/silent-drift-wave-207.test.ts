import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const METHODOLOGY_PATH = join(__dirname, '../page.tsx');
const ABOUT_PATH = join(__dirname, '../../about/page.tsx');
const METHODOLOGY_SRC = readFileSync(METHODOLOGY_PATH, 'utf8');
const ABOUT_SRC = readFileSync(ABOUT_PATH, 'utf8');

describe('silent drift wave 207 — methodology + about "재조정" stale claim → v1.8 유지 확정 정합', () => {
  it('methodology intro does not say "표본이 쌓이면 가중치를 재조정합니다"', () => {
    expect(METHODOLOGY_SRC).not.toMatch(/표본이\s*쌓이면\s*가중치를\s*재조정합니다/);
  });

  it('methodology intro reflects v1.8 confirmed threshold', () => {
    expect(METHODOLOGY_SRC).toMatch(/V2_PROMOTION_COHORT_N.*검증 표본 임계 달성/);
  });

  it('methodology intro reflects v1.8 유지 확정', () => {
    expect(METHODOLOGY_SRC).toMatch(/v1\.8\s*유지\s*확정/);
  });

  it('about page does not say "1개월 운영 측정에서 가중치를 재조정해"', () => {
    expect(ABOUT_SRC).not.toMatch(/1개월\s*운영\s*측정에서\s*가중치를\s*재조정해/);
  });

  it('about page reflects v1.8 confirmed threshold', () => {
    expect(ABOUT_SRC).toMatch(/V2_PROMOTION_COHORT_N.*검증 표본 임계 달성/);
  });

  it('about page reflects v1.8 유지 확정', () => {
    expect(ABOUT_SRC).toMatch(/v1\.8\s*유지\s*확정/);
  });
});
