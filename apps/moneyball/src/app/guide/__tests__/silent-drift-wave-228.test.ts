import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const GUIDE_SRC = readFileSync(join(__dirname, '../page.tsx'), 'utf-8');

describe('silent drift wave 228 — guide page dev jargon 제거', () => {
  it('guide does not say "실측치" (dev jargon → "실제 수치")', () => {
    expect(GUIDE_SRC).not.toContain('실측치');
  });

  it('guide says "실제 수치는 /accuracy 페이지 참조"', () => {
    expect(GUIDE_SRC).toContain('실제 수치는 /accuracy 페이지 참조');
  });

  it('guide does not say "내부 메트릭" (dev jargon)', () => {
    expect(GUIDE_SRC).not.toContain('내부 메트릭');
  });

  it('guide dashboard description uses user-friendly text', () => {
    expect(GUIDE_SRC).toContain('예측 정확도 지표. 요인별 가중치.');
  });
});
