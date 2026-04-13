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

// 예측 엔진 가중치 기본값
export const DEFAULT_WEIGHTS = {
  sp_fip: 0.25,
  lineup_woba: 0.20,
  bullpen_fip: 0.15,
  recent_form: 0.15,
  war: 0.10,
  head_to_head: 0.08,
  park_factor: 0.07,
} as const;

// 홈팀 어드밴티지
export const HOME_ADVANTAGE = 0.03;
