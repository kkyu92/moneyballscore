import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');

const ACCURACY_PAGE = readFileSync(
  join(REPO_ROOT, 'apps/moneyball/src/app/accuracy/page.tsx'),
  'utf8'
);
const DASHBOARD_PAGE = readFileSync(
  join(REPO_ROOT, 'apps/moneyball/src/app/dashboard/page.tsx'),
  'utf8'
);
const BUILD_ACCURACY = readFileSync(
  join(REPO_ROOT, 'apps/moneyball/src/lib/accuracy/buildAccuracyData.ts'),
  'utf8'
);
const SENTRY_SCRUB = readFileSync(
  join(REPO_ROOT, 'apps/moneyball/src/sentry-scrub.ts'),
  'utf8'
);

describe('silent drift wave 228 — wave-226 cycle-ref comment blocks + dev jargon 제거 regression guard (cycle 1527)', () => {
  it('accuracy/page.tsx: cycle 384/385/460/627 history comment blocks 제거 확인', () => {
    expect(ACCURACY_PAGE).not.toContain('cycle 384 fix-incident heavy');
    expect(ACCURACY_PAGE).not.toContain('cycle 385 review-code heavy');
    expect(ACCURACY_PAGE).not.toContain('cycle 460 polish-ui heavy');
    expect(ACCURACY_PAGE).not.toContain('cycle 627 explore-idea heavy');
  });

  it('accuracy/page.tsx: 팀별 편향 description — "(v1.8 유지 확정)" dev jargon 제거 확인', () => {
    expect(ACCURACY_PAGE).not.toContain('편향 갭이 큰 팀은 모델 진단 참고 지표입니다 (v1.8 유지 확정)');
  });

  it('dashboard/page.tsx: 팩터 정확도 description — "v1.8 유지 확정 (n=178, Brier Δ<0.01pp)" dev jargon 제거 확인', () => {
    expect(DASHBOARD_PAGE).not.toContain('v1.8 유지 확정 (n=178, Brier');
  });

  it('buildAccuracyData.ts: SubCohortBucket 위 cycle 627 4-line comment block 제거 확인', () => {
    expect(BUILD_ACCURACY).not.toContain('cycle 627 explore-idea heavy');
  });

  it('sentry-scrub.ts: "cycle 442 —" prefix 제거 확인 (PII invariant WHY 설명은 유지)', () => {
    expect(SENTRY_SCRUB).not.toContain('cycle 442 —');
    expect(SENTRY_SCRUB).toContain('supabase_service_role_key');
  });
});
