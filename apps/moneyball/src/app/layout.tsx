import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { WebVitalsReporter } from "@/components/shared/WebVitalsReporter";
import { ServiceWorkerRegister } from "@/components/shared/ServiceWorkerRegister";
import { PWAInstallButton } from "@/components/shared/PWAInstallButton";
import { KofiWidget } from "@/components/shared/KofiWidget";
import { KBO_FACTOR_COUNT, SITE_URL, GA_MEASUREMENT_ID, ADSENSE_CLIENT_ID } from "@moneyball/shared";
import { brand } from "@/lib/design-tokens";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | MoneyBall Score",
    default: "MoneyBall Score - 세이버메트릭스 기반 승부예측",
  },
  description: `wOBA, FIP, WAR 등 세이버메트릭스 지표를 활용한 KBO 프로야구 승부예측. AI 에이전트 토론 + ${KBO_FACTOR_COUNT}팩터 정량 모델. 매일 업데이트.`,
  keywords: [
    "KBO",
    "승부예측",
    "세이버메트릭스",
    "wOBA",
    "FIP",
    "WAR",
    "프로야구",
    "야구분석",
    "AI 야구 예측",
    "KBO 승률",
  ],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "MoneyBall Score",
    title: "MoneyBall Score - 세이버메트릭스 기반 승부예측",
    description: `AI 에이전트 토론 + ${KBO_FACTOR_COUNT}팩터 정량 모델 기반 KBO 매일 승부예측. 실시간 스코어, 적중률 트래킹.`,
  },
  twitter: {
    card: "summary_large_image",
    title: "MoneyBall Score",
    description: "세이버메트릭스 기반 승부예측",
  },
  robots: { index: true, follow: true },
  verification: {
    google: "KHDQrWaTIhknJ7pTsiGuEHz-uJMal-8b9bCyw2QL89w",
    other: {
      "naver-site-verification": "d319e640e7d38d160b4055873079ec14d652c749",
      "google-adsense-account": ADSENSE_CLIENT_ID,
    },
  },
  alternates: {
    types: {
      "application/rss+xml": `${SITE_URL}/feed`,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brand[500] },
    { media: "(prefers-color-scheme: dark)", color: brand[900] },
  ],
  colorScheme: "light dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const isEn = pathname.startsWith("/en");
  const lang = isEn ? "en" : "ko";
  const skipText = isEn ? "Skip to main content" : "본문 바로가기";
  const siteDescription = isEn
    ? "KBO baseball prediction based on sabermetrics"
    : "세이버메트릭스 기반 프로야구 승부예측";
  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col text-gray-900 dark:text-gray-100">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white focus:rounded-md focus:shadow-lg"
        >
          {skipText}
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "MoneyBall Score",
              url: SITE_URL,
              description: siteDescription,
              inLanguage: lang,
              publisher: {
                "@type": "Organization",
                name: "MoneyBall Score",
                url: SITE_URL,
              },
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate:
                    `${SITE_URL}/search?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <ThemeProvider>
          <Header />
          <main
            id="main"
            tabIndex={-1}
            className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 focus:outline-none"
          >
            {children}
          </main>
          <Footer />
          <CookieConsent />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
        <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
        <WebVitalsReporter />
        <ServiceWorkerRegister />
        <PWAInstallButton />
        <KofiWidget />
      </body>
    </html>
  );
}
