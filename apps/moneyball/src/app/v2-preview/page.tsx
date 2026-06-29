import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { assertSelectOk, shortTeamName, NEUTRAL_FACTOR, V2_PROMOTION_COHORT_N, INSIGHTS_LIMIT, type TeamCode, SITE_URL } from "@moneyball/shared";
import {
  V2_1_B_WEIGHTS,
  applyV2_1_BWeights,
  computeDelta,
  type V2PreviewResult,
} from "@/lib/predictions/v2Predictor";

const PAGE_URL = `${SITE_URL}/v2-preview`;
const LIMIT = INSIGHTS_LIMIT;

// noindex 내부 미리보기 — N={V2_PROMOTION_COHORT_N} 도달 후 prod 적용 결정 전까지 surface signal 차단.
export const metadata: Metadata = {
  title: "v2 시뮬레이션 미리보기",
  description: `v2.1-B 가중치 시뮬레이션 — backtest 결과 (Brier 0.24830) 를 현 v1.8 예측 위에 재가중치 적용한 내부 미리보기. N=${V2_PROMOTION_COHORT_N} 도달 후 prod 적용 결정.`,
  alternates: { canonical: PAGE_URL },
  robots: { index: false, follow: false },
};

export const revalidate = 86400; // DASHBOARD_ISR_SECONDS (Next.js 16 Turbopack: literal required)

interface ReasoningShape {
  debate?: { verdict?: { homeWinProb?: number; reasoning?: string } };
  homeWinProb?: number;
}

interface GameField {
  id: number;
  game_date: string;
  status: string;
  home_team: { code: string } | { code: string }[] | null;
  away_team: { code: string } | { code: string }[] | null;
}

interface PreviewRow {
  gameId: number;
  date: string;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  status: string;
  v18Prob: number;
  v21b: V2PreviewResult;
}

function extractTeamCode(field: GameField["home_team"]): string | null {
  if (!field) return null;
  const obj = Array.isArray(field) ? field[0] : field;
  return obj?.code ?? null;
}

function pickHomeWinProb(reasoning: unknown): number | null {
  if (!reasoning || typeof reasoning !== "object") return null;
  const r = reasoning as ReasoningShape;
  const v = r.debate?.verdict?.homeWinProb ?? r.homeWinProb;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function getPreviewRows(): Promise<PreviewRow[]> {
  const supabase = await createClient();
  const result = await supabase
    .from("predictions")
    .select(
      "reasoning, factors, prediction_type, created_at, games!inner(id, game_date, status, home_team:teams!games_home_team_id_fkey(code), away_team:teams!games_away_team_id_fkey(code))",
    )
    .eq("prediction_type", "pre_game")
    .order("created_at", { ascending: false })
    .limit(LIMIT * 3);
  const { data } = assertSelectOk(result, "v2-preview.getPreviewRows");
  if (!data) return [];

  const out: PreviewRow[] = [];
  const seen = new Set<number>();
  for (const row of data) {
    const v18Prob = pickHomeWinProb(row.reasoning);
    if (v18Prob === null) continue;
    const rawFactors = row.factors as Record<string, number> | null;
    if (!rawFactors || typeof rawFactors !== "object") continue;
    const v21b = applyV2_1_BWeights(rawFactors);
    if (!v21b) continue;
    const gamesField = row.games as unknown as GameField | GameField[] | null;
    const game = Array.isArray(gamesField) ? gamesField[0] : gamesField;
    if (!game) continue;
    if (seen.has(game.id)) continue;
    seen.add(game.id);
    const homeCode = extractTeamCode(game.home_team);
    const awayCode = extractTeamCode(game.away_team);
    if (!homeCode || !awayCode) continue;
    out.push({
      gameId: game.id,
      date: game.game_date,
      homeTeam: homeCode as TeamCode,
      awayTeam: awayCode as TeamCode,
      status: game.status,
      v18Prob,
      v21b,
    });
    if (out.length >= LIMIT) break;
  }
  return out;
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function deltaClass(deltaPp: number): string {
  if (Math.abs(deltaPp) < 1) return "text-gray-500 dark:text-gray-400";
  if (deltaPp > 0) return "text-brand-600 dark:text-brand-400";
  return "text-red-600 dark:text-red-400";
}

function fmtDelta(deltaPp: number): string {
  const sign = deltaPp > 0 ? "+" : "";
  return `${sign}${deltaPp.toFixed(1)}pp`;
}

export default async function V2PreviewPage() {
  const rows = await getPreviewRows();

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <Breadcrumb items={[{ label: "v2 시뮬레이션 미리보기" }]} />

      <header className="mt-4 space-y-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          v2 시뮬레이션 미리보기
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          v2.1-B 가중치 (backtest Brier 0.24830) 를 현 v1.8 예측에 재가중치 적용한 내부
          미리보기. 실제 예측에 영향 X. N={V2_PROMOTION_COHORT_N} 도달 후 prod 적용 결정.
        </p>
        <div
          role="status"
          className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200"
        >
          <strong>내부 시뮬레이션입니다.</strong> 실제 예측은{" "}
          <Link href="/predictions" className="underline">
            예측 기록
          </Link>{" "}
          에서 확인하세요. 가중치는 N={V2_PROMOTION_COHORT_N} 도달 후 변경될 수 있습니다.
        </div>
      </header>

      <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
          v1.8 vs v2.1-B 가중치
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
          {Object.entries(V2_1_B_WEIGHTS).map(([key, weight]) => (
            <div
              key={key}
              className="rounded border border-gray-100 px-3 py-2 dark:border-gray-800"
            >
              <div className="font-mono text-xs text-gray-500 dark:text-gray-400">{key}</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {(weight * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          v1.8 대비 변경 — sp_fip 15→16% · lineup_woba 15→17% · bullpen_fip 10→11% ·
          recent_form 10→12% · war 8→9% · head_to_head 3→2% · elo 10→9% · sfr 5→0% (sfr
          제외, Wayback 부분 회귀).
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          최근 예측 재가중치 시뮬레이션 (최대 {LIMIT}건)
        </h2>
        {rows.length === 0 ? (
          <div className="rounded border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            누적된 pre_game 예측이 없습니다.
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => {
              const delta = computeDelta(row.v18Prob, row.v21b.homeWinProb);
              const homeName = shortTeamName(row.homeTeam);
              const awayName = shortTeamName(row.awayTeam);
              return (
                <li
                  key={row.gameId}
                  className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="flex flex-wrap items-baseline gap-2 text-sm">
                    <Link
                      href={`/predictions/${row.date}`}
                      className="font-mono text-xs text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {row.date}
                    </Link>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {awayName} vs {homeName}
                    </span>
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                      {row.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">v1.8 홈승률</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {fmtPct(row.v18Prob)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        v2.1-B 시뮬레이션
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {fmtPct(row.v21b.homeWinProb)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Δ</div>
                      <div className={`font-semibold ${deltaClass(delta.deltaPp)}`}>
                        {fmtDelta(delta.deltaPp)}
                      </div>
                    </div>
                  </div>
                  {row.v21b.missingFactorKeys.length > 0 ? (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      누락 factor {row.v21b.missingFactorKeys.length}개 →
                      중립 {NEUTRAL_FACTOR} 적용 ({row.v21b.missingFactorKeys.join(", ")})
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <nav aria-label="관련 자료" className="mt-10 border-t border-gray-200 pt-6 dark:border-gray-700">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          관련 자료
        </h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/methodology"
            className="rounded-full border border-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            예측 방법론
          </Link>
          <Link
            href="/accuracy"
            className="rounded-full border border-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            적중률 대시보드
          </Link>
          <Link
            href="/changelog"
            className="rounded-full border border-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            변경 로그
          </Link>
        </div>
      </nav>
    </main>
  );
}
