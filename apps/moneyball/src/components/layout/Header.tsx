import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { NavLinks } from "./NavLinks";
import { LeagueSelector, type League } from "./LeagueSelector";
import type { NavIconName } from "./nav-icon";

export type NavLink = { href: string; label: string; description?: string; icon?: NavIconName };
export type NavGroup = { label: string; items: NavLink[] };
export type NavItem = NavLink | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return "items" in item;
}

const KBO_NAV: NavItem[] = [
  { href: "/", label: "오늘" },
  {
    label: "AI",
    items: [
      { href: "/analysis", label: "AI 분석", description: "에이전트 토론·경기 분석", icon: "activity" },
      { href: "/accuracy", label: "적중 기록", description: "AI 예측 성과 트래킹", icon: "target" },
      { href: "/dashboard", label: "모델 성능", description: "Brier·캘리브레이션 지표", icon: "bar-chart" },
    ],
  },
  {
    label: "커뮤니티",
    items: [
      { href: "/picks", label: "내 픽 기록", description: "내 예측과 AI 성과 비교", icon: "clipboard-check" },
      { href: "/leaderboard", label: "픽 리더보드", description: "커뮤니티 예측 순위", icon: "award" },
    ],
  },
  { href: "/standings", label: "순위" },
  { href: "/predictions", label: "예측 기록" },
  {
    label: "팀·선수",
    items: [
      { href: "/teams", label: "팀", description: "KBO 10구단 프로필·통계", icon: "shield" },
      { href: "/players", label: "선수", description: "선수 세이버메트릭스 지표", icon: "user" },
      { href: "/matchup", label: "매치업", description: "팀간 맞대결 이력 분석", icon: "arrows-swap" },
    ],
  },
  {
    label: "리뷰·시즌",
    items: [
      { href: "/reviews", label: "예측 리뷰", description: "주간·월간 예측 총평", icon: "file-text" },
      { href: "/reviews/weekly", label: "주간 리뷰", description: "이번 주 예측 성과 분석", icon: "calendar" },
      { href: "/reviews/monthly", label: "월간 리뷰", description: "월별 적중률 트렌드", icon: "calendar" },
      { href: "/reviews/misses", label: "빗나간 예측", description: "오답 원인 factor 분석", icon: "x-circle" },
      { href: "/seasons", label: "시즌 기록", description: "연도별 성과 아카이브", icon: "database" },
    ],
  },
  {
    label: "도움말",
    items: [
      { href: "/methodology", label: "예측 방법론", description: "v1.8 모델·10팩터·AI 토론", icon: "file-text" },
      { href: "/guide", label: "사용 가이드", description: "예측 카드·차트·페이지 활용", icon: "clipboard-check" },
      { href: "/glossary", label: "용어 사전", description: "10팩터·세이버메트릭 용어 풀이", icon: "database" },
      { href: "/insights", label: "AI 인사이트", description: "AI 토론 reasoning 시계열 아카이브", icon: "activity" },
      { href: "/v2-preview", label: "v2 시뮬레이션", description: "v2.0 가중치 backtest 미리보기", icon: "bar-chart" },
      { href: "/changelog", label: "변경 로그", description: "사이클별 모델·기능 갱신 이력", icon: "file-text" },
      { href: "/about", label: "서비스 소개", description: "FAQ·서비스 안내·문의", icon: "file-text" },
    ],
  },
];

const MLB_NAV: NavItem[] = [
  { href: "/mlb", label: "MLB 베타" },
];

const LOTTO_LINKS: NavLink[] = [
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

// 백워드 호환 — 외부 consumer 가 있을 경우 KBO 전체 NAV 유지.
export const NAV_ITEMS: NavItem[] = KBO_NAV;

export function Header() {
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
            aria-label="검색"
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
