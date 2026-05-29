import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "커뮤니티 박제 중 | MoneyBall Score",
  robots: { index: false, follow: false },
};

export default function Community() {
  return (
    <main className="max-w-md mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold">📌 커뮤니티 박제 중</h1>
      <p className="text-sm text-brand-500 mt-3">후속 plan #20 ship 예정 (인증 layer 의존).</p>
    </main>
  );
}
