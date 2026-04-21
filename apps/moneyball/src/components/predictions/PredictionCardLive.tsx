'use client';

/**
 * PredictionCard 의 client 래퍼. useKboScores 로 라이브 상태를 받아서
 * server-side DB status/score 를 덮어씀 — live-update cron (10분) 보다
 * Naver 실시간 응답이 빠르기 때문에 메인 카드 섹션과 상단 미니 카드
 * (LiveScoreboard) 간 싱크 차이 제거.
 */

import { useKboScores } from '@/hooks/use-kbo-scores';
import { PredictionCard, type PredictionCardProps } from './PredictionCard';

export function PredictionCardLive(props: PredictionCardProps) {
  const { scores } = useKboScores();
  const live = scores.find(
    (s) => s.homeTeam === props.homeTeam && s.awayTeam === props.awayTeam,
  );
  if (!live) return <PredictionCard {...props} />;

  const showScore = live.status === 'live' || live.status === 'final';
  return (
    <PredictionCard
      {...props}
      status={live.status ?? props.status ?? undefined}
      homeScore={showScore ? live.homeScore : props.homeScore}
      awayScore={showScore ? live.awayScore : props.awayScore}
    />
  );
}
