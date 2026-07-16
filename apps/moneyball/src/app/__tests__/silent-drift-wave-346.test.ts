import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WAR_STRONG, WAR_WEAK } from '@moneyball/shared';
import { buildGameOverview, explainFactor } from '@/lib/analysis/factor-explanations';

const ROOT = join(__dirname, '../../..');
const FACTOR_EXP = join(ROOT, 'src/lib/analysis/factor-explanations.ts');
const GAME_PAGE = join(ROOT, 'src/app/analysis/game/[id]/page.tsx');

describe('silent drift wave-346 — WAR 내러티브 + 우세 태그 단일 소스 (cycle 1683)', () => {
  it('WAR_STRONG = 20.0 단일 소스 가드', () => {
    expect(WAR_STRONG).toBe(20.0);
  });

  it('WAR_WEAK = 8.0 단일 소스 가드', () => {
    expect(WAR_WEAK).toBe(8.0);
  });

  it('factor-explanations.ts: imports WAR_STRONG and WAR_WEAK from shared', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).toContain('WAR_STRONG');
    expect(src).toContain('WAR_WEAK');
  });

  it('factor-explanations.ts: no hardcoded 20.0 WAR threshold', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).not.toMatch(/>=\s*20\.0/);
    expect(src).not.toMatch(/<=\s*8\.0/);
  });

  it('explainFactor war: betterWar >= WAR_STRONG → "(강세 전력)" 포함', () => {
    const result = explainFactor({
      key: 'war',
      factorValue: 0.65,
      details: { homeWar: 25.0, awayWar: 12.0 },
      homeTeamName: '두산',
      awayTeamName: 'LG',
    });
    expect(result.narrative).toContain('강세 전력');
  });

  it('explainFactor war: worserWar <= WAR_WEAK → "(약세 전력)" 포함', () => {
    const result = explainFactor({
      key: 'war',
      factorValue: 0.35,
      details: { homeWar: 6.0, awayWar: 18.0 },
      homeTeamName: '두산',
      awayTeamName: 'LG',
    });
    expect(result.narrative).toContain('약세 전력');
  });

  it('explainFactor war: 중간 범위 → 강세/약세 qualifier 없음', () => {
    const result = explainFactor({
      key: 'war',
      factorValue: 0.6,
      details: { homeWar: 15.0, awayWar: 10.0 },
      homeTeamName: '두산',
      awayTeamName: 'LG',
    });
    expect(result.narrative).not.toContain('강세 전력');
    expect(result.narrative).not.toContain('약세 전력');
  });

  it('buildGameOverview: homeWar >= WAR_STRONG & awayWar <= WAR_WEAK → 홈팀 전력 우세 태그', () => {
    const result = buildGameOverview({
      homeWinProb: 0.55,
      homeTeamName: '두산',
      awayTeamName: 'LG',
      homeWar: 22.0,
      awayWar: 7.0,
    });
    expect(result.tags).toContain('두산 전력 우세');
  });

  it('buildGameOverview: awayWar >= WAR_STRONG & homeWar <= WAR_WEAK → 원정팀 전력 우세 태그', () => {
    const result = buildGameOverview({
      homeWinProb: 0.45,
      homeTeamName: '두산',
      awayTeamName: 'LG',
      homeWar: 6.0,
      awayWar: 21.0,
    });
    expect(result.tags).toContain('LG 전력 우세');
  });

  it('buildGameOverview: 양팀 WAR 중간 범위 → 전력 우세 태그 없음', () => {
    const result = buildGameOverview({
      homeWinProb: 0.52,
      homeTeamName: '두산',
      awayTeamName: 'LG',
      homeWar: 15.0,
      awayWar: 12.0,
    });
    expect(result.tags).not.toContain('두산 전력 우세');
    expect(result.tags).not.toContain('LG 전력 우세');
  });

  it('buildGameOverview: WAR null → 전력 우세 태그 없음 (데이터 없음)', () => {
    const result = buildGameOverview({
      homeWinProb: 0.55,
      homeTeamName: '두산',
      awayTeamName: 'LG',
    });
    expect(result.tags).not.toContain('두산 전력 우세');
    expect(result.tags).not.toContain('LG 전력 우세');
  });

  it('game/[id]/page.tsx: buildGameOverview 호출에 homeWar 전달', () => {
    const src = readFileSync(GAME_PAGE, 'utf8');
    expect(src).toContain('homeWar: preGame.home_war_total');
  });

  it('game/[id]/page.tsx: buildGameOverview 호출에 awayWar 전달', () => {
    const src = readFileSync(GAME_PAGE, 'utf8');
    expect(src).toContain('awayWar: preGame.away_war_total');
  });
});
