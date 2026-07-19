import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// wave-490: countFavoringFactors JSDoc wave-489 bullet 추가
// Feature-Drift Cycle: polish-ui (wave-489) → review-code (wave-490)
// wave-489: PredictionCard N:M text-gray-300→text-gray-400 색상 정합 + title tooltip 추가 (cycle 1853)

const factorLabelsSrc = readFileSync(
  join(__dirname, '../../lib/predictions/factorLabels.ts'),
  'utf8',
);

const predCardSrc = readFileSync(
  join(__dirname, '../../components/predictions/PredictionCard.tsx'),
  'utf8',
);

describe('wave-490 — countFavoringFactors JSDoc wave-489 bullet + PredictionCard N:M 색상·툴팁', () => {
  it('countFavoringFactors JSDoc — wave-489 bullet 존재', () => {
    expect(factorLabelsSrc).toContain(
      'wave-489 PredictionCard N:M 색상 정합 (cycle 1853): PredictionCard.tsx — text-gray-300 dark:text-gray-600 → text-gray-400 dark:text-gray-500 (WCAG 대비 개선) + title tooltip 추가',
    );
  });

  it('PredictionCard.tsx — N:M span text-gray-400 사용 (gray-300 아님)', () => {
    // wave-489: WCAG 대비 개선 — gray-300 → gray-400
    expect(predCardSrc).toMatch(/font-mono.*text-gray-400.*dark:text-gray-500/);
    expect(predCardSrc).not.toMatch(/font-mono.*text-gray-300/);
  });

  it('PredictionCard.tsx — title tooltip 존재 ("예측팀 우세 팩터")', () => {
    expect(predCardSrc).toContain('예측팀 우세 팩터');
    expect(predCardSrc).toMatch(/title=\{`예측팀 우세 팩터 \$\{predictedN\}개/);
  });

  it('countFavoringFactors JSDoc — wave-488 bullet 보존', () => {
    expect(factorLabelsSrc).toContain(
      'wave-488: factors 맵에서 예측 팀·상대 팀 각각의 우세 팩터 수 반환.',
    );
  });
});
