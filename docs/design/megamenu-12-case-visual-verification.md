# MegaMenu 12 case 시각 검증 (plan #14 C2 Step 4 후속, cycle 1021)

`docs/design/megamenu-state-matrix.md` 12 case spec 의 시각 baseline 박제 +
visual regression detection harness.

## 박제 spec

`apps/moneyball/e2e/megamenu-states.spec.ts` — Playwright snapshot matcher 활용.
state 마다 `header` element screenshot 박제 (전체 페이지 X = 안정성).

## 12 case 매핑

| state | id | path | action | screenshot |
|---|---|---|---|---|
| default | 1 | / | (none) | case-1-default.png |
| hover (desktop) | 2 | / | hover trigger | case-2-hover-desktop.png |
| focus | 3 | / | focus trigger | case-3-focus.png |
| focus-visible | 4 | / | keyboard Tab → focus | case-4-focus-visible-keyboard.png |
| active (route match) | 5 | /analysis | (none) | case-5-active-route-match.png |
| click-open | 6 | / | click trigger | case-6-click-open.png |
| Esc-close | 7 | / | click → Esc | case-7-Esc-close.png |
| outside-click-close | 8 | / | click → outside click | case-8-outside-click-close.png |
| arrow-keys-nav | 9 | / | focus → Enter → ArrowDown | case-9-arrow-keys-nav.png |
| Home-End | 10 | / | (keyboard only, 시각 동일 case 9) | (skip) |
| disabled | 11 | / | (현재 disabled item 없음) | (skip) |
| mobile-collapse | 12 | / | hamburger toggle + accordion | case-12a/b/c-mobile-*.png (3 sub-state) |

## 활용 path

```bash
cd apps/moneyball

# 첫 1회 setup
pnpm e2e:install

# baseline 박제 (CI / 새 환경 신규 박제 시)
pnpm e2e megamenu-states.spec.ts --update-snapshots

# diff 검증 (PR 마다 visual regression detection)
pnpm e2e megamenu-states.spec.ts
```

박제된 screenshot = `apps/moneyball/e2e/__screenshots__/` 안 (Playwright snapshot
자동 경로). diff 발견 시 PR review 시점에 사용자 가시.

## maxDiffPixelRatio = 0.01

미세 anti-aliasing / sub-pixel rendering 차이 허용. 1% 초과 diff 시 fail.

## 후속 carry-over

- baseline screenshot 첫 박제 (CI 또는 사용자 local) — 본 PR 시점 X (browser
  install + dev server 필요)
- CI workflow 안 e2e visual job 추가 (browser cache + snapshot artifact upload)
- Home-End / disabled state spec 강화 (현재 KBO 모델에 disabled item 없음 = N/A)

## spec 정합 검증

본 12 case = `docs/design/megamenu-state-matrix.md` source of truth 기반. 신규
state 추가 시 양쪽 spec + harness 양쪽 동시 갱신 (silent drift family 7 정합).

## 시각 baseline 박제 의무 (Step 4 success criteria)

- [x] 12 case spec 정의 (megamenu-state-matrix.md)
- [x] Playwright snapshot harness 박제 (megamenu-states.spec.ts)
- [x] sub-state breakdown 박제 (case-12 mobile = 3 sub-state)
- [x] maxDiffPixelRatio threshold 명시 (0.01)
- [ ] baseline screenshot 첫 박제 (browser install + dev server 필요, 별도 carry-over)
- [ ] CI workflow visual job 추가 (별도 carry-over)
