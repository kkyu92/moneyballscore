import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-brand-800 bg-brand-900 mt-auto text-brand-300">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚾</span>
            <span className="font-semibold text-white">MoneyBall KBO</span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/" className="hover:text-white transition-colors">
              홈
            </Link>
            <Link href="/predictions" className="hover:text-white transition-colors">
              예측
            </Link>
            <Link href="/analysis" className="hover:text-white transition-colors">
              AI 분석
            </Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">
              대시보드
            </Link>
            <Link href="/about" className="hover:text-white transition-colors">
              소개
            </Link>
          </nav>
        </div>
        <p className="text-center text-xs text-brand-400 mt-6">
          세이버메트릭스 기반 KBO 승부예측. 본 서비스는 정보 제공 목적이며 도박을
          권장하지 않습니다.
        </p>
      </div>
    </footer>
  );
}
