import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-brand-800 bg-brand-900 mt-auto text-brand-300">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚾</span>
            <span className="font-semibold text-white">MoneyBall Score</span>
          </div>
          <nav
            aria-label="서비스"
            className="flex items-center gap-x-6 gap-y-2 text-sm flex-wrap justify-center"
          >
            <Link href="/" className="hover:text-white transition-colors">
              홈
            </Link>
            <Link href="/predictions" className="hover:text-white transition-colors">
              예측
            </Link>
            <Link href="/analysis" className="hover:text-white transition-colors">
              AI 분석
            </Link>
            <Link href="/reviews" className="hover:text-white transition-colors">
              리뷰
            </Link>
            <Link href="/players" className="hover:text-white transition-colors">
              선수
            </Link>
            <Link href="/teams" className="hover:text-white transition-colors">
              팀
            </Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">
              대시보드
            </Link>
            <Link href="/about" className="hover:text-white transition-colors">
              소개
            </Link>
          </nav>
        </div>

        <nav
          aria-label="법적 고지"
          className="flex items-center justify-center gap-4 text-xs text-brand-400 flex-wrap"
        >
          <Link href="/privacy" className="hover:text-white transition-colors">
            개인정보처리방침
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms" className="hover:text-white transition-colors">
            이용약관
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/contact" className="hover:text-white transition-colors">
            문의
          </Link>
        </nav>

        <div className="text-center text-xs text-brand-400 space-y-1">
          <p>
            세이버메트릭스 기반 정보 제공 서비스. 본 사이트는 스포츠 토토,
            사설 베팅, 금전 거래를 일체 권유·중개·조장하지 않습니다.
          </p>
          <p>예측 결과는 통계 모델의 추정이며, 실제 경기 결과와 일치를 보장하지 않습니다.</p>
        </div>
      </div>
    </footer>
  );
}
