/**
 * fangraphs.ts — resolveTeamCode 단일 소스 derive regression guard.
 *
 * Before cycle 196: fangraphs.ts 가 자체 FG_TEAM_MAP + case-sensitive
 * resolveTeamCode 보유. fancy-stats.ts:35 의 case-insensitive + 빈 입력 가드
 * 패턴 (cycle 21 "Kia Tigers" drift 사고 박제) 와 silent drift — 같은 사고가
 * fangraphs 차원에서 재발 가능했음.
 *
 * After cycle 196: fangraphs.ts 가 fancy-stats.resolveTeamCode 단일 소스 import.
 * silent drift family scrapers 차원 17번째 진입.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { resolveTeamCode } from '../scrapers/fancy-stats';

const FANGRAPHS_SRC = readFileSync(
  resolve(__dirname, '../scrapers/fangraphs.ts'),
  'utf-8',
);

describe('fangraphs.ts — silent drift regression guard (cycle 196)', () => {
  it('자체 FG_TEAM_MAP 부재 (fancy-stats FS_TEAM_MAP 단일 소스)', () => {
    expect(FANGRAPHS_SRC).not.toMatch(/const\s+FG_TEAM_MAP/);
  });

  it('자체 resolveTeamCode 함수 정의 부재 (fancy-stats import 단일 소스)', () => {
    expect(FANGRAPHS_SRC).not.toMatch(/function\s+resolveTeamCode/);
  });

  it('fancy-stats.resolveTeamCode import 명시', () => {
    expect(FANGRAPHS_SRC).toMatch(
      /import\s+\{[^}]*resolveTeamCode[^}]*\}\s+from\s+['"]\.\/fancy-stats['"]/,
    );
  });
});

describe('fangraphs.ts 차원 case-insensitive 매칭 verify (단일 소스 동작)', () => {
  it('FG_TEAM_MAP 10팀 모두 case-insensitive 매핑 (FS_TEAM_MAP 동일 — cycle 196 단일 소스 derive 박제)', () => {
    expect(resolveTeamCode('SSG Landers')).toBe('SK');
    expect(resolveTeamCode('KIA Tigers')).toBe('HT');
    expect(resolveTeamCode('LG Twins')).toBe('LG');
    expect(resolveTeamCode('Doosan Bears')).toBe('OB');
    expect(resolveTeamCode('KT Wiz')).toBe('KT');
    expect(resolveTeamCode('Samsung Lions')).toBe('SS');
    expect(resolveTeamCode('Lotte Giants')).toBe('LT');
    expect(resolveTeamCode('Hanwha Eagles')).toBe('HH');
    expect(resolveTeamCode('NC Dinos')).toBe('NC');
    expect(resolveTeamCode('Kiwoom Heroes')).toBe('WO');
  });

  it('case 변형 모두 매핑 (fangraphs 차원에서도 case-insensitive 자동 상속)', () => {
    expect(resolveTeamCode('kia tigers')).toBe('HT');
    expect(resolveTeamCode('KIA TIGERS')).toBe('HT');
    expect(resolveTeamCode('Kia Tigers')).toBe('HT');
    expect(resolveTeamCode('ssg landers')).toBe('SK');
  });

  it('빈 입력 가드 (fangraphs 차원에서도 자동 상속)', () => {
    expect(resolveTeamCode('')).toBeNull();
    expect(resolveTeamCode('   ')).toBeNull();
  });
});
