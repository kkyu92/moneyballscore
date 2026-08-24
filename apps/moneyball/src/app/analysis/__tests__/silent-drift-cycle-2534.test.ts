import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(__dirname, '../page.tsx');
const ANALYSIS_DATA = join(__dirname, '../analysis-data.ts');

// cycle 2534 fix: /analysis 의 CREDIT_EXHAUSTED simplifiedMode 배너가 todayData.games
// (오늘 경기만) 평균 confidence 로 판정돼 KBO 휴식일(오늘 경기 0건 또는 CE_MIN_SAMPLES
// 미만)엔 CE 가 실제로 진행 중이어도 배너가 절대 뜨지 않던 silent drift. 바로 직전
// cycle 2533 이 about/page.tsx 에 이식한 "날짜 무관 최근 예측 10건" 패턴
// (predictions/page.tsx 와 동일) 을 /analysis 에도 통일 적용.
describe('silent drift cycle 2534 — analysis simplifiedMode todayData.games 평균 → 날짜 무관 최근 예측 기준 통일', () => {
  it('page.tsx: todayData.games 로 simplifiedMode 를 직접 계산하지 않음', () => {
    const src = readFileSync(PAGE, 'utf8');
    expect(src).not.toMatch(/todayData\.games\.length >= CE_MIN_SAMPLES/);
    expect(src).not.toMatch(/todayData\.games\.reduce\(\(s, g\) => s \+ g\.confidence/);
  });

  it('page.tsx: analysis-data.ts 의 detectSimplifiedMode 를 import 해 사용', () => {
    const src = readFileSync(PAGE, 'utf8');
    expect(src).toMatch(/detectSimplifiedMode/);
    expect(src).toMatch(/from '\.\/analysis-data'/);
  });

  it('analysis-data.ts: detectSimplifiedMode 가 날짜 무관 최근 예측(PRODUCTION_COHORT_RULES, limit 10) 기준으로 CE 판정', () => {
    const src = readFileSync(ANALYSIS_DATA, 'utf8');
    const start = src.indexOf('export async function detectSimplifiedMode');
    expect(start).toBeGreaterThan(-1);
    const block = src.slice(start, start + 900);
    expect(block).toMatch(/\.in\('scoring_rule', PRODUCTION_COHORT_RULES\)/);
    expect(block).toMatch(/\.order\('id', \{ ascending: false \}\)/);
    expect(block).toMatch(/\.limit\(10\)/);
    expect(block).toMatch(/CE_MIN_SAMPLES/);
    expect(block).toMatch(/CE_DETECT_THRESHOLD/);
  });
});
