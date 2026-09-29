import {
  assertSelectOk,
  MLB_PRODUCTION_COHORT_RULES,
  normalizeMlbTeamCode,
  type MlbTeamCode,
} from "@moneyball/shared";
import { createClient } from "@/lib/supabase/server";
import { presentJudgeReasoningWithFallback } from "@/lib/predictions/judgeReasoning";
import { isValidInsightsDate } from "@/lib/insights/loader";

// MLB 예측은 games FK 모델이 없음(game_id=NULL, migration 038) — KBO app/insights/page.tsx
// 의 `games!inner` 조인은 MLB 에 그대로 쓰면 항상 미스매치(빈 목록, cycle 2114
// fix-incident). predictions 를 league='mlb' + scoring_rule 필터로 먼저 조회 후
// mlb_schedule 로 팀 코드/상태 join — mlb/analysis/analysis-data.ts
// getTodayMlbAnalysisRows() 와 동일 2-step 패턴 (silent drift family fix cycle 1168,
// plan #24 CRITICAL Part 1/2 재발 방지 원칙 재사용). KO(mlb/insights)/EN(en/mlb/insights)
// 양쪽에서 공유 — mlb/analysis/analysis-data.ts 가 en/mlb/analysis(cycle 2338) 와 공유
// 위해 page.tsx 밖으로 분리된 것과 동일 이유(DRY).
//
// ⚠️ 데이터 가용성 실측 (cycle 2924 explore-idea/구현 착수 시점 DB 직접 조회):
// league='mlb' 예측은 reasoning/factors 컬럼이 **전량 NULL**(0/1280건, 2026-09-29 실측).
// packages/kbo-data/src/pipeline/mlb-pipeline.ts 가 LLM debate 를 아예 호출하지 않음
// (KBO 전용 debate.ts 미연결 — mlb-pipeline.ts insert 객체에 `reasoning` 키 자체가 없음,
// `debate_version: null` 명시 주석 "LLM debate 미구현"). 즉 이 쿼리는 현재 시점엔 KBO 의
// CE(CREDIT_EXHAUSTED) fallback 텍스트조차 없이 **항상 빈 배열**을 반환한다 — MLB 판정
// reasoning 파이프라인 자체가 아직 없어서다(별도 스코프, 본 페이지가 고칠 수 있는 범위
// 밖). 아래 로직은 그 파이프라인이 나중에 추가되면 자동으로 동작하도록 KBO 와 동일한
// `reasoning.debate.verdict.reasoning` 경로를 그대로 가정한다.
export interface MlbInsightRow {
  gameId: string;
  date: string;
  homeTeam: MlbTeamCode;
  awayTeam: MlbTeamCode;
  status: string;
  isCorrect: boolean | null;
  reasoningText: string;
  isFallback: boolean;
  homeWinProb: number | null;
  factors: Record<string, number> | null;
}

interface Verdict {
  reasoning?: string;
  homeWinProb?: number;
}

interface ReasoningShape {
  debate?: { verdict?: Verdict };
}

interface MlbInsightPredRow {
  external_game_id: string;
  mlb_game_date: string;
  is_correct: boolean | null;
  reasoning: ReasoningShape | null;
  factors: Record<string, number> | null;
}

interface MlbInsightScheduleRow {
  external_game_id: string;
  home_team_code: string;
  away_team_code: string;
  status: string;
}

const PREVIEW_LENGTH = 280;

// mlb_schedule 2-step join + presented-reasoning 매핑 — getRecentMlbInsights(hub)와
// getMlbInsightsForDate([date] 아카이브, plan #30 Phase 2) 양쪽이 공유하는 공통 로직.
async function mapMlbPredictionRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: MlbInsightPredRow[],
  limit?: number,
): Promise<MlbInsightRow[]> {
  const gameIds = rows.map((r) => r.external_game_id).filter((id): id is string => Boolean(id));
  if (gameIds.length === 0) return [];

  const scheduleResult = await supabase
    .from("mlb_schedule")
    .select("external_game_id, home_team_code, away_team_code, status")
    .in("external_game_id", gameIds);
  const { data: schedules } = assertSelectOk(scheduleResult, "mlb-insights.mapMlbPredictionRows schedule");
  const scheduleByGameId = new Map(
    ((schedules ?? []) as MlbInsightScheduleRow[]).map((s) => [s.external_game_id, s]),
  );

  const out: MlbInsightRow[] = [];
  for (const row of rows) {
    const verdict = row.reasoning?.debate?.verdict;
    const presented = presentJudgeReasoningWithFallback(verdict?.reasoning, { maxLength: PREVIEW_LENGTH });
    if (!presented) continue;
    const schedule = scheduleByGameId.get(row.external_game_id);
    const homeCode = schedule ? normalizeMlbTeamCode(schedule.home_team_code) : undefined;
    const awayCode = schedule ? normalizeMlbTeamCode(schedule.away_team_code) : undefined;
    if (!homeCode || !awayCode) continue;
    const rawFactors = row.factors;
    const factors =
      rawFactors && typeof rawFactors === "object" && Object.keys(rawFactors).length > 0
        ? rawFactors
        : null;
    out.push({
      gameId: row.external_game_id,
      date: row.mlb_game_date,
      homeTeam: homeCode,
      awayTeam: awayCode,
      status: schedule?.status ?? "scheduled",
      isCorrect: row.is_correct,
      reasoningText: presented.text,
      isFallback: presented.isFallback,
      homeWinProb: verdict?.homeWinProb ?? null,
      factors,
    });
    if (limit !== undefined && out.length >= limit) break;
  }
  return out;
}

export async function getRecentMlbInsights(limit: number): Promise<MlbInsightRow[]> {
  const supabase = await createClient();
  const predResult = await supabase
    .from("predictions")
    .select("external_game_id, mlb_game_date, is_correct, reasoning, factors")
    .eq("league", "mlb")
    .eq("prediction_type", "pre_game")
    .in("scoring_rule", MLB_PRODUCTION_COHORT_RULES as readonly string[])
    .order("created_at", { ascending: false })
    .limit(limit * 4);
  const { data } = assertSelectOk(predResult, "mlb-insights.getRecentMlbInsights predictions");
  if (!data || data.length === 0) return [];
  return mapMlbPredictionRows(supabase, data as unknown as MlbInsightPredRow[], limit);
}

// plan #30 Phase 2 — /mlb/insights/[date] 아카이브. KBO lib/insights/loader.ts
// listInsightsDates()/getInsightsForDate() 의 mlb_schedule 모델 이식. KBO 는 games FK
// 조인으로 일자를 얻지만 MLB predictions 는 mlb_game_date 컬럼을 이미 직접 보유(games FK
// 자체가 없음, migration 038 game_id=NULL) — 별도 조인 없이 바로 필터 가능해 KBO 대비 단순.
export async function listMlbInsightsDates(daysBack = 90): Promise<string[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - daysBack);
  const sinceStr = since.toISOString().slice(0, 10);

  const result = await supabase
    .from("predictions")
    .select("mlb_game_date")
    .eq("league", "mlb")
    .eq("prediction_type", "pre_game")
    .in("scoring_rule", MLB_PRODUCTION_COHORT_RULES as readonly string[])
    .gte("mlb_game_date", sinceStr)
    .order("mlb_game_date", { ascending: false })
    .limit(daysBack * 20);
  const { data } = assertSelectOk(result, "mlb-insights.listMlbInsightsDates");
  if (!data) return [];

  const dates = new Set<string>();
  for (const row of data as { mlb_game_date: string | null }[]) {
    if (row.mlb_game_date && isValidInsightsDate(row.mlb_game_date)) {
      dates.add(row.mlb_game_date);
    }
  }
  return [...dates].sort().reverse();
}

export async function getMlbInsightsForDate(date: string): Promise<MlbInsightRow[]> {
  if (!isValidInsightsDate(date)) return [];
  const supabase = await createClient();
  const predResult = await supabase
    .from("predictions")
    .select("external_game_id, mlb_game_date, is_correct, reasoning, factors")
    .eq("league", "mlb")
    .eq("prediction_type", "pre_game")
    .in("scoring_rule", MLB_PRODUCTION_COHORT_RULES as readonly string[])
    .eq("mlb_game_date", date)
    .order("created_at", { ascending: false });
  const { data } = assertSelectOk(predResult, "mlb-insights.getMlbInsightsForDate predictions");
  if (!data || data.length === 0) return [];
  return mapMlbPredictionRows(supabase, data as unknown as MlbInsightPredRow[]);
}
