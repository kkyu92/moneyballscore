import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MATCHUP_RECENT_FORM_GAMES,
  ACCURACY_BASELINE,
  RECENT_FORM_GAMES,
} from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const MATCHUP_PAGE = join(ROOT, 'src/app/matchup/[teamA]/[teamB]/page.tsx');
const BUILD_RECENT_FORM = join(ROOT, 'src/lib/teams/buildTeamRecentForm.ts');

describe('wave-362 — matchup page 2 inline constants → 단일 source (cycle 1700)', () => {
  it('MATCHUP_RECENT_FORM_GAMES = 5 단일 소스 가드', () => {
    expect(MATCHUP_RECENT_FORM_GAMES).toBe(5);
  });

  it('MATCHUP_RECENT_FORM_GAMES < RECENT_FORM_GAMES (display compact < model window)', () => {
    expect(MATCHUP_RECENT_FORM_GAMES).toBeLessThan(RECENT_FORM_GAMES);
  });

  it('ACCURACY_BASELINE = 0.5 단일 소스 가드', () => {
    expect(ACCURACY_BASELINE).toBe(0.5);
  });

  it('matchup page: imports MATCHUP_RECENT_FORM_GAMES from shared', () => {
    const src = readFileSync(MATCHUP_PAGE, 'utf8');
    expect(src).toContain('MATCHUP_RECENT_FORM_GAMES');
  });

  it('matchup page: imports ACCURACY_BASELINE from shared', () => {
    const src = readFileSync(MATCHUP_PAGE, 'utf8');
    expect(src).toContain('ACCURACY_BASELINE');
  });

  it('matchup page: inline 5 제거 — buildTeamRecentForm(pair.codeA, 5) 없음', () => {
    const src = readFileSync(MATCHUP_PAGE, 'utf8');
    expect(src).not.toContain('buildTeamRecentForm(pair.codeA, 5)');
    expect(src).not.toContain('buildTeamRecentForm(pair.codeB, 5)');
  });

  it('matchup page: inline 0.5 제거 — >= 0.5 없음', () => {
    const src = readFileSync(MATCHUP_PAGE, 'utf8');
    expect(src).not.toContain('>= 0.5');
  });

  it('matchup page: ACCURACY_BASELINE callsite 존재', () => {
    const src = readFileSync(MATCHUP_PAGE, 'utf8');
    expect(src).toContain('ACCURACY_BASELINE');
    expect(src).toContain('MATCHUP_RECENT_FORM_GAMES');
  });

  it('buildTeamRecentForm: imports MATCHUP_RECENT_FORM_GAMES from shared', () => {
    const src = readFileSync(BUILD_RECENT_FORM, 'utf8');
    expect(src).toContain('MATCHUP_RECENT_FORM_GAMES');
  });

  it('buildTeamRecentForm: default limit = MATCHUP_RECENT_FORM_GAMES (inline 5 제거)', () => {
    const src = readFileSync(BUILD_RECENT_FORM, 'utf8');
    expect(src).toContain('limit = MATCHUP_RECENT_FORM_GAMES');
    expect(src).not.toContain('limit = 5');
  });
});
