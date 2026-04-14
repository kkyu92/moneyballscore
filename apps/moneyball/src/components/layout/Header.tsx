import Link from "next/link";
import { MobileNav } from "./MobileNav";

const NAV_ITEMS = [
  { href: "/", label: "오늘의 예측" },
  { href: "/predictions", label: "예측 기록" },
  { href: "/reviews", label: "리뷰" },
  { href: "/dashboard", label: "대시보드" },
  { href: "/about", label: "소개" },
];

export { NAV_ITEMS };

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">⚾</span>
          <span className="font-bold text-xl tracking-tight">MoneyBall</span>
          <span className="text-xs text-gray-500 font-medium">KBO</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <MobileNav />
      </div>
    </header>
  );
}
