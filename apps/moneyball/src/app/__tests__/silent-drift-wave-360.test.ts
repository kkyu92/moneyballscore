import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ACCURACY_OK_PCT, ACCURACY_WARN_PCT, ACCURACY_OK_RATE, ACCURACY_WARN_RATE } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ACCURACY_PAGE = join(ROOT, 'src/app/accuracy/page.tsx');
const MODEL_VERSION_HISTORY = join(ROOT, 'src/components/accuracy/ModelVersionHistory.tsx');

describe('wave-360 — 적중률 색상 임계 단일 source (cycle 1698)', () => {
  it('ACCURACY_OK_PCT = 55', () => {
    expect(ACCURACY_OK_PCT).toBe(55);
  });

  it('ACCURACY_WARN_PCT = 45', () => {
    expect(ACCURACY_WARN_PCT).toBe(45);
  });

  it('ACCURACY_OK_RATE = ACCURACY_OK_PCT / 100', () => {
    expect(ACCURACY_OK_RATE).toBeCloseTo(ACCURACY_OK_PCT / 100, 5);
  });

  it('ACCURACY_WARN_RATE = ACCURACY_WARN_PCT / 100', () => {
    expect(ACCURACY_WARN_RATE).toBeCloseTo(ACCURACY_WARN_PCT / 100, 5);
  });

  it('accuracy/page.tsx: hardcoded 0.55 없음', () => {
    const src = readFileSync(ACCURACY_PAGE, 'utf8');
    expect(src).not.toMatch(/acc >= 0\.55/);
  });

  it('accuracy/page.tsx: hardcoded 0.45 없음', () => {
    const src = readFileSync(ACCURACY_PAGE, 'utf8');
    expect(src).not.toMatch(/acc >= 0\.45/);
  });

  it('accuracy/page.tsx: hardcoded pct >= 55 없음', () => {
    const src = readFileSync(ACCURACY_PAGE, 'utf8');
    expect(src).not.toMatch(/pct >= 55/);
  });

  it('accuracy/page.tsx: ACCURACY_OK_RATE 임포트', () => {
    const src = readFileSync(ACCURACY_PAGE, 'utf8');
    expect(src).toContain('ACCURACY_OK_RATE');
    expect(src).toContain('ACCURACY_WARN_RATE');
    expect(src).toContain('ACCURACY_OK_PCT');
  });

  it('ModelVersionHistory.tsx: hardcoded pct >= 55 없음', () => {
    const src = readFileSync(MODEL_VERSION_HISTORY, 'utf8');
    expect(src).not.toMatch(/pct >= 55/);
    expect(src).not.toMatch(/pct >= 45/);
  });

  it('ModelVersionHistory.tsx: ACCURACY_OK_PCT 임포트', () => {
    const src = readFileSync(MODEL_VERSION_HISTORY, 'utf8');
    expect(src).toContain('ACCURACY_OK_PCT');
    expect(src).toContain('ACCURACY_WARN_PCT');
  });
});
