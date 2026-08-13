import { describe, it, expect } from 'vitest';
import {
  MLB_ELO_K,
  MLB_ELO_K_POSTSEASON,
  MLB_ELO_INITIAL_RATING,
  expectedHomeWinProb,
  updateMlbElo,
  computeMlbEloRatings,
  computeMlbEloHistory,
  type MlbFinalGameForElo,
} from '../mlb-elo';

describe('mlb-elo constants', () => {
  it('MLB_ELO_K = 4 (FiveThirtyEight/Nate Silver 정규시즌)', () => {
    expect(MLB_ELO_K).toBe(4);
  });

  it('MLB_ELO_K_POSTSEASON = 6', () => {
    expect(MLB_ELO_K_POSTSEASON).toBe(6);
  });

  it('MLB_ELO_INITIAL_RATING = ELO_NEUTRAL(1500) 재사용', () => {
    expect(MLB_ELO_INITIAL_RATING).toBe(1500);
  });
});

describe('expectedHomeWinProb', () => {
  it('동일 rating 이면 홈 어드밴티지만큼 50% 초과', () => {
    const p = expectedHomeWinProb(1500, 1500);
    expect(p).toBeGreaterThan(0.5);
    expect(p).toBeCloseTo(0.5345, 3);
  });

  it('홈이 압도적으로 강하면 1에 근접', () => {
    const p = expectedHomeWinProb(1700, 1300);
    expect(p).toBeGreaterThan(0.9);
  });

  it('원정이 압도적으로 강하면 0에 근접', () => {
    const p = expectedHomeWinProb(1300, 1700);
    expect(p).toBeLessThan(0.11);
  });
});

describe('updateMlbElo', () => {
  it('예상대로 홈팀 승리 시 rating 변화 작음 (양수, K 이하)', () => {
    const r = updateMlbElo(1600, 1400, true);
    expect(r.home).toBeGreaterThan(1600);
    expect(r.home - 1600).toBeLessThan(MLB_ELO_K);
  });

  it('업셋(약팀 홈 승) 시 rating 변화 큼 (K 근접)', () => {
    const r = updateMlbElo(1400, 1600, true);
    expect(r.home - 1400).toBeGreaterThan(MLB_ELO_K / 2);
    expect(r.home - 1400).toBeLessThanOrEqual(MLB_ELO_K);
  });

  it('홈팀 패배 시 rating 하락', () => {
    const r = updateMlbElo(1500, 1500, false);
    expect(r.home).toBeLessThan(1500);
    expect(r.away).toBeGreaterThan(1500);
  });

  it('zero-sum — 양팀 변화량 절댓값 동일', () => {
    const before = { home: 1550, away: 1480 };
    const r = updateMlbElo(before.home, before.away, true);
    const homeDelta = r.home - before.home;
    const awayDelta = r.away - before.away;
    expect(homeDelta).toBeCloseTo(-awayDelta, 10);
  });

  it('중립 대결 홈 승 — 델타 = K * (1 - expectedHome)', () => {
    const expected = expectedHomeWinProb(1500, 1500);
    const r = updateMlbElo(1500, 1500, true);
    expect(r.home - 1500).toBeCloseTo(MLB_ELO_K * (1 - expected), 10);
  });

  it('커스텀 k (포스트시즌) 적용 가능', () => {
    const rRegular = updateMlbElo(1500, 1500, true, MLB_ELO_K);
    const rPostseason = updateMlbElo(1500, 1500, true, MLB_ELO_K_POSTSEASON);
    expect(rPostseason.home - 1500).toBeGreaterThan(rRegular.home - 1500);
  });
});

describe('computeMlbEloRatings (plan #25 Phase 2, cycle 2082)', () => {
  const game = (
    home: string,
    away: string,
    homeScore: number | null,
    awayScore: number | null,
    date = '2026-04-01',
  ): MlbFinalGameForElo => ({
    game_date: date,
    home_team_code: home,
    away_team_code: away,
    home_score: homeScore,
    away_score: awayScore,
  });

  it('신규 팀은 초기 rating(ELO_NEUTRAL)에서 시작해 갱신', () => {
    const states = computeMlbEloRatings([game('LAD', 'SF', 5, 2)]);
    expect(states.get('LAD')!.eloRating).toBeGreaterThan(MLB_ELO_INITIAL_RATING);
    expect(states.get('SF')!.eloRating).toBeLessThan(MLB_ELO_INITIAL_RATING);
    expect(states.get('LAD')!.gamesPlayed).toBe(1);
  });

  it('동일 두 팀 연속 경기 — rating 누적 갱신 (순서 의존)', () => {
    const states = computeMlbEloRatings([
      game('LAD', 'SF', 5, 2),
      game('SF', 'LAD', 3, 1),
    ]);
    expect(states.get('LAD')!.gamesPlayed).toBe(2);
    expect(states.get('SF')!.gamesPlayed).toBe(2);
  });

  it('All-Star Game(AL/NL) 은 재생에서 제외', () => {
    const states = computeMlbEloRatings([game('AL', 'NL', 5, 3)]);
    expect(states.size).toBe(0);
  });

  it('무승부/스코어 결측 경기는 skip', () => {
    const states = computeMlbEloRatings([
      game('LAD', 'SF', 3, 3),
      game('LAD', 'SF', null, null),
    ]);
    expect(states.size).toBe(0);
  });

  it('season = game_date 연도 (마지막 반영 경기 기준)', () => {
    const states = computeMlbEloRatings([game('LAD', 'SF', 5, 2, '2026-05-10')]);
    expect(states.get('LAD')!.season).toBe(2026);
  });

  it('StatsAPI raw team_code 그대로 key 사용 (정규화 안 함 — DB 컨벤션 유지)', () => {
    const states = computeMlbEloRatings([game('TB', 'CWS', 4, 1)]);
    expect(states.has('TB')).toBe(true);
    expect(states.has('CWS')).toBe(true);
    expect(states.has('TBR')).toBe(false);
  });

  it('zero-sum — 매 경기 후 전체 rating 합 불변', () => {
    const games = [
      game('LAD', 'SF', 5, 2, '2026-04-01'),
      game('SF', 'LAD', 1, 6, '2026-04-02'),
      game('LAD', 'SF', 3, 3, '2026-04-03'),
    ];
    const states = computeMlbEloRatings(games);
    const total = states.get('LAD')!.eloRating + states.get('SF')!.eloRating;
    expect(total).toBeCloseTo(2 * MLB_ELO_INITIAL_RATING, 6);
  });
});

describe('computeMlbEloHistory (plan #25 Phase 2b step 1, cycle 2083)', () => {
  const game = (
    home: string,
    away: string,
    homeScore: number | null,
    awayScore: number | null,
    date = '2026-04-01',
  ): MlbFinalGameForElo => ({
    game_date: date,
    home_team_code: home,
    away_team_code: away,
    home_score: homeScore,
    away_score: awayScore,
  });

  it('경기 1건 = history 2 entry (home/away 각 1)', () => {
    const history = computeMlbEloHistory([game('LAD', 'SF', 5, 2, '2026-04-01')]);
    expect(history).toHaveLength(2);
    expect(history.map((h) => h.team_code).sort()).toEqual(['LAD', 'SF']);
  });

  it('entry 의 elo_rating 이 computeMlbEloRatings 최종 states 와 일치 (단일 경기)', () => {
    const games = [game('LAD', 'SF', 5, 2, '2026-04-01')];
    const history = computeMlbEloHistory(games);
    const states = computeMlbEloRatings(games);
    const lad = history.find((h) => h.team_code === 'LAD')!;
    expect(lad.elo_rating).toBeCloseTo(states.get('LAD')!.eloRating, 10);
  });

  it('연속 경기 시 history 가 시간순 사후 rating 누적 반영 (재계산 아님)', () => {
    const games = [
      game('LAD', 'SF', 5, 2, '2026-04-01'),
      game('LAD', 'SF', 1, 3, '2026-04-02'),
    ];
    const history = computeMlbEloHistory(games);
    const ladEntries = history.filter((h) => h.team_code === 'LAD');
    expect(ladEntries).toHaveLength(2);
    expect(ladEntries[0].elo_rating).not.toBeCloseTo(ladEntries[1].elo_rating, 5);
    expect(ladEntries[0].game_date).toBe('2026-04-01');
    expect(ladEntries[1].game_date).toBe('2026-04-02');
  });

  it('All-Star Game / 무승부·스코어 결측 경기는 history 에도 미포함', () => {
    const history = computeMlbEloHistory([
      game('AL', 'NL', 5, 3),
      game('LAD', 'SF', 3, 3),
      game('LAD', 'SF', null, null),
    ]);
    expect(history).toHaveLength(0);
  });

  it('season 필드가 game_date 연도와 일치', () => {
    const history = computeMlbEloHistory([game('LAD', 'SF', 5, 2, '2026-05-10')]);
    expect(history.every((h) => h.season === 2026)).toBe(true);
  });

  it('더블헤더(같은 팀, 같은 game_date 2경기) — dedupe 로 (team_code, game_date) 당 1 entry만 남고 2차전 rating 반영 (DB UNIQUE 배치 upsert 충돌 회피, cycle 2083 실측 발견)', () => {
    const games = [
      game('LAD', 'SF', 5, 2, '2026-04-01'),
      game('LAD', 'SF', 1, 3, '2026-04-01'),
    ];
    const history = computeMlbEloHistory(games);
    const ladEntries = history.filter((h) => h.team_code === 'LAD');
    expect(ladEntries).toHaveLength(1);

    const states = computeMlbEloRatings(games);
    expect(ladEntries[0].elo_rating).toBeCloseTo(states.get('LAD')!.eloRating, 10);

    const keys = history.map((h) => `${h.team_code}|${h.game_date}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
