import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ANALYSIS_SRC = readFileSync(
  join(__dirname, '../../app/analysis/page.tsx'),
  'utf8',
);

describe('explore-idea wave-313 — 이번 주 남은 경기 모델 예측 배지 + 게임 링크 (cycle 1644)', () => {
  it('UpcomingScheduledGame has modelHomeWinProb field', () => {
    expect(ANALYSIS_SRC).toContain('modelHomeWinProb: number | null');
  });

  it('eloResult query selects game_id and home_win_prob', () => {
    expect(ANALYSIS_SRC).toContain('game_id, home_elo, away_elo, home_win_prob,');
  });

  it('modelProbMap collects game_id → home_win_prob', () => {
    expect(ANALYSIS_SRC).toContain('modelProbMap');
    expect(ANALYSIS_SRC).toContain('modelProbMap.set(row.game_id, row.home_win_prob)');
    expect(ANALYSIS_SRC).toContain('modelProbMap.get(r.id) ?? null');
  });

  it('rendering uses hasModel flag for badge switching', () => {
    expect(ANALYSIS_SRC).toContain('hasModel');
    expect(ANALYSIS_SRC).toContain('mFavoredHome');
    expect(ANALYSIS_SRC).toContain('mFavoredName');
    expect(ANALYSIS_SRC).toContain('mWinPct');
  });

  it('game cards link to /analysis/game/[gameId]', () => {
    expect(ANALYSIS_SRC).toContain('href={`/analysis/game/${g.gameId}`}');
  });

  it('label shows 모델 예측 when model available, Elo 기반 otherwise', () => {
    expect(ANALYSIS_SRC).toContain("hasModel ? '모델 예측' : 'Elo 기반'");
  });

  it('Elo fallback shown when model prediction present', () => {
    expect(ANALYSIS_SRC).toContain('{hasModel && (');
    expect(ANALYSIS_SRC).toContain('Elo: {favoredName} {winPct}%');
  });
});
