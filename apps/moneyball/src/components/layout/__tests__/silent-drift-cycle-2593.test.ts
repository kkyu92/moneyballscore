import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 2593 review-code(heavy): focus-ring axis 첫 발견 — 헤더 LeagueSelector 만 유일하게
// ring 기반(focus-visible:ring-2 ring-brand-400) 사용. 같은 헤더 family(MegaMenu TRIGGER_BASE,
// MobileNav 항목)는 전부 outline 기반(focus-visible:outline-2 outline-offset-2 outline-brand-500).
// 사이트 전체 focus-visible:outline-* 314건 중 outline 기반이 dominant(ring 기반은 이 파일 1건).

const src = readFileSync(join(__dirname, '../LeagueSelector.tsx'), 'utf8');

describe('silent drift cycle 2593 — LeagueSelector focus-ring → outline 정렬', () => {
  it('헤더 pill focus-visible = outline 기반 (MegaMenu TRIGGER_BASE 정렬)', () => {
    expect(src).toContain(
      'focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
    );
  });

  it('ring 기반 focus-visible 잔존 0건', () => {
    expect(src).not.toContain('focus-visible:ring');
  });
});
