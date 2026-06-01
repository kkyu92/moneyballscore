import { describe, it, expect } from 'vitest';
import {
  isBigMatchEnabled,
  isV2ModelEnabled,
  isV21BShadowEnabled,
  isDebateEnabled,
  isPostviewEnabled,
} from '@/lib/feature-flags';

describe('isBigMatchEnabled (rollout flag, default false)', () => {
  it('env=true → true', () => {
    expect(isBigMatchEnabled({ BIGMATCH_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it('env=false → false', () => {
    expect(isBigMatchEnabled({ BIGMATCH_ENABLED: 'false' } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('env 미설정 → false (안전 기본)', () => {
    expect(isBigMatchEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('env=1 (잘못된 값) → false (string 비교)', () => {
    expect(isBigMatchEnabled({ BIGMATCH_ENABLED: '1' } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe('isV2ModelEnabled (rollout flag, default false)', () => {
  it('env=true → true', () => {
    expect(isV2ModelEnabled({ V2_MODEL_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it('env=false → false', () => {
    expect(isV2ModelEnabled({ V2_MODEL_ENABLED: 'false' } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('env 미설정 → false (안전 기본 — v2.0 rollout 시작 전)', () => {
    expect(isV2ModelEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('env=1 (잘못된 값) → false (string 비교)', () => {
    expect(isV2ModelEnabled({ V2_MODEL_ENABLED: '1' } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe('isV21BShadowEnabled (kill switch, default true)', () => {
  it('env=true → true', () => {
    expect(isV21BShadowEnabled({ V21B_SHADOW_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it('env=false → false (kill switch 활성)', () => {
    expect(isV21BShadowEnabled({ V21B_SHADOW_ENABLED: 'false' } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('env 미설정 → true (default 활성 — shadow path 운영 중)', () => {
    expect(isV21BShadowEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it("env='0' (잘못된 값) → true (literal 'false' 만 kill)", () => {
    expect(isV21BShadowEnabled({ V21B_SHADOW_ENABLED: '0' } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});

describe('isDebateEnabled (kill switch, default true)', () => {
  it('env=true → true', () => {
    expect(isDebateEnabled({ DEBATE_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it('env=false → false (Anthropic credit 소진 운영 kill)', () => {
    expect(isDebateEnabled({ DEBATE_ENABLED: 'false' } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('env 미설정 → true (default 활성 — 현재 LLM debate 운영 중)', () => {
    expect(isDebateEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it("env='0' (잘못된 값) → true (literal 'false' 만 kill)", () => {
    expect(isDebateEnabled({ DEBATE_ENABLED: '0' } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});

describe('isPostviewEnabled (kill switch, default true)', () => {
  it('env=true → true', () => {
    expect(isPostviewEnabled({ POSTVIEW_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it('env=false → false (Anthropic credit 소진 운영 kill)', () => {
    expect(isPostviewEnabled({ POSTVIEW_ENABLED: 'false' } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('env 미설정 → true (default 활성 — 현재 LLM postview 운영 중)', () => {
    expect(isPostviewEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it("env='0' (잘못된 값) → true (literal 'false' 만 kill)", () => {
    expect(isPostviewEnabled({ POSTVIEW_ENABLED: '0' } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});
