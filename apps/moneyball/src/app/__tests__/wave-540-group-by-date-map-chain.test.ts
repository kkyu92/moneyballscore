import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { readFileSync } from 'fs';

// wave-540 (cycle 1911): groupByDate 더블 map chain silent drift 차단.
// groupByDate 는 groupUpcomingByDate 와 동일 패턴 — 단일 .map(([date, gs]) => ({ date, games: gs })) 사용.
// 이전 코드: .map(([date, gs]) => ({ date, gs: gs })) + .map(({ date, gs }) => ({ date, games: gs })) 중복.
// cycle 1984 review-code(heavy): groupByDate/groupUpcomingByDate 는 analysis/page.tsx (3877줄 monolith)
// 데이터 레이어 분리 리팩터로 analysis/analysis-data.ts 로 이동 — 본 guard 도 이동한 위치 참조.

const PAGE_SRC = readFileSync(join(__dirname, '../../app/analysis/analysis-data.ts'), 'utf8');

describe('wave-540 — groupByDate 단일 map chain (silent drift 차단)', () => {
  it('groupByDate: 더블 map chain 부재 — 단일 .map(([date, gs]) => ({ date, games: gs })) 사용', () => {
    // 더블 map chain 패턴이 없어야 함
    expect(PAGE_SRC).not.toContain('.map(([date, gs]) => ({ date, gs: gs }))');
    expect(PAGE_SRC).not.toContain('({ date, gs }) => ({ date, games: gs })');
  });

  it('groupByDate: { date, games: gs } 단일 map 존재', () => {
    // groupByDate 함수 안에 단일 map 으로 games 필드 생성
    expect(PAGE_SRC).toContain("function groupByDate");
    expect(PAGE_SRC).toContain(".map(([date, gs]) => ({ date, games: gs }))");
  });

  it('groupUpcomingByDate: 동일 단일 map 패턴 유지 (대칭 확인)', () => {
    expect(PAGE_SRC).toContain("function groupUpcomingByDate");
    // 두 함수 모두 .map(([date, gs]) => ({ date, games: gs })) 패턴
    const occurrences = (PAGE_SRC.match(/\.map\(\(\[date, gs\]\) => \({ date, games: gs }\)\)/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});
