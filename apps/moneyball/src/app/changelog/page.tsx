import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { parseChangelog } from '@/lib/changelog/parse';
import { renderChangelogBody } from '@/lib/changelog/renderMarkdown';

const SITE_URL = 'https://moneyballscore.vercel.app';
const PAGE_URL = `${SITE_URL}/changelog`;

export const metadata: Metadata = {
  title: '변경 로그',
  description:
    'MoneyBall Score 의 모델·기능·운영 변경 이력. 가중치 튜닝, 신규 기능, 적중률 분석, AdSense·SEO 보강을 사이클 단위로 모두 공개. 가장 최근 갱신부터 시간 역순으로 정렬.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: '변경 로그 | MoneyBall Score',
    description:
      '모델·기능·운영 변경을 사이클 단위로 모두 공개. 가중치 튜닝부터 SEO 보강까지.',
    url: PAGE_URL,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: '변경 로그 | MoneyBall Score',
    description:
      '모델·기능·운영 변경 이력 전체 공개. 가중치 튜닝 + SEO + 적중률 분석.',
  },
};

export default function ChangelogPage() {
  const entries = parseChangelog();
  const latestDate = entries.find((e) => e.date)?.date ?? null;
  const totalCycles = entries.filter((e) => e.cycle !== null).length;

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': PAGE_URL,
    headline: 'MoneyBall Score 변경 로그',
    description:
      'KBO 승부예측 모델·기능·운영 변경 이력. 가중치 튜닝과 적중률 분석을 사이클 단위로 모두 공개.',
    url: PAGE_URL,
    mainEntityOfPage: PAGE_URL,
    datePublished: '2026-04-13',
    dateModified: latestDate ?? new Date().toISOString().slice(0, 10),
    author: {
      '@type': 'Organization',
      name: 'MoneyBall Score',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'MoneyBall Score',
      url: SITE_URL,
    },
    inLanguage: 'ko-KR',
    isPartOf: {
      '@type': 'WebSite',
      name: 'MoneyBall Score',
      url: SITE_URL,
    },
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <Breadcrumb items={[{ label: '변경 로그' }]} />

      <header className="space-y-4">
        <h1 className="text-3xl font-bold text-brand-900 dark:text-white">
          변경 로그
        </h1>
        <p className="text-base text-brand-700 dark:text-brand-200 leading-relaxed">
          MoneyBall Score 의 모델·기능·운영 변경을 사이클 단위로 모두 공개합니다.
          가중치 튜닝의 근거, 적중률 분석 결과, 신규 기능과 SEO·AdSense 보강까지
          한 페이지에서 시간 역순으로 확인할 수 있습니다.
        </p>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg bg-brand-50 dark:bg-brand-900 px-4 py-3">
            <dt className="text-brand-500 dark:text-brand-400">총 변경 항목</dt>
            <dd className="mt-1 text-lg font-semibold text-brand-900 dark:text-white">
              {entries.length}건
            </dd>
          </div>
          <div className="rounded-lg bg-brand-50 dark:bg-brand-900 px-4 py-3">
            <dt className="text-brand-500 dark:text-brand-400">사이클 기록</dt>
            <dd className="mt-1 text-lg font-semibold text-brand-900 dark:text-white">
              {totalCycles}건
            </dd>
          </div>
          {latestDate && (
            <div className="rounded-lg bg-brand-50 dark:bg-brand-900 px-4 py-3">
              <dt className="text-brand-500 dark:text-brand-400">최근 갱신</dt>
              <dd className="mt-1 text-lg font-semibold text-brand-900 dark:text-white">
                {latestDate}
              </dd>
            </div>
          )}
        </dl>
        <nav
          aria-label="관련 페이지"
          className="flex flex-wrap gap-2 text-xs pt-2"
        >
          <Link
            href="/methodology"
            className="px-3 py-1.5 rounded-full border border-brand-200 dark:border-brand-700 text-brand-700 dark:text-brand-200 hover:border-brand-500 hover:text-brand-900 dark:hover:text-white transition-colors"
          >
            예측 방법론 →
          </Link>
          <Link
            href="/accuracy"
            className="px-3 py-1.5 rounded-full border border-brand-200 dark:border-brand-700 text-brand-700 dark:text-brand-200 hover:border-brand-500 hover:text-brand-900 dark:hover:text-white transition-colors"
          >
            AI 적중률 →
          </Link>
          <Link
            href="/glossary"
            className="px-3 py-1.5 rounded-full border border-brand-200 dark:border-brand-700 text-brand-700 dark:text-brand-200 hover:border-brand-500 hover:text-brand-900 dark:hover:text-white transition-colors"
          >
            용어 사전 →
          </Link>
        </nav>
      </header>

      <ol className="space-y-8" aria-label="변경 이력">
        {entries.map((entry) => (
          <li
            key={entry.id}
            id={entry.id}
            className="rounded-xl border border-brand-200 dark:border-brand-800 bg-white dark:bg-brand-950 p-5 sm:p-6 scroll-mt-20"
          >
            <header className="mb-3 space-y-1.5">
              <h2 className="text-lg sm:text-xl font-semibold text-brand-900 dark:text-white">
                {entry.title}
              </h2>
              {(entry.date || entry.cycle !== null) && (
                <p className="text-xs text-brand-500 dark:text-brand-400 flex items-center gap-2 flex-wrap">
                  {entry.date && (
                    <time dateTime={entry.date}>{entry.date}</time>
                  )}
                  {entry.cycle !== null && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>cycle {entry.cycle}</span>
                    </>
                  )}
                </p>
              )}
            </header>
            {renderChangelogBody(entry.body)}
          </li>
        ))}
      </ol>

      <footer className="pt-6 border-t border-brand-200 dark:border-brand-800 text-xs text-brand-500 dark:text-brand-400">
        <p>
          전체 변경 이력은 GitHub 저장소의{' '}
          <a
            href="https://github.com/kkyu92/moneyballscore/blob/main/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-100 underline"
          >
            CHANGELOG.md
          </a>
          {' '}에서도 확인할 수 있습니다.
        </p>
      </footer>
    </main>
  );
}
