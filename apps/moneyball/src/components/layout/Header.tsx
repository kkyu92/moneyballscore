import Link from "next/link";
import { KBO_TEAM_COUNT, MLB_TEAM_COUNT, MLB_DIVISION_COUNT } from "@moneyball/shared";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { NavLinks } from "./NavLinks";
import { LeagueSelector, type League } from "./LeagueSelector";
import type { NavIconName } from "./nav-icon";

export type NavLink = { href: string; label: string; description?: string; icon?: NavIconName };
export type NavGroup = { label: string; items: NavLink[] };
export type NavItem = NavLink | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return "items" in item;
}

// KBO_NAV — cycle 1064 plan #20 polish: 22 link / 5 group → 11 link / 3 group (50% 압축).
// cycle 1129 v17 candidate O: 예측·기록 group + /accuracy/shadow (12 link total, group count unchanged).
// 의도: Header = primary path only (Footer = exhaust, IA hierarchy 룰).
// 더보기 8 link dumping ground 해체 → Footer "도움말" column 단독 노출 (이미 박제 완료).
// /insights /calendar /seasons → Footer "리뷰·시즌"/"도움말" column 단독 노출.
// 결과: 1 top-level (오늘) + 3 group (예측·기록 5 / 팀·선수 4 / 커뮤니티 2) = 4 hover zone.
const KBO_NAV: NavItem[] = [
  { href: "/", label: "오늘" },
  {
    label: "예측·기록",
    items: [
      { href: "/analysis", label: "AI 분석", description: "에이전트 토론·경기 분석", icon: "activity" },
      { href: "/accuracy", label: "적중 기록", description: "AI 예측 성과 트래킹", icon: "target" },
      { href: "/accuracy/shadow", label: "Shadow 적중률", description: "v2.1-B 섀도우 cohort 비교", icon: "bar-chart" },
      { href: "/predictions", label: "예측 기록", description: "일자별 예측 아카이브", icon: "file-text" },
      { href: "/dashboard", label: "모델 성능", description: "Brier·캘리브레이션 지표", icon: "bar-chart" },
    ],
  },
  {
    label: "팀·선수",
    items: [
      { href: "/standings", label: "순위", description: "KBO 정규시즌 순위표", icon: "award" },
      { href: "/teams", label: "팀", description: `KBO ${KBO_TEAM_COUNT}구단 프로필·통계`, icon: "shield" },
      { href: "/players", label: "선수", description: "선수 세이버메트릭스 지표", icon: "user" },
      { href: "/matchup", label: "매치업", description: "팀간 맞대결 이력 분석", icon: "arrows-swap" },
    ],
  },
  {
    label: "커뮤니티",
    items: [
      { href: "/picks", label: "내 픽 기록", description: "내 예측과 AI 성과 비교", icon: "clipboard-check" },
      { href: "/leaderboard", label: "픽 리더보드", description: "커뮤니티 예측 순위", icon: "award" },
    ],
  },
];

const MLB_NAV: NavItem[] = [
  { href: "/mlb", label: "오늘" },
  {
    label: "경기·팀",
    items: [
      { href: "/mlb/standings", label: "AL/NL 순위", description: `${MLB_DIVISION_COUNT} division standings`, icon: "award" },
      { href: "/mlb/team", label: "팀", description: `${MLB_TEAM_COUNT}팀 시즌 stat`, icon: "shield" },
      { href: "/mlb/players", label: "Statcast", description: "xwOBA / Barrel% / Launch Angle", icon: "user" },
      { href: "/mlb/factors", label: `${MLB_FACTOR_COUNTS.total}팩터`, description: `KBO ${MLB_FACTOR_COUNTS.kbo} + Statcast ${MLB_FACTOR_COUNTS.statcast} 가중치`, icon: "file-text" },
    ],
  },
  {
    label: "포스트시즌",
    items: [
      { href: "/mlb/wild-card", label: "Wild Card", description: "AL/NL Wild Card race", icon: "target" },
      { href: "/mlb/postseason", label: "Postseason", description: "WC / DS / LCS / WS bracket", icon: "award" },
    ],
  },
];

const LOTTO_LINKS: NavLink[] = [
  { href: "/lotto", label: "이번 주 조합", description: "최신 50조합 + 추천 5세트 통계 선별", icon: "star" },
  { href: "/lotto/methodology", label: "통계 방법론", description: "6/45 패턴 통계 검증·256 규칙 saturation", icon: "file-text" },
  { href: "/lotto/archive", label: "아카이브", description: "회차별 50조합 통계 분석 기록", icon: "database" },
];

// MLB top-level pill — sub-NAV 는 단일 link 라 그룹화 없이 펼침 link 로 렌더.
// 로또는 기존대로 sub-NAV 그룹으로 렌더 (드롭다운).
export const LEAGUE_NAVS: Record<League, NavItem[]> = {
  kbo: KBO_NAV,
  mlb: MLB_NAV,
  lotto: [{ label: "로또", items: LOTTO_LINKS }],
};

export function Header() {
  return (
    <header className="border-b border-brand-700 bg-brand-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">⚾</span>
          <span className="font-bold text-xl tracking-tight text-white">MoneyBall</span>
          <span className="text-xs text-brand-300 font-medium">Score</span>
        </Link>
        <div className="flex items-center">
          <LeagueSelector variant="desktop" />
          <NavLinks />
        </div>
        <div className="flex items-center md:hidden">
          <Link
            href="/search"
            aria-label="검색"
            className="p-2 text-brand-200 hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </Link>
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
