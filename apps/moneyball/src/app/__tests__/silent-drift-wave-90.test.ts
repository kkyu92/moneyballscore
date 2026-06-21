import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

const TARGET_FILES = [
  'src/app/methodology/page.tsx',
  'src/app/about/page.tsx',
  'src/app/guide/page.tsx',
] as const;

describe('silent drift wave 90 — Sunday cap 0.55 / 0.45 hardcoded sweep', () => {
  it.each(TARGET_FILES)(
    '%s: no hardcoded Sunday cap "0.55" / "0.45" literals (Sunday cap 문맥)',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      // template `${SUNDAY_CAP_CONFIDENCE}` / `${WINNER_PROB_LEAN}` 만 허용.
      // Sunday cap 문맥 안 명시적 0.55 / 0.45 literal 차단.
      const sundayCapWindow = src
        .split('\n')
        .filter((line) => /Sunday cap|일요일/.test(line))
        .join('\n');
      expect(sundayCapWindow).not.toMatch(/[^{`$]0\.45\b/);
      expect(sundayCapWindow).not.toMatch(/[^{`$]0\.55\b/);
    },
  );

  it('packages/shared exports SUNDAY_CAP_CONFIDENCE = 0.45', () => {
    const src = readFileSync(
      join(ROOT, '../../packages/shared/src/index.ts'),
      'utf8',
    );
    expect(src).toMatch(/export const SUNDAY_CAP_CONFIDENCE = 0\.45/);
  });

  it('judge-agent.ts uses SUNDAY_CAP_CONFIDENCE (no hardcoded 0.45 in Sunday cap block)', () => {
    const src = readFileSync(
      join(ROOT, '../../packages/kbo-data/src/agents/judge-agent.ts'),
      'utf8',
    );
    expect(src).toMatch(/SUNDAY_CAP_CONFIDENCE/);
    // Sunday cap 코드 블록 자체 안 0.45 literal 차단.
    const block = src
      .split('\n')
      .filter((line) => /Sunday|일요일|sundayCap/i.test(line))
      .join('\n');
    expect(block).not.toMatch(/[^{`$]0\.45\b/);
  });
});
