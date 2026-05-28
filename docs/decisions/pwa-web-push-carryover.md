# PWA web push 알림 — carry-over plan (cycle 1021)

**Status**: carry-over (Team plan 안 fire scope)
**Created**: 2026-05-29 cycle 1021 후속
**Priority**: medium (사용자 retention layer + 외부 의존 큼)

## scope 큰 + 충돌 risk

본 작업 = `layout.tsx` 통합 + 신규 service worker + supabase subscription table + web-push lib + VAPID 키 생성 = 5+ PR scope. layout.tsx 동시 작업 충돌 risk + iOS 16.4+ Safari PWA push 의존.

## 5 PR scope (Team plan 안 fire)

### PR 1: supabase migration + /api/push/subscribe + unsubscribe

```sql
CREATE TABLE push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);
```

API endpoints:
- POST `/api/push/subscribe` — { endpoint, keys: { p256dh, auth } } → upsert
- POST `/api/push/unsubscribe` — { endpoint } → delete

### PR 2: service worker + manifest.json 갱신

- `apps/moneyball/public/sw.js` 신규 — push event listener + notificationclick
- `apps/moneyball/public/manifest.json` 갱신 — `display: standalone`, icons

### PR 3: 클라이언트 PWAInstallPrompt + layout.tsx 통합

- `apps/moneyball/src/components/shared/PushSubscribeButton.tsx` 신규
- Notification.requestPermission + ServiceWorker register + subscribe
- layout.tsx 안 통합 (header 또는 floating button)

### PR 4: web-push lib install + announce cron push 통합

```bash
cd apps/moneyball && pnpm add web-push
```

- 매일 09:00 KST announce cron 안 push 통합
- VAPID 키 환경 변수 (`VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`)
- packages/kbo-data/src/notify/push.ts 신규 (telegram.ts 패턴 정합)

### PR 5: verify cron 안 적중 알림 push

- daily verify cron 안 적중률 결과 push (예: "오늘 5/7 적중")
- per-subscription preference (announce / result / both) — 별도 column

## 외부 의존

- **VAPID 키 생성** (사용자 영역): `npx web-push generate-vapid-keys`
- **환경 변수 박제**: NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (Vercel 환경 변수)
- **iOS Safari PWA push**: iOS 16.4+ (2023-03 출시) — 일부 사용자 미지원

## 결정 trigger

다음 중 1건 충족 시 fire:
- DAU 100+ (현 Vercel Analytics 측정)
- AdSense 심사 통과 (사용자 engagement layer 보강 의무)
- 사용자 명시 PWA install 요청
- Telegram 의존 대체 필요 (Telegram bot block / API limit)

## 현 baseline

- Telegram 알림 3종 (announce / summary / results) 이미 박제 (cycle 994 박제)
- PWA web push = Telegram 보다 사용자 reach ↑ (KakaoTalk / Naver / 외부 messenger 사용자)

## carry-over to Team plan

본 5 PR = 1 sprint (Team plan 안 본 메인 자율 fire 가능). scope 명확 + DESIGN.md 정합 + 기존 cron 통합 path 명확.

## 참조

- cycle 1021 사용자 가시 KBO 강화 list-up (c11)
- cycle 994 Telegram 3종 박제
- Vercel Analytics: `@vercel/analytics/next` (layout.tsx)
- iOS Safari PWA push docs: <https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/>
