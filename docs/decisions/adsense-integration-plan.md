# AdSense 통합 — carry-over plan (cycle 1022)

**Status**: carry-over (AdSense 심사 통과 후 fire scope)
**Created**: 2026-05-29 cycle 1022
**Priority**: high (monetization layer 활성화 trigger)
**Trigger**: **AdSense 심사 통과 통보 수신 시 즉시 fire**

## 현 상태

- AdSense 심사 진행 중 (사용자 영역)
- 본 conversation 안 fire 의무 X (정책 위반 risk + 미사용 layer 노이즈)
- 통과 후 trigger = Team plan 안 본 메인 자율 fire 가능

## 5 PR scope

### PR 1: AdSense script 통합 (layout.tsx)

- `apps/moneyball/src/app/layout.tsx` 안 AdSense script tag 박제
- `@next/third-parties/google` 의 `GoogleAdsense` component 또는 `<Script>` 직접:
  ```tsx
  import { GoogleAdsense } from '@next/third-parties/google'
  // ...
  <body>
    {children}
    <GoogleAdsense pId="ca-pub-XXXXXXXX" />
  </body>
  ```
- 환경 변수: `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` (Vercel 환경 변수 박제)
- production only register (dev/test silent skip)

### PR 2: AdsenseSlot 컴포넌트 신규 (단일 source)

- `apps/moneyball/src/components/shared/AdsenseSlot.tsx` 신규 ('use client')
- props: `slotId`, `format` (auto / fluid / display), `responsive`, `className`
- AdSense `<ins class="adsbygoogle">` wrapper
- onMount = `window.adsbygoogle.push({})` 호출
- defensive: window.adsbygoogle 부재 시 silent skip (dev/test)
- DESIGN.md token 정합 (background / border / spacing)
- aria-label="광고" + 명시 마킹 ("Sponsored" 라벨)

### PR 3: 페이지별 ad slot placement

콘텐츠 페이지만 — header/footer skip (AdSense 정책 정합):

| 페이지 | placement | 형식 | 의도 |
|---|---|---|---|
| `/predictions/[date]` | hero 다음 / table 사이 1건 | display (rectangle) | 일자별 예측 view |
| `/predictions/[date]/[slug]` | 분석 reasoning 다음 1건 | display | 경기 상세 view |
| `/analysis/game/[id]` | DebateTimeline 다음 1건 | display | AI 토론 view |
| `/insights/[date]` | 본문 안 fluid 1건 | fluid (in-article) | reasoning timeline |
| `/insights/series/[topic]` | 본문 안 1건 | display | 시리즈 archive |
| `/accuracy` | 차트 사이 1건 | display | 적중률 분석 |
| `/teams/[code]` | 통계 table 다음 1건 | display | 팀 detail |
| `/players/[id]` | 통계 다음 1건 | display | 선수 detail |
| `/leaderboard` | top 3 medal 다음 1건 | display | 리더보드 |

**금지**:
- header / footer / nav 안 광고 (intrusive)
- modal / popup 광고 (사용자 경험 ↓)
- 페이지당 광고 3개 이상 (콘텐츠 vs 광고 비율 정책 정합)

### PR 4: AdSense 정책 정합 검증 룰

- `docs/decisions/adsense-content-policy.md` 신규
- 광고 vs 콘텐츠 비율 ≤ 30%
- 페이지당 광고 최대 = 2-3 (visible viewport)
- intrusive 차단 (modal / sticky / autoplay video 금지)
- 정책 위반 risk 페이지 = 광고 placement 금지 (예: 결과 wait 페이지, 빈 페이지)
- 자동 검증 lint rule (eslint-plugin-adsense 또는 자체 rule)

### PR 5: AdSense revenue tracking + Vercel Analytics 통합

- `apps/moneyball/src/lib/analytics/adsense-revenue.ts` 신규
- AdSense API client (Reports.generate) — daily revenue + RPM + CTR
- supabase migration: `adsense_daily_metrics` table 신규
- daily cron (`/api/cron/adsense-sync`) — daily revenue 박제
- `/admin/revenue` dashboard 신규 — daily / monthly chart

## DESIGN.md ad slot 자리 spec (사전 박제 가능)

DESIGN.md 안 `## Ad slot placement` section 박제 (사용자 결정 후 PR 1-5 fire 시 활용):

```markdown
## Ad slot placement

광고 unit = AdsenseSlot 컴포넌트 단일 source. 시각 spec:

| field | value |
|---|---|
| min-height | 250px (display rectangle) / 90px (fluid) |
| background | `--color-surface-card` |
| border | 1px solid `--color-brand-200` (light) / `--color-brand-800` (dark) |
| border-radius | 12px (DESIGN.md radius scale) |
| padding | 12px |
| spacing | 24px (above + below) |
| label | "Sponsored" tag 좌상단 (font-size 11px, opacity 0.6) |
| motion | 0 transition (광고 자체 lazy load) |

a11y:
- aria-label="광고"
- role="complementary"
- focus visible ring (DESIGN.md brand-400)
```

## 외부 의존

- **AdSense Publisher ID** (사용자 영역): 심사 통과 후 발급
- **환경 변수 박제** (사용자 영역): Vercel 환경 변수 `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID`
- **AdSense 정책 정합 검증**: Google 정책 변경 시 룰 갱신 (사용자 alert)

## 결정 trigger

다음 중 1건 충족 시 즉시 fire (본 메인 자율 진행):
- AdSense 심사 통과 통보 (사용자 알림)
- AdSense 대안 채택 (Coupang Partners / Kakao AdFit / Naver AdPost — 별도 plan)

## carry-over to Team plan

본 5 PR = 1 sprint (Team plan 안 본 메인 자율 fire 가능). scope 명확 + DESIGN.md 정합 path 명확 + 기존 layout.tsx 통합 path 명확.

## 통합 차단 lock (현)

본 conversation 안 fire 의무 X:
- AdSense 심사 통과 전 = script 박제 X (정책 위반 risk)
- ad slot 자리 박제 X (실제 ad 코드 X = 시각 위장 X)
- PR 1-5 = AdSense 통과 trigger 후 즉시 fire

## 참조

- cycle 1022 사용자 가시 KBO 강화 list-up (d-AdSense)
- cycle 1021 (d13) retention metric carry-over (`docs/decisions/retention-metric-tracking.md`)
- cycle 1021 (c11) PWA carry-over (`docs/decisions/pwa-web-push-carryover.md`)
- @next/third-parties docs: <https://nextjs.org/docs/app/guides/third-party-libraries>
- AdSense 정책: <https://support.google.com/adsense/answer/48182>
