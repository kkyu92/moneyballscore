/**
 * wave-249 regression guard — accuracy page V18SubCohortPanel exposes CE vs 비CE
 * accuracy delta 문구 (op-analysis 축 A 5.0pp 사용자 가시 반영, cycle 1553).
 *
 * op-analysis 축 A (cycle 1550) 결과: CE 58.8% (97/165) vs 비CE 63.8% (30/47)
 * = 5.0pp 격차 — LLM 부가가치 우세. accuracy 페이지 V18SubCohortPanel 안
 * 두 cohort accuracy delta 명시 부재 = silent drift 시점 stale context.
 * 본 test 는 delta 문구 blocks 자체 존재 + 자연어 사용자 문구 확인.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(__dirname, '../../../../..');
const ACCURACY_PAGE_SRC = readFileSync(
  join(REPO_ROOT, 'apps/moneyball/src/app/accuracy/page.tsx'),
  'utf-8',
);

describe('wave-249: V18SubCohortPanel exposes AI 토론 vs 정량 fallback delta', () => {
  it('delta 계산 로직 존재 (realDebate.accuracy - fallback.accuracy)', () => {
    expect(ACCURACY_PAGE_SRC).toContain('stats.realDebate.accuracy');
    expect(ACCURACY_PAGE_SRC).toContain('stats.fallback.accuracy');
    expect(ACCURACY_PAGE_SRC).toMatch(/deltaPp|delta_pp|deltaAcc/);
  });

  it('bothMeasured guard — n>=10 소표본 차단', () => {
    expect(ACCURACY_PAGE_SRC).toMatch(/n >= 10/);
    expect(ACCURACY_PAGE_SRC).toMatch(/bothMeasured/);
  });

  it('data-testid v18-subcohort-delta marker 노출', () => {
    expect(ACCURACY_PAGE_SRC).toContain('data-testid="v18-subcohort-delta"');
  });

  it('사용자 자연어 문구 (dev jargon 없이)', () => {
    expect(ACCURACY_PAGE_SRC).toContain('AI 토론 활성 예측이 정량 fallback 대비');
    expect(ACCURACY_PAGE_SRC).toContain('더 정확');
    expect(ACCURACY_PAGE_SRC).toContain('덜 정확');
    // dev term 금지 (사용자 가시 UI 안)
    expect(ACCURACY_PAGE_SRC).not.toMatch(/CREDIT_EXHAUSTED.*더 정확/);
    expect(ACCURACY_PAGE_SRC).not.toMatch(/LLM 부가가치/);
  });

  it('음수 delta (덜 정확) branch 도 UI 안 존재', () => {
    expect(ACCURACY_PAGE_SRC).toMatch(/deltaPp >= 0 \? '\+' : ''/);
    expect(ACCURACY_PAGE_SRC).toMatch(/deltaPp >= 0 \? '더 정확' : '덜 정확'/);
  });
});
