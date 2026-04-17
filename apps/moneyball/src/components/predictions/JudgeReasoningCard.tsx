import { KBO_TEAMS, type TeamCode } from "@moneyball/shared";

interface JudgeReasoningCardProps {
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  judgeReasoning: string;
  homeArgSummary?: string | null;
  awayArgSummary?: string | null;
}

/**
 * /predictions/[date] 페이지에서 각 경기 카드 아래 노출되는 AI 분석 박스.
 * judge agent가 남긴 300-500자 블로그용 reasoning + 양팀 에이전트 요약을 함께 보여준다.
 *
 * 목적: thin content 회피, SEO 실제 본문 확보, 베터에게 "왜 이 예측"을 한눈에 전달.
 */
export function JudgeReasoningCard({
  homeTeam,
  awayTeam,
  judgeReasoning,
  homeArgSummary,
  awayArgSummary,
}: JudgeReasoningCardProps) {
  const homeName = KBO_TEAMS[homeTeam]?.name.split(" ")[0] ?? homeTeam;
  const awayName = KBO_TEAMS[awayTeam]?.name.split(" ")[0] ?? awayTeam;
  const homeColor = KBO_TEAMS[homeTeam]?.color;
  const awayColor = KBO_TEAMS[awayTeam]?.color;

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-4">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 font-bold text-[10px]">
          AI
        </span>
        <span className="font-medium text-gray-700 dark:text-gray-200">심판 에이전트 분석</span>
      </div>

      <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
        {judgeReasoning}
      </p>

      {(homeArgSummary || awayArgSummary) && (
        <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          {homeArgSummary && (
            <div className="text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: homeColor }}
                  aria-hidden
                />
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {homeName} 관점
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{homeArgSummary}</p>
            </div>
          )}
          {awayArgSummary && (
            <div className="text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: awayColor }}
                  aria-hidden
                />
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {awayName} 관점
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{awayArgSummary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
