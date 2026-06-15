'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    kofiWidgetOverlay: {
      draw: (username: string, config: Record<string, string>) => void;
    };
  }
}

function buildKofiConfig(locale: 'ko' | 'en'): Record<string, string> {
  return {
    type: 'floating-chat',
    'floating-chat.donateButton.text': 'Donate',
    'floating-chat.donateButton.background-color': '#c5a23e',
    'floating-chat.donateButton.text-color': '#132d1a',
    'floating-chat.notice.text':
      locale === 'en' ? 'Support MoneyBall Score' : 'MoneyBall Score 후원하기',
  };
}

export function KofiWidget() {
  const pathname = usePathname();
  const locale: 'ko' | 'en' = pathname?.startsWith('/en/') || pathname === '/en' ? 'en' : 'ko';
  const config = buildKofiConfig(locale);

  return (
    <>
      <Script
        src="https://storage.ko-fi.com/cdn/scripts/overlay-widget.js"
        strategy="afterInteractive"
      />
      <Script
        id="kofi-widget-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              function init() {
                if (typeof kofiWidgetOverlay !== 'undefined') {
                  kofiWidgetOverlay.draw('moneyballscore', ${JSON.stringify(config)});
                } else {
                  setTimeout(init, 200);
                }
              }
              init();
            })();
          `,
        }}
      />
    </>
  );
}
