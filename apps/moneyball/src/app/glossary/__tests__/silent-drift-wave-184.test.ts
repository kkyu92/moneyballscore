import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DATA_PATH = join(__dirname, '../data.ts');
const SRC = readFileSync(DATA_PATH, 'utf8');

describe('silent drift wave 184 — glossary brier-score stale n=/Brier literal redirect', () => {
  it('brier-score range does not hardcode stale sample size (n=119 등)', () => {
    const brierBlock = SRC.match(/id: 'brier-score'[\s\S]*?source:/);
    expect(brierBlock).not.toBeNull();
    expect(brierBlock![0]).not.toMatch(/n\s*=\s*\d{2,4}/);
  });

  it('brier-score range does not hardcode stale Brier decimal (0.246 등)', () => {
    const brierBlock = SRC.match(/id: 'brier-score'[\s\S]*?source:/);
    expect(brierBlock).not.toBeNull();
    expect(brierBlock![0]).not.toMatch(/0\.24[0-9]|0\.27[0-9]|0\.29[0-9]/);
  });

  it('brier-score range redirects to /accuracy for live measurement', () => {
    const brierBlock = SRC.match(/id: 'brier-score'[\s\S]*?source:/);
    expect(brierBlock).not.toBeNull();
    expect(brierBlock![0]).toMatch(/\/accuracy/);
  });
});
