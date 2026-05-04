import { describe, it, expect } from 'vitest';
import type { GameContext, TeamArgument } from '../agents/types';
import {
  validateTeamArgument,
  checkHallucinatedNumbers,
  checkInventedPlayerNames,
  checkBannedPhrases,
  checkClaimTypes,
  buildInjectionText,
  resolveValidationMode,
  validateJudgeReasoning,
  maskViolatedReasoning,
  notifyValidationViolations,
  HARD_LIMIT,
  WARN_LIMIT,
  WARN_LIMIT_LENIENT,
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

  it('HARD_LIMIT=0, WARN_LIMIT=2, WARN_LIMIT_LENIENT=5 상수 노출 검증', () => {
    expect(HARD_LIMIT).toBe(0);
    expect(WARN_LIMIT).toBe(2);
    expect(WARN_LIMIT_LENIENT).toBe(5);
  });
});

// ============================================
// v4-3 Task 0: lenient 모드 + NODE_ENV 가드
// ============================================
describe('validateTeamArgument lenient mode', () => {
  const ctx = makeContext();

  it('strict: 선수명 발명 1건 → reject (hard 유지)', () => {
    const arg = makeArg({
      reasoning: '박선수가 등판 FIP 3.2 기록. wOBA 0.340 우세.',
    });
    const result = validateTeamArgument(arg, ctx, 'strict');
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.type === 'invented_player_name' && v.severity === 'hard')).toBe(true);
  });

  it('lenient: 선수명 발명 1건 → warn으로 강등, ok=true (warn 1개는 limit 내)', () => {
    const arg = makeArg({
      reasoning: '박선수가 등판 FIP 3.2 기록. wOBA 0.340 우세.',
    });
    const result = validateTeamArgument(arg, ctx, 'lenient');
    expect(result.ok).toBe(true);
    expect(result.violations.some((v) => v.type === 'invented_player_name' && v.severity === 'warn')).toBe(true);
  });

  it('lenient: 환각 숫자는 여전히 hard → reject', () => {
    const arg = makeArg({
      reasoning: '임찬규 FIP 9.99 xFIP 8.88 압도. wOBA 0.777 격차.',
    });
    const result = validateTeamArgument(arg, ctx, 'lenient');
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.type === 'hallucinated_number' && v.severity === 'hard')).toBe(true);
  });

  it('lenient: 경고 5건 통과, 6건 reject (WARN_LIMIT_LENIENT 경계)', () => {
    // 5개 금칙어 포함
    const arg5 = makeArg({
      reasoning: '왕조 팬심 멘탈 전통적으로 자신감. FIP 3.2 우세. wOBA 0.340.',
    });
    const r5 = validateTeamArgument(arg5, ctx, 'lenient');
    // warn 카운트는 금칙어 + (선수명 발명 있을 시) + (claim-type) — 이 케이스는 금칙어 5건만
    const warnCount5 = r5.violations.filter((v) => v.severity === 'warn').length;
    expect(warnCount5).toBeLessThanOrEqual(WARN_LIMIT_LENIENT);
    expect(r5.ok).toBe(true);

    // 6건 이상 (금칙어 5 + 선수명 발명 1 = 6). 주격조사 "가" 필수
    const arg6 = makeArg({
      reasoning: '왕조 팬심 멘탈 전통적으로 자신감. 박선수가 등판 FIP 3.2.',
    });
    const r6 = validateTeamArgument(arg6, ctx, 'lenient');
    const warnCount6 = r6.violations.filter((v) => v.severity === 'warn').length;
    expect(warnCount6).toBeGreaterThan(WARN_LIMIT_LENIENT);
    expect(r6.ok).toBe(false);
  });

  it('기본 mode 미지정 시 strict (후방 호환)', () => {
    const arg = makeArg({
      reasoning: '박선수가 등판 FIP 3.2.',
    });
    const result = validateTeamArgument(arg, ctx);
    expect(result.ok).toBe(false); // strict 기본 — 선수명 발명 hard
  });
});

describe('resolveValidationMode (NODE_ENV 가드)', () => {
  it('NODE_ENV=production + LLM_BACKEND=ollama → strict (env leak 방어)', () => {
    expect(resolveValidationMode({ NODE_ENV: 'production', LLM_BACKEND: 'ollama' } as NodeJS.ProcessEnv)).toBe('strict');
  });

  it('NODE_ENV=production 단독 → strict', () => {
    expect(resolveValidationMode({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe('strict');
  });

  it('NODE_ENV=development + LLM_BACKEND=ollama → lenient', () => {
    expect(resolveValidationMode({ NODE_ENV: 'development', LLM_BACKEND: 'ollama' } as NodeJS.ProcessEnv)).toBe('lenient');
  });

  it('NODE_ENV=development + LLM_BACKEND=claude → strict', () => {
    expect(resolveValidationMode({ NODE_ENV: 'development', LLM_BACKEND: 'claude' } as NodeJS.ProcessEnv)).toBe('strict');
  });

  it('환경변수 전부 미설정 → strict (안전 기본)', () => {
    expect(resolveValidationMode({} as NodeJS.ProcessEnv)).toBe('strict');
  });
});

// ============================================
// v4-4 hotfix: false positive 방어
// ============================================
describe('v4-4 hotfix — false positive 방어', () => {
  const ctx = makeContext();

  // === 산술 파생값 허용 ===

  it('주입 수치 차이 계산값 허용 (FIP 4.1 - 3.2 = 0.9)', () => {
    const arg = makeArg({
      reasoning: '임찬규 FIP 3.2, 곽빈 FIP 4.1. 차이 0.9로 임찬규 우위. wOBA 0.34 vs 0.32.',
    });
    const result = validateTeamArgument(arg, ctx, 'strict');
    expect(result.violations.filter((v) => v.type === 'hallucinated_number')).toHaveLength(0);
  });

  it('Elo 차이 계산값 허용 (1550 - 1480 = 70)', () => {
    const arg = makeArg({
      reasoning: 'Elo 1550 vs 1480으로 70 격차. FIP 3.2 우위도 겹침.',
    });
    const result = validateTeamArgument(arg, ctx, 'strict');
    expect(result.violations.filter((v) => v.type === 'hallucinated_number')).toHaveLength(0);
  });

  it('백분율 변환 허용 (0.7 → 70, 0.4 → 40)', () => {
    const arg = makeArg({
      reasoning: '최근폼 70% vs 40% 격차. FIP 3.2 vs 4.1 매치업 우세.',
    });
    const result = validateTeamArgument(arg, ctx, 'strict');
    expect(result.violations.filter((v) => v.type === 'hallucinated_number')).toHaveLength(0);
  });

  it('여전히 환각 숫자는 잡음 (주입에 없는 9.99)', () => {
    const arg = makeArg({
      reasoning: '임찬규 FIP 9.99로 압도적. 3.2는 틀린 수치.',
    });
    const result = validateTeamArgument(arg, ctx, 'strict');
    const hallucinated = result.violations.filter((v) => v.type === 'hallucinated_number');
    expect(hallucinated.length).toBeGreaterThan(0);
  });

  // === 일반 명사 화이트리스트 ===

  it('"가능성이" false positive 방어', () => {
    const arg = makeArg({
      reasoning: '임찬규 FIP 3.2 우위. 승리 가능성이 높아진다. wOBA 0.34.',
    });
    const result = validateTeamArgument(arg, ctx, 'strict');
    const invented = result.violations.filter((v) => v.type === 'invented_player_name');
    expect(invented).toHaveLength(0);
  });

  it('"창출력을" false positive 방어', () => {
    const arg = makeArg({
      reasoning: 'wOBA 0.34로 타선 창출력을 활용. FIP 3.2 기반.',
    });
    const result = validateTeamArgument(arg, ctx, 'strict');
    const invented = result.violations.filter((v) => v.type === 'invented_player_name');
    expect(invented).toHaveLength(0);
  });

  it('"어준다" 동사 활용형 false positive 방어', () => {
    const arg = makeArg({
      reasoning: 'wOBA 0.34가 득점 기회를 열어준다. FIP 3.2 매치업 유리.',
    });
    const result = validateTeamArgument(arg, ctx, 'strict');
    const invented = result.violations.filter((v) => v.type === 'invented_player_name');
    expect(invented).toHaveLength(0);
  });

  it('여전히 진짜 선수명 발명은 잡음 ("박선수가 등판")', () => {
    const arg = makeArg({
      reasoning: '박선수가 등판하여 FIP 3.2. wOBA 0.34.',
    });
    const result = validateTeamArgument(arg, ctx, 'strict');
    const invented = result.violations.filter((v) => v.type === 'invented_player_name');
    expect(invented.length).toBeGreaterThan(0);
  });

  it('"선발" 단독은 verb 아님 ("조건에서 선발 미확정") false positive 방어', () => {
    const arg = makeArg({
      reasoning: '파크팩터 1.02 조건에서 선발 미확정 우위. 팀 wOBA 0.34 > 상대 0.32.',
    });
    const result = validateTeamArgument(arg, ctx, 'strict');
    const invented = result.violations.filter((v) => v.type === 'invented_player_name');
    expect(invented).toHaveLength(0);
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

// ============================================
// P1 — validateJudgeReasoning (cycle 27, spec 2026-05-04 갭 A)
// ============================================
describe('validateJudgeReasoning', () => {
  it('주입 데이터 일치 reasoning → ok=true', () => {
    const ctx = makeContext();
    const reasoning = '임찬규 FIP 3.2 가 곽빈 FIP 4.1 보다 우위. wOBA 0.340 vs 0.320.';
    const result = validateJudgeReasoning(reasoning, ctx, 'strict');
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('환각 숫자 → hard 위반 + ok=false', () => {
    const ctx = makeContext();
    const reasoning = '임찬규 FIP 3.99 우위. wOBA 0.555 격차.';
    const result = validateJudgeReasoning(reasoning, ctx, 'strict');
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.type === 'hallucinated_number')).toBe(true);
  });

  it('발명 선수명 → hard 위반 (strict)', () => {
    const ctx = makeContext();
    const reasoning = '김철수가 등판하면 흐름이 바뀐다.';
    const result = validateJudgeReasoning(reasoning, ctx, 'strict');
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.type === 'invented_player_name')).toBe(true);
  });

  it('발명 선수명 → warn 강등 (lenient)', () => {
    const ctx = makeContext();
    const reasoning = '김철수가 등판하면 흐름이 바뀐다.';
    const result = validateJudgeReasoning(reasoning, ctx, 'lenient');
    const inv = result.violations.find((v) => v.type === 'invented_player_name');
    expect(inv?.severity).toBe('warn');
  });

  it('금칙어 → warn 위반', () => {
    const ctx = makeContext();
    const reasoning = '잠실 LG 왕조의 시대가 도래한다.';
    const result = validateJudgeReasoning(reasoning, ctx, 'strict');
    expect(result.violations.some((v) => v.type === 'banned_phrase')).toBe(true);
  });

  it('claim-type signal 부재 reasoning → 통과 (블로그 톤 false positive 차단)', () => {
    const ctx = makeContext();
    const reasoning = '오늘 경기는 홈팀이 유리해 보입니다.';
    const result = validateJudgeReasoning(reasoning, ctx, 'strict');
    expect(result.violations.some((v) => v.type === 'unclassified_claim')).toBe(false);
  });

  it('빈 reasoning → 위반 0건 + ok=true', () => {
    const ctx = makeContext();
    const result = validateJudgeReasoning('', ctx, 'strict');
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

// ============================================
// P1 — maskViolatedReasoning
// ============================================
describe('maskViolatedReasoning', () => {
  it('환각 숫자 → [검증실패:환각숫자] mask', () => {
    const ctx = makeContext();
    const reasoning = '임찬규 FIP 3.99 우위.';
    const result = validateJudgeReasoning(reasoning, ctx, 'strict');
    const masked = maskViolatedReasoning(reasoning, result.violations);
    expect(masked).toContain('[검증실패:환각숫자]');
    expect(masked).not.toContain('3.99');
  });

  it('발명 선수명 → [검증실패:발명선수] mask', () => {
    const ctx = makeContext();
    const reasoning = '김철수가 등판하면 흐름이 바뀐다.';
    const result = validateJudgeReasoning(reasoning, ctx, 'strict');
    const masked = maskViolatedReasoning(reasoning, result.violations);
    expect(masked).toContain('[검증실패:발명선수]');
    expect(masked).not.toContain('김철수');
  });

  it('금칙어 → [검증실패:금칙어] mask', () => {
    const ctx = makeContext();
    const reasoning = '잠실 왕조의 시대가 도래한다.';
    const result = validateJudgeReasoning(reasoning, ctx, 'strict');
    const masked = maskViolatedReasoning(reasoning, result.violations);
    expect(masked).toContain('[검증실패:금칙어]');
    expect(masked).not.toContain('왕조');
  });

  it('위반 0건 → 원본 유지', () => {
    const reasoning = 'FIP 3.2 우위.';
    const masked = maskViolatedReasoning(reasoning, []);
    expect(masked).toBe(reasoning);
  });

  it('주변 정상 텍스트 보존 (fallback 한 줄 강제 X)', () => {
    const ctx = makeContext();
    const reasoning = '임찬규 FIP 3.2 우위지만 FIP 9.99 같은 환각도 있다. 결론: LG 우세.';
    const result = validateJudgeReasoning(reasoning, ctx, 'strict');
    const masked = maskViolatedReasoning(reasoning, result.violations);
    expect(masked).toContain('임찬규 FIP 3.2');
    expect(masked).toContain('결론: LG 우세');
    expect(masked).toContain('[검증실패:환각숫자]');
  });
});

// ============================================
// P2 — notifyValidationViolations (Sentry tag 연계)
// ============================================
describe('notifyValidationViolations', () => {
  it('NODE_ENV=test → Sentry 호출 skip (resolve)', async () => {
    const result = { ok: false, violations: [
      { type: 'hallucinated_number' as const, severity: 'hard' as const, detail: 'test' },
    ]};
    await expect(
      notifyValidationViolations(result, { agent: 'judge', gameId: 'test' })
    ).resolves.toBeUndefined();
  });

  it('위반 0건 → silent return', async () => {
    const result = { ok: true, violations: [] };
    await expect(
      notifyValidationViolations(result, { agent: 'judge', gameId: 'test' })
    ).resolves.toBeUndefined();
  });

  it('Sentry 미설치 환경에서도 throw X', async () => {
    const result = { ok: false, violations: [
      { type: 'invented_player_name' as const, severity: 'hard' as const, detail: 'mock' },
    ]};
    await expect(
      notifyValidationViolations(result, { agent: 'team', gameId: null, backend: 'ollama' })
    ).resolves.toBeUndefined();
  });
});
