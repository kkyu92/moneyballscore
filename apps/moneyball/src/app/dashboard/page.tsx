import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AccuracySummary } from "@/components/dashboard/AccuracySummary";
import { AccuracyChart } from "@/components/dashboard/AccuracyChart";
import { DailyAccuracyChart } from "@/components/dashboard/DailyAccuracyChart";
import { ConfidenceBucketChart } from "@/components/dashboard/ConfidenceBucketChart";
import { TeamPerformanceChart } from "@/components/dashboard/TeamPerformanceChart";
import { FactorErrorTable, type FactorErrorRow } from "@/components/dashboard/FactorErrorTable";
import { ModelTuningInsights } from "@/components/dashboard/ModelTuningInsights";
import { buildDailyAccuracy } from "@/lib/dashboard/buildDailyAccuracy";
import { buildConfidenceBuckets } from "@/lib/dashboard/buildConfidenceBuckets";
import { buildModelTuningInsights } from "@/lib/dashboard/buildModelTuningInsights";
import { CURRENT_DEBATE_VERSION, CURRENT_MODEL_FILTER } from "@/config/model";
import {
  KBO_TEAMS,
  assertSelectOk,
  pickTierEmoji,
  shortTeamName,
  type SelectResult,
  type TeamCode,
} from "@moneyball/shared";
import { buildTierRates } from "@/lib/predictions/tierStats";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { neutral } from "@/lib/design-tokens";

export const metadata: Metadata = {
  title: "대시보드",
  description: "승부예측 시즌 적중률, 팩터별 편향, 확신 구간 분석 종합 대시보드.",
  alternates: { canonical: "https://moneyballscore.vercel.app/dashboard" },
};

// 하루 경기 종료 시점 verify cron (KST 23:00 = UTC 14:00) 이 끝나면
// `/api/revalidate` 가 자동 트리거되어 /dashboard 즉시 갱신.
// revalidate 는 24h 안전망 — API 실패 시 다음 날 자연 갱신.
export const revalidate = 86400;

interface OverviewRow {
  confidence: number;
  is_correct: boolean;
  reasoning: { homeWinProb?: number | null } | null;
  game: {
    game_date: string;
    home_team: { code: string; color_primary: string | null } | null;
    away_team: { code: string; color_primary: string | null } | null;
  } | null;
  winner: { code: string; color_primary: string | null } | null;
}

async function getOverview(): Promise<OverviewRow[]> {
  const supabase = await createClient();
  // assertSelectOk — cycle 153 silent drift family detection. predictions select
  // 가 .error 미체크 → DB 오류 시 data=null silent fallback → overview=[] silent
  // 위장 → "검증 완료 0경기" / 누적 적중률 0% 가 사용자에게 노출 (실제로는 DB
  // 오류). cycle 152 buildModelTuningInsights / cycle 148 analysis page 동일
  // family. assertSelectOk 로 fail-loud → /dashboard error.tsx boundary 처리.
  const result = (await supabase
    .from("predictions")
    .select(
      `
        confidence, is_correct, reasoning,
        game:games!predictions_game_id_fkey(
          game_date,
          home_team:teams!games_home_team_id_fkey(code, color_primary),
          away_team:teams!games_away_team_id_fkey(code, color_primary)
        ),
        winner:teams!predictions_predicted_winner_fkey(code, color_primary)
      `,
    )
    .eq("prediction_type", "pre_game")
    .match(CURRENT_MODEL_FILTER)
    .not("is_correct", "is", null)
    .order("game_id", { ascending: true })) as SelectResult<OverviewRow[]>;

  const { data } = assertSelectOk(result, "dashboard getOverview");
  return (data ?? []) as OverviewRow[];
}

async function getFactorErrors(): Promise<FactorErrorRow[]> {
  const supabase = await createClient();
  const result = (await supabase
    .from("factor_error_summary")
    .select("factor, error_count, avg_bias")
    .gte("error_count", 2)
    .order("error_count", { ascending: false })
    .limit(5)) as SelectResult<FactorErrorRow[]>;

  const { data } = assertSelectOk(result, "dashboard getFactorErrors");
  return (data ?? []) as FactorErrorRow[];
}

async function getTotalPredCount(): Promise<number> {
  const supabase = await createClient();
  const result = (await supabase
    .from("predictions")
    .select("id", { count: "exact", head: true })
    .eq("prediction_type", "pre_game")
    .match(CURRENT_MODEL_FILTER)) as SelectResult<never>;

  const { count } = assertSelectOk(result, "dashboard getTotalPredCount");
  return count ?? 0;
}

export default async function DashboardPage() {
  const [overview, factorErrors, totalPredCount, tuningReport] =
    await Promise.all([
      getOverview(),
      getFactorErrors(),
      getTotalPredCount(),
      buildModelTuningInsights(),
    ]);

  const total = overview.length;
  const correct = overview.filter((p) => p.is_correct).length;
  const rate = total > 0 ? correct / total : 0;

  // 3단계 (confident / lean / tossup) 버킷별 적중률 — 예측 승자 적중 확률 기준.
  const tierRates = buildTierRates(overview);
  const confidentStat = tierRates.confident;
  const confidentRate =
    confidentStat.total > 0 ? confidentStat.correct / confidentStat.total : 0;

  // 누적 + 일자별 — 같은 {date, is_correct} 소스에서 파생
  const dailyInputs = overview
    .filter((p): p is OverviewRow & { game: { game_date: string } } => !!p.game)
    .map((p) => ({ game_date: p.game.game_date, is_correct: p.is_correct }));
  const dailyPoints = buildDailyAccuracy(dailyInputs);

  const { points: cumulativeData } = dailyPoints.reduce<{
    points: Array<{ date: string; accuracy: number; total: number }>;
    cumCorrect: number;
    cumTotal: number;
  }>(
    (acc, pt) => {
      const cumCorrect = acc.cumCorrect + pt.correct;
      const cumTotal = acc.cumTotal + pt.total;
      acc.points.push({
        date: pt.date,
        accuracy: Math.round((cumCorrect / cumTotal) * 1000) / 10,
        total: cumTotal,
      });
      return { points: acc.points, cumCorrect, cumTotal };
    },
    { points: [], cumCorrect: 0, cumTotal: 0 },
  );

  const bucketResult = buildConfidenceBuckets(
    overview.map((p) => ({ confidence: p.confidence, is_correct: p.is_correct })),
  );

  // 팀별 집계 — 경기 참여팀 기준 (home + away 각각 카운트).
  // 이전 predicted_winner 기준은 모델이 승자로 뽑힌 팀만 포함되어
  // 대부분 팀이 "표본 <3" 으로 제외됐음. 참여팀 기준으로 전환하면
  // 한 예측이 양팀 모두에 counted → 모든 팀이 빠르게 표본 확보.
  const teamMap = new Map<string, { correct: number; total: number; color: string }>();
  for (const pred of overview) {
    const participants = [pred.game?.home_team, pred.game?.away_team].filter(
      (t): t is NonNullable<typeof pred.game>["home_team"] & object =>
        !!t && !!t.code,
    );
    for (const team of participants) {
      const code = team.code;
      if (!teamMap.has(code)) {
        const teamInfo = KBO_TEAMS[code as TeamCode];
        teamMap.set(code, {
          correct: 0,
          total: 0,
          color: teamInfo?.color || team.color_primary || neutral[500],
        });
      }
      const entry = teamMap.get(code)!;
      entry.total++;
      if (pred.is_correct) entry.correct++;
    }
  }

  const teamData = Array.from(teamMap.entries())
    .filter(([, stats]) => stats.total >= 3)
    .map(([team, stats]) => ({
      team: shortTeamName(team as TeamCode),
      accuracy: Math.round((stats.correct / stats.total) * 1000) / 10,
      total: stats.total,
      color: stats.color,
    }));

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: '대시보드' }]} />
      <section>
        <h1 className="text-3xl font-bold mb-2">대시보드</h1>
        <p className="text-gray-500 dark:text-gray-400">2026 시즌 예측 성과 종합</p>
      </section>

      {/* 모수 캡션 */}
      <aside
        className="rounded-lg border border-gray-200 dark:border-[var(--color-border)] bg-gray-50 dark:bg-[var(--color-surface-card)] px-4 py-3 text-xs text-gray-600 dark:text-gray-400"
        aria-label="성과 집계 모수 안내"
      >
        이 페이지의 모든 지표는{" "}
        <span className="font-mono text-gray-700 dark:text-gray-200">
          {CURRENT_DEBATE_VERSION}
        </span>{" "}
        토론 기반 예측만 집계합니다. 예측 총 {totalPredCount}경기 · 검증 완료 {total}경기.
      </aside>

      {/* 요약 카드 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AccuracySummary total={total} correct={correct} rate={rate} tierRates={tierRates} />
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">총 예측</h3>
          <span className="text-4xl font-bold">{totalPredCount}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">경기</span>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            검증 완료 {total}경기 · 대기 {Math.max(totalPredCount - total, 0)}경기
          </p>
        </div>
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            {pickTierEmoji('confident')} 적중 예측 적중률
          </h3>
          <span className="text-4xl font-bold">
            {confidentStat.total > 0 ? Math.round(confidentRate * 100) : 0}%
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {confidentStat.total > 0
              ? `적중 예측 ${confidentStat.correct}/${confidentStat.total}`
              : '적중 예측 표본 없음'}
          </p>
        </div>
      </section>

      {/* 적중률 추이 */}
      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
        <h2 className="text-lg font-bold mb-4">누적 적중률 추이</h2>
        <AccuracyChart data={cumulativeData} />
      </section>

      {/* 일자별 적중률 (비누적) */}
      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
        <h2 className="text-lg font-bold mb-1">일자별 적중률</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          날짜별 그 날의 적중률만 집계 (누적 아님)
        </p>
        <DailyAccuracyChart data={dailyPoints} />
      </section>

      {/* 확신 구간별 */}
      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
        <h2 className="text-lg font-bold mb-1">확신 구간별 적중률</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          AI가 더 자신 있게 예측한 구간이 실제로 잘 맞히는지 — 캘리브레이션 증거
        </p>
        <ConfidenceBucketChart result={bucketResult} />
      </section>

      {/* 팀별 성과 */}
      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
        <h2 className="text-lg font-bold mb-1">팀별 예측 적중률</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          각 팀이 참여한 경기에서 모델 예측이 얼마나 맞았는지 (홈·원정 모두 포함)
        </p>
        <TeamPerformanceChart data={teamData} />
      </section>

      {/* 팩터 오답 Top 5 */}
      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
        <h2 className="text-lg font-bold mb-1">가장 자주 틀린 팩터</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          사후 분석에서 편향이 컸던 팩터 Top 5 · 막대 길이는 평균 편향 크기
        </p>
        <FactorErrorTable rows={factorErrors} />
      </section>

      {/* 모델 v2.0 튜닝 진단 */}
      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
        <h2 className="text-lg font-bold mb-1">모델 v2.0 튜닝 진단</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          각 팩터가 실제 결과와 얼마나 일치했는지 정량 오차분석 · 샘플 누적 후
          가중치 재보정 근거로 사용
        </p>
        <ModelTuningInsights report={tuningReport} />
      </section>
    </div>
  );
}
