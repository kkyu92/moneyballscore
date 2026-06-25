/**
 * M-F2 — KBO 심판 4인 scraper (cycle 1014 Day 2 갱신).
 *
 * 변경 이력:
 *   cycle 1013: KBO 공식 Score.aspx 시도 → 302 redirect (URL 부족 params) + GameCenter
 *               JS 렌더링 SPA 라 cheerio 셀렉터 무효. 폐기.
 *   cycle 1014: Naver record API 전환 — etcRecords 안 `how === '심판'` row 의 result
 *               필드에 4 umpire 공백 구분 박제 (예: "장준영 이호성 이기중 박종철").
 *               KBO 공식 도메인 robots 차단 + JS 렌더링 양쪽 회피.
 *
 * 안전:
 *   - HTTP fail / API 응답 변경 → throw (호출자 catch → league-avg fallback)
 *   - 4 umpire 미박제 → throw (selector drift 차단)
 *   - rate limit 호출자 보장 (본 함수 1회 호출 = 0 sleep, daily pipeline 안 외부 loop 시 2초 sleep)
 *
 * 데이터 source: Naver sports record API (`api-gw.sports.naver.com/schedule/games/.../record`).
 * naver-record.ts 의 fetchNaverRecord 와 동일 API. 본 파일은 umpire 필드만 추출.
 */

import { NAVER_BROWSER_USER_AGENT, NAVER_SPORTS_API_BASE } from '@moneyball/shared';
import { toNaverGameId } from './naver-record';

export interface GameUmpires {
  /** 주심 — strike zone bias 의 1차 영향 source */
  main: string;
  /** 1루심 */
  first: string;
  /** 2루심 */
  second: string;
  /** 3루심 */
  third: string;
}

interface NaverEtcRecord {
  result?: string;
  how?: string;
}

/**
 * Naver record JSON → 심판 4인.
 * 순수 함수 — fixture 기반 테스트 + 실제 fetch 분리.
 *
 * 셀렉터 전략:
 *   `result.recordData.etcRecords[].how === '심판'` row 의 result 필드 안
 *   공백 구분 4 umpire 박제. 예: "장준영 이호성 이기중 박종철" → 주심/1루/2루/3루 순서.
 *
 * 4명 미만 매칭 → throw (silent drift 차단)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseUmpiresFromRecord(json: any): GameUmpires {
  const etcRecords = json?.result?.recordData?.etcRecords;
  if (!Array.isArray(etcRecords)) {
    throw new Error('Naver record parse error: etcRecords missing');
  }

  const umpireRow = etcRecords.find(
    (r: NaverEtcRecord) => r?.how === '심판' && typeof r?.result === 'string',
  ) as NaverEtcRecord | undefined;

  if (!umpireRow || !umpireRow.result) {
    throw new Error(
      'Naver record parse error: 심판 row not found (game not yet final or API drift)',
    );
  }

  const names = umpireRow.result.trim().split(/\s+/);
  if (names.length < 4) {
    throw new Error(
      `Naver record parse error: 4 umpire roles required, got ${names.length} (${umpireRow.result})`,
    );
  }

  return {
    main: names[0],
    first: names[1],
    second: names[2],
    third: names[3],
  };
}

/**
 * external_game_id (13자) 로 심판 4인 fetch.
 *
 * @param externalGameId  13자 KBO 공식 gameId (예: 20260527SSSK0)
 * @param season          season year (예: 2026). gameId 17자 시 무시
 * @throws  HTTP error / API 응답 변경 / 심판 row 부재 시 (호출자 catch → league-avg fallback)
 */
export async function scrapeGameUmpires(
  externalGameId: string,
  season: number,
): Promise<GameUmpires> {
  const naverGameId = toNaverGameId(externalGameId, season);
  const url = `${NAVER_SPORTS_API_BASE}/${naverGameId}/record`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': NAVER_BROWSER_USER_AGENT,
      Referer: 'https://m.sports.naver.com/',
    },
  });

  if (!res.ok) {
    throw new Error(
      `Naver record fetch error: HTTP ${res.status} (${externalGameId})`,
    );
  }

  const json = await res.json();
  return parseUmpiresFromRecord(json);
}
