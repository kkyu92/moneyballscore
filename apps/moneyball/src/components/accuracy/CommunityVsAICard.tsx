import { MIN_POLL_TOTAL } from '@moneyball/shared';
import type { CommunityVsAIResult } from '@/lib/picks/buildCommunityAccuracy';

interface Strings {
  title: string;
  subtitle: (minPollTotal: number) => string;
  communityLabel: string;
  aiLabel: string;
  correctSuffix: string;
  noPrediction: string;
  communityLeads: (delta: string) => string;
  aiLeads: (delta: string) => string;
  tie: string;
}

const STRINGS: Record<'ko' | 'en', Strings> = {
  ko: {
    title: '커뮤니티 vs AI 대결',
    subtitle: (n) => `${n}명 이상 참여한 경기 기준 — 커뮤니티 다수결 vs AI 예측 정확도 비교`,
    communityLabel: '커뮤니티 정답률',
    aiLabel: 'AI 정답률 (같은 경기)',
    correctSuffix: '적중',
    noPrediction: '예측 없음',
    communityLeads: (delta) => `커뮤니티가 AI보다 ${delta}%p 앞섭니다`,
    aiLeads: (delta) => `AI가 커뮤니티보다 ${delta}%p 앞섭니다`,
    tie: '커뮤니티와 AI가 동률입니다',
  },
  en: {
    title: 'Community vs AI',
    subtitle: (n) => `Games with ${n}+ votes — community majority pick vs AI prediction accuracy`,
    communityLabel: 'Community accuracy',
    aiLabel: 'AI accuracy (same games)',
    correctSuffix: 'correct',
    noPrediction: 'no prediction',
    communityLeads: (delta) => `Community leads AI by ${delta}pp`,
    aiLeads: (delta) => `AI leads community by ${delta}pp`,
    tie: 'Community and AI are tied',
  },
};

interface Props {
  stats: CommunityVsAIResult;
  locale?: 'ko' | 'en';
}

// KBO /accuracy 의 인라인 "커뮤니티 vs AI 대결" 섹션을 재사용 가능한 컴포넌트로 추출해
// MLB /mlb/accuracy · /en/mlb/accuracy 에 배선 (explore-idea heavy, cycle 2544 — MLB 쪽
// parity gap 발견). MIN_POLL_TOTAL 미만 표본은 렌더하지 않음 (소표본 게이트, 기존 KBO
// 페이지와 동일 기준 재사용).
export function CommunityVsAICard({ stats, locale = 'ko' }: Props) {
  if (stats.communityGames < MIN_POLL_TOTAL) return null;

  const t = STRINGS[locale];
  const commWins =
    stats.communityAccuracy !== null &&
    stats.aiAccuracyWithPoll !== null &&
    stats.communityAccuracy > stats.aiAccuracyWithPoll;
  const aiWins =
    stats.communityAccuracy !== null &&
    stats.aiAccuracyWithPoll !== null &&
    stats.aiAccuracyWithPoll > stats.communityAccuracy;

  return (
    <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold">{t.title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.subtitle(MIN_POLL_TOTAL)}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div
          className={`rounded-lg p-4 text-center ${commWins ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700' : 'bg-gray-50 dark:bg-[var(--color-surface)]'}`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {commWins && '🏆 '}
            {t.communityLabel}
          </p>
          <p
            className={`text-2xl font-bold font-mono ${
              stats.communityAccuracy !== null && stats.communityAccuracy >= 0.5
                ? 'text-brand-500'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {stats.communityAccuracy !== null ? `${(stats.communityAccuracy * 100).toFixed(1)}%` : '—'}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
            {stats.communityCorrect}/{stats.communityGames} {t.correctSuffix}
          </p>
        </div>
        <div
          className={`rounded-lg p-4 text-center ${aiWins ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800' : 'bg-gray-50 dark:bg-[var(--color-surface)]'}`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {aiWins && '🏆 '}
            {t.aiLabel}
          </p>
          <p
            className={`text-2xl font-bold font-mono ${
              stats.aiAccuracyWithPoll !== null && stats.aiAccuracyWithPoll >= 0.5
                ? 'text-brand-500'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {stats.aiAccuracyWithPoll !== null ? `${(stats.aiAccuracyWithPoll * 100).toFixed(1)}%` : '—'}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
            {stats.aiGamesWithPoll > 0 ? `${stats.aiCorrectWithPoll}/${stats.aiGamesWithPoll} ${t.correctSuffix}` : t.noPrediction}
          </p>
        </div>
      </div>
      {stats.communityAccuracy !== null && stats.aiAccuracyWithPoll !== null && (
        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          {stats.communityAccuracy > stats.aiAccuracyWithPoll
            ? t.communityLeads(((stats.communityAccuracy - stats.aiAccuracyWithPoll) * 100).toFixed(1))
            : stats.communityAccuracy < stats.aiAccuracyWithPoll
              ? t.aiLeads(((stats.aiAccuracyWithPoll - stats.communityAccuracy) * 100).toFixed(1))
              : t.tie}
        </p>
      )}
    </section>
  );
}
