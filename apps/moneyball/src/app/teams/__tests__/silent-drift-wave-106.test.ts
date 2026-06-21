import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');

const TARGETS = [
  'src/app/guide/page.tsx',
  'src/app/methodology/page.tsx',
  'src/app/accuracy/page.tsx',
  'src/app/glossary/data.ts',
  'src/app/debug/model-comparison/page.tsx',
  'src/app/debug/reliability/page.tsx',
];

// 사용자 가시 Brier-baseline 문구 패턴 — strokeOpacity="0.25" 같은 SVG prop
// 또는 JSDoc 코멘트는 의도된 별도 의미라 sweep 대상 X.
const BRIER_PROSE_PATTERNS: RegExp[] = [
  /0\.25\s*=\s*동전/,
  /0\.25\s*=\s*baseline/i,
  /coin[_ ]?flip\s*baseline\s*=\s*0\.25/i,
  /0\.25000/,
];

describe('silent drift wave 106 — BRIER_BASELINE 0.25 coin-flip literal sweep', () => {
  for (const rel of TARGETS) {
    it(`${rel}: no hardcoded "0.25 = 동전/baseline" / "coin_flip = 0.25" / "0.25000" Brier prose`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      // JSDoc 코멘트 / 한줄 코멘트 strip — Brier 코멘트는 source 의 의도된 docstring.
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      for (const pat of BRIER_PROSE_PATTERNS) {
        expect(stripped).not.toMatch(pat);
      }
    });
    it(`${rel}: imports BRIER_BASELINE from @moneyball/shared`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).toMatch(/BRIER_BASELINE/);
      expect(src).toMatch(/@moneyball\/shared/);
    });
  }
});
