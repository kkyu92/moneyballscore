import { describe, it, expect } from 'vitest';
import { MLB_DIVISION_COUNT } from '@moneyball/shared';
import { LEAGUE_NAVS, isNavGroup } from '@/components/layout/Header';

// EN 전용 텍스트가 KO 페이지에 그대로 노출되던 i18n 누수 버그 재발 방지
// (cycle 3644: /mlb/standings description 이 enDescription 없이 영문 단독으로만
// 존재해 KO 페이지에서도 "4 division standings" 로 노출됐던 사례).
// /mlb/players 는 Statcast 전문용어(xwOBA 등)를 KO/EN 양쪽에서 의도적으로 공유 —
// 유일한 예외.
describe('LEAGUE_NAVS.mlb i18n parity', () => {
  const ASCII_ONLY = /^[\x20-\x7E]*$/;
  const EXEMPT_HREFS = new Set(['/mlb/players']);

  it('every description that is ASCII-only also declares an enDescription', () => {
    const offenders: string[] = [];
    for (const item of LEAGUE_NAVS.mlb) {
      const subItems = isNavGroup(item) ? item.items : [item];
      for (const sub of subItems) {
        if (EXEMPT_HREFS.has(sub.href)) continue;
        if (sub.description && ASCII_ONLY.test(sub.description) && !sub.enDescription) {
          offenders.push(sub.href);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('/mlb/standings has a Korean description and an enDescription', () => {
    const group = LEAGUE_NAVS.mlb.find((item) => isNavGroup(item) && item.items.some((sub) => sub.href === '/mlb/standings'));
    if (!group || !isNavGroup(group)) throw new Error('mlb standings nav group not found');
    const standings = group.items.find((sub) => sub.href === '/mlb/standings');
    expect(standings?.description).toBe(`${MLB_DIVISION_COUNT}개 디비전 순위표`);
    expect(standings?.enDescription).toBe(`${MLB_DIVISION_COUNT} division standings`);
  });
});
