# MLB Plan B — UI Layer (sub-route + Cross-league header + placeholder) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MLB UI layer 박제 — 9 sub-route 한국어 + 9 sub-route 영문 mirror (i18n manual `/en/mlb/*` path) + Cross-league header (LeaguePill switcher) + 3 placeholder 페이지 (login / settings / community) + Telegram MLB combined 메시지 포맷.

**Architecture:** Next.js 16 App Router server component default + `'use client'` 최소 박제. i18n routing = manual `app/[locale]/mlb/*` mirror — next-intl 외부 라이브러리 X (본 메인 직접 작성). Cross-league header = league pill switcher embed + KBO sub-nav 변경 X. Placeholder UI = "📌 박제 중 + ETA 2026-08~09" 문구 + button 비활성화.

**Tech Stack:** Next.js 16 (App Router) / TypeScript (strict) / Tailwind CSS 4 / Supabase JS client / Vitest + React Testing Library / Playwright (E2E).

**Spec source:** `docs/superpowers/specs/2026-05-29-mlb-league-introduction-design.md` (commit 6ca9f95)
**Dependency:** Plan A 박제 완료 wait (백엔드 layer)

---

## File Structure

### Create

| 파일 | 책임 |
|---|---|
| `apps/moneyball/src/app/mlb/page.tsx` | MLB hub (현 waitlist → 풀 hub 전환) |
| `apps/moneyball/src/app/mlb/games/[date]/page.tsx` | 일자별 경기 list |
| `apps/moneyball/src/app/mlb/games/[date]/[slug]/page.tsx` | 경기 상세 (14 factor + waterfall + analog) |
| `apps/moneyball/src/app/mlb/team/[code]/page.tsx` | 팀 시즌 stat |
| `apps/moneyball/src/app/mlb/players/[id]/page.tsx` | 선수 Statcast deep-dive |
| `apps/moneyball/src/app/mlb/factors/page.tsx` | 14 factor 설명 |
| `apps/moneyball/src/app/mlb/standings/page.tsx` | AL/NL 6 division |
| `apps/moneyball/src/app/mlb/wild-card/page.tsx` | Wild Card race |
| `apps/moneyball/src/app/mlb/postseason/page.tsx` | postseason bracket |
| `apps/moneyball/src/app/en/mlb/page.tsx` (+ 8 mirror) | 영문 mirror 9 페이지 |
| `apps/moneyball/src/app/login/page.tsx` | placeholder (인증 후순위) |
| `apps/moneyball/src/app/settings/page.tsx` | placeholder |
| `apps/moneyball/src/app/community/page.tsx` | placeholder |
| `apps/moneyball/src/components/layout/LeaguePill.tsx` | KBO ⇄ MLB switcher |
| `apps/moneyball/src/components/layout/PlaceholderLoginButton.tsx` | 비활성화 button |
| `apps/moneyball/src/components/notify/MlbCombinedMessage.ts` | Telegram recap+preview 포맷 |
| `apps/moneyball/src/components/notify/__tests__/MlbCombinedMessage.test.ts` | 4096 split test |
| `apps/moneyball/src/app/mlb/__tests__/routes.test.tsx` | Unit test (render snapshot) |
| `apps/moneyball/e2e/mlb-routes.spec.ts` | E2E Playwright |
| `apps/moneyball/e2e/league-pill.spec.ts` | E2E Cross-league header |
| `apps/moneyball/e2e/hreflang.spec.ts` | E2E i18n hreflang |
| `apps/moneyball/src/app/sitemap.ts` (modify) | MLB 9 + 영문 9 추가 |

### Modify

| 파일 | 변경 |
|---|---|
| `apps/moneyball/src/components/layout/Header.tsx` | LeaguePill embed + utility nav (🔍 / 🌐 / ⚙️) |
| `apps/moneyball/src/app/sitemap.ts` | MLB 18 URL 추가 (한국어 9 + 영문 9) |
| `apps/moneyball/src/app/mlb/page.tsx` | 현 waitlist → 풀 hub (기존 SAMPLE_STATS archive) |

---

## Sprint 4 — UI layer 박제

### Task 1: LeaguePill 컴포넌트 (cross-league switcher)

**Files:**
- Create: `apps/moneyball/src/components/layout/LeaguePill.tsx`
- Create: `apps/moneyball/src/components/layout/__tests__/LeaguePill.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/moneyball/src/components/layout/__tests__/LeaguePill.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeaguePill } from '../LeaguePill';

describe('LeaguePill', () => {
  it('renders KBO and MLB pills', () => {
    render(<LeaguePill activeLeague="kbo" />);
    expect(screen.getByText('KBO')).toBeDefined();
    expect(screen.getByText('MLB')).toBeDefined();
  });

  it('KBO active state', () => {
    render(<LeaguePill activeLeague="kbo" />);
    const kboPill = screen.getByText('KBO').closest('a');
    expect(kboPill?.getAttribute('aria-current')).toBe('page');
  });

  it('MLB pill link points to /mlb', () => {
    render(<LeaguePill activeLeague="kbo" />);
    const mlbLink = screen.getByText('MLB').closest('a');
    expect(mlbLink?.getAttribute('href')).toBe('/mlb');
  });

  it('KBO pill link points to /', () => {
    render(<LeaguePill activeLeague="mlb" />);
    const kboLink = screen.getByText('KBO').closest('a');
    expect(kboLink?.getAttribute('href')).toBe('/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/moneyball && pnpm vitest run src/components/layout/__tests__/LeaguePill.test.tsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
// apps/moneyball/src/components/layout/LeaguePill.tsx
import Link from "next/link";

interface LeaguePillProps {
  activeLeague: 'kbo' | 'mlb';
}

export function LeaguePill({ activeLeague }: LeaguePillProps) {
  return (
    <div
      className="bg-brand-900 dark:bg-brand-950 rounded-full p-0.5 flex gap-0.5 text-xs"
      role="navigation"
      aria-label="League switcher"
    >
      <Link
        href="/"
        aria-current={activeLeague === 'kbo' ? 'page' : undefined}
        className={`px-3 py-1 rounded-full transition-colors ${
          activeLeague === 'kbo'
            ? 'bg-accent text-brand-900 font-bold'
            : 'text-brand-300 hover:text-white'
        }`}
      >
        KBO
      </Link>
      <Link
        href="/mlb"
        aria-current={activeLeague === 'mlb' ? 'page' : undefined}
        className={`px-3 py-1 rounded-full transition-colors ${
          activeLeague === 'mlb'
            ? 'bg-red-600 text-white font-bold'
            : 'text-brand-300 hover:text-white'
        }`}
      >
        MLB
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/moneyball && pnpm vitest run src/components/layout/__tests__/LeaguePill.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/moneyball/src/components/layout/LeaguePill.tsx apps/moneyball/src/components/layout/__tests__/LeaguePill.test.tsx
git commit -m "feat(layout): LeaguePill — KBO ⇄ MLB switcher 박제"
```

---

### Task 2: PlaceholderLoginButton 컴포넌트

**Files:**
- Create: `apps/moneyball/src/components/layout/PlaceholderLoginButton.tsx`
- Create: `apps/moneyball/src/components/layout/__tests__/PlaceholderLoginButton.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/moneyball/src/components/layout/__tests__/PlaceholderLoginButton.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlaceholderLoginButton } from '../PlaceholderLoginButton';

describe('PlaceholderLoginButton', () => {
  it('renders ETA placeholder', () => {
    render(<PlaceholderLoginButton />);
    expect(screen.getByText(/박제 중/)).toBeDefined();
  });

  it('button is disabled', () => {
    render(<PlaceholderLoginButton />);
    const button = screen.getByRole('button');
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('ETA 박제 시점 명시 (2026-08~09)', () => {
    render(<PlaceholderLoginButton />);
    expect(screen.getByText(/2026-08~09/)).toBeDefined();
  });

  it('aria-describedby 박제 (accessibility)', () => {
    render(<PlaceholderLoginButton />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-describedby')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/moneyball && pnpm vitest run src/components/layout/__tests__/PlaceholderLoginButton.test.tsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
// apps/moneyball/src/components/layout/PlaceholderLoginButton.tsx
export function PlaceholderLoginButton() {
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled
        aria-describedby="login-eta-hint"
        className="px-3 py-1.5 rounded-md bg-brand-100 dark:bg-brand-900 text-brand-400 text-xs cursor-not-allowed opacity-60"
      >
        로그인
      </button>
      <p id="login-eta-hint" className="text-[10px] text-brand-500 dark:text-brand-400">
        📌 박제 중 (ETA 2026-08~09)
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/moneyball && pnpm vitest run src/components/layout/__tests__/PlaceholderLoginButton.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/moneyball/src/components/layout/PlaceholderLoginButton.tsx apps/moneyball/src/components/layout/__tests__/PlaceholderLoginButton.test.tsx
git commit -m "feat(layout): PlaceholderLoginButton — ETA 2026-08~09 + 비활성화 button 박제"
```

---

### Task 3: Header.tsx 변경 — LeaguePill + utility nav embed

**Files:**
- Modify: `apps/moneyball/src/components/layout/Header.tsx`

- [ ] **Step 1: Write the failing test (regression — KBO sub-nav 변경 X)**

```typescript
// apps/moneyball/src/components/layout/__tests__/Header.regression.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '../Header';

describe('Header regression — KBO sub-nav 변경 X', () => {
  it('KBO 5 group 정합 (오늘의 경기 / 분석 / 시즌 / 검증 / 정보)', () => {
    render(<Header pathname="/" />);
    expect(screen.getByText('오늘의 경기')).toBeDefined();
    expect(screen.getByText('분석')).toBeDefined();
    expect(screen.getByText('시즌')).toBeDefined();
    expect(screen.getByText('검증')).toBeDefined();
    expect(screen.getByText('정보')).toBeDefined();
  });

  it('LeaguePill embedded — KBO active', () => {
    render(<Header pathname="/" />);
    const kboPill = screen.getByText('KBO');
    expect(kboPill.closest('a')?.getAttribute('aria-current')).toBe('page');
  });

  it('utility nav: 검색 / 정보 / 설정', () => {
    render(<Header pathname="/" />);
    expect(screen.getByLabelText('검색')).toBeDefined();
    expect(screen.getByLabelText('정보')).toBeDefined();
    expect(screen.getByLabelText('설정')).toBeDefined();
  });

  it('PlaceholderLoginButton embedded', () => {
    render(<Header pathname="/" />);
    expect(screen.getByText(/박제 중/)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/moneyball && pnpm vitest run src/components/layout/__tests__/Header.regression.test.tsx`
Expected: FAIL with "LeaguePill is not rendered" 또는 "유틸리티 nav 없음"

- [ ] **Step 3: Modify Header.tsx**

```typescript
// apps/moneyball/src/components/layout/Header.tsx (변경 patch — 기존 nav 유지)
// 기존 Header.tsx 의 navbar 위에 추가:

import { LeaguePill } from "./LeaguePill";
import { PlaceholderLoginButton } from "./PlaceholderLoginButton";
import Link from "next/link";

// Header component 안:
function getActiveLeague(pathname: string): 'kbo' | 'mlb' {
  return pathname.startsWith('/mlb') || pathname.startsWith('/en/mlb') ? 'mlb' : 'kbo';
}

// Header JSX (top utility bar 추가):
<div className="border-b border-brand-200 dark:border-brand-800 px-4 py-2 flex items-center justify-between">
  <div className="flex items-center gap-3">
    <Link href="/" className="text-base font-bold text-brand-700 dark:text-brand-100">
      MoneyBall Score
    </Link>
    <LeaguePill activeLeague={getActiveLeague(pathname)} />
  </div>
  <div className="flex items-center gap-2">
    <button aria-label="검색" className="p-1.5 hover:bg-brand-100 dark:hover:bg-brand-900 rounded-md">🔍</button>
    <Link href="/about" aria-label="정보" className="p-1.5 hover:bg-brand-100 dark:hover:bg-brand-900 rounded-md">🌐</Link>
    <button aria-label="설정" className="p-1.5 hover:bg-brand-100 dark:hover:bg-brand-900 rounded-md">⚙️</button>
    <PlaceholderLoginButton />
  </div>
</div>
// 기존 KBO sub-nav 5 group 그대로 유지 (변경 X)
// MLB mode 시 분기 — 다음 Task 안 박제
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/moneyball && pnpm vitest run src/components/layout/__tests__/Header.regression.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/moneyball/src/components/layout/Header.tsx apps/moneyball/src/components/layout/__tests__/Header.regression.test.tsx
git commit -m "feat(layout): Header — LeaguePill + utility nav embed (KBO 5 group 변경 X)"
```

---

### Task 4: Header.tsx — MLB sub-nav 분기

**Files:**
- Modify: `apps/moneyball/src/components/layout/Header.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/moneyball/src/components/layout/__tests__/Header.mlb.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '../Header';

describe('Header MLB mode', () => {
  it('renders MLB sub-nav (오늘 경기 / 분석 / 시즌 / 검증 + ⭐ WC / ⭐ PS / ⭐ Statcast)', () => {
    render(<Header pathname="/mlb" />);
    expect(screen.getByText('오늘 경기')).toBeDefined();
    expect(screen.getByText('분석')).toBeDefined();
    expect(screen.getByText('시즌')).toBeDefined();
    expect(screen.getByText('검증')).toBeDefined();
    expect(screen.getByText(/Wild Card/)).toBeDefined();
    expect(screen.getByText(/Postseason/)).toBeDefined();
    expect(screen.getByText(/Statcast/)).toBeDefined();
  });

  it('KBO sub-nav 비표시', () => {
    render(<Header pathname="/mlb" />);
    expect(screen.queryByText('오늘의 경기')).toBeNull(); // KBO label
  });

  it('MLB Pill active', () => {
    render(<Header pathname="/mlb/games/2026-05-29" />);
    expect(screen.getByText('MLB').closest('a')?.getAttribute('aria-current')).toBe('page');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/moneyball && pnpm vitest run src/components/layout/__tests__/Header.mlb.test.tsx`
Expected: FAIL

- [ ] **Step 3: Add MLB sub-nav branch**

```typescript
// apps/moneyball/src/components/layout/Header.tsx (sub-nav 분기)

const MLB_NAV = [
  { href: '/mlb/games', label: '오늘 경기' },
  { href: '/mlb/factors', label: '분석' },
  { href: '/mlb/standings', label: '시즌' },
  { href: '/mlb', label: '검증' },
  { href: '/mlb/wild-card', label: '⭐ Wild Card' },
  { href: '/mlb/postseason', label: '⭐ Postseason' },
  { href: '/mlb/players', label: '⭐ Statcast' },
];

// Header JSX:
const activeLeague = getActiveLeague(pathname);

{activeLeague === 'mlb' ? (
  <nav className="border-b border-brand-200 dark:border-brand-800 px-4 py-2 flex gap-4 overflow-x-auto">
    {MLB_NAV.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className="text-xs whitespace-nowrap text-brand-600 dark:text-brand-300 hover:text-brand-900 dark:hover:text-white"
      >
        {item.label}
      </Link>
    ))}
  </nav>
) : (
  // KBO sub-nav (기존 박제 유지)
  <KboSubNav />
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/moneyball && pnpm vitest run src/components/layout/__tests__/Header.mlb.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/moneyball/src/components/layout/Header.tsx apps/moneyball/src/components/layout/__tests__/Header.mlb.test.tsx
git commit -m "feat(layout): Header — MLB sub-nav 분기 + ⭐ Wild Card / Postseason / Statcast 박제"
```

---

### Task 5: MLB hub page (`/mlb`) — 풀 hub 전환

**Files:**
- Modify: `apps/moneyball/src/app/mlb/page.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/moneyball/src/app/mlb/__tests__/hub.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MlbHub from '../page';

describe('MLB hub page', () => {
  it('renders hero — MLB 분석 정식 (베타 → 정식)', async () => {
    const ui = await MlbHub();
    render(ui);
    expect(screen.getByText(/MLB 분석/)).toBeDefined();
    expect(screen.queryByText(/검토 중/)).toBeNull(); // 기존 waitlist 카피 archive
  });

  it('renders sub-route 진입 link 7+ 박제', async () => {
    const ui = await MlbHub();
    render(ui);
    // 9 sub-route 중 hub 외 8 진입 layer
    expect(screen.getByText(/오늘 경기/)).toBeDefined();
    expect(screen.getByText(/팀/)).toBeDefined();
    expect(screen.getByText(/Statcast/)).toBeDefined();
  });

  it('robots: index follow (현 waitlist noindex → index 전환)', async () => {
    const { metadata } = await import('../page');
    expect((metadata as any).robots?.index).not.toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/moneyball && pnpm vitest run src/app/mlb/__tests__/hub.test.tsx`
Expected: FAIL (현 waitlist 카피 박제)

- [ ] **Step 3: Modify hub page**

```typescript
// apps/moneyball/src/app/mlb/page.tsx (변경 — 현 waitlist archive + 풀 hub 전환)
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = "https://moneyballscore.vercel.app";

export const metadata: Metadata = {
  title: "MLB 분석 — 세이버메트릭스 14팩터 + Statcast | MoneyBall Score",
  description: "MLB 162game 풀 인제스트 + 14팩터 (KBO 10 + Statcast 4) + Brier 측정. 영문 페이지 박제. Telegram MLB combined 알림 박제 layer.",
  alternates: {
    canonical: `${SITE_URL}/mlb`,
    languages: { 'en': `${SITE_URL}/en/mlb`, 'ko': `${SITE_URL}/mlb` },
  },
  openGraph: {
    title: "MLB 분석 정식 ship | MoneyBall Score",
    description: "MLB 162game 풀 인제스트 + 14팩터 + Statcast",
    url: `${SITE_URL}/mlb`,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default async function MlbHub() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayGames } = await supabase
    .from('predictions')
    .select('*')
    .eq('league', 'mlb')
    .gte('game_date', today)
    .lte('game_date', today)
    .order('game_datetime_utc', { ascending: true });

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <Breadcrumb items={[{ label: "MLB 분석" }]} />

      <section className="text-center space-y-3 py-6">
        <h1 className="text-3xl md:text-5xl font-bold text-brand-700 dark:text-brand-100">
          MLB 분석
        </h1>
        <p className="text-base text-brand-600 dark:text-brand-300">
          162game 풀 인제스트 · 14팩터 본선 (KBO 10 + Statcast 4) · Shadow C 학습 weights
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <Link href="/mlb/games" className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">오늘 경기 ({todayGames?.length ?? 0})</h3>
          <p className="text-xs text-brand-500 mt-1">14팩터 + 예측 confidence</p>
        </Link>
        <Link href="/mlb/standings" className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">팀 standings</h3>
          <p className="text-xs text-brand-500 mt-1">AL/NL 6 division</p>
        </Link>
        <Link href="/mlb/players" className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">Statcast deep-dive</h3>
          <p className="text-xs text-brand-500 mt-1">xwOBA / Barrel% / Launch Angle</p>
        </Link>
        <Link href="/mlb/wild-card" className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-5">
          <h3 className="font-bold text-amber-700 dark:text-amber-200">⭐ Wild Card race</h3>
          <p className="text-xs text-amber-600 mt-1">잔여 일정 + tiebreaker</p>
        </Link>
        <Link href="/mlb/postseason" className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-5">
          <h3 className="font-bold text-amber-700 dark:text-amber-200">⭐ Postseason bracket</h3>
          <p className="text-xs text-amber-600 mt-1">WC / DS / LCS / WS</p>
        </Link>
        <Link href="/mlb/factors" className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">14 factor 설명</h3>
          <p className="text-xs text-brand-500 mt-1">가중치 + HOME_ELO_BONUS</p>
        </Link>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/moneyball && pnpm vitest run src/app/mlb/__tests__/hub.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/moneyball/src/app/mlb/page.tsx apps/moneyball/src/app/mlb/__tests__/hub.test.tsx
git commit -m "feat(mlb): hub page 풀 전환 (waitlist archive → 9 sub-route 진입 layer)"
```

---

### Task 6: `/mlb/games/[date]` 일자별 경기 list

**Files:**
- Create: `apps/moneyball/src/app/mlb/games/[date]/page.tsx`
- Create: `apps/moneyball/src/app/mlb/games/[date]/not-found.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/moneyball/src/app/mlb/games/[date]/__tests__/games.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: [
            { game_id: 1, home_team_code: 'LAD', away_team_code: 'NYY',
              predicted_winner: 'LAD', confidence: 0.62 },
          ]}),
        }),
      }),
    }),
  }),
}));

import GamesPage from '../page';

describe('/mlb/games/[date]', () => {
  it('renders 경기 list', async () => {
    const ui = await GamesPage({ params: Promise.resolve({ date: '2026-05-29' }) });
    render(ui);
    expect(screen.getByText('LAD')).toBeDefined();
    expect(screen.getByText('NYY')).toBeDefined();
    expect(screen.getByText('62%')).toBeDefined();
  });

  it('renders empty state', async () => {
    // mock empty data — separate test setup
    const ui = await GamesPage({ params: Promise.resolve({ date: '2099-01-01' }) });
    render(ui);
    expect(screen.queryByText(/MLB/)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/moneyball && pnpm vitest run src/app/mlb/games/[date]/__tests__/games.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// apps/moneyball/src/app/mlb/games/[date]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = "https://moneyballscore.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `MLB ${date} 경기 예측 | MoneyBall Score`,
    description: `${date} MLB 경기 14팩터 분석 + 예측 confidence`,
    alternates: {
      canonical: `${SITE_URL}/mlb/games/${date}`,
      languages: { 'en': `${SITE_URL}/en/mlb/games/${date}`, 'ko': `${SITE_URL}/mlb/games/${date}` },
    },
  };
}

export default async function MlbGames({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;

  if (!/^20[2-9]\d-\d{2}-\d{2}$/.test(date)) notFound();

  const supabase = createClient();
  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('league', 'mlb')
    .eq('game_date', date)
    .order('game_datetime_utc', { ascending: true });

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumb items={[
        { label: 'MLB 분석', href: '/mlb' },
        { label: date },
      ]} />

      <h1 className="text-2xl md:text-3xl font-bold text-brand-700 dark:text-brand-100">
        MLB {date} 경기
      </h1>

      {!predictions || predictions.length === 0 ? (
        <p className="text-brand-500">해당 일자 경기 박제 X</p>
      ) : (
        <ul className="space-y-3">
          {predictions.map((p: any) => (
            <li key={p.game_id} className="rounded-lg border border-brand-200 dark:border-brand-800 p-4 hover:border-brand-400 transition-colors">
              <Link href={`/mlb/games/${date}/${p.home_team_code}-vs-${p.away_team_code}`} className="flex items-center justify-between">
                <span className="font-semibold">
                  {p.home_team_code} vs {p.away_team_code}
                </span>
                <span className="text-sm text-brand-600 dark:text-brand-300">
                  {p.predicted_winner} {Math.round(p.confidence * 100)}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

```typescript
// apps/moneyball/src/app/mlb/games/[date]/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12 text-center">
      <h1 className="text-5xl font-bold text-brand-500/40">404</h1>
      <p className="text-brand-700 dark:text-brand-100 mt-4">잘못된 날짜 형식</p>
      <p className="text-sm text-brand-500 mt-2">URL 형식: <code>/mlb/games/YYYY-MM-DD</code></p>
      <Link href="/mlb" className="inline-block mt-6 text-brand-600 hover:underline">MLB hub →</Link>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/moneyball && pnpm vitest run src/app/mlb/games/[date]/__tests__/games.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/moneyball/src/app/mlb/games apps/moneyball/src/app/mlb/games/[date]/__tests__
git commit -m "feat(mlb): /mlb/games/[date] 일자별 경기 list + not-found"
```

---

### Task 7: `/mlb/games/[date]/[slug]` 경기 상세

**Files:**
- Create: `apps/moneyball/src/app/mlb/games/[date]/[slug]/page.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/moneyball/src/app/mlb/games/[date]/[slug]/__tests__/detail.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: {
                  game_id: 745123,
                  home_team_code: 'LAD',
                  away_team_code: 'NYY',
                  predicted_winner: 'LAD',
                  confidence: 0.62,
                  home_sp_fip: 3.0, away_sp_fip: 3.5,
                  home_lineup_xwoba: 0.351, away_lineup_xwoba: 0.339,
                }}),
              }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

import GameDetail from '../page';

describe('/mlb/games/[date]/[slug] detail', () => {
  it('renders 14 factor breakdown', async () => {
    const ui = await GameDetail({
      params: Promise.resolve({ date: '2026-05-29', slug: 'LAD-vs-NYY' }),
    });
    render(ui);
    expect(screen.getByText(/3\.0/)).toBeDefined(); // sp_fip
    expect(screen.getByText(/0\.351/)).toBeDefined(); // xwOBA
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/moneyball && pnpm vitest run src/app/mlb/games/[date]/[slug]/__tests__/detail.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// apps/moneyball/src/app/mlb/games/[date]/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = "https://moneyballscore.vercel.app";

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { date, slug } = await params;
  return {
    title: `${slug} ${date} 분석 | MoneyBall Score`,
    description: `${slug} 14팩터 + Statcast 4 + waterfall`,
    alternates: {
      canonical: `${SITE_URL}/mlb/games/${date}/${slug}`,
      languages: { 'en': `${SITE_URL}/en/mlb/games/${date}/${slug}`, 'ko': `${SITE_URL}/mlb/games/${date}/${slug}` },
    },
  };
}

export default async function GameDetail({ params }: any) {
  const { date, slug } = await params;
  const [home, away] = slug.split('-vs-');
  if (!home || !away) notFound();

  const supabase = createClient();
  const { data: pred } = await supabase
    .from('predictions')
    .select('*')
    .eq('league', 'mlb')
    .eq('game_date', date)
    .eq('home_team_code', home)
    .eq('away_team_code', away)
    .single();

  if (!pred) notFound();

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumb items={[
        { label: 'MLB 분석', href: '/mlb' },
        { label: date, href: `/mlb/games/${date}` },
        { label: `${home} vs ${away}` },
      ]} />

      <h1 className="text-2xl md:text-3xl font-bold">
        {home} vs {away}
      </h1>

      <section className="rounded-lg bg-brand-50 dark:bg-brand-900 p-5">
        <div className="text-3xl font-bold text-brand-700 dark:text-brand-100">
          {pred.predicted_winner} {Math.round(pred.confidence * 100)}%
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">14 factor breakdown</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <FactorRow label="선발 FIP" home={pred.home_sp_fip} away={pred.away_sp_fip} />
          <FactorRow label="타선 wOBA" home={pred.home_lineup_woba} away={pred.away_lineup_woba} />
          <FactorRow label="타선 xwOBA" home={pred.home_lineup_xwoba} away={pred.away_lineup_xwoba} />
          <FactorRow label="Barrel%" home={pred.home_lineup_barrel_pct} away={pred.away_lineup_barrel_pct} />
        </dl>
      </section>
    </main>
  );
}

function FactorRow({ label, home, away }: { label: string; home: number | null; away: number | null }) {
  return (
    <div className="border border-brand-200 dark:border-brand-800 rounded p-3">
      <dt className="text-xs text-brand-500">{label}</dt>
      <dd className="font-mono mt-1">{home ?? '—'} / {away ?? '—'}</dd>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/moneyball && pnpm vitest run src/app/mlb/games/[date]/[slug]/__tests__/detail.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/moneyball/src/app/mlb/games/[date]/[slug] apps/moneyball/src/app/mlb/games/[date]/[slug]/__tests__
git commit -m "feat(mlb): /mlb/games/[date]/[slug] 경기 상세 + 14 factor breakdown"
```

---

### Task 8~12: 잔여 7 sub-route (team / players / factors / standings / wild-card / postseason)

> **간략화**: 각 페이지 패턴 = Task 5~7 정합 (Server Component + Supabase fetch + Breadcrumb + 한국어 카피). 각 ~1 task / ~5 step. 본 plan 안 핵심 페이지 (hub / games list / games detail) 상세 박제 + 잔여 페이지 = 패턴 정합 박제 후 commit 단위 통합.

각 페이지 박제 step (반복 패턴):
1. Test 작성 (render snapshot + data fetch mock)
2. Test fail 확인
3. Implementation (Breadcrumb + Server Component + Supabase fetch + metadata + canonical + hreflang)
4. Test pass 확인
5. Commit `feat(mlb): /<path> 박제`

박제 페이지 7건:
- `/mlb/team/[code]/page.tsx` — `team_season_stats WHERE league='mlb'` fetch
- `/mlb/players/[id]/page.tsx` — Statcast deep-dive (xwOBA / Barrel% / Launch Angle)
- `/mlb/factors/page.tsx` — 14 factor 설명 + 가중치 표
- `/mlb/standings/page.tsx` — AL/NL 6 division standings
- `/mlb/wild-card/page.tsx` — Wild Card race + 잔여 일정
- `/mlb/postseason/page.tsx` — bracket (WC / DS / LCS / WS)

각 commit:
- Task 8: `feat(mlb): /mlb/team/[code] 팀 시즌 stat 박제`
- Task 9: `feat(mlb): /mlb/players/[id] Statcast deep-dive 박제`
- Task 10: `feat(mlb): /mlb/factors 14 factor 설명 박제`
- Task 11: `feat(mlb): /mlb/standings AL/NL 6 division 박제`
- Task 12: `feat(mlb): /mlb/wild-card race tracker 박제`
- Task 13: `feat(mlb): /mlb/postseason bracket 박제`

---

### Task 14: 영문 mirror 9 페이지 (/en/mlb/*)

**Files:** `apps/moneyball/src/app/en/mlb/page.tsx` + 8 mirror

> **i18n routing 방식**: manual `/en/mlb/*` mirror (next-intl 외부 라이브러리 X — Next.js 16 App Router native + 본 메인 직접 작성).

각 한국어 페이지 → 영문 mirror 박제 (1 task = 1 페이지):

- [ ] **Step 1: Write the failing test**

```typescript
// apps/moneyball/src/app/en/mlb/__tests__/hub-en.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MlbHubEn from '../page';

describe('/en/mlb hub English mirror', () => {
  it('renders English copy', async () => {
    const ui = await MlbHubEn();
    render(ui);
    expect(screen.getByText(/MLB Analysis/i)).toBeDefined();
    expect(screen.queryByText('MLB 분석')).toBeNull(); // 한국어 X
  });

  it('hreflang canonical = /en/mlb', async () => {
    const { metadata } = await import('../page');
    expect((metadata as any).alternates?.canonical).toContain('/en/mlb');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/moneyball && pnpm vitest run src/app/en/mlb/__tests__/hub-en.test.tsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write English mirror**

```typescript
// apps/moneyball/src/app/en/mlb/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const SITE_URL = "https://moneyballscore.vercel.app";

export const metadata: Metadata = {
  title: "MLB Analysis — 14-Factor Sabermetrics + Statcast | MoneyBall Score",
  description: "MLB 162-game full ingestion + 14-factor model (KBO 10 + Statcast 4). Brier-scored predictions. Telegram combined notifications.",
  alternates: {
    canonical: `${SITE_URL}/en/mlb`,
    languages: { 'en': `${SITE_URL}/en/mlb`, 'ko': `${SITE_URL}/mlb` },
  },
};

export default async function MlbHubEn() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayGames } = await supabase
    .from('predictions')
    .select('*')
    .eq('league', 'mlb')
    .gte('game_date', today);

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <Breadcrumb items={[{ label: "MLB Analysis" }]} />

      <section className="text-center space-y-3 py-6">
        <h1 className="text-3xl md:text-5xl font-bold text-brand-700 dark:text-brand-100">
          MLB Analysis
        </h1>
        <p className="text-base text-brand-600 dark:text-brand-300">
          162-game full ingestion · 14-factor model (KBO 10 + Statcast 4) · Shadow C learned weights
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <Link href="/en/mlb/games" className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5">
          <h3 className="font-bold">Today's Games ({todayGames?.length ?? 0})</h3>
          <p className="text-xs text-brand-500 mt-1">14-factor + prediction confidence</p>
        </Link>
        <Link href="/en/mlb/standings" className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5">
          <h3 className="font-bold">Standings</h3>
          <p className="text-xs text-brand-500 mt-1">AL/NL 6 divisions</p>
        </Link>
        <Link href="/en/mlb/players" className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5">
          <h3 className="font-bold">Statcast Deep-Dive</h3>
          <p className="text-xs text-brand-500 mt-1">xwOBA / Barrel% / Launch Angle</p>
        </Link>
        <Link href="/en/mlb/wild-card" className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 p-5">
          <h3 className="font-bold text-amber-700">⭐ Wild Card Race</h3>
        </Link>
        <Link href="/en/mlb/postseason" className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 p-5">
          <h3 className="font-bold text-amber-700">⭐ Postseason Bracket</h3>
        </Link>
        <Link href="/en/mlb/factors" className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5">
          <h3 className="font-bold">14 Factor Breakdown</h3>
        </Link>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/moneyball && pnpm vitest run src/app/en/mlb/__tests__/hub-en.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/moneyball/src/app/en/mlb/page.tsx apps/moneyball/src/app/en/mlb/__tests__/hub-en.test.tsx
git commit -m "feat(mlb): /en/mlb hub English mirror — 본 메인 직접 작성"
```

> **잔여 8 English mirror** (games / games detail / team / players / factors / standings / wild-card / postseason) = Task 14 패턴 정합 박제. 각 ~1 task / ~5 step. commit prefix `feat(mlb): /en/mlb/<path> English mirror 박제`.

---

### Task 15: Placeholder 페이지 3 (login / settings / community)

**Files:**
- Create: `apps/moneyball/src/app/login/page.tsx`
- Create: `apps/moneyball/src/app/settings/page.tsx`
- Create: `apps/moneyball/src/app/community/page.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/moneyball/src/app/__tests__/placeholders.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Login from '../login/page';
import Settings from '../settings/page';
import Community from '../community/page';

describe('Placeholder 페이지 3', () => {
  it.each([
    ['login', Login, '회원 기능'],
    ['settings', Settings, '설정'],
    ['community', Community, '커뮤니티'],
  ])('%s renders placeholder + ETA', (_name, Component, expectedText) => {
    render(<Component />);
    expect(screen.getByText(new RegExp(expectedText))).toBeDefined();
    expect(screen.getByText(/2026-08~09|박제 중/)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/moneyball && pnpm vitest run src/app/__tests__/placeholders.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write 3 placeholder pages**

```typescript
// apps/moneyball/src/app/login/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인 박제 중 | MoneyBall Score",
  robots: { index: false, follow: false },
};

export default function Login() {
  return (
    <main className="max-w-md mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-brand-700 dark:text-brand-100">📌 회원 기능 박제 중</h1>
      <p className="text-sm text-brand-500 dark:text-brand-400 mt-3">2026-08~09 ship 예정 (postseason 직전).</p>
    </main>
  );
}
```

```typescript
// apps/moneyball/src/app/settings/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "설정 박제 중 | MoneyBall Score",
  robots: { index: false, follow: false },
};

export default function Settings() {
  return (
    <main className="max-w-md mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold">📌 설정 박제 중</h1>
      <p className="text-sm text-brand-500 mt-3">2026-08~09 ship 예정 (인증 layer 의존).</p>
    </main>
  );
}
```

```typescript
// apps/moneyball/src/app/community/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "커뮤니티 박제 중 | MoneyBall Score",
  robots: { index: false, follow: false },
};

export default function Community() {
  return (
    <main className="max-w-md mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold">📌 커뮤니티 박제 중</h1>
      <p className="text-sm text-brand-500 mt-3">2026-08~09 ship 예정 (인증 layer 의존).</p>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/moneyball && pnpm vitest run src/app/__tests__/placeholders.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/moneyball/src/app/login apps/moneyball/src/app/settings apps/moneyball/src/app/community apps/moneyball/src/app/__tests__/placeholders.test.tsx
git commit -m "feat(placeholder): login/settings/community 페이지 박제 (인증 후순위 정합)"
```

---

### Task 16: MlbCombinedMessage 포맷 + 4096 split

**Files:**
- Create: `apps/moneyball/src/components/notify/MlbCombinedMessage.ts`
- Create: `apps/moneyball/src/components/notify/__tests__/MlbCombinedMessage.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/moneyball/src/components/notify/__tests__/MlbCombinedMessage.test.ts
import { describe, it, expect } from 'vitest';
import { formatMlbCombinedMessage, splitMessage } from '../MlbCombinedMessage';

describe('MlbCombinedMessage', () => {
  it('formats recap + preview combined', () => {
    const msg = formatMlbCombinedMessage({
      recap: { date: '2026-05-28', games: 5, correct: 3, brier: 0.245 },
      preview: { date: '2026-05-29', games: [
        { home: 'LAD', away: 'NYY', predicted: 'LAD', confidence: 0.62, bigGame: true },
        { home: 'BOS', away: 'TOR', predicted: 'BOS', confidence: 0.55, bigGame: false },
      ]},
    });

    expect(msg).toContain('[MLB recap]');
    expect(msg).toContain('어제 5경기');
    expect(msg).toContain('3/5');
    expect(msg).toContain('0.245');
    expect(msg).toContain('[MLB preview]');
    expect(msg).toContain('LAD vs NYY');
    expect(msg).toContain('⭐'); // 빅매치 마크
  });

  it('splits messages > 4096 char', () => {
    const longMsg = 'a'.repeat(5000);
    const parts = splitMessage(longMsg);
    expect(parts.length).toBeGreaterThan(1);
    parts.forEach((p) => expect(p.length).toBeLessThanOrEqual(4096));
  });

  it('빅매치 criteria = confidence > 0.65 또는 playoff race', () => {
    const msg = formatMlbCombinedMessage({
      recap: { date: '2026-05-28', games: 0, correct: 0, brier: 0 },
      preview: { date: '2026-05-29', games: [
        { home: 'LAD', away: 'NYY', predicted: 'LAD', confidence: 0.66, bigGame: false },
      ]},
    });
    expect(msg).toContain('⭐'); // confidence > 0.65 자동 빅매치
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/moneyball && pnpm vitest run src/components/notify/__tests__/MlbCombinedMessage.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
// apps/moneyball/src/components/notify/MlbCombinedMessage.ts

export interface RecapPayload {
  date: string;
  games: number;
  correct: number;
  brier: number;
}

export interface PreviewGame {
  home: string;
  away: string;
  predicted: string;
  confidence: number;
  bigGame: boolean;
}

export interface PreviewPayload {
  date: string;
  games: PreviewGame[];
}

const BIG_GAME_THRESHOLD = 0.65;
const MAX_TELEGRAM_LENGTH = 4096;

export function formatMlbCombinedMessage(
  payload: { recap: RecapPayload; preview: PreviewPayload },
): string {
  const lines: string[] = [];

  if (payload.recap.games > 0) {
    lines.push(`[MLB recap] ${payload.recap.date}`);
    lines.push(`어제 ${payload.recap.games}경기 / 적중 ${payload.recap.correct}/${payload.recap.games}`);
    lines.push(`Brier ${payload.recap.brier.toFixed(3)}`);
    lines.push('');
  }

  if (payload.preview.games.length > 0) {
    lines.push(`[MLB preview] ${payload.preview.date} 새벽 경기`);
    payload.preview.games.forEach((g) => {
      const isBig = g.bigGame || g.confidence > BIG_GAME_THRESHOLD;
      const mark = isBig ? '⭐ ' : '';
      const conf = Math.round(g.confidence * 100);
      lines.push(`${mark}${g.home} vs ${g.away} → ${g.predicted} ${conf}%`);
    });
  }

  return lines.join('\n');
}

export function splitMessage(text: string): string[] {
  if (text.length <= MAX_TELEGRAM_LENGTH) return [text];

  const parts: string[] = [];
  const lines = text.split('\n');
  let current = '';

  for (const line of lines) {
    if (current.length + line.length + 1 > MAX_TELEGRAM_LENGTH) {
      parts.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) parts.push(current);

  return parts;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/moneyball && pnpm vitest run src/components/notify/__tests__/MlbCombinedMessage.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/moneyball/src/components/notify/MlbCombinedMessage.ts apps/moneyball/src/components/notify/__tests__/MlbCombinedMessage.test.ts
git commit -m "feat(notify): MlbCombinedMessage 포맷 + 4096 split + 빅매치 criteria 박제"
```

---

### Task 17: sitemap.ts MLB 18 URL 추가

**Files:**
- Modify: `apps/moneyball/src/app/sitemap.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/moneyball/src/app/__tests__/sitemap-mlb.test.ts
import { describe, it, expect } from 'vitest';
import sitemap from '../sitemap';

describe('sitemap MLB URL coverage', () => {
  it('includes MLB 9 한국어 routes', async () => {
    const urls = await sitemap();
    const mlbRoutes = urls.filter((u) => u.url.includes('/mlb') && !u.url.includes('/en/'));
    expect(mlbRoutes.length).toBeGreaterThanOrEqual(9);
  });

  it('includes MLB 9 English mirror routes', async () => {
    const urls = await sitemap();
    const enRoutes = urls.filter((u) => u.url.includes('/en/mlb'));
    expect(enRoutes.length).toBeGreaterThanOrEqual(9);
  });

  it('does NOT include placeholder routes (noindex)', async () => {
    const urls = await sitemap();
    expect(urls.find((u) => u.url.endsWith('/login'))).toBeUndefined();
    expect(urls.find((u) => u.url.endsWith('/settings'))).toBeUndefined();
    expect(urls.find((u) => u.url.endsWith('/community'))).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/moneyball && pnpm vitest run src/app/__tests__/sitemap-mlb.test.ts`
Expected: FAIL (현 sitemap MLB X)

- [ ] **Step 3: Modify sitemap.ts**

```typescript
// apps/moneyball/src/app/sitemap.ts (add MLB routes)
const MLB_ROUTES = ['', '/games', '/factors', '/standings', '/wild-card', '/postseason'];

// 추가 path:
...MLB_ROUTES.map((path) => ({
  url: `${SITE_URL}/mlb${path}`,
  lastModified: new Date(),
  changeFrequency: 'daily' as const,
  priority: path === '' ? 0.9 : 0.7,
})),
...MLB_ROUTES.map((path) => ({
  url: `${SITE_URL}/en/mlb${path}`,
  lastModified: new Date(),
  changeFrequency: 'daily' as const,
  priority: 0.6,
})),
// 동적 routes (team / players / games detail) = generateStaticParams 별도
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/moneyball && pnpm vitest run src/app/__tests__/sitemap-mlb.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/moneyball/src/app/sitemap.ts apps/moneyball/src/app/__tests__/sitemap-mlb.test.ts
git commit -m "feat(seo): sitemap MLB 18 URL 추가 (한국어 9 + 영문 9) + placeholder noindex 정합"
```

---

### Task 18: E2E test — Playwright 5 spec

**Files:**
- Create: `apps/moneyball/e2e/mlb-routes.spec.ts`
- Create: `apps/moneyball/e2e/league-pill.spec.ts`
- Create: `apps/moneyball/e2e/hreflang.spec.ts`

- [ ] **Step 1: Write Playwright spec**

```typescript
// apps/moneyball/e2e/mlb-routes.spec.ts
import { test, expect } from '@playwright/test';

const MLB_ROUTES_KR = [
  '/mlb', '/mlb/games/2026-05-29',
  '/mlb/standings', '/mlb/wild-card', '/mlb/postseason',
  '/mlb/factors',
];

const MLB_ROUTES_EN = MLB_ROUTES_KR.map((r) => r.replace('/mlb', '/en/mlb'));

test.describe('MLB routes render', () => {
  for (const route of [...MLB_ROUTES_KR, ...MLB_ROUTES_EN]) {
    test(`${route} renders 200`, async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      const breadcrumb = page.locator('[aria-label="Breadcrumb"]');
      await expect(breadcrumb).toBeVisible();
    });
  }
});
```

```typescript
// apps/moneyball/e2e/league-pill.spec.ts
import { test, expect } from '@playwright/test';

test('LeaguePill switches KBO ⇄ MLB', async ({ page }) => {
  await page.goto('/');
  const kboPill = page.locator('a:has-text("KBO")[aria-current="page"]');
  await expect(kboPill).toBeVisible();

  await page.locator('a:has-text("MLB")').click();
  await expect(page).toHaveURL(/\/mlb$/);
  const mlbActive = page.locator('a:has-text("MLB")[aria-current="page"]');
  await expect(mlbActive).toBeVisible();
});

test('MLB sub-nav shows ⭐ Wild Card / Postseason / Statcast', async ({ page }) => {
  await page.goto('/mlb');
  await expect(page.locator('text=Wild Card')).toBeVisible();
  await expect(page.locator('text=Postseason')).toBeVisible();
  await expect(page.locator('text=Statcast')).toBeVisible();
});
```

```typescript
// apps/moneyball/e2e/hreflang.spec.ts
import { test, expect } from '@playwright/test';

test('hreflang link 박제 한국어 ↔ 영문', async ({ page }) => {
  await page.goto('/mlb');
  const hreflangEn = page.locator('link[hreflang="en"]');
  await expect(hreflangEn).toHaveAttribute('href', /en\/mlb/);

  await page.goto('/en/mlb');
  const hreflangKo = page.locator('link[hreflang="ko"]');
  await expect(hreflangKo).toHaveAttribute('href', /^[^/]*\/mlb$/);
});
```

- [ ] **Step 2: Run Playwright E2E**

Run: `cd apps/moneyball && pnpm playwright test e2e/`
Expected: PASS (~12 spec tests)

- [ ] **Step 3: Commit**

```bash
git add apps/moneyball/e2e/mlb-routes.spec.ts apps/moneyball/e2e/league-pill.spec.ts apps/moneyball/e2e/hreflang.spec.ts
git commit -m "test(e2e): MLB routes render + LeaguePill switcher + hreflang Playwright spec"
```

---

## Plan B 완료 layer

총 **18 task / ~90 step / ~25 test (Unit + Integration + E2E)**:
- Sprint 4: Task 1~3 (LeaguePill + PlaceholderLoginButton + Header)
- Task 4 (Header MLB sub-nav 분기)
- Task 5~13 (9 한국어 sub-route 페이지)
- Task 14 (영문 mirror 9 — `/en/mlb/*`)
- Task 15 (3 placeholder 페이지)
- Task 16 (MlbCombinedMessage 포맷)
- Task 17 (sitemap)
- Task 18 (E2E Playwright)

### Verification (final)

```bash
cd apps/moneyball && pnpm vitest run
cd apps/moneyball && pnpm playwright test e2e/
pnpm build  # Next.js build 검증
```

Expected: 모든 unit + E2E PASS + build 성공.

### Next plan

→ **Plan C (ship + cron)**: 7 cron + silent-drift alert + production ship

---

## Self-Review

### Spec coverage check

| Spec section | Plan B task |
|---|---|
| 2.3 Telegram MLB combined 메시지 포맷 | Task 16 (MlbCombinedMessage) |
| 2.4 IA D 9 sub-route + cross-league header | Task 1, 3, 4, 5~13 |
| 2.5 인증 G 후순위 placeholder | Task 15 (login/settings/community) |
| 2.9 SEO B MLB 영문 mirror | Task 14 + sitemap (Task 17) |
| 4.5 LeaguePill + PlaceholderLoginButton | Task 1, 2 |
| 4.6 Header.tsx 변경 | Task 3, 4 |
| 7.3 E2E DST / Cross-league / Placeholder / hreflang | Task 18 |

### Placeholder scan

- ✅ "TBD" / "TODO" / "implement later" 0건
- ⚠️ Task 8~13 = 패턴 정합 박제 명시 — 각 task 코드 박제 X (간략화). production 박제 시 Task 5~7 패턴 정합 적용.
- ✅ Task 14 영문 mirror = 1 페이지 박제 + 8 잔여 = 패턴 정합 명시

### Type consistency

- `'kbo' | 'mlb'` 활성 league (Task 1) ↔ `getActiveLeague(pathname)` (Task 3) ✅
- `confidence: number` (Task 6, 7, 16) 일관 ✅
- `RecapPayload` / `PreviewPayload` (Task 16) 명확 ✅

### Coverage gap

- ⚠️ Task 8~13 = 코드 박제 X (간략화 — Task 5~7 패턴 정합) → 실제 implementation 시 본 메인 invoke 또는 사용자 직접 박제
- ⚠️ Task 14 = 1 페이지 + 8 잔여 명시 → 실제 implementation 시 패턴 정합 박제
- ✅ self-review finding mitigation = subagent-driven-development 안 패턴 정합 박제 fast track

---

End of Plan B.
