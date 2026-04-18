import * as cheerio from 'cheerio';
import type { TeamCode } from '@moneyball/shared';
import type { PitcherStats, TeamStats, EloRating, BatterStats } from '../types';
import { TEAM_NAME_MAP } from '../types';

const BASE_URL = 'https://www.kbofancystats.com';
const DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fancy Stats 영문 팀명 → TeamCode
const FS_TEAM_MAP: Record<string, TeamCode> = {
  'SSG Landers': 'SK',
  'KIA Tigers': 'HT',
  'LG Twins': 'LG',
  'Doosan Bears': 'OB',
  'KT Wiz': 'KT',
  'Samsung Lions': 'SS',
  'Lotte Giants': 'LT',
  'Hanwha Eagles': 'HH',
  'NC Dinos': 'NC',
  'Kiwoom Heroes': 'WO',
};

function resolveTeamCode(name: string): TeamCode | null {
  if (FS_TEAM_MAP[name]) return FS_TEAM_MAP[name];
  for (const [key, code] of Object.entries(FS_TEAM_MAP)) {
    if (name.includes(key) || key.includes(name)) return code;
  }
  return TEAM_NAME_MAP[name] || null;
}

function parseNum(text: string): number {
  const cleaned = text.replace(/[^0-9.\-]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/**
 * /leaders/ 페이지에서 투수 스탯 수집
 * 단일 페이지에 모든 테이블이 있는 Hugo 정적 사이트
 * T5: 투수 WAR, T6: FIP, T7: xFIP, T8: K/9
 */
export async function fetchPitcherStats(season: number): Promise<PitcherStats[]> {
  const url = `${BASE_URL}/leaders/`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MoneyBall/1.0 (KBO Prediction Engine)' },
  });

  if (!res.ok) {
    throw new Error(`Fancy Stats leaders error: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // FIP 테이블 (6번째 테이블, 0-indexed = 5)
  // 헤더: Name | Team | Age | FIP
  const fipMap = new Map<string, { team: string; fip: number }>();
  $('table').eq(5).find('tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 5) return;
    // 행: rank | eng_name | kor_name | team | age | FIP
    const korName = cells.eq(2).text().trim();
    const team = cells.eq(3).text().trim();
    const fip = parseNum(cells.eq(5).text());
    if (korName && team) fipMap.set(`${korName}@${team}`, { team, fip });
  });

  // xFIP 테이블 (7번째, 0-indexed = 6)
  const xfipMap = new Map<string, number>();
  $('table').eq(6).find('tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 5) return;
    const korName = cells.eq(2).text().trim();
    const team = cells.eq(3).text().trim();
    const xfip = parseNum(cells.eq(5).text());
    if (korName && team) xfipMap.set(`${korName}@${team}`, xfip);
  });

  // 투수 WAR 테이블 (5번째, 0-indexed = 4)
  const warMap = new Map<string, number>();
  $('table').eq(4).find('tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 5) return;
    const korName = cells.eq(2).text().trim();
    const team = cells.eq(3).text().trim();
    const war = parseNum(cells.eq(5).text());
    if (korName && team) warMap.set(`${korName}@${team}`, war);
  });

  // K/9 테이블 (8번째, 0-indexed = 7)
  const kMap = new Map<string, number>();
  $('table').eq(7).find('tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 5) return;
    const korName = cells.eq(2).text().trim();
    const team = cells.eq(3).text().trim();
    const k9 = parseNum(cells.eq(5).text());
    if (korName && team) kMap.set(`${korName}@${team}`, k9);
  });

  // 합치기
  const pitchers: PitcherStats[] = [];
  for (const [key, { team, fip }] of fipMap) {
    const [name] = key.split('@');
    const teamCode = resolveTeamCode(team);
    if (!teamCode) continue;

    pitchers.push({
      name,
      team: teamCode,
      fip,
      xfip: xfipMap.get(key) ?? fip,
      era: 0, // leaders 페이지에 ERA 없음
      innings: 0,
      war: warMap.get(key) ?? 0,
      kPer9: kMap.get(key) ?? 0,
    });
  }

  await sleep(DELAY_MS);
  return pitchers;
}

/**
 * Phase v4-4 C2-B: 타자 스탯 수집.
 * 동일한 /leaders/ 페이지의 상단 4개 테이블(WAR/wRC+/OPS/ISO).
 * 타자 행 컬럼: rank | eng_name | kor_name | team | age | position | stat
 * 투수 행(5컬럼)과 달리 position이 있어 cells.eq(6)에 stat.
 */
export async function fetchBatterStats(season: number): Promise<BatterStats[]> {
  const url = `${BASE_URL}/leaders/`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MoneyBall/1.0 (KBO Prediction Engine)' },
  });

  if (!res.ok) {
    throw new Error(`Fancy Stats leaders (batter) error: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  interface BatterRow {
    team: string;
    position: string;
    age: number;
    war: number;
    wrcPlus: number;
    ops: number;
    iso: number;
  }
  const acc = new Map<string, BatterRow>();

  const readTable = (
    idx: number,
    statKey: 'war' | 'wrcPlus' | 'ops' | 'iso',
  ) => {
    $('table')
      .eq(idx)
      .find('tbody tr')
      .each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 7) return;
        const korName = cells.eq(2).text().trim();
        const team = cells.eq(3).text().trim();
        const age = parseNum(cells.eq(4).text());
        const position = cells.eq(5).text().trim();
        const stat = parseNum(cells.eq(6).text());
        if (!korName || !team) return;
        const key = `${korName}@${team}`;
        const existing = acc.get(key) ?? {
          team,
          position,
          age,
          war: 0,
          wrcPlus: 0,
          ops: 0,
          iso: 0,
        };
        existing[statKey] = stat;
        // 첫 테이블에서 position·age 저장
        if (!existing.position && position) existing.position = position;
        if (!existing.age && age) existing.age = age;
        acc.set(key, existing);
      });
  };

  readTable(0, 'war');
  readTable(1, 'wrcPlus');
  readTable(2, 'ops');
  readTable(3, 'iso');

  const batters: BatterStats[] = [];
  for (const [key, row] of acc) {
    const [name] = key.split('@');
    const teamCode = resolveTeamCode(row.team);
    if (!teamCode) continue;
    batters.push({
      name,
      team: teamCode,
      position: row.position || null,
      age: row.age || null,
      war: row.war,
      wrcPlus: row.wrcPlus,
      ops: row.ops,
      iso: row.iso,
    });
  }

  await sleep(DELAY_MS);
  return batters;
}

/**
 * /elo/ 페이지에서 팀별 통계 수집
 * 테이블: Team | Elo | wOBA | FIP | SFR | 1st | 2nd | ...
 */
export async function fetchTeamStats(season: number): Promise<TeamStats[]> {
  const eloData = await fetchEloRatings(season);
  // Elo 페이지에 wOBA, FIP, SFR이 다 있음
  return eloData.map((e) => ({
    team: e.team,
    woba: e.woba,
    bullpenFip: e.fip, // 팀 전체 FIP (불펜 별도 구분 불가)
    totalWar: 0, // leaders에서 별도 수집 필요
    sfr: e.sfr,
  }));
}

/**
 * /elo/ 페이지에서 Elo 레이팅 + 팀 통계 수집
 */
export async function fetchEloRatings(season: number): Promise<(EloRating & { woba: number; fip: number; sfr: number })[]> {
  const url = `${BASE_URL}/elo/`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MoneyBall/1.0 (KBO Prediction Engine)' },
  });

  if (!res.ok) {
    throw new Error(`Fancy Stats Elo error: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const ratings: (EloRating & { woba: number; fip: number; sfr: number })[] = [];

  // 첫 번째 테이블: rank | Team | Elo | wOBA | FIP | SFR | 1st | 2nd | ...
  $('table').eq(0).find('tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 6) return;

    const rank = cells.eq(0).text().trim();
    const teamName = cells.eq(1).text().trim();
    const elo = parseNum(cells.eq(2).text());
    const woba = parseNum(cells.eq(3).text());
    const fip = parseNum(cells.eq(4).text());
    const sfr = parseNum(cells.eq(5).text());

    const team = resolveTeamCode(teamName);
    if (!team) return;

    ratings.push({
      team,
      elo: elo || 1500,
      winPct: 0.5, // Elo 페이지에 승률 없음, 순위 기반 추정
      woba: woba || 0.320,
      fip: fip || 4.00,
      sfr: sfr || 0,
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
  const exact = pitchers.find((p) => p.name === name && p.team === team);
  if (exact) return exact;
  const byName = pitchers.find((p) => p.name === name);
  return byName || null;
}
