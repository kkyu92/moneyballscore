import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  FactorBreakdown,
  contributionPp,
} from "@/components/predictions/FactorBreakdown";

/**
 * W-FV 확장 테스트 — chart prop + factor 11/12 row + contribution % 계산.
 * (기본 동작 회귀는 기존 FactorBreakdown 테스트가 커버.)
 */

const PROD_FACTORS: Record<string, number> = {
  sp_fip: 0.62,
  sp_xfip: 0.55,
  lineup_woba: 0.48,
  bullpen_fip: 0.51,
  recent_form: 0.7,
  war: 0.42,
  head_to_head: 0.5,
  park_factor: 0.55,
  elo: 0.68,
  sfr: 0.49,
};

describe("FactorBreakdown — chart variant + shadow factor 11/12", () => {
  it("chart=true 시 contribution %p column 렌더 + data-variant=chart", () => {
    const { container } = render(
      <FactorBreakdown
        factors={PROD_FACTORS}
        homeTeam="LG"
        awayTeam="HT"
        chart
      />,
    );

    const root = container.querySelector('[data-variant="chart"]');
    expect(root).toBeTruthy();

    // contribution column 박제 — `[data-contribution-pp]` attribute
    const pps = container.querySelectorAll("[data-contribution-pp]");
    // 10 base + 2 shadow = 12 row
    expect(pps.length).toBeGreaterThanOrEqual(10);

    // sp_fip (value=0.62, weight=0.15) → (0.62-0.5)*0.15*2*100 = 3.6pp
    const spFipRow = container.querySelector('[data-factor="sp_fip"]');
    const spFipPp = spFipRow?.querySelector("[data-contribution-pp]");
    expect(spFipPp?.textContent).toContain("+3.6pp");
  });

  it("factor 11/12 (park_weather + umpire_sz) row 강제 렌더 — 값 없으면 '측정 중'", () => {
    const { container } = render(
      <FactorBreakdown
        factors={PROD_FACTORS}
        homeTeam="LG"
        awayTeam="HT"
        chart
      />,
    );

    // factor 11 박제
    const parkWeatherRow = container.querySelector(
      '[data-factor="park_weather"][data-shadow="true"]',
    );
    expect(parkWeatherRow).toBeTruthy();
    expect(parkWeatherRow?.textContent).toContain("측정 중");
    expect(parkWeatherRow?.textContent).toContain("구장 날씨");
    // shadow 배지
    expect(parkWeatherRow?.textContent).toContain("shadow");

    // factor 12 박제
    const umpireRow = container.querySelector(
      '[data-factor="umpire_sz"][data-shadow="true"]',
    );
    expect(umpireRow).toBeTruthy();
    expect(umpireRow?.textContent).toContain("측정 중");
    expect(umpireRow?.textContent).toContain("주심 SZ");
  });

  it("factor 11/12 에 값 제공 시 '측정 중' 대신 실제 favor 표시", () => {
    const withShadow: Record<string, number> = {
      ...PROD_FACTORS,
      park_weather: 0.7, // home favor
      umpire_sz: 0.3, // away favor
    };
    const { container } = render(
      <FactorBreakdown
        factors={withShadow}
        homeTeam="LG"
        awayTeam="HT"
        chart
        details={{
          parkWeatherTempC: 8.5,
          parkWeatherWindMps: 4.2,
          umpireName: "이민호",
          umpireSzWidenPct: 3.2,
        }}
      />,
    );

    const parkWeatherRow = container.querySelector('[data-factor="park_weather"]');
    expect(parkWeatherRow?.textContent).not.toContain("측정 중");
    expect(parkWeatherRow?.textContent).toContain("LG 우위"); // home=LG, value>0.55
    expect(parkWeatherRow?.textContent).toContain("기온 8.5°C");

    const umpireRow = container.querySelector('[data-factor="umpire_sz"]');
    expect(umpireRow?.textContent).not.toContain("측정 중");
    // shortTeamName('HT') = 'KIA' (KBO_TEAM_SHORT_NAME 매핑)
    expect(umpireRow?.textContent).toContain("KIA 우위"); // away=HT→KIA, value<0.45
    expect(umpireRow?.textContent).toContain("이민호");
  });

  it("chart=false (기본) → contribution column X + shadow row X (회귀 가드)", () => {
    const { container } = render(
      <FactorBreakdown
        factors={PROD_FACTORS}
        homeTeam="LG"
        awayTeam="HT"
      />,
    );

    expect(container.querySelector('[data-variant="default"]')).toBeTruthy();
    expect(container.querySelectorAll("[data-contribution-pp]")).toHaveLength(0);
    // shadow factor row 안 자동 렌더 X
    expect(container.querySelector('[data-factor="park_weather"]')).toBeNull();
    expect(container.querySelector('[data-factor="umpire_sz"]')).toBeNull();
    // 기존 prod factor 렌더 유지
    expect(container.querySelector('[data-factor="sp_fip"]')).toBeTruthy();
  });

  it("contributionPp 헬퍼 수학 정확성", () => {
    // value=0.5, weight=any → 0pp (중립)
    expect(contributionPp(0.5, 0.15)).toBe(0);
    // value=1, weight=0.15 → (1-0.5)*0.15*2*100 = 15pp (max home)
    expect(contributionPp(1, 0.15)).toBe(15);
    // value=0, weight=0.10 → -10pp (max away, elo weight)
    expect(contributionPp(0, 0.1)).toBe(-10);
    // value=0.7, weight=0.05 → 2pp
    expect(contributionPp(0.7, 0.05)).toBeCloseTo(2, 5);
    // value=0.3, weight=0.08 → -3.2pp
    expect(contributionPp(0.3, 0.08)).toBeCloseTo(-3.2, 5);
  });

  it("RivalryMemorySurface — memories prop 직접 주입 시 3 카드 렌더", async () => {
    const { RivalryMemorySurface } = await import(
      "@/components/predictions/RivalryMemorySurface"
    );

    const node = await RivalryMemorySurface({
      homeTeam: "LG",
      awayTeam: "HT",
      asOfDate: "2026-05-28",
      memories: [
        {
          teamCode: "LG",
          content: "잠실 홈에서 KIA 상대로 7월~9월 9승 3패 강세 (좌투수 vs LG 클린업 약점 노출 패턴)",
          confidence: 0.78,
          validUntil: "2026-10-31",
        },
        {
          teamCode: "HT",
          content: "원정 LG전 1점차 박빙 비율 60% (마무리 정해영 등판 경기 4-0)",
          confidence: 0.72,
          validUntil: "2026-10-31",
        },
        {
          teamCode: "LG",
          content: "1회 선취점 시 승률 82% — 김현수 1회 출루율 .420",
          confidence: 0.65,
          validUntil: "2026-10-31",
        },
      ],
    });

    render(node as React.ReactElement);

    const surface = screen.getByTestId("rivalry-memory-surface");
    expect(surface).toBeInTheDocument();

    // 헤더
    expect(screen.getByText("라이벌리 메모리")).toBeInTheDocument();

    // 3 카드
    const lis = surface.querySelectorAll("li");
    expect(lis).toHaveLength(3);

    // content 박제
    expect(surface.textContent).toContain("잠실 홈에서");
    expect(surface.textContent).toContain("정해영");

    // confidence % 박제
    expect(surface.textContent).toContain("신뢰도 78%");
    expect(surface.textContent).toContain("신뢰도 72%");
  });

  it("RivalryMemorySurface — empty memories → null 리턴 (섹션 hide)", async () => {
    const { RivalryMemorySurface } = await import(
      "@/components/predictions/RivalryMemorySurface"
    );
    const node = await RivalryMemorySurface({
      homeTeam: "LG",
      awayTeam: "HT",
      memories: [],
    });
    expect(node).toBeNull();
  });
});
