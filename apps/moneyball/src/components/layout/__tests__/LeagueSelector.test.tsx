import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { LeagueSelector, leagueFromPath } from "../LeagueSelector";
import { LEAGUE_NAVS, isNavGroup } from "../Header";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

const mockedUsePathname = vi.mocked(usePathname);

beforeEach(() => {
  mockedUsePathname.mockReturnValue("/");
});

describe("LeagueSelector", () => {
  it("KBO 가 default active state (pathname=/)", () => {
    mockedUsePathname.mockReturnValue("/");
    render(<LeagueSelector />);

    const kboTab = screen.getByRole("tab", { name: /KBO/ });
    expect(kboTab).toHaveAttribute("aria-selected", "true");
    expect(kboTab).toHaveAttribute("aria-current", "page");

    const mlbTab = screen.getByRole("tab", { name: /MLB/ });
    expect(mlbTab).toHaveAttribute("aria-selected", "false");
    expect(mlbTab).not.toHaveAttribute("aria-current");
  });

  it("pathname=/mlb 일 때 MLB pill active + sub-NAV 가 MLB 로 전환", () => {
    mockedUsePathname.mockReturnValue("/mlb");

    // pill active state
    const { unmount } = render(<LeagueSelector />);
    const mlbTab = screen.getByRole("tab", { name: /MLB/ });
    expect(mlbTab).toHaveAttribute("aria-selected", "true");
    expect(mlbTab).toHaveAttribute("href", "/mlb");
    unmount();

    // sub-NAV switches: leagueFromPath('/mlb') → 'mlb', LEAGUE_NAVS.mlb → MLB (검토 중) link
    // cycle 1021 plan #14 C3d: badge "베타" → "검토 중" (commitment escalation 차단, CEO High #3)
    const league = leagueFromPath("/mlb");
    expect(league).toBe("mlb");
    const mlbNav = LEAGUE_NAVS[league];
    expect(mlbNav.length).toBeGreaterThan(0);
    const labels = mlbNav.flatMap((item) =>
      isNavGroup(item) ? item.items.map((sub) => sub.label) : [item.label],
    );
    expect(labels).toContain("MLB (검토 중)");
  });

  it("모바일 variant 는 mobile container 클래스 + onSelect 콜백 호출", () => {
    mockedUsePathname.mockReturnValue("/");
    const onSelect = vi.fn();
    const { container } = render(
      <LeagueSelector variant="mobile" onSelect={onSelect} />,
    );

    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
    // mobile variant 는 border-b 클래스로 mobile 식별
    expect(tablist?.className).toContain("border-b");

    // 모든 pill click 가능 + onSelect 호출
    const tabs = within(tablist as HTMLElement).getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    tabs[1].click(); // MLB
    expect(onSelect).toHaveBeenCalledWith("mlb");
  });

  it("a11y — role=tablist + 각 pill role=tab + aria-label", () => {
    mockedUsePathname.mockReturnValue("/lotto/methodology");
    render(<LeagueSelector />);

    const tablist = screen.getByRole("tablist");
    expect(tablist).toHaveAttribute("aria-label", "리그 선택");

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);

    // 로또 active when pathname=/lotto/methodology
    const lottoTab = screen.getByRole("tab", { name: /로또/ });
    expect(lottoTab).toHaveAttribute("aria-selected", "true");
    expect(lottoTab).toHaveAttribute("aria-current", "page");
  });

  it("KBO sub-NAV 보존 — leagueFromPath('/') → kbo 안 6 top-level 유지 (cycle 1022 polish)", () => {
    // cycle 1022: 9 top-level → 6 압축. "오늘" link + 5 group (분석 / 기록 /
    // 팀·선수 / 커뮤니티 / 더보기). AI / 리뷰·시즌 / 도움말 = 더보기 또는 분석 안 통합.
    const kboNav = LEAGUE_NAVS.kbo;
    const labels = kboNav.map((item) =>
      isNavGroup(item) ? item.label : item.label,
    );

    // 신규 박제된 NAV 라벨
    expect(labels).toContain("오늘");
    expect(labels).toContain("분석");
    expect(labels).toContain("기록");
    expect(labels).toContain("팀·선수");
    expect(labels).toContain("커뮤니티");
    expect(labels).toContain("더보기");

    // top-level 6 items
    expect(labels.length).toBe(6);

    // KBO NAV 에 "로또" 그룹은 없어야 함 (LEAGUE_NAVS.lotto 로 분리됨)
    expect(labels).not.toContain("로또");

    // leagueFromPath fallback
    expect(leagueFromPath("/")).toBe("kbo");
    expect(leagueFromPath("/predictions")).toBe("kbo");
    expect(leagueFromPath("/analysis/game/1")).toBe("kbo");
    expect(leagueFromPath("/mlb")).toBe("mlb");
    expect(leagueFromPath("/mlb/something")).toBe("mlb");
    expect(leagueFromPath("/lotto")).toBe("lotto");
    expect(leagueFromPath("/lotto/methodology")).toBe("lotto");
  });
});
