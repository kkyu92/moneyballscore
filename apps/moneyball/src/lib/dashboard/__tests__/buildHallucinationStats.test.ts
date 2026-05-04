import { describe, it, expect } from 'vitest';
import { buildHallucinationStats, type ValidatorLogInput } from '../buildHallucinationStats';

function makeLog(overrides: Partial<ValidatorLogInput> = {}): ValidatorLogInput {
  return {
    severity: 'hard',
    violation_type: 'hallucinated_number',
    backend: 'claude',
    created_at: '2026-05-04T10:00:00Z',
    ...overrides,
  };
}

describe('buildHallucinationStats', () => {
  it('빈 입력 → total 0 + 빈 분포 + N 일 빈 bucket', () => {
    const stats = buildHallucinationStats([], { now: new Date('2026-05-04T00:00:00Z'), days: 7 });
    expect(stats.total).toBe(0);
    expect(stats.hardCount).toBe(0);
    expect(stats.warnCount).toBe(0);
    expect(stats.byType).toHaveLength(0);
    expect(stats.byBackend).toHaveLength(0);
    expect(stats.daily).toHaveLength(7);
    expect(stats.daily.every((d) => d.total === 0)).toBe(true);
  });

  it('hard / warn 카운트 분리', () => {
    const logs = [
      makeLog({ severity: 'hard' }),
      makeLog({ severity: 'hard' }),
      makeLog({ severity: 'warn' }),
    ];
    const stats = buildHallucinationStats(logs, { now: new Date('2026-05-04T00:00:00Z') });
    expect(stats.total).toBe(3);
    expect(stats.hardCount).toBe(2);
    expect(stats.warnCount).toBe(1);
  });

  it('사유별 % 계산 (count desc 정렬)', () => {
    const logs = [
      makeLog({ violation_type: 'hallucinated_number' }),
      makeLog({ violation_type: 'hallucinated_number' }),
      makeLog({ violation_type: 'hallucinated_number' }),
      makeLog({ violation_type: 'invented_player_name' }),
    ];
    const stats = buildHallucinationStats(logs, { now: new Date('2026-05-04T00:00:00Z') });
    expect(stats.byType[0].key).toBe('hallucinated_number');
    expect(stats.byType[0].count).toBe(3);
    expect(stats.byType[0].pct).toBe(75);
    expect(stats.byType[1].key).toBe('invented_player_name');
    expect(stats.byType[1].pct).toBe(25);
  });

  it('backend별 % 계산', () => {
    const logs = [
      makeLog({ backend: 'claude' }),
      makeLog({ backend: 'deepseek' }),
      makeLog({ backend: 'deepseek' }),
      makeLog({ backend: 'deepseek' }),
    ];
    const stats = buildHallucinationStats(logs, { now: new Date('2026-05-04T00:00:00Z') });
    expect(stats.byBackend[0].key).toBe('deepseek');
    expect(stats.byBackend[0].pct).toBe(75);
    expect(stats.byBackend[1].key).toBe('claude');
    expect(stats.byBackend[1].pct).toBe(25);
  });

  it('일자별 bucket 박제 (KST 기준)', () => {
    // 2026-05-04 09:00 UTC = KST 18:00 → 2026-05-04
    // 2026-05-03 14:00 UTC = KST 23:00 → 2026-05-03
    const logs = [
      makeLog({ severity: 'hard', created_at: '2026-05-04T09:00:00Z' }),
      makeLog({ severity: 'warn', created_at: '2026-05-04T09:00:00Z' }),
      makeLog({ severity: 'hard', created_at: '2026-05-03T14:00:00Z' }),
    ];
    const stats = buildHallucinationStats(logs, {
      now: new Date('2026-05-04T00:00:00Z'),
      days: 7,
    });
    const may4 = stats.daily.find((d) => d.date === '2026-05-04');
    const may3 = stats.daily.find((d) => d.date === '2026-05-03');
    expect(may4?.hard).toBe(1);
    expect(may4?.warn).toBe(1);
    expect(may4?.total).toBe(2);
    expect(may3?.hard).toBe(1);
    expect(may3?.total).toBe(1);
  });

  it('범위 밖 (N+1 일 전) 로그는 daily 에 박제 X (total 만 카운트)', () => {
    const logs = [
      makeLog({ created_at: '2026-04-25T09:00:00Z' }), // 9일 전 — 범위 밖
      makeLog({ created_at: '2026-05-04T09:00:00Z' }),
    ];
    const stats = buildHallucinationStats(logs, {
      now: new Date('2026-05-04T00:00:00Z'),
      days: 7,
    });
    expect(stats.total).toBe(2);
    expect(stats.daily.reduce((s, d) => s + d.total, 0)).toBe(1);
  });

  it('날짜 unknown (created_at 손상) → daily skip 하되 total 박제', () => {
    const logs = [makeLog({ created_at: 'invalid-date' })];
    const stats = buildHallucinationStats(logs, {
      now: new Date('2026-05-04T00:00:00Z'),
      days: 7,
    });
    expect(stats.total).toBe(1);
    expect(stats.daily.reduce((s, d) => s + d.total, 0)).toBe(0);
  });

  it('daily bucket 오름차순 정렬', () => {
    const stats = buildHallucinationStats([], { now: new Date('2026-05-04T00:00:00Z'), days: 3 });
    expect(stats.daily.map((d) => d.date)).toEqual([
      '2026-05-02',
      '2026-05-03',
      '2026-05-04',
    ]);
  });
});
