import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 101 — accuracy/page.tsx + buildAccuracyData Sunday cap user-visible text', () => {
  it('accuracy/page.tsx: Sunday cap 문맥 안 하드코딩 "45%" / "0.45" 차단', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/accuracy/page.tsx'),
      'utf8',
    );
    const sundayWindow = src
      .split('\n')
      .filter((line) => /Sunday cap|일요일|상한/.test(line))
      .join('\n');
    expect(sundayWindow).not.toMatch(/[^{`$]45%/);
    expect(sundayWindow).not.toMatch(/[^{`$]0\.45\b/);
    expect(src).toMatch(/SUNDAY_CAP_CONFIDENCE/);
  });

  it('buildAccuracyData.ts: VERSION_NOTES 안 하드코딩 "0.45" / "0.55" 차단 (일요일 상한 문맥)', () => {
    const src = readFileSync(
      join(ROOT, 'src/lib/accuracy/buildAccuracyData.ts'),
      'utf8',
    );
    const sundayWindow = src
      .split('\n')
      .filter((line) => /일요일 상한/.test(line))
      .join('\n');
    expect(sundayWindow).not.toMatch(/[^{`$]0\.45\b/);
    expect(sundayWindow).not.toMatch(/[^{`$]0\.55\b/);
    expect(src).toMatch(/SUNDAY_CAP_CONFIDENCE/);
    expect(src).toMatch(/WINNER_PROB_LEAN/);
  });

  it('packages/shared exports SUNDAY_CAP_CONFIDENCE = 0.45 (wave 90 registry 유지)', () => {
    const src = readFileSync(
      join(ROOT, '../../packages/shared/src/index.ts'),
      'utf8',
    );
    expect(src).toMatch(/export const SUNDAY_CAP_CONFIDENCE = 0\.45/);
  });
});
