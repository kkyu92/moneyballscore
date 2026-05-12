"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const navRef = useRef<HTMLElement>(null);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpenLabel(null);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenLabel(null);
    }
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenLabel(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav ref={navRef} className="hidden md:flex items-center gap-5">
      {NAV_ITEMS.map((item) =>
        isNavGroup(item) ? (
          <div key={item.label} className="relative">
            <button
              type="button"
              id={`nav-btn-${item.label}`}
              className={`text-sm transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:rounded ${
                item.items.some((sub) => isActive(sub.href, pathname))
                  ? "text-white font-semibold"
                  : "text-brand-200 hover:text-white"
              }`}
              aria-haspopup="menu"
              aria-expanded={openLabel === item.label}
              aria-controls={`nav-menu-${item.label}`}
              onClick={() =>
                setOpenLabel((prev) =>
                  prev === item.label ? null : item.label,
                )
              }
              onMouseEnter={() => setOpenLabel(item.label)}
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
                style={{
                  transform:
                    openLabel === item.label ? "rotate(180deg)" : undefined,
                  transition: "transform 150ms ease-out",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {openLabel === item.label && (
              <div
                id={`nav-menu-${item.label}`}
                role="menu"
                aria-labelledby={`nav-btn-${item.label}`}
                className="absolute left-0 top-full pt-2 z-50"
              >
                <div
                  className={`bg-brand-800 border border-brand-700 rounded-md shadow-lg py-1 ${
                    item.items.some((sub) => sub.description)
                      ? "min-w-[14rem]"
                      : item.items.length >= 4
                        ? "grid grid-cols-2 min-w-[18rem]"
                        : "min-w-[8rem]"
                  }`}
                >
                  {item.items.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      role="menuitem"
                      onClick={() => setOpenLabel(null)}
                      className={`block px-4 py-2.5 text-sm transition-colors ${
                        isActive(sub.href, pathname)
                          ? "text-white bg-brand-700"
                          : "text-brand-200 hover:bg-brand-700 hover:text-white"
                      }`}
                    >
                      {sub.description ? (
                        <>
                          <span className={`block font-medium ${isActive(sub.href, pathname) ? "text-white" : ""}`}>
                            {sub.label}
                          </span>
                          <span className={`block text-xs mt-0.5 ${isActive(sub.href, pathname) ? "text-brand-300" : "text-brand-400"}`}>
                            {sub.description}
                          </span>
                        </>
                      ) : (
                        sub.label
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
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
