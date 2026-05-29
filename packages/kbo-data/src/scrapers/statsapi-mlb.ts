import * as Sentry from '@sentry/nextjs';

export interface MlbGame {
  gamePk: number;
  gameDateUtc: Date;
  homeTeam: string;
  awayTeam: string;
  status: 'scheduled' | 'final' | 'in_progress' | 'postponed';
  homeScore?: number;
  awayScore?: number;
}

const BASE_URL = 'https://statsapi.mlb.com/api/v1';
const RATE_LIMIT_DELAY_MS = 2000;
const MAX_RETRY = 3;

function statusMap(detailedState: string): MlbGame['status'] {
  if (detailedState === 'Final') return 'final';
  if (detailedState === 'In Progress') return 'in_progress';
  if (detailedState.includes('Postponed')) return 'postponed';
  return 'scheduled';
}

async function fetchWithRetry(url: string, retry = 0): Promise<Response> {
  const res = await fetch(url);
  if (res.ok) return res;

  if (res.status === 401 || res.status === 403) {
    Sentry.captureMessage(`statsapi-mlb ${res.status} — ToS cool down`, 'warning');
    throw new Error('tos_cooldown');
  }

  if (res.status === 429 || res.status >= 500) {
    if (retry >= MAX_RETRY) {
      throw new Error(`rate limit retry exhausted: ${url}`);
    }
    const delay = RATE_LIMIT_DELAY_MS * Math.pow(2, retry);
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, retry + 1);
  }

  throw new Error(`statsapi error: ${res.status} ${url}`);
}

export async function fetchMlbSchedule(dateKst: string): Promise<MlbGame[]> {
  const url = `${BASE_URL}/schedule?sportId=1&date=${dateKst}`;

  try {
    const res = await fetchWithRetry(url);
    const json = await res.json();

    const games: MlbGame[] = [];
    for (const date of json.dates ?? []) {
      for (const g of date.games ?? []) {
        games.push({
          gamePk: g.gamePk,
          gameDateUtc: new Date(g.gameDate),
          homeTeam: g.teams.home.team.abbreviation,
          awayTeam: g.teams.away.team.abbreviation,
          status: statusMap(g.status.detailedState),
          homeScore: g.teams.home.score,
          awayScore: g.teams.away.score,
        });
      }
    }
    return games;
  } catch (err: any) {
    if (err.message === 'tos_cooldown') return [];
    Sentry.captureException(err);
    throw err;
  }
}

export interface ProbablePitcher {
  id: number;
  name: string;
}

export type ProbablePitcherMap = Record<number, {
  home: ProbablePitcher | null;
  away: ProbablePitcher | null;
}>;

export async function fetchProbablePitchers(dateKst: string): Promise<ProbablePitcherMap> {
  const url = `${BASE_URL}/schedule?sportId=1&date=${dateKst}&hydrate=probablePitcher`;

  try {
    const res = await fetchWithRetry(url);
    const json = await res.json();

    const result: ProbablePitcherMap = {};
    for (const date of json.dates ?? []) {
      for (const g of date.games ?? []) {
        const home = g.teams.home.probablePitcher;
        const away = g.teams.away.probablePitcher;
        result[g.gamePk] = {
          home: home ? { id: home.id, name: home.fullName } : null,
          away: away ? { id: away.id, name: away.fullName } : null,
        };
      }
    }
    return result;
  } catch (err: any) {
    if (err.message === 'tos_cooldown') return {};
    Sentry.captureException(err);
    throw err;
  }
}
