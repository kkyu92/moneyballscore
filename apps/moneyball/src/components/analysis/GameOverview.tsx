interface GameOverviewProps {
  tags: string[];
  summary: string;
}

const TAG_STYLES: Record<string, string> = {
  "투수전 예상":
    "bg-brand-500/10 text-brand-600 dark:text-brand-300 border-brand-500/30",
  "타격전 예상":
    "bg-[var(--color-away)]/10 text-[var(--color-away)] dark:text-[var(--color-away-light)] border-[var(--color-away)]/30",
  박빙:
    "bg-accent/10 text-accent dark:text-accent-light border-accent/30",
  "우세 뚜렷":
    "bg-gray-500/10 text-gray-700 dark:text-gray-200 border-gray-400/30",
};

/**
 * /analysis/game/[id] 헤더 직후에 놓이는 경기 개요 섹션.
 * 자동 분류 태그 + 1-2줄 요약으로 페이지 진입 즉시 "어떤 경기인가"를 전달.
 */
export function GameOverview({ tags, summary }: GameOverviewProps) {
  if (!summary && tags.length === 0) return null;

  return (
    <section
      aria-labelledby="game-overview-title"
      className="bg-gradient-to-r from-brand-500/5 to-accent/5 dark:from-brand-500/10 dark:to-accent/10 rounded-xl border border-brand-500/20 p-5 space-y-3"
    >
      <h2
        id="game-overview-title"
        className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2"
      >
        🎯 경기 개요
      </h2>
      {tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                TAG_STYLES[tag] ??
                "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200"
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <p className="text-base text-gray-800 dark:text-gray-100 leading-relaxed">
        {summary}
      </p>
    </section>
  );
}
