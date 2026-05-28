"use client";

/**
 * MegaMenu — Radix NavigationMenu wrapper (plan #14 C2 Step 2, plan #15 C2 후속).
 *
 * Radix NavigationMenu = WAI-ARIA Authoring Practices menubar pattern 자동 적용.
 * 본 wrapper = brand token override + 상태 매트릭스 12 case (docs/design/megamenu-state-matrix.md)
 * spec 정합.
 *
 * 본 컴포넌트 = NavLinks.tsx 의 직접 박제 megamenu 대체 후보. 후속 PR 에서
 * Header.tsx 안 NavLinks → MegaMenu 마이그레이션.
 *
 * 사용:
 *   <MegaMenu items={LEAGUE_NAVS.kbo} pathname={pathname} />
 */

import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import Link from "next/link";
import type { NavItem } from "./Header";
import { isNavGroup } from "./Header";
import { NavIcon } from "./nav-icon";

interface MegaMenuProps {
  items: NavItem[];
  pathname: string;
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function MegaMenu({ items, pathname }: MegaMenuProps) {
  return (
    <NavigationMenu.Root
      className="hidden md:block"
      delayDuration={150}
    >
      <NavigationMenu.List className="flex items-center gap-5">
        {items.map((item) =>
          isNavGroup(item) ? (
            <NavigationMenu.Item key={item.label}>
              <NavigationMenu.Trigger
                className={`text-sm transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:rounded ${
                  item.items.some((sub) => isActive(sub.href, pathname))
                    ? "text-white font-semibold"
                    : "text-brand-200 hover:text-white"
                }`}
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
                  className="transition-transform duration-150 group-data-[state=open]:rotate-180"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </NavigationMenu.Trigger>
              <NavigationMenu.Content
                className="absolute left-0 top-full pt-2 z-50"
              >
                <div
                  className={`bg-brand-800 border border-brand-700 rounded-md shadow-lg py-1 ${
                    item.items.some((sub) => sub.description)
                      ? item.items.length >= 4
                        ? "min-w-[18rem]"
                        : "min-w-[14rem]"
                      : item.items.length >= 4
                        ? "grid grid-cols-2 min-w-[18rem]"
                        : "min-w-[8rem]"
                  }`}
                >
                  {item.items.map((sub) => (
                    <NavigationMenu.Link key={sub.href} asChild>
                      <Link
                        href={sub.href}
                        className={`flex items-start gap-3 px-4 py-2.5 text-sm transition-colors ${
                          isActive(sub.href, pathname)
                            ? "text-white bg-brand-700"
                            : "text-brand-200 hover:bg-brand-700 hover:text-white"
                        }`}
                      >
                        {sub.icon && (
                          <span className="mt-0.5 shrink-0 opacity-70">
                            <NavIcon name={sub.icon} />
                          </span>
                        )}
                        {sub.description ? (
                          <span>
                            <span className={`block font-medium ${isActive(sub.href, pathname) ? "text-white" : ""}`}>
                              {sub.label}
                            </span>
                            <span className={`block text-xs mt-0.5 ${isActive(sub.href, pathname) ? "text-brand-300" : "text-brand-400"}`}>
                              {sub.description}
                            </span>
                          </span>
                        ) : (
                          sub.label
                        )}
                      </Link>
                    </NavigationMenu.Link>
                  ))}
                </div>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
          ) : (
            <NavigationMenu.Item key={item.href}>
              <NavigationMenu.Link asChild>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href, pathname) ? "page" : undefined}
                  className={`text-sm transition-colors ${
                    isActive(item.href, pathname)
                      ? "text-white font-semibold"
                      : "text-brand-200 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          ),
        )}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}
