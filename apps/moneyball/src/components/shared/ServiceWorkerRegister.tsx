'use client';

import { useEffect } from 'react';

/**
 * Service worker 등록 (cycle 1021 Tier 2 E PWA install prompt scope).
 *
 * - production 만 활성. dev/test 환경에선 HMR 충돌 + cache stale 회피 위해 silent skip.
 * - register 실패 시 silent — PWA 미지원 브라우저 fallback (Safari 16.3 이하 등).
 * - controllerchange / updatefound 핸들링 = web-push activation 시점에 박제.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // dev/test 환경에선 skip — Next.js HMR 과 SW cache 충돌 회피
    if (process.env.NODE_ENV !== 'production') return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch {
        // Silent — PWA 미지원 / private mode / 등록 실패 fallback
      }
    };

    void register();
  }, []);

  return null;
}
