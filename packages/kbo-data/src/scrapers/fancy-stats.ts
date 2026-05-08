import * as cheerio from 'cheerio';
import type { TeamCode } from '@moneyball/shared';
import type { PitcherStats, TeamStats, EloRating, BatterStats } from '../types';
import { KBO_USER_AGENT, TEAM_NAME_MAP, assertResponseOk } from '../types';
import { fetchKboPitcherBasic } from './kbo-pitcher';

const BASE_URL = 'https://www.kbofancystats.com';
const DELAY_MS = 2000;

// scrapers utility — fangraphs.ts 가 동일 1줄 wrapper 보유했음 (cycle 185
// silent drift family scrapers 차원 6번째 진입). fancy-stats.ts 가 이미
// parseNumWithFallback export 중이라 같은 위치에서 sleep + parseNum export
// 통일. kbo-official.ts 의 sleep / backfill-records.ts·llm.ts·llm-deepseek.ts
// 의 sleep 은 scope 분리 (scrapers utility ≠ pipeline/agents utility).
export function sleep(ms: number) {
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

// parseNum 의 NaN 0-fallback simple 변형. fangraphs.ts 도 동일 정의 박제됐어
// 단일 export 통일 (cycle 185). xfip fallback / totalWar=0 stub family 와 같
// 패턴 — silent fallback 차단 위해선 parseNumWithFallback 우선.
export function parseNum(text: string): number {
  const cleaned = text.replace(/[^0-9.\-]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// parseNum 의 NaN 0-fallback 가시화 helper. parseNum 자체는 호환성 유지
// (단순 호출자용). 테이블 파서는 NaN ratio 측정으로 silent drift 차단 —
// xfip fallback (cycle 145) / totalWar=0 stub (cycle 137) / winPct=0.5 stub
// (cycle 138) family 와 동일 패턴.
export function parseNumWithFallback(text: string): { value: number; fellBack: boolean } {
  const cleaned = text.replace(/[^0-9.\-]/g, '');
  const val = parseFloat(cleaned);
  if (isNaN(val)) return { value: 0, fellBack: true };
  return { value: val, fellBack: false };
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

  const readPitcherTable = (
    idx: number,
    label: string,
  ): Map<string, { team: string; stat: number }> => {
    const m = new Map<string, { team: string; stat: number }>();
    let nanCount = 0;
    let totalRows = 0;
    $('table').eq(idx).find('tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 5) return;
      const korName = parseNameCell(cells.eq(1).text());
      const team = cells.eq(2).text().trim();
      const { value: stat, fellBack } = parseNumWithFallback(cells.eq(4).text());
      if (korName && team) {
        totalRows += 1;
        if (fellBack) nanCount += 1;
        m.set(`${korName}@${team}`, { team, stat });
      }
    });
    if (totalRows === 0) {
      console.warn('[parsePitchersFromHtml] empty table silent drift', {
        tableIndex: idx,
        label,
        ratio: '1.00',
      });
    } else if (nanCount > 0) {
      console.warn('[parsePitchersFromHtml] parseNum NaN fallback to 0 silent drift', {
        tableIndex: idx,
        label,
        nanCount,
        totalRows,
        ratio: (nanCount / totalRows).toFixed(2),
      });
    }
    return m;
  };

  const warMapT = readPitcherTable(4, 'war');
  const fipMap = new Map<string, { team: string; fip: number }>();
  for (const [k, v] of readPitcherTable(5, 'fip')) fipMap.set(k, { team: v.team, fip: v.stat });

  const xfipMap = new Map<string, number>();
  for (const [k, v] of readPitcherTable(6, 'xfip')) xfipMap.set(k, v.stat);

  const warMap = new Map<string, number>();
  for (const [k, v] of warMapT) warMap.set(k, v.stat);

  const kMap = new Map<string, number>();
  for (const [k, v] of readPitcherTable(7, 'kPer9')) kMap.set(k, v.stat);

  // xfip fallback silent drift family (cycle 137/138 stub 가시화 패턴 동일):
  // xfipMap 에 없으면 fip 값 박제 → predictor weight (sp_fip 0.15 / sp_xfip 0.05)
  // 가 사실상 sp_fip 0.20 silent 중복. snapshot-pitchers `xfip !== fip` source
  // 라벨링도 fallback row 를 'kbo-basic1' 로 오분류. 결손률 측정 가시화로
  // 다음 cycle 의 root fix (table 6 fetch 정합성 / 별도 source 필드) trigger.
  const pitchers: PitcherStats[] = [];
  const xfipFallbackKeys: string[] = [];
  for (const [key, { team, fip }] of fipMap) {
    const [name] = key.split('@');
    const teamCode = resolveTeamCode(team);
    if (!teamCode) continue;

    const xfipFromMap = xfipMap.get(key);
    if (xfipFromMap === undefined) xfipFallbackKeys.push(key);

    pitchers.push({
      name,
      team: teamCode,
      fip,
      xfip: xfipFromMap ?? fip,
      era: 0,
      innings: 0,
      war: warMap.get(key) ?? 0,
      kPer9: kMap.get(key) ?? 0,
    });
  }

  if (xfipFallbackKeys.length > 0 && fipMap.size > 0) {
    console.warn('[parsePitchersFromHtml] xfip fallback to fip silent drift', {
      fallbackCount: xfipFallbackKeys.length,
      totalPitchers: fipMap.size,
      fallbackRatio: (xfipFallbackKeys.length / fipMap.size).toFixed(2),
      sampleKeys: xfipFallbackKeys.slice(0, 3),
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
    headers: { 'User-Agent': KBO_USER_AGENT },
  });

  assertResponseOk(res, 'Fancy Stats leaders error');

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
 *
 * **`_season` 인자는 무시됨**. Fancy Stats `/leaders/` 는 시즌 query 미지원 —
 * 호출 시점의 현재 시즌 데이터만 반환. historical season 전달 시 호출자가
 * "특정 시즌 snapshot" 으로 신뢰하면 silent drift 발생 (cycle 137 totalWar=0
 * stub / cycle 138 winPct=0.5 stub family — underscore prefix 가 unused 신호).
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
    let nanCount = 0;
    let totalRows = 0;
    $('table')
      .eq(idx)
      .find('tbody tr')
      .each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 6) return;
        const korName = parseNameCell(cells.eq(1).text());
        const team = cells.eq(2).text().trim();
        const ageParsed = parseNumWithFallback(cells.eq(3).text());
        const position = cells.eq(4).text().trim();
        const statParsed = parseNumWithFallback(cells.eq(5).text());
        if (!korName || !team) return;
        totalRows += 1;
        if (statParsed.fellBack) nanCount += 1;
        const key = `${korName}@${team}`;
        const existing = acc.get(key) ?? {
          team,
          position,
          age: ageParsed.value,
          war: 0,
          wrcPlus: 0,
          ops: 0,
          iso: 0,
        };
        existing[statKey] = statParsed.value;
        if (!existing.position && position) existing.position = position;
        if (!existing.age && ageParsed.value) existing.age = ageParsed.value;
        acc.set(key, existing);
      });
    if (totalRows === 0) {
      console.warn('[parseBattersFromHtml] empty table silent drift', {
        tableIndex: idx,
        label: statKey,
        ratio: '1.00',
      });
    } else if (nanCount > 0) {
      console.warn('[parseBattersFromHtml] parseNum NaN fallback to 0 silent drift', {
        tableIndex: idx,
        label: statKey,
        nanCount,
        totalRows,
        ratio: (nanCount / totalRows).toFixed(2),
      });
    }
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
 *
 * **`_season` 인자는 무시됨**. fetchPitcherStats 와 동일 — Fancy Stats
 * `/leaders/` 는 시즌 query 미지원, 호출 시점의 현재 시즌 데이터만 반환.
 */
export async function fetchBatterStats(_season: number): Promise<BatterStats[]> {
  const url = `${BASE_URL}/leaders/`;
  const res = await fetch(url, {
    headers: { 'User-Agent': KBO_USER_AGENT },
  });

  assertResponseOk(res, 'Fancy Stats leaders (batter) error');

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
 *
 * **`_season` 인자는 무시됨**. Fancy Stats `/elo/` 는 시즌 query 미지원 —
 * fetchEloRatings 와 동일하게 호출 시점의 현재 시즌만 반환. underscore prefix
 * 가 unused 신호 (fetchPitcherStats / fetchBatterStats 와 정렬, cycle 180
 * silent drift family scrapers 차원 첫 진입).
 */
export async function fetchTeamStats(_season: number): Promise<TeamStats[]> {
  const eloData = await fetchEloRatings(_season);
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
 * /elo/ 페이지에서 Elo 레이팅 + 팀 통계 수집.
 *
 * **`_season` 인자는 무시됨**. Fancy Stats `/elo/` 는 시즌 query 미지원 —
 * 호출 시점의 현재 시즌만 반환. fetchPitcherStats / fetchBatterStats /
 * fetchTeamStats 와 underscore prefix 정렬 (cycle 180 silent drift family
 * scrapers 차원 첫 진입).
 */
export async function fetchEloRatings(_season: number): Promise<(EloRating & { woba: number; fip: number; sfr: number })[]> {
  const url = `${BASE_URL}/elo/`;
  const res = await fetch(url, {
    headers: { 'User-Agent': KBO_USER_AGENT },
  });

  assertResponseOk(res, 'Fancy Stats Elo error');

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
      // Elo 페이지에 승률 컬럼 부재 — 모든 팀 0.5 stub. predictions.elo_win_pct
      // 컬럼 매 row 동일 0.5 박제 (사용처 = daily.ts insert only, downstream 없음).
      // cycle 138 가시화: stub 자체는 유지하고 console.warn 으로 silent drift 차단
      // (cycle 137 totalWar=0 stub 가시화 family 동일 패턴).
      winPct: FANCY_STATS_DEFAULTS.winPct,
      woba: woba || FANCY_STATS_DEFAULTS.woba,
      fip: fip || FANCY_STATS_DEFAULTS.fip,
      sfr: sfr || FANCY_STATS_DEFAULTS.sfr,
    });
  });

  if (ratings.length > 0) {
    console.warn('[fetchEloRatings] winPct=0.5 stub for all teams — Elo 페이지에 승률 컬럼 부재', {
      teamCount: ratings.length,
      teams: ratings.map((r) => r.team),
    });
  }

  await sleep(DELAY_MS);
  return ratings;
}

/**
 * 특정 투수 이름으로 스탯 조회.
 *
 * exact 실패 후 byName fallback 진입 시 = 같은 이름이지만 다른 팀 row
 * (KBO 동명이인 / 트레이드 직후 Fancy Stats 미반영 / 입력 team mismatch).
 * cycle 145 xfip fallback / 137 totalWar=0 / 138 winPct=0.5 stub family 와 동일
 * 패턴 — fallback 자체는 유지하되 console.warn 으로 가시화하여 silent 통과
 * 차단. 호출자 daily.ts:563-564 의 PredictionInput.homeSPStats / awaySPStats
 * 흐름과 동작 호환 유지.
 */
export function findPitcher(
  pitchers: PitcherStats[],
  name: string,
  team: TeamCode
): PitcherStats | null {
  const exact = pitchers.find((p) => p.name === name && p.team === team);
  if (exact) return exact;
  const byName = pitchers.find((p) => p.name === name);
  if (byName) {
    console.warn('[findPitcher] byName fallback team mismatch silent drift', {
      name,
      requestedTeam: team,
      foundTeam: byName.team,
    });
  }
  return byName || null;
}
