import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { KBO_TEAMS, type TeamCode } from '@moneyball/shared';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { SearchForm } from '@/components/shared/SearchForm';
import { TeamLogo } from '@/components/shared/TeamLogo';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const title = q ? `"${q}" 검색 결과` : '검색';
  return {
    title,
    description: 'MoneyBall Score — 팀, 선수, 경기 일자로 빠르게 찾아보세요.',
    robots: { index: false, follow: true },
  };
}

interface PlayerHit {
  id: number;
  name_ko: string;
  name_en: string | null;
  position: string | null;
  team: { code: string | null; name_ko: string | null } | null;
}

interface DateHit {
  game_date: string;
  count: number;
}

const TEAM_ENTRIES = Object.entries(KBO_TEAMS) as Array<
  [TeamCode, (typeof KBO_TEAMS)[TeamCode]]
>;

function matchTeams(q: string): TeamCode[] {
  const norm = q.trim().toLowerCase();
  if (!norm) return [];
  return TEAM_ENTRIES.filter(([code, t]) => {
    const haystack = `${code} ${t.name} ${t.stadium}`.toLowerCase();
    return haystack.includes(norm);
  }).map(([code]) => code);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PARTIAL_DATE_RE = /^\d{4}(-\d{2})?(-\d{2})?$/;

async function searchPlayers(q: string): Promise<PlayerHit[]> {
  if (q.length < 1) return [];
  const supabase = await createClient();
  const pattern = `%${q}%`;
  const { data } = await supabase
    .from('players')
    .select(
      'id, name_ko, name_en, position, team:teams!players_team_id_fkey(code, name_ko)',
    )
    .or(`name_ko.ilike.${pattern},name_en.ilike.${pattern}`)
    .limit(15);
  return (data ?? []) as unknown as PlayerHit[];
}

async function searchDates(q: string): Promise<DateHit[]> {
  if (!PARTIAL_DATE_RE.test(q)) return [];
  // games.game_date 는 Postgres date 컬럼 → ILIKE 미지원.
  // 입력 길이에 따라 정확/월/연 범위로 .gte+.lt 사용.
  let from: string;
  let to: string;
  if (/^\d{4}-\d{2}-\d{2}$/.test(q)) {
    // 정확 일자 — equality
    from = q;
    to = q;
  } else if (/^\d{4}-\d{2}$/.test(q)) {
    // YYYY-MM — 해당 월 1일 ~ 다음 월 1일 미만
    const [y, m] = q.split('-').map(Number);
    const firstOfNext = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    from = `${q}-01`;
    to = firstOfNext;
  } else if (/^\d{4}$/.test(q)) {
    // YYYY — 해당 년 1월 1일 ~ 다음 년 1월 1일 미만
    from = `${q}-01-01`;
    to = `${Number(q) + 1}-01-01`;
  } else {
    return [];
  }

  const supabase = await createClient();
  const query = supabase
    .from('games')
    .select('game_date')
    .order('game_date', { ascending: false })
    .limit(60);
  const { data: games } =
    from === to
      ? await query.eq('game_date', from)
      : await query.gte('game_date', from).lt('game_date', to);
  if (!games) return [];
  const counts = new Map<string, number>();
  for (const g of games as Array<{ game_date: string }>) {
    counts.set(g.game_date, (counts.get(g.game_date) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([game_date, count]) => ({ game_date, count }))
    .sort((a, b) => (a.game_date < b.game_date ? 1 : -1));
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? '').trim();

  const teamHits = q ? matchTeams(q) : [];
  const [playerHits, dateHits] = q
    ? await Promise.all([searchPlayers(q), searchDates(q)])
    : [[], []];

  const totalHits = teamHits.length + playerHits.length + dateHits.length;
  const isExactDate = ISO_DATE_RE.test(q);

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <Breadcrumb items={[{ label: '검색' }]} />

      <header className="space-y-3">
        <h1 className="text-3xl font-bold">검색</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          팀 이름, 선수 이름(한글/영문), 경기 일자(YYYY-MM-DD)로 검색하세요.
        </p>
      </header>

      <SearchForm initialQuery={q} />

      {q && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>"{q}"</strong> 검색 결과 — {totalHits}건
          {isExactDate && (
            <>
              {' · '}
              <Link
                href={`/predictions/${q}`}
                className="text-brand-600 hover:underline"
              >
                {q} 예측 페이지로 바로가기 →
              </Link>
            </>
          )}
        </p>
      )}

      {q && teamHits.length > 0 && (
        <section
          aria-labelledby="search-teams-title"
          className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
        >
          <h2 id="search-teams-title" className="text-lg font-bold mb-3">
            팀 ({teamHits.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {teamHits.map((code) => {
              const t = KBO_TEAMS[code];
              return (
                <Link
                  key={code}
                  href={`/teams/${code}`}
                  className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 hover:text-brand-600 transition-colors"
                >
                  <TeamLogo team={code} size={20} />
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                    {code}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {q && playerHits.length > 0 && (
        <section
          aria-labelledby="search-players-title"
          className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
        >
          <h2 id="search-players-title" className="text-lg font-bold mb-3">
            선수 ({playerHits.length})
          </h2>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {playerHits.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/players/${p.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:text-brand-600 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium truncate">{p.name_ko}</span>
                    {p.name_en && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {p.name_en}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs text-gray-500 dark:text-gray-400">
                    {p.team?.name_ko && <span>{p.team.name_ko}</span>}
                    {p.position && (
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                        {p.position}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {q && dateHits.length > 0 && (
        <section
          aria-labelledby="search-dates-title"
          className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
        >
          <h2 id="search-dates-title" className="text-lg font-bold mb-3">
            경기 일자 ({dateHits.length})
          </h2>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {dateHits.slice(0, 15).map((d) => (
              <li key={d.game_date}>
                <Link
                  href={`/predictions/${d.game_date}`}
                  className="flex items-center justify-between py-3 hover:text-brand-600 transition-colors"
                >
                  <span className="font-mono">{d.game_date}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {d.count}경기
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {q && totalHits === 0 && !isExactDate && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center text-gray-500 dark:text-gray-400">
          <p className="text-base">검색 결과가 없습니다.</p>
          <p className="text-xs mt-2">
            팀명(SS, LG, KIA 등), 선수 이름, 또는 YYYY-MM-DD 형식의 날짜를
            입력해보세요.
          </p>
        </section>
      )}

      {!q && (
        <section className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 text-sm text-gray-600 dark:text-gray-300 space-y-2">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200">
            검색 팁
          </h2>
          <ul className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <li>· 팀명: <code>SSG</code>, <code>LG</code>, <code>한화</code></li>
            <li>· 선수: <code>김광현</code>, <code>Kim</code></li>
            <li>· 날짜: <code>2026-04</code> (월별), <code>2026-04-19</code> (일자)</li>
          </ul>
        </section>
      )}
    </div>
  );
}
