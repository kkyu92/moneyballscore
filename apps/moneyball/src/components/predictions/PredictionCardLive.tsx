'use client';

/**
 * PredictionCard 의 client 래퍼. useKboScores 로 라이브 상태를 받아서
 * server-side DB status/score 를 덮어씀 — live-update cron (10분) 보다
 * Naver 실시간 응답이 빠르기 때문에 메인 카드 섹션과 상단 미니 카드
 * (LiveScoreboard) 간 싱크 차이 제거.
 */

import { useKboScores } from '@/hooks/use-kbo-scores';
import { PredictionCard, type PredictionCardProps } from './PredictionCard';
import { PickButton } from '@/components/picks/PickButton';
import { topFavoringFactors } from '@/lib/predictions/factorLabels';

function buildAiHintProps(props: PredictionCardProps) {
  if (!props.predictedWinner || props.winProb == null) return {};
  const isHomePredicted = props.predictedWinner === props.homeTeam;
  const aiPredictedWinner: 'home' | 'away' = isHomePredicted ? 'home' : 'away';
  const topFactors = props.factors
    ? topFavoringFactors(props.factors, isHomePredicted, 1)
    : [];
  const aiTopFactor = topFactors[0] ? `${topFactors[0]} 우세` : undefined;
  return { aiPredictedWinner, aiWinProb: props.winProb, aiTopFactor };
}

export function PredictionCardLive(props: PredictionCardProps) {
  const { scores } = useKboScores();
  const live = scores.find(
    (s) => s.homeTeam === props.homeTeam && s.awayTeam === props.awayTeam,
  );

  const effectiveStatus = live?.status ?? props.status;
  const showPickButton = effectiveStatus === 'scheduled' && props.gameId != null;
  const aiHintProps = showPickButton ? buildAiHintProps(props) : {};

  if (!live) {
    return (
      <>
        <PredictionCard {...props} />
        {showPickButton && (
          <PickButton gameId={props.gameId!} homeTeam={props.homeTeam} awayTeam={props.awayTeam} {...aiHintProps} />
        )}
      </>
    );
  }

  const showScore = live.status === 'live' || live.status === 'final';
  return (
    <>
      <PredictionCard
        {...props}
        status={live.status ?? props.status ?? undefined}
        homeScore={showScore ? live.homeScore : props.homeScore}
        awayScore={showScore ? live.awayScore : props.awayScore}
      />
      {showPickButton && (
        <PickButton gameId={props.gameId!} homeTeam={props.homeTeam} awayTeam={props.awayTeam} {...aiHintProps} />
      )}
    </>
  );
}
