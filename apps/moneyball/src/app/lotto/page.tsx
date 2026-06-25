import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { EmptyState } from "@/components/shared/EmptyState";
import { getLatestLottoPicks, ballColor, type LottoSet } from "@/lib/lotto/picks-loader";
import { LOTTO_ISR_SECONDS, SITE_URL } from "@moneyball/shared";

export const dynamic = "force-static";
export const revalidate = 3600;

const PAGE_URL = `${SITE_URL}/lotto`;

export const metadata: Metadata = {
  title: "로또 통계 분석",
  description:
    "256개 회피 규칙 기반 매주 50조합 통계 선별. 통계 학습 목적 — 당첨 확률 향상 없음.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "로또 통계 분석 | MoneyBall Score",
    description: "256개 회피 규칙 기반 매주 50조합 통계 선별.",
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "로또 통계 분석 | MoneyBall Score",
    description: "256개 회피 규칙 기반 50조합 통계 선별.",
  },
  robots: { index: true, follow: true },
};

const LABEL = ["A", "B", "C", "D", "E"] as const;
const BALL_BG: Record<string, string> = {
  yellow: "bg-yellow-400 text-yellow-900",
  blue: "bg-blue-500 text-white",
  red: "bg-red-500 text-white",
  gray: "bg-gray-500 text-white",
  green: "bg-green-600 text-white",
};

function Ball({ n }: { n: number }) {
  const color = ballColor(n);
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold tabular-nums font-mono ${BALL_BG[color]}`}
    >
      {n}
    </span>
  );
}

function SetRow({ set, rank }: { set: LottoSet; rank?: string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {rank && (
        <span className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 min-w-[2rem] text-center">
          {rank}
        </span>
      )}
      <div className="flex gap-1">
        {set.numbers.map((n) => (
          <Ball key={n} n={n} />
        ))}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
        합 {set.sum} · {set.oddEven} · 연속 {set.consecutive}쌍
      </span>
    </div>
  );
}

function StatTable({ sets }: { sets: LottoSet[] }) {
  const sumBuckets: Record<string, number> = {};
  const oddEvenCounts: Record<string, number> = {};
  const consecCounts: Record<string, number> = {};

  for (const s of sets) {
    const sumKey = `${Math.floor(s.sum / 20) * 20}~${Math.floor(s.sum / 20) * 20 + 19}`;
    sumBuckets[sumKey] = (sumBuckets[sumKey] ?? 0) + 1;
    oddEvenCounts[s.oddEven] = (oddEvenCounts[s.oddEven] ?? 0) + 1;
    const ck = `${s.consecutive}쌍`;
    consecCounts[ck] = (consecCounts[ck] ?? 0) + 1;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
      <div>
        <p className="font-semibold mb-1 text-gray-700 dark:text-gray-300">합 분포</p>
        <table className="w-full text-xs">
          <tbody>
            {Object.entries(sumBuckets)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-0.5 text-gray-600 dark:text-gray-400">{k}</td>
                  <td className="py-0.5 text-right tabular-nums">{v}세트</td>
                  <td className="py-0.5 text-right text-gray-400 tabular-nums">
                    {((v / sets.length) * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div>
        <p className="font-semibold mb-1 text-gray-700 dark:text-gray-300">홀짝 분포</p>
        <table className="w-full text-xs">
          <tbody>
            {Object.entries(oddEvenCounts)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-0.5 text-gray-600 dark:text-gray-400">{k}</td>
                  <td className="py-0.5 text-right tabular-nums">{v}세트</td>
                  <td className="py-0.5 text-right text-gray-400 tabular-nums">
                    {((v / sets.length) * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div>
        <p className="font-semibold mb-1 text-gray-700 dark:text-gray-300">연속쌍 분포</p>
        <table className="w-full text-xs">
          <tbody>
            {Object.entries(consecCounts)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-0.5 text-gray-600 dark:text-gray-400">{k}</td>
                  <td className="py-0.5 text-right tabular-nums">{v}세트</td>
                  <td className="py-0.5 text-right text-gray-400 tabular-nums">
                    {((v / sets.length) * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LottoHubPage() {
  const picks = getLatestLottoPicks();

  if (!picks || picks.sets.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <Breadcrumb items={[{ label: "로또 통계 분석" }]} className="mb-4" />
        <EmptyState
          title="이번 주 데이터 준비 중"
          description="매주 금요일 자동 갱신됩니다."
          cta={{ href: "/lotto/archive", label: "이전 회차 보기" }}
        />
      </main>
    );
  }

  const drawDate = picks.date;
  const drawNo = picks.drawNo;
  const top5 = picks.sets.slice(0, 5);
  const rest = picks.sets.slice(5);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <Breadcrumb items={[{ label: "로또 통계 분석" }]} className="mb-2" />

      {/* Hero */}
      <section
        className="rounded-2xl p-6 md:p-8 space-y-3"
        style={{ background: "linear-gradient(135deg, var(--color-brand-700) 0%, var(--color-brand-800) 100%)" }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{ background: "var(--color-accent)", color: "var(--color-brand-800)" }}
          >
            {drawNo ? `제 ${drawNo}회` : "최신"}
          </span>
          <h1 className="text-xl font-bold text-white">
            {drawDate} 토요일 추첨 50조합
          </h1>
        </div>
        <p className="text-sm text-white/70">
          역대 추첨 데이터 기반 256개 통계 규칙을 통과한 조합 선별.{" "}
          <Link href="/lotto/methodology" className="underline hover:text-white/90">
            방법론 보기 →
          </Link>
        </p>
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium"
          style={{ background: "color-mix(in srgb, var(--color-accent) 13%, transparent)", borderLeft: "3px solid var(--color-accent)", color: "var(--color-accent-light)" }}
        >
          통계 기반 조합 선정. 당첨 확률 향상 없음. 재미 + 통계 학습 용도.
        </div>
      </section>

      {/* 추천 5세트 */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">추천 5세트</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          기피점수 상위 — 역대 미출현 + 회피 조건 최고점 통과 조합
        </p>
        <div className="grid gap-3">
          {top5.map((set, i) => (
            <div
              key={set.idx}
              className="rounded-xl p-4 border-2 relative"
              style={{ borderColor: "var(--color-accent)", background: "var(--color-surface-card, #fff)" }}
            >
              <span
                className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded"
                style={{ background: "var(--color-accent)", color: "var(--color-brand-800)" }}
              >
                추천 {LABEL[i]}
              </span>
              <SetRow set={set} />
            </div>
          ))}
        </div>
      </section>

      {/* 방법론 요약 — 크롤러 가시 산문 섹션 */}
      <section className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">조합 선별 방식</h2>
        <p>
          1회부터 현재까지 누적된 로또 6/45 역대 추첨 결과를 분석해 256개 통계 필터를 도출합니다.
          각 규칙은 역대 추첨에서 유독 자주 또는 드물게 확인되는 패턴 — 번호 합계 구간,
          홀짝 구성 비율, 연속 번호 쌍 수, 번호 간격 등 — 을 정량화한 조건입니다.
        </p>
        <p>
          선별 과정은 세 단계입니다. 먼저 약 800만 가지 조합 전체에서 256개 필터를 모두 통과하는
          후보를 추립니다. 이 중 역대 실제 추첨 결과와 완전히 일치하는 조합은 제외합니다.
          남은 후보에서 필터 통과 점수가 높은 순서로 50세트를 확정합니다.
        </p>
        <p>
          <strong>합계</strong>는 6개 번호의 합으로 역대 추첨 분포의 중심(100~150 구간)에
          집중됩니다. <strong>홀짝 비율</strong>은 극단 구성(전부 홀수·전부 짝수)이 역대
          출현 빈도가 낮습니다. <strong>연속쌍</strong>은 인접한 두 번호가 붙어 나오는 횟수로,
          2쌍 이하 조합이 역대 추첨에서 더 자주 확인됩니다.
          이 세 지표가 위 분포 통계표에 요약되어 있습니다.
        </p>
      </section>

      {/* 통계 */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">50세트 분포 통계</h2>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <StatTable sets={picks.sets} />
        </div>
      </section>

      {/* 전체 50조합 collapse */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">전체 50조합</h2>
        <details className="rounded-xl border border-gray-200 dark:border-gray-700">
          <summary className="cursor-pointer px-4 py-3 font-medium text-sm select-none hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl">
            전체 50조합 보기 (클릭해서 열기)
          </summary>
          <div className="px-4 pb-4 pt-2 space-y-2">
            {rest.map((set) => (
              <div key={set.idx} className="py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <SetRow set={set} rank={`#${set.idx}`} />
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* 관련 링크 */}
      <section className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/lotto/archive"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          이전 회차 아카이브 →
        </Link>
        <Link
          href="/lotto/methodology"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          통계 방법론 →
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          KBO 예측 보기 →
        </Link>
      </section>
    </main>
  );
}
