import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const HOME_PAGE_SRC = readFileSync(join(__dirname, '../page.tsx'), 'utf-8');
const TOP_STAT_PICK_SRC = readFileSync(
  join(__dirname, '../../components/predictions/TopStatPickCard.tsx'),
  'utf-8',
);

describe('explore-idea wave-234 — TopStatPickCard hero fallback (cycle 1533)', () => {
  it('page.tsx imports TopStatPickCard', () => {
    expect(HOME_PAGE_SRC).toContain("import { TopStatPickCard } from \"@/components/predictions/TopStatPickCard\"");
  });

  it('page.tsx defines selectTopStatPick function', () => {
    expect(HOME_PAGE_SRC).toContain('function selectTopStatPick(');
  });

  it('selectTopStatPick filters by scheduled status', () => {
    expect(HOME_PAGE_SRC).toContain("game.status !== 'scheduled'");
  });

  it('selectTopStatPick uses homeWinProb edge threshold', () => {
    expect(HOME_PAGE_SRC).toContain('homeWinProb');
    expect(HOME_PAGE_SRC).toContain('Math.abs(hwp - 0.5)');
  });

  it('page.tsx computes topStatPick only when no BigMatchHero', () => {
    expect(HOME_PAGE_SRC).toContain('const topStatPick = hasBigMatchHero ? null : selectTopStatPick(games)');
  });

  it('TopStatPickCard is rendered when topStatPick exists', () => {
    expect(HOME_PAGE_SRC).toContain('topStatPick ? (');
    expect(HOME_PAGE_SRC).toContain('<TopStatPickCard');
  });

  it('TopStatPickCard component uses winnerProbOf from shared', () => {
    expect(TOP_STAT_PICK_SRC).toContain('winnerProbOf');
  });

  it('TopStatPickCard component uses shortTeamName from shared', () => {
    expect(TOP_STAT_PICK_SRC).toContain('shortTeamName');
  });

  it('TopStatPickCard shows 통계 모델 추천 픽 badge text', () => {
    expect(TOP_STAT_PICK_SRC).toContain('통계 모델 추천 픽');
  });

  it('TopStatPickCard links to /analysis/game/<id>', () => {
    expect(TOP_STAT_PICK_SRC).toContain('/analysis/game/${gameId}');
  });

  it('TopStatPickCard does not contain stale cycle references', () => {
    expect(TOP_STAT_PICK_SRC).not.toMatch(/cycle \d{3,4}/);
  });

  it('TopStatPickCard does not contain dev jargon (박제·백필·실측·upsert)', () => {
    expect(TOP_STAT_PICK_SRC).not.toContain('박제');
    expect(TOP_STAT_PICK_SRC).not.toContain('백필');
    expect(TOP_STAT_PICK_SRC).not.toContain('실측');
    expect(TOP_STAT_PICK_SRC).not.toContain('upsert');
  });
});
