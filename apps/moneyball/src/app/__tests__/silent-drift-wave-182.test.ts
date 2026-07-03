import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 182 — guide/seasons/dashboard/mlb-factors 사용자 가시 v1.8 하드코딩 → CURRENT_SCORING_RULE / PRODUCTION_ERA_HISTORY registry', () => {
  it('guide/page.tsx: 하드코딩 "v1.5 / v1.6 / v1.7-revert / v1.8" progression 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/guide/page.tsx'), 'utf8');
    expect(src).not.toMatch(/v1\.5 \/ v1\.6 \/ v1\.7-revert \/ v1\.8/);
  });

  it('guide/page.tsx: PRODUCTION_ERA_HISTORY import + 사용', () => {
    const src = readFileSync(join(ROOT, 'src/app/guide/page.tsx'), 'utf8');
    expect(src).toMatch(/PRODUCTION_ERA_HISTORY/);
    expect(src).toMatch(/PRODUCTION_ERA_HISTORY\.join/);
  });

  it('accuracy/page.tsx: 하드코딩 "v1.5 → v1.6 → v1.7-revert → v1.8 진화 추세" 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/accuracy/page.tsx'), 'utf8');
    expect(src).not.toMatch(/v1\.5 → v1\.6 → v1\.7-revert → v1\.8 진화 추세/);
  });

  it('accuracy/page.tsx: PRODUCTION_ERA_HISTORY import + join 사용', () => {
    const src = readFileSync(join(ROOT, 'src/app/accuracy/page.tsx'), 'utf8');
    expect(src).toMatch(/PRODUCTION_ERA_HISTORY/);
    expect(src).toMatch(/PRODUCTION_ERA_HISTORY\.join/);
  });

  it('seasons/page.tsx: 하드코딩 "(v1.5 ~ v1.8)" 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/seasons/page.tsx'), 'utf8');
    expect(src).not.toMatch(/\(v1\.5 ~ v1\.8\)/);
  });

  it('seasons/page.tsx: CURRENT_SCORING_RULE import + JSX 사용', () => {
    const src = readFileSync(join(ROOT, 'src/app/seasons/page.tsx'), 'utf8');
    expect(src).toMatch(/CURRENT_SCORING_RULE/);
    expect(src).toMatch(/\{CURRENT_SCORING_RULE\}/);
  });

  it('dashboard/page.tsx: metadata description 하드코딩 "(v1.5 ~ v1.8)" 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/dashboard/page.tsx'), 'utf8');
    expect(src).not.toMatch(/\(v1\.5 ~ v1\.8\)/);
  });

  it('dashboard/page.tsx: CURRENT_SCORING_RULE template literal 사용', () => {
    const src = readFileSync(join(ROOT, 'src/app/dashboard/page.tsx'), 'utf8');
    expect(src).toMatch(/\$\{CURRENT_SCORING_RULE\}/);
  });

  it('mlb/factors/page.tsx: 하드코딩 "KBO 모델 v1.8" 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/mlb/factors/page.tsx'), 'utf8');
    expect(src).not.toMatch(/KBO 모델 v1\.8/);
  });

  it('mlb/factors/page.tsx: 하드코딩 "KBO v1.8 매핑" 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/mlb/factors/page.tsx'), 'utf8');
    expect(src).not.toMatch(/KBO v1\.8 매핑/);
  });

  it('mlb/factors/page.tsx: CURRENT_SCORING_RULE import + JSX 사용', () => {
    const src = readFileSync(join(ROOT, 'src/app/mlb/factors/page.tsx'), 'utf8');
    expect(src).toMatch(/CURRENT_SCORING_RULE/);
    expect(src).toMatch(/\{CURRENT_SCORING_RULE\}/);
  });

  it('en/mlb/factors/page.tsx: 하드코딩 "KBO model v1.8" 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/en/mlb/factors/page.tsx'), 'utf8');
    expect(src).not.toMatch(/KBO model v1\.8/);
  });

  it('en/mlb/factors/page.tsx: 하드코딩 "KBO v1.8 mapping" 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/en/mlb/factors/page.tsx'), 'utf8');
    expect(src).not.toMatch(/KBO v1\.8 mapping/);
  });

  it('en/mlb/factors/page.tsx: CURRENT_SCORING_RULE import + JSX 사용', () => {
    const src = readFileSync(join(ROOT, 'src/app/en/mlb/factors/page.tsx'), 'utf8');
    expect(src).toMatch(/CURRENT_SCORING_RULE/);
    expect(src).toMatch(/\{CURRENT_SCORING_RULE\}/);
  });
});
