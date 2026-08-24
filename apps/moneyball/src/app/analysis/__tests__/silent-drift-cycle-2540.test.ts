import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(__dirname, '../page.tsx');
const ANALYSIS_DATA = join(__dirname, '../analysis-data.ts');

// cycle 2540 explore-idea: /analysis (KBO "오늘 AI 예측" 카드) 는 home page("/")
// 와 /mlb/analysis 양쪽 다 있는 PickButton(내 픽 투표 UI) 이 빠져있던 parity gap.
// PickButton 자체는 이미 만들어진 공용 컴포넌트(투표 제출/커뮤니티 분포/AI 대결)라
// KBO 전용 페이지 중 오늘 경기를 가장 상세히 보여주는 /analysis 에서 사용자가
// 투표할 진입점이 없었음. status='scheduled' 인 경기에만 노출 게이트 적용
// (home/mlb-analysis 동일 관례).
describe('silent drift cycle 2540 — analysis/page.tsx PickButton parity (home, mlb/analysis 대비 누락)', () => {
  it('page.tsx: PickButton import', () => {
    const src = readFileSync(PAGE, 'utf8');
    expect(src).toMatch(/import\s*\{\s*PickButton\s*\}\s*from\s*'@\/components\/picks\/PickButton'/);
  });

  it('page.tsx: 오늘 전체 예측 카드에서 status===scheduled 게이트로 PickButton 렌더 (매치업 심층 분석 딥링크 직전)', () => {
    const src = readFileSync(PAGE, 'utf8');
    const start = src.indexOf("cycle 2540: 오늘 예측 투표");
    expect(start).toBeGreaterThan(-1);
    const anchor = src.indexOf('매치업 심층 분석 딥링크');
    expect(anchor).toBeGreaterThan(start);
    const block = src.slice(start, anchor);
    expect(block).toMatch(/g\.status === 'scheduled'/);
    expect(block).toMatch(/<PickButton/);
    expect(block).toMatch(/gameId=\{g\.gameId\}/);
    expect(block).toMatch(/homeTeam=\{g\.homeCode\}/);
    expect(block).toMatch(/awayTeam=\{g\.awayCode\}/);
  });

  it('analysis-data.ts: games 쿼리가 status 컬럼을 select 하고 TodayGameCard 에 전달', () => {
    const src = readFileSync(ANALYSIS_DATA, 'utf8');
    expect(src).toMatch(/id, game_time, external_game_id, status,/);
    expect(src).toMatch(/status: string \| null;/);
    expect(src).toMatch(/status: game\.status,/);
  });
});
