import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "오늘의 예측" },
  { href: "/predictions", label: "예측 기록" },
  { href: "/analysis", label: "AI 분석" },
  { href: "/players", label: "선수" },
  { href: "/teams", label: "팀" },
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
        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-brand-200 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
        <div className="flex items-center md:hidden">
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
