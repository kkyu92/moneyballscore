import Link from 'next/link';
import { KBO_TEAMS, shortTeamName, type TeamCode } from '@moneyball/shared';
import { TeamLogo } from '../shared/TeamLogo';

interface BigMatchDebateCardProps {
  gameId: number;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  homeWinProb: number;  // 0 ~ 1
  predictedWinner: TeamCode;
  reasoning: string;
  homeConfidence?: number;
  awayConfidence?: number;
  homeKeyFactor?: string;
  awayKeyFactor?: string;
}

/**
 * v4-4 Task 5 — 메인 페이지 hero 섹션.
 *
 * Design 리뷰 Pass 4 비대칭 hero:
 * - 팀 로고 우선 (텍스트 이니셜 fallback)
 * - 심판 판정 % 가장 큰 시각 anchor
 * - 홈/원정 논거 박스 비대칭 (확신 높은 쪽 1.05 scale)
 * - 단일 CTA ("상세 분석 보기")
 * - 70vh min-height (모바일), 그라데이션 140°
 * - reasoning line-clamp 3 + 전체 보기
 */
export function BigMatchDebateCard({
  gameId,
  homeTeam,
  awayTeam,
  homeWinProb,
  predictedWinner,
  reasoning,
  homeConfidence,
  awayConfidence,
  homeKeyFactor,
  awayKeyFactor,
}: BigMatchDebateCardProps) {
  const home = KBO_TEAMS[homeTeam];
  const away = KBO_TEAMS[awayTeam];
  const winner = KBO_TEAMS[predictedWinner];
  // 예측 승자 적중 확률 = max(hwp, 1-hwp)
  const winnerPct = Math.round(Math.max(homeWinProb, 1 - homeWinProb) * 100);

  const homeEmphasized =
    homeConfidence !== undefined &&
    awayConfidence !== undefined &&
    homeConfidence > awayConfidence;
  const awayEmphasized =
    homeConfidence !== undefined &&
    awayConfidence !== undefined &&
    awayConfidence > homeConfidence;

  return (
    <section
      aria-labelledby="big-match-hero-title"
      className="relative overflow-hidden rounded-2xl md:rounded-3xl p-6 md:p-10 text-white shadow-2xl"
      style={{
        background:
          'linear-gradient(140deg, var(--color-bg-hero-start), var(--color-bg-hero-end))',
        minHeight: '70vh',
      }}
    >
      {/* Title */}
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-brand-300 text-xs md:text-sm font-medium">
            ⭐ 오늘의 빅매치
          </p>
          <span
            className="group relative inline-flex"
            tabIndex={0}
            aria-label="빅매치 선정 기준 설명"
          >
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-brand-300 text-brand-300 text-[10px] font-bold cursor-help">
              ?
            </span>
            <span
              role="tooltip"
              className="absolute left-0 top-full mt-2 z-20 hidden group-hover:block group-focus:block bg-white dark:bg-[var(--color-surface-card)] text-gray-900 text-xs rounded-lg shadow-xl border border-gray-200 dark:border-[var(--color-border)] p-3 w-64"
            >
              <strong className="block mb-1 text-brand-700">
                빅매치 선정 기준
              </strong>
              오늘 모델이 가장 강하게 예측한 경기입니다. 승리 확률
              80% 이상 (또는 20% 이하) 으로 한쪽 편을 강하게 본 경기 중
              확률이 가장 극단적인 한 경기를 자동 선정합니다.
            </span>
          </span>
        </div>
        <h2
          id="big-match-hero-title"
          className="text-xl md:text-2xl font-bold"
        >
          AI 에이전트 토론 대상 경기
        </h2>
        <p className="text-brand-200 text-xs md:text-sm mt-1">
          오늘 모델이 가장 확신하는 한 경기 — 승률 80%+ 기준
        </p>
      </header>

      {/* 팀 vs 팀 — away 왼쪽, home 오른쪽 */}
      <div className="flex items-center justify-center gap-4 md:gap-8 mb-6">
        <div className="text-center">
          <div className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-2 rounded-full overflow-hidden border-4 border-white/20 bg-white/5">
            <TeamLogo team={awayTeam} size={96} className="w-full h-full" />
          </div>
          <p className="text-xs md:text-sm text-brand-200">{away.name}</p>
        </div>

        <div className="text-xl md:text-3xl font-bold text-brand-300">VS</div>

        <div className="text-center">
          <div className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-2 rounded-full overflow-hidden border-4 border-white/20 bg-white/5">
            <TeamLogo team={homeTeam} size={96} className="w-full h-full" />
          </div>
          <p className="text-xs md:text-sm text-brand-200">{home.name}</p>
        </div>
      </div>

      {/* 심판 판정 (핵심 anchor) */}
      <div className="text-center mb-6">
        <div className="inline-block bg-white/10 rounded-2xl px-6 py-3 md:px-10 md:py-5 border border-white/20">
          <p className="text-xs text-brand-200 mb-1">AI 심판 판정</p>
          <p
            className="text-4xl md:text-6xl font-bold"
            aria-label={`${winner.name} 승리 확률 ${winnerPct}%`}
          >
            {shortTeamName(predictedWinner)}{' '}
            <span className="text-brand-300">{winnerPct}%</span>
          </p>
        </div>
      </div>

      {/* 심판 reasoning (line-clamp 3) */}
      {reasoning && (
        <div className="max-w-2xl mx-auto mb-6">
          <p className="text-sm md:text-base text-white/90 leading-relaxed line-clamp-3 text-center">
            {reasoning}
          </p>
        </div>
      )}

      {/* 양팀 논거 박스 (비대칭) */}
      {(homeKeyFactor || awayKeyFactor) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6 max-w-2xl mx-auto">
          {awayKeyFactor && (
            <div
              className={`bg-white/5 rounded-xl p-3 md:p-4 border border-white/10 transition-transform ${
                awayEmphasized ? 'md:scale-105 md:shadow-lg' : ''
              }`}
            >
              <p className="text-xs text-brand-200 mb-1">{away.name} 논거</p>
              <p className="text-sm font-medium line-clamp-2">
                {awayKeyFactor}
              </p>
              {awayConfidence !== undefined && (
                <p className="text-xs text-brand-300 mt-1">
                  확신 {Math.round(awayConfidence * 100)}%
                </p>
              )}
            </div>
          )}
          {homeKeyFactor && (
            <div
              className={`bg-white/5 rounded-xl p-3 md:p-4 border border-white/10 transition-transform ${
                homeEmphasized ? 'md:scale-105 md:shadow-lg' : ''
              }`}
            >
              <p className="text-xs text-brand-200 mb-1">{home.name} 논거</p>
              <p className="text-sm font-medium line-clamp-2">
                {homeKeyFactor}
              </p>
              {homeConfidence !== undefined && (
                <p className="text-xs text-brand-300 mt-1">
                  확신 {Math.round(homeConfidence * 100)}%
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="text-center">
        <Link
          href={`/analysis/game/${gameId}`}
          className="inline-flex items-center gap-2 bg-white text-brand-800 font-semibold px-6 py-3 rounded-full hover:bg-brand-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white min-h-[44px]"
          aria-label="빅매치 상세 분석 보기"
        >
          상세 분석 보기 →
        </Link>
      </div>

      {/* 스크롤 힌트 (모바일) */}
      <div
        className="text-center text-brand-300 text-xs mt-8 md:hidden"
        aria-hidden="true"
      >
        ↓ 오늘 다른 경기
      </div>
    </section>
  );
}
