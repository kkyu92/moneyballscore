/**
 * Insights 시리즈 — 동일 team-pair 의 예측 reasoning 시계열 archive.
 *
 * 토픽 slug 형식: `<code1>-vs-<code2>` (소문자, alphabetic sort 후 join — 양방향 dedup).
 * 예: `ht-vs-lg` = KIA vs LG (양방향 동일 slug).
 *
 * 본 모듈은:
 * - parseSeriesTopic / formatSeriesTopic — slug ↔ team-pair 변환
 * - getSeriesByTopic — DB 조회 (chronological)
 * - listSeriesTopics — sitemap 용 모든 45 pair slug
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { KBO_TEAMS, assertSelectOk, INSIGHTS_SERIES_LIMIT, type TeamCode } from "@moneyball/shared";
import { presentJudgeReasoningWithFallback } from "@/lib/predictions/judgeReasoning";

const TEAM_CODES = Object.keys(KBO_TEAMS) as TeamCode[];
const TEAM_CODE_SET = new Set<string>(TEAM_CODES.map((c) => c.toLowerCase()));

export interface SeriesTopic {
  team1: TeamCode;
  team2: TeamCode;
  slug: string;
}

export interface SeriesEntry {
  gameId: number;
  date: string;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  status: string;
  isCorrect: boolean | null;
  reasoningText: string;
  isFallback: boolean;
  homeWinProb: number | null;
}

/** alphabetic-sorted canonical slug 생성. */
export function formatSeriesTopic(a: TeamCode, b: TeamCode): string {
  const [first, second] = [a.toLowerCase(), b.toLowerCase()].sort();
  return `${first}-vs-${second}`;
}

/** slug → SeriesTopic. invalid 시 null. */
export function parseSeriesTopic(slug: string): SeriesTopic | null {
  if (typeof slug !== "string") return null;
  const lower = slug.toLowerCase();
  const match = lower.match(/^([a-z]{2})-vs-([a-z]{2})$/);
  if (!match) return null;
  const [, a, b] = match;
  if (!TEAM_CODE_SET.has(a) || !TEAM_CODE_SET.has(b) || a === b) return null;
  // canonical = alphabetic sort
  const [first, second] = [a, b].sort();
  if (`${a}-vs-${b}` !== `${first}-vs-${second}`) {
    // non-canonical order — invalid (caller redirects to canonical)
    return null;
  }
  // upcase to TeamCode form
  const team1 = TEAM_CODES.find((c) => c.toLowerCase() === first)!;
  const team2 = TEAM_CODES.find((c) => c.toLowerCase() === second)!;
  return { team1, team2, slug: `${first}-vs-${second}` };
}

/** 45개 모든 team-pair slug (canonical) — sitemap 용.
 *  team1/team2 는 slug 의 alphabetic 순서와 일치 (parseSeriesTopic round-trip 보장). */
export function listSeriesTopics(): SeriesTopic[] {
  const out: SeriesTopic[] = [];
  for (let i = 0; i < TEAM_CODES.length; i++) {
    for (let j = i + 1; j < TEAM_CODES.length; j++) {
      const a = TEAM_CODES[i];
      const b = TEAM_CODES[j];
      const slug = formatSeriesTopic(a, b);
      // slug 안 alphabetic 순서로 team1/team2 재정렬
      const [firstLower, secondLower] = slug.split("-vs-");
      const team1 = TEAM_CODES.find((c) => c.toLowerCase() === firstLower)!;
      const team2 = TEAM_CODES.find((c) => c.toLowerCase() === secondLower)!;
      out.push({ team1, team2, slug });
    }
  }
  return out;
}

function createSeriesClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

interface SeriesGameRow {
  id: number;
  game_date: string;
  status: string;
  home_team: { code: string } | { code: string }[] | null;
  away_team: { code: string } | { code: string }[] | null;
}

interface Verdict {
  reasoning?: string;
  homeWinProb?: number;
}
interface ReasoningShape {
  debate?: { verdict?: Verdict };
}

function extractCode(field: SeriesGameRow["home_team"]): string | null {
  if (!field) return null;
  const obj = Array.isArray(field) ? field[0] : field;
  return obj?.code ?? null;
}

/** topic 의 모든 예측 — 최신순. */
export async function getSeriesByTopic(
  topic: SeriesTopic,
  limit = INSIGHTS_SERIES_LIMIT,
): Promise<SeriesEntry[]> {
  const supabase = createSeriesClient();
  const result = await supabase
    .from("predictions")
    .select(
      "is_correct, reasoning, prediction_type, created_at, games!inner(id, game_date, status, home_team:teams!games_home_team_id_fkey(code), away_team:teams!games_away_team_id_fkey(code))",
    )
    .eq("prediction_type", "pre_game")
    .order("created_at", { ascending: false })
    .limit(limit * 3);
  const { data } = assertSelectOk(result, "series.getSeriesByTopic");
  if (!data) return [];

  const out: SeriesEntry[] = [];
  const seen = new Set<number>();
  for (const row of data) {
    const r = row.reasoning as ReasoningShape | null;
    const verdict = r?.debate?.verdict;
    const presented = presentJudgeReasoningWithFallback(verdict?.reasoning);
    if (!presented) continue;
    const gamesField = row.games as unknown as
      | SeriesGameRow
      | SeriesGameRow[]
      | null;
    const game = Array.isArray(gamesField) ? gamesField[0] : gamesField;
    if (!game || seen.has(game.id)) continue;
    const homeCode = extractCode(game.home_team);
    const awayCode = extractCode(game.away_team);
    if (!homeCode || !awayCode) continue;
    // pair 일치 검사
    const pair = new Set([homeCode, awayCode]);
    if (!pair.has(topic.team1) || !pair.has(topic.team2)) continue;
    seen.add(game.id);
    out.push({
      gameId: game.id,
      date: game.game_date,
      homeTeam: homeCode as TeamCode,
      awayTeam: awayCode as TeamCode,
      status: game.status,
      isCorrect: row.is_correct,
      reasoningText: presented.text,
      isFallback: presented.isFallback,
      homeWinProb: verdict?.homeWinProb ?? null,
    });
    if (out.length >= limit) break;
  }
  return out;
}
