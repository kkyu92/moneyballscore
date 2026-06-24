import { KBO_TEAMS, shortTeamName, type TeamCode } from "@moneyball/shared";
import { brand } from "@/lib/design-tokens";

export type AgentRole = "quant" | "home" | "away" | "calibration" | "judge";

interface AgentVoteCardProps {
  role: AgentRole;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  /** 이 에이전트가 홈팀 승리에 부여한 확률 (0~1). null = 의견 없음 (예: calibration step). */
  homeWinProb: number | null;
  /** "추천" 승자 — null 일 때 (calibration 등) "보정 적용" 라벨 박제. */
  predictedWinner?: TeamCode | null;
  /** 짧은 설명 (1~2줄). undefined = 표시 안 함. */
  note?: string | null;
  /** 마지막 단계 (judge) 강조. */
  highlight?: boolean;
}

interface AgentMeta {
  label: string;
  icon: string;
  accentLight: string;
  accentDark: string;
}

const ROLE_META: Record<AgentRole, AgentMeta> = {
  quant: {
    label: "정량 모델",
    icon: "Σ",
    accentLight: "bg-slate-100 text-slate-700 border-slate-300",
    accentDark:
      "dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-700",
  },
  home: {
    label: "홈 옹호 에이전트",
    icon: "H",
    accentLight: "bg-emerald-50 text-emerald-700 border-emerald-300",
    accentDark:
      "dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700/60",
  },
  away: {
    label: "원정 옹호 에이전트",
    icon: "A",
    accentLight: "bg-amber-50 text-amber-700 border-amber-300",
    accentDark: "dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700/60",
  },
  calibration: {
    label: "보정 에이전트",
    icon: "C",
    accentLight: "bg-indigo-50 text-indigo-700 border-indigo-300",
    accentDark:
      "dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-700/60",
  },
  judge: {
    label: "심판 에이전트",
    icon: "J",
    accentLight: "bg-brand-50 text-brand-700 border-brand-300",
    accentDark: "dark:bg-brand-900/40 dark:text-brand-200 dark:border-brand-700/60",
  },
};

/**
 * 인사이트 timeline 안 에이전트 1개의 vote 카드.
 *
 * 5개 step (quant baseline → home → away → calibration → judge) 모두 같은
 * shape 사용. /insights/[date] 페이지 안 DebateTimeline 이 한 줄에 배치.
 *
 * Server Component — interactive 요소 X. 색은 DESIGN.md 토큰 (brand / emerald /
 * amber / indigo / slate) 안에서만, KBO 팀 컬러는 vote bar 안에서만 사용.
 */
export function AgentVoteCard({
  role,
  homeTeam,
  awayTeam,
  homeWinProb,
  predictedWinner,
  note,
  highlight = false,
}: AgentVoteCardProps) {
  const meta = ROLE_META[role];
  const homeName = shortTeamName(homeTeam);
  const awayName = shortTeamName(awayTeam);
  const homeColor = KBO_TEAMS[homeTeam]?.color ?? brand[500];
  const awayColor = KBO_TEAMS[awayTeam]?.color ?? "#c5872a";

  const hasProb = homeWinProb !== null && Number.isFinite(homeWinProb);
  const homePct = hasProb ? Math.round((homeWinProb as number) * 100) : null;
  const awayPct = homePct !== null ? 100 - homePct : null;

  let winnerLabel: string;
  if (predictedWinner) {
    winnerLabel = shortTeamName(predictedWinner);
  } else if (homePct !== null) {
    winnerLabel = homePct >= 50 ? homeName : awayName;
  } else {
    winnerLabel = "보정 적용";
  }

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${meta.accentLight} ${meta.accentDark} ${
        highlight
          ? "ring-2 ring-brand-400/40 dark:ring-brand-300/30 shadow-sm"
          : ""
      }`}
      data-agent-role={role}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/80 dark:bg-black/30 text-[12px] font-bold border border-white/60 dark:border-white/10"
        >
          {meta.icon}
        </span>
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide opacity-80">
            {meta.label}
          </span>
          <span className="text-sm font-semibold">{winnerLabel}</span>
        </div>
        {homePct !== null && (
          <span className="ml-auto font-mono text-sm tabular-nums opacity-90">
            {Math.max(homePct, 100 - homePct)}%
          </span>
        )}
      </div>

      {homePct !== null && awayPct !== null && (
        <div className="space-y-1">
          <div
            className="h-2 w-full rounded-full overflow-hidden flex bg-white/40 dark:bg-black/30"
            role="img"
            aria-label={`${awayName} ${awayPct}% / ${homeName} ${homePct}%`}
          >
            <span
              className="h-full block"
              style={{ width: `${awayPct}%`, backgroundColor: awayColor }}
              aria-hidden
            />
            <span
              className="h-full block"
              style={{ width: `${homePct}%`, backgroundColor: homeColor }}
              aria-hidden
            />
          </div>
          <div className="flex justify-between text-[10px] font-medium opacity-75">
            <span>
              {awayName} {awayPct}%
            </span>
            <span>
              {homeName} {homePct}%
            </span>
          </div>
        </div>
      )}

      {note && (
        <p className="text-xs leading-relaxed opacity-90 whitespace-pre-wrap">
          {note}
        </p>
      )}
    </div>
  );
}
