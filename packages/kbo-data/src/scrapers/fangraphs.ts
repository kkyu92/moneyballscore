import * as cheerio from 'cheerio';
import type { TeamCode } from '@moneyball/shared';
import { TEAM_NAME_MAP } from '../types';
import { parseNum, sleep } from './fancy-stats';

const BASE_URL = 'https://www.fangraphs.com/leaders/international/kbo';
const DELAY_MS = 3000; // 예의상 3초

// FanGraphs는 영문 팀명 사용
const FG_TEAM_MAP: Record<string, TeamCode> = {
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
  if (FG_TEAM_MAP[name]) return FG_TEAM_MAP[name];
  for (const [key, code] of Object.entries(FG_TEAM_MAP)) {
    if (name.includes(key) || key.includes(name)) return code;
  }
  // 한글 fallback
  return TEAM_NAME_MAP[name] || null;
}

export interface FanGraphsBatterData {
  team: TeamCode;
  wrcPlus: number;
  iso: number;
  bbPct: number;
  kPct: number;
}

/**
 * FanGraphs KBO 타자 리더보드에서 팀 집계 데이터 수집
 * wRC+, ISO, BB%, K%
 */
export async function fetchBatterLeaders(season: number): Promise<FanGraphsBatterData[]> {
  const url = `${BASE_URL}/batting?season=${season}&split=&team=0&type=1&month=0&pos=all`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MoneyBall/1.0 (KBO Prediction Engine)' },
  });

  if (!res.ok) {
    console.warn(`FanGraphs batter fetch failed: ${res.status}`);
    return [];
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // 팀별 집계를 위해 선수별 데이터를 팀으로 그룹핑
  const teamData = new Map<TeamCode, { wrcPlus: number[]; iso: number[]; bbPct: number[]; kPct: number[] }>();

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 8) return;

    const teamName = cells.eq(1).text().trim();
    const team = resolveTeamCode(teamName);
    if (!team) return;

    if (!teamData.has(team)) {
      teamData.set(team, { wrcPlus: [], iso: [], bbPct: [], kPct: [] });
    }

    const data = teamData.get(team)!;
    const wrcPlus = parseNum(cells.eq(4).text());
    const iso = parseNum(cells.eq(5).text());
    const bbPct = parseNum(cells.eq(6).text());
    const kPct = parseNum(cells.eq(7).text());

    if (wrcPlus > 0) data.wrcPlus.push(wrcPlus);
    if (iso > 0) data.iso.push(iso);
    if (bbPct > 0) data.bbPct.push(bbPct);
    if (kPct > 0) data.kPct.push(kPct);
  });

  await sleep(DELAY_MS);

  const results: FanGraphsBatterData[] = [];
  for (const [team, data] of teamData) {
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    results.push({
      team,
      wrcPlus: Math.round(avg(data.wrcPlus)),
      iso: Math.round(avg(data.iso) * 1000) / 1000,
      bbPct: Math.round(avg(data.bbPct) * 1000) / 1000,
      kPct: Math.round(avg(data.kPct) * 1000) / 1000,
    });
  }

  return results;
}
