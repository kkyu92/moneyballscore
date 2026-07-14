'use client';

/**
 * PredictionCard 의 client 래퍼. useKboScores 로 라이브 상태를 받아서
 * server-side DB status/score 를 덮어씀 — live-update cron (10분) 보다
 * Naver 실시간 응답이 빠르기 때문에 메인 카드 섹션과 상단 미니 카드
 * (LiveScoreboard) 간 싱크 차이 제거.
 *
 * `gameDate` 옵션: KST date 명시 전달 시
 * useKboScores 가 오늘이 아니면 SWR polling 자동 차단. predictions/[date]
 * 아카이브 페이지가 Naver API spam 없이 같은 컴포넌트 재사용 가능.
 *
 * `enablePickButton` 옵션 (default true): 홈 / 라이브 컨텍스트는 PickButton
 * 노출 유지. predictions/[date] 아카이브 페이지는 false 로 PickButton 숨김
 * (해당 페이지는 예측 기록 열람 용도, 투표 진입점 X).
 */

import { PREDICTION_CARD_LIVE_TOP_FACTORS } from '@moneyball/shared';
import { useKboScores } from '@/hooks/use-kbo-scores';
import { PredictionCard, type PredictionCardProps } from './PredictionCard';
import { PickButton } from '@/components/picks/PickButton';
import { topFavoringFactors } from '@/lib/predictions/factorLabels';

interface ExtraProps {
  gameDate?: string;
  enablePickButton?: boolean;
}

function buildAiHintProps(props: PredictionCardProps) {
  if (!props.predictedWinner || props.winProb == null) return {};
  const isHomePredicted = props.predictedWinner === props.homeTeam;
  const aiPredictedWinner: 'home' | 'away' = isHomePredicted ? 'home' : 'away';
  const topFactors = props.factors
    ? topFavoringFactors(props.factors, isHomePredicted, PREDICTION_CARD_LIVE_TOP_FACTORS)
    : [];
  const aiTopFactor = topFactors[0] ? `${topFactors[0]} 우세` : undefined;
  return { aiPredictedWinner, aiWinProb: props.winProb, aiTopFactor };
}

export function PredictionCardLive(props: PredictionCardProps & ExtraProps) {
  const { gameDate, enablePickButton = true, ...cardProps } = props;
  const { scores } = useKboScores({ date: gameDate });
  const live = scores.find(
    (s) => s.homeTeam === cardProps.homeTeam && s.awayTeam === cardProps.awayTeam,
  );

  const effectiveStatus = live?.status ?? cardProps.status;
  const showPickButton =
    enablePickButton && effectiveStatus === 'scheduled' && cardProps.gameId != null;
  const aiHintProps = showPickButton ? buildAiHintProps(cardProps) : {};

  if (!live) {
    return (
      <>
        <PredictionCard {...cardProps} />
        {showPickButton && (
          <PickButton gameId={cardProps.gameId!} homeTeam={cardProps.homeTeam} awayTeam={cardProps.awayTeam} {...aiHintProps} />
        )}
      </>
    );
  }

  const showScore = live.status === 'live' || live.status === 'final';
  return (
    <>
      <PredictionCard
        {...cardProps}
        status={live.status ?? cardProps.status ?? undefined}
        homeScore={showScore ? live.homeScore : cardProps.homeScore}
        awayScore={showScore ? live.awayScore : cardProps.awayScore}
      />
      {showPickButton && (
        <PickButton gameId={cardProps.gameId!} homeTeam={cardProps.homeTeam} awayTeam={cardProps.awayTeam} {...aiHintProps} />
      )}
    </>
  );
}
