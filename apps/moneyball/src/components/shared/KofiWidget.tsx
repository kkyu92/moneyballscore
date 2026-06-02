'use client';

import Script from 'next/script';

declare global {
  interface Window {
    kofiWidgetOverlay: {
      draw: (username: string, config: Record<string, string>) => void;
    };
  }
}

export function KofiWidget() {
  return (
    <Script
      src="https://storage.ko-fi.com/cdn/scripts/overlay-widget.js"
      strategy="lazyOnload"
      onLoad={() => {
        window.kofiWidgetOverlay.draw('moneyballscore', {
          type: 'floating-chat',
          'floating-chat.donateButton.text': 'Support',
          'floating-chat.donateButton.background-color': '#c5a23e',
          'floating-chat.donateButton.text-color': '#132d1a',
        });
      }}
    />
  );
}
