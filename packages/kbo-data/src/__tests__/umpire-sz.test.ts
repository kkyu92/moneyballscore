import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseUmpiresFromHtml } from '../scrapers/umpire';
import {
  scoreUmpireSZ,
  scoreUmpireSZFromRow,
  umpireSZFactor,
  UMPIRE_SAMPLE_THRESHOLD,
} from '../factors/umpire-sz';

const FIXTURE_DIR = join(__dirname, 'fixtures');
const FIXTURE_FORMAL = readFileSync(join(FIXTURE_DIR, 'kbo-game-score.html'), 'utf8');
const FIXTURE_LABEL = readFileSync(
  join(FIXTURE_DIR, 'kbo-game-score-label-fallback.html'),
  'utf8',
);

// SupabaseClient mock — maybeSingle 가 .data/.error 분기 동작.
function mockDb(returnValue: {
  data?: { name: string; sz_widen_pct: number; sample_n: number } | null;
  error?: { message: string } | null;
}) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve(returnValue),
        }),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('parseUmpiresFromHtml (KBO Score.aspx scraper)', () => {
  it('test 3 — mock fixture (정식 tbl-umpire 셀렉터) HTML parse 4명 추출', () => {
    const umps = parseUmpiresFromHtml(FIXTURE_FORMAL);
    expect(umps.main).toBe('김준희');
    expect(umps.first).toBe('박종철');
    expect(umps.second).toBe('이영재');
    expect(umps.third).toBe('문승훈');
  });

  it('라벨 fallback (정식 셀렉터 부재) HTML parse 4명 추출', () => {
    const umps = parseUmpiresFromHtml(FIXTURE_LABEL);
    expect(umps.main).toBe('최규현');
    expect(umps.first).toBe('한승국');
    expect(umps.second).toBe('황인태');
    expect(umps.third).toBe('송수근');
  });

  it('셀렉터 변경 / 4명 미만 → throw (silent drift 차단)', () => {
    const broken = '<html><body><p>심판 정보 없음</p></body></html>';
    expect(() => parseUmpiresFromHtml(broken)).toThrow(/umpire parse error/);
  });
});

describe('scoreUmpireSZ (factor 12)', () => {
  it('test 1 — DB lookup hit + personalize (sample_n>=30, sz_widen_pct>0)', async () => {
    const db = mockDb({
      data: { name: '김준희', sz_widen_pct: 2.5, sample_n: 45 },
      error: null,
    });
    const score = await scoreUmpireSZ('김준희', db);
    expect(score.homeAdj).toBeCloseTo(0.05, 6);
    expect(score.awayAdj).toBeCloseTo(0.05, 6);
    expect(score.reason).toContain('넓음');
    expect(score.reason).toContain('타자 친화');
    expect(score.reason).toContain('n=45');
  });

  it('test 2 — sample_n<30 fallback (league avg, adj=0)', async () => {
    const db = mockDb({
      data: { name: '신인심판', sz_widen_pct: 5.0, sample_n: 15 },
      error: null,
    });
    const score = await scoreUmpireSZ('신인심판', db);
    expect(score.homeAdj).toBe(0);
    expect(score.awayAdj).toBe(0);
    expect(score.reason).toContain('표본 15');
    expect(score.reason).toContain('league avg');
  });

  it('test 4 — 결측 (DB row null) 시 league avg', async () => {
    const db = mockDb({ data: null, error: null });
    const score = await scoreUmpireSZ('미등록심판', db);
    expect(score.homeAdj).toBe(0);
    expect(score.awayAdj).toBe(0);
    expect(score.reason).toContain('표본 0');
  });

  it('test 5 — sz_widen_pct 음수 (좁음, 투수 친화) 양팀 -5%', async () => {
    const db = mockDb({
      data: { name: '김타이트', sz_widen_pct: -3.5, sample_n: 60 },
      error: null,
    });
    const score = await scoreUmpireSZ('김타이트', db);
    expect(score.homeAdj).toBeCloseTo(-0.05, 6);
    expect(score.awayAdj).toBeCloseTo(-0.05, 6);
    expect(score.reason).toContain('좁음');
    expect(score.reason).toContain('투수 친화');
  });

  it('주심 이름 빈/null 시 결측 fallback (DB 호출 X)', async () => {
    const db = mockDb({ data: null, error: null });
    expect((await scoreUmpireSZ(null, db)).reason).toContain('결측');
    expect((await scoreUmpireSZ('', db)).reason).toContain('결측');
  });

  it('DB error 시 throw (silent skip 금지 — silent-drift-alert 의무)', async () => {
    const db = mockDb({ data: null, error: { message: 'connection timeout' } });
    await expect(scoreUmpireSZ('김준희', db)).rejects.toThrow(/umpire_stats lookup error/);
  });
});

describe('scoreUmpireSZFromRow (direct row path)', () => {
  it('sz_widen_pct=0 → noop (neutral reason)', () => {
    const score = scoreUmpireSZFromRow({ name: '중립심판', sz_widen_pct: 0, sample_n: 50 });
    expect(score.homeAdj).toBe(0);
    expect(score.awayAdj).toBe(0);
    expect(score.reason).toContain('중립');
  });

  it('UMPIRE_SAMPLE_THRESHOLD = 30 (CLAUDE.md 박제)', () => {
    expect(UMPIRE_SAMPLE_THRESHOLD).toBe(30);
  });
});

describe('umpireSZFactor → predictor [0,1] 변환', () => {
  it('대칭 (homeAdj=awayAdj) → 0.5 neutral', () => {
    const score = { homeAdj: -0.05, awayAdj: -0.05, reason: '좁음' };
    expect(umpireSZFactor(score)).toBe(0.5);
  });

  it('clamp [0, 1]', () => {
    expect(umpireSZFactor({ homeAdj: 1, awayAdj: -1, reason: '' })).toBe(1);
    expect(umpireSZFactor({ homeAdj: -1, awayAdj: 1, reason: '' })).toBe(0);
  });
});
