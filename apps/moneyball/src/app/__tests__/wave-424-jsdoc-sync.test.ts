import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CONVERGENCE_RECORD_RECENT_LIMIT,
  CONVERGENCE_RECORD_LOOKBACK_DAYS,
} from '@moneyball/shared';

const SHARED_INDEX = join(__dirname, '../../../../../packages/shared/src/index.ts');

// wave-424 JSDoc sync — CONVERGENCE_RECORD_RECENT_LIMIT / CONVERGENCE_RECORD_LOOKBACK_DAYS
// 최근 10경기 rolling 성적 표시에서 도입된 상수.
// magic number 45(일)/10(경기) → 단일 source 상수로 추출.
// display text "최근{N}경기" → "최근 {N}경기" 공백 포함 (wave-424 fix).

describe('wave-424 JSDoc sync — rolling 성적 상수 가드', () => {
  let src: string;

  beforeAll(() => {
    src = readFileSync(SHARED_INDEX, 'utf-8');
  });

  it('CONVERGENCE_RECORD_RECENT_LIMIT = 10 (rolling window 기본값)', () => {
    expect(CONVERGENCE_RECORD_RECENT_LIMIT).toBe(10);
  });

  it('CONVERGENCE_RECORD_LOOKBACK_DAYS = 45 (45일 lookback)', () => {
    expect(CONVERGENCE_RECORD_LOOKBACK_DAYS).toBe(45);
  });

  it('CONVERGENCE_RECORD_RECENT_LIMIT JSDoc 에 wave-424 참조 존재', () => {
    const block = src.match(/\/\*\*[\s\S]*?CONVERGENCE_RECORD_RECENT_LIMIT = 10/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('wave-424');
  });

  it('CONVERGENCE_RECORD_LOOKBACK_DAYS JSDoc 에 wave-424 참조 존재', () => {
    const block = src.match(/\/\*\*[\s\S]*?CONVERGENCE_RECORD_LOOKBACK_DAYS = 45/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('wave-424');
  });

  it('FACTOR_PICK_MIN_FACTORS JSDoc 에 wave-424 참조 존재', () => {
    const block = src.match(/\/\*\*[\s\S]*?FACTOR_PICK_MIN_FACTORS = 7/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('wave-424');
  });

  it('COMPOSITE_DUEL_MIN_VALID JSDoc 에 wave-424 참조 존재', () => {
    const block = src.match(/\/\*\*[\s\S]*?COMPOSITE_DUEL_MIN_VALID = 4/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('wave-424');
  });
});
