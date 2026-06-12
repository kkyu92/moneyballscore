// cycle Plan C Task 1 — MLB mode 매핑 테스트
// mlb_predict_final: KBO predict_final 과 동일 로직 (predictions coverage)
// mlb_statsapi_scrape 등: gamesFound>0 && rowsInserted(=predictionsGenerated)=0 → alert

import { describe, expect, it } from 'vitest';
import { shouldAlertSilentDrift } from '../pipeline/silent-drift-alert';
import type { SilentDriftAlertMeta } from '../pipeline/silent-drift-alert';

function makeMlbMeta(
  mode: SilentDriftAlertMeta['mode'],
  overrides: Partial<SilentDriftAlertMeta> = {},
): SilentDriftAlertMeta {
  return {
    mode,
    date: '2026-06-12',
    gamesFound: 5,
    predictionsGenerated: 0,
    errors: [],
    ...overrides,
  };
}

describe('shouldAlertSilentDrift — MLB mlb_predict_final', () => {
  it('mlb_predict_final + gamesFound>0 + predictionsGenerated=0 → alert (KBO predict_final 동일 로직)', () => {
    expect(shouldAlertSilentDrift(makeMlbMeta('mlb_predict_final'))).toBe(true);
  });

  it('mlb_predict_final + existing=games → alert 안 함 (false positive fix)', () => {
    expect(
      shouldAlertSilentDrift(
        makeMlbMeta('mlb_predict_final', { existingPredictionsCount: 5 }),
      ),
    ).toBe(false);
  });

  it('mlb_predict_final + existing+generated partial → alert (real silent drop)', () => {
    expect(
      shouldAlertSilentDrift(
        makeMlbMeta('mlb_predict_final', { existingPredictionsCount: 3 }),
      ),
    ).toBe(true);
  });

  it('mlb_predict_final + gamesFound=0 → alert 안 함 (경기 없음 정상)', () => {
    expect(shouldAlertSilentDrift(makeMlbMeta('mlb_predict_final', { gamesFound: 0 }))).toBe(false);
  });

  it('mlb_predict_final + predictionsGenerated=games → alert 안 함 (정상)', () => {
    expect(
      shouldAlertSilentDrift(makeMlbMeta('mlb_predict_final', { predictionsGenerated: 5 })),
    ).toBe(false);
  });
});

describe('shouldAlertSilentDrift — MLB scrape modes (statsapi/fancy/savant/shadow_train/walk_forward)', () => {
  const scrapeModes: SilentDriftAlertMeta['mode'][] = [
    'mlb_statsapi_scrape',
    'mlb_fancy_scrape',
    'mlb_savant_scrape',
    'mlb_shadow_train',
    'mlb_walk_forward_measure',
  ];

  for (const mode of scrapeModes) {
    it(`${mode} + gamesFound>0 + rowsInserted=0 → alert`, () => {
      expect(shouldAlertSilentDrift(makeMlbMeta(mode, { predictionsGenerated: 0 }))).toBe(true);
    });

    it(`${mode} + gamesFound>0 + rowsInserted>0 → alert 안 함 (정상)`, () => {
      expect(
        shouldAlertSilentDrift(makeMlbMeta(mode, { predictionsGenerated: 3 })),
      ).toBe(false);
    });

    it(`${mode} + gamesFound=0 → alert 안 함 (경기 없음 정상)`, () => {
      expect(
        shouldAlertSilentDrift(makeMlbMeta(mode, { gamesFound: 0, predictionsGenerated: 0 })),
      ).toBe(false);
    });
  }
});

describe('shouldAlertSilentDrift — mlb_combined_notify (alert 안 함 — notify only)', () => {
  it('mlb_combined_notify + gamesFound>0 → alert 안 함 (notify mode는 rowsInserted 무관)', () => {
    // mlb_combined_notify 는 MLB_SCRAPE_MODES 에 없음 → false
    expect(
      shouldAlertSilentDrift(makeMlbMeta('mlb_combined_notify', { predictionsGenerated: 0 })),
    ).toBe(false);
  });
});

describe('shouldAlertSilentDrift — KBO 기존 동작 보존 (regression)', () => {
  it('predict_final + gamesFound>0 + predictionsGenerated=0 → alert (기존 보존)', () => {
    expect(
      shouldAlertSilentDrift({
        mode: 'predict_final',
        date: '2026-06-12',
        gamesFound: 5,
        predictionsGenerated: 0,
        errors: [],
      }),
    ).toBe(true);
  });

  it('verify mode + verifiedCount=0 → alert (기존 보존)', () => {
    expect(
      shouldAlertSilentDrift({
        mode: 'verify',
        date: '2026-06-12',
        gamesFound: 5,
        predictionsGenerated: 0,
        errors: [],
        verifiedCount: 0,
      }),
    ).toBe(true);
  });

  it('predict mode → alert 안 함 (기존 보존)', () => {
    expect(
      shouldAlertSilentDrift({
        mode: 'predict',
        date: '2026-06-12',
        gamesFound: 5,
        predictionsGenerated: 0,
        errors: [],
      }),
    ).toBe(false);
  });
});
