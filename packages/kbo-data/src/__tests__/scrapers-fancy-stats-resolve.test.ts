/**
 * resolveTeamCode — Fancy Stats 영문 팀명 → TeamCode 매핑 regression guard.
 *
 * 2026-04: Fancy Stats 가 "KIA Tigers" → "Kia Tigers" 표기 변경 시 case-sensitive
 * 매칭이 깨져 HT 1팀 누락. case-insensitive 직접/부분 매칭 + 한글 fallback 3-tier
 * 로직이 사라지거나 흔들리면 동일 사고 재발. cycle 125 review-code(heavy) 박제.
 */
import { describe, it, expect } from 'vitest';
import { resolveTeamCode } from '../scrapers/fancy-stats';

describe('resolveTeamCode — case-insensitive direct match', () => {
  it('exact original casing', () => {
    expect(resolveTeamCode('KIA Tigers')).toBe('HT');
    expect(resolveTeamCode('SSG Landers')).toBe('SK');
    expect(resolveTeamCode('Doosan Bears')).toBe('OB');
  });

  it('lowercased input still matches', () => {
    expect(resolveTeamCode('kia tigers')).toBe('HT');
    expect(resolveTeamCode('ssg landers')).toBe('SK');
  });

  it('mixed case (2026-04 incident: "Kia Tigers")', () => {
    expect(resolveTeamCode('Kia Tigers')).toBe('HT');
    expect(resolveTeamCode('LG twins')).toBe('LG');
  });
});

describe('resolveTeamCode — partial match fallback', () => {
  it('surrounding text contains canonical name', () => {
    expect(resolveTeamCode('  Kia Tigers (KBO) ')).toBe('HT');
  });

  it('partial substring of canonical name', () => {
    expect(resolveTeamCode('Lotte')).toBe('LT');
  });
});

describe('resolveTeamCode — Korean fallback (TEAM_NAME_MAP)', () => {
  it('Korean team name resolves via TEAM_NAME_MAP', () => {
    expect(resolveTeamCode('두산')).toBe('OB');
    expect(resolveTeamCode('한화')).toBe('HH');
  });
});

describe('resolveTeamCode — empty/unknown returns null', () => {
  it('unknown English name', () => {
    expect(resolveTeamCode('Unknown Tigers')).toBeNull();
  });

  // cycle 125 review-code(heavy) 박제: 빈 입력 silent drift 가드.
  // 가드 부재 시 step 2 양방향 includes 가 lowerKey.includes('') = true 로
  // 빈 셀을 FS_TEAM_MAP 첫 entry (SSG → SK) 로 오분류.
  it('empty string returns null (regression — silent drift guard)', () => {
    expect(resolveTeamCode('')).toBeNull();
  });

  it('whitespace-only returns null', () => {
    expect(resolveTeamCode('   ')).toBeNull();
  });
});
