import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://moneyball-kbo.vercel.app"),
  title: {
    template: "%s | MoneyBall KBO",
    default: "MoneyBall KBO - 세이버메트릭스 기반 KBO 승부예측",
  },
  description:
    "wOBA, FIP, WAR 등 세이버메트릭스 지표를 활용한 KBO 프로야구 승부예측. 매일 업데이트되는 경기 프리뷰와 적중률 트래킹.",
  keywords: [
    "KBO",
    "승부예측",
    "세이버메트릭스",
    "wOBA",
    "FIP",
    "WAR",
    "프로야구",
    "야구분석",
  ],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "MoneyBall KBO",
  },
  robots: { index: true, follow: true },
  alternates: {
    types: {
      "application/rss+xml": "https://moneyballscore.vercel.app/feed",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-gray-900 dark:text-gray-100">
        <ThemeProvider>
          <Header />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
