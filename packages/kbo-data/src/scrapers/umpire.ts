/**
 * M-F2 — KBO 게임센터 심판 4인 스크래퍼 (cycle 1013).
 *
 * KBO 공식 Score.aspx (`/Game/Score.aspx?gameId=...`) 안 심판 4인
 * (주심 / 1루 / 2루 / 3루) 추출. factor 12 umpire_sz 의 raw source.
 *
 * 보조 데이터 — umpire_stats DB 의 sample_n 누적 source. 본 scraper 자체는
 * 단일 경기 4인 리스트만 리턴. 누적 카운트는 별도 daily pipeline (carry-over)
 * 가 본 결과를 read 해서 umpire_stats UPSERT.
 *
 * 안전:
 *   - rate limit 2초 (CLAUDE.md 룰, 호출자가 외부 loop 시 보장 — 본 함수 1회 호출 = 0 sleep)
 *   - KBO User-Agent 헤더 박제 (kbo-pitcher.ts 패턴 정합)
 *   - 셀렉터 변경 detect → 4 미만 추출 시 throw (silent drift 차단)
 *   - robots.txt 차단 / HTTP error → throw (호출자 catch → league-avg fallback path)
 *
 * 데이터 source: KBO 공식 Score.aspx — robots.txt 명시 차단 X (kbo-official /
 * kbo-pitcher 동일 도메인). 본 fixture 박제 후 실제 fire 는 daily pipeline 진입
 * (본 plan = 스크래퍼 박제 + factor scoring 만).
 */

import * as cheerio from 'cheerio';
import {
  KBO_BASE_URL as BASE_URL,
  KBO_USER_AGENT,
  assertResponseOk,
} from '../types';

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

/**
 * Score.aspx HTML → 심판 4인.
 * 순수 함수 — fixture 기반 테스트 + 실제 fetch 분리.
 *
 * 셀렉터 전략:
 *   KBO Score.aspx 안 심판 정보는 `dl.tbl-info` 또는 `table.tbl-info` 안 dt/dd 또는
 *   td 구조로 박제 (페이지 변형 다수). 안전 fallback:
 *   1. `dl.tbl-umpire` 또는 `table.tbl-umpire` 우선 (정식 셀렉터)
 *   2. 위 부재 시 page 전체에서 "주심", "1루", "2루", "3루" 텍스트 라벨 옆 인접 셀 lookup
 *
 * 4명 미만 매칭 → throw (silent drift 차단 — 셀렉터 변경 / robots 차단 시 noisy)
 */
export function parseUmpiresFromHtml(html: string): GameUmpires {
  const $ = cheerio.load(html);

  // 전략 1 — 정식 셀렉터 (dl.tbl-umpire / table.tbl-umpire)
  const formal = parseFormalUmpireTable($);
  if (formal) return formal;

  // 전략 2 — 라벨 텍스트 기반 fallback
  const fallback = parseUmpiresByLabel($);
  if (fallback) return fallback;

  throw new Error(
    'KBO umpire parse error: 4 umpire roles not found (selector drift suspect)',
  );
}

function parseFormalUmpireTable(
  $: cheerio.CheerioAPI,
): GameUmpires | null {
  const slots: Record<keyof GameUmpires, string> = {
    main: '',
    first: '',
    second: '',
    third: '',
  };

  $('.tbl-umpire dt, .tbl-umpire th').each((_, el) => {
    const label = $(el).text().trim();
    const val = $(el).next('dd, td').text().trim();
    if (!val) return;
    if (label.includes('주심')) slots.main = val;
    else if (label.includes('1루')) slots.first = val;
    else if (label.includes('2루')) slots.second = val;
    else if (label.includes('3루')) slots.third = val;
  });

  if (slots.main && slots.first && slots.second && slots.third) return slots;
  return null;
}

function parseUmpiresByLabel(
  $: cheerio.CheerioAPI,
): GameUmpires | null {
  const slots: Record<keyof GameUmpires, string> = {
    main: '',
    first: '',
    second: '',
    third: '',
  };

  $('dt, th, td').each((_, el) => {
    const label = $(el).text().trim();
    if (!label) return;
    const val = $(el).next().text().trim();
    if (!val || val.length > 10) return;
    if (label === '주심' || label.startsWith('주심')) slots.main ||= val;
    else if (label === '1루심' || label.startsWith('1루')) slots.first ||= val;
    else if (label === '2루심' || label.startsWith('2루')) slots.second ||= val;
    else if (label === '3루심' || label.startsWith('3루')) slots.third ||= val;
  });

  if (slots.main && slots.first && slots.second && slots.third) return slots;
  return null;
}

/**
 * KBO Score.aspx 조회 + 심판 4인 파싱.
 *
 * @param gameId  externalGameId (예: KBOG20260528LGT0)
 * @throws  HTTP error 또는 셀렉터 변경 / robots 차단 시 (호출자 catch → league-avg fallback)
 */
export async function scrapeGameUmpires(gameId: string): Promise<GameUmpires> {
  const url = `${BASE_URL}/Game/Score.aspx?gameId=${encodeURIComponent(gameId)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': KBO_USER_AGENT },
  });
  assertResponseOk(res, 'KBO umpire scrape error');
  const html = await res.text();
  return parseUmpiresFromHtml(html);
}
