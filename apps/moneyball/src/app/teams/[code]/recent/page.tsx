import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  KBO_TEAMS,
  type TeamCode,
  shortTeamName,
  assertSelectOk,
  CURRENT_SCORING_RULE,
} from '@moneyball/shared';
import { createClient } from '@/lib/supabase/server';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { EmptyState } from '@/components/shared/EmptyState';
import { RelatedLinks, type RelatedLink } from '@/components/shared/RelatedLinks';

// /teams/[code]/recent — 팀별 최근 10 final game + 우리 모델 예측 + 적중/실패.
// cycle 1021 (b8) — 사용자 가시 entry route 추가. CURRENT_SCORING_RULE filter
// (shadow row 제외, #1338 family). status='final' 만 표시 (예정 / 진행중 제외).

export const revalidate = 1800;

const SITE_URL = 'https://moneyballscore.vercel.app';
const RECENT_LIMIT = 10;

interface PageProps {
  params: Promise<{ code: string }>;
}

function isTeamCode(v: string): v is TeamCode {
  return v in KBO_TEAMS;
}

// KBO 10팀 모두 정적 빌드.
export function generateStaticParams(): { code: TeamCode }[] {
  return (Object.keys(KBO_TEAMS) as TeamCode[]).map((code) => ({ code }));
}

interface RecentGameRow {
  id: number;
  game_date: string;
  game_time: string | null;
  stadium: string | null;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: number | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_team: { id: number; code: string | null; name_ko: string | null } | null;
  away_team: { id: number; code: string | null; name_ko: string | null } | null;
  predictions: Array<{
    predicted_winner: number | null;
    confidence: number | null;
    is_correct: boolean | null;
    prediction_type: string;
    scoring_rule: string | null;
  }>;
}

interface RecentRow {
  gameId: number;
  gameDate: string;
  isHome: boolean;
  ourScore: number | null;
  opponentScore: number | null;
  opponentCode: TeamCode | null;
  opponentName: string;
  weWon: boolean | null;
  predictedAsWinner: boolean;
  confidence: number | null;
  isCorrect: boolean | null;
}

async function getRecentGames(code: TeamCode): Promise<RecentRow[]> {
  const supabase = await createClient();

  // teams.id 조회 (FK 매칭용)
  const teamResult = await supabase
    .from('teams')
    .select('id')
    .eq('code', code)
    .maybeSingle();
  const { data: teamRow } = assertSelectOk(teamResult, 'recent getRecentGames teams');
  const teamId = (teamRow as { id: number } | null)?.id ?? null;
  if (teamId == null) return [];

  // 최근 10 final game. predictions inner join → pre_game + CURRENT_SCORING_RULE
  // row 없는 game 제외 (shadow row #1338 family). assertSelectOk silent drift 감지.
  const gamesResult = await supabase
    .from('games')
    .select(
      `
        id, game_date, game_time, stadium, status,
        home_score, away_score, winner_team_id,
        home_team_id, away_team_id,
        home_team:teams!games_home_team_id_fkey(id, code, name_ko),
        away_team:teams!games_away_team_id_fkey(id, code, name_ko),
        predictions!inner(
          predicted_winner, confidence, is_correct,
          prediction_type, scoring_rule
        )
      `,
    )
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('status', 'final')
    .eq('predictions.prediction_type', 'pre_game')
    .eq('predictions.scoring_rule', CURRENT_SCORING_RULE)
    .order('game_date', { ascending: false })
    .order('game_time', { ascending: false })
    .limit(RECENT_LIMIT);

  const { data } = assertSelectOk(gamesResult, 'recent getRecentGames games');
  const games = (data ?? []) as unknown as RecentGameRow[];

  const rows: RecentRow[] = [];
  for (const g of games) {
    const pred = g.predictions?.[0];
    if (!pred) continue;

    const isHome = g.home_team_id === teamId;
    const opponent = isHome ? g.away_team : g.home_team;
    const opponentCode =
      opponent?.code && opponent.code in KBO_TEAMS
        ? (opponent.code as TeamCode)
        : null;
    const opponentName = opponentCode
      ? shortTeamName(opponentCode)
      : (opponent?.name_ko ?? '-');

    const ourScore = isHome ? g.home_score : g.away_score;
    const opponentScore = isHome ? g.away_score : g.home_score;
    const weWon =
      g.winner_team_id == null
        ? null
        : g.winner_team_id === teamId;
    const predictedAsWinner = pred.predicted_winner === teamId;

    rows.push({
      gameId: g.id,
      gameDate: g.game_date,
      isHome,
      ourScore,
      opponentScore,
      opponentCode,
      opponentName,
      weWon,
      predictedAsWinner,
      confidence: pred.confidence,
      isCorrect: pred.is_correct,
    });
  }

  return rows;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  if (!isTeamCode(code)) return {};
  const meta = KBO_TEAMS[code];
  const title = `${meta.name} 최근 10경기 예측 — KBO`;
  const description = `${meta.name} 최근 final 10경기에 대한 우리 모델 예측 + 적중/실패 + 스코어. 매 경기 클릭 시 팩터별 심층 분석으로 진입.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/teams/${code}/recent` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/teams/${code}/recent`,
      type: 'website',
      locale: 'ko_KR',
      siteName: 'MoneyBall Score',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function TeamRecentPage({ params }: PageProps) {
  const { code } = await params;
  if (!isTeamCode(code)) notFound();
  const meta = KBO_TEAMS[code];
  const teamName = shortTeamName(code);
  const rows = await getRecentGames(code);

  const verifiedRows = rows.filter((r) => r.isCorrect != null);
  const correctN = verifiedRows.filter((r) => r.isCorrect === true).length;
  const accuracyRate =
    verifiedRows.length > 0 ? Math.round((correctN / verifiedRows.length) * 100) : null;

  const related: RelatedLink[] = [
    { href: `/teams/${code}`, label: `${teamName} 팀 프로필`, hint: '시즌 종합' },
    { href: '/teams', label: '전체 팀', hint: 'KBO 10팀' },
    { href: '/predictions', label: '예측 hub', hint: '전체 카드 모음' },
    { href: '/calendar', label: '월별 캘린더', hint: '월별 적중률' },
  ];

  return (
    <article className="max-w-4xl mx-auto space-y-6 py-4">
      <Breadcrumb
        items={[
          { href: '/teams', label: '팀' },
          { href: `/teams/${code}`, label: teamName },
          { label: '최근 10경기' },
        ]}
      />

      <header className="space-y-3 border-b border-gray-200 dark:border-[var(--color-border)] pb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <TeamLogo team={code} size={36} className="shrink-0" />
          <h1 className="text-2xl md:text-3xl font-bold">
            {meta.name} 최근 10경기 예측
          </h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {rows.length > 0
            ? `최근 final ${rows.length}경기 예측 결과${
                accuracyRate !== null
                  ? ` · 적중률 ${accuracyRate}% (${correctN}/${verifiedRows.length})`
                  : ''
              }.`
            : `${teamName}의 최근 final 경기 + 모델 예측 데이터가 아직 없습니다.`}
        </p>
      </header>

      {rows.length > 0 ? (
        <section
          aria-labelledby="recent-table-title"
          className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 md:p-5"
        >
          <h2 id="recent-table-title" className="sr-only">
            {teamName} 최근 final 경기 예측 표
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[var(--color-border)] text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-3 font-medium">일자</th>
                  <th className="py-2 pr-3 font-medium">상대</th>
                  <th className="py-2 pr-3 font-medium text-center">홈/원정</th>
                  <th className="py-2 pr-3 font-medium text-right">스코어</th>
                  <th className="py-2 pr-3 font-medium text-right">실제</th>
                  <th className="py-2 pr-3 font-medium text-right">예측</th>
                  <th className="py-2 font-medium text-right">결과</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const resultClass =
                    r.isCorrect == null
                      ? 'text-gray-500 dark:text-gray-400'
                      : r.isCorrect
                        ? 'text-brand-600 dark:text-brand-400'
                        : 'text-red-600 dark:text-red-400';
                  const resultLabel =
                    r.isCorrect == null
                      ? '대기'
                      : r.isCorrect
                        ? '적중'
                        : '실패';
                  const resultAttr =
                    r.isCorrect == null
                      ? 'pending'
                      : r.isCorrect
                        ? 'correct'
                        : 'incorrect';
                  const realLabel =
                    r.weWon == null
                      ? '-'
                      : r.weWon
                        ? `${teamName} 승`
                        : `${r.opponentName} 승`;
                  const predLabel = r.predictedAsWinner
                    ? `${teamName} 승`
                    : `${r.opponentName} 승`;
                  const confPct =
                    r.confidence != null
                      ? Math.round((0.5 + r.confidence / 2) * 100)
                      : null;

                  return (
                    <tr
                      key={r.gameId}
                      data-recent-game-id={r.gameId}
                      data-recent-result={resultAttr}
                      className="border-b border-gray-100 dark:border-[var(--color-border)]"
                    >
                      <td className="py-2 pr-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        <Link
                          href={`/analysis/game/${r.gameId}`}
                          className="hover:text-brand-500"
                        >
                          {r.gameDate}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">
                        {r.opponentCode ? (
                          <Link
                            href={`/teams/${r.opponentCode}`}
                            className="inline-flex items-center gap-1.5 hover:text-brand-500"
                          >
                            <TeamLogo team={r.opponentCode} size={16} />
                            {r.opponentName}
                          </Link>
                        ) : (
                          <span>{r.opponentName}</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-center text-gray-600 dark:text-gray-300">
                        {r.isHome ? '홈' : '원정'}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">
                        {r.ourScore != null && r.opponentScore != null
                          ? `${r.ourScore} - ${r.opponentScore}`
                          : '-'}
                      </td>
                      <td className="py-2 pr-3 text-right text-xs text-gray-700 dark:text-gray-200">
                        {realLabel}
                      </td>
                      <td className="py-2 pr-3 text-right text-xs text-gray-700 dark:text-gray-200">
                        {predLabel}
                        {confPct != null && (
                          <span className="text-gray-400 dark:text-gray-500 ml-1">
                            ({confPct}%)
                          </span>
                        )}
                      </td>
                      <td className={`py-2 text-right text-xs font-medium ${resultClass}`}>
                        {resultLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <EmptyState
          icon="⚾"
          title={`${teamName}의 최근 final 경기 예측 데이터가 없습니다`}
          description="해당 팀의 final 경기 + 우리 모델 예측이 누적되면 자동 노출됩니다."
        />
      )}

      <RelatedLinks title="관련 페이지" items={related} />
    </article>
  );
}
