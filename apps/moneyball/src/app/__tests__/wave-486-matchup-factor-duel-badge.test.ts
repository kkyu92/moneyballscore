import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FACTOR_LABELS_SHORT } from '@/lib/predictions/factorLabels';

// wave-486: matchup/[teamA]/[teamB] 팩터 N:M 종합 배지
// Feature-Drift Cycle: review-code (wave-485) → explore-idea (wave-486)
// wave-486: MatchupFactorCompare.tsx — 5팩터 비교 후 우세 팀 N:M 종합 배지 + FACTOR_LABELS_SHORT 인라인 표시

const matchupFactorCompareSrc = readFileSync(
  join(__dirname, '../../components/matchup/MatchupFactorCompare.tsx'),
  'utf8',
);

const factorLabelsSrc = readFileSync(
  join(__dirname, '../../lib/predictions/factorLabels.ts'),
  'utf8',
);

describe('wave-486 — matchup 팩터 N:M 종합 배지', () => {
  it('MatchupFactorCompare: FACTOR_LABELS_SHORT import 존재', () => {
    expect(matchupFactorCompareSrc).toContain("import { FACTOR_LABELS_SHORT } from \"@/lib/predictions/factorLabels\"");
  });

  it('MatchupFactorCompare: wave-486 주석 존재', () => {
    expect(matchupFactorCompareSrc).toContain('wave-486');
  });

  it('MatchupFactorCompare: 팩터 균형 badge 레이블 텍스트 존재', () => {
    expect(matchupFactorCompareSrc).toContain('팩터 균형');
  });

  it('MatchupFactorCompare: N:M ratio 표시 존재 (font-mono)', () => {
    expect(matchupFactorCompareSrc).toContain('font-mono text-xs');
    expect(matchupFactorCompareSrc).toContain('팩터 {ratio}');
  });

  it('MatchupFactorCompare: aWinSlugs / bWinSlugs 집계 로직 존재', () => {
    expect(matchupFactorCompareSrc).toContain('aWinSlugs');
    expect(matchupFactorCompareSrc).toContain('bWinSlugs');
  });

  it('MatchupFactorCompare: 우세 팀 이름 표시 — favoredName 조건부', () => {
    expect(matchupFactorCompareSrc).toContain('favoredName');
    expect(matchupFactorCompareSrc).toContain('우세');
    expect(matchupFactorCompareSrc).toContain('균형');
  });

  it('MatchupFactorCompare: factorLabels 인라인 표시 — FACTOR_LABELS_SHORT 매핑', () => {
    expect(matchupFactorCompareSrc).toContain('FACTOR_LABELS_SHORT');
    expect(matchupFactorCompareSrc).toContain('factorLabels');
  });

  it('factorLabels.ts: wave-486 bullet 존재', () => {
    expect(factorLabelsSrc).toContain(
      'wave-486 matchup/[teamA]/[teamB] 팩터 N:M 종합 배지 (cycle 1849): MatchupFactorCompare.tsx — 5팩터 비교 후 팀A/B 우세 팩터 수 집계 → N:M 종합 verdict + 우세 팩터 단축 레이블 인라인 표시 (wave-480 DETAIL / wave-482 LIST 패턴 matchup 페이지 적용).',
    );
  });

  it('factorLabels.ts: wave-484 bullet 보존', () => {
    expect(factorLabelsSrc).toContain('wave-484 analysis/page.tsx 이번 주 남은 경기 비수렴 LIST 배지');
  });

  it('FACTOR_LABELS_SHORT 선발 레이블 — wave-486 matchup 배지 표시 대상', () => {
    expect(FACTOR_LABELS_SHORT['sp_fip']).toBe('선발');
  });

  it('FACTOR_LABELS_SHORT 불펜 레이블 — wave-486 matchup 배지 표시 대상', () => {
    expect(FACTOR_LABELS_SHORT['bullpen_fip']).toBe('불펜');
  });

  it('FACTOR_LABELS_SHORT Elo 레이블 — wave-486 matchup 배지 표시 대상', () => {
    expect(FACTOR_LABELS_SHORT['elo']).toBe('Elo');
  });
});
