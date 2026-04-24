import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { SearchForm } from "@/components/shared/SearchForm";

export type NavLink = { href: string; label: string };
export type NavGroup = { label: string; items: NavLink[] };
export type NavItem = NavLink | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return "items" in item;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "오늘의 예측" },
  { href: "/predictions", label: "예측 기록" },
  { href: "/analysis", label: "AI 분석" },
  {
    label: "팀·선수",
    items: [
      { href: "/teams", label: "팀" },
      { href: "/players", label: "선수" },
    ],
  },
  { href: "/seasons", label: "시즌 리뷰" },
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
          {NAV_ITEMS.map((item) =>
            isNavGroup(item) ? (
              <div key={item.label} className="relative group">
                <button
                  type="button"
                  className="text-sm text-brand-200 hover:text-white transition-colors flex items-center gap-1 focus:outline-none focus-visible:text-white"
                  aria-haspopup="menu"
                >
                  {item.label}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div
                  role="menu"
                  className="absolute left-0 top-full pt-2 hidden group-hover:block group-focus-within:block z-50"
                >
                  <div className="bg-brand-800 border border-brand-700 rounded-md shadow-lg min-w-[8rem] py-1">
                    {item.items.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        role="menuitem"
                        className="block px-4 py-2 text-sm text-brand-200 hover:bg-brand-700 hover:text-white transition-colors"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-brand-200 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ),
          )}
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
