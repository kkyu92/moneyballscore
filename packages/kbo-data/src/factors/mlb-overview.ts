import type { MlbWaterfallBar } from './mlb-waterfall';

// MLB 개별 경기 "AI 종합 분석 요약" prose — KBO GameAnalysisProse parity (cycle 2104
// computeMlbWaterfall 이 이미 계산해둔 bar 를 재사용, 신규 팩터 계산/DB 조회 없음).
// KBO 는 factors JSONB(debate 파이프라인 산출) 를 explainFactor 로 서술하지만 MLB 는
// debate 단계 자체가 없어(순수 정량 pipeline, mlb-pipeline.ts) waterfall bar 의
// contribution/direction 만으로 동일한 역할의 서술 생성.

const PITCHING_FACTORS = new Set(['sp_fip', 'sp_xfip', 'bullpen_fip']);
const BATTING_FACTORS = new Set(['lineup_woba', 'war', 'lineup_xwoba', 'lineup_barrel_pct']);
const SITUATIONAL_FACTORS = new Set(['home_advantage', 'park_factor', 'elo', 'recent_form', 'head_to_head']);

// contribution 이 이 pp 미만이면 "우세"로 서술할 만큼 유의미하지 않음 (neutral 처리).
// mlb-factor-detail.ts(DetailedFactorAnalysis parity)도 동일 임계 재사용 — 두 화면이
// 서로 다른 "우세" 판정 기준을 갖는 drift 방지.
export const NARRATIVE_MIN_PP = 0.1;

export interface MlbGameOverviewNarrative {
  pitching: string[];
  batting: string[];
  situational: string[];
}

// mlb-factor-detail.ts 가 per-row 문장 생성에 그대로 재사용 (GameOverview 요약 문장과
// 동일 wording 보장 — 화면마다 다른 문구로 갈라지는 drift 방지).
export function toSentence(
  bar: MlbWaterfallBar,
  homeTeamName: string,
  awayTeamName: string,
  locale: 'ko' | 'en',
): string | null {
  const pp = Math.round(bar.contribution * 1000) / 10;
  if (Math.abs(pp) < NARRATIVE_MIN_PP) return null;
  const team = bar.direction === 'home' ? homeTeamName : bar.direction === 'away' ? awayTeamName : null;
  if (!team) return null;
  return locale === 'en'
    ? `${team} has the edge in ${bar.label} (${Math.abs(pp)}pp).`
    : `${bar.label}에서 ${team} 우세(${Math.abs(pp)}%p).`;
}

export function buildMlbGameOverview(
  bars: MlbWaterfallBar[],
  homeTeamName: string,
  awayTeamName: string,
  locale: 'ko' | 'en' = 'ko',
): MlbGameOverviewNarrative {
  const build = (keys: Set<string>) =>
    bars
      .filter((b) => keys.has(b.factor))
      .map((b) => toSentence(b, homeTeamName, awayTeamName, locale))
      .filter((s): s is string => s !== null);

  return {
    pitching: build(PITCHING_FACTORS),
    batting: build(BATTING_FACTORS),
    situational: build(SITUATIONAL_FACTORS),
  };
}
