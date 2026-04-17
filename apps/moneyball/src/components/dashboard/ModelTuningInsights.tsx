import type { FactorAccuracyReport } from "@/lib/dashboard/factor-accuracy";

interface Props {
  report: FactorAccuracyReport;
}

const FACTOR_LABELS: Record<string, string> = {
  sp_fip: "선발 FIP",
  sp_xfip: "선발 xFIP",
  lineup_woba: "타선 wOBA",
  bullpen_fip: "불펜 FIP",
  recent_form: "최근 10경기 폼",
  war: "WAR 누적",
  head_to_head: "상대전적",
  park_factor: "구장 보정",
  elo: "Elo 레이팅",
  sfr: "수비 SFR",
};

function fmtPct(v: number | null): string {
  if (v == null) return "-";
  return `${Math.round(v * 100)}%`;
}

function fmtSigned(v: number, digits = 2): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}`;
}

function fmtWeightPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/**
 * v4-4 Phase 1-3 후속 (퀄리티 B):
 * 각 팩터의 실제 예측 기여도를 검증하고 v2.0 가중치 제안을 표시.
 *
 * - samples < minSamples: 현재 수치만 + "수집 중" 안내
 * - samples >= minSamples: correlation 기반 재분배된 proposed weight 포함
 */
export function ModelTuningInsights({ report }: Props) {
  const ready = report.totalSamples >= report.minSamples;
  const rows = [...report.stats].sort(
    (a, b) => b.currentWeight - a.currentWeight,
  );

  return (
    <div className="space-y-4">
      {!ready && (
        <p
          role="status"
          className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded px-3 py-2"
        >
          샘플 {report.totalSamples}경기 · v2.0 가중치 제안은 {report.minSamples}
          경기 이상에서 활성화됩니다. 현재는 팩터별 방향성·편향 진단만 표시.
        </p>
      )}

      {ready && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          샘플 {report.totalSamples}경기 · 현재 가중치 대비 제안 가중치 총 변화량{" "}
          <span className="font-mono">
            {fmtSigned(report.proposedWeightsDelta * 100, 1)}%p
          </span>
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-[var(--color-border)] text-left text-xs text-gray-500 dark:text-gray-400">
              <th className="py-2 pr-3 font-medium">팩터</th>
              <th className="py-2 pr-3 font-medium text-right">N</th>
              <th className="py-2 pr-3 font-medium text-right">방향 정확</th>
              <th className="py-2 pr-3 font-medium text-right">편향</th>
              <th className="py-2 pr-3 font-medium text-right">상관계수</th>
              <th className="py-2 pr-3 font-medium text-right">현재 가중치</th>
              <th className="py-2 font-medium text-right">제안 가중치</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const corrColor =
                s.correlation >= 0.2
                  ? "text-green-600 dark:text-green-400"
                  : s.correlation <= -0.1
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-500 dark:text-gray-400";
              const biasColor =
                Math.abs(s.meanBias) >= 0.1
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-300";

              const delta =
                s.proposedWeight != null
                  ? s.proposedWeight - s.currentWeight
                  : null;
              const deltaPp = delta != null ? Math.round(delta * 100) : null;

              return (
                <tr
                  key={s.factor}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <td className="py-2 pr-3">
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {FACTOR_LABELS[s.factor] ?? s.factor}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs text-gray-500 dark:text-gray-400">
                    {s.n}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs text-gray-700 dark:text-gray-200">
                    {fmtPct(s.directionalAccuracy)}
                  </td>
                  <td
                    className={`py-2 pr-3 text-right font-mono text-xs ${biasColor}`}
                    title="평균 signed error. positive = 홈팀 과대 예측."
                  >
                    {fmtSigned(s.meanBias, 2)}
                  </td>
                  <td
                    className={`py-2 pr-3 text-right font-mono text-xs ${corrColor}`}
                    title="Pearson correlation (factor value vs actual home win)"
                  >
                    {fmtSigned(s.correlation, 2)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs text-gray-600 dark:text-gray-300">
                    {fmtWeightPct(s.currentWeight)}
                  </td>
                  <td className="py-2 text-right font-mono text-xs">
                    {s.proposedWeight == null ? (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    ) : (
                      <span>
                        {fmtWeightPct(s.proposedWeight)}
                        {deltaPp !== null && deltaPp !== 0 && (
                          <span
                            className={`ml-1 text-[10px] ${
                              deltaPp > 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            ({fmtSigned(deltaPp, 0)}%p)
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <details className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded px-3 py-2">
        <summary className="cursor-pointer">지표 해석</summary>
        <ul className="mt-2 space-y-1 pl-4 list-disc">
          <li>
            <strong>방향 정확</strong>: 중립(0.45-0.55) 제외 후 팩터가 가리킨
            팀이 실제로 이긴 비율.
          </li>
          <li>
            <strong>편향</strong>: 팩터값에서 실제 홈 승률을 뺀 signed error 평균.
            양수는 홈팀 과대 예측, 음수는 과소.
          </li>
          <li>
            <strong>상관계수</strong>: Pearson correlation. 0.2 이상이면 예측력
            있음, 0 근처는 무의미, 음수는 반대 방향.
          </li>
          <li>
            <strong>제안 가중치</strong>: 현재 가중치 × max(상관계수, 0)로 유용성
            점수 계산 후 기존 총 가중치 합 내에서 재분배. 모델 v2.0 튜닝 후보.
          </li>
        </ul>
      </details>
    </div>
  );
}
