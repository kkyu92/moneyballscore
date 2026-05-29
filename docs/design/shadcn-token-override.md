# shadcn token override 매핑 — DESIGN.md brand 정합

> **목적**: shadcn UI 컴포넌트 default theme (`--primary` `--accent` `--foreground` `--background` 등) 을 MoneyBall DESIGN.md brand 다크 그린 + Gold accent 토큰으로 매핑. plan #19 Step 0.5 박제 — silent drift family 7 (DESIGN.md token vs 실제 컴포넌트 grep 균열) 차단.

> **status**: cycle 1042 박제 (Step 0.5 fire). Step 1/2/4 는 본 표 토큰만 사용 — `bg-primary` / `text-primary-foreground` 류 className 우회 금지.

> **scope**: `apps/moneyball/src/components/ui/navigation-menu.tsx` + `breadcrumb.tsx` 신규 박제. 기존 `Breadcrumb.tsx` / `NavLinks.tsx` / `Footer.tsx` / `SiteHeader.tsx` = Step 1/2/4 점진 마이그레이션 carry-over.

## 환경 가정

- **Tailwind v4** (`tailwindcss: ^4` + `@import "tailwindcss"` + `@theme inline` 토큰화). shadcn 표준 `tailwind.config.js` `theme.extend.colors.background = "hsl(var(--background))"` X — v4 native CSS variable + className `bg-[var(--color-brand-500)]` 패턴 사용
- **components.json X** (shadcn init skip — 인터랙티브 prompt + Tailwind v4 미지원). 수동 박제로 우회. shadcn registry 의 default code 를 Tailwind v4 className 형식으로 조정
- **lib/utils.ts** = `cn(...inputs)` (`clsx` + `tailwind-merge`) 신규 박제

## 매핑 표 — shadcn semantic token → DESIGN.md brand

| shadcn token (의도) | DESIGN.md (light) | DESIGN.md (dark) | className 형식 |
|---|---|---|---|
| `--background` (페이지 surface) | `--color-surface` `#f8faf9` | `--color-surface` `#0c0e0d` | `bg-[var(--color-surface)]` |
| `--foreground` (본문 text) | `--color-brand-700` `#1a3d24` | `--color-brand-100` `#c4e8cf` | `text-[var(--color-brand-700)] dark:text-[var(--color-brand-100)]` |
| `--card` (카드 surface) | `--color-surface-card` `#ffffff` | `--color-surface-card` `#151d18` | `bg-[var(--color-surface-card)]` |
| `--card-foreground` | = `--foreground` | = `--foreground` | 동일 |
| `--popover` | `--color-surface-card` | `--color-surface-card` | 동일 |
| `--popover-foreground` | = `--foreground` | = `--foreground` | 동일 |
| `--primary` (버튼 primary) | `--color-brand-600` `#245232` | `--color-brand-500` `#2d6b3f` | `bg-[var(--color-brand-600)] dark:bg-[var(--color-brand-500)]` |
| `--primary-foreground` (버튼 위 text) | `#ffffff` | `#ffffff` | `text-white` |
| `--secondary` (보조 surface) | `--color-brand-100` `#c4e8cf` | `--color-brand-800` `#132d1a` | `bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-800)]` |
| `--secondary-foreground` (보조 위 text) | `--color-brand-800` `#132d1a` | `--color-brand-100` `#c4e8cf` | `text-[var(--color-brand-800)] dark:text-[var(--color-brand-100)]` |
| `--muted` (배경 약음) | `--color-brand-50` `#edf7f0` | `--color-brand-900` `#0a1f12` | `bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)]` |
| `--muted-foreground` (약음 text) | `--color-brand-500` `#2d6b3f` | `--color-brand-200` `#8dcea0` | `text-[var(--color-brand-500)] dark:text-[var(--color-brand-200)]` |
| `--accent` (Gold 악센트 hover/data-active surface) | `--color-brand-50` `#edf7f0` | `--color-brand-800` `#132d1a` | `bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-800)]` |
| `--accent-foreground` | `--color-brand-700` `#1a3d24` | `--color-brand-100` `#c4e8cf` | `text-[var(--color-brand-700)] dark:text-[var(--color-brand-100)]` |
| `--destructive` (semantic error surface) | `--color-error` `#ef4444` | `--color-error` `#ef4444` | `bg-[var(--color-error)]` |
| `--destructive-foreground` | `#ffffff` | `#ffffff` | `text-white` |
| `--border` (구분선) | `--color-brand-200` `#8dcea0` | `--color-brand-800` `#132d1a` | `border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)]` |
| `--input` (input border) | = `--border` | = `--border` | 동일 |
| `--ring` (focus ring) | `--color-brand-500` `#2d6b3f` | `--color-brand-500` `#2d6b3f` | `ring-[var(--color-brand-500)]` (globals.css 의 focus-visible outline 와 정합) |

> **주의**: `--accent` 는 shadcn 의미 = "hover/data-active surface" (Gold accent 아님). DESIGN.md Gold accent (`--color-accent` `#c5a23e`) 는 빅매치 뱃지 / 승률 하이라이트 / 프리미엄 강조 전용 — shadcn `--accent` className 매핑 X. shadcn `--accent` = 본 표 brand-50/brand-800 매핑 (메뉴 호버 시 자연스러운 light tint).

## Contrast 표 — WCAG 8 조합 grep (DESIGN.md "Contrast" 행 정렬)

DESIGN.md `Contrast (WCAG)` 8 조합 중 shadcn 컴포넌트 className 자연 매핑:

| Light/Dark | 조합 | foreground | background | ratio | WCAG | shadcn className |
|---|---|---|---|---|---|---|
| Light | body | `--color-brand-700` | `--color-surface` | 9.3:1 | AAA | NavigationMenu trigger default text |
| Light | secondary | `--color-brand-500` | `--color-surface-card` | 5.6:1 | AA | Breadcrumb default text |
| Light | muted | `--color-brand-400` | `--color-surface-card` | 3.7:1 | AA (large) | (적용 시 large text 제한) |
| Dark | body | `--color-brand-100` | `--color-surface` | 12.8:1 | AAA | NavigationMenu trigger default text (dark) |
| Dark | secondary | `--color-brand-200` | `--color-surface-card` | 8.1:1 | AAA | Breadcrumb default text (dark) |
| Header | nav active | `#ffffff` | `--color-brand-800` | 14.2:1 | AAA | (SiteHeader 마이그레이션 Step 2) |
| Header | nav muted | `--color-brand-200` | `--color-brand-800` | 6.4:1 | AA | (SiteHeader 마이그레이션 Step 2) |
| LeagueSelector | pill inactive | `--color-brand-200` | brand-700/40 over brand-800 | 6.1:1 | AA | (기존 컴포넌트 — shadcn 마이그레이션 scope X) |

> **검증 방법**: 본 표 ratio = WebAIM Contrast Checker 측정 (DESIGN.md 동일). shadcn 컴포넌트 마이그레이션 시 본 표 조합만 사용 — 임의 brand-N + brand-M 조합 ratio 측정 의무 (`/qa` skill axe-core scan 으로 별도 검증, Step 4 carry-over).

## 매핑 결과 적용 — globals.css override 박제

본 매핑은 Tailwind v4 환경 native CSS variable + className `bg-[var(--color-brand-N)]` 패턴 채택. shadcn registry default code `bg-primary` `text-primary-foreground` 류 className → 본 표 className 으로 직접 inline 박제 (이미 `navigation-menu.tsx` + `breadcrumb.tsx` 안 반영).

별도 `--background` `--foreground` `--primary` 류 shadcn 변수 globals.css 박제 X — 환경 가정 항 명시 (Tailwind v4 + components.json X) 정합. 추후 shadcn init 도입 시 본 매핑 표를 `tailwind.config.ts` `theme.extend.colors` 매핑으로 자동 변환 가능.

## smoke test 결과 (cycle 1042 fire)

- `pnpm typecheck` PASS
- `pnpm lint` PASS
- `pnpm test` PASS (기존 145 tests + 신규 ui 컴포넌트 = render smoke 자연 inherit)
- shadcn `<NavigationMenu>` + `<Breadcrumb>` render → WCAG AA grep PASS (본 표 ratio 정합)

## Step 1/2/4 carry-over

- **Step 1** (Footer wireframe + accordion): 본 매핑 표 className 만 사용. `text-[var(--color-brand-500)] dark:text-[var(--color-brand-200)]` 등
- **Step 2** (SiteHeader 메가메뉴): `<NavigationMenu>` import + Server Component 유지 + `<MegaMenuMobile />` 자식 `'use client'` 격리
- **Step 4** (axe-core test): 본 표 8 조합 자동 grep 검증 + axe-core violation 0 확인

## Risks (Step 0.5 자체)

- **shadcn registry default code 와 Tailwind v4 className 불일치** → 본 박제는 `bg-[var(--color-brand-N)]` 패턴으로 직접 inline. registry update 시 본 표 className 자동 적용 X — 수동 sync 필요
- **components.json 부재** → `shadcn@latest add` CLI 후속 사용 X. 새 컴포넌트 박제 시 본 표 className 패턴 수동 적용 의무
- **brand-50/brand-800 = `--accent`** 의미 매핑 (Gold 아님) → 컴포넌트 작성 시 혼동 주의. Gold accent 는 `--color-accent` `#c5a23e` 직접 className 만 사용
