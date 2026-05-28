"use client";

/**
 * MobileNav — viewport < md hamburger 패턴 + Radix Accordion 안 NavGroup 접기/펼치기.
 *
 * cycle 1021 plan #14 C2 Step 2c — 기존 NavGroup 모두 펼쳐서 표시하던 패턴 →
 * Radix Accordion (WAI-ARIA Authoring Practices accordion pattern 자동) 으로
 * 그룹별 접기/펼치기. 사용자가 원하는 카테고리만 빠르게 진입.
 *
 * spec: docs/design/megamenu-state-matrix.md state #12 (mobile-collapse).
 */

import * as Accordion from "@radix-ui/react-accordion";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LEAGUE_NAVS, isNavGroup } from "./Header";
import { LeagueSelector, leagueFromPath } from "./LeagueSelector";
import { NavIcon } from "./nav-icon";

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const league = leagueFromPath(pathname);
  const navItems = LEAGUE_NAVS[league];

  // 활성 route 가 속한 NavGroup 자동 펼치기 (default open)
  const defaultOpenGroups = navItems
    .filter(isNavGroup)
    .filter((g) => g.items.some((sub) => isActive(sub.href, pathname)))
    .map((g) => g.label);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-brand-200 hover:text-white"
        aria-label="메뉴"
        aria-expanded={open}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          {open ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>
      {open && (
        <nav
          data-league={league}
          className="absolute top-16 left-0 right-0 bg-brand-800 border-b border-brand-700 shadow-lg z-50"
          aria-label="모바일 메뉴"
        >
          <LeagueSelector variant="mobile" onSelect={() => setOpen(false)} />
          <Accordion.Root
            type="multiple"
            defaultValue={defaultOpenGroups}
            className="divide-y divide-brand-700/40"
          >
            {navItems.map((item) =>
              isNavGroup(item) ? (
                <Accordion.Item
                  key={item.label}
                  value={item.label}
                  className="border-0"
                >
                  <Accordion.Header className="flex">
                    <Accordion.Trigger
                      className="group flex w-full items-center justify-between px-6 py-3 text-xs font-semibold uppercase tracking-wide text-brand-300 hover:text-white hover:bg-brand-700/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                    >
                      {item.label}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-60 transition-transform duration-150 group-data-[state=open]:rotate-180"
                        aria-hidden
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className="overflow-hidden">
                    {item.items.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setOpen(false)}
                        aria-current={isActive(sub.href, pathname) ? "page" : undefined}
                        className={`flex items-center gap-2.5 px-6 pl-10 py-2 text-sm transition-colors ${
                          isActive(sub.href, pathname)
                            ? "text-white font-medium bg-brand-700"
                            : "text-brand-200 hover:bg-brand-700 hover:text-white"
                        }`}
                      >
                        {sub.icon && (
                          <span className="opacity-60 shrink-0">
                            <NavIcon name={sub.icon} />
                          </span>
                        )}
                        {sub.label}
                      </Link>
                    ))}
                  </Accordion.Content>
                </Accordion.Item>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href, pathname) ? "page" : undefined}
                  className={`block px-6 py-3 text-sm transition-colors ${
                    isActive(item.href, pathname)
                      ? "text-white font-semibold bg-brand-700"
                      : "text-brand-200 hover:bg-brand-700 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ),
            )}
          </Accordion.Root>
        </nav>
      )}
    </div>
  );
}
