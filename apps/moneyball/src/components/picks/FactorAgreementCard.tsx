'use client';

/**
 * FactorAgreementCard — 사용자 픽 vs AI KBO_FACTOR_COUNT factor 일치도 시각화.
 *
 * 사용자 가시 가치:
 *   - "AI 와 의견 다를 때" 카드 (전체 정답률 비교) 보다 한 단계 깊은 reasoning surface.
 *   - 어느 factor (선발/타선/Elo/구장 등 KBO_FACTOR_COUNT 개) 가 내 의견 방향으로 leaned 했는지 가시.
 *   - 사용자가 "내가 잘 보는 factor / 못 보는 factor" 자가 인식.
 *
 * 표시 조건:
 *   - measuredCount >= MIN_TOTAL_MEASURED (작은 표본 noise 차단)
 *   - withMe / againstMe 양쪽 모두 비면 미렌더.
 */

import { KBO_FACTOR_COUNT } from '@moneyball/shared';
import type { FactorAgreement, FactorAgreementRow } from '@/lib/picks/buildPicksStats';
import { FACTOR_LABELS, FACTOR_TIPS } from '@/lib/predictions/factorLabels';

interface Props {
  agreement: FactorAgreement;
}

const MIN_FACTOR_SAMPLES = 3; // factor 별 최소 sample (withMyPick + againstMyPick)
const MIN_TOTAL_MEASURED = 5; // 본 카드 자체 렌더 최소 entry

export function FactorAgreementCard({ agreement }: Props) {
  if (agreement.measuredCount < MIN_TOTAL_MEASURED) return null;

  // 사용자 의견 지지율 (>50%) factor 와 반대 (<50%) factor 분리.
  // 동률 (50%) = 어느 쪽도 분류 X. 표본 too small 인 factor 는 양쪽 모두 제외.
  const withMe: FactorAgreementRow[] = [];
  const againstMe: FactorAgreementRow[] = [];
  for (const row of agreement.byFactor) {
    if (!(row.factor in FACTOR_LABELS)) continue; // unknown factor (legacy / shadow) skip
    const denom = row.withMyPick + row.againstMyPick;
    if (denom < MIN_FACTOR_SAMPLES) continue;
    if (row.agreementRate === null) continue;
    if (row.agreementRate > 0.5) withMe.push(row);
    else if (row.agreementRate < 0.5) againstMe.push(row);
  }

  // 양쪽 모두 비어있으면 본 카드 미렌더.
  if (withMe.length === 0 && againstMe.length === 0) return null;

  // 정렬: agreementRate 극단부터.
  withMe.sort((a, b) => (b.agreementRate ?? 0) - (a.agreementRate ?? 0));
  againstMe.sort((a, b) => (a.agreementRate ?? 1) - (b.agreementRate ?? 1));

  // top 3 each — UI 간결성.
  const withMeTop = withMe.slice(0, 3);
  const againstMeTop = againstMe.slice(0, 3);

  return (
    <section
      aria-labelledby="factor-agreement-heading"
      className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4"
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 id="factor-agreement-heading" className="text-sm font-semibold">
          내 의견과 AI 팩터 일치도
        </h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {agreement.measuredCount}경기 기준
        </span>
      </header>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {KBO_FACTOR_COUNT}개 팩터 중 내 픽 방향으로 기운 비율. {MIN_FACTOR_SAMPLES}경기 미만 팩터는 제외.
      </p>

      {withMeTop.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-brand-700 dark:text-brand-300 mb-2">
            내 의견 지지 팩터
          </h3>
          <ul className="space-y-1.5">
            {withMeTop.map((row) => (
              <FactorRow key={row.factor} row={row} tone="with" />
            ))}
          </ul>
        </div>
      )}

      {againstMeTop.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-error mb-2">AI 방향 (내 픽 반대) 팩터</h3>
          <ul className="space-y-1.5">
            {againstMeTop.map((row) => (
              <FactorRow key={row.factor} row={row} tone="against" />
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3">
        팩터 값이 픽 방향과 일치 = 본인 판단이 데이터와 부합하다는 신호. 50% 미만 = AI 가 그
        팩터에서 반대 신호를 더 많이 받는 중.
      </p>
    </section>
  );
}

function FactorRow({ row, tone }: { row: FactorAgreementRow; tone: 'with' | 'against' }) {
  const label = FACTOR_LABELS[row.factor] ?? row.factor;
  const tip = FACTOR_TIPS[row.factor];
  const denom = row.withMyPick + row.againstMyPick;
  const pct = row.agreementRate !== null ? Math.round(row.agreementRate * 100) : null;
  const barWidth = pct !== null ? `${Math.max(4, Math.min(100, pct))}%` : '0%';

  return (
    <li className="flex items-center gap-3">
      <span
        className="w-20 text-xs text-gray-700 dark:text-gray-200 shrink-0 truncate"
        title={tip ?? label}
      >
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-[var(--color-surface)] overflow-hidden relative">
        <div
          className={`absolute inset-y-0 left-0 ${
            tone === 'with' ? 'bg-brand-500 dark:bg-brand-400' : 'bg-error/70'
          }`}
          style={{ width: barWidth }}
        />
      </div>
      <span
        className={`tabular-nums text-xs font-semibold w-12 text-right ${
          tone === 'with' ? 'text-brand-700 dark:text-brand-300' : 'text-error'
        }`}
      >
        {pct !== null ? `${pct}%` : '—'}
      </span>
      <span className="text-[11px] text-gray-400 dark:text-gray-500 w-10 text-right shrink-0 tabular-nums">
        {row.withMyPick}/{denom}
      </span>
    </li>
  );
}
