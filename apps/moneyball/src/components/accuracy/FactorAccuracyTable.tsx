import { SMALL_SAMPLE_N } from '@moneyball/shared';
import type { FactorAccuracyRow } from '@/lib/accuracy/buildFactorAccuracy';

function AccuracyBar({ accuracy, baseline }: { accuracy: number; baseline: number }) {
  const pct = Math.round(accuracy * 100);
  const basePct = Math.round(baseline * 100);
  const good = accuracy >= baseline;
  const fillCls = good
    ? 'bg-brand-500 dark:bg-brand-400'
    : 'bg-amber-500 dark:bg-amber-400';

  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="relative flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full ${fillCls}`}
          style={{ width: `${Math.min(100, (accuracy / 1) * 100)}%` }}
        />
        {/* baseline marker */}
        <div
          className="absolute top-0 h-full w-px bg-gray-400 dark:bg-gray-500 opacity-60"
          style={{ left: `${basePct}%` }}
        />
      </div>
      <span
        className={`text-xs font-mono font-semibold tabular-nums w-9 text-right ${
          good ? 'text-brand-600 dark:text-brand-400' : 'text-amber-700 dark:text-amber-300'
        }`}
      >
        {pct}%
      </span>
    </div>
  );
}

// sport='mlb' 는 home/away 원본 스탯 값 직접 비교 방식(buildMlbFactorAccuracy)이라
// KBO 의 "0.45~0.55 중립대 skip" 문구가 안 맞음 — sport 별 안내 문구만 분기, 표
// 레이아웃/로직은 공유(KBO 호출부는 파라미터 생략 시 기존 문구 그대로 유지).
const COPY = {
  kbo: {
    ko: {
      note: (baselinePct: number, overallN: number) => (
        <>
          팩터 값이 0.45~0.55 중립 범위 밖인 경기만 집계.
          기준선({baselinePct}%) 초과 팩터 =
          <span className="text-brand-600 dark:text-brand-400"> 모델 기여</span> /
          미달 =
          <span className="text-amber-600 dark:text-amber-400"> 잡음 가능성</span>.
          전체 n={overallN}건 중 팩터별 비중립 게임 수 표시.
        </>
      ),
      hash: '#',
      factor: '팩터',
      n: 'n (홈/원정)',
      accuracy: '적중률',
      footer: (baselinePct: number, overallN: number) =>
        `∣ 기준선 = 전체 적중률 ${baselinePct}% (v1.8 cohort n=${overallN}) ∣ 홈/원정 = 해당 팩터가 홈/원정팀 유리로 분류된 게임 수`,
      smallSampleNote: (minN: number) => `∣ 흐리게 표시된 행 = 소표본 (n<${minN})`,
    },
  },
  mlb: {
    ko: {
      note: (baselinePct: number, overallN: number) => (
        <>
          홈/원정 팀 스탯 값이 다른 경기만 집계.
          기준선({baselinePct}%) 초과 팩터 =
          <span className="text-brand-600 dark:text-brand-400"> 모델 기여</span> /
          미달 =
          <span className="text-amber-600 dark:text-amber-400"> 잡음 가능성</span>.
          전체 n={overallN}건 중 팩터별 유효비교 게임 수 표시.
        </>
      ),
      hash: '#',
      factor: '팩터',
      n: 'n (홈/원정)',
      accuracy: '적중률',
      footer: (baselinePct: number, overallN: number) =>
        `∣ 기준선 = 전체 적중률 ${baselinePct}% (n=${overallN}) ∣ 홈/원정 = 해당 팩터가 홈/원정팀 유리로 분류된 경기 수`,
      smallSampleNote: (minN: number) => `∣ 흐리게 표시된 행 = 소표본 (n<${minN})`,
    },
    en: {
      note: (baselinePct: number, overallN: number) => (
        <>
          Only games where home/away stat values differ are counted.
          Factors above baseline ({baselinePct}%) =
          <span className="text-brand-600 dark:text-brand-400"> model signal</span> /
          below =
          <span className="text-amber-600 dark:text-amber-400"> possible noise</span>.
          Out of n={overallN} verified games, valid-comparison count shown per factor.
        </>
      ),
      hash: '#',
      factor: 'Factor',
      n: 'n (home/away)',
      accuracy: 'Accuracy',
      footer: (baselinePct: number, overallN: number) =>
        `∣ Baseline = overall accuracy ${baselinePct}% (n=${overallN}) ∣ home/away = games where this factor favored the home/away team`,
      smallSampleNote: (minN: number) => `∣ Dimmed rows = small sample (n<${minN})`,
    },
  },
} as const;

export function FactorAccuracyTable({
  rows,
  overallN,
  overallAcc,
  sport = 'kbo',
  locale = 'ko',
}: {
  rows: FactorAccuracyRow[];
  overallN: number;
  overallAcc: number;
  sport?: 'kbo' | 'mlb';
  locale?: 'ko' | 'en';
}) {
  if (rows.length === 0) return null;
  const baselinePct = Math.round(overallAcc * 100);
  const copy = sport === 'mlb' ? (COPY.mlb[locale] ?? COPY.mlb.ko) : COPY.kbo.ko;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {copy.note(baselinePct, overallN)}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-[var(--color-border)]">
              <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500 dark:text-gray-400 w-4 tabular-nums">{copy.hash}</th>
              <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500 dark:text-gray-400">{copy.factor}</th>
              <th className="text-right py-2 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{copy.n}</th>
              <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400">{copy.accuracy}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const small = r.n < SMALL_SAMPLE_N;
              return (
                <tr
                  key={r.key}
                  className={`border-b border-gray-50 dark:border-[var(--color-border)] hover:bg-gray-50/50 dark:hover:bg-gray-800/30 ${small ? 'opacity-50' : ''}`}
                >
                  <td className="py-2.5 pr-3 text-xs text-gray-400 dark:text-gray-600 tabular-nums">{i + 1}</td>
                  <td className="py-2.5 pr-3">
                    <span className="font-medium">{r.label}</span>
                    <span className="ml-1.5 text-2xs text-gray-400 dark:text-gray-600 font-mono">
                      {r.key}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-xs tabular-nums text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {r.n} <span className="text-gray-300 dark:text-gray-600">({r.homeN}/{r.awayN})</span>
                  </td>
                  <td className="py-2.5">
                    <AccuracyBar accuracy={r.accuracy} baseline={overallAcc} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-2xs text-gray-400 dark:text-gray-600">
        {copy.footer(baselinePct, overallN)}
        {rows.some((r) => r.n < SMALL_SAMPLE_N) && ` ${copy.smallSampleNote(SMALL_SAMPLE_N)}`}
      </p>
    </div>
  );
}
