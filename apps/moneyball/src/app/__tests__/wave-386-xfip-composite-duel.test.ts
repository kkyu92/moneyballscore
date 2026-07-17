import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SP_XFIP_DUEL_MIN } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

/** 9팩터 COMPOSITE_DUEL 선발xFIP 팩터 로직 재현 */
function computeSpXfipResult(
  homeSPXfip: number | null | undefined,
  awaySPXfip: number | null | undefined,
): 'home' | 'away' | null {
  if (homeSPXfip == null || awaySPXfip == null) return null;
  if (awaySPXfip - homeSPXfip >= SP_XFIP_DUEL_MIN) return 'home';
  if (homeSPXfip - awaySPXfip >= SP_XFIP_DUEL_MIN) return 'away';
  return null;
}

describe('wave-386 — COMPOSITE_DUEL 선발xFIP 9팩터 편입 (cycle 1729)', () => {
  it('SP_XFIP_DUEL_MIN = 0.5', () => {
    expect(SP_XFIP_DUEL_MIN).toBe(0.5);
  });

  it('홈 xFIP 3.00 / 원정 xFIP 3.60 → gap=0.60 ≥ 0.5 → home', () => {
    expect(computeSpXfipResult(3.0, 3.6)).toBe('home');
  });

  it('홈 xFIP 3.60 / 원정 xFIP 3.00 → gap=0.60 ≥ 0.5 → away', () => {
    expect(computeSpXfipResult(3.6, 3.0)).toBe('away');
  });

  it('홈 xFIP 3.00 / 원정 xFIP 3.40 → gap=0.40 < 0.5 → null (중립)', () => {
    expect(computeSpXfipResult(3.0, 3.4)).toBeNull();
  });

  it('경계값: gap = SP_XFIP_DUEL_MIN (0.5) → home', () => {
    expect(computeSpXfipResult(3.0, 3.5)).toBe('home');
  });

  it('경계값: gap = SP_XFIP_DUEL_MIN (0.5) → away', () => {
    expect(computeSpXfipResult(3.5, 3.0)).toBe('away');
  });

  it('homeSPXfip=null → null (데이터 부재)', () => {
    expect(computeSpXfipResult(null, 3.5)).toBeNull();
  });

  it('awaySPXfip=null → null (데이터 부재)', () => {
    expect(computeSpXfipResult(3.5, null)).toBeNull();
  });

  it('computeCompositeDuel.ts: wave-386 xFIP 팩터 포함', () => {
    const src = readFileSync(join(__dirname, '../../../src/lib/analysis/computeCompositeDuel.ts'), 'utf8');
    expect(src).toContain('wave-386');
    expect(src).toContain('spXfipResult');
    expect(src).toContain('SP_XFIP_DUEL_MIN');
    expect(src).toContain('g.homeSPXfip != null && g.awaySPXfip != null');
  });

  it('analysis/page.tsx: computeCompositeDuel 헬퍼 통해 xFIP 팩터 사용', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('computeCompositeDuel');
    expect(src).toContain('homeSPXfip: g.homeSPXfip');
  });
});
