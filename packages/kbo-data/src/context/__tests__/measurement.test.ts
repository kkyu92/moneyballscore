/**
 * measurement.ts tests — plan #23 Step 4.
 *
 * 검증 축:
 *   - extractMetricPairsFromText: 영문 slug + 한국어 ko_name 양쪽 매칭
 *   - measureHallucinations: bounds 안 / 밖 / 혼합 / 빈 텍스트
 *   - estimatePromptTokens: 빈 / 한국어 / 영문 / 혼합
 *   - measureContextTokenBudget: 기본 1200 budget / override / 초과
 */

import { describe, expect, it } from 'vitest';
import {
  estimatePromptTokens,
  extractMetricPairsFromText,
  measureBrierStats,
  measureContextLayerBrierDelta,
  measureContextTokenBudget,
  measureHallucinations,
  type JudgmentRecord,
} from '../measurement';
import { buildAgentContext } from '../agent-context';
import type { GameContext } from '../../agents/types';

function makeCtx(overrides: Partial<GameContext> = {}): GameContext {
  const base: GameContext = {
    game: {
      date: '2026-06-19',
      homeTeam: 'LG',
      awayTeam: 'OB',
      gameTime: '18:30',
      stadium: '잠실',
      homeSP: '엘선발',
      awaySP: '두선발',
      status: 'scheduled',
      externalGameId: 'TEST-001',
    },
    homeSPStats: { name: '엘선발', team: 'LG', fip: 3.40, xfip: 3.80, war: 2.1, era: 3.20, innings: 80, kPer9: 8.5 },
    awaySPStats: { name: '두선발', team: 'OB', fip: 4.10, xfip: 4.20, war: 1.5, era: 4.00, innings: 75, kPer9: 7.4 },
    homeTeamStats: { team: 'LG', woba: 0.330, bullpenFip: 3.80, totalWar: 25.0, sfr: 5 },
    awayTeamStats: { team: 'OB', woba: 0.310, bullpenFip: 4.20, totalWar: 18.0, sfr: -3 },
    homeElo: { team: 'LG', elo: 1560, winPct: 0.58 },
    awayElo: { team: 'OB', elo: 1490, winPct: 0.48 },
    homeRecentForm: 0.7,
    awayRecentForm: 0.4,
    headToHead: { wins: 3, losses: 2 },
    parkFactor: 0.95,
  };
  return { ...base, ...overrides };
}

describe('extractMetricPairsFromText — 영문 slug 매칭', () => {
  it('sp_fip = 3.40 형태 추출', () => {
    const pairs = extractMetricPairsFromText('홈 sp_fip = 3.40, 원정 sp_fip = 4.10');
    const slugs = pairs.map((p) => p.slug);
    expect(slugs).toContain('sp_fip');
    expect(pairs.filter((p) => p.slug === 'sp_fip').map((p) => p.value)).toEqual(expect.arrayContaining([3.4, 4.1]));
  });

  it('elo 1560 형태 (공백 구분) 추출', () => {
    const pairs = extractMetricPairsFromText('홈 elo 1560');
    expect(pairs.some((p) => p.slug === 'elo' && p.value === 1560)).toBe(true);
  });

  it('음수 값 추출 (sfr -3)', () => {
    const pairs = extractMetricPairsFromText('수비 sfr: -3');
    expect(pairs.some((p) => p.slug === 'sfr' && p.value === -3)).toBe(true);
  });
});

describe('extractMetricPairsFromText — 한국어 ko_name 매칭', () => {
  it('선발 FIP 3.40 형태 추출', () => {
    const pairs = extractMetricPairsFromText('선발 FIP 3.40');
    expect(pairs.some((p) => p.slug === 'sp_fip' && p.value === 3.4)).toBe(true);
  });

  it('Elo 레이팅: 1560 형태 추출', () => {
    const pairs = extractMetricPairsFromText('Elo 레이팅: 1560');
    expect(pairs.some((p) => p.slug === 'elo' && p.value === 1560)).toBe(true);
  });
});

describe('extractMetricPairsFromText — 매칭 없을 때', () => {
  it('빈 텍스트', () => {
    expect(extractMetricPairsFromText('')).toEqual([]);
  });

  it('관련 없는 텍스트', () => {
    expect(extractMetricPairsFromText('오늘 날씨가 좋다')).toEqual([]);
  });
});

describe('measureHallucinations', () => {
  it('bounds 안 값만 = invalid 0', () => {
    const stats = measureHallucinations('선발 FIP 3.40, 타선 wOBA 0.330, Elo 레이팅 1560');
    expect(stats.invalid).toBe(0);
    expect(stats.rate).toBe(0);
    expect(stats.total).toBeGreaterThan(0);
  });

  it('bounds 밖 FIP=15.5 = invalid 1', () => {
    const stats = measureHallucinations('선발 FIP 15.5');
    expect(stats.invalid).toBeGreaterThanOrEqual(1);
    expect(stats.rate).toBeGreaterThan(0);
    expect(stats.samples[0]?.slug).toBe('sp_fip');
    expect(stats.samples[0]?.value).toBe(15.5);
  });

  it('bounds 밖 Elo=999 = invalid 1', () => {
    const stats = measureHallucinations('Elo 레이팅 999');
    expect(stats.invalid).toBeGreaterThanOrEqual(1);
  });

  it('빈 텍스트 = total 0, rate 0', () => {
    const stats = measureHallucinations('');
    expect(stats.total).toBe(0);
    expect(stats.invalid).toBe(0);
    expect(stats.rate).toBe(0);
  });
});

describe('estimatePromptTokens', () => {
  it('빈 텍스트 = 0', () => {
    expect(estimatePromptTokens('')).toBe(0);
  });

  it('한국어 베이스 추정 ≥1', () => {
    expect(estimatePromptTokens('안녕하세요')).toBeGreaterThanOrEqual(1);
  });

  it('영문 베이스 추정 ≥1', () => {
    expect(estimatePromptTokens('hello world')).toBeGreaterThanOrEqual(1);
  });

  it('긴 텍스트 = 더 많은 token', () => {
    const short = estimatePromptTokens('짧은 텍스트');
    const long = estimatePromptTokens('짧은 텍스트'.repeat(100));
    expect(long).toBeGreaterThan(short);
  });
});

describe('measureContextTokenBudget', () => {
  it('표준 AgentContext = budget 1200 안 (within_budget=true)', () => {
    const ac = buildAgentContext(makeCtx());
    const stats = measureContextTokenBudget(ac);
    expect(stats.budget).toBe(1200);
    expect(stats.estimated_tokens).toBeGreaterThan(0);
    expect(stats.within_budget).toBe(true);
    expect(stats.ratio).toBeLessThan(1.0);
  });

  it('budget override 가능 (= 100 → 초과)', () => {
    const ac = buildAgentContext(makeCtx());
    const stats = measureContextTokenBudget(ac, 100);
    expect(stats.budget).toBe(100);
    expect(stats.within_budget).toBe(false);
    expect(stats.ratio).toBeGreaterThan(1.0);
  });

  it('char_count ≥ estimated_tokens (대략 2.5:1)', () => {
    const ac = buildAgentContext(makeCtx());
    const stats = measureContextTokenBudget(ac);
    expect(stats.char_count).toBeGreaterThan(stats.estimated_tokens);
  });
});

describe('measureBrierStats', () => {
  it('빈 cohort → n=0 / brier=0 / acc=0', () => {
    const stats = measureBrierStats([]);
    expect(stats.n).toBe(0);
    expect(stats.brier_mean).toBe(0);
    expect(stats.accuracy).toBe(0);
  });

  it('완벽 예측 → brier=0 / acc=1', () => {
    const records: JudgmentRecord[] = [
      { home_win_prob: 1.0, actual_home_win: true },
      { home_win_prob: 0.0, actual_home_win: false },
    ];
    const stats = measureBrierStats(records);
    expect(stats.brier_mean).toBe(0);
    expect(stats.accuracy).toBe(1);
  });

  it('완벽 반대 → brier=1 / acc=0', () => {
    const records: JudgmentRecord[] = [
      { home_win_prob: 1.0, actual_home_win: false },
      { home_win_prob: 0.0, actual_home_win: true },
    ];
    const stats = measureBrierStats(records);
    expect(stats.brier_mean).toBe(1);
    expect(stats.accuracy).toBe(0);
  });

  it('50/50 random → brier=0.25 / acc 임의 (≥0.5 픽 가정)', () => {
    const records: JudgmentRecord[] = [
      { home_win_prob: 0.5, actual_home_win: true },
      { home_win_prob: 0.5, actual_home_win: false },
    ];
    const stats = measureBrierStats(records);
    expect(stats.brier_mean).toBe(0.25);
    expect(stats.accuracy).toBe(0.5);
  });

  it('혼합 cohort → mean 계산 정합', () => {
    const records: JudgmentRecord[] = [
      { home_win_prob: 0.8, actual_home_win: true }, // (0.8-1)^2 = 0.04
      { home_win_prob: 0.3, actual_home_win: false }, // (0.3-0)^2 = 0.09
      { home_win_prob: 0.6, actual_home_win: false }, // (0.6-0)^2 = 0.36 + 픽 wrong
    ];
    const stats = measureBrierStats(records);
    expect(stats.n).toBe(3);
    expect(stats.brier_mean).toBeCloseTo((0.04 + 0.09 + 0.36) / 3, 5);
    expect(stats.accuracy).toBeCloseTo(2 / 3, 5);
  });
});

describe('measureContextLayerBrierDelta', () => {
  it('post 가 더 정확 → delta_brier 음수 / improvement=true', () => {
    const pre: JudgmentRecord[] = [
      { home_win_prob: 0.6, actual_home_win: true }, // brier 0.16
      { home_win_prob: 0.4, actual_home_win: false }, // brier 0.16
    ];
    const post: JudgmentRecord[] = [
      { home_win_prob: 0.8, actual_home_win: true }, // brier 0.04
      { home_win_prob: 0.2, actual_home_win: false }, // brier 0.04
    ];
    const delta = measureContextLayerBrierDelta(pre, post);
    expect(delta.pre.brier_mean).toBeCloseTo(0.16, 5);
    expect(delta.post.brier_mean).toBeCloseTo(0.04, 5);
    expect(delta.delta_brier).toBeLessThan(0);
    expect(delta.improvement).toBe(true);
  });

  it('post 가 더 부정확 → delta_brier 양수 / improvement=false', () => {
    const pre: JudgmentRecord[] = [
      { home_win_prob: 0.9, actual_home_win: true }, // brier 0.01
    ];
    const post: JudgmentRecord[] = [
      { home_win_prob: 0.5, actual_home_win: true }, // brier 0.25
    ];
    const delta = measureContextLayerBrierDelta(pre, post);
    expect(delta.delta_brier).toBeGreaterThan(0);
    expect(delta.improvement).toBe(false);
  });

  it('accuracy delta 측정', () => {
    const pre: JudgmentRecord[] = [
      { home_win_prob: 0.6, actual_home_win: false }, // 픽 wrong
      { home_win_prob: 0.4, actual_home_win: true }, // 픽 wrong
    ];
    const post: JudgmentRecord[] = [
      { home_win_prob: 0.6, actual_home_win: true }, // 픽 right
      { home_win_prob: 0.4, actual_home_win: false }, // 픽 right
    ];
    const delta = measureContextLayerBrierDelta(pre, post);
    expect(delta.pre.accuracy).toBe(0);
    expect(delta.post.accuracy).toBe(1);
    expect(delta.delta_accuracy).toBe(1);
  });

  it('빈 양쪽 cohort → 0 stats / improvement=false (delta=0)', () => {
    const delta = measureContextLayerBrierDelta([], []);
    expect(delta.pre.n).toBe(0);
    expect(delta.post.n).toBe(0);
    expect(delta.delta_brier).toBe(0);
    expect(delta.improvement).toBe(false);
  });
});
