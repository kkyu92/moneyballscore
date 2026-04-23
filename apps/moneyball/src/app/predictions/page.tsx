import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  classifyWinnerProb,
  pickTierEmoji,
  WINNER_TIER_LABEL,
  type WinnerConfidenceTier,
} from "@moneyball/shared";
import Link from "next/link";

export const metadata: Metadata = {
  title: "예측 기록",
  description: "승부예측 기록. 날짜별 세이버메트릭스 기반 경기 분석.",
  alternates: { canonical: "https://moneyballscore.vercel.app/predictions" },
};

export const revalidate = 300;

interface TierCount {
  predicted: number;
  verified: number;
  correct: number;
}

interface DateStat {
  date: string;
  total: number;
  predicted: number;
  missing: number;
  cancelled: number;
  verified: number;
  correct: number;
  tiers: Record<WinnerConfidenceTier, TierCount>;
}

function emptyTierCounts(): Record<WinnerConfidenceTier, TierCount> {
  return {
    confident: { predicted: 0, verified: 0, correct: 0 },
    lean: { predicted: 0, verified: 0, correct: 0 },
    tossup: { predicted: 0, verified: 0, correct: 0 },
  };
}

const TIER_ORDER: WinnerConfidenceTier[] = ['confident', 'lean', 'tossup'];

async function getPredictionDates(): Promise<DateStat[]> {
  const supabase = await createClient();

  // LEFT JOIN: prediction 없는 편성 경기도 포함. pre_game 타입만 붙여서
  // post_game row 가 있어도 예측 카운트 이중집계 방지.
  const { data } = await supabase
    .from('games')
    .select(
      'game_date, status, predictions(id, confidence, is_correct, reasoning, prediction_type)',
    )
    .eq('predictions.prediction_type', 'pre_game')
    .order('game_date', { ascending: false })
    .limit(200);

  if (!data) return [];

  // 날짜별 그룹핑. total = 편성 경기 (LEFT JOIN 총 game row).
  // predicted = prediction row 있는 경기. missing = total - predicted.
  // cancelled = postponed 경기. verified = is_correct 명시된 경기 (취소 제외).
  // tiers = 예측 승자 적중 확률 3단계 (confident/lean/tossup) 별 카운트.
  const dateMap = new Map<string, DateStat>();
  for (const game of data) {
    const date = game.game_date;
    if (!dateMap.has(date)) {
      dateMap.set(date, {
        date,
        total: 0,
        predicted: 0,
        missing: 0,
        cancelled: 0,
        verified: 0,
        correct: 0,
        tiers: emptyTierCounts(),
      });
    }
    const entry = dateMap.get(date)!;
    entry.total += 1;
    if (game.status === 'postponed') entry.cancelled += 1;
    const pred = game.predictions?.[0] as
      | {
          is_correct: boolean | null;
          reasoning: { homeWinProb?: number | null } | null;
        }
      | undefined;
    if (pred) {
      entry.predicted += 1;
      const hwp = pred.reasoning?.homeWinProb ?? 0.5;
      const tier = classifyWinnerProb(hwp);
      entry.tiers[tier].predicted += 1;
      if (game.status !== 'postponed' && pred.is_correct !== null) {
        entry.verified += 1;
        if (pred.is_correct) entry.correct += 1;
        entry.tiers[tier].verified += 1;
        if (pred.is_correct) entry.tiers[tier].correct += 1;
      }
    } else {
      entry.missing += 1;
    }
  }

  // 예측 있는 날짜만 표시 — games 테이블에 2023-2025 백필 경기가 있어서
  // 모든 날짜 표시하면 "예측 0" 인 과거 날짜가 섞여 UX 혼란.
  return Array.from(dateMap.values()).filter((d) => d.predicted > 0);
}

export default async function PredictionsPage() {
  const dates = await getPredictionDates();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">예측 기록</h1>
      <p className="text-gray-500 dark:text-gray-400">날짜별 승부예측 기록입니다.</p>

      {dates.length > 0 ? (
        <div className="space-y-2">
          {dates.map((d) => {
            const accuracy = d.verified > 0 ? d.correct / d.verified : 0;
            // 3단계 중 실제 예측된 티어만 카운트 캡션에 노출 (0 인 티어 스킵).
            const tierChips = TIER_ORDER.filter(
              (tier) => d.tiers[tier].predicted > 0,
            );
            return (
              <Link
                key={d.date}
                href={`/predictions/${d.date}`}
                className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div>
                      <span className="font-bold text-lg">{d.date}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-3">
                        {d.total}경기 편성
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 space-x-2">
                      <span>예측 {d.predicted}</span>
                      {tierChips.map((tier) => (
                        <span
                          key={tier}
                          className="text-gray-600 dark:text-gray-300"
                        >
                          · {pickTierEmoji(tier)} {WINNER_TIER_LABEL[tier]}{' '}
                          {d.tiers[tier].predicted}
                        </span>
                      ))}
                      {d.cancelled > 0 && (
                        <span className="text-gray-400 dark:text-gray-500">
                          · 취소 {d.cancelled}
                        </span>
                      )}
                      {d.missing > 0 && (
                        <span className="text-gray-400 dark:text-gray-500">
                          · 기록 없음 {d.missing}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      {d.verified > 0 ? (
                        <div
                          className={`text-sm font-bold ${
                            accuracy >= 0.6
                              ? "text-green-600"
                              : accuracy >= 0.5
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {d.correct}/{d.verified} 적중 ({Math.round(accuracy * 100)}
                          %)
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 dark:text-gray-500">
                          결과 대기
                        </div>
                      )}
                      {TIER_ORDER.filter(
                        (tier) => d.tiers[tier].verified > 0,
                      ).map((tier) => {
                        const t = d.tiers[tier];
                        const tierAcc = t.correct / t.verified;
                        return (
                          <div
                            key={tier}
                            className={`text-xs mt-0.5 ${
                              tierAcc >= 0.7
                                ? "text-green-600 dark:text-green-400"
                                : tierAcc >= 0.5
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {pickTierEmoji(tier)} {WINNER_TIER_LABEL[tier]}{' '}
                            {t.correct}/{t.verified} ({Math.round(tierAcc * 100)}%)
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-gray-400 dark:text-gray-500">→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-8 text-center text-gray-400 dark:text-gray-500">
          <p className="text-lg">예측 기록이 아직 없습니다.</p>
          <p className="text-sm mt-2">
            파이프라인이 실행되면 자동으로 데이터가 채워집니다.
          </p>
        </div>
      )}
    </div>
  );
}
