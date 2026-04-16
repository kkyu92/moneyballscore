import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AccuracySummary } from "@/components/dashboard/AccuracySummary";
import { AccuracyChart } from "@/components/dashboard/AccuracyChart";
import { TeamPerformanceChart } from "@/components/dashboard/TeamPerformanceChart";
import { KBO_TEAMS, type TeamCode } from "@moneyball/shared";

export const metadata: Metadata = {
  title: "대시보드",
  description: "KBO 승부예측 시즌 적중률, 팀별 분석, 모델 성과 대시보드.",
};

export const revalidate = 300;

async function getDashboardData() {
  const supabase = await createClient();

  // 검증된 예측 전체 가져오기
  const { data: predictions } = await supabase
    .from('predictions')
    .select(`
      is_correct, confidence, prediction_type,
      game:games!predictions_game_id_fkey(
        game_date,
        home_team:teams!games_home_team_id_fkey(code, color_primary),
        away_team:teams!games_away_team_id_fkey(code, color_primary)
      ),
      winner:teams!predictions_predicted_winner_fkey(code)
    `)
    .eq('prediction_type', 'pre_game')
    .not('is_correct', 'is', null)
    .order('game_id', { ascending: true });

  return predictions || [];
}

export default async function DashboardPage() {
  const predictions = await getDashboardData();

  // 시즌 전체 통계
  const total = predictions.length;
  const correct = predictions.filter((p: any) => p.is_correct).length;
  const rate = total > 0 ? correct / total : 0;
  const highConf = predictions.filter((p: any) => p.confidence >= 0.4);
  const highConfCorrect = highConf.filter((p: any) => p.is_correct).length;
  const highConfRate = highConf.length > 0 ? highConfCorrect / highConf.length : 0;

  // 날짜별 적중률 (누적)
  const dateMap = new Map<string, { correct: number; total: number }>();
  for (const pred of predictions) {
    const date = (pred as any).game?.game_date;
    if (!date) continue;
    if (!dateMap.has(date)) dateMap.set(date, { correct: 0, total: 0 });
    const entry = dateMap.get(date)!;
    entry.total++;
    if ((pred as any).is_correct) entry.correct++;
  }

  let cumCorrect = 0;
  let cumTotal = 0;
  const accuracyData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => {
      cumCorrect += stats.correct;
      cumTotal += stats.total;
      return {
        date,
        accuracy: Math.round((cumCorrect / cumTotal) * 1000) / 10,
        total: cumTotal,
      };
    });

  // 팀별 예측 적중률 (예측 승자 팀 기준)
  const teamMap = new Map<string, { correct: number; total: number; color: string }>();
  for (const pred of predictions) {
    const winnerCode = (pred as any).winner?.code as string;
    if (!winnerCode) continue;

    if (!teamMap.has(winnerCode)) {
      const teamInfo = KBO_TEAMS[winnerCode as TeamCode];
      teamMap.set(winnerCode, {
        correct: 0,
        total: 0,
        color: teamInfo?.color || "#6b7280",
      });
    }
    const entry = teamMap.get(winnerCode)!;
    entry.total++;
    if ((pred as any).is_correct) entry.correct++;
  }

  const teamData = Array.from(teamMap.entries())
    .filter(([_, stats]) => stats.total >= 3)
    .map(([team, stats]) => ({
      team,
      accuracy: Math.round((stats.correct / stats.total) * 1000) / 10,
      total: stats.total,
      color: stats.color,
    }));

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold mb-2">대시보드</h1>
        <p className="text-gray-500 dark:text-gray-400">2026 시즌 예측 성과 종합</p>
      </section>

      {/* 요약 카드 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AccuracySummary total={total} correct={correct} rate={rate} highConfRate={highConfRate} />
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">총 예측</h3>
          <span className="text-4xl font-bold">{total}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">경기</span>
        </div>
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">고확신 적중</h3>
          <span className="text-4xl font-bold">
            {highConf.length > 0 ? Math.round(highConfRate * 100) : 0}%
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            70%+ 확신 예측 ({highConfCorrect}/{highConf.length})
          </p>
        </div>
      </section>

      {/* 적중률 추이 */}
      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold mb-4">누적 적중률 추이</h2>
        <AccuracyChart data={accuracyData} />
      </section>

      {/* 팀별 성과 */}
      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold mb-4">팀별 예측 적중률</h2>
        <TeamPerformanceChart data={teamData} />
      </section>
    </div>
  );
}
