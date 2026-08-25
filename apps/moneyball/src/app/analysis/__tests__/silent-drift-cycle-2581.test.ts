import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// cycle 2581 polish-ui (2-chain lock fallback): "오늘의 탑픽"(isTopPick) 배지가
// DESIGN.md "Accent gold — 승률 하이라이트" 토큰을 쓰지 않고 3-way drift 상태였음 —
// KBO analysis/page.tsx(wave-377)는 amber-300/500, MLB 4개 미러(analysis+games
// KO/EN, wave-624/plan28 포팅)는 brand-500/400. 인접한 "isBig(빅매치)" 배지는
// 이미 var(--color-accent) 정렬돼 있어 대조군. 5파일 전부 accent 토큰 통일.
// (같은 파일 안 isTopUpcomingPick/isCompleteUpcomingPick 의 amber = 별개 문서화된
// factor 수렴 tier, 2026-07-18 결정 — 본 fix 범위 밖, 건드리지 않음)

describe('cycle 2581 — 탑픽 배지 accent gold 토큰 정렬 (5파일 KO/EN parity)', () => {
  it('KBO analysis/page.tsx: isTopPick 분기가 accent 토큰 사용, 옛 amber 클래스 제거', () => {
    const full = readFileSync(path.resolve(__dirname, '../page.tsx'), 'utf8');
    expect(full).toContain(
      "isTopPick\n                          ? 'bg-white dark:bg-[var(--color-surface-card)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20'",
    );
    expect(full).toContain('text-[var(--color-accent)] font-semibold">★ 탑픽');
    expect(full).not.toContain('border-amber-300 dark:border-amber-700/60 ring-1 ring-amber-300/40 dark:ring-amber-700/30\'\n                          : isPickModelAgree');
    expect(full).not.toContain('text-amber-500 dark:text-amber-400 font-semibold">★ 탑픽');
  });

  const mlbMirrors = [
    '../../mlb/analysis/page.tsx',
    '../../mlb/games/[date]/page.tsx',
    '../../en/mlb/analysis/page.tsx',
    '../../en/mlb/games/[date]/page.tsx',
  ];

  for (const rel of mlbMirrors) {
    it(`${rel}: isTopPick 분기가 accent 토큰 사용, 옛 brand-500 ring 제거`, () => {
      const full = readFileSync(path.resolve(__dirname, rel), 'utf8');
      expect(full).toContain("isTopPick");
      expect(full).toContain("border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/30");
      expect(full).not.toContain(
        'border-brand-500 dark:border-brand-400 ring-1 ring-brand-400 dark:ring-brand-500',
      );
    });
  }
});
