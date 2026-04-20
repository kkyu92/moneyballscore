import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseBattersFromHtml,
  parsePitchersFromHtml,
  resolveTeamCode,
} from '../scrapers/fancy-stats';

const FIXTURE_PATH = join(
  __dirname,
  'fixtures',
  'fancy-stats-leaders.html',
);

let fixtureHtml: string;

beforeAll(() => {
  fixtureHtml = readFileSync(FIXTURE_PATH, 'utf-8');
});

describe('parsePitchersFromHtml', () => {
  it('FIP 테이블에서 최소 5명 이상 투수 파싱', () => {
    const pitchers = parsePitchersFromHtml(fixtureHtml);
    expect(pitchers.length).toBeGreaterThanOrEqual(5);
  });

  it('각 투수가 필수 필드를 가짐', () => {
    const pitchers = parsePitchersFromHtml(fixtureHtml);
    for (const p of pitchers) {
      expect(p.name).toMatch(/[가-힣]/); // 한글 이름
      expect(p.team).toMatch(/^[A-Z]{2}$/); // TeamCode (SK, HT, LG, ...)
      expect(p.fip).toBeGreaterThan(0);
      expect(p.fip).toBeLessThan(10);
      expect(p.xfip).toBeGreaterThan(0);
    }
  });

  it('FIP 값이 합리적 범위 (리그 평균 근처)', () => {
    const pitchers = parsePitchersFromHtml(fixtureHtml);
    const avgFip = pitchers.reduce((a, p) => a + p.fip, 0) / pitchers.length;
    // KBO 상위 투수 평균 FIP는 2.0~4.0 사이
    expect(avgFip).toBeGreaterThan(1.5);
    expect(avgFip).toBeLessThan(5);
  });

  it('동명이인 방지: 같은 이름+팀 조합은 한 번만 등장', () => {
    const pitchers = parsePitchersFromHtml(fixtureHtml);
    const keys = pitchers.map((p) => `${p.name}@${p.team}`);
    const unique = new Set(keys);
    expect(keys.length).toBe(unique.size);
  });

  it('팀 코드가 10개 KBO 구단 중 하나', () => {
    const pitchers = parsePitchersFromHtml(fixtureHtml);
    const validCodes = new Set([
      'SK',
      'HT',
      'LG',
      'OB',
      'KT',
      'SS',
      'LT',
      'HH',
      'NC',
      'WO',
    ]);
    for (const p of pitchers) {
      expect(validCodes.has(p.team)).toBe(true);
    }
  });
});

describe('parseBattersFromHtml', () => {
  it('4개 테이블 union으로 최소 10명 이상 타자 파싱', () => {
    const batters = parseBattersFromHtml(fixtureHtml);
    expect(batters.length).toBeGreaterThanOrEqual(10);
  });

  it('각 타자가 필수 필드를 가짐 — 4스탯 중 최소 하나는 > 0', () => {
    const batters = parseBattersFromHtml(fixtureHtml);
    for (const b of batters) {
      expect(b.name).toMatch(/[가-힣]/);
      expect(b.team).toMatch(/^[A-Z]{2}$/);
      // 4개 테이블(WAR/wRC+/OPS/ISO) union이라 특정 스탯은 0일 수 있음.
      // 하지만 최소 하나는 양수여야 함 (어떤 테이블에라도 등장했다는 뜻).
      const anyPositive = b.war > 0 || b.wrcPlus > 0 || b.ops > 0 || b.iso > 0;
      expect(anyPositive).toBe(true);
    }
  });

  it('WAR 상위 선수가 존재 (리더보드 용도)', () => {
    const batters = parseBattersFromHtml(fixtureHtml);
    const warValues = batters.map((b) => b.war).filter((w) => w > 0);
    expect(warValues.length).toBeGreaterThan(0);
    const maxWar = Math.max(...warValues);
    // 시즌 상위 타자 WAR은 최소 1 이상
    expect(maxWar).toBeGreaterThan(1);
    // 비정상적으로 높은 값 아님
    expect(maxWar).toBeLessThan(20);
  });

  it('position 필드가 일부 타자에 존재 (P가 아닌 야수)', () => {
    const batters = parseBattersFromHtml(fixtureHtml);
    const withPosition = batters.filter((b) => b.position && b.position !== 'P');
    expect(withPosition.length).toBeGreaterThan(0);
    // 합법적 포지션: C, 1B, 2B, 3B, SS, LF, CF, RF, DH
    for (const b of withPosition) {
      expect(b.position).toMatch(/^(C|1B|2B|3B|SS|LF|CF|RF|DH|OF|IF)$/);
    }
  });

  it('wRC+ 값이 합리적 범위 (100 근처가 리그 평균)', () => {
    const batters = parseBattersFromHtml(fixtureHtml);
    const wrcPlusValues = batters.map((b) => b.wrcPlus).filter((v) => v > 0);
    if (wrcPlusValues.length === 0) return; // wRC+ 없으면 skip
    const maxWrc = Math.max(...wrcPlusValues);
    // 상위 타자 wRC+는 120~200 범위
    expect(maxWrc).toBeGreaterThan(100);
    expect(maxWrc).toBeLessThan(300);
  });

  it('중복 선수 없음', () => {
    const batters = parseBattersFromHtml(fixtureHtml);
    const keys = batters.map((b) => `${b.name}@${b.team}`);
    const unique = new Set(keys);
    expect(keys.length).toBe(unique.size);
  });
});

describe('회귀 감지 — 셀렉터 드리프트 알림', () => {
  it('투수 0명 반환 시 fail (사이트 구조 변경 조기 감지)', () => {
    const pitchers = parsePitchersFromHtml(fixtureHtml);
    expect(pitchers.length).toBeGreaterThan(0);
  });

  it('타자 0명 반환 시 fail', () => {
    const batters = parseBattersFromHtml(fixtureHtml);
    expect(batters.length).toBeGreaterThan(0);
  });
});

describe('resolveTeamCode — case-insensitive 매칭', () => {
  it('표준 대소문자 ("KIA Tigers") → HT', () => {
    expect(resolveTeamCode('KIA Tigers')).toBe('HT');
  });

  it('Fancy Stats drift 표기 ("Kia Tigers", K 만 대문자) → HT', () => {
    // 4/19 prod 사고 재현: Fancy Stats 가 "Kia Tigers" 로 drift → 10팀 중 9팀만
    // 매칭 → 1팀 default stat 으로 fallback → 예측 정확도 저하. 이 testcase 가
    // 미래 동일 drift 패턴 (대소문자·공백 변형) 을 가드.
    expect(resolveTeamCode('Kia Tigers')).toBe('HT');
  });

  it('전부 소문자 ("hanwha eagles") → HH', () => {
    expect(resolveTeamCode('hanwha eagles')).toBe('HH');
  });

  it('10팀 전부 case-insensitive 로 매칭', () => {
    const cases: Array<[string, string]> = [
      ['ssg landers', 'SK'],
      ['KIA TIGERS', 'HT'],
      ['Kia Tigers', 'HT'],
      ['lg twins', 'LG'],
      ['Doosan Bears', 'OB'],
      ['kt wiz', 'KT'],
      ['samsung lions', 'SS'],
      ['LOTTE GIANTS', 'LT'],
      ['Hanwha Eagles', 'HH'],
      ['nc dinos', 'NC'],
      ['Kiwoom Heroes', 'WO'],
    ];
    for (const [input, expected] of cases) {
      expect(resolveTeamCode(input)).toBe(expected);
    }
  });

  it('한글 팀명 폴백 ("두산") → OB', () => {
    expect(resolveTeamCode('두산')).toBe('OB');
  });

  it('미지 팀명 → null', () => {
    expect(resolveTeamCode('Unknown Team')).toBeNull();
  });
});
