import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../../..');

// cycle 2249 review-code (heavy): 콜드게임/박빙 승부 문구가 MARGIN_BLOWOUT_THRESHOLD/
// MARGIN_CLOSE_GAME_THRESHOLD 상수를 하드코딩 리터럴("10점차"/"1점차")로 중복 —
// matchup 페이지는 profile.summary(buildMatchupSummaryText, 상수 인자로 전달)를
// 그대로 렌더해 single source 지만, team 페이지 3곳은 JSX 안에 숫자를 직접 박아
// 상수 변경 시 silent stale text 위험. 상수 interpolation 으로 정정.
describe('review-code cycle 2249 — 콜드게임/박빙 승부 문구 상수 interpolation (silent stale text 차단)', () => {
  const files = [
    'src/app/teams/[code]/page.tsx',
    'src/app/mlb/team/[code]/page.tsx',
    'src/app/en/mlb/team/[code]/page.tsx',
  ];

  it.each(files)('%s: 콜드게임/박빙 승부 문구에 하드코딩 숫자 리터럴 없음', (rel) => {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    expect(src).not.toMatch(/`콜드게임\(\d/);
    expect(src).not.toMatch(/`박빙 승부\(\d/);
    expect(src).not.toMatch(/blowouts \(\d+\+ run margin\)/);
    expect(src).not.toMatch(/\d+ one-run games/);
  });

  it('KO 팀 페이지가 MARGIN_BLOWOUT_THRESHOLD/MARGIN_CLOSE_GAME_THRESHOLD 를 import + 사용', () => {
    const src = readFileSync(join(ROOT, 'src/app/teams/[code]/page.tsx'), 'utf8');
    expect(src).toMatch(/MARGIN_BLOWOUT_THRESHOLD/);
    expect(src).toMatch(/MARGIN_CLOSE_GAME_THRESHOLD/);
    expect(src).toMatch(/\$\{MARGIN_BLOWOUT_THRESHOLD\}점차 이상/);
    expect(src).toMatch(/\$\{MARGIN_CLOSE_GAME_THRESHOLD\}점차\)/);
  });

  it('MLB 팀 페이지(KO)가 MARGIN_BLOWOUT_THRESHOLD/MARGIN_CLOSE_GAME_THRESHOLD 를 import + 사용', () => {
    const src = readFileSync(join(ROOT, 'src/app/mlb/team/[code]/page.tsx'), 'utf8');
    expect(src).toMatch(/MARGIN_BLOWOUT_THRESHOLD/);
    expect(src).toMatch(/MARGIN_CLOSE_GAME_THRESHOLD/);
  });

  it('MLB 팀 페이지(EN)가 MARGIN_BLOWOUT_THRESHOLD/MARGIN_CLOSE_GAME_THRESHOLD 를 import + 사용', () => {
    const src = readFileSync(join(ROOT, 'src/app/en/mlb/team/[code]/page.tsx'), 'utf8');
    expect(src).toMatch(/MARGIN_BLOWOUT_THRESHOLD/);
    expect(src).toMatch(/MARGIN_CLOSE_GAME_THRESHOLD/);
  });
});
