import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚾</span>
            <span className="font-semibold">MoneyBall KBO</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-900">
              홈
            </Link>
            <Link href="/predictions" className="hover:text-gray-900">
              예측
            </Link>
            <Link href="/dashboard" className="hover:text-gray-900">
              대시보드
            </Link>
            <Link href="/about" className="hover:text-gray-900">
              소개
            </Link>
          </nav>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          세이버메트릭스 기반 KBO 승부예측. 본 서비스는 정보 제공 목적이며 도박을
          권장하지 않습니다.
        </p>
      </div>
    </footer>
  );
}
