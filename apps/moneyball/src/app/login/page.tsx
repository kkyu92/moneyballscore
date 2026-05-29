import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인 박제 중 | MoneyBall Score",
  robots: { index: false, follow: false },
};

export default function Login() {
  return (
    <main className="max-w-md mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-brand-700 dark:text-brand-100">📌 회원 기능 박제 중</h1>
      <p className="text-sm text-brand-500 dark:text-brand-400 mt-3">2026-08~09 ship 예정 (postseason 직전).</p>
    </main>
  );
}
