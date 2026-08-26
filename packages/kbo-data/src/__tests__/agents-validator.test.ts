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
  validateFactorAttribution,
  HARD_LIMIT,
  WARN_LIMIT,
  WARN_LIMIT_LENIENT,
  KOREAN_FAMILY_NAMES,
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

  it('주입에 없는 숫자 1개 → 환각 위반 warn 강등 (cycle 884)', () => {
    const v = checkHallucinatedNumbers('FIP 3.99 우위', injection);
    expect(v).toHaveLength(1);
    expect(v[0].type).toBe('hallucinated_number');
    expect(v[0].severity).toBe('warn');
    expect(v[0].detail).toContain('3.99');
  });

  it('주입에 없는 숫자 3개+ → 환각 위반 hard (cycle 884 threshold)', () => {
    const v = checkHallucinatedNumbers('FIP 3.99 xFIP 8.88 wOBA 0.777 격차', injection);
    expect(v).toHaveLength(1);
    expect(v[0].type).toBe('hallucinated_number');
    expect(v[0].severity).toBe('hard');
    expect(v[0].detail).toContain('3.99');
    expect(v[0].detail).toContain('8.88');
    expect(v[0].detail).toContain('0.777');
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

  // cycle 526 regression — silent drift family streak 6축 agent layer 2nd fix.
  // PLAYER_CONTEXT_VERBS 에 noun 류 (타격·삼진·홈런·피칭·완투·세이브) 가 섞여
  // "공격적 타격" "결정적 홈런" 형 일반 어휘 + verb 조합이 highConfidencePattern 으로
  // 잡혀 false positive 가 발생. 본 fix 가 subjectMarkerPattern 의 filter 를
  // highConfidencePattern 에도 동기. 회귀 가드 (asymmetric filtering 재발 차단).
  it('cycle 526: -적 형용사 + verb 명사 → false positive 차단 (isKoreanAdjectivalSuffix)', () => {
    // '천재적' = COMMON_KOREAN_NOUNS 미포함, 3자 + 적 어미. 'verb' 타격 뒤따름.
    const v = checkInventedPlayerNames('천재적 타격을 보임', ctx);
    expect(v).toHaveLength(0);
  });

  it('cycle 526: 분석 어휘(COMMON_KOREAN_NOUNS) + verb 명사 → false positive 차단', () => {
    // '가능성' 분석 어휘 + 'verb' 타격. highConfidencePattern 매칭 후 filter.
    const v = checkInventedPlayerNames('가능성 타격에 의존', ctx);
    expect(v).toHaveLength(0);
  });

  it('cycle 526: 성씨로 시작하는 분석 어휘 + 주격조사 → false positive 차단 (subjectMarkerPattern defense-in-depth)', () => {
    // '안정성이' = '안' 성씨 prefix + '안정성'(COMMON_KOREAN_NOUNS) + 주격조사 '이'.
    // subjectMarkerPattern 매칭 후 filter. cycle 526 이전부터 작동했던 path 회귀 가드.
    const v = checkInventedPlayerNames('안정성이 강한 팀', ctx);
    expect(v).toHaveLength(0);
  });

  // cycle 982 regression — silent drift family validator agent layer 3rd fix.
  // cycle 981 KT@OB / LG@LT / SS@SK 3건 fallback evidence: "두산이"/"전까지"/"최근폼"
  // 같은 일반 명사 + 한국어 조사 조합이 highConfidencePattern `[가-힣]{3}` + verb
  // 매칭으로 invented_player_name false positive 발생. endsWithKoreanParticle filter
  // + COMMON_KOREAN_NOUNS '최근폼' 추가로 본질 차단. 회귀 가드 (재발 차단).
  it('cycle 982: 팀명 + 주격조사 "이" (두산+이) → false positive 차단 (endsWithKoreanParticle)', () => {
    // "두산이" = 팀명 "두산" + 주격조사 "이". 3자 매칭 후 verb 매칭으로 잡힘.
    // 본 filter 가 끝 글자 "이" 조사 감지 → reject.
    const v = checkInventedPlayerNames('두산이 타격에서 강점을 보임', ctx);
    expect(v).toHaveLength(0);
  });

  it('cycle 982: 시간 부사 + 조사 "전+까지" → false positive 차단 (endsWithKoreanParticle)', () => {
    // "전까지" = 시간 부사. 끝 글자 "지" 조사 감지 → reject.
    const v = checkInventedPlayerNames('5회 전까지 타격이 강함', ctx);
    expect(v).toHaveLength(0);
  });

  it('cycle 982: 합성어 "최근폼" + verb → false positive 차단 (COMMON_KOREAN_NOUNS)', () => {
    // "최근폼" = recent form. COMMON_KOREAN_NOUNS 명시 추가.
    const v = checkInventedPlayerNames('최근폼 타격 추세가 우위', ctx);
    expect(v).toHaveLength(0);
  });

  it('cycle 982: 진짜 3자 선수명 (조사 X) → hard 위반 유지 (regression guard)', () => {
    // "김광현" 끝 글자 "현" = 조사 X. fix 가 진짜 이름 매칭 미영향 검증.
    const v = checkInventedPlayerNames('김광현이 등판한다', ctx);
    expect(v).toHaveLength(1);
    expect(v[0].type).toBe('invented_player_name');
    expect(v[0].severity).toBe('hard');
    expect(v[0].detail).toContain('김광현');
  });

  // cycle 986 regression — 야구 도메인 plural / 합성어 false positive 차단.
  // evidence: row 1524 (5/24) "안타들" → invented_player_name:hard 분류.
  // COMMON_KOREAN_NOUNS 에 야구 도메인 plural (X+들) + 감각·전략 합성어 박제.
  it('cycle 986: 야구 plural "안타들" + verb → false positive 차단 (COMMON_KOREAN_NOUNS)', () => {
    const v = checkInventedPlayerNames('안타들 타격 추세가 강함', ctx);
    expect(v).toHaveLength(0);
  });

  it('cycle 986: 야구 plural "홈런들" + verb → false positive 차단', () => {
    const v = checkInventedPlayerNames('홈런들 타격 비중이 높음', ctx);
    expect(v).toHaveLength(0);
  });

  it('cycle 986: 야구 plural "타자들" + verb → false positive 차단', () => {
    const v = checkInventedPlayerNames('타자들 타격감 우위', ctx);
    expect(v).toHaveLength(0);
  });

  it('cycle 986: 야구 감각 합성어 "타격감" + verb → false positive 차단', () => {
    const v = checkInventedPlayerNames('타격감 타격 안정', ctx);
    expect(v).toHaveLength(0);
  });

  it('cycle 986: 야구 운영 합성어 "작전상" + verb → false positive 차단', () => {
    const v = checkInventedPlayerNames('작전상 타격 강조', ctx);
    expect(v).toHaveLength(0);
  });

  // cycle 986 (5/27 cron fire 후속) — 야구 분석 추상 명사 (X+성 접미사) family.
  // evidence: row 1599 (5/27 SS@SK) "우수성" → invented_player_name:hard 분류.
  it('cycle 986: 추상 명사 "우수성" + verb → false positive 차단 (X+성 접미사 family)', () => {
    const v = checkInventedPlayerNames('우수성 타격 분석', ctx);
    expect(v).toHaveLength(0);
  });

  it('cycle 986: 추상 명사 "유리성" + verb → false positive 차단', () => {
    const v = checkInventedPlayerNames('유리성 타격 우위', ctx);
    expect(v).toHaveLength(0);
  });

  it('cycle 986: 추상 명사 "결정성" + verb → false positive 차단', () => {
    const v = checkInventedPlayerNames('결정성 타격 강조', ctx);
    expect(v).toHaveLength(0);
  });

  it('cycle 986: 진짜 인명 "김민성" (성씨+이름 끝 "성") → hard 위반 유지 (regression guard — X+성 일괄 처리 회피 검증)', () => {
    // "김민성" = 김(성씨) + 민성(이름) 3자 — 진짜 인명 패턴. X+성 일괄 처리 시
    // false negative 위험 ↑↑. 화이트리스트 명시화 패턴이 본 case 매칭 유지 검증.
    const v = checkInventedPlayerNames('김민성이 등판한다', ctx);
    expect(v).toHaveLength(1);
    expect(v[0].type).toBe('invented_player_name');
    expect(v[0].severity).toBe('hard');
    expect(v[0].detail).toContain('김민성');
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

  it('환각 숫자 1개 → ok=true warn 강등 (cycle 884)', () => {
    const arg = makeArg({ reasoning: '임찬규 FIP 9.99 압도적' });
    const result = validateTeamArgument(arg, ctx);
    expect(result.ok).toBe(true);
    expect(
      result.violations.some(
        (v) => v.type === 'hallucinated_number' && v.severity === 'warn',
      ),
    ).toBe(true);
  });

  it('환각 숫자 3개+ → ok=false (cycle 884 hard threshold)', () => {
    const arg = makeArg({
      reasoning: '임찬규 FIP 9.99 xFIP 8.88 wOBA 0.777 격차 압도',
    });
    const result = validateTeamArgument(arg, ctx);
    expect(result.ok).toBe(false);
    expect(
      result.violations.some(
        (v) => v.type === 'hallucinated_number' && v.severity === 'hard',
      ),
    ).toBe(true);
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

  // cycle 2630 review-code(heavy) — team-agent.runTeamAgent 는 getRivalryBlock().promptBlock 을
  // buildUserMessage 에 직접 주입하면서도 기존엔 validateTeamArgument 호출 시 넘기지 않았다.
  // 4번째 인자로 전달되면 rivalryBlock 수치 인용이 더 이상 환각으로 오탐되지 않아야 한다.
  // (h2h 스코어처럼 단일 digit 조합은 NUMERIC_WHITELIST 로 이미 통과되므로, 화이트리스트 밖의
  // agent_memories 소수점 수치로 검증 — sp_fip 갭 등 실제 memory content 포맷과 동일)
  it('rivalryBlock 4번째 인자 전달 시 agent_memories 소수점 수치 인용 환각 오탐 없음', () => {
    const rivalryBlock = '## 과거 맥락\n에이전트 학습 메모리 (1개):\n- [LG weakness] 선발 FIP (sp_fip) +2.35 (weakness, vs KIA 2026-08-20)';
    const arg = makeArg({ reasoning: 'sp_fip +2.35 약점 반영. FIP 3.2 우위' });
    const result = validateTeamArgument(arg, ctx, 'strict', rivalryBlock);
    expect(result.ok).toBe(true);
    expect(result.violations.some((v) => v.type === 'hallucinated_number')).toBe(false);
  });

  it('rivalryBlock 미전달 시 동일 인용은 환각 오탐 (fix 이전 회귀 가드)', () => {
    const arg = makeArg({ reasoning: 'sp_fip +2.35 약점 반영. FIP 3.2 우위' });
    const result = validateTeamArgument(arg, ctx);
    expect(result.violations.some((v) => v.type === 'hallucinated_number')).toBe(true);
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

  it('lenient: 환각 숫자 3개+ 는 여전히 hard → reject (cycle 884 threshold 적용)', () => {
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

  // cycle 179 — buildUserMessage (team-agent) 와 동일 소스 정렬 회귀 가드.
  // SP WAR 가 다시 추가되거나 gameTime 이 빠지면 LLM 미노출 수치가 환각 검사 통과되는 silent drift 재발.
  it('SP WAR 미포함 (LLM 미노출 → 환각 검사 통과 차단)', () => {
    const text = buildInjectionText(makeContext());
    // awaySPStats.war = 1.2, 다른 필드와 substring 충돌 없음 (parkFactor 1.02 는 "1.2" 미포함).
    expect(text).not.toContain('1.2');
  });

  it('gameTime 포함 (시간 숫자 false positive 차단)', () => {
    const text = buildInjectionText(makeContext());
    expect(text).toContain('18:30');
  });

  // cycle 2428 — team-agent buildUserMessage 와 동일 소스 정렬 회귀 가드 (본 함수 자체 주석이
  // "half-applied fix 재발" 위험 경고). WAR/SFR=0 은 Fancy Stats 데이터 갭 sentinel (predictor.ts
  // cycle 1904/2419 neutral guard) 이라 raw 0 대신 갭 표기가 team-agent.ts / agent-context.ts 와
  // 동일하게 buildInjectionText 에도 반영돼야 한다 — 안 그러면 LLM 이 실제 본 문구("데이터 없음")를
  // 인용해도 injection text 는 여전히 "0" 을 기대해 mismatch 오탐 위험.
  it('WAR=0 (데이터 갭 sentinel) — raw 0 대신 갭 표기 (team-agent.ts 와 동일 source)', () => {
    const ctx = makeContext();
    ctx.homeTeamStats.totalWar = 0;
    const text = buildInjectionText(ctx);
    expect(text).toContain('WAR 데이터 없음(집계 갭)');
  });

  it('SFR=0 (fetchEloRatings silent-fallback stub) — raw 0 대신 갭 표기', () => {
    const ctx = makeContext();
    ctx.awayTeamStats.sfr = 0;
    const text = buildInjectionText(ctx);
    expect(text).toContain('SFR 데이터 없음(집계 갭)');
  });

  it('recentForm Math.round(form*100)% 포맷 (team-agent buildUserMessage 와 동일)', () => {
    const text = buildInjectionText(makeContext());
    expect(text).toContain('70%');
    expect(text).toContain('40%');
  });

  // cycle 2122 — team-agent buildUserMessage 가 prepend 하는 renderContextForLLM(buildAgentContext(...))
  // 블록은 recent_form/head_to_head 를 .toFixed(1) 소수점 percent 로도 LLM 에 노출한다
  // (agent-context.ts formatMetricLine + "[상대 전적 + 최근 폼]" 줄). buildInjectionText 가 정수
  // 반올림만 동봉하면 LLM 이 실제 노출된 소수점 값을 그대로 인용해도 checkHallucinatedNumbers 가
  // 오탐(hallucinated_number)한다 — 소수점 값도 injection text 에 포함돼야 회귀 차단.
  it('recent_form/head_to_head 소수점 percent 도 동봉 (LLM 실제 노출 값 — agent-context.ts 와 동일 source)', () => {
    const ctx = makeContext();
    ctx.homeRecentForm = 0.653; // 65.3%
    ctx.headToHead = { wins: 2, losses: 1 }; // 66.7% / 33.3%
    const text = buildInjectionText(ctx);
    expect(text).toContain('65.3');
    expect(text).toContain('66.7');
    expect(text).toContain('33.3');
  });

  it('LLM 이 소수점 recent_form/head_to_head 값 인용 시 환각 오탐 없음 (cycle 2122 fix)', () => {
    const ctx = makeContext();
    ctx.homeRecentForm = 0.653;
    ctx.headToHead = { wins: 2, losses: 1 };
    const injection = buildInjectionText(ctx);
    const v = checkHallucinatedNumbers('최근폼 65.3% 우위, 상대전적 66.7% 승률 반영', injection);
    expect(v).toHaveLength(0);
  });

  // review-code heavy audit — team-agent buildUserMessage 가 prepend 하는 renderContextForLLM
  // 블록은 metric 별 가중치%("가중치 15.0%" 등, sp_fip/lineup_woba 는 15% — NUMERIC_WHITELIST
  // 밖 값)와 WAR/SFR 의 반올림 정수 표기(totalWar 18.5 → contextBlock "19")도 LLM 에 노출한다.
  // 기존 buildInjectionText 는 이 두 값을 재구성하지 않아 LLM 이 실제 노출된 값을 그대로
  // 인용해도 환각으로 오탐될 위험이 있었음 — renderMetricsAndRecentFormForLLM 재사용으로 fix.
  it('metric 가중치%(15.0 등) 인용 시 환각 오탐 없음', () => {
    const injection = buildInjectionText(makeContext());
    expect(injection).toContain('15.0%');
    const v = checkHallucinatedNumbers('가중치 15.0%가 반영된 선발 FIP 3.2 우위', injection);
    expect(v).toHaveLength(0);
  });

  it('WAR 반올림 정수(18.5→19) 인용 시 환각 오탐 없음', () => {
    const injection = buildInjectionText(makeContext());
    expect(injection).toContain('19');
    const v = checkHallucinatedNumbers('팀 WAR 19가 원정 15보다 우위', injection);
    expect(v).toHaveLength(0);
  });

  // "[도메인 컨텍스트]" 섹션(구장/시즌/윈도우 hint)은 의도적으로 미포함 — 그 안 decorative
  // 숫자(KBO_PARKS 정적 park_factor 등)가 arithmetic-derivative 풀에 섞이면 무관한 숫자쌍의
  // 합/차/비가 우연히 진짜 환각 숫자와 일치해 놓치는 사례가 실측됨(예: K/9 라벨 잔재값 "9" +
  // 구장 hint "0.95" 의 합 = "9.95"). 여러 개의 확실한 환각 숫자는 계속 잡혀야 한다.
  it('환각 숫자 여러 개는 도메인 hint 미포함 상태에서도 계속 잡힘', () => {
    const injection = buildInjectionText(makeContext());
    const v = checkHallucinatedNumbers('FIP 9.91 9.92 9.93 9.94 9.95 9.96 9.97 우위.', injection);
    expect(v).toHaveLength(1);
    expect(v[0].severity).toBe('hard');
    for (const num of ['9.91', '9.92', '9.93', '9.94', '9.95', '9.96', '9.97']) {
      expect(v[0].detail).toContain(num);
    }
  });

  // cycle 2630 review-code(heavy) — team-agent.buildUserMessage 는 getRivalryBlock().promptBlock
  // (h2h 스코어 + agent_memories.content 숫자)을 renderContextForLLM 블록과 별개로 맨 끝에 직접
  // append 해 LLM 에 노출한다. buildInjectionText 가 이 rivalryBlock 인자를 안 받으면 LLM 이
  // 실제 노출된 메모리 수치를 정당 인용해도 환각으로 오탐된다. (h2h 스코어 자체는 단일 digit
  // 조합이라 NUMERIC_WHITELIST 로 이미 통과되므로, 화이트리스트 밖의 agent_memories 소수점
  // 수치로 검증 — 실제 memory content 포맷과 동일)
  it('rivalryBlock 인자 포함 시 agent_memories 소수점 수치 동봉', () => {
    const rivalryBlock = '## 과거 맥락\n에이전트 학습 메모리 (1개):\n- [LG weakness] 선발 FIP (sp_fip) +2.35 (weakness, vs KIA 2026-08-20)';
    const text = buildInjectionText(makeContext(), rivalryBlock);
    expect(text).toContain('+2.35');
  });

  it('rivalryBlock 미전달 시 기존 동작 유지 (기본값 빈 문자열)', () => {
    const text = buildInjectionText(makeContext());
    expect(text).not.toContain('과거 맥락');
  });

  it('LLM 이 rivalryBlock 의 agent_memories 소수점 수치 인용 시 환각 오탐 없음 (rivalryBlock 전달)', () => {
    const rivalryBlock = '## 과거 맥락\n에이전트 학습 메모리 (1개):\n- [LG weakness] 선발 FIP (sp_fip) +2.35 (weakness, vs KIA 2026-08-20)';
    const injection = buildInjectionText(makeContext(), rivalryBlock);
    const v = checkHallucinatedNumbers('sp_fip +2.35 약점 반영', injection);
    expect(v).toHaveLength(0);
  });

  it('LLM 이 rivalryBlock 수치 인용해도 rivalryBlock 미전달 시엔 환각 오탐 (fix 이전 회귀 가드)', () => {
    const injection = buildInjectionText(makeContext());
    const v = checkHallucinatedNumbers('sp_fip +2.35 약점 반영', injection);
    expect(v.length).toBeGreaterThan(0);
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

  it('환각 숫자 2개 → ok=true warn 강등 (cycle 884)', () => {
    const ctx = makeContext();
    const reasoning = '임찬규 FIP 3.99 우위. wOBA 0.555 격차.';
    const result = validateJudgeReasoning(reasoning, ctx, 'strict');
    expect(result.ok).toBe(true);
    expect(
      result.violations.some(
        (v) => v.type === 'hallucinated_number' && v.severity === 'warn',
      ),
    ).toBe(true);
  });

  it('환각 숫자 3개+ → ok=false (cycle 884 hard threshold)', () => {
    const ctx = makeContext();
    const reasoning = '임찬규 FIP 3.99 xFIP 8.88 wOBA 0.555 격차.';
    const result = validateJudgeReasoning(reasoning, ctx, 'strict');
    expect(result.ok).toBe(false);
    expect(
      result.violations.some(
        (v) => v.type === 'hallucinated_number' && v.severity === 'hard',
      ),
    ).toBe(true);
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

  // cycle 2631 review-code(heavy) — judge 는 home/away 팀 논거를 종합하는데, 그 논거들은 이미
  // rivalryBlock(getRivalryBlock().promptBlock) 수치를 실제로 노출받은 상태(cycle 2630 fix).
  // judge 가 그 수치를 정당 인용해도 4번째 인자 없이는 환각으로 오탐됐던 갭.
  it('rivalryBlock 4번째 인자 전달 시 agent_memories 소수점 수치 인용 환각 오탐 없음', () => {
    const ctx = makeContext();
    const rivalryBlock = '## 과거 맥락\n에이전트 학습 메모리 (1개):\n- [LG weakness] 선발 FIP (sp_fip) +2.35 (weakness, vs KIA 2026-08-20)';
    const reasoning = 'sp_fip +2.35 약점을 근거로 LG 우세로 판단.';
    const result = validateJudgeReasoning(reasoning, ctx, 'strict', rivalryBlock);
    expect(result.ok).toBe(true);
    expect(result.violations.some((v) => v.type === 'hallucinated_number')).toBe(false);
  });

  it('rivalryBlock 미전달 시 동일 인용은 환각 오탐 (fix 이전 회귀 가드)', () => {
    const ctx = makeContext();
    const reasoning = 'sp_fip +2.35 약점을 근거로 LG 우세로 판단.';
    const result = validateJudgeReasoning(reasoning, ctx, 'strict');
    expect(result.violations.some((v) => v.type === 'hallucinated_number')).toBe(true);
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

  // cycle 76 — 6개 이상 환각 시 silent leak 차단 회귀 가드.
  // detail 이 mask 함수 source 라 slice(0, 5) 는 6번째부터 leak 가능했음.
  it('환각 숫자 6개 이상 → 모두 mask (5개 limit silent leak 차단)', () => {
    const ctx = makeContext();
    const reasoning =
      'FIP 9.91 9.92 9.93 9.94 9.95 9.96 9.97 우위.';
    const result = validateJudgeReasoning(reasoning, ctx, 'strict');
    const masked = maskViolatedReasoning(reasoning, result.violations);
    for (const num of ['9.91', '9.92', '9.93', '9.94', '9.95', '9.96', '9.97']) {
      expect(masked).not.toContain(num);
    }
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

// ============================================
// P4 — validateFactorAttribution (cycle 29, spec § 4.4)
// ============================================
describe('validateFactorAttribution', () => {
  const weights = {
    sp_fip: 0.15,
    sp_xfip: 0.05,
    lineup_woba: 0.15,
    bullpen_fip: 0.10,
    recent_form: 0.10,
    war: 0.08,
    head_to_head: 0.05,
    park_factor: 0.04,
    elo: 0.08,
    sfr: 0.05,
  };

  it('빈 factorErrors → ok=true + 위반 0건', () => {
    const result = validateFactorAttribution([], weights);
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('high-weight factor (sp_fip 15%) → 위반 X', () => {
    const result = validateFactorAttribution(
      [{ factor: 'home_sp_fip', predictedBias: 0.08 }],
      weights
    );
    expect(result.violations).toHaveLength(0);
  });

  it('low-weight factor (head_to_head 5%) → warn', () => {
    const result = validateFactorAttribution(
      [{ factor: 'home_head_to_head', predictedBias: 0.05 }],
      weights
    );
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].type).toBe('low_weight_factor_emphasis');
    expect(result.violations[0].severity).toBe('warn');
    expect(result.violations[0].detail).toContain('5%');
  });

  it('low-weight factor 1건 → ok=true (WARN_LIMIT=2 이하)', () => {
    const result = validateFactorAttribution(
      [{ factor: 'home_park_factor', predictedBias: 0.03 }],
      weights
    );
    expect(result.ok).toBe(true);
  });

  it('low-weight factor 3건 → ok=false (warn limit 초과)', () => {
    const result = validateFactorAttribution(
      [
        { factor: 'home_head_to_head', predictedBias: 0.05 },
        { factor: 'away_park_factor', predictedBias: -0.04 },
        { factor: 'home_sfr', predictedBias: 0.02 },
      ],
      weights
    );
    expect(result.ok).toBe(false);
    expect(result.violations).toHaveLength(3);
  });

  it('threshold 0% factor (LowWeightThreshold 보다 정확히 0) → skip', () => {
    const zeroWeight = { ...weights, head_to_head: 0 };
    const result = validateFactorAttribution(
      [{ factor: 'home_head_to_head', predictedBias: 0.05 }],
      zeroWeight
    );
    expect(result.violations).toHaveLength(0);
  });

  it('알 수 없는 factor → skip', () => {
    const result = validateFactorAttribution(
      [{ factor: 'home_unknown_factor', predictedBias: 0.05 }],
      weights
    );
    expect(result.violations).toHaveLength(0);
  });

  it('threshold 옵션 override', () => {
    const result = validateFactorAttribution(
      [{ factor: 'home_recent_form', predictedBias: 0.05 }],
      weights,
      { lowWeightThreshold: 0.15 }
    );
    expect(result.violations).toHaveLength(1);
  });
});

// cycle 70 — annotateLowWeightFactorAttribution 제거.
// 사용자 가시 judgeReasoning leak 차단 (dev 용어 factor=foo weight=10% threshold 8%).
// attribution warning 은 Sentry capture (notifyValidationViolations) 만.

// ============================================
// cycle 132 — KOREAN_FAMILY_NAMES 회귀 가드 (silent drift fix)
// ============================================
// 마지막 '유' 중복 (character class 안 동작 무관) silent drift 박제.
// character set 안 모든 character distinct 강제. 향후 성씨 추가 시 중복 회피.
describe('KOREAN_FAMILY_NAMES (cycle 132 silent drift 회귀 가드)', () => {
  it('character set 안 중복 character 0건', () => {
    const set = new Set(Array.from(KOREAN_FAMILY_NAMES));
    expect(set.size).toBe(KOREAN_FAMILY_NAMES.length);
  });

  it('한국 성씨 상위권 핵심 character 포함 (회귀 가드)', () => {
    for (const ch of ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '유', '한']) {
      expect(KOREAN_FAMILY_NAMES).toContain(ch);
    }
  });

  it('checkInventedPlayerNames 가 character set 의존성 그대로 사용 (smoke)', () => {
    const ctx = makeContext();
    // '유' 시작 가상 이름 + 주격조사 → 발명 선수 감지
    const v = checkInventedPlayerNames('유철수가 등판', ctx);
    expect(v.length).toBe(1);
    expect(v[0].detail).toContain('유철수');
  });
});

