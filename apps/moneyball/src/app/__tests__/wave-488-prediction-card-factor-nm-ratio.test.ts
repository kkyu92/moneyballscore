import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { countFavoringFactors, NEUTRAL_HI, NEUTRAL_LO } from '@/lib/predictions/factorLabels';

// wave-488: PredictionCard 팩터 N:M 카운트 인라인 표시
// Feature-Drift Cycle: review-code (wave-487) → explore-idea (wave-488)
// countFavoringFactors(factors, isHome) → {predictedN, otherM}
// PredictionCard 주요 근거 섹션 인라인 "팩터 N:M" font-mono 표시.

const factorLabelsSrc = readFileSync(
  join(__dirname, '../../lib/predictions/factorLabels.ts'),
  'utf8',
);

const predCardSrc = readFileSync(
  join(__dirname, '../../components/predictions/PredictionCard.tsx'),
  'utf8',
);

describe('wave-488 — PredictionCard 팩터 N:M 카운트 인라인', () => {
  it('countFavoringFactors — home predicted, 홈 우세 다수', () => {
    const factors: Record<string, number> = {
      sp_fip: 0.65,
      sp_xfip: 0.60,
      lineup_woba: 0.70,
      bullpen_fip: 0.58,
      recent_form: 0.40,
      war: 0.52,
      head_to_head: 0.42,
      park_factor: 0.50,
      elo: 0.63,
      sfr: 0.35,
    };
    const { predictedN, otherM } = countFavoringFactors(factors, true);
    // home (>NEUTRAL_HI=0.55): sp_fip, sp_xfip, lineup_woba, bullpen_fip, elo → 5
    expect(predictedN).toBe(5);
    // away (<NEUTRAL_LO=0.45): recent_form, head_to_head, sfr → 3
    expect(otherM).toBe(3);
  });

  it('countFavoringFactors — away predicted, 원정 우세 기준', () => {
    const factors: Record<string, number> = {
      sp_fip: 0.35,
      sp_xfip: 0.40,
      lineup_woba: 0.30,
      bullpen_fip: 0.60,
      recent_form: 0.65,
      war: 0.50,
      head_to_head: 0.38,
      park_factor: 0.52,
      elo: 0.42,
      sfr: 0.55,
    };
    // away predicted = isHome=false
    // predictedN = away-favoring (<NEUTRAL_LO=0.45): sp_fip, sp_xfip, lineup_woba, head_to_head, elo → 5
    // otherM = home-favoring (>NEUTRAL_HI=0.55): bullpen_fip, recent_form → 2
    const { predictedN, otherM } = countFavoringFactors(factors, false);
    expect(predictedN).toBe(5);
    expect(otherM).toBe(2);
  });

  it('countFavoringFactors — 알 수 없는 slug 무시', () => {
    const factors: Record<string, number> = {
      sp_fip: 0.65,
      unknown_factor: 0.80,
    };
    const { predictedN, otherM } = countFavoringFactors(factors, true);
    // unknown_factor 무시 → sp_fip만 집계
    expect(predictedN).toBe(1);
    expect(otherM).toBe(0);
  });

  it('factorLabels.ts — wave-488 JSDoc bullet 존재', () => {
    expect(factorLabelsSrc).toContain(
      'wave-488 PredictionCard 팩터 N:M 카운트 인라인 (cycle 1852)',
    );
  });

  it('factorLabels.ts — countFavoringFactors export 존재', () => {
    expect(factorLabelsSrc).toContain('export function countFavoringFactors(');
  });

  it('PredictionCard.tsx — countFavoringFactors import', () => {
    expect(predCardSrc).toContain('countFavoringFactors');
  });

  it('PredictionCard.tsx — 팩터 N:M font-mono 인라인 표시', () => {
    expect(predCardSrc).toMatch(/팩터 \{predictedN\}:\{otherM\}/);
  });

  it('PredictionCard.tsx — showRatio guard (factors != null && predictedN + otherM >= 2)', () => {
    expect(predCardSrc).toContain('predictedN + otherM >= 2');
  });

  it('NEUTRAL_HI/LO 임계값 확인 — 0.55/0.45', () => {
    expect(NEUTRAL_HI).toBe(0.55);
    expect(NEUTRAL_LO).toBe(0.45);
  });
});
