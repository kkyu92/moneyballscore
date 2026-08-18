"use client";

/**
 * NavLinks — Header desktop nav.
 *
 * MegaMenu + SearchForm + ThemeToggle + UtilityNav 합성. league 선택 따라 LEAGUE_NAVS 분기.
 */

import { usePathname } from "next/navigation";
import { LEAGUE_NAVS, localizeNavItems } from "./Header";
import { leagueFromPath } from "./LeagueSelector";
import { MegaMenu } from "./MegaMenu";
import { SearchForm } from "@/components/shared/SearchForm";
import { ThemeToggle } from "./ThemeToggle";

export function NavLinks() {
  const pathname = usePathname() ?? "/";
  const league = leagueFromPath(pathname);
  const navItems = localizeNavItems(LEAGUE_NAVS[league], pathname);
  const isEn = pathname === "/en" || pathname.startsWith("/en/");

  return (
    <div data-league={league} className="hidden md:flex items-center gap-5">
      <MegaMenu items={navItems} pathname={pathname} />
      <SearchForm compact />
      <ThemeToggle isEn={isEn} />
    </div>
  );
}
