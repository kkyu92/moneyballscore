/**
 * 골든 클린 세트 — Phase v4-2 페르소나·validator 회귀 방어선
 *
 * 5팀(파크팩터 다양성) × 4시나리오(프리뷰 홈유리/원정유리/접전/데이터결측) = 20케이스
 *
 * 각 케이스는 (1) team-agent의 runTeamAgent를 vi.mock된 callLLM과 함께 실행
 * (2) 프롬프트 조립 검증 + validator 통과 확인을 한 번에.
 *
 * 실패 시나리오: 내러티브 어휘·금칙어·선수명 발명·환각 숫자.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TeamCode } from '@moneyball/shared';
import type { GameContext, TeamArgument } from '../agents/types';

vi.mock('../agents/llm', () => ({
  callLLM: vi.fn(),
}));

import { callLLM } from '../agents/llm';
import { runTeamAgent } from '../agents/team-agent';
import { BASE_PROMPT, HOME_ROLE, AWAY_ROLE, PERSONA_VERSION } from '../agents/personas';

// ============================================
// 5개 팀 — 파크팩터 다양성 (극투수친화 ~ 극타자친화)
// ============================================
const GOLDEN_TEAMS: Array<{ home: TeamCode; away: TeamCode; hSp: string; aSp: string }> = [
  { home: 'WO', away: 'SS', hSp: '안우진', aSp: '원태인' }, // 92 vs 108 극단 대비
  { home: 'LG', away: 'OB', hSp: '임찬규', aSp: '곽빈' },   // 잠실 공유
  { home: 'HT', away: 'NC', hSp: '양현종', aSp: '구창모' }, // 중립 vs 중립
  { home: 'SK', away: 'LT', hSp: '김광현', aSp: '박세웅' }, // 105 vs 103 모두 타자친화
  { home: 'KT', away: 'HH', hSp: '고영표', aSp: '문동주' }, // 98 vs 101 근접
];

// ============================================
// 4개 시나리오 빌더
// ============================================
type Scenario = 'home_favored' | 'away_favored' | 'tossup' | 'missing_data';

function makeScenario(
  home: TeamCode,
  away: TeamCode,
  hSp: string,
  aSp: string,
  scenario: Scenario
): GameContext {
  const base: GameContext = {
    game: {
      date: '2026-04-15',
      homeTeam: home,
      awayTeam: away,
      gameTime: '18:30',
      stadium: '경기장',
      homeSP: hSp,
      awaySP: aSp,
      status: 'scheduled',
      externalGameId: `KBOG-${home}-${away}`,
    },
    homeSPStats: { name: hSp, team: home, fip: 3.5, xfip: 3.7, era: 3.4, innings: 80, war: 2.0, kPer9: 8.0 },
    awaySPStats: { name: aSp, team: away, fip: 3.5, xfip: 3.7, era: 3.4, innings: 80, war: 2.0, kPer9: 8.0 },
    homeTeamStats: { team: home, woba: 0.330, bullpenFip: 4.00, totalWar: 16.0, sfr: 0.0 },
    awayTeamStats: { team: away, woba: 0.330, bullpenFip: 4.00, totalWar: 16.0, sfr: 0.0 },
    homeElo: { team: home, elo: 1500, winPct: 0.5 },
    awayElo: { team: away, elo: 1500, winPct: 0.5 },
    headToHead: { wins: 5, losses: 5 },
    homeRecentForm: 0.5,
    awayRecentForm: 0.5,
    parkFactor: 1.0,
  };

  switch (scenario) {
    case 'home_favored':
      base.homeSPStats!.fip = 2.8;
      base.homeTeamStats.woba = 0.350;
      base.homeElo.elo = 1580;
      base.homeRecentForm = 0.8;
      break;
    case 'away_favored':
      base.awaySPStats!.fip = 2.8;
      base.awayTeamStats.woba = 0.350;
      base.awayElo.elo = 1580;
      base.awayRecentForm = 0.8;
      break;
    case 'tossup':
      // 모든 값 동일, 접전
      break;
    case 'missing_data':
      base.homeSPStats = null;
      break;
  }
  return base;
}

// ============================================
// Validator-clean 응답 생성기 (주입 블록 수치만 사용)
// ============================================
function cleanResponse(team: TeamCode, ctx: GameContext): TeamArgument {
  const isHome = ctx.game.homeTeam === team;
  const mySp = isHome ? ctx.homeSPStats : ctx.awaySPStats;
  const myStats = isHome ? ctx.homeTeamStats : ctx.awayTeamStats;
  const oppStats = isHome ? ctx.awayTeamStats : ctx.homeTeamStats;
  const myElo = isHome ? ctx.homeElo : ctx.awayElo;

  const fipStr = mySp ? `FIP ${mySp.fip}` : '선발 미확정';
  return {
    team,
    strengths: [
      `${fipStr} 우위`,
      `팀 wOBA ${myStats.woba} 대비 상대 ${oppStats.woba}`,
      `Elo ${myElo.elo} 격차`,
    ],
    opponentWeaknesses: [
      `상대 불펜 FIP ${oppStats.bullpenFip}`,
      `상대 wOBA ${oppStats.woba} 대비 낮음`,
    ],
    keyFactor: '선발 매치업',
    confidence: 0.55,
    reasoning: `파크팩터 ${ctx.parkFactor} 조건에서 ${fipStr} 우위. 팀 wOBA ${myStats.woba} > 상대 ${oppStats.woba}. Elo ${myElo.elo} 격차 기여.`,
  };
}

function mockSuccess<T>(data: T) {
  return { success: true as const, data, error: null, model: 'haiku', tokensUsed: 100, durationMs: 10 };
}

// ============================================
// 골든 세트 실행
// ============================================
describe('골든 클린 세트 — 5팀 × 4시나리오 = 20케이스', () => {
  const scenarios: Scenario[] = ['home_favored', 'away_favored', 'tossup', 'missing_data'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  for (const { home, away, hSp, aSp } of GOLDEN_TEAMS) {
    for (const scenario of scenarios) {
      it(`${home} vs ${away} — ${scenario}`, async () => {
        const ctx = makeScenario(home, away, hSp, aSp, scenario);
        const clean = cleanResponse(home, ctx);
        vi.mocked(callLLM).mockResolvedValue(mockSuccess(clean));

        const result = await runTeamAgent(home, ctx);

        // 1. Validator 통과 → success=true 유지
        expect(result.success).toBe(true);
        expect(result.data).toEqual(clean);
        expect(result.error).toBeNull();

        // 2. 시스템 프롬프트에 페르소나 블록 포함 (role 분기 확인)
        const callArg = vi.mocked(callLLM).mock.calls[0][0];
        expect(callArg.systemPrompt).toContain(BASE_PROMPT.slice(0, 30));
        expect(callArg.systemPrompt).toContain(HOME_ROLE.slice(0, 30));
        expect(callArg.systemPrompt).not.toContain(AWAY_ROLE.slice(0, 30));
        expect(callArg.model).toBe('haiku');

        // 3. TEAM_PROFILES 내러티브 어휘 없음 (리팩터 증거)
        const legacyNarratives = ['인천 문학', '양현종 등 베테랑', '젊은 유망주', '팬 열기'];
        for (const n of legacyNarratives) {
          expect(callArg.systemPrompt).not.toContain(n);
        }
      });
    }
  }

  it('PERSONA_VERSION 상수 검증', () => {
    expect(PERSONA_VERSION).toBe('v2-persona4');
  });

  // 추가: validator reject 시 fallback 동작
  it('validator reject (금칙어 3건) → success=false 전환', async () => {
    const ctx = makeScenario('LG', 'OB', '임찬규', '곽빈', 'tossup');
    const polluted: TeamArgument = {
      team: 'LG',
      strengths: ['왕조의 부활', '팬심 절정', '전통적으로 강함'],
      opponentWeaknesses: ['멘탈 약점'],
      keyFactor: '자신감',
      confidence: 0.6,
      reasoning: '왕조의 귀환. 팬심이 결정적. 전통적으로 LG 우세.',
    };
    vi.mocked(callLLM).mockResolvedValue(mockSuccess(polluted));

    const result = await runTeamAgent('LG', ctx);
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('validator');
  });

  it('validator reject (환각 숫자) → success=false', async () => {
    const ctx = makeScenario('LG', 'OB', '임찬규', '곽빈', 'tossup');
    const hallucinated: TeamArgument = {
      team: 'LG',
      strengths: ['임찬규 FIP 0.99 압도적'],
      opponentWeaknesses: ['상대 wOBA 0.99'],
      keyFactor: '선발',
      confidence: 0.7,
      reasoning: '임찬규 FIP 0.99로 역대급. 상대 wOBA 0.99 수준.',
    };
    vi.mocked(callLLM).mockResolvedValue(mockSuccess(hallucinated));

    const result = await runTeamAgent('LG', ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('hallucinated');
  });
});
