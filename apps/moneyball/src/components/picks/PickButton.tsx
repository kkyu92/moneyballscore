'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import { shortTeamName, type TeamCode, MIN_POLL_TOTAL, COMMUNITY_DIVERGE_MIN } from '@moneyball/shared';
import { useUserPicks } from '@/hooks/use-user-picks';
import type { PickPollEntry } from '@/app/api/picks/poll/route';

type League = 'kbo' | 'mlb';
type Locale = 'ko' | 'en';

const DEVICE_KEY = 'mb_device_id_v1';

const STRINGS = {
  ko: {
    communityPick: '커뮤니티 픽',
    vsAi: '⚡ AI와 반대',
    participants: (n: number) => `${n}명 참여`,
    aiPrediction: 'AI 예측',
    home: '홈',
    away: '원정',
    homeButton: (name: string) => `${name} 홈`,
    awayButton: (name: string) => `${name} 원정`,
    homePickAria: (name: string) => `${name} 홈팀 픽`,
    awayPickAria: (name: string) => `${name} 원정팀 픽`,
    myPick: '내 픽',
    viewAnalysis: '분석 보기 ↗',
    viewAnalysisAria: (gameId: string) => `경기 ${gameId} 분석 보기`,
    topFactor: (factor: string) => `주요 팩터: ${factor}`,
    countLabel: (n: number) => `${n}명`,
    joiningSuffix: '참여 중 · 픽 후 결과 공개',
    joiningNeedMore: (n: number, min: number) => `${n}명 참여 중 · ${min}명 이상 모이면 분포 공개`,
  },
  en: {
    communityPick: 'Community Pick',
    vsAi: '⚡ vs AI',
    participants: (n: number) => `${n} votes`,
    aiPrediction: 'AI Prediction',
    home: 'HOME',
    away: 'AWAY',
    homeButton: (name: string) => `${name} HOME`,
    awayButton: (name: string) => `${name} AWAY`,
    homePickAria: (name: string) => `${name} home team pick`,
    awayPickAria: (name: string) => `${name} away team pick`,
    myPick: 'My Pick',
    viewAnalysis: 'View Analysis ↗',
    viewAnalysisAria: (gameId: string) => `View analysis for game ${gameId}`,
    topFactor: (factor: string) => `Top factor: ${factor}`,
    countLabel: (n: number) => `${n}`,
    joiningSuffix: 'voting · results shown after you pick',
    joiningNeedMore: (n: number, min: number) => `${n} voting · results shown once ${min}+ join`,
  },
} as const;

function getOrCreateDeviceId(): string {
  try {
    const stored = localStorage.getItem(DEVICE_KEY);
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

interface Props {
  gameId: number | string;
  homeTeam: TeamCode | string;
  awayTeam: TeamCode | string;
  aiPredictedWinner?: 'home' | 'away';
  aiWinProb?: number;
  aiTopFactor?: string;
  league?: League; // 'mlb' 시 mlb-submit/mlb-poll route + 별도 localStorage 키 네임스페이스 (KBO 정수 game_id 와 MLB external_game_id 문자열 값 충돌 방지)
  analysisHref?: string; // '분석 보기' 링크 대상. 미지정 시 kbo 는 /analysis/game/{gameId} 기본, mlb 는 링크 미표시 (KBO 전용 라우트 — MLB external_game_id 로 parseInt 하면 엉뚱한 KBO 경기로 연결)
  locale?: Locale; // 미지정 시 'ko' 기본 (기존 callsite 무변경, wave-659 배지 컴포넌트 동일 패턴)
}

function PollBar({
  poll,
  myPick,
  homeName,
  awayName,
  aiHomePct,
  t,
}: {
  poll: PickPollEntry;
  myPick: 'home' | 'away';
  homeName: string;
  awayName: string;
  aiHomePct?: number;
  t: (typeof STRINGS)[Locale];
}) {
  const homePct = poll.total > 0 ? Math.round((poll.home / poll.total) * 100) : 50;
  const awayPct = 100 - homePct;
  const showDivergence = aiHomePct != null && Math.abs(aiHomePct - homePct) >= COMMUNITY_DIVERGE_MIN;

  return (
    <div className="mt-2 px-1 space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1">
          {t.communityPick}
          {showDivergence && (
            <span className="text-accent dark:text-accent-light font-medium">{t.vsAi}</span>
          )}
        </span>
        <span>{t.participants(poll.total)}</span>
      </div>
      <div className="relative h-7 rounded-lg overflow-hidden flex text-xs font-medium">
        <div
          className={`flex items-center justify-center transition-all h-full ${
            myPick === 'away'
              ? 'bg-brand-500 dark:bg-brand-400 text-white'
              : 'bg-gray-100 dark:bg-[var(--color-surface)] text-gray-600 dark:text-gray-300'
          }`}
          style={{ width: `${awayPct}%` }}
        >
          <span className="whitespace-nowrap">{awayPct >= 20 && `${awayName} ${awayPct}%`}</span>
        </div>
        <div
          className={`flex items-center justify-center transition-all h-full ${
            myPick === 'home'
              ? 'bg-brand-500 dark:bg-brand-400 text-white'
              : 'bg-gray-100 dark:bg-[var(--color-surface)] text-gray-600 dark:text-gray-300'
          }`}
          style={{ width: `${homePct}%` }}
        >
          <span className="whitespace-nowrap">{homePct >= 20 && `${homeName} ${homePct}%`}</span>
        </div>
      </div>
    </div>
  );
}

export function PickButton({ gameId, homeTeam, awayTeam, aiPredictedWinner, aiWinProb, aiTopFactor, league = 'kbo', analysisHref, locale = 'ko' }: Props) {
  const t = STRINGS[locale];
  const { getPick, setPick } = useUserPicks();
  // MLB external_game_id 는 KBO 정수 game_id 와 값 공간이 겹칠 수 있어 (둘 다 숫자 문자열)
  // localStorage 키 충돌 방지용 네임스페이스 접두어 부여.
  const storageKey = league === 'mlb' ? `mlb-${gameId}` : gameId;
  const current = getPick(storageKey);
  const [poll, setPoll] = useState<PickPollEntry | null>(null);

  const homeName = shortTeamName(homeTeam) ?? homeTeam;
  const awayName = shortTeamName(awayTeam) ?? awayTeam;

  const pollUrl = league === 'mlb' ? '/api/picks/mlb-poll' : '/api/picks/poll';
  const submitUrl = league === 'mlb' ? '/api/picks/mlb-submit' : '/api/picks/submit';
  const submitIdField = league === 'mlb' ? 'external_game_id' : 'game_id';

  const fetchPoll = useCallback(() => {
    let cancelled = false;
    fetch(`${pollUrl}?ids=${gameId}`)
      .then((r) => r.json())
      .then((data: Record<string, PickPollEntry>) => {
        if (!cancelled) {
          const entry = data[String(gameId)];
          if (entry) setPoll(entry);
        }
      })
      .catch((err) => {
        Sentry.captureException(err, {
          tags: { silent_drift_family: 'wave_166', component: 'PickButton', op: 'picks_poll_fetch' },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, pollUrl]);

  useEffect(() => {
    return fetchPoll();
  }, [gameId, fetchPoll]);

  const handlePick = useCallback(
    (choice: 'home' | 'away') => {
      setPick(storageKey, choice);
      const deviceId = getOrCreateDeviceId();
      fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [submitIdField]: gameId, pick: choice, device_id: deviceId }),
      })
        .then(() => fetchPoll())
        .catch((err) => {
          Sentry.captureException(err, {
            tags: { silent_drift_family: 'wave_166', component: 'PickButton', op: 'picks_submit' },
          });
        });
    },
    [gameId, storageKey, setPick, fetchPoll, submitUrl, submitIdField],
  );

  const base =
    'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-[44px] whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
  const active = 'bg-brand-500 dark:bg-brand-400 text-white border-transparent';
  const idle =
    'border-gray-200 dark:border-[var(--color-border)] text-gray-600 dark:text-gray-300 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-300';

  const showPoll = current && poll && poll.total >= MIN_POLL_TOTAL;

  const aiProbPct = aiWinProb != null ? Math.round(aiWinProb * 100) : null;
  const aiTeamName = aiPredictedWinner === 'home' ? homeName : aiPredictedWinner === 'away' ? awayName : null;
  const aiSideLabel = aiPredictedWinner === 'home' ? t.home : aiPredictedWinner === 'away' ? t.away : null;
  const aiHomePct =
    aiProbPct != null
      ? aiPredictedWinner === 'home'
        ? aiProbPct
        : 100 - aiProbPct
      : undefined;

  const linkHref = analysisHref ?? (league === 'kbo' ? `/analysis/game/${gameId}` : null);

  return (
    <div>
      {aiProbPct != null && aiTeamName != null && (
        <div className="mt-2 px-1 space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-brand-600 dark:text-brand-400 shrink-0">{t.aiPrediction}</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200 shrink-0">
              {aiTeamName} {aiSideLabel}
            </span>
            <span className="bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-semibold px-1.5 py-0.5 rounded text-2xs shrink-0 tabular-nums">
              {aiProbPct}%
            </span>
            {linkHref && (
              <Link
                href={linkHref}
                className="ml-auto shrink-0 text-brand-600 dark:text-brand-400 hover:underline"
                aria-label={t.viewAnalysisAria(String(gameId))}
              >
                {t.viewAnalysis}
              </Link>
            )}
          </div>
          {aiTopFactor && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {t.topFactor(aiTopFactor)}
            </p>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 px-1">
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{t.myPick}</span>
        <button
          type="button"
          onClick={() => handlePick('away')}
          className={`${base} ${current?.pick === 'away' ? active : idle}`}
          aria-pressed={current?.pick === 'away'}
          aria-label={t.awayPickAria(awayName)}
        >
          {t.awayButton(awayName)}
        </button>
        <button
          type="button"
          onClick={() => handlePick('home')}
          className={`${base} ${current?.pick === 'home' ? active : idle}`}
          aria-pressed={current?.pick === 'home'}
          aria-label={t.homePickAria(homeName)}
        >
          {t.homeButton(homeName)}
        </button>
      </div>
      {showPoll && (
        <PollBar
          poll={poll}
          myPick={current.pick}
          homeName={homeName}
          awayName={awayName}
          aiHomePct={aiHomePct}
          t={t}
        />
      )}
      {!current && poll && poll.total > 0 && (
        <p className="mt-1.5 px-1 text-xs text-gray-500 dark:text-gray-300 flex items-center gap-1">
          <span className="font-semibold text-brand-600 dark:text-brand-400 tabular-nums">{t.countLabel(poll.total)}</span>
          <span>{t.joiningSuffix}</span>
        </p>
      )}
      {current && poll && poll.total > 0 && poll.total < MIN_POLL_TOTAL && (
        <p className="mt-1.5 px-1 text-xs text-gray-500 dark:text-gray-300">
          {t.joiningNeedMore(poll.total, MIN_POLL_TOTAL)}
        </p>
      )}
    </div>
  );
}
