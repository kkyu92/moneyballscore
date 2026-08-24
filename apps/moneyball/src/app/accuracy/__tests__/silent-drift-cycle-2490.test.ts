import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 2490 review-code (heavy): accuracy/page.tsx `buildVersionHistory(rows)` 가
// CURRENT_MODEL_FILTER(scoring_rule=v1.8)로 필터된 `rows`를 그대로 받아 v1.5/v1.6/
// v1.7-revert/v1.8-credit-fail 의 실측 검증 데이터(DB 확인 n=16/46/34/25, 총 121건)가
// ModelVersionHistory 표에서 영구히 "수집 중"으로 오표시됐음. `rows`는 baseline
// 지표(brier/gap/buckets 등) 정합 위해 v1.8만 담는 것이 의도(shared model-version-labels.ts
// 문서화)지만, 그 제약이 다른 목적(전체 버전 히스토리 표시)의 buildVersionHistory 호출까지
// 전파돼 있었음. 별도 필터 없는 쿼리(versionHistoryRows)를 추가해 분리.

const accuracySrc = readFileSync(join(__dirname, '../page.tsx'), 'utf8');

describe('silent-drift-cycle-2490 — accuracy/page.tsx Version History CURRENT_MODEL_FILTER 오적용 정정', () => {
  it('buildVersionHistory 는 CURRENT_MODEL_FILTER 로 좁혀진 rows 를 받지 않음', () => {
    expect(accuracySrc).not.toContain('buildVersionHistory(rows)');
    expect(accuracySrc).toContain('buildVersionHistory(versionHistoryRows)');
  });

  it('versionHistoryRows 전용 쿼리는 scoring_rule 필터(match(CURRENT_MODEL_FILTER)) 없이 조회', () => {
    const marker = 'versionHistoryResult';
    expect(accuracySrc).toContain(marker);
    const queryBlockStart = accuracySrc.indexOf('버전 히스토리 테이블');
    expect(queryBlockStart).toBeGreaterThan(-1);
    const queryBlock = accuracySrc.slice(queryBlockStart, queryBlockStart + 600);
    expect(queryBlock).not.toContain('match(CURRENT_MODEL_FILTER)');
  });
});
