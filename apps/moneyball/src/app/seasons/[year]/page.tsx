import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { shortTeamName } from "@moneyball/shared";
import { buildSeasonSummary } from "@/lib/seasons/buildSeasonSummary";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TeamLogo } from "@/components/shared/TeamLogo";

export const revalidate = 3600; // 1시간

interface PageProps {
  params: Promise<{ year: string }>;
}

const SITE_URL = "https://moneyballscore.vercel.app";
const SUPPORTED_YEARS = [2023, 2024, 2025];

export function generateStaticParams() {
  return SUPPORTED_YEARS.map((y) => ({ year: String(y) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year } = await params;
  const y = parseInt(year, 10);
  if (!SUPPORTED_YEARS.includes(y)) return {};
  const title = `${y} KBO 시즌 리뷰`;
  const description = `${y} KBO 정규시즌 전체 요약 — 팀 순위, 월별 득점 추이, 극값 경기. 백필된 실측 데이터 기반.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/seasons/${y}` },
    openGraph: {
      title, description,
      url: `${SITE_URL}/seasons/${y}`,
      type: "article",
      locale: "ko_KR",
      siteName: "MoneyBall Score",
    },
    twitter: { card: "summary", title, description },
  };
}

function fmtPct(v: number, digits = 1): string {
  return (v * 100).toFixed(digits) + "%";
}

function fmtNum(v: number, digits = 2): string {
  return v.toFixed(digits);
}

const MONTH_KO = ["", "1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

export default async function SeasonPage({ params }: PageProps) {
  const { year } = await params;
  const y = parseInt(year, 10);
  if (!SUPPORTED_YEARS.includes(y)) notFound();

  const summary = await buildSeasonSummary(y);
  if (!summary) notFound();

  // 월별 차트 max 계산 (bar 폭 정규화)
  const maxMonthRuns = Math.max(1, ...summary.byMonth.map((m) => m.avgRuns));
  const maxMonthN = Math.max(1, ...summary.byMonth.map((m) => m.n));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <Breadcrumb items={[{ label: "시즌 리뷰", href: "/seasons" }, { label: `${y}` }]} />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{y} KBO 시즌 리뷰</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          정규시즌 + 포스트시즌 전체 경기 실측 데이터 요약. 무승부 제외 승률 기준 팀 정렬.
        </p>
      </header>

      {/* 우승팀 + 한국시리즈 */}
      {summary.championship && (
        <section className="bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/40 dark:to-brand-800/30 rounded-xl border border-brand-200 dark:border-brand-700 p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🏆</div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                {y} 한국시리즈 챔피언
              </p>
              <div className="flex items-center gap-3 mt-1">
                <TeamLogo team={summary.championship.winnerCode} size={40} />
                <Link href={`/teams/${summary.championship.winnerCode}`} className="text-2xl font-bold hover:underline">
                  {summary.championship.winnerName}
                </Link>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                  vs {summary.championship.loserName} · <span className="font-semibold">{summary.championship.score}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-[var(--color-surface-card)]/70 rounded-lg p-3">
            <p className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">
              한국시리즈 {summary.championship.games.length}경기
            </p>
            <ul className="space-y-1 text-sm">
              {summary.championship.games.map((g, idx) => {
                const winnerHome = g.homeScore > g.awayScore;
                return (
                  <li key={g.id} className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-gray-400 w-16">{idx + 1}차전</span>
                    <span className="text-gray-500 w-20">{g.date.slice(5)}</span>
                    <span className="text-gray-500 w-12">{g.stadium ?? ''}</span>
                    <span className={winnerHome ? 'text-gray-400' : 'font-semibold'}>
                      {shortTeamName(g.awayCode as never) ?? g.awayCode} {g.awayScore}
                    </span>
                    <span className="text-gray-300">-</span>
                    <span className={winnerHome ? 'font-semibold' : 'text-gray-400'}>
                      {g.homeScore} {shortTeamName(g.homeCode as never) ?? g.homeCode}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* 시즌 개요 */}
      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
        <h2 className="text-lg font-bold">시즌 개요</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="총 경기" value={`${summary.totalGames}`} />
          <Stat label="성사 (final)" value={`${summary.finalGames}`} suffix={`우천취소 ${summary.postponedGames}`} />
          <Stat label="평균 총득점" value={fmtNum(summary.leagueAvgRuns)} suffix="경기당 양팀 합" />
          <Stat label="홈 승률" value={fmtPct(summary.leagueHomeWinRate)} suffix={`N=${summary.decidedGames} · 무승부 ${summary.draws}`} />
        </div>
      </section>

      {/* 팀 순위 */}
      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
        <h2 className="text-lg font-bold">팀 순위 — 승률</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[var(--color-border)]">
              <th className="py-2 pr-2 font-medium text-center w-8">#</th>
              <th className="py-2 pr-3 font-medium">팀</th>
              <th className="py-2 pr-3 font-medium text-right">경기</th>
              <th className="py-2 pr-3 font-medium text-right">승</th>
              <th className="py-2 pr-3 font-medium text-right">패</th>
              <th className="py-2 pr-3 font-medium text-right">무</th>
              <th className="py-2 pr-3 font-medium text-right">승률</th>
              <th className="py-2 pr-3 font-medium text-right">득점</th>
              <th className="py-2 pr-3 font-medium text-right">실점</th>
              <th className="py-2 font-medium text-right">득실</th>
            </tr>
          </thead>
          <tbody>
            {summary.teams.map((t, idx) => (
              <tr key={t.code} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 text-center text-gray-400 font-mono">{idx + 1}</td>
                <td className="py-2 pr-3">
                  <Link href={`/teams/${t.code}`} className="flex items-center gap-2 hover:underline">
                    <TeamLogo team={t.code} size={24} />
                    <span className="font-medium">{shortTeamName(t.code) ?? t.name}</span>
                  </Link>
                </td>
                <td className="py-2 pr-3 text-right font-mono">{t.games}</td>
                <td className="py-2 pr-3 text-right font-mono">{t.wins}</td>
                <td className="py-2 pr-3 text-right font-mono">{t.losses}</td>
                <td className="py-2 pr-3 text-right font-mono text-gray-500">{t.draws}</td>
                <td className="py-2 pr-3 text-right font-mono font-semibold">{fmtPct(t.winPct, 3)}</td>
                <td className="py-2 pr-3 text-right font-mono">{t.runsScored}</td>
                <td className="py-2 pr-3 text-right font-mono">{t.runsAllowed}</td>
                <td className={`py-2 text-right font-mono ${t.runDiff > 0 ? "text-brand-600" : t.runDiff < 0 ? "text-red-600" : ""}`}>
                  {t.runDiff > 0 ? "+" : ""}{t.runDiff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 월별 득점 추이 */}
      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
        <h2 className="text-lg font-bold">월별 평균 득점</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          경기당 양팀 합산 득점. bar 폭은 시즌 최대 월 대비 비율.
        </p>
        <div className="space-y-2">
          {summary.byMonth.map((m) => {
            const widthPct = (m.avgRuns / maxMonthRuns) * 100;
            const sampleWeight = m.n / maxMonthN;
            return (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs font-medium w-12 text-gray-700 dark:text-gray-300">{MONTH_KO[m.month]}</span>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-[var(--color-surface)] rounded overflow-hidden">
                  <div
                    className="h-full bg-brand-500 dark:bg-brand-600 transition-all"
                    style={{ width: `${widthPct}%`, opacity: 0.4 + sampleWeight * 0.6 }}
                  />
                </div>
                <span className="text-xs font-mono w-16 text-right">{fmtNum(m.avgRuns, 2)}</span>
                <span className="text-[11px] font-mono text-gray-400 w-16 text-right">N={m.n}</span>
                <span className="text-[11px] font-mono text-gray-400 w-16 text-right">홈{fmtPct(m.homeWinRate, 0)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 극값 경기 */}
      <section className="grid md:grid-cols-3 gap-4">
        <ExtremeCard title="최다 총득점 경기" games={summary.topTotalRuns} metric="totalRuns" suffix="점" />
        <ExtremeCard title="최대 점수차 경기" games={summary.topMargin} metric="margin" suffix="점차" />
        <ExtremeCard title="최소 총득점 경기" games={summary.lowTotalRuns} metric="totalRuns" suffix="점" />
      </section>

      <footer className="text-xs text-gray-400 dark:text-gray-500 pt-2">
        <p>
          데이터 소스: Naver 스포츠 스케줄 API (게임 결과) · Open-Meteo (날씨) · 내부 백필.
          스크린 캡처 및 인용은 출처 표기 요망.
        </p>
        <p className="mt-1">
          관련: <Link href="/teams" className="underline">팀 페이지</Link> · <Link href="/predictions" className="underline">예측 기록</Link>
        </p>
      </footer>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="bg-gray-50 dark:bg-[var(--color-surface)] rounded-lg p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold font-mono mt-1">{value}</p>
      {suffix && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{suffix}</p>}
    </div>
  );
}

type ExtremeGame = {
  id: number;
  date: string;
  homeCode: string;
  awayCode: string;
  homeScore: number;
  awayScore: number;
  stadium: string | null;
  totalRuns: number;
  margin: number;
};

function ExtremeCard({
  title,
  games,
  metric,
  suffix,
}: {
  title: string;
  games: ExtremeGame[];
  metric: "totalRuns" | "margin";
  suffix: string;
}) {
  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 space-y-2">
      <h3 className="text-sm font-bold">{title}</h3>
      {games.length === 0 ? (
        <p className="text-xs text-gray-500">데이터 없음</p>
      ) : (
        <ul className="space-y-2 text-xs">
          {games.map((g) => (
            <li key={g.id} className="border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-mono">{g.date}</span>
                <span className="font-mono font-semibold">
                  {metric === "totalRuns" ? g.totalRuns : g.margin}{suffix}
                </span>
              </div>
              <div className="mt-1 font-medium">
                {shortTeamName(g.awayCode as never) ?? g.awayCode}{" "}
                <span className="font-mono text-gray-400">{g.awayScore}</span>{" "}
                <span className="text-gray-400">@</span>{" "}
                <span className="font-mono text-gray-400">{g.homeScore}</span>{" "}
                {shortTeamName(g.homeCode as never) ?? g.homeCode}
              </div>
              {g.stadium && <p className="text-[10px] text-gray-400 mt-1">{g.stadium}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
