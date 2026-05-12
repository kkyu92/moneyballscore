import Link from "next/link";

const SITEMAP_COLUMNS = [
  {
    label: "분석·예측",
    links: [
      { href: "/", label: "오늘 경기" },
      { href: "/analysis", label: "AI 분석" },
      { href: "/accuracy", label: "AI 적중 기록" },
      { href: "/dashboard", label: "모델 성능" },
      { href: "/picks", label: "내 픽 기록" },
      { href: "/predictions", label: "예측 기록" },
      { href: "/matchup", label: "매치업" },
    ],
  },
  {
    label: "팀·선수",
    links: [
      { href: "/standings", label: "팀 순위" },
      { href: "/teams", label: "팀 프로필" },
      { href: "/players", label: "선수 리더보드" },
    ],
  },
  {
    label: "리뷰·시즌",
    links: [
      { href: "/reviews", label: "예측 리뷰" },
      { href: "/reviews/weekly", label: "주간 리뷰" },
      { href: "/reviews/monthly", label: "월간 리뷰" },
      { href: "/reviews/misses", label: "크게 빗나간 예측" },
      { href: "/seasons", label: "시즌 기록" },
    ],
  },
  {
    label: "서비스",
    links: [
      { href: "/search", label: "검색" },
      { href: "/about", label: "소개" },
      { href: "/contact", label: "문의" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-brand-800 bg-brand-900 mt-auto text-brand-300">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          <div className="shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">⚾</span>
              <span className="font-semibold text-white">MoneyBall Score</span>
            </div>
            <p className="text-xs text-brand-400 max-w-[14rem]">
              세이버메트릭스 기반 KBO 승부예측 서비스
            </p>
          </div>

          <nav
            aria-label="사이트맵"
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 md:gap-8 flex-1"
          >
            {SITEMAP_COLUMNS.map((col) => (
              <div key={col.label}>
                <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wide mb-2">
                  {col.label}
                </h3>
                <ul className="space-y-1.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-brand-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <nav
            aria-label="법적 고지"
            className="flex items-center gap-4 text-xs text-brand-400 flex-wrap justify-center"
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
          <p className="text-xs text-brand-400 text-center sm:text-right">
            예측 결과는 통계 모델의 추정이며 실제 결과와 일치를 보장하지 않습니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
