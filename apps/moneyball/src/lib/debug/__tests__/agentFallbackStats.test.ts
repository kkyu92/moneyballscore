import { describe, it, expect } from 'vitest';
import {
  buildAgentFallbackCohort,
  categorizeAgentError,
  type PredictionForFallback,
} from '../agentFallbackStats';

// cycle 986 — /debug/agent-fallback dashboard 데이터 가공 regression guard.
// L1+L2+L3 통합 효과 측정 path 박제 검증.

function mkRow(
  id: number,
  createdAt: string,
  reasoning: unknown
): PredictionForFallback {
  return { id, created_at: createdAt, reasoning };
}

describe('buildAgentFallbackCohort', () => {
  it('empty rows → 0 stats', () => {
    const c = buildAgentFallbackCohort([], 14);
    expect(c.total).toBe(0);
    expect(c.fullDebate).toBe(0);
    expect(c.agentsFailed).toBe(0);
    expect(c.quantOnly).toBe(0);
    expect(c.fullDebateRate).toBe(0);
  });

  it('fullDebate row (judge+home+away 모두) → fullDebate++', () => {
    const rows = [
      mkRow(1, '2026-05-26T07:18:00Z', {
        debate: {
          verdict: { reasoning: 'judge 가 본 게임에서 어떻게 분석했나 충분 길이의 reasoning text 박제. 양 팀 데이터 분석 후 결정. 50자 이상 보장하여 hasJudge true 분류 검증.' },
          homeArgument: { reasoning: '홈팀 관점 분석 충분 길이 reasoning text 박제 — 30자 이상 보장하여 hasHome true 분류 검증' },
          awayArgument: { reasoning: '원정팀 관점 분석 충분 길이 reasoning text 박제 — 30자 이상 보장하여 hasAway true 분류 검증' },
        },
      }),
    ];
    const c = buildAgentFallbackCohort(rows, 14);
    expect(c.total).toBe(1);
    expect(c.fullDebate).toBe(1);
    expect(c.fullDebateRate).toBe(1);
  });

  it('agentsFailed=true → agentsFailed++ + errorCategory count', () => {
    const rows = [
      mkRow(1, '2026-05-26T07:18:00Z', {
        debate: {
          verdict: { reasoning: 'judge 가 본 게임에서 어떻게 분석했나 충분 길이의 reasoning text 박제 — 50자 이상 보장 hasJudge true 분류 검증.' },
          homeArgument: { reasoning: '정량 모델 기반 분석' },
          awayArgument: { reasoning: '정량 모델 기반 분석' },
          agentsFailed: true,
          agentError: 'validator: hallucinated_number:hard (주입 블록에 없는 수치 3개)',
        },
      }),
    ];
    const c = buildAgentFallbackCohort(rows, 14);
    expect(c.agentsFailed).toBe(1);
    expect(c.errorCategories.hallucinated_number).toBe(1);
  });

  it('quantOnly fallback (에이전트 토론 불가 메시지) → quantOnly++', () => {
    const rows = [
      mkRow(1, '2026-05-14T12:00:00Z', {
        debate: {
          verdict: { reasoning: '에이전트 토론 불가. 정량 모델 v1.5 결과 사용.' },
        },
      }),
    ];
    const c = buildAgentFallbackCohort(rows, 14);
    expect(c.quantOnly).toBe(1);
    expect(c.quantOnlyRate).toBe(1);
  });

  it('debate 부재 → quantOnly (judge 부재 fallback 분류)', () => {
    const rows = [mkRow(1, '2026-05-26T07:18:00Z', null)];
    const c = buildAgentFallbackCohort(rows, 14);
    expect(c.quantOnly).toBe(1);
  });

  it('일자별 aggregation desc 정렬', () => {
    const rows = [
      mkRow(1, '2026-05-26T07:18:00Z', { debate: { verdict: { reasoning: '에이전트 토론 불가.' } } }),
      mkRow(2, '2026-05-25T07:18:00Z', { debate: { verdict: { reasoning: '에이전트 토론 불가.' } } }),
      mkRow(3, '2026-05-26T08:18:00Z', { debate: { verdict: { reasoning: '에이전트 토론 불가.' } } }),
    ];
    const c = buildAgentFallbackCohort(rows, 14);
    expect(c.daily[0].date).toBe('2026-05-26');
    expect(c.daily[0].total).toBe(2);
    expect(c.daily[1].date).toBe('2026-05-25');
    expect(c.daily[1].total).toBe(1);
  });

  it('mixed cohort → 모든 카테고리 정합 카운트', () => {
    const rows = [
      // 1 fullDebate
      mkRow(1, '2026-05-26T07:18:00Z', {
        debate: {
          verdict: { reasoning: 'judge 가 본 게임 분석 충분 길이의 reasoning text 박제 — 50자 이상 보장 mixed cohort fullDebate 분류.' },
          homeArgument: { reasoning: '홈팀 reasoning 충분 길이 박제 — 30자 이상 보장 hasHome true 분류 검증' },
          awayArgument: { reasoning: '원정팀 reasoning 충분 길이 박제 — 30자 이상 보장 hasAway true 분류 검증' },
        },
      }),
      // 2 agentsFailed (529)
      mkRow(2, '2026-05-19T07:18:00Z', {
        debate: {
          verdict: { reasoning: 'fallback reasoning 충분 길이 박제 path. 50자 이상 보장 hasJudge true 분류 + agentsFailed 분기.' },
          homeArgument: { reasoning: '정량 모델 기반 분석' },
          awayArgument: { reasoning: '정량 모델 기반 분석' },
          agentsFailed: true,
          agentError: 'SERVER_ERROR 529: Overloaded',
        },
      }),
      // 3 quantOnly
      mkRow(3, '2026-05-13T07:18:00Z', {
        debate: { verdict: { reasoning: '에이전트 토론 불가. 정량 모델 단독 fallback' } },
      }),
    ];
    const c = buildAgentFallbackCohort(rows, 14);
    expect(c.total).toBe(3);
    expect(c.fullDebate).toBe(1);
    expect(c.agentsFailed).toBe(1);
    expect(c.quantOnly).toBe(1);
    expect(c.errorCategories.server_error_529).toBe(1);
  });
});

describe('categorizeAgentError', () => {
  it('SERVER_ERROR 529 → server_error_529', () => {
    expect(categorizeAgentError('SERVER_ERROR 529: Overloaded')).toBe('server_error_529');
  });

  it('hallucinated_number → hallucinated_number', () => {
    expect(categorizeAgentError('validator: hallucinated_number:hard (수치 3개)')).toBe('hallucinated_number');
  });

  it('invented_player_name → invented_player_name', () => {
    expect(categorizeAgentError('validator: invented_player_name:hard (안타들)')).toBe('invented_player_name');
  });

  it('빈 메시지 → other', () => {
    expect(categorizeAgentError('')).toBe('other');
  });

  it('429 timeout → other_api_error', () => {
    expect(categorizeAgentError('Connection timeout 429')).toBe('other_api_error');
  });

  it('알 수 없는 메시지 → other', () => {
    expect(categorizeAgentError('something weird')).toBe('other');
  });
});
