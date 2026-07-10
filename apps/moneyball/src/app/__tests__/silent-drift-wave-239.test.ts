import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');

function read(rel: string) {
  return readFileSync(join(REPO_ROOT, rel), 'utf8');
}

const MODEL_VERSION_LABELS = read('packages/shared/src/model-version-labels.ts');
const BUILD_PITCHER_PROFILE  = read('apps/moneyball/src/lib/players/buildPitcherProfile.ts');
const BUILD_BATTER_LEADERBOARD = read('apps/moneyball/src/lib/players/buildBatterLeaderboard.ts');
const BUILD_SEASON_SUMMARY   = read('apps/moneyball/src/lib/seasons/buildSeasonSummary.ts');
const BUILD_MISS_REPORT      = read('apps/moneyball/src/lib/reviews/buildMissReport.ts');
const BUILD_TEAM_PROFILE     = read('apps/moneyball/src/lib/teams/buildTeamProfile.ts');
const BUILD_MODEL_TUNING     = read('apps/moneyball/src/lib/dashboard/buildModelTuningInsights.ts');
const HUB_DISPATCH           = read('apps/moneyball/src/lib/hub-dispatch.ts');
const AGENT_FALLBACK_STATS   = read('apps/moneyball/src/lib/debug/agentFallbackStats.ts');
const FACTOR_DELTA_STATS     = read('apps/moneyball/src/lib/debug/factorDeltaStats.ts');
const SILENT_DRIFT_STATS     = read('apps/moneyball/src/lib/debug/silentDriftStats.ts');
const PIPELINE_STATS         = read('apps/moneyball/src/lib/debug/pipelineStats.ts');
const SHADOW_PAIR_PROB       = read('apps/moneyball/src/lib/accuracy/shadow-pair-prob.ts');
const BUILD_PICKS_STATS      = read('apps/moneyball/src/lib/picks/buildPicksStats.ts');
const FEATURE_FLAGS          = read('apps/moneyball/src/lib/feature-flags.ts');

describe('silent drift wave-239 — lib/ + model-version-labels stale cycle-ref cleanup (cycle 1538)', () => {
  it('model-version-labels: "← stale (wave 220" 마커 전부 제거', () => {
    expect(MODEL_VERSION_LABELS).not.toMatch(/← stale \(wave 220/);
  });

  it('model-version-labels: "v2.0 promotion 시 본 상수" 제거', () => {
    expect(MODEL_VERSION_LABELS).not.toMatch(/v2\.0 promotion 시 본 상수/);
  });

  it('model-version-labels: "v2.0 promotion 시 본 tuple" 제거', () => {
    expect(MODEL_VERSION_LABELS).not.toMatch(/v2\.0 promotion 시 본 tuple/);
  });

  it('model-version-labels: "v2.0 → v2.1 bump 시" 제거', () => {
    expect(MODEL_VERSION_LABELS).not.toMatch(/v2\.0 → v2\.1 bump 시/);
  });

  it('model-version-labels: v1.8 유지 확정 현황 docblock 정합', () => {
    expect(MODEL_VERSION_LABELS).toMatch(/v1\.8 유지 확정 \(cycle 1460/);
    expect(MODEL_VERSION_LABELS).toMatch(/LLM 라벨 v2\.0-debate \/ v2\.0-postview 고정/);
  });

  it('buildPitcherProfile: "cycle 173 silent drift family" 제거', () => {
    expect(BUILD_PITCHER_PROFILE).not.toMatch(/cycle 173 silent drift family/);
  });

  it('buildBatterLeaderboard: "cycle 173 silent drift family" 제거', () => {
    expect(BUILD_BATTER_LEADERBOARD).not.toMatch(/cycle 173 silent drift family/);
  });

  it('buildSeasonSummary: "cycle 173 silent drift family" 제거', () => {
    expect(BUILD_SEASON_SUMMARY).not.toMatch(/cycle 173 silent drift family/);
  });

  it('buildMissReport: "cycle 173 silent drift family" 제거', () => {
    expect(BUILD_MISS_REPORT).not.toMatch(/cycle 173 silent drift family/);
  });

  it('buildTeamProfile: "cycle 151 silent drift family" 제거', () => {
    expect(BUILD_TEAM_PROFILE).not.toMatch(/cycle 151 silent drift family/);
  });

  it('buildModelTuningInsights: "cycle 152 silent drift family" 제거', () => {
    expect(BUILD_MODEL_TUNING).not.toMatch(/cycle 152 silent drift family/);
  });

  it('hub-dispatch: "cycle 528 — URL value scrub" 제거', () => {
    expect(HUB_DISPATCH).not.toMatch(/cycle 528 — URL value scrub/);
  });

  it('agentFallbackStats: "cycle 986 —" 헤더 제거', () => {
    expect(AGENT_FALLBACK_STATS).not.toMatch(/cycle 986 —/);
  });

  it('factorDeltaStats: "cycle 1013" 제거', () => {
    expect(FACTOR_DELTA_STATS).not.toMatch(/cycle 1013/);
  });

  it('silentDriftStats: "cycle 947" 제거', () => {
    expect(SILENT_DRIFT_STATS).not.toMatch(/cycle 947/);
  });

  it('silentDriftStats: "cycle 819 + 886" 제거', () => {
    expect(SILENT_DRIFT_STATS).not.toMatch(/cycle 819 \+ 886/);
  });

  it('pipelineStats: "cycle 947" 제거', () => {
    expect(PIPELINE_STATS).not.toMatch(/cycle 947/);
  });

  it('shadow-pair-prob: "cycle 1013" 제거', () => {
    expect(SHADOW_PAIR_PROB).not.toMatch(/cycle 1013/);
  });

  it('buildPicksStats: "cycle 1021 c9" 제거', () => {
    expect(BUILD_PICKS_STATS).not.toMatch(/cycle 1021 c9/);
  });

  it('buildPicksStats: "cycle 1316" wave 102 inline ref 제거', () => {
    expect(BUILD_PICKS_STATS).not.toMatch(/\(cycle 1316\)/);
  });

  it('feature-flags: "cycle 1127 plan-v17" 제거', () => {
    expect(FEATURE_FLAGS).not.toMatch(/cycle 1127 plan-v17/);
  });
});
