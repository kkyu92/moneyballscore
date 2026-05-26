import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listArchiveDates, readArchiveVariants, type ArchiveVariant } from "@/lib/lotto/archive";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

interface Props {
  params: Promise<{ date: string }>;
}

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 86400;

const VARIANT_LABEL: Record<ArchiveVariant, string> = {
  mix: "mix (3 strategy 합성)",
  default: "default (unique score desc)",
  moderate: "moderate (score 7~14 buffer)",
  balanced: "balanced (score -3~+7 historical 정합)",
};

export async function generateStaticParams() {
  return listArchiveDates().map((date) => ({ date }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const variants = readArchiveVariants(date);
  const title = variants
    ? `${date} 50조합 archive`
    : "Archive 조회 불가";
  return {
    title,
    description: "통계 분석 기반 50조합 기록 (회피 조건 통과 조합). 행동/베팅/구매 권유 X.",
    alternates: {
      canonical: `https://moneyballscore.vercel.app/lotto/archive/${date}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
  };
}

export default async function LottoArchiveDatePage({ params }: Props) {
  const { date } = await params;
  const variants = readArchiveVariants(date);
  if (!variants) notFound();

  const primaryContent = variants.contents[variants.primary]!;

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <Breadcrumb
        items={[
          { href: "/lotto/methodology", label: "Lotto 통계" },
          { label: date },
        ]}
      />

      <header className="space-y-2 border-b border-brand-800 pb-4">
        <p className="text-xs uppercase tracking-widest text-brand-400">
          통계 분석 · 회피 조건 통과 조합 · 4 strategy
        </p>
        <h1 className="text-2xl font-semibold text-brand-100">
          {primaryContent.title}
        </h1>
        <p className="text-sm text-brand-300">
          본 페이지는 256개 회피 규칙을 통과한 50조합 통계 분석 기록입니다.
          당첨 확률 향상 X · 행동/베팅/구매 권유 X · 통계 학습 자료.
        </p>
        {variants.available.length > 1 && (
          <p className="text-xs text-brand-400 pt-2">
            제공 strategy {variants.available.length}종:{" "}
            {variants.available.map((v) => VARIANT_LABEL[v]).join(" · ")}
          </p>
        )}
      </header>

      <section
        aria-label={`${variants.primary} strategy 50조합 (primary)`}
        className="bg-brand-900/40 border border-brand-800 rounded-md p-4 overflow-x-auto"
      >
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-brand-200">
          {primaryContent.raw}
        </pre>
      </section>

      {variants.available
        .filter((v) => v !== variants.primary)
        .map((v) => {
          const c = variants.contents[v]!;
          return (
            <details
              key={v}
              className="bg-brand-900/20 border border-brand-800 rounded-md"
            >
              <summary className="cursor-pointer px-4 py-3 text-sm text-brand-200 hover:text-brand-100">
                {VARIANT_LABEL[v]} 50조합 펼치기
              </summary>
              <div className="px-4 pb-4 overflow-x-auto">
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-brand-200">
                  {c.raw}
                </pre>
              </div>
            </details>
          );
        })}

      <footer className="border-t border-brand-800 pt-4 text-xs text-brand-400">
        <Link href="/lotto/methodology" className="hover:text-brand-200">
          ← 방법론으로 돌아가기
        </Link>
      </footer>
    </main>
  );
}
