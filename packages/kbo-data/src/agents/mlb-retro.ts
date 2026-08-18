import type { createClient } from '@supabase/supabase-js';
import {
  assertWriteOk,
  errMsg,
  MLB_TEAMS,
  ELO_NEUTRAL,
  NEUTRAL_FACTOR,
  normalizeMlbTeamCode,
  type MlbTeamCode,
} from '@moneyball/shared';
import { computeMlbFactorContributions, type MlbFactorInputs } from '../factors/mlb-base';
import { DB_CONSTRAINTS } from '../pipeline/db-constraints';
import { addDays, buildMemoryForTeam } from './retro';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = ReturnType<typeof createClient<any, any, any>>;

interface MlbPredictionRow {
  external_game_id: string;
  home_win_prob: number | null;
  home_sp_fip: number | null;
  away_sp_fip: number | null;
  home_sp_xfip: number | null;
  away_sp_xfip: number | null;
  home_lineup_woba: number | null;
  away_lineup_woba: number | null;
  home_bullpen_fip: number | null;
  away_bullpen_fip: number | null;
  home_war_total: number | null;
  away_war_total: number | null;
  home_lineup_xwoba: number | null;
  away_lineup_xwoba: number | null;
  home_lineup_barrel_pct: number | null;
  away_lineup_barrel_pct: number | null;
}

interface MlbScheduleRow {
  external_game_id: string;
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
}

// KBO buildMemoryForTeam 컨벤션(NEUTRAL_FACTOR=0.5 중심) 재사용 위해 계산해도 되는
// factor 만 선정 — recent_form/head_to_head/defense_sfr/sp_xwoba_against/woba_std 는
// MLB predict_final 이 항상 home=away 동일 placeholder 를 넣어 contribution 이 항상 0
// (실제 신호 아님, 후보에서 자연 배제). elo 는 예외 — home=away=ELO_NEUTRAL 이라도
// HOME_ELO_BONUS 고정항 때문에 contribution 이 0이 아닌 "모든 경기 동일한 상수" 라
// 팀별 bias 처럼 잘못 뽑힐 위험 → 명시적 제외.
const MEMORY_CANDIDATE_KEYS = [
  'sp_fip',
  'sp_xfip',
  'lineup_woba',
  'bullpen_fip',
  'war',
  'lineup_xwoba',
  'lineup_barrel_pct',
  'park_factor',
] as const;

/**
 * MLB `predictions.factors` JSON 컬럼은 존재하지 않음 (mlb-pipeline.ts 는 discrete
 * home/away 접두 breakdown 컬럼만 영속화, cycle 2065). buildMemoryForTeam 은 KBO 처럼
 * 0.5 중심 정규화된 factor map 을 기대 — 여기서 persisted 원본 스탯으로부터
 * computeMlbFactorContributions 을 재실행해 동일 스케일(probability point)로 복원.
 */
function buildMlbFactors(pred: MlbPredictionRow, homeCode: MlbTeamCode): Record<string, number> | null {
  const pairs: Record<(typeof MEMORY_CANDIDATE_KEYS)[number], [number | null, number | null]> = {
    sp_fip: [pred.home_sp_fip, pred.away_sp_fip],
    sp_xfip: [pred.home_sp_xfip, pred.away_sp_xfip],
    lineup_woba: [pred.home_lineup_woba, pred.away_lineup_woba],
    bullpen_fip: [pred.home_bullpen_fip, pred.away_bullpen_fip],
    war: [pred.home_war_total, pred.away_war_total],
    lineup_xwoba: [pred.home_lineup_xwoba, pred.away_lineup_xwoba],
    lineup_barrel_pct: [pred.home_lineup_barrel_pct, pred.away_lineup_barrel_pct],
    park_factor: [MLB_TEAMS[homeCode].parkPf / 100, 1.0],
  };

  const input: MlbFactorInputs = {
    sp_fip: { home: pairs.sp_fip[0] ?? 0, away: pairs.sp_fip[1] ?? 0 },
    sp_xfip: { home: pairs.sp_xfip[0] ?? 0, away: pairs.sp_xfip[1] ?? 0 },
    lineup_woba: { home: pairs.lineup_woba[0] ?? 0, away: pairs.lineup_woba[1] ?? 0 },
    bullpen_fip: { home: pairs.bullpen_fip[0] ?? 0, away: pairs.bullpen_fip[1] ?? 0 },
    recent_form: { home: 50, away: 50 },
    war: { home: pairs.war[0] ?? 0, away: pairs.war[1] ?? 0 },
    head_to_head: { homeWinRate: 0.5 },
    park_factor: pairs.park_factor[0] ?? 1.0,
    elo: { home: ELO_NEUTRAL, away: ELO_NEUTRAL },
    defense_sfr: { home: 0, away: 0 },
    lineup_xwoba: { home: pairs.lineup_xwoba[0] ?? 0, away: pairs.lineup_xwoba[1] ?? 0 },
    lineup_barrel_pct: { home: pairs.lineup_barrel_pct[0] ?? 0, away: pairs.lineup_barrel_pct[1] ?? 0 },
    sp_xwoba_against: { home: 0, away: 0 },
    woba_std: { home: 0, away: 0 },
  };

  const contributions = computeMlbFactorContributions(input);
  const factors: Record<string, number> = {};

  for (const key of MEMORY_CANDIDATE_KEYS) {
    const [home, away] = pairs[key];
    if (home == null || away == null) continue; // 데이터 미측정 — 가짜 bias 방지, 후보 제외
    factors[key] = NEUTRAL_FACTOR + contributions[key];
  }

  return Object.keys(factors).length > 0 ? factors : null;
}

/**
 * MLB 오답 예측(walk-forward 로 방금 확정된 final 경기) → agent_memories 학습.
 * KBO `generateAgentMemories` 의 MLB parity — `is_correct` 컬럼이 MLB 는 항상 NULL
 * (deriveMlbOutcome.ts 주석 참조, 의도된 설계) 이라 predictions 테이블만 보고는
 * 오답 여부를 알 수 없음 — 여기선 이미 조인된 finalRows(walk-forward 계산용으로
 * mlb_schedule final 경기와 매칭된 predictions)를 그대로 받아 재사용.
 * MLB 는 verify 모드가 없어 mlb_walk_forward_measure 호출부에 얹음(신규 cron mode
 * 추가 시 Cloudflare Worker dispatch 설정도 손대야 해 이번 사이클 스코프 밖 — 기존
 * final-game 조인 결과를 재사용하는 게 안전한 배선).
 */
export async function generateMlbAgentMemories(
  db: DB,
  date: string,
  finalRows: Array<{ pred: MlbPredictionRow; schedule: MlbScheduleRow }>,
): Promise<void> {
  if (finalRows.length === 0) return;

  const newValidUntil = addDays(date, 7);

  for (const { pred, schedule } of finalRows) {
    if (schedule.home_score == null || schedule.away_score == null) continue;
    if (schedule.home_score === schedule.away_score) continue; // 무승부 없음 — 방어적 skip
    if (pred.home_win_prob == null) continue;

    const homeCode = normalizeMlbTeamCode(schedule.home_team_code);
    const awayCode = normalizeMlbTeamCode(schedule.away_team_code);
    if (!homeCode || !awayCode) continue;

    const predictedHomeWin = pred.home_win_prob >= 0.5;
    const actualHomeWin = schedule.home_score > schedule.away_score;
    if (predictedHomeWin === actualHomeWin) continue; // 오답만 학습 (KBO 동일 컨벤션)

    const factors = buildMlbFactors(pred, homeCode);
    if (!factors) continue;

    const teams: Array<{ code: MlbTeamCode; side: 'home' | 'away'; opponent: MlbTeamCode }> = [
      { code: homeCode, side: 'home', opponent: awayCode },
      { code: awayCode, side: 'away', opponent: homeCode },
    ];

    for (const t of teams) {
      const teamWon = t.side === 'home' ? actualHomeWin : !actualHomeWin;
      const memory = buildMemoryForTeam({
        factors,
        teamCode: t.code,
        teamSide: t.side,
        teamWon,
        date,
        opponentCode: t.opponent,
      });
      if (!memory) continue;

      try {
        const upsertResult = await db.from('agent_memories').upsert(
          {
            team_code: t.code,
            league: 'mlb',
            memory_type: memory.type,
            content: memory.content,
            confidence: memory.confidence,
            source_game_id: null, // MLB 는 games.id row 부재 (external_game_id 별도 체계)
            valid_until: newValidUntil,
          },
          { onConflict: DB_CONSTRAINTS.agentMemories },
        );
        assertWriteOk(upsertResult, `mlb-retro.generateMlbAgentMemories.agent_memories.${t.code}`);
      } catch (e) {
        console.error(
          `[mlb-retro] agent_memories upsert failed for ${t.code}:`,
          errMsg(e),
        );
      }
    }
  }
}

export type { MlbPredictionRow, MlbScheduleRow };

// call-site select() 컬럼 목록 — MlbPredictionRow 필드와 동기 유지 (mlb-pipeline.ts 재사용)
export const MLB_MEMORY_PREDICTION_COLUMNS =
  'external_game_id, home_win_prob, home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip, ' +
  'home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip, home_war_total, ' +
  'away_war_total, home_lineup_xwoba, away_lineup_xwoba, home_lineup_barrel_pct, away_lineup_barrel_pct';
