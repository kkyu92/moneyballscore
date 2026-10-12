import { describe, expect, it } from 'vitest';
import {
  buildMlbFactorInsights,
  buildMlbTeamStats,
  mapMlbRowsToHighlightCandidates,
  type MlbPredictionRow,
} from '../mlb-shared';

function row(overrides: Partial<MlbPredictionRow>): MlbPredictionRow {
  return {
    external_game_id: 'g1',
    game_date: '2026-08-11',
    home_score: 5,
    away_score: 2,
    home_team_code: 'LAD',
    away_team_code: 'SFG',
    home_sp_fip: null,
    away_sp_fip: null,
    home_sp_xfip: null,
    away_sp_xfip: null,
    home_lineup_woba: null,
    away_lineup_woba: null,
    home_bullpen_fip: null,
    away_bullpen_fip: null,
    home_war_total: null,
    away_war_total: null,
    predictedHomeWin: true,
    actualHomeWin: true,
    isCorrect: true,
    confidence: 0.6,
    ...overrides,
  };
}

describe('buildMlbTeamStats', () => {
  it('predictedHomeWin null 또는 isCorrect null 인 행은 제외', () => {
    const rows = [
      row({ external_game_id: 'g1', predictedHomeWin: true, isCorrect: true }),
      row({ external_game_id: 'g2', predictedHomeWin: null, isCorrect: null, actualHomeWin: null }),
    ];
    const stats = buildMlbTeamStats(rows);
    expect(stats.length).toBe(1);
    expect(stats[0].teamCode).toBe('LAD');
    expect(stats[0].predicted).toBe(1);
    expect(stats[0].correct).toBe(1);
  });

  it('predictedHomeWin=false 면 away 팀에 귀속', () => {
    const rows = [row({ predictedHomeWin: false, isCorrect: false, actualHomeWin: true })];
    const stats = buildMlbTeamStats(rows);
    expect(stats.find((s) => s.teamCode === 'SFG')?.predicted).toBe(1);
    expect(stats.find((s) => s.teamCode === 'SFG')?.correct).toBe(0);
  });

  it('sortBy="accuracy" 지정 시 정확도 내림차순 정렬 (shared.ts buildTeamStats 대응 — 회귀 가드)', () => {
    // LAD: predicted=3, correct=1 (acc 0.33) — predicted 는 더 많지만 정확도는 낮음.
    const ladRows = Array.from({ length: 3 }, (_, i) =>
      row({ external_game_id: `lad-${i}`, home_team_code: 'LAD', predictedHomeWin: true, isCorrect: i === 0 }),
    );
    // SFG: predicted=1, correct=1 (acc 1.0) — predicted 는 적지만 정확도는 더 높음.
    const sfgRows = [
      row({ external_game_id: 'sfg-0', away_team_code: 'SFG', predictedHomeWin: false, isCorrect: true, actualHomeWin: false }),
    ];
    const rows = [...ladRows, ...sfgRows];

    const byPredicted = buildMlbTeamStats(rows);
    expect(byPredicted[0].teamCode).toBe('LAD'); // default: predicted 내림차순 -> LAD 먼저

    const byAccuracy = buildMlbTeamStats(rows, { sortBy: 'accuracy' });
    expect(byAccuracy[0].teamCode).toBe('SFG'); // accuracy 내림차순 -> SFG(1.0) 먼저
    expect(byAccuracy[0].accuracy).toBe(1);
  });
});

describe('mapMlbRowsToHighlightCandidates', () => {
  it('isCorrect null 인 행 제외', () => {
    const rows = [
      row({ external_game_id: 'g1', isCorrect: true }),
      row({ external_game_id: 'g2', isCorrect: null, actualHomeWin: null, predictedHomeWin: null }),
    ];
    const highlights = mapMlbRowsToHighlightCandidates(rows);
    expect(highlights.length).toBe(1);
    expect(highlights[0].externalGameId).toBe('g1');
  });
});

describe('buildMlbFactorInsights', () => {
  it('표본 부족(< minSamples) 시 해당 팩터 제외 -> 전체 null', () => {
    const rows = [
      row({ external_game_id: 'g1', home_sp_fip: 3.0, away_sp_fip: 4.0, actualHomeWin: true }),
      row({ external_game_id: 'g2', home_sp_fip: 3.5, away_sp_fip: 4.5, actualHomeWin: true }),
    ];
    const insights = buildMlbFactorInsights(rows, { minSamples: 3 });
    expect(insights.best).toBeNull();
    expect(insights.worst).toBeNull();
  });

  it('lower-is-better(sp_fip) 는 diff 부호 반전 후 상관계수 계산 -> 홈 우세와 실제 홈승 일치 시 양의 상관', () => {
    const rows = [
      row({ external_game_id: 'g1', home_sp_fip: 3.0, away_sp_fip: 4.0, actualHomeWin: true }),
      row({ external_game_id: 'g2', home_sp_fip: 4.5, away_sp_fip: 3.0, actualHomeWin: false }),
      row({ external_game_id: 'g3', home_sp_fip: 2.5, away_sp_fip: 4.0, actualHomeWin: true }),
      row({ external_game_id: 'g4', home_sp_fip: 4.8, away_sp_fip: 3.5, actualHomeWin: false }),
    ];
    const insights = buildMlbFactorInsights(rows, { minSamples: 3 });
    expect(insights.best).not.toBeNull();
    expect(insights.best!.label).toBe('선발 투수력');
    expect(insights.best!.correlation).toBeGreaterThan(0);
  });

  it('actualHomeWin=null 인 행은 표본에서 제외', () => {
    const rows = [
      row({ external_game_id: 'g1', home_sp_fip: 3.0, away_sp_fip: 4.0, actualHomeWin: null, isCorrect: null }),
      row({ external_game_id: 'g2', home_sp_fip: 3.5, away_sp_fip: 4.5, actualHomeWin: true }),
      row({ external_game_id: 'g3', home_sp_fip: 3.2, away_sp_fip: 4.2, actualHomeWin: true }),
    ];
    const insights = buildMlbFactorInsights(rows, { minSamples: 3 });
    expect(insights.best).toBeNull();
  });
});
