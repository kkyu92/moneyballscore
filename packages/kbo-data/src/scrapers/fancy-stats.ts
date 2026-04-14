import * as cheerio from 'cheerio';
import type { TeamCode } from '@moneyball/shared';
import type { PitcherStats, TeamStats, EloRating } from '../types';
import { TEAM_NAME_MAP } from '../types';

const BASE_URL = 'https://www.kbofancystats.com';
const DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveTeamCode(name: string): TeamCode | null {
  if (TEAM_NAME_MAP[name]) return TEAM_NAME_MAP[name];
  for (const [key, code] of Object.entries(TEAM_NAME_MAP)) {
    if (name.includes(key)) return code;
  }
  return null;
}

function parseNum(text: string): number {
  const cleaned = text.replace(/[^0-9.\-]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/**
 * 투수 리더보드에서 개별 투수 스탯 수집
 * FIP, xFIP, WAR, K/9, ERA, IP
 */
export async function fetchPitcherStats(season: number): Promise<PitcherStats[]> {
  const url = `${BASE_URL}/leaders/pitcher?season=${season}&stat=fip`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MoneyBall/1.0 (KBO Prediction Engine)' },
  });

  if (!res.ok) {
    throw new Error(`Fancy Stats pitcher error: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const pitchers: PitcherStats[] = [];

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 6) return;

    const name = cells.eq(0).text().trim();
    const teamName = cells.eq(1).text().trim();
    const team = resolveTeamCode(teamName);
    if (!team) return;

    pitchers.push({
      name,
      team,
      era: parseNum(cells.eq(2).text()),
      fip: parseNum(cells.eq(3).text()),
      xfip: parseNum(cells.eq(4).text()),
      war: parseNum(cells.eq(5).text()),
      innings: parseNum(cells.eq(6).text()),
      kPer9: parseNum(cells.eq(7).text()),
    });
  });

  await sleep(DELAY_MS);
  return pitchers;
}

/**
 * 팀별 집계 통계: wOBA, 불펜FIP, WAR, SFR
 */
export async function fetchTeamStats(season: number): Promise<TeamStats[]> {
  const teams: TeamStats[] = [];

  // 팀 타격 — wOBA
  const battingUrl = `${BASE_URL}/leaders/team-batting?season=${season}`;
  const battingRes = await fetch(battingUrl, {
    headers: { 'User-Agent': 'MoneyBall/1.0 (KBO Prediction Engine)' },
  });

  if (battingRes.ok) {
    const html = await battingRes.text();
    const $ = cheerio.load(html);

    $('table tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      const teamName = cells.eq(0).text().trim();
      const team = resolveTeamCode(teamName);
      if (!team) return;

      teams.push({
        team,
        woba: parseNum(cells.eq(1).text()) || 0.320,
        bullpenFip: 0, // 별도 수집
        totalWar: 0,
        sfr: 0,
      });
    });
  }

  await sleep(DELAY_MS);

  // 팀 투수 — 불펜 FIP
  const pitchingUrl = `${BASE_URL}/leaders/team-pitching?season=${season}`;
  const pitchingRes = await fetch(pitchingUrl, {
    headers: { 'User-Agent': 'MoneyBall/1.0 (KBO Prediction Engine)' },
  });

  if (pitchingRes.ok) {
    const html = await pitchingRes.text();
    const $ = cheerio.load(html);

    $('table tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      const teamName = cells.eq(0).text().trim();
      const team = resolveTeamCode(teamName);
      if (!team) return;

      const existing = teams.find((t) => t.team === team);
      if (existing) {
        existing.bullpenFip = parseNum(cells.eq(3).text()) || 4.00;
        existing.totalWar = parseNum(cells.eq(5).text()) || 0;
      }
    });
  }

  await sleep(DELAY_MS);

  // 수비 — SFR
  const defenseUrl = `${BASE_URL}/leaders/team-defense?season=${season}`;
  const defenseRes = await fetch(defenseUrl, {
    headers: { 'User-Agent': 'MoneyBall/1.0 (KBO Prediction Engine)' },
  });

  if (defenseRes.ok) {
    const html = await defenseRes.text();
    const $ = cheerio.load(html);

    $('table tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      const teamName = cells.eq(0).text().trim();
      const team = resolveTeamCode(teamName);
      if (!team) return;

      const existing = teams.find((t) => t.team === team);
      if (existing) {
        existing.sfr = parseNum(cells.eq(1).text()) || 0;
      }
    });
  }

  await sleep(DELAY_MS);
  return teams;
}

/**
 * Elo 레이팅 수집
 */
export async function fetchEloRatings(season: number): Promise<EloRating[]> {
  const url = `${BASE_URL}/elo?season=${season}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MoneyBall/1.0 (KBO Prediction Engine)' },
  });

  if (!res.ok) {
    throw new Error(`Fancy Stats Elo error: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const ratings: EloRating[] = [];

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    const teamName = cells.eq(0).text().trim();
    const team = resolveTeamCode(teamName);
    if (!team) return;

    ratings.push({
      team,
      elo: parseNum(cells.eq(1).text()) || 1500,
      winPct: parseNum(cells.eq(2).text()) || 0.5,
    });
  });

  await sleep(DELAY_MS);
  return ratings;
}

/**
 * 특정 투수 이름으로 스탯 조회
 */
export function findPitcher(
  pitchers: PitcherStats[],
  name: string,
  team: TeamCode
): PitcherStats | null {
  // 정확한 이름 + 팀 매칭
  const exact = pitchers.find((p) => p.name === name && p.team === team);
  if (exact) return exact;

  // 이름만 매칭 (트레이드 등)
  const byName = pitchers.find((p) => p.name === name);
  return byName || null;
}
