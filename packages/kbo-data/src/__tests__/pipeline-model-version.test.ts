import { describe, expect, it } from 'vitest';
import {
  decideModelVersion,
  decidePostviewModelVersion,
  CURRENT_SCORING_RULE,
} from '../pipeline/model-version';

describe('decideModelVersion', () => {
  it('promotes to v2.0-debate when API key present and debate succeeded', () => {
    expect(
      decideModelVersion({ hasApiKey: true, debateSucceeded: true }),
    ).toEqual({
      model_version: 'v2.0-debate',
      debate_version: 'v2-persona4',
      scoring_rule: CURRENT_SCORING_RULE,
    });
  });

  // cycle 127 silent drift — daily.ts try/catch 가 runDebate 의 throw 를 받아
  // 정량 fallback 으로 되돌아간 경우, 박제는 v1.8 로 강등돼야
  // /debug/model-comparison 의 v1.6-pure vs v2.0-debate Brier 대조 노이즈 차단.
  // cycle 340 review-code: v1.7-revert → v1.8 (cycle 335 가중치 업그레이드 반영).
  it('downgrades to v1.8 when API key present but debate threw', () => {
    expect(
      decideModelVersion({ hasApiKey: true, debateSucceeded: false }),
    ).toEqual({
      model_version: 'v1.8',
      debate_version: null,
      scoring_rule: CURRENT_SCORING_RULE,
    });
  });

  it('downgrades to v1.8 when API key absent', () => {
    expect(
      decideModelVersion({ hasApiKey: false, debateSucceeded: false }),
    ).toEqual({
      model_version: 'v1.8',
      debate_version: null,
      scoring_rule: CURRENT_SCORING_RULE,
    });
  });

  it('downgrades when API key absent even if succeeded flag accidentally true', () => {
    expect(
      decideModelVersion({ hasApiKey: false, debateSucceeded: true }),
    ).toEqual({
      model_version: 'v1.8',
      debate_version: null,
      scoring_rule: CURRENT_SCORING_RULE,
    });
  });

  it('debate_version is non-null only paired with v2.0-debate model_version', () => {
    const cases = [
      { hasApiKey: true, debateSucceeded: true },
      { hasApiKey: true, debateSucceeded: false },
      { hasApiKey: false, debateSucceeded: true },
      { hasApiKey: false, debateSucceeded: false },
    ];
    for (const c of cases) {
      const d = decideModelVersion(c);
      if (d.debate_version !== null) {
        expect(d.model_version).toBe('v2.0-debate');
      }
      if (d.model_version === 'v2.0-debate') {
        expect(d.debate_version).toBe('v2-persona4');
      }
    }
  });
});

// cycle 384 fix-incident heavy — postview path counterpart. ANTHROPIC credit 소진
// 시 mv='v2.0-postview' 라벨 silent drift 차단 (PR #372 패턴의 postview 확장).
describe('decidePostviewModelVersion', () => {
  it('promotes to v2.0-postview when API key present and agents succeeded', () => {
    expect(
      decidePostviewModelVersion({ hasApiKey: true, agentsSucceeded: true }),
    ).toEqual({
      model_version: 'v2.0-postview',
      debate_version: 'v2-postview',
      scoring_rule: CURRENT_SCORING_RULE,
    });
  });

  it('downgrades to v1.8-postview when API key present but agents fallback', () => {
    expect(
      decidePostviewModelVersion({ hasApiKey: true, agentsSucceeded: false }),
    ).toEqual({
      model_version: 'v1.8-postview',
      debate_version: null,
      scoring_rule: CURRENT_SCORING_RULE,
    });
  });

  it('downgrades to v1.8-postview when API key absent', () => {
    expect(
      decidePostviewModelVersion({ hasApiKey: false, agentsSucceeded: false }),
    ).toEqual({
      model_version: 'v1.8-postview',
      debate_version: null,
      scoring_rule: CURRENT_SCORING_RULE,
    });
  });

  it('downgrades when API key absent even if succeeded flag accidentally true', () => {
    expect(
      decidePostviewModelVersion({ hasApiKey: false, agentsSucceeded: true }),
    ).toEqual({
      model_version: 'v1.8-postview',
      debate_version: null,
      scoring_rule: CURRENT_SCORING_RULE,
    });
  });
});

// cycle 445 review-code heavy 통합 — scoring_rule 단일 source 검증.
describe('CURRENT_SCORING_RULE', () => {
  it('is v1.8 (current weights era, cycle 335+)', () => {
    expect(CURRENT_SCORING_RULE).toBe('v1.8');
  });

  it('is consistently embedded in every decision shape', () => {
    const decisions = [
      decideModelVersion({ hasApiKey: true, debateSucceeded: true }),
      decideModelVersion({ hasApiKey: true, debateSucceeded: false }),
      decideModelVersion({ hasApiKey: false, debateSucceeded: false }),
      decidePostviewModelVersion({ hasApiKey: true, agentsSucceeded: true }),
      decidePostviewModelVersion({ hasApiKey: true, agentsSucceeded: false }),
      decidePostviewModelVersion({ hasApiKey: false, agentsSucceeded: false }),
    ];
    for (const d of decisions) {
      expect(d.scoring_rule).toBe(CURRENT_SCORING_RULE);
    }
  });
});
