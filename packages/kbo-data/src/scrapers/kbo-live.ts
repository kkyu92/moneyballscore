import type { TeamCode } from '@moneyball/shared';
import { TEAM_NAME_MAP } from '../types';

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
  const yymmdd = date.replace(/-/g, '').slice(2);

  const res = await fetch(`${BASE_URL}/ws/Main.asmx/GetKboGameList`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ leId: 1, srId: 0, date: yymmdd }),
  });

  if (!res.ok) {
    throw new Error(`KBO live API error: ${res.status}`);
  }

  const json = await res.json();
  const rawGames = JSON.parse(json.d);

  const liveGames: LiveGameState[] = [];
  for (const raw of rawGames) {
    const homeTeam = resolveTeamCode(raw.T_NM_H);
    const awayTeam = resolveTeamCode(raw.T_NM_A);
    if (!homeTeam || !awayTeam) continue;

    // 경기 상태 판단
    let status: LiveGameState['status'] = 'scheduled';
    if (raw.G_ST === '경기종료' || raw.G_ST === '종료') {
      status = 'final';
    } else if (raw.G_ST === '경기중' || raw.G_ST === '진행' || (raw.SC_H && raw.G_ST !== '취소')) {
      status = 'live';
    }

    // 이닝 정보 파싱 (G_ST에서 "5회초" 같은 형태)
    let inning = 0;
    let isTop = true;
    const inningMatch = raw.G_ST?.match(/(\d+)회(초|말)?/);
    if (inningMatch) {
      inning = parseInt(inningMatch[1], 10);
      isTop = inningMatch[2] !== '말';
    }

    liveGames.push({
      externalGameId: raw.G_ID,
      homeTeam,
      awayTeam,
      homeScore: parseInt(raw.SC_H || '0', 10),
      awayScore: parseInt(raw.SC_A || '0', 10),
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
