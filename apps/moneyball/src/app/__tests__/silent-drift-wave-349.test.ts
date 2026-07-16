import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEAM_STRENGTH_FORM_STRONG, TEAM_STRENGTH_FORM_WEAK } from '@moneyball/shared';
import { buildGameOverview } from '@/lib/analysis/factor-explanations';

const ROOT = join(__dirname, '../../..');
const FACTOR_EXP = join(ROOT, 'src/lib/analysis/factor-explanations.ts');
const GAME_PAGE = join(ROOT, 'src/app/analysis/game/[id]/page.tsx');

describe('silent drift wave-349 — 최근 폼 태그 단일 소스 (cycle 1686)', () => {
  it('TEAM_STRENGTH_FORM_STRONG = 0.6 단일 소스 가드', () => {
    expect(TEAM_STRENGTH_FORM_STRONG).toBe(0.6);
  });

  it('TEAM_STRENGTH_FORM_WEAK = 0.4 단일 소스 가드', () => {
    expect(TEAM_STRENGTH_FORM_WEAK).toBe(0.4);
  });

  it('factor-explanations.ts: imports TEAM_STRENGTH_FORM_STRONG from shared', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).toContain('TEAM_STRENGTH_FORM_STRONG');
  });

  it('factor-explanations.ts: imports TEAM_STRENGTH_FORM_WEAK from shared', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).toContain('TEAM_STRENGTH_FORM_WEAK');
  });

  it('factor-explanations.ts: recentForm 비교에 하드코딩 0.6 없음', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).not.toMatch(/RecentForm\s*[<>]=?\s*0\.\d/);
  });

  it('factor-explanations.ts: recentForm 비교에 하드코딩 0.4 없음', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).not.toMatch(/RecentForm\s*[<>]=?\s*0\.\d/);
  });

  it('buildGameOverview: homeRecentForm >= 0.6 → 홈팀 최근 핫 태그', () => {
    const result = buildGameOverview({
      homeWinProb: 0.55,
      homeTeamName: 'KT',
      awayTeamName: 'LG',
      homeRecentForm: 0.7,
      awayRecentForm: 0.5,
    });
    expect(result.tags).toContain('KT 최근 핫');
    expect(result.tags).not.toContain('LG 최근 핫');
    expect(result.tags).not.toContain('KT 최근 부진');
  });

  it('buildGameOverview: awayRecentForm >= 0.6 → 원정팀 최근 핫 태그', () => {
    const result = buildGameOverview({
      homeWinProb: 0.45,
      homeTeamName: '두산',
      awayTeamName: '삼성',
      homeRecentForm: 0.5,
      awayRecentForm: 0.8,
    });
    expect(result.tags).toContain('삼성 최근 핫');
    expect(result.tags).not.toContain('두산 최근 핫');
  });

  it('buildGameOverview: homeRecentForm <= 0.4 → 홈팀 최근 부진 태그', () => {
    const result = buildGameOverview({
      homeWinProb: 0.45,
      homeTeamName: '롯데',
      awayTeamName: 'SSG',
      homeRecentForm: 0.3,
      awayRecentForm: 0.5,
    });
    expect(result.tags).toContain('롯데 최근 부진');
    expect(result.tags).not.toContain('SSG 최근 부진');
    expect(result.tags).not.toContain('롯데 최근 핫');
  });

  it('buildGameOverview: awayRecentForm <= 0.4 → 원정팀 최근 부진 태그', () => {
    const result = buildGameOverview({
      homeWinProb: 0.55,
      homeTeamName: 'NC',
      awayTeamName: '한화',
      homeRecentForm: 0.5,
      awayRecentForm: 0.2,
    });
    expect(result.tags).toContain('한화 최근 부진');
    expect(result.tags).not.toContain('NC 최근 부진');
  });

  it('buildGameOverview: 양팀 중간 폼 → 폼 태그 없음', () => {
    const result = buildGameOverview({
      homeWinProb: 0.5,
      homeTeamName: 'KIA',
      awayTeamName: '키움',
      homeRecentForm: 0.5,
      awayRecentForm: 0.5,
    });
    expect(result.tags).not.toContain('KIA 최근 핫');
    expect(result.tags).not.toContain('KIA 최근 부진');
    expect(result.tags).not.toContain('키움 최근 핫');
    expect(result.tags).not.toContain('키움 최근 부진');
  });

  it('buildGameOverview: form null → 폼 태그 없음 (데이터 없음)', () => {
    const result = buildGameOverview({
      homeWinProb: 0.55,
      homeTeamName: 'KT',
      awayTeamName: 'LG',
      homeRecentForm: null,
      awayRecentForm: null,
    });
    expect(result.tags.some(t => t.includes('최근'))).toBe(false);
  });

  it('buildGameOverview: 양팀 동시 핫/부진 가능', () => {
    const result = buildGameOverview({
      homeWinProb: 0.5,
      homeTeamName: '두산',
      awayTeamName: '삼성',
      homeRecentForm: 0.8,
      awayRecentForm: 0.2,
    });
    expect(result.tags).toContain('두산 최근 핫');
    expect(result.tags).toContain('삼성 최근 부진');
  });

  it('game/[id]/page.tsx: buildGameOverview 호출에 homeRecentForm 전달', () => {
    const src = readFileSync(GAME_PAGE, 'utf8');
    expect(src).toContain('homeRecentForm: preGame.home_recent_form');
  });

  it('game/[id]/page.tsx: buildGameOverview 호출에 awayRecentForm 전달', () => {
    const src = readFileSync(GAME_PAGE, 'utf8');
    expect(src).toContain('awayRecentForm: preGame.away_recent_form');
  });

  it('기존 태그 회귀 — 폼 태그와 투수전 예상 공존 가능', () => {
    const result = buildGameOverview({
      homeWinProb: 0.5,
      homeTeamName: 'KT',
      awayTeamName: 'LG',
      homeSPFip: 3.0,
      awaySPFip: 3.2,
      homeRecentForm: 0.7,
      awayRecentForm: 0.5,
    });
    expect(result.tags).toContain('투수전 예상');
    expect(result.tags).toContain('KT 최근 핫');
  });
});
