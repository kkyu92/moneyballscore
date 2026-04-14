import type { TeamCode } from '@moneyball/shared';
import { TEAM_NAME_MAP, KBO_API_CODE_MAP } from '../types';

const BASE_URL = 'https://www.koreabaseball.com';

function resolveTeamCode(name: string): TeamCode | null {
  if (TEAM_NAME_MAP[name]) return TEAM_NAME_MAP[name];
  for (const [key, code] of Object.entries(TEAM_NAME_MAP)) {
    if (name.includes(key)) return code;
  }
  return null;
}

export interface LiveGameState {
  externalGameId: string;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  homeScore: number;
  awayScore: number;
  inning: number;         // 현재 이닝 (1~12+)
  isTop: boolean;         // true=초(원정공격), false=말(홈공격)
  outs: number;
  runners: string;        // 예: "1,2루" or ""
  status: 'live' | 'final' | 'scheduled';
}

/**
 * KBO 공식 AJAX API에서 진행 중인 경기 라이브 상태 수집
 */
export async function fetchLiveGames(date: string): Promise<LiveGameState[]> {
  const yyyymmdd = date.replace(/-/g, '');

  const res = await fetch(`${BASE_URL}/ws/Main.asmx/GetKboGameList`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ leId: '1', srId: '0', date: yyyymmdd }),
  });

  if (!res.ok) {
    throw new Error(`KBO live API error: ${res.status}`);
  }

  const text = await res.text();
  const jsonEnd = text.indexOf('}<') !== -1 ? text.indexOf('}<') + 1 : text.length;
  const cleanJson = text.slice(0, jsonEnd);

  let json: any;
  try {
    json = JSON.parse(cleanJson);
  } catch {
    throw new Error(`KBO live API parse error: ${cleanJson.slice(0, 100)}`);
  }

  const rawGames = json.d ? JSON.parse(json.d) : (json.game || []);

  const liveGames: LiveGameState[] = [];
  for (const raw of rawGames) {
    const homeTeam = KBO_API_CODE_MAP[raw.HOME_ID] || resolveTeamCode(raw.HOME_NM);
    const awayTeam = KBO_API_CODE_MAP[raw.AWAY_ID] || resolveTeamCode(raw.AWAY_NM);
    if (!homeTeam || !awayTeam) continue;

    // 경기 상태 판단
    const statusText = raw.GAME_SC_HEADER_NM || raw.G_ST || '';
    let status: LiveGameState['status'] = 'scheduled';
    if (statusText.includes('종료') || statusText === 'Final') {
      status = 'final';
    } else if (statusText.includes('회') || statusText.includes('진행') || raw.HOME_SCORE != null) {
      status = 'live';
    }

    // 이닝 정보 파싱 (예: "5회초", "9회말")
    let inning = 0;
    let isTop = true;
    const inningMatch = statusText.match(/(\d+)회(초|말)?/);
    if (inningMatch) {
      inning = parseInt(inningMatch[1], 10);
      isTop = inningMatch[2] !== '말';
    }

    liveGames.push({
      externalGameId: raw.G_ID,
      homeTeam,
      awayTeam,
      homeScore: raw.HOME_SCORE ?? 0,
      awayScore: raw.AWAY_SCORE ?? 0,
      inning,
      isTop,
      outs: 0,      // 상세 정보 추후 추가 가능
      runners: '',
      status,
    });
  }

  return liveGames;
}

/**
 * 이닝별 승리 확률 보정
 *
 * pre_game 확률 기반으로 현재 스코어 차이와 남은 이닝을 반영해 보정.
 * 간이 모델: 로지스틱 함수 기반 스코어 차 반영.
 *
 * 야구 경험적 법칙:
 * - 1점 차는 남은 이닝이 많을수록 의미 낮음
 * - 3점+ 차이 7회 이후면 강한 시그널
 * - 9회말 리드 = 거의 확정
 */
export function adjustWinProbability(
  preGameHomeProb: number,
  homeScore: number,
  awayScore: number,
  inning: number,
  isTop: boolean
): number {
  if (inning === 0) return preGameHomeProb; // 경기 시작 전

  const scoreDiff = homeScore - awayScore; // 양수=홈 리드
  const totalInnings = 9;
  const inningsPlayed = isTop ? inning - 1 + 0.5 : inning;
  const inningsRemaining = Math.max(0, totalInnings - inningsPlayed);
  const gameProgress = inningsPlayed / totalInnings; // 0~1

  // 스코어 차이의 영향력: 남은 이닝이 적을수록 크게 반영
  // leverage = 1 + (gameProgress * 2) → 초반 1x, 후반 3x
  const leverage = 1 + gameProgress * 2;

  // 스코어 차이를 확률 보정치로 변환 (시그모이드)
  // 1점 차 → 약 5~15% 보정, 3점 차 → 약 15~40% 보정
  const scoreImpact = Math.tanh(scoreDiff * 0.3 * leverage) * 0.4;

  // pre_game 확률과 블렌딩 (경기 진행될수록 스코어 가중)
  const blendWeight = Math.min(0.8, gameProgress); // 최대 80% 스코어 반영
  const scoreBasedProb = 0.5 + scoreImpact;

  let adjusted = preGameHomeProb * (1 - blendWeight) + scoreBasedProb * blendWeight;

  // 9회말 리드 시 강한 보정
  if (inning >= 9 && !isTop && scoreDiff > 0) {
    adjusted = Math.max(adjusted, 0.92);
  }
  // 9회초 끝나고 홈팀 리드
  if (inning >= 9 && isTop && scoreDiff > 0) {
    adjusted = Math.max(adjusted, 0.85);
  }

  return Math.max(0.02, Math.min(0.98, adjusted));
}
