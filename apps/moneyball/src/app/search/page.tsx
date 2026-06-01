import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  KBO_TEAMS,
  assertSelectOk,
  type TeamCode,
  type SelectResult,
} from '@moneyball/shared';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { SearchClient, type SearchEntry } from '@/components/search/SearchClient';
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
  // assertSelectOk — cycle 155 silent drift family detection. players select
  // 가 .error 미체크 → DB 오류 시 data=null silent fallback → 빈 검색 결과
  // ("검색 결과가 없습니다") 가 사용자에게 노출 (실제로는 DB 오류, ilike pattern
  // 정상이어도 가시 X). cycle 152~154 family 자연 후속. nested FK select 의
  // PostgrestResponseSuccess 추론 (team:[] array) 우회 위해 SelectResult cast.
  const result = (await supabase
    .from('players')
    .select(
      'id, name_ko, name_en, position, team:teams!players_team_id_fkey(code, name_ko)',
    )
    .or(`name_ko.ilike.${pattern},name_en.ilike.${pattern}`)
    .limit(15)) as SelectResult<PlayerHit[]>;
  const { data } = assertSelectOk(result, 'search.players');
  return data ?? [];
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
  // assertSelectOk — cycle 155 silent drift family detection. games select 가
  // .error 미체크 → DB 오류 시 data=null silent fallback → 검색 일자 결과 0건
  // 위장 ("검색 결과가 없습니다") 가 사용자에게 노출 (실제로는 DB 오류, 정상
  // 일자 query 도 빈 결과로 위장). cycle 152~154 family 자연 후속.
  const result = (from === to
    ? await query.eq('game_date', from)
    : await query.gte('game_date', from).lt('game_date', to)) as SelectResult<
    Array<{ game_date: string }>
  >;
  const { data: games } = assertSelectOk(result, 'search.dates');
  if (!games) return [];
  const counts = new Map<string, number>();
  for (const g of games as Array<{ game_date: string }>) {
    counts.set(g.game_date, (counts.get(g.game_date) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([game_date, count]) => ({ game_date, count }))
    .sort((a, b) => (a.game_date < b.game_date ? 1 : -1));
}

// Static page entries surfaced in the fuzzy index. Kept short — pages that
// users commonly land on but might not bookmark by name.
const STATIC_PAGES: Array<{
  slug: string;
  label: string;
  meta?: string;
  keywords: string;
}> = [
  { slug: '/', label: '홈', keywords: 'home main 메인' },
  { slug: '/predictions', label: '오늘의 예측', meta: '오늘', keywords: 'predictions today 예측' },
  { slug: '/calendar', label: '월별 캘린더', keywords: 'calendar 캘린더 월별 경기 일정' },
  { slug: '/analysis', label: 'AI 분석', keywords: 'analysis 분석 ai-judge 에이전트 토론' },
  { slug: '/accuracy', label: '적중률', keywords: 'accuracy hit-rate 정확도' },
  { slug: '/accuracy/shadow', label: 'Shadow 적중률', keywords: 'accuracy shadow cohort v2.1-B brier delta 섀도우 적중률' },
  { slug: '/leaderboard', label: '리더보드', keywords: 'leaderboard ranking 순위' },
  { slug: '/standings', label: '팀 순위', keywords: 'standings team-ranking 팀 순위' },
  { slug: '/teams', label: '팀 목록', keywords: 'teams 팀목록' },
  { slug: '/players', label: '선수 목록', keywords: 'players 선수목록' },
  { slug: '/insights', label: '인사이트', keywords: 'insights 인사이트 ai-judge' },
  { slug: '/dashboard', label: '대시보드', keywords: 'dashboard 대시보드 stats' },
  { slug: '/v2-preview', label: 'v2 미리보기', keywords: 'v2 preview 시뮬레이션 미리보기 가중치' },
  { slug: '/v2-shadow-monitor', label: 'v2 섀도우 모니터', keywords: 'v2 shadow monitor 섀도우 모니터' },
  { slug: '/methodology', label: '방법론', keywords: 'methodology 방법론 모델' },
  { slug: '/glossary', label: '용어집', keywords: 'glossary 용어집 fip woba war' },
  { slug: '/about', label: 'About', keywords: 'about 소개' },
  { slug: '/changelog', label: '변경 기록', keywords: 'changelog 변경 release' },
  { slug: '/contact', label: '문의', keywords: 'contact 문의' },
  { slug: '/picks', label: 'My Picks', keywords: 'picks my-picks 내픽' },
  { slug: '/guide', label: '사용 가이드', keywords: 'guide 가이드 howto 도움말' },
  { slug: '/matchup', label: '매치업', keywords: 'matchup 매치업 vs 대결' },
  { slug: '/reviews', label: '예측 리뷰', keywords: 'reviews 리뷰 review' },
  { slug: '/reviews/misses', label: '빗나간 예측', keywords: 'reviews misses 빗나간 회고 misses 틀린' },
  { slug: '/seasons', label: '시즌 history', keywords: 'seasons 시즌 history' },
  { slug: '/mlb', label: 'MLB', keywords: 'mlb 메이저리그 majorleague baseball' },
  { slug: '/mlb/standings', label: 'MLB 순위', keywords: 'mlb standings al nl division 순위' },
  { slug: '/mlb/team', label: 'MLB 팀', keywords: 'mlb team teams 30팀 메이저리그' },
  { slug: '/mlb/players', label: 'MLB Statcast', keywords: 'mlb statcast players xwoba barrel launch angle' },
  { slug: '/mlb/factors', label: 'MLB 14팩터', keywords: 'mlb factors 14팩터 가중치 statcast' },
  { slug: '/mlb/wild-card', label: 'MLB Wild Card', keywords: 'mlb wild-card wildcard race' },
  { slug: '/mlb/postseason', label: 'MLB Postseason', keywords: 'mlb postseason ws lcs ds bracket' },
  { slug: '/lotto/methodology', label: '로또 통계', keywords: 'lotto 로또 stats 통계' },
  { slug: '/lotto/archive', label: '로또 아카이브', keywords: 'lotto archive 아카이브 회차 통계' },
  { slug: '/privacy', label: '개인정보처리방침', keywords: 'privacy 개인정보 처리방침 legal' },
  { slug: '/terms', label: '이용약관', keywords: 'terms 이용약관 legal' },
];

async function buildSearchIndex(): Promise<SearchEntry[]> {
  const entries: SearchEntry[] = [];

  // 1) Teams — 10 fixed.
  for (const [code, t] of TEAM_ENTRIES) {
    entries.push({
      kind: 'team',
      id: `team:${code}`,
      label: t.name,
      sub: code,
      meta: t.stadium,
      href: `/teams/${code}`,
      teamCode: code,
      haystack: `${code} ${t.name} ${t.stadium}`.toLowerCase(),
    });
  }

  // 2) Static pages.
  for (const p of STATIC_PAGES) {
    entries.push({
      kind: 'page',
      id: `page:${p.slug}`,
      label: p.label,
      sub: null,
      meta: p.meta ?? p.slug,
      href: p.slug,
      haystack: `${p.label} ${p.keywords} ${p.slug}`.toLowerCase(),
    });
  }

  // 3) Players — top N by `id` (proxy for recency). assertSelectOk for
  //    silent-drift detection (cycle 155 family).
  try {
    const supabase = await createClient();
    const playersResult = (await supabase
      .from('players')
      .select('id, name_ko, name_en, position, team:teams!players_team_id_fkey(code, name_ko)')
      .order('id', { ascending: false })
      .limit(200)) as SelectResult<PlayerHit[]>;
    const { data: players } = assertSelectOk(playersResult, 'search.index.players');
    if (players) {
      for (const p of players) {
        const teamLabel = p.team?.name_ko ?? '';
        entries.push({
          kind: 'player',
          id: `player:${p.id}`,
          label: p.name_ko,
          sub: p.name_en ?? null,
          meta: [teamLabel, p.position].filter(Boolean).join(' · ') || null,
          href: `/players/${p.id}`,
          haystack: `${p.name_ko} ${p.name_en ?? ''} ${teamLabel} ${p.position ?? ''}`.toLowerCase(),
        });
      }
    }
  } catch {
    // Index population is best-effort — silent fallback if DB unreachable.
  }

  // 4) Recent game dates — last 30 distinct (within 90 day window).
  try {
    const supabase = await createClient();
    const today = new Date();
    const since = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const datesResult = (await supabase
      .from('games')
      .select('game_date')
      .gte('game_date', since)
      .order('game_date', { ascending: false })
      .limit(200)) as SelectResult<Array<{ game_date: string }>>;
    const { data: dates } = assertSelectOk(datesResult, 'search.index.dates');
    if (dates) {
      const seen = new Set<string>();
      for (const row of dates) {
        if (seen.has(row.game_date)) continue;
        seen.add(row.game_date);
        if (seen.size > 30) break;
        entries.push({
          kind: 'date',
          id: `date:${row.game_date}`,
          label: row.game_date,
          sub: null,
          meta: '예측 페이지',
          href: `/predictions/${row.game_date}`,
          haystack: `${row.game_date} ${row.game_date.replace(/-/g, '')}`.toLowerCase(),
        });
      }
    }
  } catch {
    // best-effort
  }

  return entries;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? '').trim();

  const [searchIndex, teamHits, playerHits, dateHits] = await Promise.all([
    buildSearchIndex(),
    Promise.resolve(q ? matchTeams(q) : []),
    q ? searchPlayers(q) : Promise.resolve<PlayerHit[]>([]),
    q ? searchDates(q) : Promise.resolve<DateHit[]>([]),
  ]);

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

      <SearchClient entries={searchIndex} initialQuery={q} />

      {q && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>“{q}”</strong> 검색 결과 — {totalHits}건
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
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[var(--color-surface-card)]">
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
        <section className="bg-gray-50 dark:bg-[var(--color-surface-card)]/50 rounded-xl p-6 text-sm text-gray-600 dark:text-gray-300 space-y-2">
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
