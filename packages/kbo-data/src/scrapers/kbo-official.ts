import * as cheerio from 'cheerio';
import type { TeamCode } from '@moneyball/shared';
import { KBO_TEAMS, shortTeamName } from '@moneyball/shared';
import type { ScrapedGame, KBOGameRaw } from '../types';
import { KBO_BASE_URL as BASE_URL, resolveKoreanTeamCode } from '../types';
import { sleep } from './fancy-stats';

const DELAY_MS = 2000;

// YYYYMMDD → YYYY-MM-DD
function formatDate(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
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
    const homeTeam = (raw.HOME_ID as TeamCode) || resolveKoreanTeamCode(raw.HOME_NM);
    const awayTeam = (raw.AWAY_ID as TeamCode) || resolveKoreanTeamCode(raw.AWAY_NM);
    if (!homeTeam || !awayTeam) continue;

    // 경기 상태 — GAME_STATE_SC: "1"=경기전, "2"=진행중, "3"=종료
    // GAME_INN_NO 는 라이브 판정에 쓰지 않는다. KBO API 가 경기 시작 전에도
    // inn_no=1 을 미리 set 하는 케이스 존재 (2026-04-26 prod 4/5 경기 누락 원인).
    // state_sc 단독 신뢰.
    const stateCode = String(raw.GAME_STATE_SC || '');
    let status: ScrapedGame['status'] = 'scheduled';
    if (stateCode === '3' || raw.GAME_RESULT_CK === 1) {
      status = 'final';
    } else if (stateCode === '2') {
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
      // 관측용 — status 이상 시 skipped_detail 에 동봉돼 원인 특정 가능
      rawStatus: {
        state_sc: raw.GAME_STATE_SC ?? null,
        inn_no: raw.GAME_INN_NO ?? null,
        cancel_sc_id: raw.CANCEL_SC_ID ?? null,
        cancel_sc_nm: raw.CANCEL_SC_NM ?? null,
        result_ck: raw.GAME_RESULT_CK ?? null,
      },
    });
  }

  return games;
}

/**
 * 팀의 최근 N경기 성적 (승률) 계산 — KBO 공식 TeamRankDaily 페이지 스크래핑.
 *
 * v0.5.22 이후 daily.ts 는 DB `games` 테이블 기반 `calculateRecentForm`
 * (engine/form.ts) 을 우선 사용. 이 함수는 DB 데이터 부족 시 fallback
 * 으로만 호출됨 (시즌 초기 / 운영 첫 주). TeamRankDaily 컬럼은 "최근
 * 10경기" 로 고정이라 asOfDate 필터링 불가 — fallback 에서만 허용.
 *
 * **`_season` 인자는 무시됨**. TeamRankDaily 페이지는 시즌 query 미지원
 * — 호출 시점의 현재 시즌만 반환. 호출자 호환을 위해 시그니처 유지.
 */
export async function fetchRecentForm(
  teamCode: TeamCode,
  _season: number,
  lastNGames = 10,
): Promise<number> {
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
 * 시즌 팀 간 상대전적 (홈팀 기준) — KBO 공식 TeamRankVs 페이지 스크래핑.
 *
 * v0.5.22 이후 daily.ts 는 DB 기반 `calculateHeadToHead` 를 우선 사용.
 * 이 함수는 DB 에 h2h 데이터 0건일 때 fallback 으로만 호출됨.
 *
 * **`_season` 인자는 무시됨**. TeamRankVs 페이지는 시즌 query 미지원
 * — 호출 시점의 현재 시즌만 반환. 호출자 호환을 위해 시그니처 유지.
 *
 * **`losses` 는 항상 0 반환** — TeamRankVs HTML 셀이 첫 숫자 (wins) 만
 * 파싱. fallback 결과 winrate 계산 시 `wins / (wins + 0) = 1.0` 또는 0
 * 으로 편향. DB 기반 `calculateHeadToHead` 가 정상 path 라 운영상 영향 X.
 */
export async function fetchHeadToHead(
  homeTeam: TeamCode,
  awayTeam: TeamCode,
  _season: number,
): Promise<{ wins: number; losses: number }> {
  // KBO 공식 상대전적 페이지
  const url = `${BASE_URL}/Record/TeamRank/TeamRankVs.aspx`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MoneyBall/1.0 (KBO Prediction Engine)' },
  });

  if (!res.ok) return { wins: 0, losses: 0 };

  const html = await res.text();
  const $ = cheerio.load(html);

  const homeName = shortTeamName(homeTeam);
  const awayName = shortTeamName(awayTeam);

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
