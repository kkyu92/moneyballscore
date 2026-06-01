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
import { PlaceholderLoginButton } from "./PlaceholderLoginButton";

export function NavLinks() {
  const pathname = usePathname() ?? "/";
  const league = leagueFromPath(pathname);
  const navItems = LEAGUE_NAVS[league];

  return (
    <div data-league={league} className="hidden md:flex items-center gap-5">
      <MegaMenu items={navItems} pathname={pathname} />
      <SearchForm compact />
      <ThemeToggle />
      <button
        type="button"
        disabled
        aria-label="언어 선택 (영문 mirror 박제 wait, ETA 2026-08~09)"
        title="🌐 EN/KO toggle — 영문 mirror 박제 wait (ETA 2026-08~09)"
        className="p-2 text-brand-300 cursor-not-allowed opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </button>
      <Link
        href="/settings"
        aria-label="설정 (박제 중, ETA 2026-08~09)"
        title="⚙️ 설정 — 박제 중 (ETA 2026-08~09)"
        className="p-2 text-brand-200 hover:text-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </Link>
      <PlaceholderLoginButton />
    </div>
  );
}
