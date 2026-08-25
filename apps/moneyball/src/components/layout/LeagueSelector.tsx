"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type League = "kbo" | "mlb" | "lotto";

type LeagueDef = {
  id: League;
  label: string;
  enLabel?: string;
  href: string;
  badge?: string;
  enBadge?: string;
};

export const LEAGUES: readonly LeagueDef[] = [
  { id: "kbo", label: "KBO", href: "/" },
  { id: "mlb", label: "MLB", href: "/mlb", badge: "베타", enBadge: "Beta" },
  { id: "lotto", label: "로또", enLabel: "Lotto", href: "/lotto/methodology" },
] as const;

export function leagueFromPath(pathname: string): League {
  if (pathname === "/lotto" || pathname.startsWith("/lotto/")) return "lotto";
  if (pathname === "/mlb" || pathname.startsWith("/mlb/")) return "mlb";
  if (pathname === "/en/mlb" || pathname.startsWith("/en/mlb/")) return "mlb";
  return "kbo";
}

// MLB pill 만 /en 대응 라우트 존재 — EN 페이지에서 클릭 시 KO 로 이탈 방지 (cycle 2139/2140).
function leagueHref(league: LeagueDef, pathname: string): string {
  const isEn = pathname === "/en" || pathname.startsWith("/en/");
  if (isEn && league.id === "mlb") return "/en/mlb";
  return league.href;
}

type Variant = "desktop" | "mobile";

export function LeagueSelector({
  variant = "desktop",
  onSelect,
}: {
  variant?: Variant;
  onSelect?: (league: League) => void;
}) {
  const pathname = usePathname();
  const active = leagueFromPath(pathname ?? "/");
  const isEn = (pathname ?? "/") === "/en" || (pathname ?? "/").startsWith("/en/");

  const isMobile = variant === "mobile";

  return (
    <div
      role="tablist"
      aria-label={isEn ? "League" : "리그 선택"}
      className={
        isMobile
          ? "flex gap-1.5 px-6 py-3 border-b border-brand-700"
          : "hidden md:flex items-center gap-1 mr-3"
      }
    >
      {LEAGUES.map((league) => {
        const isActive = active === league.id;
        return (
          <Link
            key={league.id}
            href={leagueHref(league, pathname ?? "/")}
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onSelect?.(league.id)}
            data-league={league.id}
            data-active={isActive ? "true" : "false"}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
              isActive
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-brand-700/40 text-brand-200 hover:bg-brand-700 hover:text-white"
            }`}
          >
            <span>{isEn && league.enLabel ? league.enLabel : league.label}</span>
            {league.badge && (
              <span
                className={`rounded-sm px-1 py-px text-[9px] font-bold uppercase tracking-wide ${
                  isActive
                    ? "bg-brand-800/50 text-accent-light"
                    : "bg-brand-800/40 text-brand-300"
                }`}
              >
                {isEn && league.enBadge ? league.enBadge : league.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
