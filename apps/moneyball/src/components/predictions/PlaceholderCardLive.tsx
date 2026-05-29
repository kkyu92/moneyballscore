'use client';

/**
 * PlaceholderCard 의 client 래퍼. 라이브 상태를 반영해서 "경기 진행중"·
 * "경기 종료 · 예측 미기록" 문구가 실제 경기 진행과 즉시 동기화되도록.
 *
 * `gameDate` 옵션 (cycle 1021 Tier 1 A): KST date 명시 전달 시
 * useKboScores 가 오늘이 아니면 SWR polling 차단 — predictions/[date]
 * 아카이브 페이지 재사용 가능.
 */

import { useKboScores } from '@/hooks/use-kbo-scores';
import { PlaceholderCard } from './PlaceholderCard';
import type { ComponentProps } from 'react';

type BaseProps = ComponentProps<typeof PlaceholderCard>;
type Props = BaseProps & { gameDate?: string };

export function PlaceholderCardLive(props: Props) {
  const { gameDate, ...placeholderProps } = props;
  const { scores } = useKboScores({ date: gameDate });
  const live = scores.find(
    (s) => s.homeTeam === placeholderProps.homeTeam && s.awayTeam === placeholderProps.awayTeam,
  );
  if (!live) return <PlaceholderCard {...placeholderProps} />;
  return <PlaceholderCard {...placeholderProps} status={live.status ?? placeholderProps.status} />;
}
