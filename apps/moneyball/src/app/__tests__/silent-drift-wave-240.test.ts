/**
 * wave-240 regression guard — stale cycle-ref annotations removed.
 * Files: opengraph-image.tsx / debug/* pages / methodology + about + mlb/* pages / lib/predictions + design-tokens + tabpfn
 */

import * as fs from 'fs';
import * as path from 'path';

const APP = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(APP, rel), 'utf8');

describe('wave-240: stale cycle-ref annotations removed', () => {
  describe('opengraph-image.tsx', () => {
    const src = read('src/app/predictions/[date]/opengraph-image.tsx');
    it('no cycle 1021 prefix comment', () => {
      expect(src).not.toMatch(/\/\/ cycle 1021/);
    });
    it('no JSX cycle 1021 comment', () => {
      expect(src).not.toMatch(/\{\/\*.*cycle 1021.*\*\/\}/);
    });
    it('top pick logic preserved', () => {
      expect(src).toMatch(/top pick = highest winner prob/);
    });
  });

  describe('debug/agent-fallback/page.tsx', () => {
    const src = read('src/app/debug/agent-fallback/page.tsx');
    it('no cycle 986 prefix comment', () => {
      expect(src).not.toMatch(/\/\/ cycle 986/);
    });
    it('no JSX cycle 986 text', () => {
      expect(src).not.toMatch(/\(cycle 986\)/);
    });
    it('dashboard content preserved', () => {
      expect(src).toMatch(/\/debug\/agent-fallback dashboard/);
    });
  });

  describe('methodology/page.tsx', () => {
    const src = read('src/app/methodology/page.tsx');
    it('no cycle 1268 ref', () => {
      expect(src).not.toMatch(/\(cycle 1268\)/);
    });
    it('no cycle 1269 ref', () => {
      expect(src).not.toMatch(/\(cycle 1269\)/);
    });
    it('wave refs preserved', () => {
      expect(src).toMatch(/silent drift family wave 68/);
      expect(src).toMatch(/silent drift family wave 69/);
    });
  });

  describe('about/page.tsx', () => {
    const src = read('src/app/about/page.tsx');
    it('no cycle 1269 ref', () => {
      expect(src).not.toMatch(/\(cycle 1269\)/);
    });
    it('wave 69 ref preserved', () => {
      expect(src).toMatch(/wave 69/);
    });
  });

  describe('en/mlb/page.tsx', () => {
    const src = read('src/app/en/mlb/page.tsx');
    it('no cycle 1151 ref', () => {
      expect(src).not.toMatch(/\(cycle 1151\)/);
    });
    it('migration note preserved', () => {
      expect(src).toMatch(/033-037 applied/);
    });
  });

  describe('en/mlb/games/[date]/page.tsx', () => {
    const src = read('src/app/en/mlb/games/[date]/page.tsx');
    it('no cycle 1151 ref', () => {
      expect(src).not.toMatch(/\(cycle 1151\)/);
    });
    it('migration note preserved', () => {
      expect(src).toMatch(/033-037 applied/);
    });
  });

  describe('mlb/wild-card/page.tsx', () => {
    const src = read('src/app/mlb/wild-card/page.tsx');
    it('no user-visible cycle 1029 dev jargon', () => {
      expect(src).not.toMatch(/\(cycle 1029\)/);
    });
    it('hub description preserved', () => {
      expect(src).toMatch(/Header NAV 깨진 link 회수 layer/);
    });
  });

  describe('mlb/postseason/page.tsx', () => {
    const src = read('src/app/mlb/postseason/page.tsx');
    it('no user-visible cycle 1029 dev jargon', () => {
      expect(src).not.toMatch(/\(cycle 1029\)/);
    });
    it('hub description preserved', () => {
      expect(src).toMatch(/Header NAV 깨진 link 회수 layer/);
    });
  });

  describe('mlb/factors/page.tsx', () => {
    const src = read('src/app/mlb/factors/page.tsx');
    it('no cycle 1256 ref', () => {
      expect(src).not.toMatch(/\(cycle 1256 박제\)/);
    });
    it('wave 60 ref preserved', () => {
      expect(src).toMatch(/silent drift wave 60/);
    });
  });

  describe('mlb/page.tsx', () => {
    const src = read('src/app/mlb/page.tsx');
    it('no cycle 1151 ref', () => {
      expect(src).not.toMatch(/\(cycle 1151\)/);
    });
    it('migration note preserved', () => {
      expect(src).toMatch(/033-037 적용 완료/);
    });
  });

  describe('mlb/games/[date]/page.tsx', () => {
    const src = read('src/app/mlb/games/[date]/page.tsx');
    it('no cycle 1151 ref', () => {
      expect(src).not.toMatch(/\(cycle 1151\)/);
    });
    it('migration note preserved', () => {
      expect(src).toMatch(/033-037 적용 완료/);
    });
  });

  describe('debug/factor-correlation/page.tsx', () => {
    const src = read('src/app/debug/factor-correlation/page.tsx');
    it('no cycle 470 ref', () => {
      expect(src).not.toMatch(/\(cycle 470\)/);
    });
    it('HOME_ADVANTAGE source note preserved', () => {
      expect(src).toMatch(/HOME_ADVANTAGE 단일 source/);
    });
  });

  describe('debug/deploy-drift/page.tsx', () => {
    const src = read('src/app/debug/deploy-drift/page.tsx');
    it('no cycle 838 ref in comment or JSX', () => {
      expect(src).not.toMatch(/cycle 838/);
    });
    it('no cycle 884 ref in JSX', () => {
      expect(src).not.toMatch(/cycle 884/);
    });
    it('cron note preserved', () => {
      expect(src).toMatch(/매시간 cron/);
    });
  });

  describe('lib/design-tokens.ts', () => {
    const src = read('src/lib/design-tokens.ts');
    it('no cycle 1371 ref', () => {
      expect(src).not.toMatch(/\(cycle 1371\)/);
    });
    it('wave 144 ref preserved', () => {
      expect(src).toMatch(/wave 144/);
    });
  });

  describe('lib/predictions/v2Predictor.ts', () => {
    const src = read('src/lib/predictions/v2Predictor.ts');
    it('no cycle 1013 ref', () => {
      expect(src).not.toMatch(/cycle 1013/);
    });
    it('packages/shared source note preserved', () => {
      expect(src).toMatch(/packages\/shared 단일 source/);
    });
  });

  describe('lib/predictions/factorLabels.ts', () => {
    const src = read('src/lib/predictions/factorLabels.ts');
    it('no cycle 1244 ref', () => {
      expect(src).not.toMatch(/\(cycle 1244 wave 52\)/);
    });
    it('wave 52 ref preserved', () => {
      expect(src).toMatch(/wave 52/);
    });
  });

  describe('lib/tabpfn-import.ts', () => {
    const src = read('src/lib/tabpfn-import.ts');
    it('no cycle 1137 ref', () => {
      expect(src).not.toMatch(/cycle 1137/);
    });
    it('v18 candidate label preserved', () => {
      expect(src).toMatch(/v18 candidate Y/);
    });
  });

  describe('lib/tabpfn-export.ts', () => {
    const src = read('src/lib/tabpfn-export.ts');
    it('no cycle 1130 ref', () => {
      expect(src).not.toMatch(/cycle 1130/);
    });
    it('v17 candidate label preserved', () => {
      expect(src).toMatch(/v17 candidate P/);
    });
  });
});
