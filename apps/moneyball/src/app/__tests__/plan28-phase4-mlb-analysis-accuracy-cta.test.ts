import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// plan #28 Phase 4 (cycle 2320, explore-idea heavy) — 시즌 성과 + 적중 기록 CTA 카드
// 임베드. buildMlbAccuracySummary (/mlb/accuracy 가 이미 쓰는 함수) 재사용, 재구현 X.

const page = readFileSync(
  path.resolve(__dirname, '../mlb/analysis/page.tsx'),
  'utf8',
);

describe('plan #28 Phase 4 — /mlb/analysis MLB AI 적중 기록 CTA', () => {
  it('buildMlbAccuracySummary 재사용 (재구현 X)', () => {
    expect(page).toContain("from \"@/lib/mlb/buildMlbAccuracySummary\"");
    expect(page).toContain('buildMlbAccuracySummary(');
    expect(page).not.toContain('function buildMlbAccuracySummary');
  });

  it('/mlb/accuracy 로 링크 배선', () => {
    expect(page).toContain('href="/mlb/accuracy"');
  });

  it('accuracyRate 0~1 스케일 * 100 렌더 (다른 컴포넌트와 동일 스케일 규칙)', () => {
    expect(page).toContain('accuracySummary.accuracyRate * 100');
  });

  it('시즌 누적 verifiedN/correctN 카운트 노출', () => {
    expect(page).toContain('accuracySummary.verifiedN');
    expect(page).toContain('accuracySummary.correctN');
  });
});
