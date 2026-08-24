import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MLB_SCORING_RULE } from '@moneyball/shared';

const KO_SRC = readFileSync(join(__dirname, '../page.tsx'), 'utf-8');
const EN_SRC = readFileSync(join(__dirname, '../../../en/mlb/methodology/page.tsx'), 'utf-8');

describe('/mlb/methodology + /en/mlb/methodology (cycle 2245 explore-idea — KBO /methodology parity)', () => {
  it('KO page canonical + language alternates point at correct routes', () => {
    expect(KO_SRC).toContain("canonical: `${SITE_URL}/mlb/methodology`");
    expect(KO_SRC).toContain('en: `${SITE_URL}/en/mlb/methodology`');
  });

  it('EN page canonical + language alternates point at correct routes', () => {
    expect(EN_SRC).toContain("canonical: `${SITE_URL}/en/mlb/methodology`");
    expect(EN_SRC).toContain('ko: `${SITE_URL}/mlb/methodology`');
  });

  it('KO page references the real MLB scoring_rule constant (no hardcoded drift-prone literal)', () => {
    expect(KO_SRC).toContain('MLB_SCORING_RULE');
    expect(MLB_SCORING_RULE).toBe('mlb_v0.1');
  });

  it('both pages link to /mlb/factors instead of duplicating the weight table', () => {
    expect(KO_SRC).toContain('href="/mlb/factors"');
    expect(EN_SRC).toContain('href="/en/mlb/factors"');
  });

  it('both pages link to /mlb/accuracy for verification', () => {
    expect(KO_SRC).toContain('href="/mlb/accuracy"');
    expect(EN_SRC).toContain('href="/en/mlb/accuracy"');
  });

  it('EN page passes locale="en" to Breadcrumb (cycle 2139 pattern)', () => {
    expect(EN_SRC).toMatch(/locale="en"/);
  });
});

describe('/mlb/methodology placeholder-factor claim (cycle 2512 silent drift fix)', () => {
  it('does not claim recent_form/head_to_head are still unwired (wired since cycle 2353)', () => {
    expect(KO_SRC).not.toContain('최근폼·상대전적·수비 SFR');
  });

  it('references MLB_PLACEHOLDER_FACTOR_KEYS as single source, not an isolated literal', () => {
    expect(KO_SRC).toContain('MLB_PLACEHOLDER_FACTOR_KEYS');
  });
});
