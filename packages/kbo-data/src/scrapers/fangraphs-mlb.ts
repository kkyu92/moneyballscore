import * as Sentry from '@sentry/nextjs';
import { SCRAPER_RATE_LIMIT_DEFAULT_MS } from '@moneyball/shared';

let lastFetchAt = 0;

async function rateLimit() {
  const elapsed = Date.now() - lastFetchAt;
  if (elapsed < SCRAPER_RATE_LIMIT_DEFAULT_MS) {
    await new Promise((r) => setTimeout(r, SCRAPER_RATE_LIMIT_DEFAULT_MS - elapsed));
  }
  lastFetchAt = Date.now();
}

export interface FangraphsMlbTeam {
  teamCode: string;
  woba: number; fip: number; xfip: number; war: number;
  ldPct: number; gbPct: number; fbPct: number; iffbPct: number;
  hrFbPct: number; pullPct: number; centPct: number; oppoPct: number;
}

type FgStatsParam = 'bat' | 'pit';

interface FgLeaderRow {
  Team?: unknown;
  [key: string]: unknown;
}

// FanGraphs 가 leaderboard 페이지를 Next.js SPA(react-query) 로 전면 개편 —
// 기존 ASP.NET 시절 `table#LeaderBoard1_dg1_ctl00` 는 서버 렌더 HTML 에 더 이상 존재하지 않음
// (2026-08-04 HTTP 403 → 2026-08-06 이후 parse fail 로 전환, 15일 연속 mlb_fancy_scrape 무효).
// 실 데이터는 `<script id="__NEXT_DATA__">` 안 react-query dehydratedState.queries 에 JSON 으로 내장.
function extractTeamCode(teamCell: unknown): string | null {
  if (typeof teamCell !== 'string') return null;
  const match = teamCell.match(/>([A-Z]{2,4})<\/a>/);
  return match ? match[1] : null;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function extractLeaderRows(html: string, statsParam: FgStatsParam): FgLeaderRow[] {
  const scriptMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    throw new Error('parse fail');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(scriptMatch[1]);
  } catch {
    throw new Error('parse fail');
  }

  const queries = (payload as any)?.props?.pageProps?.dehydratedState?.queries;
  if (!Array.isArray(queries)) {
    throw new Error('parse fail');
  }

  const query = queries.find(
    (q: any) => q?.queryKey?.[0] === 'leaders/major-league/data' && q?.queryKey?.[1]?.stats === statsParam,
  );
  const rows = query?.state?.data?.data;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('parse fail');
  }

  return rows as FgLeaderRow[];
}

async function fetchLeaderRows(season: number, statsParam: FgStatsParam): Promise<FgLeaderRow[]> {
  await rateLimit();

  const url = `https://www.fangraphs.com/leaders/major-league?pos=all&stats=${statsParam}&lg=all&season=${season}&type=8&team=0,ts&pageitems=2000000000`;
  const res = await fetch(url);

  if (!res.ok) {
    Sentry.captureMessage(`fangraphs-mlb HTTP ${res.status}`, {
      level: 'warning',
      tags: { scraper: 'fangraphs-mlb', fn: 'fetchLeaderRows', stats: statsParam, status: String(res.status) },
      extra: { url, season },
    });
    throw new Error(`fangraphs HTTP ${res.status}`);
  }

  const html = await res.text();
  try {
    return extractLeaderRows(html, statsParam);
  } catch (e) {
    Sentry.captureMessage('fangraphs-mlb parse fail — __NEXT_DATA__ 구조 변경 가능', {
      level: 'warning',
      tags: { scraper: 'fangraphs-mlb', fn: 'fetchLeaderRows', stats: statsParam, reason: 'parse_fail' },
      extra: { url, season },
    });
    throw e;
  }
}

export async function fetchFangraphsMlbTeams(season: number): Promise<FangraphsMlbTeam[]> {
  // 두 endpoint(stats=bat/pit) 가 모듈 전역 lastFetchAt(rate limiter) 을 공유 —
  // Promise.all 동시 호출 시 cycle 2058 이 고친 savant TOCTOU race 와 동일 버그 재발.
  // 순차 await 로 직렬화.
  const batRows = await fetchLeaderRows(season, 'bat');
  const pitRows = await fetchLeaderRows(season, 'pit');

  const pitByTeam = new Map<string, { fip: number; xfip: number }>();
  for (const row of pitRows) {
    const teamCode = extractTeamCode(row.Team);
    if (!teamCode) continue;
    pitByTeam.set(teamCode, { fip: toNumber(row.FIP), xfip: toNumber(row.xFIP) });
  }

  const teams: FangraphsMlbTeam[] = [];
  for (const row of batRows) {
    const teamCode = extractTeamCode(row.Team);
    if (!teamCode) continue;
    const pit = pitByTeam.get(teamCode);
    if (!pit) continue; // bat/pit 양쪽 매칭 실패 팀은 skip — fip/xfip 없이 저장 시 하위 predictor NaN

    teams.push({
      teamCode,
      woba: toNumber(row['wOBA']),
      fip: pit.fip,
      xfip: pit.xfip,
      war: toNumber(row['WAR']),
      ldPct: toNumber(row['LD%']) * 100,
      gbPct: toNumber(row['GB%']) * 100,
      fbPct: toNumber(row['FB%']) * 100,
      iffbPct: toNumber(row['IFFB%']) * 100,
      hrFbPct: toNumber(row['HR/FB']) * 100,
      pullPct: toNumber(row['Pull%']) * 100,
      centPct: toNumber(row['Cent%']) * 100,
      oppoPct: toNumber(row['Oppo%']) * 100,
    });
  }

  return teams;
}
