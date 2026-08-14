import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, '../page.tsx'), 'utf8');
const HUB_SRC = readFileSync(resolve(__dirname, '../../page.tsx'), 'utf8');
const SITEMAP_SRC = readFileSync(resolve(__dirname, '../../../sitemap.ts'), 'utf8');

describe('mlb/calendar/page.tsx — KBO calendar/page.tsx 병렬 parity (explore-idea, cycle 2123)', () => {
  it('revalidate = 3600 literal (Next.js 16 Turbopack: literal required, CALENDAR_ISR_SECONDS 정합)', () => {
    expect(PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*3600\b/);
  });

  it('Breadcrumb — MLB 분석 → 월별 캘린더', () => {
    expect(PAGE_SRC).toMatch(/\{ href: '\/mlb', label: 'MLB 분석' \}/);
    expect(PAGE_SRC).toMatch(/label: '월별 캘린더' \}/);
  });

  it('getMlbMonthHeatmap 재사용 (mlb_schedule + predictions.league=mlb join, deriveMlbOutcome 별도 구현 금지)', () => {
    expect(PAGE_SRC).toMatch(/import\s*\{\s*getMlbMonthHeatmap\s*\}\s*from\s*['"]@\/lib\/mlb\/buildMlbCalendarHeatmap['"]/);
  });

  it('월 grid 골격은 KBO 와 공유(@/lib/calendar/monthGrid) — 중복 정의 금지', () => {
    expect(PAGE_SRC).toMatch(
      /import\s*\{\s*getKstMonthInfo,\s*buildEmptyGrid,\s*type MonthInfo,\s*type DayCell\s*\}\s*from\s*['"]@\/lib\/calendar\/monthGrid['"]/,
    );
  });

  it('캘린더 셀 링크가 /mlb/games/[date] 로 이동 (KBO /predictions/[date] 대응)', () => {
    expect(PAGE_SRC).toMatch(/href=\{`\/mlb\/games\/\$\{cell\.date\}`\}/);
  });

  it('canonical + alternates SITE_URL/mlb/calendar', () => {
    expect(PAGE_SRC).toMatch(/canonical:\s*`\$\{SITE_URL\}\/mlb\/calendar`/);
  });
});

describe('mlb/page.tsx — 월별 캘린더 hub 링크 배선', () => {
  it('/mlb/calendar 링크 카드 존재', () => {
    expect(HUB_SRC).toMatch(/href="\/mlb\/calendar"/);
  });
});

describe('sitemap.ts — /mlb/calendar 등록', () => {
  it('sitemap 배열에 /mlb/calendar URL 포함', () => {
    expect(SITEMAP_SRC).toMatch(/\$\{SITE_URL\}\/mlb\/calendar`/);
  });
});
