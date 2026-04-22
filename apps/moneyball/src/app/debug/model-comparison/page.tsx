/**
 * /debug/model-comparison — 모델 버전별 성능 비교 대시보드.
 *
 * 목적: v1.5 → v1.6 전환 효과를 데이터로 측정. scoring_rule + model_version
 * 조합별 N / 적중률 / Brier / Calibration 제시. 4-6주 축적 후 정량 판단.
 *
 * middleware.ts BASIC auth 로 /debug/* 보호됨.
 */

import { createClient } from '@supabase/supabase-js';
import {
  aggregateByModel,
  dailyByModel,
  type PredictionRow,
} from '@/lib/dashboard/compareModels';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase credentials required');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function pct(x: number): string {
  return (x * 100).toFixed(2) + '%';
}

function fmt(n: number | null, digits = 5): string {
  return n === null ? '—' : n.toFixed(digits);
}

async function loadRows(daysBack: number): Promise<PredictionRow[]> {
  const db = getAdminClient();
  const since = new Date(
    Date.now() - daysBack * 24 * 3600 * 1000,
  ).toISOString();
  const pageSize = 1000;
  const out: PredictionRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from('predictions')
      .select(
        `id, model_version, scoring_rule, is_correct, verified_at, created_at, reasoning,
         game:games!inner(home_team_id, winner_team_id)`,
      )
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const r of data) {
      // Supabase JS 는 inner join 을 배열 or 객체로 반환 — 단일 row 보장됨
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const game = Array.isArray((r as any).game) ? (r as any).game[0] : (r as any).game;
      out.push({
        id: r.id as number,
        model_version: r.model_version as string,
        scoring_rule: (r.scoring_rule as string | null) ?? null,
        is_correct: r.is_correct as boolean | null,
        verified_at: r.verified_at as string | null,
        created_at: r.created_at as string,
        reasoning: r.reasoning as unknown,
        game: game ?? null,
      });
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

export default async function ModelComparisonPage() {
  const daysBack = 90;
  const rows = await loadRows(daysBack);
  const groups = aggregateByModel(rows);
  const daily = dailyByModel(rows);

  // 날짜 × scoringRule pivot — 최근 14일만 화면 표시
  const recentDaily = daily
    .filter((d) => {
      const cutoff = new Date(
        Date.now() - 14 * 24 * 3600 * 1000,
      )
        .toISOString()
        .slice(0, 10);
      return d.date >= cutoff;
    })
    .sort((a, b) => (a.date !== b.date ? b.date.localeCompare(a.date) : 0));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">모델 비교 대시보드</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          최근 {daysBack}일 · {rows.length}건 · scoring_rule + model_version 조합별
          성능 측정. v1.6 ship 이후 데이터 축적은 저녁 predict cron 부터 시작.
        </p>
      </header>

      <section className="overflow-x-auto">
        <h2 className="text-lg font-semibold mb-2">조합별 집계</h2>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="border p-2 text-left">scoring_rule</th>
              <th className="border p-2 text-left">model_version</th>
              <th className="border p-2 text-right">N (전체)</th>
              <th className="border p-2 text-right">verified</th>
              <th className="border p-2 text-right">Accuracy</th>
              <th className="border p-2 text-right">Brier</th>
              <th className="border p-2 text-right">LogLoss</th>
              <th className="border p-2 text-left">기간</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="border p-4 text-center text-gray-500"
                >
                  데이터 없음
                </td>
              </tr>
            )}
            {groups.map((g) => (
              <tr key={g.key}>
                <td className="border p-2 font-mono">{g.scoringRule}</td>
                <td className="border p-2 font-mono">{g.modelVersion}</td>
                <td className="border p-2 text-right tabular-nums">{g.n}</td>
                <td className="border p-2 text-right tabular-nums">
                  {g.verifiedN}
                </td>
                <td className="border p-2 text-right tabular-nums">
                  {g.verifiedN > 0 ? pct(g.accuracy) : '—'}
                </td>
                <td className="border p-2 text-right tabular-nums">
                  {fmt(g.brier)}
                  {g.brierN > 0 && (
                    <span className="text-gray-400 text-xs ml-1">
                      (n={g.brierN})
                    </span>
                  )}
                </td>
                <td className="border p-2 text-right tabular-nums">
                  {fmt(g.logLoss)}
                </td>
                <td className="border p-2 text-xs text-gray-500">
                  {g.firstSeen?.slice(0, 10)} ~ {g.lastSeen?.slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {groups.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Calibration (bucket)</h2>
          <p className="text-xs text-gray-500 mb-3">
            각 확률 구간에서 평균 예측 확률 (avgP) vs 실제 홈팀 승률
            (actualRate). 잘 calibrated 된 모델은 두 값이 같다.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {groups
              .filter((g) => g.brierN >= 5)
              .map((g) => (
                <div
                  key={g.key}
                  className="border rounded-lg p-3 bg-white dark:bg-gray-900"
                >
                  <div className="font-semibold text-sm mb-2 font-mono">
                    {g.scoringRule} + {g.modelVersion}{' '}
                    <span className="text-xs text-gray-500">
                      (n={g.brierN})
                    </span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="text-left">range</th>
                        <th className="text-right">n</th>
                        <th className="text-right">avgP</th>
                        <th className="text-right">actual</th>
                        <th className="text-right">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.calibration.map((b, i) =>
                        b.n === 0 ? null : (
                          <tr key={i}>
                            <td className="tabular-nums">
                              [{b.lo.toFixed(1)}, {b.hi.toFixed(1)})
                            </td>
                            <td className="text-right tabular-nums">{b.n}</td>
                            <td className="text-right tabular-nums">
                              {b.avgPredicted.toFixed(3)}
                            </td>
                            <td className="text-right tabular-nums">
                              {b.actualRate.toFixed(3)}
                            </td>
                            <td
                              className={`text-right tabular-nums ${
                                Math.abs(b.avgPredicted - b.actualRate) > 0.1
                                  ? 'text-red-600'
                                  : ''
                              }`}
                            >
                              {(b.avgPredicted - b.actualRate).toFixed(3)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            {groups.filter((g) => g.brierN >= 5).length === 0 && (
              <p className="text-sm text-gray-500">
                Calibration bucket 표시는 Brier 샘플 ≥ 5 인 조합부터.
              </p>
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-2">최근 14일 일별 추세</h2>
        <p className="text-xs text-gray-500 mb-3">
          v1.6 ship 마커: 2026-04-22. 이 날짜 이후 scoring_rule=v1.6 row 가
          누적되기 시작.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="border p-1 text-left">date</th>
                <th className="border p-1 text-left">scoring_rule</th>
                <th className="border p-1 text-left">model_version</th>
                <th className="border p-1 text-right">N</th>
                <th className="border p-1 text-right">verified</th>
                <th className="border p-1 text-right">correct</th>
                <th className="border p-1 text-right">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {recentDaily.length === 0 && (
                <tr>
                  <td colSpan={7} className="border p-2 text-center text-gray-500">
                    최근 14일 데이터 없음
                  </td>
                </tr>
              )}
              {recentDaily.map((d) => (
                <tr
                  key={`${d.date}__${d.scoringRule}__${d.modelVersion}`}
                  className={
                    d.date === '2026-04-22'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20'
                      : ''
                  }
                >
                  <td className="border p-1 font-mono">{d.date}</td>
                  <td className="border p-1 font-mono">{d.scoringRule}</td>
                  <td className="border p-1 font-mono">{d.modelVersion}</td>
                  <td className="border p-1 text-right tabular-nums">{d.n}</td>
                  <td className="border p-1 text-right tabular-nums">
                    {d.verified}
                  </td>
                  <td className="border p-1 text-right tabular-nums">
                    {d.correct}
                  </td>
                  <td className="border p-1 text-right tabular-nums">
                    {d.verified > 0 ? pct(d.accuracy) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="text-xs text-gray-500 border-t pt-4">
        Brier score 낮을수록 좋음. coin_flip baseline = 0.25000. Acc 50% 는
        홈팀 승률 선 (v1.x 리그 평균 51.87%). 4-6주 축적 (N≥200) 후 통계적
        유의성 판단 가능.
      </footer>
    </div>
  );
}
