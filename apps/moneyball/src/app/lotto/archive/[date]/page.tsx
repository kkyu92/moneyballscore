import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listArchiveDates, readArchiveVariants } from "@/lib/lotto/archive";
import { parseLottoPicksMd, ballColor, type LottoSet } from "@/lib/lotto/picks-loader";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

interface Props {
  params: Promise<{ date: string }>;
}

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams() {
  return listArchiveDates().map((date) => ({ date }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const variants = readArchiveVariants(date);
  const title = variants ? `${date} 50조합 archive` : "Archive 조회 불가";
  return {
    title,
    description: "통계 분석 기반 50조합 기록 (회피 조건 통과 조합). 행동/베팅/구매 권유 X.",
    alternates: { canonical: `https://moneyballscore.vercel.app/lotto/archive/${date}` },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  };
}

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

function SetCard({ set, rank }: { set: LottoSet; rank?: string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap py-2">
      {rank && (
        <span
          className="inline-block text-xs font-bold px-2 py-0.5 rounded min-w-[2rem] text-center"
          style={{ background: "#c5a23e", color: "#132d1a" }}
        >
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

export default async function LottoArchiveDatePage({ params }: Props) {
  const { date } = await params;
  const variants = readArchiveVariants(date);
  if (!variants) notFound();

  const primaryContent = variants.contents[variants.primary]!;
  const parsed = parseLottoPicksMd(primaryContent.raw);
  const top5 = parsed.sets.slice(0, 5);
  const rest = parsed.sets.slice(5);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <Breadcrumb
        items={[
          { href: "/lotto", label: "로또 통계 분석" },
          { href: "/lotto/archive", label: "아카이브" },
          { label: date },
        ]}
      />

      {/* Hero */}
      <section
        className="rounded-2xl p-6 md:p-8 space-y-3"
        style={{ background: "linear-gradient(135deg, #1a3d24 0%, #132d1a 100%)" }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {parsed.drawNo && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{ background: "#c5a23e", color: "#132d1a" }}
            >
              제 {parsed.drawNo}회
            </span>
          )}
          <h1 className="text-xl font-bold text-white">{date} 50조합 기록</h1>
        </div>
        <p className="text-sm text-white/70">
          256개 통계 규칙 통과 조합 선별 아카이브. OOS 검증 자료.
        </p>
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium"
          style={{ background: "#c5a23e22", borderLeft: "3px solid #c5a23e", color: "#e2c96b" }}
        >
          통계 기반 조합 선정. 당첨 확률 향상 없음. 재미 + 통계 학습 용도.
        </div>
      </section>

      {/* 추천 5세트 */}
      {top5.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">추천 5세트</h2>
          <div className="grid gap-3">
            {top5.map((set, i) => (
              <div
                key={set.idx}
                className="rounded-xl p-4 border-2 relative bg-white dark:bg-gray-900"
                style={{ borderColor: "#c5a23e" }}
              >
                <span
                  className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded"
                  style={{ background: "#c5a23e", color: "#132d1a" }}
                >
                  추천 {LABEL[i]}
                </span>
                <SetCard set={set} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 전체 45세트 collapse */}
      {rest.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">전체 조합</h2>
          <details className="rounded-xl border border-gray-200 dark:border-gray-700">
            <summary className="cursor-pointer px-4 py-3 font-medium text-sm select-none hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl">
              나머지 {rest.length}개 조합 보기 (클릭해서 열기)
            </summary>
            <div className="px-4 pb-4 divide-y divide-gray-100 dark:divide-gray-800">
              {rest.map((set) => (
                <SetCard key={set.idx} set={set} rank={`#${set.idx}`} />
              ))}
            </div>
          </details>
        </section>
      )}

      {/* 관련 링크 */}
      <footer className="flex flex-wrap gap-3 border-t border-gray-200 dark:border-gray-800 pt-6">
        <Link
          href="/lotto"
          className="text-sm hover:underline text-brand-600 dark:text-brand-300"
        >
          ← 이번 주 조합
        </Link>
        <Link
          href="/lotto/archive"
          className="text-sm hover:underline text-brand-600 dark:text-brand-300"
        >
          아카이브 목록
        </Link>
        <Link
          href="/lotto/methodology"
          className="text-sm hover:underline text-brand-600 dark:text-brand-300"
        >
          통계 방법론
        </Link>
      </footer>
    </main>
  );
}
