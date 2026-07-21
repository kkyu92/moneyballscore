import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { readFileSync } from 'fs';
import { FACTOR_PICK_MIN_FACTORS, FACTOR_PICK_STRONG } from '@moneyball/shared';
import { buildGameOverview } from '@/lib/analysis/factor-explanations';

// wave-537 (cycle 1908): 이번 주 남은 경기 수렴 픽 카드에 buildGameOverview summary 한 줄 표시.
// UpcomingScheduledGame 인터페이스에 gameOverviewSummary 추가 + TOP픽/강수렴픽 경기에만 생성.
// wave-538 (cycle 1909): summary 생성 조건 FACTOR_PICK_MIN_FACTORS(7) → FACTOR_PICK_STRONG(8)
// — UI 표시 조건 isTopUpcomingPick||isStrongUpcomingPick 과 정합.

const PAGE_SRC = readFileSync(join(__dirname, '../../app/analysis/page.tsx'), 'utf8');

describe('wave-537 — 이번 주 남은 경기 수렴 픽 카드 buildGameOverview summary', () => {
  it('UpcomingScheduledGame: gameOverviewSummary 필드 정의됨', () => {
    expect(PAGE_SRC).toContain('gameOverviewSummary: string | null');
  });

  it('analysis/page.tsx: buildGameOverview import 추가됨', () => {
    expect(PAGE_SRC).toContain("from '@/lib/analysis/factor-explanations'");
    expect(PAGE_SRC).toContain('buildGameOverview');
  });

  it('analysis/page.tsx: FACTOR_PICK_STRONG 조건으로 summary 생성 분기 (wave-538)', () => {
    // wave-538: FACTOR_PICK_STRONG(8) = UI 표시 조건과 동일
    expect(PAGE_SRC).toContain('FACTOR_PICK_STRONG');
    expect(PAGE_SRC).toContain('gameOverviewSummary');
  });

  it('analysis/page.tsx: UI — isTopUpcomingPick/isCompleteUpcomingPick/isStrongUpcomingPick 카드에 gameOverviewSummary 렌더링', () => {
    // wave-577: 완전수렴 픽도 summary 표시 조건에 추가됨
    expect(PAGE_SRC).toContain('isTopUpcomingPick || isCompleteUpcomingPick || isStrongUpcomingPick) && g.gameOverviewSummary');
    expect(PAGE_SRC).toContain('wave-537');
  });

  it('buildGameOverview: 수렴 픽 데이터로 호출 시 summary 비어있지 않음', () => {
    const result = buildGameOverview({
      homeWinProb: 0.62,
      homeTeamName: '삼성',
      awayTeamName: 'LG',
      homeSPFip: 3.2,
      awaySPFip: 4.8,
      homeWoba: 0.340,
      awayWoba: 0.295,
      homeBullpenFip: 3.5,
      awayBullpenFip: 4.9,
      homeWar: 22.0,
      awayWar: 12.0,
      homeRecentForm: 0.72,
      awayRecentForm: 0.38,
      homeElo: 1580,
      awayElo: 1450,
    });
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('buildGameOverview: 팽팽한 경기 (homeWinProb ~0.50) — summary 반환', () => {
    const result = buildGameOverview({
      homeWinProb: 0.51,
      homeTeamName: 'KT',
      awayTeamName: '두산',
    });
    expect(typeof result.summary).toBe('string');
  });

  it('FACTOR_PICK_STRONG: 8이어야 summary 생성 조건과 일치 (wave-538 정합)', () => {
    // wave-538: summary 생성 임계 = FACTOR_PICK_STRONG (UI isTopUpcomingPick||isStrongUpcomingPick 과 일치)
    expect(FACTOR_PICK_MIN_FACTORS).toBe(7); // 일반 수렴 임계 변경 없음
    expect(FACTOR_PICK_STRONG).toBe(8);      // summary 생성 조건
  });

  it('buildGameOverview: WAR=0 (data gap) 있는 경기도 summary 반환 (wave-536 guard 연계)', () => {
    const result = buildGameOverview({
      homeWinProb: 0.57,
      homeTeamName: '롯데',
      awayTeamName: 'KT',
      homeWar: 18.0,
      awayWar: 0,  // data gap
      homeSPFip: 3.6,
      awaySPFip: 4.2,
    });
    expect(result.summary.length).toBeGreaterThan(0);
    // WAR=0 → 전력 우세 태그 없음 (wave-536 guard)
    expect(result.tags).not.toContain('롯데 전력 우세');
    expect(result.tags).not.toContain('KT 전력 우세');
  });
});
