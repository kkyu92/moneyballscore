import { describe, it, expect } from "vitest";
import {
  explainFactor,
  buildGameOverview,
} from "../factor-explanations";
import {
  NEUTRAL_HI,
  NEUTRAL_LO,
} from "@/lib/predictions/factorLabels";
import {
  PARK_FACTOR_NARRATIVE_HITTER_MIN,
  PARK_FACTOR_NARRATIVE_PITCHER_MAX,
  H2H_NARRATIVE_DOMINANT_PCT_GAP,
  FACTOR_CONTRIBUTION_SCALE,
  WIN_PROB_DOMINANT_HI,
} from "@moneyball/shared";

describe("explainFactor", () => {
  it("sp_fip: away가 낮으면 away 유리 + 서술에 팀명 + 격차 포함", () => {
    const result = explainFactor({
      key: "sp_fip",
      factorValue: 0.3,
      details: { awaySPFip: 3.0, homeSPFip: 4.0 },
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(result.favor).toBe("away");
    expect(result.favorTeam).toBe("NC");
    expect(result.narrative).toContain("NC");
    expect(result.narrative).toContain("1.00");
    expect(result.awayValueLabel).toBe("3.00");
    expect(result.homeValueLabel).toBe("4.00");
  });

  it("lineup_woba: home이 높으면 home 유리 + 해설", () => {
    const result = explainFactor({
      key: "lineup_woba",
      factorValue: 0.7,
      details: { awayWoba: 0.32, homeWoba: 0.36 },
      homeTeamName: "SSG",
      awayTeamName: "두산",
    });
    expect(result.favor).toBe("home");
    expect(result.favorTeam).toBe("SSG");
    expect(result.narrative).toContain("SSG");
    expect(result.narrative).toContain("0.040");
  });

  it("recent_form: 승률 격차를 %p로 표기", () => {
    const result = explainFactor({
      key: "recent_form",
      factorValue: 0.75,
      details: { awayForm: 0.4, homeForm: 0.7 },
      homeTeamName: "LG",
      awayTeamName: "KT",
    });
    expect(result.favor).toBe("home");
    expect(result.narrative).toContain("30%p");
    expect(result.awayValueLabel).toBe("40%");
    expect(result.homeValueLabel).toBe("70%");
  });

  it("park_factor: 타자 친화 구장 설명", () => {
    const result = explainFactor({
      key: "park_factor",
      factorValue: 0.55,
      details: { parkFactor: 1.05 },
      homeTeamName: "롯데",
      awayTeamName: "한화",
    });
    expect(result.narrative).toContain("타자 친화");
  });

  it("head_to_head: 데이터 없으면 첫 대결 안내", () => {
    const result = explainFactor({
      key: "head_to_head",
      factorValue: 0.5,
      details: {},
      homeTeamName: "NC",
      awayTeamName: "KT",
    });
    expect(result.narrative).toContain("첫 대결");
  });

  it("neutral: 격차 작으면 neutral 서술", () => {
    const result = explainFactor({
      key: "sp_fip",
      factorValue: 0.5,
      details: { awaySPFip: 3.5, homeSPFip: 3.5 },
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(result.favor).toBe("neutral");
    expect(result.favorTeam).toBeNull();
    expect(result.narrative).toContain("결정적");
  });

  it("contribution 계산: value 0.7, sp_fip weight 0.15 (v1.7-revert) → 약 6%p", () => {
    const result = explainFactor({
      key: "sp_fip",
      factorValue: 0.7,
      details: { awaySPFip: 4.0, homeSPFip: 3.0 },
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(result.contributionPct).toBe(6);
  });
});

describe("explainFactor — Korean particle silent drift 차단", () => {
  it("sp_fip non-neutral: 받침 없는 팀명 → '가'", () => {
    const result = explainFactor({
      key: "sp_fip",
      factorValue: 0.7,
      details: { awaySPFip: 4.0, homeSPFip: 3.0 },
      homeTeamName: "LG",
      awayTeamName: "한화",
    });
    expect(result.narrative).toContain("LG가");
    expect(result.narrative).not.toContain("LG이");
  });

  it("sp_fip non-neutral: 받침 있는 팀명 → '이'", () => {
    const result = explainFactor({
      key: "sp_fip",
      factorValue: 0.7,
      details: { awaySPFip: 4.0, homeSPFip: 3.0 },
      homeTeamName: "두산",
      awayTeamName: "한화",
    });
    expect(result.narrative).toContain("두산이");
  });

  it("sp_fip neutral: diff 받침 있는 digit ('0' 영) → '으로'", () => {
    const result = explainFactor({
      key: "sp_fip",
      factorValue: 0.5,
      details: { awaySPFip: 4.0, homeSPFip: 3.0 },
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(result.narrative).toContain("1.00으로");
    expect(result.narrative).not.toContain("1.00로");
  });

  it("sp_xfip non-neutral: 'xFIP이' (피 ㅍ 받침)", () => {
    const result = explainFactor({
      key: "sp_xfip",
      factorValue: 0.7,
      details: { awaySPxFip: 4.0, homeSPxFip: 3.0 },
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(result.narrative).toContain("xFIP이");
    expect(result.narrative).not.toContain("xFIP가");
  });

  it("bullpen_fip non-neutral: 'FIP이' (피 ㅍ 받침)", () => {
    const result = explainFactor({
      key: "bullpen_fip",
      factorValue: 0.7,
      details: { awayBullpenFip: 4.0, homeBullpenFip: 3.0 },
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(result.narrative).toContain("FIP이");
    expect(result.narrative).not.toContain("FIP가");
  });

  it("recent_form non-neutral: 받침 없는 팀명 → '가'", () => {
    const result = explainFactor({
      key: "recent_form",
      factorValue: 0.75,
      details: { awayForm: 0.4, homeForm: 0.7 },
      homeTeamName: "LG",
      awayTeamName: "KT",
    });
    expect(result.narrative).toContain("LG가");
    expect(result.narrative).not.toContain("LG이");
  });

  it("h2h neutral: awayWinPct '0' 영 → '으로'", () => {
    const result = explainFactor({
      key: "head_to_head",
      factorValue: 0.5,
      details: { h2hRate: 0.5 },
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(result.narrative).toContain("50:50으로");
    expect(result.narrative).not.toContain("50:50로");
  });

  it("h2h neutral: awayWinPct '5' 오 → '로'", () => {
    const result = explainFactor({
      key: "head_to_head",
      factorValue: 0.5,
      details: { h2hRate: 0.55 },
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(result.narrative).toContain("55:45로");
    expect(result.narrative).not.toContain("55:45으로");
  });

  it("h2h non-neutral: 받침 없는 팀명 → '가'", () => {
    const result = explainFactor({
      key: "head_to_head",
      factorValue: 0.7,
      details: { h2hRate: 0.7 },
      homeTeamName: "LG",
      awayTeamName: "한화",
    });
    expect(result.narrative).toContain("LG가");
    expect(result.narrative).not.toContain("LG이");
  });
});

describe("buildGameOverview — Korean particle silent drift 차단", () => {
  it("h2h 강세: 받침 없는 팀명 → '가'", () => {
    const result = buildGameOverview({
      homeWinProb: 0.55,
      homeTeamName: "LG",
      awayTeamName: "한화",
      h2hRate: 0.75,
    });
    expect(result.summary).toContain("LG가");
    expect(result.summary).not.toContain("LG이");
  });

  it("h2h 강세: 받침 있는 팀명 → '이'", () => {
    const result = buildGameOverview({
      homeWinProb: 0.45,
      homeTeamName: "한화",
      awayTeamName: "두산",
      h2hRate: 0.25,
    });
    expect(result.summary).toContain("두산이");
  });
});

describe("buildGameOverview", () => {
  it("박빙 경기: 박빙 태그 + 접전 서술", () => {
    const result = buildGameOverview({
      homeWinProb: 0.52,
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(result.tags).toContain("박빙");
    expect(result.summary).toContain("접전");
  });

  it("우세 경기: 우세 태그 + 우세 서술", () => {
    const result = buildGameOverview({
      homeWinProb: 0.7,
      homeTeamName: "LG",
      awayTeamName: "한화",
    });
    expect(result.tags).toContain("우세 뚜렷");
    expect(result.summary).toContain("LG");
  });

  it("투수전: 양 선발 FIP 평균 낮을 때 태그", () => {
    const result = buildGameOverview({
      homeWinProb: 0.5,
      homeSPFip: 3.0,
      awaySPFip: 3.2,
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(result.tags).toContain("투수전 예상");
  });

  it("타격전: 양 타선 wOBA 평균 높을 때 태그", () => {
    const result = buildGameOverview({
      homeWinProb: 0.5,
      homeWoba: 0.35,
      awayWoba: 0.345,
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(result.tags).toContain("타격전 예상");
  });

  it("저득점: 양 타선 wOBA 평균 낮을 때 태그 (wave-340)", () => {
    const result = buildGameOverview({
      homeWinProb: 0.5,
      homeWoba: 0.29,
      awayWoba: 0.30,
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(result.tags).toContain("저득점 예상");
    expect(result.tags).not.toContain("타격전 예상");
  });

  it("h2h 강세: 상대전적 서술 추가", () => {
    const result = buildGameOverview({
      homeWinProb: 0.55,
      homeTeamName: "KIA",
      awayTeamName: "NC",
      h2hRate: 0.75,
    });
    expect(result.summary).toContain("상대 전적");
    expect(result.summary).toContain("KIA");
  });

  it("박빙 태그 임계 = NEUTRAL_LO/HI source (silent drift 차단)", () => {
    const inBand = buildGameOverview({
      homeWinProb: NEUTRAL_LO,
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(inBand.tags).toContain("박빙");
    const outBand = buildGameOverview({
      homeWinProb: NEUTRAL_LO - 0.001,
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(outBand.tags).not.toContain("박빙");
    const inBandHi = buildGameOverview({
      homeWinProb: NEUTRAL_HI,
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(inBandHi.tags).toContain("박빙");
  });
});

describe("buildGameOverview — tag/summary 임계값 align (silent drift 차단)", () => {
  it("박빙 boundary (prob=0.55, marginPp=10): 박빙 태그 + 접전 서술", () => {
    const result = buildGameOverview({
      homeWinProb: 0.55,
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(result.tags).toContain("박빙");
    expect(result.summary).toContain("10%p의 접전");
    expect(result.summary).not.toContain("앞선다");
    expect(result.summary).not.toContain("크게 앞서는");
  });

  it("회색지대 (prob=0.56, marginPp=12): 태그 0건 + 중립 '앞선다'", () => {
    const result = buildGameOverview({
      homeWinProb: 0.56,
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(result.tags).not.toContain("박빙");
    expect(result.tags).not.toContain("우세 뚜렷");
    expect(result.summary).toContain("12%p 앞선다");
    expect(result.summary).not.toContain("크게 앞서는");
    expect(result.summary).not.toContain("접전");
  });

  it("회색지대 (prob=0.58, marginPp=16): 태그 0건이면 '크게 앞서는' 표현 X", () => {
    const result = buildGameOverview({
      homeWinProb: 0.58,
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(result.tags).not.toContain("박빙");
    expect(result.tags).not.toContain("우세 뚜렷");
    expect(result.summary).toContain("16%p 앞선다");
    expect(result.summary).not.toContain("크게 앞서는");
  });

  it("우세 뚜렷 boundary (prob=0.6, marginPp=20): 우세 태그 + 큰 우세 서술", () => {
    const result = buildGameOverview({
      homeWinProb: 0.6,
      homeTeamName: "LG",
      awayTeamName: "한화",
    });
    expect(result.tags).toContain("우세 뚜렷");
    expect(result.summary).toContain("20%p 크게 앞서는 우세 경기");
  });
});

describe("buildGameOverview — wave-351 Elo 강세 배지 (silent drift 차단)", () => {
  it("홈팀 Elo 50+ 우위: 홈팀 Elo 강세 태그", () => {
    const result = buildGameOverview({
      homeWinProb: 0.55,
      homeElo: 1560,
      awayElo: 1500,
      homeTeamName: "KIA",
      awayTeamName: "NC",
    });
    expect(result.tags).toContain("KIA Elo 강세");
    expect(result.tags).not.toContain("NC Elo 강세");
  });

  it("원정팀 Elo 50+ 우위: 원정팀 Elo 강세 태그", () => {
    const result = buildGameOverview({
      homeWinProb: 0.45,
      homeElo: 1490,
      awayElo: 1550,
      homeTeamName: "삼성",
      awayTeamName: "LG",
    });
    expect(result.tags).toContain("LG Elo 강세");
    expect(result.tags).not.toContain("삼성 Elo 강세");
  });

  it("Elo 차이 49 (< 50): 태그 미표시", () => {
    const result = buildGameOverview({
      homeWinProb: 0.52,
      homeElo: 1549,
      awayElo: 1500,
      homeTeamName: "두산",
      awayTeamName: "키움",
    });
    expect(result.tags).not.toContain("두산 Elo 강세");
    expect(result.tags).not.toContain("키움 Elo 강세");
  });

  it("Elo 정확히 50: 홈팀 강세 태그 표시 (경계값)", () => {
    const result = buildGameOverview({
      homeWinProb: 0.54,
      homeElo: 1550,
      awayElo: 1500,
      homeTeamName: "SSG",
      awayTeamName: "롯데",
    });
    expect(result.tags).toContain("SSG Elo 강세");
  });

  it("Elo null: 태그 미표시", () => {
    const result = buildGameOverview({
      homeWinProb: 0.55,
      homeElo: null,
      awayElo: 1500,
      homeTeamName: "한화",
      awayTeamName: "KT",
    });
    expect(result.tags).not.toContain("한화 Elo 강세");
    expect(result.tags).not.toContain("KT Elo 강세");
  });
});

describe("buildGameOverview — wave-352 상수 추출 silent drift 차단", () => {
  it("OVERVIEW_CLOSE_PP 파생: (NEUTRAL_HI - 0.5) * FACTOR_CONTRIBUTION_SCALE = 10", () => {
    const derived = Math.round((NEUTRAL_HI - 0.5) * FACTOR_CONTRIBUTION_SCALE);
    expect(derived).toBe(10);
  });

  it("OVERVIEW_DOMINANT_PP 파생: (WIN_PROB_DOMINANT_HI - 0.5) * FACTOR_CONTRIBUTION_SCALE = 20", () => {
    const derived = Math.round((WIN_PROB_DOMINANT_HI - 0.5) * FACTOR_CONTRIBUTION_SCALE);
    expect(derived).toBe(20);
  });

  it("park_factor narrative — PARK_FACTOR_NARRATIVE_HITTER_MIN 경계 (1.02): 타자 친화 미표시", () => {
    const result = explainFactor({
      key: "park_factor",
      factorValue: 0.54,
      details: { parkFactor: PARK_FACTOR_NARRATIVE_HITTER_MIN },
      homeTeamName: "LG",
      awayTeamName: "두산",
    });
    expect(result.narrative).toBe("중립 구장. 구장 보정 영향 최소.");
  });

  it("park_factor narrative — PARK_FACTOR_NARRATIVE_HITTER_MIN 초과 (1.03): 타자 친화 표시", () => {
    const result = explainFactor({
      key: "park_factor",
      factorValue: 0.56,
      details: { parkFactor: PARK_FACTOR_NARRATIVE_HITTER_MIN + 0.01 },
      homeTeamName: "LG",
      awayTeamName: "두산",
    });
    expect(result.narrative).toContain("타자 친화 구장");
  });

  it("park_factor narrative — PARK_FACTOR_NARRATIVE_PITCHER_MAX 경계 (0.98): 투수 친화 미표시", () => {
    const result = explainFactor({
      key: "park_factor",
      factorValue: 0.46,
      details: { parkFactor: PARK_FACTOR_NARRATIVE_PITCHER_MAX },
      homeTeamName: "LG",
      awayTeamName: "두산",
    });
    expect(result.narrative).toBe("중립 구장. 구장 보정 영향 최소.");
  });

  it("park_factor narrative — PARK_FACTOR_NARRATIVE_PITCHER_MAX 미만 (0.97): 투수 친화 표시", () => {
    const result = explainFactor({
      key: "park_factor",
      factorValue: 0.44,
      details: { parkFactor: PARK_FACTOR_NARRATIVE_PITCHER_MAX - 0.01 },
      homeTeamName: "LG",
      awayTeamName: "두산",
    });
    expect(result.narrative).toContain("투수 친화 구장");
  });

  it("H2H narrative — gap < H2H_NARRATIVE_DOMINANT_PCT_GAP (19pp): 강세 문구 미추가", () => {
    const h2hRate = (50 + (H2H_NARRATIVE_DOMINANT_PCT_GAP - 1)) / 100;
    const result = buildGameOverview({
      homeWinProb: 0.52,
      homeTeamName: "LG",
      awayTeamName: "두산",
      h2hRate,
    });
    expect(result.summary).not.toContain("승률로 강세");
  });

  it("H2H narrative — gap >= H2H_NARRATIVE_DOMINANT_PCT_GAP (20pp): 강세 문구 추가", () => {
    const h2hRate = (50 + H2H_NARRATIVE_DOMINANT_PCT_GAP) / 100;
    const result = buildGameOverview({
      homeWinProb: 0.52,
      homeTeamName: "LG",
      awayTeamName: "두산",
      h2hRate,
    });
    expect(result.summary).toContain("승률로 강세");
  });
});
