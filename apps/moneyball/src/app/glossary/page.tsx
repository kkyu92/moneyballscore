import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { TableOfContents } from '@/components/shared/TableOfContents';
import {
  GlossaryCategoryFilter,
  type GlossaryCategorySlug,
} from '@/components/glossary/GlossaryCategoryFilter';
import { CATEGORIES, GLOSSARY_TERM_COUNT } from './data';


export const metadata: Metadata = {
  title: '야구 통계 용어 사전',
  description: `KBO 승부예측에 쓰이는 세이버메트릭스 용어 사전. FIP, xFIP, wOBA, WAR, Elo, SFR, wRC+, ISO 등 ${GLOSSARY_TERM_COUNT}개 지표의 정의, 정상 범위, 우리 모델 가중치를 한 페이지에서 확인.`,
  alternates: { canonical: 'https://moneyballscore.vercel.app/glossary' },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://moneyballscore.vercel.app/glossary',
    siteName: 'MoneyBall Score',
    title: '야구 통계 용어 사전 | MoneyBall Score',
    description: `KBO 승부예측에 쓰이는 세이버메트릭스 용어 사전 — FIP, xFIP, wOBA, WAR, Elo, SFR, wRC+, ISO 등 ${GLOSSARY_TERM_COUNT}개 지표의 정의·정상 범위·모델 가중치.`,
  },
  twitter: {
    card: 'summary_large_image',
    title: '야구 통계 용어 사전 | MoneyBall Score',
    description: `KBO 승부예측 세이버메트릭스 ${GLOSSARY_TERM_COUNT}개 지표의 정의·정상 범위·모델 가중치.`,
  },
};

export default function GlossaryPage() {
  const allEntries = CATEGORIES.flatMap((c) => c.entries);

  const categoryCounts = {
    all: allEntries.length,
    pitcher: 0,
    batter: 0,
    composite: 0,
    context: 0,
    validation: 0,
  } as Record<GlossaryCategorySlug, number> & { all: number };
  for (const c of CATEGORIES) {
    categoryCounts[c.slug] = c.entries.length;
  }

  const definedTermSetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'MoneyBall Score 야구 통계 용어 사전',
    description:
      'KBO 승부예측에 쓰이는 세이버메트릭스 지표 정의 모음',
    hasDefinedTerm: allEntries.map((e) => ({
      '@type': 'DefinedTerm',
      '@id': `https://moneyballscore.vercel.app/glossary#${e.id}`,
      name: `${e.abbr} (${e.korean})`,
      alternateName: e.fullName,
      description: e.definition,
      inDefinedTermSet: 'https://moneyballscore.vercel.app/glossary',
    })),
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSetJsonLd) }}
      />
      <Breadcrumb items={[{ label: '용어 사전' }]} />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">야구 통계 용어 사전</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          KBO 승부예측에 쓰이는 세이버메트릭스 지표 {allEntries.length}개
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          각 카드 안 정의 옆에 우리 모델 가중치를 표시했습니다. 예측 페이지에서 본 용어를 클릭하면 이 사전으로 이동합니다.
          상세 모델 구조는{' '}
          <Link
            href="/about"
            className="text-brand-600 dark:text-brand-300 hover:underline"
          >
            소개 페이지
          </Link>
          에서 확인하세요.
        </p>
      </header>

      <TableOfContents
        title="카테고리 이동"
        items={CATEGORIES.map((c) => ({ id: `cat-${c.slug}`, label: c.title }))}
      />

      <nav
        aria-label="용어 빠른 이동"
        className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4"
      >
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
          빠른 이동
        </h2>
        <ul className="flex flex-wrap gap-2">
          {allEntries.map((e) => (
            <li key={e.id}>
              <a
                href={`#${e.id}`}
                className="inline-block px-2.5 py-1 text-xs rounded-md bg-gray-100 dark:bg-[var(--color-surface)] text-gray-700 dark:text-gray-200 hover:bg-brand-100 dark:hover:bg-brand-900 hover:text-brand-700 dark:hover:text-brand-200 transition-colors"
              >
                {e.abbr}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <GlossaryCategoryFilter counts={categoryCounts} />

      {CATEGORIES.map((category) => (
        <section
          key={category.slug}
          id={`cat-${category.slug}`}
          data-glossary-category={category.slug}
          className="scroll-mt-20 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 space-y-4"
        >
          <div>
            <h2 className="text-xl font-bold">{category.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {category.description}
            </p>
          </div>

          <div className="space-y-4">
            {category.entries.map((entry) => (
              <article
                key={entry.id}
                id={entry.id}
                className="p-4 bg-surface rounded-lg scroll-mt-20"
              >
                <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h3 className="text-lg font-bold font-mono text-brand-600 dark:text-brand-300">
                    {entry.abbr}
                  </h3>
                  <span className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    {entry.korean}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {entry.fullName}
                  </span>
                </header>
                <p className="text-sm text-gray-700 dark:text-gray-200 mt-2 leading-relaxed">
                  {entry.definition}
                </p>
                <dl className="text-xs text-gray-500 dark:text-gray-400 mt-3 space-y-1">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-medium text-gray-600 dark:text-gray-300">정상 범위</dt>
                    <dd>{entry.range}</dd>
                  </div>
                  {entry.modelUsage && (
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-gray-600 dark:text-gray-300">우리 모델</dt>
                      <dd>{entry.modelUsage}</dd>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-medium text-gray-600 dark:text-gray-300">출처</dt>
                    <dd>{entry.source}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 space-y-2">
        <h2 className="text-lg font-bold">더 자세히</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          각 지표의 가중치 결정 근거와 운영 데이터는{' '}
          <Link href="/about" className="text-brand-600 dark:text-brand-300 hover:underline">
            소개
          </Link>
          {' / '}
          <Link href="/accuracy" className="text-brand-600 dark:text-brand-300 hover:underline">
            적중률
          </Link>
          {' / '}
          <Link href="/dashboard" className="text-brand-600 dark:text-brand-300 hover:underline">
            대시보드
          </Link>
          {' '}페이지에서 확인할 수 있습니다.
        </p>
      </section>
    </div>
  );
}
