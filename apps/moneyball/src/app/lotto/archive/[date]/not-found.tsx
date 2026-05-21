import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Archive 조회 불가",
  description: "잘못된 일자 또는 존재하지 않는 archive 입니다.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function LottoArchiveDateNotFound() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
      <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
      <h1 className="text-2xl font-semibold text-brand-100">
        Archive 를 찾을 수 없습니다
      </h1>
      <div className="text-sm text-brand-300 space-y-2">
        <p>다음 중 하나일 가능성이 큽니다.</p>
        <ul className="text-xs text-brand-400 list-disc list-inside space-y-1">
          <li>잘못된 일자 형식 (예상: YYYY-MM-DD)</li>
          <li>토요일이 아닌 일자 (추첨 일자만 박제)</li>
          <li>해당 일자 기록 미박제</li>
        </ul>
      </div>
      <div className="pt-4">
        <Link
          href="/lotto/methodology"
          className="inline-block text-sm text-brand-200 underline hover:text-brand-100"
        >
          ← Lotto 통계 방법론으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
