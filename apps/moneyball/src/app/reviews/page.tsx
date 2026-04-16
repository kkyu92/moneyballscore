import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "경기 리뷰",
  description: "KBO 경기 결과 분석. 예측 vs 실제 결과 비교.",
};

export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">경기 리뷰</h1>
      <p className="text-gray-500 dark:text-gray-400">예측 vs 실제 결과 분석입니다.</p>
      <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400 dark:text-gray-500">
        <p className="text-lg">Phase 2에서 경기 결과 리뷰가 표시됩니다.</p>
      </div>
    </div>
  );
}
