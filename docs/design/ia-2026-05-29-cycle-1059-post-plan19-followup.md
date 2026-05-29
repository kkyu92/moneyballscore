# IA followup spec — cycle 1059 (post-plan #19)

생성: 2026-05-29
cycle: 1059
chain: info-architecture-review (lite)
trigger: trigger 1 (≥3 routes 7d) — 19 routes git A-filter 7일 안 추가
predecessors: plan #19 (a11y/MegaMenu, all_steps_shipped cycle 1042/1043/1044/1046)

## 진단

### route 증가 evidence (git A-filter)

7일 안 신규 page.tsx 추가 = 19건 (`git log --since="7 days ago" --diff-filter=A`):

- accuracy/shadow
- calendar
- community
- debug/agent-fallback /deploy-drift /silent-drift (3건, dev-only)
- insights/series/[topic]
- login
- mlb/games/[date] /[date]/[slug] (2건)
- mlb/players /postseason /standings /team /team/[code] /wild-card (6건)
- settings
- teams/[code]/recent
- v2-preview

### breadcrumb 누락 raw count

전체 63 routes 중 14 missing. user-visible 6 routes:

| route | 의도 | actionable |
|---|---|---|
| `/page.tsx` (home) | home | X (root) |
| `/reviews/monthly/page.tsx` (index) | index | X (intentional minimal) |
| `/reviews/weekly/page.tsx` (index) | index | X (intentional minimal) |
| `/settings/page.tsx` | placeholder (`robots: noindex`, 15 lines, 2026-08~09 ship 예정) | X (placeholder) |
| `/community/page.tsx` | minimal | X (intentional minimal) |
| `/login/page.tsx` | auth surface | X (auth flow minimal) |

debug 8 routes = dev-only (`/debug/*`) 의도된 minimal — breadcrumb 추가 가치 0.

### sitemap.ts URL vs page.tsx 비교

- sitemap.ts URL 박제 = 44
- 전체 page.tsx = 63
- delta=19 = debug/* (8) + 동적 routes ([date]/[slug]/[code]/[topic] 등 약 9~11) + login/preview noindex routes
- mismatch = 정상 (의도된 noindex / dev-only)

### MegaMenu / Footer sitemap

- 별도 `MegaMenu` 컴포넌트 X (plan #19 a11y/MegaMenu = SiteHeader 안 inline 강화 형태)
- plan #19 shipped 후 IA hierarchy spec (`docs/design/ia-hierarchy.md`, plan #14 phase 2 cycle 1020) 와 정합 확인 완료

## 결론

**잔여 actionable IA gap = 0건**.

- breadcrumb 누락 = 의도된 placeholder/index/auth/debug routes 만 = no-op
- sitemap mismatch = 의도된 dev-only / noindex routes 만 = no-op
- plan #19 (a11y/MegaMenu) shipped 후 IA hierarchy = 정합 OK
- 19 new routes 7d 자체는 trigger 1 형식적 충족이지만 그 안의 19 routes 모두 plan #19 + plan #14 phase 2 + 기존 MLB IA prep ship cycle (cycle 1042~1046 등) 통해 breadcrumb 박제 완료 또는 의도된 minimal

cycle 1059 chain outcome = **retro-only partial** — 구현 부재 (PR X), spec only.

## 다음 cycle 후속 후보

1. **settings/page.tsx breadcrumb 추가** (placeholder 시점 부재, 2026-08~09 ship 예정 시 같이 자연 처리). 사전 행동 가치 0.
2. **community/login breadcrumb 추가** (minimal 유지 사용자 결정 = ship 가치 X).
3. **info-arch chain 30-cycle gap 도달 시 자동 점검** (현 gap=13, cycle ~1076 도달 시 trigger 9 자연 fire 가능).

## 박제 사실

trigger 1 (≥3 routes 7d) 형식 충족이라도 실질 IA gap 부재 시 spec write only retro-only 박제. silent drift family 자연 sweep saturation pattern (cycle 1055/1056 review-code heavy 2 cycle 연속 PARTIAL) 과 본 cycle 1059 info-arch (lite) retro-only = 같은 family — 자연 trigger source 약화 saturation. ROI 자가 의심 X (cycle 124/618 룰 정합 — 사용자 N=5 결정만 stop 신호).
