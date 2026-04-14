// KBO 팀 코드
export const KBO_TEAMS = {
  SSG: { name: 'SSG 랜더스', stadium: '인천SSG랜더스필드', color: '#CE0E2D' },
  KIA: { name: 'KIA 타이거즈', stadium: '광주-기아 챔피언스 필드', color: '#EA0029' },
  LGT: { name: 'LG 트윈스', stadium: '서울종합운동장 야구장', color: '#C30452' },
  DSB: { name: '두산 베어스', stadium: '서울종합운동장 야구장', color: '#131230' },
  KTW: { name: 'KT 위즈', stadium: '수원KT위즈파크', color: '#000000' },
  SSA: { name: '삼성 라이온즈', stadium: '대구삼성라이온즈파크', color: '#074CA1' },
  LOT: { name: '롯데 자이언츠', stadium: '부산사직야구장', color: '#002B5C' },
  HHE: { name: '한화 이글스', stadium: '대전한화생명이글스파크', color: '#FF6600' },
  NCB: { name: 'NC 다이노스', stadium: '창원NC파크', color: '#315288' },
  KIW: { name: '키움 히어로즈', stadium: '서울고척스카이돔', color: '#570514' },
} as const;

export type TeamCode = keyof typeof KBO_TEAMS;

// 경기 상태
export type GameStatus = 'scheduled' | 'live' | 'final' | 'postponed';

// 포스트 타입
export type PostType = 'preview' | 'review' | 'weekly' | 'monthly';

// 예측 엔진 가중치 v1.5 (10팩터, 3소스)
export const DEFAULT_WEIGHTS = {
  sp_fip: 0.15,
  sp_xfip: 0.05,
  lineup_woba: 0.15,
  bullpen_fip: 0.10,
  recent_form: 0.10,
  war: 0.08,
  head_to_head: 0.05,
  park_factor: 0.04,
  elo: 0.08,
  sfr: 0.05,
} as const;

export type WeightKey = keyof typeof DEFAULT_WEIGHTS;

// 홈팀 어드밴티지
export const HOME_ADVANTAGE = 0.03;

// 신뢰도 → Tailwind 색상 클래스
export function getConfidenceColor(pct: number): string {
  if (pct >= 65) return 'text-green-600';
  if (pct >= 55) return 'text-yellow-600';
  return 'text-gray-600';
}

// 적중률 → Tailwind 색상 클래스 (낮은 값에 빨간색)
export function getAccuracyColor(pct: number): string {
  if (pct >= 65) return 'text-green-600';
  if (pct >= 55) return 'text-yellow-600';
  return 'text-red-600';
}

// KST 기준 YYYY-MM-DD 문자열 생성
export function toKSTDateString(date: Date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// KST 기준 한국어 날짜 표시 (예: 2026년 04월 14일)
export function toKSTDisplayString(date: Date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일`;
}
