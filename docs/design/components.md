# Component Library — MoneyBall Score (1-pager)

**박제일**: 2026-05-28 (W-D, 2-day blast)
**범위**: 신규/확장 박제 4 카테고리. 본 문서는 사용자(에이전트) 가 신규 page/feature 박제 직전 빠르게 import path + prop 확인용. 전체 컴포넌트 카탈로그는 별도 (`/storybook` 후속).

토큰 source of truth = `DESIGN.md`. 본 문서는 토큰 사용 패턴만 박제.

---

## 1. Header / LeagueSelector (NAV)

**파일**: `apps/moneyball/src/components/layout/{Header,LeagueSelector,NavLinks,MobileNav}.tsx`

리그 분기 NAV. 최상위 pill (KBO / MLB 베타 / 로또) + 각 league sub-NAV. pathname 기반 active league 자동 추론.

### Header (server component)
```tsx
import { Header } from "@/components/layout/Header";
// layout.tsx 안 자동 mount. props 없음.
```

### LeagueSelector (client)
```tsx
import { LeagueSelector } from "@/components/layout/LeagueSelector";

<LeagueSelector variant="desktop" />
<LeagueSelector variant="mobile" onSelect={() => closeDrawer()} />
```

| prop | type | default | 설명 |
|---|---|---|---|
| `variant` | `'desktop' \| 'mobile'` | `'desktop'` | desktop = compact inline / mobile = top of drawer with border |
| `onSelect` | `(league: League) => void` | — | pill click 시 호출 (옵션) |

`leagueFromPath('/predictions')` → `'kbo'` / `'/mlb'` → `'mlb'` / `'/lotto/methodology'` → `'lotto'`.

### LEAGUE_NAVS (Header)
```ts
export const LEAGUE_NAVS: Record<League, NavItem[]> = {
  kbo: [...],   // 기존 NAV — 오늘 / AI / 커뮤니티 / 순위 / ...
  mlb: [{ href: '/mlb', label: 'MLB 베타' }],
  lotto: [{ label: '로또', items: [...] }],
};
```
신규 league 추가 시 `League` union + `LEAGUE_NAVS` record + `leagueFromPath` 분기 3곳 갱신.

**색상 토큰**: `bg-brand-600` (active pill) / `bg-brand-700/40` (inactive) / `text-white` (active) / `text-brand-200` (inactive). DESIGN.md Contrast 표 "Header nav" 행 AA 인증 토큰.

---

## 2. FactorBreakdown (predictions)

**파일**: `apps/moneyball/src/components/predictions/FactorBreakdown.tsx`

10 factor (v1.8, 향후 12) 의 홈/원정 편향 + 가중치 곱 row 시각화. `chart?: boolean` prop true 시 horizontal bar variant (W-FV 박제 후).

```tsx
import { FactorBreakdown } from "@/components/predictions/FactorBreakdown";

<FactorBreakdown
  factors={prediction.factors}
  homeTeam="LG"
  awayTeam="SS"
  chart={false}  // optional, W-FV 박제 후 true 가능
/>
```

| prop | type | 설명 |
|---|---|---|
| `factors` | `FactorRow[]` | 10팩터 (factor_name + home_value + away_value + weight + bias) |
| `homeTeam` / `awayTeam` | `string` | 팀 코드 |
| `chart` | `boolean` (optional) | true 시 horizontal bar variant (W-FV) |

**색상 토큰**: `text-factor-favor` (홈 편향) / `text-factor-against` (원정 편향) / `text-factor-neutral` (편향 없음, gray-400 light / gray-600 dark — DESIGN.md `--color-factor-neutral`).

---

## 3. PredictReveal (predictions)

**파일**: `apps/moneyball/src/components/predictions/PredictReveal.tsx`

승률 0 → target 카운트업 reveal. `--motion-medium` (200ms) `ease-out`. `prefers-reduced-motion: reduce` 시 즉시 표시.

```tsx
import { PredictReveal } from "@/components/predictions/PredictReveal";

<PredictReveal
  prob={0.62}
  label="LG 승률"
  className="text-4xl font-bold text-brand-700 dark:text-brand-100"
/>
```

| prop | type | default | 설명 |
|---|---|---|---|
| `prob` | `number` (0-1) | — | target probability |
| `durationMs` | `number` | `200` | animation duration |
| `className` | `string` | — | wrapper class (색상/폰트 부모가 결정) |
| `label` | `string` | — | SR aria-label prefix |

**a11y**: `role="status"` + `aria-live="polite"` + `aria-label="{label} {final}%"`. 중간 progress 는 screen reader 무시.

**색상 토큰**: 자체 색 X — 부모 className 상속. DESIGN.md Contrast 표 "Light body" / "Dark body" 토큰 (`text-brand-700` light / `text-brand-100` dark) 권장.

---

## 참조

- 신규 컴포넌트 박제 직전 = `DESIGN.md` Contrast 표 검증된 토큰만 사용
- 토큰 갱신 시 = `globals.css @theme inline` + `DESIGN.md` 양쪽 동기 + Decisions Log entry
- Motion 사용 = `var(--motion-*)` + `var(--ease-*)` 직접 참조 (Tailwind utility 부족 시)
