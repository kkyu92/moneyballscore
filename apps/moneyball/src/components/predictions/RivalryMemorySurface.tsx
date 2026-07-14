/**
 * RivalryMemorySurface — agent_memories 테이블 matchup memory 카드 (max 3).
 *
 * source: agent_memories (mig 006) — schema:
 *   team_code VARCHAR(5), memory_type VARCHAR(20), content TEXT,
 *   confidence DECIMAL(3,2), valid_until DATE
 *
 * query: memory_type='matchup' AND team_code IN (home, away) AND valid_until>=now()
 *        ORDER BY confidence DESC LIMIT 3
 *
 * 본 component = server component (async). 사용자 가시 텍스트는 dev jargon 회피
 * (CLAUDE.md MEMORY: feedback_ui_copy_no_dev_jargon).
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import { KBO_TEAMS, shortTeamName, type TeamCode, RIVALRY_MEMORY_LIMIT } from "@moneyball/shared";

export interface MatchupMemory {
  teamCode: TeamCode;
  content: string;
  confidence: number;
  validUntil: string | null;
}

interface Props {
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  /** override date (YYYY-MM-DD), default = today UTC slice */
  asOfDate?: string;
  /** override memories (테스트 / SSR 외 mock) */
  memories?: MatchupMemory[];
  /** max cards (default 3) */
  limit?: number;
}

function createMemoryClient() {
  // 공개 RLS — anon key 로 SELECT 가능 (mig 006 "Public read agent_memories").
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

interface MemoryRow {
  team_code: string;
  content: string;
  confidence: number;
  valid_until: string | null;
}

export async function fetchMatchupMemories(
  homeTeam: TeamCode,
  awayTeam: TeamCode,
  asOfDate: string,
  limit = RIVALRY_MEMORY_LIMIT,
): Promise<MatchupMemory[]> {
  try {
    const supabase = createMemoryClient();
    const { data, error } = await supabase
      .from("agent_memories")
      .select("team_code, content, confidence, valid_until")
      .eq("memory_type", "matchup")
      .in("team_code", [homeTeam, awayTeam])
      .or(`valid_until.is.null,valid_until.gte.${asOfDate}`)
      .order("confidence", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[RivalryMemorySurface] fetch failed:", error.message);
      Sentry.captureException(new Error(error.message), {
        tags: { silent_drift_family: 'wave_173', component: 'RivalryMemorySurface', op: 'fetchMatchupMemories.query' },
      });
      return [];
    }
    if (!data) return [];

    return (data as MemoryRow[]).map((row) => ({
      teamCode: row.team_code as TeamCode,
      content: row.content,
      confidence: Number(row.confidence ?? 0.5),
      validUntil: row.valid_until,
    }));
  } catch (err) {
    console.warn("[RivalryMemorySurface] query exception:", err);
    Sentry.captureException(err, {
      tags: { silent_drift_family: 'wave_173', component: 'RivalryMemorySurface', op: 'fetchMatchupMemories.exception' },
    });
    return [];
  }
}

export async function RivalryMemorySurface({
  homeTeam,
  awayTeam,
  asOfDate,
  memories: memoriesProp,
  limit = RIVALRY_MEMORY_LIMIT,
}: Props) {
  const asOf = asOfDate ?? new Date().toISOString().slice(0, 10);
  const memories =
    memoriesProp ?? (await fetchMatchupMemories(homeTeam, awayTeam, asOf, limit));

  if (memories.length === 0) {
    return null; // 메모리 없으면 섹션 자체 hide (silent — empty state UI 노출 X)
  }

  const homeName = shortTeamName(homeTeam);
  const awayName = shortTeamName(awayTeam);

  return (
    <section
      aria-labelledby="rivalry-memory-heading"
      data-testid="rivalry-memory-surface"
      className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
    >
      <h3
        id="rivalry-memory-heading"
        className="text-lg font-bold text-brand-700 dark:text-brand-100 mb-1"
      >
        라이벌리 메모리
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        {awayName} vs {homeName} — AI 에이전트가 과거 경기에서 학습한 매치업 패턴 (상위 {memories.length}건).
      </p>
      <ol className="space-y-3">
        {memories.map((m, idx) => {
          const teamName = KBO_TEAMS[m.teamCode]?.name ?? m.teamCode;
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
                    m.teamCode === homeTeam
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
                  <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                    신뢰도 {confidencePct}%
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
