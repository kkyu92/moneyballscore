import Link from "next/link";
import { KBO_TEAM_COUNT, MLB_TEAM_COUNT, MLB_DIVISION_COUNT } from "@moneyball/shared";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { NavLinks } from "./NavLinks";
import { LeagueSelector, type League } from "./LeagueSelector";
import type { NavIconName } from "./nav-icon";

export type NavLink = {
  href: string;
  label: string;
  enLabel?: string;
  description?: string;
  enDescription?: string;
  icon?: NavIconName;
};
export type NavGroup = { label: string; enLabel?: string; items: NavLink[] };
export type NavItem = NavLink | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return "items" in item;
}

// EN 페이지(/en/mlb/*)에서 헤더 nav 가 KO href 를 그대로 써서 클릭 시 KO 페이지로
// 이탈하던 버그 (cycle 2139 발견) — MLB nav 만 /en 대응 라우트 존재하므로 그것만 치환.
// /mlb/reviews/weekly, /mlb/reviews/monthly 는 cycle 2355/2356 에서 EN 미러 신규 배선 —
// 예외 해제 (cycle 2227 이 /mlb/analysis 를 놓쳐 404 냈던 것과 반대 방향 실수 방지 위해,
// 신규 미러 fire 시 예외 목록도 함께 갱신).
function withLocale(href: string, isEn: boolean): string {
  if (!isEn) return href;
  if (href === "/mlb") return "/en/mlb";
  if (href.startsWith("/mlb/")) return `/en${href}`;
  return href;
}

// nav label/description 텍스트도 EN 라우트에서 KO 그대로 노출되던 버그 (cycle 2141 발견,
// href 이탈 버그(cycle 2139/2140)와 별개 issue) — enLabel/enDescription 있으면 치환.
function withLocaleText<T extends { label: string; enLabel?: string }>(item: T, isEn: boolean): T {
  if (!isEn || !item.enLabel) return item;
  return { ...item, label: item.enLabel };
}

export function localizeNavItems(items: NavItem[], pathname: string): NavItem[] {
  const isEn = pathname === "/en" || pathname.startsWith("/en/");
  if (!isEn) return items;
  return items.map((item) => {
    if (isNavGroup(item)) {
      return withLocaleText(
        {
          ...item,
          items: item.items.map((sub) =>
            withLocaleText(
              { ...sub, href: withLocale(sub.href, isEn), description: sub.enDescription ?? sub.description },
              isEn,
            ),
          ),
        },
        isEn,
      );
    }
    return withLocaleText(
      { ...item, href: withLocale(item.href, isEn), description: item.enDescription ?? item.description },
      isEn,
    );
  });
}

// KBO_NAV: Header = primary path only (Footer = exhaust, IA hierarchy 룰).
// 1 top-level (오늘) + 4 group (예측·기록 5 / 팀·선수 4 / 리뷰·시즌 3 / 커뮤니티 2) = 5 hover zone.
// accuracy/shadow (v2.1-B rejected) → footer only (wave-384 IA cleanup)
// reviews section (wave-403) → 리뷰·시즌 그룹 추가 (cycle 1749 IA)
const KBO_NAV: NavItem[] = [
  { href: "/", label: "오늘" },
  {
    label: "예측·기록",
    items: [
      { href: "/analysis", label: "AI 분석", description: "에이전트 토론·팩터 수렴 픽", icon: "activity" },
      { href: "/accuracy", label: "적중 기록", description: "AI 예측 성과 트래킹", icon: "target" },
      { href: "/insights", label: "AI 인사이트", description: "심판 에이전트 reasoning 아카이브", icon: "database" },
      { href: "/predictions", label: "예측 기록", description: "일자별 예측 아카이브", icon: "file-text" },
      { href: "/calendar", label: "월별 캘린더", description: "날짜별 경기·예측 한눈에 보기", icon: "calendar" },
      { href: "/dashboard", label: "모델 성능", description: "Brier·캘리브레이션 지표", icon: "bar-chart" },
    ],
  },
  {
    label: "팀·선수",
    items: [
      { href: "/standings", label: "순위", description: "KBO 정규시즌 순위표", icon: "award" },
      { href: "/teams", label: "팀", description: `KBO ${KBO_TEAM_COUNT}구단 프로필·통계`, icon: "shield" },
      { href: "/players", label: "선수", description: "선수 세이버메트릭스 지표", icon: "user" },
      { href: "/matchup", label: "매치업", description: "팀간 맞대결 이력 분석", icon: "arrows-swap" },
    ],
  },
  {
    label: "리뷰·시즌",
    items: [
      { href: "/reviews", label: "예측 리뷰", description: "주간·월간 적중률 추이 · 팀별 분해", icon: "bar-chart" },
      { href: "/reviews/misses", label: "빗나간 예측", description: "고확신 오예측 사후 분석", icon: "target" },
      { href: "/seasons", label: "시즌 기록", description: "역대 시즌별 기록", icon: "database" },
    ],
  },
  {
    label: "커뮤니티",
    items: [
      { href: "/picks", label: "내 픽 기록", description: "내 예측과 AI 성과 비교", icon: "clipboard-check" },
      { href: "/leaderboard", label: "픽 리더보드", description: "커뮤니티 예측 순위", icon: "award" },
    ],
  },
];

const MLB_NAV: NavItem[] = [
  { href: "/mlb", label: "오늘", enLabel: "Today" },
  {
    label: "경기·팀",
    enLabel: "Games & Teams",
    items: [
      { href: "/mlb/analysis", label: "분석 센터", enLabel: "Analysis Hub", description: "오늘의 빅매치·팩터 수렴 픽·전체 예측", enDescription: "Today's big match, factor convergence picks & all predictions", icon: "bar-chart" },
      { href: "/mlb/standings", label: "AL/NL 순위", enLabel: "AL/NL Standings", description: `${MLB_DIVISION_COUNT} division standings`, icon: "award" },
      { href: "/mlb/team", label: "팀", enLabel: "Teams", description: `${MLB_TEAM_COUNT}팀 시즌 stat`, enDescription: `${MLB_TEAM_COUNT}-team season stats`, icon: "shield" },
      { href: "/mlb/accuracy", label: "적중 기록", enLabel: "Accuracy Track Record", description: "AI 예측 성과 트래킹", enDescription: "AI prediction performance tracking", icon: "target" },
      { href: "/mlb/players", label: "Statcast", description: "xwOBA / Barrel% / Launch Angle", icon: "user" },
      { href: "/mlb/matchup", label: "매치업", enLabel: "Matchup", description: "팀간 맞대결 이력 분석", enDescription: "Head-to-head team matchup history", icon: "arrows-swap" },
      { href: "/mlb/factors", label: `${MLB_FACTOR_COUNTS.total}팩터`, enLabel: `${MLB_FACTOR_COUNTS.total} Factors`, description: `KBO ${MLB_FACTOR_COUNTS.kbo} + Statcast ${MLB_FACTOR_COUNTS.statcast} 가중치`, enDescription: `KBO ${MLB_FACTOR_COUNTS.kbo} + Statcast ${MLB_FACTOR_COUNTS.statcast} weights`, icon: "file-text" },
      { href: "/mlb/methodology", label: "예측 방법론", enLabel: "Methodology", description: "데이터 소스 · 정량 모델 · 검증 방법", enDescription: "Data sources, quant model, verification", icon: "file-text" },
      { href: "/mlb/predictions", label: "예측 기록", enLabel: "Prediction History", description: "일자별 예측 아카이브", enDescription: "Daily prediction archive", icon: "file-text" },
      { href: "/mlb/reviews", label: "예측 리뷰", enLabel: "Prediction Review", description: "수렴 픽 스트리크·팀별 분해", enDescription: "Convergence pick streaks & team breakdown", icon: "bar-chart" },
      { href: "/mlb/reviews/misses", label: "빗나간 예측", enLabel: "Missed Predictions", description: "고확신 오예측 사후 분석", enDescription: "High-confidence miss post-mortems", icon: "target" },
      { href: "/mlb/calendar", label: "월별 캘린더", enLabel: "Monthly Calendar", description: "날짜별 경기·예측 한눈에 보기", enDescription: "Games & predictions by date", icon: "calendar" },
    ],
  },
  {
    label: "포스트시즌",
    enLabel: "Postseason",
    items: [
      { href: "/mlb/wild-card", label: "Wild Card", description: "AL/NL Wild Card race", icon: "target" },
      { href: "/mlb/postseason", label: "Postseason", description: "WC / DS / LCS / WS bracket", icon: "award" },
    ],
  },
];

const LOTTO_LINKS: NavLink[] = [
  { href: "/lotto", label: "이번 주 조합", description: "최신 50조합 + 추천 5세트 통계 선별", icon: "star" },
  { href: "/lotto/methodology", label: "통계 방법론", description: "6/45 패턴 통계 검증·256 규칙 saturation", icon: "file-text" },
  { href: "/lotto/archive", label: "아카이브", description: "회차별 50조합 통계 분석 기록", icon: "database" },
];

// MLB top-level pill — sub-NAV 는 단일 link 라 그룹화 없이 펼침 link 로 렌더.
// 로또는 기존대로 sub-NAV 그룹으로 렌더 (드롭다운).
export const LEAGUE_NAVS: Record<League, NavItem[]> = {
  kbo: KBO_NAV,
  mlb: MLB_NAV,
  lotto: [{ label: "로또", items: LOTTO_LINKS }],
};

export function Header({ isEn = false }: { isEn?: boolean } = {}) {
  return (
    <header className="border-b border-brand-700 bg-brand-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">⚾</span>
          <span className="font-bold text-xl tracking-tight text-white">MoneyBall</span>
          <span className="text-xs text-brand-300 font-medium">Score</span>
        </Link>
        <div className="flex items-center">
          <LeagueSelector variant="desktop" />
          <NavLinks />
        </div>
        <div className="flex items-center md:hidden">
          <Link
            href="/search"
            aria-label={isEn ? "Search" : "검색"}
            className="p-2 text-brand-200 hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </Link>
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
