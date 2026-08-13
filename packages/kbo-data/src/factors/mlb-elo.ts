import { ELO_DIVIDER, ELO_NEUTRAL, HOME_ELO_BONUS } from '@moneyball/shared';

/**
 * MLB Elo K-factor (plan #25 Phase 1, cycle 2080).
 *
 * KBO/MLB 양쪽 모두 리포 안에 자체 Elo 갱신(K-factor) 로직이 없음 — KBO Elo
 * (predictions.home_elo/away_elo) 도 KBO Fancy Stats 외부 스크랩 스냅샷을 그대로
 * 저장할 뿐 경기 결과로 rating 을 갱신하는 수식 자체가 리포에 레퍼런스 없음
 * (Explore agent 실측, cycle 2079). 임의 선택 대신 공개 문헌 인용:
 *
 * FiveThirtyEight MLB Elo 모델 — Nate Silver 가 "a K factor of four is ideal for
 * major league baseball" 로 결론(정규 시즌), 포스트시즌은 6.
 * 출처: https://fivethirtyeight.com/methodology/how-our-mlb-predictions-work/
 *
 * MLB 162경기/시즌 (KBO 144경기) — 표본이 더 많아 경기당 변동폭은 작게 유지하는게
 * 합리적이나, Phase 1 스코프는 538 공개값 그대로 채택 (자체 재조정은 op-analysis
 * heavy backtest 증거 없이 임의 변경 금지 — CLAUDE.md "데이터로만 이야기" 룰).
 */
export const MLB_ELO_K = 4;
export const MLB_ELO_K_POSTSEASON = 6;

export interface MlbEloUpdateResult {
  home: number;
  away: number;
}

/**
 * Elo 기대 승률 — 기존 computeMlbProbability 의 elo 팩터와 동일 공식
 * (ELO_DIVIDER=400 logistic, HOME_ELO_BONUS=24 홈 어드밴티지 반영).
 * 별도 파일 재구현 이유: factors/mlb-elo.ts 는 production pipeline 이 쓰는
 * "갱신" 로직 전용이라 backtest 전용 모듈(backtest-v2-helpers.ts computeEloProb)
 * 에 대한 프로덕션 의존을 피함 — 공식 자체는 동일 상수 재사용으로 drift 차단.
 */
export function expectedHomeWinProb(homeElo: number, awayElo: number): number {
  const adjustedDiff = awayElo - homeElo - HOME_ELO_BONUS;
  return 1 / (1 + Math.pow(10, adjustedDiff / ELO_DIVIDER));
}

/**
 * 경기 결과 1건으로 양팀 Elo rating 갱신 (zero-sum — home 증분 = away 감분).
 *
 * newElo = oldElo + K * (actualScore - expectedScore)
 * actualScore ∈ {0, 1} (무승부 없음, MLB/KBO 공통), expectedScore 는
 * expectedHomeWinProb 재사용.
 */
export function updateMlbElo(
  homeElo: number,
  awayElo: number,
  homeWon: boolean,
  k: number = MLB_ELO_K,
): MlbEloUpdateResult {
  const expectedHome = expectedHomeWinProb(homeElo, awayElo);
  const actualHome = homeWon ? 1 : 0;
  const delta = k * (actualHome - expectedHome);
  return { home: homeElo + delta, away: awayElo - delta };
}

/** 백필/신규 팀 초기 rating — packages/shared ELO_NEUTRAL 재사용 (drift 차단). */
export const MLB_ELO_INITIAL_RATING = ELO_NEUTRAL;

/**
 * All-Star Game (home/away_team_code='NL'/'AL') 은 실제 franchise 가 아닌 리그 올스타
 * 혼성팀 — 팀별 Elo 신호로 부적합해 재생에서 제외 (실측: external_game_id=823443, 2026-07-14).
 */
const MLB_ELO_EXHIBITION_CODES = new Set(['AL', 'NL']);

export interface MlbFinalGameForElo {
  game_date: string;
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
}

export interface MlbTeamEloState {
  eloRating: number;
  gamesPlayed: number;
  season: number;
}

/**
 * 경기별 사후 rating 스냅샷 (plan #25 Phase 2b step 1, cycle 2083) — matchup Elo 추이
 * 차트 소비용. mlb_team_elo 가 UNIQUE(team_code, season) 현재 스냅샷만 저장해 KBO
 * (predictions.home_elo/away_elo 가 매 경기 row 에 쌓여 시계열 자연 발생) 와 달리
 * historical 시계열이 없던 blocker(cycle 2082 발견) 를 해소.
 */
export interface MlbEloHistoryEntry {
  team_code: string;
  game_date: string;
  season: number;
  elo_rating: number;
}

interface MlbEloReplayResult {
  states: Map<string, MlbTeamEloState>;
  history: MlbEloHistoryEntry[];
}

/**
 * mlb_schedule status='final' 경기를 시간순 재생해 팀별 현재 Elo rating(states) 과
 * 경기별 사후 rating 스냅샷(history) 을 동시 산출. computeMlbEloRatings/
 * computeMlbEloHistory 양쪽이 같은 루프를 공유(drift 차단).
 *
 * 매 fire 시 전체 히스토리를 처음부터 재생 — 증분 갱신(단일 날짜만 적용) 대신
 * 전체 재계산을 택한 이유: mlb_team_elo 에 "이 경기는 이미 반영됨" 을 표시하는 처리
 * 로그가 없어 증분 방식은 재실행(cron retry 등) 시 이중 반영 위험이 있음. 매 팀
 * 시즌당 최대 ~162경기라 전체 재생 비용은 낮음 (Phase 1 백필 스크립트와 동일 로직,
 * Phase 2 자동 갱신 파이프라인 모드에서도 재사용 — 코드 중복 방지, cycle 2082).
 *
 * team_code 는 games 배열에 들어온 그대로(StatsAPI convention) 사용 — mlb_schedule/
 * mlb_team_elo 는 원본 그대로 저장하는 기존 컨벤션 유지 (packages/shared/mlb-teams.ts
 * MLB_STATSAPI_TEAM_ALIASES 주석 참조, 정규화는 소비 시점에 normalizeMlbTeamCode 로).
 */
function replayMlbGames(
  games: readonly MlbFinalGameForElo[],
  k: number = MLB_ELO_K,
): MlbEloReplayResult {
  const states = new Map<string, MlbTeamEloState>();
  const history: MlbEloHistoryEntry[] = [];
  const ratingOf = (team: string) => states.get(team)?.eloRating ?? MLB_ELO_INITIAL_RATING;

  for (const g of games) {
    if (MLB_ELO_EXHIBITION_CODES.has(g.home_team_code) || MLB_ELO_EXHIBITION_CODES.has(g.away_team_code)) {
      continue;
    }
    if (g.home_score == null || g.away_score == null || g.home_score === g.away_score) {
      // 무승부/스코어 미기재(취소·서스펜드 등) — 갱신 skip.
      continue;
    }

    const homeElo = ratingOf(g.home_team_code);
    const awayElo = ratingOf(g.away_team_code);
    const homeWon = g.home_score > g.away_score;
    const updated = updateMlbElo(homeElo, awayElo, homeWon, k);
    const season = parseInt(g.game_date.slice(0, 4), 10);

    states.set(g.home_team_code, {
      eloRating: updated.home,
      gamesPlayed: (states.get(g.home_team_code)?.gamesPlayed ?? 0) + 1,
      season,
    });
    states.set(g.away_team_code, {
      eloRating: updated.away,
      gamesPlayed: (states.get(g.away_team_code)?.gamesPlayed ?? 0) + 1,
      season,
    });

    history.push({ team_code: g.home_team_code, game_date: g.game_date, season, elo_rating: updated.home });
    history.push({ team_code: g.away_team_code, game_date: g.game_date, season, elo_rating: updated.away });
  }

  return { states, history };
}

export function computeMlbEloRatings(
  games: readonly MlbFinalGameForElo[],
  k: number = MLB_ELO_K,
): Map<string, MlbTeamEloState> {
  return replayMlbGames(games, k).states;
}

/**
 * 팀×경기일 사후 rating 시계열 산출 (matchup Elo 추이 차트 소비용).
 * 더블헤더(같은 팀, 같은 game_date 2경기)는 (team_code, game_date) 키로 dedupe해
 * 마지막(2차전 이후) rating 만 남김 — 차트 목적상 일별 granularity 충분해 허용된
 * 단순화. dedupe 를 여기서 미리 해야 하는 이유(cycle 2083 실측 발견): DB 저장이
 * UNIQUE(team_code, game_date) 단일 배치 upsert 라 같은 conflict key 가 한 요청 안에
 * 2번 나오면 Postgres 가 "ON CONFLICT DO UPDATE command cannot affect row a second
 * time" 로 전체 배치를 reject — 소비 시점(DB upsert) 이 아니라 산출 시점에 dedupe.
 */
export function computeMlbEloHistory(
  games: readonly MlbFinalGameForElo[],
  k: number = MLB_ELO_K,
): MlbEloHistoryEntry[] {
  const { history } = replayMlbGames(games, k);
  const deduped = new Map<string, MlbEloHistoryEntry>();
  for (const entry of history) {
    deduped.set(`${entry.team_code}|${entry.game_date}`, entry);
  }
  return Array.from(deduped.values());
}
