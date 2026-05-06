import * as cheerio from 'cheerio';
import type { TeamCode } from '@moneyball/shared';
import type { PitcherStats, TeamStats, EloRating, BatterStats } from '../types';
import { TEAM_NAME_MAP } from '../types';
import { fetchKboPitcherBasic } from './kbo-pitcher';

const BASE_URL = 'https://www.kbofancystats.com';
const DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fancy Stats 영문 팀명 → TeamCode.
// 매칭은 case-insensitive — Fancy Stats 가 종종 대소문자 표기 변경
// (2026-04: "KIA Tigers" → "Kia Tigers" drift 로 HT 1팀 누락 사고 발생).
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

export function resolveTeamCode(name: string): TeamCode | null {
  const lower = name.trim().toLowerCase();
  // 빈 입력 가드 — 없으면 step 2 의 양방향 includes 가
  // lowerKey.includes('') = true 로 빈 셀을 첫 매핑팀(SK)으로 오분류.
  if (!lower) return null;
  // 1) case-insensitive 직접 매칭
  for (const [key, code] of Object.entries(FS_TEAM_MAP)) {
    if (key.toLowerCase() === lower) return code;
  }
  // 2) case-insensitive 부분 매칭 (양방향 includes)
  for (const [key, code] of Object.entries(FS_TEAM_MAP)) {
    const lowerKey = key.toLowerCase();
    if (lower.includes(lowerKey) || lowerKey.includes(lower)) return code;
  }
  // 3) 한글 팀명 폴백
  return TEAM_NAME_MAP[name] || null;
}

function parseNum(text: string): number {
  const cleaned = text.replace(/[^0-9.\-]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/**
 * Fancy Stats 이름 셀 파싱. 현재 구조는 "Eng Name | 한글명" 단일 셀.
 * 한글 이름만 추출 (팀 매칭·DB 저장에 사용).
 */
function parseNameCell(raw: string): string {
  const parts = raw.split('|').map((s) => s.trim());
  for (const p of parts) {
    if (/[가-힣]/.test(p)) return p;
  }
  return parts[parts.length - 1] ?? '';
}

/**
 * /leaders/ HTML에서 투수 스탯 파싱 (순수 함수).
 *
 * 테이블 4 WAR, 5 FIP, 6 xFIP, 7 K/9.
 * 행 구조 (2026-04 확인):
 *   cells[0]=rank, cells[1]="Eng | 한글", cells[2]=team, cells[3]=age, cells[4]=stat
 */
export function parsePitchersFromHtml(html: string): PitcherStats[] {
  const $ = cheerio.load(html);

  const readPitcherTable = (idx: number): Map<string, { team: string; stat: number }> => {
    const m = new Map<string, { team: string; stat: number }>();
    $('table').eq(idx).find('tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 5) return;
      const korName = parseNameCell(cells.eq(1).text());
      const team = cells.eq(2).text().trim();
      const stat = parseNum(cells.eq(4).text());
      if (korName && team) m.set(`${korName}@${team}`, { team, stat });
    });
    return m;
  };

  const warMapT = readPitcherTable(4);
  const fipMap = new Map<string, { team: string; fip: number }>();
  for (const [k, v] of readPitcherTable(5)) fipMap.set(k, { team: v.team, fip: v.stat });

  const xfipMap = new Map<string, number>();
  for (const [k, v] of readPitcherTable(6)) xfipMap.set(k, v.stat);

  const warMap = new Map<string, number>();
  for (const [k, v] of warMapT) warMap.set(k, v.stat);

  const kMap = new Map<string, number>();
  for (const [k, v] of readPitcherTable(7)) kMap.set(k, v.stat);

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
      era: 0,
      innings: 0,
      war: warMap.get(key) ?? 0,
      kPer9: kMap.get(key) ?? 0,
    });
  }

  return pitchers;
}

/**
 * /leaders/ 페이지 fetch → 순수 파서 호출. 내부 전용.
 */
async function fetchFancyStatsPitchers(): Promise<PitcherStats[]> {
  const url = `${BASE_URL}/leaders/`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MoneyBall/1.0 (KBO Prediction Engine)' },
  });

  if (!res.ok) {
    throw new Error(`Fancy Stats leaders error: ${res.status}`);
  }

  const html = await res.text();
  const pitchers = parsePitchersFromHtml(html);

  await sleep(DELAY_MS);
  return pitchers;
}

/**
 * 투수 시즌 스탯 수집 — Fancy Stats + KBO 공식 merge.
 *
 * Fancy Stats 는 WAR·xFIP·K/9 같은 고급 지표 제공하지만 top 50 리미트.
 * KBO 공식 Basic1 은 28명 + FIP 직접 계산만 가능. 두 소스 교집합은
 * Fancy Stats 값 우선 (xFIP·WAR·K/9 보존), 차집합은 KBO 공식으로 보강
 * 해서 커버리지 최대화.
 *
 * KBO 공식 호출 실패 시 Fancy Stats 만 반환 (graceful degrade).
 */
export async function fetchPitcherStats(_season: number): Promise<PitcherStats[]> {
  const fancy = await fetchFancyStatsPitchers();

  let kbo: PitcherStats[] = [];
  try {
    kbo = await fetchKboPitcherBasic();
  } catch (e) {
    console.warn('[fetchPitcherStats] KBO Basic1 fallback skipped:', e);
  }

  // name@team 키로 중복 제거. Fancy Stats 먼저 넣고, KBO 공식은 신규만.
  const seen = new Set<string>();
  const merged: PitcherStats[] = [];
  for (const p of fancy) {
    const key = `${p.name}@${p.team}`;
    seen.add(key);
    merged.push(p);
  }
  for (const p of kbo) {
    const key = `${p.name}@${p.team}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(p);
    }
  }
  return merged;
}

/**
 * /leaders/ HTML에서 타자 스탯 파싱 (순수 함수).
 *
 * 테이블 0 WAR, 1 wRC+, 2 OPS, 3 ISO.
 * 행 구조:
 *   cells[0]=rank, cells[1]="Eng | 한글", cells[2]=team,
 *   cells[3]=age, cells[4]=position, cells[5]=stat
 */
export function parseBattersFromHtml(html: string): BatterStats[] {
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
        if (cells.length < 6) return;
        const korName = parseNameCell(cells.eq(1).text());
        const team = cells.eq(2).text().trim();
        const age = parseNum(cells.eq(3).text());
        const position = cells.eq(4).text().trim();
        const stat = parseNum(cells.eq(5).text());
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

  return batters;
}

/**
 * /leaders/ 페이지에서 타자 스탯 수집 (fetch → parse).
 */
export async function fetchBatterStats(_season: number): Promise<BatterStats[]> {
  const url = `${BASE_URL}/leaders/`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MoneyBall/1.0 (KBO Prediction Engine)' },
  });

  if (!res.ok) {
    throw new Error(`Fancy Stats leaders (batter) error: ${res.status}`);
  }

  const html = await res.text();
  const batters = parseBattersFromHtml(html);
  await sleep(DELAY_MS);
  return batters;
}

/**
 * /elo/ 페이지에서 팀별 통계 수집
 * 테이블: Team | Elo | wOBA | FIP | SFR | 1st | 2nd | ...
 *
 * totalWar 는 /elo/ 페이지에 없어 0 으로 stub. predictor WAR factor (8%) +
 * team-agent LLM 프롬프트 + DB 모두 stub 0 진입 — fetchEloRatings 의
 * detectFancyStatsFallbacks family 가 elo/woba/fip/sfr 만 cover 하던 정합 누락을
 * stub 가시화로 채워 다음 cycle leaders 페이지 fetch 도입 trigger 로 활용.
 */
export async function fetchTeamStats(season: number): Promise<TeamStats[]> {
  const eloData = await fetchEloRatings(season);
  if (eloData.length > 0) {
    console.warn('[fetchTeamStats] totalWar=0 stub for all teams — leaders 페이지 별도 수집 미구현', {
      teamCount: eloData.length,
      teams: eloData.map((e) => e.team),
    });
  }
  return eloData.map((e) => ({
    team: e.team,
    woba: e.woba,
    bullpenFip: e.fip,
    totalWar: 0,
    sfr: e.sfr,
  }));
}

// fancy-stats / 파이프라인 default 단일 source.
// cycle 64 review-code (heavy) — daily.ts 416-419 의 동일 magic number 중복 제거.
// 본 값들은 KBO 평균 baseline (woba 0.320 / fip 4.00 / sfr 0 / elo 1500 / winPct 0.5).
// 팀별 데이터 부재 시 진입 — 진입 자체는 silent fallback 위험 신호.
export const FANCY_STATS_DEFAULTS = {
  woba: 0.320,
  fip: 4.00,
  sfr: 0,
  elo: 1500,
  winPct: 0.5,
} as const;

// fancy-stats Elo row silent fallback 측정.
// parseNum 결과가 0/NaN 일 때 || 단락 평가로 fallback 진입 — 진짜 0 vs 데이터 부재 구분 불가.
// cycle 60 lesson + cycle 62 fix-incident — fellBack 시 console.warn 으로 Sentry 가시화.
export interface FancyStatsFallbacks {
  elo: boolean;
  woba: boolean;
  fip: boolean;
  sfr: boolean;
}

export function detectFancyStatsFallbacks(raw: {
  elo: number;
  woba: number;
  fip: number;
  sfr: number;
}): FancyStatsFallbacks {
  return {
    elo: !raw.elo,
    woba: !raw.woba,
    fip: !raw.fip,
    sfr: !raw.sfr,
  };
}

export function hasAnyFallback(flags: FancyStatsFallbacks): boolean {
  return flags.elo || flags.woba || flags.fip || flags.sfr;
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

    const teamName = cells.eq(1).text().trim();
    const elo = parseNum(cells.eq(2).text());
    const woba = parseNum(cells.eq(3).text());
    const fip = parseNum(cells.eq(4).text());
    const sfr = parseNum(cells.eq(5).text());

    const team = resolveTeamCode(teamName);
    if (!team) return;

    const fallbacks = detectFancyStatsFallbacks({ elo, woba, fip, sfr });
    if (hasAnyFallback(fallbacks)) {
      console.warn('[fancy-stats] silent fallback applied', {
        team,
        teamName,
        fallbacks,
        raw: {
          elo: cells.eq(2).text().trim(),
          woba: cells.eq(3).text().trim(),
          fip: cells.eq(4).text().trim(),
          sfr: cells.eq(5).text().trim(),
        },
      });
    }

    ratings.push({
      team,
      elo: elo || FANCY_STATS_DEFAULTS.elo,
      winPct: FANCY_STATS_DEFAULTS.winPct, // Elo 페이지에 승률 없음, 순위 기반 추정
      woba: woba || FANCY_STATS_DEFAULTS.woba,
      fip: fip || FANCY_STATS_DEFAULTS.fip,
      sfr: sfr || FANCY_STATS_DEFAULTS.sfr,
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
