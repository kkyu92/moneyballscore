import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { SITE_URL, MLB_SCORING_RULE, normalizeMlbTeamCode, assertSelectOk, TOP_PICK_CONF_MIN, confToWinProb } from "@moneyball/shared";

// Same threshold as KBO predictions/[date] "top pick" (topPick) — win% form
// of confToWinProb(TOP_PICK_CONF_MIN) (parity, cycle 2131 follow-up).
const TOP_PICK_MIN_WIN_PCT = Math.round(confToWinProb(TOP_PICK_CONF_MIN) * 100);
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 1800; // MLB_LIVE_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  const title = `MLB Games — ${date} Predictions | MoneyBall Score`;
  const description = `${date} MLB game predictions using ${MLB_FACTOR_COUNTS.total}-factor analysis + confidence scores.`;
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/en/mlb/games/${date}`,
      languages: { en: `${SITE_URL}/en/mlb/games/${date}`, ko: `${SITE_URL}/mlb/games/${date}` },
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "MoneyBall Score",
      title,
      description,
      url: `${SITE_URL}/en/mlb/games/${date}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

interface PredictionRow {
  external_game_id: string;
  homeCode: string;
  awayCode: string;
  winnerCode: string;
  conf: number;
}

// MLB predictions have game_id=NULL (migration 038) — games!inner join is
// KBO-only and always mismatches (silent empty list, cycle 2114 fix-incident).
// Query predictions by mlb_game_date, then join mlb_schedule for team codes
// (same 2-step pattern as the detail page/sitemap, silent drift family fix
// cycle 1168).
async function getMlbGamesForDate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  date: string,
): Promise<PredictionRow[]> {
  const predResult = await supabase
    .from('predictions')
    .select('external_game_id, home_win_prob')
    .eq('league', 'mlb')
    .eq('scoring_rule', MLB_SCORING_RULE)
    .eq('mlb_game_date', date)
    .order('external_game_id', { ascending: true });
  const { data: preds } = assertSelectOk(predResult, 'MlbGamesEn predictions');
  if (!preds || preds.length === 0) return [];

  const gameIds = preds.map((p) => p.external_game_id);
  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('external_game_id, home_team_code, away_team_code')
    .in('external_game_id', gameIds);
  const { data: schedules } = assertSelectOk(scheduleResult, 'MlbGamesEn schedule');
  const scheduleByGameId = new Map((schedules ?? []).map((s) => [s.external_game_id, s]));

  const rows: PredictionRow[] = [];
  for (const p of preds) {
    const schedule = scheduleByGameId.get(p.external_game_id);
    const homeCode = schedule ? normalizeMlbTeamCode(schedule.home_team_code) : null;
    const awayCode = schedule ? normalizeMlbTeamCode(schedule.away_team_code) : null;
    if (!homeCode || !awayCode) continue;
    const homeWinProb = p.home_win_prob ?? 0.5;
    rows.push({
      external_game_id: p.external_game_id,
      homeCode,
      awayCode,
      winnerCode: homeWinProb >= 0.5 ? homeCode : awayCode,
      conf: Math.round((homeWinProb >= 0.5 ? homeWinProb : 1 - homeWinProb) * 100),
    });
  }
  return rows;
}

export default async function MlbGamesEn({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^20[2-9]\d-\d{2}-\d{2}$/.test(date)) notFound();

  const supabase = await createClient();
  const rows = await getMlbGamesForDate(supabase, date);
  const topPick = rows
    .filter((p) => p.conf > TOP_PICK_MIN_WIN_PCT)
    .sort((a, b) => b.conf - a.conf)[0];

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumb items={[
        { label: 'MLB Analysis', href: '/en/mlb' },
        { label: date },
      ]} locale="en" />

      <h1 className="text-2xl md:text-3xl font-bold text-brand-700 dark:text-brand-100">
        MLB Games — {date}
      </h1>

      {topPick && (
        <a
          href={`#pick-${topPick.external_game_id}`}
          className="inline-flex items-center gap-2 rounded-md border border-brand-400 dark:border-brand-600 bg-brand-50 dark:bg-brand-950/50 px-3 py-1.5 text-sm text-brand-700 dark:text-brand-200 hover:border-brand-500 transition-colors"
        >
          Top pick — {topPick.winnerCode} {topPick.conf}% jump to ↓
        </a>
      )}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/50 p-6 space-y-3">
          <p className="text-brand-600 dark:text-brand-300">No MLB games found for this date.</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/en/mlb"
              className="inline-flex items-center gap-1 rounded-md border border-brand-300 dark:border-brand-700 px-3 py-1.5 text-sm hover:border-brand-500 transition-colors"
            >
              MLB Analysis Hub
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-md border border-brand-300 dark:border-brand-700 px-3 py-1.5 text-sm hover:border-brand-500 transition-colors"
            >
              Today&apos;s KBO Analysis
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const isTopPick = p.external_game_id === topPick?.external_game_id;
            return (
              <li
                key={p.external_game_id}
                id={`pick-${p.external_game_id}`}
                className={`rounded-lg border p-4 transition-colors ${
                  isTopPick
                    ? 'border-brand-500 dark:border-brand-400 ring-1 ring-brand-400 dark:ring-brand-500'
                    : 'border-brand-200 dark:border-brand-800 hover:border-brand-400'
                }`}
              >
                <Link href={`/en/mlb/games/${date}/${p.homeCode}-vs-${p.awayCode}`} className="flex items-center justify-between">
                  <span className="font-semibold">
                    {isTopPick && <span className="mr-1.5" aria-label="top pick">⭐</span>}
                    {p.homeCode} vs {p.awayCode}
                  </span>
                  <span className="text-sm text-brand-600 dark:text-brand-300">
                    {p.winnerCode} {p.conf}%
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
