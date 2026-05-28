import { shortTeamName, type TeamCode } from "@moneyball/shared";
import type { DebateTimelineData } from "@/lib/insights/loader";
import { AgentVoteCard, type AgentRole } from "./AgentVoteCard";

interface DebateTimelineProps {
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  debate: DebateTimelineData;
}

interface StepConfig {
  key: string;
  role: AgentRole;
  homeWinProb: number | null;
  predictedWinner: TeamCode | null;
  note: string | null;
  title: string;
  highlight?: boolean;
}

function formatAdjustment(value: number): string {
  const pct = Math.round(value * 100);
  if (pct === 0) return "0%";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

/**
 * 인사이트 timeline — 정량 baseline → 홈/원정 옹호 → 보정 → 심판 5 step 시각화.
 *
 * Server Component. CSS-only vertical timeline (connector line + step circles).
 * AgentVoteCard 5개를 vertical stack 으로 배치, 각 step 옆에 short narrative 박제.
 * 마지막 step (judge) = highlight + verdict reasoning 전체 노출.
 *
 * 정량 모델 → 양 옹호 → 보정 → 심판 흐름이 한눈에 보여, 단순 "AI 가 X팀 60%
 * 예측" 문구보다 "왜" 가 더 잘 전달됨. cycle 1021 (b7) carry-over.
 */
export function DebateTimeline({
  homeTeam,
  awayTeam,
  debate,
}: DebateTimelineProps) {
  const homeName = shortTeamName(homeTeam);
  const awayName = shortTeamName(awayTeam);

  const steps: StepConfig[] = [];

  // Step 1 — Quant baseline
  if (debate.quantHomeProb !== null) {
    const quantHomePct = Math.round(debate.quantHomeProb * 100);
    steps.push({
      key: "quant",
      role: "quant",
      homeWinProb: debate.quantHomeProb,
      predictedWinner: debate.quantHomeProb >= 0.5 ? homeTeam : awayTeam,
      note: `세이버메트릭스 10팩터 합산. 홈 ${quantHomePct}% / 원정 ${100 - quantHomePct}%.`,
      title: "1. 정량 모델 baseline",
    });
  }

  // Step 2 — Home advocate
  if (debate.homeArgument) {
    const arg = debate.homeArgument;
    const noteParts: string[] = [];
    if (arg.keyFactor) noteParts.push(`핵심: ${arg.keyFactor}`);
    if (arg.strengths.length > 0) noteParts.push(`강점: ${arg.strengths.slice(0, 2).join(", ")}`);
    if (arg.reasoning) noteParts.push(arg.reasoning);
    steps.push({
      key: "home",
      role: "home",
      homeWinProb: arg.confidence,
      predictedWinner: homeTeam,
      note: noteParts.length > 0 ? noteParts.join(" · ") : null,
      title: `2. ${homeName} 옹호 논거`,
    });
  }

  // Step 3 — Away advocate
  if (debate.awayArgument) {
    const arg = debate.awayArgument;
    const noteParts: string[] = [];
    if (arg.keyFactor) noteParts.push(`핵심: ${arg.keyFactor}`);
    if (arg.strengths.length > 0) noteParts.push(`강점: ${arg.strengths.slice(0, 2).join(", ")}`);
    if (arg.reasoning) noteParts.push(arg.reasoning);
    // 원정 confidence = 자기 팀 (away) 승리 확신도. UI 상 homeWinProb 으로 박제하려면 1-confidence.
    const homeProbFromAway = arg.confidence !== null ? 1 - arg.confidence : null;
    steps.push({
      key: "away",
      role: "away",
      homeWinProb: homeProbFromAway,
      predictedWinner: awayTeam,
      note: noteParts.length > 0 ? noteParts.join(" · ") : null,
      title: `3. ${awayName} 옹호 논거`,
    });
  }

  // Step 4 — Calibration
  if (debate.calibration) {
    const c = debate.calibration;
    const noteParts: string[] = [];
    if (c.recentBias) noteParts.push(`최근 편향: ${c.recentBias}`);
    if (c.teamSpecific) noteParts.push(`팀별: ${c.teamSpecific}`);
    if (c.modelWeakness) noteParts.push(`모델 약점: ${c.modelWeakness}`);
    if (c.adjustmentSuggestion !== null) {
      noteParts.push(`보정값: 홈 ${formatAdjustment(c.adjustmentSuggestion)}`);
    }
    steps.push({
      key: "calibration",
      role: "calibration",
      homeWinProb: null,
      predictedWinner: null,
      note: noteParts.length > 0 ? noteParts.join(" · ") : null,
      title: "4. 회고 에이전트 보정",
    });
  } else if (debate.calibrationApplied) {
    steps.push({
      key: "calibration",
      role: "calibration",
      homeWinProb: null,
      predictedWinner: null,
      note: debate.calibrationApplied,
      title: "4. 회고 에이전트 보정",
    });
  }

  // Step 5 — Judge verdict
  steps.push({
    key: "judge",
    role: "judge",
    homeWinProb: debate.verdictHomeProb,
    predictedWinner: debate.predictedWinner,
    note: debate.verdictReasoning,
    title: "5. 심판 종합 판단",
    highlight: true,
  });

  // Verdict box info — for final verdict summary card below timeline
  const verdictWinnerName =
    debate.predictedWinner !== null
      ? shortTeamName(debate.predictedWinner)
      : debate.verdictHomeProb !== null
        ? debate.verdictHomeProb >= 0.5
          ? homeName
          : awayName
        : null;
  const verdictPct =
    debate.verdictHomeProb !== null
      ? Math.max(
          Math.round(debate.verdictHomeProb * 100),
          Math.round((1 - debate.verdictHomeProb) * 100),
        )
      : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 font-bold text-[10px]">
          AI
        </span>
        <span className="font-medium text-gray-700 dark:text-gray-200">
          에이전트 토론 timeline
        </span>
      </div>

      <ol className="relative space-y-4" aria-label="에이전트 토론 단계">
        {/* vertical connector line — left of step circles */}
        <span
          aria-hidden
          className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200 dark:bg-[var(--color-border)]"
        />
        {steps.map((step, idx) => (
          <li key={step.key} className="relative pl-8">
            <span
              aria-hidden
              className={`absolute left-0 top-3 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                step.highlight
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "bg-white dark:bg-[var(--color-surface-card)] border-gray-300 dark:border-[var(--color-border)] text-gray-700 dark:text-gray-200"
              }`}
            >
              {idx + 1}
            </span>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                {step.title}
              </p>
              <AgentVoteCard
                role={step.role}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                homeWinProb={step.homeWinProb}
                predictedWinner={step.predictedWinner}
                note={step.note}
                highlight={step.highlight}
              />
            </div>
          </li>
        ))}
      </ol>

      {verdictWinnerName && verdictPct !== null && (
        <div className="rounded-xl border border-brand-300 dark:border-brand-700/60 bg-brand-50 dark:bg-brand-900/30 p-4 text-sm text-brand-900 dark:text-brand-100">
          <div className="flex items-baseline gap-2">
            <span className="text-xs uppercase tracking-wide opacity-75">
              최종 결론
            </span>
            <span className="font-semibold">{verdictWinnerName} 우세</span>
            <span className="ml-auto font-mono tabular-nums text-lg">
              {verdictPct}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
