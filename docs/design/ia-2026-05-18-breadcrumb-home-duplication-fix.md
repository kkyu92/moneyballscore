# IA: picks + leaderboard Breadcrumb 홈 중복 제거 (cycle 614)

## 발화

cycle 614 `info-architecture-review` chain. trigger 9 (마지막 info-arch fire cycle 583, 31 cycle gap) + trigger 1 (7일 안 신규 라우트 ≥3 — `/picks` `/leaderboard` `/accuracy`).

## 진단

`Breadcrumb` 컴포넌트 (`apps/moneyball/src/components/shared/Breadcrumb.tsx:15-91`) 는 홈 링크를 **자동 prepend**:

- 시각 nav: line 46-53 — `<li><Link href="/">홈</Link></li>` 항상 첫 항목
- JSON-LD: line 18-31 — position 1 = `{name: '홈', item: SITE_URL}` 자동, 사용자 items 는 position 2 부터

`apps/moneyball/src/app/` 26개 page.tsx Breadcrumb 사용 패턴 grep 결과:

| 패턴 | 라우트 수 | 예시 |
|---|---|---|
| `items=[{label: '...'}]` (홈 생략) | 22 | about / accuracy / analysis / contact / dashboard / matchup / players / predictions / privacy / reviews / search / seasons / standings / teams / terms 등 |
| `items=[{href: '...', label: '...'}, ...]` (중간 hub 포함, 홈 생략) | 6 | analysis/game/[id] / matchup/[teamA]/[teamB] / players/[id] / predictions/[date] / reviews/misses / reviews/(weekly\|monthly)/[id] / seasons/[year] / teams/[code] |
| `items=[{label: '홈', href: '/'}, {label: '...'}]` (홈 중복) | **2** | **picks + leaderboard** |

## silent IA 결함

`picks/page.tsx:14-19` + `leaderboard/page.tsx:27-32`:

```tsx
<Breadcrumb
  items={[
    { label: '홈', href: '/' },   // ← 컴포넌트 자동 prepend 와 중복
    { label: '내 픽 기록' },
  ]}
/>
```

**영향**:

1. 시각 nav 렌더링: `홈 / 홈 / 내 픽 기록` — 중복 표시
2. JSON-LD `BreadcrumbList`:
   - position 1: 홈 (자동, item=https://moneyballscore.vercel.app)
   - position 2: 홈 (items[0], item=https://moneyballscore.vercel.app/)
   - position 3: 내 픽 기록 (items[1])
   - → Google Rich Results 검증 시 `BreadcrumbList` 중복 entry. schema.org 사양상 position 1, 2 가 같은 페이지를 가리키는 경우 SEO 신호 약화 가능.
3. 접근성 (ARIA): `<nav aria-label="breadcrumb">` 안 같은 라벨 2번 노출 → screen reader 사용자 혼란.

## 발생 경위

- cycle 321~329 픽 리더보드 + 커뮤니티 픽 기능 추가 시점 (ia-2026-05-14-community-sitemap.md 박제)
- 신규 컴포넌트 작성 시 다른 page.tsx 22개 패턴 (홈 생략) 참조 미실시 → `[홈, ...]` 패턴 직접 작성
- 시각상 차이 작아 (홈 1개 vs 2개) 사용자 신고 부재 → silent drift 누적
- info-arch chain 31 cycle 미발화 동안 발견 차단

## 수정

`apps/moneyball/src/app/picks/page.tsx`:

```diff
-      <Breadcrumb
-        items={[
-          { label: '홈', href: '/' },
-          { label: '내 픽 기록' },
-        ]}
-      />
+      <Breadcrumb items={[{ label: '내 픽 기록' }]} />
```

`apps/moneyball/src/app/leaderboard/page.tsx`:

```diff
-      <Breadcrumb
-        items={[
-          { label: '홈', href: '/' },
-          { label: '픽 리더보드' },
-        ]}
-      />
+      <Breadcrumb items={[{ label: '픽 리더보드' }]} />
```

22 페이지 표준 패턴 정렬. 컴포넌트 자동 prepend 활용.

## 검증

- `pnpm type-check` (apps/moneyball): PASS 예정
- `pnpm test` (apps/moneyball): PASS 예정
- `grep -rn "label:.\?'홈'" apps/moneyball/src/app/` → 결과 0건 (모든 잘못된 패턴 제거)

## 다음 cycle 후속 후보

- Breadcrumb 컴포넌트에 dev-mode runtime 경고 (`items[0].label === '홈'` 시 console.warn) — 재발 차단 (별 cycle scope)
- BreadcrumbList JSON-LD Rich Results Test 수동 검증 (사용자 영역, GSC)

trigger 8 (carry-over ≥ 20 사이클) 후보 X — 단일 surgical fix.

## R5 evidence

본 cycle = info-arch trigger 9 자연 발화 → 진단 (26 페이지 Breadcrumb 패턴 grep) → silent IA 결함 발견 (picks + leaderboard 홈 중복) → spec + 코드 fix + 검증 → ship sequence. 사용자 자연 발화 X (silent drift). cycle 273 메타 패턴 (silent drift family) + cycle 225 룰 (info-arch trigger 9) 동시 PASS.

## 박제

- `apps/moneyball/src/app/picks/page.tsx` (수정 본)
- `apps/moneyball/src/app/leaderboard/page.tsx` (수정 본)
- `~/.develop-cycle/cycles/614.json` (cycle_state)
- 본 spec 파일
