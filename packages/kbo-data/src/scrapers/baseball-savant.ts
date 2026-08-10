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

export interface SavantTeam {
  teamCode: string;
  xwoba: number;        // 0~0.5
  barrelPct: number;    // 0~30
  hardHitPct: number;   // 0~100
  launchAngle: number;  // -30~50
}

// Savant team_id 축약형 → 내부 MLB_TEAMS 코드 (packages/shared/mlb-teams.ts 정합).
// 나머지 팀은 Savant/내부 코드 동일.
const SAVANT_TEAM_CODE_MAP: Record<string, string> = {
  AZ: 'ARI',
  CWS: 'CHW',
  KC: 'KCR',
  SD: 'SDP',
  SF: 'SFG',
  TB: 'TBR',
  WSH: 'WSN',
};

function normalizeTeamCode(savantCode: string): string {
  return SAVANT_TEAM_CODE_MAP[savantCode] ?? savantCode;
}

// Savant CSV export — 필드 double-quote 감쌈 + 선행 BOM 포함 (cycle 2057 재확인).
function parseCsvLine(line: string): string[] {
  return line.split(',').map((f) => f.trim().replace(/^"|"$/g, ''));
}

function parseCsv(raw: string): { header: string[]; rows: string[][] } {
  const text = raw.replace(/^﻿/, '');
  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('parse fail — empty CSV');
  const header = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);
  return { header, rows };
}

interface ExpectedStatsRow {
  teamCode: string;
  estWoba: number;
}

// team 타율/파워 기대값(xwOBA) — /leaderboard/expected_statistics?type=batter-team
// (과거 type=team 단일 파라미터는 이제 선수별 row 반환 — cycle 2057 재확인, Savant 측 스키마 변경)
async function fetchExpectedStats(season: number): Promise<ExpectedStatsRow[]> {
  await rateLimit();

  const url = `https://baseballsavant.mlb.com/leaderboard/expected_statistics?type=batter-team&year=${season}&csv=true`;
  const res = await fetch(url);

  if (!res.ok) {
    Sentry.captureMessage(`savant HTTP ${res.status}`, {
      level: 'warning',
      tags: { scraper: 'baseball-savant', fn: 'fetchExpectedStats', status: String(res.status) },
      extra: { url, season },
    });
    throw new Error(`savant HTTP ${res.status}`);
  }

  const { header, rows } = parseCsv(await res.text());
  const teamIdx = header.indexOf('team_id');
  const wobaIdx = header.indexOf('est_woba');

  if (teamIdx === -1 || wobaIdx === -1) {
    Sentry.captureMessage('savant expected_statistics CSV format 변경', {
      level: 'warning',
      tags: { scraper: 'baseball-savant', fn: 'fetchExpectedStats', reason: 'csv_format_changed' },
      extra: { url, season, headerColumns: header, missing: { teamIdx, wobaIdx } },
    });
    throw new Error('parse fail — CSV format 변경');
  }

  return rows
    .filter((cols) => cols.length > Math.max(teamIdx, wobaIdx))
    .map((cols) => ({
      teamCode: normalizeTeamCode(cols[teamIdx]),
      estWoba: parseFloat(cols[wobaIdx]),
    }));
}

interface StatcastRow {
  teamCode: string;
  barrelPct: number;
  hardHitPct: number;
  launchAngle: number;
}

// batted-ball quality (barrel% / hard-hit% / launch angle) — /leaderboard/statcast?type=batter-team
async function fetchStatcastQuality(season: number): Promise<StatcastRow[]> {
  await rateLimit();

  const url = `https://baseballsavant.mlb.com/leaderboard/statcast?type=batter-team&year=${season}&csv=true`;
  const res = await fetch(url);

  if (!res.ok) {
    Sentry.captureMessage(`savant HTTP ${res.status}`, {
      level: 'warning',
      tags: { scraper: 'baseball-savant', fn: 'fetchStatcastQuality', status: String(res.status) },
      extra: { url, season },
    });
    throw new Error(`savant HTTP ${res.status}`);
  }

  const { header, rows } = parseCsv(await res.text());
  const teamIdx = header.indexOf('team_id');
  const barrelIdx = header.indexOf('brl_percent');
  const hardHitIdx = header.indexOf('ev95percent');
  const launchIdx = header.indexOf('avg_hit_angle');

  if ([teamIdx, barrelIdx, hardHitIdx, launchIdx].some((i) => i === -1)) {
    Sentry.captureMessage('savant statcast CSV format 변경', {
      level: 'warning',
      tags: { scraper: 'baseball-savant', fn: 'fetchStatcastQuality', reason: 'csv_format_changed' },
      extra: { url, season, headerColumns: header, missing: { teamIdx, barrelIdx, hardHitIdx, launchIdx } },
    });
    throw new Error('parse fail — CSV format 변경');
  }

  return rows
    .filter((cols) => cols.length > Math.max(teamIdx, barrelIdx, hardHitIdx, launchIdx))
    .map((cols) => ({
      teamCode: normalizeTeamCode(cols[teamIdx]),
      barrelPct: parseFloat(cols[barrelIdx]),
      hardHitPct: parseFloat(cols[hardHitIdx]),
      launchAngle: parseFloat(cols[launchIdx]),
    }));
}

export async function fetchSavantTeamStatcast(season: number): Promise<SavantTeam[]> {
  // 순차 호출 필수 — rateLimit() 의 lastFetchAt 이 모듈 전역 mutable 상태라
  // Promise.all 로 동시 호출 시 TOCTOU race (두 호출 모두 elapsed 를 독립 검사 후 갱신) 발생.
  // 같은 호스트(Savant) 호출이라 직렬화가 rate-limit 의도에도 부합.
  const expected = await fetchExpectedStats(season);
  const statcast = await fetchStatcastQuality(season);

  const statcastByTeam = new Map(statcast.map((r) => [r.teamCode, r]));

  const teams: SavantTeam[] = [];
  for (const e of expected) {
    const s = statcastByTeam.get(e.teamCode);
    if (!s) continue;

    const { xwoba, barrelPct, hardHitPct, launchAngle } = {
      xwoba: e.estWoba,
      barrelPct: s.barrelPct,
      hardHitPct: s.hardHitPct,
      launchAngle: s.launchAngle,
    };

    if (xwoba < 0 || xwoba > 0.5) continue;
    if (barrelPct < 0 || barrelPct > 30) continue;
    if (hardHitPct < 0 || hardHitPct > 100) continue;
    if (launchAngle < -30 || launchAngle > 50) continue;

    teams.push({ teamCode: e.teamCode, xwoba, barrelPct, hardHitPct, launchAngle });
  }

  return teams;
}
