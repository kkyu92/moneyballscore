import Link from 'next/link';

export interface RelatedLink {
  href: string;
  label: string;
  hint?: string;
}

interface RelatedLinksProps {
  title: string;
  items: RelatedLink[];
  className?: string;
}

export function RelatedLinks({ title, items, className = '' }: RelatedLinksProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label={title}
      className={`border-t border-gray-200 dark:border-[var(--color-border)] pt-4 ${className}`}
    >
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
        {title}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="inline-flex flex-col px-3 py-2 rounded-lg border border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-card)] text-sm text-gray-700 dark:text-gray-200 hover:border-brand-500 dark:hover:border-brand-300 hover:text-brand-600 dark:hover:text-brand-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              <span className="font-medium">{item.label}</span>
              {item.hint && (
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.hint}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
