/**
 * schema.org JSON-LD builders — SportsEvent / SportsTeam / Person / Article / BreadcrumbList.
 *
 * 패턴 정합: 기존 insights/page.tsx / analysis/game/[id]/page.tsx / guide/page.tsx
 * 의 inline JSON-LD 스니펫을 헬퍼로 추출. 신규 라우트는 본 모듈을 통해서만
 * JSON-LD 생성 → schema 일관성 유지.
 *
 * 사용 패턴:
 * ```tsx
 * <script
 *   type="application/ld+json"
 *   dangerouslySetInnerHTML={{ __html: JSON.stringify(buildSportsEventJsonLd({...})) }}
 * />
 * ```
 */

import { KBO_TEAMS, type TeamCode, SITE_URL, KBO_OFFICIAL_URL } from "@moneyball/shared";

export { SITE_URL };
export const SITE_NAME = "MoneyBall Score";
export const ORG_NAME = "Korea Baseball Organization";
export const ORG_URL = KBO_OFFICIAL_URL;

/** SportsEvent 입력 */
export interface SportsEventInput {
  gameId: number;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  /** YYYY-MM-DD */
  gameDate: string;
  /** HH:mm:ss or HH:mm (default 18:30) */
  gameTime?: string | null;
  /** "scheduled" | "live" | "final" | "postponed" | "canceled" */
  status?: string;
  /** override stadium name (else uses KBO_TEAMS[home].stadium) */
  stadium?: string | null;
  /** explicit URL (else `${SITE_URL}/analysis/game/{id}`) */
  url?: string;
}

function eventStatusIri(status: string | undefined): string {
  switch (status) {
    case "postponed":
      return "https://schema.org/EventPostponed";
    case "final":
    case "completed":
      return "https://schema.org/EventCompleted";
    case "canceled":
    case "cancelled":
      return "https://schema.org/EventCancelled";
    default:
      return "https://schema.org/EventScheduled";
  }
}

export function buildSportsEventJsonLd(input: SportsEventInput) {
  const homeFullName = KBO_TEAMS[input.homeTeam].name;
  const awayFullName = KBO_TEAMS[input.awayTeam].name;
  const stadium = input.stadium ?? KBO_TEAMS[input.homeTeam].stadium;
  const time = (input.gameTime ?? "18:30").slice(0, 5);
  const startDateIso = `${input.gameDate}T${time}:00+09:00`;
  const url = input.url ?? `${SITE_URL}/analysis/game/${input.gameId}`;

  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${awayFullName} vs ${homeFullName}`,
    startDate: startDateIso,
    sport: "Baseball",
    eventStatus: eventStatusIri(input.status),
    location: { "@type": "Place", name: stadium },
    homeTeam: { "@type": "SportsTeam", name: homeFullName },
    awayTeam: { "@type": "SportsTeam", name: awayFullName },
    url,
    organizer: {
      "@type": "SportsOrganization",
      name: ORG_NAME,
      url: ORG_URL,
    },
  };
}

/** SportsTeam 입력 */
export interface SportsTeamInput {
  team: TeamCode;
  /** explicit URL (else `${SITE_URL}/teams/{code}`) */
  url?: string;
  /** explicit logo URL */
  logo?: string;
}

export function buildSportsTeamJsonLd(input: SportsTeamInput) {
  const info = KBO_TEAMS[input.team];
  const url = input.url ?? `${SITE_URL}/teams/${input.team.toLowerCase()}`;
  return {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: info.name,
    sport: "Baseball",
    url,
    ...(input.logo ? { logo: input.logo } : {}),
    location: { "@type": "Place", name: info.stadium },
    memberOf: {
      "@type": "SportsOrganization",
      name: ORG_NAME,
      url: ORG_URL,
    },
  };
}

/** Person (player) 입력 */
export interface PersonInput {
  name: string;
  /** 포지션 (예: "Pitcher", "First Baseman") */
  jobTitle?: string;
  /** 소속 팀 코드 */
  team?: TeamCode;
  /** explicit URL */
  url?: string;
}

export function buildPersonJsonLd(input: PersonInput) {
  const affiliation = input.team
    ? {
        affiliation: {
          "@type": "SportsTeam",
          name: KBO_TEAMS[input.team].name,
        },
      }
    : {};
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
    ...(input.url ? { url: input.url } : {}),
    ...affiliation,
  };
}

/** Article 입력 */
export interface ArticleInput {
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
export interface BreadcrumbItem {
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
