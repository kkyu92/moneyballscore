import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 3027 fix-incident: 페이지 최상단 Promise.all 안 모든 Supabase 쿼리는 내부적으로
// assertSelectOk + captureFallback 로 가드돼 throw 하지 않지만, fetchStandings()(KBO 공식
// 사이트 스크랩, fetchWithRetry 가 재시도 소진 시 throw)만 가드 없이 섞여 있었다 — 외부 소스
// 실패 시 Promise.all 전체가 reject 되어 /analysis 가 500(error.tsx)으로 떨어지는 유일한 지점.
// 자매 함수 buildTeamAccuracy.ts 의 fetchStandings().catch(captureFallback) 패턴을 그대로 적용.
//
// cycle 3042/3043 후속(DB 장애 silent fallback 구분 배너 확장): fetchStandings() 가드는
// .catch(captureFallback) 에서 Promise.allSettled 호환 {status,value|reason} 모양을 만드는
// .then(onFulfilled, onRejected) 패턴으로 바뀌었다 — reject 를 흡수해 captureFallback 기본값으로
// degrade 시키는 효과는 동일하되, 실패 여부를 dbDegraded 파생값으로 노출해 /analysis 상단에
// "일시적인 서비스 장애" 배너를 띄울 수 있게 한다.

const src = readFileSync(join(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 3027 — fetchStandings() Promise.all 가드 누락 정정', () => {
  it('fetchStandings() 호출이 reject 를 흡수하는 .then(onFulfilled, onRejected) 로 가드된다', () => {
    expect(src).toMatch(
      /fetchStandings\(\)\.then\(\s*\n\s*\(value\) => \(\{ status: "fulfilled" as const, value \}\),\s*\n\s*\(reason\) => \(\{ status: "rejected" as const, reason \}\),\s*\n\s*\);/,
    );
  });

  it('fetchStandings 실패 시 captureFallback 기본값([] as StandingRow[])으로 degrade 된다', () => {
    expect(src).toMatch(
      /captureFallback\(standingsR\.reason, \[\] as StandingRow\[\], \{ route: 'AnalysisIndexPage', source: 'fetchStandings' \}\)/,
    );
  });

  it('captureFallback 이 import 돼 있다', () => {
    expect(src).toContain("import { captureFallback } from '@/lib/observability/captureFallback';");
  });
});
