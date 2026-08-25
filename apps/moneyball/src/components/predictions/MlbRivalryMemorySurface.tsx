import { mlbShortTeamName, MLB_TEAMS, RIVALRY_MEMORY_LIMIT, type MlbTeamCode } from "@moneyball/shared";
import { fetchMatchupMemories } from "./RivalryMemorySurface";

interface Props {
  homeTeam: MlbTeamCode;
  awayTeam: MlbTeamCode;
  /** override date (YYYY-MM-DD), default = today UTC slice */
  asOfDate?: string;
  /** max cards (default 3) */
  limit?: number;
  locale?: "ko" | "en";
}

/**
 * KBO `RivalryMemorySurface` 의 MLB parity — 같은 `agent_memories` 테이블을
 * `league='mlb'` 로 읽음(fetchMatchupMemories 재사용). display-only(예측 모델에
 * feedback 없음) 이라 plan #25 Phase 3 quant-only 게이트와 무관.
 */
export async function MlbRivalryMemorySurface({
  homeTeam,
  awayTeam,
  asOfDate,
  limit = RIVALRY_MEMORY_LIMIT,
  locale = "ko",
}: Props) {
  const asOf = asOfDate ?? new Date().toISOString().slice(0, 10);
  const memories = await fetchMatchupMemories(homeTeam, awayTeam, asOf, limit, "mlb");

  if (memories.length === 0) {
    return null; // 메모리 없으면 섹션 자체 hide (silent — empty state UI 노출 X)
  }

  const isEn = locale === "en";
  const homeName = mlbShortTeamName(homeTeam);
  const awayName = mlbShortTeamName(awayTeam);

  return (
    <section
      aria-labelledby="mlb-rivalry-memory-heading"
      data-testid="mlb-rivalry-memory-surface"
      className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
    >
      <h3
        id="mlb-rivalry-memory-heading"
        className="text-lg font-bold text-brand-700 dark:text-brand-100 mb-1"
      >
        {isEn ? "Rivalry Memory" : "라이벌리 메모리"}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        {isEn
          ? `${awayName} vs ${homeName} — matchup patterns our AI agent learned from past games (top ${memories.length}).`
          : `${awayName} vs ${homeName} — AI 에이전트가 과거 경기에서 학습한 매치업 패턴 (상위 ${memories.length}건).`}
      </p>
      <ol className="space-y-3">
        {memories.map((m, idx) => {
          // fetchMatchupMemories 는 KBO TeamCode 로 타입 고정 — league='mlb' 필터로
          // 실제 값은 MLB 코드. 공유 함수 재사용 트레이드오프(제네릭화는 스코프 밖).
          const teamCode = m.teamCode as unknown as MlbTeamCode;
          const teamName = MLB_TEAMS[teamCode]?.name ?? m.teamCode;
          const confidencePct = Math.round(m.confidence * 100);
          return (
            <li
              key={`${m.teamCode}-${idx}`}
              data-team={m.teamCode}
              className="flex gap-3 rounded-lg bg-gray-50 dark:bg-[var(--color-surface)] p-3"
            >
              <div className="shrink-0">
                <span
                  className={`inline-block w-2 h-2 rounded-full mt-2 ${
                    teamCode === homeTeam
                      ? "bg-brand-500"
                      : "bg-[var(--color-away)]"
                  }`}
                  aria-hidden
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    {teamName}
                  </span>
                  <span className="text-2xs font-mono text-gray-400 dark:text-gray-500">
                    {isEn ? `confidence ${confidencePct}%` : `신뢰도 ${confidencePct}%`}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                  {m.content}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
