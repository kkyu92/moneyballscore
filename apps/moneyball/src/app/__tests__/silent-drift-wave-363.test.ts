import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

// cycle 2124/2125 이 3+2곳 발견한 MLB PRODUCTION_COHORT_RULES filter family gap
// (predictions 쿼리에 league='mlb' 만 걸고 scoring_rule 필터 누락 — MLB 에 shadow/backtest
// scoring_rule 이 생기는 순간 accuracy/calendar/team-profile 집계에 silent 로 섞임) 재발 차단.
// 개별 wave 테스트(cycle 2124/2125 fix 시 추가된 unit mock 검증)는 "이미 아는 파일" 만
// 커버 — 본 가드는 mlb 디렉토리 전체를 동적 스캔해 향후 신규 predictions 쿼리 파일이
// 필터 없이 추가되는 것도 잡는다.

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

const MLB_DIRS = [
  join(ROOT, 'src/lib/mlb'),
  join(ROOT, 'src/app/mlb'),
  join(ROOT, 'src/app/en/mlb'),
];

describe('silent drift wave 363 — MLB predictions filter family guard', () => {
  it('mlb 디렉토리 내 모든 predictions 쿼리 파일은 scoring_rule 필터를 보유한다', () => {
    const offenders: string[] = [];

    for (const dir of MLB_DIRS) {
      for (const file of walk(dir)) {
        const src = readFileSync(file, 'utf8');
        if (!/\.from\(\s*['"]predictions['"]\s*\)/.test(src)) continue;

        const hasScoringRuleFilter =
          /MLB_PRODUCTION_COHORT_RULES/.test(src) || /MLB_SCORING_RULE/.test(src);

        if (!hasScoringRuleFilter) {
          offenders.push(file.replace(ROOT + '/', ''));
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
