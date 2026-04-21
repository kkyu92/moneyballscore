import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

// 진행 시즌을 매일 반영하려면 인덱스도 짧게. 개별 시즌 페이지와 동일 10분.
export const revalidate = 600;

const SITE_URL = "https://moneyballscore.vercel.app";
const CURRENT_YEAR = new Date().getFullYear();

interface SeasonCard {
  year: number;
  subtitle: string;
  note: string;
  ongoing?: boolean;
}

const PAST_SEASONS: SeasonCard[] = [
  {
    year: 2025,
    subtitle: "정규시즌 + 포스트시즌 · 822경기",
    note: "LG Twins 한국시리즈 우승 (vs HH 4-1).",
  },
  {
    year: 2024,
    subtitle: "정규시즌 + 한국시리즈 · 818경기",
    note: "KIA Tigers 통합 우승.",
  },
  {
    year: 2023,
    subtitle: "정규시즌 + 한국시리즈 · 827경기",
    note: "LG Twins 29년만의 통합 우승.",
  },
];

const CURRENT_SEASON: SeasonCard = {
  year: CURRENT_YEAR,
  subtitle: "진행 중 · 매일 경기 결과 반영",
  note: "오늘도 경기가 있으면 자동으로 업데이트됩니다.",
  ongoing: true,
};

const SEASONS: SeasonCard[] = [CURRENT_SEASON, ...PAST_SEASONS];

export const metadata: Metadata = {
  title: "KBO 시즌 리뷰",
  description: "KBO 역대 시즌 실제 경기 결과 요약 — 팀 순위, 월별 득점, 인상적인 경기.",
  alternates: { canonical: `${SITE_URL}/seasons` },
};

export default function SeasonsIndexPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Breadcrumb items={[{ label: "시즌 리뷰" }]} />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">KBO 시즌 리뷰</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          역대 시즌 실제 경기 결과를 한눈에. 예측과 독립된 사실 기록입니다.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {SEASONS.map((s) => (
          <Link
            key={s.year}
            href={`/seasons/${s.year}`}
            className={`bg-white dark:bg-[var(--color-surface-card)] rounded-xl border p-6 hover:border-brand-400 dark:hover:border-brand-500 transition-colors ${
              s.ongoing
                ? "border-red-300 dark:border-red-800 ring-1 ring-red-100 dark:ring-red-900/30"
                : "border-gray-200 dark:border-[var(--color-border)]"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{s.year} 시즌</h2>
                {s.ongoing && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    진행 중
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500 font-mono text-right">{s.subtitle}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{s.note}</p>
            <p className="text-xs text-brand-600 dark:text-brand-400 mt-4">자세히 보기 →</p>
          </Link>
        ))}
      </div>

      <section className="text-xs text-gray-400 dark:text-gray-500 mt-8">
        <p>
          Naver 스포츠 스케줄 · Open-Meteo 날씨 자료를 MoneyBall Score 내부에서 수집·검증한
          실제 경기 결과입니다.
        </p>
      </section>
    </div>
  );
}
