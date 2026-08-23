// cycle 2226 (explore-idea heavy): /reviews(KBO) 의 MLB 대응 신규 — MLB_NAV "경기·팀"
// 그룹에 예측 기록은 있었지만 수렴 픽 분석(팀별/홈-어웨이/요일별/스트리크)이 통째로 빠져있던
// gap. Phase 1 은 수렴 픽 분석 허브만 (weekly/monthly 수렴 픽 섹션은 cycle 2345 에서 완결).

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeConvergenceTeamStats } from "@/lib/analysis/convergenceRecord";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");
const CONVERGENCE_SRC = readFileSync(
  resolve(__dirname, "../../../../lib/analysis/convergenceRecord.ts"),
  "utf8",
);
const BADGES_SRC = readFileSync(
  resolve(__dirname, "../../../../components/reviews/ConvergenceTeamStatsBadges.tsx"),
  "utf8",
);
const SITEMAP_SRC = readFileSync(resolve(__dirname, "../../../sitemap.ts"), "utf8");
const REVIEWS_DATA_SRC = readFileSync(resolve(__dirname, "../reviews-data.ts"), "utf8");
const HEADER_SRC = readFileSync(
  resolve(__dirname, "../../../../components/layout/Header.tsx"),
  "utf8",
);
const FOOTER_SRC = readFileSync(
  resolve(__dirname, "../../../../components/layout/Footer.tsx"),
  "utf8",
);

describe("mlb/reviews/page.tsx — KBO /reviews 수렴 픽 분석 parity (Phase 1)", () => {
  it("강수렴/완전수렴 record·streak·team stats·home-away·day-of-week 12개 병렬 조회 (wave-659: reviews-data.ts 로 이동, ko/en 재사용)", () => {
    expect(PAGE_SRC).toContain("getMlbReviewsData");
    expect(REVIEWS_DATA_SRC).toMatch(/getMlbRecentConvergencePickRecord\(MLB_FACTOR_PICK_STRONG\)/);
    expect(REVIEWS_DATA_SRC).toMatch(/getMlbRecentConvergencePickRecord\(MLB_FACTOR_PICK_COMPLETE\)/);
    expect(REVIEWS_DATA_SRC).toMatch(/getMlbConvergencePickStreak\(MLB_FACTOR_PICK_STRONG\)/);
    expect(REVIEWS_DATA_SRC).toMatch(/getMlbConvergencePickBestStreak\(MLB_FACTOR_PICK_STRONG\)/);
    expect(REVIEWS_DATA_SRC).toMatch(/getMlbConvergencePickTeamStats\(MLB_FACTOR_PICK_STRONG\)/);
    expect(REVIEWS_DATA_SRC).toMatch(/getMlbConvergencePickHomeAwaySplit\(MLB_FACTOR_PICK_STRONG\)/);
    expect(REVIEWS_DATA_SRC).toMatch(/getMlbConvergencePickDayOfWeekSplit\(MLB_FACTOR_PICK_STRONG\)/);
  });

  it("ConvergenceTeamStatsBadges 에 mlbShortTeamName nameResolver 전달 (KBO shortTeamName 결합 회피)", () => {
    expect(PAGE_SRC).toMatch(/nameResolver=\{mlbShortTeamName\}/);
  });

  it("Breadcrumb 2 단계 (MLB 분석 → 예측 결과 리뷰), revalidate 1800 ISR", () => {
    expect(PAGE_SRC).toMatch(/\{ label: 'MLB 분석', href: '\/mlb' \}/);
    expect(PAGE_SRC).toMatch(/export const revalidate = 1800\b/);
  });

  it("canonical /mlb/reviews + en hreflang (wave-659: en/mlb/reviews 미러 신규)", () => {
    expect(PAGE_SRC).toMatch(/SITE_URL\}\/mlb\/reviews`;/);
    expect(PAGE_SRC).toMatch(/languages: \{ en: `\$\{SITE_URL\}\/en\/mlb\/reviews` \}/);
  });
});

describe("convergenceRecord.ts — MLB 신규 함수 5종 (cycle 2226)", () => {
  it("getMlbRecentConvergencePickRecord / Streak / BestStreak / HomeAwaySplit / DayOfWeekSplit export", () => {
    expect(CONVERGENCE_SRC).toContain("export async function getMlbRecentConvergencePickRecord(");
    expect(CONVERGENCE_SRC).toContain("export async function getMlbConvergencePickStreak(");
    expect(CONVERGENCE_SRC).toContain("export async function getMlbConvergencePickBestStreak(");
    expect(CONVERGENCE_SRC).toContain("export async function getMlbConvergencePickHomeAwaySplit(");
    expect(CONVERGENCE_SRC).toContain("export async function getMlbConvergencePickDayOfWeekSplit(");
  });

  it("fetchMlbConvergencePickDetailedResults 가 game_date desc 정렬 + favoredHome/gameDate 포함 반환 (streak/split 재사용 전제)", () => {
    expect(CONVERGENCE_SRC).toMatch(
      /\.from\('mlb_schedule'\)\s*\n\s*\.select\('external_game_id, game_date, home_score, away_score, home_team_code, away_team_code'\)\s*\n\s*\.eq\('status', 'final'\)\s*\n\s*\.order\('game_date', \{ ascending: false \}\)/,
    );
    expect(CONVERGENCE_SRC).toContain(
      "const results: Array<{ favoredTeam: MlbTeamCode; favoredHome: boolean; won: boolean; gameDate: string }> = [];",
    );
  });

  it("computeConvergenceTeamStats 는 generic 이라 확장된 MLB 결과 shape(extra fields)도 그대로 동작", () => {
    const results = [
      { favoredTeam: "NYM" as const, favoredHome: true, won: true, gameDate: "2026-08-01" },
      { favoredTeam: "NYM" as const, favoredHome: false, won: false, gameDate: "2026-08-02" },
      { favoredTeam: "PHI" as const, favoredHome: true, won: true, gameDate: "2026-08-03" },
    ];
    const stats = computeConvergenceTeamStats(results, 1);
    expect(stats).toEqual([
      { teamCode: "NYM", wins: 1, losses: 1 },
      { teamCode: "PHI", wins: 1, losses: 0 },
    ]);
  });
});

describe("ConvergenceTeamStatsBadges — nameResolver 제네릭화 (cycle 2226, KBO 시그니처 하위호환)", () => {
  it("nameResolver prop 지원 + 기본값 shortTeamName (KBO 호출부 변경 없이 하위호환)", () => {
    expect(BADGES_SRC).toContain("nameResolver = shortTeamName as (code: T) => string,");
    expect(BADGES_SRC).toContain("nameResolver?: (code: T) => string;");
    expect(BADGES_SRC).not.toContain("shortTeamName(stat.teamCode)");
  });
});

describe("MLB_NAV / Footer / sitemap — /mlb/reviews 3곳 동기 (cycle 2225 footer sitemap 누락 재발 방지)", () => {
  it("Header MLB_NAV 경기·팀 그룹에 /mlb/reviews 포함", () => {
    expect(HEADER_SRC).toMatch(/href: "\/mlb\/reviews", label: "예측 리뷰"/);
  });

  it("Footer MLB column 에 /mlb/reviews 포함", () => {
    expect(FOOTER_SRC).toMatch(/href: "\/mlb\/reviews", label: "예측 리뷰"/);
  });

  it("sitemap.ts 에 /mlb/reviews 등록", () => {
    expect(SITEMAP_SRC).toContain("${SITE_URL}/mlb/reviews`, lastModified: now, changeFrequency: 'daily', priority: 0.7");
  });
});
