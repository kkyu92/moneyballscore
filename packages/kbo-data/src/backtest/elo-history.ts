/**
 * Fancy Stats /elohistory/ 에 임베디드된 Plotly JSON 파싱.
 *
 * 각 팀 trace 에 `text` 배열로 `"date: YYYY-MM-DD<br />elo: XXXX.XXX<br />team: <name>"`
 * 형식이 있음. 팀별 시계열 Elo 를 Map 으로 복원.
 *
 * 2026-04-21 확인: 2007 시즌부터 현재까지 일별 기록. 현대 Unicorns 같은 폐업팀 제외
 * 10개 현재팀 모두 커버 (일부 NC/KT 는 창단 시점부터).
 */

import type { TeamCode } from '@moneyball/shared';
import { resolveTeamCode } from '../scrapers/fancy-stats';

const ELOHISTORY_URL = 'https://www.kbofancystats.com/elohistory/';

export interface EloPoint {
  date: string; // YYYY-MM-DD
  elo: number;
}

export type EloHistory = Map<TeamCode, EloPoint[]>;

/**
 * HTML 에서 Plotly trace `text` 배열을 추출 → 팀별 시계열로 변환.
 * 순수 함수 — 테스트 가능.
 */
export function parseEloHistory(html: string): EloHistory {
  const out: EloHistory = new Map();

  // Plotly trace 의 text 배열만 모은 뒤, 각 point 에 박힌 `team: X` substring
  // 으로 팀을 직접 결정. (trace name 과 text 배열의 HTML 위치가 항상 페어링
  // 되지 않음 — Hyundai 같은 은퇴팀 trace 의 name 이 다른 팀 text 앞에 오면
  // 오매칭 발생. 각 point 의 embedded team 이 ground truth.)
  const textRe = /"text":\s*\[\s*"([^\]]*?)"\s*\]/g;
  const perTeam = new Map<TeamCode, Map<string, EloPoint>>();

  let m: RegExpExecArray | null;
  while ((m = textRe.exec(html))) {
    const raw = m[1];
    const pieces = raw.split(/","/);
    for (const p of pieces) {
      const dateM = p.match(/date:\s*(\d{4}-\d{2}-\d{2})/);
      const eloM = p.match(/elo:\s*(-?\d+(?:\.\d+)?)/);
      const teamM = p.match(/team:\s*([^<"]+?)(?:<br|$)/);
      if (!dateM || !eloM || !teamM) continue;
      const teamCode = resolveTeamCode(teamM[1].trim());
      if (!teamCode) continue;
      const bucket = perTeam.get(teamCode) ?? new Map<string, EloPoint>();
      bucket.set(dateM[1], { date: dateM[1], elo: parseFloat(eloM[1]) });
      perTeam.set(teamCode, bucket);
    }
  }

  for (const [team, bucket] of perTeam) {
    const sorted = Array.from(bucket.values()).sort((a, b) =>
      a.date < b.date ? -1 : 1,
    );
    out.set(team, sorted);
  }

  return out;
}

/**
 * `"date: 2007-04-06<br />elo: 1501.862<br />team: LG Twins","date: 2007-04-07..."`
 * 형태의 escape 된 단일 문자열을 개별 point 로 분리.
 * 입력은 JSON 문자열 내용물 (양 끝 따옴표 이미 제거됨).
 */
export function parseTextBlock(raw: string): EloPoint[] {
  // "," 로 split 하면 text 내부 따옴표가 없으므로 안전. 단 각 조각의 시작은 `date:`.
  const out: EloPoint[] = [];
  const pieces = raw.split(/","/);
  for (const p of pieces) {
    const dateM = p.match(/date:\s*(\d{4}-\d{2}-\d{2})/);
    const eloM = p.match(/elo:\s*(-?\d+(?:\.\d+)?)/);
    if (!dateM || !eloM) continue;
    out.push({ date: dateM[1], elo: parseFloat(eloM[1]) });
  }
  return out;
}

/**
 * 특정 팀의 asOfDate **직전** (exclusive) 최신 Elo 값. 데이터 없으면 null.
 * Binary search 로 O(log n).
 */
export function getEloAt(
  history: EloPoint[],
  asOfDate: string,
): number | null {
  if (history.length === 0) return null;
  if (asOfDate <= history[0].date) return null;
  let lo = 0;
  let hi = history.length;
  // 가장 큰 idx s.t. history[idx].date < asOfDate
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (history[mid].date < asOfDate) lo = mid + 1;
    else hi = mid;
  }
  const idx = lo - 1;
  if (idx < 0) return null;
  return history[idx].elo;
}

/** 실제 Fancy Stats 에서 HTML 을 가져와 파싱. */
export async function fetchEloHistory(): Promise<EloHistory> {
  const res = await fetch(ELOHISTORY_URL, {
    headers: { 'User-Agent': 'MoneyBall/1.0 (KBO Backtest)' },
  });
  if (!res.ok) {
    throw new Error(`elohistory fetch failed: ${res.status}`);
  }
  const html = await res.text();
  return parseEloHistory(html);
}
