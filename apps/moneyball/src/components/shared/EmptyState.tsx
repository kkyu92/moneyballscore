import Link from 'next/link';

type Size = 'inline' | 'md' | 'lg';

interface Props {
  size?: Size;
  icon?: string;
  title: string;
  description?: string;
  cta?: { href: string; label: string };
}

export function EmptyState({
  size = 'md',
  icon,
  title,
  description,
  cta,
}: Props) {
  if (size === 'inline') {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">{title}</span>
    );
  }

  const padding = size === 'lg' ? 'p-10' : 'p-8';
  const titleClass =
    size === 'lg'
      ? 'text-lg font-medium text-gray-600 dark:text-gray-300'
      : 'text-lg text-gray-400 dark:text-gray-500';

  return (
    <div
      className={`bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] ${padding} text-center`}
      role="status"
    >
      {icon && (
        <span className="text-5xl block mb-4" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className={titleClass}>{title}</p>
      {description && (
        <p className="text-sm mt-2 text-gray-400 dark:text-gray-500">
          {description}
        </p>
      )}
      {cta && (
        <Link
          href={cta.href}
          className="inline-block mt-4 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
