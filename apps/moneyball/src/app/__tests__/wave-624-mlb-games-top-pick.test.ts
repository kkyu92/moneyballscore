import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { TOP_PICK_CONF_MIN, confToWinProb } from '@moneyball/shared';

// wave-624: mlb/games/[date] KO/EN — KBO predictions/[date] 의 "최고 자신감 픽"
// (topPick) 패턴을 MLB 게임 리스트에 이식 (cycle 2131 후속, explore-idea heavy).
// - TOP_PICK_MIN_WIN_PCT = round(confToWinProb(TOP_PICK_CONF_MIN) * 100) = 55
// - topPick anchor(#pick-<id>) 딥링크 + ⭐ 배지 + ring 하이라이트

const koPage = readFileSync(
  path.resolve(__dirname, '../mlb/games/[date]/page.tsx'),
  'utf8',
);
const enPage = readFileSync(
  path.resolve(__dirname, '../en/mlb/games/[date]/page.tsx'),
  'utf8',
);

describe('wave-624 — MLB games list top-pick 딥링크 KO/EN parity', () => {
  it('TOP_PICK_MIN_WIN_PCT 환산값 = 55 (confToWinProb(TOP_PICK_CONF_MIN)*100)', () => {
    expect(Math.round(confToWinProb(TOP_PICK_CONF_MIN) * 100)).toBe(55);
  });

  for (const [label, page] of [['KO', koPage], ['EN', enPage]] as const) {
    it(`${label}: TOP_PICK_CONF_MIN / confToWinProb import 존재`, () => {
      expect(page).toContain('TOP_PICK_CONF_MIN');
      expect(page).toContain('confToWinProb');
    });

    it(`${label}: topPick 계산 (conf > TOP_PICK_MIN_WIN_PCT 필터 + desc 정렬)`, () => {
      expect(page).toContain('TOP_PICK_MIN_WIN_PCT');
      expect(page).toContain('.filter((p) => p.conf > TOP_PICK_MIN_WIN_PCT)');
      expect(page).toContain('.sort((a, b) => b.conf - a.conf)[0]');
    });

    it(`${label}: 앵커 딥링크 (#pick-<id>) + li id 존재`, () => {
      expect(page).toContain('href={`#pick-${topPick.external_game_id}`}');
      expect(page).toContain('id={`pick-${p.external_game_id}`}');
    });

    it(`${label}: isTopPick 하이라이트(⭐ + ring) 존재`, () => {
      expect(page).toContain('isTopPick');
      expect(page).toContain('⭐');
      // cycle 2581 polish-ui: 승률 하이라이트 = DESIGN.md accent gold 토큰 정렬 (brand-400 → --color-accent)
      expect(page).toContain('ring-1 ring-[var(--color-accent)]');
    });
  }
});
