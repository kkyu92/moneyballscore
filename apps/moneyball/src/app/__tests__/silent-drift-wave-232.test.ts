import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const MEGAMENU_SRC = readFileSync(join(__dirname, '../../components/layout/MegaMenu.tsx'), 'utf-8');
const NAVLINKS_SRC = readFileSync(join(__dirname, '../../components/layout/NavLinks.tsx'), 'utf-8');
const HEADER_SRC = readFileSync(join(__dirname, '../../components/layout/Header.tsx'), 'utf-8');
const LEADERBOARD_TYPES_SRC = readFileSync(join(__dirname, '../../lib/leaderboard/types.ts'), 'utf-8');
const LEADERBOARD_SERVER_SRC = readFileSync(join(__dirname, '../../lib/leaderboard/server.ts'), 'utf-8');
const PARSE_SRC = readFileSync(join(__dirname, '../../lib/v2-shadow-monitor/parse.ts'), 'utf-8');
const BUILD_ACCURACY_SRC = readFileSync(join(__dirname, '../../lib/accuracy/buildAccuracyData.ts'), 'utf-8');
const METHODOLOGY_SRC = readFileSync(join(__dirname, '../methodology/page.tsx'), 'utf-8');

describe('silent drift wave 232 — stale plan/cycle-ref annotations + dev jargon (cycle 1531)', () => {
  it('MegaMenu does not contain "cycle 1042"', () => {
    expect(MEGAMENU_SRC).not.toContain('cycle 1042');
  });

  it('MegaMenu does not contain "cycle 1044"', () => {
    expect(MEGAMENU_SRC).not.toContain('cycle 1044');
  });

  it('NavLinks does not contain "cycle 1021"', () => {
    expect(NAVLINKS_SRC).not.toContain('cycle 1021');
  });

  it('NavLinks does not contain "plan #21 Step 2 (cycle 1093)"', () => {
    expect(NAVLINKS_SRC).not.toContain('plan #21 Step 2 (cycle 1093)');
  });

  it('Header does not contain "cycle 1064 plan #20"', () => {
    expect(HEADER_SRC).not.toContain('cycle 1064 plan #20');
  });

  it('Header does not contain "cycle 1129 v17 candidate O"', () => {
    expect(HEADER_SRC).not.toContain('cycle 1129 v17 candidate O');
  });

  it('leaderboard/types does not contain "cycle 1021 c10"', () => {
    expect(LEADERBOARD_TYPES_SRC).not.toContain('cycle 1021 c10');
  });

  it('leaderboard/server does not contain "cycle 1021 c10"', () => {
    expect(LEADERBOARD_SERVER_SRC).not.toContain('cycle 1021 c10');
  });

  it('v2-shadow-monitor/parse does not contain "cycle 1103 explore-idea"', () => {
    expect(PARSE_SRC).not.toContain('cycle 1103 explore-idea');
  });

  it('buildAccuracyData does not contain "plan #8 Tier 1 M5+M10"', () => {
    expect(BUILD_ACCURACY_SRC).not.toContain('plan #8 Tier 1 M5+M10');
  });

  it('buildAccuracyData does not contain "plan #14 C2 (a2 cycle 1021)"', () => {
    expect(BUILD_ACCURACY_SRC).not.toContain('plan #14 C2 (a2 cycle 1021)');
  });

  it('buildAccuracyData does not contain "wave 117 (cycle 1334)"', () => {
    expect(BUILD_ACCURACY_SRC).not.toContain('wave 117 (cycle 1334)');
  });

  it('methodology page does not use "실측 검증" in user-visible heading', () => {
    expect(METHODOLOGY_SRC).not.toContain('실측 검증');
  });

  it('methodology page does not use "실측치는" in user-visible text', () => {
    expect(METHODOLOGY_SRC).not.toContain('실측치는');
  });
});
