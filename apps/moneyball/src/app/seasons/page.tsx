import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export const revalidate = 86400;

const SITE_URL = "https://moneyballscore.vercel.app";
const SEASONS = [
  {
    year: 2025,
    subtitle: "정규시즌 + 포스트시즌 · N=822",
    note: "백필 완료. 팀별 승률, 월별 득점 추이, 극값 경기 요약.",
  },
  {
    year: 2024,
    subtitle: "정규시즌 + 한국시리즈 · N=818",
    note: "백필 완료. 2024+2025 통합 표본으로 홈 어드밴티지 51.51% 실측.",
  },
];

export const metadata: Metadata = {
  title: "KBO 시즌 리뷰",
  description: "KBO 역대 시즌 실측 데이터 요약 — 팀 순위, 월별 득점, 극값 경기.",
  alternates: { canonical: `${SITE_URL}/seasons` },
};

export default function SeasonsIndexPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Breadcrumb items={[{ label: "시즌 리뷰" }]} />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">KBO 시즌 리뷰</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          역대 시즌 실측 데이터 요약. 백필된 경기 결과 기반 — 예측 모델과 독립된 사실 데이터.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {SEASONS.map((s) => (
          <Link
            key={s.year}
            href={`/seasons/${s.year}`}
            className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 hover:border-brand-400 dark:hover:border-brand-500 transition-colors"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-bold">{s.year} 시즌</h2>
              <span className="text-xs text-gray-500 font-mono">{s.subtitle}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{s.note}</p>
            <p className="text-xs text-brand-600 dark:text-brand-400 mt-4">자세히 보기 →</p>
          </Link>
        ))}
      </div>

      <section className="text-xs text-gray-400 dark:text-gray-500 mt-8">
        <p>
          데이터는 Naver 스포츠 스케줄 API · Open-Meteo 날씨 데이터를 MoneyBall Score 내부에서
          백필·검증한 결과입니다. 예측이 아니라 실측입니다.
        </p>
      </section>
    </div>
  );
}
