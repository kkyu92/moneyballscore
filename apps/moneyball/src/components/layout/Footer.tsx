import Link from "next/link";

// IA hierarchy 룰 (docs/design/ia-hierarchy.md) — Footer = exhaust 책임
//
// Sitemap wireframe (plan #19 Step 1, cycle 1043 + cycle 1064 plan #20 /calendar 추가):
// ┌──────────────────────────────────────────────────────────────────────────┐
// │ AI 예측    커뮤니티    팀·선수     리뷰·시즌    도움말     MLB      로또 │
// │ ────────  ────────  ────────   ─────────  ────────  ────────  ──────── │
// │ /         /picks    /standings /reviews   /method.. /mlb      /lotto/.. │
// │ /analysis /leader.. /teams     /reviews/w /guide    /mlb/st.. /lotto/ar │
// │ /accuracy            /players   /reviews/m /glossary /mlb/team           │
// │ /dashboard           /matchup   /reviews/. /insights /mlb/play..         │
// │ /predictions                     /seasons   /v2-prev. /mlb/wc..           │
// │ /calendar                                    /change.. /mlb/post..         │
// │                                              /about                       │
// │                                              /search                      │
// └──────────────────────────────────────────────────────────────────────────┘
//   Desktop (≥ lg, 1024px) : 5 column grid (always expanded, 7 column wrap to 2 row)
//   Tablet  (≥ sm, 640px)  : 3 column grid
//   Mobile  (< sm, 640px)  : 2 column grid + <details> accordion (open by default)

type FooterLink = { label: string; href: string };
type FooterColumn = { title: string; links: FooterLink[] };

const SITEMAP_COLUMNS: FooterColumn[] = [
  {
    title: "AI 예측",
    links: [
      { href: "/", label: "오늘 경기" },
      { href: "/analysis", label: "AI 분석" },
      { href: "/accuracy", label: "AI 적중 기록" },
      { href: "/dashboard", label: "모델 성능" },
      { href: "/predictions", label: "예측 기록" },
      { href: "/calendar", label: "월별 캘린더" },
    ],
  },
  {
    title: "커뮤니티",
    links: [
      { href: "/picks", label: "내 픽 기록" },
      { href: "/leaderboard", label: "픽 리더보드" },
    ],
  },
  {
    title: "팀·선수",
    links: [
      { href: "/standings", label: "팀 순위" },
      { href: "/teams", label: "팀 프로필" },
      { href: "/players", label: "선수 리더보드" },
      { href: "/matchup", label: "매치업" },
    ],
  },
  {
    title: "리뷰·시즌",
    links: [
      { href: "/reviews", label: "예측 리뷰" },
      { href: "/reviews/weekly", label: "주간 리뷰" },
      { href: "/reviews/monthly", label: "월간 리뷰" },
      { href: "/reviews/misses", label: "빗나간 예측" },
      { href: "/seasons", label: "시즌 기록" },
    ],
  },
  {
    title: "도움말",
    links: [
      { href: "/methodology", label: "예측 방법론" },
      { href: "/guide", label: "사용 가이드" },
      { href: "/glossary", label: "용어 사전" },
      { href: "/insights", label: "AI 인사이트" },
      { href: "/v2-preview", label: "v2 시뮬레이션 미리보기" },
      { href: "/changelog", label: "변경 로그" },
      { href: "/about", label: "소개" },
      { href: "/search", label: "검색" },
    ],
  },
  {
    title: "MLB",
    links: [
      { href: "/mlb", label: "오늘 경기" },
      { href: "/mlb/standings", label: "AL/NL 순위" },
      { href: "/mlb/team", label: "팀 프로필" },
      { href: "/mlb/players", label: "Statcast 선수" },
      { href: "/mlb/wild-card", label: "Wild Card race" },
      { href: "/mlb/postseason", label: "Postseason 브래킷" },
    ],
  },
  {
    title: "로또",
    links: [
      { href: "/lotto/methodology", label: "통계 방법론" },
      { href: "/lotto/archive", label: "아카이브" },
    ],
  },
];

export function Footer() {
  return (
    <footer
      role="contentinfo"
      className="border-t border-brand-800 bg-brand-900 mt-auto text-brand-300"
    >
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
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8 flex-1"
          >
            {SITEMAP_COLUMNS.map((col) => (
              <details
                key={col.title}
                open
                className="group"
              >
                <summary
                  className="flex items-center justify-between mb-2 cursor-pointer md:cursor-default list-none [&::-webkit-details-marker]:hidden"
                >
                  <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-wide">
                    {col.title}
                  </h2>
                  <span
                    aria-hidden="true"
                    className="text-brand-400 md:hidden transition-transform group-open:rotate-180"
                  >
                    ▾
                  </span>
                </summary>
                <ul className="space-y-1.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2 rounded-sm"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </nav>
        </div>

        <div className="border-t border-brand-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <nav
            aria-label="법적 고지"
            className="flex items-center gap-4 text-xs text-brand-400 flex-wrap justify-center"
          >
            <Link
              href="/privacy"
              className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2 rounded-sm"
            >
              개인정보처리방침
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              href="/terms"
              className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2 rounded-sm"
            >
              이용약관
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              href="/contact"
              className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2 rounded-sm"
            >
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
