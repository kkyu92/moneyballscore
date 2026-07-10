import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PLAYWRIGHT_CONFIG_SRC = readFileSync(join(__dirname, '../../../playwright.config.ts'), 'utf-8');
const E2E_HREFLANG_SRC = readFileSync(join(__dirname, '../../../e2e/hreflang.spec.ts'), 'utf-8');
const E2E_MEGAMENU_STATES_SRC = readFileSync(join(__dirname, '../../../e2e/megamenu-states.spec.ts'), 'utf-8');
const E2E_MEGAMENU_SRC = readFileSync(join(__dirname, '../../../e2e/megamenu.spec.ts'), 'utf-8');
const ROBOTS_SRC = readFileSync(join(__dirname, '../robots.ts'), 'utf-8');
const MOBILE_NAV_SRC = readFileSync(join(__dirname, '../../components/layout/MobileNav.tsx'), 'utf-8');
const FOOTER_SRC = readFileSync(join(__dirname, '../../components/layout/Footer.tsx'), 'utf-8');
const PICKS_RESULTS_SRC = readFileSync(join(__dirname, '../api/picks/results/route.ts'), 'utf-8');
const TEAMS_RECENT_SRC = readFileSync(join(__dirname, '../teams/[code]/recent/page.tsx'), 'utf-8');
const HEALTH_PIPELINES_SRC = readFileSync(join(__dirname, '../api/health/pipelines/route.ts'), 'utf-8');
const HEALTH_SRC = readFileSync(join(__dirname, '../api/health/route.ts'), 'utf-8');
const DEBUG_PIPELINE_SRC = readFileSync(join(__dirname, '../debug/pipeline/page.tsx'), 'utf-8');
const DEBUG_SILENT_DRIFT_SRC = readFileSync(join(__dirname, '../debug/silent-drift/page.tsx'), 'utf-8');
const DEBUG_DEPLOY_DRIFT_SRC = readFileSync(join(__dirname, '../debug/deploy-drift/page.tsx'), 'utf-8');
const COHORT_HEATMAP_SRC = readFileSync(join(__dirname, '../../components/dashboard/CohortComparisonHeatmap.tsx'), 'utf-8');
const WINNER_PROB_SRC = readFileSync(join(__dirname, '../../components/dashboard/WinnerProbBucketChart.tsx'), 'utf-8');
const ROLLING_ACCURACY_SRC = readFileSync(join(__dirname, '../../components/dashboard/RollingAccuracyChart.tsx'), 'utf-8');
const BUILD_ACCURACY_SRC = readFileSync(join(__dirname, '../../lib/accuracy/buildAccuracyData.ts'), 'utf-8');
const MLB_WAITLIST_SRC = readFileSync(join(__dirname, '../api/mlb/waitlist/route.ts'), 'utf-8');

describe('silent drift wave 235 — stale plan/cycle-ref annotations e2e/layout/api/debug/dashboard (cycle 1533)', () => {
  it('playwright.config does not contain "plan #14 C2 Step 4 후속"', () => {
    expect(PLAYWRIGHT_CONFIG_SRC).not.toContain('plan #14 C2 Step 4 후속');
  });

  it('e2e/hreflang does not contain "plan #21 Step 3 (cycle 1094)"', () => {
    expect(E2E_HREFLANG_SRC).not.toContain('plan #21 Step 3 (cycle 1094)');
  });

  it('e2e/hreflang does not contain "영문 mirror 박제 후 link target 200 assertion 갱신 carry-over"', () => {
    expect(E2E_HREFLANG_SRC).not.toContain('영문 mirror 박제 후 link target 200 assertion 갱신 carry-over');
  });

  it('e2e/megamenu-states does not contain "plan #14 C2 Step 4 후속 (cycle 1021 plan #14 carry-over)"', () => {
    expect(E2E_MEGAMENU_STATES_SRC).not.toContain('plan #14 C2 Step 4 후속 (cycle 1021 plan #14 carry-over)');
  });

  it('e2e/megamenu does not contain "plan #14 C2 Step 4 후속 (cycle 1021 plan #14 carry-over)"', () => {
    expect(E2E_MEGAMENU_SRC).not.toContain('plan #14 C2 Step 4 후속 (cycle 1021 plan #14 carry-over)');
  });

  it('robots.ts does not contain "plan #6 Step A"', () => {
    expect(ROBOTS_SRC).not.toContain('plan #6 Step A');
  });

  it('robots.ts does not contain "plan #21 Step 2"', () => {
    expect(ROBOTS_SRC).not.toContain('plan #21 Step 2');
  });

  it('MobileNav does not contain "cycle 1021 plan #14 C2 Step 2c"', () => {
    expect(MOBILE_NAV_SRC).not.toContain('cycle 1021 plan #14 C2 Step 2c');
  });

  it('Footer does not contain "plan #19 Step 1, cycle 1043"', () => {
    expect(FOOTER_SRC).not.toContain('plan #19 Step 1, cycle 1043');
  });

  it('api/picks/results does not contain "factors map (cycle 1021 c9)"', () => {
    expect(PICKS_RESULTS_SRC).not.toContain('factors map (cycle 1021 c9)');
  });

  it('api/picks/results does not contain "cycle 1021 c9:"', () => {
    expect(PICKS_RESULTS_SRC).not.toContain('cycle 1021 c9:');
  });

  it('teams/[code]/recent does not contain "cycle 1021 (b8)"', () => {
    expect(TEAMS_RECENT_SRC).not.toContain('cycle 1021 (b8)');
  });

  it('api/health/pipelines does not contain "cycle 1135 explore-idea"', () => {
    expect(HEALTH_PIPELINES_SRC).not.toContain('cycle 1135 explore-idea');
  });

  it('api/health/pipelines does not contain "plan #13 step 4-5 carry-over"', () => {
    expect(HEALTH_PIPELINES_SRC).not.toContain('plan #13 step 4-5 carry-over');
  });

  it('api/health/route does not contain "cycle 769 사례 8 봇차단 회피"', () => {
    expect(HEALTH_SRC).not.toContain('cycle 769 사례 8 봇차단 회피');
  });

  it('debug/pipeline does not contain "plan #10 Tier 1, cycle 947"', () => {
    expect(DEBUG_PIPELINE_SRC).not.toContain('plan #10 Tier 1, cycle 947');
  });

  it('debug/silent-drift does not contain "plan #10 Tier 1, cycle 947"', () => {
    expect(DEBUG_SILENT_DRIFT_SRC).not.toContain('plan #10 Tier 1, cycle 947');
  });

  it('debug/deploy-drift does not contain "plan #10 Tier 1, cycle 947"', () => {
    expect(DEBUG_DEPLOY_DRIFT_SRC).not.toContain('plan #10 Tier 1, cycle 947');
  });

  it('CohortComparisonHeatmap does not contain "plan #14 C2 (a2 cycle 1021)"', () => {
    expect(COHORT_HEATMAP_SRC).not.toContain('plan #14 C2 (a2 cycle 1021)');
  });

  it('WinnerProbBucketChart does not contain "plan #14 C2 (a2 cycle 1021)"', () => {
    expect(WINNER_PROB_SRC).not.toContain('plan #14 C2 (a2 cycle 1021)');
  });

  it('RollingAccuracyChart does not contain "plan #14 C2 (a2 cycle 1021)"', () => {
    expect(ROLLING_ACCURACY_SRC).not.toContain('plan #14 C2 (a2 cycle 1021)');
  });

  it('RollingAccuracyChart does not contain "wave 117 (cycle 1334)"', () => {
    expect(ROLLING_ACCURACY_SRC).not.toContain('wave 117 (cycle 1334)');
  });

  it('buildAccuracyData does not contain "cycle 947 plan #10 Tier 1"', () => {
    expect(BUILD_ACCURACY_SRC).not.toContain('cycle 947 plan #10 Tier 1');
  });

  it('api/mlb/waitlist does not contain "plan #1 Step 4"', () => {
    expect(MLB_WAITLIST_SRC).not.toContain('plan #1 Step 4');
  });

  it('api/mlb/waitlist does not contain "plan #1 Phase 2+3"', () => {
    expect(MLB_WAITLIST_SRC).not.toContain('plan #1 Phase 2+3');
  });

  it('api/mlb/waitlist does not contain "plan #1 Step 6"', () => {
    expect(MLB_WAITLIST_SRC).not.toContain('plan #1 Step 6');
  });
});
