import Image from 'next/image';
import { KBO_TEAMS, type TeamCode } from '@moneyball/shared';

interface TeamLogoProps {
  team: TeamCode;
  size?: number;
  className?: string;
}

/**
 * 팀 로고 컴포넌트.
 *
 * `public/logos/{team}.png` 파일 사용 (네이버 스포츠 CDN 출처 KBO 공식 엠블럼, public/logos/README.md 참고).
 * 실제 공식 로고로 교체 시 동일 파일명 덮어쓰기로 즉시 반영.
 * next/image 기본 optimizer 통과 (PNG, unoptimized 아님).
 */
export function TeamLogo({ team, size = 48, className = '' }: TeamLogoProps) {
  const teamInfo = KBO_TEAMS[team];
  const alt = `${teamInfo.name} 로고`;

  return (
    <Image
      src={`/logos/${team}.png`}
      alt={alt}
      width={size}
      height={size}
      className={className}
      priority={false}
    />
  );
}
