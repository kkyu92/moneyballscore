/**
 * agent-context.ts tests — plan #23 Step 3.
 *
 * 검증 축:
 *   - buildAgentContext: GameContext → AgentContext 변환 정합 (ACTIVE_FACTOR_KEYS metric 박제,
 *     선발 null 시 sp_fip/xfip skip, h2h total=0 시 50/50 fallback, park context 동기)
 *   - renderContextForLLM: 필수 섹션 박제 (게임 메타 / 도메인 hint / 정량 메트릭 /
 *     H2H + 최근 폼) + 라이벌리 매치 시 hint 동봉
 *   - MetricRegistry reference 동봉 (drift X)
 *   - domain.ts render helper 재사용 (라이벌리 X 시 hint 자동 제외)
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_WEIGHTS } from '@moneyball/shared';
import { buildAgentContext, renderContextForLLM } from '../agent-context';
import { MetricRegistry } from '../metrics';
import { KBO_PARKS } from '../domain';
import type { GameContext } from '../../agents/types';

function makeCtx(overrides: Partial<GameContext> = {}): GameContext {
  const base: GameContext = {
    game: {
      date: '2026-06-19',
      homeTeam: 'LG',
      awayTeam: 'OB',
      gameTime: '18:30',
      stadium: '잠실',
      homeSP: '엘선발',
      awaySP: '두선발',
      status: 'scheduled',
      externalGameId: 'TEST-001',
    },
    homeSPStats: { name: '엘선발', team: 'LG', fip: 3.40, xfip: 3.80, war: 2.1, era: 3.20, innings: 80, kPer9: 8.5 },
    awaySPStats: { name: '두선발', team: 'OB', fip: 4.10, xfip: 4.20, war: 1.5, era: 4.00, innings: 75, kPer9: 7.4 },
    homeTeamStats: { team: 'LG', woba: 0.330, bullpenFip: 3.80, totalWar: 25.0, sfr: 5 },
    awayTeamStats: { team: 'OB', woba: 0.310, bullpenFip: 4.20, totalWar: 18.0, sfr: -3 },
    homeElo: { team: 'LG', elo: 1560, winPct: 0.58 },
    awayElo: { team: 'OB', elo: 1490, winPct: 0.48 },
    homeRecentForm: 0.7,
    awayRecentForm: 0.4,
    headToHead: { wins: 3, losses: 2 },
    parkFactor: 0.95,
  };
  return { ...base, ...overrides };
}

describe('buildAgentContext — 게임 메타', () => {
  it('externalGameId / 날짜 / 시간 / 팀 / 선발 박제', () => {
    const ac = buildAgentContext(makeCtx());
    expect(ac.game.external_game_id).toBe('TEST-001');
    expect(ac.game.date).toBe('2026-06-19');
    expect(ac.game.time).toBe('18:30');
    expect(ac.game.home_team).toBe('LG');
    expect(ac.game.away_team).toBe('OB');
    expect(ac.game.home_sp).toBe('엘선발');
    expect(ac.game.away_sp).toBe('두선발');
  });

  it('선발 미확정 시 null 박제', () => {
    const ctx = makeCtx();
    const { homeSP, awaySP, ...rest } = ctx.game;
    void homeSP;
    void awaySP;
    const ac = buildAgentContext({ ...ctx, game: { ...rest } });
    expect(ac.game.home_sp).toBeNull();
    expect(ac.game.away_sp).toBeNull();
  });
});

describe('buildAgentContext — metrics', () => {
  it('production 10팩터 박제 (shadow 2팩터 제외)', () => {
    const ac = buildAgentContext(makeCtx());
    expect(ac.metrics.sp_fip).toBeDefined();
    expect(ac.metrics.sp_xfip).toBeDefined();
    expect(ac.metrics.lineup_woba).toBeDefined();
    expect(ac.metrics.bullpen_fip).toBeDefined();
    expect(ac.metrics.recent_form).toBeDefined();
    expect(ac.metrics.war).toBeDefined();
    expect(ac.metrics.head_to_head).toBeDefined();
    expect(ac.metrics.park_factor).toBeDefined();
    expect(ac.metrics.elo).toBeDefined();
    expect(ac.metrics.sfr).toBeDefined();
    expect(ac.metrics.park_weather).toBeUndefined();
    expect(ac.metrics.umpire_sz).toBeUndefined();
  });

  it('sp_fip / sp_xfip = 선발 stats 부재 시 skip', () => {
    const ac = buildAgentContext(makeCtx({ homeSPStats: null, awaySPStats: null }));
    expect(ac.metrics.sp_fip).toBeUndefined();
    expect(ac.metrics.sp_xfip).toBeUndefined();
    expect(ac.metrics.lineup_woba).toBeDefined();
  });

  it('metric 측정치 값 정합 (FIP / wOBA / Elo)', () => {
    const ac = buildAgentContext(makeCtx());
    expect(ac.metrics.sp_fip?.home).toBe(3.40);
    expect(ac.metrics.sp_fip?.away).toBe(4.10);
    expect(ac.metrics.lineup_woba?.home).toBe(0.330);
    expect(ac.metrics.elo?.home).toBe(1560);
  });

  it('recent_form = 0~1 → 0~100 percent 환산', () => {
    const ac = buildAgentContext(makeCtx());
    expect(ac.metrics.recent_form?.home).toBe(70.0);
    expect(ac.metrics.recent_form?.away).toBe(40.0);
  });

  it('head_to_head = 홈 승률 percent 환산 + 합 100', () => {
    const ac = buildAgentContext(makeCtx());
    expect(ac.metrics.head_to_head?.home).toBe(60.0);
    expect(ac.metrics.head_to_head?.away).toBe(40.0);
  });

  it('h2h total=0 시 50/50 fallback', () => {
    const ac = buildAgentContext(makeCtx({ headToHead: { wins: 0, losses: 0 } }));
    expect(ac.metrics.head_to_head?.home).toBe(50.0);
    expect(ac.metrics.head_to_head?.away).toBe(50.0);
    expect(ac.h2h.total).toBe(0);
  });

  it('park_factor = 양 팀 동일 (같은 구장)', () => {
    const ac = buildAgentContext(makeCtx({ parkFactor: 1.08 }));
    expect(ac.metrics.park_factor?.home).toBe(1.08);
    expect(ac.metrics.park_factor?.away).toBe(1.08);
  });

  it('MetricRegistry reference 동봉 (drift X)', () => {
    const ac = buildAgentContext(makeCtx());
    expect(ac.metrics.sp_fip?.metric).toBe(MetricRegistry.sp_fip);
    expect(ac.metrics.elo?.metric).toBe(MetricRegistry.elo);
    expect(ac.metrics.sp_fip?.metric.weight_v18).toBe(DEFAULT_WEIGHTS.sp_fip);
  });
});

describe('buildAgentContext — park + domain_hints', () => {
  it('park = KBO_PARKS[home_team] 동기', () => {
    const ac = buildAgentContext(makeCtx({ game: { ...makeCtx().game, homeTeam: 'HT' } }));
    expect(ac.park).toBe(KBO_PARKS.HT);
  });

  it('도메인 hint 4종 (구장 / 시즌 / 시간 윈도우 + 라이벌리 시 추가)', () => {
    const ac = buildAgentContext(makeCtx({ game: { ...makeCtx().game, homeTeam: 'LG', awayTeam: 'OB' } }));
    expect(ac.domain_hints.length).toBe(4);
    expect(ac.domain_hints.some((h) => h.includes('라이벌리'))).toBe(true);
  });

  it('라이벌리 X 시 hint 3종만', () => {
    const ac = buildAgentContext(makeCtx({ game: { ...makeCtx().game, homeTeam: 'HT', awayTeam: 'KT' } }));
    expect(ac.domain_hints.length).toBe(3);
    expect(ac.domain_hints.some((h) => h.includes('라이벌리'))).toBe(false);
  });
});

describe('renderContextForLLM', () => {
  it('필수 섹션 4종 박제', () => {
    const out = renderContextForLLM(buildAgentContext(makeCtx()));
    expect(out).toContain('[경기]');
    expect(out).toContain('[도메인 컨텍스트]');
    expect(out).toContain('[정량 메트릭');
    expect(out).toContain('[상대 전적');
  });

  it('10팩터 metric 한 줄씩 박제', () => {
    const out = renderContextForLLM(buildAgentContext(makeCtx()));
    expect(out).toContain('선발 FIP');
    expect(out).toContain('타선 wOBA');
    expect(out).toContain('Elo 레이팅');
    expect(out).toContain('수비 SFR');
  });

  it('홈/원정 측정치 한 줄 안 박제', () => {
    const out = renderContextForLLM(buildAgentContext(makeCtx()));
    expect(out).toMatch(/홈 3\.400.*원정 4\.100/);
    expect(out).toMatch(/홈 1560.*원정 1490/);
  });

  it('가중치 percent 박제', () => {
    const out = renderContextForLLM(buildAgentContext(makeCtx()));
    expect(out).toContain('가중치 15.0%');
  });

  it('선발 미확정 시 "미정" 박제', () => {
    const ctx = makeCtx();
    const { homeSP, awaySP, ...rest } = ctx.game;
    void homeSP;
    void awaySP;
    const out = renderContextForLLM(buildAgentContext({ ...ctx, game: { ...rest } }));
    expect(out).toMatch(/선발: 미정 \(홈\) \/ 미정 \(원정\)/);
  });

  it('token budget — 약 800~1500 chars (한국어 prompt 기준)', () => {
    const out = renderContextForLLM(buildAgentContext(makeCtx()));
    expect(out.length).toBeGreaterThan(500);
    expect(out.length).toBeLessThan(2000);
  });
});
