import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  assertSelectOk,
  classifyWinnerProb,
  MLB_PRODUCTION_COHORT_RULES,
  normalizeMlbTeamCode,
  pickTierEmoji,
  PREDICTIONS_HISTORY_LIMIT,
  SITE_URL,
  WINNER_TIER_LABEL,
  type WinnerConfidenceTier,
} from "@moneyball/shared";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { MlbPredictionsSearchBox } from "@/components/predictions/MlbPredictionsSearchBox";
import { PredictionsStatusFilter } from "@/components/predictions/PredictionsStatusFilter";
import { PredictionsSortControl } from "@/components/predictions/PredictionsSortControl";
import { PredictionsTierFilter } from "@/components/predictions/PredictionsTierFilter";
import { PredictionsMonthFilter } from "@/components/predictions/PredictionsMonthFilter";
import { AccuracyHeaderCard } from "@/components/predictions/AccuracyHeaderCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { accuracyRateColorClass } from "@/lib/accuracy/buildAccuracyData";
import { deriveMlbOutcome } from "@/lib/mlb/deriveMlbOutcome";

// KBO predictions/page.tsx 의 MLB 변형. KBO 는 `games`(팀 FK) LEFT JOIN predictions 로
// "미기록"(missing) 날짜까지 잡지만, MLB 는 games 모델을 안 써서 `mlb_schedule` 을 동일
// 역할(전체 편성 경기 원천)로 두고 predictions 를 external_game_id 로 map — 2-step 조회
// 패턴(mlb/games/[date]/page.tsx, silent drift family fix cycle 1168)과 동일 사유.
const PAGE_URL = `${SITE_URL}/mlb/predictions`;

export const metadata: Metadata = {
  title: "MLB 예측 기록",
  description:
    "MLB 승부예측 전체 기록 — 매일 갱신되는 경기별 신뢰도와 실제 결과를 날짜·팀·상태별로 검색.",
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: "MLB 예측 기록 | MoneyBall Score",
    description: "MLB 승부예측 전체 기록 — 매일 갱신되는 경기별 신뢰도와 실제 결과.",
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB 예측 기록 | MoneyBall Score",
    description: "MLB 승부예측 전체 기록 — 매일 갱신되는 경기별 신뢰도와 실제 결과.",
  },
};

export const revalidate = 1800; // MLB_LIVE_ISR_SECONDS (Next.js 16 Turbopack: literal required)

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

interface MlbScheduleHistRow {
  external_game_id: string;
  game_date: string;
  status: string;
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
}

interface MlbPredMiniRow {
  external_game_id: string | null;
  home_win_prob: number | null;
}

function emptyTierCounts(): Record<WinnerConfidenceTier, TierCount> {
  return {
    confident: { predicted: 0, verified: 0, correct: 0 },
    lean: { predicted: 0, verified: 0, correct: 0 },
    tossup: { predicted: 0, verified: 0, correct: 0 },
  };
}

const TIER_ORDER: WinnerConfidenceTier[] = ['confident', 'lean', 'tossup'];

async function getMlbPredictionDates(): Promise<DateStat[]> {
  const supabase = await createClient();

  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('external_game_id, game_date, status, home_team_code, away_team_code, home_score, away_score')
    .order('game_date', { ascending: false })
    .limit(PREDICTIONS_HISTORY_LIMIT);
  const { data: scheduleData } = assertSelectOk(scheduleResult, 'mlbPredictions.getMlbPredictionDates mlb_schedule');
  const scheduleRows = (scheduleData ?? []) as MlbScheduleHistRow[];
  if (scheduleRows.length === 0) return [];

  const predResult = await supabase
    .from('predictions')
    .select('external_game_id, home_win_prob')
    .eq('prediction_type', 'pre_game')
    .eq('league', 'mlb')
    .in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)
    .in('external_game_id', scheduleRows.map((s) => s.external_game_id));
  const { data: predData } = assertSelectOk(predResult, 'mlbPredictions.getMlbPredictionDates predictions');
  const predByExternalId = new Map<string, MlbPredMiniRow>();
  for (const p of (predData ?? []) as MlbPredMiniRow[]) {
    if (p.external_game_id) predByExternalId.set(p.external_game_id, p);
  }

  const dateMap = new Map<string, DateStat>();
  for (const s of scheduleRows) {
    const date = s.game_date;
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
    const homeCode = normalizeMlbTeamCode(s.home_team_code);
    const awayCode = normalizeMlbTeamCode(s.away_team_code);
    if (homeCode) entry.teamCodes.add(homeCode);
    if (awayCode) entry.teamCodes.add(awayCode);
    if (s.status === 'postponed') entry.cancelled += 1;

    const pred = predByExternalId.get(s.external_game_id);
    if (pred) {
      entry.predicted += 1;
      const tier = classifyWinnerProb(pred.home_win_prob);
      entry.tiers[tier].predicted += 1;
      if (s.status !== 'postponed') {
        const { isCorrect } = deriveMlbOutcome({
          homeWinProb: pred.home_win_prob,
          hasFinalScore: s.status === 'final' && s.home_score != null && s.away_score != null,
          homeScore: s.home_score,
          awayScore: s.away_score,
        });
        if (isCorrect != null) {
          entry.verified += 1;
          entry.tiers[tier].verified += 1;
          if (isCorrect) {
            entry.correct += 1;
            entry.tiers[tier].correct += 1;
          }
        }
      }
    } else {
      entry.missing += 1;
    }
  }

  // 예측 있는 날짜만 표시 — 백필/미예측 편성만 있는 과거 날짜는 UX 혼란 (KBO 동일 컨벤션).
  return Array.from(dateMap.values()).filter((d) => d.predicted > 0);
}

export default async function MlbPredictionsPage() {
  const dates = await getMlbPredictionDates();

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

  const tierTotals = dates.reduce(
    (acc, d) => ({
      confident: {
        verified: acc.confident.verified + d.tiers.confident.verified,
        correct: acc.confident.correct + d.tiers.confident.correct,
      },
      lean: {
        verified: acc.lean.verified + d.tiers.lean.verified,
        correct: acc.lean.correct + d.tiers.lean.correct,
      },
      tossup: {
        verified: acc.tossup.verified + d.tiers.tossup.verified,
        correct: acc.tossup.correct + d.tiers.tossup.correct,
      },
    }),
    {
      confident: { verified: 0, correct: 0 },
      lean: { verified: 0, correct: 0 },
      tossup: { verified: 0, correct: 0 },
    },
  );

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
    name: "MLB 예측 기록",
    description: "MLB 승부예측 전체 기록 — 매일 갱신되는 경기별 신뢰도와 실제 결과를 날짜·팀·상태별로 검색.",
    url: PAGE_URL,
    inLanguage: "ko-KR",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: dates.length,
      itemListElement: dates.slice(0, 30).map((d, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/mlb/games/${d.date}`,
        name: `${d.date} MLB 예측 ${d.predicted}경기`,
      })),
    },
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb items={[{ label: 'MLB 분석', href: '/mlb' }, { label: '예측 기록' }]} />
      <h1 className="text-3xl font-bold">MLB 예측 기록</h1>
      <p className="text-gray-500 dark:text-gray-400">날짜별 MLB 승부예측 기록입니다.</p>

      {dates.length > 0 && (
        <AccuracyHeaderCard
          totalPredicted={totals.predicted}
          totalVerified={totals.verified}
          totalCorrect={totals.correct}
          recentVerified={recentVerified}
          recentCorrect={recentCorrect}
          tierAccuracy={tierTotals}
        />
      )}

      {dates.length > 0 && <MlbPredictionsSearchBox />}
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
            const tierChips = TIER_ORDER.filter((tier) => d.tiers[tier].predicted > 0);
            const tiersPresent = tierChips.join(' ');
            return (
              <Link
                key={d.date}
                href={`/mlb/games/${d.date}`}
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
                        <span key={tier} className="text-gray-600 dark:text-gray-300">
                          · {pickTierEmoji(tier)} {WINNER_TIER_LABEL[tier]} {d.tiers[tier].predicted}
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
                        <div className={`text-sm font-bold ${accuracyRateColorClass(accuracy)}`}>
                          {d.correct}/{d.verified} 적중 ({Math.round(accuracy * 100)}%)
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 dark:text-gray-500">결과 대기</div>
                      )}
                      {TIER_ORDER.filter((tier) => d.tiers[tier].verified > 0).map((tier) => {
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
                            {pickTierEmoji(tier)} {WINNER_TIER_LABEL[tier]} {t.correct}/{t.verified} ({Math.round(tierAcc * 100)}%)
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
