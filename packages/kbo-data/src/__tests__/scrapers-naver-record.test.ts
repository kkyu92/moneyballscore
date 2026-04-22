import { describe, it, expect } from 'vitest';
import {
  toNaverGameId,
  parseInnings,
  parseNaverRecord,
  summarizePitching,
  summarizeBatting,
} from '../scrapers/naver-record';

describe('toNaverGameId', () => {
  it('extends 13-char external_game_id with season', () => {
    expect(toNaverGameId('20260421HHLG0', 2026)).toBe('20260421HHLG02026');
  });

  it('passes through 17-char ID', () => {
    expect(toNaverGameId('20260421HHLG02026', 2026)).toBe('20260421HHLG02026');
  });

  it('throws on unexpected length', () => {
    expect(() => toNaverGameId('too short', 2026)).toThrow();
  });
});

describe('parseInnings', () => {
  it('parses whole innings', () => {
    expect(parseInnings('5')).toBe(5);
    expect(parseInnings('7')).toBe(7);
  });

  it('parses unicode fractions', () => {
    expect(parseInnings('3 ⅔')).toBeCloseTo(3.6667, 3);
    expect(parseInnings('6 ⅓')).toBeCloseTo(6.3333, 3);
  });

  it('handles fraction only', () => {
    expect(parseInnings('⅓')).toBeCloseTo(0.3333, 3);
    expect(parseInnings('⅔')).toBeCloseTo(0.6667, 3);
  });

  it('returns NaN for empty or invalid', () => {
    expect(parseInnings('')).toBeNaN();
    expect(parseInnings('abc')).toBeNaN();
  });
});

describe('parseNaverRecord', () => {
  it('extracts boxscore arrays from full response', () => {
    const json = {
      code: 200,
      success: true,
      result: {
        recordData: {
          gameInfo: {
            statusCode: 'RESULT',
            hCode: 'LG',
            aCode: 'HH',
            gdate: '20260421',
          },
          scoreBoard: {
            rheb: {
              home: { r: 6, h: 5, e: 2, b: 6 },
              away: { r: 5, h: 7, e: 1, b: 3 },
            },
            inn: {
              home: [0, 0, 0, 5, 0, 0, 1, 0],
              away: [0, 0, 0, 0, 1, 0, 4, 0, 0],
            },
          },
          pitchersBoxscore: {
            home: [{ name: 'A', inn: '5', bf: 22, pcode: '1' } as unknown],
            away: [{ name: 'B', inn: '3 ⅔', bf: 18, pcode: '2' } as unknown],
          },
          battersBoxscore: {
            home: [{ name: 'X', ab: 4, hit: 2 } as unknown],
            away: [{ name: 'Y', ab: 5, hit: 3 } as unknown],
          },
          pitchingResult: [
            { pCode: '1', name: 'A', wls: 'W', w: 1, l: 0, s: 0 },
          ],
        },
      },
    };
    const rec = parseNaverRecord(json);
    expect(rec).not.toBeNull();
    expect(rec!.statusCode).toBe('RESULT');
    expect(rec!.pitchersHome).toHaveLength(1);
    expect(rec!.pitchersAway).toHaveLength(1);
    expect(rec!.battersHome).toHaveLength(1);
    expect(rec!.battersAway).toHaveLength(1);
    expect(rec!.pitchingResult).toHaveLength(1);
    expect(rec!.scoreBoard?.rheb.home.r).toBe(6);
  });

  it('returns null when recordData missing', () => {
    expect(parseNaverRecord({})).toBeNull();
    expect(parseNaverRecord({ result: {} })).toBeNull();
  });

  it('defaults missing arrays to []', () => {
    const json = { result: { recordData: { gameInfo: { statusCode: 'BEFORE' } } } };
    const rec = parseNaverRecord(json);
    expect(rec!.pitchersHome).toEqual([]);
    expect(rec!.battersAway).toEqual([]);
    expect(rec!.statusCode).toBe('BEFORE');
  });
});

describe('summarizePitching / summarizeBatting', () => {
  it('aggregates pitcher totals', () => {
    const pitchers = [
      {
        name: 'A', pcode: '1', tb: 'B', inn: '5', bf: 22, pa: 22, ab: 20,
        hit: 5, hr: 0, kk: 3, bb: 1, bbhp: 1, r: 1, er: 1, era: '2.50',
        wls: '', w: 0, l: 0, s: 0, gameCount: 4, seasonWin: 0, seasonLose: 0,
        hasPlayerEnd: true,
      },
      {
        name: 'B', pcode: '2', tb: 'B', inn: '3 ⅔', bf: 15, pa: 16, ab: 14,
        hit: 3, hr: 1, kk: 4, bb: 1, bbhp: 0, r: 2, er: 2, era: '3.00',
        wls: '', w: 0, l: 0, s: 0, gameCount: 5, seasonWin: 0, seasonLose: 0,
        hasPlayerEnd: true,
      },
    ];
    const s = summarizePitching(pitchers);
    expect(s.totalPitchers).toBe(2);
    expect(s.totalBF).toBe(37);
    expect(s.totalInnings).toBeCloseTo(5 + 3.6667, 3);
  });

  it('aggregates batter totals', () => {
    const batters = [
      {
        name: 'X', playerCode: '1', batOrder: 1, pos: '중', ab: 4, hit: 2,
        hr: 1, run: 1, bb: 0, kk: 1, sb: 0, hra: '0.300',
        hasPlayerEnd: true,
      },
      {
        name: 'Y', playerCode: '2', batOrder: 2, pos: '우', ab: 3, hit: 0,
        hr: 0, run: 0, bb: 2, kk: 2, sb: 1, hra: '0.250',
        hasPlayerEnd: true,
      },
    ];
    const s = summarizeBatting(batters);
    expect(s.totalBatters).toBe(2);
    expect(s.totalAB).toBe(7);
    expect(s.totalHits).toBe(2);
    expect(s.totalHR).toBe(1);
    expect(s.totalK).toBe(3);
    expect(s.totalBB).toBe(2);
  });
});
