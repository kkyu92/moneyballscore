import Image from 'next/image';
import { KBO_TEAMS, type TeamCode } from '@moneyball/shared';

interface TeamLogoProps {
  team: TeamCode;
  size?: number;
  className?: string;
}

/**
 * v4-4: 팀 로고 컴포넌트.
 *
 * `public/logos/{team}.svg` 파일 사용. 현재는 SVG 플레이스홀더 (팀 색 + 약어).
 * 실제 공식 로고는 동일 파일명으로 덮어쓰면 즉시 반영.
 *
 * SVG는 next/image unoptimized (빌드 시 변환 없음).
 */
export function TeamLogo({ team, size = 48, className = '' }: TeamLogoProps) {
  const teamInfo = KBO_TEAMS[team];
  const alt = `${teamInfo.name} 로고`;

  return (
    <Image
      src={`/logos/${team}.svg`}
      alt={alt}
      width={size}
      height={size}
      className={className}
      unoptimized
      priority={false}
    />
  );
}
