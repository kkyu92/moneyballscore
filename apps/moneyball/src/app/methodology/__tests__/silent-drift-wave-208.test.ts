import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const METHODOLOGY_SRC = readFileSync(join(__dirname, '../page.tsx'), 'utf-8');
const ACCURACY_SRC = readFileSync(join(__dirname, '../../accuracy/page.tsx'), 'utf-8');
const SHADOW_MONITOR_SRC = readFileSync(join(__dirname, '../../v2-shadow-monitor/page.tsx'), 'utf-8');

describe('silent drift wave 208 — stale weight-adjustment claims → v1.8 유지 확정 정합', () => {
  it('methodology does not say "표본이 충분히 쌓이면...가중치 조정에 반영"', () => {
    expect(METHODOLOGY_SRC).not.toMatch(/표본이\s*충분히\s*쌓이면\s*통계적으로/);
  });

  it('methodology says "v1.8 유지 확정 (2026-07-06)"', () => {
    expect(METHODOLOGY_SRC).toMatch(/v1\.8\s*유지\s*확정\s*\(2026-07-06\)/);
  });

  it('accuracy does not say "편향 갭이 큰 팀은 모델 가중치 조정 후보"', () => {
    expect(ACCURACY_SRC).not.toMatch(/편향\s*갭이\s*큰\s*팀은\s*모델\s*가중치\s*조정\s*후보입니다/);
  });

  it('accuracy bias section — dev jargon 제거 확인 (wave-226 clean: "(v1.8 유지 확정)" 삭제)', () => {
    expect(ACCURACY_SRC).toContain('편향 갭이 큰 팀은 모델 진단 참고 지표입니다');
    expect(ACCURACY_SRC).not.toContain('편향 갭이 큰 팀은 모델 진단 참고 지표입니다 (v1.8 유지 확정)');
  });

  it('v2-shadow-monitor does not say "v2.0 가중치 확정 결정의 근거"', () => {
    expect(SHADOW_MONITOR_SRC).not.toMatch(/v2\.0\s*가중치\s*확정\s*결정의\s*근거/);
  });

  it('v2-shadow-monitor says "v1.8 유지 확정 결정의 근거"', () => {
    expect(SHADOW_MONITOR_SRC).toMatch(/v1\.8\s*유지\s*확정\s*결정의\s*근거/);
  });
});
