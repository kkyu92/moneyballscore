import { describe, it, expect } from 'vitest';
import { BASE_PROMPT, RESPONSE_FORMAT, HOME_ROLE, AWAY_ROLE } from '../agents/personas';

// cycle 986 — BASE_PROMPT + RESPONSE_FORMAT 강화 regression guard.
// hallucinated_number 진짜 환각 5건 (1336/1337/1338/1340/1527/1534) root cause
// = LLM 가 주입 안 된 raw stat (ERA / WHIP / WAR raw / 십진수 변환) 학습 데이터로
// 환각. BASE_PROMPT 안 "환각 자주 발생 카테고리" 명시 + RESPONSE_FORMAT 안
// "수치 인용 최종 규칙" 박제로 LLM strict 강화.
describe('personas.ts BASE_PROMPT — cycle 986 환각 자주 발생 카테고리', () => {
  it('SP raw stat 환각 차단 어구 (ERA / WHIP / WAR / WIN-LOSS) 명시', () => {
    expect(BASE_PROMPT).toContain('ERA / WHIP / WAR');
  });

  it('FIP / xFIP / K/9 만 주입됨 명시', () => {
    expect(BASE_PROMPT).toContain('FIP / xFIP / K/9');
  });

  it('십진수 변환 금지 어구 명시 (normalized → raw 변환 환각 차단)', () => {
    expect(BASE_PROMPT).toContain('십진수 변환 금지');
  });

  it('상대 매치업 stat 미주입 명시', () => {
    expect(BASE_PROMPT).toContain('상대 매치업 stat');
  });

  it('시즌 누적 stat 미주입 명시', () => {
    expect(BASE_PROMPT).toContain('시즌 누적 stat');
  });

  it('환각 자주 발생 evidence 5건 박제 (14d 사례)', () => {
    expect(BASE_PROMPT).toContain('환각 자주 발생 evidence');
    // 5건 specific evidence (BASE_PROMPT 안 5 stat 카테고리 명시 박제 검증)
    expect(BASE_PROMPT).toContain('불펜 FIP 4.38');
    expect(BASE_PROMPT).toContain('FIP 2.90');
    expect(BASE_PROMPT).toContain('K/9 10.65');
    expect(BASE_PROMPT).toContain('WHIP 7.49');
  });

  it('정성 표현 example 확장 (K/9 / WHIP / ERA 정성)', () => {
    expect(BASE_PROMPT).toContain('K/9 평균 이상');
    expect(BASE_PROMPT).toContain('WHIP 미주입');
  });
});

describe('personas.ts RESPONSE_FORMAT — cycle 986 수치 인용 최종 규칙', () => {
  it('cycle 986 수치 인용 규칙 박제', () => {
    expect(RESPONSE_FORMAT).toContain('수치 인용 최종 규칙');
  });

  it('반올림 / 절삭 / 산술 변환 금지 명시', () => {
    expect(RESPONSE_FORMAT).toContain('반올림 / 절삭 / 산술 변환 / 단위 변환 절대 금지');
  });

  it('새 숫자 등장 = 환각 = hard reject 명시', () => {
    expect(RESPONSE_FORMAT).toContain('새로운 숫자가 등장하면');
    expect(RESPONSE_FORMAT).toContain('validator hard reject');
  });

  it('주입 안 된 stat = 정성 표현만 사용 명시', () => {
    expect(RESPONSE_FORMAT).toContain('정성 표현');
    expect(RESPONSE_FORMAT).toContain('주입 안 된 stat');
  });
});

describe('personas.ts BASE_PROMPT 기존 절대 원칙 (regression guard)', () => {
  it('cycle 986 강화 후에도 기존 핵심 어구 유지', () => {
    expect(BASE_PROMPT).toContain('주입된 수치만 인용');
    expect(BASE_PROMPT).toContain('환각 1건 = 이번 토론 실격');
    expect(BASE_PROMPT).toContain('절대 원칙');
  });

  it('HOME_ROLE / AWAY_ROLE 변경 0 (scope 본 fix 외)', () => {
    expect(HOME_ROLE).toContain('홈팀 역할 정의');
    expect(AWAY_ROLE).toContain('원정팀 역할 정의');
  });
});
