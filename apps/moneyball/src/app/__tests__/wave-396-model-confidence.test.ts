import { describe, it, expect } from 'vitest';

// wave-396: 팩터 수렴 픽 — 모델 확신도 probPct + 팩터-모델 합치 여부 로직 박제
// analysis/page.tsx line 976-979
// probPct = 우세 팀 승률 (favoredHome ? homeWinProb : 1 - homeWinProb)
// modelAgrees = predictedWinnerCode === favoredCode

describe('wave-396: factorPick modelAgrees + probPct 계산 로직', () => {
  // 로직 재현 헬퍼
  function computePick({
    compositeDuelScore,
    homeCode,
    awayCode,
    homeWinProb,
    predictedWinnerCode,
  }: {
    compositeDuelScore: number;
    homeCode: string;
    awayCode: string;
    homeWinProb: number;
    predictedWinnerCode: string | null;
  }) {
    const favoredHome = compositeDuelScore > 0;
    const favoredCode = favoredHome ? homeCode : awayCode;
    const modelAgrees = predictedWinnerCode != null && predictedWinnerCode === favoredCode;
    const probPct = favoredHome
      ? Math.round(homeWinProb * 100)
      : Math.round((1 - homeWinProb) * 100);
    return { favoredHome, favoredCode, modelAgrees, probPct };
  }

  it('홈 우세 + 모델 동의: probPct = homeWinProb%, modelAgrees=true', () => {
    const r = computePick({
      compositeDuelScore: 6,
      homeCode: 'LG',
      awayCode: 'SS',
      homeWinProb: 0.65,
      predictedWinnerCode: 'LG',
    });
    expect(r.favoredHome).toBe(true);
    expect(r.favoredCode).toBe('LG');
    expect(r.probPct).toBe(65);
    expect(r.modelAgrees).toBe(true);
  });

  it('원정 우세 + 모델 동의: probPct = (1-homeWinProb)%, modelAgrees=true', () => {
    const r = computePick({
      compositeDuelScore: -6,
      homeCode: 'LG',
      awayCode: 'SS',
      homeWinProb: 0.35,
      predictedWinnerCode: 'SS',
    });
    expect(r.favoredHome).toBe(false);
    expect(r.favoredCode).toBe('SS');
    // 원정 우세: probPct = round((1-0.35)*100) = 65
    expect(r.probPct).toBe(65);
    expect(r.modelAgrees).toBe(true);
  });

  it('원정 우세 + 모델 불일치: probPct = (1-homeWinProb)%, modelAgrees=false', () => {
    const r = computePick({
      compositeDuelScore: -4,
      homeCode: 'KT',
      awayCode: 'NC',
      homeWinProb: 0.60,
      predictedWinnerCode: 'KT',
    });
    expect(r.favoredHome).toBe(false);
    expect(r.favoredCode).toBe('NC');
    // 원정(NC) 우세이지만 모델은 홈(KT) 예측 → 불일치
    expect(r.probPct).toBe(40); // (1-0.60)*100 = 40
    expect(r.modelAgrees).toBe(false);
  });

  it('predictedWinnerCode=null → modelAgrees=false (예측 없음)', () => {
    const r = computePick({
      compositeDuelScore: 5,
      homeCode: 'HH',
      awayCode: 'WO',
      homeWinProb: 0.55,
      predictedWinnerCode: null,
    });
    expect(r.modelAgrees).toBe(false);
    expect(r.probPct).toBe(55);
  });

  it('probPct 반올림: homeWinProb=0.666 → 홈 우세 시 67%', () => {
    const r = computePick({
      compositeDuelScore: 3,
      homeCode: 'SK',
      awayCode: 'LT',
      homeWinProb: 0.666,
      predictedWinnerCode: 'SK',
    });
    expect(r.probPct).toBe(67);
  });
});
