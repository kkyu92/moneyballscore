import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { confToWinProb, TOP_PICK_CONF_MIN } from '@moneyball/shared';

// wave-505: predictions/[date]/page.tsx — confToWinProb 인라인 수식 swap + TOP_PICK_CONF_MIN 상수 추출
// - `0.5 + tConf / 2` → confToWinProb(tConf) (line ~208)
// - `0.5 + conf / 2` → confToWinProb(conf) (line ~356)
// - `> 0.1` → > TOP_PICK_CONF_MIN (line ~350)

const predictionsPage = readFileSync(
  path.resolve(__dirname, '../predictions/[date]/page.tsx'),
  'utf8',
);

describe('wave-505 — predictions/[date]/page.tsx confToWinProb + TOP_PICK_CONF_MIN 상수 추출', () => {
  it('TOP_PICK_CONF_MIN = 0.1 단일 소스 가드', () => {
    expect(TOP_PICK_CONF_MIN).toBe(0.1);
  });

  it('confToWinProb(0) = 0.5 (박빙 50%)', () => {
    expect(confToWinProb(0)).toBe(0.5);
  });

  it('confToWinProb(1) = 1.0 (100% 확신)', () => {
    expect(confToWinProb(1)).toBe(1.0);
  });

  it('confToWinProb(0.1) = 0.55 (TOP_PICK_CONF_MIN 경계값)', () => {
    expect(confToWinProb(TOP_PICK_CONF_MIN)).toBeCloseTo(0.55, 5);
  });

  it('predictions/[date]/page.tsx: confToWinProb import 존재', () => {
    expect(predictionsPage).toContain('confToWinProb');
  });

  it('predictions/[date]/page.tsx: TOP_PICK_CONF_MIN import 존재', () => {
    expect(predictionsPage).toContain('TOP_PICK_CONF_MIN');
  });

  it('predictions/[date]/page.tsx: 인라인 0.5 + tConf / 2 미사용', () => {
    expect(predictionsPage).not.toContain('0.5 + tConf / 2');
  });

  it('predictions/[date]/page.tsx: 인라인 0.5 + conf / 2 미사용', () => {
    expect(predictionsPage).not.toContain('0.5 + conf / 2');
  });

  it('predictions/[date]/page.tsx: > 0.1 인라인 미사용 (TOP_PICK_CONF_MIN 으로 대체)', () => {
    expect(predictionsPage).not.toContain('confidence ?? 0) > 0.1');
  });

  it('predictions/[date]/page.tsx: TOP_PICK_CONF_MIN 조건 사용', () => {
    expect(predictionsPage).toContain('> TOP_PICK_CONF_MIN');
  });

  it('confToWinProb 호환성 — round trip with * 100', () => {
    const conf = 0.3;
    const winProbPct = Math.round(confToWinProb(conf) * 100);
    expect(winProbPct).toBe(65);
  });
});
