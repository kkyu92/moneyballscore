import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MIN_TEAM_PREDICTIONS } from '@moneyball/shared';

// wave-2463: accuracy/page.tsx 팀별 예측 성과 섹션(샘플 부족 표시 / 이상치 판정 / 적중률
// 색상)이 MIN_TEAM_PREDICTIONS 미사용, 하드코딩 `3` 4곳 중복 판정 (텍스트 안내문 +
// isOutlier 판정 + 색상 조건 + 샘플 부족 게이트). MIN_TEAM_PREDICTIONS 는 dashboard/page.tsx
// TeamPerformanceChart 와 같은 값(3) 을 우연히 공유했지만 상수 변경 시 accuracy 페이지만
// stale 하게 남는 silent drift 소지 (wave-113/wave-2300 과 동일 family). review-code (heavy)
// cycle 2463.

const accuracySrc = readFileSync(join(__dirname, '../page.tsx'), 'utf8');

describe('wave-2463 — accuracy/page.tsx MIN_TEAM_PREDICTIONS 상수 swap', () => {
  it('MIN_TEAM_PREDICTIONS 값은 3 (기존 상수 유지)', () => {
    expect(MIN_TEAM_PREDICTIONS).toBe(3);
  });

  it('accuracy/page.tsx: MIN_TEAM_PREDICTIONS import 존재', () => {
    expect(accuracySrc).toContain('MIN_TEAM_PREDICTIONS');
  });

  it('accuracy/page.tsx: 팀별 성과 섹션 verifiedN 하드코딩 `3` 없음', () => {
    expect(accuracySrc).not.toContain('t.verifiedN >= 3');
    expect(accuracySrc).not.toContain('t.verifiedN < 3');
    expect(accuracySrc).toContain('t.verifiedN >= MIN_TEAM_PREDICTIONS');
    expect(accuracySrc).toContain('t.verifiedN < MIN_TEAM_PREDICTIONS');
  });
});
