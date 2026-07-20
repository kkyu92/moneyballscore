import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  FACTOR_PICK_STRONG,
  H2H_DOMINANT_RATE,
  H2H_WEAK_RATE,
  H2H_MIN_GAMES,
  PARK_FACTOR_HITTER_MIN,
  PARK_FACTOR_PITCHER_MAX,
  BULLPEN_FIP_DIFF_MIN,
  ELO_GAP_STRONG,
  WAR_DUEL_MIN,
  SFR_DUEL_MIN,
  RECENT_FORM_DUEL_MIN,
  SP_XFIP_DUEL_MIN,
} from '@moneyball/shared';

// wave-528: 이번 주 남은 경기 카드 10팩터 배지 JSDoc callsite sync guard
// review-code (heavy) — cycle 1897
// Feature-Drift Cycle: polish-ui (wave-527, flex-wrap + hover + pill) → review-code (wave-528)
//
// gap: wave-520/522/524/526 JSDoc sync 사이클 4건 모두 test 파일 없음
//      (wave-516/518 패턴 대비 silent test coverage gap)
//      wave-528 = wave-519~527 전체 10팩터 배지 시스템 JSDoc callsite sync 통합 guard

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

const analysisPageSrc = readFileSync(
  join(__dirname, '../../app/analysis/page.tsx'),
  'utf8',
);

// --- 상수값 guard (값 변경 시 callsite 동시 조정 의무) ---
describe('wave-528 — 10팩터 배지 상수 값 guard', () => {
  it('FACTOR_PICK_STRONG = 8 (강수렴 임계)', () => {
    expect(FACTOR_PICK_STRONG).toBe(8);
  });

  it('H2H_DOMINANT_RATE = 0.6 (홈팀 우세 승률)', () => {
    expect(H2H_DOMINANT_RATE).toBe(0.6);
  });

  it('H2H_WEAK_RATE = 0.4 (원정팀 우세 승률)', () => {
    expect(H2H_WEAK_RATE).toBe(0.4);
  });

  it('H2H_MIN_GAMES = 3 (배지 최소 대결 수)', () => {
    expect(H2H_MIN_GAMES).toBe(3);
  });

  it('PARK_FACTOR_HITTER_MIN = 105 (타자 친화 구장)', () => {
    expect(PARK_FACTOR_HITTER_MIN).toBe(105);
  });

  it('PARK_FACTOR_PITCHER_MAX = 95 (투수 친화 구장)', () => {
    expect(PARK_FACTOR_PITCHER_MAX).toBe(95);
  });

  it('BULLPEN_FIP_DIFF_MIN = 1.0 (불펜FIP 배지 최소 격차)', () => {
    expect(BULLPEN_FIP_DIFF_MIN).toBe(1.0);
  });

  it('ELO_GAP_STRONG = 50 (Elo 배지 최소 격차)', () => {
    expect(ELO_GAP_STRONG).toBe(50);
  });

  it('WAR_DUEL_MIN = 5.0 (WAR 배지 최소 격차)', () => {
    expect(WAR_DUEL_MIN).toBe(5.0);
  });

  it('SFR_DUEL_MIN = 5.0 (수비SFR 배지 최소 격차)', () => {
    expect(SFR_DUEL_MIN).toBe(5.0);
  });

  it('RECENT_FORM_DUEL_MIN = 0.10 (최근폼 배지 최소 격차)', () => {
    expect(RECENT_FORM_DUEL_MIN).toBe(0.10);
  });

  it('SP_XFIP_DUEL_MIN = 0.5 (xFIP 배지 최소 격차)', () => {
    expect(SP_XFIP_DUEL_MIN).toBe(0.5);
  });
});

// --- JSDoc callsite sync guard (wave-520/522/524/526 sync 결과 박제) ---
describe('wave-528 — H2H·구장 배지 JSDoc wave-519 callsite sync guard (wave-520 sync)', () => {
  it('H2H_DOMINANT_RATE JSDoc 에 wave-519 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const H2H_DOMINANT_RATE');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 800), idx);
    expect(jsdoc).toContain('wave-519');
  });

  it('H2H_WEAK_RATE JSDoc 에 wave-519 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const H2H_WEAK_RATE');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 800), idx);
    expect(jsdoc).toContain('wave-519');
  });

  it('H2H_MIN_GAMES JSDoc 에 wave-519 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const H2H_MIN_GAMES');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 500), idx);
    expect(jsdoc).toContain('wave-519');
  });

  it('PARK_FACTOR_HITTER_MIN JSDoc 에 wave-519 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const PARK_FACTOR_HITTER_MIN');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 600), idx);
    expect(jsdoc).toContain('wave-519');
  });
});

describe('wave-528 — 6팩터 배지 JSDoc wave-521 callsite sync guard (wave-522 sync)', () => {
  it('BULLPEN_FIP_DIFF_MIN JSDoc 에 wave-521 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const BULLPEN_FIP_DIFF_MIN');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 500), idx);
    expect(jsdoc).toContain('wave-521');
  });

  it('ELO_GAP_STRONG JSDoc 에 wave-521 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const ELO_GAP_STRONG');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 500), idx);
    expect(jsdoc).toContain('wave-521');
  });

  it('WAR_DUEL_MIN JSDoc 에 wave-521 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const WAR_DUEL_MIN');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 500), idx);
    expect(jsdoc).toContain('wave-521');
  });

  it('SFR_DUEL_MIN JSDoc 에 wave-521 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const SFR_DUEL_MIN');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 500), idx);
    expect(jsdoc).toContain('wave-521');
  });

  it('RECENT_FORM_DUEL_MIN JSDoc 에 wave-521 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const RECENT_FORM_DUEL_MIN');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 500), idx);
    expect(jsdoc).toContain('wave-521');
  });

  it('SP_XFIP_DUEL_MIN JSDoc 에 wave-521 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const SP_XFIP_DUEL_MIN');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 500), idx);
    expect(jsdoc).toContain('wave-521');
  });
});

describe('wave-528 — FACTOR_PICK_STRONG JSDoc wave-523/525 callsite sync guard (wave-524/526 sync)', () => {
  it('FACTOR_PICK_STRONG JSDoc 에 wave-523 TOP픽 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const FACTOR_PICK_STRONG');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 1500), idx);
    expect(jsdoc).toContain('wave-523');
  });

  it('FACTOR_PICK_STRONG JSDoc 에 wave-525 강수렴 픽 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const FACTOR_PICK_STRONG');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 1500), idx);
    expect(jsdoc).toContain('wave-525');
  });
});

// --- analysis/page.tsx callsite comment guard ---
describe('wave-528 — analysis/page.tsx 이번 주 남은 경기 카드 callsite comment guard', () => {
  it('wave-519 H2H 직접 대결 배지 comment 존재', () => {
    expect(analysisPageSrc).toContain('wave-519: H2H 직접 대결 배지');
  });

  it('wave-519 구장 직접 대결 배지 comment 존재', () => {
    expect(analysisPageSrc).toContain('wave-519: 구장 직접 대결 배지');
  });

  it('wave-521 불펜FIP 직접 대결 배지 comment 존재', () => {
    expect(analysisPageSrc).toContain('wave-521: 불펜FIP 직접 대결 배지');
  });

  it('wave-521 Elo 직접 대결 배지 comment 존재', () => {
    expect(analysisPageSrc).toContain('wave-521: Elo 직접 대결 배지');
  });

  it('wave-521 WAR 직접 대결 배지 comment 존재', () => {
    expect(analysisPageSrc).toContain('wave-521: WAR 직접 대결 배지');
  });

  it('wave-521 수비SFR 직접 대결 배지 comment 존재', () => {
    expect(analysisPageSrc).toContain('wave-521: 수비SFR 직접 대결 배지');
  });

  it('wave-521 최근폼 직접 대결 배지 comment 존재', () => {
    expect(analysisPageSrc).toContain('wave-521: 최근폼 직접 대결 배지');
  });

  it('wave-521 xFIP 직접 대결 배지 comment 존재', () => {
    expect(analysisPageSrc).toContain('wave-521: xFIP 직접 대결 배지');
  });

  it('wave-523 이번 주 수렴 TOP 픽 배지 comment 존재', () => {
    expect(analysisPageSrc).toContain('wave-523: 이번 주 수렴 TOP 픽 배지');
  });

  it('wave-525 강수렴 픽 복수 카운트 배지 comment 존재', () => {
    expect(analysisPageSrc).toContain('wave-525: 강수렴 픽 복수 카운트 배지');
  });

  it('wave-527 flex-wrap 컨테이너 comment 존재', () => {
    expect(analysisPageSrc).toContain('wave-527: flex-wrap 컨테이너로 정렬');
  });

  it('wave-527 pill badge 스타일 comment 존재', () => {
    expect(analysisPageSrc).toContain('wave-527: pill badge 스타일');
  });
});

// --- 구조 guard (10팩터 flex-wrap 컨테이너 존재) ---
describe('wave-528 — 10팩터 배지 flex-wrap 컨테이너 구조 guard', () => {
  it('analysis/page.tsx 에 flex flex-wrap gap-x-1 gap-y-0.5 justify-end mt-1 컨테이너 존재', () => {
    expect(analysisPageSrc).toContain('flex flex-wrap gap-x-1 gap-y-0.5 justify-end mt-1');
  });

  it('analysis/page.tsx 에 pill badge rounded-full 스타일 존재', () => {
    expect(analysisPageSrc).toContain('rounded-full');
  });

  it('wave-528 마커 존재 (test file)', () => {
    expect('wave-528').toContain('wave-528');
  });
});
