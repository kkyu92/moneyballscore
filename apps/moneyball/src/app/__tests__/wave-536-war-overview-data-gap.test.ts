import { describe, it, expect } from 'vitest';
import { WAR_STRONG } from '@moneyball/shared';
import { buildGameOverview, explainFactor } from '@/lib/analysis/factor-explanations';

// wave-536 (cycle 1907): buildGameOverview + explainFactor WAR=0 data gap guard.
// predictor wave-533: WAR=0 → neutral(0.5).
// computeCompositeDuel wave-535: WAR=0 → valid=false.
// factor-explanations: WAR=0 → buildGameOverview 전력 우세 태그 오출력 + explainFactor 데이터 갭 내러티브 부재.

describe('wave-536 — buildGameOverview + explainFactor WAR=0 data gap guard', () => {
  it('buildGameOverview: homeWar=WAR_STRONG awayWar=0 (data gap) → 전력 우세 태그 없음', () => {
    const result = buildGameOverview({
      homeWinProb: 0.55,
      homeTeamName: '두산',
      awayTeamName: '롯데',
      homeWar: WAR_STRONG,
      awayWar: 0,
    });
    expect(result.tags).not.toContain('두산 전력 우세');
    expect(result.tags).not.toContain('롯데 전력 우세');
  });

  it('buildGameOverview: homeWar=0 awayWar=WAR_STRONG (data gap) → 전력 우세 태그 없음', () => {
    const result = buildGameOverview({
      homeWinProb: 0.45,
      homeTeamName: '키움',
      awayTeamName: 'LG',
      homeWar: 0,
      awayWar: WAR_STRONG + 5,
    });
    expect(result.tags).not.toContain('키움 전력 우세');
    expect(result.tags).not.toContain('LG 전력 우세');
  });

  it('buildGameOverview: homeWar=0 awayWar=0 (양팀 data gap) → 전력 우세 태그 없음', () => {
    const result = buildGameOverview({
      homeWinProb: 0.50,
      homeTeamName: 'KT',
      awayTeamName: '두산',
      homeWar: 0,
      awayWar: 0,
    });
    expect(result.tags).not.toContain('KT 전력 우세');
    expect(result.tags).not.toContain('두산 전력 우세');
  });

  it('buildGameOverview: homeWar=22 awayWar=7 (정상 데이터) → 전력 우세 태그 있음', () => {
    const result = buildGameOverview({
      homeWinProb: 0.58,
      homeTeamName: '두산',
      awayTeamName: 'LG',
      homeWar: 22,
      awayWar: 7,
    });
    expect(result.tags).toContain('두산 전력 우세');
  });

  it('explainFactor war: awayWar=0 (data gap) → 미집계 내러티브', () => {
    const result = explainFactor({
      key: 'war',
      factorValue: 0.5,
      details: { homeWar: 18.5, awayWar: 0 },
      homeTeamName: '두산',
      awayTeamName: '롯데',
    });
    expect(result.narrative).toContain('롯데 WAR 미집계');
    expect(result.narrative).toContain('중립 처리');
  });

  it('explainFactor war: homeWar=0 (data gap) → 미집계 내러티브 홈팀 명시', () => {
    const result = explainFactor({
      key: 'war',
      factorValue: 0.5,
      details: { homeWar: 0, awayWar: 22.0 },
      homeTeamName: '키움',
      awayTeamName: 'LG',
    });
    expect(result.narrative).toContain('키움 WAR 미집계');
    expect(result.narrative).toContain('중립 처리');
  });

  it('explainFactor war: homeWar=6 awayWar=18 (정상 데이터) → 약세 전력 내러티브 유지', () => {
    const result = explainFactor({
      key: 'war',
      factorValue: 0.35,
      details: { homeWar: 6.0, awayWar: 18.0 },
      homeTeamName: '두산',
      awayTeamName: 'LG',
    });
    expect(result.narrative).toContain('약세 전력');
    expect(result.narrative).not.toContain('미집계');
  });
});
