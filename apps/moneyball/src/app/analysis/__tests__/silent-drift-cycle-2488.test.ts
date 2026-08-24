import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ANALYSIS_DATA = join(__dirname, '../analysis-data.ts');

// cycle 2488 review-code(heavy): getTodayAnalysisData 의 topFactors 계산이 NEUTRAL_FACTOR(0.5)
// 단순 비교만 사용해 dead zone(NEUTRAL_LO 0.45 ~ NEUTRAL_HI 0.55) 을 반영하지 않던 silent drift.
// determineFavor(factor-explanations.ts) / topFavoringFactors·countFavoringFactors(factorLabels.ts) /
// FactorBreakdown 은 전부 이 dead zone 을 공유 source 로 사용 — 사실상 중립인 팩터(예: 0.51)도
// "[팀] 우세" 배지로 표시되던 문제를 동일 dead zone 적용으로 정정.
describe('silent drift cycle 2488 — getTodayAnalysisData topFactors NEUTRAL_HI/LO dead zone 적용', () => {
  const src = readFileSync(ANALYSIS_DATA, 'utf8');

  it('NEUTRAL_HI/NEUTRAL_LO 를 factorLabels.ts 공유 source 에서 import', () => {
    expect(src).toMatch(/import\s*\{[^}]*NEUTRAL_HI[^}]*\}\s*from\s*'@\/lib\/predictions\/factorLabels'/);
    expect(src).toMatch(/import\s*\{[^}]*NEUTRAL_LO[^}]*\}\s*from\s*'@\/lib\/predictions\/factorLabels'/);
  });

  it('topFactors 계산이 dead zone 밖(> NEUTRAL_HI 또는 < NEUTRAL_LO) 팩터만 후보로 필터링', () => {
    const block = src.slice(
      src.indexOf('const topFactors: TodayGameCard'),
      src.indexOf('const spData = game.external_game_id'),
    );
    expect(block).toMatch(/\(val as number\) > NEUTRAL_HI \|\| \(val as number\) < NEUTRAL_LO/);
  });
});
