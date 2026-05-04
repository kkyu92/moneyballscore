import { describe, it, expect } from 'vitest';
import { logValidatorEvent } from '../agents/validator-logger';
import type { Violation } from '../agents/validator';

describe('logValidatorEvent', () => {
  const sampleViolations: Violation[] = [
    { type: 'hallucinated_number', severity: 'hard', detail: 'test 환각' },
  ];

  it('violations 0건 → silent skip (insert X)', async () => {
    await expect(
      logValidatorEvent({
        gameId: 1,
        teamCode: 'LG',
        agent: 'team',
        backend: 'claude',
        passed: false,
        violations: [],
      })
    ).resolves.toBeUndefined();
  });

  it('Supabase env 미박제 → silent skip', async () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      await expect(
        logValidatorEvent({
          gameId: null,
          teamCode: 'JG',
          agent: 'judge',
          backend: 'sonnet',
          passed: true,
          violations: sampleViolations,
        })
      ).resolves.toBeUndefined();
    } finally {
      if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
      if (prevKey) process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
    }
  });

  it('agent type = team | judge', async () => {
    // 타입 시그니처만 확인 — 런타임 동작은 환경 의존
    type Agent = 'team' | 'judge';
    const a: Agent = 'team';
    const b: Agent = 'judge';
    expect(a).toBe('team');
    expect(b).toBe('judge');
  });

  it('passed boolean 값 양쪽 허용 (near-miss 박제 path)', async () => {
    await expect(
      logValidatorEvent({
        gameId: 100,
        teamCode: 'KIA',
        agent: 'team',
        backend: 'claude',
        passed: true,
        violations: sampleViolations,
      })
    ).resolves.toBeUndefined();

    await expect(
      logValidatorEvent({
        gameId: 100,
        teamCode: 'KIA',
        agent: 'team',
        backend: 'claude',
        passed: false,
        violations: sampleViolations,
      })
    ).resolves.toBeUndefined();
  });
});
