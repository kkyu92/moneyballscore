# Megamenu 상태 매트릭스 + spec (plan #14 C2 Step 2 / plan #19 Step 2)

cycle 1021 carry-over — Header.tsx 메가메뉴 spec 박제. shadcn `<NavigationMenu>` full migration = plan #19 Step 2 (cycle 1044) 완료.

## 마이그레이션 이력

- **cycle 1021** (plan #14 C2 Step 2): MegaMenu.tsx 신규 박제 (Radix NavigationMenu 직접 wrapper)
- **cycle 1042** (plan #19 Step 0.5): shadcn navigation-menu 컴포넌트 박제 (`apps/moneyball/src/components/ui/navigation-menu.tsx`) + brand token override 표 박제
- **cycle 1044** (plan #19 Step 2): MegaMenu.tsx 가 shadcn wrapper 직접 사용 (`@/components/ui/navigation-menu`) — Radix 직접 import 제거. focus-visible token `outline-brand-500` + touch target `min-h-11` 강제. desktop trigger + mobile Accordion 양쪽 정합.

## 채택 라이브러리

**Radix UI Navigation Menu** (shadcn wrapper 또는 직접 install). WAI-ARIA Authoring Practices `menubar` pattern 자동 적용 — focus trap / keyboard nav / ARIA role auto.

`@radix-ui/react-navigation-menu` install 명령:
```bash
cd apps/moneyball && pnpm add @radix-ui/react-navigation-menu
```

shadcn 채택 시 (별도 plan):
```bash
cd apps/moneyball && pnpm dlx shadcn@latest init
cd apps/moneyball && pnpm dlx shadcn@latest add navigation-menu
```

## 상태 매트릭스 (12 case)

| # | state | trigger | visual | a11y |
|---|---|---|---|---|
| 1 | default | 페이지 로드 직후 | menu trigger = brand-200 text, no underline | aria-expanded=false |
| 2 | hover (desktop) | mouse enter trigger | menu trigger underline + brand-100 text + 200ms delay panel open | data-state=open |
| 3 | focus | Tab → menu trigger | brand-500 outline ring (DESIGN.md focus token) | aria-expanded=false |
| 4 | focus-visible | Tab + keyboard only | brand-500 outline ring + 2px offset | role=menuitem |
| 5 | active (route match) | pathname starts with item.href | bg-brand-700 text-white | aria-current=page |
| 6 | click-open (mobile) | tap trigger | panel open + backdrop scrim | aria-expanded=true |
| 7 | Esc-close | Escape key | panel close, focus return to trigger | aria-expanded=false |
| 8 | outside-click-close | click outside panel | panel close, no focus change | aria-expanded=false |
| 9 | arrow-keys-nav | ArrowDown/Up/Left/Right | navigate between items | role=menuitem, tabindex 갱신 |
| 10 | Home-End | Home/End keys | jump to first/last item | tabindex 갱신 |
| 11 | disabled | item.disabled=true | text-brand-400 opacity-50, no pointer | aria-disabled=true |
| 12 | mobile-collapse | viewport < 768px | hamburger 패턴, panel = full-screen accordion | aria-expanded toggle |

## 메가메뉴 spec (각 메뉴별 — cycle 1044 KBO_NAV 정합)

cycle 1022 polish 후 KBO 9 top-level → 6 (33% 압축) — 매트릭스 spec 갱신.

| league | 메뉴 | trigger label | panel-width | column-count | item-count | icon |
|---|---|---|---|---|---|---|
| KBO | 분석 | `분석` | 640px | 2 | 4 | true |
| KBO | 기록 | `기록` | 640px | 2 | 4 | true |
| KBO | 팀·선수 | `팀·선수` | 280px | 1 | 3 | true |
| KBO | 커뮤니티 | `커뮤니티` | 280px | 1 | 2 | true |
| KBO | 더보기 | `더보기` | 640px | 2 | 8 | true |
| MLB | 경기·팀 | `경기·팀` | 280px | 1 | 3 | true |
| MLB | 포스트시즌 | `포스트시즌` | 280px | 1 | 2 | true |
| Lotto | 로또 | `로또` | 280px | 1 | 2 | true |

**룰 (MegaMenu.tsx 자동 적용)**:
- `item.items.length >= 4 && sub.description` → `grid grid-cols-2 w-[640px]` (분석 / 기록 / 더보기)
- `item.items.length >= 4 && !description` → `grid grid-cols-2 w-[440px]`
- `item.items.length < 4 && sub.description` → `w-[280px]` (팀·선수 / 커뮤니티 / 경기·팀 / 포스트시즌 / 로또)
- `item.items.length < 4 && !description` → `w-[200px]`

## brand token override 매핑

shadcn / Radix default 토큰 → DESIGN.md brand token 매핑:

| Radix/shadcn token | DESIGN.md token | 사용 위치 |
|---|---|---|
| `--background` | `--color-surface-card` (#ffffff / #151d18) | panel bg |
| `--foreground` | `--color-brand-700` (#1a3d24) / `--color-brand-100` (#c4e8cf) | text |
| `--muted` | `--color-brand-50` (#edf7f0) / `--color-brand-900/40` | hover bg |
| `--accent` | `--color-brand-500` (#2d6b3f) | active state |
| `--ring` | `--color-brand-500` | focus ring |
| `--border` | `--color-brand-200` (#8dcea0) / `--color-brand-800` | panel border |

DESIGN.md Contrast 표 8 조합 정합 — 모두 AA+ 보증.

## touch target

- desktop: minimum 32×32px (mouse pointer)
- mobile: **44×44px (WCAG 2.5.5 Level AAA)**

## motion

- panel open: `var(--motion-medium)` (DESIGN.md 박제 2026-05-28 W-D)
- panel close: `var(--motion-fast)`
- ease: `var(--ease-out)`
- `prefers-reduced-motion: reduce` → 0ms (DESIGN.md 토큰 자동 적용)

## Server / Client 분리

- `<Header>` = Server Component 유지 (route data fetch)
- `<MegaMenuMobile />` = `'use client'` 격리 (panel state)
- `<NavigationMenu>` (desktop) = Radix Hover/Focus = `'use client'`

## interaction test (별도 PR scope)

`@testing-library/react` + `userEvent` — 12 state matrix 중 핵심 6 case test:
1. default → trigger 포커스 시 aria-expanded=false
2. click-open (mobile) → panel open + aria-expanded=true
3. Esc-close → panel close + focus return
4. outside-click-close → panel close + focus stay
5. arrow-keys-nav → first item → second item focus 이동
6. mobile-collapse → viewport < 768px 시 full-screen accordion

추가: `axe-core` integration test 1건 — a11y violation 0 확인.

## 후속 PR 순서 (carry-over)

1. ✅ **Radix install + 기본 wrapper** (`<MegaMenu>` 컴포넌트 신규) — cycle 1021 ship
2. ✅ **Header.tsx 마이그레이션** (NavLinks → MegaMenu 전환) — cycle 1021 ship
3. ✅ **mobile accordion variant** (MobileNav.tsx 갱신) — cycle 1021 ship
4. ✅ **shadcn navigation-menu 박제 + brand token override** — cycle 1042 ship (plan #19 Step 0.5)
5. ✅ **MegaMenu.tsx shadcn wrapper 마이그레이션** — cycle 1044 ship (plan #19 Step 2)
6. ⏳ **interaction test 6 case + axe-core** — plan #19 Step 4 carry-over
7. ⏳ **상태 매트릭스 12 case 시각 검증** (storybook 또는 design-shotgun) — 별도 cycle

본 spec = source of truth. 후속 PR 모두 본 spec 정합 + 상태 매트릭스 12 case skip 항목 없음.

## 참조

- plan #14 C2 Step 2 body: `~/.develop-cycle/plans/moneyballscore/14.md` line 166~178
- DESIGN.md Contrast 표 8 조합
- WAI-ARIA Authoring Practices: <https://www.w3.org/WAI/ARIA/apg/patterns/menubar/>
- Radix NavigationMenu docs: <https://www.radix-ui.com/primitives/docs/components/navigation-menu>
