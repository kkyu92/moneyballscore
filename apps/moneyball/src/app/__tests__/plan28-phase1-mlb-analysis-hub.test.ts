import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { MLB_FACTOR_PICK_STRONG, MLB_FACTOR_PICK_COMPLETE, MLB_COMPOSITE_DUEL_MIN_VALID } from '@moneyball/shared';

// plan #28 Phase 1 (cycle 2315, explore-idea heavy) — KBO /analysis(AI 분석 센터) 13섹션
// hub 에 대응하는 MLB 라우트가 전무하던 gap(cycle 2314 spec-only 발견) 을 MVP 3섹션
// (빅매치/팩터 수렴 픽/오늘 전체 예측)으로 착수. computeMlbCompositeDuel(plan #24 Phase 3c)
// + mlb/games/[date] 2-step 쿼리 패턴(cycle 1168 silent drift fix) 재사용.

const page = readFileSync(
  path.resolve(__dirname, '../mlb/analysis/page.tsx'),
  'utf8',
);
const header = readFileSync(path.resolve(__dirname, '../../components/layout/Header.tsx'), 'utf8');
const footer = readFileSync(path.resolve(__dirname, '../../components/layout/Footer.tsx'), 'utf8');
const sitemap = readFileSync(path.resolve(__dirname, '../sitemap.ts'), 'utf8');

describe('plan #28 Phase 1 — /mlb/analysis 종합 hub MVP', () => {
  it('MLB_FACTOR_PICK_STRONG=5 / COMPLETE=6 / COMPOSITE_DUEL_MIN_VALID=3 (MLB 6팩터 기준)', () => {
    expect(MLB_FACTOR_PICK_STRONG).toBe(5);
    expect(MLB_FACTOR_PICK_COMPLETE).toBe(6);
    expect(MLB_COMPOSITE_DUEL_MIN_VALID).toBe(3);
  });

  it('predictions 를 mlb_game_date 로 직접 조회 (games!inner 조인 X — cycle 2114 silent 빈 목록 회피)', () => {
    expect(page).toContain(".eq('mlb_game_date', date)");
    expect(page).not.toContain("predictions!inner");
  });

  it('computeMlbCompositeDuel 재사용 (plan #24 Phase 3c 인프라, 신규 duel 로직 재작성 X)', () => {
    expect(page).toContain("import { computeMlbCompositeDuel } from \"@/lib/analysis/computeMlbCompositeDuel\"");
    expect(page).toContain('computeMlbCompositeDuel({');
  });

  it('오늘의 빅매치 섹션 존재 (confidence 기반 — MLB elo/recent_form 미구현이라 KBO selectBigMatch 미사용)', () => {
    expect(page).toContain('오늘의 빅매치');
    expect(page).toContain('TOP_PICK_MIN_WIN_PCT');
  });

  it('팩터 수렴 픽 섹션 존재 (강수렴/완전수렴 2-tier, MLB_FACTOR_PICK_STRONG/COMPLETE 게이팅)', () => {
    expect(page).toContain('팩터 수렴 픽');
    expect(page).toContain('MLB_FACTOR_PICK_STRONG');
    expect(page).toContain('MLB_FACTOR_PICK_COMPLETE');
    expect(page).toContain('완전수렴');
    expect(page).toContain('강수렴');
  });

  it('오늘 전체 예측 섹션 존재 (전 경기 리스트 + topPick 하이라이트)', () => {
    expect(page).toContain('오늘 전체 예측');
    expect(page).toContain('isTopPick');
  });

  it('canonical URL /mlb/analysis 배선 (EN 변형은 phased 관례 따라 후속 cycle — 미배선)', () => {
    expect(page).toContain('${SITE_URL}/mlb/analysis');
  });

  it('헤더 메가메뉴 + 푸터 컬럼 + sitemap.ts 즉시 배선 (cycle 2153 family 재발 차단)', () => {
    expect(header).toContain('/mlb/analysis');
    expect(footer).toContain('/mlb/analysis');
    expect(sitemap).toContain("${SITE_URL}/mlb/analysis`");
  });
});
