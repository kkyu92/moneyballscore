/**
 * KBO 공식 PitcherBasic 스크래퍼 가드.
 * fixture 는 실제 2026-04-20 prod 응답 스냅샷. 테이블 구조 변경 시 먼저
 * 붉어져서 silent drift 방지.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseIP,
  calculateFIP,
  parsePitcherBasicFromHtml,
} from '../scrapers/kbo-pitcher';

const FIXTURE = readFileSync(
  join(__dirname, 'fixtures', 'kbo-pitcher-basic.html'),
  'utf-8',
);

describe('parseIP', () => {
  it('정수 이닝 "23" → 23', () => {
    expect(parseIP('23')).toBe(23);
  });

  it('1/3 이닝 "24 1/3" → 24.333...', () => {
    expect(parseIP('24 1/3')).toBeCloseTo(24.333, 2);
  });

  it('2/3 이닝 "23 2/3" → 23.667...', () => {
    expect(parseIP('23 2/3')).toBeCloseTo(23.667, 2);
  });

  it('빈 문자열 → 0', () => {
    expect(parseIP('')).toBe(0);
    expect(parseIP('   ')).toBe(0);
  });

  it('소수 표기 "23.5" → 23.5 (fallback parseFloat)', () => {
    expect(parseIP('23.5')).toBe(23.5);
  });

  it('무효 포맷 → 0', () => {
    expect(parseIP('abc')).toBe(0);
  });
});

describe('calculateFIP', () => {
  it('전형적 값 — HR=2 BB=5 HBP=1 SO=20 IP=25 constant=3.1', () => {
    // (13*2 + 3*(5+1) - 2*20) / 25 + 3.1
    // = (26 + 18 - 40) / 25 + 3.1
    // = 4 / 25 + 3.1 = 0.16 + 3.1 = 3.26
    expect(calculateFIP(2, 5, 1, 20, 25)).toBeCloseTo(3.26, 2);
  });

  it('홈런 0 + 삼진 많음 → FIP < constant', () => {
    // (0 + 3*5 - 2*30) / 30 + 3.1 = -45/30 + 3.1 = -1.5 + 3.1 = 1.6
    expect(calculateFIP(0, 5, 0, 30, 30)).toBeCloseTo(1.6, 2);
  });

  it('IP 0 → null', () => {
    expect(calculateFIP(0, 0, 0, 0, 0)).toBeNull();
  });

  it('IP 음수 → null (방어)', () => {
    expect(calculateFIP(0, 0, 0, 0, -1)).toBeNull();
  });

  it('custom constant 허용', () => {
    // 위와 동일 입력 + constant 4.0
    expect(calculateFIP(2, 5, 1, 20, 25, 4.0)).toBeCloseTo(4.16, 2);
  });
});

describe('parsePitcherBasicFromHtml (fixture)', () => {
  it('28명 투수 파싱', () => {
    const pitchers = parsePitcherBasicFromHtml(FIXTURE);
    expect(pitchers.length).toBe(28);
  });

  it('첫 투수 — 보쉴리 KT (IP=23, HR=0, BB=5, SO=21)', () => {
    const pitchers = parsePitcherBasicFromHtml(FIXTURE);
    const top = pitchers[0];
    expect(top.name).toBe('보쉴리');
    expect(top.team).toBe('KT');
    expect(top.innings).toBe(23);
    // FIP = (13*0 + 3*(5+0) - 2*21) / 23 + 3.1 = (0+15-42)/23 + 3.1 ≈ 1.926
    expect(top.fip).toBeCloseTo(1.926, 2);
  });

  it('2번 투수 — 올러 KIA (IP=24 1/3 분수 파싱 검증)', () => {
    const pitchers = parsePitcherBasicFromHtml(FIXTURE);
    const ol = pitchers.find((p) => p.name === '올러');
    expect(ol).toBeDefined();
    expect(ol!.team).toBe('HT'); // KIA → HT
    expect(ol!.innings).toBeCloseTo(24.333, 2);
    // FIP = (0 + 3*(7+2) - 2*20) / 24.333 + 3.1 ≈ -0.534 + 3.1 ≈ 2.566
    expect(ol!.fip).toBeCloseTo(2.566, 1);
  });

  it('모든 투수 이름은 한글', () => {
    const pitchers = parsePitcherBasicFromHtml(FIXTURE);
    for (const p of pitchers) {
      expect(p.name).toMatch(/[가-힣]/);
    }
  });

  it('모든 투수 팀 코드는 KBO 10팀 중 하나', () => {
    const pitchers = parsePitcherBasicFromHtml(FIXTURE);
    const valid = new Set(['SK','HT','LG','OB','KT','SS','LT','HH','NC','WO']);
    for (const p of pitchers) {
      expect(valid.has(p.team)).toBe(true);
    }
  });

  it('모든 투수의 IP > 0 (Fip 계산 가능 필터)', () => {
    const pitchers = parsePitcherBasicFromHtml(FIXTURE);
    for (const p of pitchers) {
      expect(p.innings).toBeGreaterThan(0);
      expect(p.fip).toBeTypeOf('number');
    }
  });

  it('DB 에 있지만 Fancy Stats 에 없던 투수들이 여기엔 있음 (커버리지 검증)', () => {
    const pitchers = parsePitcherBasicFromHtml(FIXTURE);
    const names = new Set(pitchers.map((p) => p.name));
    // Fancy Stats top 50 에 없던 DB 투수 샘플 (실측 2026-04-17~19 final
    // 경기 출전):
    expect(names.has('최민석')).toBe(true); // 두산
    expect(names.has('보쉴리')).toBe(true); // KT
    expect(names.has('왕옌청')).toBe(true); // 한화
    expect(names.has('후라도')).toBe(true); // 삼성
    expect(names.has('네일')).toBe(true);   // KIA
  });
});
