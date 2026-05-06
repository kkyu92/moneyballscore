/**
 * Naver 스포츠 스케줄 API — 월/주 단위 prefetch 용.
 *
 * KBO 공식 API (`GetKboGameList`) 는 단일 날짜만 받아 14일치 prefetch 에
 * 14회 + sleep 필요. Naver API 는 임의 기간 한 번에 조회 가능.
 *
 * Endpoint: https://api-gw.sports.naver.com/schedule/games
 * 파라미터:
 *   - fields=all  — 전체 정보 (선발·이닝점수·현재투수 포함)
 *   - fields=basic — 기본만 (gameId·팀·시간·상태·점수)
 *   - upperCategoryId=kbaseball
 *   - categoryId=kbo
 *   - fromDate=YYYY-MM-DD
 *   - toDate=YYYY-MM-DD
 *
 * 용도: announce mode 에서 14일치 prefetch. KBO 공식이 메인 소스라 실시간
 * 점수·SP 변경은 KBO 에서 덮어씀 (first-write-wins upsert 아님 — 명시적
 * upsert). Naver 는 일정 확보 전담, 필드 불일치 감지 시 KBO 로 fallback.
 */

import type { TeamCode, GameStatus } from '@moneyball/shared';
import { KBO_TEAMS } from '@moneyball/shared';
import type { ScrapedGame } from '../types';
import { assertResponseOk } from '../types';

const NAVER_API = 'https://api-gw.sports.naver.com/schedule/games';

interface NaverGame {
  gameId: string;              // "20260418LGSS02026" — 17자리 (뒤 4자리 연도)
  gameDate: string;            // "2026-04-18"
  gameDateTime: string;        // "2026-04-18T14:00:00"
  stadium: string | null;
  homeTeamCode: string;        // "SS"
  homeTeamName: string;        // "삼성"
  awayTeamCode: string;
  awayTeamName: string;
  homeTeamScore: number;
  awayTeamScore: number;
  statusCode: 'BEFORE' | 'STARTED' | 'LIVE' | 'RESULT' | string;
  statusInfo: string;
  cancel: boolean;
  suspended: boolean;
  homeStarterName?: string | null;  // fields=all 에서만
  awayStarterName?: string | null;
  homeTeamScoreByInning?: string[]; // fields=all
  awayTeamScoreByInning?: string[];
}

interface NaverResponse {
  code: number;
  success: boolean;
  result?: { games?: NaverGame[] };
}

/**
 * Naver gameId (17자리) → 우리 DB external_game_id (13자리) 정규화.
 *
 * Naver: "20260418LGSS02026"  (YYYYMMDD + HOME + AWAY + 서브ID + YYYY)
 * KBO 공식: "20260418LGSS0"  (YYYYMMDD + HOME + AWAY + 서브ID)
 *
 * 뒤 4자리 연도 제거 → KBO 공식 external_game_id 와 1:1 매칭 → games 테이블
 * upsert 시 중복 row 발생 안 함.
 */
function normalizeGameId(naverGameId: string): string {
  // 17자리면 뒤 4자리 제거. 13자리면 그대로 (미래 포맷 대응).
  if (naverGameId.length === 17) return naverGameId.slice(0, 13);
  return naverGameId;
}

/**
 * Naver statusCode → ScrapedGame.status 매핑.
 * cancel=true 가 최우선 — statusCode 가 "BEFORE" 여도 우천취소면 postponed.
 */
function mapStatus(g: NaverGame): GameStatus {
  if (g.cancel || g.suspended) return 'postponed';
  if (g.statusCode === 'RESULT') return 'final';
  if (g.statusCode === 'STARTED' || g.statusCode === 'LIVE') return 'live';
  return 'scheduled';
}

/**
 * HH:MM 포맷으로 추출 (gameDateTime 에서).
 */
function extractGameTime(gameDateTime: string): string {
  // "2026-04-18T14:00:00" → "14:00"
  const m = gameDateTime.match(/T(\d{2}):(\d{2})/);
  if (!m) return '18:30';
  return `${m[1]}:${m[2]}`;
}

/**
 * KBO 10팀 코드 중 하나인지 검증. 2군·이벤트 경기 혼입 방지.
 * `KBO_TEAMS` (packages/shared) 단일 소스에서 derive — 팀 추가/변경 시 자동 반영.
 */
const VALID_TEAM_CODES = new Set<TeamCode>(Object.keys(KBO_TEAMS) as TeamCode[]);

function isValidTeamCode(code: string): code is TeamCode {
  return VALID_TEAM_CODES.has(code as TeamCode);
}

/**
 * Naver API 응답 → ScrapedGame 배열. 단일 정규화 + 필터링 포인트.
 * 이 함수는 테스트 목적으로 export — fixture 기반 검증 가능.
 */
export function parseNaverSchedule(json: NaverResponse): ScrapedGame[] {
  const raws = json.result?.games ?? [];
  const out: ScrapedGame[] = [];
  for (const g of raws) {
    if (!isValidTeamCode(g.homeTeamCode) || !isValidTeamCode(g.awayTeamCode)) continue;
    out.push({
      date: g.gameDate,
      homeTeam: g.homeTeamCode,
      awayTeam: g.awayTeamCode,
      gameTime: extractGameTime(g.gameDateTime),
      stadium: g.stadium ?? '',
      homeSP: g.homeStarterName?.trim() || undefined,
      awaySP: g.awayStarterName?.trim() || undefined,
      status: mapStatus(g),
      homeScore: Number.isFinite(g.homeTeamScore) ? g.homeTeamScore : undefined,
      awayScore: Number.isFinite(g.awayTeamScore) ? g.awayTeamScore : undefined,
      externalGameId: normalizeGameId(g.gameId),
    });
  }
  return out;
}

/**
 * Naver 스케줄 조회 — fromDate~toDate (inclusive).
 *
 * @param fromDate YYYY-MM-DD
 * @param toDate   YYYY-MM-DD
 * @param fields   'all' 은 SP·이닝점수·현재투수 포함. prefetch 에는 'basic' 이면 충분하지만 `all` 로 받아 추가 upsert 가능.
 */
export async function fetchNaverSchedule(
  fromDate: string,
  toDate: string,
  fields: 'all' | 'basic' = 'basic',
): Promise<ScrapedGame[]> {
  const url =
    `${NAVER_API}?fields=${fields}&upperCategoryId=kbaseball` +
    `&categoryId=kbo&fromDate=${fromDate}&toDate=${toDate}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  assertResponseOk(res, 'Naver schedule API error');

  const json = (await res.json()) as NaverResponse;
  if (!json.success) {
    throw new Error(`Naver schedule API unsuccessful: code=${json.code}`);
  }

  return parseNaverSchedule(json);
}
