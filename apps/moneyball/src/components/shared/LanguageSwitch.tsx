import Link from 'next/link';

interface LanguageSwitchProps {
  koHref: string;
  enHref: string;
  current: 'ko' | 'en';
  className?: string;
}

export function LanguageSwitch({ koHref, enHref, current, className = '' }: LanguageSwitchProps) {
  const linkClass =
    'px-2 py-1 rounded text-xs font-medium transition-colors border';
  const activeClass =
    'bg-brand-700 text-white border-brand-700 dark:bg-brand-100 dark:text-brand-900 dark:border-brand-100';
  const idleClass =
    'bg-white text-brand-700 border-brand-200 hover:border-brand-400 dark:bg-brand-950 dark:text-brand-100 dark:border-brand-800 dark:hover:border-brand-600';

  return (
    <div className={`inline-flex gap-1 ${className}`} aria-label="Language">
      <Link
        href={koHref}
        hrefLang="ko"
        aria-current={current === 'ko' ? 'page' : undefined}
        className={`${linkClass} ${current === 'ko' ? activeClass : idleClass}`}
      >
        한국어
      </Link>
      <Link
        href={enHref}
        hrefLang="en"
        aria-current={current === 'en' ? 'page' : undefined}
        className={`${linkClass} ${current === 'en' ? activeClass : idleClass}`}
      >
        English
      </Link>
    </div>
  );
}
