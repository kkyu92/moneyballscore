'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Floating "앱 설치" 버튼.
 *
 * - beforeinstallprompt event fired + 미설치 상태에서만 노출.
 * - 사용자 "나중에" (dismiss) 시 sessionStorage 박제로 본 세션 내 재노출 X.
 * - 설치 완료 (appinstalled event) 시 영구 hide.
 * - iOS Safari 16.4+ 는 beforeinstallprompt event fire X (Apple 미지원) — 자동 fallback 으로 본 버튼 미노출, browser 의 공유 메뉴 "홈 화면에 추가" 활용.
 */

const DISMISS_KEY = 'pwa-install-dismissed';

// BeforeInstallPromptEvent 는 standard DOM 타입 정의 X — 최소 인터페이스만 박제
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function getInitialDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

const COPY = {
  ko: {
    dialogAria: '앱 설치 안내',
    title: '앱으로 설치',
    body: '홈 화면에 추가하고 더 빠르게 열어보세요.',
    install: '설치',
    later: '나중에',
    closeAria: '닫기',
  },
  en: {
    dialogAria: 'Install app',
    title: 'Install as app',
    body: 'Add to home screen for faster access.',
    install: 'Install',
    later: 'Later',
    closeAria: 'Close',
  },
} as const;

export function PWAInstallButton() {
  const pathname = usePathname();
  const locale: 'ko' | 'en' = pathname?.startsWith('/en/') || pathname === '/en' ? 'en' : 'ko';
  const copy = COPY[locale];
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(getInitialDismissed);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (dismissed) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setPromptEvent(null);
      setDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [dismissed]);

  if (dismissed || !promptEvent) return null;

  const handleInstall = async () => {
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setPromptEvent(null);
      } else {
        // dismissed — 본 세션엔 더 보지 않음
        try {
          sessionStorage.setItem(DISMISS_KEY, '1');
        } catch {
          // 무시
        }
        setDismissed(true);
      }
    } catch {
      // prompt 실패 (이미 호출됨 등) — silent
      setPromptEvent(null);
    }
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // 무시
    }
    setDismissed(true);
  };

  return (
    <div
      role="dialog"
      aria-label={copy.dialogAria}
      className="fixed bottom-4 right-4 z-50 max-w-xs rounded-lg border border-brand-600 bg-brand-800 px-4 py-3 shadow-lg text-white"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>📱</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{copy.title}</p>
          <p className="text-xs text-brand-200 mt-0.5">
            {copy.body}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="text-xs font-medium px-3 py-1.5 rounded bg-brand-500 hover:bg-brand-400 text-white transition-colors"
            >
              {copy.install}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs px-3 py-1.5 rounded text-brand-200 hover:text-white transition-colors"
            >
              {copy.later}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={copy.closeAria}
          className="text-brand-300 hover:text-white text-sm leading-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
