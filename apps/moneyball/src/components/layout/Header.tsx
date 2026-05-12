import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { NavLinks } from "./NavLinks";

export type NavLink = { href: string; label: string };
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
      { href: "/analysis", label: "AI 분석" },
      { href: "/accuracy", label: "적중 기록" },
      { href: "/dashboard", label: "모델 성능" },
    ],
  },
  { href: "/standings", label: "순위" },
  { href: "/predictions", label: "기록" },
  {
    label: "팀·선수",
    items: [
      { href: "/teams", label: "팀" },
      { href: "/players", label: "선수" },
      { href: "/matchup", label: "매치업" },
    ],
  },
  {
    label: "리뷰·시즌",
    items: [
      { href: "/reviews", label: "예측 리뷰" },
      { href: "/reviews/weekly", label: "주간 리뷰" },
      { href: "/reviews/monthly", label: "월간 리뷰" },
      { href: "/reviews/misses", label: "빗나간 예측" },
      { href: "/seasons", label: "시즌 기록" },
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
