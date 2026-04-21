/**
 * Wayback Machine 에서 Fancy Stats `/elo/` 시즌 말 스냅샷 파싱.
 *
 * Fancy Stats 는 현재 시즌 누적만 노출하는 Hugo 정적 사이트. 시즌 종료
 * 직후 Wayback 이 캡처한 스냅샷에 **해당 시즌 최종 team 누적 stats** 가
 * 박혀 있음 → 과거 시즌 wOBA / FIP / SFR 복원의 유일한 합법 경로.
 *
 * CDX 확인 (2026-04-21 기준):
 *   - 2022: 20230131171734
 *   - 2023: 20230926193445 (정규시즌 직전 마지막 스냅샷)
 *   - 2024: 20250124005908 (KS 종료 후)
 *   - 2025: 스냅샷 없음 → 본 모듈 미지원
 *
 * Look-ahead bias: 시즌 말 값을 시즌 내 경기 예측에 사용 → 최대 6~8개월
 * 편향. 모델 간 상대 비교에는 동일 편향 적용되어 유효 (feature selection
 * 결론은 왜곡되지 않음).
 */

import type { TeamCode } from '@moneyball/shared';
import { resolveTeamCode } from '../scrapers/fancy-stats';

export interface SeasonTeamStat {
  elo: number;
  woba: number;
  fip: number;
  sfr: number;
}

export type SeasonStatsMap = Map<TeamCode, SeasonTeamStat>;

/** 지원 시즌 → Wayback timestamp. */
export const SEASON_SNAPSHOTS: Record<number, string> = {
  2022: '20230131171734',
  2023: '20230926193445',
  2024: '20250124005908',
};

/**
 * HTML 에서 `/elo/` 페이지 stat 테이블 파싱.
 * 열 구조: rank | Team | Elo | wOBA | FIP | SFR | 1st | 2nd | ... | Out.
 */
export function parseEloTable(html: string): SeasonStatsMap {
  const out: SeasonStatsMap = new Map();

  const tableMatches = html.match(/<table[^>]*>[\s\S]*?<\/table>/g) ?? [];
  for (const t of tableMatches) {
    const rowMatches = t.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? [];
    for (const row of rowMatches) {
      const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) =>
        m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      );
      if (cells.length < 6) continue;
      // 첫 셀이 숫자 rank, 두번째가 팀명 (영문)
      const rank = Number(cells[0]);
      if (!Number.isFinite(rank) || rank < 1 || rank > 12) continue;
      const teamName = cells[1];
      const elo = Number(cells[2]);
      const woba = Number(cells[3]);
      const fip = Number(cells[4]);
      const sfr = Number(cells[5]);
      if (![elo, woba, fip, sfr].every(Number.isFinite)) continue;
      const code = resolveTeamCode(teamName);
      if (!code) continue;
      out.set(code, { elo, woba, fip, sfr });
    }
  }
  return out;
}

/** 주어진 시즌의 Wayback /elo/ 페이지 fetch → 파싱. */
export async function fetchSeasonTeamStats(season: number): Promise<SeasonStatsMap> {
  const ts = SEASON_SNAPSHOTS[season];
  if (!ts) throw new Error(`No Wayback snapshot for season ${season}`);
  const url = `https://web.archive.org/web/${ts}/https://www.kbofancystats.com/elo/`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MoneyBall/1.0 (KBO Backtest)' },
  });
  if (!res.ok) throw new Error(`Wayback ${season} fetch failed: ${res.status}`);
  const html = await res.text();
  const map = parseEloTable(html);
  if (map.size < 10) {
    throw new Error(
      `Wayback ${season} parse: only ${map.size} teams found (expected 10)`,
    );
  }
  return map;
}

/** 여러 시즌 한 번에. 2025 요청 시 skip. */
export async function fetchAllSeasonTeamStats(
  seasons: number[],
): Promise<Map<number, SeasonStatsMap>> {
  const out = new Map<number, SeasonStatsMap>();
  for (const s of seasons) {
    if (!SEASON_SNAPSHOTS[s]) continue;
    const map = await fetchSeasonTeamStats(s);
    out.set(s, map);
  }
  return out;
}
