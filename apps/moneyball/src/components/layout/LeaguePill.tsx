import Link from "next/link";

interface LeaguePillProps {
  activeLeague: 'kbo' | 'mlb';
}

export function LeaguePill({ activeLeague }: LeaguePillProps) {
  return (
    <div
      className="bg-brand-900 dark:bg-brand-950 rounded-full p-0.5 flex gap-0.5 text-xs"
      role="navigation"
      aria-label="League switcher"
    >
      <Link
        href="/"
        aria-current={activeLeague === 'kbo' ? 'page' : undefined}
        className={`px-3 py-1 rounded-full transition-colors ${
          activeLeague === 'kbo'
            ? 'bg-accent text-brand-900 font-bold'
            : 'text-brand-300 hover:text-white'
        }`}
      >
        KBO
      </Link>
      <Link
        href="/mlb"
        aria-current={activeLeague === 'mlb' ? 'page' : undefined}
        className={`px-3 py-1 rounded-full transition-colors ${
          activeLeague === 'mlb'
            ? 'bg-red-600 text-white font-bold'
            : 'text-brand-300 hover:text-white'
        }`}
      >
        MLB
      </Link>
    </div>
  );
}
