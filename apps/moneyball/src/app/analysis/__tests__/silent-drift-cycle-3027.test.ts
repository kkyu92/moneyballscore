import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 3027 fix-incident: 페이지 최상단 Promise.all 안 모든 Supabase 쿼리는 내부적으로
// assertSelectOk + captureFallback 로 가드돼 throw 하지 않지만, fetchStandings()(KBO 공식
// 사이트 스크랩, fetchWithRetry 가 재시도 소진 시 throw)만 가드 없이 섞여 있었다 — 외부 소스
// 실패 시 Promise.all 전체가 reject 되어 /analysis 가 500(error.tsx)으로 떨어지는 유일한 지점.
// 자매 함수 buildTeamAccuracy.ts 의 fetchStandings().catch(captureFallback) 패턴을 그대로 적용.

const src = readFileSync(join(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 3027 — fetchStandings() Promise.all 가드 누락 정정', () => {
  it('fetchStandings() 호출이 .catch(captureFallback) 로 가드된다', () => {
    expect(src).toMatch(
      /fetchStandings\(\)\.catch\(\(err\) =>\s*\n\s*captureFallback\(err, \[\] as StandingRow\[\], \{ route: 'AnalysisIndexPage', source: 'fetchStandings' \}\),\s*\n\s*\),/,
    );
  });

  it('captureFallback 이 import 돼 있다', () => {
    expect(src).toContain("import { captureFallback } from '@/lib/observability/captureFallback';");
  });
});
