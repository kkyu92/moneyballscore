import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "설정 박제 중 | MoneyBall Score",
  robots: { index: false, follow: false },
};

export default function Settings() {
  return (
    <main className="max-w-md mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold dark:text-brand-100">📌 설정 박제 중</h1>
      <p className="text-sm text-brand-500 dark:text-brand-400 mt-3">ship 시점 추후 공지 (인증 layer 의존).</p>
    </main>
  );
}
