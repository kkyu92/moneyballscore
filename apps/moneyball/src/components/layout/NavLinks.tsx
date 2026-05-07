"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavGroup } from "./Header";
import { SearchForm } from "@/components/shared/SearchForm";
import { ThemeToggle } from "./ThemeToggle";

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-5">
      {NAV_ITEMS.map((item) =>
        isNavGroup(item) ? (
          <div key={item.label} className="relative group">
            <button
              type="button"
              className={`text-sm transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:rounded ${
                item.items.some((sub) => isActive(sub.href, pathname))
                  ? "text-white font-semibold"
                  : "text-brand-200 hover:text-white"
              }`}
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
                    className={`block px-4 py-2 text-sm transition-colors ${
                      isActive(sub.href, pathname)
                        ? "text-white bg-brand-700 font-medium"
                        : "text-brand-200 hover:bg-brand-700 hover:text-white"
                    }`}
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
            aria-current={isActive(item.href, pathname) ? "page" : undefined}
            className={`text-sm transition-colors ${
              isActive(item.href, pathname)
                ? "text-white font-semibold"
                : "text-brand-200 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ),
      )}
      <SearchForm compact />
      <ThemeToggle />
    </nav>
  );
}
