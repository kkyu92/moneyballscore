import { describe, expect, it } from 'vitest';
import { shouldAlertSilentDrift } from '../pipeline/silent-drift-alert';
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

  it('predict mode 는 alert 안 함 — 다음 cron 재시도 가능', () => {
    expect(shouldAlertSilentDrift(makeMeta({ mode: 'predict' }))).toBe(false);
  });

  it('announce mode 는 alert 안 함', () => {
    expect(shouldAlertSilentDrift(makeMeta({ mode: 'announce' }))).toBe(false);
  });

  it('verify mode 는 alert 안 함', () => {
    expect(shouldAlertSilentDrift(makeMeta({ mode: 'verify' }))).toBe(false);
  });

  it('gamesFound=0 (경기 없음 정상) 시 alert 안 함', () => {
    expect(shouldAlertSilentDrift(makeMeta({ gamesFound: 0 }))).toBe(false);
  });

  it('predictionsGenerated>0 (정상 예측 박제) 시 alert 안 함', () => {
    expect(shouldAlertSilentDrift(makeMeta({ predictionsGenerated: 3 }))).toBe(false);
  });

  it('predictionsGenerated=1 partial 도 silent drift X (최소 1건 박제 = 정상)', () => {
    expect(shouldAlertSilentDrift(makeMeta({ predictionsGenerated: 1, gamesFound: 5 }))).toBe(false);
  });

  it('errors 있어도 silent drift 매핑 — errors 발생 + predictions=0 + games>0 모두 alert', () => {
    expect(
      shouldAlertSilentDrift(
        makeMeta({ errors: ['fetchGames: timeout', 'agent_fallback'] }),
      ),
    ).toBe(true);
  });
});
