import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * cycle 1127 plan-v17 candidate N Tier 2 callsite swap 박제 검증.
 *
 * grep 기반 정합 테스트 (pipeline-postview-daily-shadow-row.test.ts 패턴 정합).
 * heavy mock 없이 wire 위치 정합 + 의도된 호출 순서 박제 차단.
 */

const REPO_ROOT = resolve(__dirname, '../../../../');
const DAILY_PATH = resolve(REPO_ROOT, 'packages/kbo-data/src/pipeline/daily.ts');
const POSTVIEW_PATH = resolve(REPO_ROOT, 'packages/kbo-data/src/pipeline/postview-daily.ts');
const FLAGS_PATH = resolve(REPO_ROOT, 'packages/shared/src/feature-flags.ts');

describe('feature-flag callsite wire (cycle 1127 plan-v17 candidate N Tier 2)', () => {
  it('packages/shared/src/feature-flags.ts 박제 + 5 reader export', async () => {
    const src = readFileSync(FLAGS_PATH, 'utf8');
    expect(src).toContain('export function isBigMatchEnabled');
    expect(src).toContain('export function isV2ModelEnabled');
    expect(src).toContain('export function isV21BShadowEnabled');
    expect(src).toContain('export function isDebateEnabled');
    expect(src).toContain('export function isPostviewEnabled');

    const shared = await import('@moneyball/shared');
    expect(typeof shared.isBigMatchEnabled).toBe('function');
    expect(typeof shared.isV2ModelEnabled).toBe('function');
    expect(typeof shared.isV21BShadowEnabled).toBe('function');
    expect(typeof shared.isDebateEnabled).toBe('function');
    expect(typeof shared.isPostviewEnabled).toBe('function');
  });

  it('daily.ts predict() 호출이 isV2ModelEnabled() ? SHADOW_V20_WEIGHTS 가중치 swap 박제', () => {
    const src = readFileSync(DAILY_PATH, 'utf8');
    expect(src).toContain('isV2ModelEnabled');
    expect(src).toContain('SHADOW_V20_WEIGHTS');
    expect(src).toMatch(/predict\(input,\s*\{\s*weights:\s*productionWeights/);
  });

  it('daily.ts insertShadowRow (v2.1-B) 가 isV21BShadowEnabled() kill switch 으로 감쌈', () => {
    const src = readFileSync(DAILY_PATH, 'utf8');
    expect(src).toMatch(/if\s*\(\s*isV21BShadowEnabled\(\)\s*\)/);
  });

  it('daily.ts debate 진입 조건 = ANTHROPIC_API_KEY && isDebateEnabled()', () => {
    const src = readFileSync(DAILY_PATH, 'utf8');
    expect(src).toMatch(/process\.env\.ANTHROPIC_API_KEY\s*&&\s*isDebateEnabled\(\)/);
  });

  it('postview-daily.ts runPostview() 가 isPostviewEnabled() 조건부 — false 시 fallback 박제', () => {
    const src = readFileSync(POSTVIEW_PATH, 'utf8');
    expect(src).toContain('isPostviewEnabled');
    expect(src).toContain('POSTVIEW_ENABLED=false');
    expect(src).toContain('deriveFactorErrorsFallback');
  });
});

describe('feature-flag default 동작 — env 미설정 시 production 동작 변경 X', () => {
  it('isV2ModelEnabled default false (rollout flag) — predict() 가중치 DEFAULT_WEIGHTS 유지', async () => {
    const { isV2ModelEnabled } = await import('@moneyball/shared');
    expect(isV2ModelEnabled({} as NodeJS.ProcessEnv)).toBe(false);
  });

  it('isV21BShadowEnabled default true (kill switch) — shadow row insert 유지', async () => {
    const { isV21BShadowEnabled } = await import('@moneyball/shared');
    expect(isV21BShadowEnabled({} as NodeJS.ProcessEnv)).toBe(true);
  });

  it('isDebateEnabled default true (kill switch) — debate path 유지', async () => {
    const { isDebateEnabled } = await import('@moneyball/shared');
    expect(isDebateEnabled({} as NodeJS.ProcessEnv)).toBe(true);
  });

  it('isPostviewEnabled default true (kill switch) — postview path 유지', async () => {
    const { isPostviewEnabled } = await import('@moneyball/shared');
    expect(isPostviewEnabled({} as NodeJS.ProcessEnv)).toBe(true);
  });

  it('env literal "false" 시 kill switch 활성 — V21B_SHADOW/DEBATE/POSTVIEW=false 즉시 차단', async () => {
    const { isV21BShadowEnabled, isDebateEnabled, isPostviewEnabled } = await import(
      '@moneyball/shared'
    );
    const env = {
      V21B_SHADOW_ENABLED: 'false',
      DEBATE_ENABLED: 'false',
      POSTVIEW_ENABLED: 'false',
    } as unknown as NodeJS.ProcessEnv;
    expect(isV21BShadowEnabled(env)).toBe(false);
    expect(isDebateEnabled(env)).toBe(false);
    expect(isPostviewEnabled(env)).toBe(false);
  });

  it('V2_MODEL_ENABLED=true → isV2ModelEnabled true (rollout 활성)', async () => {
    const { isV2ModelEnabled } = await import('@moneyball/shared');
    expect(
      isV2ModelEnabled({ V2_MODEL_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv),
    ).toBe(true);
  });
});
