import type { TeamCode } from '@moneyball/shared';
import { KBO_BASE_URL as BASE_URL, assertResponseOk, resolveKoreanTeamCode, sanitizeKboJsonResponse } from '../types';

export interface LiveGameState {
  externalGameId: string;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  homeScore: number;
  awayScore: number;
  inning: number;         // 현재 이닝 (1~12+)
  isTop: boolean;         // true=초(원정공격), false=말(홈공격)
  outs: number;
  status: 'live' | 'final' | 'scheduled';
}

interface RawKboLiveGame {
  G_ID: string;
  HOME_ID?: string;
  AWAY_ID?: string;
  HOME_NM?: string;
  AWAY_NM?: string;
  GAME_STATE_SC?: string | number;
  GAME_RESULT_CK?: number;
  GAME_INN_NO?: string | number;
  GAME_TB_SC?: string;
  B_SCORE_CN?: string | number;
  T_SCORE_CN?: string | number;
  OUT_CN?: string | number;
}

interface KboLiveResponse {
  d?: string;
  game?: RawKboLiveGame[];
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

  assertResponseOk(res, 'KBO live API error');

  const text = await res.text();
  const cleanJson = sanitizeKboJsonResponse(text);

  let json: KboLiveResponse;
  try {
    json = JSON.parse(cleanJson) as KboLiveResponse;
  } catch {
    throw new Error(`KBO live API parse error: ${cleanJson.slice(0, 100)}`);
  }

  const rawGames: RawKboLiveGame[] = json.d
    ? (JSON.parse(json.d) as RawKboLiveGame[])
    : (json.game ?? []);

  const liveGames: LiveGameState[] = [];
  for (const raw of rawGames) {
    const homeTeam = (raw.HOME_ID as TeamCode) || resolveKoreanTeamCode(raw.HOME_NM ?? '');
    const awayTeam = (raw.AWAY_ID as TeamCode) || resolveKoreanTeamCode(raw.AWAY_NM ?? '');
    if (!homeTeam || !awayTeam) continue;

    // 경기 상태 판단 — GAME_STATE_SC: "1"=경기전, "2"=진행중, "3"=종료
    // GAME_INN_NO 는 라이브 판정에 쓰지 않는다 (kbo-official.ts 와 동일 이유).
    const stateCode = String(raw.GAME_STATE_SC ?? '');
    let status: LiveGameState['status'] = 'scheduled';
    if (stateCode === '3' || raw.GAME_RESULT_CK === 1) {
      status = 'final';
    } else if (stateCode === '2') {
      status = 'live';
    }

    // 이닝 정보 — GAME_INN_NO: 숫자, GAME_TB_SC: "T"=초, "B"=말
    const inning = Number(raw.GAME_INN_NO) || 0;
    const isTop = raw.GAME_TB_SC !== 'B';

    // 점수 — T_SCORE_CN=원정(Top), B_SCORE_CN=홈(Bottom)
    const homeScore = Number(raw.B_SCORE_CN) || 0;
    const awayScore = Number(raw.T_SCORE_CN) || 0;

    const outs = Number(raw.OUT_CN) || 0;

    liveGames.push({
      externalGameId: raw.G_ID,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      inning,
      isTop,
      outs,
      status,
    });
  }

  return liveGames;
}

// KBO 정규 이닝 (연장은 본 보정 모델 밖에서 9회말 floor 가 그대로 작동)
const REGULATION_INNINGS = 9;

// leverage = 1 + gameProgress * MULTIPLIER → 초반 1x, 후반 3x
const LEVERAGE_PROGRESS_MULTIPLIER = 2;

// 스코어 차이를 sigmoid 입력으로 변환할 때 곱하는 계수.
// 0.3 + leverage 1 (초반) 기준 1점 차 → tanh(0.3) ≈ 0.29 → 약 5% 영향.
const SCORE_DIFF_TANH_SCALE = 0.3;

// tanh 출력 → 확률 보정치 amplitude. 1점 차 ~5~15% / 3점 차 ~15~40% 보정.
const SCORE_IMPACT_AMPLITUDE = 0.4;

// pre_game 대비 scoreBasedProb 블렌딩 최대 비중 (스코어가 80% 초과 지배 차단).
const MAX_SCORE_BLEND_WEIGHT = 0.8;

// 9회말 홈팀 리드 = 거의 확정 (야구 경험적 법칙).
const NINTH_BOTTOM_HOME_LEAD_FLOOR = 0.92;

// 9회초 종료 후 홈팀 리드 = 강한 시그널 (말 공격 1이닝 남음).
const NINTH_TOP_END_HOME_LEAD_FLOOR = 0.85;

// 확률 출력 clamp — 정확한 0/1 회피 (calibration 안정).
const PROB_CLAMP_MIN = 0.02;
const PROB_CLAMP_MAX = 0.98;

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
  const inningsPlayed = isTop ? inning - 1 + 0.5 : inning;
  const gameProgress = inningsPlayed / REGULATION_INNINGS; // 0~1

  // 스코어 차이의 영향력: 남은 이닝이 적을수록 크게 반영
  const leverage = 1 + gameProgress * LEVERAGE_PROGRESS_MULTIPLIER;

  // 스코어 차이를 확률 보정치로 변환 (시그모이드)
  const scoreImpact =
    Math.tanh(scoreDiff * SCORE_DIFF_TANH_SCALE * leverage) * SCORE_IMPACT_AMPLITUDE;

  // pre_game 확률과 블렌딩 (경기 진행될수록 스코어 가중)
  const blendWeight = Math.min(MAX_SCORE_BLEND_WEIGHT, gameProgress);
  const scoreBasedProb = 0.5 + scoreImpact;

  let adjusted = preGameHomeProb * (1 - blendWeight) + scoreBasedProb * blendWeight;

  // 9회말 홈팀 리드 시 강한 보정
  if (inning >= REGULATION_INNINGS && !isTop && scoreDiff > 0) {
    adjusted = Math.max(adjusted, NINTH_BOTTOM_HOME_LEAD_FLOOR);
  }
  // 9회초 끝나고 홈팀 리드
  if (inning >= REGULATION_INNINGS && isTop && scoreDiff > 0) {
    adjusted = Math.max(adjusted, NINTH_TOP_END_HOME_LEAD_FLOOR);
  }

  return Math.max(PROB_CLAMP_MIN, Math.min(PROB_CLAMP_MAX, adjusted));
}
