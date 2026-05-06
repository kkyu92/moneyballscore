import { describe, expect, it } from 'vitest';
import {
  buildSummaryPredictions,
  type SummaryRow,
} from '../pipeline/daily-summary';

describe('buildSummaryPredictions — cycle 142 silent drift 가드', () => {
  it('정상 row 매핑 — homeTeam/awayTeam/predictedWinner/confidence/homeWinProb 박제', () => {
    const rows: SummaryRow[] = [
      {
        confidence: 0.62,
        reasoning: { homeWinProb: 0.6 },
        winner: { code: 'LG' },
        game: {
          home_team: { code: 'LG' },
          away_team: { code: 'OB' },
        },
      },
    ];
    const result = buildSummaryPredictions(rows);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      homeTeam: 'LG',
      awayTeam: 'OB',
      predictedWinner: 'LG',
      confidence: 0.62,
      homeWinProb: 0.6,
    });
  });

  it('reasoning.homeWinProb 누락 시 0.5 fallback (debate fail / zero-weight 안전)', () => {
    const rows: SummaryRow[] = [
      {
        confidence: 0.55,
        reasoning: {},
        winner: { code: 'KT' },
        game: {
          home_team: { code: 'KT' },
          away_team: { code: 'SK' },
        },
      },
    ];
    const result = buildSummaryPredictions(rows);
    expect(result[0].homeWinProb).toBe(0.5);
  });

  it('reasoning null 시 0.5 fallback', () => {
    const rows: SummaryRow[] = [
      {
        confidence: 0.5,
        reasoning: null,
        winner: { code: 'NC' },
        game: {
          home_team: { code: 'NC' },
          away_team: { code: 'KIA' },
        },
      },
    ];
    const result = buildSummaryPredictions(rows);
    expect(result[0].homeWinProb).toBe(0.5);
  });

  it('confidence null 시 0 fallback (NaN 박제 차단)', () => {
    const rows: SummaryRow[] = [
      {
        confidence: null,
        reasoning: { homeWinProb: 0.55 },
        winner: { code: 'SS' },
        game: {
          home_team: { code: 'SS' },
          away_team: { code: 'HT' },
        },
      },
    ];
    const result = buildSummaryPredictions(rows);
    expect(result[0].confidence).toBe(0);
  });

  it('빈 배열 input 시 빈 배열 output (silent drift 가드 시 호출 측 length===0 가드 발화)', () => {
    expect(buildSummaryPredictions([])).toEqual([]);
  });

  it('5경기 일관 매핑 — 모든 row 정상 변환', () => {
    const rows: SummaryRow[] = Array.from({ length: 5 }, (_, i) => ({
      confidence: 0.5 + i * 0.05,
      reasoning: { homeWinProb: 0.55 + i * 0.02 },
      winner: { code: 'LG' },
      game: {
        home_team: { code: 'LG' },
        away_team: { code: 'OB' },
      },
    }));
    const result = buildSummaryPredictions(rows);
    expect(result).toHaveLength(5);
    expect(result.every((r) => r.homeTeam === 'LG' && r.awayTeam === 'OB')).toBe(true);
  });
});
