import Link from "next/link";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";

// IA hierarchy 룰 (docs/design/ia-hierarchy.md) — Footer = exhaust 책임
//
// Sitemap wireframe (cycle 2587 갱신 — 로또 컬럼에 /lotto/check 누락 발견 후 추가:
// cycle 2019(cb21e154)에 신규 배선됐고 /lotto hub 링크 + sitemap.ts(cycle 2250)까지
// 있었으나 헤더 megamenu + footer sitemap 컬럼 양쪽 빠져있던 gap. cycle 2225(MLB
// /mlb/matchup) + cycle 2153 과 동일 family — 신규 라우트 추가 시 헤더/footer 동기
// 누락 반복 패턴, 3번째 재발):
// ┌──────────────────────────────────────────────────────────────────────────┐
// │ AI 예측    커뮤니티    팀·선수     리뷰·시즌    도움말     MLB      로또 │
// │ ────────  ────────  ────────   ─────────  ────────  ────────  ──────── │
// │ /         /picks    /standings /reviews   /method.. /mlb      /lotto     │
// │ /analysis /leader.. /teams     /reviews/w /guide    /mlb/st.. /lotto/ch. │
// │ /accuracy            /players   /reviews/m /glossary /mlb/team /lotto/me. │
// │ /dashboard           /matchup   /reviews/. /change.. /mlb/accu.. /lotto/ar │
// │ /insights                        /seasons   /about    /mlb/play..         │
// │ /predictions                                /search   /mlb/matc..         │
// │ /calendar                                             /mlb/fact..         │
// │                                                        /mlb/cale..         │
// │                                                        /mlb/wc..           │
// │                                                        /mlb/post..         │
// └──────────────────────────────────────────────────────────────────────────┘
//   Desktop (≥ lg, 1024px) : 5 column grid (always expanded, 7 column wrap to 2 row)
//   Tablet  (≥ sm, 640px)  : 3 column grid
//   Mobile  (< sm, 640px)  : 2 column grid + <details> accordion (open by default)

type FooterLink = { label: string; enLabel: string; href: string };
type FooterColumn = { title: string; enTitle: string; links: FooterLink[] };

// EN 페이지(/en/mlb/*)에서도 Footer 는 항상 전체 렌더 — MLB column 만 /en 대응 라우트
// 존재하므로 href 치환 (Header withLocale, cycle 2139 와 동일 패턴). 나머지 column 은
// 라우트 부재로 href 유지, 텍스트만 번역 (SearchForm, cycle 2142 와 동일 scope 판단).
// /mlb/reviews/weekly, /mlb/reviews/monthly 는 cycle 2355/2356 에서 EN 미러 신규 배선 —
// 예외 해제 (Header.tsx 동일 fix).
function withMlbLocale(href: string, isEn: boolean): string {
  if (!isEn) return href;
  if (href === "/mlb") return "/en/mlb";
  return `/en${href}`;
}

const SITEMAP_COLUMNS: FooterColumn[] = [
  {
    title: "AI 예측",
    enTitle: "AI Predictions",
    links: [
      { href: "/", label: "오늘 경기", enLabel: "Today's Games" },
      { href: "/analysis", label: "AI 분석", enLabel: "AI Analysis" },
      { href: "/accuracy", label: "AI 적중 기록", enLabel: "Accuracy Track Record" },
      { href: "/dashboard", label: "모델 성능", enLabel: "Model Performance" },
      { href: "/insights", label: "AI 인사이트", enLabel: "AI Insights" },
      { href: "/predictions", label: "예측 기록", enLabel: "Prediction History" },
      { href: "/calendar", label: "월별 캘린더", enLabel: "Monthly Calendar" },
    ],
  },
  {
    title: "커뮤니티",
    enTitle: "Community",
    links: [
      { href: "/picks", label: "내 픽 기록", enLabel: "My Picks" },
      { href: "/leaderboard", label: "픽 리더보드", enLabel: "Picks Leaderboard" },
    ],
  },
  {
    title: "팀·선수",
    enTitle: "Teams & Players",
    links: [
      { href: "/standings", label: "팀 순위", enLabel: "Standings" },
      { href: "/teams", label: "팀 프로필", enLabel: "Team Profiles" },
      { href: "/players", label: "선수 리더보드", enLabel: "Player Leaderboard" },
      { href: "/matchup", label: "매치업", enLabel: "Matchups" },
    ],
  },
  {
    title: "리뷰·시즌",
    enTitle: "Reviews & Seasons",
    links: [
      { href: "/reviews", label: "예측 리뷰", enLabel: "Prediction Reviews" },
      { href: "/reviews/weekly", label: "주간 리뷰", enLabel: "Weekly Review" },
      { href: "/reviews/monthly", label: "월간 리뷰", enLabel: "Monthly Review" },
      { href: "/reviews/misses", label: "빗나간 예측", enLabel: "Missed Predictions" },
      { href: "/seasons", label: "시즌 기록", enLabel: "Season Records" },
    ],
  },
  {
    title: "도움말",
    enTitle: "Help",
    links: [
      { href: "/methodology", label: "예측 방법론", enLabel: "Methodology" },
      { href: "/guide", label: "사용 가이드", enLabel: "User Guide" },
      { href: "/glossary", label: "용어 사전", enLabel: "Glossary" },
      { href: "/changelog", label: "변경 로그", enLabel: "Changelog" },
      { href: "/about", label: "소개", enLabel: "About" },
      { href: "/search", label: "검색", enLabel: "Search" },
    ],
  },
  {
    title: "MLB",
    enTitle: "MLB",
    links: [
      { href: "/mlb", label: "오늘 경기", enLabel: "Today's Games" },
      { href: "/mlb/analysis", label: "분석 센터", enLabel: "Analysis Hub" },
      { href: "/mlb/standings", label: "AL/NL 순위", enLabel: "AL/NL Standings" },
      { href: "/mlb/team", label: "팀 프로필", enLabel: "Team Profiles" },
      { href: "/mlb/accuracy", label: "AI 적중 기록", enLabel: "Accuracy Track Record" },
      { href: "/mlb/players", label: "Statcast 선수", enLabel: "Statcast Players" },
      { href: "/mlb/matchup", label: "매치업", enLabel: "Matchups" },
      { href: "/mlb/factors", label: `${MLB_FACTOR_COUNTS.total}팩터 가중치`, enLabel: `${MLB_FACTOR_COUNTS.total}-Factor Weights` },
      { href: "/mlb/methodology", label: "예측 방법론", enLabel: "Methodology" },
      { href: "/mlb/predictions", label: "예측 기록", enLabel: "Prediction History" },
      { href: "/mlb/reviews", label: "예측 리뷰", enLabel: "Prediction Review" },
      { href: "/mlb/reviews/weekly", label: "주간 리뷰", enLabel: "Weekly Review" },
      { href: "/mlb/reviews/monthly", label: "월간 리뷰", enLabel: "Monthly Review" },
      { href: "/mlb/reviews/misses", label: "빗나간 예측", enLabel: "Missed Predictions" },
      { href: "/mlb/calendar", label: "월별 캘린더", enLabel: "Monthly Calendar" },
      { href: "/mlb/wild-card", label: "Wild Card race", enLabel: "Wild Card Race" },
      { href: "/mlb/postseason", label: "Postseason 브래킷", enLabel: "Postseason Bracket" },
    ],
  },
  {
    title: "로또",
    enTitle: "Lotto",
    links: [
      { href: "/lotto", label: "이번 주 조합", enLabel: "This Week's Sets" },
      { href: "/lotto/check", label: "조합 검증", enLabel: "Check My Numbers" },
      { href: "/lotto/methodology", label: "통계 방법론", enLabel: "Methodology" },
      { href: "/lotto/archive", label: "아카이브", enLabel: "Archive" },
    ],
  },
];

export function Footer({ isEn = false }: { isEn?: boolean } = {}) {
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
              {isEn ? "Sabermetrics-based KBO game prediction service" : "세이버메트릭스 기반 KBO 승부예측 서비스"}
            </p>
          </div>

          <nav
            aria-label={isEn ? "Sitemap" : "사이트맵"}
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
                    {isEn ? col.enTitle : col.title}
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
                        href={col.title === "MLB" ? withMlbLocale(link.href, isEn) : link.href}
                        className="text-sm hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2 rounded-sm"
                      >
                        {isEn ? link.enLabel : link.label}
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
            aria-label={isEn ? "Legal" : "법적 고지"}
            className="flex items-center gap-4 text-xs text-brand-400 flex-wrap justify-center"
          >
            <Link
              href="/privacy"
              className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2 rounded-sm"
            >
              {isEn ? "Privacy Policy" : "개인정보처리방침"}
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              href="/terms"
              className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2 rounded-sm"
            >
              {isEn ? "Terms of Service" : "이용약관"}
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              href="/contact"
              className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2 rounded-sm"
            >
              {isEn ? "Contact" : "문의"}
            </Link>
          </nav>
          <p className="text-xs text-brand-400 text-center sm:text-right">
            {isEn
              ? "Predictions are statistical model estimates and do not guarantee actual results."
              : "예측 결과는 통계 모델의 추정이며 실제 결과와 일치를 보장하지 않습니다."}
          </p>
        </div>
      </div>
    </footer>
  );
}
