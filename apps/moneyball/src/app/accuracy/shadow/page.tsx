import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import {
  assertSelectOk,
  SHADOW_WEIGHTS,
  SHADOW_SCORING_RULE,
  CURRENT_SCORING_RULE,
  V2_PROMOTION_COHORT_N,
  ACCURACY_ISR_SECONDS,
} from "@moneyball/shared";
import { shadowBrierDelta } from "@moneyball/kbo-data";
import { pairProbForRow } from "@/lib/accuracy/shadow-pair-prob";
import { buildShadowCalibration } from "@/lib/accuracy/buildShadowCalibration";
import {
  CalibrationPlot,
  CALIBRATION_COLORS,
} from "@/components/accuracy/CalibrationPlot";

const SITE_URL = "https://moneyballscore.vercel.app";
const PAGE_URL = `${SITE_URL}/accuracy/shadow`;
const DAY_LIMIT = 14;

// noindex 내부 cohort evidence — n=V2_PROMOTION_COHORT_N 도달 후 production 적용 결정 전까지 surface signal 차단.
export const metadata: Metadata = {
  title: "Shadow cohort 적중률",
  description: `v1.8 (production) vs ${SHADOW_SCORING_RULE} 가중치 Brier delta + 적중률 delta 일별 누적. n=${V2_PROMOTION_COHORT_N} 도달 후 prod 적용 결정.`,
  alternates: { canonical: PAGE_URL },
  robots: { index: false, follow: false },
};

export const revalidate = ACCURACY_ISR_SECONDS;

interface GameField {
  game_date: string;
  status: string;
  home_team_id: number;
  winner_team_id: number | null;
}

interface ShadowRowRaw {
  game_id: number;
  scoring_rule: string;
  reasoning: unknown;
  predicted_winner: number;
  factors: Record<string, number> | null;
  games: GameField | GameField[] | null;
}

interface DailyDelta {
  date: string;
  n: number;
  v18BrierSum: number;
  shadowBrierSum: number;
  v18Correct: number;
  shadowCorrect: number;
}

interface CohortPair {
  gameId: number;
  date: string;
  homeWin: boolean | null;
  v18Prob: number | null;
  shadowProb: number | null;
}

function pickGames(field: ShadowRowRaw["games"]): GameField | null {
  if (!field) return null;
  return Array.isArray(field) ? field[0] ?? null : field;
}

async function getCohortPairs(): Promise<CohortPair[]> {
  const supabase = await createClient();
  const result = await supabase
    .from("predictions")
    .select(
      "game_id, scoring_rule, reasoning, predicted_winner, factors, games!inner(game_date, status, home_team_id, winner_team_id)",
    )
    .in("scoring_rule", [CURRENT_SCORING_RULE, SHADOW_SCORING_RULE])
    .eq("prediction_type", "pre_game")
    .order("game_id", { ascending: false })
    .limit(DAY_LIMIT * 30);
  const { data } = assertSelectOk(result, "shadow.getCohortPairs");
  if (!data) return [];

  const byGame = new Map<number, CohortPair>();
  for (const row of data as ShadowRowRaw[]) {
    const game = pickGames(row.games);
    if (!game) continue;
    const existing = byGame.get(row.game_id) ?? {
      gameId: row.game_id,
      date: game.game_date,
      homeWin: game.winner_team_id !== null
        ? game.winner_team_id === game.home_team_id
        : null,
      v18Prob: null,
      shadowProb: null,
    };
    const prob = pairProbForRow(row.scoring_rule, row.reasoning, row.factors);
    if (row.scoring_rule === SHADOW_SCORING_RULE) {
      existing.shadowProb = prob;
    } else {
      existing.v18Prob = prob;
    }
    byGame.set(row.game_id, existing);
  }

  // pair 양쪽 모두 존재 + 결과 박제된 row 만
  return [...byGame.values()].filter(
    (p) => p.v18Prob !== null && p.shadowProb !== null && p.homeWin !== null,
  );
}

function aggregateDaily(pairs: CohortPair[]): DailyDelta[] {
  const byDate = new Map<string, DailyDelta>();
  for (const p of pairs) {
    if (p.v18Prob === null || p.shadowProb === null || p.homeWin === null) continue;
    const delta = shadowBrierDelta(p.v18Prob, p.shadowProb, p.homeWin);
    const v18Win = (p.v18Prob >= 0.5) === p.homeWin;
    const shadowWin = (p.shadowProb >= 0.5) === p.homeWin;
    const entry = byDate.get(p.date) ?? {
      date: p.date,
      n: 0,
      v18BrierSum: 0,
      shadowBrierSum: 0,
      v18Correct: 0,
      shadowCorrect: 0,
    };
    entry.n += 1;
    entry.v18BrierSum += delta.v18Brier;
    entry.shadowBrierSum += delta.shadowBrier;
    if (v18Win) entry.v18Correct += 1;
    if (shadowWin) entry.shadowCorrect += 1;
    byDate.set(p.date, entry);
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, DAY_LIMIT);
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function fmtBrier(v: number): string {
  return v.toFixed(4);
}

function deltaClass(delta: number): string {
  if (Math.abs(delta) < 0.001) return "text-gray-500 dark:text-gray-400";
  if (delta < 0) return "text-brand-600 dark:text-brand-400"; // shadow 우세
  return "text-red-600 dark:text-red-400"; // v1.8 우세
}

export default async function ShadowAccuracyPage() {
  const pairs = await getCohortPairs();
  const daily = aggregateDaily(pairs);
  const totalN = pairs.length;
  const totalV18Brier = pairs.reduce(
    (s, p) => s + (p.v18Prob !== null && p.homeWin !== null ? (p.v18Prob - (p.homeWin ? 1 : 0)) ** 2 : 0),
    0,
  );
  const totalShadowBrier = pairs.reduce(
    (s, p) =>
      s + (p.shadowProb !== null && p.homeWin !== null ? (p.shadowProb - (p.homeWin ? 1 : 0)) ** 2 : 0),
    0,
  );
  const avgV18 = totalN > 0 ? totalV18Brier / totalN : 0;
  const avgShadow = totalN > 0 ? totalShadowBrier / totalN : 0;
  const totalDelta = avgShadow - avgV18;
  const calibration = buildShadowCalibration(pairs);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <Breadcrumb items={[{ label: "Shadow cohort 적중률" }]} />

      <header className="mt-4 space-y-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Shadow cohort 적중률
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          v1.8 (production) vs {SHADOW_SCORING_RULE} 가중치 일별 Brier + 적중률 delta. 동일
          경기 동일 input 으로 quant 재계산 (debate LLM 호출 X, 비용 0). n={V2_PROMOTION_COHORT_N} 도달 후
          production 적용 결정.
        </p>
        <div
          role="status"
          className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200"
        >
          <strong>내부 evidence cohort 입니다.</strong> 실제 예측은{" "}
          <Link href="/predictions" className="underline">예측 기록</Link> 에서 확인하세요.
        </div>
      </header>

      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 dark:text-gray-400">누적 표본 (n)</div>
          <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{totalN}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 dark:text-gray-400">v1.8 평균 Brier</div>
          <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {fmtBrier(avgV18)}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 dark:text-gray-400">{SHADOW_SCORING_RULE} 평균 Brier</div>
          <div className={`mt-1 text-2xl font-bold ${deltaClass(totalDelta)}`}>
            {fmtBrier(avgShadow)}
          </div>
          <div className={`mt-1 text-xs ${deltaClass(totalDelta)}`}>
            delta {totalDelta >= 0 ? "+" : ""}{totalDelta.toFixed(4)}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
          SHADOW_WEIGHTS (v2.1-B + shadow factor 활성)
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          {Object.entries(SHADOW_WEIGHTS).map(([key, weight]) => (
            <div key={key} className="rounded border border-gray-100 px-3 py-2 dark:border-gray-800">
              <div className="font-mono text-xs text-gray-500 dark:text-gray-400">{key}</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {((weight as number) * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          shadow factor: park_weather 3% · umpire_sz 2% — production weight 0 양립.
        </p>
      </section>

      <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Calibration plot (10-bucket)
        </h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          예측 확률 vs 실제 적중률. 대각선 위 = 잘 맞은 bucket, 대각선 아래 = 과신
          (over-confident). v1.8 (production) vs {SHADOW_SCORING_RULE} (shadow) 두 모델
          calibration 차이 시각화.
        </p>
        <CalibrationPlot
          totalN={pairs.length}
          series={[
            {
              label: "v1.8 (production)",
              color: CALIBRATION_COLORS.v18,
              buckets: calibration.v18,
            },
            {
              label: `${SHADOW_SCORING_RULE} (shadow)`,
              color: CALIBRATION_COLORS.shadow,
              buckets: calibration.shadow,
            },
          ]}
        />
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          일별 cohort (최대 {DAY_LIMIT}일)
        </h2>
        {daily.length === 0 ? (
          <div className="rounded border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            shadow cohort pair 가 아직 박제되지 않았습니다. (daily 파이프라인 fire 후 누적)
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <tr>
                  <th className="p-2">날짜</th>
                  <th className="p-2 text-right">n</th>
                  <th className="p-2 text-right">v1.8 Brier</th>
                  <th className="p-2 text-right">{SHADOW_SCORING_RULE} Brier</th>
                  <th className="p-2 text-right">delta</th>
                  <th className="p-2 text-right">v1.8 적중</th>
                  <th className="p-2 text-right">{SHADOW_SCORING_RULE} 적중</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d) => {
                  const v18Avg = d.v18BrierSum / d.n;
                  const shadowAvg = d.shadowBrierSum / d.n;
                  const dayDelta = shadowAvg - v18Avg;
                  return (
                    <tr key={d.date} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-2 font-mono text-xs">{d.date}</td>
                      <td className="p-2 text-right">{d.n}</td>
                      <td className="p-2 text-right">{fmtBrier(v18Avg)}</td>
                      <td className="p-2 text-right">{fmtBrier(shadowAvg)}</td>
                      <td className={`p-2 text-right ${deltaClass(dayDelta)}`}>
                        {dayDelta >= 0 ? "+" : ""}{dayDelta.toFixed(4)}
                      </td>
                      <td className="p-2 text-right">
                        {d.v18Correct}/{d.n} ({fmtPct(d.v18Correct / d.n)})
                      </td>
                      <td className="p-2 text-right">
                        {d.shadowCorrect}/{d.n} ({fmtPct(d.shadowCorrect / d.n)})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-8 text-xs text-gray-500 dark:text-gray-400">
        본 페이지는 shadow cohort 누적 진단용입니다. v1.8 production 가중치 변경 X.
      </p>
    </main>
  );
}
