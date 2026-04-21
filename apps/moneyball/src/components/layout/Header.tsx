import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { SearchForm } from "@/components/shared/SearchForm";

const NAV_ITEMS = [
  { href: "/", label: "오늘의 예측" },
  { href: "/predictions", label: "예측 기록" },
  { href: "/analysis", label: "AI 분석" },
  { href: "/players", label: "선수" },
  { href: "/teams", label: "팀" },
  { href: "/seasons", label: "시즌 리뷰" },
  { href: "/dashboard", label: "대시보드" },
  { href: "/about", label: "소개" },
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
        <nav className="hidden md:flex items-center gap-5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-brand-200 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <SearchForm compact />
          <ThemeToggle />
        </nav>
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
