import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, '../page.tsx'), 'utf8');
const HUB_SRC = readFileSync(resolve(__dirname, '../../page.tsx'), 'utf8');
const SITEMAP_SRC = readFileSync(resolve(__dirname, '../../../../sitemap.ts'), 'utf8');

describe('en/mlb/calendar/page.tsx — /mlb/calendar EN mirror (explore-idea, cycle 2126)', () => {
  it('revalidate = 3600 literal (Next.js 16 Turbopack: literal required, CALENDAR_ISR_SECONDS 정합)', () => {
    expect(PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*3600\b/);
  });

  it('Breadcrumb — MLB Analysis → Monthly Calendar, locale=en', () => {
    expect(PAGE_SRC).toMatch(/\{ href: '\/en\/mlb', label: 'MLB Analysis' \}/);
    expect(PAGE_SRC).toMatch(/label: 'Monthly Calendar' \}/);
    expect(PAGE_SRC).toMatch(/locale="en"/);
  });

  it('getMlbMonthHeatmap 재사용 (KO 와 동일 lib, 중복 구현 금지)', () => {
    expect(PAGE_SRC).toMatch(/import\s*\{\s*getMlbMonthHeatmap\s*\}\s*from\s*['"]@\/lib\/mlb\/buildMlbCalendarHeatmap['"]/);
  });

  it('월 grid 골격은 KO 와 공유(@/lib/calendar/monthGrid) — 중복 정의 금지', () => {
    expect(PAGE_SRC).toMatch(
      /import\s*\{\s*getKstMonthInfo,\s*buildEmptyGrid,\s*type MonthInfo,\s*type DayCell\s*\}\s*from\s*['"]@\/lib\/calendar\/monthGrid['"]/,
    );
  });

  it('영문 요일 라벨 WEEKDAY_LABELS_EN_MON_FIRST 사용 (한글 라벨 재사용 금지)', () => {
    expect(PAGE_SRC).toMatch(/WEEKDAY_LABELS_EN_MON_FIRST/);
    expect(PAGE_SRC).not.toMatch(/WEEKDAY_LABELS_KO/);
  });

  it('캘린더 셀 링크가 /en/mlb/games/[date] 로 이동 (KO /mlb/games/[date] EN 대응)', () => {
    expect(PAGE_SRC).toMatch(/href=\{`\/en\/mlb\/games\/\$\{cell\.date\}`\}/);
  });

  it('canonical + hreflang alternates SITE_URL/en/mlb/calendar ↔ /mlb/calendar', () => {
    expect(PAGE_SRC).toMatch(/canonical:\s*`\$\{SITE_URL\}\/en\/mlb\/calendar`/);
    expect(PAGE_SRC).toMatch(/en:\s*`\$\{SITE_URL\}\/en\/mlb\/calendar`/);
    expect(PAGE_SRC).toMatch(/ko:\s*`\$\{SITE_URL\}\/mlb\/calendar`/);
  });
});

describe('en/mlb/page.tsx — Monthly Calendar hub 링크 배선', () => {
  it('/en/mlb/calendar 링크 카드 존재', () => {
    expect(HUB_SRC).toMatch(/href="\/en\/mlb\/calendar"/);
  });
});

describe('sitemap.ts — /en/mlb/calendar 등록', () => {
  it('sitemap 배열에 /en/mlb/calendar URL 포함', () => {
    expect(SITEMAP_SRC).toMatch(/\$\{SITE_URL\}\/en\/mlb\/calendar`/);
  });
});
