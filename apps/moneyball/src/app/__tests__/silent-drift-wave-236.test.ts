import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(__dirname, '../../../../..');

const TELEGRAM_SRC = readFileSync(join(REPO_ROOT, 'packages/kbo-data/src/notify/telegram.ts'), 'utf-8');
const FINAL_REASONING_SRC = readFileSync(join(REPO_ROOT, 'packages/kbo-data/src/pipeline/final-reasoning.ts'), 'utf-8');
const DB_ERROR_SRC = readFileSync(join(REPO_ROOT, 'packages/shared/src/db-error.ts'), 'utf-8');

describe('silent drift wave 236 — stale cycle-ref annotations packages/kbo-data + shared (cycle 1535)', () => {
  it('telegram.ts does not contain "cycle 463 polish-ui scope D"', () => {
    expect(TELEGRAM_SRC).not.toContain('cycle 463 polish-ui scope D');
  });

  it('telegram.ts does not contain "cycle 477 review-code heavy"', () => {
    expect(TELEGRAM_SRC).not.toContain('cycle 477 review-code heavy');
  });

  it('telegram.ts does not contain "cycle 639 polish-ui scope D"', () => {
    expect(TELEGRAM_SRC).not.toContain('cycle 639 polish-ui scope D');
  });

  it('final-reasoning.ts does not contain "cycle 128 review-code 후속 silent drift fix"', () => {
    expect(FINAL_REASONING_SRC).not.toContain('cycle 128 review-code 후속 silent drift fix');
  });

  it('final-reasoning.ts does not contain "cycle 503 review-code heavy"', () => {
    expect(FINAL_REASONING_SRC).not.toContain('cycle 503 review-code heavy');
  });

  it('final-reasoning.ts does not contain "cycle 502 lesson Finding 3 carry-over"', () => {
    expect(FINAL_REASONING_SRC).not.toContain('cycle 502 lesson Finding 3 carry-over');
  });

  it('final-reasoning.ts does not contain "cycle 128 fix,"', () => {
    expect(FINAL_REASONING_SRC).not.toContain('cycle 128 fix,');
  });

  it('final-reasoning.ts does not contain "cycle 503 grep 확인"', () => {
    expect(FINAL_REASONING_SRC).not.toContain('cycle 503 grep 확인');
  });

  it('final-reasoning.ts does not contain "cycle 386 fix-incident heavy"', () => {
    expect(FINAL_REASONING_SRC).not.toContain('cycle 386 fix-incident heavy');
  });

  it('final-reasoning.ts does not contain "(cycle 384 postview path 만 fix)"', () => {
    expect(FINAL_REASONING_SRC).not.toContain('(cycle 384 postview path 만 fix)');
  });

  it('db-error.ts does not contain "cycle 143 silent drift family cleanup"', () => {
    expect(DB_ERROR_SRC).not.toContain('cycle 143 silent drift family cleanup');
  });

  it('db-error.ts does not contain "cycle 147 review-code (heavy) 가 buildMatchupProfile"', () => {
    expect(DB_ERROR_SRC).not.toContain('cycle 147 review-code (heavy) 가 buildMatchupProfile');
  });

  it('db-error.ts does not contain "cycle 168 (이번)"', () => {
    expect(DB_ERROR_SRC).not.toContain('cycle 168 (이번)');
  });

  it('db-error.ts does not contain "cycle 141 (#132)"', () => {
    expect(DB_ERROR_SRC).not.toContain('cycle 141 (#132)');
  });

  it('db-error.ts does not contain "cycle 142 (#133)"', () => {
    expect(DB_ERROR_SRC).not.toContain('cycle 142 (#133)');
  });
});
