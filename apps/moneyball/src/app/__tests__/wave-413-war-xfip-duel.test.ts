import { WAR_STRONG, WAR_WEAK, SP_FIP_STRONG, SP_FIP_WEAK } from '@moneyball/shared';

// wave-413: WAR 대결 + xFIP 대결 표시 — 팩터 수렴 픽 섹션
// war: 높을수록 강세(≥WAR_STRONG=20) / 낮을수록 약세(≤WAR_WEAK=8)
// sp_xfip: 낮을수록 강세(<SP_FIP_STRONG=3.5) / 높을수록 약세(>SP_FIP_WEAK=4.5)

function warColor(war: number): 'brand' | 'orange' | 'neutral' {
  if (war >= WAR_STRONG) return 'brand';
  if (war <= WAR_WEAK) return 'orange';
  return 'neutral';
}

function xfipColor(xfip: number): 'brand' | 'orange' | 'neutral' {
  if (xfip < SP_FIP_STRONG) return 'brand';
  if (xfip > SP_FIP_WEAK) return 'orange';
  return 'neutral';
}

describe('wave-413 WAR 대결 색상 분류', () => {
  it('WAR_STRONG(20.0) 이상 = brand(강세)', () => {
    expect(warColor(20.0)).toBe('brand');
    expect(warColor(25.0)).toBe('brand');
  });

  it('WAR_WEAK(8.0) 이하 = orange(약세)', () => {
    expect(warColor(8.0)).toBe('orange');
    expect(warColor(5.0)).toBe('orange');
  });

  it('중간 구간 = neutral', () => {
    expect(warColor(14.0)).toBe('neutral');
    expect(warColor(10.0)).toBe('neutral');
    expect(warColor(19.9)).toBe('neutral');
    expect(warColor(8.1)).toBe('neutral');
  });

  it('WAR_STRONG 임계 — 20.0 이상 강세', () => {
    expect(WAR_STRONG).toBe(20.0);
  });

  it('WAR_WEAK 임계 — 8.0 이하 약세', () => {
    expect(WAR_WEAK).toBe(8.0);
  });
});

describe('wave-413 xFIP 대결 색상 분류', () => {
  it('SP_FIP_STRONG(3.5) 미만 = brand(강세) — xFIP 낮을수록 유리', () => {
    expect(xfipColor(3.0)).toBe('brand');
    expect(xfipColor(2.5)).toBe('brand');
  });

  it('SP_FIP_WEAK(4.5) 초과 = orange(약세)', () => {
    expect(xfipColor(5.0)).toBe('orange');
    expect(xfipColor(6.0)).toBe('orange');
  });

  it('중간 구간 = neutral', () => {
    expect(xfipColor(3.5)).toBe('neutral');
    expect(xfipColor(4.0)).toBe('neutral');
    expect(xfipColor(4.5)).toBe('neutral');
  });

  it('SP_FIP_STRONG 임계 — 3.5 미만 강세', () => {
    expect(SP_FIP_STRONG).toBe(3.5);
  });

  it('SP_FIP_WEAK 임계 — 4.5 초과 약세', () => {
    expect(SP_FIP_WEAK).toBe(4.5);
  });
});
