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

// /mlb/predictions(KO) 의 EN mirror — 로직은 완전 동일, 문자열만 번역
// + locale="en" prop 전파. sitemap.ts 의 EN mirror carry-over 항목 처리.
const PAGE_URL = `${SITE_URL}/en/mlb/predictions`;

export const metadata: Metadata = {
  title: "MLB Prediction History",
  description:
    "Full MLB prediction history — daily confidence tiers and actual results, searchable by date, team, and status.",
  alternates: {
    canonical: PAGE_URL,
    languages: {
      en: PAGE_URL,
      ko: `${SITE_URL}/mlb/predictions`,
    },
  },
  openGraph: {
    title: "MLB Prediction History | MoneyBall Score",
    description: "Full MLB prediction history — daily confidence tiers and actual results.",
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB Prediction History | MoneyBall Score",
    description: "Full MLB prediction history — daily confidence tiers and actual results.",
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

const TIER_LABEL_EN: Record<WinnerConfidenceTier, string> = {
  confident: 'Confident',
  lean: 'Lean',
  tossup: 'Toss-up',
};

async function getMlbPredictionDates(): Promise<DateStat[]> {
  const supabase = await createClient();

  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('external_game_id, game_date, status, home_team_code, away_team_code, home_score, away_score')
    .order('game_date', { ascending: false })
    .limit(PREDICTIONS_HISTORY_LIMIT);
  const { data: scheduleData } = assertSelectOk(scheduleResult, 'mlbPredictionsEn.getMlbPredictionDates mlb_schedule');
  const scheduleRows = (scheduleData ?? []) as MlbScheduleHistRow[];
  if (scheduleRows.length === 0) return [];

  const predResult = await supabase
    .from('predictions')
    .select('external_game_id, home_win_prob')
    .eq('prediction_type', 'pre_game')
    .eq('league', 'mlb')
    .in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)
    .in('external_game_id', scheduleRows.map((s) => s.external_game_id));
  const { data: predData } = assertSelectOk(predResult, 'mlbPredictionsEn.getMlbPredictionDates predictions');
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

  // 예측 있는 날짜만 표시 — KO 동일 컨벤션.
  return Array.from(dateMap.values()).filter((d) => d.predicted > 0);
}

export default async function MlbPredictionsPageEn() {
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
    name: "MLB Prediction History",
    description:
      "Full MLB prediction history — daily confidence tiers and actual results, searchable by date, team, and status.",
    url: PAGE_URL,
    inLanguage: "en-US",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: dates.length,
      itemListElement: dates.slice(0, 30).map((d, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/en/mlb/games/${d.date}`,
        name: `${d.date} — ${d.predicted} MLB predictions`,
      })),
    },
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb
        items={[{ label: 'MLB Analysis', href: '/en/mlb' }, { label: 'Prediction History' }]}
        locale="en"
      />
      <h1 className="text-3xl font-bold">MLB Prediction History</h1>
      <p className="text-gray-500 dark:text-gray-400">Daily MLB prediction history.</p>

      {dates.length > 0 && (
        <AccuracyHeaderCard
          totalPredicted={totals.predicted}
          totalVerified={totals.verified}
          totalCorrect={totals.correct}
          recentVerified={recentVerified}
          recentCorrect={recentCorrect}
          tierAccuracy={tierTotals}
          locale="en"
        />
      )}

      {dates.length > 0 && <MlbPredictionsSearchBox locale="en" />}
      {dates.length > 0 && <PredictionsStatusFilter counts={counts} locale="en" />}
      {dates.length > 0 && <PredictionsTierFilter counts={tierCounts} locale="en" />}
      {months.length > 1 && (
        <PredictionsMonthFilter months={months} counts={monthCounts} locale="en" />
      )}
      {dates.length > 0 && <PredictionsSortControl locale="en" />}

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
                href={`/en/mlb/games/${d.date}`}
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
                        {d.total} games scheduled
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 space-x-2">
                      <span>{d.predicted} predicted</span>
                      {tierChips.map((tier) => (
                        <span key={tier} className="text-gray-600 dark:text-gray-300">
                          · {pickTierEmoji(tier)} {TIER_LABEL_EN[tier]} {d.tiers[tier].predicted}
                        </span>
                      ))}
                      {d.cancelled > 0 && (
                        <span className="text-gray-400 dark:text-gray-500">
                          · {d.cancelled} cancelled
                        </span>
                      )}
                      {d.missing > 0 && (
                        <span className="text-gray-400 dark:text-gray-500">
                          · {d.missing} no record
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      {d.verified > 0 ? (
                        <div className={`text-sm font-bold ${accuracyRateColorClass(accuracy)}`}>
                          {d.correct}/{d.verified} correct ({Math.round(accuracy * 100)}%)
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 dark:text-gray-500">Awaiting result</div>
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
                            {pickTierEmoji(tier)} {TIER_LABEL_EN[tier]} {t.correct}/{t.verified} ({Math.round(tierAcc * 100)}%)
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
          title="No prediction history yet."
          description="Data fills in automatically once the pipeline runs."
        />
      )}
    </div>
  );
}
