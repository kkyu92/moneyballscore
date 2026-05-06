/**
 * KBO 공식 "선수 기록실" → 선발/구원 투수 기본 기록 스크래퍼.
 *
 * 배경: Fancy Stats `/leaders/` 가 top 50 하드 리밋이라 시즌 초반 / 등판
 * 적은 투수를 커버 못함 (DB 25명 중 6명만 Fancy Stats 에 있음). KBO 공식
 * `/Record/Player/PitcherBasic/Basic1.aspx` 는 plain GET 으로 28명 이번
 * 시즌 데이터 (ERA, G, W, L, IP, HR, BB, HBP, SO 등) 를 반환하며, FIP 는
 * 표준 공식으로 직접 계산 가능.
 *
 * 셀 구조 (19개):
 *   [0] 순위  [1] 선수명  [2] 팀명(한글)  [3] ERA  [4] G  [5] W  [6] L
 *   [7] SV    [8] HLD     [9] WPCT         [10] IP  [11] H  [12] HR
 *   [13] BB   [14] HBP    [15] SO          [16] R   [17] ER  [18] WHIP
 *
 * Fancy Stats 와의 차이:
 *   - KBO: ERA·IP·HR·BB·HBP·SO (FIP 직접 계산). xFIP·WAR·K/9 없음.
 *   - Fancy Stats: FIP·xFIP·WAR·K/9 (직접 제공). 커버리지 top 50 한정.
 *
 * 운영: `fetchPitcherStats` 가 두 소스를 merge — Fancy Stats 우선, 없는
 * 투수만 KBO 공식에서 보강. 시즌 초반 커버리지 24% → ~100% 개선.
 */

import * as cheerio from 'cheerio';
import type { PitcherStats } from '../types';
import { KBO_BASE_URL as BASE_URL, KBO_USER_AGENT, resolveKoreanTeamCode } from '../types';
// KBO 리그 평균 ERA - FIP 구성요소 조정. MLB 는 3.10 고정 관행, KBO 는
// 공식 수치 미공개라 3.10 으로 근사. 시즌 말 평가 보정 필요 시 변경.
const FIP_CONSTANT = 3.1;

/**
 * KBO "이닝 점수" 표기 → 소수.
 * "23"         → 23
 * "24 1/3"     → 24.333...
 * "23 2/3"     → 23.667...
 * 빈 문자열 / 파싱 실패 → 0.
 */
export function parseIP(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const match = trimmed.match(/^(\d+)(?:\s+(\d+)\/(\d+))?$/);
  if (!match) return Number.parseFloat(trimmed) || 0;
  const whole = Number.parseInt(match[1], 10);
  if (!match[2]) return whole;
  const num = Number.parseInt(match[2], 10);
  const denom = Number.parseInt(match[3], 10);
  if (!denom) return whole;
  return whole + num / denom;
}

/**
 * Fielding Independent Pitching 계산.
 * FIP = (13·HR + 3·(BB + HBP) − 2·SO) / IP + constant
 *
 * @returns FIP. IP ≤ 0 이면 null.
 */
export function calculateFIP(
  hr: number, bb: number, hbp: number, so: number, ip: number,
  constant: number = FIP_CONSTANT,
): number | null {
  if (!ip || ip <= 0) return null;
  return (13 * hr + 3 * (bb + hbp) - 2 * so) / ip + constant;
}

/**
 * Basic1.aspx HTML → PitcherStats[]. 순수 함수 — fixture 기반 테스트 용이.
 *
 * 방어적 파싱:
 *   - 셀 개수 19 미만 행은 스킵 (헤더·합계행).
 *   - 선수명 한글 포함 체크로 헤더 (순위·선수명·팀명 텍스트) 오염 방지.
 *   - 팀명 resolveKoreanTeamCode 미매칭 시 스킵 (한글 정확 매칭 + includes fallback).
 *   - IP 0 투수는 FIP 계산 불가 → 스킵.
 */
export function parsePitcherBasicFromHtml(html: string): PitcherStats[] {
  const $ = cheerio.load(html);
  const out: PitcherStats[] = [];

  $('table tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 19) return;

    const name = cells.eq(1).text().trim();
    if (!/[가-힣]/.test(name)) return;

    const teamRaw = cells.eq(2).text().trim();
    const teamCode = resolveKoreanTeamCode(teamRaw);
    if (!teamCode) return;

    const era = Number.parseFloat(cells.eq(3).text().trim()) || 0;
    const ip = parseIP(cells.eq(10).text());
    const hr = Number.parseInt(cells.eq(12).text().trim(), 10) || 0;
    const bb = Number.parseInt(cells.eq(13).text().trim(), 10) || 0;
    const hbp = Number.parseInt(cells.eq(14).text().trim(), 10) || 0;
    const so = Number.parseInt(cells.eq(15).text().trim(), 10) || 0;

    const fip = calculateFIP(hr, bb, hbp, so, ip);
    if (fip == null) return;

    out.push({
      name,
      team: teamCode,
      fip,
      // xFIP 는 KBO 공식에 없음. FIP 로 대체 (보수적). 정확한 xFIP 는
      // Fancy Stats 로부터 merge 시점에 덮어써짐.
      xfip: fip,
      era,
      innings: ip,
      // WAR·K/9 는 Basic1 에 없음. 0 으로 두고 merge 시 Fancy Stats 값으로.
      war: 0,
      kPer9: ip > 0 ? (so * 9) / ip : 0,
    });
  });

  return out;
}

/**
 * KBO 공식 PitcherBasic/Basic1.aspx 조회 + 파싱.
 * 시즌 진행되며 2~3 페이지 넘어가면 ASP.NET postback 추가 필요. 현재는
 * 1 페이지 (top 28) 만 — 등판 임계 못 채운 신인은 여기도 빠짐.
 */
export async function fetchKboPitcherBasic(): Promise<PitcherStats[]> {
  const url = `${BASE_URL}/Record/Player/PitcherBasic/Basic1.aspx`;
  const res = await fetch(url, {
    headers: { 'User-Agent': KBO_USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`KBO pitcher basic error: ${res.status}`);
  }
  const html = await res.text();
  return parsePitcherBasicFromHtml(html);
}
