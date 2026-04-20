import * as cheerio from 'cheerio';
import type { TeamCode } from '@moneyball/shared';
import { KBO_TEAMS } from '@moneyball/shared';
import type { ScrapedGame, KBOGameRaw } from '../types';
import { TEAM_NAME_MAP } from '../types';

const BASE_URL = 'https://www.koreabaseball.com';
const DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// YYYYMMDD → YYYY-MM-DD
function formatDate(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

// HHmm → HH:MM
function formatTime(raw: string): string {
  if (!raw || raw.length < 4) return '18:30';
  return `${raw.slice(0, 2)}:${raw.slice(2, 4)}`;
}

function resolveTeamCode(name: string): TeamCode | null {
  // 정확한 매핑 먼저
  if (TEAM_NAME_MAP[name]) return TEAM_NAME_MAP[name];
  // 부분 매칭
  for (const [key, code] of Object.entries(TEAM_NAME_MAP)) {
    if (name.includes(key)) return code;
  }
  return null;
}

function parseGameStatus(status: string): ScrapedGame['status'] {
  if (status === '경기종료' || status === '종료') return 'final';
  if (status === '경기중' || status === '진행') return 'live';
  if (status === '취소' || status === '우천취소') return 'postponed';
  return 'scheduled';
}

/**
 * KBO 공식 사이트에서 특정 날짜의 경기 목록 가져오기
 * AJAX API: /ws/Main.asmx/GetKboGameList
 */
export async function fetchGames(date: string): Promise<ScrapedGame[]> {
  // date: YYYY-MM-DD → YYYYMMDD (KBO API 포맷)
  const yyyymmdd = date.replace(/-/g, '');

  const res = await fetch(`${BASE_URL}/ws/Main.asmx/GetKboGameList`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ leId: '1', srId: '0', date: yyyymmdd }),
  });

  if (!res.ok) {
    throw new Error(`KBO API error: ${res.status} ${res.statusText}`);
  }

  // KBO API 응답은 JSON 뒤에 HTML 에러 페이지가 붙을 수 있음
  const text = await res.text();
  const jsonEnd = text.indexOf('}<') !== -1 ? text.indexOf('}<') + 1 : text.length;
  const cleanJson = text.slice(0, jsonEnd);

  let json: any;
  try {
    json = JSON.parse(cleanJson);
  } catch {
    throw new Error(`KBO API parse error: ${cleanJson.slice(0, 100)}`);
  }

  // 응답 형식: { "d": "JSON string" } 또는 { "game": [], "code": "100" }
  let rawGames: KBOGameRaw[];
  if (json.d) {
    rawGames = JSON.parse(json.d);
  } else if (json.game) {
    rawGames = json.game;
  } else {
    return [];
  }

  const games: ScrapedGame[] = [];
  for (const raw of rawGames) {
    // API 팀 코드를 직접 사용, 없으면 한글명으로 fallback
    const homeTeam = (raw.HOME_ID as TeamCode) || resolveTeamCode(raw.HOME_NM);
    const awayTeam = (raw.AWAY_ID as TeamCode) || resolveTeamCode(raw.AWAY_NM);
    if (!homeTeam || !awayTeam) continue;

    // 경기 상태 — GAME_STATE_SC: "1"=경기전, "2"=진행중, "3"=종료
    const stateCode = String(raw.GAME_STATE_SC || '');
    let status: ScrapedGame['status'] = 'scheduled';
    if (stateCode === '3' || raw.GAME_RESULT_CK === 1) {
      status = 'final';
    } else if (stateCode === '2' || Number(raw.GAME_INN_NO) > 0) {
      status = 'live';
    } else if (raw.CANCEL_SC_ID === '1' || raw.CANCEL_SC_ID === '2') {
      status = 'postponed';
    }

    // 점수 — T_SCORE_CN=원정(Top), B_SCORE_CN=홈(Bottom)
    const homeScore = raw.B_SCORE_CN != null ? Number(raw.B_SCORE_CN) : undefined;
    const awayScore = raw.T_SCORE_CN != null ? Number(raw.T_SCORE_CN) : undefined;

    games.push({
      date: formatDate(raw.G_DT),
      homeTeam,
      awayTeam,
      gameTime: raw.G_TM || '18:30',
      stadium: raw.S_NM,
      homeSP: raw.B_PIT_P_NM?.trim() || undefined,
      awaySP: raw.T_PIT_P_NM?.trim() || undefined,
      status,
      homeScore,
      awayScore,
      externalGameId: raw.G_ID,
    });
  }

  return games;
}

/**
 * 팀의 최근 N경기 성적 (승률) 계산
 * 최근 경기 결과를 역순으로 가져와서 승률 반환
 *
 * @param asOfDate - (선택) "YYYY-MM-DD" 이전까지만 집계. 현재 미구현 — KBO 공식
 *   TeamRankDaily 페이지가 ASP.NET postback 기반이라 단순 GET 로는 date 필터
 *   적용 불가. 호출부는 preparing (daily.ts 에서 어제 날짜 전달) 되어 있고
 *   실제 필터링은 별도 스코프 (PLAN_v5 §5.4) 에서 구현 예정.
 *   그때까지 주말 낮경기 결과가 같은 날 저녁경기 stat 에 포함될 가능성 있음.
 */
export async function fetchRecentForm(
  teamCode: TeamCode,
  season: number,
  lastNGames = 10,
  asOfDate?: string,
): Promise<number> {
  void asOfDate; // PLAN_v5 §5.4 — 호출부 preparing, 실 필터링 별도 스코프
  // KBO 공식 팀 기록 페이지에서 최근 경기 결과 수집
  const teamName = KBO_TEAMS[teamCode].name;

  const url = `${BASE_URL}/Record/TeamRank/TeamRankDaily.aspx`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MoneyBall/1.0 (KBO Prediction Engine)' },
  });

  if (!res.ok) return 0.5; // fallback

  const html = await res.text();
  const $ = cheerio.load(html);

  // 팀 순위 테이블에서 최근 10경기 결과 파싱
  let wins = 0;
  let total = 0;

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    const name = cells.eq(1).text().trim();
    if (name.includes(teamName.split(' ')[0])) {
      // 최근10경기 컬럼 파싱 (예: "7승3패")
      const recentText = cells.eq(9).text().trim();
      const wMatch = recentText.match(/(\d+)승/);
      const lMatch = recentText.match(/(\d+)패/);
      if (wMatch) wins = parseInt(wMatch[1], 10);
      total = lastNGames;
    }
  });

  await sleep(DELAY_MS);
  return total > 0 ? wins / total : 0.5;
}

/**
 * 시즌 팀 간 상대전적 (홈팀 기준)
 *
 * @param asOfDate - (선택) "YYYY-MM-DD" 이전까지만 집계. fetchRecentForm 과
 *   동일하게 현재 미구현. PLAN_v5 §5.4 별도 스코프.
 */
export async function fetchHeadToHead(
  homeTeam: TeamCode,
  awayTeam: TeamCode,
  season: number,
  asOfDate?: string,
): Promise<{ wins: number; losses: number }> {
  void asOfDate;
  // KBO 공식 상대전적 페이지
  const url = `${BASE_URL}/Record/TeamRank/TeamRankVs.aspx`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MoneyBall/1.0 (KBO Prediction Engine)' },
  });

  if (!res.ok) return { wins: 0, losses: 0 };

  const html = await res.text();
  const $ = cheerio.load(html);

  const homeName = KBO_TEAMS[homeTeam].name.split(' ')[0];
  const awayName = KBO_TEAMS[awayTeam].name.split(' ')[0];

  let wins = 0;
  let losses = 0;

  // 상대전적 테이블 파싱
  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    const rowTeam = cells.eq(0).text().trim();
    if (rowTeam.includes(homeName)) {
      // 각 셀이 상대팀별 전적
      cells.each((ci, cell) => {
        const headerText = $('table thead th').eq(ci).text().trim();
        if (headerText.includes(awayName)) {
          const record = $(cell).text().trim();
          const wMatch = record.match(/(\d+)/);
          if (wMatch) wins = parseInt(wMatch[1], 10);
        }
      });
    }
  });

  await sleep(DELAY_MS);
  return { wins, losses: Math.max(0, losses) };
}

/**
 * 구장 파크팩터 (간이 계산)
 * 홈/원정 득점 비율 기반
 */
export function calculateParkFactor(
  homeRunsAtHome: number,
  homeRunsAway: number,
  homeGamesHome: number,
  homeGamesAway: number
): number {
  if (homeGamesHome === 0 || homeGamesAway === 0) return 1.0;
  const homeAvg = homeRunsAtHome / homeGamesHome;
  const awayAvg = homeRunsAway / homeGamesAway;
  if (awayAvg === 0) return 1.0;
  return homeAvg / awayAvg;
}

// 기본 파크팩터 (2025 시즌 기반 추정)
export const DEFAULT_PARK_FACTORS: Record<string, number> = {
  '인천SSG랜더스필드': 0.98,
  '광주-기아 챔피언스 필드': 1.05,
  '서울종합운동장 야구장': 1.02,  // 잠실
  '수원KT위즈파크': 1.00,
  '대구삼성라이온즈파크': 1.03,
  '부산사직야구장': 1.01,
  '대전한화생명이글스파크': 0.97,
  '창원NC파크': 0.99,
  '서울고척스카이돔': 0.95,
};
