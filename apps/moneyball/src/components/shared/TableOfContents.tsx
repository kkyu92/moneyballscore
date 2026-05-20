export interface TocItem {
  id: string;
  label: string;
}

interface TableOfContentsProps {
  items: TocItem[];
  title?: string;
  className?: string;
}

export function TableOfContents({
  items,
  title = '이 페이지',
  className = '',
}: TableOfContentsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label={title}
      className={`bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 ${className}`}
    >
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
        {title}
      </h2>
      <ol className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="inline-block px-2.5 py-1 text-xs rounded-md bg-gray-100 dark:bg-[var(--color-surface)] text-gray-700 dark:text-gray-200 hover:bg-brand-100 dark:hover:bg-brand-900 hover:text-brand-700 dark:hover:text-brand-200 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              <span className="text-gray-400 dark:text-gray-500 mr-1">{i + 1}.</span>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
