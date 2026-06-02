'use client';

import Script from 'next/script';

declare global {
  interface Window {
    kofiWidgetOverlay: {
      draw: (username: string, config: Record<string, string>) => void;
    };
  }
}

const KOFI_CONFIG: Record<string, string> = {
  type: 'floating-chat',
  'floating-chat.donateButton.text': 'Donate',
  'floating-chat.donateButton.background-color': '#c5a23e',
  'floating-chat.donateButton.text-color': '#132d1a',
};

export function KofiWidget() {
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
                  kofiWidgetOverlay.draw('moneyballscore', ${JSON.stringify(KOFI_CONFIG)});
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
