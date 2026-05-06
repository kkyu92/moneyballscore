/**
 * Naver 스포츠 record API — 경기별 boxscore (투수 / 타자 / 이닝별 점수).
 *
 * Endpoint: `https://api-gw.sports.naver.com/schedule/games/{gameId}/record`
 *   - gameId 포맷: YYYYMMDDHOMEAWAY0YYYY (17자, 예: 20260421HHLG02026)
 *   - 우리 DB external_game_id (13자) + 시즌 (4자) 조합으로 복원 가능
 *   - Referer 헤더 필수 (m.sports.naver.com). Referer 없으면 일부 필드 403
 *   - 종료/진행/예정 경기 모두 응답. 예정 경기는 대부분 필드 빈 배열
 *
 * 실용 용도:
 *   - 타자 경기별 기록 (타자 폼, injury 결장 간접 감지)
 *   - 투수 경기별 이닝·투구수·상대 타자 수 (불펜 피로도)
 *   - scoreBoard 이닝별 점수 (승패 패턴 분석)
 */

const RECORD_BASE = 'https://api-gw.sports.naver.com/schedule/games';

export interface NaverPitcherRecord {
  name: string;
  pcode: string; // Naver 선수 코드
  tb: 'T' | 'B' | string; // T=원정(Top), B=홈(Bottom)
  inn: string; // "5", "3 ⅔", "6 ⅓" — unicode fraction 포함
  bf: number; // 상대한 타자 수 (batters faced)
  pa: number; // 타석
  ab: number; // 타수
  hit: number;
  hr: number;
  kk: number; // 삼진
  bb: number; // 볼넷
  bbhp: number; // 볼넷+몸에 맞은 공
  r: number; // 실점
  er: number; // 자책점
  era: string; // 누적 ERA (string — "0.89" 등)
  wls: '' | 'W' | 'L' | 'S' | 'H' | string; // 오늘 승패세홀
  w: number; // 누적
  l: number;
  s: number;
  gameCount: number;
  seasonWin: number;
  seasonLose: number;
  hasPlayerEnd: boolean;
}

export interface NaverBatterRecord {
  name: string;
  playerCode: string;
  batOrder: number; // 타순
  pos: string; // 포지션 한글 ("중", "좌", ...)
  ab: number; // 타수
  hit: number;
  hr: number;
  run: number; // 득점
  bb: number;
  kk: number; // 삼진
  sb: number; // 도루
  hra: string; // 누적 타율 "0.350"
  hasPlayerEnd: boolean;
  // inn1 ~ inn25: 각 타석 한글 결과 — 보존하려면 raw 보관
  [key: `inn${number}`]: string | undefined;
}

export interface NaverScoreBoard {
  rheb: {
    away: { r: number; h: number; e: number; b: number };
    home: { r: number; h: number; e: number; b: number };
  };
  inn: {
    away: number[]; // 이닝별 점수
    home: number[];
  };
}

export interface NaverPitchingResult {
  pCode: string;
  name: string;
  wls: 'W' | 'L' | 'S' | 'H' | string;
  w: number;
  l: number;
  s: number;
}

export interface NaverGameInfo {
  gdate: string; // YYYYMMDD
  gtime: string; // HH:mm
  hCode: string; // KBO 팀 코드 (home)
  aCode: string;
  hName: string;
  aName: string;
  hFullName: string;
  aFullName: string;
  stadium: string;
  statusCode: string; // RESULT / STARTED / BEFORE / CANCEL
  hPCode?: string; // 홈 선발 pcode
  aPCode?: string;
  cancelFlag?: boolean;
  round?: number;
}

export interface NaverRecord {
  statusCode: string;
  gameInfo: NaverGameInfo;
  scoreBoard: NaverScoreBoard | null;
  pitchersHome: NaverPitcherRecord[];
  pitchersAway: NaverPitcherRecord[];
  battersHome: NaverBatterRecord[];
  battersAway: NaverBatterRecord[];
  pitchingResult: NaverPitchingResult[];
  raw: unknown; // 전체 응답 보존 — migration 시 schema 변경 흡수
}

/**
 * external_game_id (13자, KBO 공식) + 시즌 → Naver gameId (17자).
 *
 * 예: "20260421HHLG0" + 2026 → "20260421HHLG02026"
 * 예: "20250501LGHT0" + 2025 → "20250501LGHT02025"
 */
export function toNaverGameId(externalGameId: string, season: number): string {
  if (externalGameId.length === 17) return externalGameId;
  if (externalGameId.length !== 13) {
    throw new Error(
      `toNaverGameId: unexpected length ${externalGameId.length} (${externalGameId})`,
    );
  }
  return `${externalGameId}${season}`;
}

/**
 * "3 ⅔" / "5" / "6 ⅓" 형태의 이닝 문자열을 소수 이닝으로 변환.
 *   정수부 + (unicode fraction → 분수).
 * ⅓ → 1/3 (0.333...), ⅔ → 2/3 (0.666...).
 * 파싱 실패 → NaN.
 */
export function parseInnings(inn: string): number {
  if (!inn) return NaN;
  const trimmed = inn.trim();
  const match = trimmed.match(/^(\d+)?\s*(⅓|⅔)?$/);
  if (!match) return NaN;
  const whole = match[1] ? Number(match[1]) : 0;
  const frac = match[2] === '⅓' ? 1 / 3 : match[2] === '⅔' ? 2 / 3 : 0;
  return whole + frac;
}

/** JSON 응답 → NaverRecord 로 변환. 순수 함수. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseNaverRecord(json: any): NaverRecord | null {
  const rd = json?.result?.recordData;
  if (!rd) return null;
  const gi = rd.gameInfo ?? {};
  return {
    statusCode: gi.statusCode ?? '',
    gameInfo: gi,
    scoreBoard: rd.scoreBoard ?? null,
    pitchersHome: Array.isArray(rd.pitchersBoxscore?.home)
      ? rd.pitchersBoxscore.home
      : [],
    pitchersAway: Array.isArray(rd.pitchersBoxscore?.away)
      ? rd.pitchersBoxscore.away
      : [],
    battersHome: Array.isArray(rd.battersBoxscore?.home)
      ? rd.battersBoxscore.home
      : [],
    battersAway: Array.isArray(rd.battersBoxscore?.away)
      ? rd.battersBoxscore.away
      : [],
    pitchingResult: Array.isArray(rd.pitchingResult) ? rd.pitchingResult : [],
    raw: rd,
  };
}

/** 주어진 gameId 로 Naver record fetch + 파싱. */
export async function fetchNaverRecord(
  naverGameId: string,
): Promise<NaverRecord | null> {
  const url = `${RECORD_BASE}/${naverGameId}/record`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Referer: 'https://m.sports.naver.com/',
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Naver record fetch ${naverGameId}: ${res.status}`);
  }
  const json = await res.json();
  return parseNaverRecord(json);
}

/**
 * 팀별 투수 요약 — 불펜 피로도 feature 후보.
 *   totalPitchers: 투수 수 (선발 포함)
 *   totalBF: 상대한 타자 수 합
 *   totalInnings: 이닝 합 (decimal)
 */
export function summarizePitching(
  pitchers: NaverPitcherRecord[],
): { totalPitchers: number; totalBF: number; totalInnings: number } {
  let totalBF = 0;
  let totalInnings = 0;
  for (const p of pitchers) {
    totalBF += p.bf || 0;
    const inn = parseInnings(p.inn);
    if (Number.isFinite(inn)) totalInnings += inn;
  }
  return { totalPitchers: pitchers.length, totalBF, totalInnings };
}

/** 팀별 타자 요약. */
export function summarizeBatting(batters: NaverBatterRecord[]): {
  totalBatters: number;
  totalAB: number;
  totalHits: number;
  totalHR: number;
  totalK: number;
  totalBB: number;
} {
  let totalAB = 0;
  let totalHits = 0;
  let totalHR = 0;
  let totalK = 0;
  let totalBB = 0;
  for (const b of batters) {
    totalAB += b.ab || 0;
    totalHits += b.hit || 0;
    totalHR += b.hr || 0;
    totalK += b.kk || 0;
    totalBB += b.bb || 0;
  }
  return {
    totalBatters: batters.length,
    totalAB,
    totalHits,
    totalHR,
    totalK,
    totalBB,
  };
}
