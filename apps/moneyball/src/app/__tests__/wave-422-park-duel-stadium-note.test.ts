import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KBO_TEAMS, type TeamCode } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');
const SHARED_INDEX = join(__dirname, '../../../../../packages/shared/src/index.ts');

// wave-422: 팩터 수렴 픽 구장 대결 구장명 + parkNote 표시 — cycle 1775.
// 기존 `PF {parkPf} {타자친화|투수친화|중립}` → `{stadiumShort} {parkNote}` 전환.
// KBO_TEAMS.parkNote = 사용자 가시 구장 특성 설명 (UI 문자열, 수치 아님).
// KBO_STADIUM_SHORT = 지역 짧은 이름 (wave-422에서 park factor 카드 주 표시 경로로 승격).

describe('wave-422 — KBO_TEAMS parkNote 검증', () => {
  const codes: TeamCode[] = ['SK', 'HT', 'LG', 'OB', 'KT', 'SS', 'LT', 'HH', 'NC', 'WO'];

  it('모든 10팀 parkNote 존재 (비어 있지 않음)', () => {
    for (const code of codes) {
      expect(KBO_TEAMS[code].parkNote).toBeTruthy();
    }
  });

  it('parkNote 는 한글 문자열 — PF 숫자로 시작 X (UI 문자열 불변)', () => {
    for (const code of codes) {
      expect(KBO_TEAMS[code].parkNote).not.toMatch(/^PF \d/);
    }
  });

  it('SS(삼성) parkNote — 극단적 타자 친화 명시', () => {
    expect(KBO_TEAMS.SS.parkNote).toContain('타자 친화');
  });

  it('WO(키움) parkNote — 극단적 투수 친화 명시', () => {
    expect(KBO_TEAMS.WO.parkNote).toContain('투수 친화');
  });

  it('SK(SSG) parkNote — 타자 친화 + 짧은 펜스 언급', () => {
    expect(KBO_TEAMS.SK.parkNote).toContain('타자 친화');
    expect(KBO_TEAMS.SK.parkNote).toContain('짧은 펜스');
  });
});

describe('wave-422 — KBO_STADIUM_SHORT JSDoc 가드', () => {
  let src: string;

  beforeAll(() => {
    src = readFileSync(SHARED_INDEX, 'utf-8');
  });

  it('KBO_STADIUM_SHORT JSDoc 에 wave-422 참조 존재', () => {
    const block = src.match(/\/\*\*[\s\S]*?KBO_STADIUM_SHORT: Record/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('wave-422');
  });

  it('parkNote 주석 — UI 표시 wave-422 참조 존재', () => {
    expect(src).toContain('parkNote: 사용자 가시 구장 특성 설명');
    expect(src).toContain('wave-422');
  });
});

describe('wave-422 — analysis/page.tsx 구장 대결 카드 검증', () => {
  let src: string;

  beforeAll(() => {
    src = readFileSync(ANALYSIS_PAGE, 'utf-8');
  });

  it('wave-422 주석 존재', () => {
    expect(src).toContain('wave-422');
  });

  it('parkNote 사용 (수치 PF 제거 확인)', () => {
    expect(src).toContain('{parkNote}');
  });

  it('stadiumShort 사용 (구장명 표시)', () => {
    expect(src).toContain('stadiumShort');
  });

  it('PF 숫자 직접 표시 패턴 제거 — `PF {parkPf}` 잔재 X', () => {
    expect(src).not.toContain('PF {parkPf}');
    expect(src).not.toMatch(/PF\s+\{parkPf\}/);
  });
});
