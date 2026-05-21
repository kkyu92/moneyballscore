import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listArchiveDates, readArchive } from "@/lib/lotto/archive";

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
  const content = readArchive(date);
  const title = content
    ? `${date} 50조합 archive`
    : "Archive 조회 불가";
  return {
    title,
    description: "본인 사용 50조합 기록 (noindex, 검색 색인 차단).",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  };
}

export default async function LottoArchiveDatePage({ params }: Props) {
  const { date } = await params;
  const content = readArchive(date);
  if (!content) notFound();

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="text-xs text-brand-400">
        <Link href="/lotto/methodology" className="hover:text-brand-200">
          ← Lotto 통계 방법론
        </Link>
      </div>

      <header className="space-y-2 border-b border-brand-800 pb-4">
        <p className="text-xs uppercase tracking-widest text-brand-400">
          본인 사용 기록 · noindex
        </p>
        <h1 className="text-2xl font-semibold text-brand-100">
          {content.title}
        </h1>
        <p className="text-sm text-brand-300">
          본 페이지는 검색 색인 차단 + AdSense 크롤러 차단됩니다. 통계/분석
          학습 자료이며 행동/베팅/구매 권유를 포함하지 않습니다.
        </p>
      </header>

      <section
        aria-label="50조합 raw content"
        className="bg-brand-900/40 border border-brand-800 rounded-md p-4 overflow-x-auto"
      >
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-brand-200">
          {content.raw}
        </pre>
      </section>

      <footer className="border-t border-brand-800 pt-4 text-xs text-brand-400">
        <Link href="/lotto/methodology" className="hover:text-brand-200">
          ← 방법론으로 돌아가기
        </Link>
      </footer>
    </main>
  );
}
