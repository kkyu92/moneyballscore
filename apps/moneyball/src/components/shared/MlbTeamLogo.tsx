import Image from 'next/image';
import { MLB_TEAMS, type MlbTeamCode } from '@moneyball/shared';

interface MlbTeamLogoProps {
  team: MlbTeamCode;
  size?: number;
  className?: string;
  locale?: 'ko' | 'en';
}

/**
 * `public/logos/mlb/{team}.svg` 사용 — 팀 색(MLB_TEAMS.color) + 약어 플레이스홀더.
 * 실제 공식 로고는 동일 파일명으로 덮어쓰면 즉시 반영 (TeamLogo.tsx KBO 패턴 동일).
 * SVG는 next/image 기본 optimizer 가 next.config images.dangerouslyAllowSVG 없이 거부하므로 unoptimized.
 *
 * alt 접미사는 locale 반영 (`/en/mlb/*` 쌍둥이 페이지에 "로고" 한글 노출 방지).
 * MLB_TEAMS.name 자체는 영문 고유명사라 양쪽 locale 모두 동일하게 사용.
 */
export function MlbTeamLogo({ team, size = 48, className = '', locale = 'ko' }: MlbTeamLogoProps) {
  // normalizeMlbTeamCode 매핑 밖 미인식 코드가 캐스팅으로 통과할 수 있음(mlb-shared.ts
  // fetchMlbPredictionRowsInRange 의 `?? (code as MlbTeamCode)` fallback) — MLB_TEAMS[team]
  // 조회 실패 시 undefined.name 크래시(Sentry MONEYBALLSCORE-1B, GET /en/mlb/reviews/weekly/[week])
  // 방지. buildMlbTeamStats 의 `MLB_TEAMS[code]?.color ?? '#888'` 와 동일 방어 패턴.
  const teamInfo = MLB_TEAMS[team];
  const alt = locale === 'en' ? `${teamInfo?.name ?? team} logo` : `${teamInfo?.name ?? team} 로고`;

  return (
    <Image
      src={`/logos/mlb/${team}.svg`}
      alt={alt}
      width={size}
      height={size}
      className={className}
      unoptimized
      priority={false}
    />
  );
}
