import Link from "next/link";
import { mlbShortTeamName, type MlbTeamCode } from "@moneyball/shared";
import { fetchMlbHistoricalAnalogs } from "@/lib/mlb/fetchMlbHistoricalAnalogs";

interface Props {
  homeTeam: MlbTeamCode;
  awayTeam: MlbTeamCode;
  externalGameId: string;
  asOfDate: string;
  locale?: "ko" | "en";
}

/**
 * KBO `HistoricalAnalogMatchup`(analysis/game/[id]) 의 MLB parity — 같은 두 팀
 * 과거 대결 최근 N건. debate/verdict/postview 와 달리 순수 팩트(스케줄+확률) 라
 * MLB predict_final quant-only 게이트(plan #25 Phase 3) 와 무관하게 적용 가능.
 */
export async function MlbHistoricalAnalogMatchup({
  homeTeam,
  awayTeam,
  externalGameId,
  asOfDate,
  locale = "ko",
}: Props) {
  const analogs = await fetchMlbHistoricalAnalogs(homeTeam, awayTeam, externalGameId, asOfDate);
  if (analogs.length === 0) return null;

  const homeName = mlbShortTeamName(homeTeam);
  const awayName = mlbShortTeamName(awayTeam);
  const basePath = locale === "en" ? "/en/mlb/games" : "/mlb/games";
  const isEn = locale === "en";

  return (
    <section
      aria-labelledby="mlb-historical-analog-heading"
      className="rounded-2xl border border-brand-200 dark:border-brand-800 bg-white dark:bg-[var(--color-surface-card)] p-4 md:p-6"
    >
      <header className="mb-3">
        <h2
          id="mlb-historical-analog-heading"
          className="text-lg md:text-xl font-bold text-brand-700 dark:text-brand-100"
        >
          {isEn ? `Recent Meetings (${awayName} vs ${homeName})` : `최근 같은 대결 (${awayName} vs ${homeName})`}
        </h2>
        <p className="text-xs md:text-sm text-brand-500 dark:text-brand-400 mt-1">
          {isEn
            ? `Last ${analogs.length} games — our model's prediction vs actual result`
            : `최근 ${analogs.length}경기 — 우리 모델 예측 vs 실제 결과 비교`}
        </p>
      </header>
      <div className="space-y-2">
        {analogs.map((a) => {
          const isCorrect = a.isCorrect === true;
          const isWrong = a.isCorrect === false;
          const scoreText =
            a.homeScore != null && a.awayScore != null ? `${a.awayScore}-${a.homeScore}` : "?";
          const predictedCode =
            a.predictedHomeWin == null ? null : a.predictedHomeWin ? a.homeCode : a.awayCode;
          const actualCode =
            a.homeScore != null && a.awayScore != null && a.homeScore !== a.awayScore
              ? a.homeScore > a.awayScore
                ? a.homeCode
                : a.awayCode
              : null;
          const slug = `${a.homeCode}-vs-${a.awayCode}`;

          return (
            <Link
              key={a.externalGameId}
              href={`${basePath}/${a.gameDate}/${slug}`}
              className="block rounded-lg border border-brand-100 dark:border-brand-900 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/40 transition-colors p-3"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-brand-500 dark:text-brand-400 w-20">
                    {a.gameDate}
                  </span>
                  <span className="text-sm font-semibold text-brand-700 dark:text-brand-200">
                    {mlbShortTeamName(a.awayCode)} @ {mlbShortTeamName(a.homeCode)}
                  </span>
                  <span className="text-sm font-mono text-brand-600 dark:text-brand-300">
                    {scoreText}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-brand-500 dark:text-brand-400">
                    {isEn ? "Predicted:" : "예측:"}
                  </span>
                  <span className="font-mono font-semibold text-brand-700 dark:text-brand-200">
                    {predictedCode ?? "?"}
                  </span>
                  {actualCode && (
                    <>
                      <span className="text-brand-400 dark:text-brand-500">→</span>
                      <span className="font-mono text-brand-600 dark:text-brand-300">
                        {isEn ? `Actual ${actualCode}` : `실제 ${actualCode}`}
                      </span>
                    </>
                  )}
                  {isCorrect && (
                    <span className="rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200 px-2 py-0.5 font-semibold">
                      {isEn ? "Correct" : "적중"}
                    </span>
                  )}
                  {isWrong && (
                    <span className="rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 font-semibold">
                      {isEn ? "Wrong" : "오답"}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
