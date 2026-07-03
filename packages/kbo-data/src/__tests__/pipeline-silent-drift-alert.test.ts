import { describe, expect, it } from 'vitest';
import { shouldAlertSilentDrift, shouldConfidenceFlatAlert } from '../pipeline/silent-drift-alert';
import type { SilentDriftAlertMeta } from '../pipeline/silent-drift-alert';

function makeMeta(overrides: Partial<SilentDriftAlertMeta> = {}): SilentDriftAlertMeta {
  return {
    mode: 'predict_final',
    date: '2026-05-20',
    gamesFound: 5,
    predictionsGenerated: 0,
    errors: [],
    ...overrides,
  };
}

describe('shouldAlertSilentDrift', () => {
  it('predict_final + gamesFound>0 + predictionsGenerated=0 → alert (사례 11 패턴)', () => {
    expect(shouldAlertSilentDrift(makeMeta())).toBe(true);
  });

  it('predict_final + 모든 games 이미 predict mode 에서 박제됨 (existing=games) → alert 안 함 (cycle 864 86% false positive fix)', () => {
    expect(
      shouldAlertSilentDrift(makeMeta({ gamesFound: 5, predictionsGenerated: 0, existingPredictionsCount: 5 })),
    ).toBe(false);
  });

  it('predict_final + existing+generated 가 games 부분 cover (gap 있음) → alert (real silent drop)', () => {
    expect(
      shouldAlertSilentDrift(makeMeta({ gamesFound: 5, predictionsGenerated: 0, existingPredictionsCount: 3 })),
    ).toBe(true);
  });

  it('predict_final + existing+generated 가 games 모두 cover (mixed) → alert 안 함', () => {
    expect(
      shouldAlertSilentDrift(makeMeta({ gamesFound: 5, predictionsGenerated: 2, existingPredictionsCount: 3 })),
    ).toBe(false);
  });

  it('existingPredictionsCount 미지정 시 0 으로 fallback (기존 동작 보존)', () => {
    expect(shouldAlertSilentDrift(makeMeta({ gamesFound: 5, predictionsGenerated: 0 }))).toBe(true);
  });

  it('predict mode 는 alert 안 함 — 다음 cron 재시도 가능', () => {
    expect(shouldAlertSilentDrift(makeMeta({ mode: 'predict' }))).toBe(false);
  });

  it('announce mode 는 alert 안 함', () => {
    expect(shouldAlertSilentDrift(makeMeta({ mode: 'announce' }))).toBe(false);
  });

  it('verify mode + verifiedCount 미지정 → 기존 동작 보존 (alert 안 함)', () => {
    expect(shouldAlertSilentDrift(makeMeta({ mode: 'verify' }))).toBe(false);
  });

  it('verify mode + games>0 + verified=0 → alert (cycle 886 verify family extension)', () => {
    expect(
      shouldAlertSilentDrift(makeMeta({ mode: 'verify', gamesFound: 5, verifiedCount: 0 })),
    ).toBe(true);
  });

  it('verify mode + games>0 + verified>0 → alert 안 함 (정상 verify)', () => {
    expect(
      shouldAlertSilentDrift(makeMeta({ mode: 'verify', gamesFound: 5, verifiedCount: 3 })),
    ).toBe(false);
  });

  it('verify mode + games=0 → alert 안 함 (경기 없음 정상)', () => {
    expect(
      shouldAlertSilentDrift(makeMeta({ mode: 'verify', gamesFound: 0, verifiedCount: 0 })),
    ).toBe(false);
  });

  it('gamesFound=0 (경기 없음 정상) 시 alert 안 함', () => {
    expect(shouldAlertSilentDrift(makeMeta({ gamesFound: 0 }))).toBe(false);
  });

  it('predictionsGenerated 가 모든 games 를 cover 시 alert 안 함', () => {
    expect(shouldAlertSilentDrift(makeMeta({ predictionsGenerated: 5, gamesFound: 5 }))).toBe(false);
  });

  it('predictionsGenerated partial + existing 보완하여 모두 cover → alert 안 함', () => {
    expect(
      shouldAlertSilentDrift(makeMeta({ predictionsGenerated: 1, gamesFound: 5, existingPredictionsCount: 4 })),
    ).toBe(false);
  });

  it('predictionsGenerated partial + existing 없음 → covered < games → alert (real partial silent drop)', () => {
    expect(shouldAlertSilentDrift(makeMeta({ predictionsGenerated: 3, gamesFound: 5 }))).toBe(true);
  });

  it('errors 있어도 silent drift 매핑 — errors 발생 + predictions=0 + games>0 모두 alert', () => {
    expect(
      shouldAlertSilentDrift(
        makeMeta({ errors: ['fetchGames: timeout', 'agent_fallback'] }),
      ),
    ).toBe(true);
  });

  // cycle 1363 — postview cohort 확장 (사례 11 family).
  // postview-daily 의 eligibleGames>0 + processed=0 = silent postview drop.
  // gamesFound = eligibleGames / predictionsGenerated = processed 매핑.
  it('postview mode + gamesFound>0 + predictionsGenerated=0 → alert (silent postview drop)', () => {
    expect(
      shouldAlertSilentDrift(makeMeta({ mode: 'postview', gamesFound: 3, predictionsGenerated: 0 })),
    ).toBe(true);
  });

  it('postview mode + gamesFound>0 + predictionsGenerated>0 → alert 안 함 (정상 postview)', () => {
    expect(
      shouldAlertSilentDrift(makeMeta({ mode: 'postview', gamesFound: 3, predictionsGenerated: 2 })),
    ).toBe(false);
  });

  it('postview mode + gamesFound=0 → alert 안 함 (eligible 경기 없음 정상)', () => {
    expect(
      shouldAlertSilentDrift(makeMeta({ mode: 'postview', gamesFound: 0, predictionsGenerated: 0 })),
    ).toBe(false);
  });

  it('postview mode + processed partial (gamesFound > 0, predictionsGenerated > 0 단 < gamesFound) → alert 안 함 (1+ 박제 = 인프라 작동, 개별 game 실패는 errors 채널)', () => {
    expect(
      shouldAlertSilentDrift(makeMeta({ mode: 'postview', gamesFound: 5, predictionsGenerated: 1 })),
    ).toBe(false);
  });
});

describe('shouldConfidenceFlatAlert — P2 aggregate signal', () => {
  it('P2 패턴: 모든 confidence 0.3 flat → alert (spread=0)', () => {
    expect(shouldConfidenceFlatAlert([0.3, 0.3, 0.3, 0.3, 0.3])).toBe(true);
  });

  it('spread=0.019 (임계 미만) → alert', () => {
    expect(shouldConfidenceFlatAlert([0.3, 0.31, 0.319])).toBe(true);
  });

  it('spread=0.02 (임계 동일) → alert 안 함 (정상 다양성)', () => {
    expect(shouldConfidenceFlatAlert([0.3, 0.32])).toBe(false);
  });

  it('spread > 0.02 → alert 안 함', () => {
    expect(shouldConfidenceFlatAlert([0.3, 0.5, 0.7])).toBe(false);
  });

  it('games < 3 (CONFIDENCE_FLAT_MIN_GAMES 미달) → alert 안 함', () => {
    expect(shouldConfidenceFlatAlert([0.3, 0.3])).toBe(false);
  });

  it('빈 배열 → alert 안 함', () => {
    expect(shouldConfidenceFlatAlert([])).toBe(false);
  });

  it('정상 다양성 (quant-only, debate 없음) → alert 안 함', () => {
    expect(shouldConfidenceFlatAlert([0.55, 0.62, 0.48, 0.71])).toBe(false);
  });
});
