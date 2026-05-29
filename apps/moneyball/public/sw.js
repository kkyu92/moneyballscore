/**
 * MoneyBall Score — service worker (cycle 1021 Tier 2 E PWA install prompt scope)
 *
 * 박제 scope:
 * - install/activate: skip waiting + clients.claim → 새 SW 즉시 활성
 * - fetch: network-first (offline cache stale 회피, fresh content 우선)
 * - push: STUB listener (web-push VAPID = 별도 carry-over PR, listener 박제만)
 *
 * 의도적 비포함:
 * - Workbox / precaching → Next.js Server Component cache 와 중복
 * - cache versioning → 추후 web-push activation 시점에 박제
 * - notification click handler → web-push activation 시점에 박제
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-first: 항상 fresh 우선, offline 시 silent fail (Next.js error boundary 활용)
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // GET 만 처리. POST/PUT/DELETE 는 SW 패스스루
  if (req.method !== 'GET') return;

  // chrome-extension / non-http 스킴 silent skip
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // /api/* 는 항상 network only (캐싱 X, prediction freshness 보존)
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(req).catch(() => {
      // network fail 시 silent — browser 의 기본 offline 화면 노출
      return new Response('', { status: 504, statusText: 'Gateway Timeout' });
    }),
  );
});

// push event = STUB. web-push activation 시점에 notification UI 박제 예정
self.addEventListener('push', (event) => {
  // VAPID payload parse + showNotification 은 별도 PR carry-over
  // 본 listener 박제로 register 후 자동 push subscription handshake path 확보
  if (!event.data) return;

  try {
    const payload = event.data.json();
    // STUB only — actual UI 박제는 별도 carry-over
    void payload;
  } catch {
    // Silent — invalid payload
  }
});
