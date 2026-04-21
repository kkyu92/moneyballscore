'use client';

/**
 * PlaceholderCard 의 client 래퍼. 라이브 상태를 반영해서 "경기 진행중"·
 * "경기 종료 · 예측 미기록" 문구가 실제 경기 진행과 즉시 동기화되도록.
 */

import { useKboScores } from '@/hooks/use-kbo-scores';
import { PlaceholderCard } from './PlaceholderCard';
import type { ComponentProps } from 'react';

type Props = ComponentProps<typeof PlaceholderCard>;

export function PlaceholderCardLive(props: Props) {
  const { scores } = useKboScores();
  const live = scores.find(
    (s) => s.homeTeam === props.homeTeam && s.awayTeam === props.awayTeam,
  );
  if (!live) return <PlaceholderCard {...props} />;
  return <PlaceholderCard {...props} status={live.status ?? props.status} />;
}
