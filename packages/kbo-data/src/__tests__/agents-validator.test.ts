import { describe, it, expect } from 'vitest';
import type { GameContext, TeamArgument } from '../agents/types';
import {
  validateTeamArgument,
  checkHallucinatedNumbers,
  checkInventedPlayerNames,
  checkBannedPhrases,
  checkClaimTypes,
  buildInjectionText,
  HARD_LIMIT,
  WARN_LIMIT,
} from '../agents/validator';

function makeContext(): GameContext {
  return {
    game: {
      date: '2026-04-15',
      homeTeam: 'LG',
      awayTeam: 'OB',
      gameTime: '18:30',
      stadium: '잠실',
      homeSP: '임찬규',
      awaySP: '곽빈',
      status: 'scheduled',
      externalGameId: 'KBOG20260415LGT0',
    },
    homeSPStats: { name: '임찬규', team: 'LG', fip: 3.2, xfip: 3.5, era: 3.1, innings: 85, war: 2.5, kPer9: 8.5 },
    awaySPStats: { name: '곽빈', team: 'OB', fip: 4.1, xfip: 4.3, era: 4.2, innings: 70, war: 1.2, kPer9: 6.8 },
    homeTeamStats: { team: 'LG', woba: 0.340, bullpenFip: 3.80, totalWar: 18.5, sfr: 2.5 },
    awayTeamStats: { team: 'OB', woba: 0.320, bullpenFip: 4.20, totalWar: 15.0, sfr: -1.0 },
    homeElo: { team: 'LG', elo: 1550, winPct: 0.58 },
    awayElo: { team: 'OB', elo: 1480, winPct: 0.48 },
    headToHead: { wins: 7, losses: 5 },
    homeRecentForm: 0.7,
    awayRecentForm: 0.4,
    parkFactor: 1.02,
  };
}

function makeArg(overrides?: Partial<TeamArgument>): TeamArgument {
  return {
    team: 'LG',
    strengths: ['임찬규 FIP 3.2 우위', '팀 wOBA 0.340 대비 상대 0.320'],
    opponentWeaknesses: ['두산 불펜 FIP 4.20 불안'],
    keyFactor: '선발 매치업',
    reasoning: 'LG 선발 임찬규 FIP 3.2가 결정적. wOBA 격차 0.340 > 0.320. 파크팩터 1.02는 중립.',
    confidence: 0.62,
    ...overrides,
  };
}

// ============================================
// 환각 숫자
// ============================================
describe('checkHallucinatedNumbers', () => {
  const injection = 'FIP 3.2 3.5 4.1 4.3 wOBA 0.340 0.320 Elo 1550 1480';

  it('주입 블록에 있는 숫자만 사용 → 위반 없음', () => {
    const v = checkHallucinatedNumbers('FIP 3.2 대비 4.1 격차', injection);
    expect(v).toHaveLength(0);
  });

  it('주입에 없는 숫자 → 환각 위반', () => {
    const v = checkHallucinatedNumbers('FIP 3.99 우위', injection);
    expect(v).toHaveLength(1);
    expect(v[0].type).toBe('hallucinated_number');
    expect(v[0].severity).toBe('hard');
    expect(v[0].detail).toContain('3.99');
  });

  it('단일 digit 화이트리스트 통과', () => {
    const v = checkHallucinatedNumbers('상위 3팀', injection);
    expect(v).toHaveLength(0);
  });

  it('여러 환각 숫자 → 1건 위반(리스트 포함)', () => {
    const v = checkHallucinatedNumbers('FIP 9.99 wOBA 0.500 WAR 99.9', injection);
    expect(v).toHaveLength(1);
    expect(v[0].detail).toMatch(/9\.99|0\.500|99\.9/);
  });
});

// ============================================
// 선수명 발명
// ============================================
describe('checkInventedPlayerNames', () => {
  const ctx = makeContext();

  it('주입된 선발투수만 언급 → 위반 없음', () => {
    const v = checkInventedPlayerNames('임찬규 FIP 3.2 vs 곽빈', ctx);
    expect(v).toHaveLength(0);
  });

  it('주입에 없는 3자 이름 → 하드 위반', () => {
    const v = checkInventedPlayerNames('임찬규 대신 김광현이 등판', ctx);
    expect(v).toHaveLength(1);
    expect(v[0].type).toBe('invented_player_name');
    expect(v[0].severity).toBe('hard');
    expect(v[0].detail).toContain('김광현');
  });

  it('일반 명사(선발, 타자 등)는 이름으로 오탐하지 않음', () => {
    const v = checkInventedPlayerNames('홈팀 선발 투수 강점', ctx);
    expect(v).toHaveLength(0);
  });
});

// ============================================
// 금칙어
// ============================================
describe('checkBannedPhrases', () => {
  it('정상 문장 → 위반 없음', () => {
    const v = checkBannedPhrases('FIP 3.2가 결정적 우위');
    expect(v).toHaveLength(0);
  });

  it('왕조 금칙어 → 경고', () => {
    const v = checkBannedPhrases('LG 왕조의 복귀');
    expect(v).toHaveLength(1);
    expect(v[0].severity).toBe('warn');
  });

  it('심리 추측(멘탈) → 경고', () => {
    const v = checkBannedPhrases('멘탈이 무너지면서 실점');
    expect(v).toHaveLength(1);
    expect(v[0].detail).toContain('멘탈');
  });

  it('복수 금칙어 → 복수 위반', () => {
    const v = checkBannedPhrases('왕조의 팬심과 전통적으로 이어진 투혼');
    expect(v.length).toBeGreaterThanOrEqual(3);
  });
});

// ============================================
// claim-type 분류
// ============================================
describe('checkClaimTypes', () => {
  it('수치 + 비교 중심 텍스트 → 통과', () => {
    const text = 'FIP 3.2 대비 4.1로 우위. 팩터 기여도도 높음. 상대전적 7승 5패.';
    const v = checkClaimTypes(text);
    expect(v).toHaveLength(0);
  });

  it('전부 감상적·분류 불가 → 경고', () => {
    const text = '투수가 멋지다. 타자도 위대하다. 열기가 뜨겁다. 분위기가 좋다.';
    const v = checkClaimTypes(text);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].severity).toBe('warn');
  });
});

// ============================================
// 통합 validateTeamArgument
// ============================================
describe('validateTeamArgument 통합', () => {
  const ctx = makeContext();

  it('정상 응답 → ok=true', () => {
    const result = validateTeamArgument(makeArg(), ctx);
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('환각 숫자 1개 → ok=false (hard 위반)', () => {
    const arg = makeArg({ reasoning: '임찬규 FIP 9.99 압도적' });
    const result = validateTeamArgument(arg, ctx);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.type === 'hallucinated_number')).toBe(true);
  });

  it('선수명 발명 → ok=false (hard)', () => {
    const arg = makeArg({ reasoning: '김광현이 선발로 등판 예정. FIP 3.2 우위' });
    const result = validateTeamArgument(arg, ctx);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.type === 'invented_player_name')).toBe(true);
  });

  it('금칙어 1건 → 통과 (경고 ≤ 2)', () => {
    const arg = makeArg({ reasoning: 'LG 왕조 부활. FIP 3.2 우위. wOBA 0.340 > 0.320' });
    const result = validateTeamArgument(arg, ctx);
    expect(result.ok).toBe(true);
    expect(result.violations.some((v) => v.type === 'banned_phrase')).toBe(true);
  });

  it('금칙어 3건 → ok=false (경고 초과)', () => {
    const arg = makeArg({
      reasoning: '왕조의 팬심. 멘탈 우위. 전통적으로 FIP 3.2 우세',
    });
    const result = validateTeamArgument(arg, ctx);
    expect(result.ok).toBe(false);
  });

  it('HARD_LIMIT=0, WARN_LIMIT=2 상수 노출 검증', () => {
    expect(HARD_LIMIT).toBe(0);
    expect(WARN_LIMIT).toBe(2);
  });
});

// ============================================
// buildInjectionText
// ============================================
describe('buildInjectionText', () => {
  it('홈/원정 선발투수·팀 스탯·상대전적 포함', () => {
    const text = buildInjectionText(makeContext());
    expect(text).toContain('임찬규');
    expect(text).toContain('곽빈');
    expect(text).toContain('3.2');
    expect(text).toContain('4.1');
    expect(text).toContain('0.34');
    expect(text).toContain('1550');
    expect(text).toContain('7승');
  });

  it('선발 미확정 시 "미확정" 표기', () => {
    const ctx = makeContext();
    ctx.homeSPStats = null;
    const text = buildInjectionText(ctx);
    expect(text).toContain('미확정');
  });
});
