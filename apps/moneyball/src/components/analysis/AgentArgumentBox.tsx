import { KBO_TEAMS, type TeamCode } from '@moneyball/shared';
import { TeamLogo } from '../shared/TeamLogo';

interface AgentArgumentBoxProps {
  team: TeamCode;
  role: 'home' | 'away';
  confidence: number;  // 0 ~ 1
  keyFactor: string;
  strengths: string[];
  opponentWeaknesses: string[];
  reasoning: string;
  emphasized?: boolean; // 비대칭 강조 — 확신도 높은 쪽
}

/**
 * v4-4 팀 에이전트 논거 박스.
 * /analysis/game/[id] + BigMatchDebateCard hero에서 공용 사용.
 *
 * Design 리뷰 Pass 4: 비대칭 강조 (emphasized=true 시 scale 1.05)
 * a11y: semantic section + aria-labelledby
 */
export function AgentArgumentBox({
  team,
  role,
  confidence,
  keyFactor,
  strengths,
  opponentWeaknesses,
  reasoning,
  emphasized = false,
}: AgentArgumentBoxProps) {
  const teamInfo = KBO_TEAMS[team];
  const confPct = Math.round(confidence * 100);
  const titleId = `agent-${team}-${role}-title`;

  const borderColor =
    role === 'home' ? 'border-brand-500' : 'border-[var(--color-away)]';
  const emphasisClass = emphasized ? 'md:scale-105 md:shadow-lg' : '';

  return (
    <section
      aria-labelledby={titleId}
      className={`bg-white rounded-xl border-2 ${borderColor} p-4 md:p-5 transition-transform ${emphasisClass}`}
    >
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <TeamLogo team={team} size={32} className="w-full h-full" />
          </div>
          <h3 id={titleId} className="text-sm font-semibold">
            {teamInfo.name} 에이전트
          </h3>
        </div>
        <span
          className="text-lg font-bold text-brand-600"
          aria-label={`${teamInfo.name} 승리 확신도 ${confPct}%`}
        >
          {confPct}%
        </span>
      </header>

      <p className="text-xs text-gray-500 mb-2">
        핵심 팩터:{' '}
        <span className="font-medium text-gray-700">{keyFactor || '—'}</span>
      </p>

      {strengths.length > 0 && (
        <ul className="text-xs space-y-1 mb-2 list-disc list-inside text-gray-700">
          {strengths.slice(0, 3).map((s, i) => (
            <li key={`s-${i}`}>{s}</li>
          ))}
        </ul>
      )}

      {opponentWeaknesses.length > 0 && (
        <div className="text-xs text-gray-500 mb-2 border-t border-gray-100 pt-2">
          <p className="font-medium mb-1">상대 약점:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {opponentWeaknesses.slice(0, 2).map((w, i) => (
              <li key={`w-${i}`}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {reasoning && (
        <p className="text-xs text-gray-600 border-t border-gray-100 pt-2 line-clamp-3">
          {reasoning}
        </p>
      )}
    </section>
  );
}
