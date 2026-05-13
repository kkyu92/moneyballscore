import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { NavLinks } from "./NavLinks";
import type { NavIconName } from "./nav-icon";

export type NavLink = { href: string; label: string; description?: string; icon?: NavIconName };
export type NavGroup = { label: string; items: NavLink[] };
export type NavItem = NavLink | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return "items" in item;
}

const NAV_ITEMS: NavItem[] = [
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
];

export { NAV_ITEMS };

export function Header() {
  return (
    <header className="border-b border-brand-700 bg-brand-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">⚾</span>
          <span className="font-bold text-xl tracking-tight text-white">MoneyBall</span>
          <span className="text-xs text-brand-300 font-medium">Score</span>
        </Link>
        <NavLinks />
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
