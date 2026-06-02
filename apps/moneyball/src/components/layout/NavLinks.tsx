"use client";

/**
 * NavLinks — Header desktop nav (plan #14 C2 Step 2b 마이그레이션).
 *
 * cycle 1021: 기존 직접 박제 megamenu (button + role=menu + click/hover/Esc/outside-click
 * 모두 수동) → Radix NavigationMenu wrapper (MegaMenu.tsx) 위임. WAI-ARIA Authoring
 * Practices menubar pattern 자동 적용 (focus trap / keyboard nav / arrow / Home / End).
 *
 * 본 컴포넌트 = MegaMenu + SearchForm + ThemeToggle + UtilityNav 합성. league 선택 따라
 * LEAGUE_NAVS 분기. plan #21 Step 2 (cycle 1093): utility nav (🌐 language ETA / ⚙️ settings
 * / PlaceholderLoginButton) embed.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LEAGUE_NAVS } from "./Header";
import { leagueFromPath } from "./LeagueSelector";
import { MegaMenu } from "./MegaMenu";
import { SearchForm } from "@/components/shared/SearchForm";
import { ThemeToggle } from "./ThemeToggle";

export function NavLinks() {
  const pathname = usePathname() ?? "/";
  const league = leagueFromPath(pathname);
  const navItems = LEAGUE_NAVS[league];

  return (
    <div data-league={league} className="hidden md:flex items-center gap-5">
      <MegaMenu items={navItems} pathname={pathname} />
      <SearchForm compact />
      <ThemeToggle />
    </div>
  );
}
