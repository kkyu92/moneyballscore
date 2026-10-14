/**
 * schema.org JSON-LD builders — Article / BreadcrumbList.
 *
 * 실제 사용처 (cycle 3183 재확인): `insights/series/[topic]/page.tsx` (ko/en/mlb
 * 3개) 만 본 모듈 import, `buildArticleJsonLd`/`buildBreadcrumbListJsonLd` 둘만
 * 소비. `predictions/[date]/page.tsx` 는 동일 이름(`buildSportsEventJsonLd`/
 * `buildArticleJsonLd`)의 로컬 함수를 별도로 포크해 사용 중 — 본 모듈 미참조.
 * `insights/page.tsx` (topic 리스트) / `analysis/game/[id]/page.tsx` /
 * `guide/page.tsx` 는 여전히 자체 inline JSON-LD 유지 — 본 모듈로 추출된 적 없음.
 * `buildSportsEventJsonLd`/`buildSportsTeamJsonLd`/`buildPersonJsonLd` 는
 * production 소비자 0 (테스트에서만 참조) 확인 후 cycle 3183 제거.
 */

import { SITE_URL } from "@moneyball/shared";

export { SITE_URL };
const SITE_NAME = "MoneyBall Score";

/** Article 입력 */
interface ArticleInput {
  url: string;
  headline: string;
  description: string;
  /** YYYY-MM-DD or ISO */
  datePublished: string;
  /** YYYY-MM-DD or ISO (default = datePublished) */
  dateModified?: string;
  inLanguage?: string;
}

export function buildArticleJsonLd(input: ArticleInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": input.url,
    headline: input.headline,
    description: input.description,
    url: input.url,
    inLanguage: input.inLanguage ?? "ko-KR",
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntityOfPage: input.url,
  };
}

/** BreadcrumbList 입력 */
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbListJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
