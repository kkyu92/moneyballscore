"use client";

/**
 * MegaMenu — shadcn `<NavigationMenu>` wrapper (plan #19 Step 2, cycle 1044).
 *
 * cycle 1042 = shadcn navigation-menu 컴포넌트 박제 (apps/moneyball/src/components/ui/navigation-menu.tsx).
 * cycle 1044 = MegaMenu 가 shadcn wrapper 직접 사용으로 마이그레이션.
 *
 * 기존 Radix 직접 사용 → shadcn wrapper. WAI-ARIA Authoring Practices menubar
 * pattern 자동 적용 + viewport 패턴 (panel content 단일 컨테이너 + 자동 size).
 *
 * spec: docs/design/megamenu-state-matrix.md (12 case 상태 매트릭스).
 * focus-visible: outline-2 outline-brand-500 (plan #19 Step 2 명시).
 *
 * Server / Client 분리: SiteHeader RSC 유지 + 본 컴포넌트 'use client' 격리.
 */

import Link from "next/link";
import type { NavItem } from "./Header";
import { isNavGroup } from "./Header";
import { NavIcon } from "./nav-icon";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

interface MegaMenuProps {
  items: NavItem[];
  pathname: string;
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

const TRIGGER_BASE =
  "inline-flex items-center gap-1 px-3 py-2 text-sm transition-colors rounded " +
  "bg-transparent hover:bg-transparent " +
  "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

const TRIGGER_INACTIVE = "text-brand-200 hover:text-white";
const TRIGGER_ACTIVE = "text-white font-semibold";

const LINK_BASE =
  "flex items-start gap-3 px-4 py-2.5 text-sm transition-colors min-h-11 " +
  "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500";

const LINK_INACTIVE = "text-brand-200 hover:bg-brand-700 hover:text-white";
const LINK_ACTIVE = "text-white bg-brand-700";

export function MegaMenu({ items, pathname }: MegaMenuProps) {
  return (
    <NavigationMenu className="hidden md:flex max-w-none">
      <NavigationMenuList className="gap-2 space-x-0">
        {items.map((item) =>
          isNavGroup(item) ? (
            <NavigationMenuItem key={item.label}>
              <NavigationMenuTrigger
                className={`${TRIGGER_BASE} ${
                  item.items.some((sub) => isActive(sub.href, pathname))
                    ? TRIGGER_ACTIVE
                    : TRIGGER_INACTIVE
                }`}
              >
                {item.label}
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div
                  className={`bg-brand-800 border border-brand-700 rounded-md shadow-lg py-1 ${
                    item.items.some((sub) => sub.description)
                      ? item.items.length === 5
                        ? "w-[320px]"
                        : item.items.length >= 4
                          ? "grid grid-cols-2 w-[640px]"
                          : "w-[280px]"
                      : item.items.length === 5
                        ? "w-[220px]"
                        : item.items.length >= 4
                          ? "grid grid-cols-2 w-[440px]"
                          : "w-[200px]"
                  }`}
                >
                  {item.items.map((sub) => (
                    <NavigationMenuLink key={sub.href} asChild>
                      <Link
                        href={sub.href}
                        aria-current={isActive(sub.href, pathname) ? "page" : undefined}
                        className={`${LINK_BASE} ${
                          isActive(sub.href, pathname) ? LINK_ACTIVE : LINK_INACTIVE
                        }`}
                      >
                        {sub.icon && (
                          <span className="mt-0.5 shrink-0 opacity-70">
                            <NavIcon name={sub.icon} />
                          </span>
                        )}
                        {sub.description ? (
                          <span>
                            <span
                              className={`block font-medium ${
                                isActive(sub.href, pathname) ? "text-white" : ""
                              }`}
                            >
                              {sub.label}
                            </span>
                            <span
                              className={`block text-xs mt-0.5 ${
                                isActive(sub.href, pathname)
                                  ? "text-brand-300"
                                  : "text-brand-400"
                              }`}
                            >
                              {sub.description}
                            </span>
                          </span>
                        ) : (
                          sub.label
                        )}
                      </Link>
                    </NavigationMenuLink>
                  ))}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          ) : (
            <NavigationMenuItem key={item.href}>
              <NavigationMenuLink asChild>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href, pathname) ? "page" : undefined}
                  className={`${TRIGGER_BASE} ${
                    isActive(item.href, pathname) ? TRIGGER_ACTIVE : TRIGGER_INACTIVE
                  }`}
                >
                  {item.label}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ),
        )}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
