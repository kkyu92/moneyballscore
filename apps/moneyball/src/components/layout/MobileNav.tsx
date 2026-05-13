"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavGroup } from "./Header";
import { NavIcon } from "./nav-icon";

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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
        <nav className="absolute top-16 left-0 right-0 bg-brand-800 border-b border-brand-700 shadow-lg z-50">
          {NAV_ITEMS.map((item) =>
            isNavGroup(item) ? (
              <div key={item.label}>
                <div className="px-6 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-brand-400">
                  {item.label}
                </div>
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
              </div>
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
        </nav>
      )}
    </div>
  );
}
