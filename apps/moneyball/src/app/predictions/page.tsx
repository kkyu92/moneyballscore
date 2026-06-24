import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  assertSelectOk,
  classifyWinnerProb,
  KBO_FACTOR_COUNT,
  pickTierEmoji,
  PREDICTIONS_ISR_SECONDS,
  WINNER_TIER_LABEL,
  type WinnerConfidenceTier,
} from "@moneyball/shared";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { PredictionsStatusFilter } from "@/components/predictions/PredictionsStatusFilter";
import { PredictionsSortControl } from "@/components/predictions/PredictionsSortControl";
import { PredictionsTierFilter } from "@/components/predictions/PredictionsTierFilter";
import { PredictionsMonthFilter } from "@/components/predictions/PredictionsMonthFilter";
import { PredictionsSearchBox } from "@/components/predictions/PredictionsSearchBox";
import { AccuracyHeaderCard } from "@/components/predictions/AccuracyHeaderCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { accuracyRateColorClass } from "@/lib/accuracy/buildAccuracyData";

export const metadata: Metadata = {
  title: "예측 기록",
  description: `KBO 승부예측 전체 기록 — 매일 갱신되는 경기별 신뢰도와 실제 결과를 날짜·팀·상태별로 검색. 세이버메트릭스 ${KBO_FACTOR_COUNT}팩터 정량 모델 + AI 에이전트 토론 기반.`,
  alternates: { canonical: "https://moneyballscore.vercel.app/predictions" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://moneyballscore.vercel.app/predictions",
    siteName: "MoneyBall Score",
    title: "예측 기록 | MoneyBall Score",
    description: "KBO 승부예측 전체 기록 — 매일 갱신되는 경기별 신뢰도와 실제 결과를 날짜·팀·상태별로 검색.",
  },
  twitter: {
    card: "summary_large_image",
    title: "예측 기록 | MoneyBall Score",
    description: "KBO 승부예측 전체 기록 — 매일 갱신되는 경기별 신뢰도와 실제 결과.",
  },
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
  teamCodes: Set<string>;
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
  // games 테이블 컬럼 = home_team_id / away_team_id (FK to teams). teams.code
  // 가 KBO team code. cycle 869 사례 14 fix — silent drift family 잔존 instance.
  const result = await supabase
    .from('games')
    .select(
      'game_date, status, home_team:teams!games_home_team_id_fkey(code), away_team:teams!games_away_team_id_fkey(code), predictions(id, confidence, is_correct, reasoning, prediction_type)',
    )
    .eq('predictions.prediction_type', 'pre_game')
    .order('game_date', { ascending: false })
    .limit(200);
  const { data } = assertSelectOk(result, 'predictions.getPredictionDates');

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
        teamCodes: new Set<string>(),
      });
    }
    const entry = dateMap.get(date)!;
    entry.total += 1;
    const homeTeamField = game.home_team as
      | { code: string }
      | { code: string }[]
      | null;
    const awayTeamField = game.away_team as
      | { code: string }
      | { code: string }[]
      | null;
    const homeCode = Array.isArray(homeTeamField)
      ? homeTeamField[0]?.code
      : homeTeamField?.code;
    const awayCode = Array.isArray(awayTeamField)
      ? awayTeamField[0]?.code
      : awayTeamField?.code;
    if (homeCode) entry.teamCodes.add(homeCode);
    if (awayCode) entry.teamCodes.add(awayCode);
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

  const counts = {
    all: dates.length,
    verified: dates.filter((d) => d.verified > 0).length,
    pending: dates.filter((d) => d.verified === 0).length,
  };

  const tierCounts = {
    all: dates.length,
    confident: dates.filter((d) => d.tiers.confident.predicted > 0).length,
    lean: dates.filter((d) => d.tiers.lean.predicted > 0).length,
    tossup: dates.filter((d) => d.tiers.tossup.predicted > 0).length,
  };

  // 월별 그룹 — dates 는 game_date desc 정렬 → months 도 desc 자연 유지.
  const monthCountMap = new Map<string, number>();
  for (const d of dates) {
    const month = d.date.slice(0, 7);
    monthCountMap.set(month, (monthCountMap.get(month) ?? 0) + 1);
  }
  const months = Array.from(monthCountMap.keys());
  const monthCounts: Record<string, number> = { all: dates.length };
  for (const [m, c] of monthCountMap) monthCounts[m] = c;

  const totals = dates.reduce(
    (acc, d) => ({
      predicted: acc.predicted + d.predicted,
      verified: acc.verified + d.verified,
      correct: acc.correct + d.correct,
    }),
    { predicted: 0, verified: 0, correct: 0 },
  );

  // 최근 N건 trend — dates 는 game_date desc 정렬. verified 누적 ≥ 20 도달 시
  // 멈춤. 본 chip = 전체 적중률 대비 최근 ±%p diff 노출 (헤더 카드 안).
  const RECENT_TARGET = 20;
  let recentVerified = 0;
  let recentCorrect = 0;
  for (const d of dates) {
    if (recentVerified >= RECENT_TARGET) break;
    recentVerified += d.verified;
    recentCorrect += d.correct;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "KBO 예측 기록",
    description:
      "KBO 승부예측 전체 기록 — 매일 갱신되는 경기별 신뢰도와 실제 결과를 날짜·팀·상태별로 검색.",
    url: "https://moneyballscore.vercel.app/predictions",
    inLanguage: "ko-KR",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: dates.length,
      itemListElement: dates.slice(0, 30).map((d, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://moneyballscore.vercel.app/predictions/${d.date}`,
        name: `${d.date} 예측 ${d.predicted}경기`,
      })),
    },
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb items={[{ label: '예측 기록' }]} />
      <h1 className="text-3xl font-bold">예측 기록</h1>
      <p className="text-gray-500 dark:text-gray-400">날짜별 승부예측 기록입니다.</p>

      {dates.length > 0 && (
        <AccuracyHeaderCard
          totalPredicted={totals.predicted}
          totalVerified={totals.verified}
          totalCorrect={totals.correct}
          recentVerified={recentVerified}
          recentCorrect={recentCorrect}
        />
      )}

      {dates.length > 0 && <PredictionsSearchBox />}
      {dates.length > 0 && <PredictionsStatusFilter counts={counts} />}
      {dates.length > 0 && <PredictionsTierFilter counts={tierCounts} />}
      {months.length > 1 && (
        <PredictionsMonthFilter months={months} counts={monthCounts} />
      )}
      {dates.length > 0 && <PredictionsSortControl />}

      {dates.length > 0 ? (
        <div className="flex flex-col gap-2" data-predictions-list>
          {dates.map((d) => {
            const accuracy = d.verified > 0 ? d.correct / d.verified : 0;
            const status = d.verified > 0 ? 'verified' : 'pending';
            // 3단계 중 실제 예측된 티어만 카운트 캡션에 노출 (0 인 티어 스킵).
            const tierChips = TIER_ORDER.filter(
              (tier) => d.tiers[tier].predicted > 0,
            );
            const tiersPresent = tierChips.join(' ');
            return (
              <Link
                key={d.date}
                href={`/predictions/${d.date}`}
                data-prediction-status={status}
                data-prediction-tiers={tiersPresent}
                data-prediction-month={d.date.slice(0, 7)}
                data-prediction-date={d.date}
                data-prediction-teams={Array.from(d.teamCodes).join(' ')}
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
                          className={`text-sm font-bold ${accuracyRateColorClass(accuracy)}`}
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
                                ? "text-brand-600 dark:text-brand-400"
                                : tierAcc >= 0.5
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-red-600 dark:text-red-400"
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
        <EmptyState
          title="예측 기록이 아직 없습니다."
          description="파이프라인이 실행되면 자동으로 데이터가 채워집니다."
        />
      )}
    </div>
  );
}
