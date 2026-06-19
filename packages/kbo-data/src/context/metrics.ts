/**
 * LLM Agent 용 Metric Registry — plan #23 Step 1 (cycle 1225, 2026-06-19).
 *
 * 단일 source-of-truth — glossary lib (사용자 가시 문서) + LLM agent prompt 양쪽이
 * 본 레지스트리를 참조해 metric 의미 / 단위 / bounds / validation 을 공유한다.
 *
 * 도입 동기:
 *   - LLM judge / team / postview / personas / debate / calibration / rivalry 7 agent 가
 *     inline prompt 안에서 "FIP = ..." 형태로 metric 의미를 반복 정의 → drift risk.
 *   - LLM hallucination (예: judge verdict 안 FIP=15.5 = 실재 KBO bounds 초과)
 *     catch 부재 → validation 함수로 자동 reject + quant fallback.
 *
 * 책임 분리:
 *   - DEFAULT_WEIGHTS (`@moneyball/shared`) = v1.8 production 가중치 source. 본 레지스트리는
 *     `weight_v18` 만 mirror — 가중치 변경은 shared 에서 일어남.
 *   - glossary lib (사용자 가시 한글 풀이) 와 본 레지스트리는 description_ko 양쪽
 *     단일 source 박제 후속 — Step 2/3 통합 시 glossary 가 본 레지스트리 참조하도록 정렬.
 */

import { DEFAULT_WEIGHTS, type WeightKey } from '@moneyball/shared';

/** Metric 단위 카테고리. */
export type MetricUnit = 'ratio' | 'rate' | 'count' | 'elo' | 'percent';

/** Metric data source — KBO 공식 / Fancy Stats / FanGraphs / 파생 (계산). */
export type MetricSource = 'kbo' | 'fancystats' | 'fangraphs' | 'derived';

/** 값이 클수록 좋은지 / 작을수록 좋은지. */
export type MetricDirection = 'lower-better' | 'higher-better';

/**
 * Metric 단일 정의. LLM 이 직접 소비할 수 있는 형태.
 *
 * `validation` 은 KBO 도메인 bounds 내 (실재 가능 범위) 확인 — 자유도 살짝 넉넉히
 * 박제 (예: FIP 0~10) 하여 정상 극값 false positive 차단. LLM hallucinate 한 raw
 * 숫자 (예: FIP=15.5) 만 reject.
 */
export interface MetricDefinition {
  slug: string;
  ko_name: string;
  unit: MetricUnit;
  description_ko: string;
  source: MetricSource;
  bounds: { min: number; max: number };
  direction: MetricDirection;
  /** v1.8 production 가중치 (DEFAULT_WEIGHTS 참조). 0 = shadow-only factor. */
  weight_v18: number;
  /** 값이 KBO 실재 가능 범위 안인지 — false 시 LLM hallucination 으로 분류. */
  validation: (v: number) => boolean;
}

function makeBoundsValidator(min: number, max: number): (v: number) => boolean {
  return (v: number) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return false;
    return v >= min && v <= max;
  };
}

/**
 * KBO 10 production factor + 2 shadow factor + 보조 metric.
 *
 * Production factor slug 는 `DEFAULT_WEIGHTS` key 와 동일 — weight_v18 lookup 시
 * compile-time guarantee 위해 `WeightKey` 활용. 보조 metric (winnerProb / brier) 은
 * weight_v18=0 + DEFAULT_WEIGHTS 미참조.
 */
export const MetricRegistry = {
  sp_fip: {
    slug: 'sp_fip',
    ko_name: '선발 FIP',
    unit: 'ratio',
    description_ko: '선발 투수의 FIP — BB / HBP / K / HR 만으로 계산한 ERA 등가. 낮을수록 우수.',
    source: 'fancystats',
    bounds: { min: 0, max: 10 },
    direction: 'lower-better',
    weight_v18: DEFAULT_WEIGHTS.sp_fip,
    validation: makeBoundsValidator(0, 10),
  },
  sp_xfip: {
    slug: 'sp_xfip',
    ko_name: '선발 xFIP',
    unit: 'ratio',
    description_ko: '선발 투수의 xFIP — HR/FB 를 리그 평균으로 정규화한 FIP. 운 요소 제거.',
    source: 'fancystats',
    bounds: { min: 0, max: 10 },
    direction: 'lower-better',
    weight_v18: DEFAULT_WEIGHTS.sp_xfip,
    validation: makeBoundsValidator(0, 10),
  },
  lineup_woba: {
    slug: 'lineup_woba',
    ko_name: '타선 wOBA',
    unit: 'ratio',
    description_ko: '타선의 wOBA — 출루 행위별 득점 기여도 가중합. 0.320 리그 평균.',
    source: 'fancystats',
    bounds: { min: 0, max: 0.6 },
    direction: 'higher-better',
    weight_v18: DEFAULT_WEIGHTS.lineup_woba,
    validation: makeBoundsValidator(0, 0.6),
  },
  bullpen_fip: {
    slug: 'bullpen_fip',
    ko_name: '불펜 FIP',
    unit: 'ratio',
    description_ko: '불펜진 평균 FIP — 후반 리드 보호 + 추격 능력 측정.',
    source: 'fancystats',
    bounds: { min: 0, max: 10 },
    direction: 'lower-better',
    weight_v18: DEFAULT_WEIGHTS.bullpen_fip,
    validation: makeBoundsValidator(0, 10),
  },
  recent_form: {
    slug: 'recent_form',
    ko_name: '최근 폼',
    unit: 'percent',
    description_ko: '최근 10경기 승률 (%). 폼/탄력성/모멘텀 proxy.',
    source: 'derived',
    bounds: { min: 0, max: 100 },
    direction: 'higher-better',
    weight_v18: DEFAULT_WEIGHTS.recent_form,
    validation: makeBoundsValidator(0, 100),
  },
  war: {
    slug: 'war',
    ko_name: '팀 WAR',
    unit: 'count',
    description_ko: '팀 누적 WAR (선발 + 타선). 시즌 전반 클래스 측정.',
    source: 'fancystats',
    bounds: { min: -10, max: 80 },
    direction: 'higher-better',
    weight_v18: DEFAULT_WEIGHTS.war,
    validation: makeBoundsValidator(-10, 80),
  },
  head_to_head: {
    slug: 'head_to_head',
    ko_name: '상대 전적',
    unit: 'percent',
    description_ko: '최근 30일 상대 전적 승률 (%). 표본 부족 약한 신호. weight_v18 필드 참조.',
    source: 'kbo',
    bounds: { min: 0, max: 100 },
    direction: 'higher-better',
    weight_v18: DEFAULT_WEIGHTS.head_to_head,
    validation: makeBoundsValidator(0, 100),
  },
  park_factor: {
    slug: 'park_factor',
    ko_name: '구장 보정',
    unit: 'ratio',
    description_ko: '구장별 득점 보정 인자. 1.0 = 중립 / >1 = 타고 / <1 = 투고.',
    source: 'derived',
    bounds: { min: 0.7, max: 1.3 },
    direction: 'higher-better',
    weight_v18: DEFAULT_WEIGHTS.park_factor,
    validation: makeBoundsValidator(0.7, 1.3),
  },
  elo: {
    slug: 'elo',
    ko_name: 'Elo 레이팅',
    unit: 'elo',
    description_ko: 'Elo 레이팅 (1500 기준). 누적 승부 history 압축 — 시즌 누적 강도.',
    source: 'fancystats',
    bounds: { min: 1200, max: 1800 },
    direction: 'higher-better',
    weight_v18: DEFAULT_WEIGHTS.elo,
    validation: makeBoundsValidator(1200, 1800),
  },
  sfr: {
    slug: 'sfr',
    ko_name: '수비 SFR',
    unit: 'count',
    description_ko: '수비 능력 (Shifts/Fielding Runs) — 시즌 누적. 양수 = 평균 이상.',
    source: 'fancystats',
    bounds: { min: -50, max: 50 },
    direction: 'higher-better',
    weight_v18: DEFAULT_WEIGHTS.sfr,
    validation: makeBoundsValidator(-50, 50),
  },
  park_weather: {
    slug: 'park_weather',
    ko_name: '기상 영향',
    unit: 'ratio',
    description_ko: '구장 기상 (저온 / 외야 바람 / 강수) 영향 — Open-Meteo 베이스. v2.1-B shadow only.',
    source: 'derived',
    bounds: { min: 0.7, max: 1.3 },
    direction: 'higher-better',
    weight_v18: DEFAULT_WEIGHTS.park_weather,
    validation: makeBoundsValidator(0.7, 1.3),
  },
  umpire_sz: {
    slug: 'umpire_sz',
    ko_name: '주심 스트라이크 존',
    unit: 'ratio',
    description_ko: '주심 strike zone bias — umpire_stats DB lookup. v2.1-B shadow only.',
    source: 'derived',
    bounds: { min: 0.7, max: 1.3 },
    direction: 'higher-better',
    weight_v18: DEFAULT_WEIGHTS.umpire_sz,
    validation: makeBoundsValidator(0.7, 1.3),
  },
} as const satisfies Record<WeightKey, MetricDefinition>;

/** 등록된 metric slug 리터럴 union. */
export type MetricSlug = keyof typeof MetricRegistry;

/** Production-active (weight_v18 > 0) metric 만 필터. */
export function getProductionMetrics(): readonly MetricDefinition[] {
  return Object.values(MetricRegistry).filter((m) => m.weight_v18 > 0);
}

/**
 * 값이 metric 의 KBO 실재 가능 범위 안인지 확인 — LLM hallucinate catch.
 * 미등록 slug 는 true (=skip) 로 처리하여 보조 metric (winnerProb / brier) 차단 X.
 */
export function isMetricValueValid(slug: string, value: number): boolean {
  const def = (MetricRegistry as Record<string, MetricDefinition>)[slug];
  if (!def) return true;
  return def.validation(value);
}

/**
 * LLM prompt 안 직접 삽입 가능한 metric 정의 한 줄 — Step 3 (Agent 통합) 전
 * 단독 사용 가능.
 *
 * 예: "선발 FIP (sp_fip): BB/HBP/K/HR 만으로 계산한 ERA 등가. 낮을수록 우수. 범위 0~10."
 */
export function renderMetricForLLM(slug: MetricSlug): string {
  const m = MetricRegistry[slug];
  const dirKo = m.direction === 'lower-better' ? '낮을수록' : '높을수록';
  return `${m.ko_name} (${m.slug}): ${m.description_ko} 범위 ${m.bounds.min}~${m.bounds.max} ${dirKo} 우수.`;
}
